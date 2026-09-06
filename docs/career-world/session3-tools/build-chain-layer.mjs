// THE CHAIN LAYER (owner 2026-09-06: "lets do it that way then") — the rune
// chain drawn ONCE along its route and laid over the land at serve time,
// instead of seven cells each drawing their own.
//
// Inputs: the route (art-source/career-world/l2-land/tanium/rune-chain.def.json:
// waypoints and nodes in Tanium grid units) and two elements with alpha —
// the KERB (art-source/career-world/chain/kerb-element-r1.png: a seamless
// horizontal strip of the pale fitted-stone kerb with the dark groove along
// its foot, the groove's centre on the strip's horizontal midline) and the
// NODE (art-source/career-world/chain/node-element-r1.png: the rune panels
// that flank the groove at a settlement, transparent elsewhere).
//
// Output: one RGBA overlay per Tanium cell the route crosses, at the cell's
// full L0 size (2048 px, no bleed), art-source/career-world/chain/cells/
// tanium-<id>-chain.png — the kerb strip laid along the route (per column the
// route's height, so the canon slopes are kept), horizontally flipped every
// other repeat and phase-shifted per cell so no two repeats read alike, the
// node element centred on each node, everything masked by the land's own
// alpha so the kerb never crosses water and ends at the shore. world-register
// composites these onto the served tiles with --chain; the pyramids never
// carry the chain.
//
//   node docs/career-world/session3-tools/build-chain-layer.mjs [--kerb file] [--node file] [--out dir] [--preview out.jpg]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
sharp.cache(false);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const ART = "art-source/career-world";
const KERB = arg("--kerb", `${ART}/chain/kerb-element-r1.png`), NODE = arg("--node", `${ART}/chain/node-element-r1.png`);
const OUT = arg("--out", `${ART}/chain/cells`), PREVIEW = arg("--preview");
const CELL = 2048, BLEED = 256;
const route = JSON.parse(fs.readFileSync(`${ART}/l2-land/tanium/rune-chain.def.json`, "utf8"));
const W = route.waypoints;
const yAt = (x) => {
  for (let i = 1; i < W.length; i += 1) {
    const a = W[i - 1], b = W[i];
    if (a[0] === b[0] || (a[0] - x) * (b[0] - x) > 0) continue;
    const t = (x - a[0]) / (b[0] - a[0]);
    if (t < 0 || t > 1) continue;
    return a[1] + t * (b[1] - a[1]);
  }
  return null;
};
if (!fs.existsSync(KERB)) throw new Error(`no kerb element at ${KERB} — generate it first (chain-element.mjs)`);
const kerb = await sharp(KERB).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const KW = kerb.info.width, KH = kerb.info.height;
const sidecar = (f) => { const j = f.replace(/\.png$/, ".json"); return fs.existsSync(j) ? JSON.parse(fs.readFileSync(j, "utf8")) : null; };
const KA = sidecar(KERB)?.anchorRow ?? Math.round(KH / 2);   // the groove's row in the element: it sits on the route
const node = fs.existsSync(NODE) ? await sharp(NODE).ensureAlpha().raw().toBuffer({ resolveWithObject: true }) : null;
fs.mkdirSync(OUT, { recursive: true });
const cols = [...new Set(W.map((w) => Math.floor(Math.min(w[0], W[W.length - 1][0] - 1e-6))))];
const previews = [];
for (const col of cols) {
  const row = Math.floor(yAt(col + 0.5));
  const id = `c${col}-${row}`;
  const landFile = `${ART}/l2-land/tanium/${id}/${id}-l2.png`;
  if (!fs.existsSync(landFile)) { console.log(`  ${id}: no land layer yet — skipped`); continue; }
  const land = await sharp(landFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const LW = land.info.width, lb = Math.round((LW - CELL) / 2);
  const out = Buffer.alloc(CELL * CELL * 4);
  // the kerb strip, per column: repeat index r = floor(worldX / KW); odd repeats flipped; per-cell phase
  const phase = (col * 977) % KW;
  for (let x = 0; x < CELL; x += 1) {
    const wx = col + x / CELL;                       // grid units
    const wy = yAt(wx); if (wy == null) continue;
    const cy = (wy - row) * CELL;                    // the groove's centre in cell px
    const gx = col * CELL + x + phase, r = Math.floor(gx / KW);
    let kx = gx % KW; if (r % 2 === 1) kx = KW - 1 - kx;
    for (let ky = 0; ky < KH; ky += 1) {
      const y = Math.round(cy - KA + ky);
      if (y < 0 || y >= CELL) continue;
      const ko = (ky * KW + kx) * 4, a = kerb.data[ko + 3];
      if (a === 0) continue;
      const lo = ((lb + y) * LW + lb + x) * 4;
      if (land.data[lo + 3] < 128) continue;         // no kerb over water or past the shore
      const o = (y * CELL + x) * 4;
      out[o] = kerb.data[ko]; out[o + 1] = kerb.data[ko + 1]; out[o + 2] = kerb.data[ko + 2]; out[o + 3] = a;
    }
  }
  // the nodes: the panel element centred on the node, over the kerb, masked by land
  for (const n of route.nodes || []) {
    if (!node || n.cell[0] !== col || n.cell[1] !== row) continue;
    const NW = node.info.width, NH = node.info.height;
    const cx = Math.round((n.at[0] - col) * CELL), cy = Math.round((n.at[1] - row) * CELL);
    for (let ny = 0; ny < NH; ny += 1) for (let nx = 0; nx < NW; nx += 1) {
      const x = cx - NW / 2 + nx, y = cy - NH / 2 + ny;
      if (x < 0 || y < 0 || x >= CELL || y >= CELL) continue;
      const no = (ny * NW + nx) * 4, a = node.data[no + 3];
      if (a === 0) continue;
      const lo = ((lb + y) * LW + lb + x) * 4;
      if (land.data[lo + 3] < 128) continue;
      const o = (y * CELL + x) * 4, k = a / 255;
      for (let c = 0; c < 3; c += 1) out[o + c] = Math.round(node.data[no + c] * k + out[o + c] * (1 - k));
      out[o + 3] = Math.max(out[o + 3], a);
    }
  }
  const file = path.join(OUT, `tanium-${id}-chain.png`);
  await sharp(out, { raw: { width: CELL, height: CELL, channels: 4 } }).png().toFile(file);
  let n = 0; for (let i = 3; i < out.length; i += 4) if (out[i] > 0) n += 1;
  console.log(`  ${id}: ${n} px of chain, ${Math.round((yAt(col) - row) * 100)}% down the west edge to ${Math.round((yAt(col + 1) - row) * 100)}% down the east${(route.nodes || []).some((q) => q.cell[0] === col && q.cell[1] === row) ? ", a node" : ""} → ${file}`);
  if (PREVIEW) {
    const landPng = await sharp(landFile).extract({ left: lb, top: lb, width: CELL, height: CELL }).flatten({ background: { r: 31, g: 96, b: 108 } }).png().toBuffer();
    const full = await sharp(landPng).composite([{ input: file, left: 0, top: 0 }]).png().toBuffer();   // composite at full size, then resize
    previews.push(await sharp(full).resize(700, 700).png().toBuffer());
  }
}
if (PREVIEW && previews.length) {
  await sharp({ create: { width: previews.length * 710, height: 700, channels: 3, background: "#000" } })
    .composite(previews.map((p, i) => ({ input: p, left: i * 710, top: 0 }))).jpeg({ quality: 84 }).toFile(PREVIEW);
  console.log(`  preview ${PREVIEW}`);
}
