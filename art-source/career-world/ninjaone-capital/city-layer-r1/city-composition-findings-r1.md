# NinjaOne capital composition findings

This is the ordered visual-fix queue for the isolated city-composition worktree. Only one item may be active at a time. A finding is closed only after its generated QA render is inspected and the focused gates pass.

## Closed

### CCF-01 — station does not match the accepted city concept

- Evidence: the previous blue-roof station read as a separate civic terminal and did not share the dark stone, bronze, cliff-integrated language of the accepted capital concept.
- Correction boundary: replace and re-seat the independent station asset only; keep train and rail independent.
- Acceptance: station reads as part of the same fantasy-industrial settlement at capital and territory scale without dominating nearby skill buildings.
- Resolution: replaced by `ninjaone-intercity-station-r2.png`, rebuilt at 240 pre-B1 pixels of preserved world scale, and inspected in both detailed and territory QA renders. The asset hash, station/rail/train ownership boundary, typecheck, and 17 focused city/topology tests pass.

### CCF-02 — rail perspective is invalid

- Evidence: `codex-clipboard-611a14b9-3717-4f38-aa93-d8491532f40e.png` shows constant-width screen-space rails and ties crossing an isometric landscape. Gauge, tie angle, deck thickness, and supports do not follow the scene projection.
- Scale evidence: `codex-clipboard-71ec264f-2677-4b8e-8063-162ba1e78b17.png` shows the first authored-segment attempt at roughly 50+ px across the tie envelope, larger than the ~31 px human scale cue and materially larger than the rail in the concept master. That render is rejected.
- Topology evidence: `codex-clipboard-43c7573c-4368-43b3-9071-d76a38430706.png` shows the northwest leg leaving into open water where no connected landmass exists. The station must be the northern terminus; the intercity route leaves only south or south-east.
- Correction boundary: replace the procedural ribbon with authored, direction-specific isometric rail segments and curves. Do not rotate a flat strip arbitrarily.
- Acceptance: rails share the terrain/station perspective, pass the station, and continue off-capital toward the south or south-east; they must not terminate at a skill building. At capital scale, the tie envelope targets 16–19 px against a ~31 px human cue, and viaduct clearance must read as roughly 3–5 human heights rather than a second city wall.
- Resolution: replaced the ribbon with 14 unrotated source-camera segments, physically gated all 13 consecutive joins (minimum 119 alpha pixels), calibrated a 16–20 px track envelope against the 31 px human cue, removed the invalid west leg, made the station the northern terminus, and retained only the south-southeast exit. Detailed and territory renders were inspected; typecheck and all 17 focused city/topology tests pass.

### CCF-06 — all skill buildings must be visibly placed

- Evidence: the city render did not visibly account for every skill building even though the manifest reported 19 nodes. Go was the sole omitted node because its accepted static plate retained an opaque presentation matte and both preview renderers skipped `assetNodeReady: false` nodes.
- Correction boundary: audit the rendered city against the canonical 19-node inventory; replace remaining generic slots and correct occluded, off-canvas, or omitted placements without changing the accepted building assets.
- Acceptance: every one of the 19 skill buildings has a distinct, inspectable city placement at the appropriate detailed LOD, with no generic building silently standing in for a skill node.
- Resolution: preserved the accepted Go building pixels, deterministically removed only the edge-connected dark presentation matte, retained all seven independent Go animation layers, and made the resulting static base the eighth semantic layer. Both detailed and territory render passes now emit the same complete 19-skill set. The Go alpha proof passes black/slate/gray/light backgrounds, all 19 nodes are ready, typecheck passes, and all 17 focused city/topology tests pass.

### CCF-03 — territory overview must not render a pasted city plate

- Evidence: `codex-clipboard-d32ca73a-b18c-44a5-a861-d510e7427da1.png` showed the city as one dense rectangular/island-like object pasted over low-detail terrain.
- Correction boundary: territory LOD remains terrain-led and sparse; detailed independent nodes appear only at nearer tiers.
- Acceptance: no visible mega-plate silhouette at territory scale.
- Resolution: territory LOD now owns a separate transparent sparse-settlement layer derived from independent paths, station, rail, and reduced building silhouettes. It contains no terrain pixels or population and does not render the rejected monolithic city plate. The current territory QA render was visually inspected against the rejected evidence and passes the sparse terrain-led boundary.

