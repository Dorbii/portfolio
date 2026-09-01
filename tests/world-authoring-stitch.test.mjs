import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import sharp from "sharp";

// a cached libvips file handle in THIS process would block the child's tile
// rewrites on Windows (sharing violation), so reads must not be retained
sharp.cache(false);

// Control suite for tools/world-authoring/cell.mjs stitch-and-propagate.
//
// Runs the REAL script against a synthetic world (L2_OUT_ROOT relocation) where
// every pixel's correct value is known in advance, so alignment, seam ownership,
// gate blocking, idempotence and pyramid reduction are each verified against a
// computed expectation — the control exists before any generated cell does.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "tools", "world-authoring", "cell.mjs");
const OUT = path.join(ROOT, ".codex-tmp", "dir-stitch", "test-world");
const CELL = 2048, BLEED = 256, GEN = 2560, TILE = 256;

// synthetic paints: low-frequency sines make bytes position-sensitive (a 1px
// misalignment changes values), and seeded white noise supplies the isotropic
// gradient population the lighting gate measures — white noise has uniformly
// distributed gradient directions by construction, the way real texture does
const nz = (x, y, s) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + s) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 2 ** 32 - 0.5) * 40;
};
const F = (x, y) => [
  Math.round(180 + 40 * Math.sin(x / 13.7)),
  Math.round(120 + 30 * Math.sin(y / 17.3) + nz(x, y, 7)),
  Math.round(60 + 25 * Math.sin((x + y) / 23.1)), 255];
const G = (x, y) => [
  Math.round(90 + 35 * Math.sin(y / 11.9 + 1)),
  Math.round(170 + 25 * Math.sin(x / 15.4 + 2) + nz(x, y, 91)),
  Math.round(110 + 45 * Math.sin((x - y) / 19.7)), 255];

function genImage(col, row, paint, { waterDisc, keepWaterPaint } = {}) {
  const ox = col * CELL - BLEED, oy = row * CELL - BLEED;
  const l2 = Buffer.alloc(GEN * GEN * 4);
  const concept = Buffer.alloc(GEN * GEN * 4);
  const mask = Buffer.alloc(GEN * GEN * 4);
  for (let v = 0; v < GEN; v++) {
    for (let u = 0; u < GEN; u++) {
      const [r, g, b, a] = paint(ox + u, oy + v);
      const o = (v * GEN + u) * 4;
      concept[o] = l2[o] = r; concept[o + 1] = l2[o + 1] = g;
      concept[o + 2] = l2[o + 2] = b; concept[o + 3] = l2[o + 3] = a;
      if (waterDisc) {
        const d = Math.hypot(ox + u - waterDisc[0], oy + v - waterDisc[1]);
        if (d < waterDisc[2]) {
          concept[o] = 40; concept[o + 1] = 90; concept[o + 2] = 200;
          mask[o] = mask[o + 1] = mask[o + 2] = 255; mask[o + 3] = 255;
          if (!keepWaterPaint) { l2[o] = l2[o + 1] = l2[o + 2] = l2[o + 3] = 0; }
        }
      }
    }
  }
  return { l2, concept, mask };
}

async function writeArtefacts(dir, id, img) {
  fs.mkdirSync(dir, { recursive: true });
  const save = (buf, name) =>
    sharp(buf, { raw: { width: GEN, height: GEN, channels: 4 } }).png()
      .toFile(path.join(dir, `${id}-${name}.png`));
  await save(img.l2, "l2");
  await save(img.concept, "concept");
  await save(img.mask, "water");
  fs.writeFileSync(path.join(dir, `${id}-water.json`),
    JSON.stringify([{ class: "lake", note: "synthetic control" }]));
}

function runCell(cellArg, fromDir, extra = []) {
  return execFileSync(process.execPath,
    [SCRIPT, "--cell", cellArg, "--from", fromDir, "--describe", "synthetic control", ...extra],
    { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" });
}

async function tileRaw(k, x, y) {
  const f = path.join(OUT, "tiles", `L${k}`, `${x}-${y}.webp`);
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, TILE);
  return data;
}

function treeHash() {
  const h = crypto.createHash("sha256");
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { h.update(e.name); h.update(fs.readFileSync(p)); }
    }
  };
  walk(path.join(OUT, "tiles"));
  return h.digest("hex");
}

// fresh scratch world and synthetic sources
fs.rmSync(OUT, { recursive: true, force: true });
for (const id of ["c1-1", "c2-1"]) {
  fs.rmSync(path.join(ROOT, ".codex-tmp", "authoring", "cells", id), { recursive: true, force: true });
}
const SYN = path.join(OUT, "synthetic");
await writeArtefacts(path.join(SYN, "a"), "c1-1",
  genImage(1, 1, F, { waterDisc: [3072, 3072, 300] }));
await writeArtefacts(path.join(SYN, "b-bad"), "c2-1",
  genImage(2, 1, G, { waterDisc: [5120, 3072, 300], keepWaterPaint: true }));
await writeArtefacts(path.join(SYN, "b"), "c2-1", genImage(2, 1, G));

