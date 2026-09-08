# Inland water — current review r9

Owner requested inland alignment, painted-water repairs, darker transparent water with varied beds, a one-time Tanium pond-bank repair, and a submerged continuation of its stone groove. The final combined work includes the full land branch through **162faa9e**, preserving the newer water implementation. The incoming canopy version has motion disabled; its interface changes are included. Ocean material/artwork stays at the owner’s r7 checkpoint, with the specifically requested inlet classification and water-mask corrections.

## Current coverage

67 mounted cells: 63 authored and four existing previews. 108 inland features: 38 streams, 29 pools, 41 falls/cascades. The 39 mapped segments now declare **19 bed-following cascades and 20 curtains**; the two bespoke gorge segments remain separate. No deferred annotations were reintroduced.

## Changes

- Cascades use surface foam over the flowing bed and have no airborne curtain spray. Curtains use one continuous sheet, a lip-oriented edge, accelerating flow and a separate impact. Widening pools stop extending the sheet. East-sea-cliff anchors follow the owner purple plane; the silver drop now begins at the drawn cliff rather than on its upstream reach. Automatic lip/landing interpretation remains an approximation for unmarked locations.
- Repaired the headwater pond across the Coast c4-0 / NinjaOne c2-0 seam using the registered owner oval. Removed the eastern coast c7-2 painted wedge and contour while preserving the tall column. Removed painted water/caustics between the coast c7-0 stacks. Restored the owner-marked N c3-2 / c3-3 waterway. Restored 429 pixels of original stone opacity at the false raised-pond cap hole.
- Coast c1-0’s narrow tidal arm is explicitly marine. This is a local classification ruling, not a change to the ocean material or a global cove threshold.
- Bed albedo is sampled in linear light at channel scale, with darker depth color. Regional mixtures vary sand/gravel, forest cobbles and fractured limestone/slate; the bed is world-stationary and seen through refraction. The gorge pool has softer broken ripples and a shaded recess instead of its bright uniform rim.
- The owner-authorized Tanium c4-0 pond patch changes RGB only inside its recorded permission mask. Both converging stone grooves reuse the canonical route and kerb artwork via a water-only, unmasked export; their full widths and spacing are retained in a separate bed-albedo texture sampled before refraction, absorption and lighting; it is not an opaque bridge over the water. It follows the inland-bed toggle. Source, two bounded ImageGen candidates, selected output, exact prompt and proof are in [pond-bank-r9](../../art-source/career-world/water/pond-bank-r9/README.md).

## Verified

- Typecheck, production build, water provenance and protected-authoring checks pass. Lint: zero errors, 32 warnings. Focused water/inland/profile/mount: **44/44**. Full suite: **128 pass, four pre-existing failures, one skipped**. The four failures concern capital-envelope coverage, NinjaOne paving, territory resegmentation and Kaizen topography. Full verify remains red at those tests; build was run separately.
- Eleven authored source PNGs changed. Outside the one-time T c4-0 bank patch, RGB is unchanged. Opacity increases are limited to that bank reconstruction and the N c2-1 stone-cap correction. The bank’s 256,539 changed RGB pixels are all inside the permission mask. Detailed proof: inland-r9-reference/final-source-proof.json.
- Final camera/state captures report the current field revision, ready water, no pending field loads and GL error zero. The submerged groove reports ready. Bed on/off and normal-motion captures are included. These checks are runtime/mechanical evidence, not owner visual acceptance.
- A transient HMR schema mismatch was cleared by reloading after rebuilding generated profiles. A territory-only exporter invocation temporarily reduced the feed; the inventory gate caught it, the full 63-cell published feed was restored with --only-cells, and all 67 mounted sources were rebuilt and checked before committing.

## Review locations

Open http://localhost:4180/?view=water and use Inland review. QA is under .codex-tmp/qa/inland-r9/.

| Capture | Location / purpose |
|---|---|
| pond-floor-final | T c4-0 repaired bank and submerged groove |
| pond-bed-off / pond-bed-on | Bed and groove respond together to L3_4 |
| forest-cascade-final | N c3-2 surface rapids over visible bed |
| raised-cascade-final | N c2-1 short step and corrected stone cap |
| tarn-cascade-final | N c3-0 connector surface flow |
| silver-waterway-final | Restored N c3-2 / c3-3 waterway |
| silver-fall-final / east-plane-final | Cliff-lip/toe and perspective corrections |
| limestone-bed-final | Fractured substrate variant |
| gorge-pool-final | Recess shading and reduced circular rim |
| pond-seam-final | One water opening across the authored seam |
| marine-inlet-final | Coast c1-0; world center about [0.169, 0.077] |
| stacks-final | Coast c7-0; world center about [0.506, 0.094] |
| wedge-final | Coast c7-2; world center about [0.5045, 0.324] |
| world-final | Reverse zoom and full current mount |

## Provenance and regeneration

Field input: `cf1e6eace567d157ab5ff0811e031a59ab300c2b9dd375caecda8fe5b0b2615d`. Fall atlas: `/career-world/layers/water/inland/fall-context-09add8f08ae4ebd5.webp`. Submerged grooves: `/career-world/layers/water/inland/submerged-groove-dec104f30feb5b2e.webp`, 409 x 177 pixels.

`npm run build:water` regenerates fields and fall atlas. `npm run check:water` checks their input hashes. Land repairs use the unchanged cell.mjs --restitch, followed by world-register.mjs --only-cells with existing tone/chain data, then build:land-mount. Always retain the complete release feed. A changed source hash requires review of its annotations before refreshing the inland inventory.

Bank regeneration uses scripts/build-inland-pond-patch.mjs and its recorded crop/candidate/permission artifacts; restitch T c4-0 and rebuild its served snapshot and water fields afterward. The source/chain-before images retain the pre-patch inputs. The old no-water-on-chain note now has the explicit owner exception for this pond.
