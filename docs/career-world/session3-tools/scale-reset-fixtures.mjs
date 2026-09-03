// Scale reset, phase 2: the camera fixtures in the environment tests.
//
// These are world cameras aimed at features of the NinjaOne capital -- the
// same registration `scale-reset-apply.mjs` re-derived. They are not the
// ruling, they are fixtures that point at it, so they move by the same
// transform or they stop pointing at anything.
//
// Two fixtures are deliberately left alone and named at the bottom.
//
//   node docs/career-world/session3-tools/scale-reset-fixtures.mjs [--dry]
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const O = [0.125, 0];
const trim = (v) => Math.round(v * 1e12) / 1e12;
const pt = (p) => [trim(O[0] + (p[0] - O[0]) * 0.5), trim(O[1] + (p[1] - O[1]) * 0.5)];
const sp = (s) => [s[0] * 0.5, s[1] * 0.5];

const changes = [];
function sub(path, find, replace, label, count = 1) {
  const raw = fs.readFileSync(path, "utf8");
  const crlf = raw.includes("\r\n");
  const text = raw.replace(/\r\n/g, "\n");
  const hits = text.split(find).length - 1;
  // Already present is a no-op, not an error: these are exact text edits, so
  // the script stays a re-runnable record of the pass rather than a one-shot.
  if (hits === 0 && text.includes(replace)) { changes.push(`${path}  ${label}  (already applied)`); return; }
  if (hits !== count) throw new Error(`${path}: expected ${count} of ${JSON.stringify(find)}, found ${hits}`);
  const after = text.split(find).join(replace);
  if (after === text) throw new Error(`no-op: ${label}`);
  changes.push(`${path}  ${label}`);
  if (!DRY) fs.writeFileSync(path, crlf ? after.replace(/\n/g, "\r\n") : after);
}

// `[a, b]` from a pair, at the precision the fixtures are written in.
const L = (p) => `[${p[0]}, ${p[1]}]`;

// ---------------------------------------------- environment proof cameras
{
  const p = "tests/ninjaone-environment-proof.test.mjs";
  for (const [o, s] of [
    [[0.198, 0.18], [0.04, 0.04]],
    [[0.235, 0.145], [0.05, 0.05]],
    [[0.34, 0.02], [0.045, 0.045]],
    [[0.13, 0.26], [0.06, 0.06]],
  ]) {
    sub(p, `{ origin: ${L(o)}, span: ${L(s)} }`,
      `{ origin: ${L(pt(o))}, span: ${L(sp(s))} }`, `native-detail camera ${L(o)}`);
  }
}