### CCF-09 — the city spatial skeleton does not match the concept master

- Evidence: the rejected R3 composite preserves old node/station coordinates and wraps a newly generated circulation network around them. Compared with the concept master, the station has the wrong relationship to the water and rail, the concept's water-crossing bridges are absent, districts sprawl through unrelated loops, and building hierarchy/scale is materially different.
- Registration evidence: the concept master and frozen 5760x4320 regional terrain are already pixel-aligned. A coarse gradient correlation search over scale/translation peaks at exactly scale `1.0`, offset `[0, 0]` with score `0.4380`; the next-best transformed candidate scores only `0.1527`. The rejected proof's extra `offset [0.08, 0.08]` and `scale [0.78, 0.78]` moved every landmark and socket away from its concept location.
- New rail evidence: the first identity-registered proof's direct station-to-southeast surface line is superseded. The accepted concept shows usable mountain faces beside the station and farther south; the revised territory route must enter a cave beside the station, remain hidden through the mountain, emerge from a second southern cave, then continue south/southeast. The lower concept loop may not turn into a building district. The first station-portal marker at `[0.385, 0.445]` sat beside the station shell instead of in the mountain face; the user-directed correction moves it left and slightly uphill to `[0.358, 0.432]` and retensions both adjoining route segments.
- Invalidated decision: treating the concept master as style-only authority is revoked. It is now the spatial composition authority for citadel, station, civic water spine, bridge locations, district masses, rail hinge, and relative building hierarchy. Frozen land/height/slope/hydrology remain geometry and physics authority.
- Correction boundary: produce a low-cost landmark/socket registration proof over frozen terrain before any more decorative city art. The proof must include citadel, station, water spine, bridges, south/southeast rail exit, compact district envelopes, and all 19 skill-building sockets.
- Acceptance: landmark hierarchy and relative positions visibly match the concept master while every physical footprint still passes frozen terrain admission. No new circulation texture is accepted before this proof passes.
- Resolution: the identity-registered proof now pins the citadel, station, three district masses, four hydrology-verified bridges, 19 terrain-admitted skill sockets, and the station cave -> hidden mountain -> south/southeast rail topology. The station portal was moved left/up into the actual cliff face at `[0.358, 0.432]`. All terrain and bridge gates pass, and the bounded layout critic returned GO on the final rail path.

### CCF-04 — building nodes need authored urban-to-terrain transitions

