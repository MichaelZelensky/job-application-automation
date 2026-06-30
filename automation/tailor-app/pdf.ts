import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const getBatchDir = (): string => {
    const batchDir = process.argv[2];

    if (!batchDir) {
        console.error("Usage: node pdf.js <applications/YYYY-MM-DD>");
        process.exit(1);
    }

    return batchDir;
};

const detectBrowser = (): string => {
    if (process.platform === "win32") {
        const candidates = [
            "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
        ];

        const browser = candidates.find(fs.existsSync);

        if (!browser) {
            throw new Error("Chrome or Edge not found.");
        }

        return browser;
    }

    if (process.platform === "darwin") {
        const candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
        ];

        const browser = candidates.find(fs.existsSync);

        if (!browser) {
            throw new Error("Chrome or Edge not found.");
        }

        return browser;
    }

    const candidates = [
        "google-chrome",
        "chromium",
        "chromium-browser",
        "microsoft-edge"
    ];

    for (const candidate of candidates) {
        try {
            execSync(`${candidate} --version`, { stdio: "ignore" });
            return candidate;
        } catch {
            // continue
        }
    }

    throw new Error("Chrome/Chromium/Edge not found.");
};

const shouldSkipPdf = (htmlFile: string): boolean => {
    const html = fs.readFileSync(htmlFile, "utf8").trim();

    return (
        html.length === 0 ||
        html.includes("Paste generated HTML here")
    );
};

const runPdfGeneration = (
    browser: string,
    input: string,
    output: string
): void => {
    const absoluteInput = path.resolve(input);
    const absoluteOutput = path.resolve(output);

    const fileUrl = `file:///${absoluteInput.replace(/\\/g, "/")}`;

    const command =
        `"${browser}" ` +
        "--headless=new " +
        "--disable-logging " +
        "--log-level=3 " +
        "--no-pdf-header-footer " +
        `--print-to-pdf="${absoluteOutput}" ` +
        `"${fileUrl}"`;

    execSync(command, {
        stdio: "inherit"
    });
};

const run = (): void => {
    const batchDir = getBatchDir();
    const cvsDir = path.join(batchDir, "cvs");

    if (!fs.existsSync(cvsDir)) {
        console.error(`Directory not found: ${cvsDir}`);
        process.exit(1);
    }

    const browser = detectBrowser();

    console.log(`Using browser: ${browser}`);
    console.log(`Processing: ${cvsDir}`);
    console.log("------------------------------------------------------------");

    const htmlFiles = fs
        .readdirSync(cvsDir)
        .filter(file => file.endsWith(".html"));

    if (htmlFiles.length === 0) {
        console.log("No HTML files found.");
        return;
    }

    let generatedCount = 0;
    let skippedCount = 0;

    for (const file of htmlFiles) {
        const input = path.join(cvsDir, file);

        if (shouldSkipPdf(input)) {
            console.log(`Skipping: ${file}`);
            skippedCount++;
            continue;
        }

        const output = input.replace(/\.html$/i, ".pdf");

        console.log(
            `Converting: ${file} → ${path.basename(output)}`
        );

        try {
            runPdfGeneration(browser, input, output);
            console.log("  → Success");
            generatedCount++;
        } catch (error) {
            console.error("  → Failed");

            if (error instanceof Error) {
                console.error(error.message);
            } else {
                console.error(error);
            }
        }
    }

    console.log("------------------------------------------------------------");
    console.log(
        `Done. Generated ${generatedCount} PDF(s), skipped ${skippedCount}.`
    );
};

run();