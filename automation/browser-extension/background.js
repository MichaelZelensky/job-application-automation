const getJobDataFromLinkedin = () => {

    const standaloneMatch = location.pathname.match(/\/jobs\/view\/(\d+)/);
    const currentJobId =
        standaloneMatch?.[1]
        || new URLSearchParams(location.search).get('currentJobId');

    const matchedCard = currentJobId
        ? [...document.querySelectorAll(`a[href*="/jobs/view/${currentJobId}"]`)]
            .find(a => a.closest('.job-card-container, li'))
        : null;

    const [titlePart, companyPart] = document.title.split(' | ');

    const jobTitle =
        matchedCard?.querySelector('strong')?.innerText?.trim()
        || matchedCard?.getAttribute('aria-label')?.replace(/ with verification$/i, '').trim()
        || document.querySelector('.job-details-jobs-unified-top-card__job-title h1')?.innerText?.trim()
        || titlePart?.trim()
        || '';

    const companyName =
        document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText?.trim()
        || document.querySelector('a[href*="/company/"]')?.innerText?.trim()
        || companyPart?.trim()
        || '';

    const companyUrl =
        document.querySelector('.job-details-jobs-unified-top-card__company-name a')?.href
        || document.querySelector('a[href*="/company/"]')?.href
        || '';

    const jobDescription =
        document.querySelector('.jobs-box__html-content')?.innerText?.trim()
        || document.querySelector('[data-sdui-component*="aboutTheJob"]')?.innerText?.trim()
        || document.querySelector('.jobs-description')?.innerText?.trim()
        || '';

    return {
        jobUrl:     currentJobId
                        ? `https://www.linkedin.com/jobs/view/${currentJobId}/`
                        : location.href.split('?')[0],
        jobTitle,
        company:    companyName,
        companyUrl,
        jobDescription
    };
};

const getJobDataFromGoFractional = () => {

    const jobTitle =
        document.querySelector('header h1')?.innerText?.trim()
        || '';

    const company =
        document.querySelector('header h1 + div a')?.innerText?.trim()
        || '';

    const companyUrl =
        document.querySelector('header h1 + div a')?.href
        || '';

    const jobDescription =
        document.querySelector('h2 + .prose')?.innerText?.trim()
        || [...document.querySelectorAll('h2')]
            .find(h => h.textContent.trim() === 'Job Description')
            ?.nextElementSibling
            ?.innerText
            ?.trim()
        || '';

    const companyDescription =
        [...document.querySelectorAll('h2')]
            .find(h => h.textContent.trim() === 'About the Company')
            ?.nextElementSibling
            ?.innerText
            ?.trim()
        || '';

    return {
        jobUrl: location.href,
        jobTitle,
        company,
        companyUrl,
        jobDescription: companyDescription
            ? `${jobDescription}\n\nAbout the Company\n${companyDescription}`
            : jobDescription
    };
};

const getJobDataFromWellfound = () => {
    const url = location.href.split('?')[0];

    const modalRoot =
        document.querySelector('.ReactModal__Content--after-open')
        || document;

    const jobId =
        new URLSearchParams(location.search).get('job_listing_slug')
        || url;

    const jobTitle =
        modalRoot.querySelector('h1.text-xl')
        ?.innerText?.trim()
        || '';

    // IMPORTANT: scope to header block that contains company info
    const companyAnchor =
        [...modalRoot.querySelectorAll('a[href^="/company/"]')]
            .find(a => a.closest('.ml-4') || a.querySelector('span'));

    const company =
        companyAnchor?.querySelector('span')?.innerText?.trim()
        || companyAnchor?.innerText?.trim()
        || '';

    const companyUrl =
        companyAnchor?.href
            ? new URL(companyAnchor.href, location.origin).href
            : '';

    const jobDescription =
        modalRoot.querySelector('#job-description')
            ? [...modalRoot.querySelectorAll('#job-description p')]
                .map(p => p.innerText?.trim())
                .filter(Boolean)
                .join('\n')
            : '';

    return {
        jobId,
        jobUrl: url,
        jobTitle,
        company,
        companyUrl,
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

const buildAndCopy = async (tab, overrides = {}) => {

    const stored = await chrome.storage.local.get(['promptTemplate', 'cv']);

    const promptTemplate = overrides.promptTemplate ?? stored.promptTemplate ?? '';
    const cv             = overrides.cv             ?? stored.cv             ?? '';

    const getJobDataFunction = {
        'linkedin.com': getJobDataFromLinkedin,
        'gofractional.com': getJobDataFromGoFractional,
        'wellfound.com': getJobDataFromWellfound
    };

    const scraper = Object.entries(getJobDataFunction)
        .find(([domain]) => tab.url?.includes(domain))?.[1];
    
    const [{ result: job }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scraper
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

    const [tab] = await chrome.tabs.query({
        url: [
            'https://www.linkedin.com/*',
            'https://www.gofractional.com/*',
            'https://wellfound.com/*'
        ],
        active:        true,
        currentWindow: true
    });
    if (!tab) return;

    await buildAndCopy(tab).catch(console.error);
});

// Popup message — notify so popup status updates
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

    if (message.type !== 'BUILD_AND_COPY') return;

    chrome.tabs.query({
        url: [
            'https://www.linkedin.com/*',
            'https://www.gofractional.com/*',
            'https://wellfound.com/*'
        ],
        active:        true,
        currentWindow: true
    }).then(([tab]) => {

        if (!tab) {
            sendResponse({ error: 'No active job tab found' });
            return;
        }

        buildAndCopy(tab, {
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