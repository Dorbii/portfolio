# Career World — NinjaOne City Kit Contract

Status: **T2 contract candidate for director and Steve review.** This document defines authoring inputs for the offline composer. It does not authorize asset generation or promotion.

## 1. Authority and invariants

- City scope is L4 only. L1 ocean, L2 terrain and native foliage, L3 inland water, world registration, camera, and shared LoD behavior remain frozen.
- Grammar authority for this contract is `public/career-world/capitals/ninjaone/city-v2/grammar/ninjaone-city-grammar-r3.json` in `master-1448x1086` coordinates. It contains 151 footprints (`84 compact`, `35 standard`, `29 large`, `3 landmark`), 595 circulation edges (`435 road`, `137 stairs`, `23 bridge`), 24 terrace bands, and a 12x9 density map.
- The master plate at `art-source/career-world/ninjaone-capital/city-nodes-r2/master/ninjaone-capital-master-r1.png` and all `city-r3` assets are visual references only. They may not be cut apart, alpha-repaired, patched, or promoted as v2 kit entries.
- Every v2 part is a standalone RGBA sprite plus a metadata sidecar. The composer owns placement, uniform scale, baseline z-sort, overlap, cast shadow, seam/contact shading, and the final global color grade. A part must not bake a broad cast shadow or surrounding terrain into its pixels.
- Projection is fixed: orthographic high-oblique, 72-degree pitch, south-southeast camera bearing. There is no composer rotation, mirroring, perspective warp, or non-uniform scale. Required headings are separate authored variants.
- Shared light is `career-world/world-light@r1`: direction `[-0.42, -0.36, 0.83]`, light color `#c9c6a8`, ambient `#17282d`, intensity `1`. Self-shadowing must agree with it; the composer adds the ground cast shadow.

The grammar file still labels itself `status: review`; QA-REVIEW records the r6 output as director-reviewed grammar v1 and the current T2 packet names r3 as the accepted input. T2 does not alter that upstream status field.

## 2. Kit taxonomy and full-capital targets

“Entry” means one unique sprite/sidecar pair. “Placement” means one use in a composed plate. Targets are the minimum useful full-capital library, not permission to generate every entry at once.

| Family | Class boundary | Full-capital placement demand | Target kit entries |
|---|---|---:|---:|
| Ground / terrace | `terrace-slab`: walkable level pad bounded by one terrace contour | 24 grammar bands, split into runs by the composer | 4: narrow, standard, wide, plaza |
| Ground / terrace | `retaining-wall`: vertical support face along a contour; no walkable route by itself | Derived from exposed band edges | 6: straight x2 headings, inside corner, outside corner, left end, right end |
| Ground / terrace | `cliff-transition`: authored seam from terrace masonry to frozen L2 rock; never replaces L2 terrain | Derived at city-to-rock boundaries | 4: left/right taper and inside/outside wedge |
| Circulation | `road-straight`: constant-heading route with two compatible end sockets | 435 road edges before reverse/adjacent trace consolidation | 4 heading variants |
| Circulation | `road-curve`: one bend, no branch | Derived from joined road polylines | 4: two heading families x two handedness variants |
| Circulation | `road-junction`: degree 3 or 4 route node | Derived from joined graph vertices | 4: three T orientations plus one cross |
| Circulation | `stair-run`: crosses one adjacent terrace band; never substitutes for a road | 137 stair edges before consolidation | 4 heading/ascent variants |
| Circulation | `bridge-span`: crosses registered water or a declared ravine with two dry end sockets | 23 bridge edges before consolidation | 3: short, standard, long |
| Building | `compact`: grammar area `35-100` master px²; observed footprint span `6-14 x 5-10` master px | 84 | 12 reusable background variants |
| Building | `standard`: grammar area `110-234` master px²; observed span `9-18 x 10-24` master px | 35 | 8 reusable background variants |
| Building | `large`: grammar area `255-2124` master px²; observed span `10-58 x 9-59` master px | 29 | 6 reusable background variants plus the named skill entries assigned to this/standard class |
| Building | `landmark`: named, true-extent footprint; grammar area `20160-124960` master px² | 3 | 3 unique entries: palace crown, statue observatory, glass train hall |
| Building identity | Registered skill building, assigned to `standard` or `large`; may not be replaced by a generic at site/close | 19 registered skill nodes | 19 named entries, reuse-first from S01-S19 and regenerated only if requalification fails |
| Props / street detail | Non-load-bearing dressing that does not alter circulation or terrace topology | Density-driven | 16 entries: lamp, bollard, sign, banner, handcart, wagon, crates, barrel/sacks, bench, urn, notice board, brazier, crane, well, drain, utility beacon |
| Foliage | Tree/grove canopy and trunk cluster | Reuse registered L2 instances/atlases | **0 new entries** |

