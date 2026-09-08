// The cut-out route's data contract (tree-sprites.mjs → treeSpritesWebGl.ts):
// every cell the world manifest lists has its sprite manifest and atlas, and
// every tree in it lies inside its tile and its atlas, in painter's order.
// The runtime fetches for listed cells only, so a stale listing is a 404 the
// owner sees as still trees — this is where that is caught instead.
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUTHORITY = path.join(ROOT, "public/career-world/layers/terrain/authority");
const WORLD_MANIFEST = path.join(AUTHORITY, "manifests/terrain-tree-sprites-r1.json");
const TILE_PX = 2048;

test("every listed tree sprite set exists and its trees fit their tile and atlas", async () => {
  const world = JSON.parse(await readFile(WORLD_MANIFEST, "utf8"));
  assert.equal(world.format, "career-world/tree-sprites@r1");
  const cells = Object.entries(world.cells);
  assert.ok(cells.length >= 1, "at least one cell carries a sprite set");
  for (const [key, summary] of cells) {
    const match = /^(l2-[a-z]+)\/([a-z0-9]+-[0-9]+)$/.exec(key);
    assert.ok(match, `${key} is a tile directory and a cell id`);
    const [, directory, cell] = match;
    const manifestPath = path.join(AUTHORITY, "tiles", directory, `${cell}-trees.json`);
    const atlasPath = path.join(AUTHORITY, "tiles", directory, `${cell}-trees.webp`);
    await stat(atlasPath);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    assert.equal(manifest.format, "career-world/tree-sprites@r1", `${key} manifest format`);
    assert.equal(manifest.cell, cell);
    assert.equal(manifest.tilePx, TILE_PX);
    assert.equal(
      manifest.atlas.path,
      `/career-world/layers/terrain/authority/tiles/${directory}/${cell}-trees.webp`,
      `${key} atlas path is the served webp`,
    );
    assert.deepEqual(manifest.atlas.size, summary.atlas, `${key} atlas size agrees with the world manifest`);
    assert.equal(manifest.trees.length, summary.trees, `${key} tree count agrees with the world manifest`);
    const [atlasWidth, atlasHeight] = manifest.atlas.size;
    let lastFootY = -Infinity;
    for (const tree of manifest.trees) {
      const [left, top, width, height] = tree.box;
      assert.ok(left >= 0 && top >= 0 && left + width <= TILE_PX && top + height <= TILE_PX, `${key} box ${tree.box} inside the tile`);
      assert.ok(tree.foot[0] >= left && tree.foot[0] < left + width, `${key} foot x inside its box`);
      assert.ok(tree.foot[1] > top && tree.foot[1] <= top + height, `${key} foot y inside its box`);
      assert.ok(tree.height > 0 && tree.height <= height, `${key} crown height within its crop`);
      assert.ok(tree.phase >= 0 && tree.phase < 1, `${key} phase in [0, 1)`);
      for (const rect of [tree.sprite, tree.patch]) {
        assert.ok(rect[0] >= 0 && rect[1] >= 0 && rect[0] + width <= atlasWidth && rect[1] + height <= atlasHeight, `${key} crop ${rect} inside the atlas`);
      }
      assert.ok(tree.foot[1] >= lastFootY, `${key} trees are in painter's order (foot y ascending)`);
      lastFootY = tree.foot[1];
    }
  }
});
