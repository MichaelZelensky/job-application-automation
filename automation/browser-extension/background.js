const getJobData = () => {

    // ── Job URL ───────────────────────────────────────────
    // Both cases have /jobs/view/ links somewhere on the page
    const jobViewLink = document.querySelector('a[href*="/jobs/view/"]');
    const jobUrl = jobViewLink?.href || location.href;

    // Extract job ID from URL for deduplication
    const jobId = jobUrl.match(/\/jobs\/view\/(\d+)/)?.[1] || '';

    // ── Job Title ─────────────────────────────────────────
    // Case 1: search results — link text inside h1
    const h1Link = document.querySelector('h1 a[href*="/jobs/view/"]');
    const titleFromH1 = h1Link?.innerText.trim();

    // Case 2: detail panel — find the <p> that immediately precedes
    // or contains a "Verified job" span, inside Primary content section
    // Use the verified badge span as an anchor — it's semantic, not obfuscated
    const verifiedBadge = document
        .querySelector('[aria-label="Primary content"] [aria-label="Verified job"]');

    // Walk up to the containing <p>, then grab only its text nodes
    // (ignoring the badge span and any other child elements)
    const titleFromVerifiedBadge = verifiedBadge
        ? [...verifiedBadge.closest('p')?.childNodes || []]
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent.trim())
            .find(t => t.length > 0)
        : null;

    // Case 2b: no verified badge — find the first meaningful <p>
    // inside Primary content that isn't a location/metadata line
    const titleFromPrimaryContent = (() => {
        const section = document.querySelector('[aria-label="Primary content"]');
        if (!section) return null;
        // The title <p> is near the top, has substantial text, and
        // isn't a company link or metadata span
        for (const p of section.querySelectorAll('p')) {
            const text = [...p.childNodes]
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .map(n => n.textContent.trim())
                .join('');
            // Heuristic: title is >5 chars and doesn't look like metadata
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
    // Company link inside Primary content is more reliable than page-wide
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
        jobId,
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

// Shortcut — no notification
chrome.commands.onCommand.addListener(async command => {

    if (command !== 'make-prompt') return;

    const [tab] = await chrome.tabs.query({ url: 'https://www.linkedin.com/*' });
    if (!tab) return;

    await buildAndCopy(tab.id).catch(console.error);
});

// Popup message — notify so popup status updates
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

    if (message.type !== 'BUILD_AND_COPY') return;

    chrome.tabs.query({ url: 'https://www.linkedin.com/*' }).then(([tab]) => {

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