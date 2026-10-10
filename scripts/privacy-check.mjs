// 公开前的脱敏扫描：源码与构建产物都不得出现私有标识。
// 组织名等敏感词不写进仓库，在本机或 CI 通过 SHOWCASE_PRIVATE_TERMS 传入（竖线分隔）。
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIPPED = new Set(['.git', 'node_modules', 'coverage']);
const SELF = 'scripts/privacy-check.mjs';

const BLOCKED_FILES = [
  { rule: 'environment-file', pattern: /(^|\/)\.env(?:\.|$)/i },
  { rule: 'platform-metadata', pattern: /(^|\/)\.spark(?:\/|$)/i },
  { rule: 'server-code', pattern: /(^|\/)server\//i },
];

const BLOCKED_TEXT = [
  {
    rule: 'tenant-resource-url',
    pattern: /https?:\/\/(?!www\.feishu\.cn(?:\/|$))[a-z0-9.-]*feishu\.cn\/(?:wiki|minutes|base|sheets|docx?)(?:\/|\b)/i,
  },
  { rule: 'private-app-domain', pattern: /[a-z0-9.-]+\.feishuapp\.com\/app\//i },
  { rule: 'private-service-domain', pattern: /miaoda-git\.feishu\.cn|aiforce\.cloud/i },
  { rule: 'platform-app-id', pattern: /\bapp_[a-z0-9]{8,}\b/i },
  { rule: 'base-table-id', pattern: /\btbl[A-Za-z0-9]{12,}\b/ },
  { rule: 'base-field-id', pattern: /\bfld[A-Za-z0-9]{8}\b/ },
  { rule: 'base-record-id', pattern: /\brecv[A-Za-z0-9]{8,}\b/ },
  // 演示数据使用 od-demo-* 虚构部门 ID，予以放行。
  { rule: 'lark-private-id', pattern: /\b(?:ou_|on_|od-(?!demo-))[a-z0-9_-]{8,}\b/i },
  { rule: 'agent-channel-token', pattern: /\bwsk_[A-Za-z0-9]{8,}\b/ },
  { rule: 'credential-assignment', pattern: /(?:access[_-]?token|client[_-]?secret|private[_-]?key|password)\s*[:=]\s*["'][^"']{8,}/i },
];

async function collect(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (SKIPPED.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collect(abs)));
    else if (entry.isFile()) out.push(path.relative(ROOT, abs));
  }
  return out;
}

const terms = (process.env.SHOWCASE_PRIVATE_TERMS ?? '').split('|').map((t) => t.trim().toLowerCase()).filter(Boolean);
const findings = [];
const files = await collect(ROOT);
for (const file of files) {
  for (const { rule, pattern } of BLOCKED_FILES) if (pattern.test(file)) findings.push(`${rule}: ${file}`);
  if (file === SELF) continue;
  const buffer = await fs.readFile(path.join(ROOT, file));
  if (buffer.subarray(0, 8000).includes(0)) continue;
  const text = buffer.toString('utf8');
  for (const { rule, pattern } of BLOCKED_TEXT) if (pattern.test(text)) findings.push(`${rule}: ${file}`);
  const lower = text.toLowerCase();
  if (terms.some((t) => lower.includes(t))) findings.push(`private-review-term: ${file}`);
}

if (findings.length) {
  console.error(`Privacy check failed (${findings.length}):\n- ${findings.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Privacy check passed: ${files.length} files scanned, ${terms.length} private terms checked.`);
}
