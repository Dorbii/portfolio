// Conform a refused SHORE candidate to the planned shoreline, mask only. The
// candidate's own coast is kept wherever it lies within the plan; two things
// are cut wet: (1) every wet run on an authored neighbour's edge — sea,
// inlets, becks — is cut open from the seam inward with conform-seam-water.mjs
// (a narrow run becomes a 12 m gully, a sea run is cut to the candidate's own
// water), so every crossing the continuity gate checks is met; (2) land
// beyond a LIMIT is trimmed: a coast the candidate drew within 46 m of the
// seam is kept whole; land carried further — a plateau across the cell to
// the world's edge (c6-8, 2026-09-05) — ends at a limit that wanders between
// 24 and 40 m from the seam and rounds off to nothing where the neighbour's
// ground turns to water (a headland, not a wedge); away from every authored
// edge the limit is zero. The art is untouched; cell.mjs --redo --force
// re-derives and re-gates. Same class of fix the owner approved for water on
// 2026-09-04, applied to the whole shore.
//
// Why: 2026-09-05 20:04, c7-0 on locks 18i/18i-b — the model kept its land
// inside the 40 m strip but painted over the pre-filled sea at the strip's
// ends and closed c6-0's four inlets (each under 15 m, so the pre-fill left
// them grey). The composition-following edit model does not obey a painted
// sea; the cut obeys the plan by construction.
//
//   node docs/career-world/session3-tools/conform-band.mjs coast <cell-id> [--preview out.jpg] [--write]
import fs from "node:fs";
import sharp from "sharp";
import { execSync } from "node:child_process";
sharp.cache(false);
const [T, ID] = process.argv.slice(2);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const WRITE = process.argv.includes("--write"), PREVIEW = arg("--preview");
if (T !== "coast" || !ID) throw new Error("usage: conform-band.mjs coast <cell-id> [--preview out.jpg] [--write]");
const CANVAS = 2560, BLEED = 256, KEPT = 2048, M = 97.6 / KEPT;                 // metres per canvas px
const px = (m) => Math.round(m / M);
const D_MIN = px(24), D_MAX = px(40), TAPER = px(10), SLACK = px(46);
const ART = "art-source/career-world/l2-land", A = "public/career-world/layers/terrain/authority";
const cellDir = `.codex-tmp/authoring/cells/${T}/${ID}`;
const maskFile = `${cellDir}/${ID}-water-source.png`;
if (!fs.existsSync(maskFile)) throw new Error(`no ${maskFile}`);
const [col, row] = ID.slice(1).split("-").map(Number);

