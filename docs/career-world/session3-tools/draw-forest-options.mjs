// Where can Tanium's dark forest actually grow?
//
// Owner, looking at c1-1: "I feel like this doesnt blend well or maybe we need
// dark forest above it and up and left of it so it looks more natural."
//
// He is right, and it is worse than the one cell he was looking at: BOTH
// dark-forest cells in the map are isolated, with no forest neighbour. That is
// a defect in the biome map I wrote, not in the art.
//
// But "above it and up-left" is blocked, and by his own rulings:
//   c1-0  north edge must open into the SOUND (northBorder ruling), and the
//         sound-coast vocabulary says "trees: none near the shore"
//   c0-0  already baked, and it is the NW corner with open sea on two edges
//
// This draws what each neighbouring cell costs, so the choice is visible
// rather than described.
//
//   node docs/career-world/session3-tools/draw-forest-options.mjs
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);

const T = "tanium";
const OUT = `docs/career-world/session3-tools/${T}-forest-options.png`;
const def = JSON.parse(fs.readFileSync(`art-source/career-world/l2-land/${T}/territory.def.json`, "utf8"));
const M = `public/career-world/layers/terrain/authority/manifests/terrain-l2-${T}-r1.json`;
const baked = fs.existsSync(M) ? Object.keys(JSON.parse(fs.readFileSync(M, "utf8")).cells) : [];
const shelfAt = Object.fromEntries(def.shelves.map((s) => [s.cell.join(","), s.id]));

const COLS = def.grid.cols, ROWS = def.grid.rows, S = 232, TOP = 104, BOT = 150;
const W = COLS * S, H = TOP + ROWS * S + BOT;
const COLOUR = {
  "bare-plateau": "#5a5650", moor: "#4d5a2e", "dark-forest": "#1f3a2a", "coast-cliff": "#3d4f5c",
  "sound-coast": "#2e5566", quarry: "#6b6250", "mixed-bench": "#4f5a3c", "lush-shelf": "#5f7a2a",
  "magical-gorge": "#4a3566", "purple-field": "#7a2f7a", "linked-colonnade": "#8d8b80",
};

// what each cell costs to turn into forest
const status = (c, r) => {
  const k = `${c},${r}`, id = `c${c}-${r}`;
  if (def.cellBiomes[k] === "dark-forest") return { tag: "FOREST NOW", colour: "#8fe06a" };
  if (shelfAt[k]) return { tag: `blocked — ${shelfAt[k]} shelf`, colour: "#ff6b6b" };
  if (r === 0 && c >= 1 && c <= 5) return { tag: "blocked — north border ruling", colour: "#ff6b6b" };
  if (baked.includes(id)) return { tag: "costs a rebake", colour: "#e0b64a" };
  if (c === 0 || c === COLS - 1 || r === ROWS - 1) return { tag: "FREE — but has a sea edge", colour: "#6ec8ff" };
  return { tag: "FREE", colour: "#8fe06a" };
};

const s = [];
s.push(`<rect width="${W}" height="${H}" fill="#101720"/>`);
for (let r = 0; r < ROWS; r += 1) {
  for (let c = 0; c < COLS; c += 1) {
    const k = `${c},${r}`, b = def.cellBiomes[k], st = status(c, r);
    const x = c * S, y = TOP + r * S;
    s.push(`<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="${COLOUR[b]}" stroke="#26303c" stroke-width="1"/>`);
    // a cell adjacent to a dark-forest cell gets the verdict ring
    const adj = [[c, r - 1], [c, r + 1], [c - 1, r], [c + 1, r]]
      .some(([a, d]) => def.cellBiomes[`${a},${d}`] === "dark-forest");
    if (adj || b === "dark-forest") {
      s.push(`<rect x="${x + 4}" y="${y + 4}" width="${S - 8}" height="${S - 8}" fill="none" stroke="${st.colour}" stroke-width="4"/>`);
      s.push(`<rect x="${x + 6}" y="${y + S - 46}" width="${S - 12}" height="20" fill="#0b1219" opacity="0.86"/>`);
      s.push(`<text x="${x + S / 2}" y="${y + S - 31}" fill="${st.colour}" font-family="monospace" font-size="12" text-anchor="middle">${st.tag}</text>`);
    }
    s.push(`<text x="${x + 7}" y="${y + 19}" fill="#c2ccd6" font-family="monospace" font-size="13">c${c}-${r}${baked.includes(`c${c}-${r}`) ? "  baked" : ""}</text>`);
    s.push(`<text x="${x + S / 2}" y="${y + S - 10}" fill="#eef3f8" font-family="Georgia,serif" font-size="13" text-anchor="middle">${b}</text>`);
  }
}
s.push(`<text x="16" y="40" fill="#f0f5fa" font-family="Georgia,serif" font-size="28">Where can the dark forest grow?</text>`);
s.push(`<text x="16" y="70" fill="#9db0c2" font-family="monospace" font-size="15">`
  + `BOTH forest cells are isolated — c1-1 and c4-2 have no forest neighbour. That is the biome map, not the art.</text>`);
s.push(`<text x="16" y="92" fill="#9db0c2" font-family="monospace" font-size="15">`
  + `Only cells adjacent to a forest cell are marked. Green = free, gold = costs a rebake, red = blocked by a standing ruling.</text>`);

const fy = TOP + ROWS * S + 34;
s.push(`<text x="16" y="${fy}" fill="#ff9d5c" font-family="Georgia,serif" font-size="19">`
  + `"above it" is c1-0 — blocked: your northBorder ruling puts the SOUND on its north edge, and sound-coast says "trees: none near the shore".</text>`);
s.push(`<text x="16" y="${fy + 28}" fill="#ff9d5c" font-family="Georgia,serif" font-size="19">`
  + `"up and left" is c0-0 — already baked, and it is the NW corner with open sea on two edges.</text>`);
s.push(`<text x="16" y="${fy + 60}" fill="#b7f090" font-family="Georgia,serif" font-size="19">`
  + `Free right now: c2-1 (east) and c1-2 (south, but its south edge is the world's coast). Neither is baked, so both are cost-free.</text>`);
s.push(`<text x="16" y="${fy + 88}" fill="#c9d4de" font-family="Georgia,serif" font-size="19">`
  + `c4-2's forest can only be joined by rebaking a baked neighbour — or by moving it.</text>`);

await sharp(Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${s.join("")}</svg>`))
  .png().toFile(OUT);
console.log(`wrote ${OUT}  ${W} x ${H}`);
for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS; c += 1) {
  const adj = [[c, r - 1], [c, r + 1], [c - 1, r], [c + 1, r]].some(([a, d]) => def.cellBiomes[`${a},${d}`] === "dark-forest");
  if (adj) console.log(`  c${c}-${r}  ${def.cellBiomes[`${c},${r}`].padEnd(14)} ${status(c, r).tag}`);
}
