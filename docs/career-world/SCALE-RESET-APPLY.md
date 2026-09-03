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
