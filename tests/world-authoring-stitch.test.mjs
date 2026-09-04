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
// cell.mjs keeps its working dir under the output tree when L2_OUT_ROOT is set
// (lock change 5a): the suite must never read or write the real cells' dirs.
const WORKT = path.join(OUT, "work");
const REAL_WORK = path.join(ROOT, ".codex-tmp", "authoring", "cells");
// fingerprint of the real working dirs (names, sizes, mtimes), skipping any
// cell a live bake is writing right now (a file touched in the last hour)
function realWorkFingerprint(include) {
  const rows = [], cells = [];
  if (fs.existsSync(REAL_WORK)) {
    for (const e of fs.readdirSync(REAL_WORK, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!e.isDirectory()) continue;
      const d = path.join(REAL_WORK, e.name), files = [];
      const walk = (p) => { for (const f of fs.readdirSync(p, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const q = path.join(p, f.name); if (f.isDirectory()) walk(q); else files.push(q); } };
      walk(d);
      const live = files.some((f) => Date.now() - fs.statSync(f).mtimeMs < 3600e3);
      if (include ? !include.includes(e.name) : live) continue;
      cells.push(e.name);
      for (const f of files) { const s = fs.statSync(f); rows.push(`${f}|${s.size}|${s.mtimeMs}`); }
    }
  }
  return { hash: crypto.createHash("sha256").update(rows.join("\n")).digest("hex"), cells };
}
const REAL_WORK_BEFORE = realWorkFingerprint();

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
// G stays byte-distinct from F (ownership checks compare exact values) but
// shares F's blue/green ratio and luma so the palette-conformance gate, which
// judges REAL neighbour drift, does not fire on the synthetic pair
const G = (x, y) => {
  const g = 164 + 25 * Math.sin(x / 15.4 + 2) + nz(x, y, 91);
  return [
    Math.round(90 + 35 * Math.sin(y / 11.9 + 1)),
    Math.round(g),
    Math.round(0.5 * g + 6 * Math.sin((x - y) / 19.7)), 255];
};

function genImage(col, row, paint, { waterDisc, keepWaterPaint, paintedRing, hazeArc, violetRing, disc } = {}) {
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
      if (disc && Math.hypot(ox + u - disc[0], oy + v - disc[1]) < disc[2]) {
        // one dark crown, opaque, on the concept and the shipped l2 alike
        concept[o] = l2[o] = 30; concept[o + 1] = l2[o + 1] = 32; concept[o + 2] = l2[o + 2] = 28;
      }
      if (waterDisc) {
        const d = Math.hypot(ox + u - waterDisc[0], oy + v - waterDisc[1]);
        if (d < waterDisc[2]) {
          concept[o] = 40; concept[o + 1] = 90; concept[o + 2] = 200;
          mask[o] = mask[o + 1] = mask[o + 2] = 255; mask[o + 3] = 255;
          if (!keepWaterPaint) { l2[o] = l2[o + 1] = l2[o + 2] = l2[o + 3] = 0; }
        } else if (violetRing && d >= waterDisc[2] + violetRing[0] && d < waterDisc[2] + violetRing[1]) {
          // saturated violet ground beside the water (hue ~285, b > r, b >= g):
          // blue-leaning to the old classifier, not water to the hue-limited one
          concept[o] = l2[o] = 150; concept[o + 1] = l2[o + 1] = 60; concept[o + 2] = l2[o + 2] = 200;
        } else if (hazeArc && ox + u > waterDisc[0] && d >= waterDisc[2] + hazeArc[0] && d < waterDisc[2] + hazeArc[1]) {
          // a flat blue-grey haze touching the water: sat 0.12, under the
          // classifier's 0.25 — growth must NOT absorb it
          concept[o] = l2[o] = 150; concept[o + 1] = l2[o + 1] = 160; concept[o + 2] = l2[o + 2] = 170;
        } else if (paintedRing && d >= waterDisc[2] + paintedRing[0] && d < waterDisc[2] + paintedRing[1]) {
          // water paint left on LAND in an annulus beyond the mask: a strip of
          // dry paint separates it from the mask edge so the 6px ring gate
          // cannot see it - only a wide ring can (the polyline-mask defect)
          concept[o] = l2[o] = 40; concept[o + 1] = l2[o + 1] = 90; concept[o + 2] = l2[o + 2] = 200;
        }
      }
    }
  }
  return { l2, concept, mask };
}

// A real delivery carries the worker's crown report, and cell.mjs reads it
// (crown gate, 2026-09-03). Every control that stands in for a delivery writes
// one through here, so a new control cannot forget it and fail for the wrong
// reason. Pass a report to craft a bad one, or null to deliver none.
function writeControlReport(dir, id, report) {
  if (report === null) return;
  fs.writeFileSync(path.join(dir, `${id}-report.json`), JSON.stringify(report ?? {
    cell: id,
    crown: { medianMetres: 3.5, medianPx: 73, sampleCount: 24,
      method: "synthetic control", excludedElements: [] },
  }, null, 1));
}