// ------------------------------------------ runtime + seam shared cameras
// B2 / C1 / C2 are the selector checkpoints; they must agree with
// seam-integration-native-r2.json, which phase 1 already re-derived.
const B2 = [[0.1675, 0.23], [0.04, 0.04]];
const C2 = [[0.2925, 0.23], [0.04, 0.04]];
{
  const p = "tests/ninjaone-environment-runtime.test.mjs";
  sub(p, `B2: Object.freeze({ origin: ${L(B2[0])}, span: ${L(B2[1])} })`,
    `B2: Object.freeze({ origin: ${L(pt(B2[0]))}, span: ${L(sp(B2[1]))} })`, "B2 checkpoint");
  sub(p, `C2: Object.freeze({ origin: ${L(C2[0])}, span: ${L(C2[1])} })`,
    `C2: Object.freeze({ origin: ${L(pt(C2[0]))}, span: ${L(sp(C2[1]))} })`, "C2 checkpoint");
  // C1's y is written as an expression: (1/12 - 0.02) / 2 = 1/24 - 0.01
  sub(p, `origin: [0.2925, 1 / 12 - 0.02],\n    span: [0.04, 0.04],`,
    `origin: [${pt([0.2925, 0])[0]}, 1 / 24 - 0.01],\n    span: [0.02, 0.02],`, "C1 checkpoint");
  sub(p, `const westFoliageCamera = { origin: [0.2125, 0.0875], span: [0.075, 0.075] };`,
    `const westFoliageCamera = { origin: ${L(pt([0.2125, 0.0875]))}, span: ${L(sp([0.075, 0.075]))} };`,
    "west foliage camera");
}
{
  const p = "tests/ninjaone-environment-seam-integration.test.mjs";
  sub(p, `B2: Object.freeze({ origin: Object.freeze(${L(B2[0])}), span: Object.freeze(${L(B2[1])}) })`,
    `B2: Object.freeze({ origin: Object.freeze(${L(pt(B2[0]))}), span: Object.freeze(${L(sp(B2[1]))}) })`,
    "B2 checkpoint");
  sub(p, `C2: Object.freeze({ origin: Object.freeze(${L(C2[0])}), span: Object.freeze(${L(C2[1])}) })`,
    `C2: Object.freeze({ origin: Object.freeze(${L(pt(C2[0]))}), span: Object.freeze(${L(sp(C2[1]))}) })`,
    "C2 checkpoint");
  sub(p, `origin: Object.freeze([0.2925, 1 / 12 - 0.02]),\n    span: Object.freeze([0.04, 0.04]),`,
    `origin: Object.freeze([${pt([0.2925, 0])[0]}, 1 / 24 - 0.01]),\n    span: Object.freeze([0.02, 0.02]),`,
    "C1 checkpoint");
  for (const [o, s, label] of [
    [[0.1875, 0.18459422958870475], [0.074, 0.074], "seam camera A"],
    [[0.21958333305493183, 0.1883333333041626], [0.04, 0.04], "seam camera B"],
    [[0.2925, 0.14666666666666667], [0.04, 0.04], "seam camera C"],
    [[0.21958333305493183, 0.21296296296296297], [0.04, 0.04], "seam camera D"],
  ]) {
    sub(p, `origin: Object.freeze(${L(o)}),\n    span: Object.freeze(${L(s)}),`,
      `origin: Object.freeze(${L(pt(o))}),\n    span: Object.freeze(${L(sp(s))}),`, label);
  }
}

// -------------------------------------------------------- foliage cameras
{
  const p = "tests/ninjaone-environment-foliage.test.mjs";
  for (const [o, s, label] of [
    [[0.26148278569762023, 0.14119340966684502], [0.075, 0.075], "foliage camera A"],
    [[0.20037197024864656, 0.08141462821867565],
      [0.0945814074220192, 0.12610854322935894], "foliage camera B"],
  ]) {
    sub(p, `origin: Object.freeze(${L(o)}),\n    span: Object.freeze(${L(s)}),`,
      `origin: Object.freeze(${L(pt(o))}),\n    span: Object.freeze(${L(sp(s))}),`, label);
  }
  sub(p, `const camera = { origin: [0.2, 0.1], span: [0.13, 0.13] };`,
    `const camera = { origin: ${L(pt([0.2, 0.1]))}, span: ${L(sp([0.13, 0.13]))} };`,
    "eligibility camera");
  sub(p, `{ origin: [0.2, 0.1], span: [0.15, 0.15] },`,
    `{ origin: ${L(pt([0.2, 0.1]))}, span: ${L(sp([0.15, 0.15]))} },`, "retain camera");
}

console.log(`${DRY ? "WOULD APPLY" : "APPLIED"} ${changes.length} fixture edits:\n`);
for (const c of changes) console.log(`  ${c}`);
console.log(`
Deliberately NOT re-derived:
  seam-integration ...:301  origin [0.75, 0.75] - a far-field negative case
    ("a camera nowhere near the capital selects nothing"). It is outside the
    envelope before and after, so re-deriving it would only make it a
    different arbitrary elsewhere.
  camera.test.mjs           [0.25, 1/3] is an arbitrary bounds rectangle in a
    clamping-arithmetic test, and [1672, 941] is a literal argument to
    cameraViewBox rather than WORLD_PLANE.
  every artboard-space pair (e.g. origin [712, 540], [1074, 804]) - artboard
    coordinates do not move under Option B.`);
