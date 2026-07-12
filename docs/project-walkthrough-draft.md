# Project Walkthrough Inventory - Draft

This is a working content document for the portfolio's **Projects** experience.
It is not final website copy. Its purpose is to give each project a defensible
sequence that can later drive graph selection, project packets, and replay.

## Working rules

- A project step represents a truthful phase of work, not necessarily a literal
  runtime event or perfectly linear chronology.
- Technologies belong to the step where they were actually used. A technology
  should not light up during every step merely because it appears somewhere in
  the project.
- Personal ownership must remain separate from team or product outcomes.
- Measured outcomes, modeled estimates, production facts, and design goals must
  remain visibly different.
- Private implementation can be summarized, but exact Kaizen file paths, source
  excerpts, deployment values, credentials, and internal links must not appear
  in the public portfolio.
- `TODO` marks information Steve should correct, expand, or reject.

## Evidence labels

- **Resume-supported:** stated in the current resume draft.
- **Internal-summary-supported:** stated in the internal tooling metrics document.
- **Public-repo-supported:** inspectable in a public repository.
- **Private-repo-supported:** locally corroborated, but only a summary may be published.
- **User-provided:** supplied directly during portfolio planning.
- **Needs confirmation:** insufficient evidence for public wording or replay order.

## Current project catalog

| Project | Organization / context | Draft readiness | Main gap |
|---|---|---:|---|
| Kaizen Agent Platform | NinjaOne | High | Add adoption or operational outcome if one is available |
| Vendy VM Platform | NinjaOne | High | Refine chronology around shared core, remote navigation, and Mac ownership |
| Kaizen Metrics | NinjaOne | High | Curate the product philosophy and strongest feature sequence |
| Tanium Risk Assessment | Tanium | Medium | Separate personal engineering impact from product business metrics |
| UAT Automation | Tanium customer | Medium-low | Keep the private bank workflow coarse; confirm only the outcome measurement scope |
| CableCar | Tanium | High after workflow review | Confirm the exact migration-suite stages and content types safe to describe publicly |
| Tools Portal | Tanium | Low | Supporting contribution only; decide whether it belongs in the project list |
| xSearch | Tanium | Medium | Manifest V3/API flow is known; describe the limited/delayed use accurately |
| T-Match / EOLMatch | Tanium + personal | High | Clarify relationship between private use and public implementation |
| ContextForge | Personal / research | High | Current Kinforge evidence is not yet durable on the public branch |
| Evidence Atlas Portfolio | Personal | Medium | Define what performance and usability results are worth publishing |

## Known conflicts and publication corrections

### CableCar time savings

Steve confirmed that the correct value is **two weeks / 80 hours saved per
download**. This live clarification supersedes the resume's stale wording of
roughly one week per two documents. The resume should be corrected separately.

The internal document also models approximately **$5.85M** in net savings over
3.5 years using 1,064 downloads, 80 hours per download, a $77 hourly labor rate,
and $700,000 of modeled development cost. This is a modeled estimate, not an
audited realized saving. It should not be published as direct financial impact
without validating that a download reliably represents a migration/use and that
80 hours applies across those downloads.

### ContextForge / Kinforge metrics

The current portfolio data still uses older H80/H300 results such as 480 paired
comparisons, a 76% context reduction, and a 300-window lane. The current
Kinforge evidence ledger classifies those historical runs as diagnostic because
their immutable execution provenance is missing or caller-supplied.

The current replacement candidate is the source-bound H160 deterministic corpus:

- 2,880 paired decisions
- 0 priority mismatches
- 0 normalized world-action mismatches
- matching declared terminal projections in 6/6 profile pairs
- learned context equal to 25.7631% of tactical context, a 74.2369% reduction
- exact bounded recovery within an eight-window per-lineage horizon

These results currently depend on an uncommitted working-tree overlay. Do not
publish them as durable project evidence until the bound source and generated
evidence are committed and regenerated cleanly.

---

# Professional Projects

## Kaizen Agent Platform

**Organization:** NinjaOne  
**Period:** May 2025 - Present  
**Evidence:** Resume-supported, private-repo-supported  
**Replay readiness:** High

### Why it existed

Kaizen services already exposed internal engineering workflows through HTTP
APIs, but coding agents needed a governed way to discover and invoke those
capabilities without creating a separate layer of hand-maintained agent logic.

### What I owned

Steve designed and implemented the full Kaizen MCP project solo: capability-
contract conventions, tool generation, forwarding, authentication and
authorization controls, replay-safe writes, audit events, error handling,
correlation, telemetry, and deployment integration. Repository history
corroborates Steve as the author of the MCP project history currently present.

### Step 1 - Define capabilities as product-owned contracts

**What happened:** Existing services needed to describe not only parameter
shapes, but also intent, safety, role, availability, and write behavior.

**What I did:** Designed and implemented structured capability metadata that
remains owned by the service/product boundary rather than duplicated inside an
agent.

**Technologies:** JSON, OpenAPI / Swagger  
**Capabilities:** Capability contracts, data contracts, agent boundaries  
**Suggested graph focus:** OpenAPI -> Capability contracts -> Agent boundaries

**Result / evidence:** Agent-facing behavior can be generated from the same
contract surface used to describe the product capability.

### Step 2 - Generate MCP tool definitions

**What happened:** Hand-maintained tool wrappers would drift from service APIs
and multiply maintenance cost.

**What I did:** Built generation that combines capability contracts with API
schemas to emit tool definitions and typed input schemas.

