# Clean-rebuild migration boundary

## Ported

- accepted world coastline registration, republished as the canonical land mask;
- r4 territory segmentation and five normalized focus views;
- the accepted stylized world-water source and visual reference;
- deterministic macro and micro height sources;
- the sheltered inner-sea classification;
- the existing Sites project identity.

## Rebuilt

- camera state and interaction;
- water WebGL renderer and shader composition;
- continuous mask-derived coast geometry;
- topology authoring plus canonical elevation and slope fields;
- registered terrain relief and topology QA derived from elevation;
- beach, rocky-shelf, and cliff response derived from terrain topology;
- world scene composition, layer contracts, and runtime verification.

## Intentionally not ported

- archive directories and one-off comparison artifacts;
- the legacy portfolio and Evidence Atlas runtime;
- duplicate layout-studio projects and local package stores;
- the monolithic shader and coordinate-specific coast patches;
- runtime land-contact correction overlays;
- Phase 7 crash-node behavior.
