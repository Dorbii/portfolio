// The crown control must own its cells: the stream tests already author c1-2 and
// c2-2 (a stream cut at y 5120), and a runCell on an authored cell exits 0 without
// stitching — so the control moves to row 3 and asserts its own stitches happened.
import fs from "node:fs";
const p = "tests/world-authoring-stitch.test.mjs"; let t = fs.readFileSync(p, "utf8");
const start = t.indexOf("// ---- content-aware seams (owner 2026-09-02, lock change 9)");
const end = t.indexOf('test("manifest records the contract and both cells"');
if (start < 0 || end < 0) throw new Error("region not found");
let r = t.slice(start, end);
const reps = [
  ['"row2-a"', '"row3-a"'], ['"row2-b"', '"row3-b"'],
  ['"c1-2", genImage(1, 2, F)', '"c1-3", genImage(1, 3, F)'], ['runCell("1,2"', 'runCell("1,3"'],
  ['"--cell", "2,2", "--dry-run"', '"--cell", "2,3", "--dry-run"'], ['"c2-2", "context", "binding.png"', '"c2-3", "context", "binding.png"'],
  ['const wx0 = 2 * CELL - BLEED, wy0 = 2 * CELL - BLEED, W = bind.info.width;', 'const wx0 = 2 * CELL - BLEED, wy0 = 3 * CELL - BLEED, W = bind.info.width;'],
  ['const yMid = 2 * CELL + 1024, v = yMid - wy0;', 'const yMid = 3 * CELL + 1024, v = yMid - wy0;'],
  ['"c2-2", genImage(2, 2, F, { disc: [bx, yMid, R] })', '"c2-3", genImage(2, 3, F, { disc: [bx, yMid, R] })'],
  ['runCell("2,2", path.join(SYN, "row3-b"));', 'const logB = runCell("2,3", path.join(SYN, "row3-b"));\n  assert.match(logB, /accepted, stitched/, "the crown cell must actually stitch (an already-authored cell exits 0 untouched)");'],
  ['runCell("1,3", path.join(SYN, "row3-a"));', 'const logA = runCell("1,3", path.join(SYN, "row3-a"));\n  assert.match(logA, /accepted, stitched/, "the plain cell must actually stitch");'],
  ['"--cell", "2,2", "--restitch"', '"--cell", "2,3", "--restitch"'], ['"--cell", "3,2", "--restitch"', '"--cell", "3,3", "--restitch"'],
  ['c2-2 continues F byte-exact', 'c2-3 continues F byte-exact'], ['against c1-2, from the dry run', 'against c1-3, from the dry run'],
];
for (const [a, b] of reps) { const n = r.split(a).length - 1; const multi = a === '"row2-a"' || a === '"row2-b"'; if (n < 1 || (!multi && n !== 1)) throw new Error(`${n} matches for: ${a}`); r = r.split(a).join(b); }
t = t.slice(0, start) + r + t.slice(end);
const cl = '  for (const id of ["c1-1", "c2-1", "c3-1", "c4-1", "c1-2", "c2-2"]) {';
if (!t.includes(cl)) throw new Error("cleanup anchor"); t = t.replace(cl, '  for (const id of ["c1-1", "c2-1", "c3-1", "c4-1", "c1-3", "c2-3"]) {');
fs.writeFileSync(p, t); console.log("crown control moved to row 3 with stitch assertions");
