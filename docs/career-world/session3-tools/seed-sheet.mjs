// Seed-candidate review sheet: the current canon r1 and candidates a/b/c at the SAME ground scale.
// Row 1: each whole region reduced to 640 px (the reading zoom). Row 2: 700x700 crops at 1:1 world
// scale (every image first brought to the 2560 canvas so 1 px = 4.8 cm everywhere).
import sharp from "sharp"; import fs from "node:fs";
sharp.cache(false);
const D = ".codex-tmp/session3/seed-r2", GEN = 2560;
// usage: node seed-sheet.mjs [outName] [letter:label ...]   default = round 1 (a/b/c) vs the canon
const argv = process.argv.slice(2);
const outName = argv[0] ?? "seed-r2-sheet.png";
const spec = argv.length > 1 ? argv.slice(1).map(s => { const [k, ...rest] = s.split(":"); return [`${k}  ${rest.join(":")}`, `${D}/seed-r2-${k}.png`]; })
  : [["a  grounded epic", `${D}/seed-r2-a.png`], ["b  fantastical", `${D}/seed-r2-b.png`], ["c  overtly magical", `${D}/seed-r2-c.png`]];
const items = [["current canon r1", "art-source/career-world/l2-land/ninjaone/seed/L2-seed-region-r1.png"], ...spec].filter(([, f]) => fs.existsSync(f));
const label = (w, text) => Buffer.from(`<svg width="${w}" height="34"><rect width="100%" height="100%" fill="#1e1e1e"/><text x="8" y="23" font-family="Segoe UI, Arial, sans-serif" font-size="17" fill="#eee">${text}</text></svg>`);
const cols = [];
for (const [name, f] of items) {
  const m = await sharp(f).metadata();
  const full = await sharp(f).resize(640, 640, { kernel: "lanczos3" }).png().toBuffer();
  const at2560 = await sharp(f).resize(GEN, GEN, { kernel: "lanczos3" }).png().toBuffer();
  const crop = await sharp(at2560).extract({ left: 930, top: 930, width: 700, height: 700 }).resize(640).png().toBuffer();
  const col = await sharp({ create: { width: 640, height: 34 + 640 + 8 + 34 + 640, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } } })
    .composite([{ input: label(640, `${name}  (${m.width}px source, shown at 1/4 of the 2560 canvas)`), left: 0, top: 0 }, { input: full, left: 0, top: 34 },
      { input: label(640, "centre 700 px at 1:1 world scale (4.8 cm/px), shown 0.91x"), left: 0, top: 34 + 640 + 8 }, { input: crop, left: 0, top: 34 + 640 + 8 + 34 }]).png().toBuffer();
  cols.push(col);
}
const gap = 12, W = 8 + cols.length * 640 + (cols.length - 1) * gap + 8, H = 34 + 640 + 8 + 34 + 640 + 52;
const comps = cols.map((c, i) => ({ input: c, left: 8 + i * (640 + gap), top: 44 }));
const title = Buffer.from(`<svg width="${W}" height="40"><text x="8" y="28" font-family="Segoe UI, Arial, sans-serif" font-size="20" fill="#eee">seed r2 candidates - new register (epic, fantastical, light) vs the current canon; same ground scale in every panel; neutral lighting is a hard rule in all of them</text></svg>`);
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } } }).composite([{ input: title, left: 0, top: 4 }, ...comps]).png().toFile(`${D}/${outName}`);
console.log(`${D}/${outName}  ${W}x${H}  ${items.length} panels`);