**Technologies:** Go, MCP, OpenAPI, JSON Schema  
**Capabilities:** Tool generation, schema validation, workflow automation  
**Suggested graph focus:** Go -> OpenAPI -> MCP -> Data contracts

**Result / evidence:** One generated tool surface replaces manually maintained
agent wrappers for supported operations.

### Step 3 - Preserve backend authority and RBAC

**What happened:** Reimplementing business rules inside MCP would create a
second source of truth.

**What I did:** Mapped tool calls to the owning backend HTTP services while
preserving request identity, leaving domain logic in those services, and
retaining endpoint-level role-based access control as the final authorization
boundary.

**Technologies:** Go, HTTP, JWT, MCP  
**Capabilities:** Agent boundaries, service integration, trusted authority  
**Suggested graph focus:** MCP -> Go -> Agent boundaries -> Trusted evidence

**Result / evidence:** The agent surface delegates authority to existing product
services instead of becoming an alternate backend. MCP discovery filtering does
not replace the endpoint's own RBAC enforcement.

### Step 4 - Filter discovery by actor roles

**What happened:** Returning every tool and rejecting unauthorized calls later
would expose operations the actor could never use.

**What I did:** Applied validated identity and role metadata before tool
registration so unauthorized operations are absent from discovery.

**Technologies:** JWT, role-based access control, Go  
**Capabilities:** Authorization, least privilege, agent boundaries  
**Suggested graph focus:** Go -> Agent boundaries -> Capability contracts

**Result / evidence:** Authenticated users and agents see only the tools allowed
for their roles, while the owning endpoint still authorizes every request.

### Step 5 - Make writes replay-safe and diagnosable

**What happened:** Agents and networks can retry requests, creating duplicate or
argument-drifted writes.

**What I did:** Added Redis-backed idempotency, request correlation, sanitized
errors, structured audit events, and operational telemetry around write/admin
operations.

**Technologies:** Go, Redis, HTTP, telemetry  
**Capabilities:** Replay-safe writes, observability, failure handling  
**Suggested graph focus:** Redis -> Replay-safe writes -> Trusted evidence

**Result / evidence:** Identical retries can reuse the prior result, conflicting
retries are rejected, and failures can be investigated without returning raw
backend details.

### Final outcomes

- Generated agent tools from product-owned contracts and API schemas.
- Removed unauthorized tools from discovery rather than exposing and rejecting
  them at invocation time.
- Preserved backend ownership of business logic, trusted evidence, and RBAC.
- Added operational controls appropriate for retry-prone agent writes.

### Private boundary

- Do not publish exact internal source paths, generated tool inventory, service
  URLs, deployment topology, environment values, role names, or telemetry data.
- Public copy can discuss architecture and behavior at the level above.

---

## Vendy VM Platform

**Organization:** NinjaOne / Kaizen  
**Period:** May 2025 - Present  
**Evidence:** Resume-supported, private-repo-supported  
**Replay readiness:** High

### Why it existed

QA and engineering teams needed self-service test environments across multiple
infrastructure providers. An existing Kotlin/Java tool called DocUI attempted
to serve part of that need, but reliability problems had eroded user trust.
Kaizen and Vendy were built as a ground-up replacement rather than another patch
on the inherited tool.

### What I owned

Steve and teammate Anthony co-designed and co-built Kaizen's core Vendy
services. The work required cross-organization discovery, architecture meetings,
and agreement on a replacement workflow. Steve specifically owned the remote
file-navigation feature and the Mac/MacStadium integration work. Anthony owned
the Guacamole connector; this project narrative must not attribute that
connector to Steve. Later solo Kaizen services are covered separately under
Kaizen Agent Platform and Kaizen Metrics.

### Step 1 - Replace the inherited product model

**What happened:** The existing DocUI workflow had reliability and usability
problems, but users still needed a trusted way to request test environments.

**What I did:** Worked across organizations and architecture stakeholders to
define a ground-up replacement product and service boundary.

**Technologies:** Architecture and product design; legacy Kotlin/Java is context,
not a technology Steve is claiming for this step  
**Capabilities:** Cross-organization architecture, platform replacement,
operator trust  
**Suggested graph focus:** Operator control -> Data contracts

**Result / evidence:** Kaizen/Vendy replaced the inherited workflow with a new
platform rather than extending DocUI.

### Step 2 - Model one checkout and lifecycle surface

**What happened:** AWS, VMware, and MacStadium expose different VM concepts and
operations.

**What I did:** Co-designed and co-built a shared request and lifecycle model
with Anthony while preserving provider-specific information behind the service
boundary.

**Technologies:** Go, PostgreSQL, REST / gRPC  
**Capabilities:** Data contracts, platform abstraction, operator control  
**Suggested graph focus:** Go -> Data contracts -> PostgreSQL -> Operator control

**Result / evidence:** Users can request and manage environments through one
product workflow rather than provider-specific procedures.

### Step 3 - Coordinate long-running provisioning

**What happened:** Provisioning requires multiple asynchronous steps and can
fail between transitions.

**What I did:** Co-built orchestration around persisted checkout state,
transactional outbox events, queued worker responses, retries, and explicit
next-step routing.

**Technologies:** Go, PostgreSQL, AWS SQS  
**Capabilities:** Workflow orchestration, replay-safe transitions, failure recovery  
**Suggested graph focus:** PostgreSQL -> Workflow orchestration -> AWS -> Go

**Result / evidence:** Long-running work can advance through explicit state
transitions instead of relying on one fragile synchronous request.

### Step 4 - Route work to provider services

**What happened:** VM operations needed to execute through AWS, VMware, and
MacStadium-specific implementations.

