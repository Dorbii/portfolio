// The palette gate's two seam bands, replicated and located.
//
// For each pair (A edge, B edge) prints the gate's numbers — all-land tone
// median (limit 21) and vegetation median dBG/dLuma (limits 0.20 / 13) — over
// the full band, then per eighth of the edge so the mismatch can be placed.
// Band = 16..176 px inside the kept edge, t = 256..2304, step 2, as cell.mjs.
//
//   node seam-bands.mjs A.png N B.png S [A.png S C.png N ...]
import sharp from "sharp";
sharp.cache(false);
const GEN = 2560, BLEED = 256, CELL = 2048;
async function raw(f) { const { data } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return data; }
function bands(buf, edge, seg) {
  const ls = [], rs = [], gs = [], bs = [];
  for (let t = 256; t < 2304; t += 2) {
    if (seg && (t < seg[0] || t >= seg[1])) continue;
    for (let o = 16; o <= 176; o += 2) {
      let gx, gy;
      if (edge === "N") { gx = t; gy = BLEED + o; } else if (edge === "S") { gx = t; gy = CELL + BLEED - o; }
      else if (edge === "W") { gy = t; gx = BLEED + o; } else { gy = t; gx = CELL + BLEED - o; }
      const i = (gy * GEN + gx) * 4; if (buf[i + 3] < 250) continue;
      const [r, g, b] = [buf[i], buf[i + 1], buf[i + 2]];
      ls.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
      if (g > r && g > b && g > 60) { rs.push(r); gs.push(g); bs.push(b); }
    }
  }
  const med = (a) => { if (a.length < 500) return null; a.sort((p, q) => p - q); return a[a.length >> 1]; };
  const tone = med(ls);
  const r = med(rs), g = med(gs), b = med(bs);
  const veg = r == null ? null : { bg: b / g, luma: 0.2126 * r + 0.7152 * g + 0.0722 * b, n: rs.length };
  return { tone, veg };
}
const args = process.argv.slice(2);
const f1 = (x) => (x == null ? "--" : x.toFixed(1));
for (let k = 0; k + 3 < args.length; k += 4) {
  const [af, ae, bf, be] = args.slice(k, k + 4);
  const A = await raw(af), B = await raw(bf);
  const a = bands(A, ae, null), b = bands(B, be, null);
  console.log(`\n${af} [${ae}]  vs  ${bf} [${be}]`);
  console.log(`  tone  ${f1(a.tone)} vs ${f1(b.tone)}  dLuma ${f1(Math.abs(a.tone - b.tone))}  (limit 21)`);
  if (a.veg && b.veg) console.log(`  veg   luma ${f1(a.veg.luma)} vs ${f1(b.veg.luma)}  dLuma ${f1(Math.abs(a.veg.luma - b.veg.luma))} (limit 13)   b/g ${a.veg.bg.toFixed(3)} vs ${b.veg.bg.toFixed(3)}  dBG ${Math.abs(a.veg.bg - b.veg.bg).toFixed(3)} (limit 0.20)   green px ${a.veg.n} vs ${b.veg.n} of ${1024 * 81} sampled (${(100 * a.veg.n / (1024 * 81)).toFixed(1)}% vs ${(100 * b.veg.n / (1024 * 81)).toFixed(1)}%)`);
  else console.log(`  veg   ${a.veg ? "" : "A has <500 green px; "}${b.veg ? "" : "B has <500 green px"}`);
  let tl = "  tone per eighth: ", vl = "  veg  per eighth: ";
  for (let s = 0; s < 8; s += 1) {
    const seg = [256 + s * 256, 256 + (s + 1) * 256];
    const x = bands(A, ae, seg), y = bands(B, be, seg);
    tl += ` [${f1(x.tone)} vs ${f1(y.tone)}]`;
    vl += ` [${x.veg ? f1(x.veg.luma) : "--"} vs ${y.veg ? f1(y.veg.luma) : "--"}]`;
  }
  console.log(tl); console.log(vl);
}
