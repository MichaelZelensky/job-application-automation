import fs from "fs";
import path from "path";
import OpenAI from "openai";

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
    console.error("Usage: node tailor.js [-ai] <applications/YYYY-MM-DD>");
    process.exit(1);
  }
  return arg;
};

const getProjectRoot = (): string => {
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

STRICT RULES:
- Return COMPLETE valid HTML
- Do NOT truncate or summarize
- Keep ORIGINAL structure and styling intact
- Only modify content (text, bullet points, ordering if needed)
- Do NOT introduce new frameworks or rewrite layout

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

const isAiMode = (): boolean => process.argv.includes("-ai");

const loadSecrets = (): { openaiApiKey: string } => {
  const secretsPath = path.resolve(__dirname, "../../../secrets.json");

  if (!fs.existsSync(secretsPath)) {
    throw new Error("Missing secrets.json in project root");
  }

  const secrets = JSON.parse(fs.readFileSync(secretsPath, "utf-8"));

  if (!secrets.openaiApiKey || secrets.openaiApiKey.includes("YOUR_KEY")) {
    throw new Error("Invalid OpenAI API key in secrets.json");
  }

  return secrets;
};

let openai: OpenAI | null = null;
let aiDisabled = false;

try {
  openai = new OpenAI({
    apiKey: loadSecrets().openaiApiKey
  });
} catch (e) {
  aiDisabled = true;
  console.error(`[AI MODE DISABLED] ${(e as Error).message}`);
}

const callOpenAI = async (prompt: string): Promise<string> => {
  if (!openai) {
    throw new Error("OpenAI client not initialized");
  }

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: "Return ONLY valid HTML. No markdown, no explanation."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  return res.choices[0]?.message?.content ?? "";
};

const runAiTailoring = async (ctx: Context, job: Job): Promise<void> => {
  const company =
    job.company && job.company !== "null" ? job.company : "unknown";
  const slug = slugify(company);
  const tailorFile = path.join(ctx.tailorDir, `${slug}.txt`);
  const cvFile = path.join(
    ctx.cvsDir,
    `${ctx.cvBaseName} - ${slug}.html`
  );
  if (shouldSkipAiGeneration(cvFile)) {
    console.log(`✓ ${company} → already exists (skipped)`);
    return;
  }
  const prompt = buildPrompt(job, ctx.genericCvHtml);
  fs.writeFileSync(tailorFile, prompt, "utf-8");
  try {
    console.log(`✓ ${company} → waiting for OpenAI...`);
    const startedAt = Date.now();
    const html = await callOpenAI(prompt);
    console.log(`✓ ${company} → received response (${((Date.now() - startedAt) / 1000).toFixed(1)}s)`);
    fs.writeFileSync(cvFile, html, "utf-8");
    console.log(`✓ ${company} → AI filled`);
  } catch (e) {
    console.error(`✗ ${company} → AI failed`);
    console.error((e as Error).message);
  }
};

const shouldSkipAiGeneration = (cvFile: string): boolean => {
  if (!fs.existsSync(cvFile)) {
    return false;
  }

  const html = fs.readFileSync(cvFile, "utf-8").trim();

  return (
    html.length > 0 &&
    !html.includes("Paste generated HTML here")
  );
};

const run = async (): Promise<void> => {
  const batchDir = getBatchDir();
  const ai = isAiMode();

  if (ai && aiDisabled) {
    console.error("ERROR: AI mode requested but OpenAI is not configured properly.");
    console.error("Fix secrets.json and retry.");
    process.exit(1);
  }

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

    if (ai) {
      await runAiTailoring(ctx, job);
    } else {
      createTailorFiles(ctx, job);
    }

    count++;
  }

  console.log("");
  console.log(`Done — processed ${count} jobs`);
  console.log(`  tailor prompts : ${tailorDir}`);

  if (ai) {
    console.log(`  CVs (AI filled): ${cvsDir}`);
  } else {
    console.log(`  CV shells      : ${cvsDir}`);
  }
};

run();