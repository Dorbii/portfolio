# Environment

The implemented subset owns sparse, explicitly authored town-frontage props:
lamps, stalls, carts, and benches. Every prop is attached to an existing
project-town or capital entrance by structure ID plus a signed normalized
world-space offset. The runtime resolves the final anchor from the current
town-plan entrance model, so infrastructure revisions remain authoritative.

The subset is site-tier only, uses the shared SVG camera and world light, and
is decorative (`aria-hidden` and noninteractive). It does not distribute,
randomize, or synthesize props at runtime.

At the close tier, the layer also owns explicitly authored rural outskirts:
field furrows, hedgerows, stone walls, groves, clearings, a lookout, and a
small neutral camp. Their footprints are validated against accepted NinjaOne
allocation envelopes and current town-fabric bounds. They remain decorative,
carry no portfolio or navigation semantics, and use code-native SVG.

Stable easter-egg slots reserve rural coordinates for later hobby details.
Every slot is currently empty and is deliberately omitted from rendering.
Weather, broader signage, and unauthored terrain details remain deferred.