The native conifer atlases and `city-native-foliage-reuse-r1.json` are the foliage source of truth. Master-plate vegetation is overwhelmingly coniferous, so a city-specific tree set is not justified. Planters, ivy, moss, hedges, and urn vegetation are props or surface dressing, not a second foliage system. A new foliage entry requires a named visual defect that the native atlas cannot cover.

Full target: 14 ground entries, 19 circulation entries, 48 building entries (26 background, 19 named skills, 3 landmarks), 16 props, and no new foliage: **97 entries**, with reuse/requalification preferred before generation.

## 3. Shared asset record

Every candidate must ship with `<basename>.kit.json` containing this data. Values below show the shape, not an asset to copy.

```json
{
  "schemaVersion": 1,
  "id": "n1-k2-building-large-s01-golang-h000-r01",
  "family": "building",
  "class": "large",
  "variant": "s01-golang",
  "revision": 1,
  "image": "n1-k2-building-large-s01-golang-h000-r01.png",
  "canvas": [1024, 1024],
  "projection": {
    "camera": "orthographic-high-oblique",
    "pitchDegrees": 72,
    "bearing": "south-southeast",
    "headingDegrees": 0
  },
  "light": {
    "manifestId": "career-world/world-light@r1",
    "direction": [-0.42, -0.36, 0.83],
    "color": "#c9c6a8",
    "ambientColor": "#17282d",
    "intensity": 1
  },
  "paletteFamilies": ["roof", "wall"],
  "styleReference": {
    "source": "art-source/career-world/ninjaone-capital/city-nodes-r2/master/ninjaone-capital-master-r1.png",
    "crop": [0, 500, 650, 500]
  },
  "masterFootprintSize": [25, 21],
  "nativePixelsPerMasterPixel": 4,
  "groundSocket": {
    "baselineY": 896,
    "sortPoint": [512, 896],
    "footprintPolygon": [[470, 812], [554, 812], [562, 896], [462, 896]],
    "connectionSockets": [],
    "terraceCompatibility": {
      "mode": "level-pad",
      "slopeClass": "level",
      "bandDelta": 0,
      "headingToleranceDegrees": 7.5
    }
  }
}
```

Required rules:

- `id`, image basename, and sidecar basename are identical. Naming is `n1-k2-<family>-<class>-<variant>-h<screen-heading>-rNN`; screen heading is clockwise from image +x (`h000` points right, `h090` down). Candidate letters appear only in quarantine paths, never in promoted IDs.
- PNG is 8-bit sRGB RGBA with a transparent background. Canvas size is exact and declared before generation.
- `nativePixelsPerMasterPixel` and `masterFootprintSize` are authored values. The composer may translate and uniformly scale to the declared master footprint; it must not infer scale from the alpha bounds.
- An intrinsic contact shadow directly under a foot, wheel, or wall may occupy the footprint. Any detached or directional cast shadow is omitted and generated by the composer.
- Palette swatches constrain material hue and value families. They are not a literal five-color posterization ramp; the master crop supplies highlights, brass, warm windows, blue/purple accents, and material texture.

## 4. Palette and style-reference contract

Grammar swatches, in authority order:

| Family | r3 dominant swatches | Used by |
|---|---|---|
| `roof` | `#0d0d0d`, `#0d0e0e`, `#0e0f0f`, `#0f1010`, `#121212` | Building roofs, dark metalwork |
| `wall` | `#0d0b06`, `#19150d`, `#191308`, `#181108`, `#1f1a10` | Masonry, timber/metal structure, props |
| `rock` | `#090909`, `#0a0a0a`, `#0b0b0b`, `#090a09`, `#0a0b0a` | Terrace, retaining wall, cliff transition, bridge support |
| `foliage` | `#191d0d`, `#191d12`, `#20241d`, `#1b2017`, `#191d15` | Reused conifers, planted dressing |
| `water` | `#0c0d0d`, `#0b0c0c`, `#0a0b0b`, `#090a0a`, `#080909` | Reference/adjacency only; kit parts must not bake L3 water |

