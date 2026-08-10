# Water surface

Owns open-water motion, hydrology, and the water side of the coastline
interface. The renderer consumes one continuous geometry field derived from the
land mask. The world albedo and coast field load first; the accepted
directional-wave reference and registered 4x coast field load before territory
detail begins blending.
The 4x coast geometry and base-resolution coast material keep independent
texel sizes so a detail-field swap cannot flatten bathymetry gradients.
The packed substrate channel continues terrain tone beneath shallow water,
while the coast material field continues DEM height across the visible shelf
so submerged formations receive the same directional light as the land. The
generated hydrology field differentiates sheltered water without changing
geography. Its red and green channels select independently phased water-body
instances for the mainland inner sea and southwest lake. Each body reuses the
accepted water assets but owns a fixed texture transform, lighter inland tint,
and concentric ripple origin. Water lines therefore cannot continue visually
beneath the enclosing land into the open ocean or between the two lakes. Beach
and cliff affinity derive from the same elevation and slope fields that render
the land; ambiguous shoreline uses the rocky-shelf default. Those material
weights change shallow color, water-side shadow, and breaker behavior without
repainting the coast.

`WaterSurfaceState` is the tuning contract. `motion` controls animation speed,
`waveStrength` controls displacement and crest height, `waveDensity` controls
the number of visible wave periods, and `detailScale` controls the micro-normal
contribution. Weather, opacity, and wind direction remain independent inputs.

`CAREER_WORLD_WATER_REALISM_PROFILE` is the revisioned material contract above
that runtime state. It keeps ocean settings plus bounded river-surface,
bank/depth, waterfall-sheet, impact, and mist parameters in one validated,
deeply frozen record. A future territory reuses the renderer by publishing one
packed regional texture: primary coverage, vector velocity with magnitude, and
offline bank distance in the left half; localized whitewater, obstacle wake,
mist, and cascade support in the right half. Tarn segments provide a
`rippleCenter`. Each waterfall publishes a data-driven cascade descriptor for
approach, crest, falling sheet, impact, plunge pool/outflow, and mist. Explicit
obstacle descriptors produce terrain-registered bow/shoulder/wake fields. The
runtime uploads authored approach and pool/outflow dimensions alongside crest,
sheet, impact, and mist geometry; it does not synthesize a generic wake length
from drop energy. All coordinates come from that manifest rather than territory
constants in shader source.

Registered inland water has three alpha owners. The source field exclusively
owns river, tarn, bank, wake, and pool coverage. A cascade descriptor may add a
bounded dark sheet underlay, bright aerated crest/fall/impact detail, and
light-only major-impact mist over the cliff pixels named by that descriptor;
dry terrain outside those envelopes remains unchanged. Broken crest flecks,
falling filaments, impact froth, obstacle wakes, and mist scale with descriptor
fall extent and packed support. Advected texture breakup and separate sheet,
impact, and mist alpha ceilings keep the support geometry from appearing as a
hatch field, rectangle, ring, or opaque decal. Close rivers deliberately use
two transformed samples of the broad macro height field: the dense
crossing-wave micro field remains ocean-only because it resolves as
rain/hatching at river scale. Canvas telemetry exposes schema and packing
revision so captures can prove that the field-driven resources are resident.

The shared scene LOD supplies continuous world-to-territory,
territory-to-capital, and capital-to-site weights. Macro swell remains
world-anchored. The
directional reference is not represented as a higher-resolution LOD asset:
both accepted albedos are full-world `3840x2160` rasters. Territory fidelity
comes from the registered 4x coast field and the fixed-world micro-line field.
LOD changes their contribution, never their frequency or coordinate origin.
Camera span therefore cannot resize or rephase either source.

The site weight affects only a secondary water-side swash/contact pass sampled
from the existing coast fields. It does not recolor, rescale, replace, or
rephase accepted open water. This narrow pass is the Phase 6 diagnostic for
whether close land shelves, beaches, and cliff contacts provide usable depth.

The directional raster contributes zero-centered local contrast instead of
replacing the world raster's RGB color. The micro-line field adds resolved
moving linework and normal detail as the shared territory weight rises. This
reveals fine structure without shifting the ocean palette. Procedural
displacement drives the authored lines, normals, specular crests, and sparse
open-water foam without resizing a raster. Device-pixel render scale is handled
separately and does not change wave speed, amplitude, texture origin, or color.

It does not import Phase 7 crash-accent nodes or resolve camera thresholds.

Both accepted water rasters are immutable runtime inputs. The world raster
provides the distant overview and
`water-surface-reference-r2-3840x2160.png` provides the approved directional
line language at territory zoom. Normal terrain builds verify the world raster
but do not rewrite it. Regeneration requires the explicit
`--refresh-locked-water` authoring flag.
