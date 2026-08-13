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
| 2 | `ocean` | Open-water authority, surface motion, and coastal ambience | Land pixels or inland-water geometry |
| 3 | `terrain` | Geography, elevation, slope, relief, detail, wildlife, and territory masks | Foam, wet contact, or moving water |
| 4 | `infrastructure` | Roads, trails, docks, bridges, plazas | Terrain or buildings |
| 5 | `structures` | Employer, project, skill, and landmark structures | Evidence UI |
| 6 | `actors-effects` | Actors, weather, particles, authored crash/foam accents | Base shoreline response |
| 7 | `interface` | Labels, focus controls, selections, evidence links, QA overlays | World art |

Environmental ownership is expressed through authority layers and their
toggleable sublayers instead of a generic `environment` bucket:

| ID | Directory | Responsibility |
| --- | --- | --- |
| L1 | `ocean/authority` | Registered open-water extent and coastline contact |
| L1_1 | `ocean/surface-motion` | Time-varying open-water surface |
| L1_2 | `ocean/coastal-ambience` | Isolated swash, spray, and marine accents |
| L2 | `terrain/authority` | Frozen geography and registered terrain assets |
| L2_1 | `terrain/detail` | Relief, trails, rocks, foliage, and ecology |
| L2_2 | `terrain/wildlife` | LOD-gated habitat accents |
| L2_3 | `terrain/dynamic-shadows` | Future supplemental relighting |
| L3 | `inland-water/authority` | Rivers, lakes, rapids, and waterfall geometry |
| L3_1 | `inland-water/surface-motion` | Currents, ripples, flow, and reflections |
| L3_2 | `inland-water/effects` | Foam, impact rings, mist, and spray |
| L3_3 | `inland-water/aquatic-life` | LOD-gated fish silhouettes |

Coastline is an interface between land geometry and water behavior, not a ninth
scene layer. Land publishes the mask, elevation, and slope. Water derives
continuous shelf and bidirectional distance fields from the mask, then derives
one serialized beach, rocky-shelf, and cliff classification from the same
topology. The single Phase 3 compiler uses that classification for the
land-side profile and publishes it for water-side shelf, breaker, and shadow
response. Neither layer may invent a second coastline material map. Phase 7 may
add sparse authored crash accents without redrawing the coast.

Persistent shoreline motion belongs under `ocean/coastal-ambience/` when it
is implemented. That code consumes the land-published profile to render swash,
wet-edge, and repeating breaker response; it does not live inside the land
directory. Transient impact foam, spray, and exceptional crash events remain
Phase 7 `actors-effects` nodes. This keeps static geography, continuous water
behavior, and event effects independently replaceable.

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

Accepted but non-blocking coastline debt is tracked in
[`DEFERRED-CLEANUP.md`](./DEFERRED-CLEANUP.md). That record does not reopen
Phase 3 or unlock the accepted water art.

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
| Site | `0.055-0.10` | Read one capital site and its immediate terrain | Streamed registered crops plus bounded local overrides |

Transitions occupy overlap bands around the tier boundaries. Territory assets
start loading before their reveal begins. Scene nodes and fixed-world
procedural effects may use the continuous transition weights. Registered land
rasters do not crossfade across a wheel-step sequence: they activate as one
coherent visible set after every intersecting tile is decoded. This avoids
softening sharp close material over an enlarged lower tier. Render scale rises
from `1x` at world view to `2.25x` at site view; total device pixel ratio is
capped at `2x` to bound GPU cost.

The land layer draws the active camera crop from its registered raster into a
viewport-sized canvas at that shared render scale. This avoids enlarging a
compositor-cached world image and preserves the pixels already present in the
`4x` territory plate. Structure SVGs use a camera-derived `viewBox` for the same
reason: source art is resampled for the current crop instead of scaling one
previously rasterized DOM surface.

At capital and site detail the land renderer requests only tiles intersecting
the camera plus a fixed prefetch ring. Tiles outside a larger retention ring
are evicted, and residency is capped independently of how far the user pans.
The complete tile manifest covers the authored land plane; the browser never
mounts that complete set at once. The full territory crop remains underneath
until the complete visible stream set has decoded, so a partial tile set cannot
create mixed sharp and soft bands during entry.

Stream tiles are offline-authored from the registered land plate, canonical
height and slope fields, and dedicated close-ground and close-rock material
references. The high-frequency material owns the visible close-tier RGB;
registered macro color contributes only restrained palette and geography
continuity. Material residuals, lighting normals, and deterministic noise are
sampled in world coordinates so adjacent tiles share one continuous field.
This is real close-tier information rather than a sharpened enlargement. A
narrow analytic alpha contact may hand off between authored material plates,
but no output RGB is blurred. Site tiles add only bounded structure-contact
material over that sharp stream baseline.

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
preserves Phase 3 macro relief through territory zoom but does not claim to add
vegetation, structures, or capital detail. During the territory-to-capital
transition, bounded world-aligned stream tiles establish higher-frequency
ground and rock information across the camera. During the capital-to-site
transition, authored local foundation tiles add only site-specific contact
material. This preserves the same geography while avoiding both a monolithic
close-view raster and a blurry enlargement of the territory plate.

The camera now reaches the shared `0.055` site minimum across the complete land
plane. A twelve-by-eight grid streams only the camera intersection and bounded
prefetch ring at capital detail. Every capital publishes one registered
site-tier terrain override above that established baseline; each preserves
canonical source alpha and remains inside its development envelope. Both
classes use the shared registered-raster activation policy rather than owning
component-local transition weights.

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

## Phase 6 capital-core slice

Phase 6 begins with exactly one employer capital core per registered territory.
The structure manifest owns each capital's identity, archetype, orientation,
palette key, and footprint. Its position is joined from the Phase 3
`capitalAnchor`; duplicating anchors inside the structures layer is forbidden.

Capital cores are fixed-world SVG structures. Composition passes them the same
camera, semantic-detail state, and world-light contract used by land and water.
They remain absent at world detail and crossfade with the shared
world-to-territory weight. Each capital uses the same ground-anchor contract
and one territory-owned local site tile above the capital-tier streamed
baseline. These overrides are separately registered, bounded, and replaceable.

Capital placement is validated against more than the anchor point. The
transparent asset silhouette and its lower base are sampled against the
canonical land mask, preventing a nominally valid anchor from leaving the
visible structure suspended over a lake, coastline, or neighboring water body.
Local site terrain remains owned by `terrain/authority`. Its world
bounds are registered inside the development envelope, its outer transition
reuses the exact territory source, and its alpha preserves the accepted land
mask so it cannot cover the locked water layer.

Roads, plazas, cable lines, vegetation, effects, labels, hit targets, and
evidence interaction remain in their owning later phases. Structure art may
show a building foundation or integrated porch, but not a surrounding road or
city pad.

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
