// Lock change 7 — the water-paint classifier used by the fringe rings and the mask
// growth gains a hue window (150..225, cyan to blue): violet and magenta ground is
// no longer "water" to the water tools (R093: the purple field read 14-17% fringe
// on violet ground; hue-limited it reads 0.12/0.03%; accepted cells unchanged).
// Anchored on exact current text; --check verifies and writes nothing.
import fs from "node:fs";
const CHECK = process.argv.includes("--check");
function patch(file, edits) {
  let t = fs.readFileSync(file, "utf8"); const done = [];
  for (const [name, from, to, count = 1] of edits) {
    const n = t.split(from).length - 1;
    if (n !== count) throw new Error(`${file} ${name}: anchor matched ${n} times, expected ${count}`);
    t = t.split(from).join(to); done.push(`${name} x${n}`);
  }
  if (CHECK) { console.log(file, "anchors ok:", done.join("; ")); return; }
  fs.writeFileSync(file, t); console.log(file, "applied:", done.join("; "));
}

patch("tools/world-authoring/cell.mjs", [
  ["helper beside EDIT_GREY",
    `const EDIT_GREY = [96, 104, 88];          // unpainted area of an edit target (neutral, mid-value)`,
    `const EDIT_GREY = [96, 104, 88];          // unpainted area of an edit target (neutral, mid-value)
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
}`],
  ["growth isWet",
    `        return mx > 40 && sat > 0.25 && b > r && b >= g;`,
    `        return isWaterPaint(r, g, b, mx, sat);`],
  ["6px ring classifier",
    `          if (mx > 40 && sat > 0.25 && b > r && b >= g) fringe += 1;`,
    `          if (isWaterPaint(r, g, b, mx, sat)) fringe += 1;`],
  ["48px ring classifier",
    `        if (mx > 40 && sat > 0.25 && b > r && b >= g) ring48F += 1;`,
    `        if (isWaterPaint(r, g, b, mx, sat)) ring48F += 1;`],
]);

patch("tests/world-authoring-stitch.test.mjs", [
  ["genImage violetRing option",
    `function genImage(col, row, paint, { waterDisc, keepWaterPaint, paintedRing, hazeArc } = {}) {`,
    `function genImage(col, row, paint, { waterDisc, keepWaterPaint, paintedRing, hazeArc, violetRing } = {}) {`],
  ["genImage violetRing paint",
    `        } else if (hazeArc && ox + u > waterDisc[0] && d >= waterDisc[2] + hazeArc[0] && d < waterDisc[2] + hazeArc[1]) {`,
    `        } else if (violetRing && d >= waterDisc[2] + violetRing[0] && d < waterDisc[2] + violetRing[1]) {
          // saturated violet ground beside the water (hue ~285, b > r, b >= g):
          // blue-leaning to the old classifier, not water to the hue-limited one
          concept[o] = l2[o] = 150; concept[o + 1] = l2[o + 1] = 60; concept[o + 2] = l2[o + 2] = 200;
        } else if (hazeArc && ox + u > waterDisc[0] && d >= waterDisc[2] + hazeArc[0] && d < waterDisc[2] + hazeArc[1]) {`],
  ["violet control",
    `test("dry paint between the mask and painted water stops the growth: the polyline defect still fails", async () => {`,
    `test("violet ground beside the water is neither fringe nor grown into (lock change 7)", async () => {
  await supplyGeneration("c4-1", 4, 1,
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 300], keepWaterPaint: true, violetRing: [0, 60] }),
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 300] }));
  const out = redoCell("4,1", ["--force"]);
  const m = out.match(/mask\\s+completed: \\+(\\d+) px/);
  assert.ok(!m || +m[1] < 500, "violet ground must not be grown into: " + (m ? m[1] : 0));
  assert.match(out, /PASS\\s+water fringe\\s+0%/, "violet ground is not fringe to the 6px ring:\\n" + out.slice(-600));
  assert.match(out, /PASS\\s+water fringe \\(48px\\)\\s+0%/, "violet ground is not fringe to the 48px ring");
  assert.match(out, /accepted, stitched/);
});

test("dry paint between the mask and painted water stops the growth: the polyline defect still fails", async () => {`],
]);
