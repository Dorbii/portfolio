// The cells the gates refused, large, each with what refused it.
//
// The review sheet shows the whole lattice small; this shows only the refused
// candidates, big enough to judge. Since the dominant refusal is palette
// conformance across a SEAM, each reject is drawn with a strip of every
// authored neighbour along the edge they share — the mismatch the gate is
// complaining about is a comparison, so it has to be shown as one.
//
//   node docs/career-world/session3-tools/tanium-rejects-sheet.mjs
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);

const T = "tanium";
const OUT = `docs/career-world/session3-tools/${T}-rejects-sheet.png`;
const SNAP = ".codex-tmp/reject-snapshot";
const def = JSON.parse(fs.readFileSync(`art-source/career-world/l2-land/${T}/territory.def.json`, "utf8"));
const M = `public/career-world/layers/terrain/authority/manifests/terrain-l2-${T}-r1.json`;
const authored = fs.existsSync(M) ? Object.keys(JSON.parse(fs.readFileSync(M, "utf8")).cells) : [];
const log = fs.readFileSync(`.codex-tmp/bake-${T}.log`, "utf8");

// last refusal reason per cell
function lastFail(id) {
  const re = new RegExp(`cell ${id}\\s+\\(tanium\\)([\\s\\S]*?)(?:accepted, stitched|cell NOT accepted)`, "g");
  let m, last = null;
  while ((m = re.exec(log)) !== null) last = m[1];
  if (!last) return [];
  return [...last.matchAll(/^\s*FAIL\s+(.+?)\s{2,}(.*)$/gm)].map((x) => `${x[1].trim()} ${x[2].trim().slice(0, 30)}`);
}

const refused = [];
for (let r = 0; r < def.grid.rows; r += 1) {
  for (let c = 0; c < def.grid.cols; c += 1) {
    const id = `c${c}-${r}`;
    if (authored.includes(id)) continue;
    if (!fs.existsSync(`${SNAP}/${id}.png`)) continue;
    refused.push({ id, c, r, biome: def.cellBiomes[`${c},${r}`], why: lastFail(id) });
  }
}

const CELL = 560, STRIP = 62, PAD = 16, LABEL = 46, COLS = 4;
const TW = CELL + STRIP * 2, TH = CELL + STRIP * 2 + LABEL;
const rows = Math.ceil(refused.length / COLS);
const W = COLS * (TW + PAD) - PAD, H = 76 + rows * (TH + PAD) - PAD;

const comps = [], svg = [];
svg.push(`<text x="14" y="34" fill="#f0f5fa" font-family="Georgia,serif" font-size="27">`
  + `Tanium — the ${refused.length} refused candidates, with their authored neighbours along each shared edge</text>`);
svg.push(`<text x="14" y="60" fill="#9db0c2" font-family="monospace" font-size="15">`
  + `The grey band on a side means that neighbour is not authored either. Palette conformance is a COMPARISON, so the comparison is drawn.</text>`);

for (const [i, cell] of refused.entries()) {
  const gx = (i % COLS) * (TW + PAD), gy = 76 + Math.floor(i / COLS) * (TH + PAD);
  // the candidate
  comps.push({ input: await sharp(`${SNAP}/${cell.id}.png`).resize(CELL, CELL, { fit: "cover" }).png().toBuffer(),
    left: gx + STRIP, top: gy + STRIP });

  // neighbour strips: authored art cropped to the band along the shared edge
  const sides = [
    { d: "n", dc: 0, dr: -1, x: gx + STRIP, y: gy, w: CELL, h: STRIP, crop: (m) => ({ left: 0, top: m.height - Math.round(m.height * 0.12), width: m.width, height: Math.round(m.height * 0.12) }) },
    { d: "s", dc: 0, dr: 1, x: gx + STRIP, y: gy + STRIP + CELL, w: CELL, h: STRIP, crop: (m) => ({ left: 0, top: 0, width: m.width, height: Math.round(m.height * 0.12) }) },
    { d: "w", dc: -1, dr: 0, x: gx, y: gy + STRIP, w: STRIP, h: CELL, crop: (m) => ({ left: m.width - Math.round(m.width * 0.12), top: 0, width: Math.round(m.width * 0.12), height: m.height }) },
    { d: "e", dc: 1, dr: 0, x: gx + STRIP + CELL, y: gy + STRIP, w: STRIP, h: CELL, crop: (m) => ({ left: 0, top: 0, width: Math.round(m.width * 0.12), height: m.height }) },
  ];
  for (const s of sides) {
    const nid = `c${cell.c + s.dc}-${cell.r + s.dr}`;
    const p = `art-source/career-world/l2-land/${T}/${nid}/${nid}-l2.png`;
    if (!authored.includes(nid) || !fs.existsSync(p)) {
      svg.push(`<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="#1a222c"/>`);
      continue;
    }
    const m = await sharp(p).metadata();
    comps.push({ input: await sharp(p).extract(s.crop(m)).resize(s.w, s.h, { fit: "fill" }).png().toBuffer(), left: s.x, top: s.y });
    svg.push(`<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="none" stroke="#8fe06a" stroke-width="2"/>`);
  }
  svg.push(`<rect x="${gx + STRIP}" y="${gy + STRIP}" width="${CELL}" height="${CELL}" fill="none" stroke="#ff9d5c" stroke-width="3"/>`);
  svg.push(`<text x="${gx}" y="${gy + TH - 24}" fill="#e8eef4" font-family="monospace" font-size="16">${cell.id}  ${cell.biome}</text>`);
  svg.push(`<text x="${gx}" y="${gy + TH - 6}" fill="#ff9d5c" font-family="monospace" font-size="14">${cell.why.join("   |   ").slice(0, 118) || "(reason not in the log)"}</text>`);
}

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 13, g: 22, b: 32, alpha: 255 } } })
  .composite([...comps, { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join("")}</svg>`), left: 0, top: 0 }])
  .png().toFile(OUT);

const stats = await sharp(OUT).stats();
const mean = stats.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
console.log(`wrote ${OUT}  ${W} x ${H}`);
console.log(`  ${refused.length} refused candidates, mean luminance ${mean.toFixed(1)} ${mean > 25 ? "(art present)" : "(BLANK — check the overlay)"}`);
for (const c of refused) console.log(`  ${c.id}  ${c.biome.padEnd(17)} ${c.why.join(" | ")}`);
