# World scale reset — the apply plan

Owner-approved 2026-08-31 ("world plane x2, land fraction 2/3"), derived
2026-09-03, **not yet applied**. The derivation and its self-checks are
`docs/career-world/session3-tools/scale-reset-derive.mjs`; its output is
`docs/career-world/evidence/2026-09-02/scale-reset-derivation.txt`, where nine
figures are validated against ones STATE already states.

## What the reset is

`m` per world pixel **does not change**. A region is defined as *both* `218`
world px *and* `~98 m` of ground, so the ratio is pinned. The plane's **pixels**
double:

| | now | after |
|---|---|---|
| world plane (coordinate space) | `1672 x 941` | **`3344 x 1882`** |
| ground | `753 x 424 m` | **`1506 x 847 m`** |
| m per world px | `0.4503` | `0.4503` (unchanged) |
| territory plate (world x4) | `6688 x 3764` | `13376 x 7528` |
| land at 2/3 | — | `88.3` regions (STATE: ~88) |

**The authored L2 land needs no rescaling.** Twenty cells at `216.7` world px
each = `1084 x 867` world px = `488 x 390 m` = `19.8` regions, against
NinjaOne's budget of `21` regions / `~450 m`. It was authored to the
post-reset scale. What changes is the plane around it.

## The envelope: invariant versus derived

STATE says NinjaOne's `capitalEnvelope origin [0.125,0] span [0.25,1/3]` is
IMMUTABLE, and also that **D05 remains the scale anchor and does not move**.
With `m/px` pinned and the plane doubled, those cannot both hold — and the
apparent conflict is a wording trap, not a real constraint:

- **The invariant is D05's ground footprint and its `0.13 m` per master unit.**
- **`[0.25, 1/3]` is a derived expression of that invariant against a
  `1672 x 941` plane.** When the plane doubles, the fraction must halve to
  `[0.125, 1/6]` *precisely in order to keep D05 exactly where it is.*

Owner ruling 2026-09-03: the fraction is derived, D05 does not move. Do not
"restore" `[0.25, 1/3]`.

### This also repairs an existing anomaly

NinjaOne's envelope is currently twice the linear size of every other capital
and five times Tanium's area, despite both territories having 4 projects and 21
regions. Halving NinjaOne's fraction while leaving the other four alone makes
all five consistent:

| territory | span after | capital ground after | projects |
|---|---|---|---|
| ninjaone | `[0.125, 1/6]` (halved) | `188 m` | 4 |
| tanium | `[0.1256, 0.1328]` (kept) | `189 m` | 4 |
| column-technologies | `[0.1017, 0.1169]` (kept) | `153 m` | 2 |
| independent | `[0.0897, 0.1063]` (kept) | `135 m` | 3 |
| ace-hardware | `[0.0897, 0.1063]` (kept) | `135 m` | 2 |

**Only NinjaOne's fraction changes**, because only NinjaOne has built capital
art that must not move. The other four have placeholder envelopes and doubling
their ground is the intended effect of the reset.

## The design decision the apply turns on

`WORLD_PLANE` (`shared/world.ts`) and `WORLD_PLATE_DIMENSIONS`
(`layers/terrain/model/assets.ts`) are both `[1672, 941]` today and are
therefore used interchangeably by some of the eleven consumers. **They must
diverge:**

- `WORLD_PLANE` is the **coordinate space** → becomes `3344 x 1882`.
- `WORLD_PLATE_DIMENSIONS` is the **actual pixel size of
  `terrain-relief-r6.png`** → stays `1672 x 941` until that asset is
  re-derived, and must keep matching the file or asset validation fails.

The world plate is therefore half the resolution its coordinate space implies,
i.e. upscaled at the world tier. That is tolerable *only* because STATE already
records world and territory tiers as **"SYMBOLIC, not metric ... the runtime
routes those tiers marker-only"**. It stops being tolerable when the coarse
tiers are re-derived from L2 by reduction — which needs far more than one
territory (20 of ~88 regions authored).

**Every consumer must be read and classified as coordinate-space or
asset-pixels before either constant moves.** Conflating them is the single way
this change breaks quietly.

## Ordered apply

Nothing below is done yet.

