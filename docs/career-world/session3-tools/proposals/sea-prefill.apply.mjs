// PROPOSAL (lock 18i) — NOT APPLIED. Needs the owner's approval BEFORE it runs
// (tools/world-authoring is solidified; record it with
//   node tools/world-authoring/check-solidified.mjs --approve "<owner's words>").
// Apply AFTER cross-grid-lookup.apply.mjs (18h) if both are approved: both
// anchor on the tone-ramp comment and 18i must land below 18h's block.
//
// THE FINDING (2026-09-05, coast wave 1): every coast miss is candidate LAND
// over the island's SEA at the seam. On the east shores, where the island's
// edge is mostly sea, it happened with the pixels in the edit target, with
// an edge map in the brief, and with the previous candidate's measured fault
// in the brief (c7-4 retry, 09:17). The packet tells the worker to rewrite
// the brief "never as coordinates or percentages" — the pipeline trusts
// pixels over prose by design, and the pixels it gives are a 512 px band.
// So the constraint goes into the pixels: for a SHORE cell, the island's sea
// arriving at an authored seam is painted ON into the target, and the only
// grey left to paint is a strip at most 40 m deep beside the island's
// arriving GROUND (6 m of margin along the edge so the shoreline can wander
// round the ends). Land can then only exist where ground arrives; the sea
// is final paint the worker is told not to touch. The stitch, the gates and
// the mask are untouched — this changes only what the worker is shown.
//
//   node .codex-tmp/session4/proposals/sea-prefill.apply.mjs [--check]
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

// 1. a flag the packet reads
replace("1 flag",
`// which pixels are binding (the stitch preserves them regardless of the draw)
if (authoredNeighbours.length) {`,
`// which pixels are binding (the stitch preserves them regardless of the draw)
let seaPrefilled = 0;   // px of the island's sea painted on into the target (18i)
if (authoredNeighbours.length) {`);

