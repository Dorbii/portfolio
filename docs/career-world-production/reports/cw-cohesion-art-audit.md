# Career World cohesion art audit

- Run ID: `cw-cohesion-20260717`
- Lane ID: `ART-AUDIT-2`
- Mode: read-only audit; this report is the only file added
- Frame authority: `1600 x 900` canonical world units

## Summary

The committed asset library is usable for the requested 2.5D baseline. The current result fails because it treats those assets as independent thumbnails over a fixed background, not because the building art is generally missing detail.

The correction is:

1. Recompose the terrain to a native `1600 x 900` plate with one broad mainland for NinjaOne, Tanium, and Independent, plus enlarged lower ACE and Column islands.
2. Keep every building at one fixed world coordinate and one fixed world-unit footprint. Zoom changes the camera and reveals additional entities; it never substitutes layouts or changes building scale.
3. At world distance, render all five capitals and all sixteen project landmarks as compact city clusters. At mid distance, reveal the thirty-seven approved city-local skill instances. At close distance, reveal labels and ambient attachments. Animation remains deferred.
4. Generate deterministic grayscale and zone-tinted derivatives from the committed transparent WebPs. Do not use live CSS filters or blend modes.
5. Anchor every asset by an explicit ground-contact point and sort by that point's world Y. Do not position by image-box center.

The existing terrain plate should not remain unchanged. It can supply the approved coast, contour, cliff, vegetation, and drafting-line language, but its aspect, mechanical pads, city clearances, and island sizes materially conflict with the committed footprints and the accepted overview.

## Evidence-backed findings

### 1. The runtime asset library is complete and suitable for static composition

`public/career-world/art/runtime-art-manifest.json` contains exactly 56 routed derivatives: one world, five capitals, sixteen projects, twenty-seven skills, and seven ambient assets. Metadata inspection found:

| Category | Count | Runtime dimensions | Alpha |
|---|---:|---:|---|
| World | 1 | `1360 x 940` | no |
| City | 5 | `580-739 x 357-631` | yes, all RGBA |
| Project | 16 | `313-837 x 199-618` | yes, all RGBA |
| Skill | 27 | `269-608 x 159-507` | yes, all RGBA |
| Ambient | 7 | `173-490 x 228-377` | yes, all RGBA |

These dimensions support a maximum close camera of approximately `4.0x` under the fixed footprint sizes below without material upscaling. The current visible quality mismatch is therefore primarily a scale, parcel, anchoring, and palette problem.

### 2. The current terrain is the wrong composition substrate

The approved tracer world has the correct topology and line language, but the runtime crop is `1360 x 940`, while the canonical application frame is `1600 x 900`. It also reserves three oversized circular pads in a shallow band and relatively small lower islands. Those clearings were designed before the final building footprints were composed together.

The actual Tanium set includes two very wide landmarks (`uat-automation`, `xsearch`) and five projects total. NinjaOne has three projects and seventeen unique skill instances. ACE has two large/deep project footprints in addition to its capital. An unchanged pad map cannot hold those sets as readable districts.

Verdict: **material recomposition required**, not a simple resize. Reuse the tracer's coast/cliff/contour/vegetation mark-making; rebuild land envelopes, roads, city clearances, and island spacing.

### 3. Projection is broadly consistent; apparent drift comes from placement

Visual inspection of every runtime capital, project, skill, and ambient WebP found a common orthographic/isometric building language with verticals held vertical and the two ground axes kept parallel. The approved `225-degree / 35.264-degree` contract remains appropriate.

The assets have very different image-box proportions, however: projects range from `313 x 433` to `837 x 320`, while skills range from `269 x 466` to `589 x 159`. Center anchoring or a single `object-fit` envelope makes tall, wide, and linear assets appear to slide when zoomed. Every asset needs an explicit `groundAnchor`, `footprintClass`, and fixed `visualWidthWU`.

### 4. Baked palette variation is measurable and should be normalized

Visible-pixel inspection confirms that the current employer families are directionally correct but not mechanically uniform. Examples include NinjaOne's cyan family around hue 199 while Kaizen Metrics is materially bluer around hue 220; Tanium's capital is less consistently orange than its projects; ACE assets vary from magenta-red to red-orange. A grayscale-first pipeline is justified.

