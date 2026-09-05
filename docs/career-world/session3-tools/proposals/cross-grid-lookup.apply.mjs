// PROPOSAL (lock 18h) — NOT APPLIED. Needs the owner's approval BEFORE it runs
// (tools/world-authoring is solidified; record it with
//   node tools/world-authoring/check-solidified.mjs --approve "<owner's words>").
//
// THE FINDING (2026-09-05 05:46): cell.mjs's cross-territory lookup (lock 18f)
// admits a foreign cell only when its position falls INSIDE this grid, so a
// Tanium row-0 cell never sees the NinjaOne cell above it (row -1), no pixel
// of it enters the edit target, and no gate judges that seam. c4-0's one
// attempt painted no water at all across the border while N c3-3 delivers a
// 4.3 m beck at 57% of the shared edge; the brief named the beck and the
// model ignored a position with nothing to anchor it. The whole N|T border
// was baked blind from both sides.
//
// THE CHANGE, in four places, none of them the stitch:
//   1. FOREIGN_OUT: a second map for neighbours beyond the grid's edge, keyed
//      "<territory>:<cell>"; srcFileFor reads both maps.
//   2. Discovery: an out-of-grid position with an authored foreign cell joins
//      authoredNeighbours (flagged `outside`) instead of being skipped. It is
//      NOT added to FOREIGN, so the stitch's authored set, the seam network and
//      the conditioning window are untouched — the border seam stays the
//      straight edge it always was (this pyramid has no tile there to cut).
//   3. Edit target: an outside neighbour's concept paint is laid straight into
//      the target wherever its canvas covers mine and mine is still grey (its
//      kept paint first, then an orthogonal neighbour's bleed), the same band
//      an in-grid neighbour contributes; the tone ramp then sees it.
//   4. The packet's transition line for that side names the cell across the
//      border as authored, with the border rule still governing.
//   The three seam gates (water continuity x2, palette) iterate
//   authoredNeighbours with relative coordinates and need no change: they now
//   judge the border seam too.
//
//   node .codex-tmp/session4/proposals/cross-grid-lookup.apply.mjs [--check]
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

// 1. the second map, and srcFileFor reading both
replace("1a FOREIGN_OUT map",
`const FOREIGN = new Map();
function srcFileFor(paths, cid, kind) {
  const f = FOREIGN.get(cid);`,
`const FOREIGN = new Map();
// Neighbours beyond this grid's edge — the cells across a territory border
// (lock change 18h, 2026-09-05: c4-0 painted no water where N c3-3 delivers
// a beck, because nothing across the border reached its edit target or its
// gates). Keyed "<territory>:<cell>". They condition the edit target and are
// judged by the seam gates, but they are NOT in FOREIGN: the stitch, the seam
// network and the conditioning window are this grid's, and the border seam
// stays the straight edge it always was.
const FOREIGN_OUT = new Map();
function srcFileFor(paths, cid, kind) {
  const f = FOREIGN.get(cid) || FOREIGN_OUT.get(cid);`);

// 2. discovery: out-of-grid positions are looked up, not skipped
replace("2 discovery",
`        const c = col + dx, r = row + dy;
        if (c < 0 || r < 0 || c >= plan.grid.cols || r >= plan.grid.rows) continue;
        const local = \`c\${c}-\${r}\`;
        if (ledger.cells[local] || FOREIGN.has(local)) continue;
        const wc = block[0] + c, wr = block[1] + r;              // world lattice cell
        const fc = wc - b[0], fr = wr - b[1];                    // that cell in the foreign grid
        if (fc < 0 || fr < 0 || fc >= d.grid.cols || fr >= d.grid.rows) continue;
        const fid = \`c\${fc}-\${fr}\`;
        if (!cells[fid]) continue;
        FOREIGN.set(local, { territory: tid, id: fid, dir: \`\${root}/\${tid}/\${fid}\` });
        authoredNeighbours.push({ cell: [c, r], id: local, foreign: { territory: tid, id: fid } });`,
`        const c = col + dx, r = row + dy;
        const outside = c < 0 || r < 0 || c >= plan.grid.cols || r >= plan.grid.rows;
        const local = \`c\${c}-\${r}\`;
        if (!outside && (ledger.cells[local] || FOREIGN.has(local))) continue;
        const wc = block[0] + c, wr = block[1] + r;              // world lattice cell
        const fc = wc - b[0], fr = wr - b[1];                    // that cell in the foreign grid
        if (fc < 0 || fr < 0 || fc >= d.grid.cols || fr >= d.grid.rows) continue;
        const fid = \`c\${fc}-\${fr}\`;
        if (!cells[fid]) continue;
        if (outside) {
          // across the territory border (18h): conditions and is judged, not stitched
          const key = \`\${tid}:\${fid}\`;
          if (FOREIGN_OUT.has(key)) continue;
          FOREIGN_OUT.set(key, { territory: tid, id: fid, dir: \`\${root}/\${tid}/\${fid}\`, cell: [c, r] });
          authoredNeighbours.push({ cell: [c, r], id: key, foreign: { territory: tid, id: fid }, outside: true });
          continue;
        }
        FOREIGN.set(local, { territory: tid, id: fid, dir: \`\${root}/\${tid}/\${fid}\` });
        authoredNeighbours.push({ cell: [c, r], id: local, foreign: { territory: tid, id: fid } });`);

