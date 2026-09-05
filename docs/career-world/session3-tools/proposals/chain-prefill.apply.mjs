// PROPOSAL (lock 18m) — NOT APPLIED. Needs the owner's word (record with
// check-solidified.mjs --approve).
//
// THE FINDING (2026-09-05 19:20, the owner's crops of the live world): the
// rune chain steps at cell edges. T c4-1's groove leaves its west edge 25%
// down where c3-1's wall arrives 52% down, and leaves its east edge 40% down
// where c5-1's begins at 50%; c2-1's candidate sits ~5% off c3-1's. The
// briefs state the crossings as exact percentages, and the worker strips
// percentages by design; the bleed shows the neighbour's groove end but the
// model has drawn the line elsewhere on every forced attempt. Water got its
// pixel lever in 18i and the seams matched; the chain needs the same.
//
// THE CHANGE: for a cell the territory's rune chain crosses (its def's
// runeChain.waypoints, the same route the briefs are written from), the edit
// target carries the groove's FLOOR as a dark line about 1.2 m wide along
// the route, painted only over unpainted grey (the neighbours' bleed stays),
// and the packet says the floor is FINAL and exact: cut the walls and rims
// along it, never move it. Nothing else changes.
//
//   node .codex-tmp/session4/proposals/chain-prefill.apply.mjs [--check]
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

replace("1 declare",
`let seaPrefilled = 0;   // px of the island's sea painted on into the target (18i)`,
`let seaPrefilled = 0;   // px of the island's sea painted on into the target (18i)
let chainPrefilled = 0; // px of the rune chain's floor drawn into the target (18m)`);

replace("2 paint",
`    // tone ramp (owner 2026-09-02, "need a better transition"): the Transitions`,
`    // CHAIN PRE-FILL (18m, 2026-09-05): a cell the rune chain crosses carries
    // the groove's floor as a dark line along the territory's route, so the
    // line meets its neighbours exactly; the model cuts the slot around it.
    {
      const defFile = \`art-source/career-world/l2-land/\${plan.territory}/territory.def.json\`;
      const rc = fs.existsSync(defFile) ? JSON.parse(fs.readFileSync(defFile, "utf8")).runeChain : null;
      const W = rc?.waypoints;
      if (W && W.length > 1) {
        const yAt = (x) => {
          for (let i = 1; i < W.length; i += 1) {
            const a = W[i - 1], b = W[i];
            if (a[0] === b[0] || (a[0] - x) * (b[0] - x) > 0) continue;
            const t = (x - a[0]) / (b[0] - a[0]);
            if (t < 0 || t > 1) continue;
            return a[1] + t * (b[1] - a[1]);
          }
          return null;
        };
        const yIn = yAt(col), yOut = yAt(col + 1);
        if (yIn != null && yOut != null && (Math.floor(yIn) === row || Math.floor(yOut) === row)) {
          const isGreyPx = (o) => target[o] === EDIT_GREY[0] && target[o + 1] === EDIT_GREY[1] && target[o + 2] === EDIT_GREY[2];
          const HALF = Math.round(0.6 / (97.6 / CELL_PX));   // half of a 1.2 m floor
          const FLOOR = [38, 36, 33];                          // the slot's floor in shade
          const toX = (wx) => BLEED + (wx - col) * CELL_PX, toY = (wy) => BLEED + (wy - row) * CELL_PX;
          // the route through this cell's window, the bleed included
          const pts = [];
          const x0 = col - BLEED / CELL_PX, x1 = col + 1 + BLEED / CELL_PX;
          for (let k = 0; k <= 64; k += 1) {
            const wx = x0 + (x1 - x0) * k / 64, wy = yAt(wx);
            if (wy != null) pts.push([toX(wx), toY(wy)]);
          }
          for (let i = 1; i < pts.length; i += 1) {
            const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
            const steps = Math.ceil(Math.hypot(bx - ax, by - ay));
            for (let s = 0; s <= steps; s += 1) {
              const cx = ax + (bx - ax) * s / steps, cy = ay + (by - ay) * s / steps;
              for (let dy = -HALF; dy <= HALF; dy += 1) for (let dx = -HALF; dx <= HALF; dx += 1) {
                if (dx * dx + dy * dy > HALF * HALF) continue;
                const x = Math.round(cx + dx), y = Math.round(cy + dy);
                if (x < 0 || y < 0 || x >= GEN_PX || y >= GEN_PX) continue;
                const o = (y * GEN_PX + x) * 4;
                if (!isGreyPx(o)) continue;
                target[o] = FLOOR[0]; target[o + 1] = FLOOR[1]; target[o + 2] = FLOOR[2];
                chainPrefilled += 1;
              }
            }
          }
          if (chainPrefilled) console.log(\`  chain pre-fill \${chainPrefilled} px: the groove's floor drawn along the route, \${Math.round((yIn - row) * 100)}% down the west edge to \${Math.round((yOut - row) * 100)}% down the east\`);
        }
      }
    }
    // tone ramp (owner 2026-09-02, "need a better transition"): the Transitions`);

replace("3 packet",
`and keep every painted sea pixel as sea.\` : ""}`,
`and keep every painted sea pixel as sea.\` : ""}\${chainPrefilled ? \` THE RUNE CHAIN'S FLOOR is
already drawn: the thin dark line crossing the canvas from edge to edge is the
groove's floor, FINAL and exact. Cut the slot's two walls and its rounded,
paler rims along that line, on both sides of it; never move it, bend it, break
it, widen it into a path, or paint ground, water or trees over it.\` : ""}`);

if (CHECK) { console.log("all " + edits.length + " anchors present; nothing written (--check)"); process.exit(0); }
fs.writeFileSync(FILE, src);
console.log("applied " + edits.length + " edits to " + FILE + ": " + edits.join("; "));
console.log("now: node tools/world-authoring/check-solidified.mjs --approve \"<owner's words>\"");
