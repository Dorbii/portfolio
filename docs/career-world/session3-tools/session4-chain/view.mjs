// 3x3 views of the L1 island composite around a local cell, every cell labelled.
//   node .codex-tmp/session4/view.mjs 1,5 7,4 ...   → .codex-tmp/session4/island/view-<c>-<r>.jpg
import sharp from "sharp";
sharp.cache(false);
const SRC = ".codex-tmp/session4/island/island-grid-L1.png", CELL = 1024, N = 9216;
const idOf = (c, r) => (c >= 2 && c <= 6 && r >= 1 && r <= 4) ? `N c${c - 2}-${r - 1}` : (c >= 1 && c <= 7 && r >= 5 && r <= 7) ? `T c${c - 1}-${r - 5}` : `C c${c}-${r}`;
for (const arg of process.argv.slice(2)) {
  const [cc, rr] = arg.split(",").map(Number);
  const left = Math.max(0, Math.min(N - 3 * CELL, (cc - 1) * CELL)), top = Math.max(0, Math.min(N - 3 * CELL, (rr - 1) * CELL));
  let svg = `<svg width="${3 * CELL}" height="${3 * CELL}" xmlns="http://www.w3.org/2000/svg">`;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const c = left / CELL + i, r = top / CELL + j, x = i * CELL, y = j * CELL;
    const me = c === cc && r === rr;
    svg += `<rect x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" fill="none" stroke="${me ? "#ff3c28" : "#ffffff"}" stroke-width="${me ? 8 : 3}" stroke-opacity="0.9"/>`;
    svg += `<rect x="${x + 10}" y="${y + 10}" width="360" height="60" rx="6" fill="rgba(0,0,0,0.65)"/><text x="${x + 24}" y="${y + 54}" fill="#fff" font-family="monospace" font-size="40" font-weight="bold">${idOf(c, r)} (${c},${r})</text>`;
  }
  svg += `</svg>`;
  const out = `.codex-tmp/session4/island/view-${cc}-${rr}.jpg`;
  const buf = await sharp(SRC).extract({ left, top, width: 3 * CELL, height: 3 * CELL }).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toBuffer();
  await sharp(buf).resize(1400, 1400).jpeg({ quality: 84 }).toFile(out);
  console.log(out);
}
