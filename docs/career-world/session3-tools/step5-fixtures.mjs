// Step 5D: carry the capital's cameras to where the capital now is.
//
// The envelope moved from [0.125, 0] to [0.278125, 0.2] when it started
// deriving from plan.json's capital shelf. Its SPAN did not change, so every
// camera aimed at the capital moves by the same translation and nothing else
// about them changes.
//
// The third copy of the selector checkpoints (scripts/lib/...mvp-verification)
// and the environment test fixtures both aim at the capital, and both were
// left behind.
//
// Rather than hand-listing forty pairs, this translates every normalized pair
// in these files that falls inside the OLD envelope's neighbourhood. Those
// files contain only capital cameras and artboard-space pairs, and artboard
// pairs are far outside [0,1], so the window separates them cleanly. The one
// deliberate exception is named at the bottom.
//
//   node docs/career-world/session3-tools/step5-fixtures.mjs [--dry]
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const D = [0.278125 - 0.125, 0.2 - 0];          // [0.153125, 0.2]

// The old envelope was [0.125, 0] .. [0.25, 1/6]. Cameras sit on and just
// around it, so the window is a little wider on every side.
const WINDOW = { x: [0.10, 0.27], y: [0, 0.20] };
const inWindow = (x, y) =>
  x >= WINDOW.x[0] && x <= WINDOW.x[1] && y >= WINDOW.y[0] && y <= WINDOW.y[1];
const fmt = (v) => {
  const n = Number(v.toFixed(9));
  return Number.isInteger(n) ? String(n) : String(n);
};

const FILES = [
  "scripts/lib/ninjaone-environment-mvp-verification.mjs",
  "tests/ninjaone-environment-proof.test.mjs",
  "tests/ninjaone-environment-runtime.test.mjs",
  "tests/ninjaone-environment-seam-integration.test.mjs",
  "tests/ninjaone-environment-foliage.test.mjs",
];

let total = 0;
for (const path of FILES) {
  const raw = fs.readFileSync(path, "utf8");
  const crlf = raw.includes("\r\n");
  let text = raw.replace(/\r\n/g, "\n");
  let moved = 0;

  // `[a, b]` where both are plain decimals in the window.
  text = text.replace(/\[(\d*\.\d+|\d+), (\d*\.\d+|\d+)\]/g, (whole, a, b) => {
    const x = Number(a), y = Number(b);
    if (!inWindow(x, y)) return whole;
    moved += 1;
    return `[${fmt(x + D[0])}, ${fmt(y + D[1])}]`;
  });
  // C1's y is an EXPRESSION, so the pair regex above skips the whole pair and
  // its x is left behind with it. Both halves are handled here explicitly.
  for (const [find, replace] of [
    ["[0.20875, 1 / 24 - 0.01]", "[0.361875, 1 / 24 + 0.19]"],
    ["[0.21875, 1 / 24]", "[0.371875, 1 / 24 + 0.2]"],
  ]) {
    const n = text.split(find).length - 1;
    if (n) { text = text.split(find).join(replace); moved += n; }
  }

  if (moved && !DRY) fs.writeFileSync(path, crlf ? text.replace(/\n/g, "\r\n") : text);
  total += moved;
  console.log(`  ${String(moved).padStart(3)} pairs  ${path}`);
}

// The sweep lattice is written as loop bounds, not as pairs.
{
  const path = "scripts/lib/ninjaone-environment-mvp-verification.mjs";
  const raw = fs.readFileSync(path, "utf8");
  const crlf = raw.includes("\r\n");
  const text = raw.replace(/\r\n/g, "\n");
  const find = "  for (let x = 0.1425; x <= 0.2425; x += 0.003125) {\n    for (let y = 0.02; y <= 0.15; y += 0.003125) {";
  const replace = `  for (let x = ${fmt(0.1425 + D[0])}; x <= ${fmt(0.2425 + D[0])}; x += 0.003125) {\n    for (let y = ${fmt(0.02 + D[1])}; y <= ${fmt(0.15 + D[1])}; y += 0.003125) {`;
  if (text.includes(find)) {
    if (!DRY) fs.writeFileSync(path, crlf ? text.split(find).join(replace).replace(/\n/g, "\r\n") : text.split(find).join(replace));
    total += 1;
    console.log(`    1 lattice  ${path}`);
  } else if (text.includes(replace)) {
    console.log(`    - lattice  ${path}  (already applied)`);
  } else {
    throw new Error("sweep lattice bounds not found");
  }
}

console.log(`\n${DRY ? "WOULD MOVE" : "MOVED"} ${total} values by [${D}]`);
console.log(`
Deliberately not moved:
  seam-integration ...  origin [0.75, 0.75] - the far-field negative case. It
    is outside the window, so the rule excludes it without a special case.
  every artboard-space pair - artboard coordinates are far outside [0,1].
  the tier probes in water-state / lod-presentation / structures - those probe
    a SPAN threshold; their origins are arbitrary and not aimed at the capital.`);
