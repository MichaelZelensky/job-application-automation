const DEFAULT_TEMPLATE = `TASK:
Here's my CV and the job description.
I can accept only real cash jobs.

1. Rate fit (High/Medium/Low)
2. Would you apply?
3. Be very brief

---

{{JOB_DESCRIPTION}}

---

MY CV:

{{CV}}
`;

//  Elements 
const promptTemplateEl = document.getElementById('promptTemplate');
const cvEl             = document.getElementById('cv');
const statusEl         = document.getElementById('status');
const captureStatusEl  = document.getElementById('captureStatus');
const capturedJsonEl   = document.getElementById('capturedJson');

//  Nav 
document.querySelectorAll('nav button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`panel-${btn.dataset.panel}`).classList.add('active');
    });
});

//  Storage 
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

//  Status helpers 
const setStatus = (el, text, isError = false) => {
    el.textContent = text;
    el.style.color = isError
        ? 'var(--error)'
        : text ? 'var(--success)' : '';
};

//  Qualification 
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

//  Capture: runs inside each tab 
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
        [...document.querySelectorAll('h2')]
            .find(h => h.innerText.trim() === 'Job Description')
            ?.nextElementSibling
            ?.innerText
            ?.trim()
        || '';

    const aboutCompany =
        [...document.querySelectorAll('h2')]
            .find(h => h.innerText.trim() === 'About the Company')
            ?.nextElementSibling
            ?.innerText
            ?.trim()
        || '';

    const rate =
        [...document.querySelectorAll('div')]
            .find(d => d.innerText?.includes('$/hr'))
            ?.innerText?.trim()
        || '';

    const hours =
        [...document.querySelectorAll('div')]
            .find(d => d.innerText?.includes('hrs/week'))
            ?.innerText?.trim()
        || '';

    const jobId =
        location.href.split('?')[0];

    return {
        jobId,
        url: location.href.split('?')[0],
        title: jobTitle,
        company,
        companyUrl,
        description: aboutCompany
            ? `${jobDescription}\n\nABOUT COMPANY\n${aboutCompany}`
            : jobDescription,
        rate,
        hours
    };
};

const getJobDataFromLinkedin = () => {

    const standaloneMatch = location.pathname.match(/\/jobs\/view\/(\d+)/);
    const currentJobId =
        standaloneMatch?.[1]
        || new URLSearchParams(location.search).get('currentJobId');

    if (!currentJobId) return null;

    const matchedCard = [...document.querySelectorAll(`a[href*="/jobs/view/${currentJobId}"]`)]
        .find(a => a.closest('.job-card-container, li'));

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
        jobId:       currentJobId,
        url:         `https://www.linkedin.com/jobs/view/${currentJobId}/`,
        title:       jobTitle,
        company:     companyName,
        companyUrl,
        description: jobDescription
    };
};

const getJobDataFromWellfound = () => {
    const url = location.href;

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

    const companyAnchor =
        [...modalRoot.querySelectorAll('a[href^="/company/"]')]
            .find(anchor => anchor.closest('.ml-4') || anchor.querySelector('span'));

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
                .map(paragraph => paragraph.innerText?.trim())
                .filter(Boolean)
                .join('\n')
            : '';

    return {
        jobId,
        url,
        title: jobTitle,
        company,
        companyUrl,
        description: jobDescription
    };
};

const getJobDataFromIndeed = async () => {

    const waitForElement = (selector, timeout = 3000) =>
        new Promise(resolve => {

            const existing = document.querySelector(selector);
            if (existing) {
                resolve(existing);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);

                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });

    await waitForElement('#jobDescriptionText');

    const root =
        document.querySelector('.fastviewjob')
        || document;

    const getText = selector =>
        root.querySelector(selector)?.innerText?.trim() || '';

    const jobTitle =
        getText('[data-testid="jobsearch-JobInfoHeader-title"]')
        || getText('.jobsearch-JobInfoHeader-title');

    const companyAnchor =
        root.querySelector('[data-company-name="true"] a');

    const company =
        companyAnchor?.innerText?.trim()
        || '';

    const companyUrl =
        companyAnchor?.href
        || '';

    const description =
        root.querySelector('#jobDescriptionText')
            ?.innerText
            ?.trim()
        || '';

    const benefits =
        [...root.querySelectorAll('#benefits li')]
            .map(li => li.innerText.trim())
            .filter(Boolean);

    const jobType =
        getText('#salaryInfoAndJobType');

    const jobLocation =
        getText('[data-testid="jobsearch-JobInfoHeader-companyLocation"]')
        || getText('#jobLocationText');

    const params = new URLSearchParams(window.location.search);

    const jobId =
        params.get('jk')
        || params.get('vjk')
        || window.location.href.match(/[?&](?:jk|vjk)=([^&]+)/)?.[1]
        || '';

    return {
        jobId,
        url: jobId
            ? `https://${window.location.host}/viewjob?jk=${jobId}`
            : window.location.href.split('?')[0],
        title: jobTitle,
        company,
        companyUrl,
        description: [
            jobLocation && `Location: ${jobLocation}`,
            jobType && `Job type: ${jobType}`,
            benefits.length && `Benefits:\n${benefits.join('\n')}`,
            description
        ].filter(Boolean).join('\n\n')
    };
};

//  Capture button 
document.getElementById('captureBtn').addEventListener('click', async () => {
    setStatus(captureStatusEl, 'Scanning tabs…');
    capturedJsonEl.value = '';

    const tabs = await chrome.tabs.query({
        url: [
            'https://www.linkedin.com/*',
            'https://www.gofractional.com/*',
            'https://wellfound.com/*',
            'https://*.indeed.com/*'
        ],
        currentWindow: true
    });

    if (!tabs.length) {
        setStatus(captureStatusEl, 'No job tabs found.', true);
        return;
    }

    const seen    = new Set();
    const results = [];
    const date    = new Date().toISOString().slice(0, 10);

    const getPlatform = (url = '') =>
        url.includes('linkedin.com') ? 'linkedin'
        : url.includes('gofractional.com') ? 'gofractional'
        : url.includes('wellfound.com') ? 'wellfound'
        : url.includes('indeed.') ? 'indeed'
        : 'unknown';

    for (const tab of tabs) {       
        try {
            const getJobDataFunction = {
                linkedin: getJobDataFromLinkedin,
                gofractional: getJobDataFromGoFractional,
                wellfound: getJobDataFromWellfound,
                indeed: getJobDataFromIndeed
            };

            const platform = getPlatform(tab.url);
            const scraper = getJobDataFunction[platform];

            if (!scraper) continue;

            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func:   scraper
            });

            if (!result) continue;

            const uniqueKey =
                result.jobId
                    ? `${platform}:${result.jobId}`
                    : `${platform}:${result.url}`;

            if (seen.has(uniqueKey)) continue;
            seen.add(uniqueKey);

            results.push({
                date,
                jobId:       result.jobId,
                url:         result.url,
                title:       result.title,
                company:     result.company,
                companyUrl:  result.companyUrl,
                description: result.description
            });
        } catch (e) {
            // alert(e);
        }
    }

    if (!results.length) {
        setStatus(captureStatusEl, 'Could not read any job tabs.', true);
        return;
    }

    const ndjson = results
        .map(job => JSON.stringify(job))
        .join('\n');
    capturedJsonEl.value = ndjson;

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
    a.download = `jobs.ndjson`;
    a.click();
    URL.revokeObjectURL(url);
});

//  Init 
loadState().then(triggerBuildAndCopy);