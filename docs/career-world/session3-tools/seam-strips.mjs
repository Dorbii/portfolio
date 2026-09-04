// Draw a seam as the comparison it is: the neighbour's band along the shared
// edge beside the candidate's band, magenta line between, at one scale.
//
//   node seam-strips.mjs <candidate-concept.png> <edge N|S|E|W> <neighbour-concept.png> <out.png>
//
// For N/S edges the strips are horizontal (neighbour above for N, below for S);
// for E/W they are vertical (neighbour left for W, right for E). Each strip is
// the 384 px just inside the kept edge (about 18 m), full length, scaled to 1500.
import sharp from "sharp";
sharp.cache(false);
const [cand, edge, nb, out] = process.argv.slice(2);
const BLEED = 256, KEPT = 2048, D = 384, L = 1500, T = Math.round(D * L / KEPT);
const opp = { N: "S", S: "N", E: "W", W: "E" }[edge];
function box(e) {
  // the D px just inside the kept edge `e`, full kept length
  if (e === "N") return { left: BLEED, top: BLEED, width: KEPT, height: D };
  if (e === "S") return { left: BLEED, top: BLEED + KEPT - D, width: KEPT, height: D };
  if (e === "W") return { left: BLEED, top: BLEED, width: D, height: KEPT };
  return { left: BLEED + KEPT - D, top: BLEED, width: D, height: KEPT };
}
const horiz = edge === "N" || edge === "S";
const size = horiz ? { width: L, height: T } : { width: T, height: L };
const a = await sharp(cand).extract(box(edge)).resize(size.width, size.height).png().toBuffer();
const b = await sharp(nb).extract(box(opp)).resize(size.width, size.height).png().toBuffer();
const gap = 6;
const W = horiz ? L : T * 2 + gap, H = horiz ? T * 2 + gap : L;
// neighbour first when it lies N or W of the candidate, candidate first otherwise
const nbFirst = edge === "N" || edge === "W";
const first = nbFirst ? b : a, second = nbFirst ? a : b;
const comps = horiz
  ? [{ input: first, left: 0, top: 0 }, { input: second, left: 0, top: T + gap }]
  : [{ input: first, left: 0, top: 0 }, { input: second, left: T + gap, top: 0 }];
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } } })
  .composite(comps).png().toFile(out);
console.log(`wrote ${out}  (${nbFirst ? "neighbour then candidate" : "candidate then neighbour"}, ${horiz ? "top to bottom" : "left to right"})`);
