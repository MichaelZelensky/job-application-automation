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
(Optional) Tailor CVs with OpenAI
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
│   ├── tailor-app/
│   └── readme.md
├── applications/
├── generic-cv/
├── secrets.example.json
├── secrets.json
├── run
└── README.md
```

## Requirements

* Google Chrome or Microsoft Edge
* Bash (Git Bash on Windows is fine)
* Node.js 18+ (LTS recommended)
* npm (bundled with Node.js)
* OpenAI API key (optional, for automatic tailoring)

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
* create `secrets.json` from `secrets.example.json` (if missing)

## OpenAI Setup (Optional)

Automatic CV tailoring requires an OpenAI API key.

After installation, edit:

```text
secrets.json
```

Replace the placeholder key:

```json
{
  "openaiApiKey": "sk-your-api-key"
}
```

If you only want prompt generation, no API key is required.

## Running

All automation is controlled via a single runner.

### 1. Generate tailoring prompts (manual workflow)

```bash
./run tailor applications/YYYY-MM-DD
```

Generates:

* AI prompts for CV tailoring
* HTML CV placeholders

You can then use your preferred AI tool to generate the tailored HTML manually.

### 2. Automatically tailor CVs with OpenAI

```bash
./run tailor -ai applications/YYYY-MM-DD
```

Generates:

* tailoring prompts
* tailored HTML CVs using OpenAI

Existing completed CVs are skipped automatically.

### 3. Generate PDFs

```bash
./run pdf applications/YYYY-MM-DD
```

Generates:

* PDF versions of completed CVs

Automatically skips:

* placeholder CVs
* empty CVs

### 4. Validate CV fit

```bash
./run validate applications/YYYY-MM-DD
```

Generates validation prompts for completed CVs.

Automatically skips placeholder CVs.

## Full Workflows

### Manual

```bash
./run install

./run tailor applications/YYYY-MM-DD

# Generate HTML using your preferred AI

./run pdf applications/YYYY-MM-DD

./run validate applications/YYYY-MM-DD
```

### Automatic (OpenAI)

```bash
./run install

# Configure secrets.json

./run tailor -ai applications/YYYY-MM-DD

./run pdf applications/YYYY-MM-DD

./run validate applications/YYYY-MM-DD
```

## CV Setup (Required)

The repository includes a base CV template:

```text
generic-cv/Agent Smith CV.html
```

### 1. Create your personal CV

Rename the template:

```text
generic-cv/Your Name CV.html
```

This file becomes the source CV used for all tailoring.

`Agent Smith CV.html` is only a placeholder and should be replaced.

Exactly one HTML file must exist inside `generic-cv/`.

### 2. Profile photo

Replace:

```text
generic-cv/html-assets/me.png
```

This image is reused in every generated CV.

### 3. Output files

Generated HTML:

```text
applications/YYYY-MM-DD/cvs/<Your CV> - <Company>.html
```

Generated PDF:

```text
applications/YYYY-MM-DD/cvs/<Your CV> - <Company>.pdf
```

Example:

```text
applications/2026-06-29/cvs/John Silver - Stripe.html
applications/2026-06-29/cvs/John Silver - Stripe.pdf
```

## Notes

* Input format is NDJSON (one JSON object per line)
* Company names are slugified for safe filenames
* Existing AI-generated CVs are skipped automatically
* PDF generation skips empty and placeholder CVs
* Validation skips placeholder CVs
* Exactly one HTML CV must exist in `generic-cv/`
* All automation runs through `./run`
* Node.js 18+ is required

## Disclaimer

This project is an independent tool and is not affiliated with, endorsed by, or sponsored by LinkedIn.

The browser extension only reads information already present in loaded pages. It does not perform automated submissions or interactions with external services.

Users are responsible for compliance with all applicable terms, policies, and laws.

This software is provided "as is", without warranties of any kind.

## License

MIT