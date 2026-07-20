window.__CONCEPT_TOURNAMENT_SET__ = {
  "schemaVersion": 1,
  "id": "skill-safe-writes-r1-2026-07-18",
  "name": "Safe writes · Round 1",
  "sourcePath": "design/career-world/concept-tournaments/skill-safe-writes-r1",
  "domainSummary": "A mutation-safety capability that validates intent and authority before a write, uses idempotency or replay protection, commits atomically where possible, records durable audit evidence, and preserves explicit rollback or recovery paths on failure.",
  "evidenceBoundary": "Do not render locks, shields, checkmarks, text, or security icons. Make staged commitment, traceability, and rollback architectural; keep the rollback vault visibly connected.",
  "researchSources": [
    {
      "title": "Project walkthrough: Kaizen Agent Platform",
      "path": "docs/project-walkthrough-draft.md",
      "use": "Repository-backed guarded writes, authority, replay safety, correlation, audit, and failure handling."
    }
  ],
  "assets": [
    {
      "id": "skill-safe-writes-r1-01-canonical-instrument",
      "name": "Safe writes · Canonical Instrument",
      "src": "skill-safe-writes-r1-01-canonical-instrument.png",
      "role": "broad-concept",
      "controlledVariable": "refine the accepted baseline into a precise compact technical instrument building; emphasize pre-write validation gate",
      "parentConcept": "Safe writes research profile",
      "tags": [
        "skill",
        "canonical-instrument",
        "pre-write-validation-gate",
        "safe-writes",
        "mutation",
        "recovery"
      ],
      "thesis": "The accepted skill identity is tested in its clearest production form. This version emphasizes pre-write validation gate.",
      "businessCue": "pre-write validation gate"
    },
    {
      "id": "skill-safe-writes-r1-02-core-mechanism",
      "name": "Safe writes · Core Mechanism",
      "src": "skill-safe-writes-r1-02-core-mechanism.png",
      "role": "broad-concept",
      "controlledVariable": "make the skill's defining mechanism the central architectural mass; emphasize authority and intent confirmation",
      "parentConcept": "Safe writes research profile",
      "tags": [
        "skill",
        "core-mechanism",
        "authority-and-intent-confirmation",
        "safe-writes",
        "mutation",
        "recovery"
      ],
      "thesis": "One unmistakable mechanism carries the identity. This version emphasizes authority and intent confirmation.",
      "businessCue": "authority and intent confirmation"
    },
    {
      "id": "skill-safe-writes-r1-03-flow-spine",
      "name": "Safe writes · Flow Spine",
      "src": "skill-safe-writes-r1-03-flow-spine.png",
      "role": "broad-concept",
      "controlledVariable": "organize inputs, work, and outputs along one connected linear spine; emphasize idempotency and replay protection",
      "parentConcept": "Safe writes research profile",
      "tags": [
        "skill",
        "flow-spine",
        "idempotency-and-replay-protection",
        "safe-writes",
        "mutation",
        "recovery"
      ],
      "thesis": "A legible flow tests the skill as a transformation process. This version emphasizes idempotency and replay protection.",
      "businessCue": "idempotency and replay protection"
    },
    {
      "id": "skill-safe-writes-r1-04-interface-bridge",
      "name": "Safe writes · Interface Bridge",
      "src": "skill-safe-writes-r1-04-interface-bridge.png",
      "role": "broad-concept",
      "controlledVariable": "join two unequal functional masses through one explicit inhabited interface bridge; emphasize atomic commit chamber",
      "parentConcept": "Safe writes research profile",
      "tags": [
        "skill",
        "interface-bridge",
        "atomic-commit-chamber",
        "safe-writes",
        "mutation",
        "recovery"
      ],
      "thesis": "The skill is expressed as a reliable boundary between systems. This version emphasizes atomic commit chamber.",
      "businessCue": "atomic commit chamber"
    },
    {
      "id": "skill-safe-writes-r1-05-layered-system",
      "name": "Safe writes · Layered System",
      "src": "skill-safe-writes-r1-05-layered-system.png",
      "role": "broad-concept",
      "controlledVariable": "stack several connected layers with visibly different responsibilities; emphasize audit rollback and recovery vault",
      "parentConcept": "Safe writes research profile",
      "tags": [
        "skill",
        "layered-system",
        "audit-rollback-and-recovery-vault",
        "safe-writes",
        "mutation",
        "recovery"
      ],
      "thesis": "Layering tests separation of concerns and system depth. This version emphasizes audit rollback and recovery vault.",
      "businessCue": "audit rollback and recovery vault"
    },
    {
      "id": "skill-safe-writes-r1-06-modular-field",
      "name": "Safe writes · Modular Field",
      "src": "skill-safe-writes-r1-06-modular-field.png",
      "role": "broad-concept",
      "controlledVariable": "repeat small interoperable units on one shared base with a clear coordinating core; emphasize pre-write validation gate",
      "parentConcept": "Safe writes research profile",
      "tags": [
        "skill",
        "modular-field",
        "pre-write-validation-gate",
        "safe-writes",
        "mutation",
        "recovery"
      ],
      "thesis": "Modularity and composition become the identity. This version emphasizes pre-write validation gate.",
      "businessCue": "pre-write validation gate"
    },
    {
      "id": "skill-safe-writes-r1-07-verified-core",
      "name": "Safe writes · Verified Core",
      "src": "skill-safe-writes-r1-07-verified-core.png",
      "role": "broad-concept",
      "controlledVariable": "protect a compact central chamber behind explicit gates, checks, or controlled thresholds; emphasize authority and intent confirmation",
      "parentConcept": "Safe writes research profile",
      "tags": [
        "skill",
        "verified-core",
        "authority-and-intent-confirmation",
        "safe-writes",
        "mutation",
        "recovery"
      ],
      "thesis": "Correctness and validation dominate the architectural metaphor. This version emphasizes authority and intent confirmation.",
      "businessCue": "authority and intent confirmation"
    },
    {
      "id": "skill-safe-writes-r1-08-scale-engine",
      "name": "Safe writes · Scale Engine",
      "src": "skill-safe-writes-r1-08-scale-engine.png",
      "role": "broad-concept",
      "controlledVariable": "extend the building through repeated service bays and resilient parallel paths; emphasize idempotency and replay protection",
      "parentConcept": "Safe writes research profile",
      "tags": [
        "skill",
        "scale-engine",
        "idempotency-and-replay-protection",
        "safe-writes",
        "mutation",
        "recovery"
      ],
      "thesis": "Performance and scale are expressed through structure, not speed lines. This version emphasizes idempotency and replay protection.",
      "businessCue": "idempotency and replay protection"
    },
    {
      "id": "skill-safe-writes-r1-09-compact-primitive",
      "name": "Safe writes · Compact Primitive",
      "src": "skill-safe-writes-r1-09-compact-primitive.png",
      "role": "broad-concept",
      "controlledVariable": "reduce the skill to a minimal but complete map-readable technical building; emphasize atomic commit chamber",
      "parentConcept": "Safe writes research profile",
      "tags": [
        "skill",
        "compact-primitive",
        "atomic-commit-chamber",
        "safe-writes",
        "mutation",
        "recovery"
      ],
      "thesis": "The primitive tests the smallest recognizable expression of the skill. This version emphasizes atomic commit chamber.",
      "businessCue": "atomic commit chamber"
    },
    {
      "id": "skill-safe-writes-r1-10-skill-synthesis",
      "name": "Safe writes · Skill Synthesis",
      "src": "skill-safe-writes-r1-10-skill-synthesis.png",
      "role": "synthesis",
      "controlledVariable": "combine mechanism, flow, interface, validation, and scale in one balanced supporting building; emphasize audit rollback and recovery vault",
      "parentConcept": "Safe writes research profile",
      "tags": [
        "skill",
        "skill-synthesis",
        "audit-rollback-and-recovery-vault",
        "safe-writes",
        "mutation",
        "recovery"
      ],
      "thesis": "The synthesis tests a complete skill identity while remaining subordinate to projects and cities. This version emphasizes audit rollback and recovery vault.",
      "businessCue": "audit rollback and recovery vault"
    }
  ]
};