- Evidence: prior node renders showed black/isolated foundations and natural terrain immediately touching buildings, which made them read as stickers. `codex-clipboard-30fd58a2-94ac-4a74-b708-53c7e23bded3.png` is rejected because the detailed render remained disconnected gray terrace pads and clipped infrastructure fragments; R3's connected replacement is also rejected because it followed the wrong spatial skeleton.
- Root cause: transition art was authored before the concept-master landmark and building-socket layout was registered. Two follow-up ImageGen attempts that removed all generic buildings also failed because they produced sparse, repetitive courtyard islands; the concept's unmarked generic buildings are required urban infill.
- Selected direction: `city-concept-environment-source-chroma-r1.png` preserves dense concept-like infill, removes the station/rail emphasis, and has been registered over frozen terrain as a source-only transition proof. The source-owned silhouette now preserves tower, bridge, and cliff overhangs without letting the physics mask clip them. Its non-uniform bright and dark-plum matte is deterministically keyed and decontaminated from 29,891 detected source-key pixels to zero.
- Current evidence: all 19 exact concept sockets and the independent station now have terrain-supported feathered apertures; all 20 asset hashes resolve and the node-scale proof stays inside the artboard. Apertures cannot create new off-terrain holes. Nineteen independent graded infrastructure sleeves now supply local paving, stairs, rubble, retaining stone, and foliage under the skill nodes; the station intentionally receives no generic plaza because its quay/rail/water threshold belongs to later transport and civic-water layers. A source-derived dark-stone/foliage foreground crosses the lower contact band of every skill node. Hard coverage gates require both layers at all 19 sockets. The selected city silhouette also neutralizes 4,817 dark plum boundary pixels to zero without changing its alpha shape.
- Latest critic evidence: the remaining visible composition failures are no longer all CCF-04 work. Missing rail, four-bridge readability, disconnected civic water, station/citadel hierarchy, and population cues remain material but belong to their queued independent layers. Within CCF-04, the remaining concern is localized eastern-district warp/hard-edge cleanup rather than another baseplate regeneration.
- Correction order: retain the selected dense environment source, cut only the registered node/station ownership apertures, keep rail/train independent, then place the accepted skill assets. Do not clear unmarked filler buildings or regenerate another empty platform network.
- Acceptance: every node touches the connected urban fabric; no large empty generic pad survives; districts read as one city while frozen terrain remains the physics/topology authority.
- Resolution: froze `city-node-environment-detail-r1.png` as 19 separately registered atlas-derived contact sleeves and `city-node-transition-foreground-r1.png` as 71,543 pixels of source-derived foreground occlusion. Every skill node exceeds both 1,000-pixel coverage gates (minimum authored detail 9,564; minimum foreground 2,036). Source chroma cleanup remains 29,891 -> 0 and dark-plum silhouette cleanup is 4,817 -> 0 without changing the alpha silhouette. The station intentionally receives no generic plaza because its threshold belongs to the independent rail and civic-water layers. The focused critic returned GO, deterministic artifact rebuild is byte-identical, typecheck passes, and 17/17 focused city/topology tests pass.

### CCF-10 - the accepted rail topology is absent from the identity-registered city proof

- Evidence: the current integrated proof keeps train, station, and rail ownership independent, but only the station is composited. No readable platform track reaches the station-side cave, no exposed line emerges from the southern cave, and no south/southeast territory exit is visible. The critic correctly rejected the central stone viaduct as a substitute for rail.
- Correction boundary: register the existing independent train/rail components to the accepted station cave -> hidden mountain tunnel -> southern cave -> south/southeast exit contract. Do not restore a west leg, loop into a skill building, or bake rail into the city plate.
- Acceptance: the detailed render visibly connects station platform, station-side portal, hidden tunnel endpoints, southern portal, and the sole south/southeast intercity exit while preserving the existing perspective and gauge contract.
- Resolution: froze five independent visual transport layers plus a station-platform foreground rail slice. Thirteen unrotated source-camera segments form two exposed chains with 11 physical joins (minimum 107 alpha pixels); the missing span is a real zero-track mountain tunnel. Station, station portal, and south portal contact counts are 2,974 / 2,006 / 1,773 pixels; hidden-tunnel leakage and forbidden north/west/east exits are zero; the south/southeast edge owns 1,909 track pixels. The moving train and station remain separate assets. The focused critic returned GO, eight core rail artifacts rebuild byte-identically, typecheck passes, and 17/17 focused city/topology tests pass.

### CCF-07 - detailed-tier architectural scale systems disagree

- Evidence: the proof builder rendered skills through coarse 180 / 219 / 463 px hierarchy envelopes and the station at 470 px, overriding the runtime manifest's individually calibrated 124-228 px skill widths and 343 px station. This made the station and summit plateau disproportionately large and caused abrupt scale jumps between assets with the same door and stair language.
- Root cause: `scaleClass` was incorrectly treated as raster-size authority even though `city-node-composition-r1.json` already preserves pre-B1 world scale per asset. The earlier hypothesis that all skill nodes needed enlargement was rejected by the live manifest and rendered comparison.
- Correction boundary: consume each node's manifest `displayWidth`, use `scaleClass` as hierarchy metadata only, and derive apertures/transition coverage from each node's own footprint fractions. Do not apply one global multiplier and do not change territory LoD in the same pass.
- Acceptance: typical skill buildings read at the same inhabited scale as nearby stairs and figures, fill their intended courtyards, and remain subordinate to the station/citadel without reading as miniature sheds.
- Resolution: all 19 proof nodes now render at their exact runtime widths (124-228 px), the independent station renders at its 343 px runtime width, and transition apertures/foreground coverage scale with each node's footprint. The focused critic returned GO on citadel/station/node hierarchy and architectural detail density. Eight scale/rail artifacts rebuild byte-identically, typecheck passes, and all 18 focused city/topology tests pass, including the new manifest-width invariant.

