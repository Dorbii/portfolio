// Conform a candidate's WATER SOURCE mask to the neighbour's water at a shared
// edge: wherever the neighbour's kept edge is water (read the continuity
// gate's way: alpha < 128 within 8 px of the line, runs of 30 px or more) and
// the candidate painted LAND there, the candidate's mask is cut wet from its
// canvas edge inward until its own water is reached — or, where it never is,
// to a capped depth shaped as a half-ellipse over the run (an inlet becomes a
// cove that ends, not a box). The art is untouched; only the cut changes;
// cell.mjs --redo re-derives and re-gates. Mask only, no regeneration — the
// class of fix the owner approved for water on 2026-09-04.
//
// Why: every coast miss of 2026-09-05 (c1-2, c1-3, c4-8, c7-0, c7-4, c8-5,
// c8-7) was candidate land over the island's water at the seam, by 5-50 m,
// against a gate window of 48 px (2.3 m); the edge-map brief halved the drift
// and did not close it. This closes it by construction.
//
//   node docs/career-world/session3-tools/conform-seam-water.mjs <territory> <cell-id> \
//        --edge left|right|top|bottom --neighbour <neighbour l2.png> [--max 512] [--write]
//   --edge is the CANDIDATE's edge that faces the neighbour; --max the deepest
//   cut in canvas px (default 512 = 25 m).
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);
const [T, ID] = process.argv.slice(2);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const EDGE = arg("--edge"), NB = arg("--neighbour"), MAX = Number(arg("--max", 512));
const WRITE = process.argv.includes("--write");
if (!T || !ID || !EDGE || !NB) throw new Error("usage: <territory> <cell-id> --edge left|right|top|bottom --neighbour <l2.png> [--max N] [--write]");
const CANVAS = 2560, BLEED = 256, KEPT = 2048, M_PER_PX = 97.6 / KEPT;
const cellDir = `.codex-tmp/authoring/cells/${T}/${ID}`;
const maskFile = `${cellDir}/${ID}-water-source.png`;
if (!fs.existsSync(maskFile)) throw new Error(`no ${maskFile}`);
if (!fs.existsSync(NB)) throw new Error(`no neighbour layer ${NB}`);

// 1. the neighbour's water along its facing edge, per kept px
const facing = { left: "right", right: "left", top: "bottom", bottom: "top" }[EDGE];
const nb = await sharp(NB).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const NW = nb.info.width, nbBleed = Math.round((NW - KEPT) / 2);
const nbAlong = facing === "top" || facing === "bottom";
const nbLine = facing === "bottom" || facing === "right" ? nbBleed + KEPT : nbBleed;
const wet = new Array(KEPT).fill(false);
for (let i = 0; i < KEPT; i += 1) {
  let mn = 255;
  for (let d = -8; d <= 8; d += 1) {
    const [px, py] = nbAlong ? [nbBleed + i, nbLine + d] : [nbLine + d, nbBleed + i];
    if (px < 0 || py < 0 || px >= NW || py >= NW) continue;
    mn = Math.min(mn, nb.data[(py * NW + px) * 4 + 3]);
  }
  wet[i] = mn < 128;
}
const runs = []; let s0 = null;
for (let i = 0; i <= KEPT; i += 1) {
  const w = i < KEPT && wet[i];
  if (w && s0 === null) s0 = i;
  if (!w && s0 !== null) { if (i - s0 >= 30) runs.push([s0, i - 1]); s0 = null; }
}
for (let i = 0; i < KEPT; i += 1) wet[i] = runs.some(([a, b]) => i >= a && i <= b);

// 2. the candidate's source mask
const m = await sharp(maskFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = m.info.width, H = m.info.height, sc = W / CANVAS;
const out = Buffer.from(m.data);
const isWet = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m.data[(y * W + x) * 4 + 3] > 128 && m.data[(y * W + x) * 4] > 128;
const setWet = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return 0; const o = (y * W + x) * 4; if (out[o + 3] > 128 && out[o] > 128) return 0; out[o] = out[o + 1] = out[o + 2] = 255; out[o + 3] = 255; return 1; };
const alongIsY = EDGE === "left" || EDGE === "right";
const edgeCanvas = EDGE === "left" || EDGE === "top" ? BLEED : BLEED + KEPT - 1;   // the kept edge line
const dir = EDGE === "left" || EDGE === "top" ? 1 : -1;                              // inward
const pt = (along, across) => (alongIsY ? [across, along] : [along, across]);       // canvas -> (x, y)