Style vocabulary: near-black slate roofs and masonry; warm bronze/brass trim; warm amber apertures and lamps; sparing blue/purple technical accents; dense Gothic-industrial silhouette detail; terraced stone construction; conifer-dominant planting. Avoid clean white stone, saturated lawns, pastel roofs, broad daylight, painterly blur, toy-like bevels, and untextured modular blocks.

Crop coordinates are `[x, y, width, height]` in the 1448x1086 master, origin top-left. The worker derives the crop at run time; no cropped plate pixels become kit output.

| Crop ID | Master crop | Primary use |
|---|---:|---|
| `REF-GROUND-D05` | `[0, 413, 691, 673]` | Western terraces, retaining faces, cliff seams |
| `REF-CIRC-CENTRAL` | `[180, 250, 760, 560]` | Stone roads, stairs, junctions, lamps |
| `REF-BRIDGE` | `[650, 430, 410, 350]` | Central bridge deck, parapet, abutments |
| `REF-BLD-COMPACT` | `[300, 300, 480, 420]` | Dense minor roof/wall rhythm |
| `REF-BLD-STANDARD` | `[0, 500, 650, 500]` | Western towers, workshops, civic buildings |
| `REF-BLD-LARGE` | `[750, 300, 600, 500]` | Industrial and large civic masses |
| `REF-LM-PALACE` | `[280, 10, 450, 285]` | Palace crown landmark |
| `REF-LM-OBSERVATORY` | `[840, 145, 150, 145]` | Statue observatory landmark |
| `REF-LM-TRAIN-HALL` | `[680, 845, 390, 165]` | Great glass train hall landmark |
| `REF-PROPS` | `[260, 270, 700, 520]` | Lamps, carts, crates, signage, street density |
| `REF-FOLIAGE-WEST` | `[0, 200, 500, 650]` | Conifer color, density, rock contact |
| `REF-FOLIAGE-EAST` | `[1000, 250, 448, 550]` | Ridge conifers and industrial adjacency |

## 5. Per-class generation contract

All rows inherit the projection, light, RGBA, naming, crop, and no-baked-cast-shadow rules above.

| Class | Canvas guidance | Palette | Required crop | Ground/socket mode |
|---|---:|---|---|---|
| Terrace slab | 1024x768; 1536x1024 only for plaza | `rock`, `wall` | `REF-GROUND-D05` | `contour-follow`; two route end sockets; walkable footprint |
| Retaining wall | 1024x768 | `rock`, `wall` | `REF-GROUND-D05` | `contour-follow`; wall-face support polygon; optional end sockets |
| Cliff transition | 1024x768 | `rock`, `foliage` only if the named entry includes planted dressing | `REF-GROUND-D05` | `cross-band`; one city edge and one frozen-rock edge; no terrain field |
| Road straight | 768x512 | `rock`, `wall` | `REF-CIRC-CENTRAL` | `contour-follow`; exactly two same-width route sockets |
| Road curve | 768x768 | `rock`, `wall` | `REF-CIRC-CENTRAL` | `contour-follow`; exactly two route sockets with one declared bend |
| Road junction | 768x768 | `rock`, `wall` | `REF-CIRC-CENTRAL` | `level-pad`; three or four equal-width route sockets |
| Stair run | 768x768 | `rock`, `wall` | `REF-CIRC-CENTRAL` | `cross-band`; two route sockets with `bandDelta` `+1` or `-1` |
| Bridge span | 1536x1024 | `rock`, `wall`; `water` reference only | `REF-BRIDGE` | `span`; two dry abutment sockets; support polygons required |
| Compact building | 512x512 | `roof`, `wall` | `REF-BLD-COMPACT` | `level-pad`; one footprint; no route sockets |
| Standard building | 768x768 | `roof`, `wall` | `REF-BLD-STANDARD` | `level-pad`; one footprint; optional door approach socket |
| Large building | 1024x1024 | `roof`, `wall` | `REF-BLD-LARGE` plus named skill reference if applicable | `level-pad`; one footprint; door approach required for named entries |
| Landmark | 1536x1536; train hall may use 1536x1024 | `roof`, `wall` | matching landmark crop only | `level-pad` or `span` as declared; true-extent footprint, no generic substitution |
| Prop / street detail | 256x256; 512x512 for wagon, crane, well | `wall`, `roof`; `foliage` for planted props | `REF-PROPS` | `level-pad`; footprint or parent attachment socket required |
| Native foliage cluster | Existing atlas dimensions; no generation | `foliage` | `REF-FOLIAGE-WEST` or `REF-FOLIAGE-EAST` for review | `level-pad`; reuse registered trunk/base socket |

