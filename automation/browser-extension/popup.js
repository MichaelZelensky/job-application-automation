const DEFAULT_TEMPLATE = `TASK:
Here's my CV and the job description.
I can accept only real cash jobs. Priority to part-time, async jobs. More hands-on are welcome (also any low leadership roles).

1. Rate fit (High/Medium/Low)
2. Would you apply?
3. Be very brief

---

{{JOB_DESCRIPTION}}

---

MY CV:

{{CV}}
`;

// ── Elements ──────────────────────────────────────────────
const promptTemplateEl = document.getElementById('promptTemplate');
const cvEl             = document.getElementById('cv');
const statusEl         = document.getElementById('status');
const captureStatusEl  = document.getElementById('captureStatus');
const capturedJsonEl   = document.getElementById('capturedJson');

// ── Nav ───────────────────────────────────────────────────
document.querySelectorAll('nav button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`panel-${btn.dataset.panel}`).classList.add('active');
    });
});

// ── Storage ───────────────────────────────────────────────
const saveState = () =>
    new Promise(resolve =>
        chrome.storage.local.set({
            promptTemplate: promptTemplateEl.value,
            cv:             cvEl.value
        }, resolve)
    );

const loadState = async () => {
    const result = await chrome.storage.local.get(['promptTemplate', 'cv']);
    promptTemplateEl.value = result.promptTemplate || DEFAULT_TEMPLATE;
    cvEl.value             = result.cv || '';
};

// ── Status helpers ────────────────────────────────────────
const setStatus = (el, text, isError = false) => {
    el.textContent = text;
    el.style.color = isError
        ? 'var(--error)'
        : text ? 'var(--success)' : '';
};

// ── Qualification ─────────────────────────────────────────
const triggerBuildAndCopy = async () => {
    await saveState();
    setStatus(statusEl, 'Building prompt…');

    const response = await chrome.runtime.sendMessage({
        type:           'BUILD_AND_COPY',
        promptTemplate: promptTemplateEl.value,
        cv:             cvEl.value
    });

    if (response?.error) {
        setStatus(statusEl, `Error: ${response.error}`, true);
    } else {
        setStatus(statusEl, `✓ Copied — ${response.jobTitle} @ ${response.company}`);
    }
};

// Update status if shortcut fired while popup was open
chrome.runtime.onMessage.addListener(message => {
    if (message.type === 'PROMPT_COPIED') {
        setStatus(statusEl, `✓ Copied — ${message.jobTitle} @ ${message.company}`);
    }
});

promptTemplateEl.addEventListener('input', saveState);
cvEl.addEventListener('input', saveState);

document.getElementById('buildPrompt').addEventListener('click', triggerBuildAndCopy);

// ── Capture Tabs ──────────────────────────────────────────
const getJobDataFromPage = () => {
    const jobLink =
        [...document.querySelectorAll('a[href*="/jobs/view/"]')]
            .find(link =>
                link.innerText.trim() &&
                link.innerText.trim() !== 'Easy Apply'
            );

    const companyLink =
        [...document.querySelectorAll('a[href*="/company/"]')]
            .find(link => link.innerText.trim());

    const jobDescription =
        document
            .querySelector('[data-sdui-component*="aboutTheJob"]')
            ?.innerText?.trim()
        ||
        [...document.querySelectorAll('*')]
            .find(el => el.innerText?.startsWith('About the job'))
            ?.innerText?.trim()
        || '';

    return {
        url:         jobLink?.href         || location.href,
        title:       jobLink?.innerText.trim() || document.title,
        company:     companyLink?.innerText.trim() || '',
        description: jobDescription
    };
};

document.getElementById('captureBtn').addEventListener('click', async () => {
    setStatus(captureStatusEl, 'Scanning tabs…');
    capturedJsonEl.value = '';

    const tabs = await chrome.tabs.query({ url: 'https://www.linkedin.com/jobs/*' });

    if (!tabs.length) {
        setStatus(captureStatusEl, 'No job tabs found.', true);
        return;
    }

    const results = [];
    const date    = new Date().toISOString().slice(0, 10);

    for (const tab of tabs) {
        try {
            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func:   getJobDataFromPage
            });

            results.push({ date, url: result.url, title: result.title, company: result.company, description: result.description });
        } catch {
            // Tab may be restricted — skip it
        }
    }

    if (!results.length) {
        setStatus(captureStatusEl, 'Could not read any job tabs.', true);
        return;
    }

    capturedJsonEl.value = JSON.stringify(results, null, 2);
    setStatus(captureStatusEl, `✓ Captured ${results.length} job${results.length > 1 ? 's' : ''}`);
});

document.getElementById('copyJsonBtn').addEventListener('click', async () => {
    if (!capturedJsonEl.value) return;
    await navigator.clipboard.writeText(capturedJsonEl.value);
    setStatus(captureStatusEl, '✓ JSON copied to clipboard');
});

document.getElementById('downloadJsonBtn').addEventListener('click', () => {
    if (!capturedJsonEl.value) return;
    const blob = new Blob([capturedJsonEl.value], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `linkedin-jobs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// ── Init ──────────────────────────────────────────────────
loadState().then(triggerBuildAndCopy);
