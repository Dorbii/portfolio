// Out-of-scale trees: counted crown components far larger than their own cell's
// median, reported in world pixels so they can be cropped and judged.
// Only components the statistic trusts (area 300..20000) are considered, so a
// merged canopy blob cannot masquerade as a giant tree.
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const SRC = "art-source/career-world/l2-land/ninjaone", OUT = ".codex-tmp/session3/review";
const GEN = 2560, BLEED = 256, CELL = 2048;
const metrics = JSON.parse(fs.readFileSync(`${OUT}/territory-metrics.json`, "utf8"));
const trust = JSON.parse(fs.readFileSync(`${OUT}/crown-trust.json`, "utf8"));
function conifer(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === 0) return false;
  const s = (mx - mn) / mx, v = mx / 255; if (s < 0.25 || v > 0.45) return false;
  let h; if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2); else h = 60 * ((r - g) / (mx - mn) + 4);
  if (h < 0) h += 360; return h >= 60 && h <= 170;
}
const found = [];
for (const m of metrics) {
  const t = trust.find((x) => x.id === m.id);
  const p = `${SRC}/${m.id}/${m.id}-l2.png`;
  const meta = await sharp(p).metadata();
  let img = sharp(p); if (meta.width !== GEN) img = img.resize(GEN, GEN, { kernel: "lanczos3" });
  const buf = await img.ensureAlpha().raw().toBuffer();
  const W = CELL, H = CELL, mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((y + BLEED) * GEN + x + BLEED) * 4; if (buf[i + 3] > 250 && conifer(buf[i], buf[i + 1], buf[i + 2])) mask[y * W + x] = 1; }
  const lab = new Int32Array(W * H), stack = new Int32Array(W * H); let next = 0; const list = [];
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || lab[s]) continue; next++; let sp = 0; stack[sp++] = s; lab[s] = next;
    let area = 0, bx0 = W, bx1 = 0, by0 = H, by1 = 0;
    while (sp) { const q = stack[--sp]; const qx = q % W, qy = (q - qx) / W; area++;
      if (qx < bx0) bx0 = qx; if (qx > bx1) bx1 = qx; if (qy < by0) by0 = qy; if (qy > by1) by1 = qy;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n2 = ny * W + nx; if (mask[n2] && !lab[n2]) { lab[n2] = next; stack[sp++] = n2; } } }
    if (area >= 300 && area <= 20000) list.push({ size: Math.max(bx1 - bx0 + 1, by1 - by0 + 1), area, cx: m.c * CELL + ((bx0 + bx1) >> 1), cy: m.r * CELL + ((by0 + by1) >> 1), fill: area / ((bx1 - bx0 + 1) * (by1 - by0 + 1)) });
  }
  list.sort((a, b) => b.size - a.size);
  for (const c of list.slice(0, 3)) if (c.size >= 2.5 * m.med && t.countedPct >= 50) found.push({ id: m.id, biome: m.biome, med: m.med, ...c, ratio: +(c.size / m.med).toFixed(2) });
}
found.sort((a, b) => b.ratio - a.ratio);
fs.writeFileSync(`${OUT}/crown-outliers.json`, JSON.stringify(found, null, 1));
if (!found.length) console.log("no counted crown is 2.5x its cell median in a cell whose metric is trustworthy");
for (const f of found) console.log(`${f.id} ${String(f.biome).padEnd(20)} ${f.size}px vs median ${f.med} (${f.ratio}x)  world [${f.cx},${f.cy}]  area ${f.area} fill ${f.fill.toFixed(2)}`);
