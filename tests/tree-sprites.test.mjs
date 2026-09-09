// The cut-out route's data contract (tree-sprites.mjs → treeSpritesWebGl.ts):
// every cell the world manifest lists has its sprite manifest and atlas, and
// every tree in it lies inside its tile and its atlas, in painter's order.
// The runtime fetches for listed cells only, so a stale listing is a 404 the
// owner sees as still trees — this is where that is caught instead.
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { deriveBranchJoints } from "../docs/career-world/session3-tools/tree-branch-rig.mjs";
import { createTreeMotionGuard } from "../features/career-world/layers/terrain/components/treeMotionGuard.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUTHORITY = path.join(ROOT, "public/career-world/layers/terrain/authority");
const WORLD_MANIFEST = path.join(AUTHORITY, "manifests/terrain-tree-sprites-r1.json");
const TILE_PX = 2048;

test("tree motion slows for sustained stalls, recovers after load, and retries after stopping", () => {
  let now = 100;
  const guard = createTreeMotionGuard(now);
  function frames(interval, count) {
    let state;
    for (let i = 0; i < count; i += 1) state = guard.update(now += interval);
    return state;
  }
  assert.equal(frames(17, 200).mode, "full");
  assert.equal(frames(85, 70).mode, "half");
  assert.equal(frames(17, 1).mode, "half", "one quick frame must not cancel sustained backpressure");
  assert.equal(frames(17, 300).mode, "full", "normal frames must release the loading penalty");
  const modes = new Set();
  for (let i = 0; i < 55; i += 1) modes.add(frames(180, 1).mode);
  assert.ok(modes.has("half") && modes.has("stopped"), "persistent overload progressively backs off");
  assert.equal(frames(17, 900).mode, "full", "a stopped pass eventually retries and stays recovered");
  guard.resetTiming(now += 60000);
  assert.equal(frames(17, 1).mode, "full", "resuming a hidden page does not count its hidden time as render cost");
});

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
      if (tree.branches) {
        assert.equal(tree.branches.length, 2, "a crown has left and right branch joints");
        for (const side of tree.branches) {
          assert.equal(side.length, 4, "each side fits its vec4 vertex attribute");
          assert.ok(side.every(joint => Number.isFinite(joint) && joint >= 0 && joint < 1));
          const used = side.filter(joint => joint > 0);
          assert.deepEqual(used, [...used].sort((a, b) => a - b), "joints progress up the trunk");
        }
      }
      for (const rect of [tree.sprite, tree.patch]) {
        assert.ok(rect[0] >= 0 && rect[1] >= 0 && rect[0] + width <= atlasWidth && rect[1] + height <= atlasHeight, `${key} crop ${rect} inside the atlas`);
      }
      assert.ok(tree.foot[1] >= lastFootY, `${key} trees are in painter's order (foot y ascending)`);
      lastFootY = tree.foot[1];
    }
  }
});

test("branch joints follow silhouette tips, mirror with the art, and ignore empty masks", () => {
  const width = 81, height = 101, foot = [40, 95], crownHeight = 90;
  const mask = new Uint8Array(width * height);
  for (let y = 8; y < foot[1]; y += 1) {
    const leftReach = 2 + 26 * Math.exp(-(((y - 62) / 5) ** 2)) + 17 * Math.exp(-(((y - 33) / 4) ** 2));
    const rightReach = 2 + 21 * Math.exp(-(((y - 73) / 5) ** 2)) + 15 * Math.exp(-(((y - 45) / 4) ** 2));
    for (let x = Math.ceil(foot[0] - leftReach); x <= Math.floor(foot[0] + rightReach); x += 1) mask[y * width + x] = 1;
  }
  const joints = deriveBranchJoints(mask, width, height, foot, crownHeight);
  assert.ok(joints.every(side => side.filter(joint => joint > 0).length > 1), "visible branch tiers articulate on each side");
  const mirrored = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) mirrored[y * width + width - 1 - x] = mask[y * width + x];
  const reverse = deriveBranchJoints(mirrored, width, height, [width - 1 - foot[0], foot[1]], crownHeight);
  assert.deepEqual(reverse, [joints[1], joints[0]], "mirroring the crown swaps the joint sides");
  const empty = deriveBranchJoints(new Uint8Array(mask.length), width, height, foot, crownHeight);
  assert.ok(empty.flat().every(joint => joint === 0), "empty art must not invent a rig");
  for (let side = 0; side < joints.length; side += 1) {
    for (const joint of joints[side].filter(value => value > 0)) {
      const y = foot[1] - joint * crownHeight;
      const tips = side === 0 ? [33, 62] : [45, 73];
      assert.ok(tips.some(tip => Math.abs(tip - y) <= crownHeight * 0.1), "a joint stays near a painted protrusion");
    }
  }
});
