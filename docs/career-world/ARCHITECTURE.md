# Career World architecture

## Source-of-truth rule

The 16:9 world plane is authoritative. A camera view contains only a normalized
origin and span. Zooming or focusing a territory crops that same plane; it
never changes projection, replaces geography, resets the water clock, or
substitutes a separately authored city canvas.

## Layer ownership

| Order | Directory | Owns | Does not own |
| --- | --- | --- | --- |
| 1 | `world-backdrop` | Atmosphere behind the world | Water or land color |
| 2 | `water-surface` | Open water, hydrology, water-side shelf/contact response | Land pixels |
| 3 | `territory-landform` | Geography, elevation, slope, terrain relief, territory masks | Foam, wet contact, or moving water |
| 4 | `infrastructure` | Roads, trails, docks, bridges, plazas | Terrain or buildings |
| 5 | `environment` | Vegetation, rocks, logs, signs | Infrastructure |
| 6 | `structures` | Employer, project, skill, and landmark structures | Evidence UI |
| 7 | `actors-effects` | Actors, weather, particles, authored crash/foam accents | Base shoreline response |
| 8 | `interface` | Labels, focus controls, selections, evidence links, QA overlays | World art |

Coastline is an interface between land geometry and water behavior, not a ninth
scene layer. Land publishes the mask, elevation, and slope. Water derives
continuous shelf and bidirectional distance fields from the mask, then derives
one serialized beach, rocky-shelf, and cliff classification from the same
topology. The single Phase 3 compiler uses that classification for the
land-side profile and publishes it for water-side shelf, breaker, and shadow
response. Neither layer may invent a second coastline material map. Phase 7 may
add sparse authored crash accents without redrawing the coast.

## Runtime boundaries

- `composition/` wires layers, owns stacking, and resolves one immutable detail
  state per camera update.
- `shared/camera.ts` is the sole camera normalization and transform contract.
- `shared/lighting.ts` is the sole runtime light contract; its source manifest
  belongs to `world-backdrop`.
- `shared/theme.ts` is the sole palette contract.
- Each active layer owns its renderer, state, and asset manifest. Layers consume
  resolved detail and light state; they do not recalculate global policy.
- Deferred layers expose a typed contract and no speculative renderer.
- Authoring scripts are deterministic and never run in the browser.
- `terrain-dem-authored-r3.png` is the canonical Phase 3 elevation source.
  Terrain slope is measured from an elevation continuation across the hidden
  mask boundary so the coastline itself does not create a false cliff.
- A deterministic low-frequency ground material is authored independently from
  elevation, then the generated terrain relief lights that material with the
  same world-light contract as procedural layers. Elevation remains available
  independently so a later day/night pass can relight terrain without replacing
  geography or its substrate.
- The accepted illustrated land source contributes only highland peak/ridge
  form accents. It is not a runtime plate and cannot override the canonical
  mask, DEM, ground material, coast classification, or shared light.

The current light is intentionally fixed. A moving day/night light is deferred
until land detail can relight with the same source; animating only procedural
water against baked land lighting would violate the shared-light contract.

## Camera and detail hierarchy

The camera is global; detail selection is global policy. Composition resolves
the tier, transition weights, render scale, and asset-preload flag once from
the camera span, then passes that state to every layer. Layers may provide
different assets or fixed-world procedural sources for a tier, but they may not
own separate thresholds.

| Tier | Approximate span | Purpose | Geography rule |
| --- | --- | --- | --- |
| World | `0.78-1.0` | Read landmasses, water bodies, macro terrain | Authoritative silhouette |
| Territory | `0.20-0.78` | Read territory terrain and capital placement | Same coast, seams, and major anchors |
| Capital | `0.10-0.20` | Roads, districts, capital and project/skill structures | Registered detail tile; no projection or coastline replacement |

Transitions occupy overlap bands around the tier boundaries. Territory assets
start loading before their opacity blend begins. Land crossfades registered
relief derivatives, water reveals fixed-world procedural line detail, and scene
nodes use the same transition weight as their reveal opacity. Render scale
rises from `1x` at world view to `1.5x` at territory view; total device pixel
ratio is capped at `2x` to bound GPU cost.

`shared/lod.ts` owns the only tier thresholds, transition weights, preload
boundary, and render-resolution budget. Each active layer publishes a typed
detail-source contract against those tiers. A registered raster must declare
its dimensions and world bounds; a procedural source must declare a fixed
world frequency. A full-world raster with the same dimensions as the world
asset may still be a material reference, but it may not be represented as
higher-density territory detail.

Water loads the world coast field initially and replaces it with the registered
`4x` field only when territory assets are needed. Both fields carry the same
land mask, shelf, bidirectional shore distance, and underwater substrate
channels. Coast geometry and coast material retain independent texel-size
uniforms because only geometry swaps to a `4x` asset; coupling those texel
sizes erases the base-resolution bathymetry gradient at territory zoom. The
coast-material field continues terrain height across that shelf in addition to
deriving beach and cliff affinity from elevation and slope, so submerged
formations, shoreline materials, and breakers cannot drift from terrain or
encode one-off edge fixes. Hydrology is rasterized and land-clipped by the same
deterministic asset build, so bays and lagoons cannot drift from accepted
geography.

The landscape may be **re-expressed** at a higher tier: more pixels, denser
linework, resolved vegetation, and locally quieter ground around structures.
It may not reshape the territory, move major terrain anchors, or create a
perspective transition. A capital is therefore a registered subregion inside a
territory, not a replacement map.

The full-world 4x surface is regenerated from the registered ground material,
canonical elevation, and shared light rather than sharpening a painted map. It
preserves crisp Phase 3 macro relief through territory zoom but does not claim
to add vegetation, structures, or capital detail. Production capital views
require registered territory-local detail tiles so a full-world 10K+ raster is
never required. Until that tile exists, entering the capital tier must remain
visibly marked as an authoring requirement rather than presenting an enlarged
world asset as finished detail.

The Phase 3 preview therefore caps its camera span at `0.29`, the smallest
accepted territory focus view. The resolver and node contracts include capital
LOD so later phases can implement it without changing camera semantics, but the
live preview does not expose unsupported art.

## City readiness without premature city work

Phase 3 registers one development envelope and capital anchor per territory in
the same normalized world coordinates as the camera, land, and water. The
envelope is an authoring boundary with a tested minimum land coverage, not a
claim that the entire rectangle is flat or buildable. Infrastructure and
structure layers must consume these coordinates and conform their local site
plans to the accepted terrain.

Territory and capital LOD assets may add local relief, quieter buildable
surfaces, and finer linework inside an envelope. They may not move its anchor,
change the coastline, erase a major ridge, or replace the orthographic
projection. This preserves enough capacity for a capital, circulation, and
project or skill structures without drawing Phase 4 or Phase 6 content early.

## Phase 3 acceptance gates

1. Five distinct territory masks cover the accepted land geography.
2. All focus views stay in bounds and retain one orthographic projection.
3. Land and water receive the identical camera transform.
4. The water animation keeps one continuous world clock through focus changes.
5. Every shoreline receives the same base shelf/contact derivation.
6. Land relief, topology QA, and coast materials derive from one canonical
   elevation model; no corrective visual overlay changes runtime geography.
7. WebGL shader compilation is verified in a real browser and fallback is
   observable through `data-render-state`.
8. Authored crash nodes remain deferred to Phase 7.
9. Every territory development envelope contains an on-land capital anchor,
   stays inside its focus view, and meets its declared land-coverage floor.
10. Inland-water fertility is a terrain material response only; vegetation and
    structures remain absent until their owning phases.
