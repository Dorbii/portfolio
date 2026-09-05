import fs from "node:fs/promises";
import crypto from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

const root = "public/career-world/layers/terrain/authority";
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const releaseBytes = await fs.readFile(`${root}/manifests/terrain-stream-runtime-r4.json`);
const release = JSON.parse(releaseBytes);
const mount = JSON.parse(await fs.readFile(`${root}/manifests/terrain-local-mount-r1.json`, "utf8"));

test("local land mounting preserves every published cell and records candidate provenance", () => {
  assert.equal(mount.baseReleaseHash, hash(releaseBytes));
  for (const tile of release.tiles) assert.deepEqual(mount.tiles.find((entry) => entry.id === tile.id), tile);
  const occupied = new Set();
  for (const tile of mount.tiles) {
    const key = tile.worldBounds.origin.join(",");
    assert.ok(!occupied.has(key), `overlapping mount at ${key}`); occupied.add(key);
    if (tile.status === "review-candidate") assert.ok(mount.candidates.some((entry) => entry.id === tile.id && entry.sourceSha256 && entry.canonicalSha256));
  }
});

test("world and territory overviews identify the same current land mount and verified bytes", async () => {
  const overview = JSON.parse(await fs.readFile(`${root}/manifests/terrain-overviews-r1.json`, "utf8"));
  assert.equal(overview.inputHash, mount.inputHash);
  for (const image of [overview.world, overview.territory]) {
    const bytes = await fs.readFile(`public${image.path.split("?")[0]}`);
    assert.equal(hash(bytes), image.sha256);
    const meta = await sharp(bytes).metadata();
    assert.deepEqual([meta.width, meta.height], image.dimensions);
    assert.ok(meta.hasAlpha);
  }
});
