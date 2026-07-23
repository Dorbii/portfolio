# World backdrop

Owns the non-playable atmosphere and the visible environmental light cue behind
the fixed world plane. The light manifest is consumed through
`shared/lighting.ts`; composition passes that state downward so later layers do
not import backdrop rendering code.

The Phase 3 light is fixed. A day/night loop remains deferred until land assets
can relight under the same source instead of disagreeing with procedural water.
