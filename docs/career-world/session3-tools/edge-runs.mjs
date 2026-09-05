// Wet runs along one kept edge of any land layer (authored or a candidate),
// read the continuity gate's way: alpha < 128 within 8 px either side of the
// kept edge line, runs of 30 px or more. Positions in % along the edge from
// its north/west end and in kept px; widths in metres (97.6 m per 2048 px).
//   node .codex-tmp/session4/edge-runs.mjs <l2.png> <top|bottom|left|right>
import sharp from "sharp";
sharp.cache(false);
const [file, edge] = process.argv.slice(2);
const KEPT = 2048;
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, bleed = Math.round((W - KEPT) / 2);
const along = edge === "top" || edge === "bottom";
const line = edge === "bottom" || edge === "right" ? bleed + KEPT : bleed;
const runs = []; let start = null;
for (let i = 0; i < KEPT; i += 1) {
  let mn = 255;
  for (let d = -8; d <= 8; d += 1) {
    const [px, py] = along ? [bleed + i, line + d] : [line + d, bleed + i];
    if (px < 0 || py < 0 || px >= W || py >= W) continue;
    mn = Math.min(mn, data[(py * W + px) * 4 + 3]);
  }
  const wet = mn < 128;
  if (wet && start === null) start = i;
  if (!wet && start !== null) { runs.push([start, i - 1]); start = null; }
}
if (start !== null) runs.push([start, KEPT - 1]);
const kept = runs.filter(([a, b]) => b - a + 1 >= 30);
console.log(`${file} ${edge}: ${kept.length} run(s)`);
for (const [a, b] of kept) console.log(`  ${Math.round((a + b) / 2 / KEPT * 100)}% (kept px ${a}-${b}, centre ${Math.round((a + b) / 2)}), ${((b - a + 1) / KEPT * 97.6).toFixed(1)} m wide`);
