# Task Packet: CW-002 Five-Asset Art Tracer

## Task

Generate, save, inspect, and report the five canonical tracer concept sheets. These are production references for deterministic SVG construction, not shippable map geometry.

## Worker

- run id: `career-world-2026-07-16`
- lane id: `art-tracer-generation`
- parent thread id: `/root/art_lead`
- role: concept artist
- route id: `imagegen/stylized-concept/tracer`
- spawn mode: worker-lane
- queue item id: `CW-002`
- context budget: the exact packet plus imagegen instructions; no broad repo reading
- run ledger path: `docs/career-world-production/run-ledger.json`
- worker report path: `docs/career-world-production/reports/art-tracer-generation.json`
- log artifact directory: `docs/career-world-production/logs/art-tracer-generation/`
- expected exit gate: five saved concept sheets, exact prompts, and self-review evidence

## Preconditions

- `docs/career-world-production/asset-inventory.md` is authoritative.
- Generated concepts never become layout truth.
- Other agents may edit nearby files; never revert unrelated work.

## Allowed Files

- `design/career-world/concepts/tracer/**`
- `docs/career-world-production/reports/art-tracer-generation.json`

## Forbidden Files

- Application, test, dependency, configuration, registry, and factual evidence files.
- Do not commit, stage, reset, or revert.
- Do not use CLI/API fallback or request an API key.

## Required Context

- `docs/career-world-production/asset-inventory.md`
- `docs/career-world-production/reports/art-lead-recon.json` shared style bible and rubric
- Style reference: `C:/Users/Steve/.codex/visualizations/2026/07/17/019f6de4-afa7-7ef1-9527-fb01bcab4419/career-world-mocks-v2/03-kaizen-metrics-project-city.png`
- World reference: `C:/Users/Steve/.codex/visualizations/2026/07/17/019f6de4-afa7-7ef1-9527-fb01bcab4419/career-world-mocks-v2/01-career-world-overview.png`
- City reference: `C:/Users/Steve/.codex/visualizations/2026/07/17/019f6de4-afa7-7ef1-9527-fb01bcab4419/career-world-mocks-v2/02-ninjaone-employer-territory.png`

## Generation Contract

Use built-in image generation only, exactly one call per distinct asset. Use the reference images for visual language, not as edit targets. Save every selected output into the workspace with these exact names:

```text
design/career-world/concepts/tracer/skill-go-v1.png
design/career-world/concepts/tracer/project-kaizen-metrics-v1.png
design/career-world/concepts/tracer/city-ninjaone-v1.png
design/career-world/concepts/tracer/world-career-world-v1.png
design/career-world/concepts/tracer/ambient-evergreen-cluster-v1.png
```

Every prompt must include the shared projection, technical-cartography medium, LOD continuity, no-text/no-logo constraints, and the exact asset-specific brief below.

### `skill/go@v1`

Compact service engine house: one low rectangular workshop, one taller central engine bay, two narrow exhaust stacks, visible turbine housings, fixed sign-slot panel with no mark. It must read as a fast service/language workshop through architecture alone. Three LOD views preserve the exact silhouette.

### `project/kaizen-metrics@v1`

Domed engineering observatory and reporting hall: circular ribbed dome, square base, one lower rectangular annex, one rooftop dish aligned behind the dome. Preserve the accepted domed identity from the reference. LOD-2 may include exactly three small shard beacons and a restrained archive/service detail; no numbers or claims.

### `city/ninjaone@v1`

Employer capital landmark: compact modern civic/platform cluster with a tall central tower, two stepped side towers, low service wings, and one circular arrival court. It is a single capital asset, not a whole project city. Use NinjaOne palette slots without text or logo.

### `world/career-world@v1`

One authored geography reference: one large neutral mainland across the upper two-thirds with three fixed city anchor zones; exactly two islands below for ACE Hardware and Column Technologies; mainland roads and two dotted sea routes; calm sparse terrain. Preserve the composition of the supplied overview, but remove all generated labels and UI. Wide 16:9 reference, not an asset collage.

### `ambient/evergreen-cluster@v1`

Reusable cluster of three to five small conifer silhouettes on one shared ground pad. Isometric technical-cartography line art, no cast shadow, clean enough to trace and repeat at several scales.

## Acceptance Criteria

- All five exact files exist in the workspace and open successfully.
- Each prompt and final output path is recorded in the report.
- Each sheet is visually inspected with `view_image` for subject, projection, style, text/logo leakage, geometry coherence, and LOD continuity.
- A failed concept receives one targeted retry only. Keep the better version under the exact final filename and record the rejected path/reason if applicable.
- No generated text, logo, watermark, pseudo-text, PBR, photorealism, perspective drift, graph/dashboard composition, or private/factual claim.
- Concept images remain references; the report must not mark them `accepted` before independent QA.

## Gate Commands

- Image dimension/format inventory for the five PNG files.
- Visual inspection through `view_image` for all five.
- JSON parse validation of the worker report.

## Stop Conditions

- Built-in image generation is unavailable or fails twice for the same asset.
- The references are unreadable.
- Saving would require writing outside the allowed files.

## Expected Output

Write the report in worker-report schema with prompts, output paths, dimensions, self-scores, deviations, risks, and a `candidate_only` status. Return a concise summary to the art lead.

