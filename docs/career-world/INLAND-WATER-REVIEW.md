# Inland water — mounted-island review

Current coverage: **45 mounted cells; 108 reviewable features** (37 stream routes, 30 pool regions, 41 waterfall/cascade segments). This is an implementation and visual-review inventory, not owner acceptance.

Use the **Inland review** panel in the development preview to select any feature, then use Frame feature / Previous / Next. **L3_4 Inland bed** independently toggles submerged sand/stones. Existing motion and effects toggles remain independent. The review panel uses the existing camera normalization; camera/LOD algorithms are unchanged.

The reviewed purple brook and gorge retain their source-bound field bytes and bespoke upper/lower treatment. Other falls share the same connected-sheet material and flight model with per-location anchors, measured water width and scaled spray. They share one 2048 × 2560 context atlas (about 26.7 MiB decoded with mipmaps), rather than loading one full land image per fall. Subpixel falls/particles fade and offscreen falls are culled. Lower-end performance is unmeasured.

The water field still derives coverage from the mounted land alpha. Paths are visual interpretations of the artwork/authoring notes, not surveyed hydrology. All shore-distance pixels remain identical to the ocean checkpoint; open-ocean flow classifications are preserved at mouths. River advection blends bounded phases to avoid large texture jumps at bends.

## Inventory

| Mounted cell | Stream routes | Pool regions | Drops | Review note |
|---|---:|---:|---:|---|
| l2-c0-0 | 1 | 2 | 0 | Closed spring beck and its two pools. |
| l2-c0-1 | 1 | 1 | 1 | Shelf lake drains west over the low shore cliff. |
| l2-c0-2 | 1 | 1 | 0 | Closed hollow beck; open sound remains ocean. |
| l2-c0-3 | 1 | 0 | 1 | Northern inlet reach; current alpha reaches the tile edge. |
| l2-c1-0 | 0 | 1 | 0 | Closed crater tarn; no invented outlet. |
| l2-c1-1 | 1 | 0 | 0 | Existing source-bound purple brook and pools preserved; palette stays blue with violet highlights. |
| l2-c1-2 | 1 | 4 | 0 | One logical closed beck with rock-occluded gaps; small eastern pond. |
| l2-c1-3 | 1 | 0 | 1 | North-fed broad reach to the drowned inlet. |
| l2-c2-0 | 1 | 2 | 2 | Closed forest gorge with two stepped drops. |
| l2-c2-1 | 1 | 2 | 1 | Raised spring pool drains to a terminal pool over one edge. |
| l2-c2-2 | 1 | 3 | 1 | Hot-spring basin and a separate short stepped beck. |
| l2-c2-3 | 1 | 0 | 0 | Moor beck exits south toward Tanium. |
| l2-c3-0 | 1 | 2 | 2 | Upper tarn, tall fall, short connector and lower tarn. |
| l2-c3-1 | 1 | 0 | 2 | Reviewed main gorge and lower void cascade retained without changing their paths or landing policy. |
| l2-c3-2 | 1 | 1 | 2 | Closed forest gorge, two drops, dark terminal water. |
| l2-c3-3 | 1 | 0 | 1 | Silver beck crosses one upland lip and continues south. |
| l2-c4-0 | 1 | 1 | 1 | Shelf stream/pool outfall on the east sea cliff; occluded gaps retained. |
| l2-c4-1 | 1 | 0 | 0 | Short conifer gully enters the coastal cove. Source-note southwest tarn/fall was in discarded bleed, not the mounted tile; coastal coves remain ocean. |
| l2-c4-2 | 1 | 0 | 1 | Northern shelf tarn continuation, lip drop and long south drainage. |
| l2-c4-3 | 1 | 1 | 1 | Quarry lake and distinct drainage to the sea. |
| l2-tanium-c0-0 | 0 | 0 | 0 | Coastal coves only; no inland water. |
| l2-tanium-c0-1 | 1 | 1 | 1 | East-fed stream and shelf pool discharge over the basalt edge. |
| l2-tanium-c0-2 | 0 | 0 | 0 | Sea cove only. |
| l2-tanium-c1-0 | 0 | 0 | 0 | Dry interior with northern sea context. |
| l2-tanium-c1-2 | 1 | 0 | 1 | Forest channel descends into the inlet; canopy gaps remain occluded. |
| l2-tanium-c2-0 | 0 | 0 | 0 | Dry shelf with western sea context. |
| l2-tanium-c2-2 | 1 | 1 | 3 | Pool-fed descent over successive benches to the southern coast. |
| l2-tanium-c3-0 | 1 | 0 | 3 | North-southeast beck drops through three terrace risers. |
| l2-tanium-c3-2 | 3 | 0 | 7 | Three visible becks; central/eastern branches step down toward the sea. |
| l2-tanium-c4-1 | 0 | 1 | 1 | Closed plateau tarn and an isolated short western seep fall. |
| l2-tanium-c4-2 | 2 | 1 | 5 | Western stepped beck and separate fern-hollow spring outlet, both reaching the coast. |
| l2-tanium-c5-0 | 0 | 0 | 0 | Coastal cove only. |
| l2-tanium-c5-1 | 1 | 1 | 0 | East-to-west ridge-fed shallow stream with broad connected shelf pool. |
| l2-tanium-c5-2 | 2 | 0 | 0 | Two distinct narrow becks drain to coastal water. |
| l2-tanium-c6-0 | 0 | 0 | 0 | Rocky sea cove only. |
| l2-tanium-c6-1 | 0 | 0 | 0 | Dry coastal promontory; no inland water. |
| l2-tanium-c6-2 | 2 | 1 | 3 | Quarry streams and pit; source edge handoffs are visibly misregistered and are not repaired here. |
| l2-review-tanium-c1-1 | 1 | 0 | 0 | Candidate forest river; source-bound snapshot, north-to-south flow. |
| l2-review-tanium-c2-1 | 1 | 0 | 0 | Candidate narrow forest beck with rock-occluded continuation. |
| l2-review-tanium-c3-1 | 1 | 1 | 0 | Candidate central river and shelf pool. |
| l2-review-tanium-c4-0 | 0 | 1 | 0 | Candidate closed lower-step pool; no source-visible river connection. |
| l2-coast-c2-0 | 0 | 0 | 0 | Open sea only. |
| l2-coast-c4-0 | 1 | 1 | 0 | North headwater shelf and rock-occluded beck to the northern coast. |
| l2-coast-c5-0 | 0 | 0 | 0 | Open sea only. |
| l2-coast-c6-0 | 0 | 0 | 0 | Open sea only. |

