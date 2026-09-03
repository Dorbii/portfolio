// Pearson r of luma (4x downsampled) between an output and the edit target over the
// arriving band (x in [2048,2560) of the 1,2 canvas = the neighbour 2,2's paint), plus
// a control band where the target was grey (x in [600,1400)) - expected ~0 there.
import sharp from "sharp"; sharp.cache(false);
const GEN = 2560;
const load = async (p) => { const m = await sharp(p).metadata(); let i = sharp(p); if (m.width !== GEN) i = i.resize(GEN, GEN, { kernel: "lanczos3" }); return i.removeAlpha().raw().toBuffer(); };
const luma = (b, x0, y0, w, h) => { const o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y0 + y) * GEN + x0 + x) * 3; o[y * w + x] = 0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2]; } return o; };
const down = (a, w, h, f) => { const W = w / f | 0, H = h / f | 0, o = new Float32Array(W * H); for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) { let s = 0; for (let y = 0; y < f; y++) for (let x = 0; x < f; x++) s += a[(Y * f + y) * w + X * f + x]; o[Y * W + X] = s / (f * f); } return o; };
const r = (a, b) => { const n = a.length; let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { const p = a[i] - ma, q = b[i] - mb; sab += p * q; saa += p * p; sbb += q * q; } return sab / Math.sqrt(saa * sbb); };
const target = await load(process.argv[2]);
for (const [label, p] of process.argv.slice(3).map((s) => s.split("|"))) {
  const out = await load(p);
  const band = (x0, w) => r(down(luma(out, x0, 256, w, 2048), w, 2048, 4), down(luma(target, x0, 256, w, 2048), w, 2048, 4));
  console.log(`${label.padEnd(30)} arriving band r ${band(2048, 512).toFixed(3)}   kept-edge strip (2048..2304) r ${band(2048, 256).toFixed(3)}   grey control r ${band(600, 800).toFixed(3)}`);
}