## Active

### CCF-11 - baked placeholder citadel conflicts with the independent summit building

- Evidence: `codex-clipboard-f212d9ca-5b0a-4d5b-a609-6850d602e4f7.png` shows the independent AI / Agent Systems citadel sitting in front of a taller baked generic citadel from the selected environment substrate. Live layer inspection confirms the AI asset occupies `[1035, 215]-[1263, 405]`, while the summit region of `city-selected-environment-apertured-r1.png` still retains 222,979 alpha pixels and `city-node-transition-foreground-r1.png` retains another 6,148 pixels derived from the same source.
- Root cause: the current aperture is sized from the independent node's small ground footprint, not the full visible silhouette of the placeholder building being replaced. That leaves the generic towers and may reintroduce fragments through the source-derived foreground layer.
- Correction boundary: expand only the summit replacement ownership mask to remove the full baked citadel silhouette, then rebuild a terrain/civic transition around the independent AI building. Preserve surrounding retaining walls, paths, foliage, cliff detail, and all other nodes. Do not regenerate the baseplate and do not touch water.
- Acceptance: exactly one summit citadel reads at site/close tiers; no baked towers or duplicate facade survive behind it, while the summit remains connected to the accepted urban fabric.

### CCF-05 - scale cues need fantasy population variation (closed)

- Evidence: uniform building scale lacked an explanation for intentionally different structure proportions, and the original 16-cue raster used the rejected 0.78 fabric transform with no separate close-tier enhancement.
- Correction boundary: temporary independent site/close population layers with human, elf, dwarf, gnome, and orc silhouettes; never bake figures into buildings or terrain.
- Acceptance: population clarifies scale at site/close tiers without cluttering territory overview.
- Resolution: retained the accepted eight-character alpha atlas, identity-registered all cues to the concept layout, split them into eight sparse site cues plus eight close-detail additions, and moved them onto actual plazas, station frontage, paths, and service courts. Both tiers include all five races, all 16 anchors have canonical terrain support, world/territory/capital tiers render no population, and the existing critic returned GO. Nine population artifacts rebuild byte-identically.

## Delegated / paused

### CCF-08 - the waterway is background hydrology instead of civic city fabric

- Evidence: `codex-clipboard-2170d460-51e5-4362-b5dd-83b5d608cb96.png` shows the concept's broad connected pools, stepped cascades, whitewater, wet cliffs, masonry quays, bridge piers, and station/rail composition. The current detailed render exposes a narrow dark base channel with almost none of that city-specific water architecture.
- Root cause: the active circulation artwork was authored without the registered hydrology field as an input, while the renderer simply leaves frozen river pixels visible beneath unrelated terraces. No city-water transition/detail layer currently owns pools, falls, foam, wet banks, drainage, or architectural abutments.
- Correction boundary: author an independent visual-only city-water and bridge-transition layer registered to the frozen water/topology authority. Add pool surfacing, cascades, foam, wet-rock shelves, quays, retaining walls, bridge piers/abutments, and station integration without changing land, height, slope, collision, or navigable-water authority.
- Acceptance: the water reads as the capital's civic spine at city detail, all four registered bridges are visibly legible, bridge and station supports meet their banks, and every visual widening outside canonical water is clearly wet shelf/quay treatment rather than false physical water.
- Delegation: paused in this worktree at the user's direction because another task owns water. The unaccepted local water/bridge draft and all of its generated artifacts were removed. Preserve the critic's handoff observations: four bridge crossings must read distinctly; pool, foam, fall, and cliff patches need continuous hue/material seams; and every bridge needs believable bank, pier, and abutment logic. Do not implement or promote water here.

## Queued
