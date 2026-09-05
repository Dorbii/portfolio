// Add painted water to a cell's mask from SEED POINTS: a flood fill over the
// uncut concept paint, 4-connected, within a colour tolerance of each seed's
// own colour, capped in size. For the water the worker painted but did not
// mask and the growth tool cannot reach: a stream not connected to any cut
// water, a muted wet patch, a pale gravel bed beside a thread of cut water.
//
// The art is untouched. The fill is written into the worker's 1254 px SOURCE
// mask (the file cell.mjs --redo re-derives everything from), so the whole
// pyramid is re-derived consistently with no regeneration — the c3-2 method.
//
//   node docs/career-world/session3-tools/seed-water-mask.mjs <territory> <cell-id> \
//        --seeds "x,y;x,y" [--tol 30] [--max 60000] [--write]
//   seeds are 2560-canvas px (256 bleed); a preview with the new pixels in red
//   is written to .codex-tmp/session4/seed-<cell>.png either way.
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);
const [T, ID] = process.argv.slice(2);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const SEEDS = arg("--seeds", "").split(";").filter(Boolean).map((s) => s.split(",").map(Number));
const TOL = Number(arg("--tol", 30)), MAX = Number(arg("--max", 60000));
const WRITE = process.argv.includes("--write");
if (!SEEDS.length) throw new Error("--seeds x,y[;x,y] required");
const art = `art-source/career-world/l2-land/${T}/${ID}`;
const cellDir = `.codex-tmp/authoring/cells/${T}/${ID}`;
const srcMask = `${cellDir}/${ID}-water-source.png`;
if (!fs.existsSync(srcMask)) {
  fs.mkdirSync(cellDir, { recursive: true });
  for (const f of [`${ID}-source.png`, `${ID}-water-source.png`, `${ID}-water.json`, `${ID}-report.json`]) {
    if (fs.existsSync(`${art}/${f}`) && !fs.existsSync(`${cellDir}/${f}`)) fs.copyFileSync(`${art}/${f}`, `${cellDir}/${f}`);
  }
}
const { data: C, info } = await sharp(`${art}/${ID}-concept.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const { data: M } = await sharp(`${art}/${ID}-water.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const wetAlready = (i) => M[i * 4 + 3] >= 128;
const add = new Uint8Array(W * H);
let total = 0, capped = 0;
for (let [sx, sy] of SEEDS) {
  // a seed a few px off the water lands on grass or rock; if the seed pixel
  // is not blue-leaning, move it to the most blue-leaning pixel within 14 px
  {
    const bl = (x, y) => { const i = (y * W + x) * 4; return C[i + 2] - C[i] + (C[i + 2] - C[i + 1]) * 0.5; };
    if (bl(sx, sy) < 10) {
      let best = bl(sx, sy), bx = sx, by = sy;
      for (let dy = -14; dy <= 14; dy += 1) for (let dx = -14; dx <= 14; dx += 1) {
        const x = sx + dx, y = sy + dy; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
        const v = bl(x, y); if (v > best) { best = v; bx = x; by = y; }
      }
      // keep the move only if it finds MORE water than the seed as given
      if (bx !== sx || by !== sy) {
        const size = (x, y) => { const s0 = y * W + x, r = C[s0 * 4], g = C[s0 * 4 + 1], b = C[s0 * 4 + 2]; const st = [s0], seen = new Set([s0]); let n = 0;
          while (st.length && n <= MAX) { const i = st.pop(); const dr = C[i * 4] - r, dg = C[i * 4 + 1] - g, db = C[i * 4 + 2] - b; if (Math.sqrt(dr * dr + dg * dg + db * db) > TOL) continue; n += 1; const xx = i % W;
            for (const j of [i - 1, i + 1, i - W, i + W]) { if (j < 0 || j >= W * H || Math.abs(j % W - xx) > 1 || seen.has(j)) continue; seen.add(j); st.push(j); } }
          return n; };
        if (size(bx, by) > size(sx, sy)) { console.log(`  seed (${sx},${sy}) was not on water; moved to (${bx},${by})`); sx = bx; sy = by; }
      }
    }
  }
  const s = sy * W + sx;
  const [r0, g0, b0] = [C[s * 4], C[s * 4 + 1], C[s * 4 + 2]];
  const near = (i) => { const dr = C[i * 4] - r0, dg = C[i * 4 + 1] - g0, db = C[i * 4 + 2] - b0; return Math.sqrt(dr * dr + dg * dg + db * db) <= TOL; };
  const stack = [s]; const seen = new Uint8Array(W * H); seen[s] = 1; let n = 0;
  while (stack.length) {
    const i = stack.pop();
    if (!near(i)) continue;
    if (!add[i] && !wetAlready(i)) { add[i] = 1; total += 1; }
    n += 1;
    if (n > MAX) { capped += 1; break; }
    const x = i % W, y = (i - x) / W;
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      if (j < 0 || j >= W * H) continue;
      const jx = j % W; if (Math.abs(jx - x) > 1) continue;
      if (!seen[j]) { seen[j] = 1; stack.push(j); }
    }
  }
  console.log(`  seed (${sx},${sy}) colour rgb(${r0},${g0},${b0}): region ${n} px${n > MAX ? " (CAPPED — lower --tol or --max)" : ""}`);
}
// bbox of the addition, for the preview
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let i = 0; i < W * H; i += 1) if (add[i]) { const x = i % W, y = (i - x) / W; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
console.log(`${ID}: +${total} px newly wet (${(total * 0.048 * 0.048).toFixed(1)} m²)${capped ? `, ${capped} seed(s) capped` : ""}; bbox x ${x0}-${x1}, y ${y0}-${y1}`);
if (total) {
  const prev = Buffer.from(C);
  for (let i = 0; i < W * H; i += 1) if (add[i]) { prev[i * 4] = 255; prev[i * 4 + 1] = 40; prev[i * 4 + 2] = 40; prev[i * 4 + 3] = 255; }
  const pad = 60, L = Math.max(0, x0 - pad), Tp = Math.max(0, y0 - pad), Wd = Math.min(W - L, x1 - x0 + 2 * pad), Ht = Math.min(H - Tp, y1 - y0 + 2 * pad);
  const out = `.codex-tmp/session4/seed-${ID}.png`;
  fs.mkdirSync(".codex-tmp/session4", { recursive: true });
  await sharp(prev, { raw: { width: W, height: H, channels: 4 } }).extract({ left: L, top: Tp, width: Wd, height: Ht })
    .resize(Math.min(1400, Wd * 2), null, { kernel: "nearest" }).png().toFile(out);
  console.log(`  preview (red = newly cut) -> ${out}`);
}
if (WRITE && total) {
  const { data: S, info: si } = await sharp(srcMask).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sw = si.width, sh = si.height, scale = W / sw;
  fs.copyFileSync(srcMask, `${cellDir}/${ID}-water-source-before-seed.png`);
  let written = 0;
  for (let i = 0; i < W * H; i += 1) {
    if (!add[i]) continue;
    const x = i % W, y = (i - x) / W;
    const sx = Math.min(sw - 1, Math.floor(x / scale)), sy = Math.min(sh - 1, Math.floor(y / scale));
    const k = (sy * sw + sx) * 4;
    if (S[k + 3] < 255) { S[k] = S[k + 1] = S[k + 2] = 255; S[k + 3] = 255; written += 1; }
  }
  await sharp(S, { raw: { width: sw, height: sh, channels: 4 } }).png().toFile(srcMask);
  console.log(`  written: ${written} source px into ${srcMask}; original kept beside it`);
  console.log(`  now: node tools/world-authoring/cell.mjs --territory ${T} --cell ${ID.slice(1).replace("-", ",")} --redo --force --describe-file art-source/career-world/l2-land/${T}/briefs/${ID}.md`);
} else if (!WRITE) {
  console.log(`  nothing written — pass --write when the preview looks right`);
}
