// Lock change 9 (owner 2026-09-02: "if you think its needed go ahead" / "min cut is
// fine here"): content-aware seams between authored cells, and --restitch.
// Anchored on exact current text of tools/world-authoring/cell.mjs; --check verifies
// the anchors without writing. Run ONLY after the owner's approval is recorded.
import fs from "node:fs";
const CHECK = process.argv.includes("--check");
function patch(file, edits) {
  let t = fs.readFileSync(file, "utf8"); const done = [];
  for (const [name, from, to] of edits) {
    const n = t.split(from).length - 1;
    if (n !== 1) throw new Error(`${file} ${name}: anchor matched ${n} times, expected 1`);
    t = t.replace(from, to); done.push(name);
  }
  if (CHECK) { console.log(file, "anchors ok:", done.join("; ")); return; }
  fs.writeFileSync(file, t); console.log(file, "applied:", done.join("; "));
}
const CONTENT_SEAMS = `// ------------------------------------------- content-aware seams ---------
// Between two AUTHORED cells the boundary is derived from the two l2 sources
// (lock change 9, owner 2026-09-02): a dynamic programme down the shared edge,
// one row (or column) at a time, choosing where the cut crosses so the paint
// difference it walks through is least — image quilting's minimum-error cut.
// Both paints cover the whole band (each canvas carries a 256 px bleed), so the
// cut can run through open ground where the paints agree instead of through
// whatever a fixed wiggle happened to straddle (a crown, a stub: R108). Pinned
// to the jittered corners by a tapered envelope so the perpendicular seams
// agree at every corner; +-1 px per step; deterministic from the two sources
// alone, so both cells derive the same boundary. Edges to unauthored ground
// keep the geometric wiggle (nothing to compare against).
function paintDiff(A, ai, B, bi) {
  const aa = A.data[ai + 3], ba = B.data[bi + 3];
  if (aa < 128 && ba < 128) return 0;          // both cut (water): nothing to see
  if (aa < 128 || ba < 128) return 255;        // a water-cut mismatch: never cross it
  const dr = A.data[ai] - B.data[bi], dg = A.data[ai + 1] - B.data[bi + 1], db = A.data[ai + 2] - B.data[bi + 2];
  return Math.sqrt((dr * dr + dg * dg + db * db) / 3);
}
function cutBoundary(A, aOrigin, B, bOrigin, along0, across0, vertical, base) {
  const K = 2 * SEAM_BAND + 1, N = CELL_PX;
  const cost = (i, k) => {
    const s = along0 + i, c = across0 + k - SEAM_BAND;
    const x = vertical ? c : s, y = vertical ? s : c;
    return paintDiff(A, ((y - aOrigin[1]) * A.width + (x - aOrigin[0])) * 4,
      B, ((y - bOrigin[1]) * B.width + (x - bOrigin[0])) * 4);
  };
  // the envelope: the corner interpolation +- SEAM_BAND * taper, so the cut is
  // pinned at both corners and free in the middle
  const allowed = (i, k) => {
    const t = (i + 0.5) / N;
    return Math.abs(k - SEAM_BAND - base(t)) <= SEAM_BAND * taper(t) + 0.5;
  };
  const dp = new Float64Array(K * N).fill(Infinity), from = new Int16Array(K * N);
  for (let k = 0; k < K; k++) if (allowed(0, k)) dp[k] = cost(0, k);
  for (let i = 1; i < N; i++) {
    for (let k = 0; k < K; k++) {
      if (!allowed(i, k)) continue;
      let best = Infinity, bk = -1;
      for (let d = -1; d <= 1; d++) {
        const kk = k + d;
        if (kk < 0 || kk >= K) continue;
        const v = dp[(i - 1) * K + kk] + (d ? SEAM_STEP : 0);
        if (v < best) { best = v; bk = kk; }
      }
      if (bk < 0) continue;
      dp[i * K + k] = best + cost(i, k); from[i * K + k] = bk;
    }
  }
  let k = 0, bestV = Infinity;
  for (let kk = 0; kk < K; kk++) { const v = dp[(N - 1) * K + kk]; if (v < bestV) { bestV = v; k = kk; } }
  const out = new Float32Array(N);
  for (let i = N - 1; i >= 0; i--) { out[i] = k - SEAM_BAND; if (i > 0) k = from[i * K + k]; }
  return out;
}
async function contentSeams(seam, authored, sourceOf, win, gridW, gridH) {
  const COLS = Math.round(gridW / CELL_PX), ROWS = Math.round(gridH / CELL_PX);
  const near = (a0, a1, w0, w1) => a1 > w0 - TILE && a0 < w1 + TILE;
  for (let b = 1; b < COLS; b++) {
    for (let rr = 0; rr < ROWS; rr++) {
      const key = \`V:\${b}:\${rr}\`, L = \`c\${b - 1}-\${rr}\`, R = \`c\${b}-\${rr}\`;
      if (seam.hasBoundary(key) || !authored.has(L) || !authored.has(R)) continue;
      if (!near(b * CELL_PX - TAB_REACH, b * CELL_PX + TAB_REACH, win.x0, win.x1)
        || !near(rr * CELL_PX, (rr + 1) * CELL_PX, win.y0, win.y1)) continue;
      const A = await sourceOf(L, "l2"), B = await sourceOf(R, "l2");
      seam.setBoundary(key, cutBoundary(A, [(b - 1) * CELL_PX - BLEED, rr * CELL_PX - BLEED],
        B, [b * CELL_PX - BLEED, rr * CELL_PX - BLEED], rr * CELL_PX, b * CELL_PX, true,
        (t) => seam.vBase(b, rr, t)));
    }
  }
  for (let b = 1; b < ROWS; b++) {
    for (let cc = 0; cc < COLS; cc++) {
      const key = \`H:\${b}:\${cc}\`, T = \`c\${cc}-\${b - 1}\`, D = \`c\${cc}-\${b}\`;
      if (seam.hasBoundary(key) || !authored.has(T) || !authored.has(D)) continue;
      if (!near(cc * CELL_PX, (cc + 1) * CELL_PX, win.x0, win.x1)
        || !near(b * CELL_PX - TAB_REACH, b * CELL_PX + TAB_REACH, win.y0, win.y1)) continue;
      const A = await sourceOf(T, "l2"), B = await sourceOf(D, "l2");
      seam.setBoundary(key, cutBoundary(A, [cc * CELL_PX - BLEED, (b - 1) * CELL_PX - BLEED],
        B, [cc * CELL_PX - BLEED, b * CELL_PX - BLEED], cc * CELL_PX, b * CELL_PX, false,
        (t) => seam.hBase(b, cc, t)));
    }
  }
}

`;
const RESTITCH = `// --restitch (lock change 9): rebuild an ACCEPTED cell's tiles from its recorded
// sources — no dispatch, no gates, the acceptance stands. Every stitch recomputes
// each dirty tile from sources, so a seam rule that changes is carried through
// the world by restitching each cell, deterministically and without a bake.
if (restitch) {
  if (!existing) die(\`cell \${id} is not authored — nothing to restitch. --restitch rebuilds an accepted cell's tiles from its recorded sources.\`);
  fs.mkdirSync(path.dirname(LOCKDIR), { recursive: true });
  try {
    fs.mkdirSync(LOCKDIR, { recursive: false });
  } catch {
    die(\`another cell run holds \${LOCKDIR} — one at a time. If no run is alive, remove the directory.\`);
  }
  try {
    console.log(\`\\n  --restitch: rebuilding \${id}'s tiles from \${existing.source} — no dispatch, no gates.\`);
    const result = await stitchAndPropagate(plan, seam, paths, ledger, id);
    for (const c of result.counts) {
      console.log(\`    L\${c.level}  \${String(c.tiles).padStart(4)} dirty  \${String(c.written).padStart(4)} written\`);
    }
    console.log(\`    total \${result.written} written, \${result.unchanged} byte-identical\`);
    ledger.cells[id].stitch = { ...ledger.cells[id].stitch, tiles: result.counts.map((c) => c.tiles), restitchedAt: new Date().toISOString() };
    saveLedger(paths, plan, ledger);
    console.log(\`\\n  cell \${id} restitched and recorded in \${paths.manifest}\\n\`);
  } finally {
    try { fs.rmdirSync(LOCKDIR); } catch { /* released */ }
  }
  process.exit(0);
}

`;
patch("tools/world-authoring/cell.mjs", [
  ["seam constants",
    `const TAB_REACH = TAB_CORNER + TAB_WIGGLE + FEATHER * 4;   // < BLEED by design`,
    `const TAB_REACH = TAB_CORNER + TAB_WIGGLE + FEATHER * 4;   // < BLEED by design
// content-aware seams (lock change 9, owner 2026-09-02): between two AUTHORED
// cells the boundary follows the minimum-error path through the two paints,
// inside +-SEAM_BAND px of the nominal line, pinned to the jittered corners
const SEAM_BAND = 128;                    // < TAB_REACH - FEATHER * 4
const SEAM_STEP = 2;                      // lateral-step penalty, luma-ish units`],
  ["args: --restitch",
    `                                  // without dispatching a new generation
  };`,
    `                                  // without dispatching a new generation
    restitch: a.includes("--restitch"),   // rebuild an ACCEPTED cell's tiles from
                                  // its recorded sources: no dispatch, no gates
  };`],
  ["makeSeam: boundaries and bases",
    `  // x-offset of the vertical boundary at column index b (between cols b-1, b),
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
  }`,
    `  // a derived boundary per edge shared by two authored cells (content-aware
  // seams, lock change 9): offsets from the nominal line, one per px along it
  const boundaries = new Map();
  const vBase = (b, rr, t) => J(b, rr)[0] * (1 - smooth01(t)) + J(b, rr + 1)[0] * smooth01(t);
  const hBase = (b, cc, t) => J(cc, b)[1] * (1 - smooth01(t)) + J(cc + 1, b)[1] * smooth01(t);
  // x-offset of the vertical boundary at column index b (between cols b-1, b),
  // evaluated at territory y
  function vOffset(b, y) {
    const rr = Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL_PX)));
    const cut = boundaries.get(\`V:\${b}:\${rr}\`);
    if (cut) return cut[Math.min(CELL_PX - 1, Math.max(0, Math.floor(y - rr * CELL_PX)))];
    const t = Math.min(1, Math.max(0, (y - rr * CELL_PX) / CELL_PX));
    return vBase(b, rr, t) + wiggle([b - 1, rr], [b, rr])(t) * taper(t);
  }
  function hOffset(b, x) {
    const cc = Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL_PX)));
    const cut = boundaries.get(\`H:\${b}:\${cc}\`);
    if (cut) return cut[Math.min(CELL_PX - 1, Math.max(0, Math.floor(x - cc * CELL_PX)))];
    const t = Math.min(1, Math.max(0, (x - cc * CELL_PX) / CELL_PX));
    return hBase(b, cc, t) + wiggle([cc, b - 1], [cc, b])(t) * taper(t);
  }`],
  ["makeSeam: return",
    `  return { owner, COLS, ROWS };
}`,
    `  return { owner, COLS, ROWS, vBase, hBase,
    setBoundary: (key, offsets) => boundaries.set(key, offsets),
    hasBoundary: (key) => boundaries.has(key) };
}`],
  ["content seams before the stitch driver",
    `async function stitchAndPropagate(plan, seam, paths, ledger, id) {`,
    `${CONTENT_SEAMS}async function stitchAndPropagate(plan, seam, paths, ledger, id) {`],
  ["stitch derives the seams first",
    `  const sourceOf = makeSourceOf(paths);

  let written = 0, unchanged = 0;`,
    `  const sourceOf = makeSourceOf(paths);
  await contentSeams(seam, authored, sourceOf, win, gridW, gridH);

  let written = 0, unchanged = 0;`],
  ["conditioning derives the seams first",
    `  const ctxSourceOf = makeSourceOf(paths);`,
    `  const ctxSourceOf = makeSourceOf(paths);
  await contentSeams(seam, authoredSet, ctxSourceOf, win, gridW, gridH);`],
  ["manifest contract",
    `      seam: { cornerJitterPx: TAB_CORNER, wigglePx: TAB_WIGGLE, featherPx: FEATHER },`,
    `      seam: { cornerJitterPx: TAB_CORNER, wigglePx: TAB_WIGGLE, featherPx: FEATHER,
        contentAware: { bandPx: SEAM_BAND, stepPenalty: SEAM_STEP,
          cost: "l2 RGB rms per pixel; a water-cut mismatch costs 255",
          between: "authored cells only; edges to unauthored ground keep the wiggle" } },`],
  ["main: args",
    `const { col, row, describe, from, dryRun, force, redo } = args();`,
    `const { col, row, describe, from, dryRun, force, redo, restitch } = args();`],
  ["main: describe not needed for a restitch",
    `if (!describe && !dryRun) {`,
    `if (!describe && !dryRun && !restitch) {`],
  ["main: an authored cell may be restitched",
    `if (existing && !force && !dryRun) {`,
    `if (existing && !force && !dryRun && !restitch) {`],
  ["main: the restitch branch",
    `// what this cell owes the world, pulled from the plan rather than restated`,
    `${RESTITCH}// what this cell owes the world, pulled from the plan rather than restated`],
]);
