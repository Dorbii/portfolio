# Career World — STATE (resume here)

Rewritten 2026-08-30, post territory-resegmentation. The permanent record is `docs/career-world/QA-REVIEW.md`; this file is only the current resume point. **STATE.md is rewritten at every promotion and every dispatch.**

## Where things stand (one paragraph)

The old D06 district was **deleted outright by owner ruling** ("nuke and boot") — all 67 asset paths and every code path; the app is green without it (typecheck PASS, focused suites green, production build PASS). The rebuild is in its survey/concept phase and is governed by a new **scale contract** and a **settled territory map**. One blocker stands between here and re-authoring D06: the site re-survey at correct resolution.

## OWNER CONTENT AND RULINGS — all binding

- **Projects/towns:** NinjaOne has **Kaizen** (largest; EXISTS as `project-kaizen-agent` `[0.23,0.189]`, stays INSIDE the capital envelope as a capital district by owner acceptance), **Metrics-Service** (sited `[0.4934,0.2657]`, `360x280 MU`), **Vendy** (sited `[0.5831,0.2763]`, `270x220 MU`). **Bitbucket Pipeline REMOVED by owner** ("not that impressive") — it was the only town needing a tunnel.
- **Territories (W1b + W2, landed):** big island = NinjaOne north / Tanium south, boundary moved south per the owner's marked line (max dev `10.2px`); medium island = ACE west / Column east; smallest = Independent. Coverage exact: `0` unclaimed / `0` double / `0` cross-island. NinjaOne land `248,830 px` (largest). Anchors moved: Independent `[0.5773,0.882]`, ACE `[0.7536,0.6908]`; their DEM shelves and placeholder site tiles moved with them.
- **Land rule:** the city may ADD to terrain (embankment, viaduct, retaining wall, terrace — via a city-owned terrain-detail layer) but NEVER subtract. **Tunnels ARE permitted** (they remove no visible terrain; portals are added structures needing buildable ground at both mouths).
- **No baked shadows** in any albedo layer — shadows on their own layer for a future day/night cycle. Form shading REMAINS at D05's measured key light; cast/contact shadows are runtime (`NinjaOneCapitalAssetNodes.tsx`) or a dedicated layer (`L2_3` precedent).
- **Layer separation from the first pixel** — the old district died flattened. A fused raster is an automatic FAIL.
- **Fantasy races `~1.5m` to `~6.1m`** — size variation must be bounded and attributed (modules per builder-culture), not arbitrary.
- **Show concepts MOUNTED on the landmass at true registered scale** before owner review — isolated art hides mount defects.

## SCALE CONTRACT (S1/S2, in force)

`H ~= 0.13 m per master unit` — corroborated independently by D05 masonry coursing (median `3.30 MU` = `0.43 m`) and a `2.1 m` doorway. A director declaration of `H=0.492` is RETRACTED. **World/territory tiers are SYMBOLIC, not metric** (far-tier carrier measured `3.99-20.66x` too large; the runtime routes those tiers marker-only). Registration: `world = ([0.125,0] + master/[1448,1086] * [0.25,1/3]) * [1672,941]`; territory plate = world x4. **NinjaOne's `capitalEnvelope` `origin [0.125,0] span [0.25,1/3]` is IMMUTABLE** — D05 and the whole chain derive from it; W1b added a test asserting it.

## LANDED THIS ARC

- **L1 LoD hand-off:** detailed canon `0` throughout territory, cross-fades only in capital detail (span `.34→.27`); threshold = D05 at `706x869 px`, a doorway `11.9 px`. Tests `28/28`. *Live opacity-curve verification OUTSTANDING (DOM contract changed; do not claim it verified).*
- **Rail spine:** D06 station socket master `[699,775]`, exit `[718,1086]` (world `[416,314]`), trunk EAST to Metrics-Service then Vendy; level `H202` formation, gradient `0`, min radius `223 MU`, `0` below-ground samples.
- **Territory resegmentation** (above). Frozen terrain hashes verified unchanged; only the segmentation SVG moved in W2.
- **Coast handoff to the ocean program** delivered and consumed (their mask chain is re-baked and guarded). D06 has NO coastline (R1) — no ocean coordination needed for it.

