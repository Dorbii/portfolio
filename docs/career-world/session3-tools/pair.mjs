// Two land layers side by side on the sea colour, labelled — for a candidate
// that replaces an AUTHORED cell, which the island picture cannot show.
//   node .codex-tmp/session4/pair.mjs <left.png> <left label> <right.png> <right label> <out.jpg>
import sharp from "sharp";
sharp.cache(false);
const [a, la, b, lb, out] = process.argv.slice(2);
const KEPT = 2048, S = 1024, PAD = 24;
async function cell(f) {
  const m = await sharp(f).metadata();
  const bleed = Math.round((m.width - KEPT) / 2);
  return sharp(f).extract({ left: bleed, top: bleed, width: KEPT, height: KEPT }).resize(S, S).png().toBuffer();
}
const W = S * 2 + PAD * 3, H = S + PAD * 2 + 40;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
<rect x="${PAD}" y="${PAD + S + 6}" width="${S}" height="30" rx="4" fill="rgba(0,0,0,0.6)"/>
<text x="${PAD + S / 2}" y="${PAD + S + 27}" fill="#fff" font-family="monospace" font-size="18" text-anchor="middle">${esc(la)}</text>
<rect x="${PAD * 2 + S}" y="${PAD + S + 6}" width="${S}" height="30" rx="4" fill="rgba(0,0,0,0.6)"/>
<text x="${PAD * 2 + S + S / 2}" y="${PAD + S + 27}" fill="#ff9d5c" font-family="monospace" font-size="18" text-anchor="middle">${esc(lb)}</text>
<rect x="${PAD * 2 + S + 2}" y="${PAD + 2}" width="${S - 4}" height="${S - 4}" fill="none" stroke="#ff9d5c" stroke-width="3" stroke-dasharray="12 8"/>
</svg>`;
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 31, g: 96, b: 108, alpha: 255 } } })
  .composite([
    { input: await cell(a), left: PAD, top: PAD },
    { input: await cell(b), left: PAD * 2 + S, top: PAD },
    { input: Buffer.from(svg), left: 0, top: 0 },
  ]).jpeg({ quality: 88 }).toFile(out);
console.log(`wrote ${out}`);
