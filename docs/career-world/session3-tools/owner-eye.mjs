// The review packet's picture half: the oversized crown against the plan's own
// rule drawn as a bar, and the three items STATE holds for the owner's eye.
// Everything 1:1 from the stitched tiles; nothing drawn on the paint itself.
//   node .codex-tmp/session3/owner-eye.mjs
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1", TILE = 256;
const OUT = ".codex-tmp/session3/review"; fs.mkdirSync(OUT, { recursive: true });
const M = 97.6 / 2048, PX = (m) => Math.round(m / M);        // 21.0 px per metre

async function grab(level, x0, y0, w, h) {
  const dir = `${TILES}/L${level}`;
  const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
  const ax1 = Math.ceil((x0 + w) / TILE) * TILE, ay1 = Math.ceil((y0 + h) / TILE) * TILE;
  const comps = [];
  for (const f of fs.readdirSync(dir)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE; if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue; comps.push({ input: path.join(dir, f), left: px - ax0, top: py - ay0 }); }
  const base = await sharp({ create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: { r: 24, g: 28, b: 32, alpha: 1 } } }).composite(comps).png().toBuffer();
  return sharp(base).extract({ left: x0 - ax0, top: y0 - ay0, width: w, height: h }).png().toBuffer();
}

// ---- 1. the oversized crown, with the plan's 4 m and 7 m rule beside it -----
{
  const x0 = 6180, y0 = 5060, w = 760, h = 800;
  const img = await grab(0, x0, y0, w, h);
  const BARW = 190, W = w + BARW, H = h + 44;
  const bx = w + 24, base = 120;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${w}" y="0" width="${BARW}" height="${H}" fill="#141414"/>`;
  for (const [m, col, lab] of [[7, "#7CFC7C", "7 m — plan ceiling"], [4, "#4aa8ff", "4 m — plan floor"]]) {
    const px = PX(m); svg += `<rect x="${bx}" y="${base}" width="9" height="${px}" fill="${col}"/>`;
    svg += `<text x="${bx + 16}" y="${base + px / 2}" font-family="Segoe UI, Arial" font-size="14" fill="${col}">${lab}</text>`;
  }
  const treePx = 519;
  svg += `<rect x="${bx + 120}" y="${base}" width="9" height="${treePx}" fill="#ff5a5a"/>`;
  svg += `<text x="${bx + 24}" y="${base + treePx - 6}" font-family="Segoe UI, Arial" font-size="14" font-weight="bold" fill="#ff8a8a">this crown</text>`;
  svg += `<text x="${bx + 24}" y="${base + treePx + 12}" font-family="Segoe UI, Arial" font-size="14" font-weight="bold" fill="#ff8a8a">~${(treePx * M).toFixed(0)} m</text>`;
  svg += `<text x="6" y="${H - 14}" font-family="Segoe UI, Arial" font-size="18" fill="#fff">3,2 dark forest gorge, 1:1. Plan rule for this territory: "crowns 4-7 m". Ground scale 97.6 m per cell = 21 px/m. Bars are drawn to that scale.</text></svg>`;
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } })
    .composite([{ input: img, left: 0, top: 0 }, { input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(`${OUT}/eye-oversized-crown.png`);
  console.log("wrote eye-oversized-crown.png");
}

// ---- 2. the three items STATE holds for the owner's eye ---------------------
const ITEMS = [
  { id: "1,0", label: "1,0 bare plateau — the worker flagged regular bench runs and a block-like altar", x: 2048, y: 0 },
  { id: "0,0", label: "0,0 heather moor — a small pool touches the south edge (edge marked at the ends only)", x: 0, y: 0, markSouth: true },
  { id: "1,3", label: "1,3 settlement shelf — the gully below the fall came out dry sand, not a drowned inlet", x: 2048, y: 6144 },
];
{
  const S = 1024;                                   // half scale: 2048 px cell -> 1024
  const PAD = 10, LBL = 30, W = ITEMS.length * (S + PAD) + PAD, H = PAD + LBL + S + PAD + 44;
  const panels = []; let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    const cell = await grab(0, it.x, it.y, 2048, 2048);
    const half = await sharp(cell).resize(S, S, { kernel: "lanczos3" }).png().toBuffer();
    const px = PAD + i * (S + PAD), py = PAD + LBL;
    panels.push({ input: half, left: px, top: py });
    svg += `<text x="${px}" y="${py - 9}" font-family="Segoe UI, Arial" font-size="17" font-weight="bold" fill="#fff">${it.label}</text>`;
    if (it.markSouth) for (const tx of [px, px + S - 40]) svg += `<rect x="${tx}" y="${py + S - 3}" width="40" height="5" fill="#ff2fd0"/>`;
  }
  svg += `<text x="${PAD}" y="${H - 14}" font-family="Segoe UI, Arial" font-size="18" fill="#fff">The three items STATE holds for your eye, whole cells at half scale (2048 px cell shown at 1024). Each is a --force replacement on a brief if you want it.</text></svg>`;
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 17, g: 17, b: 17, alpha: 1 } } })
    .composite([...panels, { input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(`${OUT}/eye-three-items.png`);
  console.log("wrote eye-three-items.png", W, "x", H);
}
