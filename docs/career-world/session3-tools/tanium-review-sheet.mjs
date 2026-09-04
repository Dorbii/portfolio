// One sheet for the morning: every Tanium cell in its lattice position,
// accepted and refused side by side, each with the number that decided it.
//
// The point is to make the key-light ruling a single look rather than a hunt.
// An accepted cell and a refused one sit in the same grid at the same size, so
// "does that one actually look more sunlit than this one" is answerable by eye,
// which is the question the measurements could not settle.
//
//   node docs/career-world/session3-tools/tanium-review-sheet.mjs
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);

const T = "tanium";
const OUT = `docs/career-world/session3-tools/${T}-review-sheet.png`;
const def = JSON.parse(fs.readFileSync(`art-source/career-world/l2-land/${T}/territory.def.json`, "utf8"));
const COLS = def.grid.cols, ROWS = def.grid.rows;
const MANIFEST = `public/career-world/layers/terrain/authority/manifests/terrain-l2-${T}-r1.json`;
const ledger = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")).cells : {};

// key-light for a refused candidate, read from the bake log's gate tables
const log = fs.existsSync(`.codex-tmp/bake-${T}.log`) ? fs.readFileSync(`.codex-tmp/bake-${T}.log`, "utf8") : "";
function lastKeyLight(id) {
  // the cell header names the cell; take the gate table that follows it
  const re = new RegExp(`cell ${id}\\b[\\s\\S]*?key-light asymmetry\\s+([0-9.]+)`, "g");
  let m, last = null;
  while ((m = re.exec(log)) !== null) last = m[1];
  return last;
}

const TILE = 420, PAD = 10, HEAD = 52, LABEL = 40;
const W = COLS * (TILE + PAD) - PAD, H = HEAD + ROWS * (TILE + LABEL + PAD) - PAD;
const comps = [];
const svg = [];
// NO full-size background rect. This overlay composites ON TOP of the art, so
// an opaque rect here paints out every tile and leaves a sheet of empty frames.
// The canvas below already provides the ground. (Written twice in one night:
// draw-kaizen-on-land.mjs had the identical bug and its own warning comment.)
svg.push(`<text x="12" y="32" fill="#f0f5fa" font-family="Georgia,serif" font-size="26">`
  + `Tanium — every cell, accepted and refused, with the number that decided it</text>`);

let accepted = 0, refused = 0, absent = 0;
for (let r = 0; r < ROWS; r += 1) {
  for (let c = 0; c < COLS; c += 1) {
    const id = `c${c}-${r}`;
    const biome = def.cellBiomes[`${c},${r}`];
    const x = c * (TILE + PAD), y = HEAD + r * (TILE + LABEL + PAD);

    const acceptedPath = `art-source/career-world/l2-land/${T}/${id}/${id}-l2.png`;
    const candidatePath = `.codex-tmp/authoring/cells/${T}/${id}/${id}-l2.png`;
    const isAccepted = !!ledger[id] && fs.existsSync(acceptedPath);
    const src = isAccepted ? acceptedPath : (fs.existsSync(candidatePath) ? candidatePath : null);

    let note, colour;
    if (isAccepted) {
      accepted += 1;
      const g = (ledger[id].gates || []).find((q) => q.name === "key-light asymmetry");
      note = `ACCEPTED   key-light ${g ? g.value : "?"}`;
      colour = "#8fe06a";
    } else if (src) {
      refused += 1;
      note = `REFUSED    key-light ${lastKeyLight(id) ?? "?"}   (limit 0.011)`;
      colour = "#ff9d5c";
    } else {
      absent += 1;
      note = "not generated";
      colour = "#7d8d9c";
    }

    if (src) comps.push({ input: await sharp(src).resize(TILE, TILE, { fit: "cover" }).png().toBuffer(), left: x, top: y });
    else svg.push(`<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" fill="#141d27" stroke="#26303c"/>`);
    svg.push(`<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" fill="none" stroke="${colour}" stroke-width="3"/>`);
    svg.push(`<text x="${x + 2}" y="${y + TILE + 17}" fill="#e8eef4" font-family="monospace" font-size="14">`
      + `${id}  ${biome}</text>`);
    svg.push(`<text x="${x + 2}" y="${y + TILE + 34}" fill="${colour}" font-family="monospace" font-size="13">${note}</text>`);
  }
}
svg.push(`<text x="${W - 12}" y="32" fill="#9db0c2" font-family="monospace" font-size="16" text-anchor="end">`
  + `${accepted} accepted · ${refused} refused · ${absent} not generated</text>`);

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 13, g: 22, b: 32, alpha: 255 } } })
  .composite([...comps, { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join("")}</svg>`), left: 0, top: 0 }])
  .png().toFile(OUT);
console.log(`wrote ${OUT}  ${W} x ${H}`);
console.log(`  ${accepted} accepted, ${refused} refused, ${absent} not generated`);
console.log(`\nIf the refusals look right, they are rebakes. If they do not, the threshold`);
console.log(`is the thing to rule on, and cell.mjs --redo re-gates these same generations`);
console.log(`without baking anything again.`);
