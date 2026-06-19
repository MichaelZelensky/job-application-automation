# Job Application Automation

End-to-end workflow for finding, qualifying, tailoring, validating, and applying to jobs using AI.

## Supported Platforms

Currently this project supports LinkedIn job listings only.

The browser extension is designed to extract job information from LinkedIn pages and has not been tested with other job boards.

## Features

* Capture job descriptions using a browser extension
* Export jobs into a structured JSON format
* Generate AI prompts for CV tailoring
* Generate tailored CVs for each role
* Generate application-ready PDFs
* Validate tailored CVs against job requirements
* Organize applications in repeatable batches
* Human-in-the-loop workflow with AI assistance

## Workflow

```text
Job Listings
    ↓
Validate / Filter
    ↓
Open selected jobs in separate tabs
    ↓
Capture tabs (browser extension)
    ↓
jobs.json
    ↓
Generate Tailor Prompts
    ↓
Tailor CVs with AI
    ↓
Generate PDFs
    ↓
Validate Fit
    ↓
Apply
```

## Repository Structure

```text
.
├── automation/
│   ├── browser-extension/
│   ├── scripts/
│   └── readme.md
├── generic-cv/
├── applications/
└── README.md
```

## Requirements

* Google Chrome
* Bash
* ChatGPT, Claude, or another LLM capable of editing HTML documents

## Installation

```bash
git clone https://github.com/MichaelZelensky/job-application-automation.git
cd job-application-automation
```

### Install the Browser Extension

1. Open Chrome.
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select:

```text
automation/browser-extension
```

## Quick Start

### 1. Capture Jobs

Open the job listings you want to review in browser tabs.

Use the browser extension to scan the loaded tabs and export the collected job data.

Save the exported file as:

```text
applications/YYYY-MM-DD/jobs.json
```

### 2. Generate Tailoring Prompts

```bash
cd automation/scripts
./prompt-generator.sh ../../applications/YYYY-MM-DD
```

This generates:

* Tailoring prompts
* CV placeholders
* Shared HTML assets

### 3. Tailor CVs

For each generated tailoring prompt:

1. Open the prompt.
2. Paste it into ChatGPT, Claude, or another LLM.
3. Generate a tailored CV.
4. Save the generated HTML into the corresponding CV file.

### 4. Generate PDFs

Generate PDF versions of the tailored CVs.

These PDFs can be used when applying to jobs.

### 5. Validate Candidate Fit

```bash
cd automation/scripts
./validation-prompt-generator.sh ../../applications/YYYY-MM-DD
```

Review the generated validation prompts with an LLM to assess whether the tailored CV is a strong match for the role.

### 6. Apply

Submit the generated PDFs through the appropriate application channels.

Always review generated materials before submission.

## Detailed Documentation

The complete workflow, directory structure, generated files, and processing steps are documented in:

```text
automation/readme.md
```

## Philosophy

This project is intentionally human-in-the-loop.

AI assists with:

* Job qualification
* CV tailoring
* Candidate-job fit validation

The user remains responsible for reviewing all generated content and deciding whether to apply.

## Disclaimer

## Supported Platforms

Currently this project supports LinkedIn job listings only.

## Disclaimer

This project is an independent tool and is not affiliated with, endorsed by, or sponsored by LinkedIn.

The browser extension only reads information that is already present in loaded browser pages. It does not perform automated submissions, direct HTTP requests, or other automated interactions with external services.

Users are solely responsible for ensuring that their use of this project complies with applicable terms of service, policies, and laws.

This software is provided "as is", without warranties of any kind. The authors and contributors are not responsible for account restrictions, account suspensions, data loss, employment outcomes, or any other damages arising from the use of this project.

## License

MIT
