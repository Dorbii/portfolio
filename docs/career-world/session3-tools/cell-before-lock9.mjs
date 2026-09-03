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
const TERRITORY = "art-source/career-world/l2-land/ninjaone/plan.json";   // committed, beside the sources
// the working dir follows the output tree: a relocated test world must never
// write into the real cells' working dirs — a control's stub water.json
// reached cell 4,3's ledger record that way (R073, 2026-09-02)
const WORK = process.env.L2_OUT_ROOT
  ? path.join(process.env.L2_OUT_ROOT, "work")
  : ".codex-tmp/authoring/cells";
// one lock per OUTPUT TREE: the invariant is one writer per world, and a
// relocated test world (L2_OUT_ROOT) is its own world with its own lock
const LOCKDIR = process.env.L2_OUT_ROOT
  ? path.join(process.env.L2_OUT_ROOT, "cell.lock")
  : ".codex-tmp/authoring/cell.lock";

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
const EDIT_GREY = [96, 104, 88];          // unpainted area of an edit target (neutral, mid-value)
// what the water tools (fringe rings, mask growth) call painted water: saturated,
// blue-leaning AND within the cyan-to-blue hue window. Violet and magenta ground
// (the purple field, hue 240-300) is blue-leaning but not water (R093, 2026-09-02).
const WATER_HUE = [150, 225];
function isWaterPaint(r, g, b, mx, sat) {
  if (!(mx > 40 && sat > 0.25 && b > r && b >= g)) return false;
  const mn = Math.min(r, g, b);
  if (mx === mn) return false;
  let h = mx === r ? 60 * (((g - b) / (mx - mn)) % 6)
    : mx === g ? 60 * ((b - r) / (mx - mn) + 2)
    : 60 * ((r - g) / (mx - mn) + 4);
  if (h < 0) h += 360;
  return h >= WATER_HUE[0] && h <= WATER_HUE[1];
}
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
    redo: a.includes("--redo"),   // re-derive + re-gate + stitch from the
                                  // cell dir's existing source artefacts,
                                  // without dispatching a new generation
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

const parseCid = (cid) => cid.slice(1).split("-").map(Number);

