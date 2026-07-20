# Regional art lock and normalization audit

Verdict: **PASS WITH NON-DESTRUCTIVE NORMALIZATION** for standalone territory layout work. This is not approval of a final stitched world map.

## Locked landmark set

The production manifest contains 46 canonical landmark assets:

- 5 employer capitals;
- 16 project landmarks;
- 25 active skill landmarks;
- 36 exact user locks preserved without substitution;
- 3 completed-review results promoted without a new batch;
- 7 directed replacement winners selected from two candidates each.

`skill/safe-writes@v1` and `skill/manifest-v3@v1` remain excluded. Java remains valid locked art but has no territory node because the current evidence registry marks it unplaced.

### Directed replacement decisions

| Asset | Locked replacement | Reason the other candidate lost |
| --- | --- | --- |
| Tanium | `city-tanium-r3-01-central-t-chain` | The cleaner alternative reads as one long institutional building; it loses city hierarchy and surrounding operational massing. |
| CableCar | `project-cablecar-r3-01-wide-span-cabin` | The alternative is more dramatic, but the simpler winner makes the two distant terminals and suspended cabin immediately legible. |
| Vendy VM Platform | `project-vendy-vm-platform-r3-02-three-arm-service-yard` | The other campus contains multiple bays but does not distinguish environment classes as clearly. |
| AI | `skill-ai-r3-01-routing-courts` | The alternative is a generic symmetric hub; the winner has readable routing, evaluation courts, and a distinct non-accelerator silhouette. |
| Java | `skill-java-r3-01-runtime-keep` | The alternative is still capital-scale and overbuilt for a skill. |
| OpenAPI | `skill-openapi-r3-01-contract-hub` | The archive alternative reads as a generic temple or chip; the winner visibly mediates ingress through one contract surface into response paths. |
| React | `skill-react-r3-02-state-circuit` | The courtyard alternative does not communicate component direction or state return as clearly. |

### Completed-review promotions

- Career World Portfolio: `project-career-world-portfolio-r1-01-canonical-amplification`.
- Context compression: `skill-context-compression-r1-04-interface-bridge`.
- Python: `skill-python-r2-10-python-language-synthesis`.

TypeScript remains `skill-typescript-r2-10-typescript-synthesis`. The Python-logo annotation was attached to the TypeScript review but does not justify converting TypeScript into a Python-shaped asset. Python already has a stable Python-specific result.

## Normalization pass

### Projection

All 46 locked sources passed the full-set contact-sheet review for a consistent elevated orthographic isometric read and common facing direction. This is a visual raster audit, not recoverable camera metadata; the numeric production target remains azimuth 225 degrees, elevation 35.264 degrees, and roll 0.

No locked source requires a perspective regeneration before regional placement.

### Grayscale and tone

- 39 sources are exact sampled RGB grayscale.
- The 7 new directed sources are visually neutral but contain small channel differences from generation.
- Final compositing must apply `grayscale(1)` to every landmark, not only those seven, so the contract is uniform.
- Foreground-tone compensation ranges from 0.84 to 1.18 and targets a common sampled foreground luma of 112.
- Fourteen sources need more than an 8 percent brightness correction. The correction factors are recorded per asset rather than baked destructively into the reviewed source.

This preserves the selected concept pixels while resolving the visible dark/light mismatch at placement time.

### Framing and hierarchy

Source framing compensation ranges from 0.78 to 0.926. It corrects inconsistent empty margins in the concept sheets. It is separate from the map hierarchy scale:

- capital: 1.00;
- project: 0.44;
- skill: 0.28.

The seven regenerated silhouettes also have explicit layout-clearance overrides. CableCar reserves a wide shallow footprint, Vendy a broad deep project footprint, the T-shaped Tanium capital a wider capital footprint, and the regenerated skills remain inside skill-scale reservations. The territory collision gate runs against those corrected reservations.

## Mixed transport pool

City Shuttle, Commuter Car, Delivery Van, Cargo Boat, Harbor Ferry, Service Truck, and Work Skiff are locked as variation families rather than single-winner landmarks. All available variants remain eligible. Placement must shuffle without immediate local repetition and preserve road/water domain compatibility.

## Evidence and review artifacts

- `design/career-world/production-art/art-lock-manifest.json` is the selected-source and per-asset normalization authority.
- `design/career-world/production-art/transport-pool-manifest.json` is the mixed transport authority.
- `design/career-world/production-art/audit/normalized-review.html` applies the locked corrections non-destructively for review.
- Category contact sheets under `design/career-world/production-art/audit/` retain the raw-source comparison.

## Remaining boundary

The correction metadata has not been applied to a stitched map because the requested stop boundary is the five standalone territory layouts. Runtime art integration and the final composite remain separate future work.
