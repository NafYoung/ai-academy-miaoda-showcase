import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { scanText } from "./privacy-check.mjs";

const execFileAsync = promisify(execFile);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const SCREENSHOT_DIRECTORY = path.join(PROJECT_ROOT, "assets", "screenshots");

const BLOCKED_OCR_PATTERNS = [
  { rule: "tenant-domain", pattern: /(?:feishuapp|larkoffice|aiforce)\.com/i },
  { rule: "platform-app-id", pattern: /\bapp_[a-z0-9]{8,}\b/i },
  { rule: "base-table-id", pattern: /\btbl[a-z0-9]{8,}\b/i },
  { rule: "lark-user-id", pattern: /\b(?:ou_|on_|od-)[a-z0-9_-]{8,}\b/i },
  { rule: "email-address", pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  { rule: "mainland-phone", pattern: /\b1[3-9]\d{9}\b/ },
];

async function recognize(file) {
  const { stdout } = await execFileAsync(
    "tesseract",
    [file, "stdout", "-l", "chi_sim+eng", "--psm", "6"],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  return stdout;
}

async function main() {
  const names = (await fs.readdir(SCREENSHOT_DIRECTORY))
    .filter((name) => name.endsWith(".png"))
    .sort();
  const findings = [];
  const privateTerms = (process.env.SHOWCASE_PRIVATE_TERMS ?? "").split("|");

  for (const name of names) {
    const text = await recognize(path.join(SCREENSHOT_DIRECTORY, name));
    findings.push(...scanText(text, name, privateTerms));
    for (const { rule, pattern } of BLOCKED_OCR_PATTERNS) {
      if (pattern.test(text)) findings.push({ file: name, rule });
    }
  }

  if (findings.length > 0) {
    console.error("Screenshot OCR check failed:");
    for (const finding of findings) console.error(`- ${finding.rule}: ${finding.file}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Screenshot OCR check passed: ${names.length} images scanned.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  await main();
}