**What I did:** Helped coordinate provider-specific workers/services while
keeping the shared lifecycle and operator status in the central platform.

**Technologies:** Go, AWS, VMware, MacStadium, gRPC  
**Capabilities:** Cross-provider orchestration, service coordination  
**Suggested graph focus:** Workflow orchestration -> AWS -> Go -> Data contracts

**Result / evidence:** One lifecycle can span three infrastructure providers.

### Step 5 - Build remote file navigation

**What happened:** Engineers working inside provisioned environments needed a
product-level way to navigate remote files without falling back to disconnected
manual workflows.

**What I did:** Designed and implemented the remote file-navigation feature.

**Technologies:** React, TypeScript, backend file APIs  
**Capabilities:** Operator UX, remote-system integration, data contracts  
**Suggested graph focus:** React -> Operator control -> Data contracts

**Result / evidence:** Remote file access became part of the Vendy product
surface. The separate Guacamole connector was Anthony's work and is not included
in Steve's ownership claim.

### Step 6 - Make lifecycle state visible to operators

**What happened:** Users needed to understand availability, current ownership,
provisioning progress, expiration, and recovery actions.

**What I did:** Co-built the operator-facing lifecycle surface so product state
was visible rather than hidden in backend jobs.

**Technologies:** React, TypeScript, Go  
**Capabilities:** Operator UX, observability, state modeling  
**Suggested graph focus:** React -> Operator control -> Workflow orchestration

**Result / evidence:** The product surface reflects the same state machine the
backend uses to coordinate work.

### Step 7 - Own the Mac platform expansion

**What happened:** The platform needed to support macOS workloads and migration
paths for systems that could no longer remain on VMware.

**What I did:** Owned the Mac/MacStadium integration work, extending lifecycle,
inventory, image, and provider behavior for macOS environments. Also contributed
to the broader VMware-to-AWS migration path.

**Technologies:** MacStadium, VMware, AWS, Go  
**Capabilities:** Platform migration, provider integration  
**Suggested graph focus:** AWS -> Workflow orchestration -> Measured impact

**Result / evidence:** Resume and portfolio material report support for more
than 100 Mac VMs and a shared workflow across AWS, VMware, and MacStadium.

### Final outcomes

- One self-service provisioning surface across three infrastructure providers.
- Ground-up replacement for the unreliable inherited DocUI workflow.
- Explicit orchestration for checkout state, transitions, retries, and service
  coordination.
- Operator-visible lifecycle state.
- Remote file navigation designed and implemented by Steve.
- More than 100 Mac VMs supported.

### Attribution boundary

- Describe the core Vendy platform as joint work with teammate Anthony.
- Attribute remote file navigation and Mac/MacStadium integration to Steve.
- Do not attribute the Guacamole connector to Steve.

### Private boundary

- Do not publish internal service names, queue names, database structures,
  environment details, image identifiers, or private operational telemetry.

---

## Kaizen Metrics

**Organization:** NinjaOne / Kaizen  
**Period:** May 2025 - Present  
**Evidence:** Resume-supported, private-repo-supported, user-provided  
**Replay readiness:** High

### Why it existed

Engineering leaders and teams needed repository, Jira, people, and delivery
metrics that could be traced back to validated source data instead of assembled
manually or trusted without freshness and identity controls.

### What I owned

Steve designed and built the original Kaizen Metrics project end to end as a
solo passion project: Databricks ingestion, synchronization, backend service,
PostgreSQL model and SQL views, metric design, dashboards, custom dashboarding,
and the AI-assisted query surface. AI Usage was added by other contributors
after the Metrics service existed and is excluded from this ownership claim.
Repository history corroborates Steve as the primary author across the Metrics
service and UI history currently present.

### Step 1 - Build rate-aware repository ingestion

**What happened:** Repository-scale Bitbucket collection was constrained by API
rate limits and a large source inventory.

**What I did:** Built a containerized Python ingestion pipeline with a rotating
three-key pool to distribute authentication pressure.

**Technologies:** Python, Docker, Bitbucket APIs  
**Capabilities:** Data ingestion, rate-limit handling, workflow automation  
**Suggested graph focus:** Python -> Docker -> Workflow orchestration

**Result / evidence:** Repository ingestion does not concentrate all requests on
one credential. Credential rotation mitigates pressure; it does not eliminate
the upstream rate limit.

### Step 2 - Partition and schedule Databricks processing

**What happened:** The repository workload needed predictable scheduled
execution and bounded partitions.

**What I did:** Structured the pipeline as a scheduled Databricks job with three
shards.

**Technologies:** Databricks, Python  
**Capabilities:** Distributed ingestion, scheduling, workload partitioning  
**Suggested graph focus:** Python -> Databricks -> Workflow orchestration

**Result / evidence:** Ingestion is partitioned across three scheduled shards.

### Step 3 - Gate reporting data with validation

**What happened:** Bad or incomplete upstream data could silently become a
dashboard metric.

**What I did:** Added data-quality checks and synchronization controls before
data entered downstream reporting.

**Technologies:** Databricks, Python, PostgreSQL  
**Capabilities:** Data contracts, trusted evidence, validation  
**Suggested graph focus:** Databricks -> Data contracts -> Trusted evidence

**Result / evidence:** Validation gates downstream reporting data.

### Step 4 - Build the reporting service and identity model

**What happened:** Databricks data needed to become durable, queryable product
data for repositories, people, organizations, Jira projects, and dashboards.

**What I did:** Expanded the service and synchronization model around local
PostgreSQL data, contract-driven metrics, repository reporting, and identity
resolution.

