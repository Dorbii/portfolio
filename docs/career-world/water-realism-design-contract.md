# Career World water realism design contract

Status: internal implementation contract for the river, waterfall, and shared-water
realism slice. The user-visible stop remains visual review, not production approval.

## Verified authority and problem

- This worktree is the clean committed `b53f8a7` tip of
  `codex/career-world-rebuild`; no concurrent checkout is an input.
- The user-referenced ACE `production-r4` master is not present in this commit.
  The committed NinjaOne hydrology manifest instead binds
  `ninjaone-environment-terrain-master-detail-r2.png` at 5760x4320 and SHA-256
  `C6E2107C9A1AB425E5103964DC617E4DEE30865DF1EB50528007AF7BDF58BDA9`.
  That hash-bound plate is the immutable land-pixel authority for this slice.
- The current ocean is a credible visual floor. The current river overlay reads
  as a dark pasted corridor at site/close zoom, and the registered C1 waterfall
  does not read as a falling sheet, plunge disturbance, spray, or mist.

## Required outcomes

1. Preserve the authoritative land file byte-for-byte and preserve visible land
   outside registered water or an explicit cascade envelope. A cascade may
   overlay only its bounded lip, falling sheet, impact spray, and mist support;
   it must not repaint or regenerate the terrain source.
2. Render rivers with directional transport, multiscale wavelets, depth and
   undertow cues, bank contact, broken foam, and bounded eddy/turbulence response.
3. Render waterfalls with a legible crest, directional sheet/filaments, plunge
   pool disturbance, spray, and dissipating mist.
4. Make the treatment reproducible through validated profiles and manifest-derived
   semantic features rather than territory-specific shader coordinates.

## Architecture

- Keep one WebGL2 `WaterSurfaceRenderer`. It already owns open water, registered
  inland water, alpha-safe foreground composition, reduced motion, resource
  admission, and lifecycle cleanup. A second renderer would duplicate those
  concerns without a demonstrated visual or performance benefit.
- Replace the direction-only/style field with one packed regional texture. Its
  left RGBA half carries exact land-clipped coverage, signed velocity components
  with meaningful local magnitude, and an offline bank-distance/visual-depth
  transform. Its right RGBA half carries localized whitewater, obstacle-wake,
  mist, and cascade-stage support. The deterministic builder and reconstruction
  tests prove both halves remain inside accepted water. Do not regenerate land.
- Add a frozen, validated water-realism profile module. Ocean, river, rapids,
  waterfall, plunge-pool, and mist concerns receive explicit bounded numeric
  parameters. The renderer uploads packed profile uniforms; shader behavior must
  not depend on untracked magic coordinates.
- Derive tarn features and complete cascade descriptors from manifest metadata.
  Each cascade publishes approach extent/width, a crest segment, downstream fall
  vector/extent/width, impact footprint, plunge-pool/outflow footprint, mist
  drift/radius, and region id. Terrain-registered obstacle descriptors publish
  bow, shoulder, and downstream wake extents. Upload a bounded
  fixed-capacity list whose active flag is tied to the currently mounted regional
  cohort. Future territories reproduce the effect by publishing that same
  semantic contract.
- Keep three semantic composites in the inland shader:
  `body` (static registered coverage plus a bounded waterfall-sheet underlay),
  `effects` (foam and aeration inside water or explicit crest/fall/impact
  support), and `mist` (light-only opacity inside a local major-impact envelope).
  No river depth/contact term may change alpha or darken pixels outside the body
  mask. Dry terrain outside explicit cascade support returns unchanged.

## Rendering contract

- River coordinates use the decoded local flow basis. Two independently
  transformed macro-flow samples, troughs, and foam must travel downstream
  without UV reset flashes. The dense shared ocean micro-height lattice is
  forbidden in close rivers because it resolves as crossing hatches/rain.
- The distant ocean shader remains the accepted world/territory treatment. At
  site/close LOD, registered rivers reduce that world-ocean contribution and
  restore direction through local flow-aligned sheen and ripple terms.
- Bank depth/contact comes from the offline visual-depth field and is applied
  only to body color. Low-frequency breakup keeps the contact shadow
  intermittent rather than tracing a continuous pale or dark polygon outline.
  No full-channel noise churn.
- Waterfall sheet phase follows the registered downhill vector. Cross-flow
  filaments break the sheet without copying ocean-scale swell.
- Primary red coverage exclusively owns river, tarn, pool, and bank-contact
  coverage. Cascade descriptors may add a tightly bounded waterfall underlay,
  crest, falling sheet, impact spray, and mist over cliff pixels. Wake,
  undertow, and ordinary river detail remain source-water-only.
- Crest, fall, impact, wake, and mist energy scale from each descriptor's fall
  extent. Lip beads and fall threads use descriptor-local coordinates so short
  stages remain legible without screen-space hatching. Dry lip shadow is capped
  at `0.22`, the falling-sheet underlay at `0.72`, aerated sheet detail at
  `0.82`, impact foam at `0.60`, and mist at `0.16`. Those separate caps keep
  the fall readable without allowing a broad opaque decal.
- Plunge disturbance uses manifest-derived impact origins only as bounded spatial
  support. Analytic rings, rotating crescents, and coherent sweep bands are
  forbidden. Two independently advected noise scales must break impact foam into
  local filaments and flecks whose alpha varies within the authored impact mask.
- Mist is a separately composited, non-darkening pass with soft falloff, irregular
  breakup, and dissipation. It has no opaque floor and may cross dry pixels only
  inside the descriptor-bounded envelope of a major impact.
- Waterfall foam belongs at the lip, sheet, impact pixels, obstacle wakes, and a
  short authored turbulence reach. It must not form a broad pool-scale decal.
- Reduced motion freezes all time terms while retaining one fully rendered static
  frame. Regional loading, cohort fades, failure fallback, and destroy behavior
  remain intact.
- Keep existing semantic LOD/resource admission unless visual evidence requires a
  change. River/fall detail remains site/close-only for this slice; lower tiers
  continue to use the accepted authored plate and ocean material.

## Budgets and acceptance

- Add no texture binding or loader. Packing the auxiliary field beside the
  primary field keeps one texture per mounted region. Preserve the measured
  shared-water steady allocation of 250,700,205 bytes and 288 MiB ceiling;
  the largest packed two-region detail cohort remains below the separate 32 MiB
  native application union.
- Use no more than eight cascade descriptors and one tarn feature in the mounted
  profile; the current vertical slice uses two separated B2 cascade events with
  a real pool/run gap instead of four overlapping staircase descriptors. Keep
  all added field sampling bounded to registered water or explicit cascade
  support; dry pixels outside both branches return before mist or surface-noise
  sampling.
- Focused tests must cover profile validation/freezing, manifest feature derivation,
  deterministic masks/flow authority, body/effects/mist alpha ownership, reduced
  motion, lifecycle cleanup, and budget telemetry.
- Browser proof must show ocean, river/bank or confluence, waterfall/plunge/mist,
  and site/close LOD views. Final performance repeats the same seven-wheel C1
  cold-load workload used for baseline comparison.
- READY requires visible target effects without analytic ring boundaries, square
  bright artifacts, or a single high-contrast effect dominating the river body;
  unchanged authoritative land hash, green
  focused gates, no new repo-wide failures relative to the 173/190 baseline, and
  captured proof artifacts. Otherwise report NOT READY.
