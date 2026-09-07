// Lay the chain layer's per-cell overlays on the Tanium level-2 mosaic before
// island-grid.mjs boxes and labels it, so the picture shows the served world's
// chain (the overlay rides over the land at serve time; the pyramid mosaic has none).
import fs from "node:fs"; import sharp from "sharp"; sharp.cache(false);
const M = ".codex-tmp/session4/island/mosaic-tanium-L2.png", CELL = 512;
const meta = await sharp(M).metadata(); console.log("tanium mosaic", meta.width, "x", meta.height);
const comps = [];
for (const f of fs.readdirSync("art-source/career-world/chain/cells").filter((x) => /^tanium-c\d-\d-chain\.png$/.test(x))) {
  const [c, r] = f.match(/c(\d)-(\d)/).slice(1).map(Number);
  comps.push({ input: await sharp(`art-source/career-world/chain/cells/${f}`).resize(CELL, CELL, { kernel: "lanczos3" }).png().toBuffer(), left: c * CELL, top: r * CELL });
}
const out = await sharp(M).composite(comps).png().toBuffer(); fs.writeFileSync(M, out);
console.log(comps.length, "chain overlays laid on the mosaic");
