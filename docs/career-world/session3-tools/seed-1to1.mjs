// Direct 1:1 comparison: for the current canon and every candidate, three crops at true world scale
// (each image first brought to the 2560 canvas, so 1 px = 4.8 cm everywhere): the window with the
// most ROCK, the most VEGETATION and the most WATER, picked by hue so every row compares like with like.
import sharp from "sharp";
sharp.cache(false);
const D = ".codex-tmp/session3/seed-r2", GEN = 2560, C = 360, STEP = 80;
const items = [["canon r1", "art-source/career-world/l2-land/ninjaone/seed/L2-seed-region-r1.png"], ...["a", "b", "c", "d", "e", "f", "g", "h"].map(k => [k, `${D}/seed-r2-${k}.png`])];
const hsv = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } if (h < 0) h += 360; return [h, mx ? d / mx : 0]; };
const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const label = (w, t, big) => Buffer.from(`<svg width="${w}" height="34"><rect width="100%" height="100%" fill="#1b1b1b"/><text x="8" y="24" font-family="Segoe UI, Arial, sans-serif" font-size="${big ? 22 : 17}" font-weight="${big ? "bold" : "normal"}" fill="#fff">${esc(t)}</text></svg>`);
const rowsOut = [];
for (const [name, file] of items) {
  const { data, info } = await sharp(file).resize(GEN, GEN, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // class map: 0 rock, 1 veg, 2 water, at 4 px stride for speed
  const cls = new Uint8Array((W / 4) * (H / 4));
  for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) { const i = (y * W + x) * 3; const [h, s] = hsv(data[i], data[i + 1], data[i + 2]); const empty = data[i] + data[i + 1] + data[i + 2] < 24; cls[(y / 4) * (W / 4) + x / 4] = empty ? 3 : (h >= 45 && h <= 140 && s >= 0.22) ? 1 : (h >= 150 && h <= 215 && s >= 0.2) ? 2 : 0; }
  const best = [null, null, null];
  for (let y = 0; y + C <= H; y += STEP) for (let x = 0; x + C <= W; x += STEP) {
    const n = [0, 0, 0, 0]; for (let yy = y; yy < y + C; yy += 4) for (let xx = x; xx < x + C; xx += 4) n[cls[(yy / 4) * (W / 4) + xx / 4]]++;
    if (n[3] > 0) continue;
    for (let k = 0; k < 3; k++) if (!best[k] || n[k] > best[k].n) best[k] = { x, y, n: n[k] };
  }
  const crops = [];
  for (let k = 0; k < 3; k++) { const b = best[k]; crops.push(await sharp(data, { raw: { width: W, height: H, channels: 3 } }).extract({ left: b.x, top: b.y, width: C, height: C }).png().toBuffer()); }
  const rowW = 200 + 3 * C + 2 * 8;
  const row = await sharp({ create: { width: rowW, height: C, channels: 4, background: { r: 27, g: 27, b: 27, alpha: 1 } } })
    .composite([{ input: label(200, name, true), left: 0, top: 0 }, ...crops.map((c, k) => ({ input: c, left: 200 + k * (C + 8), top: 0 }))]).png().toBuffer();
  rowsOut.push(row);
}
const rowW = 200 + 3 * C + 16, H = 50 + 34 + rowsOut.length * (C + 8) + 8;
const head = await sharp({ create: { width: rowW, height: 34, channels: 4, background: { r: 27, g: 27, b: 27, alpha: 1 } } })
  .composite([{ input: label(200, "", false), left: 0, top: 0 }, { input: label(C, "most ROCK in the image", false), left: 200, top: 0 }, { input: label(C, "most VEGETATION", false), left: 200 + C + 8, top: 0 }, { input: label(C, "most WATER", false), left: 200 + 2 * (C + 8), top: 0 }]).png().toBuffer();
const title = Buffer.from(`<svg width="${rowW}" height="46"><text x="8" y="32" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#fff">1:1 at world scale (4.8 cm per pixel), ${C} px = ${(C * 0.048).toFixed(1)} m of ground per crop. Same kind of surface in each column.</text></svg>`);
await sharp({ create: { width: rowW, height: H, channels: 4, background: { r: 27, g: 27, b: 27, alpha: 1 } } })
  .composite([{ input: title, left: 0, top: 4 }, { input: head, left: 0, top: 50 }, ...rowsOut.map((r, i) => ({ input: r, left: 0, top: 50 + 34 + i * (C + 8) }))]).png().toFile(`${D}/seed-1to1-sheet.png`);
console.log(`${D}/seed-1to1-sheet.png ${rowW}x${H}`);