## D06 LAYOUT — SOLVED (R11 SPLIT TYPOLOGY). ART REGENERATION IS THE REMAINING WORK.

**The arc R7-R10 failed on ORIENTATION, not craft, and R11 resolved it.** Director measurement of D05's built edges gives this 2.5D high-oblique projection's **ground axes: `30 deg` and `152 deg` screen** (`dir-projection-axes.mjs`). R3's surveyed chord ran at `86.5 deg` — `57 deg` off-axis — so every drawn rail read as going into depth or climbing; R7's plunging track and R8/R9's geometry stops were all symptoms of that one inherited fault. **Owner: "that doesnt read as a 2.5D view of a train."** Also fatal: R9 packed axis-aligned rectangles in PLAN space, which is not what the viewer sees — **all packing is now verified in PROJECTED space** (elements as parallelograms with visible faces, screen clearances, occlusion order).

**THE SOLVED LAYOUT (R11, survey-only, no art):**
- **Spine (from R10, fixed):** platform + pierless gorge span at **`30.000 deg`, `0.000` deviation**, deck `+64 MU`, gradient `0`, clears the gorge exclusion by `1.819 MU`, **`0` piers/portals in the setback**. Exit heads EAST toward Metrics-Service/Vendy — R3's south exit (`86.5 deg`) is WITHDRAWN.
- **Buildings sit on the shelf at the SHELF's angle, not the rail's** — D05's own buildings do the same. Station house `160x80 MU / 20.8x10.4 m` at **`99.898%` R3 ground support**; market/overlook `99x47.3 MU / 12.87x6.15 m` at `90.028%`.
- **Connection:** ground switchback stairs, `345.941 MU` long, rise `56 MU / 7.28 m`, `100%` R3-supported, hall door -> shelf -> level free span -> deck attach `[699,775]` -> platform.
- **Headroom found:** the largest same-aspect hall the ground carries is `230.4x115.2 MU / 29.95x14.98 m` at `90.5%` support — the `160x80` target was RETAINED for circulation margin, not forced. Nothing needed shrinking.
- Proof: `.codex-tmp/qa/D06-REBOOT/R11/R11-split-typology-projected-{full,1200}.png`, `r11-split-typology-report.json`.

**Option C (relocate the district) is NOT needed** — owner pre-authorised it as fallback; R11 kept D06 on the west shelf.

**NEXT: regenerate the art on this layout.** Carry forward: R7's D05-crop-conditioned generation discipline (style anchored to pixels, never words), R5's compose-to-boundary rule, R6's attachment rule, the no-baked-shadow package (`S01` empty), layer separation, full-stack mounted proofs + D05 side-by-side sheet, and `R8/rail-placement-reference.md` (level deck, Glenfinnan gorge viaduct, 2.5D projection with ties perpendicular IN the oblique view). **R7's hall/market components were accepted on style and should be reused/translated, not regenerated.**

## DIRECTOR-INVENTED CONSTRAINTS — the recurring failure mode of this arc

Repeatedly, a lane STOPPED or a design was distorted by a rule the DIRECTOR invented and then propagated as if the owner had set it. Every one cost lanes. Check any constraint against the owner's actual words before enforcing it.

