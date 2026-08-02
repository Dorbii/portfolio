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

## NinjaOne continuous town fabric

- Each NinjaOne project town and the capital owns one transparent,
  non-evidence town-fabric atlas from capital through close tier.
- The atlases provide attached low-rise street edges and courtyards beneath
  the semantic capital, project, skill, and support structures. They do not
  replace those structures or change their identities.
- The atlas remains the same spatial base while zoom adds semantic structures,
  infrastructure, props, and actors. Site detail never swaps in a second
  independently arranged set of filler buildings.
- Fabric bounds cover the full authored town-plan blocks so settlement sprawl
  remains visible across each registered site envelope.
- Open courtyards and partial corridors keep infrastructure-owned streets,
  plazas, entrances, and pedestrian loops readable through the fabric.
  Ground texture remains owned by the territory layer.
- Town fabric renders before all semantic structures and uses the capital
  visibility envelope; it does not affect focus or camera framing. Modular
  ambient-building candidates are retained as authored assets but do not
  render over owners already covered by persistent town fabric.

Labels and interactions remain deferred. The shared camera reaches its
`0.055` site minimum across the full land plane. A bounded capital-tier camera
stream keeps the authored ground legible while panning, and site-tier local
terrain tiles provide denser contact material inside registered development
envelopes.