Greyscale/tinting will normalize color. It will not add line density. Sparse identities such as Ticket Validation Automation, ContextForge, Redis, and MacStadium should be stabilized by authored parcel size, roads, and nearby neutral ambient detail rather than enlarged until they compete with capitals.

## Exact asset routing

Runtime must use the optimized transparent WebPs under `public/career-world/art/`. The large design PNG sheets remain QA/source material and must not be served directly.

### World and employer routes

| Zone | Capital runtime asset | Projects rendered in that zone | Skill instances revealed at mid/close |
|---|---|---|---|
| World | `world/career-world.webp` as style/input for the required v2 terrain composition | All sixteen projects appear with their employer clusters at far distance | Skills hidden at far distance |
| NinjaOne | `city/ninjaone.webp` | `project/kaizen-agent-platform.webp`, `project/vendy-vm-platform.webp`, `project/kaizen-metrics.webp` | `skill/safe-writes.webp`, `skill/data-contracts.webp`, `skill/go.webp`, `skill/redis.webp`, `skill/mcp.webp`, `skill/openapi.webp`, `skill/workflow-orchestration.webp`, `skill/operator-control.webp`, `skill/react.webp`, `skill/aws.webp`, `skill/postgresql.webp`, `skill/vmware.webp`, `skill/macstadium.webp`, `skill/python.webp`, `skill/databricks.webp`, `skill/docker.webp`, `skill/ai.webp` |
| Tanium | `city/tanium.webp` | `project/tanium-risk-assessment.webp`, `project/uat-automation.webp`, `project/cablecar.webp`, `project/xsearch.webp`, `project/tmatch-eolmatch.webp` | `skill/python.webp`, `skill/go.webp`, `skill/workflow-orchestration.webp`, `skill/operator-control.webp`, `skill/data-contracts.webp`, `skill/csharp.webp`, `skill/localdb.webp`, `skill/react.webp`, `skill/electron.webp`, `skill/manifest-v3.webp` |
| Independent | `city/independent.webp` | `project/contextforge.webp`, `project/career-world-portfolio.webp` | `skill/context-compression.webp`, `skill/workflow-orchestration.webp`, `skill/data-contracts.webp`, `skill/typescript.webp`, `skill/react.webp`, `skill/operator-control.webp` |
| ACE Hardware | `city/ace-hardware.webp` | `project/ticket-validation-automation.webp`, `project/sap-table-update-integration.webp`, `project/qc-alm-extractor.webp` | `skill/informatica.webp` only; it remains employer-associated and project-unlinked |
| Column Technologies | `city/column-technologies.webp` | `project/atlassian-platform-automation.webp`, `project/atlassian-data-center-resilience.webp`, `project/client-devops-delivery-implementations.webp` | `skill/atlassian.webp`, `skill/ci-cd.webp`, `skill/docker.webp`; they remain employer-associated and project-unlinked |

`skill/java.webp` remains canonical but unplaced. Do not invent a zone instance to fill space.

### Ambient routing

| Runtime asset | Placement and reveal tier |
|---|---|
| `ambient/evergreen-cluster.webp` | Neutral land edge/filler; sparse at far, fuller at mid |
| `ambient/rock-cluster.webp` | Neutral coast/highland filler; sparse at far, fuller at mid |
| `ambient/service-truck.webp` | Mid/close road prop; static for this baseline |
| `ambient/cargo-boat.webp` | Far/mid sea-route prop; static for this baseline |
| `ambient/marker-buoy.webp` | Far/mid sea-route marker, especially island routes |
| `ambient/shore-pier.webp` | Mid/close ACE and Column island shore attachment |
| `ambient/roof-equipment-kit.webp` | Close only, and only when a tested roof anchor exists; never render as a standalone building |

Do not route any asset from `design/career-world/rejected-candidates/`, `design/career-world/correction-candidates/`, or the retired 3D folder.

## Terrain and district composition

Keep the `1600 x 900` frame. Recompose the terrain to these envelopes:

