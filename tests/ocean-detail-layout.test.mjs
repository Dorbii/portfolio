import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import sharp from "sharp";

const sourceFile = "public/career-world/layers/water/ocean/details/ocean-details-r1.png";
const labelsFile = "public/career-world/layers/water/ocean/details/ocean-detail-labels-r1.png";
const layoutFile = "public/career-world/layers/water/ocean/details/ocean-detail-layout-r1.json";
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

test("ocean detail layout deterministically partitions the unchanged source atlas", async () => {
  const sourceBefore = await fs.readFile(sourceFile);
  const first = spawnSync(process.execPath, ["scripts/build-ocean-detail-layout.mjs"], { encoding: "utf8" });
  assert.equal(first.status, 0, first.stderr);
  const firstLabels = await fs.readFile(labelsFile);
  const firstLayout = await fs.readFile(layoutFile);
  const second = spawnSync(process.execPath, ["scripts/build-ocean-detail-layout.mjs"], { encoding: "utf8" });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(sha(await fs.readFile(labelsFile)), sha(firstLabels));
  assert.equal(sha(await fs.readFile(layoutFile)), sha(firstLayout));
  assert.equal(sha(await fs.readFile(sourceFile)), sha(sourceBefore));

  const layout = JSON.parse(firstLayout);
  const source = await sharp(sourceBefore).metadata();
  const { data: labels, info } = await sharp(firstLabels).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([layout.width, layout.height], [source.width, source.height]);
  assert.deepEqual([info.width, info.height, info.channels], [source.width, source.height, 3]);
  assert.equal(layout.sourceHash, sha(sourceBefore));
  assert.ok(layout.sprites.length > 1);
  assert.equal(new Set(layout.sprites.map(({ id }) => id)).size, layout.sprites.length);

  const sprites = new Map(layout.sprites.map((sprite) => [sprite.id, { ...sprite, pixels: 0 }]));
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const offset = (y * info.width + x) * info.channels;
    const id = labels[offset];
    assert.equal(labels[offset + 1], 0);
    assert.equal(labels[offset + 2], 0);
    if (!id) continue;
    const sprite = sprites.get(id);
    assert.ok(sprite, `label ${id} has no sprite`);
    const [left, top, width, height] = sprite.rect;
    assert.ok(x >= left && x < left + width && y >= top && y < top + height, `label ${id} escapes its rect`);
    sprite.pixels++;
  }
  for (const sprite of sprites.values()) {
    const [x, y, width, height] = sprite.rect;
    assert.ok([x, y, width, height].every(Number.isFinite));
    assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0);
    assert.ok(x + width <= info.width && y + height <= info.height);
    assert.ok(sprite.pixels > 0, `sprite ${sprite.id} is empty`);
  }
});
