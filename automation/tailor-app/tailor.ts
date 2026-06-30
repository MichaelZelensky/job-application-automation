import fs from "fs";
import path from "path";

type Job = {
  company?: string;
  title?: string;
  description?: string;
  url?: string;
};

type Context = {
  batchDir: string;
  jobsFile: string;
  tailorDir: string;
  cvsDir: string;
  genericCvHtml: string;
  cvBaseName: string;
  rootDir: string;
};

const getBatchDir = (): string => {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node tailor.js <applications/YYYY-MM-DD>");
    process.exit(1);
  }
  return arg;
};

const getProjectRoot = (): string => {
  // tailor.ts → dist → automation/tailor-app → repo root
  return path.resolve(__dirname, "../../..");
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const readJobs = (filePath: string): Job[] =>
  fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => JSON.parse(l));

const readGenericCv = (rootDir: string): { html: string; baseName: string } => {
  const dir = path.join(rootDir, "generic-cv");

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".html"));

  if (files.length === 0) {
    console.error("Error: no HTML CV found in generic-cv/");
    process.exit(1);
  }

  const file = files[0];
  const html = fs.readFileSync(path.join(dir, file), "utf-8");

  return {
    html,
    baseName: path.basename(file, ".html")
  };
};

const copyAssets = (rootDir: string, cvsDir: string): void => {
  const src = path.join(rootDir, "generic-cv", "html-assets");
  const dst = path.join(cvsDir, "html-assets");

  if (!fs.existsSync(src)) return;
  if (fs.existsSync(dst)) return;

  fs.cpSync(src, dst, { recursive: true });
  console.log(`Copied html-assets → ${dst}`);
};

const buildPrompt = (job: Job, cvHtml: string): string => `
TASK:
Tailor the CV below for the job description.
Produce complete updated HTML — do not truncate or summarise.
Keep the same HTML structure and styles as the original.

---

JOB TITLE:
${job.title ?? ""}

COMPANY:
${job.company ?? "unknown"}

JOB DESCRIPTION:
${job.description ?? ""}

---

BASE CV (HTML):
${cvHtml}
`;

const ensureDirs = (ctx: Context): void => {
  fs.mkdirSync(ctx.tailorDir, { recursive: true });
  fs.mkdirSync(ctx.cvsDir, { recursive: true });
};

const createTailorFiles = (ctx: Context, job: Job): void => {
  const company = job.company && job.company !== "null" ? job.company : "unknown";
  const slug = slugify(company);

  const tailorFile = path.join(ctx.tailorDir, `${slug}.txt`);
  const cvFile = path.join(
    ctx.cvsDir,
    `${ctx.cvBaseName} - ${slug}.html`
  );

  fs.writeFileSync(tailorFile, buildPrompt(job, ctx.genericCvHtml), "utf-8");

  if (!fs.existsSync(cvFile)) {
    fs.writeFileSync(
      cvFile,
      `<!-- Placeholder CV — ${company} -->
<!-- Paste generated HTML here from tailor-prompts/${slug}.txt -->`,
      "utf-8"
    );
  }

  console.log(`✓ ${company} → ${slug}`);
};

const run = (): void => {
  const batchDir = getBatchDir();

  const rootDir = getProjectRoot();

  const jobsFile = path.join(batchDir, "jobs.ndjson");
  const tailorDir = path.join(batchDir, "tailor-prompts");
  const cvsDir = path.join(batchDir, "cvs");

  if (!fs.existsSync(jobsFile)) {
    console.error(`Error: ${jobsFile} not found`);
    process.exit(1);
  }

  const { html: genericCvHtml, baseName: cvBaseName } =
    readGenericCv(rootDir);

  const ctx: Context = {
    batchDir,
    jobsFile,
    tailorDir,
    cvsDir,
    genericCvHtml,
    cvBaseName,
    rootDir
  };

  ensureDirs(ctx);
  copyAssets(rootDir, cvsDir);

  const jobs = readJobs(jobsFile);

  let count = 0;

  for (const job of jobs) {
    if (!job.company && !job.title) continue;
    createTailorFiles(ctx, job);
    count++;
  }

  console.log("");
  console.log(`Done — processed ${count} jobs`);
  console.log(`  tailor prompts : ${tailorDir}`);
  console.log(`  CV shells      : ${cvsDir}`);
};

run();