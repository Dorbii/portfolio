// Where an authored cell's water reaches one of its kept edges, read two ways:
// from the water mask's alpha (what write-briefs.mjs reads) and from the l2
// layer's alpha (what the continuity gate reads), both through sharp. Runs
// under 30 px are dropped, as both consumers do. Positions are % along the
// edge from its north/west end; widths in metres at 97.6 m per 2048 px.
//
//   node edge-water.mjs <territory> <cell-id> <top|bottom|left|right> [...]
import sharp from "sharp";
sharp.cache(false);
const KEPT = 2048, M = 97.6 / 2048;
const [T, ...rest] = process.argv.slice(2);
async function alphaRuns(file, edge, wetTest) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, bleed = Math.round((W - KEPT) / 2);
  const runs = []; let start = null;
  for (let i = 0; i < KEPT; i += 1) {
    const [x, y] = edge === "bottom" ? [bleed + i, bleed + KEPT - 1] : edge === "top" ? [bleed + i, bleed]
      : edge === "right" ? [bleed + KEPT - 1, bleed + i] : [bleed, bleed + i];
    const wet = wetTest(data[(y * W + x) * 4 + 3]);
    if (wet && start === null) start = i;
    if (!wet && start !== null) { runs.push([start, i - 1]); start = null; }
  }
  if (start !== null) runs.push([start, KEPT - 1]);
  return runs.filter(([a, b]) => b - a >= 30).map(([a, b]) => `${Math.round((a + b) / 2 / KEPT * 100)}% (${((b - a) * M).toFixed(1)} m, px ${a}-${b})`);
}
for (let k = 0; k + 1 < rest.length; k += 2) {
  const id = rest[k], edge = rest[k + 1];
  const dir = `art-source/career-world/l2-land/${T}/${id}`;
  const mask = await alphaRuns(`${dir}/${id}-water.png`, edge, (a) => a >= 128);
  const l2 = await alphaRuns(`${dir}/${id}-l2.png`, edge, (a) => a < 250);
  console.log(`${id} ${edge}:\n  mask alpha>=128 : ${mask.join(" | ") || "none"}\n  l2   alpha<250  : ${l2.join(" | ") || "none"}`);
}