// 3. depth of the cut per kept position: to the candidate's own water, else the elliptical cap
const depth = new Array(KEPT).fill(0);
for (const [a, b] of runs) {
  const c = (a + b) / 2, half = (b - a) / 2 + 1;
  // a watercourse (under 15 m) is never cut as a long slot through rock: it
  // reaches the candidate's own water only if that lies within a quarter of
  // MAX, and otherwise ends as a short gully. A sea run searches to MAX and
  // caps as an ellipse. Use this tool for drifts of a few metres; a 16 m
  // overrun cut this way carves an arc through a headland (c8-7, 08:45).
  const narrow = (b - a + 1) * M_PER_PX < 15;
  // a narrow run's gully is three times as long as the run is wide, between
  // 3 m and a quarter of MAX (2026-09-05: a 1.7 m beck was cut as a 12 m slot)
  const gully = Math.min(Math.round(MAX / 4), Math.max(Math.round(3 / M_PER_PX), 3 * (b - a + 1)));
  const reach = narrow ? gully : MAX;
  for (let i = a; i <= b; i += 1) {
    const along = BLEED + i;
    let found = -1;
    for (let d = 0; d <= reach; d += 1) {
      const [cx, cy] = pt(along, edgeCanvas + dir * d);
      if (isWet(Math.round(cx * sc), Math.round(cy * sc))) { found = d; break; }
    }
    const cap = narrow
      ? gully
      : Math.max(32, Math.round(MAX * Math.sqrt(Math.max(0, 1 - ((i - c) / half) ** 2))));
    depth[i] = found >= 0 ? found : cap;
  }
}
// a cove's far end is not flat: a smoothed ±20% wander on the capped depth,
// changing every few metres (owner 2026-09-06 02:00 on c7-0: "needs similar
// work" — the coves read as slots)
{
  let seed = 7; for (const ch of `${T}${ID}${EDGE}`) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  const raw = depth.map(() => rnd() - 0.5), k = Math.round(2 / M_PER_PX);
  for (const [a, b] of runs) {
    for (let i = a; i <= b; i += 1) {
      let s = 0, c = 0; for (let j = -k; j <= k; j += 1) { const q = i + j; if (q >= a && q <= b) { s += raw[q]; c += 1; } }
      const w = (s / c) * Math.sqrt(2 * k + 1) * 0.4;   // about ±0.2 after normalising the smoothed noise
      depth[i] = Math.max(0, Math.round(depth[i] * (1 + w)));
    }
  }
}
// the cut's ends along the seam round off (a quarter-circle over the shorter
// of 6 m and half the run) where the run ends inside the edge, so a notch is
// a cove and a bay has a curved corner, not a box (2026-09-05 20:20, c7-0:
// per-row cuts left a comb of rectangular slots)
for (const [a, b] of runs) {
  const r = Math.min(Math.round(6 / M_PER_PX), Math.floor((b - a + 1) / 2));
  if (r <= 0) continue;
  for (let i = a; i <= b; i += 1) {
    const fromA = a > 0 ? i - a : Infinity, fromB = b < KEPT - 1 ? b - i : Infinity;
    const t = Math.min(fromA, fromB);
    if (t < r) { const u = (r - t - 1) / r; depth[i] = Math.round(depth[i] * Math.sqrt(Math.max(0, 1 - u * u))); }
  }
}
// a median over ±15 positions keeps single-row spikes out of the cut
const smooth = depth.map((_, i) => {
  if (!wet[i]) return 0;
  const v = []; for (let k = -15; k <= 15; k += 1) if (i + k >= 0 && i + k < KEPT && wet[i + k]) v.push(depth[i + k]);
  v.sort((p, q) => p - q); return v[v.length >> 1];
});

// 4. cut: from the canvas edge (the bleed included) inward to the kept edge + depth
let cut = 0;
const perRun = runs.map(([a, b]) => ({ a, b, px: 0, dmin: Infinity, dmax: 0, dsum: 0 }));
for (let i = 0; i < KEPT; i += 1) {
  if (!wet[i]) continue;
  const r = perRun.find((x) => i >= x.a && i <= x.b);
  const along = BLEED + i, d = smooth[i];
  r.dmin = Math.min(r.dmin, d); r.dmax = Math.max(r.dmax, d); r.dsum += d;
  const from = EDGE === "left" || EDGE === "top" ? 0 : CANVAS - 1;
  const to = edgeCanvas + dir * d;
  for (let across = from; dir > 0 ? across <= to : across >= to; across += dir) {
    const [cx, cy] = pt(along, across);
    const n = setWet(Math.round(cx * sc), Math.round(cy * sc));
    cut += n; r.px += n;
  }
}
console.log(`${T} ${ID}, ${EDGE} edge against ${NB}: ${runs.length} water run(s) on the neighbour's edge`);
for (const r of perRun) {
  const n = r.b - r.a + 1;
  console.log(`  ${Math.round(r.a / KEPT * 100)}-${Math.round((r.b + 1) / KEPT * 100)}% (${(n * M_PER_PX).toFixed(1)} m): cut ${r.px} source px, depth ${(r.dmin * M_PER_PX).toFixed(1)}-${(r.dmax * M_PER_PX).toFixed(1)} m (mean ${(r.dsum / n * M_PER_PX).toFixed(1)} m)`);
}
console.log(`  total ${cut} source px made wet (${(cut / (W * H) * 100).toFixed(2)}% of the mask)`);
// --preview <file.jpg>: the candidate's paint with its water tinted sea and the
// newly cut pixels tinted brighter, so the cut can be judged before --write
const PREVIEW = arg("--preview");
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
  console.log(`  preview ${PREVIEW} (sea-tinted = existing water, bright cyan = the proposed cut)`);
}
if (WRITE) {
  fs.copyFileSync(maskFile, `${cellDir}/${ID}-water-source-before-conform.png`);
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(maskFile);
  console.log(`  written; original kept at ${ID}-water-source-before-conform.png`);
  console.log(`  now: node tools/world-authoring/cell.mjs --territory ${T} --cell ${ID.slice(1).replace("-", ",")} --redo --force --describe-file art-source/career-world/l2-land/${T}/briefs/${ID}.md`);
} else {
  console.log(`  nothing written — pass --write to apply`);
}
