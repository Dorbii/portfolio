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
