// Scale reset, phase 4: the MVP verification cameras and the threshold tests.
//
// `scripts/lib/ninjaone-environment-mvp-verification.mjs` carries a third copy
// of the selector checkpoints plus a sweep grid over the capital, and the
// runtime tests compare their own fixtures against it. The remaining test
// failures are threshold probes -- cameras chosen to sit just inside or just
// outside a span limit -- so they move with the limits they probe.
//
//   node docs/career-world/session3-tools/scale-reset-sweeps.mjs [--dry]
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const O = [0.125, 0];
const trim = (v) => Math.round(v * 1e12) / 1e12;
const pt = (p) => [trim(O[0] + (p[0] - O[0]) * 0.5), trim(O[1] + (p[1] - O[1]) * 0.5)];
const L = (p) => `[${p[0]}, ${p[1]}]`;

const changes = [];
function sub(path, find, replace, label, count = 1) {
  const raw = fs.readFileSync(path, "utf8");
  const crlf = raw.includes("\r\n");
  const text = raw.replace(/\r\n/g, "\n");
  const hits = text.split(find).length - 1;
  // Every edit here is an exact text replacement, so skipping one that is
  // already present is safe and keeps this file re-runnable as a whole record.
  if (hits === 0 && text.includes(replace)) { changes.push(`${path}  ${label}  (already applied)`); return; }
  if (hits !== count) throw new Error(`${path}: expected ${count} of ${JSON.stringify(find)}, found ${hits}`);
  changes.push(`${path}  ${label}`);
  if (!DRY) fs.writeFileSync(path, crlf ? text.split(find).join(replace).replace(/\n/g, "\r\n") : text.split(find).join(replace));
}

const V = "scripts/lib/ninjaone-environment-mvp-verification.mjs";

// The two spans that classify a sweep camera's demand mode. Leaving them made
// every halved sweep span "fresh-or-retained", so the audit's "retained-only"
// bucket emptied and the 32 MiB union test failed on a count of zero -- the
// hysteresis band still existed, but no sample could land in it.
sub(V, "export const NINJAONE_MVP_CLOSE_ASSET_PRELOAD_MAXIMUM_CAMERA_SPAN = 0.075;\nexport const NINJAONE_MVP_NATIVE_RELEASE_MAXIMUM_CAMERA_SPAN = 0.0875;",
  "export const NINJAONE_MVP_CLOSE_ASSET_PRELOAD_MAXIMUM_CAMERA_SPAN = 0.0375;\nexport const NINJAONE_MVP_NATIVE_RELEASE_MAXIMUM_CAMERA_SPAN = 0.04375;",
  "MVP demand-mode spans");

// -------------------------------------- the third copy of the checkpoints
sub(V,
  `  B2: Object.freeze({
    center: Object.freeze([0.1875, 0.25]),
    origin: Object.freeze([0.1675, 0.23]),
    span: Object.freeze([0.04, 0.04]),
  }),
  C1: Object.freeze({
    center: Object.freeze([0.3125, 1 / 12]),
    origin: Object.freeze([0.2925, 1 / 12 - 0.02]),
    span: Object.freeze([0.04, 0.04]),
  }),
  C2: Object.freeze({
    center: Object.freeze([0.3125, 0.25]),
    origin: Object.freeze([0.2925, 0.23]),
    span: Object.freeze([0.04, 0.04]),
  }),`,
  `  B2: Object.freeze({
    center: Object.freeze(${L(pt([0.1875, 0.25]))}),
    origin: Object.freeze(${L(pt([0.1675, 0.23]))}),
    span: Object.freeze([0.02, 0.02]),
  }),
  C1: Object.freeze({
    center: Object.freeze([${pt([0.3125, 0])[0]}, 1 / 24]),
    origin: Object.freeze([${pt([0.2925, 0])[0]}, 1 / 24 - 0.01]),
    span: Object.freeze([0.02, 0.02]),
  }),
  C2: Object.freeze({
    center: Object.freeze(${L(pt([0.3125, 0.25]))}),
    origin: Object.freeze(${L(pt([0.2925, 0.23]))}),
    span: Object.freeze([0.02, 0.02]),
  }),`,
  "NINJAONE_MVP_FIXED_CAMERAS");