| Invented constraint | Owner's actual rule | Cost |
|---|---|---|
| "No piers in the gorge" (from R3's reading of no-subtraction; repeated in 8 packets) | *"Thats not from me, they are fine in the gorge just have to be done correctly"* | Forced R10's pierless clear span; constrained every layout R4-R12 |
| "No tunnels" (T1) | Owner: a bore removes no visible terrain — tunnels permitted with buildable portals | T1 stopped; needed T1b re-run |
| "No terrain raster changes at all" (W1) | Owner: those capitals have ~2 placeholder assets each, *"why do we need to switch anything"* | W1 stopped and reverted; needed W1b |
| Byte-identity gate on a quarantine-only coast script (R0b) | The script never wrote a live file | R0/R0b stopped; needed R0c |
| Buildability `slope <= 54` (R1) | D05 itself is median slope `77`; only `36.7%` of the accepted district passes that gate | Produced a `51 MU` sliver and a `2m` station hall |
| "No structure in the setback" while also mandating a span through it (R11) | Contradiction; worker resolved it correctly and said so | Near-miss |

**Rule: no-subtraction means do not remove, repaint or recolour the terrain art, and do not fill or re-route water. It does NOT forbid structure standing on or over the land.**

## LOOSE ENDS (non-blocking)

- **D05 straddles the Tanium border** even after W2 — likely a bounding-box artifact (registered rect `[-270,413,691,1300]` vs irregular art); MEASURE, don't move.
- **Terrain SERVING defects (unowned, needs an owner assignment):** (a) tonal discontinuities at stream-tile boundaries, confirmed independently by director and ocean session; (b) RESOLVED as transient: coast texels `[598,364]`/`[627,381]` showed black only during load — ocean session's re-capture with magenta backdrop after settle shows both painted (evidence: `notch_check.png` black at ~15s settle vs `notch_magenta.png` painted, identical camera). Mechanism: **late-arriving stream tiles show the backdrop through until decode lands** at capital/territory zoom. A serving-path race, not missing art — a future serving lane could add a loading placeholder (e.g. hold the territory plate under tiles until decoded). Do not hunt persistent holes.
- **W2 boundary reads straight** despite ±25px terrain-following latitude — owner may want a pass that follows ridgelines more visibly.
- **Ocean session coordination:** paint order is CSS z-index (`career-world.css`: land 3, ocean-ready 4, city 5, structures/foliage 7, inland water 8) — DOM order in `layers.ts`/`WorldScene.tsx` is inert; do not edit those two files (ocean session owns them).

## Rules that bite (durable)

Only Steve accepts (F10); two strikes → reframe; F17 discard-don't-repair; F21 eyes gate metrics; F24 log owner AND director misses; F27 calibrate gates against the accepted baseline — **and a gate that validates a transform of its own output is void (six instances last arc)**. An opening is bounded by its INTRADOS, not the deck. Repeat/seam checks are HIGH-ZOOM. A control ring bordering transparency is not a tonal reference. **A survey must be run at the resolution of the tier that serves the camera** (the DEM-15px lesson). Colour classifiers describe pixels, not objects — restoration/removal targets need component/attachment logic. Every concept is composited onto the landmass before owner review.

## Dispatch discipline

`codex exec --sandbox workspace-write -c model=gpt-5.6-{sol|terra} -c model_reasoning_effort=high "$(cat <packet>)" < /dev/null > <log> 2>&1` from REPO ROOT (a stray `cd` once silently killed a dispatch); verify the log grew past the banner; watch for the `tokens used` completion marker (never poll the process list). Bundled Node (F5): `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`. Quarantine-only until director review + owner acceptance. HEAD advances concurrently (ocean program) — re-establish red baselines per lane; known pre-existing red: D05 hash mismatch at `tests/ninjaone-capital-city-lod-routing.test.mjs:847`.

---

## L2 land regeneration programme (owner-approved 2026-08-31)

Supersedes the "patch the tiles" approach. Steve: *"start at L2 at the closest
zoom levels generate it and try to keep the same footprint and then go from
there"* and *"fine detail first then max LoD last that way we stop drifting on
land shape and scale."*

### Why the previous approach could not work

The site tiles are **20.0 px per world px**; D05's canon is **9.4**; the 4x
relief plate they are generated from is **4.0**. So the tiles are 2.1x finer
than the capital art but every pixel in them derives from a source 2.4x
coarser than it. That 5x information deficit is why "site tier adds nothing
over an upscale of its own capital tier" measured 1.43-1.57 against a median
of 12.28. No amount of restoring or sharpening authors topography that was
never drawn.

The derivation also ran the wrong way: coarse plate enlarged into fine tiles,
with coarse tiers authored independently. That is the direct cause of the
tier-to-tier drift, the Y=815 content break, and the four-way coastline
disagreement.

### The programme

1. **Author L2 at the finest tier**, tile by tile, conditioned on:
   - the DEM crop for that tile as landform armature (verified usable: the DEM
     is 1.00 px per world px, giving **70x59 samples inside one tile**, sd
     20-28, mean gradient 5.1-5.7 across land),
   - the slope field, so cliffs land where the ground is actually steep,
   - **pixel-anchored D05 canon crops for style**. Verbal style prompting is
     banned; it failed four consecutive times on D06.
2. **Generate each tile as a continuation of its finished neighbours' edges**,
   in raster order. Independently generated tiles do not join - that is the
   Y=815 break multiplied by every tile boundary, and it is the single failure
   mode most likely to sink this.
3. **Derive every coarser tier by reduction**: site -> capital -> territory ->
   world. Never author a coarse tier directly. LoD then becomes correct by
   construction rather than symbolic.
4. **Publish the resulting footprint to the ocean lane.** The coastline itself
   is now OCEAN's authority; land hands over a boundary and stops maintaining a
   coast that can drift. Footprint is "close enough", not defended per pixel.

### Pinned constraints

- **Neutral lighting.** Form shading and ambient occlusion yes; directional
  cast shadows and any implied sun angle NO - those belong to `L2_3 Dynamic
  terrain shadows`, which is why it sits PENDING in the layer registry.
- **Stylised toward D05**, not photoreal.
- **D05 remains the scale anchor** and does not move. Author at D05's density
  (9.4 px/world px) so nothing out-resolves the capital.
- **2x2 pilot before scale.** Four adjacent tiles must prove seams, style match
  against D05, and believable landform from the armature. ~157 land tiles total;
  finding a seam failure at four is cheap, at 157 is not.

### Retired by this plan

- The 9,733-px ocean authority flip and its de-speckle condition. Under the new
  coastline ownership the ocean derives its own coast; land does not edit
  world-land-mask-r4 on their behalf.

### World scale reset (owner-approved 2026-08-31)

The root cause of "scale and perspective are a constant issue", measured:

- 0.4503 m per world pixel (from 0.13 m per master unit).
- The ENTIRE world plane was 753 m x 424 m.
- The "great island" was 226 m across; a mountain range radius was 23 m.
- D05's capital is 125 m across -- a sane village core -- so the capital
  occupied 55% of its own island and was dwarfed by 23 m "mountains".

The capital was never too big. THE GEOGRAPHY WAS DRAWN AT BUILDING SCALE.

Approved fix: **world plane x2, land fraction 2/3**. That yields a ~640 m
great island with ~90 m ridges against a 20 m cathedral (~4.5:1, reads as a
town beneath hills) and costs ~88 regions to author. x3 reads better at 7:1 but
costs ~210 regions and was judged not worth tripling the work.

Every existing registration is re-derived: D05 master bounds, territory
envelopes, LoD span constants. Owner accepted there is no going back halfway.

### Territory budget

Sized by project count, capital weighted double (125 m vs a ~60 m project city).

| territory   | projects | regions | land approx |
|-------------|----------|---------|-------------|
| NinjaOne    | 4        | 21      | ~450 m      |
| Tanium      | 4        | 21      | ~450 m      |
| Column      | 2        | 14      | ~367 m      |
| ACE         | 2        | 14      | ~367 m      |
| Independent | 3        | 18      | ~416 m      |

Landmass A: NinjaOne north + Tanium south (42). Landmass B: Column + ACE (28).
Landmass C: Independent, isolated (18).

Independent is deliberately LARGER than Column and ACE — it holds Steve's
personal projects. Its character is mad-scientist / tinkerer / steampunk
fantasy, and that must read in the LANDFORM: crags, gorges, waterfalls, odd
rock to hang contraptions from — not gentle countryside.

A region is an authoring unit, not a place: 218 x 218 world px, about
98 m x 98 m of ground, output as one 2060 x 2060 image. It is simply the
largest patch one generation pass can draw at full detail.

### Standing land-design direction

- Rivers and lakes throughout, not only coastline. Interior without water is
  the least interesting ground in the world to fly over.
- Topography must be interesting AND buildable — benches, terraces, gorges,
  waterfalls. Flat plains are a failure, not a neutral outcome.
- Neutral lighting: form shading and ambient occlusion only, no directional
  key, no cast shadows. Those belong to `L2_3`.
- Style anchored on the neutral TERRAIN tiles (1.18-1.28x directionality), not
  D05's canon (1.51-1.57x, one baked sun at 220 deg).

### NinjaOne territory rule set (owner-approved 2026-08-31)

First territory to be authored. Rules are per-territory; do NOT generalise these
to other landmasses without the owner setting them.

- **Geology.** Columnar basalt — bedded, jointed, talus collecting at cliff
  bases. Plateau-and-gorge country, not rolling hills. Established by the L2
  seed region, which the owner accepted.
- **Vegetation.** Conifer gathering in gullies and on sheltered slopes, thinning
  on exposed rock and ridge tops; scrub and heather on open ground. Crowns
  4-7 m (83-146 px at 4.8 cm/px).
- **Water.** Coastal cliffs and shingle on the seaward edge; inland, tarns on
  plateau shelves draining by falls into gorges.
- **Buildable.** Roughly one third occupiable: coherent shelves able to hold a
  capital plus four project towns, separated by gorges and broken ground so the
  settlements read as distinct places.
- **Rail corridor.** A route linking all five settlement shelves. **This is a
  FANTASY railway and is not bound by adhesion physics** — owner ruling: *"it
  can go through mountains, its fantasy so it can even go under water or do
  some cool shit. Its a fun project not a science one."* Tunnels, submerged
  stretches, improbable spans and spirals are all permitted and encouraged.
  A previously recorded `<=3% sustained gradient` rule was DIRECTOR-INVENTED and
  is retracted.

  The terrain requirement is therefore about OPPORTUNITY, not feasibility: the
  land should offer good rail theatre — a gorge worth bridging, a headland worth
  tunnelling, a shelf to run a line along, water to cross. L2 authors the
  terrain; track, tunnels, viaducts and any submerged section are built
  structures belonging to the infrastructure layer.

### Owner content: the railway

The train is **Circle CI**. The main station is in the NinjaOne capital.

**Topology: a closed double-track loop** — two rails, one each way, running out
from the capital, calling at each project city, and returning. Owner: *"just
have a 2 rail come and go loop."* Not hub-and-spoke; a single continuous circuit
serving all five settlements.

Terrain consequence: the loop must be able to leave the capital and come back
to it, so the capital shelf needs TWO usable approaches rather than several, and
the circuit has to close. Since the railway may tunnel or cross water, the
requirement is that the route be INTERESTING rather than gentle — the loop
should collect a gorge span, a tunnelled headland, a cliff run and a water
crossing on its way round. Plan the circuit and the five shelves it serves
before any cells are generated.

This inverts the D06 failure directly: D06 had to force a station onto terrain
that could not support one, and its best layout found 0.055% buildable ground.
Land is now upstream of the city, so the ground is authored to carry the railway.

### Water authoring contract for L2 cells

L2 may PAINT water in the concept, but must also be able to REMOVE it. Each cell
produces three artefacts:

1. `concept` — water painted, composition as intended. This is the reference the
   ocean (L1) and inland-water (L3) agents work from.
2. `l2` — the same art with water zones alpha-0. This is what ships in the land
   layer.
3. `water-footprint` — mask plus classification per zone (coast, lake, stream,
   fall) so L3 renders rather than infers.

Gate: after removal, verify **no residual water-hued pixels** survive along the
footprint edge. D05's ocean-removal left blue fringes and the repo still carries
`residual-blue` artefacts from chasing them.

### Standing rule: remove dead code and legacy assets as you go

Owner instruction, 2026-09-01: *"we need to remove all the dead code and legacy
code and assets it finds or creates along the way. We need to clean the repo for
a change this large and doing it while working is easiest since you can check
and verify both the removal and the code replacing it."*

The L2 rebuild replaces terrain art, the LoD chain, the tile pipeline and the
district layouts. That obsoletes a great deal, and the cheapest moment to remove
each piece is **while its replacement is in front of you** — that is the only
point at which you can verify both sides of the swap. Deferred cleanup becomes
archaeology: nobody later can tell whether a file is dead or load-bearing.

**Do this as part of the work, not as a separate pass:**

- When a replacement lands, delete what it replaced in the same change. Do not
  leave the old asset "just in case" — that is what git history is for.
- When you find dead code or an orphaned asset while working, remove it then,
  even if unrelated to the current task. Note it in the commit message.
- Verify BOTH sides: prove the new path works and prove nothing still references
  the old one. Grep for references before deleting; run the focused tests after.
- Delete the scaffolding you create. Probes, one-off scripts, quarantine
  candidates and superseded evidence are not deliverables. `.codex-tmp` is
  gitignored precisely so scratch never becomes legacy.
- If something looks dead but you cannot prove it, say so rather than deleting
  on a hunch, and rather than silently leaving it.

**Already known to be obsolete or obsolescent** (verify before removing):

- The shoreline-erosion change in `build-career-world-land-stream-tiles.py` and
  the v3 coast fill — both superseded by the L2 rebuild, since regenerated art
  will not derive from the relief plate at all.
- The `d05-canon-ocean-removal-*` and `residual-blue` artefact families, once
  the new per-cell water contract replaces them.
- D06-era scripts, manifests and proof assets left behind by the district
  removal.
- Old LoD tier assets once tiers are derived by reduction rather than authored.
- Superseded terrain plates once cells become the source of truth.

Do not remove anything under `tools/world-authoring/` — that directory is
solidified and changes there need owner approval first. See its `AGENTS.md`.

### Pipeline status — 2026-09-01 session (stitch landed, first cell authored)

- **Stitch-and-propagate LANDED and verified** (commit `a72f74f`, owner-approved
  dispatch recorded in `solidified.json`). `cell.mjs` now: gates → copies
  artefacts to `art-source/career-world/l2-land/<territory>/<id>/` → recomputes
  every dirty tile FROM SOURCES (deterministic tab-seam ownership: corner
  jitter 64 px, tapered wiggle 64 px, 8 px feather; normalized weighted average
  in premultiplied space) → lanczos3 2:1 reductions through 7 levels →
  records the cell in the manifest-ledger
  `manifests/terrain-l2-ninjaone-r1.json`. Re-stitching is byte-idempotent, an
  interrupted stitch heals on re-run, tiles are lossless webp. Tile tree:
  `tiles/l2-ninjaone-r1/L{0..6}/{x}-{y}.webp`, territory-local; world
  registration deliberately pending the scale-reset re-derivation. No runtime
  consumes the tree yet — serving is a future lane.
- **Control suite ran FIRST**: `tests/world-authoring-stitch.test.mjs` (5/5) —
  alignment, bleed, gate blocking, seam ownership/blend, idempotence, exact
  pyramid reduction, all against computable expected bytes. It caught libvips
  retaining Windows file handles over tiles the stitch rewrites (fixed:
  `sharp.cache(false)`; would have corrupted the first neighbour stitch) and a
  false-FAIL mode of the isotropy gate on textureless synthetic input.
  Reduction kernel MEASURED: lanczos3 flattest luma over 6 halvings (drift
  0.1); the old test's "box" was nearest-neighbour decimation, whose
  detail-retention score rewards aliasing.
- **Cell c4-3 (construction zone) AUTHORED, GATED, STITCHED — on the second
  attempt, after an owner catch (F24: director missed it).** Attempt one
  passed every gate and the director's 1:1 review, but the owner saw a seam:
  a **bleed-ring character join** ~200-240 px inside every land edge — the
  worker had upscaled a 1254 px core into the kept area and generated the
  margins separately. It reads worst at REDUCED zoom (averaging turns a
  texture-density shift into a tonal split), which is where reviews must also
  look from now on. Three detector attempts overfit and were discarded;
  the landed fix **removes the possibility instead of detecting it**: the
  worker now delivers ONE square raw generation (>= `1254` px — the bundled
  generator's max; the seed's own source size) plus the water mask at source
  resolution, and `cell.mjs` performs the uniform upscale and derives
  concept/l2/water itself. A multi-pass canvas cannot reach the world through
  the dispatch path. The worker's first regen attempt REFUSED correctly when
  asked for >= 1536 (tool max is 1254) rather than faking it — the floor now
  matches tool truth. **A native-2048 generation path exists if the owner
  configures `OPENAI_API_KEY` for workers — that would raise effective density
  from `4.63` to `7.56` art px per world px (seed effective: `5.75`).**
- Accepted regen gates: isotropy `1.315`, land `78.5%`, water residual
  `0.13%`, fringe `0.22%` (still report-only; two accepted cells now measure
  `0.0%` and `0.22%` — harden to `<1%` next cell). `124` tiles
  (`81/25/9/4/2/2/1`). NO ring at any zoom — verified at 1:1 AND reduced
  scale. Style matches the seed; water classified coast/lake/stream/fall; the
  stream mask traces the channel ~`0.25 m` wider than the waterline per bank
  (wet-margin latitude for L3). Sea takes the E and S edges; the drainage
  stream crosses the N edge, so **c4-2 must continue it**. `sourcePx` is
  recorded per cell in the manifest.
- The accepted L2 seed moved from scratch into
  `art-source/career-world/l2-land/ninjaone/seed/` as the style canon cells
  reference. Superseded `.codex-tmp/authoring/cell.mjs` copy deleted.
- **Costs measured**: tiles ~`68 KB` avg (8.4 MB for this cell's 124); cell
  sources ~`35 MB` PNG each → ~`700 MB`/territory. Consider lossless-webp
  sources (pixel-exact, roughly half) — needs owner approval since cell.mjs's
  expected filenames are solidified.
- **NEXT: author c3-3 (west) or c4-2 (north)** — the first cell against a real
  authored neighbour, to prove the seam + conditioning path (context crops and
  binding maps are wired; only the frontier path has run live). Then proceed by
  adjacency toward the capital (2,1). Review artefacts for c4-3 in
  `.codex-tmp/dir-stitch/preview-*.png`.
- **OWNER RULING (2026-09-01): NinjaOne and Tanium share BOTH a land and an
  ocean border.** Director binding along NinjaOne's south row: cells `0,3`/`1,3`
  open into a SOUND (ocean border — the inlet-crossing and submerged-run rail
  features live there); cells `2,3`/`3,3` run as LAND into Tanium (the land
  border — no coast on their south edges); `4,3`'s south-east bay stays sea as
  authored. Recorded in the plan's `rules.southBorder`, so every south-row
  packet inherits it. Tanium's future plan must mirror it on its north edge.
- **Durability gap, flagged**: the territory plan
  (`.codex-tmp/territory/ninjaone-plan.json`) and its generator script are
  gitignored scratch, yet `cell.mjs` requires the plan and the manifest's cells
  derive from it. Moving it to a committed path touches a solidified constant —
  owner approval needed; until then a `git clean` erases the plan.
- **Unresolved, owner call**: the `407` uncommitted stream-r3 modifications in
  this worktree (shoreline-erosion re-bake + v3 coast fill, both declared
  obsolescent above) — commit as an interim fix for the live old-world serving,
  or discard. Left untouched this session.
