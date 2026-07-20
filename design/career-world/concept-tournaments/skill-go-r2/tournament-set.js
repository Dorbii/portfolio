window.__CONCEPT_TOURNAMENT_SET__ = {
  "schemaVersion": 1,
  "id": "skill-go-r2-2026-07-18",
  "catalogId": "skill/go@v1",
  "name": "Go · Round 2",
  "sourcePath": "design/career-world/concept-tournaments/skill-go-r2",
  "domainSummary": "A compiled language centered on readable convention, simple package composition, explicit errors, lightweight goroutines, channel-based communication, interfaces, a multiplexing runtime scheduler, and fast practical tooling.",
  "evidenceBoundary": "This is a clean redesign; do not preserve the generic R1 warehouse. Avoid a literal Go wordmark or exact Go gopher reproduction. Rounded burrow forms, paired eye-like roof vents, incisor-like entry blocks, and playful practical proportions may act as restrained cultural easter eggs. Concurrency must be visible as many lightweight work cells communicating through explicit channels rather than as arbitrary pipes.",
  "iterationBasis": {
    "telemetryExport": "career-world-tournament-batch-2026-07-18 (1).json",
    "selectedR1": "Discarded — full rework",
    "strategy": "full replacement"
  },
  "researchSources": [
    {
      "title": "Effective Go",
      "url": "https://go.dev/doc/effective_go",
      "use": "Goroutines, channels, share-by-communicating, interfaces, errors, defer, and clear idioms."
    },
    {
      "title": "The Go Gopher",
      "url": "https://go.dev/blog/gopher",
      "use": "The gopher as the project's distinctive approachable mascot and cultural identity."
    },
    {
      "title": "Go Brand Book",
      "url": "https://go.dev/blog/go-brand/Go-brand-book-v1.0.pdf",
      "use": "Practical, approachable, flexible brand character and responsible mascot use."
    }
  ],
  "assets": [
    {
      "id": "skill-go-r2-01-goroutine-weave",
      "name": "Go · Goroutine Weave",
      "src": "skill-go-r2-01-goroutine-weave.png",
      "role": "directed-exploration",
      "controlledVariable": "Create dozens of small rounded lightweight work pods suspended on two broad structural rails. Each pod can operate independently, while narrow channel bridges carry work between pods. A compact scheduler loft above the weave assigns pods to a much smaller number of heavy runner beams.",
      "parentConcept": "Discarded — full rework",
      "tags": [
        "skill",
        "round-2",
        "goroutines",
        "scheduler",
        "lightweight"
      ],
      "thesis": "Lightweight goroutines multiplexed by the runtime.",
      "businessCue": "Lightweight goroutines multiplexed by the runtime."
    },
    {
      "id": "skill-go-r2-02-channel-aqueduct",
      "name": "Go · Channel Aqueduct",
      "src": "skill-go-r2-02-channel-aqueduct.png",
      "role": "directed-exploration",
      "controlledVariable": "Build separate workshop pavilions with no shared interior. Connect them only through explicit open-topped channel aqueducts, including one unbuffered rendezvous gate and one buffered holding reservoir. Make communication itself the synchronization mechanism.",
      "parentConcept": "Discarded — full rework",
      "tags": [
        "skill",
        "round-2",
        "channels",
        "buffering",
        "synchronization"
      ],
      "thesis": "Share memory by communicating through channels.",
      "businessCue": "Share memory by communicating through channels."
    },
    {
      "id": "skill-go-r2-03-csp-courtyard",
      "name": "Go · CSP Courtyard",
      "src": "skill-go-r2-03-csp-courtyard.png",
      "role": "directed-exploration",
      "controlledVariable": "Arrange independent sequential workhouses around a central transfer court. Each house owns its own compact storage and can exchange sealed payloads only at paired handoff gates around the court. Keep the plan clear, modest, and highly buildable.",
      "parentConcept": "Discarded — full rework",
      "tags": [
        "skill",
        "round-2",
        "csp",
        "message-passing",
        "ownership"
      ],
      "thesis": "Communicating sequential processes and ownership through message passing.",
      "businessCue": "Communicating sequential processes and ownership through message passing."
    },
    {
      "id": "skill-go-r2-04-scheduler-loom",
      "name": "Go · Scheduler Loom",
      "src": "skill-go-r2-04-scheduler-loom.png",
      "role": "directed-exploration",
      "controlledVariable": "Make the runtime scheduler a visible loom: many thin goroutine threads descend from stacked task racks and are woven onto a few robust machine rails, with blocked tasks peeling into waiting galleries while other threads continue.",
      "parentConcept": "Discarded — full rework",
      "tags": [
        "skill",
        "round-2",
        "m-n-scheduler",
        "blocking",
        "multiplexing"
      ],
      "thesis": "Many goroutines multiplexed over fewer operating-system threads.",
      "businessCue": "Many goroutines multiplexed over fewer operating-system threads."
    },
    {
      "id": "skill-go-r2-05-defer-stack-workshop",
      "name": "Go · Defer Stack Workshop",
      "src": "skill-go-r2-05-defer-stack-workshop.png",
      "role": "directed-exploration",
      "controlledVariable": "Use a compact vertical workshop with service platforms stacked in call order. On the return side, cleanup bridges descend in the exact reverse order toward the exit. Include small explicit resource-return gates and no ornamental machinery.",
      "parentConcept": "Discarded — full rework",
      "tags": [
        "skill",
        "round-2",
        "defer",
        "cleanup",
        "stack"
      ],
      "thesis": "Deferred cleanup executed reliably in last-in-first-out order.",
      "businessCue": "Deferred cleanup executed reliably in last-in-first-out order."
    },
    {
      "id": "skill-go-r2-06-interface-dockyard",
      "name": "Go · Interface Dockyard",
      "src": "skill-go-r2-06-interface-dockyard.png",
      "role": "directed-exploration",
      "controlledVariable": "Create several different modules that can dock to the same tiny behavior gate because their structural contact shapes match, without inheritance towers or family crests. Keep the shared interface intentionally minimal and the concrete modules visibly diverse.",
      "parentConcept": "Discarded — full rework",
      "tags": [
        "skill",
        "round-2",
        "interfaces",
        "composition",
        "shape-compatibility"
      ],
      "thesis": "Implicit interface satisfaction through behavior and composition.",
      "businessCue": "Implicit interface satisfaction through behavior and composition."
    },
    {
      "id": "skill-go-r2-07-explicit-error-gate",
      "name": "Go · Explicit Error Gate",
      "src": "skill-go-r2-07-explicit-error-gate.png",
      "role": "directed-exploration",
      "controlledVariable": "Split every processing bay into a plain success exit and an equally visible error-return lane. Route errors back through a central inspection gate instead of hiding them below the building. The architecture should feel honest, direct, and mechanically simple.",
      "parentConcept": "Discarded — full rework",
      "tags": [
        "skill",
        "round-2",
        "errors",
        "explicit-control",
        "simplicity"
      ],
      "thesis": "Explicit error values and straightforward control flow.",
      "businessCue": "Explicit error values and straightforward control flow."
    },
    {
      "id": "skill-go-r2-08-fast-compile-foundry",
      "name": "Go · Fast Compile Foundry",
      "src": "skill-go-r2-08-fast-compile-foundry.png",
      "role": "directed-exploration",
      "controlledVariable": "Feed a row of small package workshops into one compact compiler press and emit a single self-contained deployment block at the opposite end. Use direct short paths, little ornament, and a strong before-to-after silhouette without arrows or text.",
      "parentConcept": "Discarded — full rework",
      "tags": [
        "skill",
        "round-2",
        "compiler",
        "packages",
        "binary"
      ],
      "thesis": "Fast compilation and practical self-contained binaries.",
      "businessCue": "Fast compilation and practical self-contained binaries."
    },
    {
      "id": "skill-go-r2-09-gopher-burrow-easter-egg",
      "name": "Go · Gopher Burrow Easter Egg",
      "src": "skill-go-r2-09-gopher-burrow-easter-egg.png",
      "role": "directed-exploration",
      "controlledVariable": "Create an approachable low rounded technical burrow with two eye-like roof lanterns, two broad incisor-like entry piers, small ear-like vents, and channel tunnels branching to concurrent work cells. Keep the reference abstract enough that it reads as architecture first, not a mascot sculpture.",
      "parentConcept": "Discarded — full rework",
      "tags": [
        "skill",
        "round-2",
        "gopher",
        "burrow",
        "easter-egg"
      ],
      "thesis": "A restrained cultural easter egg for Go's approachable gopher identity.",
      "businessCue": "A restrained cultural easter egg for Go's approachable gopher identity."
    },
    {
      "id": "skill-go-r2-10-go-concurrency-synthesis",
      "name": "Go · Go Concurrency Synthesis",
      "src": "skill-go-r2-10-go-concurrency-synthesis.png",
      "role": "synthesis",
      "controlledVariable": "Combine a rounded practical foundry, many lightweight goroutine pods, explicit channel aqueducts, a compact scheduler loom, a visible error-return lane, and subtle gopher-like roof details. The final silhouette must remain simple, readable, and less ornate than the other language buildings.",
      "parentConcept": "Discarded — full rework",
      "tags": [
        "skill",
        "round-2",
        "synthesis",
        "go-identity",
        "concurrency"
      ],
      "thesis": "Go's concurrency, clarity, and approachable engineering culture in one coherent building.",
      "businessCue": "Go's concurrency, clarity, and approachable engineering culture in one coherent building."
    }
  ]
};
