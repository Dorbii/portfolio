#!/usr/bin/env node
/**
 * Single entry point for authoring or replacing one L2 cell.
 *
 *   node tools/world-authoring/cell.mjs --cell 4,3 --describe "..."
 *   node tools/world-authoring/cell.mjs --cell 4,3 --describe-file brief.md
 *   node tools/world-authoring/cell.mjs --cell 4,3 --dry-run
 *   node tools/world-authoring/cell.mjs --cell 4,3 --from DIR   (operator-supplied
 *       artefacts: skips generation, gates and stitch still run)
 *
 * You supply the fine-detail brief for the zone. It handles everything else:
 * geometry, interlocking tabs, neighbour context, conditioning, the bounded
 * dispatch, the gates, and (on pass) stitching plus pyramid propagation.
 *
 * Deliberately bounded: ONE cell per invocation, ONE codex process, no queue,
 * no traversal inside the worker. Running two generations concurrently over the
 * same output tree destroyed 106 tile files earlier in this project; a lockfile
 * refuses a second concurrent invocation outright.
 *
 * ONE generation per cell: the worker delivers a single raw square generation
 * covering the whole canvas plus the water mask at that resolution, and THIS
 * script performs the upscale to canvas size and derives concept/l2/water. A
 * canvas assembled from a core and separately generated margins carries a ring
 * where texture character shifts — the owner caught exactly that on the first
 * cell — so the possibility is removed rather than detected.
 *
 * Tiles are DERIVED, never edited: every stitch recomputes each dirty tile from
 * the accepted cell sources (art-source/), so a re-run is byte-idempotent, the
 * seam is order-independent, and an interrupted stitch heals on the next run.
 *
 * L2_OUT_ROOT relocates tiles/manifest/sources under one directory — for the
 * test harness only, so the control suite can run against a scratch world.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

// libvips caches file loads per process; on Windows the cached handle blocks
// rewriting a tile this same run already read (context assembly reads the very
// seam tiles the stitch then rewrites), so the cache must be off
sharp.cache(false);

const ROOT = process.cwd();
const TERRITORY = ".codex-tmp/territory/ninjaone-plan.json";
const WORK = ".codex-tmp/authoring/cells";
const LOCKDIR = ".codex-tmp/authoring/cell.lock";

const CELL_PX = 2048;
const BLEED = 256;
const GEN_PX = CELL_PX + BLEED * 2;      // 2560
const ART = 9.45;                         // art px per world px
const M_PER_WORLDPX = 0.4503;
const CM_PER_PX = (M_PER_WORLDPX / ART) * 100;

const TILE = 256;
const LEVELS = 7;                         // 0 (finest) .. 6, exact 2:1 each
const MIN_SRC = 1254;                     // smallest acceptable single generation:
                                          // the bundled generator's largest square
                                          // (the accepted seed's source was exactly
                                          //  this). A native-2048 path exists but
                                          //  needs the owner to configure an API key
                                          //  for workers; raise this floor then.
const TAB_CORNER = 64;                    // corner jitter amplitude, art px
const TAB_WIGGLE = 64;                    // mid-edge wiggle amplitude, art px
const FEATHER = 8;                        // seam blend half-width, art px
const TAB_REACH = TAB_CORNER + TAB_WIGGLE + FEATHER * 4;   // < BLEED by design

// ---------------------------------------------------------------- args ----
function args() {
  const a = process.argv.slice(2);
  const get = (flag) => {
    const i = a.indexOf(flag);
    return i >= 0 ? a[i + 1] : undefined;
  };
  const cell = get("--cell");
  if (!cell) die("--cell COL,ROW is required");
  const [col, row] = cell.split(",").map(Number);
  let describe = get("--describe");
  const df = get("--describe-file");
  if (df) describe = fs.readFileSync(df, "utf8");
  return {
    col, row, describe,
    from: get("--from"),
    dryRun: a.includes("--dry-run"),
    force: a.includes("--force"),
  };
}
function die(msg) { console.error(`\n  ${msg}\n`); process.exit(1); }

// -------------------------------------------------------------- tabs ------
// Deterministic per shared edge, so both cells derive an identical boundary
// independently and can never disagree about who owns a pixel.
function edgeSeed(a, b) {
  const [x, y] = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
  let h = 2166136261;
  for (const v of [x[0], x[1], y[0], y[1]]) {
    h ^= v + 0x9e3779b9; h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
function tabProfile(seed, length, amplitude) {
  // a smooth pseudo-random offset curve along one edge: the interlock
  let s = seed >>> 0;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const ctrl = Array.from({ length: 5 }, () => (rnd() - 0.5) * 2 * amplitude);
  return (t) => {
    const f = t * (ctrl.length - 1);
    const i = Math.min(ctrl.length - 2, Math.floor(f));
    let u = f - i;
    u = u * u * (3 - 2 * u);
    return ctrl[i] * (1 - u) + ctrl[i + 1] * u;
  };
}
const smooth01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
// wiggle tapers to zero at both ends so every seam passes exactly through its
// (jittered) corner points and the four quadrant ownership tests agree there
const taper = (t) => smooth01(t / 0.15) * smooth01((1 - t) / 0.15);

// Each lattice corner is displaced by a seeded jitter so seams never meet on
// the lattice; edge curves interpolate their two corners' displacement and add
// the tapered wiggle. Deterministic from coordinates alone.
function cornerJitter(i, j) {
  let s = edgeSeed([i, j], [i, j]) >>> 0;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  return [(rnd() - 0.5) * 2 * TAB_CORNER, (rnd() - 0.5) * 2 * TAB_CORNER];
}

// -------------------------------------------------- seam geometry ---------
// makeSeam(plan) returns owner-resolution helpers for the whole territory.
function makeSeam(plan) {
  const COLS = plan.grid.cols, ROWS = plan.grid.rows;
  const jitter = new Map();
  const J = (i, j) => {
    const k = `${i},${j}`;
    if (!jitter.has(k)) jitter.set(k, cornerJitter(i, j));
    return jitter.get(k);
  };
  const wiggles = new Map();
  const wiggle = (a, b) => {
    const k = `${a};${b}`;
    if (!wiggles.has(k)) wiggles.set(k, tabProfile(edgeSeed(a, b), CELL_PX, TAB_WIGGLE));
    return wiggles.get(k);
  };
  // x-offset of the vertical boundary at column index b (between cols b-1, b),
  // evaluated at territory y
  function vOffset(b, y) {
    const rr = Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL_PX)));
    const t = Math.min(1, Math.max(0, (y - rr * CELL_PX) / CELL_PX));
    const base = J(b, rr)[0] * (1 - smooth01(t)) + J(b, rr + 1)[0] * smooth01(t);
    return base + wiggle([b - 1, rr], [b, rr])(t) * taper(t);
  }
  function hOffset(b, x) {
    const cc = Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL_PX)));
    const t = Math.min(1, Math.max(0, (x - cc * CELL_PX) / CELL_PX));
    const base = J(cc, b)[1] * (1 - smooth01(t)) + J(cc + 1, b)[1] * smooth01(t);
    return base + wiggle([cc, b - 1], [cc, b])(t) * taper(t);
  }
  // geometric owner of a territory pixel, independent of authored status
  function owner(x, y) {
    let c = Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL_PX)));
    let r = Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL_PX)));
    if (c > 0 && x - c * CELL_PX <= TAB_REACH) {
      if (x < c * CELL_PX + vOffset(c, y)) c -= 1;
    } else if (c + 1 < COLS && (c + 1) * CELL_PX - x <= TAB_REACH) {
      if (x >= (c + 1) * CELL_PX + vOffset(c + 1, y)) c += 1;
    }
    if (r > 0 && y - r * CELL_PX <= TAB_REACH) {
      if (y < r * CELL_PX + hOffset(r, x)) r -= 1;
    } else if (r + 1 < ROWS && (r + 1) * CELL_PX - y <= TAB_REACH) {
      if (y >= (r + 1) * CELL_PX + hOffset(r + 1, x)) r += 1;
    }
    return `c${c}-${r}`;
  }
  return { owner, COLS, ROWS };
}

// kept area plus bleed, clipped to the territory raster
function windowOf(col, row, gridW, gridH) {
  return {
    x0: Math.max(0, col * CELL_PX - BLEED),
    y0: Math.max(0, row * CELL_PX - BLEED),
    x1: Math.min(gridW, (col + 1) * CELL_PX + BLEED),
    y1: Math.min(gridH, (row + 1) * CELL_PX + BLEED),
  };
}

// ------------------------------------------------------------- ledger -----
// The manifest IS the ledger: one durable, committed record of what has been
// authored, stitched where, under which contract. .codex-tmp holds scratch only.
function outPaths(plan) {
  const rootEnv = process.env.L2_OUT_ROOT;
  const name = `l2-${plan.territory}-r1`;
  if (rootEnv) {
    return {
      tiles: path.join(rootEnv, "tiles"),
      manifest: path.join(rootEnv, "manifest.json"),
      sources: path.join(rootEnv, "sources"),
    };
  }
  return {
    tiles: `public/career-world/layers/terrain/authority/tiles/${name}`,
    manifest: `public/career-world/layers/terrain/authority/manifests/terrain-${name}.json`,
    sources: `art-source/career-world/l2-land/${plan.territory}`,
  };
}
function loadLedger(paths) {
  if (!fs.existsSync(paths.manifest)) return { cells: {} };
  return JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
}
function saveLedger(paths, plan, ledger) {
  const gridW = plan.grid.cols * CELL_PX, gridH = plan.grid.rows * CELL_PX;
  const levelTiles = Array.from({ length: LEVELS }, (_, k) => [
    Math.ceil(gridW / 2 ** k / TILE), Math.ceil(gridH / 2 ** k / TILE),
  ]);
  const manifest = {
    format: "l2-cell-pyramid",
    territory: plan.territory,
    contract: {
      keptPx: CELL_PX, bleedPx: BLEED, generatedPx: GEN_PX,
      artPxPerWorldPx: ART, mPerWorldPx: M_PER_WORLDPX,
      tilePx: TILE, levels: LEVELS,
      reduction: "lanczos3, premultiplied, chained exact 2:1",
      seam: { cornerJitterPx: TAB_CORNER, wigglePx: TAB_WIGGLE, featherPx: FEATHER },
    },
    gridPx: [gridW, gridH],
    levelTiles,
    tilePath: "L{level}/{x}-{y}.webp",
    registration: { status: "territory-local; world placement pending the world-scale-reset re-derivation" },
    cells: ledger.cells,
  };
  fs.mkdirSync(path.dirname(paths.manifest), { recursive: true });
  fs.writeFileSync(paths.manifest, JSON.stringify(manifest, null, 1));
}

// -------------------------------------------------------------- stitch ----
const tilePath = (paths, k, x, y) => path.join(paths.tiles, `L${k}`, `${x}-${y}.webp`);

async function rawOf(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// dirty tile index ranges per level for one cell's window
function dirtyTiles(win, gridW, gridH) {
  const out = [];
  for (let k = 0; k < LEVELS; k++) {
    const s = 2 ** k;
    const tx0 = Math.floor(win.x0 / s / TILE), ty0 = Math.floor(win.y0 / s / TILE);
    const tx1 = Math.min(Math.ceil(gridW / s / TILE), Math.ceil(win.x1 / s / TILE));
    const ty1 = Math.min(Math.ceil(gridH / s / TILE), Math.ceil(win.y1 / s / TILE));
    const tiles = [];
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) tiles.push([tx, ty]);
    out.push(tiles);
  }
  return out;
}

// weight mask for one contributor over one L0 tile: 1 where the contributor's
// paint belongs (its owned area, plus bleed over unauthored ground), 0 where an
// authored cell owns the pixel, box-feathered twice for the seam blend
function weightMask(seam, contributor, authored, win, tileX, tileY) {
  const Mg = FEATHER * 2;
  const N = TILE + 2 * Mg;
  let mask = new Float32Array(N * N);
  for (let v = 0; v < N; v++) {
    const y = tileY * TILE + v - Mg + 0.5;
    for (let u = 0; u < N; u++) {
      const x = tileX * TILE + u - Mg + 0.5;
      if (x < win.x0 || x >= win.x1 || y < win.y0 || y >= win.y1) continue;
      const own = seam.owner(x, y);
      mask[v * N + u] = own === contributor || !authored.has(own) ? 1 : 0;
    }
  }
  // two separable box passes = smooth triangle feather of half-width FEATHER
  for (let pass = 0; pass < 2; pass++) {
    const src = mask, R = FEATHER / 2, w = 2 * R + 1;
    const tmp = new Float32Array(N * N);
    for (let v = 0; v < N; v++) {
      let acc = 0;
      for (let u = -R; u <= R; u++) acc += src[v * N + Math.min(N - 1, Math.max(0, u))];
      for (let u = 0; u < N; u++) {
        tmp[v * N + u] = acc / w;
        const add = Math.min(N - 1, u + R + 1), sub = Math.max(0, u - R);
        acc += src[v * N + add] - src[v * N + sub];
      }
    }
    const dst = new Float32Array(N * N);
    for (let u = 0; u < N; u++) {
      let acc = 0;
      for (let v = -R; v <= R; v++) acc += tmp[Math.min(N - 1, Math.max(0, v)) * N + u];
      for (let v = 0; v < N; v++) {
        dst[v * N + u] = acc / w;
        const add = Math.min(N - 1, v + R + 1), sub = Math.max(0, v - R);
        acc += tmp[add * N + u] - tmp[sub * N + u];
      }
    }
    mask = dst;
  }
  return { mask, N, Mg };
}

async function stitchAndPropagate(plan, seam, paths, ledger, id) {
  const gridW = plan.grid.cols * CELL_PX, gridH = plan.grid.rows * CELL_PX;
  const authored = new Set([...Object.keys(ledger.cells), id]);
  const parse = (cid) => cid.slice(1).split("-").map(Number);
  const [col, row] = parse(id);
  const win = windowOf(col, row, gridW, gridH);
  const dirty = dirtyTiles(win, gridW, gridH);

  // contributors: every authored cell whose window can reach a dirty tile
  const contributors = [...authored].map((cid) => {
    const [c, r] = parse(cid);
    return { cid, win: windowOf(c, r, gridW, gridH) };
  }).filter((c) =>
    c.win.x1 > win.x0 - TILE && c.win.x0 < win.x1 + TILE &&
    c.win.y1 > win.y0 - TILE && c.win.y0 < win.y1 + TILE);

  const sources = new Map();
  const sourceOf = async (cid) => {
    if (!sources.has(cid)) {
      sources.set(cid, await rawOf(path.join(paths.sources, cid, `${cid}-l2.png`)));
    }
    return sources.get(cid);
  };

  let written = 0, unchanged = 0;
  // ---- level 0: recompute each dirty tile from cell sources --------------
  for (const [tx, ty] of dirty[0]) {
    const accP = new Float32Array(TILE * TILE * 4);   // premultiplied RGB + A
    const wsum = new Float32Array(TILE * TILE);
    for (const c of contributors) {
      const tWin = { x0: tx * TILE, y0: ty * TILE, x1: (tx + 1) * TILE, y1: (ty + 1) * TILE };
      if (c.win.x1 <= tWin.x0 || c.win.x0 >= tWin.x1 || c.win.y1 <= tWin.y0 || c.win.y0 >= tWin.y1) continue;
      const { mask, N, Mg } = weightMask(seam, c.cid, authored, c.win, tx, ty);
      const src = await sourceOf(c.cid);
      const [cc, cr] = parse(c.cid);
      const gx0 = cc * CELL_PX - BLEED, gy0 = cr * CELL_PX - BLEED;   // gen origin, unclipped
      for (let v = 0; v < TILE; v++) {
        const y = ty * TILE + v;
        const sy = y - gy0;
        if (sy < 0 || sy >= src.height) continue;
        for (let u = 0; u < TILE; u++) {
          const w = mask[(v + Mg) * N + (u + Mg)];
          if (w <= 0) continue;
          const x = tx * TILE + u;
          const sx = x - gx0;
          if (sx < 0 || sx >= src.width) continue;
          const si = (sy * src.width + sx) * 4;
          const a = src.data[si + 3] / 255;
          const o = (v * TILE + u) * 4, oi = v * TILE + u;
          accP[o] += src.data[si] * a * w;
          accP[o + 1] += src.data[si + 1] * a * w;
          accP[o + 2] += src.data[si + 2] * a * w;
          accP[o + 3] += a * 255 * w;
          wsum[oi] += w;
        }
      }
    }
    const out = Buffer.alloc(TILE * TILE * 4);
    for (let i = 0; i < TILE * TILE; i++) {
      const w = wsum[i];
      if (w <= 1e-4) continue;
      const o = i * 4;
      const a = accP[o + 3] / w;
      out[o + 3] = Math.round(a);
      if (a > 0) {
        out[o] = Math.min(255, Math.round(accP[o] / w / (a / 255)));
        out[o + 1] = Math.min(255, Math.round(accP[o + 1] / w / (a / 255)));
        out[o + 2] = Math.min(255, Math.round(accP[o + 2] / w / (a / 255)));
      }
    }
    const file = tilePath(paths, 0, tx, ty);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const buf = await sharp(out, { raw: { width: TILE, height: TILE, channels: 4 } })
      .webp({ lossless: true, effort: 4 }).toBuffer();
    if (fs.existsSync(file) && Buffer.compare(fs.readFileSync(file), buf) === 0) unchanged += 1;
    else { fs.writeFileSync(file, buf); written += 1; }
  }

  // ---- levels 1..6: exact 2:1 reduction of the level below ---------------
  const counts = [{ level: 0, tiles: dirty[0].length, written }];
  for (let k = 1; k < LEVELS; k++) {
    const set = new Map();
    for (const [tx, ty] of dirty[k - 1]) set.set(`${tx >> 1},${ty >> 1}`, [tx >> 1, ty >> 1]);
    let wrote = 0;
    for (const [tx, ty] of set.values()) {
      const canvas = sharp({ create: { width: TILE * 2, height: TILE * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
      const overlays = [];
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const child = tilePath(paths, k - 1, tx * 2 + dx, ty * 2 + dy);
        if (fs.existsSync(child)) {
          overlays.push({ input: fs.readFileSync(child), left: dx * TILE, top: dy * TILE });
        }
      }
      const buf = await canvas.composite(overlays).png().toBuffer();
      const reduced = await sharp(buf).resize(TILE, TILE, { kernel: "lanczos3" })
        .webp({ lossless: true, effort: 4 }).toBuffer();
      const file = tilePath(paths, k, tx, ty);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (fs.existsSync(file) && Buffer.compare(fs.readFileSync(file), reduced) === 0) unchanged += 1;
      else { fs.writeFileSync(file, reduced); wrote += 1; written += 1; }
    }
    counts.push({ level: k, tiles: set.size, written: wrote });
    dirty[k] = [...set.values()];
  }
  return { counts, written, unchanged };
}

// --------------------------------------------------------------- main -----
const { col, row, describe, from, dryRun, force } = args();
if (!fs.existsSync(TERRITORY)) die(`territory plan missing: ${TERRITORY}`);
const plan = JSON.parse(fs.readFileSync(TERRITORY, "utf8"));
if (col < 0 || row < 0 || col >= plan.grid.cols || row >= plan.grid.rows) {
  die(`cell ${col},${row} is outside the ${plan.grid.cols}x${plan.grid.rows} territory`);
}
if (!describe && !dryRun) {
  die("--describe \"...\" or --describe-file FILE is required.\n"
    + "  This is the one thing only you can supply: what this ground should be,\n"
    + "  described at fine detail. Everything else is derived.");
}

const id = `c${col}-${row}`;
const paths = outPaths(plan);
const seam = makeSeam(plan);
const gridW = plan.grid.cols * CELL_PX, gridH = plan.grid.rows * CELL_PX;
const ledger = loadLedger(paths);
const existing = ledger.cells[id];
if (existing && !force && !dryRun) {
  console.log(`\n  cell ${id} already authored (${existing.authoredAt}).`);
  console.log(`  re-run with --force to replace it.\n`);
  process.exit(0);
}
if (existing && force) {
  const d = dirtyTiles(windowOf(col, row, gridW, gridH), gridW, gridH);
  console.log(`\n  REPLACING ${id} (authored ${existing.authoredAt}).`);
  console.log(`  regenerates ${d.reduce((a, t) => a + t.length, 0)} tiles: `
    + d.map((t, k) => `L${k}:${t.length}`).join(" "));
}

// what this cell owes the world, pulled from the plan rather than restated
const shelf = plan.shelves.find((s) => s.cell[0] === col && s.cell[1] === row);
const features = plan.railFeatures.filter(
  (f) => Math.floor(f.at[0]) === col && Math.floor(f.at[1]) === row,
);
const loopHere = plan.loop.some(
  (p) => Math.floor(p[0]) === col && Math.floor(p[1]) === row,
);

// neighbours already authored: their stitched paint reaches into this cell's
// window and arrives as real pixels, which is what the generator continues
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
const authoredNeighbours = NEIGHBOURS
  .map(([dx, dy]) => [col + dx, row + dy])
  .filter(([c, r]) => ledger.cells[`c${c}-${r}`])
  .map(([c, r]) => ({ cell: [c, r], id: `c${c}-${r}` }));

console.log(`\n  cell ${id}  (${plan.territory})`);
console.log(`  ground        ${(CELL_PX / ART * M_PER_WORLDPX).toFixed(1)} m square at ${CM_PER_PX.toFixed(1)} cm/px`);
console.log(`  generate      ${GEN_PX}x${GEN_PX} px  (keeps ${CELL_PX}, bleeds ${BLEED} into neighbours)`);
console.log(`  shelf         ${shelf ? `${shelf.id} — ${shelf.role}` : "none"}`);
console.log(`  rail          ${loopHere ? "loop passes through" : "no loop"}`
  + `${features.length ? ` — ${features.map((f) => f.kind).join(", ")}` : ""}`);
console.log(`  context       ${authoredNeighbours.length} authored neighbour(s)`
  + `${authoredNeighbours.length ? `: ${authoredNeighbours.map((n) => n.id).join(", ")}` : " — this is a frontier cell"}`);

// ------------------------------------------------------------- packet -----
const cellDir = path.join(WORK, id);
fs.mkdirSync(cellDir, { recursive: true });

// conditioning: the stitched world as it already exists inside this window,
// plus an ownership map showing which pixels are binding (owned by an authored
// neighbour — the stitch will preserve them regardless of what is drawn)
if (authoredNeighbours.length) {
  const win = windowOf(col, row, gridW, gridH);
  const ctxDir = path.join(cellDir, "context");
  fs.mkdirSync(ctxDir, { recursive: true });
  const W = win.x1 - win.x0, H = win.y1 - win.y0;
  const authoredSet = new Set(Object.keys(ledger.cells));
  const canvas = Buffer.alloc(W * H * 4);
  const ownMap = Buffer.alloc(W * H * 4);
  for (let ty = Math.floor(win.y0 / TILE); ty < Math.ceil(win.y1 / TILE); ty++) {
    for (let tx = Math.floor(win.x0 / TILE); tx < Math.ceil(win.x1 / TILE); tx++) {
      const file = tilePath(paths, 0, tx, ty);
      if (!fs.existsSync(file)) continue;
      const t = await rawOf(file);
      for (let v = 0; v < TILE; v++) {
        const y = ty * TILE + v;
        if (y < win.y0 || y >= win.y1) continue;
        for (let u = 0; u < TILE; u++) {
          const x = tx * TILE + u;
          if (x < win.x0 || x >= win.x1) continue;
          t.data.copy(canvas, ((y - win.y0) * W + (x - win.x0)) * 4, (v * TILE + u) * 4, (v * TILE + u) * 4 + 4);
        }
      }
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const own = seam.owner(win.x0 + x + 0.5, win.y0 + y + 0.5);
    const binding = own !== id && authoredSet.has(own);
    const o = (y * W + x) * 4;
    ownMap[o] = ownMap[o + 1] = ownMap[o + 2] = binding ? 40 : 255;
    ownMap[o + 3] = 255;
  }
  await sharp(canvas, { raw: { width: W, height: H, channels: 4 } }).png()
    .toFile(path.join(ctxDir, "window.png"));
  await sharp(ownMap, { raw: { width: W, height: H, channels: 4 } }).png()
    .toFile(path.join(ctxDir, "binding.png"));
  console.log(`  conditioning  ${ctxDir}/window.png (+ binding.png)`);
}

const packet = `# L2 CELL ${id} — ${plan.territory}

Author one cell of the land layer. Terrain only. Quarantine-only: write to
\`${cellDir}/\`. Do not touch \`public/\` or \`art-source/\`.

## This cell

| | |
|---|---|
| ground | **${(CELL_PX / ART * M_PER_WORLDPX).toFixed(1)} m square** |
| you deliver | **ONE square generation, ${MIN_SRC}+ px (2048 preferred)** |
| shipped canvas | **${GEN_PX} x ${GEN_PX} px** (the pipeline upscales your generation) |
| final resolution | **${CM_PER_PX.toFixed(1)} cm per pixel** |

On the final canvas a conifer 4-7 m across is **${Math.round(4 / (CM_PER_PX / 100))}-${Math.round(7 / (CM_PER_PX / 100))} px** wide and a
person would be ~${Math.round(1.7 / (CM_PER_PX / 100))} px tall — on a ${MIN_SRC} px generation that is a
**${Math.round(4 / (CM_PER_PX / 100) * MIN_SRC / GEN_PX)}-${Math.round(7 / (CM_PER_PX / 100) * MIN_SRC / GEN_PX)} px** crown. Size everything against that.

The outer **${Math.round(BLEED / GEN_PX * 100)}%** of the frame on every side is BLEED that overlaps
neighbouring cells. Terrain must run right to all four edges as if the ground
continues, because it does. Do not vignette, fade or frame.

## What this ground must be

${describe || "(dry run — no brief supplied)"}

## Territory rules — ${plan.territory}

${Object.entries(plan.rules).map(([k, v]) => `- **${k}.** ${v}`).join("\n")}

${shelf ? `## Settlement shelf: ${shelf.id}

${shelf.role}. This cell MUST contain a coherent, occupiable shelf a settlement
could actually sit on — not a slope with a flat spot.
${shelf.terrain ? `\nTerrain character: ${shelf.terrain}` : ""}
` : ""}
${features.length ? `## Rail features this cell must supply

${features.map((f) => `- **${f.kind}** — ${f.note}`).join("\n")}

Author the TERRAIN that makes this possible. Do not draw track, sleepers,
bridges or tunnel mouths — those are built structures owned by another layer.
` : ""}
${authoredNeighbours.length ? `## Neighbour context

\`${cellDir}/context/window.png\` is the stitched world as it already exists
across this cell's window, and \`binding.png\` marks the pixels that belong to
authored neighbours (dark = binding). **Continue that terrain.** A ridge
arriving at your border continues into your cell; a shoreline arriving
continues. The stitch preserves binding pixels no matter what you draw there,
so any mismatch at the seam will read as YOUR edge failing to join.
` : `## Frontier cell

No authored neighbours yet, so you are setting the terms this area continues
from. Later cells will be conditioned on your edges.
`}
## Hard constraints

1. **NEUTRAL LIGHTING.** Form shading and ambient occlusion only. No directional
   key, no cast shadows, no sun angle, no time of day. Daylight is a separate
   layer. A baked sun is an automatic FAIL and is measured.
2. **Terrain only.** No buildings, walls, roads, bridges, docks, boats, fences,
   figures or track. Rock and vegetation are terrain and belong.
3. **ONE generation, whole canvas.** Deliver the single raw generation —
   \`${id}-source.png\`, a square image **${MIN_SRC} px or larger** (use the
   largest single-pass square your generator can produce — 2048 if available)
   with the ENTIRE canvas (kept area AND bleed) in frame. The
   pipeline performs the upscale to ${GEN_PX} px and derives the shipped
   layers. Do NOT generate a core and margins separately, do NOT assemble from
   tiles, do NOT upscale or resize anything yourself — a ring or line where
   texture character shifts is an automatic FAIL. Iterate at generation time
   (regenerate whole candidates and pick), never by patching regions.
4. **Water is painted, then classified.** Paint water where it belongs in the
   source. Alongside it deliver:
   - \`${id}-water-source.png\` — mask of every water surface at the SAME
     dimensions as the source (opaque white on transparent),
   - \`${id}-water.json\` — an array of
     \`{ "class": "coast|lake|stream|fall|submerged", "note": "..." }\`.
   The pipeline cuts the water out of the land layer using your mask, so an
   imprecise mask ships as a wrong coastline — trace it carefully.
5. **High oblique 2.5D**, consistent with the reference. Not top-down.

## Report

Write \`${id}-report.json\`: lighting isotropy (peak vs uniform over land),
median conifer crown in px and metres **stated at final ${GEN_PX} px canvas
scale**, buildable vs steep fraction, water footprint fraction, and the exact
generation size you produced.
`;

fs.writeFileSync(path.join(cellDir, `packet-${id}.md`), packet);
console.log(`\n  packet        ${path.join(cellDir, `packet-${id}.md`)}`);

if (dryRun) {
  console.log(`\n  dry run — nothing dispatched.\n`);
  process.exit(0);
}

// one cell per invocation, one process — a second concurrent run refuses here
try {
  fs.mkdirSync(LOCKDIR, { recursive: false });
} catch {
  die(`another cell run holds ${LOCKDIR} — one at a time. If no run is alive, remove the directory.`);
}
process.on("exit", () => { try { fs.rmdirSync(LOCKDIR); } catch { /* already gone */ } });

