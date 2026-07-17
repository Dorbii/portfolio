# Steven Doris — Engineering Evidence Atlas

An interactive portfolio for senior full-stack and platform engineering work.
The atlas relates systems, capabilities, technologies, and evidence. Visitors
can query up to three concepts, open curated evidence traces, inspect proof
boundaries, and share the current view through URL state.

This is deliberately a static site. The graph, traces, filtering, and URL state
run in the browser; there is no database, authentication layer, or portfolio API.

## Interaction model

- Projects are neutral gravity wells distributed through the atlas. They remain
  outside the evidence-query ontology, but they anchor the visual layout and
  its project-to-skill motion corridors.
- Each capability or technology appears once. A project-specific skill orbits
  its project; a shared skill is positioned near the weighted barycenter of the
  projects whose records demonstrate it.
- Particle bridges and selection wakes represent evidence-backed project-to-skill
  relationships only. The visual field does not invent skill-to-skill links.
- Semantic icons reveal progressively as the visitor zooms. Wheel zoom remains
  graph navigation unless the viewport is centered near a project portal and
  crosses that portal's authored entry threshold.
- Project gravity wells focus the relevant evidence nodes using the existing graph
  viewport. Authored project entry converges the atlas into a local,
  deterministic clip, then exposes an integrated project-details surface.
  Returning reverses the transition and restores the exact prior graph view.

Project media is declared in
`features/evidence-atlas/model/project-media.ts`. The Kaizen Metrics clip is a
static Blender render served from `public/projects/kaizen-metrics`; it has no
runtime generation or API cost. Public descriptions of Kaizen work are curated
summaries only and must not expose private source files or file-level evidence.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

The site runs on [vinext](https://github.com/cloudflare/vinext) and does not use
`wrangler.jsonc`.

## Site structure

- `app/page.tsx`: thin route that mounts the evidence-atlas feature
- `features/evidence-atlas/components`: workspace, graph, controls, and inspectors
- `features/evidence-atlas/hooks`: selection, replay, keyboard, URL, and sharing state
- `features/evidence-atlas/model`: evidence catalog, indexes, and query resolution
- `features/evidence-atlas/rendering`: deterministic layout and Canvas2D particle field
- `features/evidence-atlas/styles`: responsive atlas visual system
- `app/globals.css`: global Tailwind and feature-style entry point
- `.openai/hosting.json`: Sites hosting metadata

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build and verify the server-rendered atlas and evidence contracts
- `npm run lint`: lint the site source
