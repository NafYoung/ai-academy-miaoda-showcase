import test from "node:test";
import assert from "node:assert/strict";

import {
  BLOCKED_FILE_PATTERNS,
  scanFilePath,
  scanText,
} from "../scripts/privacy-check.mjs";

test("文本扫描能识别组织名称、租户链接与私有配置形态", () => {
  const sample = [
    "PANE Academy",
    "https://example.feishu.cn/wiki/private",
    "server/capabilities/course.json",
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
  assert.ok(scanFilePath("server/capabilities/course.json").length > 0);
  assert.deepEqual(scanFilePath("src/courses.js"), []);
});
