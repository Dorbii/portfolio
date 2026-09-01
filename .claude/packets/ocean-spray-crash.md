# Task: why crash spray never reads, and what would make it read

You are working in a git worktree of a portfolio repo: an illustrated top-down
fantasy map with a solved-ocean water renderer. Work ONLY inside
`C:\Users\Steve\Documents\Github\portfolio\.claude\worktrees\ocean-lane`.

## The complaint (from the repo owner)
"When waves crash into large cliff faces shouldn't the spray be taller?" and
"when a wave crashes back into the ocean itself there should still be some sort
of effect." Both are currently near-invisible: measured mean spray density over
water is about 0.016, so plumes cannot read at any zoom.

## Standing art direction (do not violate)
The water must FEEL real, not BE simulation-correct. This is concept art, not a
solver: a few well-drawn events beat a physically-complete field. Plate
statistics are diagnostics, never targets.

## Read first
- `docs/career-world/OCEAN-STATE.md` — the lane handoff. Read all of it; the
  measurement methodology and the recorded failures both bite.
- `art-source/ocean-animation/src/shaders/spray.frag`
- `art-source/ocean-animation/src/shaders/foam.frag`
- `art-source/ocean-animation/src/shaders/composite.frag` (spray read-back)
- `art-source/ocean-animation/src/presets.py` — `heavy_crashing_surf` row
- `art-source/ocean-animation/src/ocean_gl.py` — offline uniform binding

## HARD CONSTRAINTS (breaking these breaks the live site)
1. DO NOT run `export_web.py`. It regenerates the live shaders and other agents
   are capturing the live app right now.
2. DO NOT edit any generated shader under `features/career-world/`.
3. DO NOT edit `spray.frag`'s canonical line
   `float site = texture(texImpact, uv).r;` or add any second
   `texture(texImpact, ...)` call — `export_web.py` rewrites exactly that one
   line into an analytic function and deletes the sampler. Adding a second call
   has already killed live water once.
4. DO NOT commit. Leave the tree clean apart from the deliverable below.
5. Any uniform you rely on must be bound in BOTH `ocean_gl.py` (offline) and
   the live renderer; three foam uniforms were once unbound offline, so offline
   and live silently disagreed. Grep both binding sites before trusting a
   result.

## What to do
Investigate, with evidence from the OFFLINE renderer (that is allowed and
encouraged — render frames, measure them), why spray density is ~0.016 and what
the chain actually is from "a wave breaks" to "a pixel is bright". Specifically:
- Where does the energy go? Trace impact/site -> plume -> spray buffer ->
  composite read-back, and find which stage is the bottleneck (is it injection,
  decay, the composite gain, or the LoD gates `uBreakVis`/`uOpenSpray`/
  `uOpenGate`?). Name the stage with numbers, not adjectives.
- Cliff-face crashes specifically: is coastline exposure (`site`) actually high
  at the capital's cliffs, or is the mask starving them? Measure it.
- Wave-on-wave collapse in open water: does `uOpenSpray`/`uOpenGate` ever fire
  in practice? Under what conditions? If never, say so and say why.

## Deliverable
Write `art-source/ocean-animation/refs/spray-diagnosis.md` containing:
1. The measured chain, stage by stage, with the numbers at each stage.
2. The single stage most responsible, with the evidence that isolates it.
3. A concrete proposed change: exact preset deltas and/or an exact shader diff
   (as a fenced patch in the doc — NOT applied to the file), with the predicted
   effect and how it would be verified.
4. Offline before/after render paths proving the proposal does what you claim.
   Two renders of the same build differ by wave phase, so compare distributions
   over many frames, never two images by eye.
5. An honest "what I could not determine" section.

Be blunt. If the honest finding is "spray cannot read at map zoom no matter the
gain, because the plume is thinner than a screen pixel", say that and show the
arithmetic — that is a more useful answer than a tuning knob.
