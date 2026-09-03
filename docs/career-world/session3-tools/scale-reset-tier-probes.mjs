// Scale reset, phase 5: the tier probes, and one tile I misclassified.
//
// The remaining suite failures are cameras chosen to sit inside a named LoD
// tier ("a territory-tier camera", "a site-tier camera"). They are probes of
// the thresholds, so they halve with them. Each one below is checked against
// the post-reset tier table rather than assumed:
//
//   world 1 | territory .39 | capital .17 | site .05 | close .0375
//
// Plus one real classification error. Phase 1 ruled terrain untouched and put
// terrain-site-tiles-r2.json on that side. It is per-CAPITAL registration, not
// terrain: assets.test.mjs asserts each project's anchor sits inside its own
// site tile, and the Kaizen anchor moved while the tile did not. The tile's
// art is a fixed crop of the territory plate, so re-deriving its worldBounds
// moves that crop with the capital -- the same thing the city plate does.
//
//   node docs/career-world/session3-tools/scale-reset-tier-probes.mjs [--dry]
//
// Run this one from a clean tests/ tree. The close-tier probe appears twice and
// is matched by count, so a half-applied file makes that count wrong and the
// script stops rather than guessing which of the three `0.075` spans it meant.
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const O = [0.125, 0];
const trim = (v) => Math.round(v * 1e12) / 1e12;
const pt = (p) => [trim(O[0] + (p[0] - O[0]) * 0.5), trim(O[1] + (p[1] - O[1]) * 0.5)];

const changes = [];
function sub(path, find, replace, label, count = 1) {
  const raw = fs.readFileSync(path, "utf8");
  const crlf = raw.includes("\r\n");
  const text = raw.replace(/\r\n/g, "\n");
  const hits = text.split(find).length - 1;
  if (hits === 0 && text.includes(replace)) { changes.push(`${path}  ${label}  (already applied)`); return; }
  if (hits !== count) throw new Error(`${path}: expected ${count} of ${JSON.stringify(find)}, found ${hits}`);
  changes.push(`${path}  ${label}${count > 1 ? ` (x${count})` : ""}`);
  if (!DRY) fs.writeFileSync(path, crlf ? text.split(find).join(replace).replace(/\n/g, "\r\n") : text.split(find).join(replace));
}
// A camera probe written as `origin: [...],\n    span: [...],`.
const probe = (path, origin, before, after, label, count = 1) => sub(path,
  `origin: [${origin}],\n    span: [${before}, ${before}],`,
  `origin: [${origin}],\n    span: [${after}, ${after}],`, label, count);

// The same probe written inline: `{ origin: [...], span: [...] }`.
const probe1 = (path, origin, before, after, label, count = 1) => sub(path,
  `{ origin: [${origin}], span: [${before}, ${before}] }`,
  `{ origin: [${origin}], span: [${after}, ${after}] }`, label, count);

const WS = "tests/water-state.test.mjs";
// "one camera span resolves the detail tier for every layer"
probe1(WS, "0.2, 0.2", "0.5", "0.25", "territory probe");
probe(WS, "0.45, 0.45", "0.085", "0.0425", "site probe");
// Order matters: close must halve while there are exactly two of it. Doing the
// capital probe first turns 0.15 into 0.075 and makes a third, indistinguishable
// from the two this line is for.
probe(WS, "0.45, 0.45", "0.075", "0.0375", "close probes", 2);
probe(WS, "0.45, 0.45", "0.15", "0.075", "capital probe");
// "LOD nodes and registered rasters share semantic transition weights"
probe(WS, "0.1, 0.1", "0.75", "0.375", "world->territory transition probe");
probe(WS, "0.2, 0.2", "0.41", "0.205", "territory probe (weights)");
probe(WS, "0.4, 0.4", "0.12", "0.06", "capital probe (weights)");
probe(WS, "0.45, 0.45", "0.09", "0.045", "site probe (weights)");
// "one central LOD policy owns thresholds and render budget"
sub(WS, "assert.equal(DETAIL_POLICY.cameraMinimumSpan, 0.04);",
  "assert.equal(DETAIL_POLICY.cameraMinimumSpan, 0.02);", "cameraMinimumSpan");
sub(WS, `      world: 1,
      territory: 0.78,
      capital: 0.34,
      site: 0.1,
      close: 0.075,`,
  `      world: 1,
      territory: 0.39,
      capital: 0.17,
      site: 0.05,
      close: 0.0375,`, "tierMaximumSpan table");

const LP = "tests/lod-presentation.test.mjs";
probe(LP, "0, 0", "0.12", "0.06", "capital probe");
probe(LP, "0, 0", "0.09", "0.045", "site probe");

const ST = "tests/structures.test.mjs";
probe(ST, "0.2, 0.2", "0.52", "0.26", "territory probe");
probe(ST, "0.4, 0.4", "0.14", "0.07", "capital probe");
// `toFixed(4)` is a tolerance that shrinks with the value it checks, which is
// exactly why halving broke it: 1303 px is an approximate reference width, and
// 0.0824845 happened to round to 0.0825 where 0.0412422 does not round to
// 0.04125 at any number of places. A RELATIVE tolerance says the same thing
// independently of magnitude. 6e-4 reproduces the original's strictness
// (5e-5 / 0.0825), and the actual error is 1.9e-4 of the cap.
sub(ST, `  assert.equal(
    Number(resolveD05CanonOneToOneMinimumSpan(1303).toFixed(4)),
    NINJAONE_CAPITAL_D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN,
  );`,
  `  assert.ok(
    Math.abs(
      resolveD05CanonOneToOneMinimumSpan(1303)
        - NINJAONE_CAPITAL_D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN,
    ) < NINJAONE_CAPITAL_D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN * 6e-4,
  );`, "canon floor tolerance");

// ---------------------------------- terrain-site-tiles-r2.json: NOT touched
//
// An earlier version of this pass re-derived the Kaizen site tile, on the
// reasoning that assets.test.mjs asserts a project's anchor sits inside its
// own tile and the anchor had moved. That was wrong, and the suite said so:
// "capital site tiles stay bounded to land and add local density" derives the
// expected worldBounds from the crop's position IN THE TERRITORY PLATE
// (1428 / 6688 = 0.2135...). The tile's world position is a statement about
// where its art was cut from the terrain, so it is terrain, and phase 1's
// classification was right.
//
// Both cannot hold against the current plate: the anchor is capital content
// and moves, the tile is terrain and does not. That is not a third problem --
// it is the same one the land-coverage gate reports, which step 5 resolves by
// re-registering the terrain under the capital.

console.log(`${DRY ? "WOULD APPLY" : "APPLIED"} ${changes.length} edits:\n`);
for (const c of changes) console.log(`  ${c}`);
