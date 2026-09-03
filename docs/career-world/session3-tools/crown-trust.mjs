// How much of each cell's crown median is actually computed from tree-shaped
// components? Reports, per cell, the share of the classified mask that lands in
// counted components (area 300..20000) versus one merged over-cap blob.
// A cell whose mask is mostly one blob has no measured tree size.
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const SRC = "art-source/career-world/l2-land/ninjaone", OUT = ".codex-tmp/session3/review";
const GEN = 2560, BLEED = 256, CELL = 2048;
const metrics = JSON.parse(fs.readFileSync(`${OUT}/territory-metrics.json`, "utf8"));
function conifer(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === 0) return false;
  const s = (mx - mn) / mx, v = mx / 255; if (s < 0.25 || v > 0.45) return false;
  let h; if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2); else h = 60 * ((r - g) / (mx - mn) + 4);
  if (h < 0) h += 360; return h >= 60 && h <= 170;
}
const out = [];
for (const m of metrics) {
  const p = `${SRC}/${m.id}/${m.id}-l2.png`;
  const meta = await sharp(p).metadata();
  let img = sharp(p); if (meta.width !== GEN) img = img.resize(GEN, GEN, { kernel: "lanczos3" });
  const buf = await img.ensureAlpha().raw().toBuffer();
  const W = CELL, H = CELL, mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((y + BLEED) * GEN + x + BLEED) * 4; if (buf[i + 3] > 250 && conifer(buf[i], buf[i + 1], buf[i + 2])) mask[y * W + x] = 1; }
  const lab = new Int32Array(W * H), stack = new Int32Array(W * H); let next = 0, kept = 0, big = 0, small = 0, biggest = 0;
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || lab[s]) continue; next++; let sp = 0; stack[sp++] = s; lab[s] = next; let area = 0;
    while (sp) { const q = stack[--sp]; const qx = q % W, qy = (q - qx) / W; area++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n2 = ny * W + nx; if (mask[n2] && !lab[n2]) { lab[n2] = next; stack[sp++] = n2; } } }
    if (area >= 300 && area <= 20000) kept += area; else if (area > 20000) { big += area; if (area > biggest) biggest = area; } else small += area;
  }
  const tot = kept + big + small;
  const rec = { id: m.id, biome: m.biome, med: m.med, maskPct: +(tot / (W * H) * 100).toFixed(1), countedPct: +(kept / tot * 100).toFixed(1), mergedPct: +(big / tot * 100).toFixed(1), biggestBlobPx: biggest };
  out.push(rec);
  console.log(`${m.id} ${String(m.biome).padEnd(22)} med ${String(m.med).padStart(3)}  mask ${String(rec.maskPct).padStart(5)}%  counted ${String(rec.countedPct).padStart(5)}%  merged ${String(rec.mergedPct).padStart(5)}%  biggest blob ${biggest}`);
}
fs.writeFileSync(`${OUT}/crown-trust.json`, JSON.stringify(out, null, 1));
const bad = out.filter((x) => x.countedPct < 50);
console.log(`\ncells whose median comes from under half the classified mask: ${bad.length} -> ${bad.map((x) => `${x.id}(${x.countedPct}%, med ${x.med})`).join(" ")}`);