sub(V,
  `  center: Object.freeze([0.25, 0.125]),
  origin: Object.freeze([0.2125, 0.0875]),
  span: Object.freeze([0.075, 0.075]),`,
  `  center: Object.freeze(${L(pt([0.25, 0.125]))}),
  origin: Object.freeze(${L(pt([0.2125, 0.0875]))}),
  span: Object.freeze([0.0375, 0.0375]),`,
  "NINJAONE_MVP_FOLIAGE_CAMERA");

// The sweep spans are camera spans; the grid is a lattice over the capital.
sub(V,
  "  0.04, 0.05, 0.055, 0.06, 0.061, 0.074, 0.075, 0.08, 0.0875, 0.09,",
  "  0.02, 0.025, 0.0275, 0.03, 0.0305, 0.037, 0.0375, 0.04, 0.04375, 0.045,",
  "NATIVE_BUDGET_SWEEP_SPANS");
sub(V,
  "  for (let x = 0.16; x <= 0.36; x += 0.00625) {\n    for (let y = 0.04; y <= 0.3; y += 0.00625) {",
  "  for (let x = 0.1425; x <= 0.2425; x += 0.003125) {\n    for (let y = 0.02; y <= 0.15; y += 0.003125) {",
  "sweep lattice over the capital");

// ------------------------------------------------- threshold probe tests
const RT = "tests/ninjaone-environment-runtime.test.mjs";
sub(RT,
  `  const territory = centeredCamera([0.25, 0.2], 0.3);
  const siteBeforePreload = centeredCamera([0.3125, 0.25], 0.101);
  const sitePreload = centeredCamera([0.3125, 0.25], 0.1);`,
  `  const territory = centeredCamera(${L(pt([0.25, 0.2]))}, 0.15);
  const siteBeforePreload = centeredCamera(${L(pt([0.3125, 0.25]))}, 0.0505);
  const sitePreload = centeredCamera(${L(pt([0.3125, 0.25]))}, 0.05);`,
  "preload threshold probes");

sub(RT, `test("animated foliage enters through .12 and retains through .14", () => {
  const cameraAtSpan = (span) => centeredCamera([0.23, 0.11], span);`,
  `test("animated foliage enters through .06 and retains through .07", () => {
  const cameraAtSpan = (span) => centeredCamera(${L(pt([0.23, 0.11]))}, span);`,
  "foliage hysteresis test name + camera");
sub(RT,
  `  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN, 0.12);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN, 0.14);
  assert.equal(eligible(0.04, false), true);
  assert.equal(eligible(0.12, false), true);
  assert.equal(eligible(0.13, false), false);
  assert.equal(eligible(0.13, true), true);
  assert.equal(eligible(0.14, true), true);
  assert.equal(eligible(0.141, true), false);`,
  `  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN, 0.06);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN, 0.07);
  assert.equal(eligible(0.02, false), true);
  assert.equal(eligible(0.06, false), true);
  assert.equal(eligible(0.065, false), false);
  assert.equal(eligible(0.065, true), true);
  assert.equal(eligible(0.07, true), true);
  assert.equal(eligible(0.0705, true), false);`,
  "foliage hysteresis probes");
sub(RT, "    cameraAtSpan(0.141),", "    cameraAtSpan(0.0705),", "post-retain camera");
sub(RT, "  const crossing = centeredCamera([0.21875, 0.25], 0.075);",
  `  const crossing = centeredCamera(${L(pt([0.21875, 0.25]))}, 0.0375);`,
  "three-column crossing camera");

const FL = "tests/ninjaone-environment-foliage.test.mjs";
sub(FL,
  `  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN, 0.12);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN, 0.14);`,
  `  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN, 0.06);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN, 0.07);`,
  "foliage threshold assertions");

console.log(`${DRY ? "WOULD APPLY" : "APPLIED"} ${changes.length} edits:\n`);
for (const c of changes) console.log(`  ${c}`);
