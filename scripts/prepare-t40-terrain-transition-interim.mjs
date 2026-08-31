import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  root,
  "art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r8.png",
);
const outputRoot = path.join(
  root,
  ".codex-tmp/quarantine/terrain/T40-terrain-transition-interim",
);
const riverRect = Object.freeze({ left: 3584, top: 3296, width: 1024, height: 1024 });

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const check = process.argv.includes("--check");
  const metadata = await sharp(sourcePath).metadata();
  assert.deepEqual(
    [metadata.width, metadata.height, metadata.hasAlpha],
    [5760, 4320, true],
    "T40 source authority geometry changed",
  );

  const riverBytes = await sharp(sourcePath)
    .extract(riverRect)
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  const contextBytes = await sharp(sourcePath)
    .resize(1440, 1080, { kernel: "lanczos3" })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  const manifest = {
    schemaVersion: 1,
    id: "career-world/terrain/t40-river-exit-input@r1",
    source: {
      path: path.relative(root, sourcePath).replaceAll("\\", "/"),
      sha256: sha256(await readFile(sourcePath)),
      dimensions: [metadata.width, metadata.height],
    },
    riverEditTarget: {
      path: "river-exit-authority-1024.png",
      sha256: sha256(riverBytes),
      sourceRect: [riverRect.left, riverRect.top, riverRect.width, riverRect.height],
      role: "edit-target",
    },
    fullRegionReference: {
      path: "full-detail-region-reference-1440.png",
      sha256: sha256(contextBytes),
      role: "composition-reference",
    },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);

  if (check) {
    for (const [relativePath, expected] of [
      ["river-exit-authority-1024.png", riverBytes],
      ["full-detail-region-reference-1440.png", contextBytes],
      ["input-manifest.json", manifestBytes],
    ]) {
      const actual = await readFile(path.join(outputRoot, relativePath));
      assert.equal(sha256(actual), sha256(expected), `${relativePath} is stale`);
    }
  } else {
    await mkdir(outputRoot, { recursive: true });
    await Promise.all([
      writeFile(path.join(outputRoot, "river-exit-authority-1024.png"), riverBytes),
      writeFile(path.join(outputRoot, "full-detail-region-reference-1440.png"), contextBytes),
      writeFile(path.join(outputRoot, "input-manifest.json"), manifestBytes),
    ]);
  }

  console.log(JSON.stringify(manifest, null, 2));
}

await main();