## Evidence and limits

- Every final feature was framed in the live browser: 108 captures under .codex-tmp/qa/inland-island-r1/final/runtime/. The final mouth correction only restored original open-ocean classifications; inland field bytes are unchanged from those captures.
- Contact sheets review-0.png through review-6.png record the earlier complete visual audit. Its coastal-cove misclassification was removed; the final inventory has 108 features.
- geography-proof-delivery.json records zero changes to all 341 shoreline-distance tiles, original open-ocean pixels, and the reviewed purple/gorge field bytes.
- final/recovery.json records shared-context restoration at the same paused clock. Inland-bed toggle was checked independently of ocean seabed; disabling inland effects produced zero inland effect draws. Normal motion/settings restored.
- Existing source gaps and candidate-art seams remain: notably Tanium c6-2 north/upper-west handoffs are flagged by its authoring note. No new geography was invented to conceal them.
- Water-in-bleed notes are not treated as mounted features. The N c4-1 coastal coves remain ocean; the note’s southwest tarn lay outside the retained crop.
- Focused gates: 43 pass. Full suite: 116 pass, 5 inherited failures, 1 skipped. Typecheck, scoped lint and production build pass.

## Rebuild

`npm run build:water` rebuilds fields and the mapped-fall atlas. `npm run build:inland-falls` rebuilds the atlas alone. `npm run check:water` checks source/field integrity; the inland-island tests also verify atlas/source hashes and complete inventory coverage.

Field input: ffface49dc35d982c4f44e264eb298cd2488d8517d4277028275a392c8dfba9f. Atlas: /career-world/layers/water/inland/fall-context-6ed777bd135d6508.webp.

Source inventory: art-source/career-world/water/inland-island-r1.json. Original gorge/brook annotations: art-source/career-world/water/flow-features-r1.json. Main ocean checkpoint remains 30af7d7d. Owner requested a local commit and main-branch merge of this inland candidate; cutout/arching corrections are deferred.
