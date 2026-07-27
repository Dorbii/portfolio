# Close-land authoring materials

`close-ground-r1.png` and `close-rock-r1.png` are land-only source materials for
the offline streamed-tile build. They supply high-frequency surface information
at site detail; they do not define geography, elevation, coastline, water, or
runtime lighting.

`scripts/build-career-world-land-stream-tiles.py` removes each reference's
macro color and form, samples the remaining material signal in normalized world
coordinates, and blends ground and rock using the canonical slope field. The
browser loads only the resulting bounded WebP tiles.

Do not use these references as full-map overlays. Their authored composition is
not world geography.
