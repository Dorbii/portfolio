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
