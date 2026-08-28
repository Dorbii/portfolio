# Reference Analysis & Art Direction

All findings below come from measuring pixels (`src/analyze_refs.py`, `src/palette_extract.py`,
`src/swell_profile.py`). Filenames and the two supplied manifests were **not** trusted — and it
turns out they could not have been.

## 0. The two packs are the same eight images under conflicting labels

`work/hashcheck.py` (MD5) shows the two archives contain **9 unique images**: eight shared concepts
plus one file that exists only in `coastal_ocean_animation_reference_pack` — `00_selected_source.png`.
Each shared concept carries a *different* name in each pack. Stable IDs `S`, `C1…C8` were assigned
and are used everywhere downstream (`refs/canonical/`).

| ID | pack_a label | pack_b label | verdict from pixels |
|----|--------------|--------------|---------------------|
| S  | *(absent)* | `00_selected_source` | **the selected source image** |
| C1 | windy open ocean swell, moderate whitecaps | calm long rolling swell | **pack_b closer**: foam is only 3.8% — as calm as C5/C8 — but it *is* highly organised (aniso 4.43). A calm/windy bridge. |
| C2 | windy rolling surf, turquoise breakers | windy churning whitewater | agree: **windy**, foam 20.9% |
| C3 | heavy cliff impact, localized spray | heavy localized cliff impacts | agree: **heavy** — and the highest foam of all, 25.0% |
| C4 | receding whitewater and backwash | foam backwash and dissipation | agree: **transitional / foam lifecycle** |
| C5 | long-period parallel swell train | windy organized wave trains | **pack_a closer**: this is the *calmest* image measured (foam 3.4%, luma 0.207) and the most organised (aniso 4.56). Not "windy". |
| C6 | bright turquoise shore break and foam | windy approaching breakers | both understate it: foam 23.0%, the **brightest** water (luma 0.453) and the most turquoise. Top of "windy", touching "heavy". |
| C7 | extreme storm surf, major spray | heavy peak storm surf | agree: **heavy peak**. Open water is so white its spectrum is unmeasurable. |
| C8 | calm recovery and foam dissipation | calm gentle shore wash | agree: **calm** |

## 1. The selected source image

`S` — 1075 x 1463, RGBA (alpha fully opaque). A high-oblique, near-plan view; **there is no horizon**,
so the water plane fills the frame to the top edge. Land occupies the right ~64%; the ocean is a band
down the left. The coastline runs roughly top-centre to bottom-left-of-centre, i.e. its tangent is
near-vertical leaning ~7 deg left-of-down; the seaward normal points left and slightly up.

Contents that are **immutable**: cliffs and rock, grass/moss, conifers, blue-slate stone houses, the
warm brick keep at right, cobbled paths, retaining walls, two timber docks with pilings, and the sea
stacks standing in the water. A soft painted **vignette** darkens roughly the first 55 columns
(column-mean luma rises 24 to 57 across them); it is reproduced over the new water so the composite
keeps the plate's framing.

## 2. Objective energy ranking

White-pixel share of the water region — an assumption-free proxy for sea state:

| rank | id | foam % of water | water luma | anisotropy |
|------|----|-----------------|-----------|-----------|
| 1 (calmest) | **C5** | 3.4 | 0.207 | 4.56 |
| 2 | C8 | 3.7 | 0.253 | 2.11 |
| 3 | C1 | 3.8 | 0.278 | 4.43 |
| 4 | **S** *(the source itself)* | 14.3 | 0.379 | 3.02 |
| 5 | C4 | 15.0 | 0.348 | 2.41 |
| 6 | C2 | 20.9 | 0.407 | 3.10 |
| 7 | C6 | 23.0 | 0.453 | 2.63 |
| 8 | C7 | 23.9 | 0.431 | n/a |
| 9 (wildest) | C3 | 25.0 | 0.414 | 2.99 |

The source plate sits at **mid energy (14.3%)**. So "calm" must render *below* the plate's own
painted energy and "heavy" well above it — the three clips genuinely bracket the still.

## 3. Wave geometry

Measured by averaged 2-D power spectra over open-water windows, then verified **by eye** against
overlays in `diagnostics/crest_orientation_check.png` (the overlay for C5/C1 lies exactly on the real
crest lines, so the convention is confirmed, not assumed).

