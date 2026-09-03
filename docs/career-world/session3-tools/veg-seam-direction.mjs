// Which way is the vegetation off at a rejected seam? Reproduces cell.mjs's
// vegBand exactly, so the number matches the gate, and prints both sides so the
// next brief can name the direction instead of just the magnitude.
//   node .codex-tmp/session3/veg-seam-direction.mjs <candidate-l2.png> <edge> <neighbour-l2.png> <oppEdge>
import sharp from "sharp";
sharp.cache(false);
const GEN = 2560, BLEED = 256, CELL = 2048;
const vegBand = (buf, edge) => {
  const rs = [], gs = [], bs = [];
  for (let t = 256; t < 2304; t += 2) for (let o = 16; o <= 176; o += 2) {
    let gx, gy;
    if (edge === "N") { gx = t; gy = BLEED + o; }
    else if (edge === "S") { gx = t; gy = CELL + BLEED - o; }
    else if (edge === "W") { gy = t; gx = BLEED + o; }
    else { gy = t; gx = CELL + BLEED - o; }
    const i = (gy * GEN + gx) * 4;
    if (buf[i + 3] < 250) continue;
    const [r, g, b] = [buf[i], buf[i + 1], buf[i + 2]];
    if (g > r && g > b && g > 60) { rs.push(r); gs.push(g); bs.push(b); }
  }
  if (rs.length < 500) return null;
  const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  const r = med(rs), g = med(gs), b = med(bs);
  return { n: rs.length, r, g, b, bg: b / g, luma: 0.2126 * r + 0.7152 * g + 0.0722 * b };
};
const load = async (p) => {
  const m = await sharp(p).metadata();
  let im = sharp(p); if (m.width !== GEN) im = im.resize(GEN, GEN, { kernel: "lanczos3" });
  return im.ensureAlpha().raw().toBuffer();
};
const [cp, ce, np, ne] = process.argv.slice(2);
const mine = vegBand(await load(cp), ce), theirs = vegBand(await load(np), ne);
const show = (lab, x) => x
  ? console.log(`${lab.padEnd(22)} n${String(x.n).padStart(6)}  rgb ${x.r},${x.g},${x.b}  B/G ${x.bg.toFixed(3)}  luma ${x.luma.toFixed(1)}`)
  : console.log(`${lab.padEnd(22)} under 500 vegetation samples — not compared`);
show(`candidate ${ce} band`, mine);
show(`neighbour ${ne} band`, theirs);
if (mine && theirs) {
  const d = mine.bg - theirs.bg;
  console.log(`\ndBG ${Math.abs(d).toFixed(3)} (limit 0.20)  dLuma ${Math.abs(mine.luma - theirs.luma).toFixed(1)} (limit 13)`);
  console.log(`the candidate's vegetation is ${d < 0 ? "LESS blue / more pure green" : "MORE blue / hazier"} than the neighbour's,`);
  console.log(`B/G ${mine.bg.toFixed(3)} against ${theirs.bg.toFixed(3)} — it needs to move ${d < 0 ? "TOWARD" : "AWAY FROM"} blue by ${Math.abs(d).toFixed(3)} to match, ${(Math.abs(d) - 0.20).toFixed(3)} of that to clear the gate.`);
  const targetB = Math.round(theirs.bg * mine.g);
  console.log(`at the candidate's own green (${mine.g}) that is a median blue of about ${targetB} instead of ${mine.b}.`);
}
