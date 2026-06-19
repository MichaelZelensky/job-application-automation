const getJobData = () => {

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
        jobUrl:         jobLink?.href || '',
        jobTitle:       jobLink?.innerText.trim() || '',
        company:        companyLink?.innerText.trim() || '',
        companyUrl:     companyLink?.href || '',
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