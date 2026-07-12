# Visual Token Catalog

Status: phase-one runtime prototype. The atlas now promotes a bounded set of
particles into semantic masks during zoom, cursor proximity, selection, and
active evidence paths.

## Purpose

The atlas uses particles to show evidence-backed proximity. Visual tokens add
recognition at close range without changing what the graph claims.

A token may appear only when its node or evidence record supports the current
relationship. Token count is decorative and must never imply proficiency,
certainty, volume of work, or runtime direction.

## Token families

| Family | Represents | Overview behavior | Focused behavior |
| --- | --- | --- | --- |
| Technology mask | A language, framework, service, or data technology | At most a few faint echoes inside supported fields | One tracked token can follow an evidence-backed path from the selected technology |
| System mark | A named system or project | Rare ambient echoes | One tracked token can identify the active system trace |
| Experience mark | An employer or personal experience metaphor | Hidden | Static identity in the evidence drawer; custom metaphors may animate when the experience is active |
| Evidence packet | The class of proof supporting a relationship | Hidden | A sparse glyph can travel with the active evidence record |

## Current technology nodes

These nodes already exist in `features/evidence-atlas/model/evidence-data.ts` and are eligible for a
technology token.

| Node | Proposed reference | Mask direction | Tracked use | Ambient use | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Go | Supplied Go gopher artwork + official Go wordmark path | Tight face crop and `GO` mark | Follow records containing `go` from the selected Go node | Mix recognizable gopher faces and wordmark echoes in Go-supported fields | P0 | The full-body mascot does not survive particle scale; preserve the eyes, teeth, and outline instead |
| TypeScript | Simple Icons / `SiTypescript` | Preserve the `TS` cutout in a square mask | Follow TypeScript-backed Kinforge records | Faint echoes around TypeScript-supported fields | P1 | Test legibility before accepting a sub-16px version |
| React | Simple Icons / `SiReact` | Preserve the atom silhouette | Follow React-backed interface records | Sparse orbit-like echoes without adding literal orbit lines | P0 | Strong small-size silhouette |
| AWS | Generic cloud silhouette or isolated AWS-style arrow | Prefer the cloud for ambient masks and test the arrow for tracked tokens | Follow AWS-backed Vendy records | Sparse cloud echoes in AWS-supported fields | P0 | Do not use the full `aws` wordmark at particle scale |
| PostgreSQL | Simple Icons / `SiPostgresql` | Preserve the elephant-head silhouette | Follow records containing `postgresql` | Sparse echoes in data-contract and platform fields | P0 | Strong distinctive silhouette |
| Redis | Simple Icons / `SiRedis` | Preserve the stacked-database silhouette | Follow safe-write and coordination records | Sparse echoes in Redis-supported fields | P1 | Avoid making stack count look quantitative |
| OpenAPI | Simple Icons / `SiOpenapiinitiative` | Preserve the aperture/ring silhouette | Follow generated-contract records | Sparse echoes near OpenAPI-supported fields | P1 | Must remain distinct from the generic evidence-packet glyphs |
| MCP | Custom generic protocol connector | Two linked endpoints, a compact plug, or a small routing fork | Follow MCP-backed governed-agent records | Minimal connector echoes | P0 | Present it as the atlas's MCP glyph, not an official MCP logo |
| Python | Simple Icons / `SiPython` | Preserve the paired-snake silhouette | Follow repository-ingestion records | Sparse echoes in the metrics-pipeline field | P0 | Scheduled ingestion, API coordination, and validation |
| Docker | Simple Icons / `SiDocker` | Preserve the whale-and-containers silhouette | Follow records for the Bitbucket ingestion workload | Sparse echoes around the ingestion pipeline field | P0 | Containerized execution for a Python Bitbucket ingestion pipeline |
| Databricks | Simple Icons / `SiDatabricks` | Preserve the stacked open-box silhouette | Follow records for scheduled ingestion and validation | Sparse echoes around scheduled-job and data-quality fields | P0 | Scheduled Python ingestion job using three shards, a three-key authentication pool to reduce rate-limit failures, and data-quality checks |

## Systems and experience

| Identity | Reference | Proposed treatment | Priority | Boundary |
| --- | --- | --- | --- | --- |
| Kaizen | Private Kaizen reference artwork supplied by the portfolio owner | Compact monochrome K mask; tracked and faint ambient variants | P0 | Activate only for `kaizen-agent-tools` evidence |
| Sensei / Ninja experience | Private Sensei reference artwork supplied by the portfolio owner | New low-detail ninja silhouette inspired by the source; 1–3 compact frames | P0 prototype | Personal metaphor, not an official NinjaOne logo |
| NinjaOne | Official NinjaOne media-kit artwork | Static experience identity only | P1 | Preserve the supplied logo colors and proportions; do not tint it as a particle |
| Tanium | Official Tanium logo pack | Static experience identity only | P1 | Preserve the supplied artwork and use only to identify employment |
| Kinforge | Existing anvil/forge visual direction | Custom monochrome system mask | P1 | Activate only for Kinforge records |
| Skills runtime | Contract/braces visual direction | Custom monochrome system mask | P1 | Keep distinct from the generic contract evidence packet |
| Vendy VM platform | VM/cube visual direction | Custom monochrome system mask | P1 | Activate only for Vendy records |

## Evidence packet vocabulary

Evidence packets are abstract glyphs tied to a record rather than a node.

