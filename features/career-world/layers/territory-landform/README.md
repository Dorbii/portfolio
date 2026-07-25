# Territory landform

Owns canonical geography, the rendered land surface, macro elevation and
slope, topology diagnostics, and territory selection masks. Zoomed views crop
the same registered terrain without changing projection or coastline.

The r4 terrain surface and registered 4x derivative are independently rendered
from one DEM, ground material, hydrology field, coast classification, and light
contract. The territory asset preloads before the shared transition and
crossfades using composition-owned detail state; it is not a sharpened world
bitmap. The accepted illustrated source contributes only gated mountain-form
accents, not geography or an all-over texture.

The land-side coast profile consumes the shared topology-derived
classification: sheltered low terrain receives a broad beach ramp, ambiguous
terrain keeps a restrained rocky shelf, and high or steep terrain receives a
narrow cliff face and lip. Animated wet contact, breakers, and foam remain
water-owned. The plate does not contain capital-tier decoration.

The authored grayscale DEM remains the elevation source of truth for shoreline
profiling and later terrain edits. It is not the default land color. Runtime
slope, relief, and contour outputs are retained as diagnostic data, and the
topography overlay is exposed through an explicit interface toggle.

`world-land-mask-r3.png` is the single runtime silhouette for the rendered
plate, terrain fields, hydrology, and coast geometry. Water visibility may not
use a different land mask.

Each territory also publishes a normalized development envelope and capital
anchor. Small terrain shelves reserve viable sites for later infrastructure
and structure layers; they do not add city art or flatten the whole envelope.
Inland-water fertility is a broad ground-material response, not vegetation.
Vegetation, props, and local biome decoration remain deferred to the
environment layer.
