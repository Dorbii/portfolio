# Steven Doris — Evidence Map Portfolio

An interactive portfolio for senior full-stack and platform engineering work.
The central map relates capabilities, technologies, projects, and evidence
without turning the work into a logo cloud or invented performance telemetry.

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

- `app/page.tsx`: interactive evidence map and portfolio content
- `app/globals.css`: relationship-field visual system and responsive behavior
- `public/og.png`: social-sharing image
- `.openai/hosting.json`: Sites hosting metadata

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build and verify the server-rendered portfolio shell
- `npm run lint`: lint the site source
