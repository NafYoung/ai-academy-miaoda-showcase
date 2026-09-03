import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
export const SCREENSHOT_DIRECTORY = path.join(PROJECT_ROOT, "assets", "screenshots");

function readPngDimensions(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a" || buffer.length < 24) {
    throw new Error("not a valid PNG");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

export async function collectScreenshotManifest(directory = SCREENSHOT_DIRECTORY) {
  const names = (await fs.readdir(directory)).filter((name) => name.endsWith(".png")).sort();
  const manifest = [];

  for (const name of names) {
    const buffer = await fs.readFile(path.join(directory, name));
    const { width, height } = readPngDimensions(buffer);
    manifest.push({
      file: name,
      bytes: buffer.length,
      width,
      height,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    });
  }

  return manifest;
}

async function main() {
  const manifest = await collectScreenshotManifest();
  for (const item of manifest) {
    console.log(`${item.sha256}  ${item.file}  ${item.width}x${item.height}  ${item.bytes} bytes`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  await main();
}
