// Prototype of an in-house FINISH: a deterministic post-process the pipeline could apply to every
// cell so the render reads as ours rather than the generator's. Four dials, all cheap:
//   1. value steps  - soft quantisation of luminance into painted steps (kills the micro-weave)
//   2. edge ink     - darken strong silhouette edges slightly (the 2.5D game read)
//   3. split tone   - warm the lights, cool the shadows, fixed hues (our palette key)
//   4. grain        - a fixed, seeded paper grain (our texture instead of the model's)
// Usage: node finish.mjs <in.png> <out.png> [steps=14] [ink=0.35] [tone=0.12] [grain=0.05]
import sharp from "sharp";
sharp.cache(false);
const [inp, out, S = "14", INK = "0.35", TONE = "0.12", GRAIN = "0.05"] = process.argv.slice(2);
const steps = +S, ink = +INK, tone = +TONE, grain = +GRAIN;
const { data, info } = await sharp(inp).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const L = new Float32Array(N);
for (let i = 0; i < N; i++) L[i] = 0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2];
// seeded grain (deterministic)
let seed = 1234567; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
const g = new Float32Array(N); for (let i = 0; i < N; i++) g[i] = rnd() - 0.5;
// low-frequency grain: average 3x3 so it reads as paper, not noise
const g2 = new Float32Array(N);
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += g[(y + dy) * W + x + dx]; g2[y * W + x] = s / 9; }
const outBuf = Buffer.alloc(N * 3);
const warm = [1.04, 1.0, 0.94], cool = [0.94, 0.98, 1.06];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, r = data[i * 3], gg = data[i * 3 + 1], b = data[i * 3 + 2], l = L[i];
  // 1. value steps: quantise luminance softly (blend 60% toward the stepped value)
  const q = Math.round(l / 255 * steps) / steps * 255, lq = l + (q - l) * 0.6;
  // 2. edge ink: gradient magnitude on luminance
  let e = 0;
  if (x > 0 && x < W - 1 && y > 0 && y < H - 1) e = Math.hypot(L[i + 1] - L[i - 1], L[i + W] - L[i - W]);
  const inkF = 1 - ink * Math.min(1, Math.max(0, (e - 40) / 120));
  // 3. split tone by luminance
  const t = l / 255, tw = tone * t, tc = tone * (1 - t);
  const scale = lq / Math.max(1, l) * inkF;
  const rr = r * scale * (1 + (warm[0] - 1) * tw + (cool[0] - 1) * tc);
  const g1 = gg * scale * (1 + (warm[1] - 1) * tw + (cool[1] - 1) * tc);
  const bb = b * scale * (1 + (warm[2] - 1) * tw + (cool[2] - 1) * tc);
  // 4. grain
  const gr = 1 + grain * g2[i] * 2;
  outBuf[i * 3] = Math.max(0, Math.min(255, rr * gr)); outBuf[i * 3 + 1] = Math.max(0, Math.min(255, g1 * gr)); outBuf[i * 3 + 2] = Math.max(0, Math.min(255, bb * gr));
}
await sharp(outBuf, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
console.log(`finish -> ${out}  steps ${steps} ink ${ink} tone ${tone} grain ${grain}`);
