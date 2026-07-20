window.__CONCEPT_TOURNAMENT_SET__ = {
  "schemaVersion": 1,
  "id": "skill-mcp-r2-2026-07-18",
  "catalogId": "skill/mcp@v1",
  "name": "MCP · Round 2",
  "sourcePath": "design/career-world/concept-tournaments/skill-mcp-r2",
  "domainSummary": "A stateful JSON-RPC client-host-server protocol for context exchange. A host creates one isolated client per server; participants negotiate capabilities and lifecycle; servers expose tools, resources, and prompts; and the same data layer can operate over local stdio or remote Streamable HTTP transports.",
  "evidenceBoundary": "Keep the R1 winner's dense technical construction and multiple service docks, but replace the generic loading-depot reading with explicit protocol architecture. Do not draw chat screens, literal source code, plug icons, detached network diagrams, or an AI brain. Express protocol participants, primitives, state, negotiation, transports, requests, responses, and notifications through buildable chambers, gates, tracks, and conduits.",
  "iterationBasis": {
    "telemetryExport": "career-world-tournament-batch-2026-07-18 (1).json",
    "selectedR1": "Scale Engine",
    "strategy": "preserve selected structural DNA and add visible domain identity"
  },
  "researchSources": [
    {
      "title": "MCP Architecture Overview",
      "url": "https://modelcontextprotocol.io/docs/learn/architecture",
      "use": "Hosts, dedicated clients, servers, data and transport layers, lifecycle, primitives, and notifications."
    },
    {
      "title": "MCP Specification Architecture",
      "url": "https://modelcontextprotocol.io/specification/2025-06-18/architecture",
      "use": "Stateful sessions, security boundaries, 1:1 client-server relationships, and capability negotiation."
    },
    {
      "title": "MCP Transports",
      "url": "https://modelcontextprotocol.io/specification/2025-06-18/basic/transports",
      "use": "Local stdio and remote Streamable HTTP transport mechanics."
    }
  ],
  "assets": [
    {
      "id": "skill-mcp-r2-01-host-client-server-exchange",
      "name": "MCP · Host–Client–Server Exchange",
      "src": "skill-mcp-r2-01-host-client-server-exchange.png",
      "role": "directed-exploration",
      "controlledVariable": "Build one elevated host chamber that manages four separate client lockhouses, each with exactly one physically isolated bridge to its own specialized server dock. No server may connect directly to another server, and the host must not connect directly to a server without its client chamber.",
      "parentConcept": "Scale Engine",
      "tags": [
        "skill",
        "round-2",
        "host",
        "clients",
        "servers",
        "isolation"
      ],
      "thesis": "One host coordinating multiple isolated 1:1 client-server sessions.",
      "businessCue": "One host coordinating multiple isolated 1:1 client-server sessions."
    },
    {
      "id": "skill-mcp-r2-02-capability-handshake-lock",
      "name": "MCP · Capability Handshake Lock",
      "src": "skill-mcp-r2-02-capability-handshake-lock.png",
      "role": "directed-exploration",
      "controlledVariable": "Make an interlocking negotiation mechanism the center: two unequal gate drums present different structural teeth and only shared teeth align to open the session chamber. Surround it with a clear initialize, operate, and terminate circulation sequence.",
      "parentConcept": "Scale Engine",
      "tags": [
        "skill",
        "round-2",
        "capability-negotiation",
        "handshake",
        "lifecycle"
      ],
      "thesis": "Capability negotiation and lifecycle before protocol features become available.",
      "businessCue": "Capability negotiation and lifecycle before protocol features become available."
    },
    {
      "id": "skill-mcp-r2-03-three-primitive-foundry",
      "name": "MCP · Three-Primitive Foundry",
      "src": "skill-mcp-r2-03-three-primitive-foundry.png",
      "role": "directed-exploration",
      "controlledVariable": "Create three unmistakably different but connected server docks around one client core: a guarded action workshop for tools, a deep indexed archive for resources, and a reusable pattern theater for prompts. Give each dock a discovery vestibule before its main function.",
      "parentConcept": "Scale Engine",
      "tags": [
        "skill",
        "round-2",
        "tools",
        "resources",
        "prompts",
        "discovery"
      ],
      "thesis": "Tools, resources, and prompts as distinct discoverable server primitives.",
      "businessCue": "Tools, resources, and prompts as distinct discoverable server primitives."
    },
    {
      "id": "skill-mcp-r2-04-json-rpc-switchyard",
      "name": "MCP · JSON-RPC Switchyard",
      "src": "skill-mcp-r2-04-json-rpc-switchyard.png",
      "role": "directed-exploration",
      "controlledVariable": "Turn request and response correlation into a mechanical switchyard: paired bidirectional tracks pass through numbered-shape sockets without displaying numbers, while a thinner notification bypass moves one-way around the response hall. Keep every route connected to one stateful session core.",
      "parentConcept": "Scale Engine",
      "tags": [
        "skill",
        "round-2",
        "json-rpc",
        "request-response",
        "notifications"
      ],
      "thesis": "JSON-RPC requests, responses, notifications, and correlation.",
      "businessCue": "JSON-RPC requests, responses, notifications, and correlation."
    },
    {
      "id": "skill-mcp-r2-05-dual-transport-engine",
      "name": "MCP · Dual Transport Engine",
      "src": "skill-mcp-r2-05-dual-transport-engine.png",
      "role": "directed-exploration",
      "controlledVariable": "Build a common inner protocol chamber carried by two visibly different outer transport systems: one short direct twin-pipe conduit for local stdio and one longer gated streaming aqueduct with resumable segments for remote HTTP. The inner data-layer geometry must remain identical across both.",
      "parentConcept": "Scale Engine",
      "tags": [
        "skill",
        "round-2",
        "stdio",
        "streamable-http",
        "data-layer",
        "transport-layer"
      ],
      "thesis": "One data protocol operating over local and remote transports.",
      "businessCue": "One data protocol operating over local and remote transports."
    },
    {
      "id": "skill-mcp-r2-06-lifecycle-observatory",
      "name": "MCP · Lifecycle Observatory",
      "src": "skill-mcp-r2-06-lifecycle-observatory.png",
      "role": "directed-exploration",
      "controlledVariable": "Organize the structure through three concentric thresholds: an identity and version vestibule, an active session operations court, and an orderly termination/recovery gate. Place progress and update notification beacons around the active ring.",
      "parentConcept": "Scale Engine",
      "tags": [
        "skill",
        "round-2",
        "lifecycle",
        "version-negotiation",
        "progress"
      ],
      "thesis": "Initialization, active operation, progress, updates, and termination.",
      "businessCue": "Initialization, active operation, progress, updates, and termination."
    },
    {
      "id": "skill-mcp-r2-07-session-multiplexer",
      "name": "MCP · Session Multiplexer",
      "src": "skill-mcp-r2-07-session-multiplexer.png",
      "role": "directed-exploration",
      "controlledVariable": "Use the R1 scale-engine density to create one host spine with many narrow client cells, each branching to exactly one unequal server annex. Make isolation walls explicit while shared host circulation runs above them, revealing coordination without collapsing boundaries.",
      "parentConcept": "Scale Engine",
      "tags": [
        "skill",
        "round-2",
        "sessions",
        "multiplexing",
        "security-boundaries"
      ],
      "thesis": "Many dedicated sessions managed by one host without server cross-contamination.",
      "businessCue": "Many dedicated sessions managed by one host without server cross-contamination."
    },
    {
      "id": "skill-mcp-r2-08-consent-boundary-vault",
      "name": "MCP · Consent Boundary Vault",
      "src": "skill-mcp-r2-08-consent-boundary-vault.png",
      "role": "directed-exploration",
      "controlledVariable": "Place user authorization and host security policy at the only gate between a server action dock and the host core. Use nested permission thresholds, a visible stop gate, and sealed context vaults so powerful tools do not read as automatically trusted.",
      "parentConcept": "Scale Engine",
      "tags": [
        "skill",
        "round-2",
        "consent",
        "authorization",
        "tool-safety"
      ],
      "thesis": "Consent, authorization, and security boundaries around server capabilities.",
      "businessCue": "Consent, authorization, and security boundaries around server capabilities."
    },
    {
      "id": "skill-mcp-r2-09-dynamic-discovery-archive",
      "name": "MCP · Dynamic Discovery Archive",
      "src": "skill-mcp-r2-09-dynamic-discovery-archive.png",
      "role": "directed-exploration",
      "controlledVariable": "Build modular primitive shelves that can be added, removed, or reconfigured around a discovery hall. A restrained change-notification beacon should update the client gallery without rebuilding the whole structure. Preserve a strong technical silhouette rather than a warehouse.",
      "parentConcept": "Scale Engine",
      "tags": [
        "skill",
        "round-2",
        "dynamic-discovery",
        "list-changed",
        "extensibility"
      ],
      "thesis": "Dynamic discovery and list-changed notifications.",
      "businessCue": "Dynamic discovery and list-changed notifications."
    },
    {
      "id": "skill-mcp-r2-10-protocol-synthesis",
      "name": "MCP · Protocol Synthesis",
      "src": "skill-mcp-r2-10-protocol-synthesis.png",
      "role": "synthesis",
      "controlledVariable": "Combine a host tower, isolated 1:1 client lockhouses, specialized tool/resource/prompt docks, a capability-handshake core, paired request/response tracks, a notification bypass, and dual stdio/HTTP transport shells. Prioritize legible layers and negative space over raw density.",
      "parentConcept": "Scale Engine",
      "tags": [
        "skill",
        "round-2",
        "synthesis",
        "mcp-architecture",
        "technical-depth"
      ],
      "thesis": "A technically faithful MCP building whose architecture communicates the protocol before its label does.",
      "businessCue": "A technically faithful MCP building whose architecture communicates the protocol before its label does."
    }
  ]
};