| Land mass / district | Canonical world extent | Purpose |
|---|---:|---|
| Main continent | `x 60-1540`, `y 55-605` | One connected land mass containing the three mainland employers |
| NinjaOne district | `x 105-600`, `y 145-585` | Western basin; approximately `495 x 440` |
| Tanium district | `x 545-1065`, `y 105-585` | Largest mainland basin; approximately `520 x 480` |
| Independent district | `x 1000-1535`, `y 145-595` | Eastern basin; approximately `535 x 450` |
| ACE island | `x 145-625`, `y 620-875` | Approximately `480 x 255`; enlarge and broaden current lower-left island |
| Column island | `x 990-1470`, `y 625-865` | Approximately `480 x 240`; enlarge current lower-right island |

Recommended camera centers remain close to the accepted anchors: NinjaOne `(350, 365)`, Tanium `(805, 340)`, Independent `(1245, 370)`, ACE `(385, 745)`, Column `(1230, 745)`.

Terrain rules:

- Remove the three visible mechanical circular pads. Replace them with irregular cleared parcels that follow the terrain contours.
- Keep one connected east-west road spine across the mainland, then branch locally into each city. Roads must terminate at authored parcels, not under arbitrary image centers.
- Preserve at least `38 WU` of terrain clearance between a city cluster and a coast/cliff edge, `24 WU` between a capital parcel and a project parcel, `16 WU` between project parcels, and `10 WU` between skill parcels.
- Keep the lower islands visually subordinate to the mainland, but large enough that each city cluster has coast clearance on all sides.
- Keep the water and terrain neutral. Zone color belongs to buildings, local road-edge accents, and subtle district contour bands, not to the entire land mass.
- The three mainland zones must read as neighborhoods of one continent, not separate circular UI nodes.

## Fixed footprint and scale contract

All sizes below are fixed world-unit sizes. They do not change by LOD. The camera magnifies them; LOD only reveals more entities and detail layers.

| Asset role | Fixed ground footprint | Fixed visual width | Far at `1.0x` | Mid at `2.2x` | Close at `3.6x` |
|---|---:|---:|---:|---:|---:|
| Capital | `88-108 WU` wide x `50-78 WU` deep | `108-122 WU` | `108-122 px` | `238-268 px` | `389-439 px` |
| Project | `44-82 WU` wide x `24-66 WU` deep | `54-88 WU` | `54-88 px` | `119-194 px` | `194-317 px` |
| Skill | `28-54 WU` wide x `20-42 WU` deep | `34-56 WU` | hidden | `75-123 px` | `122-202 px` |
| Evergreen/rock cluster | `18-32 WU` x `14-24 WU` | `20-34 WU` | sparse | `44-75 px` | `72-122 px` |
| Truck/boat/pier | `20-32 WU` x `8-14 WU` | `22-36 WU` | boat/buoy only | `48-79 px` | `79-130 px` |
| Roof kit | `12-16 WU` x `8-12 WU` | `14-18 WU` | hidden | hidden | `50-65 px` |

Footprint classes must be authored, not inferred from the transparent image box:

- `capital-deep`, `capital-wide`
- `project-standard`, `project-wide`, `project-deep`, `project-tall`, `project-linear`
- `skill-standard`, `skill-wide`, `skill-tall`, `skill-linear`, `skill-large`
- `ambient-land`, `ambient-road`, `ambient-water`, `ambient-attachment`

Every record requires:

- `worldX`, `worldY`: immutable footprint centroid/ground contact
- `groundAnchorX`, `groundAnchorY`: normalized coordinate inside the alpha image, usually near but not assumed to be bottom-center
- `footprintWidthWU`, `footprintDepthWU`
- `visualWidthWU`
- `layer`: terrain, road, parcel, building, attachment, label

Sprites must use the ground anchor as transform origin and z-sort by ground-contact world Y. No image-box center anchoring, per-zoom offset table, flex/grid placement, or automatic scatter is acceptable.

## Progressive-detail zoom contract

| Tier | Camera scale | Visible content |
|---|---:|---|
| Far / world | `0.95-1.35x` | Rebuilt terrain, roads, five capitals, all sixteen project landmarks, employer labels, sparse large ambient, two island routes. No skill labels or top-left selector/dialog. |
| Mid / city | `1.35-2.75x` | Same fixed capital/project positions plus the active city's approved skill buildings, project labels, denser local ambient, piers/trucks. Other zones may be culled outside the viewport but are not moved or replaced. |
| Close / project | `2.75-4.0x` | Same layout plus skill labels, focus/relationship state, tested roof attachments, and small static detail. Animation remains deferred. |

