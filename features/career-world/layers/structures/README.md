# Structures

Owns employer, project, skill, utility, and landmark structures.

## Current Phase 6 slice

- Five employer capital cores consume the capital anchors registered by the
  Phase 3 territory manifest.
- Capital art is authored as transparent high-resolution raster assets. It uses
  the same normalized camera crop, territory reveal weight, and world light as
  the established scene. The SVG view box follows the camera directly so the
  source art is sampled again at each zoom instead of enlarging a cached layer.
- Every capital bakes the same high-oblique orthographic bearing. Finished
  assets are never rotated at runtime because that would rotate their visible
  walls, highlights, and shadows away from the shared world projection.
- The capital manifest owns identity, archetype, asset, and footprint;
  it intentionally does not duplicate position data.
- Every footprint stays inside the development envelope so later project
  buildings and circulation still have room. Asset alpha is sampled against
  the canonical land mask so the visible structure and its lower base cannot
  pass the envelope check while hanging over water.
- Territory-review footprints are compact proxies, not literal city extents.
  They preserve the readable, slightly exaggerated silhouette expected from an
  action-RPG landmark without making a capital core the size of its surrounding
  lake or consuming the later city envelope.
- Every capital remains a transparent structure-only asset. Its ground anchor
  identifies the authored contact point instead of relying on a second runtime
  scale transform. One bounded, source-aligned site tile per territory owns the
  surrounding foundation, terrain cut, and transition, so structures can be
  revised without turning their ground into another structure sprite.

Project buildings, skill buildings, labels, interactions, roads, vegetation,
actors, and effects remain deferred. The shared camera reaches its `0.055`
site minimum across the full land plane. A bounded capital-tier camera stream
keeps the authored ground legible while panning, and five site-tier
capital-local terrain tiles provide denser contact material only inside their
registered development envelopes. Ground ownership stays in the territory
layer.