// 3. edit target: lay the outside neighbours' paint into the grey
replace("3 edit target",
`    // tone ramp (owner 2026-09-02, "need a better transition"): the Transitions`,
`    // Across the territory border (18h): an outside neighbour is not in the
    // seam network, so its concept paint is laid straight into the target
    // wherever its canvas covers mine and mine is still grey — its kept paint
    // first (the truth), then an orthogonal neighbour's bleed (its prediction
    // of my ground): the same band an in-grid neighbour contributes.
    {
      const isGreyAt = (o) => target[o] === EDIT_GREY[0] && target[o + 1] === EDIT_GREY[1] && target[o + 2] === EDIT_GREY[2];
      const outsideNbs = authoredNeighbours.filter((n) => n.outside);
      for (const pass of ["kept", "bleed"]) {
        for (const nb of outsideNbs) {
          const [nc, nr] = nb.cell;
          if (pass === "bleed" && Math.abs(nc - col) + Math.abs(nr - row) !== 1) continue;
          const their = await ctxSourceOf(nb.id, "concept");
          const dx = (col - nc) * CELL_PX, dy = (row - nr) * CELL_PX;   // my (x,y) is their (x+dx, y+dy)
          for (let y = 0; y < GEN_PX; y++) {
            const ty = y + dy;
            if (ty < 0 || ty >= GEN_PX) continue;
            const tyKept = ty >= BLEED && ty < BLEED + CELL_PX;
            for (let x = 0; x < GEN_PX; x++) {
              const tx = x + dx;
              if (tx < 0 || tx >= GEN_PX) continue;
              const inKept = tyKept && tx >= BLEED && tx < BLEED + CELL_PX;
              if ((pass === "kept") !== inKept) continue;
              const si = (ty * GEN_PX + tx) * 4;
              if (their.data[si + 3] < 128) continue;
              const o = (y * GEN_PX + x) * 4;
              if (!isGreyAt(o)) continue;
              target[o] = their.data[si]; target[o + 1] = their.data[si + 1]; target[o + 2] = their.data[si + 2];
            }
          }
        }
      }
    }
    // tone ramp (owner 2026-09-02, "need a better transition"): the Transitions`);

// 4. the packet names the cell across the border
replace("4 packet",
`      const borderRule = plan.rules?.[\`\${dir}Border\`];
      if (borderRule) {`,
`      const borderRule = plan.rules?.[\`\${dir}Border\`];
      const across = [...FOREIGN_OUT.values()].find((f) => f.cell[0] === c && f.cell[1] === r);
      if (across) {
        return \`- **\${dir} (\${across.territory} \${across.id}):** authored across the territory border — \`
          + \`its paint arrives as real pixels in the edit target; continue it at the edge exactly as it arrives\`
          + (borderRule ? \`, and **\${dir}Border** in Territory rules below still governs this side.\` : ".");
      }
      if (borderRule) {`);

if (CHECK) { console.log(`all ${edits.length} anchors present; nothing written (--check)`); process.exit(0); }
fs.writeFileSync(FILE, src);
console.log(`applied ${edits.length} edits to ${FILE}: ${edits.join("; ")}`);
console.log(`now: node tools/world-authoring/check-solidified.mjs --approve "<owner's words>"`);