1. **Split the two meanings.** Audit the eleven `shared/world.ts` consumers;
   where a consumer means "the plate image", point it at
   `WORLD_PLATE_DIMENSIONS`. No value changes in this step, so the app must be
   byte-identical after it — that is the step's own control.
2. **Double the coordinate space.** `shared/world.ts` → `3344 x 1882`. One
   edit, propagating to the audited consumers.
3. **Halve NinjaOne's envelope fraction** to `[0.125, 1/6]` in
   `layers/terrain/model/territories.ts` and
   `public/career-world/layers/terrain/authority/manifests/world-territories-r4.json`.
   Leave the other four territories untouched.
4. **Update the assertion that encodes the old ruling.**
   `tests/world-territory-resegmentation.test.mjs:142` hard-asserts
   `span: [0.25, 0.3333333333333333]`. It becomes `[0.125, 1/6]`, recorded in
   the ledger as an owner ruling change rather than a quiet edit.
5. **Register the L2 land.** With a correct coordinate space, place NinjaOne's
   20 cells at their real world bounds so they serve at capital and site tiers,
   the old `stream-r3` plate continuing to serve elsewhere and at coarse tiers.
   This is what unblocks the LoD test.
6. **Ocean, afterwards** (owner: "water and ocean work will come afterwards
   nbd", and "no need to respect the boundary for ocean since it will change").
   `WORLD_SIZE = vec2(1672.0, 941.0)` appears in four generated shaders
   (`composite`, `foam`, `spray`, `wave`) and `[1672, 941]` in generated
   `worldFields.ts`. **Change the source, not the generated files:**
   `art-source/ocean-animation/src/export_web.py`, then re-export.

## Not touched by this change

The six files carrying the D05 master artboard `1448 x 1086`
(`ninjaOneEnvironmentSeamIntegration`, `ninjaOneCapitalCityFoundationR3`,
`ninjaOneCapitalCityRepresentations`, `ninjaOneCapitalD05Concept`,
`ninjaOneEnvironmentNativeDetail`) keep that number. D05's master does not
change; that is what Option B buys.

`layers/ocean/model/generated/oceanStates.ts` is a **false positive** in any
grep for these numbers — its colour floats contain the digit runs (`0.49411765`
holds "941"). It is not a touch point.

---

## Step 1 result — 2026-09-03, the audit found no conflation, and two corrections

**The audit's own answer: there is nothing to split.** All ~40 `WORLD_PLANE`
usages are coordinate-space — `normalized x plane` for positions, and
`cameraViewBox` derives the viewBox from the *same* dimensions.
`WORLD_PLATE_DIMENSIONS` appears only in `assets.ts`, for decoded-byte budgets
and the asset's declared `dimensions`. The two constants already carry distinct
correct meanings. **Step 1 requires no code change.**

### Correction 1 — doubling the plane is inert for rendering, and still required

Because element positions and the viewBox both scale with `WORLD_PLANE`, and
the land canvas does not read it at all, doubling it changes **nothing** that
is currently rendered. That is the change's control, not an assumption.

It is nevertheless **required**, for a reason not previously established:

| | NinjaOne's 20 authored cells (1084 x 867 world px) | share of all land | budget |
|---|---|---|---|
| current plane `1672 x 941` | `64.8% x 92.1%` | **`89.6%`** — impossible | `23.9%` |
| doubled plane `3344 x 1882` | `32.4% x 46.1%` | **`22.4%`** | `23.9%` |

The authored land cannot be registered into the current plane at all. This is
independent arithmetic confirming the reset, and it is why the tile tree has
been parked as "territory-local, registration pending".

### Correction 2 — the registration is DUPLICATED, and the copy that matters is not the envelope

`capitalEnvelope` is **not** what positions the capital. The city and
environment art derive from a second manifest:

```
NINJAONE_CAPITAL_CITY_R3_WORLD_SPAN    = NINJAONE_ENVIRONMENT_WORLD_SPAN
NINJAONE_CAPITAL_CITY_LAYER_WORLD_SPAN = NINJAONE_ENVIRONMENT_WORLD_SPAN
NINJAONE_ENVIRONMENT_WORLD_SPAN        = environment-proof-r1.json
                                          .registration.boundingWorldView.span
```

Both manifests hold the identical `origin [0.125,0] span [0.25,1/3]`:

| copy | file | role |
|---|---|---|
| `capitalEnvelope` | `manifests/world-territories-r4.json` | declarative, drives segmentation |
| `registration.boundingWorldView` | `capitals/ninjaone/environment/manifests/environment-proof-r1.json` | **actually positions the city and environment art** |

**Halving only `capitalEnvelope` would have passed its test and moved nothing.**
Both must change together. Each is pinned by a test, so a divergence is caught:
`world-territory-resegmentation.test.mjs:144` and
`ninjaone-environment-proof.test.mjs:71`.

That duplication is a latent hazard independent of this change and worth
collapsing to one source later.

### The corrected edit list — five edits

1. `features/career-world/shared/world.ts` — plane `1672 x 941` -> `3344 x 1882`.
2. `public/career-world/layers/terrain/authority/manifests/world-territories-r4.json`
   — **ninjaone only** `capitalEnvelope.span` -> `[0.125, 1/6]`.
3. `public/career-world/capitals/ninjaone/environment/manifests/environment-proof-r1.json`
   — `registration.boundingWorldView.span` -> `[0.125, 1/6]`. **The one that moves the art.**
4. `tests/world-territory-resegmentation.test.mjs:144` — expected span.
5. `tests/ninjaone-environment-proof.test.mjs:71` — expected span.

Edits 4 and 5 change assertions that encode an owner ruling; they are recorded
in the ledger, not quietly edited.

### Baseline before any edit

`npm run typecheck` clean. `npm test`: **182 tests, 168 pass, 12 fail, 2
skipped** — twelve pre-existing failures, where STATE records only one known
red (the D05 hash mismatch). The failing set is captured so the post-change run
can be compared against it rather than against an assumption of green.

---

## Step 2 ATTEMPTED AND REVERTED — 2026-09-03. The edit list was wrong again.

The five edits were made, `typecheck` stayed clean, and the targeted control
(`world-territory-resegmentation` + `ninjaone-environment-proof`) came back
`16 pass / 1 fail` — **identical to its baseline, twice.** Both spans were
halved and the arithmetic proved Option B does what it claims: the capital
measures `188.2 x 141.2 m` before and after, D05 unmoved.

**Then the app threw**, and kept throwing as each fail-closed contract caught
the next divergence:

1. `NinjaOne Capital city authority does not match package, terrain, and LOD
   contracts.` — a **third** copy in `city-package-authority-r4.json`
   (`registration.worldSpan`), cross-checked against the constant.
2. Halved that plus two more copies found by grep
   (`foliage-native-r4.json`, `inland-water-r1.json`).
3. `NinjaOne pooled foliage registration contract is invalid.` — because the
   expected span is **hardcoded in the guard itself**, not only in the manifest:
   `manifest.registration.boundingWorldView.span.join(",") !== ` + "`0.25,${1 / 3}`"

**The working tree was reverted. Nothing was committed and the app is green
again.**

### The true scope

| what | count |
|---|---|
| manifests holding a copy of the registration | **5** |
| hardcoded `0.25 / 1÷3` span literals in TS guards | **5** |
| normalized span constants relative to the plane (`maxDetailEnterSpan`, `maxDetailRetainSpan`, `viewportOverscanRatio`, …) | **~17** |

STATE said this plainly and it was under-read: *"Every existing registration is
re-derived: D05 master bounds, territory envelopes, **LoD span constants**."*
The last three words are the work.

**This is a derivation pass, not a find-and-replace**, and it needs judgement,
not only arithmetic: halving a *registration* keeps its ground meaning, but the
LoD and detail-enter thresholds are camera spans that were plausibly tuned by
eye. Whether `maxDetailEnterSpan: 0.12` should become `0.06` (same ground) or
stay `0.12` (same camera feel) is an owner-facing question per constant, not a
mechanical substitution.

### What the failed attempt bought

The fail-closed guards are **good** — every divergence was caught loudly and
immediately, none silently. And the exercise produced the inventory above,
which is what the apply actually needs. Recommended next step: enumerate all
five manifests, five literals and seventeen constants with each one's current
value and its derived candidate, get the LoD thresholds ruled on, then apply
the whole set in one commit against the targeted control — rather than editing
until the app stops throwing.

---

## Step 7 — retire `stream-r3` (owner-authorised 2026-09-03, MUST FOLLOW step 5)

Owner: *"yeah just resolve and remove em then."* Authorised, but **sequenced
after registration, not before**, and the ordering is not a formality:

| | measured 2026-09-03 |
|---|---|
| release feed `terrain-stream-runtime-r4.json` | 214 tiles, **all 428 sources from `stream-r3`** |
| `stream-r3` tiles on disk | 428 |
| runtime code referencing `l2-ninjaone-r1` | **none** |

`stream-r3` is the only tileset the runtime serves. Deleting it before the L2
land is registered leaves the world with **no terrain at all**. So:

1. Do step 5 (register the 20 cells, point the release feed at
   `l2-ninjaone-r1`).
2. Confirm the app renders the new land — the LoD test that has never been run.
3. **Then** delete `public/career-world/layers/terrain/authority/tiles/stream-r3/`
   (428 files), `terrain-stream-tiles-r3.json`, and the `stream-r3` prefix in
   `features/career-world/layers/terrain/model/streamTiles.ts`.
4. Six of the nine suite failures die with it — 8, 19, 23 outright, and 9/21
   once the land mask is re-derived from the new source.

Until then the `stream-r3` drift stays as a **known-deliberate red**, recorded
in R113, not an unexplained one.

---

## The derivation pass — 2026-09-03. Enumerated, not applied.

Tools: `session3-tools/scale-reset-inventory.mjs` (70 values, five classes,
current → derived) and `session3-tools/scale-reset-landmask-check.mjs`.
Control re-measured before and after: **16 pass / 1 fail**, unchanged.

### The scope was wrong in two directions

**Bigger than "5 manifests".** Five manifests hold a *copy of the envelope
span*, exactly as recorded. But eight more hold **world-registered content that
sits inside the envelope**, in world coordinates, independent of it. Those do
not halve — they are re-derived about the envelope origin, which does not move:

```
p' = [0.125, 0] + (p - [0.125, 0]) * 0.5      span' = span * 0.5
```

| manifest | what | values |
|---|---|---|
| `cities/kaizen-agent/.../base-runtime-r1.json` | Kaizen's plate — a capital district by owner acceptance | anchor + span |
| `structures/.../project-structures-r1.json` | `project-kaizen-agent` (Metrics-Service and Vendy are outside and keep their fractions) | 1 |
| `structures/.../skill-structures-r1.json` | three `project-kaizen-agent-*` instances | 3 |
| `terrain/.../terrain-site-tiles-r2.json` | Kaizen's site tile; the other four capitals keep theirs | origin + span |
| `terrain/.../terrain-dem-r4.json` | shelves 5–8 (`ninjaone-development-basin` is *territory*, keeps its fraction) | 4 centres + 4 radii |
| `infrastructure/.../ninjaone-project-towns-r1.json` | `kaizen-agent-foundry-district` entrances | 10 |
| `terrain/detail/.../ninjaone-rural-outskirts-r1.json` | the capital's rural fringe | 5 |
| `capitals/ninjaone/.../seam-integration-native-r2.json` | checkpoint cameras onto the capital | 2 origins + 2 spans |

**Left alone, Kaizen ends up outside the halved capital entirely** — its plate
spans `x 0.183–0.289`, and the halved envelope ends at `x 0.25`.

Also: **eight** TS span literals, not five. The two missed are
`CAPITAL_ENVELOPE_WORLD_SPAN_X = 0.25` in `ninjaOneCapitalD05Concept.ts` —
whose comment calls it "immutable at 0.25", the wording trap again, and which
feeds the 1:1 canon floor — and `NINJAONE_ENVIRONMENT_CAMERA`.

**Smaller than "~17 constants" in one respect.** `viewportOverscanRatio = 0.25`
is named in STATE's list but is **dimensionless**: it multiplies `view.span` by
`(1 + ratio * 2)`. It is a ratio *of* a span, not a span. It must not halve.
Same for `renderScale.*`, `DESTINATION_MARKER_HANDOFF.*`, and
`MIN/MAX_FOOTPRINT_SPAN` (artboard-relative). `tierMaximumSpan.world = 1` is a
sentinel; halving it is behaviourally identical (the tier search falls back to
`world`), so keep it at 1 for clarity.

### The LoD thresholds are arithmetic, not taste — the question can be closed

This doc asked whether `maxDetailEnterSpan: 0.12` should become `0.06` (same
ground) or stay `0.12` (same camera feel), and called it "an owner-facing
question per constant". **It is not.** Screen position of a feature is
`(n - camera.origin) / camera.span`. For capital content, `n' = o + (n-o)/2`,
and a camera framing it has `origin' = o + (origin-o)/2`, `span' = span/2`:

```
(n' - origin') / span' = [(n-o)/2 - (origin-o)/2] / (span/2) = (n - origin) / span
```

The halving cancels. Measured across three features at two tier boundaries,
**worst screen delta `0.0`** — not approximately, exactly. Every tier test
compares `max(camera.span)` against a constant, so halving both sides leaves
every tier decision unchanged. Halving is the choice that changes nothing;
*not* halving is the one that would move things.

There is one real behaviour change, and it is the intended repair. The four
placeholder capitals do not halve, so their tiers engage further in. Measured
on-screen capital width at the moment its tier engages:

| | before | after |
|---|---|---|
| ninjaone | 74% | 74% |
| tanium | 37% | **74%** |
| column-technologies | 30% | 60% |
| independent / ace-hardware | 26% | 53% |

NinjaOne stops being the outlier and lands exactly on Tanium, the other
4-project capital. This doc's "makes all five consistent" is too strong —
they become consistent *with project count*, which is the anomaly worth
repairing.

### The one consequence that is not inert — needs a ruling

The capital re-derives toward the envelope's **north-west corner**, while the
world land mask is a plane-wide raster addressed by fraction and does not move.
So the capital lands on different mask pixels. Measured against
`world-land-mask-r3/r4` with the same polarity `assets.test.mjs` uses
(`>= 128` is land), over 32 re-derived points:

- **All 10 town entrances — the only set an existing test land-guards — survive.**
- 4 (r4) / 5 (r3) go **land → water**: Kaizen's plate NW corner, DEM shelves
  `ninjaone-northwest-approach` (and `ninjaone-upper-capital-plateau` on r3),
  and outskirts `northwest-grove` and `upper-meadow-wall`.
- 2 outskirts anchors are **already over water today**, so "on land" was never
  an invariant for that layer.

**Two DEM shelves in the sea is a real defect** — a development shelf is
buildable ground. But every regression sits inside the footprint **step 5
replaces**: the L2 land is registered over NinjaOne's territory, and its
coastline is new art. So this cannot be resolved against `world-land-mask-r3/r4`
— that is the terrain being superseded exactly there.

**Recommendation:** apply the whole set now, and resolve the two shelves at
step 5 against the L2 art rather than against a mask on its way out. The
alternative — moving the shelves now to fit the old mask — tunes to terrain
that is about to be deleted.

### Baseline for the apply

Targeted control `world-territory-resegmentation` + `ninjaone-environment-proof`:
**16 pass / 1 fail**, re-measured this session, matching the recorded baseline.
`tests/assets.test.mjs` is **13 pass / 5 fail** on a pristine tree — already red,
part of the nine; do not read it as a clean gate.

---

## APPLIED — 2026-09-03. Steps 2, 3 and 4 are done.

Owner: *"go for it."* Driven by five scripts under `session3-tools/` rather
than hand-typed, so the change is reproducible and each pass is a record:

| pass | script | edits |
|---|---|---|
| 1 | `scale-reset-apply.mjs` | 51 — plane, envelope, capital content, LoD spans, ruling assertions |
| 2 | `scale-reset-fixtures.mjs` | 19 — environment test cameras |
| 3 | `scale-reset-generators.mjs` | 9 — the builders behind two generated manifests |
| 4 | `scale-reset-sweeps.mjs` | 11 — MVP checkpoints, sweep lattice, threshold probes |

**Targeted control: 16 pass / 1 fail — the baseline exactly**, same known red
(the `INTERIM-owner-guard-treatment` hash pin). `typecheck` clean.

### Four things the enumeration missed, and how each surfaced

None came from reading the app's errors; each came from a guard failing closed
or from a sweep run before the edit.

1. **Two manifests are BUILD OUTPUTS.** `foliage-native-r4.json` and
   `seam-integration-native-r2.json` are written by
   `build-ninjaone-environment-foliage-r4.mjs` and
   `...-seam-integration-r2.mjs`, and the suite runs both builders — so
   `npm test` silently reverted the phase-1 edits to them. Nothing in either
   file marks it as generated. This doc already states the rule for the ocean
   shaders; it applies here too.
   *Coherence check:* `cameraArtboardView`'s divisor **is** the envelope span,
   so with both halved the artboardView is invariant — it moved by `1e-13`.

2. **A third copy of the selector checkpoints** lives in
   `scripts/lib/ninjaone-environment-mvp-verification.mjs`, with a sweep
   lattice over the capital and the budget sweep spans.

3. **`NINJAONE_MVP_CLOSE_ASSET_PRELOAD_MAXIMUM_CAMERA_SPAN` (0.075) and
   `..._NATIVE_RELEASE_...` (0.0875)** classify a sweep camera's demand mode.
   Left unhalved they put every halved sweep span in `fresh-or-retained`, so
   the `retained-only` bucket emptied and the 32 MiB union test failed on a
   count of zero — the hysteresis band still existed, but no sample could land
   in it. Halved, the correspondence is exact.

4. **`capitalAnchor`**, sitting beside `capitalEnvelope` in the same manifest.
   The miss was self-inflicted: `scale-reset-inventory.mjs` skipped points in
   any file that already held an envelope-span copy, and that filter hid it.

### The one consequence that did not resolve — needs an owner ruling

Measured by `session3-tools/capital-on-land-check.mjs`, which reads the live
manifests untransformed and reproduces the two `assets.test.mjs` gates:

```
envelope land coverage   0.552   need >= 0.700   FAIL
buildable / land         0.896   need >= 0.580   PASS
anchor on land / slope   true / 0                PASS
7 of 170 world-registered capital points over water
  (2 of them rural-outskirts anchors that were over water BEFORE the reset)
```

The capital re-derives toward the envelope's **north-west corner**, and the
world land mask — a plane-wide raster addressed by fraction — does not move.
Against `world-land-mask-r3`, that corner is 45% sea. Before the reset the
same envelope measured `0.715`.

This is not fixable by arithmetic. The envelope's origin is pinned by the
owner ruling (it does not move, so D05 does not move), and the terrain under
it is what it is. Three ways out:

- **Accept it as a known-deliberate red until step 5** — the L2 land is
  registered over NinjaOne's territory and its coastline is new art, so the
  mask this gate reads is the terrain being superseded exactly there. This is
  the ordering the plan already assumes.
- **Re-place the envelope** so it covers land — but that moves D05, which
  Option B exists to prevent.
- **Lower `minimumLandCoverage` for ninjaone** — weakening a gate to fit its
  own input, which F27 rules out.

The first is recommended. It is recorded here rather than resolved because it
is an owner ruling, not a derivation.

### A wording trap retired

`ninjaOneCapitalD05Concept.ts` carried `CAPITAL_ENVELOPE_WORLD_SPAN_X = 0.25`
under a comment calling it *"immutable at 0.25 (world-territories-r4, asserted
by test)"* — the same trap STATE already names. The comment now says the span
is derived and why. Its dependent, the D05 1:1 canon floor, is self-consistent
after the halving: still 1:1 at a 1303 px viewport, and the floor at 1948 px
halves from `0.12332` to `0.06166`.

### Deliberately not touched

Terrain. `terrain-dem-r4` (shelves, mountain ranges), `terrain-site-tiles-r2`
and the stream tilesets are addressed by fraction and do not move; re-cropping
terrain is step 5's work. `viewportOverscanRatio` is dimensionless.
`tierMaximumSpan.world` stays `1`. `camera.test.mjs` keeps its `[0.25, 1/3]`
bounds rectangle and its `[1672, 941]` literal — neither is a registration.