async function writeArtefacts(dir, id, img, report) {
  fs.mkdirSync(dir, { recursive: true });
  const save = (buf, name) =>
    sharp(buf, { raw: { width: GEN, height: GEN, channels: 4 } }).png()
      .toFile(path.join(dir, `${id}-${name}.png`));
  await save(img.l2, "l2");
  await save(img.concept, "concept");
  await save(img.mask, "water");
  fs.writeFileSync(path.join(dir, `${id}-water.json`),
    JSON.stringify([{ class: "lake", note: "synthetic control" }]));
  writeControlReport(dir, id, report);
}

function runCell(cellArg, fromDir, extra = []) {
  return execFileSync(process.execPath,
    [SCRIPT, "--territory", "ninjaone", "--cell", cellArg, "--from", fromDir, "--describe", "synthetic control", ...extra],
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
const SYN = path.join(OUT, "synthetic");
// the edit-mode packet mandates the style canon as the second input of the edit
// call (lock change 5 part 2); the test world carries a synthetic one
{ const seed = path.join(OUT, "sources", "seed"); fs.mkdirSync(seed, { recursive: true });
  await sharp(genImage(0, 0, F).concept, { raw: { width: GEN, height: GEN, channels: 4 } }).png()
    .toFile(path.join(seed, "L2-seed-region-r2-source.png")); }
await writeArtefacts(path.join(SYN, "a"), "c1-1",
  genImage(1, 1, F, { waterDisc: [3072, 3072, 300] }));
await writeArtefacts(path.join(SYN, "b-bad"), "c2-1",
  genImage(2, 1, G, { waterDisc: [5120, 3072, 300], keepWaterPaint: true }));
await writeArtefacts(path.join(SYN, "b"), "c2-1", genImage(2, 1, G));
// water paint 12..40px beyond the mask edge, dry paint in between: invisible to
// the 6px ring, blatant to the 48px ring (owner-approved gate, 2026-09-01)
await writeArtefacts(path.join(SYN, "b-ring"), "c2-1",
  genImage(2, 1, G, { waterDisc: [5120, 3072, 260], paintedRing: [12, 40] }));

test("frontier cell stitches aligned, bleeds one ring, and removes water", async () => {
  const log = runCell("1,1", path.join(SYN, "a"));
  assert.match(log, /accepted, stitched/);
  assert.match(log, /PASS\s+crown scale\s+3\.5 m/, "a compliant crown report must pass");
  assert.match(log, /PASS\s+rock lighting/, "isotropic synthetic paint must pass the rock-lighting gate");

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

test("edit target carries the neighbour's concept paint byte-exact and grey elsewhere", async () => {
  // c1-1 is authored; a dry run for its east neighbour must build the target
  const log = execFileSync(process.execPath, [SCRIPT, "--territory", "ninjaone", "--cell", "2,1", "--dry-run"],
    { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" });
  assert.match(log, /edit target/);
  const f = path.join(WORKT, "c2-1", "context", "edit-target.png");
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, GEN); assert.equal(info.height, GEN);
  const px = (x, y) => { const o = (y * GEN + x) * 4; return [data[o], data[o + 1], data[o + 2]]; };
  const ox = 2 * CELL - BLEED, oy = 1 * CELL - BLEED;   // c2-1's canvas origin in territory px
  // inside c1-1's kept area: the neighbour's concept, byte-exact
  for (const [x, y] of [[100, 1280], [200, 600], [40, 2000]]) {
    assert.deepEqual(px(x, y), F(ox + x, oy + y).slice(0, 3), `neighbour paint at ${x},${y}`);
  }
  // c1-1's bleed over c2-1's own ground (territory x 4096..4352): still the neighbour's paint
  assert.deepEqual(px(400, 1280), F(ox + 400, oy + 1280).slice(0, 3), "bleed paint");
  // beyond the outer third of any authored edge: the grey fill
  for (const [x, y] of [[1280, 1280], [2400, 300], [1300, 2500]]) {
    assert.deepEqual(px(x, y), [96, 104, 88], `grey at ${x},${y}`);
  }
  // lock change 6b: inside the outer third of the west edge the grey carries
  // the neighbour's tone, fading with distance from the kept edge
  {
    const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
    const rs = [], gs = [], bs = [];
    for (let x = 448; x < 512; x++) for (let y = 1280; y < 1344; y++) { const [r, g, b] = px(x, y); rs.push(r); gs.push(g); bs.push(b); }
    const tone = [med(rs), med(gs), med(bs)];
    const THIRD = Math.round(CELL / 3);
    for (const x of [600, 800]) {
      const v = x - BLEED;
      const w = 1 - (v - BLEED) / (THIRD - BLEED);
      const expect = [96, 104, 88].map((gv, c) => Math.round(gv + (tone[c] - gv) * w));
      const got = px(x, 1300);
      for (let c = 0; c < 3; c++) assert.ok(Math.abs(got[c] - expect[c]) <= 2, `tone ramp at x=${x}: got ${got}, expected ${expect}`);
    }
  }
  // the packet mandates edit mode with the verbatim framing preamble
  const packet = fs.readFileSync(path.join(WORKT, "c2-1", "packet-c2-1.md"), "utf8");
  assert.match(packet, /EDIT mode/);
  assert.match(packet, /same framing and extent/);
  // lock change 5 part 2: the canon rides along as the second input of the one call
  assert.match(packet, /BOTH images attached/);
  assert.match(packet, /The second image is a reference only/);
  assert.match(packet, /L2-seed-region-r2-source\.png/);
  // biome map (owner-directed 2026-09-01): vocabulary and transitions in every packet
  assert.match(packet, /## Biome: /);
  assert.match(packet, /## Transitions/);
  assert.match(packet, /\*\*west \(1,1\):\*\* .*authored/, "the authored west neighbour's biome must be named");
  assert.match(packet, /\*\*east \(3,1\):\*\* .*not yet authored/, "an unauthored neighbour must be marked so");
  // a frontier cell gets no edit target and stays in generate mode
  const log3 = execFileSync(process.execPath, [SCRIPT, "--territory", "ninjaone", "--cell", "3,1", "--dry-run"],
    { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" });
  assert.doesNotMatch(log3, /edit target/);
  assert.ok(!fs.existsSync(path.join(WORKT, "c3-1", "context", "edit-target.png")),
    "frontier cell must not get an edit target");
  assert.match(fs.readFileSync(path.join(WORKT, "c3-1", "packet-c3-1.md"), "utf8"), /ONE generation, whole canvas/);
  // interior sites (owner-directed): a cell with sites carries them as terrain to offer
  execFileSync(process.execPath, [SCRIPT, "--territory", "ninjaone", "--cell", "2,2", "--dry-run"],
    { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" });
  const p22 = fs.readFileSync(path.join(WORKT, "c2-2", "packet-c2-2.md"), "utf8");
  assert.match(p22, /## Sites this cell must offer/);
  assert.match(p22, /waystation-bench/);
  // loop presence by segment: 4,2 holds no waypoint but the line crosses it
  const log42 = execFileSync(process.execPath, [SCRIPT, "--territory", "ninjaone", "--cell", "4,2", "--dry-run"],
    { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" });
  assert.match(log42, /rail\s+loop passes through/, "a segment crossing the cell counts as the loop passing through");
});

test("a worker that delivers nothing cannot pass a stale generation, and a capacity refusal is retried", () => {
  // fake codex on PATH: first call reports capacity and fails, second call succeeds but delivers nothing
  const fakeDir = path.join(OUT, "fake-codex");
  fs.mkdirSync(fakeDir, { recursive: true });
  const counter = path.join(fakeDir, "count.txt");
  fs.rmSync(counter, { force: true });
  fs.writeFileSync(path.join(fakeDir, "codex"), `#!/usr/bin/env bash
n=$(( $(cat "${counter.replace(/\\/g, "/")}" 2>/dev/null || echo 0) + 1 )); echo "$n" > "${counter.replace(/\\/g, "/")}"
if [ "$n" -eq 1 ]; then echo "ERROR: Selected model is at capacity. Please try a different model."; exit 1; fi
echo "fake worker: delivering nothing"; exit 0
`);
  // a stale generation from an earlier attempt sits in the scratch cell dir
  const cellDir = path.join(WORKT, "c3-2");
  fs.mkdirSync(cellDir, { recursive: true });
  fs.copyFileSync(path.join(SYN, "a", "c1-1-concept.png"), path.join(cellDir, "c3-2-source.png"));
  const before = treeHash();
  let out = "";
  try {
    execFileSync(process.execPath, [SCRIPT, "--territory", "ninjaone", "--cell", "3,2", "--describe", "stale-deliverable control"],
      { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT, CELL_RETRY_WAIT_S: "0", PATH: fakeDir + path.delimiter + process.env.PATH }, encoding: "utf8" });
    assert.fail("a dispatch that delivered nothing must not be accepted");
  } catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  assert.match(out, /no generation at .*c3-2-source\.png/, "the stale source must have been cleared, so derivation finds nothing:\n" + out.slice(-600));
  assert.equal(fs.readFileSync(counter, "utf8").trim(), "2", "the runner must have retried once after the capacity refusal");
  assert.ok(!fs.existsSync(path.join(cellDir, "c3-2-source.png")), "stale source must be gone");
  assert.equal(treeHash(), before, "world untouched");
});

test("a consistent lit side on rock fails the rock-lighting gate", async () => {
  // F is rock by hue; a sawtooth in x (slow ramp up, sharp drop) gives every
  // strong edge the same direction, which is what a lit side looks like
  const lit = (x, y) => { const [r, g, b, a] = F(x, y); const s = ((x % 40) / 40) * 100 - 50; const c = (v) => Math.max(0, Math.min(255, Math.round(v + s))); return [c(r), c(g), c(b), a]; };
  await writeArtefacts(path.join(SYN, "lit"), "c4-3", genImage(4, 3, lit));
  const before = treeHash();
  let out = "";
  try { runCell("4,3", path.join(SYN, "lit")); assert.fail("lit cell must be rejected"); }
  catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  assert.match(out, /FAIL\s+rock lighting\s+0\.[0-9]+/, "the rock-lighting gate must fire:\n" + out.slice(-500));
  assert.equal(treeHash(), before, "world untouched");
});

// The crown gate exists because both scale defects in the built NinjaOne
// territory were disclosed in the workers' own reports and passed anyway: the
// pipeline copied report.json to the sources dir and never opened it. These
// four are the ways that disclosure can arrive.
for (const [label, report, expect] of [
  ["an element excluded from the measurement",
    { crown: { medianMetres: 3.5, sampleCount: 20, excludedElements: ["the giant tree at the ring"] } },
    /FAIL\s+crown scale\s+3\.5 m, but 1 element\(s\) excluded/],
  ["a median under the plan's band",
    { crown: { medianMetres: 1.2, sampleCount: 20, excludedElements: [] } },
    /FAIL\s+crown scale\s+1\.2 m over 20 crowns/],
  ["a report with no crown object",
    { cell: "c4-3", lighting_isotropy: 1.4 },
    /FAIL\s+crown scale\s+report has no `crown` object/],
  ["no report at all", null, /FAIL\s+crown scale\s+c4-3-report\.json not delivered/],
]) {
  test(`crown gate: ${label} fails the cell`, async () => {
    const dir = path.join(SYN, `crown-${label.replace(/[^a-z]+/gi, "-")}`);
    await writeArtefacts(dir, "c4-3", genImage(4, 3, F), report);
    const before = treeHash();
    let out = "";
    try { runCell("4,3", dir); assert.fail(`must be rejected: ${label}`); }
    catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
    assert.match(out, expect, `the crown gate must fire for ${label}:
` + out.slice(-700));
    assert.equal(treeHash(), before, "world untouched");
  });
}

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

test("edit target for a replacement never carries the cell's own previous paint", async () => {
  execFileSync(process.execPath, [SCRIPT, "--territory", "ninjaone", "--cell", "2,1", "--dry-run", "--force"],
    { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" });
  const f = path.join(WORKT, "c2-1", "context", "edit-target.png");
  const { data } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => { const o = (y * GEN + x) * 4; return [data[o], data[o + 1], data[o + 2]]; };
  // c2-1 is authored (G), yet its own kept interior must be grey, not G
  for (const [x, y] of [[1280, 1280], [2000, 800]]) {
    assert.deepEqual(px(x, y), [96, 104, 88], `own paint excluded at ${x},${y}`);
  }
  const ox = 2 * CELL - BLEED, oy = 1 * CELL - BLEED;
  assert.deepEqual(px(100, 1280), F(ox + 100, oy + 1280).slice(0, 3), "neighbour paint kept");
});

test("a +34 luma step across an authored seam fails the all-land tone gate", async () => {
  // G' = G lifted by 30 luma in the west third only: vegetation medians barely
  // move (the lift is on every channel), the all-land tone step does
  const lifted = (x, y) => { const [r, g, b, a] = G(x, y); const inWest = x - (2 * CELL) < CELL / 3; const k = inWest ? 34 : 0; return [Math.min(255, r + k), Math.min(255, g + k), Math.min(255, b + k), a]; };
  await writeArtefacts(path.join(SYN, "b-tone"), "c2-1", genImage(2, 1, lifted));
  const before = treeHash();
  let out = "";
  try { runCell("2,1", path.join(SYN, "b-tone"), ["--force"]); assert.fail("b-tone must be rejected"); }
  catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  assert.match(out, /tone dLuma [0-9.]+ on all land/, "the all-land tone gate must fire:\n" + out.slice(-600));
  assert.equal(treeHash(), before, "world untouched");
});

test("painted water beyond the mask fails the 48px ring gate and leaves the world untouched", () => {
  const before = treeHash();
  let out = "";
  try { runCell("2,1", path.join(SYN, "b-ring"), ["--force"]); assert.fail("b-ring must be rejected"); }
  catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  assert.match(out, /FAIL\s+water fringe \(48px\)/, "the wide ring must fire");
  assert.match(out, /PASS\s+water fringe\s+[\d.]+%/, "the 6px ring cannot see paint 12px away");
  assert.equal(treeHash(), before, "a rejected replacement must leave the world untouched");
});

test("a 100px stream offset at a shared edge is bridged in the footprint", async () => {
  // source-form synthetic cells driven through --redo (the derivation path,
  // where the bridge lives). D crosses its east edge at territory y=3072;
  // E crosses its west edge at 3172 — inside the (48..150] bridge window.
  const SRC = 1254;
  async function writeSources(id, col, row, stripe) {
    const dir = path.join(WORKT, id);
    fs.mkdirSync(dir, { recursive: true });
    const art = Buffer.alloc(SRC * SRC * 4), wat = Buffer.alloc(SRC * SRC * 4);
    const ox = col * CELL - BLEED, oy = row * CELL - BLEED;
    for (let sy = 0; sy < SRC; sy++) for (let sx = 0; sx < SRC; sx++) {
      const tx = ox + sx * GEN / SRC, ty = oy + sy * GEN / SRC;
      const [r, g, b] = G(tx, ty);
      const o = (sy * SRC + sx) * 4;
      art[o] = r; art[o + 1] = g; art[o + 2] = b; art[o + 3] = 255;
      const [sy0, sx0, sx1] = stripe;
      if (Math.abs(sy - sy0) <= 10 && sx >= sx0 && sx <= sx1) {
        art[o] = 40; art[o + 1] = 80; art[o + 2] = 120;
        wat[o] = wat[o + 1] = wat[o + 2] = 255; wat[o + 3] = 255;
      }
    }
    const save = (buf, name) => sharp(buf, { raw: { width: SRC, height: SRC, channels: 4 } })
      .png().toFile(path.join(dir, `${id}-${name}.png`));
    await save(art, "source");
    await save(wat, "water-source");
    fs.writeFileSync(path.join(dir, `${id}-water.json`),
      JSON.stringify([{ class: "stream", note: "bridge control" }]));
    writeControlReport(dir, id);
  }
  const toSrc = (genPx) => Math.round(genPx * SRC / GEN);
  // D at (3,1): stream row gen y=1280 (terr 3072), from gen x 1160 to the east edge
  await writeSources("c3-1", 3, 1, [toSrc(1280), toSrc(1160), SRC - 1]);
  // E at (4,1): stream row gen y=1380 (terr 3172), from the west edge to gen x 1380
  await writeSources("c4-1", 4, 1, [toSrc(1380), 0, toSrc(1380)]);

  const logD = execFileSync(process.execPath,
    [SCRIPT, "--territory", "ninjaone", "--cell", "3,1", "--redo", "--describe", "bridge control D"],
    { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" });
  assert.match(logD, /accepted, stitched/);

  let logE;
  try {
    logE = execFileSync(process.execPath,
      [SCRIPT, "--territory", "ninjaone", "--cell", "4,1", "--redo", "--describe", "bridge control E"],
      { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" });
  } catch (e) {
    console.error("E rejected. Child output:\n", e.stdout, e.stderr);
    throw e;
  }
  assert.match(logE, /bridge\s+c3-1 edge: rerouted/);
  assert.match(logE, /accepted, stitched/);

  // the stitched footprint is continuous water across the shared line at D's
  // crossing (territory x=8192, y=3072): the line pixel and both flanks are holes
  for (const [tx, u] of [[31, 248], [32, 0], [32, 8]]) {
    const t = await tileRaw(0, tx, 12);
    assert.ok(t[(0 * 256 + u) * 4 + 3] < 128, `water hole at tile ${tx} u=${u}`);
  }
});

test("a stone on the shared line does not hide a stream crossing from the continuity gate", async () => {
  // Found on the real world 2026-09-01: the quarry's stream at its north edge
  // is split by one boulder exactly on the shared row (runs of 10 and 17 px,
  // both under the 30 px minimum), so the coast's matching stream 25-45 px
  // away was rejected as unmet. Crossings must be read over a band across
  // the line, not a single scanline. Cells (1,2) west and (2,2) east share
  // the line x=4096; the stream runs at y=5120 +-20, 60 px wide, and a dry
  // "stone" of 5 columns straddles the line for 22 of its 40 rows.
  const streamY = 5120, half = 20;
  const paintWest = (x, y) => {
    const base = F(x, y);
    if (Math.abs(y - streamY) <= half && x >= 3400) {
      const stone = Math.abs(x - 4096) <= 2 && y >= streamY - 11 && y <= streamY + 10;
      return stone ? base : [40, 90, 200, 255];
    }
    return base;
  };
  const paintEast = (x, y) => (Math.abs(y - streamY) <= half && x <= 4800) ? [40, 90, 200, 255] : G(x, y);
  const toArtefacts = (col, row, paint, isWater) => {
    const ox = col * CELL - BLEED, oy = row * CELL - BLEED;
    const l2 = Buffer.alloc(GEN * GEN * 4), concept = Buffer.alloc(GEN * GEN * 4), mask = Buffer.alloc(GEN * GEN * 4);
    for (let v = 0; v < GEN; v++) for (let u = 0; u < GEN; u++) {
      const x = ox + u, y = oy + v, [r, g, b, a] = paint(x, y), o = (v * GEN + u) * 4;
      concept[o] = r; concept[o + 1] = g; concept[o + 2] = b; concept[o + 3] = a;
      if (isWater(x, y)) { mask[o] = mask[o + 1] = mask[o + 2] = 255; mask[o + 3] = 255; }
      else { l2[o] = r; l2[o + 1] = g; l2[o + 2] = b; l2[o + 3] = a; }
    }
    return { l2, concept, mask };
  };
  const westWater = (x, y) => Math.abs(y - streamY) <= half && x >= 3400 && !(Math.abs(x - 4096) <= 2 && y >= streamY - 11 && y <= streamY + 10);
  const eastWater = (x, y) => Math.abs(y - streamY) <= half && x <= 4800;
  await writeArtefacts(path.join(SYN, "stone-w"), "c1-2", toArtefacts(1, 2, paintWest, westWater));
  await writeArtefacts(path.join(SYN, "stone-e"), "c2-2", toArtefacts(2, 2, paintEast, eastWater));
  assert.match(runCell("1,2", path.join(SYN, "stone-w")), /accepted, stitched/);
  let log;
  try { log = runCell("2,2", path.join(SYN, "stone-e")); }
  catch (e) { throw new Error("east cell rejected although its stream meets the west stream across a stone on the line:\n" + String(e.stdout || "").split("\n").filter((l) => /continuity|FAIL/.test(l)).join("\n")); }
  assert.match(log, /PASS\s+water continuity/);
  assert.match(log, /accepted, stitched/);
});

// ---- content-aware seams (owner 2026-09-02, lock change 9) ----------------------
// The stitch's boundary between two AUTHORED cells follows the minimum-error path
// through the two paints instead of a fixed wiggle. Control: one dark crown painted
// on ONE cell's canvas, centred exactly on the boundary the pipeline itself drew
// against the plain neighbour (read from its own binding map), so a fixed line
// must cut it. Verified on the stitched tiles, not on any preview.
const ENV = { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" };
async function worldPixel(tiles, x, y) {
  const k = `${x >> 8},${y >> 8}`;
  if (!tiles.has(k)) tiles.set(k, await tileRaw(0, x >> 8, y >> 8));
  const d = tiles.get(k), o = ((y & 255) * TILE + (x & 255)) * 4;
  return [d[o], d[o + 1], d[o + 2], d[o + 3]];
}
test("a crown straddling the shared line on one paint only comes through whole or not at all (lock change 9)", async () => {
  await writeArtefacts(path.join(SYN, "row3-a"), "c1-3", genImage(1, 3, F));
  const logA = runCell("1,3", path.join(SYN, "row3-a"));
  assert.match(logA, /accepted, stitched/, "the plain cell must actually stitch");
  // the pipeline's own boundary against c1-3, from the dry run's binding map
  execFileSync(process.execPath, [SCRIPT, "--territory", "ninjaone", "--cell", "2,3", "--dry-run"], ENV);
  const bind = await sharp(path.join(WORKT, "c2-3", "context", "binding.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const wx0 = 2 * CELL - BLEED, wy0 = 3 * CELL - BLEED, W = bind.info.width;
  const yMid = 3 * CELL + 1024, v = yMid - wy0;
  let bx = -1;
  for (let u = 0; u < W; u++) if (bind.data[(v * W + u) * 4] === 255) { bx = wx0 + u; break; }
  assert.ok(bx > 2 * CELL - 160 && bx < 2 * CELL + 160, `the geometric boundary sits inside the tab reach: ${bx}`);
  // c2-3 continues F byte-exact, plus one crown of radius 70 centred on that boundary
  const R = 70;
  await writeArtefacts(path.join(SYN, "row3-b"), "c2-3", genImage(2, 3, F, { disc: [bx, yMid, R] }));
  const logB = runCell("2,3", path.join(SYN, "row3-b"));
  assert.match(logB, /accepted, stitched/, "the crown cell must actually stitch (an already-authored cell exits 0 untouched)");
  const tiles = new Map();
  let inside = 0, crown = 0, third = 0, gap = 0;
  const bbox = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (let y = yMid - R; y <= yMid + R; y++) for (let x = bx - R; x <= bx + R; x++) {
    if (Math.hypot(x - bx, y - yMid) >= R - 12) continue;          // 12 px inside the crown's edge, past the 8 px feather
    inside += 1;
    const [r, g, b, a] = await worldPixel(tiles, x, y);
    if (a !== 255) { gap += 1; bbox.x0 = Math.min(bbox.x0, x); bbox.x1 = Math.max(bbox.x1, x); bbox.y0 = Math.min(bbox.y0, y); bbox.y1 = Math.max(bbox.y1, y); }
    const f = F(x, y);
    if (r < 45 && g < 45 && b < 45) crown += 1;
    else if (Math.abs(r - f[0]) > 2 || Math.abs(g - f[1]) > 2 || Math.abs(b - f[2]) > 2) third += 1;
  }
  if (gap > 0 || third > 0) {
    // keep the evidence beside the scratch world: the crown region and the numbers
    const dbg = path.join(ROOT, ".codex-tmp", "dir-stitch", "crown-debug");
    fs.mkdirSync(dbg, { recursive: true });
    const S = 2 * R + 1, buf = Buffer.alloc(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) buf.set(await worldPixel(tiles, bx - R + x, yMid - R + y), (y * S + x) * 4);
    await sharp(buf, { raw: { width: S, height: S, channels: 4 } }).png().toFile(path.join(dbg, "crown-region.png"));
    fs.writeFileSync(path.join(dbg, "crown.json"), JSON.stringify({ bx, yMid, inside, crown, third, gap, bbox, sample: await worldPixel(tiles, bx, yMid) }));
  }
  assert.equal(gap, 0, `the band stays opaque (bbox ${JSON.stringify(bbox)})`);
  assert.equal(third, 0, "inside the crown every pixel is the crown or the plain paint, never a blend of the two");
  const share = crown / inside;
  assert.ok(share > 0.97 || share < 0.03, `the crown must be whole or absent, not cut: ${(share * 100).toFixed(1)}% of it shows`);
  // the paint beyond the tab reach is untouched on both sides
  for (const [x, y] of [[2 * CELL - 200, yMid], [2 * CELL + 200, yMid + 300], [2 * CELL - 170, yMid - 900]]) {
    const [r, g, b] = await worldPixel(tiles, x, y);
    assert.deepEqual([r, g, b], F(x, y).slice(0, 3), `pure F at ${x},${y}`);
  }
});

test("--restitch rebuilds an accepted cell's tiles from its sources with no dispatch and no gates, byte-identically, and refuses an unauthored cell", () => {
  const before = treeHash();
  const log = execFileSync(process.execPath, [SCRIPT, "--territory", "ninjaone", "--cell", "2,3", "--restitch"], ENV);
  assert.equal(treeHash(), before, "the same sources and the same seams reproduce the same tiles");
  assert.match(log, /total 0 written/);
  assert.doesNotMatch(log, /gates:/, "no gate runs on a restitch: the acceptance stands");
  let refused = "";
  try { execFileSync(process.execPath, [SCRIPT, "--territory", "ninjaone", "--cell", "3,3", "--restitch"], { ...ENV, stdio: "pipe" }); }
  catch (e) { refused = String(e.stderr || e.message); }
  assert.match(refused, /not authored/, "an unauthored cell has nothing to restitch");
});

test("manifest records the contract and both cells", () => {
  const m = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));
  assert.equal(m.format, "l2-cell-pyramid");
  assert.equal(m.contract.levels, 7);
  assert.equal(m.contract.keptPx, 2048);
  assert.equal(m.contract.seam.contentAware?.bandPx, 128, "the manifest records how seams are drawn (lock change 9)");
  assert.deepEqual(m.levelTiles[0], [40, 32]);
  assert.ok(m.cells["c1-1"] && m.cells["c2-1"]);
  assert.deepEqual(m.cells["c1-1"].waterZones, ["lake"]);
  // success: clear the scratch world (kept on failure for diagnosis)
  fs.rmSync(OUT, { recursive: true, force: true });
  for (const id of ["c1-1", "c2-1", "c3-1", "c4-1", "c1-3", "c2-3"]) {
    fs.rmSync(path.join(WORKT, id), { recursive: true, force: true });
  }
});

// ---- mask completion (owner 2026-09-02, lock change 5b): through the derivation path ----
// A --redo run derives concept/l2/water from <id>-source.png and <id>-water-source.png
// in the working dir, exactly as a real bake does after the worker delivers.
async function supplyGeneration(id, col, row, sourceImg, maskImg, report) {
  const dir = path.join(WORKT, id); fs.mkdirSync(dir, { recursive: true });
  const save = (buf, name) => sharp(buf, { raw: { width: GEN, height: GEN, channels: 4 } }).png().toFile(path.join(dir, `${id}-${name}.png`));
  await save(sourceImg.concept, "source");
  await save(maskImg.mask, "water-source");
  fs.writeFileSync(path.join(dir, `${id}-water.json`), JSON.stringify([{ class: "lake", note: "synthetic control" }]));
  writeControlReport(dir, id, report);
}
function redoCell(cellArg, extra = []) {
  return execFileSync(process.execPath, [SCRIPT, "--territory", "ninjaone", "--cell", cellArg, "--redo", "--describe", "mask completion control", ...extra],
    { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" });
}
const C41 = [4 * CELL + 1024, 1 * CELL + 1024];   // cell 4,1's centre in territory px

test("a mask that stops 20px short of the painted shore is completed, and the rings read 0%", async () => {
  await supplyGeneration("c4-1", 4, 1,
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 300], keepWaterPaint: true }),
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 280] }));
  const out = redoCell("4,1");
  const m = out.match(/mask\s+completed: \+(\d+) px/);
  assert.ok(m, "growth must be reported:\n" + out.slice(-600));
  const grown = +m[1], expect = Math.PI * (300 * 300 - 280 * 280);
  assert.ok(grown > expect * 0.85 && grown < expect * 1.15, `grown ${grown} px, expected about ${Math.round(expect)}`);
  assert.match(out, /PASS\s+water fringe\s+0%/, "the 6px ring must read 0% after completion");
  assert.match(out, /PASS\s+water fringe \(48px\)\s+0%/, "the 48px ring must read 0% after completion");
  assert.match(out, /accepted, stitched/);
  // the completed mask was the one cut: the water zone at the shore is clear in the L2 tile
  const px = await tileRaw(0, Math.floor((C41[0] + 290) / TILE), Math.floor(C41[1] / TILE));
  const o = (((C41[1]) % TILE) * TILE + ((C41[0] + 290) % TILE)) * 4;
  assert.equal(px[o + 3], 0, "painted water 290px from the centre (inside the grown mask) must be cut");
});

test("violet ground beside the water is neither fringe nor grown into (lock change 7)", async () => {
  await supplyGeneration("c4-1", 4, 1,
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 300], keepWaterPaint: true, violetRing: [0, 60] }),
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 300] }));
  const out = redoCell("4,1", ["--force"]);
  const m = out.match(/mask\s+completed: \+(\d+) px/);
  assert.ok(!m || +m[1] < 500, "violet ground must not be grown into: " + (m ? m[1] : 0));
  assert.match(out, /PASS\s+water fringe\s+0%/, "violet ground is not fringe to the 6px ring:\n" + out.slice(-600));
  assert.match(out, /PASS\s+water fringe \(48px\)\s+0%/, "violet ground is not fringe to the 48px ring");
  assert.match(out, /accepted, stitched/);
});

test("dry paint between the mask and painted water stops the growth: the polyline defect still fails", async () => {
  const before = treeHash();
  await supplyGeneration("c4-1", 4, 1,
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 260], keepWaterPaint: true, paintedRing: [12, 40] }),
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 260] }));
  let out = "";
  try { redoCell("4,1", ["--force"]); assert.fail("the ring beyond a dry strip must still be rejected"); }
  catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  assert.match(out, /FAIL\s+water fringe \(48px\)/, "the wide ring must still fire:\n" + out.slice(-600));
  const m = out.match(/mask\s+completed: \+(\d+) px/);
  assert.ok(!m || +m[1] < 2000, "growth must not cross the dry strip");
  assert.equal(treeHash(), before, "world untouched");
});

test("a low-saturation haze touching the water is not absorbed by the growth", async () => {
  await supplyGeneration("c4-1", 4, 1,
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 300], keepWaterPaint: true, hazeArc: [0, 60] }),
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 300] }));
  const out = redoCell("4,1", ["--force"]);
  const m = out.match(/mask\s+completed: \+(\d+) px/);
  assert.ok(!m || +m[1] < 500, "an exact mask beside a flat haze must grow by (almost) nothing: " + (m ? m[1] : 0));
  assert.match(out, /accepted, stitched/);
  // the haze stays land: opaque in the L2 tile 330px east of the centre
  const px = await tileRaw(0, Math.floor((C41[0] + 330) / TILE), Math.floor(C41[1] / TILE));
  const o = (((C41[1]) % TILE) * TILE + ((C41[0] + 330) % TILE)) * 4;
  assert.equal(px[o + 3], 255, "haze pixels must remain land");
});

test("the suite never touches the real working directories", () => {
  const after = realWorkFingerprint(REAL_WORK_BEFORE.cells);
  assert.equal(after.hash, REAL_WORK_BEFORE.hash, "the real .codex-tmp/authoring/cells tree changed during the suite: " + REAL_WORK_BEFORE.cells.join(", "));
});
