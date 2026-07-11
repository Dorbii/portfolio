# Steven Doris — Engineering Evidence Atlas

An interactive portfolio for senior full-stack and platform engineering work.
The atlas relates systems, capabilities, technologies, and evidence. Visitors
can query up to three concepts, open curated evidence traces, inspect proof
boundaries, and share the current view through URL state.

This is deliberately a static site. The graph, traces, filtering, and URL state
run in the browser; there is no database, authentication layer, or portfolio API.

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
