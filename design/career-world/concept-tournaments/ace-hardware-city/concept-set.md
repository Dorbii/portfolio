# ACE Hardware City — Tournament Concept Set

Status: candidate-only. None of these images is promoted production art until the two-run concept tournament is complete.

Generation mode: built-in image generation, one call per concept.

Post-processing: workspace copies were deterministically normalized to neutral RGB grayscale without changing geometry, framing, or resolution. All ten files are 1536 × 1024 PNGs with `R = G = B` for every pixel.

Style reference: `design/career-world/concepts/cities/ninjaone-v1.png` was used only for the shared technical-cartography treatment, capital scale, and fixed isometric projection. Its geometry, color, tower identity, and layout were explicitly excluded from reuse.

Business basis: ACE is a retailer-owned hardware cooperative whose stores are predominantly locally owned and operated. The architectural directions therefore explore shared infrastructure, neighborhood service, repair expertise, tools, building materials, home and garden, and distribution rather than copying a real store. Sources: [ACE retail overview](https://careers.acehardware.com/retail/), [ACE 2026 company description](https://newsroom.acehardware.com/ace-hardware-ranks-among-top-brands-on-forbes-2026-best-customer-service-list/).

## Shared prompt contract

```text
Use case: stylized-concept
Asset type: Career World employer-capital game environment concept, one tournament candidate in a ten-image ACE Hardware city set
Input images: Image 1 is a style, scale, and projection reference only. Do not copy its geometry, layout, palette, tower silhouette, or cyan color.
Scene/backdrop: exactly one isolated architectural asset on a near-black neutral charcoal technical drafting field with a very faint true-isometric grid; no surrounding city, terrain, props, people, vehicles, or loose tools.
Style/medium: highly detailed 2.5D architectural concept illustration; matte graphite and charcoal planar faces; thin silver and ivory wireframe construction lines; crisp traceable geometry; restrained neutral-white highlight seams; grayscale only.
Composition/framing: exactly one complete hero building centered in a 3:2 landscape frame, occupying roughly 76 percent of the canvas with generous clean margin; full roof, stairs, plinth, and outer silhouette visible; clear front entrance at lower center; grander, taller, wider, and more ceremonially layered than supporting project or skill buildings.
Projection: orthographic true-isometric; fixed camera azimuth 225 degrees from north, elevation 35.264 degrees, roll 0; +Y projects upper-left; verticals remain vertical; parallel axes never converge; no authored rotation.
Lighting/mood: calm technical-cartography presentation, precise and civic, no cast shadows or cinematic atmosphere.
Color palette: strict neutral grayscale only—near-black, charcoal, graphite, steel gray, silver, ivory. No red, blue, cyan, brown, sepia, or colored glow.
Constraints: this is a wholly original monumental capital for the ACE Hardware domain, reflecting neighborhood hardware, practical repair, tools, materials, local ownership, and helpful service only through subtle architectural language; one integrated plausible structure; distinctive traceable silhouette; connected masses; coherent stairs, doors, roofs, supports, and joins; polished high-detail hero suitable for a final 2.5D game asset.
Avoid: real ACE store likeness, strip mall, ordinary warehouse, suburban storefront, literal tool-shaped building, literal logo silhouette, ACE wordmark, any brand mark, generated text, letters, numbers, signs, labels, pseudo-text, watermark, multiple panels, alternate views, detail insets, LOD sheet, palette strip, border, perspective convergence, photorealism, PBR, glass tower, chrome, neon, colored accents, fantasy castle, sci-fi spaceship, floating pieces, melted geometry, impossible stairs, clutter.
```

Candidate 01 used the same contract with slightly more explicit one-off wording; its full intent is preserved below.

## Candidate prompts

### 01 — The Cooperative Crown

File: `ace-city-01-cooperative-crown.png`

```text
Design "The Cooperative Crown," a wholly original monumental capital building for the ACE Hardware domain. Express a retailer-owned hardware cooperative through architecture: one tall central octagonal assembly rotunda, four equally important connected workshop-and-merchant wings, interlocking exposed roof trusses converging into a restrained crown, broad public stairs, and a continuous heavy civic plinth. Subtle hardware cues may appear as structural brackets, bolted plates, cross-bracing, and carefully ordered service bays, never as a literal tool-shaped building.
```

### 02 — The Toolwright Capitol

File: `ace-city-02-toolwright-capitol.png`

```text
Design "The Toolwright Capitol." Use a powerful rectilinear civic composition: one tall stepped central hall inspired by the disciplined proportions of a professional tool cabinet, two long perpendicular workshop wings forming a broad shallow U, and one monumental open roof gantry tying the wings together above a public forecourt. Express hardware through exposed cross-braced roof trusses, thick corner brackets, flush bolted plates, ordered service-bay rhythms, and vise-like paired buttresses around the main entrance—abstracted architectural cues, never giant tools. The silhouette should be broad, tiered, robust, and unmistakably different from a radial rotunda.
```

### 03 — The Neighborhood Exchange

File: `ace-city-03-neighborhood-exchange.png`

```text
Design "The Neighborhood Exchange." Create a grand civic covered-market basilica celebrating locally owned neighborhood service: one high central nave with a clerestory lantern, two lower market halls crossing it on the true-isometric axes, four welcoming corner pavilions, deep arcaded porches, multiple broad public stairs, and a continuous stone-and-steel plinth. Repetitive small bay frames may subtly suggest organized hardware shelves and service counters, but the whole building must read as a dignified community exchange rather than a retail store or mall. Favor a welcoming horizontal silhouette with one commanding central roof volume.
```

### 04 — The Repair Foundry

File: `ace-city-04-repair-foundry.png`

```text
Design "The Repair Foundry." Create a monumental civic repair hall combining making, maintenance, and practical expertise: one tall square central forge-and-training tower with a vented crown, two connected sawtooth-roof workshop wings on different true-isometric axes, a heavy open truss bridge across the front court, broad ceremonial stairs, and low corner service pavilions integrated into one plinth. Use ribbed vents, structural braces, riveted gusset plates, and orderly repair bays as subtle hardware language. No smoke, flames, anvil symbols, giant tools, or factory clutter. It must feel like the capital of a culture that fixes things, not an ordinary industrial plant.
```

### 05 — The Timber Truss Hall

File: `ace-city-05-timber-truss-hall.png`

```text
Design "The Timber Truss Hall." Create a monumental civic great hall centered on practical building materials and construction knowledge: a long high central timber-frame nave with three strongly stepped roof ridges, two lower perpendicular side halls, huge exposed king-post and lattice trusses, broad masonry-and-steel end pylons, deep public porches, and a layered foundation terrace. Use ordered horizontal slat bands and stacked beam rhythms as abstract lumber cues while keeping every mass integrated and permanent. The silhouette should be long, peaked, and structurally expressive—dignified civic architecture, not a barn, sawmill, lumber yard, or warehouse.
```

### 06 — The Finish Lantern

File: `ace-city-06-finish-lantern.png`

```text
Design "The Finish Lantern." Create an elegant monumental capital inspired by paint, coatings, and finishing expertise without using color or literal paint containers: one tall faceted central lantern tower built from several nested protective architectural shells, two low curved-but-faceted gallery wings, layered cornices that read like precisely applied coats, ribbed opaque skylight crowns, broad symmetrical stairs, and material-test panels integrated as unlabeled facade textures. Contrast smooth, brushed, ribbed, and stippled grayscale surfaces within the same wireframe language. The silhouette should be vertical, refined, luminous through neutral ivory seams, and unlike the heavier industrial concepts; no glass curtain wall and no paint-can shape.
```

### 07 — The Fastener Bastion

File: `ace-city-07-fastener-bastion.png`

```text
Design "The Fastener Bastion." Create a massive low-slung hexagonal civic stronghold expressing connection and reliability: one dominant six-sided central keep, three concentric stepped ring terraces mechanically locked together, six short integrated buttress galleries at the corners, a broad segmented ring beam around the upper level, one commanding lower-center stair, and restrained repeating bolt-cap and gusset details at genuine structural joints. The hexagonal geometry may subtly recall nuts and sockets but must remain credible architecture, never a giant fastener or novelty building. Favor a compact, weighty, unmistakable silhouette with a tall restrained crown at the center.
```

### 08 — The Garden Hearth Commons

File: `ace-city-08-garden-hearth-commons.png`

```text
Design "The Garden Hearth Commons." Create a grand civic home-and-outdoor hall combining durable shelter, garden stewardship, and neighborhood gathering: one tall central masonry hearth-and-vent tower with no smoke or flame, two broad connected open-lattice conservatory wings using opaque ribbed roof panels rather than glass, deep pergola-like arcades, four compact corner garden-work pavilions, and broad terraced public stairs. Use trellis grids, rain-chain-like vertical ribs, sturdy brackets, and layered roof drainage channels as subtle home-and-garden hardware cues. No plants, pots, patio furniture, greenhouse clutter, or cottage styling. The silhouette should balance a strong vertical hearth with graceful low wing arcs while remaining monumental.
```

### 09 — The Supply Nexus

File: `ace-city-09-supply-nexus.png`

```text
Design "The Supply Nexus." Create a capital-scale cooperative distribution exchange: one commanding central dispatch hall and stepped signal tower, four lower cross-shaped supply halls connected by elevated open truss bridges, a continuous heavy civic plinth, ordered recessed dock portals, broad ceremonial stairs, and tall corner pylons that visually lock the network together. The plan must communicate many local stores supported by one shared system, with every wing connected to the center. No trucks, crates, forklifts, conveyor clutter, shipping logos, or warehouse-box simplicity. Make the silhouette wide, infrastructural, and civic—an organized hub rather than a factory or spaceport.
```

### 10 — The Service Arch

File: `ace-city-10-service-arch.png`

```text
Design "The Service Arch." Express ACE's culture of practical helpfulness as monumental civic architecture: two tall asymmetrical but balanced knowledge-and-repair towers joined by one enormous inhabitable open truss arch above a broad lower-center public stair, with a dignified rear assembly hall and two low welcoming side galleries all integrated into one continuous plinth. The open arch should frame the entrance and read like a protected passage and meeting place, not a triumphal monument. Use visible joinery, layered brackets, repair-bay rhythms, handrail-like edge details, and accessible multiple approaches as subtle service cues. Favor a memorable gateway silhouette with generous negative space beneath the arch; no hands, people, mascots, slogans, or literal helping symbols.
```
