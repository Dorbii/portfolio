// PROPOSAL (lock 18i-b) — NOT APPLIED. A refinement of 18i, needs the owner's
// word before it runs (record with check-solidified.mjs --approve).
//
// THE FINDING (2026-09-05 17:39, coast c7-3): the worker's prompt said "Paint
// only the flat grey area. Every already-painted pixel in Image 1 is locked,
// especially the sea" — and the model painted a coast over the pre-filled sea
// along the whole seam. The 18i fill is four random sea samples averaged per
// pixel: a flat teal noise that reads as a placeholder next to the band's
// vivid painted water with its foam. c7-2, with three ground strips, matched
// two of three runs; c7-3, with one tiny strip and a flat sea everywhere else,
// was treated as unpainted.
//
// THE CHANGE: the fill becomes REAL sea paint. From each orthogonal
// neighbour's concept, the largest square that is entirely water (its l2
// alpha < 128; 512, 384, 256 or 128 px, found with a summed-area table) is
// taken as a sea patch, and the fill is that patch tiled with mirror repeats
// (continuous across tile edges) — waves, colour variation and all. If no
// neighbour offers a 128 px water square, the old averaged fill remains.
// Nothing else changes: same strips, same margins, same packet text.
//
//   node .codex-tmp/session4/proposals/sea-texture.apply.mjs [--check]
import fs from "node:fs";
const FILE = "tools/world-authoring/cell.mjs";
const CHECK = process.argv.includes("--check");
let src = fs.readFileSync(FILE, "utf8");
const edits = [];
const replace = (label, oldStr, newStr) => {
  const n = src.split(oldStr).length - 1;
  if (n !== 1) throw new Error(`${label}: anchor found ${n} times, need exactly 1`);
  src = src.replace(oldStr, newStr);
  edits.push(label);
};

// 1. collect a sea patch per neighbour while the swatch is gathered
replace("1 patch search",
`        // the swatch: their sea paint in the 96 px beside their edge
        for (const [a, b] of seaRuns) for (let t = a; t <= b; t += 3) for (let k = 0; k < 96; k += 3) {`,
`        // a sea PATCH: the largest square of their concept that is all water
        // (summed-area table over their water mask), for a tiled fill that
        // reads as painted sea, not a placeholder (18i-b)
        {
          const N = GEN_PX, sat = new Uint32Array((N + 1) * (N + 1));
          for (let y = 1; y <= N; y += 1) for (let x = 1; x <= N; x += 1) {
            const w = nRaw.data[((y - 1) * N + (x - 1)) * 4 + 3] < 128 ? 1 : 0;
            sat[y * (N + 1) + x] = w + sat[(y - 1) * (N + 1) + x] + sat[y * (N + 1) + (x - 1)] - sat[(y - 1) * (N + 1) + (x - 1)];
          }
          const full = (x, y, s) => sat[(y + s) * (N + 1) + (x + s)] - sat[y * (N + 1) + (x + s)] - sat[(y + s) * (N + 1) + x] + sat[y * (N + 1) + x] === s * s;
          for (const s of [512, 384, 256, 128]) {
            if (seaPatch && seaPatch.size >= s) break;
            let found = null;
            for (let y = BLEED; y + s <= BLEED + CELL_PX && !found; y += 32) for (let x = BLEED; x + s <= BLEED + CELL_PX; x += 32) {
              if (full(x, y, s)) { found = { x, y }; break; }
            }
            if (found) { seaPatch = { size: s, x: found.x, y: found.y, data: nCon.data }; break; }
          }
        }
        // the swatch: their sea paint in the 96 px beside their edge
        for (const [a, b] of seaRuns) for (let t = a; t <= b; t += 3) for (let k = 0; k < 96; k += 3) {`);

// 2. declare the patch beside the swatch
replace("2 declare",
`      const allowed = new Uint8Array(GEN_PX * GEN_PX);
      const swatch = [];`,
`      const allowed = new Uint8Array(GEN_PX * GEN_PX);
      const swatch = [];
      let seaPatch = null;   // { size, x, y, data } — the largest all-water square found in a neighbour's concept`);

// 3. the fill: tiled patch with mirror repeats, else the averaged swatch
replace("3 fill",
`          // four random swatch samples averaged: the sea's own colours, without a tile
          let r = 0, gg = 0, b = 0;
          for (let k = 0; k < 4; k += 1) { const p = swatch[rnd() % swatch.length]; r += p[0]; gg += p[1]; b += p[2]; }
          target[o] = r >> 2; target[o + 1] = gg >> 2; target[o + 2] = b >> 2;
          seaPrefilled += 1;`,
`          if (seaPatch) {
            // real sea paint, the patch tiled with mirror repeats so no tile edge shows
            const s = seaPatch.size, mx = x % (2 * s), my = y % (2 * s);
            const px = mx < s ? mx : 2 * s - 1 - mx, py = my < s ? my : 2 * s - 1 - my;
            const si = ((seaPatch.y + py) * GEN_PX + seaPatch.x + px) * 4;
            target[o] = seaPatch.data[si]; target[o + 1] = seaPatch.data[si + 1]; target[o + 2] = seaPatch.data[si + 2];
          } else {
            // four random swatch samples averaged: the sea's own colours, without a tile
            let r = 0, gg = 0, b = 0;
            for (let k = 0; k < 4; k += 1) { const p = swatch[rnd() % swatch.length]; r += p[0]; gg += p[1]; b += p[2]; }
            target[o] = r >> 2; target[o + 1] = gg >> 2; target[o + 2] = b >> 2;
          }
          seaPrefilled += 1;`);

// 4. say which fill was used
replace("4 log",
`        console.log(\`  sea pre-fill  \${seaPrefilled} px of the island's sea painted on (\${seaSeams} seam(s), swatch \${swatch.length}); grey left only within 40 m of arriving ground\`);`,
`        console.log(\`  sea pre-fill  \${seaPrefilled} px of the island's sea painted on (\${seaSeams} seam(s), \${seaPatch ? \`a \${seaPatch.size} px sea patch tiled\` : \`swatch \${swatch.length}, averaged\`}); grey left only within 40 m of arriving ground\`);`);

if (CHECK) { console.log(`all ${edits.length} anchors present; nothing written (--check)`); process.exit(0); }
fs.writeFileSync(FILE, src);
console.log(`applied ${edits.length} edits to ${FILE}: ${edits.join("; ")}`);
console.log(`now: node tools/world-authoring/check-solidified.mjs --approve "<owner's words>"`);