// authored orthogonal neighbours, this grid's and the island's (by lattice)
const defOf = (t) => JSON.parse(fs.readFileSync(`${ART}/${t}/territory.def.json`, "utf8"));
const ledgerOf = (t) => { const f = `${A}/manifests/terrain-l2-${t}-r1.json`; return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")).cells || {} : {}; };
const mine = defOf(T), myBlock = mine.lattice.block;
const territories = fs.readdirSync(ART).filter((t) => fs.existsSync(`${ART}/${t}/territory.def.json`));
function authoredAt(c, r) {
  for (const t of territories) {
    const d = defOf(t), b = d.lattice?.block; if (!b || !d.grid) continue;
    const lc = myBlock[0] + c - b[0], lr = myBlock[1] + r - b[1];
    if (lc < 0 || lr < 0 || lc >= d.grid.cols || lr >= d.grid.rows) continue;
    const id = `c${lc}-${lr}`;
    if (ledgerOf(t)[id] && fs.existsSync(`${ART}/${t}/${id}/${id}-l2.png`)) return { t, id, l2: `${ART}/${t}/${id}/${id}-l2.png` };
  }
  return null;
}
const EDGES = [["left", -1, 0], ["right", 1, 0], ["top", 0, -1], ["bottom", 0, 1]];
const facingOf = { left: "right", right: "left", top: "bottom", bottom: "top" };

// the neighbour's profile along the shared line: wet per kept px (runs >= 30 px), like the gate
async function profile(l2, facing) {
  const nb = await sharp(l2).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const NW = nb.info.width, nbBleed = Math.round((NW - KEPT) / 2);
  const along = facing === "top" || facing === "bottom";
  const line = facing === "bottom" || facing === "right" ? nbBleed + KEPT : nbBleed;
  const wet = new Array(KEPT).fill(false);
  for (let i = 0; i < KEPT; i += 1) {
    let mn = 255;
    for (let d = -8; d <= 8; d += 1) {
      const [x, y] = along ? [nbBleed + i, line + d] : [line + d, nbBleed + i];
      if (x < 0 || y < 0 || x >= NW || y >= NW) continue;
      mn = Math.min(mn, nb.data[(y * NW + x) * 4 + 3]);
    }
    wet[i] = mn < 128;
  }
  const runs = []; let s = null;
  for (let i = 0; i <= KEPT; i += 1) {
    const w = i < KEPT && wet[i];
    if (w && s === null) s = i;
    if (!w && s !== null) { if (i - s >= 30) runs.push([s, i - 1]); s = null; }
  }
  for (let i = 0; i < KEPT; i += 1) wet[i] = runs.some(([a, b]) => i >= a && i <= b);
  return wet;
}

// the candidate's mask
const m = await sharp(maskFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = m.info.width, H = m.info.height, sc = W / CANVAS;
const isWet = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m.data[(y * W + x) * 4 + 3] > 128 && m.data[(y * W + x) * 4] > 128;

// a smooth wander in [0,1] along an edge, seeded by the cell
let seed = 0; for (const ch of `${T}${ID}`) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
if (!seed) seed = 1;
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const wander = (n) => {
  const f1 = px(35 + 25 * rnd()), f2 = px(12 + 10 * rnd()), p1 = rnd() * 6.283, p2 = rnd() * 6.283;
  return Array.from({ length: n }, (_, i) => 0.5 + 0.35 * Math.sin(i / f1 * 6.283 + p1) + 0.15 * Math.sin(i / f2 * 6.283 + p2));
};

// per edge: depth of allowed land per kept position (0 = no land)
const bands = {}, report = [];
for (const [edge, dx, dy] of EDGES) {
  const nb = authoredAt(col + dx, row + dy);
  if (!nb) continue;
  const facing = facingOf[edge];
  const wet = await profile(nb.l2, facing);
  const alongIsY = edge === "left" || edge === "right";
  const edgeCanvas = edge === "left" || edge === "top" ? BLEED : BLEED + KEPT - 1, dir = edge === "left" || edge === "top" ? 1 : -1;
  const pt = (along, across) => (alongIsY ? [across, along] : [along, across]);
  const depth = new Array(KEPT).fill(0), wav = wander(KEPT);
  // ground stretches and wet runs along the edge; a wet run 15 m or wider is
  // the sea (no land beside it at all), a narrower one an inlet or a beck,
  // which the seam cut opens as a cove that ENDS — the land beyond it stays
  const stretches = [], seaRuns = [], narrowRuns = []; let s = null, w0 = null;
  for (let i = 0; i <= KEPT; i += 1) {
    const g = i < KEPT && !wet[i], ww = i < KEPT && wet[i];
    if (g && s === null) s = i;
    if (!g && s !== null) { stretches.push([s, i - 1]); s = null; }
    if (ww && w0 === null) w0 = i;
    if (!ww && w0 !== null) { (i - w0 >= px(15) ? seaRuns : narrowRuns).push([w0, i - 1]); w0 = null; }
  }
  const seaAt = (i) => seaRuns.some(([a, b]) => i >= a && i <= b);
  // the candidate's own land extent inward from the seam, per position
  const extent = (i) => {
    let last = -1;
    for (let k = 0; k < KEPT + BLEED; k += 1) {
      const [cx, cy] = pt(BLEED + i, edgeCanvas + dir * k);
      const mx = Math.round(cx * sc), my = Math.round(cy * sc);
      if (mx < 0 || my < 0 || mx >= W || my >= H) break;
      if (!isWet(mx, my)) last = k;
    }
    return last;
  };
  for (const [a, b] of stretches) {
    // the rounding at a stretch end is a quarter-circle over the shorter of
    // 10 m and a third of the stretch, only where the neighbour's ground
    // turns to SEA — beside an inlet the land runs on past the cove, and at
    // a cell corner the limit runs to the edge in full
    // an end faces the sea when the run beside it is the sea, or when the
    // next ground along the edge is more than 15 m away (a cove and then
    // open sea: the land beyond the cove is a headland too)
    const solid = stretches.filter(([p, q]) => q - p + 1 >= px(5));   // a sliver under 5 m is not ground to run on to
    const nextGround = solid.find(([p]) => p > b), prevGround = [...solid].reverse().find(([, q]) => q < a);
    const taperA = a > 0 && (seaAt(a - 1) || !prevGround || a - prevGround[1] > px(15));
    const taperB = b < KEPT - 1 && (seaAt(b + 1) || !nextGround || nextGround[0] - b > px(15));
    // the limit before rounding: the candidate's own coast is kept whole when
    // it lies within 46 m of the seam (a coast drawn at 40 m must not lose
    // its cliff faces to the limit); only land carried further than that — a
    // plateau across the cell — is trimmed at the wandering limit
    // an isolated headland (sea at both ends) is no deeper than four fifths
    // of its width, and its two roundings may meet in the middle; a stretch
    // that runs on past a cove keeps its depth and rounds only a third
    const isolated = taperA && taperB, width = b - a + 1;
    const widthCap = isolated ? Math.round(0.8 * width) : Infinity;
    const base = [];
    for (let i = a; i <= b; i += 1) {
      const last = extent(i);
      base.push(Math.min(widthCap, last <= SLACK ? last + 1 : D_MIN + (D_MAX - D_MIN) * Math.max(0, Math.min(1, wav[i]))));
    }
    // the rounding at an end against the sea is a quarter-ellipse whose
    // length along the edge is four fifths of the limit's depth there (a
    // headland as round as it is deep, not a flat wedge), never less than 10 m
    const rCap = Math.round(width / (isolated ? 2 : 3));
    const rA = taperA ? Math.min(Math.max(TAPER, Math.round(0.8 * base[0])), rCap) : 0;
    const rB = taperB ? Math.min(Math.max(TAPER, Math.round(0.8 * base[base.length - 1])), rCap) : 0;
    for (let i = a; i <= b; i += 1) {
      let d = base[i - a];
      if (rA > 0 && i - a < rA) { const u = (rA - (i - a) - 1) / rA; d *= Math.sqrt(Math.max(0, 1 - u * u)); }
      if (rB > 0 && b - i < rB) { const u = (rB - (b - i) - 1) / rB; d *= Math.sqrt(Math.max(0, 1 - u * u)); }
      depth[i] = Math.max(0, Math.round(d));
    }
  }
  // over an inlet the limit runs on from one bank to the other (the cove ends
  // and the coast continues); over the sea it is zero
  for (const [a, b] of narrowRuns) {
    const dA = a > 0 ? depth[a - 1] : (b < KEPT - 1 ? depth[b + 1] : 0), dB = b < KEPT - 1 ? depth[b + 1] : dA;
    for (let i = a; i <= b; i += 1) depth[i] = Math.round(dA + (dB - dA) * (i - a) / Math.max(1, b - a));
  }
  bands[edge] = { depth, stretches, wet, nb, edgeCanvas, dir, alongIsY };
  report.push(`  ${edge}: ${nb.t} ${nb.id} — ${stretches.length} ground stretch(es) ${stretches.map(([a, b]) => `${Math.round(a / KEPT * 100)}-${Math.round((b + 1) / KEPT * 100)}%`).join(", ") || "none"}; ${wet.filter(Boolean).length} px of its edge is water`);
}
if (!Object.keys(bands).length) throw new Error(`${ID}: no authored orthogonal neighbour — nothing to conform to`);

// 1. every wet run on every authored edge is cut open (sea, inlets, becks).
// The seam tool writes the mask in place, so a dry run works on a backup that
// is restored at the end; --write keeps the cuts.
const backup = `${cellDir}/${ID}-water-source-before-band.png`;
if (!fs.existsSync(backup)) fs.copyFileSync(maskFile, backup);
const seamLog = [];
for (const [edge, b] of Object.entries(bands)) {
  // --max 1024: a narrow run (inlet, beck) is cut as a 12 m gully; a sea run
  // is cut to the candidate's own water, and the limit below trims the rest
  const o = execSync(`node docs/career-world/session3-tools/conform-seam-water.mjs ${T} ${ID} --edge ${edge} --neighbour ${b.nb.l2} --max 1024 --write`, { encoding: "utf8" });
  seamLog.push(...o.split("\n").filter((l) => /%.*cut/.test(l)).map((l) => `  ${edge}${l}`));
}
// 2. the limit: within any edge's limit = kept; everything else is cut wet
const cur = await sharp(maskFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });   // after step 1
const out = Buffer.from(cur.data);
const inside = (X, Y) => {                       // canvas coordinates
  for (const b of Object.values(bands)) {
    const along = b.alongIsY ? Y : X, across = b.alongIsY ? X : Y;
    const i = Math.max(0, Math.min(KEPT - 1, along - BLEED));
    if ((along < BLEED || along >= BLEED + KEPT) && !b.stretches.some(([a, c]) => (along < BLEED ? a === 0 : c === KEPT - 1))) continue;
    const k = b.dir > 0 ? across - b.edgeCanvas : b.edgeCanvas - across;   // px inward from the kept edge (negative in the bleed)
    if (b.depth[i] > 0 && k <= b.depth[i]) return true;
  }
  return false;
};
let cut = 0, kept = 0;
for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
  const o = (y * W + x) * 4;
  const wetNow = cur.data[o + 3] > 128 && cur.data[o] > 128;
  if (wetNow) continue;
  if (inside(Math.round(x / sc), Math.round(y / sc))) { kept += 1; continue; }
  out[o] = out[o + 1] = out[o + 2] = 255; out[o + 3] = 255; cut += 1;
}
console.log(`${T} ${ID}: band conform`);
for (const r of report) console.log(r);
for (const l of seamLog) console.log(l);
console.log(`  land kept within the limit ${kept} mask px; trimmed beyond it ${cut} mask px (${(100 * cut / (kept + cut || 1)).toFixed(1)}% of the candidate's land)`);
if (PREVIEW) {
  const src = await sharp(`${cellDir}/${ID}-source.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const SW = src.info.width, img = Buffer.from(src.data);
  const tint = (o, rgb, k) => { for (let c = 0; c < 3; c += 1) img[o + c] = Math.round(img[o + c] * (1 - k) + rgb[c] * k); img[o + 3] = 255; };
  for (let y = 0; y < SW; y += 1) for (let x = 0; x < SW; x += 1) {
    const mx = Math.round(x * W / SW), my = Math.round(y * H / SW), mo = (my * W + mx) * 4, o = (y * SW + x) * 4;
    const was = m.data[mo + 3] > 128 && m.data[mo] > 128, now = out[mo + 3] > 128 && out[mo] > 128;
    if (now && !was) tint(o, [80, 200, 230], 0.75);
    else if (was) tint(o, [31, 96, 108], 0.7);
  }
  await sharp(img, { raw: { width: SW, height: SW, channels: 4 } }).resize(1024, 1024).jpeg({ quality: 85 }).toFile(PREVIEW);
  console.log(`  preview ${PREVIEW} (sea-tinted = the candidate's own water, bright cyan = the cut)`);
}
if (WRITE) {
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(maskFile);
  console.log(`  written; original kept at ${ID}-water-source-before-band.png`);
  console.log(`  now: node tools/world-authoring/cell.mjs --territory ${T} --cell ${col},${row} --redo --force --describe-file ${ART}/${T}/briefs/${ID}.md`);
} else {
  fs.copyFileSync(backup, maskFile);
  console.log("  nothing written (the mask is restored) — pass --write to apply");
}