**Technologies:** Go, PostgreSQL, Databricks, REST  
**Capabilities:** Reporting systems, data contracts, identity resolution  
**Suggested graph focus:** Databricks -> PostgreSQL -> Go -> Data contracts

**Result / evidence:** Resume material reports Databricks synchronization across
500+ Bitbucket repositories and repository-level engineering reporting.

### Step 5 - Model workload without turning activity into a leaderboard

**What happened:** Conventional activity and delivery metrics can be flattened
into rankings that ignore role, ownership, sample size, specialization, and team
context. DORA-style signals are not inherently leaderboards, but using them as
individual scores would have produced the wrong product behavior.

**What I did:** Designed peer-relative workload views around group averages,
deviation, confidence, and a repurposed Gini coefficient for workload
concentration. The intent was to surface overload, underuse, specialization
drift, and key-person risk as investigation prompts rather than performance
scores.

**Technologies:** Go, PostgreSQL, SQL views, React, TypeScript  
**Capabilities:** Metric design, responsible analytics, evaluation, data contracts  
**Suggested graph focus:** PostgreSQL -> Evaluation -> Trusted evidence -> React

**Result / evidence:** The product includes workload-concentration, variance,
and peer-relative views with explicit caveats that activity distribution is not
an individual performance score.

### Step 6 - Build SQL views and configurable product surfaces

**What happened:** Engineering data needed usable dashboards and administrative
surfaces rather than database-only access.

**What I did:** Built SQL-backed metric views, connected them through APIs to
repository, people, organization, Jira, and synchronization workflows, and
created custom dashboards and reports from governed metric definitions.

**Technologies:** React, TypeScript, Go, PostgreSQL  
**Capabilities:** Full-stack product delivery, operator UX, reporting  
**Suggested graph focus:** PostgreSQL -> Go -> React -> Operator control

**Result / evidence:** Metrics data became a configurable product surface rather
than a collection of isolated scripts or fixed leaderboards.

### Step 7 - Add a trusted natural-language assistant

**What happened:** Users needed a lower-friction way to explore metrics without
allowing browser-supplied context to impersonate backend evidence.

**What I did:** Integrated an AWS Bedrock-powered assistant and preserved a
boundary between display context and backend-authorized metric evidence.

**Technologies:** AWS Bedrock, Go, React  
**Capabilities:** Agent protocols, trusted evidence, reporting UX  
**Suggested graph focus:** AWS -> Trusted evidence -> Agent boundaries

**Result / evidence:** Users can ask natural-language questions while trusted
metric facts remain service-owned.

### Final outcomes

- Databricks synchronization across 500+ Bitbucket repositories.
- Contract-driven repository and engineering reporting.
- Rate-aware, sharded, validated ingestion.
- Peer-relative workload and concentration views designed as investigation
  signals rather than individual rankings.
- SQL-backed metric views, custom dashboards, and configurable reports.
- Natural-language access to metrics through a trusted backend boundary.

### Attribution boundary

- Attribute the original Metrics pipelines, service, data model, metric design,
  and product surfaces to Steve.
- Do not attribute the later AI Usage feature to Steve.

### Private boundary

- Do not publish source, credentials, job identifiers, shard configuration,
  schemas, internal metric definitions, organization data, or production
  telemetry.

---

## Tanium Risk Assessment (TRA)

**Organization:** Tanium  
**Period:** June 2020 - April 2025  
**Evidence:** Resume-supported, internal-summary-supported  
**Replay readiness:** Medium

### Why it existed

TRA produced endpoint risk scoring and actionable remediation plans. It began
as a pre-sales solution and later moved toward a platform-integrated product.

### What I owned

The team inherited a proof of concept. Steve led the effort that turned it into
the fuller project, but did not write the entire implementation alone. Under
his technical leadership the project went through two Python refactors before a
later Go refactor for platform release.

### Step 1 - Take ownership of the inherited proof of concept

**What happened:** Customer-facing endpoint risk reports required long-running
collection and analysis and produced oversized output.

**What I did:** Led the team from the inherited proof of concept into a broader
engineering effort, identifying high-cost collection, analysis, and
serialization paths before restructuring the pipeline.

**Technologies:** Python, endpoint inventory data  
**Capabilities:** Performance analysis, data pipelines  
**Suggested graph focus:** Python -> Evaluation -> Data contracts

### Step 2 - Lead two Python refactors

**What happened:** One restructuring pass was not enough to prepare the tool for
its broader reporting and platform direction.

**What I did:** Led two successive Python refactors focused on data collection,
analysis efficiency, and a maintainable reporting pipeline. Team members shared
the implementation work.

**Technologies:** Python, endpoint inventory data  
**Capabilities:** Technical leadership, performance engineering, data pipelines  
**Suggested graph focus:** Python -> Evaluation -> Workflow orchestration

**Result / evidence:** Internal documentation reports a 3x improvement in
resource usage/data analysis and a 100x reduction in data-collection runtime.
The resume summarizes the change as cutting runtime by more than eight hours.

### Step 3 - Reduce report size

**What happened:** Large report artifacts were expensive to move and consume.

**What I did:** Changed the export/data representation, including Parquet-based
output.

**Technologies:** Python, Parquet  
**Capabilities:** Data compression, reporting systems  
**Suggested graph focus:** Data contracts -> Measured impact

**Result / evidence:** Report data size decreased by a factor of four.

### Step 4 - Prepare the project for platform integration

**What happened:** The standalone implementation needed to become a platform
feature with a maintainable service foundation.

