import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tournamentRoot = path.join(repoRoot, "design", "career-world", "concept-tournaments");

const sharedVisualContract = [
  "Create one isolated, complete Career World architectural asset in exact orthographic 2.5D isometric perspective, approximately 225-degree azimuth and 35.264-degree elevation.",
  "Use a 3:2 landscape composition with the whole structure centered, uncropped, and surrounded by generous margin.",
  "Render in neutral exact grayscale only on a dark near-black charcoal technical-drafting field with a faint isometric grid.",
  "Use restrained architectural wireframe line art, pale primary silhouette edges, medium structural members, matte low-value faces, fine construction lines, and controlled tertiary detail.",
  "The result must be one coherent, physically buildable structure with connected roofs, stairs, bridges, courts, annexes, conduits, and supports.",
  "Use one image only. No contact sheet, second panel, inset, silhouette swatch, alternate view, exploded view, text, labels, numbers, UI, charts, arrows, people, vehicles, landscapes, color tint, photorealism, or unrelated fantasy ornament.",
  "Do not reproduce a corporate or language logo exactly. Where requested, translate identity into subtle architectural negative space, roof geometry, structural rhythm, or monochrome wireframe holographic detail."
].join(" ");

const cityScaleContract = "This is an employer city capital and must read as a major domain centerpiece: broad civic footprint, multiple occupied levels, a decisive skyline, and materially more spatial ambition than any skill or project building.";
const skillScaleContract = "This is a compact supporting skill building: highly resolved and distinctive, but clearly smaller and less ceremonial than project landmarks and employer city capitals.";

function concept(slug, name, direction, businessCue, tags = []) {
  return { slug, name, direction, businessCue, tags };
}

