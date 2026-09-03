// One readable contact sheet of every seed candidate: letter, round, what it is, lighting number.
import sharp from "sharp";
sharp.cache(false);
const D = ".codex-tmp/session3/seed-r2";
const items = [
  ["a", "round 1", "grounded epic, meadow everywhere", "lit side 0.24"],
  ["b", "round 1", "fantastical: arch + tilted columns, meadow everywhere", "lit side 0.18"],
  ["c", "round 1", "overtly magical: floating rock, crystals, glow  (YOUR CROP)", "lit side 0.27"],
  ["d", "round 2", "mixed scenery: plateau, forest, moor, one lush pocket, arch", "lit side 0.25"],
  ["e", "round 2", "austere: bare plateau, scree, moor, thin forest", "lit side 0.18"],
  ["f", "round 2", "mixed + magical: crystals, floating rock, glow", "lit side 0.20"],
  ["g", "round 3", "mixed + one arch, quarry as reference", "FLAT 0.105 = canon band"],
  ["h", "round 3", "mixed + magical, quarry as reference", "lit side 0.25"],
];
const S = 600, LH = 78, GAP = 14, COLS = 4;
const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const label = (k, r, what, light) => Buffer.from(`<svg width="${S}" height="${LH}"><rect width="100%" height="100%" fill="#1b1b1b"/>
<text x="10" y="30" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="bold" fill="#fff">${k}</text>
<text x="44" y="30" font-family="Segoe UI, Arial, sans-serif" font-size="19" fill="#bbb">${r}  ·  ${esc(light)}</text>
<text x="10" y="60" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#eee">${esc(what)}</text></svg>`);
const tiles = [];
for (const [k, r, what, light] of items) {
  const img = await sharp(`${D}/seed-r2-${k}.png`).resize(S, S, { kernel: "lanczos3" }).png().toBuffer();
  tiles.push(await sharp({ create: { width: S, height: S + LH, channels: 4, background: { r: 27, g: 27, b: 27, alpha: 1 } } })
    .composite([{ input: label(k, r, what, light), left: 0, top: 0 }, { input: img, left: 0, top: LH }]).png().toBuffer());
}
const rows = Math.ceil(items.length / COLS), W = 16 + COLS * S + (COLS - 1) * GAP, H = 60 + rows * (S + LH) + (rows - 1) * GAP + 16;
const comps = tiles.map((t, i) => ({ input: t, left: 8 + (i % COLS) * (S + GAP), top: 60 + Math.floor(i / COLS) * (S + LH + GAP) }));
const title = Buffer.from(`<svg width="${W}" height="52"><text x="8" y="36" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#fff">All seed candidates so far. "lit side" = consistent bright/dark faces on the rock (the thing you caught); FLAT = fixed. Same ground scale everywhere.</text></svg>`);
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 27, g: 27, b: 27, alpha: 1 } } }).composite([{ input: title, left: 0, top: 4 }, ...comps]).png().toFile(`${D}/seed-contact-sheet.png`);
console.log(`${D}/seed-contact-sheet.png ${W}x${H}`);
