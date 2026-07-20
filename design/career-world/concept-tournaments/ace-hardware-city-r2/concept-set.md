# ACE Hardware City · Round 2

## Purpose

This is a controlled refinement batch built from the round-one winner, **The Cooperative Crown**. It contains one production-clean control, six single-variable tests, and three hybrids. The tournament metadata records each concept's role and controlled variable so the exported report can distinguish a visual preference from a bracket-path effect.

## Generation method

- Generator: built-in OpenAI image generation
- Reference asset: `../ace-hardware-city/ace-city-01-cooperative-crown.png`
- Output: one complete 2.5D/isometric architectural concept per PNG
- Camera contract: approximately 225° azimuth and 35.264° elevation
- Frame: 3:2 landscape, centered asset, complete silhouette, no cropped geometry
- Style: grayscale technical architectural drafting, dark charcoal field, pale structural linework, restrained value hierarchy
- Detail target: three readable tiers with roughly 20–25% less tertiary noise than the round-one reference
- Exclusions: logos, brand marks, text, labels, people, vehicles, products, color accents, multi-panel sheets, orthographic views, photorealism, and 3D-render presentation
- Postprocess: every generated PNG was converted to exact RGB grayscale after generation

## Shared generation prompt

> Use the attached Cooperative Crown as the structural parent, not as a pixel-for-pixel copy. Create one complete production-oriented ACE Hardware City capital in a consistent 2.5D isometric view. Preserve the radial cooperative hierarchy: a dominant shared civic center with four supporting wings. Render it as precise grayscale wireframe architecture on a dark charcoal technical-grid background, with bright primary silhouette edges, medium structural members, and restrained tertiary detail. Keep the whole building centered and uncropped in a 3:2 landscape frame. Use one image only. Do not include logos, text, signage, people, vehicles, products, color, multiple panels, alternate views, exploded diagrams, or photorealistic materials.

## Concept matrix

| # | Concept | Role | Controlled change |
|---:|---|---|---|
| 01 | Cooperative Crown Baseline | Control | Production-clean restatement; no conceptual change |
| 02 | Crown Beacon | Single variable | Central height and skyline emphasis only |
| 03 | Civic Arcade Crown | Single variable | Public frontage and entry rhythm only |
| 04 | Open Workshop Commons | Single variable | Wing openness and visible work bays only |
| 05 | Compact Cooperative | Single variable | Footprint compactness and massing density only |
| 06 | Material Assembly Crown | Single variable | Structural and material expression only |
| 07 | Repair Exchange Crown | Single variable | Repair and service program legibility only |
| 08 | Neighborhood Service Forum | Hybrid | Civic arcade plus open service wings |
| 09 | Connected Supply Crown | Hybrid | Compact massing plus connected logistics |
| 10 | Cooperative Crown Synthesis | Hybrid | Height, civic entry, open wings, and structural expression |

## Variant prompt additions

1. **Baseline:** Preserve the winning massing and hierarchy; remove ornamental noise and clarify primary, secondary, and tertiary structure.
2. **Crown Beacon:** Change only central height. Make the shared center a taller civic beacon while keeping wing layout, footprint, enclosure, and entry language at baseline.
3. **Civic Arcade Crown:** Change only the public frontage. Add a strong, welcoming civic arcade and clearer entry rhythm while preserving baseline height, plan, wing enclosure, and footprint.
4. **Open Workshop Commons:** Change only wing openness. Replace enclosed supporting wings with legible open truss workshop bays while preserving baseline center, height, footprint, and entry.
5. **Compact Cooperative:** Change only footprint. Pull the supporting wings inward and tighten the overall mass without changing center height, enclosure, entry, or structural vocabulary.
6. **Material Assembly Crown:** Change only structural expression. Make timber, steel, masonry joints, braces, and trusses more explicit while preserving baseline plan, footprint, height, enclosure, and entry.
7. **Repair Exchange Crown:** Change only program legibility. Make repair and service bays spatially readable through architecture while preserving the Cooperative Crown plan and civic hierarchy.
8. **Neighborhood Service Forum:** Combine the civic arcade and open-workshop hypotheses into a neighborhood-facing forum without changing the radial cooperative hierarchy.
9. **Connected Supply Crown:** Combine compact massing with connected supply infrastructure; express logistics as subordinate circulation rather than a sprawling warehouse campus.
10. **Cooperative Crown Synthesis:** Combine the plausible winning cues—stronger beacon, clear civic entry, open service wings, and exposed structural intelligence—without losing the simple radial crown silhouette.

## Tournament loading

Open:

`concept-tournament.html?set=concept-tournaments/ace-hardware-city-r2/tournament-set.js`

Alternatively choose this folder in the tournament page. The included `tournament-set.json` supplies names and telemetry metadata automatically.
