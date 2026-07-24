# Territory landform

Owns canonical geography, the illustrated land surface, macro elevation and
slope, topology diagnostics, and territory selection masks. Zoomed views crop
the same registered terrain without changing projection or coastline.

The illustrated r10 surface is the visible Phase 3 material. Its registered 4x
derivative preloads before the shared territory transition and crossfades using
the composition-owned detail state. It preserves the accepted line-art and
geography while replacing the old baked black shoreline matte with locally
sampled land color. It does not pretend to contain capital-tier decoration.

The authored grayscale DEM remains the elevation source of truth for shoreline
profiling and later terrain edits. It is not the default land color. Runtime
slope, relief, and contour outputs are retained as diagnostic data, and the
topography overlay is exposed through an explicit interface toggle.

`world-land-mask-r2.png` is the single runtime silhouette for the illustrated
plate, terrain fields, hydrology, and coast geometry. Water visibility may not
use a different land mask.

Each territory also publishes a normalized development envelope and capital
anchor. Small terrain shelves reserve viable sites for later infrastructure
and structure layers; they do not add city art or flatten the whole envelope.
Vegetation, props, and local biome decoration remain deferred to the
environment layer.