The world overview should therefore show twenty-one major building assets: five capitals plus sixteen projects. The city should already read as a cluster before zoom. The thirty-seven skill instances are the primary additional buildings revealed at mid distance.

## Grayscale and employer-mask pipeline

Generate static WebP derivatives during the art build. Runtime should render one final image per instance; do not pay for CSS `filter`, `mix-blend-mode`, stacked masked images, or canvas recoloring on every frame.

1. Decode the committed RGBA WebP and unpremultiply alpha.
2. Convert sRGB to linear light and compute Rec.709 luminance: `Y = 0.2126R + 0.7152G + 0.0722B`.
3. Apply one shared global tone curve across the whole library, not per-asset auto-levels. A suitable baseline is `N = pow(clamp((Y - 0.035) / 0.72, 0, 1), 0.9)`.
4. Map `N` through the neutral ramp: shadow `#08111B`, face `#24313C`, line `#D5DDE2`. Preserve original alpha exactly.
5. Derive masks from luminance, not original hue:
   - body mask: `alpha * smoothstep(0.10, 0.58, N) * (1 - smoothstep(0.72, 0.94, N))`
   - line mask: `alpha * smoothstep(0.48, 0.88, N)`
6. Composite the employer dark color through the body mask at `20-30%` and the employer line color through the line mask at `60-85%`. Keep the brightest neutral line value so detail does not collapse.
7. Encode the final pre-tinted derivative as alpha WebP. Generate only actual city-local skill variants: 17 NinjaOne, 10 Tanium, 6 Independent, 1 ACE, and 3 Column.

Recommended zone palette:

| Zone | Dark body tint | Line/accent | Bright highlight |
|---|---|---|---|
| NinjaOne | `#245461` | `#6FD8E5` | `#B9F5F7` |
| Tanium | `#65392B` | `#F08A55` | `#FFC09B` |
| Independent | `#4E385B` | `#B783D5` | `#E2C4F0` |
| ACE Hardware | `#632F35` | `#DD625E` | `#FFAAA3` |
| Column Technologies | `#344E61` | `#7EA9C5` | `#C4DFEE` |

Use a color-independent white/amber focus ring for selection. Do not alter a building's tint when zooming. Ambient assets remain on the neutral ramp; only subtle road-edge or parcel accents inherit the zone color.

## Blockers and risks

1. **Ground anchors are missing.** The runtime manifest records crop and alpha bounds but not the footprint contact point. Until explicit anchors and footprint classes are authored, zoom stability cannot be considered solved.
2. **The terrain must be rebuilt before final placement.** Authoring city coordinates against the current pad map will repeat the asset-dump failure.
3. **Palette normalization does not equal quality normalization.** It will fix hue drift, not sparse architecture. Sparse assets need correctly sized parcels and supporting terrain detail.
4. **No independent LOD art exists at runtime.** The optimized WebPs are one high-detail identity each. For this baseline, progressive detail must mean revealing projects, skills, labels, roads, and ambient layers. Do not fake LOD by swapping unrelated crops.
5. **Manual composition is required.** A packing or scatter algorithm may assist collision detection, but final positions must be art-directed and stored. Auto-layout will recreate the current result.
6. **Keep the maximum camera at or below `4.0x`** until higher-resolution close derivatives are justified. This keeps the smallest committed assets near or below native-pixel display size.

## Files inspected

- `design/career-world/README.md`
- `design/career-world/concepts/world/career-world-v1.png`
- `design/career-world/concepts/tracer/world-career-world-v1.png`
- all five `design/career-world/concepts/cities/*.png`
- all 56 routed runtime WebPs under `public/career-world/art/` (visual inspection by category; metadata/alpha inspection for all)
- `public/career-world/art/runtime-art-manifest.json`
- `docs/career-world-production/architecture.md`
- `docs/career-world-production/asset-inventory.md`
- `docs/career-world-production/concept-briefs.json`
- `docs/career-world-production/reports/art-promoted-56.json`
- `docs/career-world-production/reports/art-tracer-generation.json`
- `docs/career-world-production/reports/art-tracer-qa.json`
- `docs/career-world-production/reports/tech-world-composition.json`
- `docs/career-world-production/run-ledger.json`
- accepted mock references `career-world-mocks-v2/01-04`

No application code or art asset was changed.
