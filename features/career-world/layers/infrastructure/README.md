# Infrastructure

Active only for the bounded NinjaOne city pilot.

The pilot owns project-to-skill paths, the capital skill campus,
terrain-preserving structure pads, and retaining edges. It does not yet own
inter-district roads, territory-wide trails, docks, or bridges.

Structures use explicit normalized world anchors. Routes use explicit
normalized world waypoints authored against the accepted terrain; they do not
derive geometry from the development allocation boxes. The boxes remain
disposable Territory QA overlays for measuring city coverage only.

Town surfaces use an explicit hierarchy instead of one fitted-stone treatment.
Terrain remains visible between structures. Capital, project, and civic
forecourts receive compact weathered-stone patches; service courts and local
lanes use packed earth. Only arterial and collector streets use narrow cobble
cores with worn-earth shoulders. Pedestrian loops remain navigation contracts
for actors and are never painted as a second road network.

No authored block polygon is paved. Primary streets and compact plazas begin at
the site tier; local, service, and stair routes are close-detail additions.
This prevents town material from washing across the settlement, rural terrain,
or coastline while retaining one stable road topology through semantic zoom.
`scripts/audit-career-world-town-surfaces.mjs` rasterizes the visible surface
contract against each persistent town atlas. The gate rejects excess surface
or hardscape coverage and any road/plaza collision with opaque building pixels.

Infrastructure remains beneath the structures layer so terrain, routes, and
buildings share one world space.