Canvas dimensions are authoring ceilings, not permission for loose framing. The nonzero-alpha bounds should use the canvas while retaining the required clear margin. If an asset cannot fit without shrinking below its class detail target, its packet must name the larger approved canvas before generation.

## 6. Socket and baseline standard

Coordinates use PNG pixel centers, origin top-left, +x right, +y down. Floats are allowed in metadata; generated pixels remain on the declared integer canvas.

### 6.1 Required contact fields

1. `baselineY` is the maximum y-coordinate of `footprintPolygon`. It is not the bottom of the alpha bounds.
2. `sortPoint` is `[centroidXOfBottommostFootprintEdge, baselineY]`. The composer translates this point to the grammar placement anchor and z-sorts by placed `sortPoint.y + zBias`; ties resolve by placed x, then asset ID.
3. `footprintPolygon` is a clockwise, non-self-intersecting polygon with at least three vertices in part-local native pixels. It describes projected ground occupancy/contact, not the visible silhouette. Buildings include the wall-bearing pad; props include feet/wheels; foliage includes the trunk/root contact, not canopy spread.
4. `connectionSockets` is an array of `{id, kind, point, headingDegrees, widthMasterPx, bandOffset}`. Roads and bridges require two; junctions three/four; stairs two with band offsets differing by exactly one; buildings normally have none, but named door approaches may publish one.
5. A bridge also declares `supportPolygons` for each abutment/pier because its deck footprint crosses non-ground space. A wall declares a `supportPolygon` for the load-bearing face. These are additional to the single overall `footprintPolygon`.

### 6.2 Terrace compatibility

`terraceCompatibility.mode` is one of:

- `level-pad`: every footprint sample belongs to one terrace region; `bandDelta: 0`. Buildings, props, foliage, and road junctions use this.
- `contour-follow`: the part’s primary axis follows the local terrace-band tangent within `headingToleranceDegrees` (default 7.5); both route sockets use the same band offset. Slabs, walls, straight/curved roads use this.
- `cross-band`: sockets terminate on adjacent bands and differ by exactly one signed `bandOffset`. Stairs and cliff transitions use this. Separate ascending-left and ascending-right art is required; mirroring is forbidden.
- `span`: only declared support polygons contact ground. End sockets must land on valid dry route/terrace regions; the interior may cross registered water only when the grammar edge is `bridge`, otherwise only a declared ravine.

The composer chooses an asset only when socket kind, width, heading, and terrace mode match. It may join grammar fragments first, but it may not relabel road as stairs/bridge or infer a water crossing outside the registered bridge classification. Heading mismatch over 7.5 degrees, a footprint crossing an undeclared contour, a missing support polygon, or a socket outside the district mask is a hard composition error.

Uniform scaling is allowed only to the sidecar’s `masterFootprintSize`; a candidate whose required placement scale differs by more than 10% from its declared scale is the wrong variant. Rotation, mirroring, shear, and separate x/y scales are always errors.

## 7. Generation and promotion workflow

