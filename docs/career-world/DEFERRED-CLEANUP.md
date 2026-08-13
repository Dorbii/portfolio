# Career World Deferred Cleanup

This file records accepted, non-blocking visual debt. It does not reopen a
completed scene phase or authorize changes to locked assets.

## Phase 3 coastline follow-up

Status: deferred until the post-Phase-6 foundation cleanup.

The accepted Phase 3 checkpoint remains the source of truth. The ocean artwork
and its motion language are locked.

Two coastline issues remain visible in isolated locations:

1. Some exposed coast segments retain alpha or edge artifacts that read as a
   cutout boundary instead of a material transition.
2. Long open-water features can sometimes be visually traced across land and
   into another coast, which exposes the shared ocean underlay.
3. Some static lake and bay edges still read as a hard mask boundary because
   they lack persistent swash, wet-edge, or breaker motion.

These are system-level cleanup items, not permission for per-coast patches.
The eventual correction must preserve the coastline geometry and locked water
art while working through the authored coast profile, masks, or registered
water-body segmentation.

The ownership split is explicit: land publishes the static coast geometry and
material profile; `ocean/coastal-ambience/` owns persistent animated swash and
wet-edge response; Phase 7 `actors-effects` owns transient crash foam and
spray. A land-side animation folder would couple geography to water timing and
is therefore intentionally rejected.

Acceptance requires visual checks at world and territory zoom:

- no black, bright, or checkerboard edge artifacts;
- no continuous water feature that appears to pass underneath a landmass;
- beach, shelf, and cliff transitions retain their intended material depth;
- persistent shoreline motion follows the published coast profile without
  changing land alpha or locked ocean art;
- no regression to water motion, scale, color, foam, or zoom fidelity.

## Phase 6 streamed-terrain follow-up

Status: deferred from the semantic-detail correction for visual review.

The close tier now replaces magnified broad relief with authored peaks, rock
faces, ledges, gullies, and scree across the camera-streamed grid. One content
transition remains visible when panning east from the Independent capital
region: the relief language changes abruptly at a tile boundary. The tile
registry, bounded residency, exact land alpha, and camera contract are correct;
the remaining work is a seam-safe authored overlap or shared semantic atlas,
not more sharpening, resolution, blur, or a runtime patch over one coordinate.

The NinjaOne B1 terrain cell no longer exposes the original hard rectangular
contact after the deterministic r3 low-frequency harmonization and shared
irregular contact mask. A broader resolution and texture-frequency transition
remains visible at parts of the regional plate boundary. Treat that remaining
transition as an L2 terrain-authority defect, not an effects-layer problem.
The durable repair is an expanded high-detail neighboring buffer authored in
the same material language; further blur or coordinate-specific overlays are
rejected. The repair must keep geography, city registration, water
registration, and camera coordinates fixed. Acceptance requires fixed-camera
comparisons at capital, site, and close zoom with no visible straight-line or
resolution-step transition.
