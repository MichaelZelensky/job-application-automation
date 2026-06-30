# Job Application Automation

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
````

## Repository Structure

```text
.
├── automation/
│   ├── browser-extension/
│   ├── tailor-app/
│   └── readme.md
├── generic-cv/
├── applications/
└── README.md
```

## Requirements

* Google Chrome or Microsoft Edge
* Bash (Git Bash on Windows is fine)
* Node.js 18+ (LTS recommended)
* npm (bundled with Node.js)

## Installation

```bash
git clone https://github.com/MichaelZelensky/job-application-automation.git
cd job-application-automation

chmod +x run

./run install
```

This command will:

* check Node.js and npm
* install dependencies in `automation/tailor-app`
* build TypeScript sources

## Running

All automation is controlled via a single runner:

### 1. Tailor CVs

```bash
./run tailor applications/YYYY-MM-DD
```

Generates:

* AI prompts for CV tailoring
* CV HTML placeholders per company

### 2. Generate PDFs

```bash
./run pdf applications/YYYY-MM-DD
```

Generates:

* PDF versions of completed CVs
* skips empty or placeholder CVs automatically

### 3. Validate CV fit

```bash
./run validate applications/YYYY-MM-DD
```

Generates:

* validation prompts for completed CVs
* skips placeholder CVs automatically

## Full Workflow (recommended)

```bash
./run install

./run tailor applications/YYYY-MM-DD
# manually generate CVs using AI

./run pdf applications/YYYY-MM-DD

./run validate applications/YYYY-MM-DD
```

## CV Setup (Required)

The repository includes a base CV template:

```
generic-cv/Agent Smith CV.html
```

### 1. Create your personal CV file

Rename the template:

```
generic-cv/Your Name CV.html
```

This file is the **primary CV source** used for all tailoring.

`Agent Smith CV.html` is only a placeholder and must be replaced.

Only one HTML file must exist inside `generic-cv/`.

### 2. Profile photo

Replace:

```
generic-cv/html-assets/me.png
```

This image is used in all generated CV variants.

### 3. Output naming

Generated files:

```
applications/YYYY-MM-DD/cvs/<Your CV> - <Company>.html
applications/YYYY-MM-DD/cvs/<Your CV> - <Company>.pdf
```

Example:

```
applications/2026-06-29/cvs/John Silver - Stripe.html
applications/2026-06-29/cvs/John Silver - Stripe.pdf
```

## Notes

* Input format is NDJSON (one JSON object per line)
* Scripts skip placeholder CVs automatically
* Company names are slugified for safe filenames
* Only one CV HTML file is allowed in `generic-cv/`
* All automation runs through `./run`
* Node.js 18+ is required

## Disclaimer

This project is an independent tool and is not affiliated with, endorsed by, or sponsored by LinkedIn.

The browser extension only reads information already present in loaded pages. It does not perform automated submissions or interactions with external services.

Users are responsible for compliance with all applicable terms, policies, and laws.

This software is provided "as is", without warranties of any kind.

## License

MIT