**What I did:** Led the Python-to-Go refactor in preparation for the platform
release. This was a team implementation, not solo-authored code.

**Technologies:** Go, Python  
**Capabilities:** Service migration, platform engineering  
**Suggested graph focus:** Python -> Go -> Workflow orchestration

**Result / evidence:** Internal documentation says the Go rewrite preserved the
performance of the first refactor rather than producing another significant
speed increase.

### Final outcomes

- More than eight hours removed from the report runtime, according to the
  resume summary.
- Fourfold reduction in output size.
- Internal source reports 3x analysis/resource improvement and 100x faster data
  collection, but scope and benchmark method need clarification.
- Prepared the project for platform integration through a Go rewrite.

### Attribution boundary

- Attribute technical leadership and substantial implementation work to Steve.
- Describe TRA as a team project built from an inherited proof of concept.
- Do not imply Steve wrote every Python and Go component personally.

### Attribution warning

The internal document reports an 88% pre-sales conversion rate when TRA was
used, increased NARR activity, and increased new-logo acquisition. Those are
product/business context from another business unit, not evidence that Steve's
refactor caused the business outcomes. Do not present them as personal impact
without a stronger attribution source.

### Private boundary

- Do not publish customer data, report samples without approval, internal
  scoring logic, undisclosed financial values, or proprietary implementation.

---

## UAT Automation

**Organization:** Tanium project for a bank customer; customer name private  
**Period:** June 2020 - April 2025  
**Evidence:** Resume-supported, user-provided  
**Replay readiness:** Medium-low

### Why it existed

A bank customer had a manual user-acceptance-testing workflow that consumed
multiple people for roughly one week per execution. The exact test workflow and
systems involved are not public.

### What I owned

Steve designed and built the standalone C# application, custom UI, and LocalDB
state model. Its only external integration was API communication with the
customer's Tanium server; the project did not depend on a broader integration
ecosystem.

### Step 1 - Map the manual UAT workflow

**What happened:** The process depended on repeated human coordination and
manual execution.

**What I did:** Converted the private manual workflow into explicit application
states and automatable stages. Public copy should stop at that level.

**Technologies:** C#, LocalDB, Tanium API  
**Capabilities:** Workflow analysis, process automation  
**Suggested graph focus:** Workflow orchestration -> Local state

### Step 2 - Build the automation application

**What happened:** The mapped workflow needed a repeatable execution surface.

**What I did:** Built the custom UI and local persistence needed to configure,
execute, and review the UAT process.

**Technologies:** C#, LocalDB, custom desktop UI  
**Capabilities:** Application development, operator UX, local data modeling  
**Suggested graph focus:** C# -> LocalDB -> Operator control

### Step 3 - Connect the local workflow to Tanium

**What happened:** The application needed to execute or inspect work against the
customer's Tanium environment without exposing the private workflow publicly.

**What I did:** Integrated the standalone application with the Tanium API.

**Technologies:** C#, Tanium API  
**Capabilities:** API integration, workflow execution  
**Suggested graph focus:** Data contracts -> Workflow orchestration

### Step 4 - Reduce manual execution

**Result / evidence:** The resume reports a reduction from four FTEs to one and
from one week to one hour.

`TODO: Confirm whether these values describe one execution, a recurring cycle,
or sustained staffing. Add the measurement period and source.`

### Private boundary

- Do not publish the bank's identity, customer/test data, internal system names,
  credentials, workflow stages, or proprietary test procedures.
- The public walkthrough should use a coarse replay: local state -> operator UI
  -> Tanium API -> measured outcome.

---

## CableCar

**Organization:** Tanium  
**Period:** Approximately 3.5 active years; exact dates needed  
**Evidence:** Resume-supported, internal-summary-supported, public Tanium
training material  
**Replay readiness:** High after workflow review

### Why it existed

Tanium's on-premises-to-cloud migration process needed a repeatable suite for
migrating content, validating the result, and resolving migration failures.
Public Tanium training material confirms CableCar's role in content migration,
Health Check reporting, and error troubleshooting; it does not document the
suite's internal implementation.

### What I owned

Steve did not perform the initial development. After the original teammate left,
Steve inherited the full migration suite, became its technical lead, and drove
its ongoing development, maintenance, distribution, and migration use. The
internal document says no more than one FTE built and maintained it at any given
time.

### Step 1 - Take over the existing migration tool

**What happened:** An existing proprietary migration suite lost its original
developer but remained operationally important.

**What I did:** Learned the existing architecture and migration model, assumed
technical ownership, and set the direction for subsequent development and
support.

**Technologies:** `TODO: document formats, APIs, transformation libraries`  
**Capabilities:** Data transformation, workflow automation  
**Suggested graph focus:** Data contracts -> Workflow orchestration

### Step 2 - Prepare source content for migration

**What happened:** A migration needed to identify and prepare the source content
that would move from the on-premises environment.

**What I did:** Maintained and expanded the suite's source-side migration flow.

**Technologies:** `TODO: source APIs, document/content formats, local storage`  
**Capabilities:** Source assessment, data extraction, migration readiness  
**Suggested graph focus:** Data contracts -> Workflow orchestration

`TODO: Confirm the exact source inventory/extraction stages and content types
that are both accurate and safe to name publicly.`

### Step 3 - Execute conversion and target migration

**What happened:** Source content needed to be converted or transferred into the
target cloud environment through a repeatable process.

**What I did:** Led the suite that coordinated the migration and handled the
required conversion path.

