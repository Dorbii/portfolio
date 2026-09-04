// The palette gate's all-land tone band, replicated: median luma of opaque
// pixels 16..176 px inside an edge, t = 256..2304 (the kept cell), step 2.
// Printed per eighth of the edge so the mismatch can be located.
import sharp from "sharp";
sharp.cache(false);
const GEN = 2560, BLEED = 256, CELL = 2048;
async function raw(f) { const { data } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return data; }
function band(buf, edge, seg) { // seg: [t0,t1) or null for all
  const ls = [];
  for (let t = 256; t < 2304; t += 2) {
    if (seg && (t < seg[0] || t >= seg[1])) continue;
    for (let o = 16; o <= 176; o += 2) {
      let gx, gy;
      if (edge === "N") { gx = t; gy = BLEED + o; } else if (edge === "S") { gx = t; gy = CELL + BLEED - o; }
      else if (edge === "W") { gy = t; gx = BLEED + o; } else { gy = t; gx = CELL + BLEED - o; }
      const i = (gy * GEN + gx) * 4; if (buf[i + 3] < 250) continue;
      ls.push(0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]);
    }
  }
  if (ls.length < 500) return null; ls.sort((a, b) => a - b); return ls[ls.length >> 1];
}
const pairs = [
  ["c1-1 candidate N", ".codex-tmp/authoring/cells/tanium/c1-1/c1-1-l2.png", "N", "c1-0 S", "art-source/career-world/l2-land/tanium/c1-0/c1-0-l2.png", "S"],
  ["c1-1 candidate W", ".codex-tmp/authoring/cells/tanium/c1-1/c1-1-l2.png", "W", "c0-1 E", "art-source/career-world/l2-land/tanium/c0-1/c0-1-l2.png", "E"],
];
for (const [an, af, ae, bn, bf, be] of pairs) {
  const A = await raw(af), B = await raw(bf);
  const fa = band(A, ae, null), fb = band(B, be, null);
  console.log(`\n${an} vs ${bn}: full-band median luma ${fa?.toFixed(1)} vs ${fb?.toFixed(1)}  dLuma ${(Math.abs(fa - fb)).toFixed(1)}`);
  let line = "  per eighth (W->E or N->S): ";
  for (let s = 0; s < 8; s += 1) {
    const seg = [256 + s * 256, 256 + (s + 1) * 256];
    const a = band(A, ae, seg), b = band(B, be, seg);
    line += ` [${a == null ? "--" : a.toFixed(0)} vs ${b == null ? "--" : b.toFixed(0)}]`;
  }
  console.log(line);
}
