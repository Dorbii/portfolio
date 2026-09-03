// How faithfully does a generated cell reproduce the neighbour pixels it was shown?
// A cell's BLEED strip overlaps the neighbour's kept area; if the generator continued the
// context pixels, the strip should correlate with the neighbour's paint. Baseline: the same
// neighbour against itself shifted 512 px (same style, unrelated place).
import sharp from "sharp";
sharp.cache(false);
const SRC = "art-source/career-world/l2-land/ninjaone", GEN = 2560;
const concept = id => sharp(`${SRC}/${id}/${id}-concept.png`).removeAlpha().raw().toBuffer();
const luma = (buf, x0, y0, w, h) => { const o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y0 + y) * GEN + x0 + x) * 3; o[y * w + x] = 0.299 * buf[i] + 0.587 * buf[i + 1] + 0.114 * buf[i + 2]; } return o; };
const down = (a, w, h, f) => { const W = Math.floor(w / f), H = Math.floor(h / f), o = new Float32Array(W * H); for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) { let s = 0; for (let y = 0; y < f; y++) for (let x = 0; x < f; x++) s += a[(Y * f + y) * w + X * f + x]; o[Y * W + X] = s / (f * f); } return o; };
const pearson = (a, b) => { const n = a.length; let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db; } return sab / Math.sqrt(saa * sbb); };
const mad = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
function compare(name, A, aRect, B, bRect) {
  const [ax, ay, w, h] = aRect, [bx, by] = bRect;
  const la = luma(A, ax, ay, w, h), lb = luma(B, bx, by, w, h);
  const r8 = pearson(down(la, w, h, 8), down(lb, w, h, 8)), r32 = pearson(down(la, w, h, 32), down(lb, w, h, 32)), r1 = pearson(la, lb);
  console.log(`${name.padEnd(62)} r@1:1 ${r1.toFixed(3)}   r@1/8 ${r8.toFixed(3)}   r@1/32 ${r32.toFixed(3)}   MAD luma ${mad(la, lb).toFixed(1)}`);
}
const c33 = await concept("c3-3"), c43 = await concept("c4-3"), c42 = await concept("c4-2");
const cand = await sharp(".codex-tmp/authoring/cells/c4-2/c4-2-source.png").resize(GEN, GEN, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer();
console.log("strip = 256 px bleed of the later cell over the earlier cell's kept area (2048 px long)");
compare("c3-3 east bleed  vs  c4-3 kept (what c3-3 was shown)", c33, [2304, 256, 256, 2048], c43, [256, 256]);
compare("old c4-2 south bleed  vs  c4-3 kept (what c4-2 was shown)", c42, [256, 2304, 2048, 256], c43, [256, 256]);
compare("REJECTED candidate south bleed  vs  c4-3 kept", cand, [256, 2304, 2048, 256], c43, [256, 256]);
console.log("baselines (same style, unrelated place):");
compare("c4-3 strip  vs  c4-3 shifted 512 px east", c43, [256, 256, 256, 2048], c43, [768, 256]);
compare("c4-3 strip  vs  c4-3 shifted 512 px south", c43, [256, 256, 2048, 256], c43, [256, 768]);
console.log("what the stitch then does with those strips: in the seam band the earlier cell's pixels win, so the bleed is mostly discarded");