**Technologies:** `TODO: target APIs, transformation libraries, job model`  
**Capabilities:** Data transformation, workflow orchestration, migration control  
**Suggested graph focus:** Data contracts -> Workflow orchestration -> Operator control

`TODO: Confirm which transformations, dependency checks, and target operations
Steve can describe publicly. These details are not established by the public
training material.`

### Step 4 - Validate and recover

**What happened:** Migration operators needed to verify the target result and
resolve failures rather than treating transfer completion as success.

**What I did:** Supported the validation and troubleshooting stages of the
CableCar workflow while maintaining the suite.

**Technologies:** CableCar, Health Check reporting `TODO: internal validation stack`  
**Capabilities:** Validation, recovery workflows, operator feedback  
**Suggested graph focus:** Trusted evidence -> Operator control -> Workflow orchestration

### Step 5 - Lead the React/Electron operator product

**What happened:** Migration specialists needed a usable way to configure,
execute, and review conversions.

**What I did:** Led and extended the React and Electron application around the
migration workflow after inheriting the initial implementation.

**Technologies:** React, Electron, TypeScript / JavaScript `TODO: confirm`  
**Capabilities:** Desktop product development, operator UX  
**Suggested graph focus:** React -> Operator control -> Data contracts

`TODO: Confirm which major React/Electron features Steve personally implemented
after taking over CableCar.`

### Step 6 - Support repeated migrations

**What happened:** The suite supported repeated migrations and was distributed
to migration users rather than remaining a one-off internal script.

**What I did:** Maintained and expanded the project across cloud and on-premises
migration cases and supported its continued operational use.

**Technologies:** `TODO`  
**Capabilities:** Product maintenance, workflow automation  
**Suggested graph focus:** Workflow orchestration -> Measured impact

### Final outcomes

- 1,064 downloads reported by the internal tooling document.
- Steve confirmed two weeks / 80 hours saved per download; the resume's current
  one-week-per-two-documents wording is stale.
- The internal tooling document models approximately $5.85M net savings from
  that time-saving value; treat the financial total as a modeled estimate until
  its remaining assumptions are validated.

### Private boundary

- Do not publish customer migration content, conversion logic, internal links,
  or the modeled financial value as realized savings.
- The exact source content types, transformation rules, dependency analysis,
  target operations, and error data require Steve's approval before publication.

---

## Tools Portal

**Organization:** Tanium  
**Evidence:** Internal-summary-supported  
**Replay readiness:** Low

### Why it existed

Tools Portal centralized internal tooling and also supported licensing,
customer health/churn-risk scores, time tracking, tuning configuration, and
data synchronization with Salesforce.

### What I owned

Steve made a small supporting contribution as needed. Other teammates led the
project, so this should not be presented as Steve-owned work.

### Provisional work areas - not yet claims

- Central internal-tool catalog.
- Licensing workflows.
- Customer health-score tracking.
- Time tracking.
- Internal tuning configuration.
- Local database and Salesforce synchronization.

`TODO: Identify the specific supporting change Steve made. Until then this can
remain experience context, but it should not become a featured or animated
project walkthrough.`

---

## xSearch

**Organization:** Tanium  
**Evidence:** Internal-summary-supported  
**Replay readiness:** Medium-low

### Why it existed

The organization was considering an external search product with a projected
cost of roughly $300,000 per year. xSearch explored an internal alternative
inside employees' existing browser workflow. It was a deliberately simple
aggregation extension, not a new search platform.

### What I owned

Steve designed and built the full greenfield project solo in five business
days. The internal document estimates development cost at roughly $3,000.
Rollout was delayed, usage numbers are unavailable, and the commercial product
was purchased and used alongside xSearch for a period.

### Step 1 - Connect the source APIs

**What happened:** Knowledge was distributed across Confluence, Stack Exchange,
Slack, Jira, and Salesforce.

**What I did:** Connected the extension to the available APIs for those sources.

**Technologies:** APIs for Confluence, Stack Exchange, Slack, Jira, Salesforce  
**Capabilities:** Search integration, data federation  
**Suggested graph focus:** Data contracts -> Workflow orchestration

### Step 2 - Build the Manifest V3 extension

**What happened:** A standalone tool would add another destination employees had
to remember.

**What I did:** Delivered xSearch as a Google/Chrome extension using Manifest V3
rather than as a standalone application.

**Technologies:** Chrome extension, Manifest V3, browser APIs  
**Capabilities:** Operator UX, product integration  
**Suggested graph focus:** Operator control -> Data contracts

### Step 3 - Aggregate and present the results

**What happened:** Results from several services needed to be normalized into a
single usable response inside the extension.

**What I did:** Aggregated the source API responses and rendered the combined
result for the user.

**Technologies:** Source APIs, Chrome extension `TODO: exact language`  
**Capabilities:** Data aggregation, response normalization, operator UX  
**Suggested graph focus:** Data contracts -> Operator control

### Step 4 - Deliver a bounded internal alternative

**Result / evidence:** Internal documentation reports a five-business-day build,
an estimated $3,000 development cost, and a projected $300,000 annual vendor
cost. There is no evidence that the vendor purchase was avoided.

### Attribution warning

Projected vendor cost is not realized savings. Public copy should say Steve
built xSearch as a rapid internal alternative, rollout was delayed, and it was
used alongside the purchased product. Do not imply broad adoption or avoided
spend.

### Private boundary

- Do not publish internal API endpoints, credentials, company search data, or
  undocumented source-access behavior.

---

## T-Match / EOLMatch

**Organization:** Tanium use with a personal/public foundation  
**Evidence:** Resume-supported, internal-summary-supported, public-repo-supported  
**Replay readiness:** High after relationship clarification

