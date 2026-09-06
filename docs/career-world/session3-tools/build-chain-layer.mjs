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
const KERB = arg("--kerb", `${ART}/chain/kerb-element.png`), NODE = arg("--node", `${ART}/chain/node-element.png`);   // the chosen elements (copies of a revision)
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
  // the land that masks the chain: the working folder's candidate when it is
  // newer than the authored layer (the preview the owner sees), else the
  // authored layer; a cell with neither is skipped
  const authored = `${ART}/l2-land/tanium/${id}/${id}-l2.png`, candidate = `.codex-tmp/authoring/cells/tanium/${id}/${id}-l2.png`;
  const newer = (a, b) => fs.existsSync(a) && (!fs.existsSync(b) || fs.statSync(a).mtimeMs > fs.statSync(b).mtimeMs);
  const landFile = newer(candidate, authored) ? candidate : fs.existsSync(authored) ? authored : null;
  if (!landFile) { console.log(`  ${id}: no land layer yet — skipped`); continue; }
  const land = await sharp(landFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const LW = land.info.width, lb = Math.round((LW - CELL) / 2);
  const out = Buffer.alloc(CELL * CELL * 4);
  // BEDDING (owner 2026-09-06: "that looks stickered on"): the element is cut
  // INTO this ground, not laid on it — per column the land's own colour just
  // outside the slot is sampled, the element's pixels take that colour's hue
  // and saturation while keeping their own light and dark (the floor stays
  // dark, the far wall pale), the outer rows of the element are feathered so
  // the ground's texture runs to the lip, a soft occlusion darkens the ground
  // beside the cut, and the line jitters a pixel or two so the repeat is lost.
  const FEATHER = 5, AO = 10, AO_STRENGTH = 0.45;
  const lumaOf = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const landPx = (x, y) => { const lo = ((lb + y) * LW + lb + x) * 4; return [land.data[lo], land.data[lo + 1], land.data[lo + 2], land.data[lo + 3]]; };
  let seed = (col * 7919 + row * 104729 + 17) >>> 0;
  const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  const jitterRaw = Array.from({ length: CELL }, () => rnd() - 0.5), jitter = new Array(CELL).fill(0);
  for (let x = 0; x < CELL; x += 1) { let s = 0, c = 0; for (let j = -24; j <= 24; j += 1) { const q = x + j; if (q >= 0 && q < CELL) { s += jitterRaw[q]; c += 1; } } jitter[x] = (s / c) * 12; }   // sd ~1.3 px
  // the kerb strip, per column: repeat index r = floor(worldX / KW); odd repeats flipped; per-cell phase
  const phase = (col * 977) % KW;
  for (let x = 0; x < CELL; x += 1) {
    const wx = col + x / CELL;                       // grid units
    const wy = yAt(wx); if (wy == null) continue;
    const cy = (wy - row) * CELL + jitter[x];        // the groove's centre in cell px
    const gx = col * CELL + x + phase, r = Math.floor(gx / KW);
    let kx = gx % KW; if (r % 2 === 1) kx = KW - 1 - kx;
    // the ground's colour beside the slot in this column (a window above and below the element)
    const yTop = Math.round(cy - KA), yBot = yTop + KH;
    let gr = 0, gg = 0, gb = 0, gn = 0;
    for (let y = yTop - 24; y < yBot + 24; y += 2) {
      if (y < 0 || y >= CELL || (y >= yTop && y < yBot)) continue;
      const p = landPx(x, y); if (p[3] < 128) continue;
      gr += p[0]; gg += p[1]; gb += p[2]; gn += 1;
    }
    const ground = gn ? [gr / gn, gg / gn, gb / gn] : null, groundL = ground ? Math.max(1, lumaOf(...ground)) : 1;
    for (let ky = 0; ky < KH; ky += 1) {
      const y = yTop + ky;
      if (y < 0 || y >= CELL) continue;
      const ko = (ky * KW + kx) * 4, a0 = kerb.data[ko + 3];
      if (a0 === 0) continue;
      const lp = landPx(x, y);
      if (lp[3] < 128) continue;                     // no chain over water or past the shore
      // feather the element's outer rows so the ground's texture runs to the lip
      const edge = Math.min(ky + 1, KH - ky), fade = edge <= FEATHER ? edge / (FEATHER + 1) : 1;
      const a = Math.round(a0 * fade);
      if (a === 0) continue;
      // the element's light and dark, leaning toward the ground's own hue: the
      // lips (the element's outer rows) are this ground and take it strongly,
      // the cut walls and the floor are rock and keep most of their own colour
      let er = kerb.data[ko], eg = kerb.data[ko + 1], eb = kerb.data[ko + 2];
      if (ground) {
        const el = lumaOf(er, eg, eb), k = el / groundL;
        const tr = Math.min(255, ground[0] * k), tg = Math.min(255, ground[1] * k), tb = Math.min(255, ground[2] * k);
        const depthIn = Math.min(ky, KH - 1 - ky) / (KH / 2);            // 0 at the lips, 1 at the centre
        const t = 0.7 - 0.55 * Math.min(1, depthIn * 2);                 // 0.7 at the lip → 0.15 by a quarter of the way in
        er = Math.round(er * (1 - t) + tr * t); eg = Math.round(eg * (1 - t) + tg * t); eb = Math.round(eb * (1 - t) + tb * t);
      }
      const o = (y * CELL + x) * 4;
      out[o] = er; out[o + 1] = eg; out[o + 2] = eb; out[o + 3] = a;
    }
    // the occlusion beside the cut: dark, fading over AO px above the top lip and below the bottom one
    for (let d = 1; d <= AO; d += 1) {
      const w = AO_STRENGTH * (1 - d / (AO + 1));
      for (const y of [yTop - d, yBot - 1 + d]) {
        if (y < 0 || y >= CELL) continue;
        const lp = landPx(x, y); if (lp[3] < 128) continue;
        const o = (y * CELL + x) * 4;
        if (out[o + 3] > 0) continue;               // never over the element itself
        out[o] = 12; out[o + 1] = 10; out[o + 2] = 8; out[o + 3] = Math.round(255 * w);
      }
    }
  }
  // the nodes: the panel element centred on the node, over the kerb, masked by land
  for (const n of route.nodes || []) {
    if (!node || n.cell[0] !== col || n.cell[1] !== row) continue;
    const NW = node.info.width, NH = node.info.height;
    const cx = Math.round((n.at[0] - col) * CELL), cy = Math.round((n.at[1] - row) * CELL);
    const x0 = cx - Math.round(NW / 2), y0 = cy - Math.round(NH / 2);   // integer origin: a fractional index writes nothing into a Buffer
    for (let ny = 0; ny < NH; ny += 1) for (let nx = 0; nx < NW; nx += 1) {
      const x = x0 + nx, y = y0 + ny;
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
