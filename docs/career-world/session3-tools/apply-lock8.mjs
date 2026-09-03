// Lock change 8 (STAGED, only if the owner rules 2,0 candidate 4 acceptable by eye):
// recalibrate two limits on the owner's eye — rock lighting 0.15 -> 0.16 and the
// all-land seam tone 20 -> 21 — so a candidate within the noise of both (R106:
// 0.153 and 20.0) can be re-derived and stitched. Anchored on exact current text.
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
patch("tools/world-authoring/cell.mjs", [
  ["rock limit",
    `      pass: rockN < 5000 || rockLight < 0.15,
      note: "first circular moment of strong (>=80) luminance gradients inside rock only; a consistent lit side measures 0.18-0.27, accepted cells 0.04-0.07" },`,
    `      pass: rockN < 5000 || rockLight < 0.16,
      note: "first circular moment of strong (>=80) luminance gradients inside rock only; a consistent lit side measures 0.18-0.27, accepted cells 0.04-0.14; limit 0.16 on the owner's eye (2026-09-02, the dark-forest gorge at 0.153)" },`],
  ["tone limit",
    `        if (dT > 20) {
          palViolations.push(\`\${nb.id} seam: tone dLuma \${dT.toFixed(1)} on all land (limit 20; accepted seams read 2.3-17.4, the stark one 24.5)\`);`,
    `        if (dT > 21) {
          palViolations.push(\`\${nb.id} seam: tone dLuma \${dT.toFixed(1)} on all land (limit 21; accepted seams read 2.3-20.0, the stark one 24.5)\`);`],
]);
patch("tests/world-authoring-stitch.test.mjs", [
  ["tone control lift stays over the limit",
    `const lifted = (x, y) => { const [r, g, b, a] = G(x, y); const inWest = x - (2 * CELL) < CELL / 3; const k = inWest ? 30 : 0;`,
    `const lifted = (x, y) => { const [r, g, b, a] = G(x, y); const inWest = x - (2 * CELL) < CELL / 3; const k = inWest ? 34 : 0;`],
]);