### Why it existed

Endpoint inventory contains inconsistent software names and versions. End-of-
life analysis needs those variants normalized and matched to canonical products.

### What I owned

Draft claim: Steve built the matching foundation independently, then used a
private/internal version for undisclosed Tanium work. The public EOLMatch repo
demonstrates the normalization and matching approach without exposing Tanium
code or data.

### Step 1 - Normalize inconsistent software names

**What happened:** Inputs such as `app v10`, `app 10`, and `app version 10`
represented the same product but did not compare cleanly.

**What I did:** Built normalization for case, version words, numeric suffixes,
separators, and repeated whitespace.

**Technologies:** Go  
**Capabilities:** Data normalization, matching  
**Suggested graph focus:** Go -> Data contracts

### Step 2 - Implement native similarity matching

**What happened:** Normalization alone could not resolve aliases and near-name
variants.

**What I did:** Implemented a native Go Jaro-Winkler matcher with configurable
threshold behavior.

**Technologies:** Go, Jaro-Winkler similarity  
**Capabilities:** Algorithm implementation, evaluation  
**Suggested graph focus:** Go -> Evaluation -> Data contracts

### Step 3 - Build an end-of-life matching workflow

**What happened:** Canonical product matches needed release and lifecycle data.

**What I did:** Built a CLI workflow that fetches endoflife.date product data,
stores a slim local representation, matches CSV inventory, and writes scored
results.

**Technologies:** Go, CSV, JSON, endoflife.date API  
**Capabilities:** Data ingestion, normalization, reporting  
**Suggested graph focus:** Go -> Data contracts -> Measured impact

### Step 4 - Apply the foundation internally

**What happened:** Tanium had an undisclosed use case for software-name
normalization and end-of-life detection.

**What I did:** Applied the public algorithmic foundation in a private internal
context.

**Technologies:** Go  
**Capabilities:** Technology transfer, endpoint risk analysis  
**Suggested graph focus:** Go -> Evaluation -> Trusted evidence

### Final outcomes

- Public implementation demonstrates the normalization and matching mechanics.
- Resume states that the native Go module supported end-of-life software
  detection across inconsistent endpoint inventory data.

### Private boundary

- Do not claim the public repository is the exact Tanium implementation.
- Do not publish the undisclosed project, customer inventory, or private match
  results.

---

# Personal and Research Projects

## ContextForge

**Context:** Personal research and engineering system  
**Evidence:** Public-repo-supported, user-provided  
**Replay readiness:** High after evidence durability check

### Why it existed

Agent workflows tend to accumulate repeated instructions, oversized context,
ambiguous authority, and unstructured handoffs. ContextForge explores how to
route capabilities, compile bounded context, preserve durable evidence, and
recover without treating a transcript as the source of truth.

### What I owned

Steve designed and built the architecture and prototypes across ContextForge,
Kinforge, and the reusable Skills repository. Kinforge served as the controlled
protocol testbed before the ideas were operationalized as skills, routing
policies, context budgets, schemas, and toolset behavior.

### Step 1 - Define the context and capability problem

**What happened:** More context and more tools did not automatically produce a
better or safer agent workflow.

**What I did:** Designed a capability-driven architecture separating intent,
context, memory, evidence, and tool authority.

**Technologies:** Markdown contracts, JSON / YAML, MCP concepts  
**Capabilities:** Architecture planning, capability contracts, context budgeting  
**Suggested graph focus:** Capability contracts -> Context budgeting -> Agent boundaries

**Result / evidence:** ContextForge architecture and implementation notes define
the intended separation. Treat unimplemented portions as design, not shipped
runtime behavior.

### Step 2 - Build Kinforge as a controlled protocol testbed

**What happened:** Context-compression ideas needed a system where packet size,
decision behavior, replay, hidden information, and failure recovery could be
measured separately.

**What I did:** Built a Vite/TypeScript primordial-organism simulation with
multiple agent surfaces, deterministic seeds, compact lineage control, privacy
filters, replay, and experiment tooling.

**Technologies:** TypeScript, Vite, Vitest, browser simulation  
**Capabilities:** Protocol design, deterministic replay, evaluation  
**Suggested graph focus:** TypeScript -> Deterministic replay -> Evaluation

### Step 3 - Introduce bootstrap, delta, repair, refresh, and resync

**What happened:** Repeating the full protocol and state contract every window
created avoidable context cost, but an aggressively small surface could omit
decision-relevant information.

**What I did:** Implemented a learned-compact surface that bootstraps a shared
contract, then sends bounded deltas, repair/refresh packets, and explicit
sequence recovery.

**Technologies:** TypeScript, JSON protocol  
**Capabilities:** Context compression, protocol design, recovery  
**Suggested graph focus:** Context compression -> Context budgeting -> Replay-safe writes

### Step 4 - Bind claims to reproducible evidence

**What happened:** Historical live runs and self-report could be mistaken for
stronger causal or protocol evidence.

**What I did:** Built an evidence ledger, deterministic comparison corpus,
source/hash commitments, recovery scenarios, evidence classes, and explicit
non-claims.

**Technologies:** TypeScript, deterministic artifacts, SHA-256 commitments  
**Capabilities:** Evaluation, trusted evidence, data contracts  
**Suggested graph focus:** Evaluation -> Trusted evidence -> Data contracts

**Result / evidence:** The current working-tree corpus reports 0/2,880 priority
and normalized action mismatches, 6/6 terminal projection matches, and learned
context at 25.7631% of tactical. Publication is blocked until the bound overlay
is committed and regenerated.

