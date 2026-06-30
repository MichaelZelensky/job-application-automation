import fs from "fs";
import path from "path";

type Job = {
    company?: string;
    title?: string;
    description?: string;
};

const getBatchDir = (): string => {
    const batchDir = process.argv[2];

    if (!batchDir) {
        console.error("Usage: node validate.js <applications/YYYY-MM-DD>");
        process.exit(1);
    }

    return batchDir;
};

const getProjectRoot = (): string =>
    path.resolve(__dirname, "../../..");

const slugify = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);

const readJobs = (jobsFile: string): Job[] =>
    fs
        .readFileSync(jobsFile, "utf8")
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => JSON.parse(line));

const getCvBaseName = (rootDir: string): string => {
    const genericCvDir = path.join(rootDir, "generic-cv");

    const htmlFiles = fs
        .readdirSync(genericCvDir)
        .filter(file => file.endsWith(".html"));

    if (htmlFiles.length === 0) {
        throw new Error("No HTML CV found in generic-cv.");
    }

    return path.basename(htmlFiles[0], ".html");
};

const isPlaceholder = (html: string): boolean =>
    html.trim().startsWith("<!-- Placeholder");

const buildPrompt = (
    job: Job,
    cvHtml: string
): string => `TASK:
Here's a candidate CV and the role description.

Is this a strong candidate?

Be brief (one paragraph maximum).

Flag any obvious gaps or mismatches.

---

JOB TITLE:
${job.title ?? ""}

COMPANY:
${job.company ?? ""}

JOB DESCRIPTION:
${job.description ?? ""}

---

CANDIDATE CV:
${cvHtml}
`;

const run = (): void => {
    const batchDir = getBatchDir();
    const rootDir = getProjectRoot();

    const jobsFile = path.join(batchDir, "jobs.ndjson");
    const cvsDir = path.join(batchDir, "cvs");
    const validationDir = path.join(batchDir, "validation-prompts");

    if (!fs.existsSync(jobsFile)) {
        console.error(`Missing ${jobsFile}`);
        process.exit(1);
    }

    fs.mkdirSync(validationDir, { recursive: true });

    const cvBaseName = getCvBaseName(rootDir);
    const jobs = readJobs(jobsFile);

    let generated = 0;
    let skipped = 0;

    for (const job of jobs) {
        const company =
            job.company && job.company !== "null"
                ? job.company
                : "unknown";

        const slug = slugify(company);

        const cvFile = path.join(
            cvsDir,
            `${cvBaseName} - ${slug}.html`
        );

        if (!fs.existsSync(cvFile)) {
            console.log(`Skipping (missing): ${company}`);
            skipped++;
            continue;
        }

        const cvHtml = fs.readFileSync(cvFile, "utf8");

        if (isPlaceholder(cvHtml)) {
            console.log(`Skipping (placeholder): ${company}`);
            skipped++;
            continue;
        }

        const validationFile = path.join(
            validationDir,
            `${slug}.txt`
        );

        fs.writeFileSync(
            validationFile,
            buildPrompt(job, cvHtml),
            "utf8"
        );

        console.log(`✓ ${company}`);
        generated++;
    }

    console.log("");
    console.log(
        `Done — ${generated} validation prompt(s), ${skipped} skipped`
    );
};

run();