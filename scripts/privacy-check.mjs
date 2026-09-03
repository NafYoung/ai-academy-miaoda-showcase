import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const SKIPPED_DIRECTORIES = new Set([
  ".git",
  "coverage",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const TEXT_FIXTURE_FILES = new Set([
  "scripts/ocr-check.mjs",
  "scripts/privacy-check.mjs",
  "tests/privacy-check.test.mjs",
]);

export const BLOCKED_FILE_PATTERNS = Object.freeze([
  { rule: "environment-file", pattern: /(^|\/)\.env(?:\.|$)/i },
  { rule: "private-platform-metadata", pattern: /(^|\/)\.spark(?:\/|$)/i },
  { rule: "private-capability-file", pattern: /(^|\/)server\/capabilities(?:\/|$)/i },
]);

const INTERNAL_BRAND_PATTERN = new RegExp(
  ["\\x50\\x41\\x4e\\x45", "\\x42\\x79\\x74\\x65\\x44\\x61\\x6e\\x63\\x65"].join("|"),
  "i",
);

const BLOCKED_TEXT_PATTERNS = Object.freeze([
  { rule: "internal-brand", pattern: INTERNAL_BRAND_PATTERN },
  {
    rule: "tenant-resource-url",
    pattern:
      /https?:\/\/(?!www\.feishu\.cn(?:\/|$))[a-z0-9.-]*feishu\.cn\/(?:wiki|minutes|base|sheets|docx?)(?:\/|\b)/i,
  },
  { rule: "private-app-domain", pattern: /[a-z0-9.-]+\.feishuapp\.com\/app\//i },
  { rule: "private-capability-path", pattern: /server[\\/]capabilities|@lark-apaas/i },
  { rule: "private-service-domain", pattern: /miaoda-git\.feishu\.cn|aiforce\.cloud/i },
  { rule: "platform-app-id", pattern: /\bapp_[a-z0-9]{8,}\b/i },
  { rule: "base-table-id", pattern: /\btbl[a-z0-9]{8,}\b/i },
  { rule: "base-field-id", pattern: /\bfld[a-z0-9]{8,}\b/i },
  { rule: "lark-private-id", pattern: /\b(?:ou_|on_|od-)[a-z0-9_-]{8,}\b/i },
  {
    rule: "credential-assignment",
    pattern: /(?:access[_-]?token|client[_-]?secret|private[_-]?key|password)\s*[:=]\s*["'][^"']{8,}/i,
  },
]);

export function scanFilePath(relativePath) {
  return BLOCKED_FILE_PATTERNS.filter(({ pattern }) => pattern.test(relativePath)).map(
    ({ rule }) => ({ file: relativePath, rule }),
  );
}

export function scanText(text, relativePath) {
  return BLOCKED_TEXT_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ rule }) => ({
    file: relativePath,
    rule,
  }));
}

async function collectFiles(directory, base = directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath, base)));
    } else if (entry.isFile()) {
      files.push(path.relative(base, absolutePath));
    }
  }

  return files.sort();
}

function isLikelyBinary(buffer) {
  return buffer.subarray(0, Math.min(buffer.length, 8_000)).includes(0);
}

export async function runPrivacyCheck(root = PROJECT_ROOT) {
  const files = await collectFiles(root);
  const findings = [];

  for (const relativePath of files) {
    findings.push(...scanFilePath(relativePath));
    if (TEXT_FIXTURE_FILES.has(relativePath)) continue;

    const buffer = await fs.readFile(path.join(root, relativePath));
    if (isLikelyBinary(buffer)) continue;
    findings.push(...scanText(buffer.toString("utf8"), relativePath));
  }

  return { files, findings };
}

async function main() {
  const { files, findings } = await runPrivacyCheck();

  if (findings.length > 0) {
    console.error("Privacy check failed:");
    for (const finding of findings) {
      console.error(`- ${finding.rule}: ${finding.file}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Privacy check passed: ${files.length} files scanned.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  await main();
}