| Glyph | Meaning | Eligible evidence |
| --- | --- | --- |
| `[]` | Contract or schema | Capability metadata, OpenAPI, data contracts |
| `⊢` | Authority or boundary | Role filtering, service authority, constrained tool surfaces |
| `↺` | Replay or deterministic reproduction | Replay-safe writes, deterministic comparisons |
| `Δ` | Measured comparison | Bounded metrics and comparative outcomes |
| `~` | Bounded live observation | Live trials and endurance runs with explicit limitations |

The final glyph artwork should be drawn as masks; these characters describe the
semantics and are not necessarily the literal rendered shapes.

## Visual behavior contract

1. A tracked token appears only after a technology, system, or evidence trace
   becomes active.
2. Its path must be backed by a supporting evidence record containing both
   endpoints.
3. Direction represents the visitor's current exploration from the selected
   node. It does not claim runtime data flow or causal direction.
4. The token begins with the source node tone and continuously interpolates to
   the destination node tone.
5. Ambient echoes stay inside fields and paths supported by the same node. They
   cannot wander into unrelated regions.
6. Ambient token count is deterministic decoration, not an evidence score.
7. Overview mode remains particle-first. Recognizable tokens become legible
   only in a focused or future zoomed state.
8. Reduced-motion mode replaces travel with a static midpoint or destination
   marker.

## Asset constraints

- Import only the selected Simple Icons SVG sources as raw path data. Do not
  import the package-wide JavaScript catalog; doing so materially slows the
  production build.
- Mechanically normalize established technology silhouettes; do not use an
  image model to approximate brand marks.
- Build custom derivatives only for personal/project artwork such as Sensei,
  Kaizen, Kinforge, Skills, and Vendy.
- Prefer one decoded monochrome atlas or a similarly bounded mask source over
  one request per token.
- Target a common 24×24 mask artboard, with a larger cell only for the tracked
  ninja silhouette.
- Normalize perceived visual weight, not merely bounding-box dimensions.
- Record the source family and license for every imported reference before
  implementation.

## Kaizen public-evidence boundary

Internal Kaizen material may inform private design and fact-checking, but it is
not a public portfolio artifact.

The site may publish curated descriptions of responsibilities, architecture,
operational behavior, and user-approved outcomes. It must not expose:

- internal file paths, filenames, repository links, line references, or code
  snippets;
- internal service URLs, host or warehouse identifiers, configuration values,
  credentials, tokens, or secret names;
- raw logs, internal screenshots, deployment details, or direct links to
  private implementation evidence.

Kaizen records should identify their source as a private production
implementation or owner-curated summary. Public claims must stand on their own
without implying that visitors can inspect the underlying repository.

## Proposed prototype set

The first implementation experiment should cover different silhouette risks:

1. Kaizen K — simple custom mark.
2. Go — supplied gopher face crop plus official wordmark path.
3. PostgreSQL — detailed established technology silhouette.
4. React — thin established technology silhouette.
5. AWS cloud/arrow — generic platform silhouette.
6. MCP connector — custom generic protocol glyph.
7. Docker — wide established technology silhouette.
8. Databricks — layered established technology silhouette.
9. Sensei — larger tracked character token.

If those nine remain legible and coherent in the actual graph, the remaining
catalog can use the same production method. If an individual silhouette fails,
revise that token rather than weakening the common rules for every token.

## Reference sources

- React Icons search: <https://react-icons.github.io/react-icons/search/#q=>
- React Icons repository and per-pack license table:
  <https://github.com/react-icons/react-icons>
- Simple Icons: <https://simpleicons.org/>
- NinjaOne brand assets: <https://www.ninjaone.com/brand/>
- Tanium logo pack: <https://www.tanium.com/newsroom/media-kit/logo-pack/>

## Implemented prototype decisions

- The overview remains particle-first. Tokens begin promoting at 116% zoom.
- Selection and cursor proximity raise token visibility; deeper zoom reveals
  faint ambient echoes without requiring two visible nodes.
- Active evidence bridges reuse the existing particle flow and promote at most
  two particles into semantic tokens. There is no separate tracked-packet
  state machine.
- Each promoted field renders one focal token plus low-opacity echoes mixed
  into its particles: up to six for generic capabilities, four for
  technologies, and two for systems. Counts depend on zoom and interaction,
  never evidence strength. Echoes are smaller, flatter, and distributed across
  the field rather than arranged as a second visual ring.
- Tokens keep a bounded screen-space size and are culled before intersecting
  the viewport edge or an open evidence drawer.
- A shared 0.68 motion-time factor keeps field drift, bridge flow, blooms, and
  semantic tokens synchronized at a calmer pace.
- Reduced-motion mode places active bridge tokens at the midpoint.
- Established technology masks use targeted Simple Icons path data. Personal,
  system, and evidence-class glyphs use the local Canvas2D vocabulary.
- Vector masks are rasterized once into small quantized-color sprites. Animated
  frames reuse those sprites with `drawImage`; they do not rebuild detailed
  paths and shadows for every echo on every frame.

## Remaining prototype work

- Validate the compact original gopher glyph at the actual zoom threshold.
- Validate the Python, Docker, and Databricks masks against the new metrics
  trace at the actual zoom threshold.
- Add Sensei and employer identity marks only in experience-specific surfaces;
  they should not become generic ambient particles.