### Step 5 - Operationalize the ideas as a Skills runtime

**What happened:** A simulation protocol alone did not solve real engineering
workflow routing, skill selection, handoff, and context-carry problems.

**What I did:** Built a Git-backed reusable skill library with deterministic
routing policy, compact skill registries, context-budget policy, worker packet
contracts, run-ledger schemas, gate discipline, and promotion rules.

**Technologies:** Markdown, YAML, JSON Schema, Node.js tooling  
**Capabilities:** Skill routing, workflow orchestration, context budgeting,
governance  
**Suggested graph focus:** Context budgeting -> Workflow orchestration -> Capability contracts

**Result / evidence:** The public Skills repository provides inspectable routing,
budget, schema, registry, and validation artifacts. No claim of reduced real-
world model cost should be made without a measured comparison.

### Final outcomes

- A controlled protocol testbed for compact agent handoffs.
- Bounded recovery and evidence-class separation.
- A public, reusable skill/routing/toolset implementation of the operational
  lessons.
- A defensible distinction between payload reduction, model token use, gameplay
  outcome, and self-report.

### Public links

- Kinforge: <https://github.com/Dorbii/Kinforge>
- Skills: <https://github.com/Dorbii/skills>

---

## Evidence Atlas Portfolio

**Context:** Personal portfolio project  
**Evidence:** Public/local repo-supported  
**Replay readiness:** Medium

### Why it existed

A conventional résumé or project-card portfolio does not show how technologies,
capabilities, professional work, and evidence overlap.

### What I owned

Steve designed the concept and iteratively directed and implemented the portfolio
with Codex as a collaborative development tool.

### Step 1 - Replace project cards with an evidence graph

**What happened:** Earlier portfolio directions felt generic and did not expose
cross-project capability relationships.

**What I did:** Designed a graph where evidence density, technology fields, and
capability relationships organize the work.

**Technologies:** React, TypeScript, Canvas 2D  
**Capabilities:** Information architecture, data visualization  
**Suggested graph focus:** React -> TypeScript -> Data contracts

### Step 2 - Build real-time particle and packet rendering

**What happened:** Static node links did not communicate correlation strength or
project flow.

**What I did:** Built particle fields, flowing packets, zoom-aware visual tokens,
project icons, interaction emphasis, and deterministic graph layout behavior.

**Technologies:** Canvas 2D, TypeScript, React  
**Capabilities:** Rendering, interaction design, performance engineering  
**Suggested graph focus:** TypeScript -> React -> Evaluation

### Step 3 - Remove performance bottlenecks

**What happened:** Higher particle and icon density caused visible lag and
obvious animation loops.

**What I did:** Reduced per-frame token work, cached sprites, adjusted animation
behavior, and refined viewport/panning logic.

**Technologies:** Canvas 2D, browser profiling, TypeScript  
**Capabilities:** Performance optimization, operator UX  
**Suggested graph focus:** TypeScript -> Evaluation -> Operator control

### Step 4 - Reframe projects as walkthrough routes

**What happened:** Treating projects as both graph nodes and navigation items
duplicated the information model.

**What I did:** Designed the next model where capabilities and technologies are
nodes while projects become ordered walkthroughs whose identity packets travel
through the relevant work.

**Technologies:** React, TypeScript  
**Capabilities:** Information architecture, state modeling, interaction design  
**Suggested graph focus:** Data contracts -> Workflow orchestration -> Operator control

### Final outcomes

- Real-time interactive evidence graph running locally without the earlier lag.
- Distinctive portfolio interaction with project, capability, technology, and
  evidence relationships.
- Project walkthrough model is designed but not yet implemented.

### Attribution note

Public copy should be direct that Codex assisted implementation. The project is
still evidence of Steve's product direction, technical judgment, iterative
review, and code ownership, but it should not imply every line was typed without
agent assistance.

---

# Projects requiring Steve's next pass

For each project, correct the draft using this minimal structure:

```text
Project:
Organization:
Why it existed:
What I personally owned:

Step 1:
What happened:
What I did:
Technologies used in this step:
Result or evidence:

Step 2:
...

Final outcomes:
What must remain private:
What the current draft gets wrong:
```

Recommended refinement order:

1. Vendy VM Platform
2. Kaizen Agent Platform
3. Kaizen Metrics
4. ContextForge
5. Tanium Risk Assessment
6. CableCar
7. UAT Automation
8. T-Match / EOLMatch
9. xSearch
10. Tools Portal

## Source basis for this draft

- `steven_doris_resume_no_format.docx` - employment, role, technology, and
  concise outcome claims.
- `Internal Tooling Metrics.docx` - Tanium project descriptions, adoption or
  performance context, and modeled savings assumptions.
- [Tanium Cloud Migration course description](https://site.tanium.com/rs/790-QFJ-925/images/TR-Cloud-Migration-for-Partners-and-Customers.pdf) - public
  confirmation that CableCar covers Tanium content migration, Health Check
  reports, and migration-error troubleshooting; not evidence for its internal
  architecture.
- Current local Kaizen implementation - private corroboration only; exact paths
  and source details are intentionally excluded.
- Public Kinforge, Skills, ContextForge/cfrag, EOLMatch, and portfolio
  repositories - project architecture, implementation shape, claim boundaries,
  and public artifacts.
- Steve's live clarifications and annotated draft - project grouping,
  ContextForge lineage, ownership boundaries, product history, metrics product
  philosophy, pipeline implementation details, and the corrected CableCar time
  saving.
