// Painted water left OUTSIDE the mask: the gate's fringe classifier at ring 6 px (the gate) and 48 px.
// Baseline = accepted cells (c4-3, c3-3); positive control = the rejected candidate (visible misfit).
import sharp from "sharp"; sharp.cache(false);
const GEN = 2560;
async function load(kind, id) {
  if (kind === "candidate") {
    const art = await sharp(`.codex-tmp/authoring/cells/${id}/${id}-source.png`).resize(GEN, GEN, { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer();
    const m = await sharp(`.codex-tmp/authoring/cells/${id}/${id}-water-source.png`).resize(GEN, GEN, { kernel: "nearest" }).ensureAlpha().raw().toBuffer();
    const water = new Uint8Array(GEN * GEN); for (let i = 0; i < GEN * GEN; i++) water[i] = (m[i * 4 + 3] > 128 && m[i * 4] > 128) ? 1 : 0;
    const alpha = new Uint8Array(GEN * GEN); for (let i = 0; i < GEN * GEN; i++) alpha[i] = water[i] ? 0 : 255;
    return { art, water, alpha };
  }
  const dir = `art-source/career-world/l2-land/ninjaone/${id}`;
  const art = await sharp(`${dir}/${id}-l2.png`).ensureAlpha().raw().toBuffer();
  const m = await sharp(`${dir}/${id}-water.png`).ensureAlpha().raw().toBuffer();
  const water = new Uint8Array(GEN * GEN); for (let i = 0; i < GEN * GEN; i++) water[i] = (m[i * 4 + 3] > 128 && m[i * 4] > 128) ? 1 : 0;
  const alpha = new Uint8Array(GEN * GEN); for (let i = 0; i < GEN * GEN; i++) alpha[i] = art[i * 4 + 3];
  return { art, water, alpha };
}
function measure({ art, water, alpha }, rings) {
  // prefix sums of water per row and per column (axis search, as the gate does)
  const row = new Int32Array(GEN * (GEN + 1)), col = new Int32Array(GEN * (GEN + 1));
  for (let y = 0; y < GEN; y++) for (let x = 0; x < GEN; x++) row[y * (GEN + 1) + x + 1] = row[y * (GEN + 1) + x] + water[y * GEN + x];
  for (let x = 0; x < GEN; x++) for (let y = 0; y < GEN; y++) col[x * (GEN + 1) + y + 1] = col[x * (GEN + 1) + y] + water[y * GEN + x];
  const near = (x, y, d) => {
    const x0 = Math.max(0, x - d), x1 = Math.min(GEN, x + d + 1), y0 = Math.max(0, y - d), y1 = Math.min(GEN, y + d + 1);
    return (row[y * (GEN + 1) + x1] - row[y * (GEN + 1) + x0]) > 0 || (col[x * (GEN + 1) + y1] - col[x * (GEN + 1) + y0]) > 0;
  };
  const res = {};
  for (const d of rings) { res[d] = { ring: 0, fringe: 0 }; }
  for (let y = 1; y < GEN - 1; y++) for (let x = 1; x < GEN - 1; x++) {
    const i = y * GEN + x; if (water[i] || alpha[i] <= 250) continue;
    const r = art[i * 4], g = art[i * 4 + 1], b = art[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
    const blue = mx > 40 && sat > 0.25 && b > r && b >= g;
    for (const d of rings) if (near(x, y, d)) { res[d].ring++; if (blue) res[d].fringe++; }
  }
  return res;
}
const rings = [6, 48];
for (const [kind, id] of [["accepted", "c4-3"], ["accepted", "c3-3"], ["candidate", "c4-2"]]) {
  const r = measure(await load(kind, id), rings);
  const line = rings.map(d => `ring${d}: ${r[d].fringe}/${r[d].ring} = ${(100 * r[d].fringe / Math.max(1, r[d].ring)).toFixed(2)}%`).join("   ");
  const beyond = r[48].fringe - r[6].fringe;
  console.log(`${id.padEnd(5)} ${kind.padEnd(9)} ${line}   blue px in the 7..48 band only: ${beyond}`);
}