// compose one 256px tile of the world from authored cell sources; kind picks
// the source layer ("l2" for the shipped world, "concept" for conditioning —
// water painted, so a neighbour's stream is visible paint, not a hole)
async function composeTile(seam, authored, contributors, sourceOf, tx, ty, kind) {
  const accP = new Float32Array(TILE * TILE * 4);   // premultiplied RGB + A
  const wsum = new Float32Array(TILE * TILE);
  for (const c of contributors) {
    const tWin = { x0: tx * TILE, y0: ty * TILE, x1: (tx + 1) * TILE, y1: (ty + 1) * TILE };
    if (c.win.x1 <= tWin.x0 || c.win.x0 >= tWin.x1 || c.win.y1 <= tWin.y0 || c.win.y0 >= tWin.y1) continue;
    const { mask, N, Mg } = weightMask(seam, c.cid, authored, c.win, tx, ty);
    const src = await sourceOf(c.cid, kind);
    const [cc, cr] = parseCid(c.cid);
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
  return out;
}

function makeSourceOf(paths) {
  const sources = new Map();
  return async (cid, kind) => {
    const key = `${cid}:${kind}`;
    if (!sources.has(key)) {
      sources.set(key, await rawOf(path.join(paths.sources, cid, `${cid}-${kind}.png`)));
    }
    return sources.get(key);
  };
}

function contributorsFor(authored, win, gridW, gridH) {
  return [...authored].map((cid) => {
    const [c, r] = parseCid(cid);
    return { cid, win: windowOf(c, r, gridW, gridH) };
  }).filter((c) =>
    c.win.x1 > win.x0 - TILE && c.win.x0 < win.x1 + TILE &&
    c.win.y1 > win.y0 - TILE && c.win.y0 < win.y1 + TILE);
}

async function stitchAndPropagate(plan, seam, paths, ledger, id) {
  const gridW = plan.grid.cols * CELL_PX, gridH = plan.grid.rows * CELL_PX;
  const authored = new Set([...Object.keys(ledger.cells), id]);
  const [col, row] = parseCid(id);
  const win = windowOf(col, row, gridW, gridH);
  const dirty = dirtyTiles(win, gridW, gridH);
  const contributors = contributorsFor(authored, win, gridW, gridH);
  const sourceOf = makeSourceOf(paths);

  let written = 0, unchanged = 0;
  // ---- level 0: recompute each dirty tile from cell sources --------------
  for (const [tx, ty] of dirty[0]) {
    const out = await composeTile(seam, authored, contributors, sourceOf, tx, ty, "l2");
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
const { col, row, describe, from, dryRun, force, redo } = args();
if (!fs.existsSync(TERRITORY)) die(`territory plan missing: ${TERRITORY}`);
const plan = JSON.parse(fs.readFileSync(TERRITORY, "utf8"));
if (col < 0 || row < 0 || col >= plan.grid.cols || row >= plan.grid.rows) {
  die(`cell ${col},${row} is outside the ${plan.grid.cols}x${plan.grid.rows} territory`);
}
// biome (owner-directed 2026-09-01): every cell has one, from the plan's map.
// The packet carries its vocabulary and each neighbour's biome, so a
// transition cell knows it is one. No biome means the map is incomplete: stop.
const biomeId = plan.cellBiomes?.[`${col},${row}`];
const biome = biomeId ? plan.biomes?.[biomeId] : null;
if (!biome) {
  die(`no biome assigned for cell ${col},${row} — assign it in plan-territory.mjs (the owner's biome map) and regenerate the plan`);
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
// the loop passes through a cell if any SEGMENT of it enters the cell's
// square, not only if a waypoint lies inside: 4,2 was told "no loop" while
// the headland-to-cliff-run segment crossed it (2026-09-01)
const loopHere = plan.loop.some((p, i) => {
  if (i === 0) return false;
  const [ax, ay] = plan.loop[i - 1], [bx, by] = p;
  for (let t = 0; t <= 1; t += 1 / 64) {
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (Math.floor(x) === col && Math.floor(y) === row) return true;
  }
  return false;
});
// interior sites (owner-directed 2026-09-01): ground the structures layer
// builds on later; L2 authors the terrain for each and draws nothing on it
const sites = (plan.sites || []).filter((s) => s.cell[0] === col && s.cell[1] === row);

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
console.log(`  biome         ${biome.name} (${biomeId})`);
console.log(`  shelf         ${shelf ? `${shelf.id} — ${shelf.role}` : "none"}`);
console.log(`  rail          ${loopHere ? "loop passes through" : "no loop"}`
  + `${features.length ? ` — ${features.map((f) => f.kind).join(", ")}` : ""}`);
console.log(`  context       ${authoredNeighbours.length} authored neighbour(s)`
  + `${authoredNeighbours.length ? `: ${authoredNeighbours.map((n) => n.id).join(", ")}` : " — this is a frontier cell"}`);

// ------------------------------------------------------------- packet -----
const cellDir = path.join(WORK, id);
fs.mkdirSync(cellDir, { recursive: true });

// conditioning: the neighbours' CONCEPT art composited across this window —
// water is visible as painted water, so an arriving stream or shoreline is a
// feature to continue, not a transparent hole — plus an ownership map showing
// which pixels are binding (the stitch preserves them regardless of the draw)
if (authoredNeighbours.length) {
  const win = windowOf(col, row, gridW, gridH);
  const ctxDir = path.join(cellDir, "context");
  fs.mkdirSync(ctxDir, { recursive: true });
  const W = win.x1 - win.x0, H = win.y1 - win.y0;
  const authoredSet = new Set(Object.keys(ledger.cells));
  const ctxContrib = contributorsFor(authoredSet, win, gridW, gridH);
  const ctxSourceOf = makeSourceOf(paths);
  const canvas = Buffer.alloc(W * H * 4);
  const ownMap = Buffer.alloc(W * H * 4);
  for (let ty = Math.floor(win.y0 / TILE); ty < Math.ceil(win.y1 / TILE); ty++) {
    for (let tx = Math.floor(win.x0 / TILE); tx < Math.ceil(win.x1 / TILE); tx++) {
      const t = await composeTile(seam, authoredSet, ctxContrib, ctxSourceOf, tx, ty, "concept");
      for (let v = 0; v < TILE; v++) {
        const y = ty * TILE + v;
        if (y < win.y0 || y >= win.y1) continue;
        for (let u = 0; u < TILE; u++) {
          const x = tx * TILE + u;
          if (x < win.x0 || x >= win.x1) continue;
          t.copy(canvas, ((y - win.y0) * W + (x - win.x0)) * 4, (v * TILE + u) * 4, (v * TILE + u) * 4 + 4);
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
  console.log(`  conditioning  ${ctxDir}/window.png (+ binding.png, concept-composited)`);

  // edit target (owner-approved 2026-09-01): the FULL generation canvas with
  // the authored neighbours' concept paint wherever their canvases cover it,
  // and neutral grey wherever this cell is still unpainted. The cell's own
  // previous paint is never included, so a replacement cannot inherit what it
  // replaces. The worker EDITS this image in place (built-in image_gen edit
  // mode), so the generation is conditioned on real neighbour pixels: measured
  // band fidelity r 0.74 and a seam step inside the no-seam range (ledger
  // R057), against r ~0 when the same paint is only shown as a reference.
  {
    const gx0 = col * CELL_PX - BLEED, gy0 = row * CELL_PX - BLEED;
    const others = new Set([...authoredSet].filter((c) => c !== id));
    const canvasWin = { x0: gx0, y0: gy0, x1: gx0 + GEN_PX, y1: gy0 + GEN_PX };
    const contrib = contributorsFor(others, canvasWin, gridW, gridH);
    const target = Buffer.alloc(GEN_PX * GEN_PX * 4);
    for (let i = 0; i < GEN_PX * GEN_PX; i++) {
      target[i * 4] = EDIT_GREY[0]; target[i * 4 + 1] = EDIT_GREY[1]; target[i * 4 + 2] = EDIT_GREY[2]; target[i * 4 + 3] = 255;
    }
    const tx0 = Math.max(0, Math.floor(gx0 / TILE)), ty0 = Math.max(0, Math.floor(gy0 / TILE));
    const tx1 = Math.min(Math.ceil(gridW / TILE), Math.ceil((gx0 + GEN_PX) / TILE));
    const ty1 = Math.min(Math.ceil(gridH / TILE), Math.ceil((gy0 + GEN_PX) / TILE));
    for (let ty = ty0; ty < ty1; ty++) {
      for (let tx = tx0; tx < tx1; tx++) {
        const t = await composeTile(seam, others, contrib, ctxSourceOf, tx, ty, "concept");
        for (let v = 0; v < TILE; v++) {
          const y = ty * TILE + v - gy0;
          if (y < 0 || y >= GEN_PX) continue;
          for (let u = 0; u < TILE; u++) {
            const x = tx * TILE + u - gx0;
            if (x < 0 || x >= GEN_PX) continue;
            const si = (v * TILE + u) * 4;
            if (t[si + 3] < 128) continue;   // nothing painted here: stays grey
            const o = (y * GEN_PX + x) * 4;
            target[o] = t[si]; target[o + 1] = t[si + 1]; target[o + 2] = t[si + 2];
          }
        }
      }
    }
    // tone ramp (owner 2026-09-02, "need a better transition"): the Transitions
    // words did not place the biome change inside the cell — the model changed
    // tone at the line. So the transition is given as pixels: along each
    // authored orthogonal edge, the neighbour's tone just before the grey
    // (per 64 px segment, the median of its last 64 painted px) is blended
    // into the grey across the outer third of the kept area, fading to the
    // flat grey. The model continues a tone it can see.
    {
      const THIRD = Math.round(CELL_PX / 3);
      const isGrey = (o) => target[o] === EDIT_GREY[0] && target[o + 1] === EDIT_GREY[1] && target[o + 2] === EDIT_GREY[2];
      const frames = {
        N: (u, v) => [u, BLEED + v], S: (u, v) => [u, CELL_PX + BLEED - 1 - v],
        W: (u, v) => [BLEED + v, u], E: (u, v) => [CELL_PX + BLEED - 1 - v, u],
      };
      const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
      for (const nb of authoredNeighbours) {
        const [nc, nr] = nb.cell;
        if (Math.abs(nc - col) + Math.abs(nr - row) !== 1) continue;
        const edge = nc > col ? "E" : nc < col ? "W" : nr > row ? "S" : "N";
        const f = frames[edge];
        for (let u0 = 0; u0 < GEN_PX; u0 += 64) {
          const rs = [], gs = [], bs = [];
          for (let u = u0; u < Math.min(GEN_PX, u0 + 64); u++) {
            for (let v = BLEED - 64; v < BLEED; v++) {   // the neighbour's bleed paint, its last 64 px before the grey
              const [x, y] = f(u, v); const o = (y * GEN_PX + x) * 4;
              if (isGrey(o)) continue;
              rs.push(target[o]); gs.push(target[o + 1]); bs.push(target[o + 2]);
            }
          }
          if (rs.length < 512) continue;   // no neighbour paint on this segment
          const tone = [med(rs), med(gs), med(bs)];
          for (let u = u0; u < Math.min(GEN_PX, u0 + 64); u++) {
            // full tone where the grey begins (the neighbour's bleed ends at v = BLEED),
            // fading to flat grey a third of the kept area in from the seam
            for (let v = BLEED; v < THIRD; v++) {
              const [x, y] = f(u, v); const o = (y * GEN_PX + x) * 4;
              if (!isGrey(o)) continue;
              const w = 1 - (v - BLEED) / (THIRD - BLEED);
              for (let c = 0; c < 3; c++) target[o + c] = Math.round(EDIT_GREY[c] + (tone[c] - EDIT_GREY[c]) * w);
            }
          }
        }
      }
    }
    await sharp(target, { raw: { width: GEN_PX, height: GEN_PX, channels: 4 } }).png()
      .toFile(path.join(ctxDir, "edit-target.png"));
    console.log(`  edit target   ${ctxDir}/edit-target.png (neighbour concept paint, grey to paint)`);
  }
}

// edit mode whenever a neighbour exists: the worker edits the target in place
// instead of generating from a prompt, so pegs are paint rather than prose.
// A frontier cell has nothing to continue and stays in generate mode.
const editMode = authoredNeighbours.length > 0;
// the canon rides along as a second input of the SAME edit call: the hand the
// model continues is then the canon's in the interior and the neighbour's at
// the band (probe R078: key light 0.0093 vs 0.019-0.020 without it)
const REFERENCE_PARAGRAPH = "The second image is a reference only and must not appear in the output: take from it the brush, the palette family, the ground scale and above all the FLAT LIGHTING — every tussock, boulder, column and bank the same value on every side, no bright upper edge, no dark lower edge, no lit side anywhere, ambient occlusion only.";
const CANON_SOURCE = "seed/L2-seed-region-r2-source.png";   // under paths.sources
const FRAMING_PREAMBLE = "Edit the first image in place. The output must be a SQUARE image with exactly the same framing and extent as the first image: the painted terrain stays exactly where it is, at the same scale, and the flat grey area is painted in. Do not change the aspect ratio, do not crop, do not zoom, do not extend the canvas beyond the input. Paint the grey area as a seamless continuation of the painted ground so the join is invisible. Keep exactly the same view as the first image.";
const canonPath = path.join(paths.sources, CANON_SOURCE);
if (editMode && !fs.existsSync(canonPath)) die(`edit mode needs the style canon at ${canonPath}`);

// transitions: a biome change lives INSIDE the later-authored cell, across its
// outer third on that side, so the biome boundary never lies on a cell seam
// (where it would coincide with the pixel seam and read twice as hard)
const transitionLines = [["north", col, row - 1], ["east", col + 1, row], ["south", col, row + 1], ["west", col - 1, row]]
  .map(([dir, c, r]) => {
    if (c < 0 || r < 0 || c >= plan.grid.cols || r >= plan.grid.rows) {
      return `- **${dir}:** territory edge — nothing arrives; end your terrain mid-ground.`;
    }
    const nid = plan.cellBiomes?.[`${c},${r}`], nb = nid ? plan.biomes?.[nid] : null;
    const nName = nb ? nb.name : "unassigned";
    const authored = !!ledger.cells[`c${c}-${r}`];
    if (!authored) return `- **${dir} (${c},${r}):** ${nName} — not yet authored: paint ${biome.name} to the edge.`;
    if (nid === biomeId) return `- **${dir} (${c},${r}):** ${nName} — authored, same biome: continue without change.`;
    return `- **${dir} (${c},${r}):** ${nName} — authored: its paint arrives as ${nName}; continue it at the edge and change to ${biome.name} across your ${dir} third.`;
  }).join("\n");

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

## Biome: ${biome.name} (\`${biomeId}\`)

This is what the ground of this cell IS. The hand (brush, view, flat
lighting) comes from the neighbours' paint and the canon; the biome sets what
is painted and how the palette shifts.

- **ground.** ${biome.ground}
- **rock.** ${biome.rock}
- **trees.** ${biome.trees}
- **water.** ${biome.water}
- **palette.** ${biome.palette}
- **wonders.** ${biome.wonders}

## Transitions

${transitionLines}

Where a neighbour's paint arrives in a different biome, continue that paint
at the edge exactly as it arrives and make the change to your own biome
INSIDE this cell, across the outer third on that side — the biome boundary
never lies on the cell seam. Where the arriving biome is your own, continue
without change. Where a neighbour is not authored yet, paint your own biome
to the edge; that cell will adapt to you when it is authored.

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
${sites.length ? `## Sites this cell must offer

The structures layer builds on these later; you author the GROUND for each
and draw nothing on it — no buildings, no paths, no markers.

${sites.map((s) => `- **${s.id}.** ${s.terrain}`).join("\n")}
` : ""}
${editMode ? `## Neighbour context — you EDIT this cell into existence, you do not generate it

\`${cellDir}/context/edit-target.png\` is your canvas: the authored
neighbours' real paint wherever it reaches into this cell's window, and flat
grey wherever this cell is still unpainted. \`${canonPath}\` is the
style canon of this world. Load both with the built-in \`view_image\` tool,
then make ONE \`image_gen\` call in EDIT mode with BOTH images attached — the
edit target as the image to edit, the canon as a second input that is a
reference only. Your edit prompt begins with these two paragraphs VERBATIM,
followed by the brief above written as what the ground IS and what CONTINUES
from the painted edge — never as coordinates or percentages:

> ${FRAMING_PREAMBLE}

> ${REFERENCE_PARAGRAPH}

If the tool refuses the second image, say so in the report and stop — never
a second call, never generate mode.

The stitch preserves the neighbours' pixels no matter what you paint over
them, so the join you paint at the grey boundary is the seam the world will
show. A ridge arriving at the boundary continues into the grey; a stream
arriving continues; a shoreline arriving continues. \`window.png\` and
\`binding.png\` are there to read, not to edit.
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
${editMode ? `3. **ONE edit call, whole canvas.** Deliver the raw output of that single
   EDIT call as \`${id}-source.png\`: a SQUARE image **${MIN_SRC} px or
   larger**, unresized, uncropped, untouched. If the tool returns a
   non-square image, do NOT resize it — repeat the framing paragraph and
   retry ONCE; a non-square delivery is rejected by the pipeline. Never
   generate mode, never a core plus margins, never tiles, never patches:
   a ring or line where texture character shifts is an automatic FAIL.` : `3. **ONE generation, whole canvas.** Deliver the single raw generation —
   \`${id}-source.png\`, a square image **${MIN_SRC} px or larger** (use the
   largest single-pass square your generator can produce — 2048 if available)
   with the ENTIRE canvas (kept area AND bleed) in frame. The
   pipeline performs the upscale to ${GEN_PX} px and derives the shipped
   layers. Do NOT generate a core and margins separately, do NOT assemble from
   tiles, do NOT upscale or resize anything yourself — a ring or line where
   texture character shifts is an automatic FAIL. Iterate at generation time
   (regenerate whole candidates and pick), never by patching regions.`}
4. **Water is painted, then classified.** Paint water where it belongs in the
   source. Alongside it deliver:
   - \`${id}-water-source.png\` — mask of every water surface at the SAME
     dimensions as the source (opaque white on transparent),
   - \`${id}-water.json\` — an array of
     \`{ "class": "coast|lake|stream|fall|submerged", "note": "..." }\`.
   The pipeline cuts the water out of the land layer using your mask, so an
   imprecise mask ships as a wrong coastline — trace it carefully. **The mask
   covers the water's ENTIRE painted extent**: surf, wash between shore rocks,
   ripple highlights and reflections are all water. Both rejections so far
   were masks that stopped at the "open water" and left the painted edge zone
   behind as land. No interior holes; smooth boundary at your resolution.
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
fs.mkdirSync(path.dirname(LOCKDIR), { recursive: true });
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
  } else if (redo) {
    if (!fs.existsSync(path.join(cellDir, `${id}-source.png`))) {
      die(`--redo needs an existing ${id}-source.png in ${cellDir}`);
    }
    console.log(`\n  --redo: re-deriving from the existing generation, no dispatch.`);
  } else {
    console.log(`\n  dispatching (bounded: one process, effort=high)...\n`);
    // stale deliverables from an earlier attempt must not survive into this
    // dispatch: a worker that delivers nothing would otherwise leave the
    // pipeline deriving the OLD generation as if it were new (2026-09-01)
    for (const f of ["source.png", "water-source.png", "water.json", "report.json", "concept.png", "l2.png", "water.png"]) {
      fs.rmSync(path.join(cellDir, `${id}-${f}`), { force: true });
    }
    // the runner retries a "model at capacity" refusal (up to 4 attempts,
    // CELL_RETRY_WAIT_S apart, default 120) only while nothing was delivered;
    // every attempt's output is kept in the log
    const runner = path.join(cellDir, `run-${id}.sh`);
    const P = (f) => f.replace(/\\/g, "/");
    fs.writeFileSync(runner, `#!/usr/bin/env bash
set -uo pipefail
cd "${P(ROOT)}"
LOG="${P(path.join(cellDir, `${id}.log`))}"
SRC="${P(path.join(cellDir, `${id}-source.png`))}"
WAIT="\${CELL_RETRY_WAIT_S:-120}"
: > "$LOG"
for attempt in 1 2 3 4; do
  A="$LOG.attempt$attempt"
  echo "=== attempt $attempt $(date -Iseconds) ===" >> "$LOG"
  codex exec \\
    --sandbox workspace-write \\
    -c sandbox_workspace_write.network_access=true \\
    -c model=gpt-5.6-sol \\
    -c model_reasoning_effort=high \\
    "$(cat ${P(path.join(cellDir, `packet-${id}.md`))})" \\
    < /dev/null > "$A" 2>&1
  code=$?
  cat "$A" >> "$LOG"
  if [ $code -ne 0 ] && [ ! -f "$SRC" ] && grep -q 'at capacity' "$A"; then
    echo "attempt $attempt: model at capacity, retrying in \${WAIT}s" | tee -a "$LOG" >&2
    sleep "$WAIT"
    continue
  fi
  exit $code
done
exit 1
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
  let bridgedInfo = [];
  let maskGrown = 0, maskHoles = 0;   // mask completion (owner 2026-09-02)
  const bridgeRects = [];   // gen-space bands where a reroute knowingly orphans
                            // painted water; the fringe ring skips them
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
    const maskUp = await sharp(wsrcFile).ensureAlpha()
      .resize(GEN_PX, GEN_PX, { kernel: "lanczos3" }).raw().toBuffer();
    // the worker's mask is intent, not geometry: binarize so a soft or
    // semi-opaque interior cannot leave half-removed water, then feather the
    // boundary a couple of pixels so the cut edge stays soft
    let bin = new Float32Array(GEN_PX * GEN_PX);
    for (let i = 0; i < GEN_PX * GEN_PX; i++) {
      bin[i] = maskUp[i * 4 + 3] > 128 && maskUp[i * 4] > 128 ? 255 : 0;
    }

    // ---- water bridge (owner-approved 2026-09-01) -----------------------
    // The generator cannot hit spatial pegs, so when this cell's watercourse
    // reaches a shared authored edge within (48..150] px of the neighbour's
    // crossing, the FOOTPRINT is rerouted deterministically inside the seam
    // band to land exactly on the neighbour's crossing — mask-space only, the
    // art is untouched; L3 renders the resulting dogleg. Larger misses, and a
    // crossing with nothing on the other side, still reject at the gate.
    const bridged = [];
    {
      const frames = {
        N: (u, v) => [u, BLEED + v], S: (u, v) => [u, CELL_PX + BLEED - v],
        W: (u, v) => [BLEED + v, u], E: (u, v) => [CELL_PX + BLEED - v, u],
      };
      const getB = (f, u, v) => {
        const [gx, gy] = f(u, v);
        return (gx < 0 || gy < 0 || gx >= GEN_PX || gy >= GEN_PX) ? 0 : bin[gy * GEN_PX + gx];
      };
      const setB = (f, u, v, val) => {
        const [gx, gy] = f(u, v);
        if (gx >= 0 && gy >= 0 && gx < GEN_PX && gy < GEN_PX) bin[gy * GEN_PX + gx] = val;
      };
      const runsAt = (f, v) => {
        const runs = []; let s = -1;
        for (let u = 0; u <= GEN_PX; u++) {
          const w = u < GEN_PX && getB(f, u, v) > 128;
          if (w && s < 0) s = u;
          else if (!w && s >= 0) { if (u - s >= 20) runs.push({ a: s, b: u, c: (s + u) / 2 }); s = -1; }
        }
        return runs;
      };
      for (const nb of authoredNeighbours) {
        const [nc, nr] = nb.cell;
        if (Math.abs(nc - col) + Math.abs(nr - row) !== 1) continue;
        const edge = nc > col ? "E" : nc < col ? "W" : nr > row ? "S" : "N";
        const f = frames[edge];
        // the neighbour's crossings on the shared line, in MY gen-u coords
        const nRaw = await rawOf(path.join(paths.sources, nb.id, `${nb.id}-l2.png`));
        const theirs = [];
        {
          let s = -1;
          for (let u = 0; u <= GEN_PX; u++) {
            let w = false;
            if (u < GEN_PX) {
              const [gx, gy] = f(u, 0);
              const tx = gx + col * CELL_PX - BLEED, ty = gy + row * CELL_PX - BLEED;
              const ngx = tx - (nc * CELL_PX - BLEED), ngy = ty - (nr * CELL_PX - BLEED);
              w = ngx >= 0 && ngy >= 0 && ngx < GEN_PX && ngy < GEN_PX
                && nRaw.data[(ngy * GEN_PX + ngx) * 4 + 3] < 128;
            }
            if (w && s < 0) s = u;
            else if (!w && s >= 0) { if (u - s >= 20) theirs.push({ a: s, b: u, c: (s + u) / 2 }); s = -1; }
          }
        }
        for (const mine of runsAt(f, 0)) {
          const best = theirs.reduce((m, o) => (Math.abs(o.c - mine.c) < Math.abs(m.c - mine.c) ? o : m),
            { c: Infinity, a: 0, b: 0 });
          const d = Math.abs(best.c - mine.c);
          if (d <= 48 || d > 150 || !isFinite(d)) continue;
          const myW = mine.b - mine.a, theirW = best.b - best.a;
          const N = Math.min(240, Math.max(128, Math.round(2 * d)));
          // erase my channel through the band, following it inward and outward
          for (const dir of [1, -1]) {
            let cPrev = mine.c;
            // the outward pass starts one step beyond the line: the inward
            // pass has already cleared v=0, and starting there ended the
            // outward pass at once, leaving the old channel in the bleed
            // (found by the band-read control, 2026-09-01)
            for (let v = dir > 0 ? 0 : -1; dir > 0 ? v <= N : v >= -BLEED; v += dir) {
              const near = runsAt(f, v).filter((r) => Math.abs(r.c - cPrev) <= 90);
              if (!near.length) break;
              for (const r of near) {
                for (let u = Math.max(0, r.a - 20); u < Math.min(GEN_PX, r.b + 20); u++) setB(f, u, v, 0);
              }
              cPrev = near.reduce((m, o) => (Math.abs(o.c - cPrev) < Math.abs(m.c - cPrev) ? o : m)).c;
            }
          }
          // stamp the connector: neighbour's position at the line, easing to
          // my channel's position at depth N, straight through my bleed
          for (let v = -BLEED; v <= N; v++) {
            const t = v <= 0 ? 0 : smooth01(v / N);
            const c = best.c + (mine.c - best.c) * t;
            const hw = Math.max(16, (theirW + (myW - theirW) * t) / 2);
            for (let u = Math.max(0, Math.round(c - hw)); u <= Math.min(GEN_PX - 1, Math.round(c + hw)); u++) {
              setB(f, u, v, 255);
            }
          }
          bridged.push(`${nb.id} edge: rerouted my crossing ${Math.round(mine.c)} -> ${Math.round(best.c)} (${Math.round(d)}px)`);
          const uLo = Math.min(mine.c, best.c) - (Math.max(myW, theirW) / 2 + 60);
          const uHi = Math.max(mine.c, best.c) + (Math.max(myW, theirW) / 2 + 60);
          const [ax, ay] = f(uLo, -BLEED), [bx, by] = f(uHi, N);
          bridgeRects.push({
            x0: Math.max(0, Math.min(ax, bx)), x1: Math.min(GEN_PX, Math.max(ax, bx) + 1),
            y0: Math.max(0, Math.min(ay, by)), y1: Math.min(GEN_PX, Math.max(ay, by) + 1),
          });
        }
      }
      for (const b of bridged) console.log(`  bridge        ${b}`);
      bridgedInfo = bridged;
    }

    // ---- mask completion (owner-directed 2026-09-02, R071) -------------
    // The worker's mask is intent; the paint is the geometry. Grow the mask
    // into CONTIGUOUS opaque pixels the fringe classifier calls water, up to
    // MASK_REACH px from the delivered mask, and fill speckle holes, so a
    // trace that stops a few px short of the shore cannot fail the rings.
    // Dry paint stops the growth: a polyline mask with dry paint between it
    // and the water still fails. Bridge bands are left alone — the bridge
    // knowingly orphans the old channel's paint there.
    {
      const MASK_REACH = 48, HOLE_MAX = 64, N = GEN_PX * GEN_PX;
      const isWet = (o) => {
        const r = concept[o], g = concept[o + 1], b = concept[o + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const sat = mx ? (mx - mn) / mx : 0;
        return isWaterPaint(r, g, b, mx, sat);
      };
      const inBridge = (x, y) => bridgeRects.some((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1);
      const dist = new Int16Array(N).fill(-1);
      let frontier = [];
      for (let y = 0; y < GEN_PX; y++) {
        for (let x = 0; x < GEN_PX; x++) {
          const i = y * GEN_PX + x;
          if (bin[i] < 128) continue;
          dist[i] = 0;
          if ((x > 0 && bin[i - 1] < 128) || (x < GEN_PX - 1 && bin[i + 1] < 128)
            || (y > 0 && bin[i - GEN_PX] < 128) || (y < GEN_PX - 1 && bin[i + GEN_PX] < 128)) frontier.push(i);
        }
      }
      while (frontier.length) {
        const next = [];
        for (const p of frontier) {
          const d = dist[p];
          if (d >= MASK_REACH) continue;
          const px = p % GEN_PX, py = (p - px) / GEN_PX;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const xx = px + dx, yy = py + dy;
              if (xx < 0 || yy < 0 || xx >= GEN_PX || yy >= GEN_PX) continue;
              const j = yy * GEN_PX + xx;
              if (dist[j] >= 0) continue;
              const o = j * 4;
              if (concept[o + 3] <= 250 || !isWet(o) || inBridge(xx, yy)) continue;
              dist[j] = d + 1; bin[j] = 255; maskGrown += 1; next.push(j);
            }
          }
        }
        frontier = next;
      }
      // speckle holes: dry 4-connected components of <= HOLE_MAX px enclosed by water
      const seen = new Uint8Array(N), stack = new Int32Array(N);
      for (let s = 0; s < N; s++) {
        if (bin[s] >= 128 || seen[s]) continue;
        let sp = 0, n = 0, border = false; const members = [];
        stack[sp++] = s; seen[s] = 1;
        while (sp) {
          const p = stack[--sp]; n += 1; if (n <= HOLE_MAX) members.push(p);
          const px = p % GEN_PX, py = (p - px) / GEN_PX;
          if (px === 0 || py === 0 || px === GEN_PX - 1 || py === GEN_PX - 1) border = true;
          if (px > 0) { const j = p - 1; if (bin[j] < 128 && !seen[j]) { seen[j] = 1; stack[sp++] = j; } }
          if (px < GEN_PX - 1) { const j = p + 1; if (bin[j] < 128 && !seen[j]) { seen[j] = 1; stack[sp++] = j; } }
          if (py > 0) { const j = p - GEN_PX; if (bin[j] < 128 && !seen[j]) { seen[j] = 1; stack[sp++] = j; } }
          if (py < GEN_PX - 1) { const j = p + GEN_PX; if (bin[j] < 128 && !seen[j]) { seen[j] = 1; stack[sp++] = j; } }
        }
        if (n <= HOLE_MAX && !border) { for (const p of members) bin[p] = 255; maskHoles += n; }
      }
      if (maskGrown || maskHoles) {
        console.log(`  mask          completed: +${maskGrown} px of painted water beyond the delivered mask, ${maskHoles} px of speckle holes filled`);
      }
    }

    for (let pass = 0; pass < 2; pass++) {
      const R = 2, w = 2 * R + 1, tmp = new Float32Array(GEN_PX * GEN_PX);
      for (let y = 0; y < GEN_PX; y++) for (let x = 0; x < GEN_PX; x++) {
        let acc = 0;
        for (let k = -R; k <= R; k++) acc += bin[y * GEN_PX + Math.min(GEN_PX - 1, Math.max(0, x + k))];
        tmp[y * GEN_PX + x] = acc / w;
      }
      const dst = new Float32Array(GEN_PX * GEN_PX);
      for (let y = 0; y < GEN_PX; y++) for (let x = 0; x < GEN_PX; x++) {
        let acc = 0;
        for (let k = -R; k <= R; k++) acc += tmp[Math.min(GEN_PX - 1, Math.max(0, y + k)) * GEN_PX + x];
        dst[y * GEN_PX + x] = acc / w;
      }
      bin = dst;
    }
    const l2 = Buffer.from(concept);
    const water = Buffer.alloc(GEN_PX * GEN_PX * 4);
    for (let i = 0; i < GEN_PX * GEN_PX; i++) {
      const o = i * 4;
      l2[o + 3] = Math.round(concept[o + 3] * (1 - bin[i] / 255));
      water[o] = water[o + 1] = water[o + 2] = 255;
      water[o + 3] = Math.round(bin[i]);
    }
    const asPng = (buf) => sharp(buf, { raw: { width: GEN_PX, height: GEN_PX, channels: 4 } }).png();
    await asPng(concept).toFile(path.join(cellDir, `${id}-concept.png`));
    await asPng(water).toFile(path.join(cellDir, `${id}-water.png`));
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
  let n = 0, opaque = 0, gsx = 0, gsy = 0, gsm = 0;
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
      gsx += gx; gsy += gy; gsm += mag;
      n += 1;
    }
  }
  const total = bins.reduce((a, b) => a + b, 0);
  const isotropy = total ? Math.max(...bins) / (total / 36) : 0;
  // a baked key light pushes gradient DIRECTIONS one way (first circular
  // moment); landform ridges give +/- pairs that cancel. Calibrated 2026-09-01:
  // canon terrain (seed + accepted cells) 0.0012-0.0036, sunned D05 detail
  // 0.0318 — threshold at the geometric midpoint.
  const keyLight = gsm ? Math.hypot(gsx, gsy) / gsm : 0;

  // rock-only strong-edge moment (owner's lighting concern, 2026-09-01): a
  // consistent lit side on rock faces hides from the key-light moment under
  // millions of grass gradients. Inside non-vegetation, non-water pixels the
  // strong edges (>= 80) carry it: accepted cells 0.04-0.07, canon r1 0.11,
  // the lit seed candidates 0.18-0.27. Threshold 0.15; report-only when the
  // rock sample is too small to mean anything.
  let rockLight = 0, rockN = 0;
  {
    const hsv = (r, g, b) => {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      let h = 0;
      if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
      if (h < 0) h += 360;
      return [h, mx ? d / mx : 0];
    };
    const rock = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (data[i * 4 + 3] < 250) continue;
      const [h, s] = hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      const veg = h >= 45 && h <= 140 && s >= 0.22, water = h >= 150 && h <= 215 && s >= 0.2;
      if (!veg && !water) rock[i] = 1;
    }
    let rx = 0, ry = 0, rm = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const j = y * W + x;
        if (!(rock[j] && rock[j - 1] && rock[j + 1] && rock[j - W] && rock[j + W])) continue;
        const i = j * 4;
        const gx = L(i + 4) - L(i - 4), gy = L(i + W * 4) - L(i - W * 4);
        const mag = Math.hypot(gx, gy);
        if (mag < 80) continue;
        rx += gx; ry += gy; rm += mag; rockN += 1;
      }
    }
    rockLight = rm ? Math.hypot(rx, ry) / rm : 0;
  }

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
        // strict check only where the mask is FULLY water (beyond the cut
        // feather): the land layer must be exactly clear there. Judged on the
        // delivered artefacts, so a --from supply of unremoved water fails.
        if (wm.data[i + 3] === 255 && wm.data[i] > 128) {
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
          if (bridgeRects.some((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1)) continue;
          ringN += 1;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          const sat = mx ? (mx - mn) / mx : 0;
          if (isWaterPaint(r, g, b, mx, sat)) fringe += 1;
        }
      }
    }
  }
  const wetResidualPct = waterInterior ? 100 * wetResidual / waterInterior : 0;
  const fringePct = ringN ? 100 * fringe / ringN : 0;

  // wide ring (owner-approved 2026-09-01): painted water left on land up to
  // 48px beyond the mask. A polyline-authored mask leaves a strip of painted
  // water beside the cut that the 6px ring only sees when the strip touches
  // the mask edge; the rejected c4-2 candidate measured 6.27% here against
  // 0.18% / 0.01% for the accepted cells. Same classifier, same bridge skip.
  let ring48N = 0, ring48F = 0;
  {
    const RW = 48;
    const rowP = new Int32Array(H * (W + 1)), colP = new Int32Array(W * (H + 1));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) rowP[y * (W + 1) + x + 1] = rowP[y * (W + 1) + x] + (isWater(x, y) ? 1 : 0);
    }
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) colP[x * (H + 1) + y + 1] = colP[x * (H + 1) + y] + (isWater(x, y) ? 1 : 0);
    }
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = (y * W + x) * 4;
        if (data[i + 3] <= 250 || isWater(x, y)) continue;
        const x0 = Math.max(0, x - RW), x1 = Math.min(W, x + RW + 1);
        const y0 = Math.max(0, y - RW), y1 = Math.min(H, y + RW + 1);
        const near = (rowP[y * (W + 1) + x1] - rowP[y * (W + 1) + x0]) > 0
          || (colP[x * (H + 1) + y1] - colP[x * (H + 1) + y0]) > 0;
        if (!near) continue;
        if (bridgeRects.some((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1)) continue;
        ring48N += 1;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const sat = mx ? (mx - mn) / mx : 0;
        if (isWaterPaint(r, g, b, mx, sat)) ring48F += 1;
      }
    }
  }
  const ring48Pct = ring48N ? 100 * ring48F / ring48N : 0;

  // water continuity across every shared edge with an authored orthogonal
  // neighbour: a watercourse that crosses the boundary must be met by the
  // neighbour's footprint at the same place, or the rendered water dead-ends
  // at the cell line. Crossing intervals (alpha < 128 runs >= 30 px) on the
  // shared line are matched by centre distance; 48 px (~2.3 m) tolerance.
  const contViolations = [];
  let contChecked = 0;
  {
    const runsOf = (samples, coord0) => {
      const runs = [];
      let s = -1;
      for (let k = 0; k <= samples.length; k++) {
        const w = k < samples.length && samples[k] < 128;
        if (w && s < 0) s = k;
        else if (!w && s >= 0) {
          if (k - s >= 30) runs.push({ a: coord0 + s, b: coord0 + k, c: coord0 + (s + k) / 2 });
          s = -1;
        }
      }
      return runs;
    };
    const nSources = new Map();
    for (const nb of authoredNeighbours) {
      const [nc, nr] = nb.cell;
      if (Math.abs(nc - col) + Math.abs(nr - row) !== 1) continue;
      const nRaw = nSources.get(nb.id)
        ?? (await rawOf(path.join(paths.sources, nb.id, `${nb.id}-l2.png`)));
      nSources.set(nb.id, nRaw);
      const vertical = nr === row;   // shared edge is a vertical line when the neighbour is E/W
      const lineT = vertical
        ? (nc > col ? (col + 1) * CELL_PX : col * CELL_PX)
        : (nr > row ? (row + 1) * CELL_PX : row * CELL_PX);
      const spanT0 = vertical ? row * CELL_PX : col * CELL_PX;
      // Each sample is the MOST water-like alpha within a band across the
      // line (t-8..t+8 perpendicular to it), not the single scanline: a stone
      // lying on the exact shared row split the quarry's stream into two runs
      // under the minimum and hid a real crossing (owner-approved 2026-09-01).
      const BAND = 8;
      const mine = new Uint8Array(CELL_PX), theirs = new Uint8Array(CELL_PX);
      for (let k = 0; k < CELL_PX; k++) {
        let mMin = 255, tMin = 255;
        for (let d = -BAND; d <= BAND; d++) {
          const tx = vertical ? lineT + d : spanT0 + k;
          const ty = vertical ? spanT0 + k : lineT + d;
          const mg = [tx - (col * CELL_PX - BLEED), ty - (row * CELL_PX - BLEED)];
          const ng = [tx - (nc * CELL_PX - BLEED), ty - (nr * CELL_PX - BLEED)];
          if (mg[0] >= 0 && mg[1] >= 0 && mg[0] < GEN_PX && mg[1] < GEN_PX) {
            mMin = Math.min(mMin, data[(mg[1] * GEN_PX + mg[0]) * 4 + 3]);
          }
          if (ng[0] >= 0 && ng[1] >= 0 && ng[0] < GEN_PX && ng[1] < GEN_PX) {
            tMin = Math.min(tMin, nRaw.data[(ng[1] * GEN_PX + ng[0]) * 4 + 3]);
          }
        }
        mine[k] = mMin;
        theirs[k] = tMin;
      }
      const rm = runsOf(mine, spanT0), rt = runsOf(theirs, spanT0);
      contChecked += rm.length + rt.length;
      for (const [from, to, who] of [[rm, rt, "mine"], [rt, rm, "neighbour"]]) {
        for (const r of from) {
          const best = to.reduce((m, o) => Math.min(m, Math.abs(o.c - r.c)), Infinity);
          if (best > 48) {
            contViolations.push(`${nb.id} edge: ${who === "mine" ? "my" : "their"} crossing at `
              + `${Math.round(r.c)} (width ${Math.round(r.b - r.a)}) unmet, nearest ${best === Infinity ? "none" : Math.round(best) + "px"}`);
          }
        }
      }
    }
  }

  // palette conformance at each authored seam: vegetation medians of the two
  // 16..176px bands beside the shared line must agree. Calibrated on the
  // owner's eye: FINE at dBG 0.109 / dLuma 4.5 (2026-09-01) and at 0.189 / 4.6
  // (2026-09-02, 3,1 candidate 3: "way too harsh"); CLASH at 0.294 / 14.6
  // (2026-09-01) and at 0.218 / 2.8 ("close but a few seam issues") —
  // thresholds between the fine and clash points.
  const palViolations = [];
  let palWorst = { bg: 0, luma: 0 }, palSeams = 0;
  let toneWorst = 0, toneSeams = 0;   // all-land tone step (owner 2026-09-02)
  {
    // vegetation median of the 16..176px band just inside `edge` of a canvas
    const vegBand = (buf, edge) => {
      const rs = [], gs = [], bs = [];
      for (let t = 256; t < 2304; t += 2) {
        for (let o = 16; o <= 176; o += 2) {
          let gx, gy;
          if (edge === "N") { gx = t; gy = BLEED + o; }
          else if (edge === "S") { gx = t; gy = CELL_PX + BLEED - o; }
          else if (edge === "W") { gy = t; gx = BLEED + o; }
          else { gy = t; gx = CELL_PX + BLEED - o; }
          const i = (gy * GEN_PX + gx) * 4;
          if (buf[i + 3] < 250) continue;
          const [r, g, b] = [buf[i], buf[i + 1], buf[i + 2]];
          if (g > r && g > b && g > 60) { rs.push(r); gs.push(g); bs.push(b); }
        }
      }
      if (rs.length < 500) return null;
      const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
      const r = med(rs), g = med(gs), b = med(bs);
      return { bg: b / g, luma: 0.2126 * r + 0.7152 * g + 0.0722 * b };
    };
    // the same band over ALL opaque land: a moor's olive is not vegetation to
    // the classifier above, and a stark tone step on it passed as "no
    // vegetated seams" (owner 2026-09-02: "the seams are stark here")
    const toneBand = (buf, edge) => {
      const ls = [];
      for (let t = 256; t < 2304; t += 2) {
        for (let o = 16; o <= 176; o += 2) {
          let gx, gy;
          if (edge === "N") { gx = t; gy = BLEED + o; }
          else if (edge === "S") { gx = t; gy = CELL_PX + BLEED - o; }
          else if (edge === "W") { gy = t; gx = BLEED + o; }
          else { gy = t; gx = CELL_PX + BLEED - o; }
          const i = (gy * GEN_PX + gx) * 4;
          if (buf[i + 3] < 250) continue;
          ls.push(0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]);
        }
      }
      if (ls.length < 500) return null;
      ls.sort((p, q) => p - q);
      return { luma: ls[ls.length >> 1] };
    };
    for (const nb of authoredNeighbours) {
      const [nc, nr] = nb.cell;
      if (Math.abs(nc - col) + Math.abs(nr - row) !== 1) continue;
      const edge = nc > col ? "E" : nc < col ? "W" : nr > row ? "S" : "N";
      const opp = { E: "W", W: "E", N: "S", S: "N" }[edge];
      const nRaw = await rawOf(path.join(paths.sources, nb.id, `${nb.id}-l2.png`));
      const mine = vegBand(data, edge);
      const theirs = vegBand(nRaw.data, opp);
      const tMine = toneBand(data, edge), tTheirs = toneBand(nRaw.data, opp);
      if (tMine && tTheirs) {
        const dT = Math.abs(tMine.luma - tTheirs.luma);
        toneWorst = Math.max(toneWorst, dT); toneSeams += 1;
        if (dT > 20) {
          palViolations.push(`${nb.id} seam: tone dLuma ${dT.toFixed(1)} on all land (limit 20; accepted seams read 2.3-17.4, the stark one 24.5)`);
        }
      }
      if (!mine || !theirs) continue;
      palSeams += 1;
      const dBG = Math.abs(mine.bg - theirs.bg), dL = Math.abs(mine.luma - theirs.luma);
      palWorst = { bg: Math.max(palWorst.bg, dBG), luma: Math.max(palWorst.luma, dL) };
      if (dBG > 0.20 || dL > 13) {
        palViolations.push(`${nb.id} seam: dBG ${dBG.toFixed(3)} dLuma ${dL.toFixed(1)}`);
      }
    }
  }
  for (const v of palViolations) console.log(`      palette: ${v}`);

  const gates = [
    { name: "key-light asymmetry", value: +keyLight.toFixed(4), pass: keyLight < 0.011,
      note: "first circular moment of luminance gradients; a baked sun measures ~0.03, canon terrain <=0.004" },
    { name: "gradient ratio", value: +isotropy.toFixed(3) + " (reported)", pass: true,
      note: "orientation concentration; the accepted seed itself measures 1.444, so this cannot gate" },
    { name: "rock lighting", value: rockN < 5000 ? `${rockLight.toFixed(3)} (n ${rockN}, report-only)` : +rockLight.toFixed(3),
      pass: rockN < 5000 || rockLight < 0.15,
      note: "first circular moment of strong (>=80) luminance gradients inside rock only; a consistent lit side measures 0.18-0.27, accepted cells 0.04-0.07" },
    { name: "land coverage", value: +(100 * opaque / (W * H)).toFixed(1) + "%", pass: opaque > 0 },
    { name: "water cut clear", value: wetResidual === 0 ? "0 px" : `${wetResidual} px (${wetResidualPct.toFixed(2)}%)`,
      pass: wetResidual === 0,
      note: "paint surviving where the mask is fully water; exact zero by construction for pipeline-derived cells" },
    { name: "mask completion", value: `+${maskGrown} px grown, ${maskHoles} px holes filled (reported)`, pass: true,
      note: "the delivered mask grown into contiguous painted water within 48 px and speckle holes <=64 px filled before the cut (owner 2026-09-02); dry paint stops the growth, so a polyline mask still fails the rings" },
    { name: "water fringe", value: +fringePct.toFixed(2) + "%", pass: fringePct < 1,
      note: "blue-leaning opaque pixels in the 6px ring outside water zones; threshold calibrated on the first two accepted cells (0.0%, 0.22%)" },
    { name: "water fringe (48px)", value: +ring48Pct.toFixed(2) + "%", pass: ring48Pct < 1,
      note: "same classifier within 48px of water zones; catches painted water a polyline mask left beside the cut (accepted 0.18% / 0.01%, rejected candidate 6.27%)" },
    { name: "water continuity", value: contViolations.length
        ? `${contViolations.length} unmet crossing(s)` : `ok (${contChecked} crossings checked${bridgedInfo.length ? `, ${bridgedInfo.length} bridged` : ""})`,
      pass: contViolations.length === 0,
      note: "every watercourse crossing a shared authored edge must be met by the neighbour within 48px; 48..150px gaps are bridged in the footprint" },
    { name: "palette conformance", value: (palSeams || toneSeams)
        ? `${palSeams ? `veg worst dBG ${palWorst.bg.toFixed(3)} dLuma ${palWorst.luma.toFixed(1)} over ${palSeams} seam(s); ` : "no vegetated seams; "}tone worst dLuma ${toneWorst.toFixed(1)} on all land over ${toneSeams} seam(s)`
        : "no authored seams", pass: palViolations.length === 0,
      note: "vegetation medians of the bands beside each authored seam; calibrated on the owner's eye: fine 0.109 and 0.189, clash 0.218 and 0.294; thresholds 0.20/13" },
  ];
  for (const v of contViolations) console.log(`      continuity: ${v}`);
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
    bridged: bridgedInfo.length ? bridgedInfo : undefined,
    maskCompletion: (maskGrown || maskHoles) ? { grownPx: maskGrown, holePx: maskHoles } : undefined,
    biome: biomeId,
    source: srcDir.replace(/\\/g, "/"),
    stitch: { order: existing?.stitch?.order ?? Object.keys(ledger.cells).length + 1,
      tiles: result.counts.map((c) => c.tiles) },
  };
  saveLedger(paths, plan, ledger);
  console.log(`\n  cell ${id} accepted, stitched, and recorded in ${paths.manifest}\n`);
} finally {
  try { fs.rmdirSync(LOCKDIR); } catch { /* held only during dispatch+stitch */ }
}