test("frontier cell stitches aligned, bleeds one ring, and removes water", async () => {
  const log = runCell("1,1", path.join(SYN, "a"));
  assert.match(log, /accepted, stitched/);

  // alignment: a tile deep inside the kept area equals F exactly
  const t = await tileRaw(0, 10, 10);
  for (const [u, v] of [[0, 0], [131, 7], [255, 255], [64, 200]]) {
    const [r, g, b, a] = F(10 * TILE + u, 10 * TILE + v);
    const o = (v * TILE + u) * 4;
    assert.deepEqual([t[o], t[o + 1], t[o + 2], t[o + 3]], [r, g, b, a],
      `tile 10,10 pixel ${u},${v}`);
  }

  // water zone interior is alpha-0 in the stitched world
  const wt = await tileRaw(0, 12, 12);
  assert.equal(wt[3], 0, "water disc interior must stitch as a hole");

  // bleed: paint continues 256px into the unauthored neighbour, then stops
  const bt = await tileRaw(0, 16, 12);
  const bo = (128 * TILE + 104) * 4;   // territory x=4200, inside the bleed band
  assert.equal(bt[bo + 3], 255, "bleed band must carry opaque context paint");
  assert.ok(!fs.existsSync(path.join(OUT, "tiles", "L0", "17-12.webp")),
    "no tile may be written beyond the cell window");

  // pyramid: an L1 tile is exactly the lanczos3 2:1 reduction of its children
  const canvas = sharp({ create: { width: TILE * 2, height: TILE * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const overlays = [];
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const child = path.join(OUT, "tiles", "L0", `${10 + dx}-${10 + dy}.webp`);
    overlays.push({ input: fs.readFileSync(child), left: dx * TILE, top: dy * TILE });
  }
  const expected = await sharp(await canvas.composite(overlays).png().toBuffer())
    .resize(TILE, TILE, { kernel: "lanczos3" }).webp({ lossless: true, effort: 4 }).toBuffer();
  const got = fs.readFileSync(path.join(OUT, "tiles", "L1", "5-5.webp"));
  assert.equal(Buffer.compare(got, expected), 0, "L1 tile must be the exact reduction");

  // seven levels exist, down to the single coarsest tile
  for (let k = 0; k < 7; k++) {
    assert.ok(fs.readdirSync(path.join(OUT, "tiles", `L${k}`)).length > 0, `level ${k} populated`);
  }
});

test("a failing gate blocks the stitch entirely", async () => {
  const before = treeHash();
  assert.throws(() => runCell("2,1", path.join(SYN, "b-bad")), /NOT accepted|Command failed/);
  assert.equal(treeHash(), before, "a failed cell must leave the world untouched");
  const manifest = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));
  assert.ok(!manifest.cells["c2-1"], "failed cell must not be recorded");
});

test("second cell takes its side of the tab seam and preserves the neighbour", async () => {
  runCell("2,1", path.join(SYN, "b"));

  // far side of the seam reach: pure G
  const t16 = await tileRaw(0, 16, 12);
  for (const [u, v] of [[200, 30], [255, 255]]) {
    const [r, g, b] = G(16 * TILE + u, 12 * TILE + v);
    const o = (v * TILE + u) * 4;
    assert.deepEqual([t16[o], t16[o + 1], t16[o + 2]], [r, g, b], `pure G at ${u},${v}`);
  }
  // neighbour's interior is untouched: pure F
  const t15 = await tileRaw(0, 15, 12);
  {
    const [r, g, b] = F(15 * TILE + 10, 12 * TILE + 100);
    const o = (100 * TILE + 10) * 4;
    assert.deepEqual([t15[o], t15[o + 1], t15[o + 2]], [r, g, b], "pure F on A's side");
  }
  // the seam band blends the two paints and stays fully opaque — no gap, no
  // third paint, for every pixel across the whole band height
  for (const [tx, xs] of [[15, [96, 255]], [16, [0, 160]]]) {
    const td = await tileRaw(0, tx, 12);
    for (let v = 0; v < TILE; v += 3) {
      for (let u = xs[0]; u <= xs[1]; u += 2) {
        const x = tx * TILE + u, y = 12 * TILE + v;
        const fa = F(x, y), gb = G(x, y);
        const o = (v * TILE + u) * 4;
        assert.equal(td[o + 3], 255, `seam band opaque at ${x},${y}`);
        for (let ch = 0; ch < 3; ch++) {
          const lo = Math.min(fa[ch], gb[ch]) - 2, hi = Math.max(fa[ch], gb[ch]) + 2;
          assert.ok(td[o + ch] >= lo && td[o + ch] <= hi,
            `seam pixel ${x},${y} ch${ch} = ${td[o + ch]} outside [${lo},${hi}]`);
        }
      }
    }
  }
});

test("re-stitching a cell from the same source is byte-idempotent", async () => {
  const before = treeHash();
  const log = runCell("2,1", path.join(SYN, "b"), ["--force"]);
  assert.equal(treeHash(), before, "identical source must reproduce identical tiles");
  assert.match(log, /total 0 written/);
});

test("manifest records the contract and both cells", () => {
  const m = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));
  assert.equal(m.format, "l2-cell-pyramid");
  assert.equal(m.contract.levels, 7);
  assert.equal(m.contract.keptPx, 2048);
  assert.deepEqual(m.levelTiles[0], [40, 32]);
  assert.ok(m.cells["c1-1"] && m.cells["c2-1"]);
  assert.deepEqual(m.cells["c1-1"].waterZones, ["lake"]);
  // success: clear the scratch world (kept on failure for diagnosis)
  fs.rmSync(OUT, { recursive: true, force: true });
  for (const id of ["c1-1", "c2-1"]) {
    fs.rmSync(path.join(ROOT, ".codex-tmp", "authoring", "cells", id), { recursive: true, force: true });
  }
});
