# LinkedIn Job Application Automation

End-to-end pipeline for finding, qualifying, tailoring, and applying to jobs.

---

## Directory Structure

```
./automation/
   browser-extension/   ← Chrome extension (capture + qualify)
   scripts/
      prompt-generator.sh           ← generates tailor prompts + empty CV shells
      validation-prompt-generator.sh← generates validation prompts
   readme.md                        ← this file

./applications/
   2026-06-19/                      ← one folder per application batch (date = today)
      jobs.json                     ← job list exported from the browser extension
      tailor-prompts/
         company-name.txt           ← AI prompt: tailor generic CV for this job
      validation-prompts/
         company-name.txt           ← AI prompt: validate tailored CV vs job
      cvs/
         html-assets/               ← shared assets (fonts, images) copied from generic-cv
         Michael Zelensky CV - company-name.html  ← filled manually from AI output
         Michael Zelensky CV - company-name.pdf   ← printed from browser, used to apply

./generic-cv/                       ← lives at the repo root, next to ./automation/
   Michael Zelensky CV.html         ← master CV; filename is used to derive tailored CV names
   html-assets/                     ← fonts, images referenced by the CV HTML
```

The generic CV filename determines the output filename:
`Michael Zelensky CV.html` → `Michael Zelensky CV - company-name.html`

**Never edit files inside `./generic-cv/` per-job** — it is the permanent master template.

---

## Full Workflow

### 1. Select jobs — build jobs.json

- Open Chrome, navigate LinkedIn Jobs
- Open every job you want to apply to in a new tab
- **Important:** click each tab so it fully loads before the next step
- Open the extension → **Capture Tabs** → **Scan LinkedIn Tabs**
- Copy or download the JSON
- Save as `./applications/YYYY-MM-DD/jobs.json`

### 2. Generate tailor prompts + empty CV shells

```bash
cd automation/scripts
./prompt-generator.sh ../../applications/2026-06-19
```

This reads `jobs.json` and for each job produces:
- `tailor-prompts/company-name.txt` — prompt asking AI to rewrite the generic CV for that role
- `cvs/Michael Zelensky CV - company-name.html` — empty placeholder (skipped if already exists)
- Copies `generic-cv/html-assets/` into `cvs/html-assets/` (once)

### 3. Tailor each CV — manual AI step

For each file in `tailor-prompts/`:
- Copy the prompt → paste into ChatGPT or Claude
- Copy the generated HTML → paste into the corresponding `cvs/Michael Zelensky CV - company-name.html`

### 4. Print CVs to PDF

#### Option A. Automatic

```bash
cd automation/scripts
./prompt-generator.sh ../../applications/2026-06-19
```

This will create pdf files for each CV next to html files.

#### Option B. Manual

For each filled `.html` in `cvs/`:
- Open in Chrome
- File → Print → Save as PDF
- Save as `cvs/Michael Zelensky CV - company-name.pdf`

### 5. Validate tailored CVs — optional

```bash
./validation-prompt-generator.sh ../../applications/2026-06-19
```

This reads `jobs.json` + each filled `cvs/*.html` and produces:
- `validation-prompts/company-name.txt` — prompt asking AI: "is this a strong candidate?"

For each file in `validation-prompts/`:
- Copy the prompt → paste into ChatGPT or Claude
- Use the verdict to decide whether to apply

### 6. Apply

Use the `.pdf` from `cvs/` to apply to each job on LinkedIn.

*Note*. Make sure to double check the generated CVs before applying.

---

## Notes

- `prompt-generator.sh` skips CV shells that already exist, so re-running is safe
- `validation-prompt-generator.sh` skips jobs where the tailored `.html` is still a placeholder
- Company names are slugified from the `company` field in `jobs.json` (lowercase, hyphens)
- The generic CV filename (`Michael Zelensky CV.html`) is read automatically — rename it there to change all output filenames
