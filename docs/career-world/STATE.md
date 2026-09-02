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
  (wet-margin latitude for L3). Sea takes the E and S edges with the cove in
  the cell's south-east; **the west edge is entirely land** (the first
  attempt's "coast wraps the SW corner" and `25.6%` west-edge water belonged
  to the DISCARDED attempt — carrying its report across the regen briefly
  misinformed c3-3's brief until the continuity gate caught it). The drainage
  stream crosses the N edge, so **c4-2 must continue it**. `sourcePx` is
  recorded per cell in the manifest.
- The accepted L2 seed moved from scratch into
  `art-source/career-world/l2-land/ninjaone/seed/` as the style canon cells
  reference. Superseded `.codex-tmp/authoring/cell.mjs` copy deleted.
- **Costs measured**: tiles ~`68 KB` avg (8.4 MB for this cell's 124); cell
  sources ~`35 MB` PNG each → ~`700 MB`/territory. Consider lossless-webp
  sources (pixel-exact, roughly half) — needs owner approval since cell.mjs's
  expected filenames are solidified.
### RESUME POINT — 2026-09-01, session 3 handoff (landed work committed on `codex/land-lod-completion`)

**What happened this session, in order.** Control suite `6/6` and the hash
gate were green before anything ran. Then:

1. **c3-3 saddle REPLACED** by `--redo --force` from the already-generated
   deep-green candidate — no bake. All seven gates PASS: key-light `0.0012`,
   land `98.4%`, water cut `0 px`, fringe `0%`, continuity ok, palette worst
   `dBG 0.130 / dLuma 11.7` (it IS the third calibration point). `143` tiles
   rewritten (`90/30/12/6/2/2/1`). Director eyes at 1:1, 1/4 and the L3
   tier: it joins the quarry; residuals listed below. Committed `5605a3d`.
2. **c4-2 replacement bake REJECTED by three gates** (`gpt-5.6-sol`, effort
   high, `12m46s`, `140,967` tokens; bakes are ~13 min, not 35): water
   continuity — stream at gen-x `8644` vs the quarry's `8435`, a **209 px
   miss** (bridge reach 150); water fringe **8.45%** (limit `<1%`; the
   worker authored its mask as a 16 px POLYLINE, leaving painted water beside
   the cut — director reproduction of the gate's classifier at ring 6/48:
   accepted c4-3 `0.22/0.18%`, c3-3 `0.00/0.01%`, candidate `7.78/6.27%`);
   palette **dBG 0.301** (limit `0.18`). World unchanged; candidate
   quarantined in `.codex-tmp/authoring/cells/c4-2/`. **c4-2 stays the OLD
   version** with its known stream miss at the c4-3 seam.
3. **Owner asked why the seams are obvious and why the neighbour context
   doesn't land the water. Measured** (`.codex-tmp/session3/{seam-geometry,
   seam-stats,seam-step,context-fidelity}.mjs`, overlay
   `review/seam-diag/seam-33-43-sourcemap-half.png`):
   - the stitch's jitter IS applied (ownership boundary wanders `-121..+78`
     px, blend `~11` px) but the wiggle is a 5-point smooth curve: the middle
     1000 px of the c3-3|c4-3 seam are straight within `±3` px;
   - band averages either side match (dLuma `1.8`), yet the LOCAL luma step
     along the seam curve is `21.8` (c3-3|c4-3) and `26.0` (c4-2|c4-3) vs
     `12.6–20.8` for straight lines inside the cells — a genuine
     discontinuity, ~1.5x interior;
   - **the generator never used the context pixels**: each cell's overlap
     strip correlates with the neighbour's paint at `r -0.015 / -0.012 /
     0.08`, the same as an unrelated patch (`0.09–0.15`). The packet shows
     the paint; the built-in tool in GENERATE mode takes it as a style
     reference only. Continuation happens solely at the stitch, where the
     neighbour wins the seam band and the new cell's bleed is discarded.
4. **Two owner-authorised probes of the built-in `image_gen` EDIT mode**
   (ledger R056/R057; no API key — Codex's ChatGPT login): the director
   built a 2560 edit target with the neighbours' CONCEPT paint in the bottom
   512 px and neutral grey elsewhere. Take 1 ("extend upward") returned a
   `1024x1536` portrait, band re-rendered at `r 0.357`. **Take 2, with the
   framing pinned in the prompt ("SQUARE, same framing and extent, band
   stays in place"): `1254x1254` (= MIN_SRC), band follows the quarry at
   `r 0.739` (ceiling control `1.000`; generate-mode `~0`), join row step
   `18.8` vs interior `14.7–20.0`, and the SIMULATED stitch along the real
   ownership curve measures `20.2` mean step — inside the no-seam interior
   range `15.6–22.7` — against `26.2` for the current world. The stream
   reaches the shared line within ~10–20 px of the quarry's crossing at
   `498` (48 px gate: pass, no bridge). Seam not findable by eye at 1:1.**
   Evidence: `.codex-tmp/session3/probe/builtin2-stitch-stream-1to1.png`
   (vs `...-CURRENT-1to1.png`), `probe-sheet.png`. One sample each; the
   real bake's gates are the replication.

**PIPELINE CHANGE LANDED (owner approved 2026-09-01; lock history has the
before and after entries; suite 9/9; hash gate intact):**

- (a) **Edit-mode authoring.** For any cell with an authored neighbour,
  `cell.mjs` builds `context/edit-target.png` — the full 2560 canvas with the
  neighbours' CONCEPT paint wherever their canvases cover it, the replaced
  cell's own old paint never included, neutral grey `rgb(96,104,88)`
  elsewhere — and the packet mandates ONE built-in `image_gen` EDIT call on
  it, prompt = the verbatim square-framing preamble + the brief written as
  what continues (never coordinates). Frontier cells stay in generate mode
  with the seed as reference. Controls: target byte-exact where the neighbour
  owns or bleeds, grey elsewhere, frontier gets none; a replacement's target
  never carries its own paint.
- (b) **48 px water-fringe gate** (`<1%`, same classifier as the 6 px ring,
  bridge bands skipped). Real-data calibration through `--redo`: saddle
  `0.01%` (re-stitched byte-identical, 143 tiles), quarry `0.17%`, the
  rejected coast candidate `6.15%`. Control: paint 12–40 px beyond the mask
  fails the 48 px ring while the 6 px ring passes and the world is untouched.
- The bridge reach stays at 150. The quarry's own `--redo` is now refused by
  the continuity gate because its neighbour is the OLD coast with the 700 px
  miss — expected; the coast regenerates first under the new path anyway.
- Not yet exercised on a real bake: a cell with TWO orthogonal authored
  neighbours (an L-shaped painted band); the second regenerated cell is the
  test.

**REGENERATION STATUS (2026-09-01):** canon r2 = candidate g installed
(`seed/L2-seed-region-r2{,-source}.png`). World wiped (tiles, manifest, three
cell sources; old scratch deliverables cleared by hand). **c4-3 quarry
REGENERATED and accepted** (frontier, generate mode from the canon):
all eight gates PASS incl. the 48 px ring at `0%`, key-light `0.0017`,
rock-only strong-edge `0.041`; `124` tiles; worker `146,499` tokens,
~10 min. Director eyes at 1/2.5 and 1:1: as briefed. **c3-3 saddle REGENERATED in
edit mode and accepted** — the first real edit-mode bake: all eight gates
PASS, palette at the quarry seam `dBG 0.021 / dLuma 0.9` (old pair `0.130 /
11.7`), rock-only `0.056`; the REAL stitched seam measures `20.3` mean step
against interior lines `16.4–23.3` — inside the no-seam range for the first
time (old seam `21.8` vs `12.6–18.3`); `143` tiles; `188,671` tokens; two
prior dispatches died on "model at capacity" and a director retry loop
waited it out (pipeline should retry itself — next lock change). Eyes at
1:1 and 1/4: seam not findable. **c4-2 coast: edit-mode bake delivered a GOOD candidate that the
continuity gate REJECTED on a single-scanline artifact** (the first
two-neighbour edit target composed correctly). Every other gate passed
(both fringe rings `0%`, key-light `0.0021`); `169,510` tokens. Measured:
on the exact shared row the quarry's stream is split by one boulder into
runs of `10` and `17` px, both under the gate's `30` px minimum (one row
above: `37` px; one below: `33` px), so the gate saw no quarry crossing;
the coast's stream meets it at a `25–45` px miss, inside the `48` px
tolerance. Eyes: the channels align and the candidate continued the
quarry's stones and edge conifer. **Fix (needs owner approval; control
already in the suite and FAILING on the current gate as the world did):
the continuity gate reads crossings over a band across the shared line
(water within 8 px either side) instead of one scanline.** Then `--redo`
the coast candidate (no bake). The candidate's deliverables sit in
`.codex-tmp/authoring/cells/c4-2/`. **OWNER RULING:** check 1 "is fine they
match" → the gate band fix approved and landed; check 2 **"the cliff side
is unnatural"** — the candidate is REJECTED by the owner: identical columns
in a straight palisade with a square corner. Fix in two places: the
coast-cliff biome vocabulary and the geology rule now demand weathered,
irregular columns (uneven heights, broken tops, split and leaning columns,
collapsed drums in talus, no palisade, no square corners), and the c4-2
brief carries it with the ledge made explicit. The coast is RE-BAKED, not
redone. **c4-2 coast REGENERATED (second attempt) and accepted:** all
eight gates PASS, continuity `ok (4 crossings checked)` through the band
read, fringe `0.09% / 0.05%`, key-light `0.0013`, rock-only `0.057`;
`145` tiles; `163,598` tokens. **THE THREE-CELL WORLD IS COMPLETE UNDER
CANON r2.** Real stitched seams: c3-3|c4-3 `20.3` (interior `16.4–23.3`),
c4-2|c4-3 `20.8` (interior `18.1–25.3`) — both inside the no-seam range;
the old world measured `21.8` and `26.0` against `12.6–20.8`. Review set
with the old world as "before": `.codex-tmp/session3/review/regen3/`.

**REGENERATION PLAN (as executed):**

1. Canon: the chosen candidate copied to
   `art-source/career-world/l2-land/ninjaone/seed/L2-seed-region-r2-source.png`
   (1254) with its 2560 lanczos upscale as `L2-seed-region-r2.png`; r1 deleted
   once all three cells are regenerated under r2.
2. Briefs ready in the new register under the variance map, written as
   continuation with no coordinates: `.codex-tmp/authoring/brief-c4-3-r2.md`,
   `brief-c3-3-r2.md`, `brief-c4-2-r2.md`.
3. Wipe the L2 world (tiles `l2-ninjaone-r1/`, the manifest, the three
   `art-source` cells) — git-reversible, owner-approved with the register
   change — then regenerate in adjacency order: `4,3` (frontier, generate
   mode from the seed) → `3,3` → `4,2` (edit mode). ~13 min each. Review at
   1:1 and 1/4 after each; the second and third are the first real
   edit-mode bakes.
**World state:** c4-3 quarry GOOD (accepted canon). c3-3 saddle NEW — deep
green, gates green, **owner review pending** (sheets 1–4). c4-2 OLD — known
stream miss at the c4-3 seam; generate-mode replacement rejected.

**Residual defects flagged on the c3-3 landing (sheets 1–4):**

- c3-3|c4-3 seam, upper ~700 px (meadow-to-meadow): a mild texture/tone step
  at 1:1 — the `dLuma 11.7` point; faint at 1/4, invisible at the L3 tier.
  Now understood: an unrelated painting on each side along a near-straight
  cut (item 3 above); (a) is the remedy, not the stitch.
- c3-3's beck rises in a round dark source pool on the plateau that reads as
  a black dot at reduced zoom; L3 will render it as a small tarn.
- the three-way corner pocket in unauthored c3-2 is bleed-only smudge —
  provisional by design until c3-2 is authored.
- c4-2|c4-3 seam: unchanged — the old stream miss remains (sheets 3/3b).

**Review tooling (scratch, gitignored, `.codex-tmp/session3/`):**
`review.mjs <tag>` assembles proofs from the STITCHED TILES only; `sheet.mjs
<tag> [beforeTag]` composes the labelled sheets (final set:
`review/final/sheet-{1..5}*.png`); seam diagnostics `seam-geometry.mjs`,
`seam-stats.mjs`, `seam-step.mjs`, `context-fidelity.mjs`; probe tooling
`probe-target.mjs`, `probe-measure.mjs`, `probe-stitch-sim.mjs`,
`probe-edit.mjs` (API path, unused: no key), packets and prompts under
`probe/`. `misfit.mjs` and `peg-evidence.mjs` are the c4-2 rejection
measurements.

**LOCK CHANGE 4 LANDED (owner "works for me please proceed", 2026-09-01;
suite 12/12; lock history before/after):** twelve interior sites in the
plan and a "Sites this cell must offer" packet section; stale scratch
deliverables cleared at dispatch; the runner retries "model at capacity"
itself (4 attempts, `CELL_RETRY_WAIT_S`); loop presence by segment; a
rock-only strong-edge lighting gate `<0.15` (report-only under 5000 strong
rock edges) — real cells re-judged at `0.064 / 0.046 / 0.055`, byte-identical
stitches. Continuing by adjacency: **c3-2 dark-forest gorge — first attempt
REJECTED by the continuity gate, correctly** (its stream left through the
dry south edge; the worker reported it itself, plus underscale crowns and
a rectilinear crag; ledger R065; candidate kept at
`.codex-tmp/session3/rejected/c3-2-south-exit/`). Lesson: in edit mode
state water topology as what the arriving paint permits, not as a
prohibition. **Re-baked on a closed-water brief** (`brief-c3-2-r2.md`,
crown scale and weathered crag added) — **ACCEPTED on all nine gates**
(continuity ok 2 crossings, rock lighting `0.052` gated, fringe
`0.14/0.02%`), `168` tiles, `203,362` tokens; committed. Eyes: gorge with
two falls ending in a pool inside the cell, the hermit's crag an irregular
column stack, the giant conifer in its clearing, a dry gravel wash (not a
path) continuing the saddle's moor to the south edge. **WATCH ITEM — crown
scale drift:** the worker measured its median conifer crown at `71 px`
final-scale (`3.4 m`) against the `84–147 px` floor; edit mode copies the
arriving paint's crowns, so undersize can compound along the chain. Every
brief from here carries the scale line tied to the LARGER arriving crowns;
a crown-size gate (tree detection) is a candidate for a later lock change.
**c2-3 border moor ACCEPTED first attempt** (nine gates, `140` tiles,
`175,757` tokens; ledger R067); the worker flagged the saddle's inherited
east column wall as fairly regular — the saddle predates the
weathered-column rule; owner's eye decides whether it earns a regeneration.
**c3-1 magical gorge — first attempt REJECTED by two gates, correctly**
(ledger R068): rock lighting `0.31` (cylinder-shaded columns with one
bright side, direction `33°`, not the crystals) and continuity (the coast's
tarn crosses the 3,2|3,1 line by `40–60 px`; the target showed the sliver in
the candidate's kept corner and the candidate painted it over). The cell
itself realises the owner's crop — chasm, mist, hanging fragments with
crystals, glowing pool. **Re-baked** on a brief that asks for flat column
faces and states the tarn corner as permission. Contract note: a neighbour's
water body crossing a cell line is legitimate; if workers keep missing it,
the pipeline can OR the neighbours' water into the delivered mask within
the bleed (lock change; passes the gate but leaves a straight shore on the
ownership curve, so brief-level first). **Second attempt fixed both
(rock lighting `0.143`, corner continued) and failed the palette gate alone
at `dBG 0.218`** (ledger R069): the gorge's haze in 3,2's north band
(`0.681`) stops at the line where the candidate's south third is clear
(`0.463`) — a mild, findable tone step by eye. Candidate kept in full at
`.codex-tmp/session3/rejected/c3-1-palette/` (acceptable via `--from` if
the owner rules the step fine). **OWNER RULING on candidate 2: "close but a few seam issues"** — his two
crops: the haze step through the trees at the line, and the column wall
changing drum size and detail across the line (a STRUCTURE mismatch no
current gate measures). Candidate 2 not accepted; the palette limit stays
at 0.18. **Third attempt queued** behind the 2,2 bake with haze
continuity, confined crystals, and rock forms continuing at the arriving
size and detail in the brief. Next lock change candidate: a seam-step gate
— the local luma step along the ownership curve on a pre-stitch composite
of the seam band (director measure `seam-step.mjs`: accepted seams
`20.3 / 20.8`, interior lines `15.6–25.3`, the old world's bad seam `26.0`). Next lock
change candidate: "haze continues across seams at the arriving tint" in
the dark-forest and magical-gorge vocabularies. **c2-2 bench country — first attempt REJECTED by the rock-lighting gate
alone** (`0.20`; ledger R070): cylinder-shaded column walls in long regular
runs with square corners, as the worker itself reported; steam haze weak.
Re-bake queued behind 3,1's third attempt with the flat-face instruction
that fixed 3,1 (`0.31 → 0.143`), broken walls and a legible steam haze.
Next lock change: put "every column face one flat value, joints as thin
dark lines" verbatim into the geology rule so every packet carries it.
Five cells stand. Briefs ready for the next cells in
adjacency: `brief-c2-3-r2.md` (moor, land border, border knoll),
`brief-c3-1-r2.md` (magical gorge, rail gorge span), `brief-c2-2-r2.md`
(bench country, waystation bench, hot spring).

**SESSION 4, EVENING (2026-09-02) — RESUME HERE.** **4,1 the coast headland
ACCEPTED first attempt** (R089: key-light `0.0007`, rock lighting `0.07`, 6
crossings met, `130` tiles, commit `d06a81c`); its 4,2 seam reads dLuma
`5.7` on all land. **TEN CELLS STAND** (4,3 / 3,3 / 4,2 / 3,2 / 2,3 / 2,2 /
3,1 / 1,2 / 2,1 / 4,1). Dev LoD feed regenerated for ten
(`?landStream=l2dev`). **1,3 PARKED** (three rock-lighting strikes; owner's
call: accept by eye at `0.198`, a fourth attempt on a rock-light landform
after lock change 6b, or leave). **LOCK CHANGE 6 LANDED** (owner "lock that down… go with that change";
R090; suite `17/17`; commit `09a019c`): (6a) the palette gate on ALL
land, tone dLuma `> 20` fails; (6b) the neighbour's edge tone blended into
the edit target's grey from full strength where the grey begins (256 px in,
past the bleed) to flat grey a third in. Bakes resumed: **1,3 ACCEPTED on the fourth attempt** (R091,
commit `b16375b`): the low-rock landform took rock lighting to `0.088`
(report-only, 2,107 strong edges) where three rock-heavy candidates read
`0.19–0.29`; the first bake with the ramp put the north seam at dLuma
`15.0` on all land (candidate 3: `24.5`), the east at `1.0`; eyes at 1:1:
no line at the seam, a soft brightening over ~250 px into the shelf.
**ELEVEN CELLS STAND.** Owner item: the gully below 1,3's fall came out as
dry sand, not a drowned inlet (the loop's water crossing is a sandy gully
unless a later pass floods it). **4,0 Kaizen ACCEPTED first attempt** (R092, commit `f8ec99a`:
key-light `0.0026`, rock lighting `0.075`, seam tone `3.7`, `123` tiles;
the worker's crown measure `39 px` — the drift's worst number; the station
strip and the cutting read at half scale). **TWELVE CELLS STAND.** **1,1 the
purple field DISPATCHED** (`brief-c1-1.md` from the owner's Outward
correction: a saturated magenta-violet carpet past the transition thirds
with a clear edge, the crystal-crowned knoll, pink-blossom broadleaf
trees, accent shrubs, the line's ground across the field; both neighbours'
edges dry; log `.codex-tmp/session3/regen-c1-1.log`). Briefs READY, each
written against the neighbours' measured edge water: `brief-c2-0.md` (dark
forest gorge, mill-ledge), `brief-c0-3.md` (the sound corner; 1,3's shore
arrives 58% down its west edge), `brief-c3-0.md` (bare plateau,
walk-under-arch, the loop clipping its SE corner; 4,0's west edge dry).
Then 0,2 (submerged run; after 0,3), 1,0 (crater tarn, column altar; after
1,1), 0,1 Metrics-Service, 0,0 shepherd's fold. A suite-level lock on the test world is queued
(6d, tests only).
Next cells after it: 1,3 (fourth attempt if the owner wants it), 4,0
Kaizen, 3,0, 2,0, 1,1 the purple field, 0,x the sound coast.

**OWNER RULING (2026-09-02, on 1,3 candidate 3's north seam): "The seams
are stark here, assuming because its a new biome. Need a better
transition."** Measured (R088, `tone-seam.mjs`): the palette gate skipped
that seam ("no vegetated seams" — olive moor is not green to its
classifier) while the all-land luma step reads `24.5` against `2.3–17.4` on
every accepted seam. **LOCK CHANGE 6 PROPOSED** (`next-lock-change.md`,
awaiting the owner's word): (6a) the palette gate on ALL land, dLuma `> 20`
fails; (6b) the neighbour's edge tone blended into the edit target's grey
across the outer third so the transition is given as pixels, not words;
(6c) the seam-step gate. 1,3's fourth attempt, if the owner wants one,
should wait for 6b.

**SESSION 4, AFTERNOON (2026-09-02) — RESUME HERE.** Owner: "agreed on
both" → **2,1 the capital REPLACED** on `brief-c2-1-r2.md` and accepted
(R084, commit `b26390b`): the shelf now a brighter table ringed by broken
terraces with the station strip; crowns `73 px`; nine cells stand (2,1
replaced, count unchanged). **The runtime LoD test PASSED** (R085; owner
OK'd app-side work): a dev-gated feed (`?landStream=l2dev` or
`NEXT_PUBLIC_LAND_STREAM=l2dev`; `streamTiles.ts`, manifest
`terrain-stream-runtime-l2dev.json`, tiles `l2-ninjaone-dev/`, generator
`.codex-tmp/session3/l2dev-manifest.mjs`; launch config
`career-world-worktree` in the MAIN checkout's `.claude/launch.json`)
streams the nine cells through territory → capital (L3) → site (L1) in
the app with no visible seam and residency `37.7 MB`; the camera's
interactive floor (`0.0854` at 1400x900) draws L1 at about 1:1 device
pixels, so L0 is headroom. First placement inside the capital envelope
was hidden by the D05 city/environment plates; the dev placement is now
`(0.38, 0.22)`. Committed `c3cb2f6`. **1,3 first attempt REJECTED**
(R083): 1,2's beck DOES reach its south edge (world x `2954–3029`, 75 px)
and the brief said nothing wet arrives — the director's error; plus rock
lighting `0.288`. **Attempt 2 REJECTED by rock lighting alone** (`0.187`; R086): the
water landed (2 crossings met, the sound edge to edge, one fall, the
composition right) but every rock in the cell keeps a lit top plane —
global, on few strong edges (`11,085` vs the accepted coast's `53,344`);
words twice and the canon as second input did not move it. **Attempt 3 REJECTED, rock lighting `0.198`** (R087): the tool took
the third image (the accepted coast's rock) and the lit top stayed on
every rock in the cell (`0.288 → 0.187 → 0.198`); 5j (a per-biome
reference image) is struck — ruled out by this run. **1,3 PARKED after
three strikes — OWNER CALL:** (a) accept candidate 3 by eye at `0.198`
(its shore is column-top pavements under the sound, each top lit from one
side; `review/regen-c1-3-cand3-shore-1to1.png`) with a recorded exception;
(b) a fourth attempt on a changed landform — no pavements, terraces or
column stacks in this cell (grass over rounded rock, shingle, the sound
over sand and smooth ledges) so there is little strong rock edge to light;
(c) leave it parked. Candidates 1–3 at `.codex-tmp/session3/rejected/c1-3-cand{1,2,3}/`.
**4,1 the coast headland DISPATCHED** (`brief-c4-1.md`; 4,2's north edge
checked first: the tarn at cell-x `-104..292`, the sea at `1903..2304`,
both stated in the brief as arriving water; log
`.codex-tmp/session3/regen-c4-1.log`). **Lock-change
item 5i:** the packet must list the neighbours' crossings at every shared
edge as arriving water. Next after 1,3: 0,3, 0,2 (submerged run), 4,1
(brief ready), then row 0; whole-territory review at the end.

**SESSION 4, LATEST (2026-09-02 midday) — RESUME HERE.** **Lock change 5
part 2 LANDED** (R080, commit `61f0dd7`, suite `16/16`): every edit-mode
packet mandates the canon source as the SECOND input of the single edit
call. **1,2 heather moor ACCEPTED on the third attempt** with it (R081):
key-light `0.0068` where the same target gave `0.021` and `0.0186` before
— the lineage fix replicated on a real bake; `167` tiles; commit
`ee81a13`. **EIGHT CELLS STAND** (4,3 / 3,3 / 4,2 / 3,2 / 2,3 / 2,2 / 3,1 /
1,2). **2,1 the capital ACCEPTED on all ten gates** (R082: key-light `0.0028`,
rock lighting `0.038`, `139` tiles, commit `efdbcc7`) — **NINE CELLS
STAND** — **but the shelf did not land:** by the worker's own checks and
by eye (`review/stitched-c2-1-cell-half.png`) the cell is olive moor with
a stream and a pool, no raised table, no brighter meadow, no station
strip. No gate measures composition; the owner's eye decides. A forced
replacement brief is ready (`brief-c2-1-r2.md`: the shelf as a raised
table two steps brighter, bounded by broken terraces, a treeless station
strip three crowns wide, the ramps for the line) — director recommends
replacing; awaiting the owner's word. **1,3 Vendy shelf on the sound
DISPATCHED** (`brief-c1-3.md`: the inlet a few crowns wide at the
crossing, the director's default pending the owner's choice; log
`.codex-tmp/session3/regen-c1-3.log`).
Owner on the stitched sets: "The images and seams look good to me!"
Owner asked to see the grid (`grid-status.mjs` → `review/territory-grid-status.png`)
and asked how the south coast is handled (answered from the plan: sound
under 0,3/1,3 with the inlet crossing, land border under 2,3/3,3 done, bay
at 4,3 done; coast cells cut their sea and publish the footprint, the ocean
layer fills). **Owner asked whether the LoD works before more cells are
spent:** offline check done (R081; `review/pyramid-A-block-L3-L6.png`,
`pyramid-B2-seam-stretched.png`): seams not findable at any level, brush
character to L3, tone stable. **The runtime has never streamed this
pyramid** — its land streamer (`features/career-world/layers/terrain/model/streamTiles.ts`,
manifest `terrain-stream-runtime-r4.json`: tiles with normalized world
bounds, source tiers capital+site, five camera tiers in
`shared/lod/policy.ts`) needs a manifest generator from the pyramid, a
streamer extension for more tiers, a layer-only dev toggle and a dev
placement from NinjaOne's focus view — about half a day of app work,
awaiting the owner's word. Next cells after 2,1: 1,3 (Vendy shelf on the
sound, the inlet the loop crosses — owner to set the inlet's width), 0,3,
0,2 (submerged run), 4,1 (brief ready), then row 0.

**SESSION 4, LATER (2026-09-02, owner online) — RESUME HERE.** The owner
overruled the 3,1 rejection ("way too harsh… just fix that water issue…
all of these look pretty great"; the fall and pool "perfectly fine") and
the director landed **lock change 5 part 1** on it (R077; lock history
before/after; suite `16/16`; hash gate intact; commit `6f2e14c`): (a) the
suite's working dir follows `L2_OUT_ROOT` and the suite asserts the real
cells' dirs untouched; (b) **mask completion by bounded growth** (48 px
into contiguous painted water, speckle holes ≤64 px, bridge bands exempt,
before the cut — a gate-table row and a ledger field); (c) **palette limit
`0.20`** on the owner's eye (fine `0.109/0.189`, clash `0.218/0.294`).
Then **3,1 candidate 3 was re-derived and ACCEPTED** (R079): mask
completion `+3,880 px`, fringe `0.54% / 0.89%`, palette `0.189`, `156`
tiles, commit `272f614`. **SEVEN CELLS STAND** (4,3 / 3,3 / 4,2 / 3,2 /
2,3 / 2,2 / 3,1). The real stitched seam reads clean at 1:1
(`review/stitched-c3-1-*`). **Lineage probe (R078, owner-authorised):**
the built-in edit call ACCEPTS the canon as a second input image; with it,
1,2's key-light moment reads `0.0093` (under the gate) against
`0.019–0.020` for the two pipeline attempts, seam-band fidelity `r 0.759`
(attempts `0.84–0.88`; the edit path was adopted at `0.74`). **Lock change
5 part 2 proposed and staged** (`.codex-tmp/session3/apply-lock5-part2.mjs`
+ a dry-run control): every edit-mode packet mandates the canon source as
the second input of the single edit call with the reference paragraph
verbatim. Needs the owner's word; then 1,2's third attempt is the first
real bake on it. The lock record needs the owner's keystroke when the
classifier blocks the director (it allowed the two records today after the
owner's explicit instruction). Next cells by adjacency after 1,2: 4,1
(brief ready: `brief-c4-1.md`), then 2,1 the capital.

**SESSION 4 (2026-09-02) — RESUME HERE.** Both queued bakes landed and
were REJECTED (ledger R071/R072). **3,1 attempt 3:** water fringe
`4.9% / 2.49%` (the tarn's south shore in the SE bleed and the luminous
pool's west shore lie outside the mask — `review/regen-c3-1-cand3-fringe-map.png`)
plus palette `dBG 0.189` vs `0.18` at the 3,2 seam (attempt 2: `0.218`);
rock lighting `0.116` (best of three), continuity ok, the tarn corner
continued. Eyes at 1:1 (`review/regen-c3-1-cand3-seam-S-{west,east}.png`):
the crag and rim wall now cross the line at one scale; the join is a
texture/tone line, not a structural clash. Profile
(`haze-profile.mjs`): the candidate continues the arriving tint for
about 128 px and then paints a far colder cell (whole-cell veg b/g `0.93`
vs 3,2 `0.61`). Candidate 3 kept in full at
`.codex-tmp/session3/rejected/c3-1-cand3/` and still in place under
`.codex-tmp/authoring/cells/c3-1/` (a mask re-trace job + `--redo` clears
the fringe gate; the palette needs the owner's eye on the 1:1 seam or a
fourth generation). **2,2 attempt 2:** palette `dBG 0.266` (its east
forest painted yellow-green, `0.29` vs the arriving `0.56`); fringe
`0/0%`; and the palisade walls are still there by the worker's own report
and by eye (`review/regen-c2-2-cand2-quarter.png`). Diagnosis: the biome's
own words describe continuous terrace walls. **2,2 attempt 3 ACCEPTED on all nine
gates** (R074) on a reframed landform (`brief-c2-2-r3.md`: broken bench
country — scattered tors, short broken scarps two to six crowns long, no
continuous edge; the arriving cool green held across the whole east
third): palette `dBG 0.143` at the gorge seam, fringe `0/0%`, key-light
`0.0108`, `162` tiles, `387,569` tokens; committed `f1bdf80`. **SIX CELLS
STAND** (4,3 / 3,3 / 4,2 / 3,2 / 2,3 / 2,2). Eyes on the stitched tiles:
both seams continuous at 1:1 (`review/stitched-c2-2-seam-*`); ONE item
for the owner's eye — a long wandering escarpment of broken column stubs
through the east third (`review/stitched-c2-2-east-scarp-1to1.png`),
uneven and cornerless but one connected edge about 1,300 px long. **1,2
heather moor, first attempt REJECTED by the key-light gate** (R075):
`0.021` vs `0.011` — an emboss on every tussock and boulder, the same
way up everywhere (`keylight-map.mjs`: moment `0.02–0.05` in nearly every
block at `0–60°`, no tonal ramp). **THE LIGHT IS INHERITED AND
COMPOUNDING:** seed `0.0008` → 4,3 `0.0026` → 3,3 `0.0035` → 4,2
`0.0024` → 3,2 `0.0052 @ 14°` → 2,2 `0.0121 @ 34°` (passed at `0.0108`,
no headroom) → 1,2 `0.0205 @ 33°`; same mechanism as the crown drift
(`71 → 57 → 45 px`). The canon never reaches the image model in edit
mode. **Attempt 2 REJECTED on the same gate** (R076): `0.0186 @ 36°`
from `0.021 @ 33°` — the concrete no-lit-side brief moved the emboss by a
tenth and the direction not at all; crowns recovered to `69 px` once tied
to the largest arriving crowns; the sheltering outcrop came out as a
regular column fence. **Two strikes: no third bake under the same
conditions.** 1,2 waits on a pipeline anchor for the lineage (lock change
5h): first probe whether the built-in edit call accepts the canon as a
SECOND input image (packet text only); failing that, ghost the canon's
paint into the target's grey at low opacity. One owner-authorised probe
run outside the pipeline decides it (measure the moment and the seam
fidelity). Candidates at `.codex-tmp/session3/rejected/c1-2-cand{1,2}/`. `brief-c4-1.md` (coast headland,
tunnel mouth shelf) is written but DEFERRED: authoring 4,1 would give 3,1 a
third authored neighbour before its fourth attempt. **Incident
fixed (R073):** the control suite shares `.codex-tmp/authoring/cells` with
the real world (`WORK` is not relocated by `L2_OUT_ROOT`); a test stub
reached 4,3's ledger record (`waterZones ["lake"]`); restored from git,
re-recorded with `--redo --force`, every tile hashed before and after:
`0 written, 124 byte-identical`; committed `97eb0d6`. **LOCK CHANGE 5
DRAFTED** (`.codex-tmp/session3/next-lock-change.md`; owner approval
needed before any edit): WORK relocation + suite assertion; mask
completion by bounded growth (the delivered mask grows into contiguous
water-classified pixels up to 48 px — four candidates so far were rejected
on mask tracing, not art); seam-step gate; vocabulary lines (haze
continues at the arriving tint; "every column face one flat value"
verbatim in the geology rule; mixed-bench reworded to broken bench
country if attempt 3 lands); crown size printed report-only on both sides
of each seam. Session tooling added: `cand-preview.mjs` (candidate in the
world's tiles, quarter + 1:1 seam halves), `fringe-map.mjs` (gate replica
to the pixel, per-block tallies, red map), `haze-profile.mjs`,
`crown-size.mjs`.

**IMMEDIATE NEXT ACTIONS, in order (as of the end of session 3):**

1. Owner reviews the finished three-cell world
   (`.codex-tmp/session3/review/regen3/sheet-{1,3,3b,4}*.png`, the coast
   previews) and marks residuals. Director-flagged residuals: the coast's
   ledge reads as stepped benches rather than one continuous rising line;
   the saddle's gorge belt runs with the beck north–south rather than
   east–west as briefed; the coast plateau is uniformly austere by biome.
2. **Next lock change** (draft with code and controls:
   `.codex-tmp/session3/next-lock-change.md`; owner directions already
   recorded above): interior sites in the plan and packet; stale scratch
   deliverables cleared at dispatch; capacity-error retry inside the
   runner; loop presence by segment (cell 4,2 was told "no loop" though the
   line crosses it); rock-only lighting gate at ~0.15. Approval → controls
   → edit → suite → re-lock.
3. Then continue by adjacency toward the capital `2,1`, one cell per
   dispatch, every packet now carrying its biome and transitions from the
   committed plan `art-source/career-world/l2-land/ninjaone/plan.json`;
   next cells `3,2` (dark forest) and `2,3` (moor, land border), then
   `3,1` (the magical gorge) and `1,1` (the purple field) need their
   moment briefs. The finish pass (checklist item 8) waits on the owner.

**Gates (all thresholds calibrated, provenance in the lock):** key-light
asymmetry `<0.011` (sunned D05 `0.0318`, canon `<=0.004`); water cut-clear
exact-zero; fringe `<1%` (accepted `0.0/0.22/0%`); water continuity
(crossings matched `48 px`, bridge to `150`); palette conformance at authored
seams (veg-median `dBG<=0.18`, `dLuma<=13`, eyes-calibrated on three points).

**Standing owner rulings:** Tanium/NinjaOne share BOTH border types (bound in
`plan.rules.southBorder`: sound under `0,3`/`1,3`, land under `2,3`/`3,3`,
bay at `4,3`); water bridge approved at 150; palette gate-and-regenerate
approved; `OPENAI_API_KEY` for the API image path still an open offer — no
longer needed for outpainting after R057, still the route to native-2048
density (`4.63 -> 7.56` px/world px) and true masks.

**OWNER RULING (2026-09-01, register change): the land moves to an EPIC,
FANTASTICAL, LIGHT-TONED fantasy register** — the feel of classic painted
fantasy card-game landscape art of the 2000s, luminous and hopeful rather
than dark — translated into this world's projection and rules. Owner words:
the city assets are reference only and were going to be regenerated anyway;
the lighting rule stands (form shading + AO only, no directional key); the
ocean work is mid-flight and fine to change, the owner handles that later.
Mechanism: a new style seed the owner accepts by eye (candidates a/b/c at
three intensities, `.codex-tmp/session3/seed-r2/`), then the three existing
cells are regenerated under it from an empty L2 world in adjacency order
(c4-3, c3-3, c4-2) — the old cells and the r1 seed are deleted when their
replacements land. Territory geology/vegetation/water rules are unchanged;
only the register changes. **Seed round 1** (`seed-r2-a/b/c.png`): owner —
"much closer to the direction I want", with three corrections that are now
binding: (1) **the lighting was not neutral** — the owner's eye caught a
consistent lit side (cream front faces, violet right-facing faces) that the
key-light gate passed at `0.0007–0.0021` because millions of grass gradients
dilute it; the director's hue-isolated strong-edge moment inside rock only
(`.codex-tmp/session3/seed-light.mjs`) measures the candidates at
`0.18–0.27 @ ~50°` against the accepted quarry's `0.07` — a stable direction
across three independent generations, i.e. an implied key. Round 2 enforces
flat lighting (every face the same value whatever it faces; ambient
occlusion only). A gate at this measure (rock-only, edges >= 80, threshold
~0.15) is a candidate for `cell.mjs` — owner approval, control first.
(2) **"Less happy meadows everywhere"** — a whole territory of luminous
meadow would exhaust the viewer; scenery must vary (moor, bare basalt, dark
forest, scree, mist, ONE lush pocket). Director proposal per cell:
`.codex-tmp/session3/seed-r2/scenery-variance-plan.md`, sent for mark-up.
(3) **The owner's crop of candidate c's gorge** (floating rock fragments with
crystals, self-luminous outcrops, a fall into glowing water) is the target
for the INTERESTING areas — placed as terrain moments at the rail theatre
cells, never a ground state. Plus one named unique place: **the purple
field** — one open area carpeted in dense uniform purple bloom (the owner's
Outward memory), proposed at cell `1,1` on the rail approach to the capital;
general heather everywhere else stays sparse so the field is unique.
**Seed rounds 2 and 3 (ledger R059/R060):** flat-lighting WORDS changed
nothing (`0.18–0.25` at strong rock edges, reference = round-1 b); using the
accepted quarry as the ONLY reference fixed it for the plain candidate g
(`0.105`, the canon's band) while the magical candidate h stayed at `0.246`.
Lesson: the shading convention travels through the reference image, not
the prompt. Owner's cross-cutting observation, confirmed: one image model
renders every generation and every packet references the previous lineage,
so the hand never changes; a pipeline FINISH prototype
(`.codex-tmp/session3/finish.mjs`, value steps + edge ink + split tone +
seeded grain) was rendered on g as the cheapest lever toward a look that is
ours; the owner parked the idea of mixing two agents' image tools (the
director has no image tool) and does not want a local model (the machine
could run one: RTX 3080 Ti 12 GB). **Sourced reference for the purple
field:** Outward's Conflux Mountain, Chersonese — CORRECTED by the owner's
own screenshots ("way more than the concept"): a saturated magenta-violet
flower-field carpet filling the whole valley floor, pale lavender-blue grass
tufts, clumps of gold/orange/red/pale-blue flowering shrubs, pink-blossom
broadleaf trees standing in it, the landmark rising straight out of the
field under a bright sky. In our grid: the whole of cell `1,1` spilling
into its neighbours' edges, a REGION at territory zoom. Full brief text in
`scenery-variance-plan.md`. **Seed canon: NOT yet
picked — owner reviews rounds 1–3 and the finish prototype.**

**Durability gap CLOSED (2026-09-01):** the territory plan now lives
committed at `art-source/career-world/l2-land/ninjaone/plan.json` (review
render `plan-review.png` beside it), generated by `plan-territory.mjs`; the
scratch copy is deleted and `cell.mjs` reads the committed path.

**BIOME MAP LANDED (owner-directed 2026-09-01: "set biome areas on the grid
so even if its a biome transition it can handle it correctly and with
appropriate assets"; lock history before/after; suite 9/9):** the plan
carries ten biomes with a vocabulary each (ground, rock, trees, water,
palette, wonders) and one biome per cell from the variance map —
row 0: moor, bare-plateau, dark-forest, bare-plateau, lush-shelf (Kaizen);
row 1: lush-shelf (Metrics-Service), **purple-field**, lush-shelf (capital),
**magical-gorge**, coast-cliff; row 2: sound-coast, moor, mixed-bench,
dark-forest, coast-cliff; row 3: sound-coast, lush-shelf (Vendy), moor,
moor, quarry. Every packet now carries a Biome section and a Transitions
section naming each orthogonal neighbour's biome and whether it is
authored; a biome change is made INSIDE the later-authored cell across its
outer third on that side, never on the seam, so a pixel seam and a biome
boundary never coincide. A cell with no biome refuses to build. The
ledger records each cell's biome. Consequence for the seed question: the
hand travels through the neighbour chain, so the canon only conditions the
first cell of an empty territory; director proceeds with candidate **g**
unless the owner objects.

**Unresolved, owner call:** the `407` uncommitted stream-r3 modifications in
this worktree (shoreline-erosion re-bake + v3 coast fill, obsolescent) —
commit as an interim fix for the old-world serving, or discard. Untouched
this session; NOT in this session's commits. Side cost: every worker runs
`git status` and swallows those 400 lines into its context.

**OWNER INTERJECTION CHECKLIST — session 3 (every item closes or is handed
back explicitly; owner asked for this discipline 2026-09-01):**

| # | owner item | status |
|---|---|---|
| 1 | register change to epic/fantastical/light | LANDED: canon r2 = candidate g; all three cells regenerated under it (quarry from the seed, saddle and coast edited from their neighbours); both seams inside the no-seam range; r1 seed deleted |
| 2 | "careful with that lighting, is that neutral?" | MEASURED (rock-only strong-edge moment; gate blind to it); fixed at the source by reference choice — the three regenerated cells measure `0.041 / 0.056 / 0.057` rock-only; a gate at ~0.15 is the next lock change |
| 2b | "check 1 is fine they match" / "check 2 the cliff side is unnatural" | LANDED: continuity gate reads a band across the line (and the bridge erase bug it exposed is fixed); coast-cliff biome + geology rule demand weathered columns; coast re-baked and accepted |
| 3 | less happy meadow, scenery variance | LANDED: biome map in the committed plan |
| 4 | one purple flower field (Outward) | SOURCED + owner-corrected; biome `purple-field` at 1,1; brief when 1,1 is authored |
| 5 | the magical-gorge crop as the model for interesting areas | LANDED: biome `magical-gorge` at 3,1 |
| 6 | why does every generation look the same | ANSWERED (one image model + reference lineage); finish prototype exists |
| 7 | mix Codex's and Claude's image tools | PARKED by owner (the director has no image tool) |
| 8 | stand out from generic AI art (not a local model) | OPEN: a designed finish pass is the lever; owner to say when (Q4) |
| 9 | water is another layer / land sub-layer | CONFIRMED: already the cell contract (concept + cut land + footprint) |
| 10 | biome areas on the grid, transitions handled | LANDED (this session, lock history) |
| 11 | interior cells need settlements/attractions | RECORDED; sites mechanism proposed below, next lock change |
| 12 | direct questions with direct assets | DONE: Q1 g by director default, Q2 confirmed by owner screenshots, Q3 approved and landed, Q4 open |
| 13 | "close but a few seam issues" (3,1 candidate 2 crops) | CLOSED 2026-09-02: candidate 3 stitched; owner on the stitched 3,1 and 2,2 sets: "The images and seams look good to me!" — the 2,2 east-third escarpment stands too |
| 14 | "youre being way too harsh… just fix that water issue… all of these look pretty great" (3,1 candidate 3) | CLOSED: lock change 5 part 1 landed (mask completion, palette `0.20`, suite isolation); candidate 3 re-derived and stitched (`272f614`) |
| 15 | "the water falls into a cavern perfectly fine" (3,1 fall and pool crop) | NOTED: the art stands; the growth adds only the painted pool surface before the overhang and the tarn's south edge |
| 16 | "you can run it thats fine" / "got this but you can run it idc" (the lock record) | CLOSED: both records made by the director on the owner's instruction after his own run hit the wrong checkout |
| 17 | "go ahead and run the probe if you need it" | CLOSED: probe run (R078) — two-image edit accepted, key light halved; part 2 staged for the owner's word |
| 18 | "sure you can make it the default if its been working" (two-image edit call) | LANDED as lock change 5 part 2 (R080): every edit-mode packet mandates the canon as the second input of the single edit call; 1,2's third attempt is the first real bake on it |
| 19 | "Can I see what cells in the territory grid we have finished?" | ANSWERED: `review/territory-grid-status.png` (grid-status.mjs renders it from the ledger and the L3 tiles) — 7 of 20 |
| 20 | "how will we handle the coast for this bottom part?" | ANSWERED from the plan's southBorder rule and the water contract; the inlet's width at the crossing is the owner's choice when 1,3 comes up |
| 21 | "the next step is all the layers of the pyramid?" / "shouldnt we test the LoD out then" | CLOSED: pyramid tiers are written by every stitch; offline check (R081) and the runtime streaming test (R085) both pass; dev feed `?landStream=l2dev` |
| 22 | (director-found) the capital's shelf did not land in 2,1 though every gate passed | CLOSED: owner 'agreed' → replaced on brief r2 and accepted (R084) |
| 23 | (director-found) 1,3's brief denied the beck 1,2 delivers at the shared edge | CLOSED: the beck landed on attempt 2; 1,3 accepted on attempt 4 (R091); lock-change 5i stays queued (arriving crossings in the packet) |
| 24 | "The seams are stark here… Need a better transition" / "lock that down" (1,3 candidate 3) | LANDED as lock change 6 (R090): all-land tone gate at 20 + the tone ramp in the edit target; 1,3's fourth attempt is the first bake with it |
| 25 | "this landscape is fucking awesome… best results we have had this entire project" | RECORDED: the owner's acceptance of the register and the ten-cell world as of 2026-09-02 |
| 26 | "just reviewed those images, they look good" (the stitched 1,3 with the tone ramp, its north seam at 1:1, the 11-cell grid) | CLOSED: owner acceptance by eye of the first ramp seam and of 1,3 |
| 27 | "this looks weird" (4,0: the station strip as a pale graded band, a straight cut, short walls) | OWNER REJECTION by eye; cause: the brief asked for a "strip" and a "cutting" as geometry; replacement queued behind the 1,1 bake on brief-c4-0-r2.md (open soft-edged meadow, a natural draw, nothing that reads as built). Caution added: never ask the land for strips, cuttings, corridors or bands — those are the rail and structures layers |
| — | director-found: the control suite shares the real working dirs | FIXED for 4,3 (R073, `97eb0d6`); WORK relocation is lock change 5a |
| — | director-found: fringe rejections are mask tracing, not art (four candidates) | lock change 5b: mask completion by bounded growth |
| — | director-found: stale scratch deliverables hazard | worked around by hand; next lock change |
| — | director-found: variance map marks | owner has the biome map; marks welcome, none required |

**OWNER DIRECTION (2026-09-01, interior cells):** "for the middle areas we
should probably populate with small settlements or misc attractions/areas
just to make it feel alive and not like a barren/uninhabited area — that
can be an additional layer if needed." Mechanism to land in the next lock
change: the plan gains per-cell **sites** (smaller than settlement shelves:
hamlet clearing, waystation bench, lookout crag, shrine site, hot spring,
crater tarn, giant tree, old quarry, hermit's crag) for at least the
interior cells `1,2` moor, `2,2` mixed-bench, `3,2` dark-forest and the
row-0 plateaus; `cell.mjs` writes a "Sites this cell must offer" section
demanding the TERRAIN for each (a clearing 30 m across by the beck, a level
bench, a crag with a view) and drawing nothing on it. The structures layer
populates hamlets, mills, shrines and waystations on those sites later —
the same split as the five settlement shelves, at village scale. Owner
approval recorded here; control first, then the edit.

**Next lock change to propose (found 2026-09-01, worked around by hand):**
`cell.mjs` does not clear a cell's stale scratch deliverables before
dispatch, so a worker that fails to deliver leaves the previous
`<id>-source.png` in place and the pipeline would derive and gate the OLD
generation as if it were new. The director deleted the deliverables by hand
before the regeneration bakes; the pipeline should do it itself at dispatch
(design so misuse is impossible). Owner approval needed, control first.

**Cautions that cost lanes (carry forward):** measure against the CURRENT
accepted artefact, never a discarded attempt's numbers; prose spatial pegs
do not land — hand the model paint, not coordinates; pin the frame in the
prompt or the tool changes the aspect; review at reduced zoom as well as
1:1; eyes on flagged pixels before believing or tuning any gate (the
colour-based stream finder was unreliable — eyes with a tick crop were not);
corner-pocket smudges in unauthored ground are provisional; a bake is ~13
min — dispatch as a background shell (the Bash timeout does not kill
background runs; verified) and read `.codex-tmp/authoring/cells/<id>/<id>.log`
for `tokens used`, never the process list; worker self-reports are claims —
this session's workers reported tool truth honestly and were still measured.
