import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  BLOCKED_FILE_PATTERNS,
  runPrivacyCheck,
  scanFilePath,
  scanText,
} from "../scripts/privacy-check.mjs";

test("文本扫描能识别组织名称、租户链接与私有配置形态", () => {
  const sample = [
    "PA" + "NE Academy",
    "https://example." + "feishu.cn/wiki/private",
    "server/" + "capabilities/course.json",
  ].join("\n");

  const findings = scanText(sample, "sample.txt");
  assert.ok(findings.some(({ rule }) => rule === "internal-brand"));
  assert.ok(findings.some(({ rule }) => rule === "tenant-resource-url"));
  assert.ok(findings.some(({ rule }) => rule === "private-capability-path"));
});

test("公开飞书官网链接不会被误报", () => {
  const findings = scanText(
    "https://www.feishu.cn/hc/zh-CN/academy/guides_for_new_users",
    "src/courses.js",
  );
  assert.deepEqual(findings, []);
});

test("文件路径扫描阻止环境文件与私有平台元数据", () => {
  assert.ok(BLOCKED_FILE_PATTERNS.length >= 3);
  assert.ok(scanFilePath(".env").length > 0);
  assert.ok(scanFilePath(".spark/meta.json").length > 0);
  assert.ok(scanFilePath("server/" + "capabilities/course.json").length > 0);
  assert.deepEqual(scanFilePath("src/courses.js"), []);
});

test("全仓扫描遍历嵌套文本文件并跳过二进制内容", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "orbit-privacy-safe-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "src"));
  await fs.writeFile(path.join(root, "src", "safe.js"), "export const source = 'www.feishu.cn';");
  await fs.writeFile(path.join(root, "preview.bin"), Buffer.from([0, 1, 2, 3]));

  const result = await runPrivacyCheck(root);
  assert.deepEqual(result.files, ["preview.bin", "src/safe.js"]);
  assert.deepEqual(result.findings, []);
});

test("全仓扫描同时报告受限路径与租户资源", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "orbit-privacy-blocked-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, ".env"), "SAFE_TEST_VALUE=placeholder");
  await fs.writeFile(
    path.join(root, "notes.txt"),
    "https://tenant." + "feishu.cn/minutes/example",
  );

  const { findings } = await runPrivacyCheck(root);
  assert.ok(findings.some(({ rule }) => rule === "environment-file"));
  assert.ok(findings.some(({ rule }) => rule === "tenant-resource-url"));
});