// 2. the pre-fill, before the tone ramp
replace("2 pre-fill",
`    // tone ramp (owner 2026-09-02, "need a better transition"): the Transitions`,
`    // SEA PRE-FILL (18i, 2026-09-05): a shore cell's target carries the
    // island's sea on into the cell, and leaves grey only where land may go.
    if (/^shore$/i.test(biomeId) || plan.biomes?.[biomeId]?.seaFill) {
      const isGreyPx = (o) => target[o] === EDIT_GREY[0] && target[o + 1] === EDIT_GREY[1] && target[o + 2] === EDIT_GREY[2];
      const STRIP = Math.round(40 / (97.6 / CELL_PX));                                                                    // 40 m in canvas px
      const MARGIN = Math.round(6 / (97.6 / CELL_PX));                                                                  // 6 m
      const SEA_RUN = Math.round(15 / (97.6 / CELL_PX));                                                                 // a run this wide is sea, not a stream
      const allowed = new Uint8Array(GEN_PX * GEN_PX);
      const swatch = [];
      let seaSeams = 0;
      for (const nb of authoredNeighbours) {
        const [nc, nr] = nb.cell;
        if (Math.abs(nc - col) + Math.abs(nr - row) !== 1) continue;
        const nRaw = await rawOf(srcFileFor(paths, nb.id, "l2"));
        const nCon = await ctxSourceOf(nb.id, "concept");
        const east = nc > col, west = nc < col, south = nr > row, north = nr < row;
        const vertical = east || west;                       // the seam is a vertical line
        // their facing kept edge in THEIR canvas, and the inward direction in MINE
        const theirEdge = east || south ? BLEED : BLEED + CELL_PX - 1;
        const myEdge = east ? BLEED + CELL_PX - 1 : west ? BLEED : south ? BLEED + CELL_PX - 1 : BLEED;
        const inward = east || south ? -1 : 1;
        const wet = new Uint8Array(GEN_PX);
        for (let t = BLEED; t < BLEED + CELL_PX; t += 1) {    // along the seam, same axis in both canvases
          let mn = 255;
          for (let d = -8; d <= 8; d += 1) {
            const tx = vertical ? theirEdge + d : t, ty = vertical ? t : theirEdge + d;
            if (tx < 0 || ty < 0 || tx >= GEN_PX || ty >= GEN_PX) continue;
            mn = Math.min(mn, nRaw.data[(ty * GEN_PX + tx) * 4 + 3]);
          }
          wet[t] = mn < 128 ? 1 : 0;
        }
        // sea runs (>= SEA_RUN); everything else along the kept edge is ground for the strip
        const seaRuns = [];
        let s = -1;
        for (let t = BLEED; t <= BLEED + CELL_PX; t += 1) {
          const w = t < BLEED + CELL_PX && wet[t];
          if (w && s < 0) s = t;
          if (!w && s >= 0) { if (t - s >= SEA_RUN) seaRuns.push([s, t - 1]); s = -1; }
        }
        if (!seaRuns.length) continue;
        seaSeams += 1;
        // the swatch: their sea paint in the 96 px beside their edge
        for (const [a, b] of seaRuns) for (let t = a; t <= b; t += 3) for (let k = 0; k < 96; k += 3) {
          const tx = vertical ? theirEdge + (east || south ? k : -k) : t, ty = vertical ? t : theirEdge + (east || south ? k : -k);
          if (tx < 0 || ty < 0 || tx >= GEN_PX || ty >= GEN_PX) continue;
          const o = (ty * GEN_PX + tx) * 4;
          if (nRaw.data[o + 3] < 128) swatch.push([nCon.data[o], nCon.data[o + 1], nCon.data[o + 2]]);
        }
        // the allowed strips beside the ground stretches between sea runs
        const isSea = (t) => seaRuns.some(([a, b]) => t >= a && t <= b);
        let g = -1;
        for (let t = BLEED; t <= BLEED + CELL_PX; t += 1) {
          const ground = t < BLEED + CELL_PX && !isSea(t);
          if (ground && g < 0) g = t;
          if (!ground && g >= 0) {
            const a = Math.max(0, g - MARGIN), b = Math.min(GEN_PX - 1, t - 1 + MARGIN);
            for (let u = a; u <= b; u += 1) for (let k = 0; k <= STRIP; k += 1) {
              const x = vertical ? myEdge + inward * k : u, y = vertical ? u : myEdge + inward * k;
              if (x < 0 || y < 0 || x >= GEN_PX || y >= GEN_PX) continue;
              allowed[y * GEN_PX + x] = 1;
            }
            g = -1;
          }
        }
      }
      if (seaSeams && swatch.length >= 500) {
        let h = 2166136261;
        const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h; };
        for (let y = 0; y < GEN_PX; y += 1) for (let x = 0; x < GEN_PX; x += 1) {
          const o = (y * GEN_PX + x) * 4;
          if (allowed[y * GEN_PX + x] || !isGreyPx(o)) continue;
          // four random swatch samples averaged: the sea's own colours, without a tile
          let r = 0, gg = 0, b = 0;
          for (let k = 0; k < 4; k += 1) { const p = swatch[rnd() % swatch.length]; r += p[0]; gg += p[1]; b += p[2]; }
          target[o] = r >> 2; target[o + 1] = gg >> 2; target[o + 2] = b >> 2;
          seaPrefilled += 1;
        }
        console.log(\`  sea pre-fill  \${seaPrefilled} px of the island's sea painted on (\${seaSeams} seam(s), swatch \${swatch.length}); grey left only within 40 m of arriving ground\`);
      }
    }
    // tone ramp (owner 2026-09-02, "need a better transition"): the Transitions`);

// 3. the packet says what the sea is
replace("3 packet",
`grey wherever this cell is still unpainted. \\\`\${canonPath}\\\` is the`,
`grey wherever this cell is still unpainted.\${seaPrefilled ? \` THE SEA ALREADY PAINTED across
most of this canvas is the island's own sea, continued into this cell: it is
FINAL. Do not paint land, rock, beach or stacks on it. Paint ONLY the flat
grey strips — they are where the island's ground continues into this cell and
ends at its shore — and keep every painted sea pixel as sea.\` : ""} \\\`\${canonPath}\\\` is the`);

if (CHECK) { console.log(`all ${edits.length} anchors present; nothing written (--check)`); process.exit(0); }
fs.writeFileSync(FILE, src);
console.log(`applied ${edits.length} edits to ${FILE}: ${edits.join("; ")}`);
console.log(`now: node tools/world-authoring/check-solidified.mjs --approve "<owner's words>"`);