try {
  // ----------------------------------------------------------- dispatch -----
  if (from) {
    for (const f of [`${id}-l2.png`, `${id}-concept.png`, `${id}-water.png`, `${id}-water.json`]) {
      const src = path.join(from, f);
      if (!fs.existsSync(src)) die(`--from ${from} is missing ${f}`);
      fs.copyFileSync(src, path.join(cellDir, f));
    }
    console.log(`\n  artefacts supplied via --from ${from} — generation skipped.`);
  } else {
    console.log(`\n  dispatching (bounded: one process, effort=high)...\n`);
    const runner = path.join(cellDir, `run-${id}.sh`);
    fs.writeFileSync(runner, `#!/usr/bin/env bash
set -euo pipefail
cd "${ROOT.replace(/\\/g, "/")}"
codex exec \\
  --sandbox workspace-write \\
  -c sandbox_workspace_write.network_access=true \\
  -c model=gpt-5.6-sol \\
  -c model_reasoning_effort=high \\
  "$(cat ${path.join(cellDir, `packet-${id}.md`).replace(/\\/g, "/")})" \\
  < /dev/null > ${path.join(cellDir, `${id}.log`).replace(/\\/g, "/")} 2>&1
`);
    try {
      execFileSync("bash", [runner], { stdio: "inherit" });
    } catch {
      die(`dispatch failed — see ${path.join(cellDir, `${id}.log`)}`);
    }
  }

  // ------------------------------------------- derive canvas from source ----
  // The shipped layers come from ONE uniformly upscaled generation, so a
  // core-plus-margins ring cannot exist. (--from supplies finished artefacts
  // directly — the operator's and the control suite's escape hatch.)
  let sourcePx = null;
  if (!from) {
    const srcFile = path.join(cellDir, `${id}-source.png`);
    const wsrcFile = path.join(cellDir, `${id}-water-source.png`);
    if (!fs.existsSync(srcFile)) die(`no generation at ${srcFile} — cell NOT accepted`);
    if (!fs.existsSync(wsrcFile)) die(`no water mask at ${wsrcFile} — cell NOT accepted`);
    const sm = await sharp(srcFile).metadata();
    if (sm.width !== sm.height) die(`generation is ${sm.width}x${sm.height} — must be square`);
    if (sm.width < MIN_SRC) die(`generation is ${sm.width}px — one pass of at least ${MIN_SRC}px is required`);
    const wm0 = await sharp(wsrcFile).metadata();
    if (wm0.width !== sm.width || wm0.height !== sm.height) {
      die(`water mask is ${wm0.width}x${wm0.height} but the generation is ${sm.width}px — same dimensions required`);
    }
    sourcePx = sm.width;
    const concept = await sharp(srcFile).ensureAlpha()
      .resize(GEN_PX, GEN_PX, { kernel: "lanczos3" }).raw().toBuffer();
    const mask = await sharp(wsrcFile).ensureAlpha()
      .resize(GEN_PX, GEN_PX, { kernel: "lanczos3" }).raw().toBuffer();
    const l2 = Buffer.from(concept);
    for (let i = 0; i < GEN_PX * GEN_PX; i++) {
      const o = i * 4;
      l2[o + 3] = Math.round(concept[o + 3] * (1 - mask[o + 3] / 255));
    }
    const asPng = (buf) => sharp(buf, { raw: { width: GEN_PX, height: GEN_PX, channels: 4 } }).png();
    await asPng(concept).toFile(path.join(cellDir, `${id}-concept.png`));
    await asPng(mask).toFile(path.join(cellDir, `${id}-water.png`));
    await asPng(l2).toFile(path.join(cellDir, `${id}-l2.png`));
    console.log(`  derived       concept/l2/water at ${GEN_PX}px from one ${sm.width}px generation`);
  }

  // -------------------------------------------------------------- gates -----
  const out = path.join(cellDir, `${id}-l2.png`);
  if (!fs.existsSync(out)) die(`no output at ${out} — cell NOT accepted`);

  const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  if (W !== GEN_PX || H !== GEN_PX) die(`output is ${W}x${H}, expected ${GEN_PX}x${GEN_PX}`);

  const L = (p) => 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  const bins = new Array(36).fill(0);
  let n = 0, opaque = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] < 250) continue;
      opaque += 1;
      const gx = L(i + 4) - L(i - 4), gy = L(i + W * 4) - L(i - W * 4);
      const mag = Math.hypot(gx, gy);
      if (mag < 12) continue;
      let a = Math.atan2(gy, gx) * 180 / Math.PI;
      if (a < 0) a += 360;
      bins[Math.floor(a / 10) % 36] += mag;
      n += 1;
    }
  }
  const total = bins.reduce((a, b) => a + b, 0);
  const isotropy = total ? Math.max(...bins) / (total / 36) : 0;

  // water contract: all three artefacts, and water zones actually removed.
  // The fringe measure is reported but does not yet gate — its threshold is
  // calibrated against the first owner-accepted cell (F27) before it hardens.
  for (const f of [`${id}-concept.png`, `${id}-water.png`, `${id}-water.json`]) {
    if (!fs.existsSync(path.join(cellDir, f))) die(`missing water artefact ${f} — cell NOT accepted`);
  }
  let zones;
  try {
    zones = JSON.parse(fs.readFileSync(path.join(cellDir, `${id}-water.json`), "utf8"));
  } catch (e) {
    die(`${id}-water.json does not parse: ${e.message}`);
  }
  const wm = await sharp(path.join(cellDir, `${id}-water.png`)).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  if (wm.info.width !== GEN_PX || wm.info.height !== GEN_PX) {
    die(`water mask is ${wm.info.width}x${wm.info.height}, expected ${GEN_PX}x${GEN_PX}`);
  }
  const isWater = (x, y) => {
    const i = (y * GEN_PX + x) * 4;
    return wm.data[i + 3] > 128 && wm.data[i] > 128;
  };
  let waterInterior = 0, wetResidual = 0, ringN = 0, fringe = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = (y * W + x) * 4;
      if (isWater(x, y)) {
        if (isWater(x - 1, y) && isWater(x + 1, y) && isWater(x, y - 1) && isWater(x, y + 1)) {
          waterInterior += 1;
          if (data[i + 3] > 8) wetResidual += 1;
        }
      } else if (data[i + 3] > 250) {
        let nearWater = false;
        for (let d = 1; d <= 6 && !nearWater; d++) {
          nearWater = isWater(Math.max(0, x - d), y) || isWater(Math.min(GEN_PX - 1, x + d), y)
            || isWater(x, Math.max(0, y - d)) || isWater(x, Math.min(GEN_PX - 1, y + d));
        }
        if (nearWater) {
          ringN += 1;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          const sat = mx ? (mx - mn) / mx : 0;
          if (mx > 40 && sat > 0.25 && b > r && b >= g) fringe += 1;
        }
      }
    }
  }
  const wetResidualPct = waterInterior ? 100 * wetResidual / waterInterior : 0;
  const fringePct = ringN ? 100 * fringe / ringN : 0;

  const gates = [
    { name: "lighting isotropy", value: +isotropy.toFixed(3), pass: isotropy < 1.45,
      note: "must stay near-uniform; concentration on one axis means a baked sun" },
    { name: "land coverage", value: +(100 * opaque / (W * H)).toFixed(1) + "%", pass: opaque > 0 },
    { name: "water removed", value: +wetResidualPct.toFixed(2) + "%", pass: wetResidualPct < 0.5,
      note: "opaque paint surviving inside the delivered water zones" },
    { name: "water fringe", value: +fringePct.toFixed(2) + "% (reported, not yet gating)", pass: true,
      note: "blue-leaning opaque pixels in the 6px ring outside water zones" },
  ];
  console.log(`\n  gates:`);
  for (const g of gates) {
    console.log(`    ${g.pass ? "PASS" : "FAIL"}  ${g.name.padEnd(20)} ${g.value}`);
  }
  if (gates.some((g) => !g.pass)) {
    die("cell NOT accepted. Nothing was stitched; the world is unchanged.");
  }

  // ------------------------------------------------- accept and stitch ------
  // artefacts become the durable source of truth; tiles derive from them
  const srcDir = path.join(paths.sources, id);
  fs.mkdirSync(srcDir, { recursive: true });
  for (const f of [`${id}-l2.png`, `${id}-concept.png`, `${id}-water.png`, `${id}-water.json`,
    `${id}-report.json`, `${id}-source.png`, `${id}-water-source.png`]) {
    const p = path.join(cellDir, f);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(srcDir, f));
  }

  console.log(`\n  stitching ${id} into the tile grid...`);
  const result = await stitchAndPropagate(plan, seam, paths, ledger, id);
  for (const c of result.counts) {
    console.log(`    L${c.level}  ${String(c.tiles).padStart(4)} dirty  ${String(c.written).padStart(4)} written`);
  }
  console.log(`    total ${result.written} written, ${result.unchanged} byte-identical`);

  ledger.cells[id] = {
    authoredAt: new Date().toISOString(),
    describe: (describe || "").slice(0, 400),
    sourcePx,
    gates, shelf: shelf?.id ?? null,
    features: features.map((f) => f.kind),
    waterZones: Array.isArray(zones) ? zones.map((z) => z.class) : zones,
    source: srcDir.replace(/\\/g, "/"),
    stitch: { order: existing?.stitch?.order ?? Object.keys(ledger.cells).length + 1,
      tiles: result.counts.map((c) => c.tiles) },
  };
  saveLedger(paths, plan, ledger);
  console.log(`\n  cell ${id} accepted, stitched, and recorded in ${paths.manifest}\n`);
} finally {
  try { fs.rmdirSync(LOCKDIR); } catch { /* held only during dispatch+stitch */ }
}
