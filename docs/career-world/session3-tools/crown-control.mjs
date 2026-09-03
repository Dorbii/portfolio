// Control for the crown metric: show the classifier WHAT IT IS CALLING A TREE.
// Left: the paint. Right: the same crop with the conifer mask in magenta, and
// the components the statistic actually counts (area 300..20000) outlined.
// If the magenta covers ground, the median is not a tree size.
//   node .codex-tmp/session3/crown-control.mjs
import sharp from "sharp"; import fs from "node:fs"; import path from "node:path";
sharp.cache(false);
const SRC = "art-source/career-world/l2-land/ninjaone";
const OUT = ".codex-tmp/session3/review"; fs.mkdirSync(OUT, { recursive: true });
const GEN = 2560, BLEED = 256, CELL = 2048, WIN = 512;
const metrics = JSON.parse(fs.readFileSync(`${OUT}/territory-metrics.json`, "utf8"));
const PICK = ["c0-0", "c1-2", "c1-3", "c2-1"];    // med 46, 54, 105, 112

function conifer(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === 0) return false;
  const s = (mx - mn) / mx, v = mx / 255; if (s < 0.25 || v > 0.45) return false;
  let h; if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2); else h = 60 * ((r - g) / (mx - mn) + 4);
  if (h < 0) h += 360; return h >= 60 && h <= 170;
}
const panels = []; const rows = [];
for (const id of PICK) {
  const m = metrics.find((x) => x.id === id);
  const p = `${SRC}/${id}/${id}-l2.png`;
  const meta = await sharp(p).metadata();
  let img = sharp(p); if (meta.width !== GEN) img = img.resize(GEN, GEN, { kernel: "lanczos3" });
  const buf = await img.ensureAlpha().raw().toBuffer();
  // densest window, same rule the sheet used
  let best = { n: -1, x: 0, y: 0 };
  for (let y = 0; y + WIN <= CELL; y += 128) for (let x = 0; x + WIN <= CELL; x += 128) {
    let n = 0;
    for (let yy = y; yy < y + WIN; yy += 4) for (let xx = x; xx < x + WIN; xx += 4) { const i = ((yy + BLEED) * GEN + xx + BLEED) * 4; if (buf[i + 3] > 250 && conifer(buf[i], buf[i + 1], buf[i + 2])) n++; }
    if (n > best.n) best = { n, x, y };
  }
  // crop + mask
  const crop = Buffer.alloc(WIN * WIN * 4), over = Buffer.alloc(WIN * WIN * 4);
  const m8 = new Uint8Array(WIN * WIN);
  for (let y = 0; y < WIN; y++) for (let x = 0; x < WIN; x++) {
    const i = ((y + best.y + BLEED) * GEN + x + best.x + BLEED) * 4, o = (y * WIN + x) * 4;
    crop[o] = over[o] = buf[i]; crop[o + 1] = over[o + 1] = buf[i + 1]; crop[o + 2] = over[o + 2] = buf[i + 2];
    crop[o + 3] = over[o + 3] = 255;
    if (buf[i + 3] > 250 && conifer(buf[i], buf[i + 1], buf[i + 2])) m8[y * WIN + x] = 1;
  }
  // components, and which ones the statistic keeps
  const lab = new Int32Array(WIN * WIN), stack = new Int32Array(WIN * WIN); let next = 0;
  const comp = [];
  for (let s = 0; s < WIN * WIN; s++) {
    if (!m8[s] || lab[s]) continue; next++; let sp = 0; stack[sp++] = s; lab[s] = next; let area = 0; const px = [];
    while (sp) { const q = stack[--sp]; const qx = q % WIN, qy = (q - qx) / WIN; area++; px.push(q);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= WIN || ny >= WIN) continue; const n2 = ny * WIN + nx; if (m8[n2] && !lab[n2]) { lab[n2] = next; stack[sp++] = n2; } } }
    comp.push({ area, px });
  }
  let kept = 0, kmask = 0, big = 0, bmask = 0, small = 0, smask = 0;
  for (const c of comp) {
    const inStat = c.area >= 300 && c.area <= 20000;
    if (inStat) { kept++; kmask += c.area; } else if (c.area > 20000) { big++; bmask += c.area; } else { small++; smask += c.area; }
    const col = inStat ? [255, 0, 220] : (c.area > 20000 ? [255, 210, 0] : [0, 190, 255]);
    for (const q of c.px) { const o = q * 4; over[o] = col[0]; over[o + 1] = col[1]; over[o + 2] = col[2]; }
  }
  const tot = kmask + bmask + smask;
  rows.push({ id, med: m.med, biome: m.biome, kept, keptPct: +(kmask / tot * 100).toFixed(1), big, bigPct: +(bmask / tot * 100).toFixed(1), smallPct: +(smask / tot * 100).toFixed(1), maskPct: +(tot / (WIN * WIN) * 100).toFixed(1) });
  panels.push({ id, m, crop, over });
  console.log(`${id} med ${m.med}px  mask ${(tot / (WIN * WIN) * 100).toFixed(1)}% of the crop | counted ${kept} comps = ${(kmask / tot * 100).toFixed(1)}% of mask | over-20000 blobs ${big} = ${(bmask / tot * 100).toFixed(1)}% | under-300 = ${(smask / tot * 100).toFixed(1)}%`);
}
fs.writeFileSync(`${OUT}/crown-control.json`, JSON.stringify(rows, null, 1));
const PAD = 8, LBL = 40, CW = WIN * 2 + PAD;
const sheetW = PAD + PICK.length * (CW + PAD), sheetH = PAD + LBL + WIN + PAD + 54;
const comps2 = []; let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}">`;
for (let i = 0; i < panels.length; i++) {
  const { id, m, crop, over } = panels[i]; const px = PAD + i * (CW + PAD), py = PAD + LBL;
  comps2.push({ input: await sharp(crop, { raw: { width: WIN, height: WIN, channels: 4 } }).png().toBuffer(), left: px, top: py });
  comps2.push({ input: await sharp(over, { raw: { width: WIN, height: WIN, channels: 4 } }).png().toBuffer(), left: px + WIN + PAD, top: py });
  const r = rows[i];
  svg += `<text x="${px + 4}" y="${py - 22}" font-family="Segoe UI, Arial" font-size="17" font-weight="bold" fill="#fff">${m.c},${m.r} ${m.biome} — crown median ${m.med}px</text>`;
  svg += `<text x="${px + 4}" y="${py - 5}" font-family="Segoe UI, Arial" font-size="14" fill="#ffd0f5">magenta = counted (${r.keptPct}% of mask) · yellow = blob over the 20000 cap (${r.bigPct}%) · cyan = under 300 (${r.smallPct}%)</text>`;
}
svg += `<text x="${PAD}" y="${sheetH - 18}" font-family="Segoe UI, Arial" font-size="19" fill="#fff">Control for the crown statistic: what the classifier calls a conifer. Paint left, classification right. Magenta is what the median is computed from.</text></svg>`;
await sharp({ create: { width: sheetW, height: sheetH, channels: 4, background: { r: 17, g: 17, b: 17, alpha: 1 } } })
  .composite([...comps2, { input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(`${OUT}/crown-control.png`);
console.log("wrote", `${OUT}/crown-control.png`);
