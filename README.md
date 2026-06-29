## Job Application Automation

End-to-end workflow for finding, qualifying, tailoring, validating, and applying to jobs using AI.

## Supported Platforms

Currently this project supports:

* LinkedIn job listings
* GoFractional job listings
* WellFound job listings

The browser extension is designed to extract job information from the supported platform job pages. Other job boards have not been tested.

## Features

* Capture job descriptions using a browser extension
* Export jobs into a structured NDJSON format
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
jobs.ndjson
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
chmod +x run
chmod +x automation/scripts/*.sh
```

### Install the Browser Extension

1. Open Chrome.
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select:

```
automation/browser-extension
```

## CV Setup (Required)

The repository includes a base CV template:

```
generic-cv/Agent Smith CV.html
```

### 1. Create your personal CV file

You are free to update the HTML styling and formatting of the CV to your taste.

To start, you can use the CV template (`generic-cv/Agent Smith CV.html`).

Rename the template using your real full name:

```
generic-cv/Your Name CV.html
```

This file is the **primary CV source** used for all tailoring and generation.

`Agent Smith CV.html` is only a placeholder and must be replaced before use.

The `generic-cv/` directory must contain exactly one HTML CV file.

### 2. Profile photo

Replace the default image:

```
generic-cv/html-assets/me.png
```

with your real profile photo.

This image is automatically embedded into all generated CV variants.

### 3. Naming convention for generated CVs

All script-generated tailored CVs will follow this structure:

```
applications/YYYY-MM-DD/cvs/<your_cv_filename> - <Company>.html
applications/YYYY-MM-DD/cvs/<your_cv_filename> - <Company>.pdf
```

Example:

```
applications/YYYY-MM-DD/cvs/John Silver - Stripe.html
applications/YYYY-MM-DD/cvs/John Silver - Stripe.pdf
```

## Quick Start

### 1. Capture Jobs

Open the job listings you want to review in browser tabs.

Use the browser extension to scan the loaded tabs and export the collected job data.

Save the exported file as:

```
applications/YYYY-MM-DD/jobs.ndjson
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

```
automation/readme.md
```

## Philosophy

This project is intentionally human-in-the-loop.

AI assists with:

* Job qualification
* CV tailoring
* Candidate-job fit validation

The user remains responsible for reviewing all generated content and deciding whether to apply.

## Notes

* Input format is now **NDJSON (one JSON object per line)**.
* Scripts are resilient to duplicate or malformed entries depending on capture quality.
* Company names are slugified for file-safe naming.
* Only one CV HTML file must exist inside `generic-cv/`.
* `Agent Smith CV.html` is a placeholder and must be replaced.
* Profile image `generic-cv/html-assets/me.png` must be replaced.
* Generated CVs are always derived from the single source CV.
* Supported platforms: see above.

## Disclaimer

This project is an independent tool and is not affiliated with, endorsed by, or sponsored by LinkedIn.

The browser extension only reads information that is already present in loaded browser pages. It does not perform automated submissions, direct HTTP requests, or other automated interactions with external services.

Users are solely responsible for ensuring that their use of this project complies with applicable terms of service, policies, and laws.

This software is provided "as is", without warranties of any kind. The authors and contributors are not responsible for account restrictions, account suspensions, data loss, employment outcomes, or any other damages arising from the use of this project.

## License

MIT