const targets = [
  {
    profileId: "city/ninjaone@v1",
    folder: "city-ninjaone-r2",
    name: "NinjaOne City",
    category: "city",
    referenceAsset: "design/career-world/concept-tournaments/city-ninjaone-r1/ninjaone-r1-03-relay-crown-capitol.png",
    selectedR1: "Relay Crown Capitol",
    domainSummary: "A cloud-native unified IT operations capital that makes endpoint management simple through one centralized console, one lightweight agent, policy automation, real-time remote support, resilience, and a manage-protect-support operating model.",
    evidenceBoundary: "Keep the selected nested-ring relay crown as structural DNA, but remove its anonymous fantasy-citadel character. Use NinjaOne-inspired katana cuts and an abstract N only as architectural geometry, never as an exact logo or wordmark. Monochrome wireframe holograms may depict abstract endpoint classes and status constellations.",
    researchSources: [
      { title: "NinjaOne Platform", url: "https://www.ninjaone.com/platform/", use: "Unified manage, protect, and support platform; one agent, one console, automation, resilience, and endpoint diversity." },
      { title: "NinjaOne About", url: "https://www.ninjaone.com/about-us/", use: "Customer-first culture and a mission to simplify IT." },
      { title: "NinjaOne Brand Guide v1.5", url: "https://www.ninjaone.com/wp-content/uploads/2026/01/NinjaOne-Brand-Guide-v1.5.pdf", use: "Katana-shaped letter details, N icon, iconic line art, and abstract endpoint and automation patterns." }
    ],
    concepts: [
      concept("endpoint-hologram-crown", "Endpoint Hologram Crown", "Preserve the nested circular capital and six inhabited relay bridges. Replace the generic spired crown with a clean operations lantern projecting a large monochrome wireframe constellation of laptop, server, mobile, and network endpoint silhouettes above the central forum. Cut a subtle angular N-shaped void through the lantern frame.", "One console with real-time visibility across every endpoint.", ["holograms", "endpoint-constellation", "relay-crown"]),
      concept("katana-relay-citadel", "Katana Relay Citadel", "Sharpen the bridge roofs and central crown into restrained diagonal katana-like planes. Arrange two crossing diagonal braces and the central negative space so the roof plan quietly suggests an N without displaying a logo. Keep the ring civic, open, and technologically clean rather than militaristic.", "NinjaOne brand geometry translated into a unified remote-support capital.", ["katana-geometry", "n-negative-space", "remote-support"]),
      concept("unified-console-rotunda", "Unified Console Rotunda", "Organize the ring into three clearly different but connected civic sectors for manage, protect, and support: an ordered device colonnade, a shielded recovery archive, and an open technician service arcade. All three converge on one elevated console rotunda with restrained holographic status bands.", "Manage, protect, and support through one unified platform.", ["manage-protect-support", "central-console", "rotunda"]),
      concept("lightweight-agent-constellation", "Lightweight Agent Constellation", "Make the capital broad and comparatively uncluttered. Place many small identical endpoint pylons around the outer ring, each connected by a thin structural relay to one compact central agent beacon. Use sparse wireframe holographic arcs to show status returning inward without becoming a diagram.", "One lightweight agent coordinating a large distributed endpoint estate.", ["lightweight-agent", "distributed-endpoints", "simplicity"]),
      concept("policy-automation-cascade", "Policy Automation Cascade", "Turn the nested rings into a visible policy cascade: repeated gates, roof shutters, and maintenance bays change state in an orderly sequence moving outward from the center. Keep every ring physically connected and give the center a precise automation clockwork rather than decorative towers.", "Policy-driven automation and autonomous patching at scale.", ["policy", "automation", "patch-cascade"]),
      concept("secure-remote-support-gate", "Secure Remote Support Gate", "Make one grand inhabited bridge the primary silhouette, spanning from a technician operations hall into the circular endpoint estate through two guarded relay portals. Add small monochrome holographic device silhouettes inside the bridge windows and a katana-cut canopy over the secure rendezvous chamber.", "Fast secure remote access and technician support.", ["remote-access", "support-bridge", "secure-relay"]),
      concept("multi-tenant-shadow-court", "Multi-Tenant Shadow Court", "Divide the ring into four independently enclosed tenant wedges with different endpoint roof profiles, separated by narrow shadow courts but governed by one shared center. Give each wedge its own small agent pylon and route all four through isolated bridges to the central console.", "Multi-tenant governance without losing centralized control.", ["multi-tenant", "segmentation", "shared-governance"]),
      concept("resilience-recovery-crown", "Resilience Recovery Crown", "Build the relay crown over a visibly protected lower archive vault. Provide two redundant circulation paths around the ring, paired backup chambers, and a raised recovery lantern whose holographic geometry shows an endpoint silhouette being reconstructed from layered fragments.", "Integrated backup, recovery, and operational resilience.", ["backup", "recovery", "redundancy"]),
      concept("iconic-line-art-capital", "Iconic Line-Art Capital", "Simplify the large forms into confident clean rings, broad apertures, and generous spacing, then concentrate detail in a family of abstract line-art endpoint holograms, fast diagonal automation patterns, and small N-like structural brackets. Avoid ornamental gothic language entirely.", "A powerfully simple platform with an iconic, approachable visual language.", ["iconic-line-art", "abstract-endpoints", "clean-geometry"]),
      concept("unified-ninja-synthesis", "Unified Ninja Synthesis", "Synthesize the selected relay crown with a clean operations lantern, manage-protect-support sectors, lightweight endpoint pylons, a secure remote-support bridge, katana roof cuts, subtle N negative space, and a restrained endpoint hologram. Keep the hierarchy legible and avoid piling every detail at equal intensity.", "A distinctive NinjaOne capital unifying simplicity, automation, support, and resilience.", ["synthesis", "ninjaone-identity", "unified-operations"])
    ]
  },
  {
    profileId: "city/tanium@v1",
    folder: "city-tanium-r2",
    name: "Tanium City",
    category: "city",
    referenceAsset: "design/career-world/concept-tournaments/city-tanium-r1/tanium-r1-05-risk-observatory.png",
    selectedR1: "Risk Observatory",
    domainSummary: "A real-time endpoint-management and security capital built around Tanium's distributed linear-chain architecture, sensor questions, aggregated responses, immediate action, continuous visibility, exposure reduction, incident response, and a single lightweight endpoint agent.",
    evidenceBoundary: "Preserve the selected terraced risk-observatory hierarchy, but make the security and endpoint mechanism unmistakable. The linear chain must be a physical peer-to-peer sequence, not a hub-and-spoke network. Security details should read as controlled gates, hardened boundaries, evidence chambers, threat-hunt observatories, and rapid remediation routes rather than generic weapons.",
    researchSources: [
      { title: "Tanium Interact Essentials", url: "https://www.tanium.com/blog/tanium-interact-essentials-tech-talks-161/", use: "Sensor questions, live endpoint data, actions, and the Linear Chain Architecture." },
      { title: "Tanium Architecture", url: "https://site.tanium.com/rs/790-QFJ-925/images/DS-Tanium-Endpoint-Platform-Architecture-2020.pdf", use: "Peer-to-peer linear chains, small server fan-out, and aggregated endpoint responses." },
      { title: "Continuous Endpoint Security", url: "https://www.tanium.com/solutions/continuous-endpoint-security/", use: "Exposure management, incident response, least privilege, compliance, and continuous validation." }
    ],
    concepts: [
      concept("linear-chain-security-bastion", "Linear Chain Security Bastion", "Retain the terraced observatory but replace its generic perimeter with a long peer-to-peer chain of endpoint guardhouses wrapping the capital. Each node passes through the next; one outbound question lane and one aggregated return lane terminate at the observatory. Do not radiate every node directly to the center.", "Tanium's distinctive Linear Chain Architecture.", ["linear-chain", "peer-to-peer", "security"]),
      concept("question-action-twin-keep", "Question and Action Twin Keep", "Split the upper observatory into two unequal but linked towers: a sensor-question lantern and a decisive action/remediation keep. Run the endpoint chain through a central evidence court between them so observation and control are visibly paired.", "Ask any question and take immediate action across endpoints.", ["questions", "actions", "sensors"]),
      concept("threat-hunt-observatory", "Threat Hunt Observatory", "Make the top observatory an open faceted scanning chamber with a restrained monochrome wireframe sweep over the endpoint terraces. Add quarantine courts, evidence intake bays, and a fast incident-response stair that cuts directly from the outer chain to the command level.", "Real-time threat detection, investigation, and response.", ["threat-hunt", "incident-response", "evidence"]),
      concept("zero-trust-chain-citadel", "Zero-Trust Chain Citadel", "Build explicit least-privilege checkpoints between every peer node in the chain, each with a small identity gate and no uncontrolled cross-route. The central observatory remains visible but cannot bypass the chain's governed security boundaries.", "Controlled access and reduced lateral movement across the endpoint estate.", ["zero-trust", "least-privilege", "segmented-chain"]),
      concept("exposure-reduction-terraces", "Exposure Reduction Terraces", "Use three large stepped terraces to show a security lifecycle: exposed and irregular outer endpoint bays, an assessment and prioritization middle court, and a compact hardened remediation core. Connect the tiers with visible validation gates and return paths.", "Continuously find, prioritize, and remediate endpoint risk.", ["exposure", "prioritization", "remediation"]),
      concept("real-time-sensor-array", "Real-Time Sensor Array", "Populate the linear perimeter with many small heterogeneous endpoint chambers, each carrying the same compact sensor lantern. Their peer chain aggregates into progressively larger evidence vaults before reaching the risk observatory, making scale and live visibility readable without a network diagram.", "One sensor vocabulary producing current endpoint intelligence at scale.", ["sensors", "real-time", "aggregation"]),
      concept("guardian-response-keep", "Guardian Response Keep", "Add a protected express lane that bypasses normal civic circulation but still respects the endpoint chain, terminating in a tall guardian keep for urgent threats. Pair it with a confidence chamber and a contained remediation deployment bay rather than weapon imagery.", "Fast governed response to time-critical and zero-day threats.", ["guardian", "express-lane", "urgent-response"]),
      concept("deployment-ring-arsenal", "Deployment Ring Arsenal", "Recompose the terraces as phased deployment rings: a tiny canary court, a controlled pilot ring, and a broad estate ring. Each phase has entry and exit gates, rollback annexes, and chain-connected endpoint bays so safe change at scale becomes the dominant architecture.", "Deployment rings and controlled automated change.", ["deployment-rings", "canary", "rollback"]),
      concept("single-agent-shieldworks", "Single-Agent Shieldworks", "Keep the capital's infrastructure sparse. Repeat one small identical agent bastion at every endpoint node and eliminate relay-server towers. Use the freed space for a continuous defensive wall, live evidence galleries, and a single source-of-truth chamber beneath the observatory.", "A single lightweight agent with minimal infrastructure and complete visibility.", ["single-agent", "minimal-infrastructure", "source-of-truth"]),
      concept("visibility-control-security-synthesis", "Visibility-Control-Security Synthesis", "Combine the terraced Risk Observatory with a true peer-to-peer endpoint chain, sensor-question lantern, aggregated evidence return, hardened security gates, exposure-reduction terraces, and one fast remediation route. Keep the endpoint chain and security lifecycle legible at first glance.", "A Tanium capital defined by real-time visibility, control, and endpoint security.", ["synthesis", "visibility", "control", "security"])
    ]
  },
  {
    profileId: "skill/mcp@v1",
    folder: "skill-mcp-r2",
    name: "MCP",
    category: "skill",
    referenceAsset: "design/career-world/concept-tournaments/skill-mcp-r1/skill-mcp-r1-08-scale-engine.png",
    selectedR1: "Scale Engine",
    domainSummary: "A stateful JSON-RPC client-host-server protocol for context exchange. A host creates one isolated client per server; participants negotiate capabilities and lifecycle; servers expose tools, resources, and prompts; and the same data layer can operate over local stdio or remote Streamable HTTP transports.",
    evidenceBoundary: "Keep the R1 winner's dense technical construction and multiple service docks, but replace the generic loading-depot reading with explicit protocol architecture. Do not draw chat screens, literal source code, plug icons, detached network diagrams, or an AI brain. Express protocol participants, primitives, state, negotiation, transports, requests, responses, and notifications through buildable chambers, gates, tracks, and conduits.",
    researchSources: [
      { title: "MCP Architecture Overview", url: "https://modelcontextprotocol.io/docs/learn/architecture", use: "Hosts, dedicated clients, servers, data and transport layers, lifecycle, primitives, and notifications." },
      { title: "MCP Specification Architecture", url: "https://modelcontextprotocol.io/specification/2025-06-18/architecture", use: "Stateful sessions, security boundaries, 1:1 client-server relationships, and capability negotiation." },
      { title: "MCP Transports", url: "https://modelcontextprotocol.io/specification/2025-06-18/basic/transports", use: "Local stdio and remote Streamable HTTP transport mechanics." }
    ],
    concepts: [
      concept("host-client-server-exchange", "Host–Client–Server Exchange", "Build one elevated host chamber that manages four separate client lockhouses, each with exactly one physically isolated bridge to its own specialized server dock. No server may connect directly to another server, and the host must not connect directly to a server without its client chamber.", "One host coordinating multiple isolated 1:1 client-server sessions.", ["host", "clients", "servers", "isolation"]),
      concept("capability-handshake-lock", "Capability Handshake Lock", "Make an interlocking negotiation mechanism the center: two unequal gate drums present different structural teeth and only shared teeth align to open the session chamber. Surround it with a clear initialize, operate, and terminate circulation sequence.", "Capability negotiation and lifecycle before protocol features become available.", ["capability-negotiation", "handshake", "lifecycle"]),
      concept("three-primitive-foundry", "Three-Primitive Foundry", "Create three unmistakably different but connected server docks around one client core: a guarded action workshop for tools, a deep indexed archive for resources, and a reusable pattern theater for prompts. Give each dock a discovery vestibule before its main function.", "Tools, resources, and prompts as distinct discoverable server primitives.", ["tools", "resources", "prompts", "discovery"]),
      concept("json-rpc-switchyard", "JSON-RPC Switchyard", "Turn request and response correlation into a mechanical switchyard: paired bidirectional tracks pass through numbered-shape sockets without displaying numbers, while a thinner notification bypass moves one-way around the response hall. Keep every route connected to one stateful session core.", "JSON-RPC requests, responses, notifications, and correlation.", ["json-rpc", "request-response", "notifications"]),
      concept("dual-transport-engine", "Dual Transport Engine", "Build a common inner protocol chamber carried by two visibly different outer transport systems: one short direct twin-pipe conduit for local stdio and one longer gated streaming aqueduct with resumable segments for remote HTTP. The inner data-layer geometry must remain identical across both.", "One data protocol operating over local and remote transports.", ["stdio", "streamable-http", "data-layer", "transport-layer"]),
      concept("lifecycle-observatory", "Lifecycle Observatory", "Organize the structure through three concentric thresholds: an identity and version vestibule, an active session operations court, and an orderly termination/recovery gate. Place progress and update notification beacons around the active ring.", "Initialization, active operation, progress, updates, and termination.", ["lifecycle", "version-negotiation", "progress"]),
      concept("session-multiplexer", "Session Multiplexer", "Use the R1 scale-engine density to create one host spine with many narrow client cells, each branching to exactly one unequal server annex. Make isolation walls explicit while shared host circulation runs above them, revealing coordination without collapsing boundaries.", "Many dedicated sessions managed by one host without server cross-contamination.", ["sessions", "multiplexing", "security-boundaries"]),
      concept("consent-boundary-vault", "Consent Boundary Vault", "Place user authorization and host security policy at the only gate between a server action dock and the host core. Use nested permission thresholds, a visible stop gate, and sealed context vaults so powerful tools do not read as automatically trusted.", "Consent, authorization, and security boundaries around server capabilities.", ["consent", "authorization", "tool-safety"]),
      concept("dynamic-discovery-archive", "Dynamic Discovery Archive", "Build modular primitive shelves that can be added, removed, or reconfigured around a discovery hall. A restrained change-notification beacon should update the client gallery without rebuilding the whole structure. Preserve a strong technical silhouette rather than a warehouse.", "Dynamic discovery and list-changed notifications.", ["dynamic-discovery", "list-changed", "extensibility"]),
      concept("protocol-synthesis", "Protocol Synthesis", "Combine a host tower, isolated 1:1 client lockhouses, specialized tool/resource/prompt docks, a capability-handshake core, paired request/response tracks, a notification bypass, and dual stdio/HTTP transport shells. Prioritize legible layers and negative space over raw density.", "A technically faithful MCP building whose architecture communicates the protocol before its label does.", ["synthesis", "mcp-architecture", "technical-depth"])
    ]
  },
  {
    profileId: "skill/go@v1",
    folder: "skill-go-r2",
    name: "Go",
    category: "skill",
    referenceAsset: null,
    selectedR1: "Discarded — full rework",
    domainSummary: "A compiled language centered on readable convention, simple package composition, explicit errors, lightweight goroutines, channel-based communication, interfaces, a multiplexing runtime scheduler, and fast practical tooling.",
    evidenceBoundary: "This is a clean redesign; do not preserve the generic R1 warehouse. Avoid a literal Go wordmark or exact Go gopher reproduction. Rounded burrow forms, paired eye-like roof vents, incisor-like entry blocks, and playful practical proportions may act as restrained cultural easter eggs. Concurrency must be visible as many lightweight work cells communicating through explicit channels rather than as arbitrary pipes.",
    researchSources: [
      { title: "Effective Go", url: "https://go.dev/doc/effective_go", use: "Goroutines, channels, share-by-communicating, interfaces, errors, defer, and clear idioms." },
      { title: "The Go Gopher", url: "https://go.dev/blog/gopher", use: "The gopher as the project's distinctive approachable mascot and cultural identity." },
      { title: "Go Brand Book", url: "https://go.dev/blog/go-brand/Go-brand-book-v1.0.pdf", use: "Practical, approachable, flexible brand character and responsible mascot use." }
    ],
    concepts: [
      concept("goroutine-weave", "Goroutine Weave", "Create dozens of small rounded lightweight work pods suspended on two broad structural rails. Each pod can operate independently, while narrow channel bridges carry work between pods. A compact scheduler loft above the weave assigns pods to a much smaller number of heavy runner beams.", "Lightweight goroutines multiplexed by the runtime.", ["goroutines", "scheduler", "lightweight"]),
      concept("channel-aqueduct", "Channel Aqueduct", "Build separate workshop pavilions with no shared interior. Connect them only through explicit open-topped channel aqueducts, including one unbuffered rendezvous gate and one buffered holding reservoir. Make communication itself the synchronization mechanism.", "Share memory by communicating through channels.", ["channels", "buffering", "synchronization"]),
      concept("csp-courtyard", "CSP Courtyard", "Arrange independent sequential workhouses around a central transfer court. Each house owns its own compact storage and can exchange sealed payloads only at paired handoff gates around the court. Keep the plan clear, modest, and highly buildable.", "Communicating sequential processes and ownership through message passing.", ["csp", "message-passing", "ownership"]),
      concept("scheduler-loom", "Scheduler Loom", "Make the runtime scheduler a visible loom: many thin goroutine threads descend from stacked task racks and are woven onto a few robust machine rails, with blocked tasks peeling into waiting galleries while other threads continue.", "Many goroutines multiplexed over fewer operating-system threads.", ["m-n-scheduler", "blocking", "multiplexing"]),
      concept("defer-stack-workshop", "Defer Stack Workshop", "Use a compact vertical workshop with service platforms stacked in call order. On the return side, cleanup bridges descend in the exact reverse order toward the exit. Include small explicit resource-return gates and no ornamental machinery.", "Deferred cleanup executed reliably in last-in-first-out order.", ["defer", "cleanup", "stack"]),
      concept("interface-dockyard", "Interface Dockyard", "Create several different modules that can dock to the same tiny behavior gate because their structural contact shapes match, without inheritance towers or family crests. Keep the shared interface intentionally minimal and the concrete modules visibly diverse.", "Implicit interface satisfaction through behavior and composition.", ["interfaces", "composition", "shape-compatibility"]),
      concept("explicit-error-gate", "Explicit Error Gate", "Split every processing bay into a plain success exit and an equally visible error-return lane. Route errors back through a central inspection gate instead of hiding them below the building. The architecture should feel honest, direct, and mechanically simple.", "Explicit error values and straightforward control flow.", ["errors", "explicit-control", "simplicity"]),
      concept("fast-compile-foundry", "Fast Compile Foundry", "Feed a row of small package workshops into one compact compiler press and emit a single self-contained deployment block at the opposite end. Use direct short paths, little ornament, and a strong before-to-after silhouette without arrows or text.", "Fast compilation and practical self-contained binaries.", ["compiler", "packages", "binary"]),
      concept("gopher-burrow-easter-egg", "Gopher Burrow Easter Egg", "Create an approachable low rounded technical burrow with two eye-like roof lanterns, two broad incisor-like entry piers, small ear-like vents, and channel tunnels branching to concurrent work cells. Keep the reference abstract enough that it reads as architecture first, not a mascot sculpture.", "A restrained cultural easter egg for Go's approachable gopher identity.", ["gopher", "burrow", "easter-egg"]),
      concept("go-concurrency-synthesis", "Go Concurrency Synthesis", "Combine a rounded practical foundry, many lightweight goroutine pods, explicit channel aqueducts, a compact scheduler loom, a visible error-return lane, and subtle gopher-like roof details. The final silhouette must remain simple, readable, and less ornate than the other language buildings.", "Go's concurrency, clarity, and approachable engineering culture in one coherent building.", ["synthesis", "go-identity", "concurrency"])
    ]
  },
  {
    profileId: "skill/python@v1",
    folder: "skill-python-r2",
    name: "Python",
    category: "skill",
    referenceAsset: "design/career-world/concept-tournaments/skill-python-r1/skill-python-r1-10-skill-synthesis.png",
    selectedR1: "Skill Synthesis",
    domainSummary: "A readable, expressive, dynamically typed language with indentation-defined blocks, generators and iterators, decorators, a broad standard library, a large package ecosystem, asynchronous event loops, and strong automation and data tooling.",
    evidenceBoundary: "Retain the selected R1 building's broad two-hall synthesis only when useful. Add language identity through interlocking serpentine plans, four-step indentation terraces, generator paths, decorator shells, and package annexes. Do not reproduce the official two-snake logo exactly or write Python text.",
    researchSources: [
      { title: "The Python Tutorial", url: "https://docs.python.org/3/tutorial/", use: "Language structure, modules, control flow, data structures, classes, generators, and standard library." },
      { title: "The Python Logo", url: "https://www.python.org/community/logos/", use: "The paired opposing snake device as a familiar visual reference, used only through non-logo architectural analogy." }
    ],
    concepts: [
      concept("interlocking-serpentine-foundry", "Interlocking Serpentine Foundry", "Bend two unequal workshop halls into opposing rounded paths that interlock around one shared transfer court, evoking two serpentine bodies without copying the Python logo. Give each hall a small eye-like roof vent and a different program.", "Python's recognizable paired-serpent culture translated into plan geometry.", ["serpentine", "paired-halls", "easter-egg"]),
      concept("indentation-terraces", "Indentation Terraces", "Construct the building from nested blocks offset inward by a strict repeated four-step rhythm. Every deeper program level begins after the same visible indentation, while a clear outer circulation line shows where each block returns.", "Indentation-defined scope and readable block structure.", ["indentation", "four-step", "scope"]),
      concept("batteries-included-workshop", "Batteries-Included Workshop", "Keep a compact central interpreter hall but surround it with a rich yet orderly standard-library of connected specialist annexes: file, network, data, testing, and automation workshops expressed through different roof mechanisms.", "A broad standard library and practical batteries-included philosophy.", ["standard-library", "batteries-included", "automation"]),
      concept("generator-spiral", "Generator Spiral", "Organize the building around a slow spiral delivery path whose small payload cells become available one at a time rather than all at once. Include pause balconies and resumable gates along the path without arrows or diagrams.", "Lazy generators, iteration, pause, and resume.", ["generators", "iterators", "lazy"]),
      concept("package-bazaar", "Package Bazaar", "Create a coherent central language hall surrounded by many independently attachable package stalls on a continuous base. Vary the modules strongly but give every one the same clean import threshold and service connection.", "Python's extensive package and extension ecosystem.", ["packages", "ecosystem", "modules"]),
      concept("decorator-crown", "Decorator Crown", "Wrap a simple core hall in two visibly separate outer architectural layers that add access, logging, and service functions without changing the core's footprint. Make the wrappers read as reusable rings rather than defensive walls.", "Decorators adding behavior around an existing callable.", ["decorators", "wrappers", "composition"]),
      concept("async-event-loop-court", "Async Event Loop Court", "Use one circular event-loop court to coordinate several long-running service bays. Each bay can suspend at a waiting dock and re-enter the loop later while other bays continue. Avoid multiple competing central schedulers.", "Asyncio-style cooperative scheduling through an event loop.", ["asyncio", "event-loop", "await"]),
      concept("data-observatory", "Data Observatory", "Give the selected two-hall plan a faceted analysis observatory, matrix-like roof grids, notebook-shaped worktables expressed as architecture, and clean pipeline bridges between ingest, transform, model, and result chambers.", "Python's prominent data, scientific, and automation ecosystem.", ["data", "scientific", "pipelines"]),
      concept("pythonic-readability-house", "Pythonic Readability House", "Reduce visual clutter and organize all entrances, stairs, and program boundaries into a clear readable sequence with generous spacing. Hide no circulation and use one obvious way through each level, plus a subtle serpentine handrail easter egg.", "Readability, explicit structure, and a preference for clear idioms.", ["readability", "clarity", "pythonic"]),
      concept("python-language-synthesis", "Python Language Synthesis", "Combine interlocking serpentine halls, four-step indentation terraces, a standard-library annex field, a generator spiral, an event-loop court, and a restrained analysis observatory. Preserve a broad useful building without returning to generic industrial architecture.", "Python's readable syntax, flexible ecosystem, automation, and cultural identity.", ["synthesis", "python-identity", "ecosystem"])
    ]
  },
  {
    profileId: "skill/java@v1",
    folder: "skill-java-r2",
    name: "Java",
    category: "skill",
    referenceAsset: "design/career-world/concept-tournaments/skill-java-r1/skill-java-r1-09-compact-primitive.png",
    selectedR1: "Compact Primitive",
    domainSummary: "A statically typed language and platform compiled to portable class-file bytecode for the Java Virtual Machine, with class loading, verification, linking, managed runtime data areas, threads, garbage collection, modules, and a deep standard ecosystem.",
    evidenceBoundary: "Use the R1 compact square base only as a scale reference. The R2 plan must expose JVM-specific layers and runtime mechanics. A cup-shaped court and three steam-like roof vents may serve as a restrained Java cultural easter egg, but do not reproduce the Java logo, wordmark, or literal coffee cup sculpture.",
    researchSources: [
      { title: "Java Virtual Machine Specification", url: "https://docs.oracle.com/en/java/javase/26/docs/specs/jvms/index.html", use: "Class files, bytecode, runtime data areas, verification, loading, linking, modules, and execution." },
      { title: "JLS Execution", url: "https://docs.oracle.com/en/java/javase/26/docs/specs/jls/jls-12.html", use: "Class loading, linking, initialization, execution, and program lifecycle." }
    ],
    concepts: [
      concept("jvm-layered-keep", "JVM Layered Keep", "Stack clearly different source intake, class-file archive, bytecode execution, and runtime service levels on one hardware-neutral base. Use a compact strong silhouette and expose the transitions between levels through visible verifier and linker gates.", "Portable bytecode executed by the Java Virtual Machine.", ["jvm", "bytecode", "layers"]),
      concept("class-loader-gatehouse", "Class Loader Gatehouse", "Make loading, verification, preparation, resolution, and initialization a sequence of connected gatehouses leading into the runtime keep. Give the bootstrap loader a foundational lower gate and custom loaders smaller side gates.", "The class loading and linking lifecycle.", ["class-loader", "linking", "initialization"]),
      concept("bytecode-verifier-court", "Bytecode Verifier Court", "Place a guarded verification court between the class-file archive and execution hall. Use type-shape gauges, stack-height thresholds, and controlled branches as architectural mechanisms, never text or code.", "Bytecode verification before execution.", ["verifier", "type-safety", "bytecode"]),
      concept("thread-stack-rotunda", "Thread Stack Rotunda", "Arrange many narrow per-thread stack towers around one large shared heap court and one method-area archive. Give each tower its own small program-counter lantern while shared services remain central.", "Per-thread stacks and program counters around shared JVM runtime areas.", ["threads", "stacks", "heap"]),
      concept("generational-collector-foundry", "Generational Collector Foundry", "Build a young allocation courtyard, an aging transfer terrace, and an old-generation archive connected by reclamation cranes and compacting rails. Make recovered space visibly return to the allocation side.", "Managed memory and generational garbage collection.", ["garbage-collection", "generations", "compaction"]),
      concept("write-once-bridgeworks", "Write-Once Bridgeworks", "Set one class-file hall on an elevated neutral platform that connects through standardized bridges to several visibly different underlying machine foundations. Keep the upper runtime unchanged across every foundation.", "Hardware and operating-system-independent class-file execution.", ["portability", "class-file", "platforms"]),
      concept("virtual-thread-hive", "Virtual Thread Hive", "Create a dense field of tiny lightweight thread cells scheduled through a smaller carrier gallery inside the JVM keep. Preserve a shared heap and make blocking cells park in side alcoves without freezing the whole structure.", "Large-scale concurrency through lightweight virtual threads.", ["virtual-threads", "scheduler", "concurrency"]),
      concept("module-layer-citadel", "Module Layer Citadel", "Build a stack of strongly bounded module terraces with explicit exports, concealed internals, and narrow readable dependency bridges. Place the module graph around the runtime rather than as detached boxes.", "Java modules, layers, encapsulation, and reliable composition.", ["modules", "encapsulation", "layers"]),
      concept("steam-court-easter-egg", "Steam Court Easter Egg", "Carve a rounded cup-like negative-space court into the compact square building and place three slender curved ventilation stacks behind it so their wireframe exhaust paths resemble steam. Keep all forms functional and architectural rather than sculptural.", "A restrained coffee-culture easter egg within JVM architecture.", ["coffee", "steam", "easter-egg"]),
      concept("java-platform-synthesis", "Java Platform Synthesis", "Combine a compact JVM keep, class-loader sequence, verifier court, thread-stack towers, shared heap, collector terraces, module boundaries, portable base bridges, and the subtle steam-court easter egg. Keep the platform depth readable without becoming a city.", "Java as both a language and a managed portable runtime platform.", ["synthesis", "java-identity", "jvm"])
    ]
  },
  {
    profileId: "skill/csharp@v1",
    folder: "skill-csharp-r2",
    name: "C#",
    category: "skill",
    referenceAsset: "design/career-world/concept-tournaments/skill-csharp-r1/skill-csharp-r1-07-verified-core.png",
    selectedR1: "Verified Core",
    domainSummary: "A modern statically typed language on .NET with a common type system, managed runtime, generics, delegates and events, LINQ, asynchronous Task-based programming, value and reference types, and cross-language runtime integration.",
    evidenceBoundary: "Keep the selected protected-core idea, but the generic faceted vault is not enough. Use four crossing structural strokes, sharp facets, managed-runtime boundaries, delegate fan-out, async suspension bridges, and boxed nested courts as language-specific architecture. Never display a literal C# wordmark or exact logo.",
    researchSources: [
      { title: "Common Type System", url: "https://learn.microsoft.com/en-us/dotnet/standard/base-types/common-type-system", use: "Value and reference types, type safety, runtime management, and cross-language integration." },
      { title: "Delegates", url: "https://learn.microsoft.com/en-us/dotnet/csharp/delegate-class", use: "Type-safe method references and multicast invocation." },
      { title: "Async", url: "https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/async", use: "Task-based asynchronous execution and awaitable coordination." }
    ],
    concepts: [
      concept("sharp-grid-foundry", "Sharp Grid Foundry", "Organize four heavy crossing structural strokes over a compact managed-runtime court so the roof plan quietly suggests a hash without drawing a symbol. Use sharp bevels and consistent right-angle joints as the main silhouette.", "A restrained C-sharp cultural cue expressed as structure.", ["sharp-grid", "hash-plan", "easter-egg"]),
      concept("common-type-rotunda", "Common Type Rotunda", "Build twin value-type and reference-type wings around one common type-system rotunda. Give the value side compact embedded cells and the reference side linked address galleries, while both share identical runtime gates.", "The .NET common type system and value/reference distinction.", ["common-type-system", "value-types", "reference-types"]),
      concept("managed-runtime-vault", "Managed Runtime Vault", "Retain a protected central chamber but expose the services around it: allocation, type safety, exception handling, metadata, and managed execution galleries. Make the boundary protective without resembling a bunker.", "Managed execution and runtime services in .NET.", ["clr", "managed-runtime", "type-safety"]),
      concept("async-await-relay", "Async/Await Relay", "Create several Task bridges that depart the main execution hall, pause at suspended waiting platforms, and rejoin through continuation gates when ready. Other routes must remain active while one bridge waits.", "Task-based asynchronous control flow and continuations.", ["async", "await", "tasks"]),
      concept("multicast-delegate-hall", "Multicast Delegate Hall", "Place one type-safe invocation chamber at the center and fan it through a verified signature gate to several receiver bays arranged in order. Show add and remove side gates and one compact invocation list gallery.", "Delegates, events, and multicast invocation.", ["delegates", "events", "multicast"]),
      concept("linq-pipeline", "LINQ Pipeline", "Build a clean composable query promenade through filter, map, group, and projection halls, all operating over one typed collection court. Keep the path modular and readable without arrows or textual operators.", "Composable language-integrated queries over typed data.", ["linq", "queries", "composition"]),
      concept("generic-constraint-forge", "Generic Constraint Forge", "Create interchangeable type modules that enter a common processing frame only when they fit explicit structural constraint gates. Make covariance and contravariance visible through paired directional balcony connections.", "Generics, constraints, and reusable type-safe composition.", ["generics", "constraints", "variance"]),
      concept("event-mesh-pavilion", "Event Mesh Pavilion", "Arrange publisher towers and subscriber halls around a protected event court. Connections may be added or removed at explicit registration gates, but publishers never enter subscriber interiors directly.", "Events and decoupled notification patterns.", ["events", "publish-subscribe", "decoupling"]),
      concept("boxing-court", "Boxing and Unboxing Court", "Place a compact value chamber inside a larger reference shell connected by controlled boxing and unboxing thresholds. Echo the nested geometry across the roof while keeping the outer protected-core silhouette.", "The value/reference boundary and boxing behavior.", ["boxing", "unboxing", "nested-shells"]),
      concept("csharp-runtime-synthesis", "C# Runtime Synthesis", "Combine the protected managed-runtime core, subtle four-stroke sharp grid, common type wings, async continuation bridges, multicast delegate fan-out, LINQ promenade, and nested boxing court. Keep one dominant silhouette and subordinate the easter eggs.", "C# and .NET as a typed, managed, asynchronous application platform.", ["synthesis", "csharp-identity", "dotnet"])
    ]
  },
  {
    profileId: "skill/typescript@v1",
    folder: "skill-typescript-r2",
    name: "TypeScript",
    category: "skill",
    referenceAsset: "design/career-world/concept-tournaments/skill-typescript-r1/skill-typescript-r1-07-verified-core.png",
    selectedR1: "Verified Core",
    domainSummary: "A typed superset of JavaScript that performs static checking before execution, models JavaScript through structural typing and inference, supports strictness as an incremental spectrum, and erases types while preserving JavaScript runtime behavior.",
    evidenceBoundary: "Retain the selected verified-core hierarchy only where it helps. The building must visibly distinguish a runtime core from its compile-time structural frame. Use compatible shape gates, strictness thresholds, union and intersection bridges, inference scaffolds, and a subtle T/S-like plan only as architectural easter eggs. Do not display the TypeScript logo or literal letters.",
    researchSources: [
      { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro", use: "Static checking for JavaScript programs and the language's scope." },
      { title: "Type Compatibility", url: "https://www.typescriptlang.org/docs/handbook/type-compatibility", use: "Structural typing based on members rather than nominal declarations." },
      { title: "TypeScript for New Programmers", url: "https://www.typescriptlang.org/docs/handbook/typescript-from-scratch", use: "Typed JavaScript superset, pre-runtime checking, type erasure, and preserved runtime behavior." }
    ],
    concepts: [
      concept("typed-superset-frame", "Typed Superset Frame", "Place a practical runtime building inside a larger precise compile-time wireframe that adds structural members without replacing the inner geometry. At the exit, the outer checking scaffold ends while the runtime building continues unchanged.", "TypeScript adds static checking around JavaScript and erases types before runtime.", ["typed-superset", "type-erasure", "runtime"]),
      concept("structural-compatibility-court", "Structural Compatibility Court", "Build several architecturally different modules that can pass through the same target gate because they contain the required matching beams and ports. Extra members are allowed to remain, making shape compatibility visible without labels.", "Structural subtyping based on compatible members.", ["structural-typing", "compatibility", "shape"]),
      concept("strictness-gates", "Strictness Gates", "Arrange an incremental sequence from an open JavaScript yard through inference screens, checked corridors, and a final strict protected core. Each threshold adds more verification structure without changing the underlying runtime path.", "Incremental adoption from JavaScript checking to strict TypeScript.", ["strictness", "incremental", "validation"]),
      concept("inference-observatory", "Inference Observatory", "Feed unlabeled but visibly shaped payload modules into a faceted observatory that constructs a matching type scaffold around them. Use clean geometric outlines and a small error quarantine court for incompatible shapes.", "Type inference and early error detection.", ["inference", "type-checker", "errors"]),
      concept("compiler-erasure-foundry", "Compiler Erasure Foundry", "Create a two-stage building: a dense typed inspection hall with temporary scaffolds, followed by a clean runtime hall whose behavior route is identical but whose type structures have been removed and recycled.", "Compile-time types disappear while JavaScript runtime behavior is preserved.", ["compiler", "type-erasure", "javascript"]),
      concept("union-intersection-bridgeworks", "Union and Intersection Bridgeworks", "Use one forked union approach where either compatible bridge reaches the core, and one intersection approach where two structural requirements overlap before entry. Keep the routes buildable and visually distinct without symbols.", "Union and intersection types as composable shape relationships.", ["union", "intersection", "composition"]),
      concept("interface-colonnade", "Interface Colonnade", "Build a reusable open structural template of required columns, beams, and apertures. Several concrete halls of different style align to that template without inheriting its decoration, emphasizing declared shape rather than lineage.", "Interfaces describing structural contracts.", ["interfaces", "contracts", "structural-shape"]),
      concept("generic-constraint-tower", "Generic Constraint Tower", "Route interchangeable type modules through a tall generic frame whose adjustable floors accept variation but whose constraint braces enforce a minimum compatible shape. Preserve the selected vertical R1 hierarchy with more technical purpose.", "Generics and constraints over structurally typed values.", ["generics", "constraints", "tower"]),
      concept("ts-plan-easter-egg", "Typed Script Plan Easter Egg", "Arrange one strong crossbar gallery above a winding two-turn service path so the overall plan quietly suggests a T nested beside an S-like curve without forming literal letters. Surround it with structural compatibility gates and a compile-time frame.", "A restrained TypeScript identity cue embedded in functional plan geometry.", ["ts-plan", "easter-egg", "identity"]),
      concept("typescript-synthesis", "TypeScript Synthesis", "Combine the runtime core inside a typed superset scaffold, structural compatibility court, incremental strictness gates, inference observatory, union/intersection bridgework, generic constraint tower, and a subtle T/S-like plan. Keep compile-time and runtime layers immediately distinguishable.", "TypeScript's structural static checking wrapped around JavaScript runtime behavior.", ["synthesis", "typescript-identity", "types"])
    ]
  }
];

function buildPrompt(target, item, index) {
  const scaleContract = target.category === "city" ? cityScaleContract : skillScaleContract;
  const referenceInstruction = target.referenceAsset
    ? `Use the supplied R1 winner only as a structural and world-style reference. Preserve the useful hierarchy described below, but make a materially new R2 design rather than a cosmetic overlay. R1 selection: ${target.selectedR1}.`
    : "Generate a fresh design with no raster reference. This is a clean replacement, not an iteration of the discarded R1 building.";

  return [
    `Use case: stylized-concept`,
    `Asset type: Career World ${target.category === "city" ? "employer city capital" : "skill building"} tournament concept`,
    `Primary request: Create R2 concept ${index + 1} of 10 for ${target.name}: ${item.name}.`,
    referenceInstruction,
    `Research-grounded identity: ${target.domainSummary}`,
    `Concept direction: ${item.direction}`,
    `Intent: ${item.businessCue}`,
    `Evidence and identity boundary: ${target.evidenceBoundary}`,
    scaleContract,
    sharedVisualContract
  ].join("\n\n");
}

for (const target of targets) {
  if (target.concepts.length !== 10) throw new Error(`${target.profileId} must define exactly 10 concepts`);
  const folderPath = path.join(tournamentRoot, target.folder);
  await fs.mkdir(folderPath, { recursive: true });

  const assets = target.concepts.map((item, index) => {
    const ordinal = String(index + 1).padStart(2, "0");
    const id = `${target.folder}-${ordinal}-${item.slug}`;
    return {
      id,
      name: `${target.name} · ${item.name}`,
      src: `${id}.png`,
      role: index === 9 ? "synthesis" : "directed-exploration",
      controlledVariable: item.direction,
      parentConcept: target.selectedR1,
      tags: [target.category, "round-2", ...item.tags],
      thesis: item.businessCue,
      businessCue: item.businessCue
    };
  });

  const manifest = {
    schemaVersion: 1,
    id: `${target.folder}-2026-07-18`,
    catalogId: target.profileId,
    name: `${target.name} · Round 2`,
    sourcePath: `design/career-world/concept-tournaments/${target.folder}`,
    domainSummary: target.domainSummary,
    evidenceBoundary: target.evidenceBoundary,
    iterationBasis: {
      telemetryExport: "career-world-tournament-batch-2026-07-18 (1).json",
      selectedR1: target.selectedR1,
      strategy: target.referenceAsset ? "preserve selected structural DNA and add visible domain identity" : "full replacement"
    },
    researchSources: target.researchSources,
    assets
  };

  const prompts = assets.map((asset, index) => ({
    ordinal: index + 1,
    assetId: asset.id,
    output: asset.src,
    concept: target.concepts[index].name,
    intent: target.concepts[index].businessCue,
    referenceAsset: target.referenceAsset,
    prompt: buildPrompt(target, target.concepts[index], index)
  }));

  const rows = prompts.map(prompt => `| ${String(prompt.ordinal).padStart(2, "0")} | ${prompt.concept} | ${prompt.intent} |`).join("\n");
  const sources = target.researchSources.map(source => `- [${source.title}](${source.url}) — ${source.use}`).join("\n");
  const markdown = `# ${target.name} · Round 2\n\n## Iteration basis\n\n- R1 telemetry selection: ${target.selectedR1}\n- Strategy: ${manifest.iterationBasis.strategy}\n- User correction: visible company, protocol, or language personality must be carried by the architecture itself\n- Generator: built-in OpenAI image generation\n- Reference mode: ${target.referenceAsset ? `edit/derive from \`${target.referenceAsset}\`` : "fresh generation"}\n- Output: one 1536 × 1024 exact-grayscale PNG per concept\n- Projection: orthographic 2.5D isometric, approximately 225° azimuth and 35.264° elevation\n\n## Research basis\n\n${target.domainSummary}\n\n${sources}\n\n## Evidence boundary\n\n${target.evidenceBoundary}\n\n## Concept hypotheses\n\n| # | Concept | Visible intent |\n|---:|---|---|\n${rows}\n\n## Tournament route\n\n\`concept-tournament.html?set=concept-tournaments/${target.folder}/tournament-set.js\`\n`;

  const manifestScript = `window.__CONCEPT_TOURNAMENT_SET__ = ${JSON.stringify(manifest, null, 2)};\n`;
  await Promise.all([
    fs.writeFile(path.join(folderPath, "tournament-set.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(folderPath, "tournament-set.js"), manifestScript, "utf8"),
    fs.writeFile(path.join(folderPath, "prompt-set.json"), `${JSON.stringify({ schemaVersion: 1, profileId: target.profileId, round: 2, prompts }, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(folderPath, "concept-set.md"), markdown, "utf8")
  ]);
  console.log(`${target.profileId} -> ${path.relative(repoRoot, folderPath)}`);
}

