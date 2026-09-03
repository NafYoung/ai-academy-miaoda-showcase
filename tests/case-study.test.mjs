import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import { collectScreenshotManifest } from "../scripts/screenshot-manifest.mjs";

test("案例页和 README 明确说明脱敏与合成数据边界", async () => {
  const [html, readme] = await Promise.all([
    fs.readFile(new URL("../index.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  for (const text of [html, readme]) {
    assert.match(text, /真实界面结构/);
    assert.match(text, /合成示例数据/);
    assert.doesNotMatch(text, /Orbit Academy/);
  }
});

test("公开截图清单完整且满足桌面展示尺寸", async () => {
  const manifest = await collectScreenshotManifest();
  assert.equal(manifest.length, 10);
  assert.equal(new Set(manifest.map(({ sha256 }) => sha256)).size, manifest.length);

  for (const item of manifest) {
    assert.match(item.file, /^\d{2}-[a-z0-9-]+\.png$/);
    assert.equal(item.width, 1280);
    assert.ok(item.height >= 660);
    assert.ok(item.bytes > 100_000);
  }
});

test("案例页引用关键员工端、内容端与治理端证据", async () => {
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  const required = [
    "01-home.png",
    "02-course-center.png",
    "03-my-learning.png",
    "04-course-submission.png",
    "08-admin-review-workflow.png",
    "09-delete-impact-preview.png",
    "10-ai-quiz-review.png",
  ];

  for (const file of required) assert.match(html, new RegExp(file.replace(".", "\\.")));
});
