# Territory landform

Owns accepted macro geography, the land material, the baked inner contact edge,
and territory selection masks. Zoomed views crop this plate without changing
projection or coastline.

The world raster is always present. Its registered 4x raster preloads before
the shared territory transition begins and then crossfades using the
composition-owned detail state.

Each territory also publishes a normalized development envelope and capital
anchor. They reserve coordinate space for later infrastructure and structure
layers; they do not add city art or imply that every pixel inside the
rectangular authoring boundary is buildable.
