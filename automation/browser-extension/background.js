const getJobData = () => {

    // ── Job URL ───────────────────────────────────────────
    const jobViewLink = document.querySelector('a[href*="/jobs/view/"]');
    const jobUrl = jobViewLink?.href || location.href;

    // ── Job Title ─────────────────────────────────────────
    const h1Link = document.querySelector('h1 a[href*="/jobs/view/"]');
    const titleFromH1 = h1Link?.innerText.trim();

    const verifiedBadge = document
        .querySelector('[aria-label="Primary content"] [aria-label="Verified job"]');

    const titleFromVerifiedBadge = verifiedBadge
        ? [...verifiedBadge.closest('p')?.childNodes || []]
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent.trim())
            .find(t => t.length > 0)
        : null;

    const titleFromPrimaryContent = (() => {
        const section = document.querySelector('[aria-label="Primary content"]');
        if (!section) return null;
        for (const p of section.querySelectorAll('p')) {
            const text = [...p.childNodes]
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .map(n => n.textContent.trim())
                .join('');
            if (text.length > 5 && !/^\d|ago$|applicants$/i.test(text)) {
                return text;
            }
        }
        return null;
    })();

    const jobTitle = titleFromH1
                  || titleFromVerifiedBadge
                  || titleFromPrimaryContent
                  || document.title;

    // ── Company ───────────────────────────────────────────
    const section = document.querySelector('[aria-label="Primary content"]');
    const companyLink = section
        ? [...section.querySelectorAll('a[href*="/company/"]')]
              .find(a => a.innerText.trim())
        : [...document.querySelectorAll('a[href*="/company/"]')]
              .find(a => a.innerText.trim());

    // ── Description ───────────────────────────────────────
    const jobDescription =
        document.querySelector('[data-sdui-component*="aboutTheJob"]')?.innerText?.trim()
        || [...document.querySelectorAll('*')]
               .find(el => el.innerText?.startsWith('About the job'))
               ?.innerText?.trim()
        || '';

    return {
        jobUrl,
        jobTitle,
        company:    companyLink?.innerText.trim() || '',
        companyUrl: companyLink?.href || '',
        jobDescription
    };
};

const copyViaOffscreen = async text => {

    const existing = await chrome.offscreen.hasDocument?.() ?? false;

    if (!existing) {
        await chrome.offscreen.createDocument({
            url:           'offscreen.html',
            reasons:       ['CLIPBOARD'],
            justification: 'Write prompt to clipboard from background service worker'
        });
    }

    await chrome.runtime.sendMessage({
        type: 'COPY_TO_CLIPBOARD',
        text
    });

    await new Promise(r => setTimeout(r, 200));

    await chrome.offscreen.closeDocument();
};

const buildAndCopy = async (tabId, overrides = {}) => {

    const stored = await chrome.storage.local.get(['promptTemplate', 'cv']);

    const promptTemplate = overrides.promptTemplate ?? stored.promptTemplate ?? '';
    const cv             = overrides.cv             ?? stored.cv             ?? '';

    const [{ result: job }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: getJobData
    });

    const jobText = `

JOB TITLE:
${job.jobTitle}

COMPANY:
${job.company}

JOB DESCRIPTION:
${job.jobDescription}
`;

    const prompt = promptTemplate
        .replace('{{JOB_DESCRIPTION}}', jobText)
        .replace('{{CV}}', cv);

    await copyViaOffscreen(prompt);

    return { jobTitle: job.jobTitle, company: job.company };
};

// ── Active LinkedIn tab ───────────────────────────────────
const getLinkedInTab = async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.url?.includes('linkedin.com')) return activeTab;

    const tabs = await chrome.tabs.query({ url: 'https://www.linkedin.com/*' });
    return tabs[0] ?? null;
};

// ── Shortcut ──────────────────────────────────────────────
chrome.commands.onCommand.addListener(async command => {
    if (command !== 'make-prompt') return;
    const tab = await getLinkedInTab();
    if (!tab) return;
    await buildAndCopy(tab.id).catch(console.error);
});

// ── Popup message ─────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== 'BUILD_AND_COPY') return;

    getLinkedInTab().then(tab => {
        if (!tab) {
            sendResponse({ error: 'No LinkedIn tab found' });
            return;
        }

        buildAndCopy(tab.id, {
            promptTemplate: message.promptTemplate,
            cv:             message.cv
        })
            .then(info => {
                chrome.runtime.sendMessage({
                    type:     'PROMPT_COPIED',
                    jobTitle: info.jobTitle,
                    company:  info.company
                }).catch(() => {});
                sendResponse({ ok: true, ...info });
            })
            .catch(err => sendResponse({ error: err.message }));
    });

    return true;
});