**Amendment 2026-08-21 (director, after the R007 probe — F11):** the generator cannot emit alpha or honor canvas size; it draws a literal transparency checkerboard and chooses its own resolution. Therefore every generation call MUST request a **solid pure-magenta (#FF00FF) background** (never "transparent"), and a deterministic post-process produces the contract-compliant asset: (1) key the magenta to alpha with a tight tolerance (the palette's blue-violet accents must survive — validate no accent pixels were keyed), (2) decontaminate the fringe ring, (3) crop to subject and uniformly rescale so the alpha bounds match the declared `masterFootprintSize` × `nativePixelsPerMasterPixel` within 15%, composited onto the exact declared canvas with required margins, (4) measure `baselineY`, `footprintPolygon`, and sockets from the keyed alpha. The §7 mechanical gates then apply to the post-processed asset; the raw generator output is retained beside it in quarantine as provenance.

One asset packet names one defect or kit entry. It includes class, exact canvas, heading, master footprint target, palette families, one primary master crop, optional named-skill reference, socket metadata draft, and mechanical thresholds.

Output is quarantine-only:

```text
.codex-tmp/quarantine/city-v2/<task-id>/<asset-id>/candidate-a.png
.codex-tmp/quarantine/city-v2/<task-id>/<asset-id>/candidate-a.kit.json
.codex-tmp/quarantine/city-v2/<task-id>/<asset-id>/candidate-b.png
.codex-tmp/quarantine/city-v2/<task-id>/<asset-id>/candidate-b.kit.json
```

- Maximum two candidates per asset entry, total. A second call must name the defect in candidate A; it is not an open-ended variation pass.
- No candidate enters `art-source/`, `public/`, a composer manifest, or runtime path before director pixel review. Steve retains final visual acceptance.
- If both candidates fail for the same structural reason, stop under the two-strikes rule and propose a contract/pipeline correction in QA-REVIEW. Do not make a third candidate.
- Promotion copies the selected binary and final sidecar under the same stable ID, records source candidate/provenance and hashes, and leaves quarantine evidence intact until Steve’s review is complete.

### Mechanical gates

Mechanical gates establish file fitness only; they do not judge style or visual match.

- Exact declared width/height; PNG; 8-bit sRGB RGBA; readable and deterministic hash.
- Nonzero alpha exists. Alpha coverage must fall inside the packet’s declared class range: ground/circulation `3-70%`, buildings `8-75%`, props `1-60%`, foliage `3-70%`.
- Outer 4 px border and all four 16x16 corner blocks are fully transparent. Nonzero-alpha bounds retain at least 16 px or 2% canvas margin, whichever is larger, except a packet-declared bridge/road connection edge.
- Pixels with alpha `0` have RGB `[0,0,0]`. In the partial-alpha edge ring, at least 99.5% of pixels must be within 48 RGB-channel units of an opaque neighbor within 4 px; bright green/magenta matte colors not present in the referenced palette are an automatic failure.
- `baselineY`, `sortPoint`, polygon winding, polygon containment, self-intersection, connection widths/headings, support polygons, and terrace mode validate against the sidecar schema.
- Ground-contact classes have nonzero alpha within 2 native px of every declared contact/support edge. No floating gap, clipped support, detached shadow, or opaque pixel outside the canvas.
- Composite-on-black, white, and `#17282d` proofs are saved beside the candidates for fringe inspection.

### Per-asset acceptance checklist

- [ ] Entry name, class, heading, exact canvas, and named defect match the packet.
- [ ] Candidate count is one or two; both remain in quarantine.
- [ ] Mechanical gates pass and the report separates those results from visual judgment.
- [ ] Projection reads as 72-degree south-southeast high-oblique; no camera drift or mirrored light.
- [ ] World-light direction, warm key, dark ambient, and material response match the master crop.
- [ ] Required grammar palette families dominate; accents are sparse and crop-supported.
- [ ] Silhouette, detail density, and material vocabulary fit the named class; no baked terrain/water/context or broad cast shadow.
- [ ] Footprint, baseline, route/support sockets, and terrace mode match visible contact geometry.
- [ ] Director reviews candidate pixels and black/white/ambient composites before promotion.
- [ ] Steve’s final visual decision is recorded separately; worker/director language does not claim owner acceptance.

## 8. D05 proof slice for T3

D05 is `Western Skill Terraces`, master bounds `[0, 413, 691, 1086]`. The grammar assigns 25 building footprints: `13 compact`, `7 standard`, `5 large`, `0 landmark`; four terrace bands; and, after reverse-trace consolidation and majority-in-mask sampling, approximately `31 road`, `9 stair`, and `0 bridge` traces. D05 contains five registered skill anchors: S15 OpenAPI Observatory, S18 Tool Generation Wheelworks, S01 Golang Foundry, S10 Databricks Works, and S11 Docker Warehouse.

The proof validates assembly, sockets, z-sort, contact shading, cast shadows, grading, and multi-LoD output. It does not build the complete 97-entry capital library.

| D05 class | Unique entries to prepare | Estimated placements |
|---|---:|---:|
| Terrace slab | 2: narrow and standard contour runs | 4 band runs, split only where the mask/path requires |
| Retaining wall | 2: straight and outside-corner | 4-8 exposed band-edge runs |
| Cliff transition | 1: western rock taper | 2-4 city-to-L2 seams |
| Road straight | 2 heading variants | Part of ~31 consolidated road traces |
| Road curve | 2 handedness variants | Part of ~31 road traces |
| Road junction | 1 T-junction | Grammar-degree driven |
| Stair run | 2 ascent variants | ~9 consolidated stair traces |
| Bridge span | 0 | 0; adding one would exceed the grammar need |
| Compact building | 3 reusable variants | 13 footprints |
| Standard building | 2 reusable variants | 7 footprints |
| Large / named building | 5 named entries: S15, S18, S01, S10, S11 | 5 footprints |
| Props | 4: lamp/bollard, crates/barrels, bench/sign, utility beacon | 16-24 density-driven placements |
| New foliage | 0 | 0; preserve/reuse native L2 foliage |

D05 minimum: **26 unique kit entries** — 5 ground, 7 circulation, 10 building, 4 prop, and 0 new foliage entries. Requalify existing named/prop assets before spending generation calls. T3 may reduce placements when a grammar fragment is too short to carry a whole part, but may not add a bridge, landmark, or new foliage family to make the proof look fuller.

## 9. Open questions for Steve — ANSWERED 2026-08-21 (contract accepted)

Steve accepted this contract with the following parameter decisions; they are binding on all T3+ work:

1. **Style tolerance:** close/site tiers MAY lift values and material separation for readability, preserving silhouette, palette families, projection, and light.
2. **Identity timing:** all 19 named skill buildings must be individually identifiable at capital tier. Named entries therefore need distinct silhouettes and accent treatments readable at capital scale. If a specific entry proves visually impossible at that scale, escalate to Steve with evidence — do not silently substitute generics.
   **Amendment (Steve, 2026-08-21):** every named skill building must additionally integrate recognizable iconography of the technology it represents, expressed in-world as architecture, statuary, and ornament — the way the owner's Go concept building wears the gopher face in its dome. Examples of the register: Go → gopher face/statue; Python → serpents; Java → coffee-house forms; Docker → whale + containers; Databricks → stacked red-brick geometry. Never as text, literal logo reproductions, or watermarks. Silhouette carries identity at capital tier; the tech motif carries it at site/close.
   **Amendment (Steve, 2026-08-21) — canonical skill assets:** each named skill building is a single canonical world-wide asset. Project cities that demonstrate a skill reuse the capital's exact sprite (byte-identical, same sidecar) for visual familiarity — a skill is recognized across the world because it IS the same building. Regenerating a skill building for another city is forbidden; only a world-wide revision (rNN bump) replaces it everywhere at once. The NinjaOne capital is the visual index of all 19; each project city mounts the subset its project demonstrates. (S15 pending re-archetype: "OpenAPI Archive" scriptorium direction agreed over the keyhole observatory unless the in-flight r02 result surprises.)
3. **First replacement boundary:** composed output replaces D05 first, as a controlled in-context proof; the old plate remains elsewhere until further districts are accepted. A visible old/new seam during the transition is accepted.
4. **Final grade:** delegated to the director. Directorial decision of record: *moody but legible* — retain the gothic-brass identity and warm-lamp accents, lift the shadow floor and midtones enough that terrain, terracing, and material separation read on a standard sRGB display. Grade candidates get A/B proofs at grading time.

### Original questions (retained for the record)

1. **Style tolerance:** must native close-tier parts remain nearly indistinguishable from the dark master, or may close output lift values/material separation while preserving silhouette, palette families, projection, and light?
2. **Identity timing:** must all 19 skill buildings be one-to-one identifiable at capital tier, or may generic class silhouettes stand in at capital while the named entries appear at site/close?
3. **First replacement boundary:** after D05 passes director review, should composer output replace only D05 for a controlled proof, or wait for a complete capital plate and switch the capital atomically?
4. **Master darkness versus readability:** should the final global grade match the master’s current near-black shadow floor exactly, or target a slightly lifted owner-selected grade for normal portfolio viewing?
