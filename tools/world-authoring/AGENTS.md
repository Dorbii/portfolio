# World authoring pipeline — SOLIDIFIED

**Status: solidified. Changing anything in this directory requires explicit
owner approval before you start, not after.**

If you are an agent working in this repository and you believe a file here needs
to change, **stop and ask the owner first.** Say what you want to change and
why. Do not refactor, "improve", extend, or work around these scripts on your
own judgement. A hash gate (`npm run check:world-authoring`) will fail if you
edit them without recording approval, and that failure is the point — it is
cheaper than discovering months later that the world stopped being reproducible.

## Why this directory is protected

These scripts encode invariants that are invisible in any single file and
expensive to rediscover. Every one of them exists because the project already
paid for the lesson:

- **One cell per invocation, one process, no queue inside the worker.** Two tile
  bakes once ran concurrently over the same output tree, raced, and destroyed
  106 tile files. The structure prevents it; a comment would not have.
- **Derived tiers are never hand-authored.** Every LoD level above the finest is
  a reduction of the level below. The moment anyone edits a generated tier it
  stops being a reduction, drift becomes invisible, and continuous zoom breaks.
  Regeneration must be the only path that writes them.
- **Gates run before anything is stitched.** A failed cell leaves the world
  untouched. Accepting first and repairing later is how the coast fix
  propagated a blocky shoreline into every downstream tile.
- **The brief is a required argument.** The one input only a human can supply is
  what a piece of ground should be. There is deliberately no default.

## The pipeline

| script | purpose |
|---|---|
| `plan-territory.mjs` | Lays out a territory: cell grid, settlement shelves, rail loop, and the terrain moments the loop demands. Produces the plan every cell is derived from. |
| `cell.mjs` | Authors or replaces ONE cell. Resolves geometry, interlocking tabs, neighbour context and conditioning from the plan; dispatches a bounded generation; runs gates; on pass, stitches and propagates. |

### Authoring a cell

```
node tools/world-authoring/cell.mjs --cell 4,3 --describe "..."
node tools/world-authoring/cell.mjs --cell 4,3 --describe-file brief.md
node tools/world-authoring/cell.mjs --cell 4,3 --dry-run
```

`--force` is required to replace a cell that already exists, and it reports what
will be regenerated before doing it. `--restitch` rebuilds an accepted cell's tiles
from its recorded sources with no dispatch and no gates: the way a changed seam rule
is carried through the world without a bake.

## Fixed contract — do not change without approval

| | |
|---|---|
| cell kept area | 2048 px |
| bleed into neighbours | 256 px |
| generated canvas | 2560 px |
| art density | 9.45 px per world px |
| ground scale | 0.4503 m per world px → 4.8 cm per art px |
| tile size | 256 px |
| pyramid | 7 levels, each an exact 2:1 reduction |

These are power-of-two aligned on purpose. A cell is a whole number of tiles at
every level, so dirty-tile propagation is exact and a replaced cell touches
nothing outside itself. Changing any of them breaks that alignment and silently
reintroduces resampling at every cell boundary.

Seams between two authored cells are content-aware (owner-approved 2026-09-02):
the boundary follows the minimum-error path through the two paints within
128 px of the nominal line, pinned to the jittered corners and feathered 8 px,
derived from the two sources alone so both cells agree on it. A fixed line cut
whatever straddled it. Edges to unauthored ground keep the geometric wiggle.

## Lighting

L2 carries **form shading and ambient occlusion only**. No directional key, no
cast shadows, no time of day. Daylight is a separate future layer (`L2_3`).
A baked sun cannot be removed later, so it is gated at generation.

## Water

L2 may paint water in the concept but must also remove it. Every cell delivers
the concept with water, the L2 layer with water alpha-0, and a classified water
footprint. The ocean and inland-water layers own everything at or below the
waterline; land publishes the boundary and stops there.
