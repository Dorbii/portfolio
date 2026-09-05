// Where the island's coast is still a cut edge: every authored cell (NinjaOne,
// Tanium, coast) whose land touches one of its kept edges while the world cell
// across that edge is neither authored nor planned — and every corner where
// land reaches the corner and the diagonal cell is unplanned (owner
// 2026-09-05: "we need it so the coast is cohesive not constantly have this
// edge issue"). Land is read the continuity gate's way: alpha >= 128 within
// 8 px of the edge, runs of 30 px or more. Prints the sea cells to plan, each
// with the neighbour that puts the most land on the shared edge (what a coast
// cell extends), in coast-territory ids (block [1,0]).
//   node docs/career-world/session3-tools/coast-audit.mjs
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);
const ART = "art-source/career-world/l2-land", A = "public/career-world/layers/terrain/authority/manifests";
const KEPT = 2048, COAST_BLOCK = [1, 0];
const defOf = (t) => JSON.parse(fs.readFileSync(`${ART}/${t}/territory.def.json`, "utf8"));
const cellsOf = (t) => Object.keys(JSON.parse(fs.readFileSync(`${A}/terrain-l2-${t}-r1.json`, "utf8")).cells);

const authored = new Map();   // "wx,wy" -> { t, id, file }
const planned = new Set();    // "wx,wy" planned coast cells (authored or not)
for (const t of ["ninjaone", "tanium", "coast"]) {
  const def = defOf(t), [bx, by] = def.lattice.block;
  for (const id of cellsOf(t)) {
    const [c, r] = id.slice(1).split("-").map(Number);
    authored.set(`${bx + c},${by + r}`, { t, id, file: `${ART}/${t}/${id}/${id}-l2.png` });
  }
  // a sparse territory plans only its listed cells; a dense one plans its whole
  // block (an unauthored island cell is a hole to bake, not sea)
  if (def.coastCells) for (const x of def.coastCells) planned.add(`${bx + x.at[0]},${by + x.at[1]}`);
  else for (let r = 0; r < def.grid.rows; r += 1) for (let c = 0; c < def.grid.cols; c += 1) planned.add(`${bx + c},${by + r}`);
}

// land runs along one kept edge, in kept px
async function landRuns(file, edge) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, bleed = Math.round((W - KEPT) / 2);
  const along = edge === "top" || edge === "bottom";
  const line = edge === "bottom" || edge === "right" ? bleed + KEPT - 1 : bleed;
  const runs = []; let start = null;
  for (let i = 0; i < KEPT; i += 1) {
    let mx = 0;
    for (let d = -8; d <= 8; d += 1) {
      const [px, py] = along ? [bleed + i, line + d] : [line + d, bleed + i];
      if (px < 0 || py < 0 || px >= W || py >= W) continue;
      mx = Math.max(mx, data[(py * W + px) * 4 + 3]);
    }
    const land = mx >= 128;
    if (land && start === null) start = i;
    if (!land && start !== null) { runs.push([start, i - 1]); start = null; }
  }
  if (start !== null) runs.push([start, KEPT - 1]);
  return runs.filter(([a, b]) => b - a + 1 >= 30);
}

const EDGES = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };
const need = new Map();   // "wx,wy" -> [{ from, edge, landPx, runs }]
const cornerNeed = new Map();
for (const [key, cell] of authored) {
  const [wx, wy] = key.split(",").map(Number);
  const touches = {};
  for (const [edge, [dx, dy]] of Object.entries(EDGES)) {
    const runs = await landRuns(cell.file, edge);
    const landPx = runs.reduce((s, [a, b]) => s + b - a + 1, 0);
    touches[edge] = runs;
    if (!landPx) continue;
    const nk = `${wx + dx},${wy + dy}`;
    if (authored.has(nk) || planned.has(nk)) continue;
    if (!need.has(nk)) need.set(nk, []);
    need.get(nk).push({ from: `${cell.t} ${cell.id}`, edge, landPx, runs: runs.map(([a, b]) => `${Math.round(a / KEPT * 100)}-${Math.round(b / KEPT * 100)}%`).join(" ") });
  }
  // corners: land within 64 px of the corner on both edges, diagonal cell unplanned
  const near = (runs, end) => runs.some(([a, b]) => end === "start" ? a < 64 : b > KEPT - 65);
  const corners = [
    ["top-left", [-1, -1], near(touches.top, "start") && near(touches.left, "start")],
    ["top-right", [1, -1], near(touches.top, "end") && near(touches.right, "start")],
    ["bottom-left", [1 - 2, 1], near(touches.bottom, "start") && near(touches.left, "end")],
    ["bottom-right", [1, 1], near(touches.bottom, "end") && near(touches.right, "end")],
  ];
  for (const [name, [dx, dy], hit] of corners) {
    if (!hit) continue;
    const nk = `${wx + dx},${wy + dy}`;
    if (authored.has(nk) || planned.has(nk) || need.has(nk)) continue;
    if (!cornerNeed.has(nk)) cornerNeed.set(nk, []);
    cornerNeed.get(nk).push(`${cell.t} ${cell.id} ${name}`);
  }
}

const coastId = (k) => { const [x, y] = k.split(",").map(Number); return `c${x - COAST_BLOCK[0]}-${y - COAST_BLOCK[1]}`; };
console.log(`authored ${authored.size} cells; planned coast cells ${planned.size}\n`);
console.log(`SEA CELLS WITH LAND RUNNING INTO THEM (plan these):`);
for (const [k, list] of [...need].sort()) {
  list.sort((p, q) => q.landPx - p.landPx);
  console.log(`  world [${k}] = coast ${coastId(k)}  <- ${list.map((x) => `${x.from} (${x.edge} edge, ${Math.round(x.landPx / KEPT * 100)}% land at ${x.runs})`).join("; ")}`);
}
console.log(`\nCORNERS (land reaches the corner, the diagonal cell is unplanned):`);
for (const [k, list] of [...cornerNeed].sort()) console.log(`  world [${k}] = coast ${coastId(k)}  <- ${list.join("; ")}`);
