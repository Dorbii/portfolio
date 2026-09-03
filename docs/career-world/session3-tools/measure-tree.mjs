// Measure one crown by flood-filling from a seed point in the stitched paint,
// in metres, against the plan's own rule (crowns 4-7 m). No area cap: this is
// the component the capped statistic throws away.
//   node .codex-tmp/session3/measure-tree.mjs <seedWorldX> <seedWorldY>
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const TILES = "public/career-world/layers/terrain/authority/tiles/l2-ninjaone-r1/L0", TILE = 256;
const M_PER_PX = 97.6 / 2048;
const [sx, sy] = [+process.argv[2], +process.argv[3]];
const PAD = 500, x0 = sx - PAD, y0 = sy - PAD, W = PAD * 2, H = PAD * 2;
const ax0 = Math.floor(x0 / TILE) * TILE, ay0 = Math.floor(y0 / TILE) * TILE;
const ax1 = Math.ceil((x0 + W) / TILE) * TILE, ay1 = Math.ceil((y0 + H) / TILE) * TILE;
const comps = [];
for (const f of fs.readdirSync(TILES)) { const [tx, ty] = f.replace(".webp", "").split("-").map(Number); const px = tx * TILE, py = ty * TILE; if (px >= ax1 || py >= ay1 || px + TILE <= ax0 || py + TILE <= ay0) continue; comps.push({ input: path.join(TILES, f), left: px - ax0, top: py - ay0 }); }
const base = await sharp({ create: { width: ax1 - ax0, height: ay1 - ay0, channels: 4, background: { r: 24, g: 28, b: 32, alpha: 1 } } }).composite(comps).png().toBuffer();
const { data } = await sharp(base).extract({ left: x0 - ax0, top: y0 - ay0, width: W, height: H }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
function conifer(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === 0) return false;
  const s = (mx - mn) / mx, v = mx / 255; if (s < 0.25 || v > 0.45) return false;
  let h; if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2); else h = 60 * ((r - g) / (mx - mn) + 4);
  if (h < 0) h += 360; return h >= 60 && h <= 170;
}
const mask = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) { const o = i * 4; if (data[o + 3] > 250 && conifer(data[o], data[o + 1], data[o + 2])) mask[i] = 1; }
const seed = PAD * W + PAD;
if (!mask[seed]) { console.log("seed pixel is not classified as conifer; nudge the seed"); process.exit(1); }
const seen = new Uint8Array(W * H), stack = [seed]; seen[seed] = 1;
let area = 0, bx0 = W, bx1 = 0, by0 = H, by1 = 0;
while (stack.length) { const q = stack.pop(); const qx = q % W, qy = (q - qx) / W; area++;
  if (qx < bx0) bx0 = qx; if (qx > bx1) bx1 = qx; if (qy < by0) by0 = qy; if (qy > by1) by1 = qy;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n2 = ny * W + nx; if (mask[n2] && !seen[n2]) { seen[n2] = 1; stack.push(n2); } } }
const wpx = bx1 - bx0 + 1, hpx = by1 - by0 + 1;
console.log(`component at world [${x0 + bx0}..${x0 + bx1}] x [${y0 + by0}..${y0 + by1}]`);
console.log(`  ${wpx} x ${hpx} px  =  ${(wpx * M_PER_PX).toFixed(1)} x ${(hpx * M_PER_PX).toFixed(1)} m   (area ${area} px, fill ${(area / (wpx * hpx)).toFixed(2)})`);
console.log(`  plan rule: crowns 4-7 m  =  ${Math.round(4 / M_PER_PX)}-${Math.round(7 / M_PER_PX)} px`);
console.log(`  this crown is ${(Math.max(wpx, hpx) * M_PER_PX / 7).toFixed(1)}x the plan ceiling`);
console.log(`  the statistic's cap is 20000 px; this component is ${area} px -> ${area > 20000 ? "DISCARDED, invisible to the gate" : "counted"}`);