* **Crest-line bearing:** 148 deg (C5) and 158 deg (C1) — crests run lower-left to upper-right.
* **Propagation:** 58 deg (C5) / 68 deg (C1) in image axes (x right, y down) — travelling **down and
  to the right**, i.e. an *oblique* approach to a coast that faces left. Oblique is a gift: it makes
  waves break progressively **along** the shore instead of everywhere at once.
* **Primary swell wavelength** (1-D profile along the propagation axis, `src/swell_profile.py`):
  **~113 px**, with a long set-modulation component at **~225-250 px** and secondary trains at
  70-100 px. Spectral median texture scale is 20-45 px; fine ripple 8-15 px.
* The low-energy, near-shore-dominated images (C3/C4/C6/C8) measure crest ~5 deg/175 deg at short
  wavelength — that is shoreline foam banding, not open-water swell, and confirms refraction turns
  crests parallel to the coast as they shoal.

## 4. Palette

Extracted per-image as luma percentiles inside the water mask (`diagnostics/palette_anchors.json`).

**Source `S` (the anchor the composite must not drift from):**

| role | hex |
|------|-----|
| abyss / deep trough | `#09273f` |
| deep water | `#0f3854` |
| mid water | `#205372` |
| bright crest face | `#7aa4b8` |
| shallow turquoise | `#308597` |
| thin foam | `#97b0bf` |
| foam body | `#c8d6dc` |
| dense whitewater | `#f8f9f8` |

**Per-state pulls:** calm toward C5 (`#00111f` / `#021c2e` / `#0b2d46`, bright only `#4a6e8b`);
windy near S with C6's turquoise; heavy brighter mid (`#23465e`) and C6's strong teal
**`#0f8481`**, the most saturated turquoise anywhere in the library.

## 5. Lighting

Read from `diagnostics/light_direction_crops.png`: boulder tops and left faces are lit, tree and
dock shadows fall **down-and-right**, the keep's lower-left faces are warm-lit. **Sun is upper-left,
moderately high.** Screen-space light ~ `normalize(-0.62, -0.55, 0.56)` with x right, y down, z up
out of the water plane.

## 6. Foam shapes that work — and artifacts that must not be copied

**Adopt** (see `diagnostics/artifact_inspection.png`):

* **C6 lace** — thin (2-4 px) sinuous branching filaments enclosing irregular 15-40 px cells.
* **C4 backwash** — the same lace stretched into flow-aligned streaks; solid where fresh, opening
  into lace as it ages.
* **C5 crest lip** — a thin bright serrated line with a soft foam lip on the shoreward side only,
  darker trough immediately behind it.
* **C7 plume** — dense, soft-edged, cauliflower-lobed, aerated at the leading edge.

**Reject:**

1. **C7's dithered speckle** inside bright plumes — hard dark dots in white mass; reads as sensor
   noise. This is precisely the "cellular-noise dots" failure named in the brief.
2. **C6/C4 blanket lace** — foam applied at near-constant density over the *entire* surface,
   including deep water that has no business foaming. Foam must be *caused* by breaking.
3. **Uniform 1-px white scratches** in C2/C4 — an etched/engraved look.
4. **C1's near-perfectly uniform crest spacing** — the brief forbids "uniformly spaced parallel
   bands"; the render must jitter spacing and break crests up laterally.
5. **Smearing where foam meets the dock pilings** in S — the painted foam ignores the pilings. The
   render must do better and wrap them.

## 7. Assignment used by the renderer

| clip | primary | secondary | palette pull |
|------|---------|-----------|--------------|
| **Calm swell** | **C5** (crest travel, spacing, dark deep water) | C8 (shore wash, foam dissipation), C1 (restraint) | darkest; turquoise only in the last metres |
| **Windy rolling surf** | **C2** (rolling breaks, churn) | C1 (organised trains offshore), C6 (turquoise + lace), C4 (backwash) | S-anchored, turquoise band widened |
| **Heavy crashing surf** | **C3** (localised impacts, spray) | C7 (peak mass, accumulation), C4 (backwash), C2 (churn) | brightest mid, strong `#0f8481` teal |
