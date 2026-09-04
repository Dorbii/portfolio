// Widen a cell's WATER SOURCE mask (the worker's 1254 px mask that cell.mjs
// --redo re-derives everything from) inside one small window, by dilating the
// wet pixels there. For a stream that reaches a seam narrower than the gate's
// 30 px minimum run. The art is untouched; only the cut changes.
//
// Owner 2026-09-04 on c3-2: "Sure thing" — widen the cut at the seam, mask
// only, no regeneration.
//
//   node docs/career-world/session3-tools/widen-source-mask.mjs <territory> <cell-id> \
//        --at SX,SY --window W --radius R [--write]
//   SX,SY in SOURCE pixels (canvas px * source/2560); the window is a square
//   of half-size W around it; every non-wet pixel within R of a wet pixel in
//   that window becomes wet. Prints the wet run along the window's rows
//   before and after so the effect at the seam row can be read off.
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);
const [T, ID] = process.argv.slice(2);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const [SX, SY] = arg("--at", "0,0").split(",").map(Number);
const WIN = Number(arg("--window", 40)), R = Number(arg("--radius", 5));
const WRITE = process.argv.includes("--write");
const cellDir = `.codex-tmp/authoring/cells/${T}/${ID}`;
const file = `${cellDir}/${ID}-water-source.png`;
if (!fs.existsSync(file)) throw new Error(`no ${file} — copy it from art-source first`);
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const wet = (x, y) => data[(y * W + x) * 4 + 3] > 128 && data[(y * W + x) * 4] > 128;
const runAt = (buf, y) => { // widest contiguous wet run on row y inside the window
  let best = 0, cur = 0;
  for (let x = Math.max(0, SX - WIN); x <= Math.min(W - 1, SX + WIN); x += 1) {
    const w = buf[(y * W + x) * 4 + 3] > 128;
    cur = w ? cur + 1 : 0; best = Math.max(best, cur);
  }
  return best;
};
const out = Buffer.from(data);
let grown = 0;
for (let y = Math.max(0, SY - WIN); y <= Math.min(H - 1, SY + WIN); y += 1) {
  for (let x = Math.max(0, SX - WIN); x <= Math.min(W - 1, SX + WIN); x += 1) {
    if (wet(x, y)) continue;
    let near = false;
    for (let dy = -R; dy <= R && !near; dy += 1) for (let dx = -R; dx <= R; dx += 1) {
      if (dx * dx + dy * dy > R * R) continue;
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      if (wet(xx, yy)) { near = true; break; }
    }
    if (near) { const i = (y * W + x) * 4; out[i] = out[i + 1] = out[i + 2] = 255; out[i + 3] = 255; grown += 1; }
  }
}
const scale = 2560 / W;
console.log(`${ID}: window ±${WIN} around source (${SX},${SY}), radius ${R}: +${grown} px wet`);
for (const y of [SY - 10, SY - 5, SY, SY + 5, SY + 10]) {
  if (y < 0 || y >= H) continue;
  console.log(`  row ${String(y).padStart(4)} (canvas y ${Math.round(y * scale)}): widest wet run ${runAt(data, y)} -> ${runAt(out, y)} source px = ${Math.round(runAt(data, y) * scale)} -> ${Math.round(runAt(out, y) * scale)} canvas px`);
}
if (WRITE) {
  fs.copyFileSync(file, `${cellDir}/${ID}-water-source-before-widen.png`);
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(file);
  console.log(`  written; original kept at ${ID}-water-source-before-widen.png`);
  console.log(`  now: node tools/world-authoring/cell.mjs --territory ${T} --cell ${ID.slice(1).replace("-", ",")} --redo --force --describe-file art-source/career-world/l2-land/${T}/briefs/${ID}.md`);
} else {
  console.log(`  nothing written — pass --write when the rows read right`);
}
