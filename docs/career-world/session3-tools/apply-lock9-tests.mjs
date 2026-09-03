// Lock change 9 controls, written BEFORE the pipeline change (tests/ is not in the
// solidified set). Three controls: a crown straddling the shared line on one paint
// only must come through whole or not at all; --restitch rebuilds an accepted cell
// byte-identically with no dispatch and no gates and refuses an unauthored cell;
// the manifest records the content-aware seam contract. All three FAIL on the
// current pipeline (the fixed seam cuts the crown; --restitch does not exist).
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
const CONTROLS = `// ---- content-aware seams (owner 2026-09-02, lock change 9) ----------------------
// The stitch's boundary between two AUTHORED cells follows the minimum-error path
// through the two paints instead of a fixed wiggle. Control: one dark crown painted
// on ONE cell's canvas, centred exactly on the boundary the pipeline itself drew
// against the plain neighbour (read from its own binding map), so a fixed line
// must cut it. Verified on the stitched tiles, not on any preview.
const ENV = { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" };
async function worldPixel(tiles, x, y) {
  const k = \`\${x >> 8},\${y >> 8}\`;
  if (!tiles.has(k)) tiles.set(k, await tileRaw(0, x >> 8, y >> 8));
  const d = tiles.get(k), o = ((y & 255) * TILE + (x & 255)) * 4;
  return [d[o], d[o + 1], d[o + 2], d[o + 3]];
}
test("a crown straddling the shared line on one paint only comes through whole or not at all (lock change 9)", async () => {
  await writeArtefacts(path.join(SYN, "row2-a"), "c1-2", genImage(1, 2, F));
  runCell("1,2", path.join(SYN, "row2-a"));
  // the pipeline's own boundary against c1-2, from the dry run's binding map
  execFileSync(process.execPath, [SCRIPT, "--cell", "2,2", "--dry-run"], ENV);
  const bind = await sharp(path.join(WORKT, "c2-2", "context", "binding.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const wx0 = 2 * CELL - BLEED, wy0 = 2 * CELL - BLEED, W = bind.info.width;
  const yMid = 2 * CELL + 1024, v = yMid - wy0;
  let bx = -1;
  for (let u = 0; u < W; u++) if (bind.data[(v * W + u) * 4] === 255) { bx = wx0 + u; break; }
  assert.ok(bx > 2 * CELL - 160 && bx < 2 * CELL + 160, \`the geometric boundary sits inside the tab reach: \${bx}\`);
  // c2-2 continues F byte-exact, plus one crown of radius 70 centred on that boundary
  const R = 70;
  await writeArtefacts(path.join(SYN, "row2-b"), "c2-2", genImage(2, 2, F, { disc: [bx, yMid, R] }));
  runCell("2,2", path.join(SYN, "row2-b"));
  const tiles = new Map();
  let inside = 0, crown = 0, third = 0, gap = 0;
  for (let y = yMid - R; y <= yMid + R; y++) for (let x = bx - R; x <= bx + R; x++) {
    if (Math.hypot(x - bx, y - yMid) >= R - 12) continue;          // 12 px inside the crown's edge, past the 8 px feather
    inside += 1;
    const [r, g, b, a] = await worldPixel(tiles, x, y);
    if (a !== 255) gap += 1;
    const f = F(x, y);
    if (r < 45 && g < 45 && b < 45) crown += 1;
    else if (Math.abs(r - f[0]) > 2 || Math.abs(g - f[1]) > 2 || Math.abs(b - f[2]) > 2) third += 1;
  }
  assert.equal(gap, 0, "the band stays opaque");
  assert.equal(third, 0, "inside the crown every pixel is the crown or the plain paint, never a blend of the two");
  const share = crown / inside;
  assert.ok(share > 0.97 || share < 0.03, \`the crown must be whole or absent, not cut: \${(share * 100).toFixed(1)}% of it shows\`);
  // the paint beyond the tab reach is untouched on both sides
  for (const [x, y] of [[2 * CELL - 200, yMid], [2 * CELL + 200, yMid + 300], [2 * CELL - 170, yMid - 900]]) {
    const [r, g, b] = await worldPixel(tiles, x, y);
    assert.deepEqual([r, g, b], F(x, y).slice(0, 3), \`pure F at \${x},\${y}\`);
  }
});

test("--restitch rebuilds an accepted cell's tiles from its sources with no dispatch and no gates, byte-identically, and refuses an unauthored cell", () => {
  const before = treeHash();
  const log = execFileSync(process.execPath, [SCRIPT, "--cell", "2,2", "--restitch"], ENV);
  assert.equal(treeHash(), before, "the same sources and the same seams reproduce the same tiles");
  assert.match(log, /total 0 written/);
  assert.doesNotMatch(log, /gates:/, "no gate runs on a restitch: the acceptance stands");
  let refused = "";
  try { execFileSync(process.execPath, [SCRIPT, "--cell", "3,2", "--restitch"], { ...ENV, stdio: "pipe" }); }
  catch (e) { refused = String(e.stderr || e.message); }
  assert.match(refused, /not authored/, "an unauthored cell has nothing to restitch");
});

`;
patch("tests/world-authoring-stitch.test.mjs", [
  ["genImage takes a crown",
    `function genImage(col, row, paint, { waterDisc, keepWaterPaint, paintedRing, hazeArc, violetRing } = {}) {`,
    `function genImage(col, row, paint, { waterDisc, keepWaterPaint, paintedRing, hazeArc, violetRing, disc } = {}) {`],
  ["the crown is painted",
    `      concept[o + 2] = l2[o + 2] = b; concept[o + 3] = l2[o + 3] = a;
      if (waterDisc) {`,
    `      concept[o + 2] = l2[o + 2] = b; concept[o + 3] = l2[o + 3] = a;
      if (disc && Math.hypot(ox + u - disc[0], oy + v - disc[1]) < disc[2]) {
        // one dark crown, opaque, on the concept and the shipped l2 alike
        concept[o] = l2[o] = 30; concept[o + 1] = l2[o + 1] = 32; concept[o + 2] = l2[o + 2] = 28;
      }
      if (waterDisc) {`],
  ["controls before the manifest test",
    `test("manifest records the contract and both cells", () => {`,
    `${CONTROLS}test("manifest records the contract and both cells", () => {`],
  ["manifest records the seam contract",
    `  assert.equal(m.contract.keptPx, 2048);`,
    `  assert.equal(m.contract.keptPx, 2048);
  assert.equal(m.contract.seam.contentAware?.bandPx, 128, "the manifest records how seams are drawn (lock change 9)");`],
  ["scratch cleanup covers row 2",
    `  for (const id of ["c1-1", "c2-1", "c3-1", "c4-1"]) {`,
    `  for (const id of ["c1-1", "c2-1", "c3-1", "c4-1", "c1-2", "c2-2"]) {`],
]);
