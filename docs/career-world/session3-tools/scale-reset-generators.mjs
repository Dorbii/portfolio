// Scale reset, phase 3: the generators behind the generated manifests.
//
// Two of the manifests phase 1 edited are BUILD OUTPUTS, and the test suite
// runs their builders. Running `npm test` silently reverted both edits --
// foliage-native-r4.json and seam-integration-native-r2.json went straight
// back to 0.25 / 1/3 and 0.12 / 0.14.
//
// This is the rule SCALE-RESET-APPLY already states for the ocean shaders --
// "change the source, not the generated files" -- and it applies here too.
// Nothing in those manifests marks them as generated, which is why phase 1
// treated them as authored.
//
//   node docs/career-world/session3-tools/scale-reset-generators.mjs [--dry]
//
// After this, regenerate:
//   node scripts/build-ninjaone-environment-foliage-r4.mjs
//   node scripts/build-ninjaone-environment-seam-integration-r2.mjs
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
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
  changes.push(`${path}  ${label}`);
  if (!DRY) fs.writeFileSync(path, crlf ? after.replace(/\n/g, "\r\n") : after);
}

// --------------------------------------------------------------- foliage
sub("scripts/build-ninjaone-environment-foliage-r4.mjs",
  "const MAX_DETAIL_ENTER_SPAN = 0.12;\nconst MAX_DETAIL_RETAIN_SPAN = 0.14;",
  "const MAX_DETAIL_ENTER_SPAN = 0.06;\nconst MAX_DETAIL_RETAIN_SPAN = 0.07;",
  "detail enter/retain spans");
sub("scripts/build-ninjaone-environment-foliage-r4.mjs",
  "span: [0.25, 1 / 3],", "span: [0.125, 1 / 6],", "boundingWorldView span");

// ---------------------------------------------------------- seam integration
sub("scripts/build-ninjaone-environment-seam-integration-r2.mjs",
  "origin: Object.freeze([0.1675, 0.23]),\n      span: Object.freeze([0.04, 0.04]),",
  "origin: Object.freeze([0.14625, 0.115]),\n      span: Object.freeze([0.02, 0.02]),",
  "fixedB2Internal camera");
sub("scripts/build-ninjaone-environment-seam-integration-r2.mjs",
  "origin: Object.freeze([0.2925, 0.23]),\n      span: Object.freeze([0.04, 0.04]),",
  "origin: Object.freeze([0.20875, 0.115]),\n      span: Object.freeze([0.02, 0.02]),",
  "fixedC2Internal camera");
// The envelope span is the divisor that maps a world camera into artboard
// space. Both it and the cameras change, so artboardView is invariant -- which
// is the check that this transform is coherent.
sub("scripts/build-ninjaone-environment-seam-integration-r2.mjs",
  "      (camera.origin[0] - 0.125) / 0.25 * ARTBOARD[0],\n      camera.origin[1] / (1 / 3) * ARTBOARD[1],",
  "      (camera.origin[0] - 0.125) / 0.125 * ARTBOARD[0],\n      camera.origin[1] / (1 / 6) * ARTBOARD[1],",
  "cameraArtboardView origin divisors");
sub("scripts/build-ninjaone-environment-seam-integration-r2.mjs",
  "      camera.span[0] / 0.25 * ARTBOARD[0],\n      camera.span[1] / (1 / 3) * ARTBOARD[1],",
  "      camera.span[0] / 0.125 * ARTBOARD[0],\n      camera.span[1] / (1 / 6) * ARTBOARD[1],",
  "cameraArtboardView span divisors");

// ------------------------------------------------- other generator constants
sub("scripts/build-ninjaone-city-composer-r2.mjs",
  "const CITY_WORLD_SPAN = Object.freeze([0.25, 1 / 3]);",
  "const CITY_WORLD_SPAN = Object.freeze([0.125, 1 / 6]);", "CITY_WORLD_SPAN");
sub("scripts/lib/ninjaone-environment-mvp-verification.mjs",
  "const ENVIRONMENT_SPAN = Object.freeze([0.25, 1 / 3]);",
  "const ENVIRONMENT_SPAN = Object.freeze([0.125, 1 / 6]);", "ENVIRONMENT_SPAN");
sub("scripts/audit-career-world-town-surfaces.mjs",
  "const WORLD_PLANE = Object.freeze({ width: 1672, height: 941 });",
  "const WORLD_PLANE = Object.freeze({ width: 3344, height: 1882 });", "audit WORLD_PLANE");

console.log(`${DRY ? "WOULD APPLY" : "APPLIED"} ${changes.length} generator edits:\n`);
for (const c of changes) console.log(`  ${c}`);
