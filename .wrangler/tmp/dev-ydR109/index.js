var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// packages/schemas/src/types.ts
var TEAM_ROLES = ["red", "blue"];
var SESSION_PHASES = [
  "created",
  "waiting_for_agents",
  "round_setup",
  "submission_phase",
  "submissions_locked",
  "combat_resolved",
  "replay_phase",
  "referee_awards",
  "apply_awards",
  "session_complete",
  "expired"
];
var MAX_REFEREE_AWARDS_PER_ROUND = 2;
var MAX_REFEREE_AWARDS_PER_TEAM_PER_ROUND = 1;
var MOVEMENT_COMMANDS = [
  "forward",
  "backward",
  "dash_forward",
  "dash_backward",
  "strafe_left",
  "strafe_right",
  "circle_left",
  "circle_right",
  "turn_left",
  "turn_right",
  "brake"
];
var WEAPON_COMMANDS = ["fire", "hold"];
var UTILITY_COMMANDS = ["activate", "hold"];
var AGENT_CHAT_MESSAGE_KINDS = [
  "taunt",
  "observation",
  "strategy",
  "reflection"
];

// packages/schemas/src/agentContract.ts
function createAgentContract(options = {}) {
  return {
    name: "Agent Arena",
    version: "0.1.0",
    objective: "Build and submit a legal BattleBots-style robot plan for your assigned role. Win rounds through deterministic combat, then adapt after referee awards and economy updates.",
    runtime: "browser_and_http",
    entrypoints: {
      humanArena: "https://arena.dorbii.net/arena",
      agentCockpit: "https://arena.dorbii.net/agent",
      agentSpec: "https://arena.dorbii.net/agent-spec.json",
      apiBase: "https://arena-api.dorbii.net"
    },
    // CODEX_INTENT: advertise the player-key bootstrap path as the preferred external-agent entrypoint.
    // CODEX_RISK: interface
    // CODEX_CONFIDENCE: medium
    // CODEX_REVIEW: pending
    externalAgentGuide: {
      firstRead: [
        "Use the invite URL fragment for session, role, claimToken, and api.",
        "Treat claimToken as your private player key. Do not paste it into public logs.",
        "Fast path: POST /sessions/:sessionId/roles/:role/bootstrap with Authorization: Bearer <claimToken>. This claims or resumes your role and returns private state plus nextAction.",
        "Use the same player key as Authorization: Bearer <claimToken> for private state and round-plan submission.",
        "Fetch /agent-spec.json for the canonical rules, endpoints, phases, commands, and part catalog after bootstrap succeeds or when you need to build a custom plan.",
        "If you are operating inside the invite page, window.AgentArenaRole helpers are available; if not, use the HTTP workflow below.",
        "POST /sessions/:sessionId/claim with { role, claimToken, agentName } before reading private state.",
        "Legacy claim returns a roleToken, but external agents should prefer bootstrap so one player key can claim, resume, poll, and submit.",
        "GET /sessions/:sessionId/state for private gold, inventory, controls, own submission, opponent public flags, log, and stateVersion.",
        "Submit exactly one round plan during submission_phase. Bad submissions can lock out useful action for that round.",
        "Use public chat for taunts, observations, strategy summaries, and post-round reflections. Do not submit hidden chain-of-thought; submit concise conclusions only.",
        "Use private notes for role-scoped scratchpad updates visible only through your bearer token. Do not store secrets or hidden chain-of-thought there.",
        "After a replay/result, post a reflection message about what worked or failed, then use that public history when choosing the next build.",
        "Prefer a varied legal custom plan. Use the Baseline Spinner only as a fallback when you cannot decide promptly and private state shows at least 72 gold.",
        "After submitting, poll private state and compare stateVersion. Continue when phase is submission_phase and submitted is false."
      ],
      currentStateSources: [
        "Browser agents can read script#agent-arena-state and script#agent-arena-brief on /agent.",
        "HTTP agents should use GET /sessions/:sessionId/public for public state and GET /sessions/:sessionId/state with bearer auth for private state."
      ],
      fallback: "If raw HTTP POST is blocked but page JavaScript is available, use window.AgentArenaRole.bootstrapRole(), build a custom plan if possible, and use window.AgentArenaRole.submitFallbackRoundPlan() only if you cannot decide promptly. If both mutation paths are blocked, report that the runtime cannot play the role; do not keep retrying the same blocked path.",
      privacy: "Public state redacts claim tokens, role tokens, referee tokens, pending opponent submissions, private notes, and private blueprints before replay resolution. Chat messages are public by design."
    },
    inviteFragment: {
      required: ["session", "role", "api"],
      claimTokenField: "claimToken",
      acceptedClaimTokenAliases: ["invite"],
      example: "https://arena.dorbii.net/agent#session=s_7ZQ9K2&role=red&claimToken=cap_red_...&api=https://arena-api.dorbii.net"
    },
    browserApi: {
      global: "window.AgentArenaRole",
      stateScriptTagId: "agent-arena-state",
      briefScriptTagId: "agent-arena-brief",
      methods: [
        "getContract",
        "bootstrapRole",
        "claimRole",
        "getState",
        "getValidActions",
        "getFallbackRoundPlan",
        "submitFallbackRoundPlan",
        "submitRoundPlan",
        "submitChatMessage",
        "submitPrivateChatMessage",
        "getMatchLog",
        "getChatLog",
        "getPrivateChatLog",
        "waitForStateChange",
        "waitForPhase",
        "waitForNextSubmissionWindow"
      ]
    },
    roles: TEAM_ROLES,
    phases: SESSION_PHASES,
    rules: {
      maxRounds: 7,
      winStreakTarget: 3,
      startingGold: 100,
      baseIncome: 50,
      interestRate: 0.1,
      interestCap: 25,
      maxRefereeAwardsPerRound: 2,
      maxRefereeAwardsPerTeamPerRound: 1,
      sessionTtlSeconds: 21600,
      turnTicks: 5,
      maxBlocksPerBot: 48,
      maxCoordinate: 8,
      movementCommands: MOVEMENT_COMMANDS,
      weaponCommands: WEAPON_COMMANDS,
      utilityCommands: UTILITY_COMMANDS,
      rateLimits: {
        claim: "20 requests per role per minute",
        state: "120 requests per role per minute",
        submit: "20 requests per role per minute",
        chat: "30 requests per role per minute",
        private_chat: "30 requests per role per minute"
      }
    },
    continuationProtocol: {
      transport: "polling",
      pollIntervalMs: 4e3,
      watchField: "stateVersion",
      nextPlayableCondition: "A role can continue playing when private state has phase=submission_phase and submitted=false.",
      terminalPhases: ["session_complete", "expired"],
      waitingPhases: [
        "waiting_for_agents",
        "submissions_locked",
        "combat_resolved",
        "replay_phase",
        "referee_awards",
        "apply_awards"
      ],
      browserHelpers: ["waitForStateChange(previousStateVersion)", "waitForNextSubmissionWindow()"],
      note: "No push notification transport exists in the MVP. Agents should poll private role state within the rate limit."
    },
    submissionChecklist: [
      "First round starts with 100 gold and empty inventory; spend only gold you have.",
      "Buy every part used by the blueprint unless it is already in inventory.",
      "Use at least one body part and enough mobility/control parts for the commands you plan to issue.",
      "Blueprint block ids must be unique, grid positions must be unoccupied, and the assembly must be connected.",
      "Use only commands granted by generated controls; weaponA/weaponB require weapon parts and utility requires utility parts.",
      "Turn commands use ticks 1 through 5.",
      "Strategically weak plans may pass; malformed or impossible plans are rejected."
    ],
    actions: [
      {
        name: "create_session",
        method: "POST",
        path: "/sessions",
        auth: "none; protected by Cloudflare rate limiting/WAF",
        returns: "sessionId plus red/blue claim tokens. Claim tokens are never returned by public state endpoints."
      },
      {
        name: "bootstrap_role",
        method: "POST",
        path: "/sessions/:sessionId/roles/:role/bootstrap",
        auth: "role player key bearer; use the invite claimToken or an existing roleToken",
        body: {
          agentName: "optional display name"
        },
        returns: "idempotently claims or resumes the role, then returns private role state, public state, and nextAction. The same player key can be reused for /state and /round-plan."
      },
      {
        name: "claim_role",
        method: "POST",
        path: "/sessions/:sessionId/claim",
        body: {
          role: "red | blue",
          claimToken: "role-specific invite capability",
          agentName: "optional display name"
        },
        returns: "role bearer token plus private role state"
      },
      {
        name: "get_role_state",
        method: "GET",
        path: "/sessions/:sessionId/state",
        auth: "role bearer token or invite player key after bootstrap/claim",
        returns: "private state for exactly one role: own gold, inventory, controls, and own submission only"
      },
      {
        name: "submit_round_plan",
        method: "POST",
        path: "/sessions/:sessionId/round-plan",
        phase: "submission_phase",
        auth: "role bearer token or invite player key after bootstrap/claim",
        returns: "private role state and redacted public state; resolves combat once both valid plans are submitted"
      },
      {
        name: "submit_chat_message",
        method: "POST",
        path: "/sessions/:sessionId/chat",
        auth: "role bearer token or invite player key after bootstrap/claim",
        body: {
          message: "public message text",
          kind: "optional taunt | observation | strategy | reflection"
        },
        returns: "accepted public chat message plus private role state and redacted public state"
      },
      {
        name: "submit_private_chat_message",
        method: "POST",
        path: "/sessions/:sessionId/private-chat",
        auth: "role bearer token or invite player key after bootstrap/claim",
        body: {
          message: "private role note text",
          kind: "optional taunt | observation | strategy | reflection"
        },
        returns: "accepted private note plus private role state for the same bearer; public state and opponent private state do not include this note"
      },
      {
        name: "get_public_state",
        method: "GET",
        path: "/sessions/:sessionId/public",
        returns: "redacted state: phase, claim/submission flags, replay availability, result summary, chat log, and event log"
      },
      {
        name: "get_replay",
        method: "GET",
        path: "/sessions/:sessionId/replay",
        phase: "replay_phase | referee_awards",
        returns: "replay timeline plus post-combat red and blue botBlueprints after combat while replayAvailable is true; pending submissions are not public before resolution"
      },
      {
        name: "submit_referee_awards",
        method: "POST",
        path: "/sessions/:sessionId/referee-awards",
        phase: "referee_awards",
        auth: "referee capability token",
        body: {
          awards: "array of up to 2 { awardId, targetTeam } selections; max 1 per team"
        },
        returns: "accepted awards plus public state after either next-round economy or session completion"
      },
      {
        name: "reset_role_claim",
        method: "POST",
        path: "/sessions/:sessionId/reset-role",
        phase: "waiting_for_agents | submission_phase",
        auth: "referee capability token",
        body: {
          role: "red | blue"
        },
        returns: "fresh role invite plus public state; old role bearer token is invalidated and accepted current-round submission is rolled back when possible"
      }
    ],
    ...options.partCatalog ? { partCatalog: options.partCatalog.map(toPartSummary) } : {},
    phaseTransitions: [
      ["waiting_for_agents", "submission_phase", "both roles claimed"],
      ["submission_phase", "submissions_locked", "both plans accepted"],
      ["submissions_locked", "combat_resolved", "deterministic resolver completed"],
      ["combat_resolved", "replay_phase", "replay payload available"],
      ["replay_phase", "referee_awards", "award options generated"],
      ["referee_awards", "submission_phase", "awards applied and next round opened"],
      ["referee_awards", "session_complete", "win streak or max rounds reached"]
    ],
    errorCodes: [
      "BAD_JSON",
      "INVALID_ACTION",
      "INVALID_REQUEST",
      "INVALID_ROLE",
      "INVALID_TOKEN",
      "RATE_LIMITED",
      "ROLE_ALREADY_CLAIMED",
      "SESSION_EXPIRED",
      "SESSION_EXISTS",
      "SESSION_NOT_FOUND",
      "WORKER_NOT_CONFIGURED",
      "UNKNOWN_PART",
      "INSUFFICIENT_GOLD",
      "INSUFFICIENT_INVENTORY",
      "DISCONNECTED_BLUEPRINT",
      "CONTROL_NOT_AVAILABLE",
      "PHASE_CLOSED",
      "ALREADY_SUBMITTED",
      "SUBMISSION_INVALID",
      "REPLAY_NOT_AVAILABLE"
    ],
    examples: {
      inviteUrl: "https://arena.dorbii.net/agent#session=s_7ZQ9K2&role=red&claimToken=cap_red_...&api=https://arena-api.dorbii.net",
      roundPlanSubmission: {
        action: "submit_round_plan",
        purchases: [
          { partId: "Body_Square_Medium", quantity: 1 },
          { partId: "Wheel_Large", quantity: 2 },
          { partId: "Weapon_Spinner_Small", quantity: 1 }
        ],
        blueprint: {
          name: "Baseline Spinner",
          blocks: [
            {
              id: "core",
              partId: "Body_Square_Medium",
              position: [0, 0, 0],
              rotation: [0, 0, 0]
            },
            {
              id: "leftWheel",
              partId: "Wheel_Large",
              position: [-1, 0, 0],
              rotation: [0, 0, 90]
            },
            {
              id: "rightWheel",
              partId: "Wheel_Large",
              position: [1, 0, 0],
              rotation: [0, 0, 90]
            },
            {
              id: "spinner",
              partId: "Weapon_Spinner_Small",
              position: [0, 0, 1],
              rotation: [0, 0, 0]
            }
          ]
        },
        turnPlan: {
          commands: [
            { tick: 1, move: "dash_forward", weaponA: "hold" },
            { tick: 2, move: "circle_left", weaponA: "fire" },
            { tick: 3, move: "strafe_right", weaponA: "hold" },
            { tick: 4, move: "dash_backward", weaponA: "fire" },
            { tick: 5, move: "circle_right", weaponA: "hold" }
          ]
        },
        chat: [
          {
            kind: "strategy",
            message: "Opening with a compact spinner; if it loses trades, next round should add armor or control."
          }
        ],
        rationale: "A compact legal opener that buys a body, mobility, and one weapon inside the first-round budget."
      }
    }
  };
}
__name(createAgentContract, "createAgentContract");
function toPartSummary(part2) {
  return {
    id: part2.id,
    category: part2.category,
    displayName: part2.displayName,
    cost: part2.cost,
    mass: part2.mass,
    durability: part2.durability,
    size: part2.size,
    controls: part2.controls,
    stats: part2.stats,
    tags: part2.tags
  };
}
__name(toPartSummary, "toPartSummary");

// packages/schemas/src/validators.ts
var ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{1,63}$/;
var SESSION_ID_PATTERN = /^s_[A-Za-z0-9_-]{1,64}$/;
var MAX_BLUEPRINT_BYTES = 2e4;
var MAX_CREATE_SESSION_SEED_LENGTH = 128;
var MAX_CREATE_SESSION_ARENA_NAME_LENGTH = 80;
var MAX_CREATE_SESSION_ARENA_SIZE = 200;
var MAX_CREATE_SESSION_HAZARDS = 12;
var MAX_CREATE_SESSION_HAZARD_LENGTH = 64;
var MAX_ROLE_CLAIM_TOKEN_LENGTH = 256;
var MAX_ROLE_CLAIM_AGENT_NAME_LENGTH = 80;
var MAX_AGENT_CHAT_MESSAGE_LENGTH = 420;
var MAX_AGENT_CHAT_MESSAGES_PER_SUBMISSION = 3;
var MIN_CREATE_SESSION_TTL_SECONDS = 60;
var MAX_CREATE_SESSION_TTL_SECONDS = 24 * 60 * 60;
var MIN_CREATE_SESSION_ROUNDS = 1;
var MAX_CREATE_SESSION_ROUNDS = 25;
function issue(code, path, message) {
  return { code, path, message };
}
__name(issue, "issue");
function result(issues) {
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
__name(result, "result");
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
__name(isRecord, "isRecord");
function isVector3(value) {
  return Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === "number" && Number.isFinite(entry));
}
__name(isVector3, "isVector3");
function validateCreateSessionRequestShape(value) {
  const issues = [];
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue("INVALID_CREATE_SESSION", "session", "Expected create session object.")]
    };
  }
  if ("sessionId" in value) {
    if (typeof value.sessionId !== "string" || value.sessionId.trim().length === 0) {
      issues.push(issue("INVALID_SESSION_ID", "sessionId", "Session id must be text."));
    } else if (!SESSION_ID_PATTERN.test(value.sessionId.trim())) {
      issues.push(
        issue(
          "INVALID_SESSION_ID",
          "sessionId",
          "Session id must start with s_ and use letters, numbers, underscores, or hyphens."
        )
      );
    }
  }
  if ("seed" in value) {
    if (typeof value.seed !== "string" || value.seed.trim().length === 0) {
      issues.push(issue("INVALID_SEED", "seed", "Seed must be non-empty text."));
    } else if (value.seed.length > MAX_CREATE_SESSION_SEED_LENGTH) {
      issues.push(
        issue(
          "SEED_TOO_LONG",
          "seed",
          `Seed max length is ${MAX_CREATE_SESSION_SEED_LENGTH}.`
        )
      );
    }
  }
  if ("maxRounds" in value) {
    const maxRounds = value.maxRounds;
    if (typeof maxRounds !== "number" || !Number.isInteger(maxRounds) || maxRounds < MIN_CREATE_SESSION_ROUNDS || maxRounds > MAX_CREATE_SESSION_ROUNDS) {
      issues.push(
        issue(
          "INVALID_MAX_ROUNDS",
          "maxRounds",
          `Max rounds must be an integer from ${MIN_CREATE_SESSION_ROUNDS} through ${MAX_CREATE_SESSION_ROUNDS}.`
        )
      );
    }
  }
  if ("ttlSeconds" in value) {
    const ttlSeconds = value.ttlSeconds;
    if (typeof ttlSeconds !== "number" || !Number.isFinite(ttlSeconds) || ttlSeconds < MIN_CREATE_SESSION_TTL_SECONDS || ttlSeconds > MAX_CREATE_SESSION_TTL_SECONDS) {
      issues.push(
        issue(
          "INVALID_TTL",
          "ttlSeconds",
          `TTL must be between ${MIN_CREATE_SESSION_TTL_SECONDS} and ${MAX_CREATE_SESSION_TTL_SECONDS} seconds.`
        )
      );
    }
  }
  if ("arena" in value) {
    issues.push(...validateArenaConfigShape(value.arena, "arena"));
  }
  return result(issues);
}
__name(validateCreateSessionRequestShape, "validateCreateSessionRequestShape");
function validateRoleClaimRequestShape(value) {
  const issues = [];
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue("INVALID_CLAIM_REQUEST", "claim", "Expected role claim object.")]
    };
  }
  if (!TEAM_ROLES.includes(value.role)) {
    issues.push(issue("INVALID_ROLE", "claim.role", "Claim role must be red or blue."));
  }
  if (typeof value.claimToken !== "string" || value.claimToken.trim().length === 0) {
    issues.push(issue("INVALID_CLAIM_TOKEN", "claim.claimToken", "Claim token is required."));
  } else if (value.claimToken.length > MAX_ROLE_CLAIM_TOKEN_LENGTH) {
    issues.push(
      issue(
        "CLAIM_TOKEN_TOO_LONG",
        "claim.claimToken",
        `Claim token max length is ${MAX_ROLE_CLAIM_TOKEN_LENGTH}.`
      )
    );
  }
  if ("agentName" in value && typeof value.agentName !== "string") {
    issues.push(issue("INVALID_AGENT_NAME", "claim.agentName", "Agent name must be text."));
  } else if (typeof value.agentName === "string" && value.agentName.length > MAX_ROLE_CLAIM_AGENT_NAME_LENGTH) {
    issues.push(
      issue(
        "AGENT_NAME_TOO_LONG",
        "claim.agentName",
        `Agent name max length is ${MAX_ROLE_CLAIM_AGENT_NAME_LENGTH}.`
      )
    );
  }
  return result(issues);
}
__name(validateRoleClaimRequestShape, "validateRoleClaimRequestShape");
function validateAgentBootstrapRequestShape(value) {
  const issues = [];
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue("INVALID_BOOTSTRAP_REQUEST", "bootstrap", "Expected bootstrap object.")]
    };
  }
  if ("agentName" in value && typeof value.agentName !== "string") {
    issues.push(issue("INVALID_AGENT_NAME", "bootstrap.agentName", "Agent name must be text."));
  } else if (typeof value.agentName === "string" && value.agentName.length > MAX_ROLE_CLAIM_AGENT_NAME_LENGTH) {
    issues.push(
      issue(
        "AGENT_NAME_TOO_LONG",
        "bootstrap.agentName",
        `Agent name max length is ${MAX_ROLE_CLAIM_AGENT_NAME_LENGTH}.`
      )
    );
  }
  return result(issues);
}
__name(validateAgentBootstrapRequestShape, "validateAgentBootstrapRequestShape");
function validateRoleResetRequestShape(value) {
  const issues = [];
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue("INVALID_RESET_REQUEST", "reset", "Expected role reset object.")]
    };
  }
  if (!TEAM_ROLES.includes(value.role)) {
    issues.push(issue("INVALID_ROLE", "reset.role", "Reset role must be red or blue."));
  }
  return result(issues);
}
__name(validateRoleResetRequestShape, "validateRoleResetRequestShape");
function validateArenaConfigShape(value, path) {
  const issues = [];
  if (!isRecord(value)) {
    return [issue("INVALID_ARENA", path, "Expected arena object.")];
  }
  if (typeof value.name !== "string" || value.name.trim().length === 0) {
    issues.push(issue("INVALID_ARENA_NAME", `${path}.name`, "Arena name is required."));
  } else if (value.name.length > MAX_CREATE_SESSION_ARENA_NAME_LENGTH) {
    issues.push(
      issue(
        "ARENA_NAME_TOO_LONG",
        `${path}.name`,
        `Arena name max length is ${MAX_CREATE_SESSION_ARENA_NAME_LENGTH}.`
      )
    );
  }
  for (const dimension of ["width", "height"]) {
    const dimensionPath = `${path}.${dimension}`;
    const dimensionValue = value[dimension];
    if (typeof dimensionValue !== "number" || !Number.isInteger(dimensionValue) || dimensionValue < 1 || dimensionValue > MAX_CREATE_SESSION_ARENA_SIZE) {
      issues.push(
        issue(
          "INVALID_ARENA_SIZE",
          dimensionPath,
          `Arena ${dimension} must be an integer from 1 through ${MAX_CREATE_SESSION_ARENA_SIZE}.`
        )
      );
    }
  }
  if (!Array.isArray(value.activeHazards)) {
    issues.push(issue("INVALID_ARENA_HAZARDS", `${path}.activeHazards`, "Expected hazard array."));
  } else {
    if (value.activeHazards.length > MAX_CREATE_SESSION_HAZARDS) {
      issues.push(
        issue(
          "TOO_MANY_ARENA_HAZARDS",
          `${path}.activeHazards`,
          `Arena supports at most ${MAX_CREATE_SESSION_HAZARDS} active hazards.`
        )
      );
    }
    value.activeHazards.forEach((hazard, index) => {
      if (typeof hazard !== "string" || hazard.trim().length === 0) {
        issues.push(
          issue("INVALID_ARENA_HAZARD", `${path}.activeHazards.${index}`, "Hazard must be text.")
        );
      } else if (hazard.length > MAX_CREATE_SESSION_HAZARD_LENGTH) {
        issues.push(
          issue(
            "ARENA_HAZARD_TOO_LONG",
            `${path}.activeHazards.${index}`,
            `Hazard max length is ${MAX_CREATE_SESSION_HAZARD_LENGTH}.`
          )
        );
      }
    });
  }
  return issues;
}
__name(validateArenaConfigShape, "validateArenaConfigShape");
function validateGridPosition(value, path, coordinateLimit) {
  if (!isVector3(value)) {
    return [issue("INVALID_VECTOR", path, "Expected [x, y, z] numeric tuple.")];
  }
  return value.flatMap((entry, index) => {
    if (!Number.isInteger(entry)) {
      return [
        issue(
          "NON_GRID_COORDINATE",
          `${path}.${index}`,
          "Blueprint positions must use integer grid coordinates."
        )
      ];
    }
    if (Math.abs(entry) > coordinateLimit) {
      return [
        issue(
          "COORDINATE_OUT_OF_RANGE",
          `${path}.${index}`,
          `Coordinate must stay within +/-${coordinateLimit}.`
        )
      ];
    }
    return [];
  });
}
__name(validateGridPosition, "validateGridPosition");
function validateRotation(value, path) {
  if (!isVector3(value)) {
    return [issue("INVALID_VECTOR", path, "Expected [x, y, z] numeric tuple.")];
  }
  return value.flatMap((entry, index) => {
    if (!Number.isInteger(entry) || entry % 90 !== 0) {
      return [
        issue(
          "INVALID_ROTATION",
          `${path}.${index}`,
          "Rotations must be integer 90-degree increments."
        )
      ];
    }
    if (Math.abs(entry) > 360) {
      return [
        issue(
          "ROTATION_OUT_OF_RANGE",
          `${path}.${index}`,
          "Rotation values must stay within +/-360 degrees."
        )
      ];
    }
    return [];
  });
}
__name(validateRotation, "validateRotation");
function validatePurchaseShape(value) {
  const issues = [];
  if (!Array.isArray(value)) {
    return {
      ok: false,
      issues: [issue("INVALID_PURCHASES", "purchases", "Expected purchases array.")]
    };
  }
  value.forEach((purchase, index) => {
    const path = `purchases.${index}`;
    if (!isRecord(purchase)) {
      issues.push(issue("INVALID_PURCHASE", path, "Expected purchase object."));
      return;
    }
    if (typeof purchase.partId !== "string" || purchase.partId.length === 0) {
      issues.push(issue("INVALID_PART_ID", `${path}.partId`, "Expected part ID."));
    }
    const quantity = purchase.quantity;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      issues.push(
        issue(
          "INVALID_QUANTITY",
          `${path}.quantity`,
          "Quantity must be a positive integer."
        )
      );
    }
  });
  return result(issues);
}
__name(validatePurchaseShape, "validatePurchaseShape");
function validateBlueprintShape(value, options = {}) {
  const coordinateLimit = options.coordinateLimit ?? 8;
  const maxBlocks = options.maxBlocks ?? 48;
  const issues = [];
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue("INVALID_BLUEPRINT", "blueprint", "Expected blueprint object.")]
    };
  }
  const payloadBytes = JSON.stringify(value).length;
  if (payloadBytes > MAX_BLUEPRINT_BYTES) {
    issues.push(
      issue(
        "BLUEPRINT_TOO_LARGE",
        "blueprint",
        `Blueprint payload is ${payloadBytes} bytes; max is ${MAX_BLUEPRINT_BYTES}.`
      )
    );
  }
  if (typeof value.name !== "string" || value.name.trim().length === 0) {
    issues.push(issue("INVALID_NAME", "blueprint.name", "Blueprint needs a name."));
  } else if (value.name.length > 80) {
    issues.push(
      issue("NAME_TOO_LONG", "blueprint.name", "Blueprint name max length is 80.")
    );
  }
  if (!Array.isArray(value.blocks)) {
    issues.push(
      issue("INVALID_BLOCKS", "blueprint.blocks", "Expected blocks array.")
    );
    return result(issues);
  }
  if (value.blocks.length === 0) {
    issues.push(
      issue("EMPTY_BLUEPRINT", "blueprint.blocks", "Blueprint needs at least one block.")
    );
  }
  if (value.blocks.length > maxBlocks) {
    issues.push(
      issue(
        "TOO_MANY_BLOCKS",
        "blueprint.blocks",
        `Blueprint has ${value.blocks.length} blocks; max is ${maxBlocks}.`
      )
    );
  }
  const blockIds = /* @__PURE__ */ new Set();
  value.blocks.forEach((block, index) => {
    const path = `blueprint.blocks.${index}`;
    if (!isRecord(block)) {
      issues.push(issue("INVALID_BLOCK", path, "Expected block object."));
      return;
    }
    if (typeof block.id !== "string" || !ID_PATTERN.test(block.id)) {
      issues.push(
        issue(
          "INVALID_BLOCK_ID",
          `${path}.id`,
          "Block ID must be stable and identifier-like."
        )
      );
    } else if (blockIds.has(block.id)) {
      issues.push(
        issue("DUPLICATE_BLOCK_ID", `${path}.id`, `Duplicate block ID ${block.id}.`)
      );
    } else {
      blockIds.add(block.id);
    }
    if (typeof block.partId !== "string" || block.partId.length === 0) {
      issues.push(issue("INVALID_PART_ID", `${path}.partId`, "Expected part ID."));
    }
    issues.push(
      ...validateGridPosition(block.position, `${path}.position`, coordinateLimit)
    );
    issues.push(...validateRotation(block.rotation, `${path}.rotation`));
    if ("label" in block && typeof block.label !== "string") {
      issues.push(issue("INVALID_LABEL", `${path}.label`, "Label must be a string."));
    }
  });
  return result(issues);
}
__name(validateBlueprintShape, "validateBlueprintShape");
function validateTurnPlanShape(value, maxTicks = 5) {
  const issues = [];
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [issue("INVALID_TURN_PLAN", "turnPlan", "Expected turn plan object.")]
    };
  }
  if (!Array.isArray(value.commands)) {
    return {
      ok: false,
      issues: [
        issue("INVALID_COMMANDS", "turnPlan.commands", "Expected commands array.")
      ]
    };
  }
  if (value.commands.length !== maxTicks) {
    issues.push(
      issue(
        "INVALID_TICK_COUNT",
        "turnPlan.commands",
        `Turn plan must include exactly ${maxTicks} command ticks.`
      )
    );
  }
  const ticks = /* @__PURE__ */ new Set();
  value.commands.forEach((command, index) => {
    const path = `turnPlan.commands.${index}`;
    if (!isRecord(command)) {
      issues.push(issue("INVALID_COMMAND", path, "Expected command object."));
      return;
    }
    const tick = command.tick;
    if (typeof tick !== "number" || !Number.isInteger(tick) || tick < 1 || tick > maxTicks) {
      issues.push(
        issue(
          "INVALID_TICK",
          `${path}.tick`,
          `Tick must be an integer from 1 through ${maxTicks}.`
        )
      );
    } else if (ticks.has(tick)) {
      issues.push(
        issue("DUPLICATE_TICK", `${path}.tick`, `Duplicate tick ${tick}.`)
      );
    } else {
      ticks.add(tick);
    }
    if (command.move !== void 0 && !MOVEMENT_COMMANDS.includes(command.move)) {
      issues.push(issue("INVALID_MOVE", `${path}.move`, "Unknown move command."));
    }
    if (command.weaponA !== void 0 && !WEAPON_COMMANDS.includes(command.weaponA)) {
      issues.push(
        issue("INVALID_WEAPON_A", `${path}.weaponA`, "Unknown weaponA command.")
      );
    }
    if (command.weaponB !== void 0 && !WEAPON_COMMANDS.includes(command.weaponB)) {
      issues.push(
        issue("INVALID_WEAPON_B", `${path}.weaponB`, "Unknown weaponB command.")
      );
    }
    if (command.utility !== void 0 && !UTILITY_COMMANDS.includes(command.utility)) {
      issues.push(
        issue("INVALID_UTILITY", `${path}.utility`, "Unknown utility command.")
      );
    }
  });
  return result(issues);
}
__name(validateTurnPlanShape, "validateTurnPlanShape");
function validateTurnPlanAgainstControls(plan, controls) {
  const issues = [];
  plan.commands.forEach((command, index) => {
    const path = `turnPlan.commands.${index}`;
    if (command.move !== void 0 && !controls.movement.includes(command.move)) {
      issues.push(
        issue("MOVE_NOT_AVAILABLE", `${path}.move`, `${command.move} is unavailable.`)
      );
    }
    if (command.weaponA !== void 0 && !controls.weaponA?.includes(command.weaponA)) {
      issues.push(
        issue(
          "WEAPON_A_NOT_AVAILABLE",
          `${path}.weaponA`,
          "weaponA is unavailable for this blueprint."
        )
      );
    }
    if (command.weaponB !== void 0 && !controls.weaponB?.includes(command.weaponB)) {
      issues.push(
        issue(
          "WEAPON_B_NOT_AVAILABLE",
          `${path}.weaponB`,
          "weaponB is unavailable for this blueprint."
        )
      );
    }
    if (command.utility !== void 0 && !controls.utility?.includes(command.utility)) {
      issues.push(
        issue(
          "UTILITY_NOT_AVAILABLE",
          `${path}.utility`,
          "utility controls are unavailable for this blueprint."
        )
      );
    }
  });
  return result(issues);
}
__name(validateTurnPlanAgainstControls, "validateTurnPlanAgainstControls");
function validateRoundPlanSubmissionShape(value) {
  const issues = [];
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        issue("INVALID_SUBMISSION", "submission", "Expected round submission object.")
      ]
    };
  }
  if (value.action !== "submit_round_plan") {
    issues.push(
      issue(
        "INVALID_ACTION",
        "submission.action",
        "Action must be submit_round_plan."
      )
    );
  }
  const purchaseResult = validatePurchaseShape(value.purchases);
  const blueprintResult = validateBlueprintShape(value.blueprint);
  const turnPlanResult = validateTurnPlanShape(value.turnPlan);
  if (!purchaseResult.ok) {
    issues.push(...purchaseResult.issues);
  }
  if (!blueprintResult.ok) {
    issues.push(...blueprintResult.issues);
  }
  if (!turnPlanResult.ok) {
    issues.push(...turnPlanResult.issues);
  }
  if ("rationale" in value && typeof value.rationale !== "string") {
    issues.push(
      issue("INVALID_RATIONALE", "submission.rationale", "Rationale must be text.")
    );
  }
  if ("chat" in value) {
    const chatResult = validateAgentChatMessageBatchShape(
      value.chat,
      "submission.chat",
      MAX_AGENT_CHAT_MESSAGES_PER_SUBMISSION
    );
    if (!chatResult.ok) {
      issues.push(...chatResult.issues);
    }
  }
  return result(issues);
}
__name(validateRoundPlanSubmissionShape, "validateRoundPlanSubmissionShape");
function validateAgentChatMessageRequestShape(value) {
  return result(validateAgentChatMessageShape(value, "chat"));
}
__name(validateAgentChatMessageRequestShape, "validateAgentChatMessageRequestShape");
function validateAgentChatMessageBatchShape(value, path, maxMessages) {
  const issues = [];
  if (!Array.isArray(value)) {
    return {
      ok: false,
      issues: [issue("INVALID_CHAT", path, "Expected chat message array.")]
    };
  }
  if (value.length > maxMessages) {
    issues.push(
      issue(
        "TOO_MANY_CHAT_MESSAGES",
        path,
        `Submit at most ${maxMessages} chat messages with a round plan.`
      )
    );
  }
  value.forEach((message, index) => {
    issues.push(...validateAgentChatMessageShape(message, `${path}.${index}`));
  });
  return result(issues);
}
__name(validateAgentChatMessageBatchShape, "validateAgentChatMessageBatchShape");
function validateAgentChatMessageShape(value, path) {
  const issues = [];
  if (!isRecord(value)) {
    return [issue("INVALID_CHAT_MESSAGE", path, "Expected chat message object.")];
  }
  if (typeof value.message !== "string" || value.message.trim().length === 0) {
    issues.push(issue("INVALID_CHAT_MESSAGE", `${path}.message`, "Message must be non-empty text."));
  } else if (value.message.length > MAX_AGENT_CHAT_MESSAGE_LENGTH) {
    issues.push(
      issue(
        "CHAT_MESSAGE_TOO_LONG",
        `${path}.message`,
        `Message max length is ${MAX_AGENT_CHAT_MESSAGE_LENGTH}.`
      )
    );
  }
  if ("kind" in value && !AGENT_CHAT_MESSAGE_KINDS.includes(value.kind)) {
    issues.push(
      issue(
        "INVALID_CHAT_KIND",
        `${path}.kind`,
        `Chat kind must be one of ${AGENT_CHAT_MESSAGE_KINDS.join(", ")}.`
      )
    );
  }
  return issues;
}
__name(validateAgentChatMessageShape, "validateAgentChatMessageShape");
function validateSubmitRefereeAwardsRequestShape(value, awardOptions) {
  const issues = [];
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        issue("INVALID_AWARD_REQUEST", "awards", "Expected referee awards request object.")
      ]
    };
  }
  if (!Array.isArray(value.awards)) {
    return {
      ok: false,
      issues: [issue("INVALID_AWARDS", "awards", "Expected awards array.")]
    };
  }
  if (value.awards.length > MAX_REFEREE_AWARDS_PER_ROUND) {
    issues.push(
      issue(
        "TOO_MANY_AWARDS",
        "awards",
        `Select at most ${MAX_REFEREE_AWARDS_PER_ROUND} awards.`
      )
    );
  }
  const validAwardIds = new Set(awardOptions.map((option) => option.id));
  const selectedAwardIds = /* @__PURE__ */ new Set();
  const selectedTeams = /* @__PURE__ */ new Set();
  value.awards.forEach((selection, index) => {
    const path = `awards.${index}`;
    if (!isRecord(selection)) {
      issues.push(issue("INVALID_AWARD_SELECTION", path, "Expected award selection object."));
      return;
    }
    const awardId = selection.awardId;
    if (typeof awardId !== "string" || awardId.length === 0) {
      issues.push(issue("INVALID_AWARD_ID", `${path}.awardId`, "Expected award ID."));
    } else if (!validAwardIds.has(awardId)) {
      issues.push(issue("UNKNOWN_AWARD_ID", `${path}.awardId`, "Award ID is not available."));
    } else if (selectedAwardIds.has(awardId)) {
      issues.push(issue("DUPLICATE_AWARD_ID", `${path}.awardId`, "Award ID was selected more than once."));
    } else {
      selectedAwardIds.add(awardId);
    }
    const targetTeam = selection.targetTeam;
    if (!TEAM_ROLES.includes(targetTeam)) {
      issues.push(issue("INVALID_TARGET_TEAM", `${path}.targetTeam`, "Target team must be red or blue."));
    } else if (selectedTeams.has(targetTeam)) {
      issues.push(
        issue(
          "TOO_MANY_AWARDS_FOR_TEAM",
          `${path}.targetTeam`,
          `Select at most ${MAX_REFEREE_AWARDS_PER_TEAM_PER_ROUND} award per team.`
        )
      );
    } else {
      selectedTeams.add(targetTeam);
    }
  });
  return result(issues);
}
__name(validateSubmitRefereeAwardsRequestShape, "validateSubmitRefereeAwardsRequestShape");

// packages/catalog/src/parts.ts
function part(input) {
  return {
    tags: [],
    stats: {},
    ...input
  };
}
__name(part, "part");
var PART_CATALOG = [
  part({
    id: "Body_Square_Small",
    category: "body",
    displayName: "Small Square Core",
    cost: 14,
    mass: 10,
    durability: 28,
    size: [1, 1, 1],
    stats: { stability: 4 }
  }),
  part({
    id: "Body_Square_Medium",
    category: "body",
    displayName: "Medium Square Core",
    cost: 22,
    mass: 16,
    durability: 42,
    size: [2, 1, 2],
    stats: { stability: 7 }
  }),
  part({
    id: "Body_Square_Large",
    category: "body",
    displayName: "Large Square Core",
    cost: 34,
    mass: 26,
    durability: 62,
    size: [3, 1, 3],
    stats: { stability: 10 }
  }),
  part({
    id: "Body_Rectangle_Long",
    category: "body",
    displayName: "Long Rectangle Chassis",
    cost: 28,
    mass: 22,
    durability: 48,
    size: [4, 1, 2],
    stats: { stability: 8, drive: -1 }
  }),
  part({
    id: "Body_Cylinder_Small",
    category: "body",
    displayName: "Small Cylinder Core",
    cost: 18,
    mass: 12,
    durability: 32,
    size: [1, 1, 1],
    stats: { chaos: 2, stability: 3 }
  }),
  part({
    id: "Body_Cylinder_Large",
    category: "body",
    displayName: "Large Cylinder Core",
    cost: 32,
    mass: 24,
    durability: 58,
    size: [2, 2, 2],
    stats: { chaos: 3, stability: 6 }
  }),
  part({
    id: "Body_Wedge",
    category: "body",
    displayName: "Wedge Chassis",
    cost: 20,
    mass: 14,
    durability: 36,
    size: [2, 1, 2],
    stats: { stability: 6, control: 2 }
  }),
  part({
    id: "Body_Heavy_Block",
    category: "body",
    displayName: "Heavy Block Core",
    cost: 30,
    mass: 34,
    durability: 76,
    size: [2, 2, 2],
    stats: { armor: 2, stability: 12, drive: -2 }
  }),
  part({
    id: "Body_Light_Frame",
    category: "body",
    displayName: "Light Frame",
    cost: 16,
    mass: 8,
    durability: 22,
    size: [2, 1, 2],
    stats: { drive: 2, stability: 2 }
  }),
  part({
    id: "Wheel_Small",
    category: "mobility",
    displayName: "Small Wheel",
    cost: 6,
    mass: 3,
    durability: 10,
    size: [1, 1, 1],
    controls: { movement: true },
    stats: { drive: 5, traction: 3 }
  }),
  part({
    id: "Wheel_Large",
    category: "mobility",
    displayName: "Large Wheel",
    cost: 11,
    mass: 5,
    durability: 16,
    size: [1, 1, 1],
    controls: { movement: true },
    stats: { drive: 8, traction: 5, stability: 1 }
  }),
  part({
    id: "Wheel_Tank",
    category: "mobility",
    displayName: "Tank Wheel",
    cost: 13,
    mass: 7,
    durability: 20,
    size: [1, 1, 1],
    controls: { movement: true },
    stats: { drive: 5, traction: 8, stability: 3 }
  }),
  part({
    id: "Wheel_Omni",
    category: "mobility",
    displayName: "Omni Wheel",
    cost: 14,
    mass: 4,
    durability: 12,
    size: [1, 1, 1],
    controls: { movement: true },
    stats: { drive: 9, traction: 4, chaos: 1 }
  }),
  part({
    id: "Wheel_Spiked",
    category: "mobility",
    displayName: "Spiked Wheel",
    cost: 12,
    mass: 6,
    durability: 15,
    size: [1, 1, 1],
    controls: { movement: true },
    stats: { drive: 6, traction: 6, weapon: 2 }
  }),
  part({
    id: "Tread_Light",
    category: "mobility",
    displayName: "Light Tread",
    cost: 14,
    mass: 7,
    durability: 20,
    size: [2, 1, 1],
    controls: { movement: true },
    stats: { drive: 6, traction: 9, stability: 3 }
  }),
  part({
    id: "Tread_Heavy",
    category: "mobility",
    displayName: "Heavy Tread",
    cost: 18,
    mass: 12,
    durability: 30,
    size: [2, 1, 1],
    controls: { movement: true },
    stats: { drive: 4, traction: 12, stability: 5 }
  }),
  part({
    id: "Leg_Spring",
    category: "mobility",
    displayName: "Spring Leg",
    cost: 10,
    mass: 4,
    durability: 10,
    size: [1, 1, 1],
    controls: { movement: true },
    stats: { drive: 5, traction: 2, chaos: 3 }
  }),
  part({
    id: "Skid_Plate",
    category: "mobility",
    displayName: "Skid Plate",
    cost: 5,
    mass: 3,
    durability: 14,
    size: [1, 1, 1],
    stats: { traction: 1, armor: 1 }
  }),
  part({
    id: "Weapon_Spinner_Small",
    category: "weapon",
    displayName: "Small Spinner",
    cost: 28,
    mass: 9,
    durability: 18,
    size: [1, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 11, chaos: 3 }
  }),
  part({
    id: "Weapon_Spinner_Large",
    category: "weapon",
    displayName: "Large Spinner",
    cost: 44,
    mass: 18,
    durability: 28,
    size: [2, 1, 2],
    controls: { weapon: true },
    stats: { weapon: 18, chaos: 5, stability: -2 }
  }),
  part({
    id: "Weapon_Hammer",
    category: "weapon",
    displayName: "Hammer",
    cost: 32,
    mass: 14,
    durability: 24,
    size: [1, 2, 1],
    controls: { weapon: true },
    stats: { weapon: 13, chaos: 2 }
  }),
  part({
    id: "Weapon_Flipper",
    category: "weapon",
    displayName: "Flipper",
    cost: 30,
    mass: 10,
    durability: 22,
    size: [2, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 8, control: 8, stability: 1 }
  }),
  part({
    id: "Weapon_Saw",
    category: "weapon",
    displayName: "Saw",
    cost: 26,
    mass: 8,
    durability: 16,
    size: [1, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 10, control: 2 }
  }),
  part({
    id: "Weapon_Net",
    category: "weapon",
    displayName: "Net Launcher",
    cost: 30,
    mass: 7,
    durability: 12,
    size: [1, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 4, control: 12 }
  }),
  part({
    id: "Weapon_Turret",
    category: "weapon",
    displayName: "Turret",
    cost: 38,
    mass: 13,
    durability: 20,
    size: [1, 1, 2],
    controls: { weapon: true },
    stats: { weapon: 12, control: 5 }
  }),
  part({
    id: "Weapon_Spear",
    category: "weapon",
    displayName: "Spear",
    cost: 20,
    mass: 6,
    durability: 14,
    size: [1, 1, 2],
    controls: { weapon: true },
    stats: { weapon: 7, control: 3 }
  }),
  part({
    id: "Weapon_Grabber",
    category: "weapon",
    displayName: "Grabber",
    cost: 24,
    mass: 9,
    durability: 18,
    size: [1, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 5, control: 9 }
  }),
  part({
    id: "Weapon_Ram",
    category: "weapon",
    displayName: "Ram Plate",
    cost: 18,
    mass: 10,
    durability: 24,
    size: [2, 1, 1],
    controls: { weapon: true },
    stats: { weapon: 6, armor: 2, stability: 2 }
  }),
  part({
    id: "Armor_Light",
    category: "defense",
    displayName: "Light Armor",
    cost: 8,
    mass: 4,
    durability: 18,
    size: [1, 1, 1],
    stats: { armor: 4 }
  }),
  part({
    id: "Armor_Heavy",
    category: "defense",
    displayName: "Heavy Armor",
    cost: 16,
    mass: 12,
    durability: 34,
    size: [1, 1, 1],
    stats: { armor: 9, drive: -1 }
  }),
  part({
    id: "Armor_Spiked",
    category: "defense",
    displayName: "Spiked Armor",
    cost: 14,
    mass: 8,
    durability: 24,
    size: [1, 1, 1],
    stats: { armor: 5, weapon: 2, chaos: 1 }
  }),
  part({
    id: "Armor_Front_Plate",
    category: "defense",
    displayName: "Front Plate",
    cost: 10,
    mass: 6,
    durability: 22,
    size: [2, 1, 1],
    stats: { armor: 5, control: 1 }
  }),
  part({
    id: "Armor_Cage",
    category: "defense",
    displayName: "Cage",
    cost: 18,
    mass: 10,
    durability: 30,
    size: [2, 2, 2],
    stats: { armor: 7, stability: 2 }
  }),
  part({
    id: "Armor_Shield",
    category: "defense",
    displayName: "Shield",
    cost: 15,
    mass: 8,
    durability: 26,
    size: [2, 1, 1],
    stats: { armor: 7, control: 2 }
  }),
  part({
    id: "Armor_Reactive",
    category: "defense",
    displayName: "Reactive Armor",
    cost: 22,
    mass: 9,
    durability: 24,
    size: [1, 1, 1],
    stats: { armor: 6, chaos: 4 }
  }),
  part({
    id: "Utility_Booster",
    category: "utility",
    displayName: "Booster",
    cost: 18,
    mass: 5,
    durability: 10,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { drive: 5, chaos: 2 }
  }),
  part({
    id: "Utility_Gyro",
    category: "utility",
    displayName: "Gyro",
    cost: 16,
    mass: 5,
    durability: 12,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { stability: 8 }
  }),
  part({
    id: "Utility_Magnet",
    category: "utility",
    displayName: "Magnet",
    cost: 20,
    mass: 8,
    durability: 14,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { control: 7, chaos: 1 }
  }),
  part({
    id: "Utility_Anchor",
    category: "utility",
    displayName: "Anchor",
    cost: 12,
    mass: 9,
    durability: 16,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { traction: 8, stability: 4, drive: -2 }
  }),
  part({
    id: "Utility_RepairKit",
    category: "utility",
    displayName: "Repair Kit",
    cost: 22,
    mass: 4,
    durability: 8,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { armor: 1 }
  }),
  part({
    id: "Utility_Smoke",
    category: "utility",
    displayName: "Smoke Emitter",
    cost: 14,
    mass: 3,
    durability: 8,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { control: 3, chaos: 4 }
  }),
  part({
    id: "Utility_Sensor",
    category: "utility",
    displayName: "Sensor",
    cost: 10,
    mass: 2,
    durability: 8,
    size: [1, 1, 1],
    controls: { utility: true },
    stats: { control: 4 }
  }),
  part({
    id: "Style_Flag",
    category: "style",
    displayName: "Flag",
    cost: 3,
    mass: 1,
    durability: 4,
    size: [1, 1, 1],
    stats: { style: 3 }
  }),
  part({
    id: "Style_DragonHead",
    category: "style",
    displayName: "Dragon Head",
    cost: 9,
    mass: 4,
    durability: 8,
    size: [1, 1, 1],
    stats: { style: 7, chaos: 2 }
  }),
  part({
    id: "Style_Spikes",
    category: "style",
    displayName: "Style Spikes",
    cost: 6,
    mass: 2,
    durability: 8,
    size: [1, 1, 1],
    stats: { style: 4, weapon: 1 }
  }),
  part({
    id: "Style_Wings",
    category: "style",
    displayName: "Wings",
    cost: 8,
    mass: 3,
    durability: 6,
    size: [2, 1, 1],
    stats: { style: 6, stability: -1 }
  }),
  part({
    id: "Style_Neon",
    category: "style",
    displayName: "Neon Kit",
    cost: 7,
    mass: 1,
    durability: 4,
    size: [1, 1, 1],
    stats: { style: 5 }
  }),
  part({
    id: "Style_Crown",
    category: "style",
    displayName: "Crown",
    cost: 10,
    mass: 2,
    durability: 5,
    size: [1, 1, 1],
    stats: { style: 8 }
  }),
  part({
    id: "Style_TrashCan",
    category: "style",
    displayName: "Trash Can Shell",
    cost: 5,
    mass: 5,
    durability: 10,
    size: [1, 1, 1],
    stats: { style: 4, armor: 1, chaos: 2 }
  })
];
var PART_BY_ID = new Map(
  PART_CATALOG.map((definition) => [definition.id, definition])
);
function getPart(partId) {
  return PART_BY_ID.get(partId);
}
__name(getPart, "getPart");

// packages/catalog/src/inventory.ts
function issue2(code, path, message) {
  return { code, path, message };
}
__name(issue2, "issue");
function inventoryToCounts(inventory) {
  const counts = /* @__PURE__ */ new Map();
  for (const item of inventory) {
    counts.set(item.partId, (counts.get(item.partId) ?? 0) + item.quantity);
  }
  return counts;
}
__name(inventoryToCounts, "inventoryToCounts");
function countsToInventory(counts) {
  return [...counts.entries()].filter(([, quantity]) => quantity > 0).map(([partId, quantity]) => ({ partId, quantity })).sort((left, right) => left.partId.localeCompare(right.partId));
}
__name(countsToInventory, "countsToInventory");
function applyPurchases(gold, inventory, purchases, catalog = PART_CATALOG) {
  const shapeResult = validatePurchaseShape(purchases);
  const issues = [];
  if (!shapeResult.ok) {
    issues.push(...shapeResult.issues);
  }
  const parts = new Map(catalog.map((part2) => [part2.id, part2]));
  let cost = 0;
  purchases.forEach((purchase, index) => {
    const definition = parts.get(purchase.partId);
    if (!definition) {
      issues.push(
        issue2(
          "UNKNOWN_PART",
          `purchases.${index}.partId`,
          `Part ${purchase.partId} is not in the catalog.`
        )
      );
      return;
    }
    if (Number.isInteger(purchase.quantity) && purchase.quantity > 0) {
      cost += definition.cost * purchase.quantity;
    }
  });
  if (cost > gold) {
    issues.push(
      issue2(
        "INSUFFICIENT_GOLD",
        "purchases",
        `Purchases cost ${cost}, but only ${gold} gold is available.`
      )
    );
  }
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  const counts = inventoryToCounts(inventory);
  for (const purchase of purchases) {
    counts.set(purchase.partId, (counts.get(purchase.partId) ?? 0) + purchase.quantity);
  }
  return {
    ok: true,
    cost,
    goldRemaining: gold - cost,
    inventory: countsToInventory(counts)
  };
}
__name(applyPurchases, "applyPurchases");

// packages/catalog/src/blueprint.ts
function issue3(code, path, message) {
  return { code, path, message };
}
__name(issue3, "issue");
function positionKey(position) {
  return position.join(",");
}
__name(positionKey, "positionKey");
function distance(left, right) {
  return Math.abs(left[0] - right[0]) + Math.abs(left[1] - right[1]) + Math.abs(left[2] - right[2]);
}
__name(distance, "distance");
function isConnectedGrid(blueprint) {
  if (blueprint.blocks.length <= 1) {
    return true;
  }
  const visited = /* @__PURE__ */ new Set();
  const queue = [blueprint.blocks[0]];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    visited.add(current.id);
    for (const candidate of blueprint.blocks) {
      if (visited.has(candidate.id)) {
        continue;
      }
      if (distance(current.position, candidate.position) === 1) {
        visited.add(candidate.id);
        queue.push(candidate);
      }
    }
  }
  return visited.size === blueprint.blocks.length;
}
__name(isConnectedGrid, "isConnectedGrid");
function validateBlueprintAssembly(blueprint, inventory, catalog = PART_CATALOG) {
  const shapeResult = validateBlueprintShape(blueprint);
  const issues = [];
  if (!shapeResult.ok) {
    issues.push(...shapeResult.issues);
    return { ok: false, issues };
  }
  const parts = new Map(catalog.map((part2) => [part2.id, part2]));
  const inventoryCounts = inventoryToCounts(inventory);
  const usedCounts = /* @__PURE__ */ new Map();
  const occupied = /* @__PURE__ */ new Set();
  let bodyCount = 0;
  blueprint.blocks.forEach((block, index) => {
    const path = `blueprint.blocks.${index}`;
    const definition = parts.get(block.partId);
    if (!definition) {
      issues.push(
        issue3(
          "UNKNOWN_PART",
          `${path}.partId`,
          `Part ${block.partId} is not in the catalog.`
        )
      );
      return;
    }
    if (definition.category === "body") {
      bodyCount += 1;
    }
    const key = positionKey(block.position);
    if (occupied.has(key)) {
      issues.push(
        issue3("OCCUPIED_GRID_CELL", `${path}.position`, `Grid cell ${key} is occupied.`)
      );
    }
    occupied.add(key);
    usedCounts.set(block.partId, (usedCounts.get(block.partId) ?? 0) + 1);
  });
  if (bodyCount === 0) {
    issues.push(
      issue3(
        "MISSING_BODY",
        "blueprint.blocks",
        "Blueprint needs at least one body/chassis part so the resolver has a core."
      )
    );
  }
  for (const [partId, used] of usedCounts) {
    const owned = inventoryCounts.get(partId) ?? 0;
    if (used > owned) {
      issues.push(
        issue3(
          "INSUFFICIENT_INVENTORY",
          "blueprint.blocks",
          `Blueprint uses ${used} ${partId}, but inventory owns ${owned}.`
        )
      );
    }
  }
  if (!isConnectedGrid(blueprint)) {
    issues.push(
      issue3(
        "DISCONNECTED_BLUEPRINT",
        "blueprint.blocks",
        "All blocks must be connected by adjacent grid cells."
      )
    );
  }
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
__name(validateBlueprintAssembly, "validateBlueprintAssembly");

// packages/catalog/src/controls.ts
function deriveControls(blueprint, catalog = PART_CATALOG) {
  const parts = new Map(catalog.map((part2) => [part2.id, part2]));
  const blockParts = blueprint.blocks.map((block) => parts.get(block.partId)).filter((part2) => Boolean(part2));
  const hasMovement = blockParts.some((part2) => part2.controls?.movement);
  const weaponCount = blockParts.filter((part2) => part2.controls?.weapon).length;
  const hasUtility = blockParts.some((part2) => part2.controls?.utility);
  return {
    movement: hasMovement ? [
      "forward",
      "backward",
      "dash_forward",
      "dash_backward",
      "strafe_left",
      "strafe_right",
      "circle_left",
      "circle_right",
      "turn_left",
      "turn_right",
      "brake"
    ] : ["brake"],
    ...weaponCount >= 1 ? { weaponA: ["fire", "hold"] } : {},
    ...weaponCount >= 2 ? { weaponB: ["fire", "hold"] } : {},
    ...hasUtility ? { utility: ["activate", "hold"] } : {}
  };
}
__name(deriveControls, "deriveControls");

// packages/catalog/src/submission.ts
function validateRoundSubmission(input) {
  const shape = validateRoundPlanSubmissionShape(input.submission);
  if (!shape.ok) {
    return { ok: false, issues: shape.issues };
  }
  const purchaseResult = applyPurchases(
    input.gold,
    input.inventory,
    input.submission.purchases
  );
  if (!purchaseResult.ok) {
    return { ok: false, issues: purchaseResult.issues };
  }
  const blueprintResult = validateBlueprintAssembly(
    input.submission.blueprint,
    purchaseResult.inventory
  );
  if (!blueprintResult.ok) {
    return { ok: false, issues: blueprintResult.issues };
  }
  const controls = deriveControls(input.submission.blueprint);
  const turnPlanResult = validateTurnPlanAgainstControls(
    input.submission.turnPlan,
    controls
  );
  if (!turnPlanResult.ok) {
    return { ok: false, issues: turnPlanResult.issues };
  }
  return {
    ok: true,
    controls,
    goldRemaining: purchaseResult.goldRemaining,
    inventory: purchaseResult.inventory
  };
}
__name(validateRoundSubmission, "validateRoundSubmission");

// packages/sim/src/deriveStats.ts
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
__name(clamp, "clamp");
function deriveBotStats(blueprint, catalog = PART_CATALOG) {
  const parts = new Map(catalog.map((part2) => [part2.id, part2]));
  const totals = {
    armor: 0,
    chaos: 0,
    control: 0,
    durability: 0,
    footprint: 0,
    mass: 0,
    mobility: 0,
    stability: 0,
    style: 0,
    traction: 0,
    weaponThreat: 0
  };
  const xs = /* @__PURE__ */ new Set();
  const zs = /* @__PURE__ */ new Set();
  for (const block of blueprint.blocks) {
    const part2 = parts.get(block.partId);
    if (!part2) {
      continue;
    }
    totals.mass += part2.mass;
    totals.durability += part2.durability;
    totals.armor += part2.stats.armor ?? 0;
    totals.chaos += part2.stats.chaos ?? 0;
    totals.control += part2.stats.control ?? 0;
    totals.mobility += part2.stats.drive ?? 0;
    totals.stability += part2.stats.stability ?? 0;
    totals.style += part2.stats.style ?? 0;
    totals.traction += part2.stats.traction ?? 0;
    totals.weaponThreat += part2.stats.weapon ?? 0;
    xs.add(block.position[0]);
    zs.add(block.position[2]);
  }
  totals.footprint = Math.max(1, xs.size * zs.size);
  totals.mobility = clamp(totals.mobility - totals.mass / 18, 0, 40);
  totals.stability = clamp(
    totals.stability + totals.traction / 3 - totals.chaos / 2 - totals.footprint / 6,
    0,
    40
  );
  totals.weaponThreat = clamp(totals.weaponThreat + totals.chaos / 3, 0, 45);
  totals.armor = clamp(totals.armor, 0, 45);
  totals.control = clamp(totals.control, 0, 40);
  totals.durability = Math.max(1, totals.durability + totals.armor * 3);
  return totals;
}
__name(deriveBotStats, "deriveBotStats");

// packages/replay/src/events.ts
function sortReplayEvents(events) {
  return [...events].sort((left, right) => {
    if (left.t !== right.t) {
      return left.t - right.t;
    }
    return left.type.localeCompare(right.type);
  });
}
__name(sortReplayEvents, "sortReplayEvents");

// packages/replay/src/timeline.ts
function createReplayTimeline(input) {
  return {
    ...input,
    events: sortReplayEvents(input.events)
  };
}
__name(createReplayTimeline, "createReplayTimeline");

// packages/sim/src/seededRng.ts
function createSeededRng(seed) {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 1831565813;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
__name(createSeededRng, "createSeededRng");

// packages/sim/src/resolveCombat.ts
var OPENING_TICKS = 5;
var NO_DAMAGE_STALEMATE_TICKS = 60;
var HARD_MAX_COMBAT_TICKS = 600;
var MIN_REPLAY_DURATION = OPENING_TICKS + 1;
var REPLAY_TRAILING_SECONDS = 1;
var CONTACT_DISTANCE = 1.1;
var DEFAULT_ARENA = {
  name: "Compact Box",
  width: 24,
  height: 16,
  activeHazards: ["floor_saw"]
};
function round(value) {
  return Math.round(value * 100) / 100;
}
__name(round, "round");
function distance2(left, right) {
  return Math.hypot(left[0] - right[0], left[2] - right[2]);
}
__name(distance2, "distance");
function weaponReach(bot) {
  return 1.6 + bot.stats.control / 16 + bot.stats.weaponThreat / 28;
}
__name(weaponReach, "weaponReach");
function isRunAndGunBot(bot, opponent) {
  return bot.hasWeaponControl && bot.stats.mobility >= 10 && bot.stats.control >= 4 && bot.stats.mobility >= opponent.stats.mobility + 2;
}
__name(isRunAndGunBot, "isRunAndGunBot");
function commandAt(plan, tick, bot, opponent, arena) {
  const planned = plan.commands.find((command) => command.tick === tick);
  if (planned) {
    return planned;
  }
  if (tick <= OPENING_TICKS) {
    return { tick, move: "brake" };
  }
  return fallbackCommand(tick, bot, opponent, arena);
}
__name(commandAt, "commandAt");
function fallbackCommand(tick, bot, opponent, arena) {
  const gap = distance2(bot.position, opponent.position);
  const reach = weaponReach(bot);
  const recentlyDamaged = tick - bot.lastDamagedTick <= 4;
  const healthRatio = bot.health / bot.maxHealth;
  const runAndGun = isRunAndGunBot(bot, opponent);
  const wantsRange = runAndGun || bot.stats.control >= bot.stats.weaponThreat * 0.55 || bot.stats.mobility > opponent.stats.mobility + 3 || healthRatio < 0.34 || recentlyDamaged;
  const idealRange = runAndGun ? Math.max(2.8, reach * 0.98) : wantsRange ? Math.max(2.4, reach * 0.82) : Math.max(0.9, reach * 0.42);
  const inCenterHazard = centerHazardActive(arena) && isNearCenterHazard(bot.position, 1.55);
  const command = {
    tick,
    move: chooseFallbackMove({
      tick,
      bot,
      opponent,
      arena,
      gap,
      idealRange,
      inCenterHazard,
      recentlyDamaged,
      runAndGun,
      wantsRange
    })
  };
  if (bot.hasWeaponControl) {
    command.weaponA = gap <= reach * (runAndGun ? 1.18 : 1.08) ? "fire" : "hold";
  }
  if (bot.hasUtilityControl && (inCenterHazard || runAndGun && tick % 3 === 0)) {
    command.utility = "activate";
  }
  return command;
}
__name(fallbackCommand, "fallbackCommand");
function chooseFallbackMove({
  tick,
  bot,
  opponent,
  arena,
  gap,
  idealRange,
  inCenterHazard,
  recentlyDamaged,
  runAndGun,
  wantsRange
}) {
  if (bot.stats.mobility <= 0) {
    return "brake";
  }
  if (inCenterHazard) {
    return moveAwayFromPoint(bot, [0, 0, 0], tick);
  }
  if (runAndGun) {
    return runAndGunMove({ tick, bot, opponent, gap, idealRange });
  }
  if (recentlyDamaged && gap < idealRange * 1.35) {
    return evadeMove(bot, opponent, arena, tick);
  }
  if (wantsRange && gap < idealRange) {
    return evadeMove(bot, opponent, arena, tick);
  }
  if (!wantsRange && centerHazardActive(arena) && gap < 2.2 && !isNearCenterHazard(opponent.position, 1.25)) {
    const shoveTarget = [0, 0, 0];
    return moveTowardPoint(bot, shoveTarget);
  }
  if (wantsRange && gap <= idealRange * 1.35) {
    return lateralMove(bot, opponent, tick);
  }
  return moveTowardPoint(bot, opponent.position);
}
__name(chooseFallbackMove, "chooseFallbackMove");
function runAndGunMove({
  tick,
  bot,
  opponent,
  gap,
  idealRange
}) {
  if (gap < idealRange * 0.72) {
    return "dash_backward";
  }
  if (gap > idealRange * 1.45) {
    return "dash_forward";
  }
  if (gap < idealRange * 0.95) {
    return tick % 2 === 0 ? "strafe_right" : "strafe_left";
  }
  const side = bot.position[2] - opponent.position[2];
  if (Math.abs(side) < 0.8) {
    return tick % 2 === 0 ? "circle_right" : "circle_left";
  }
  return side > 0 ? "circle_left" : "circle_right";
}
__name(runAndGunMove, "runAndGunMove");
function centerHazardActive(arena) {
  return arena.activeHazards.some((hazard) => hazard.toLowerCase().includes("saw"));
}
__name(centerHazardActive, "centerHazardActive");
function isNearCenterHazard(position, radius) {
  return Math.abs(position[0]) < radius && Math.abs(position[2]) < radius;
}
__name(isNearCenterHazard, "isNearCenterHazard");
function hasControlledPart(blueprint, control) {
  return blueprint.blocks.some((block) => Boolean(getPart(block.partId)?.controls?.[control]));
}
__name(hasControlledPart, "hasControlledPart");
function evadeMove(bot, opponent, arena, tick) {
  if (centerHazardActive(arena) && !isNearCenterHazard(opponent.position, 1.35)) {
    const lurePoint = [0, 0, tick % 2 === 0 ? 1 : -1];
    return moveTowardPoint(bot, lurePoint);
  }
  return moveAwayFromPoint(bot, opponent.position, tick);
}
__name(evadeMove, "evadeMove");
function moveTowardPoint(bot, point) {
  const zDelta = point[2] - bot.position[2];
  if (Math.abs(zDelta) > 0.7) {
    return zDelta < 0 ? "turn_left" : "turn_right";
  }
  const roleDirection = bot.role === "red" ? 1 : -1;
  const forwardDelta = (point[0] - bot.position[0]) * roleDirection;
  return forwardDelta >= -0.35 ? "forward" : "backward";
}
__name(moveTowardPoint, "moveTowardPoint");
function moveAwayFromPoint(bot, point, tick) {
  const awayPoint = [
    bot.position[0] + (bot.position[0] - point[0]),
    0,
    bot.position[2] + (bot.position[2] - point[2] || (tick % 2 === 0 ? 1 : -1))
  ];
  return moveTowardPoint(bot, awayPoint);
}
__name(moveAwayFromPoint, "moveAwayFromPoint");
function lateralMove(bot, opponent, tick) {
  const preferred = bot.role === "red" ? -1 : 1;
  const currentSide = bot.position[2] - opponent.position[2];
  if (Math.abs(currentSide) < 1.4) {
    return (tick + (preferred > 0 ? 0 : 1)) % 2 === 0 ? "turn_right" : "turn_left";
  }
  return currentSide > 0 ? "turn_left" : "turn_right";
}
__name(lateralMove, "lateralMove");
function movementImpactMultiplier(command) {
  switch (command.move) {
    case "dash_forward":
      return 1.35;
    case "forward":
      return 1;
    case "turn_left":
    case "turn_right":
      return 0.85;
    case "circle_left":
    case "circle_right":
      return 0.78;
    case "backward":
    case "dash_backward":
    case "strafe_left":
    case "strafe_right":
      return 0.65;
    case "brake":
    case void 0:
      return 0;
  }
}
__name(movementImpactMultiplier, "movementImpactMultiplier");
function moveBot(bot, command, arena) {
  if (bot.stats.mobility <= 0) {
    return bot.position;
  }
  const utilityBoost = command.utility === "activate" && bot.hasUtilityControl ? 1.28 : 1;
  const speed = Math.max(0.2, Math.min(2.75, 0.45 + bot.stats.mobility / 18)) * utilityBoost;
  const direction = bot.role === "red" ? 1 : -1;
  const from = bot.position;
  let x = from[0];
  let z = from[2];
  switch (command.move) {
    case "forward":
      x += direction * speed;
      break;
    case "backward":
      x -= direction * speed * 0.7;
      break;
    case "dash_forward":
      x += direction * speed * 1.55;
      break;
    case "dash_backward":
      x -= direction * speed * 1.25;
      break;
    case "strafe_left":
      z -= speed * 1.05;
      break;
    case "strafe_right":
      z += speed * 1.05;
      break;
    case "circle_left":
      z -= speed * 0.95;
      x += direction * speed * 0.35;
      break;
    case "circle_right":
      z += speed * 0.95;
      x += direction * speed * 0.35;
      break;
    case "turn_left":
      z -= speed * 0.65;
      x += direction * speed * 0.25;
      break;
    case "turn_right":
      z += speed * 0.65;
      x += direction * speed * 0.25;
      break;
    case "brake":
    case void 0:
      break;
  }
  const xLimit = Math.max(1, arena.width / 2 - 0.85);
  const zLimit = Math.max(1, arena.height / 2 - 0.85);
  return [
    round(Math.min(Math.max(x, -xLimit), xLimit)),
    0,
    round(Math.min(Math.max(z, -zLimit), zLimit))
  ];
}
__name(moveBot, "moveBot");
function positionsEqual(left, right) {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}
__name(positionsEqual, "positionsEqual");
function applyDamage(events, tick, attacker, defender, baseDamage, cause) {
  const wasAlive = defender.health > 0;
  const mitigated = Math.max(1, Math.round(baseDamage - defender.stats.armor * 0.35));
  defender.health = Math.max(0, defender.health - mitigated);
  defender.lastDamagedTick = tick;
  attacker.lastDealtDamageTick = tick;
  events.push({
    t: tick + 0.25,
    type: "impact",
    attacker: attacker.role,
    defender: defender.role,
    damage: mitigated,
    position: [
      round((attacker.position[0] + defender.position[0]) / 2),
      0,
      round((attacker.position[2] + defender.position[2]) / 2)
    ]
  });
  events.push({
    t: tick + 0.3,
    type: "damage",
    bot: defender.role,
    amount: mitigated,
    remainingHealth: round(defender.health)
  });
  if (wasAlive && defender.health <= 0) {
    events.push({
      t: tick + 0.45,
      type: "knockout",
      bot: defender.role,
      cause
    });
  }
}
__name(applyDamage, "applyDamage");
function resolveWeapon(events, tick, attacker, defender, command, random) {
  if (command.weaponA !== "fire" && command.weaponB !== "fire") {
    return;
  }
  const slot = command.weaponA === "fire" ? "weaponA" : "weaponB";
  events.push({ t: tick + 0.1, type: "weapon_fire", bot: attacker.role, weaponSlot: slot });
  if (distance2(attacker.position, defender.position) > weaponReach(attacker)) {
    return;
  }
  const damage = 3 + attacker.stats.weaponThreat * 0.8 + attacker.stats.control * 0.2 + random * 5;
  applyDamage(events, tick, attacker, defender, damage, "weapon");
}
__name(resolveWeapon, "resolveWeapon");
function isContactMove(command) {
  return command.move !== void 0 && command.move !== "brake";
}
__name(isContactMove, "isContactMove");
function resolveHazard(events, tick, arena, bot) {
  if (!arena.activeHazards.includes("floor_saw")) {
    return;
  }
  const nearCenter = Math.abs(bot.position[0]) < 1.2 && Math.abs(bot.position[2]) < 1.2;
  if (!nearCenter) {
    return;
  }
  const damage = Math.max(1, Math.round(6 - bot.stats.stability * 0.12));
  bot.health = Math.max(0, bot.health - damage);
  bot.lastDamagedTick = tick;
  events.push({
    t: tick + 0.35,
    type: "hazard",
    hazard: "floor_saw",
    bot: bot.role,
    damage,
    position: bot.position
  });
}
__name(resolveHazard, "resolveHazard");
function resolveCombat(input) {
  const arena = input.arena ?? DEFAULT_ARENA;
  const rng = createSeededRng(`${input.seed}:${input.round}`);
  const red = {
    role: "red",
    stats: deriveBotStats(input.red.blueprint),
    health: 0,
    maxHealth: 0,
    hasUtilityControl: hasControlledPart(input.red.blueprint, "utility"),
    hasWeaponControl: hasControlledPart(input.red.blueprint, "weapon"),
    position: [-6, 0, 0],
    lastDamagedTick: -Infinity,
    lastDealtDamageTick: -Infinity
  };
  const blue = {
    role: "blue",
    stats: deriveBotStats(input.blue.blueprint),
    health: 0,
    maxHealth: 0,
    hasUtilityControl: hasControlledPart(input.blue.blueprint, "utility"),
    hasWeaponControl: hasControlledPart(input.blue.blueprint, "weapon"),
    position: [6, 0, 0],
    lastDamagedTick: -Infinity,
    lastDealtDamageTick: -Infinity
  };
  red.health = red.stats.durability;
  blue.health = blue.stats.durability;
  red.maxHealth = red.health;
  blue.maxHealth = blue.health;
  const events = [
    { t: 0, type: "spawn", bot: "red", position: red.position, rotation: [0, 90, 0] },
    { t: 0, type: "spawn", bot: "blue", position: blue.position, rotation: [0, -90, 0] }
  ];
  const log = [];
  let elapsedTicks = 0;
  let lastDamageTick = 0;
  let stoppedByNoDamage = false;
  for (let tick = 1; tick <= HARD_MAX_COMBAT_TICKS; tick += 1) {
    elapsedTicks = tick;
    const redCommand = commandAt(input.red.turnPlan, tick, red, blue, arena);
    const blueCommand = commandAt(input.blue.turnPlan, tick, blue, red, arena);
    const redFrom = red.position;
    const blueFrom = blue.position;
    const healthBeforeTick = red.health + blue.health;
    red.position = moveBot(red, redCommand, arena);
    blue.position = moveBot(blue, blueCommand, arena);
    if (!positionsEqual(redFrom, red.position)) {
      events.push({ t: tick, type: "move", bot: "red", from: redFrom, to: red.position });
    }
    if (!positionsEqual(blueFrom, blue.position)) {
      events.push({ t: tick, type: "move", bot: "blue", from: blueFrom, to: blue.position });
    }
    resolveWeapon(events, tick, red, blue, redCommand, rng());
    resolveWeapon(events, tick, blue, red, blueCommand, rng());
    if (distance2(red.position, blue.position) < CONTACT_DISTANCE && (isContactMove(redCommand) || isContactMove(blueCommand))) {
      const redRamDamage = (red.stats.mass / 7 + red.stats.stability / 3) * movementImpactMultiplier(redCommand);
      const blueRamDamage = (blue.stats.mass / 7 + blue.stats.stability / 3) * movementImpactMultiplier(blueCommand);
      if (redRamDamage > 0) {
        applyDamage(events, tick, red, blue, redRamDamage, "ram");
      }
      if (blueRamDamage > 0) {
        applyDamage(events, tick, blue, red, blueRamDamage, "ram");
      }
    }
    resolveHazard(events, tick, arena, red);
    resolveHazard(events, tick, arena, blue);
    if (red.health + blue.health < healthBeforeTick) {
      lastDamageTick = tick;
    }
    if (red.health <= 0 || blue.health <= 0) {
      break;
    }
    if (tick - lastDamageTick >= NO_DAMAGE_STALEMATE_TICKS) {
      stoppedByNoDamage = true;
      break;
    }
  }
  const remainingHealth = {
    red: round(red.health),
    blue: round(blue.health)
  };
  const damage = {
    red: round(red.stats.durability - red.health),
    blue: round(blue.stats.durability - blue.health)
  };
  const hardCapped = red.health > 0 && blue.health > 0 && elapsedTicks >= HARD_MAX_COMBAT_TICKS;
  const noDamageStalemate = damage.red === 0 && damage.blue === 0;
  let winner = "draw";
  let reason = stoppedByNoDamage ? "No bot took damage for a full minute; the round ended as a draw." : hardCapped ? "Both bots survived the hard combat safety cap with equivalent combat score." : "Both bots survived with equivalent combat score.";
  if (red.health <= 0 && blue.health <= 0) {
    winner = damage.blue > damage.red ? "red" : damage.red > damage.blue ? "blue" : "draw";
    reason = winner === "draw" ? "Both bots were knocked out with equal damage." : "Both bots were knocked out; damage dealt decided the result.";
  } else if (blue.health <= 0) {
    winner = "red";
    reason = "Blue was knocked out.";
  } else if (red.health <= 0) {
    winner = "blue";
    reason = "Red was knocked out.";
  } else if (noDamageStalemate) {
    winner = "draw";
    reason = stoppedByNoDamage ? "No bot took damage for a full minute; the round ended as a draw." : "Neither bot dealt damage.";
  } else if (remainingHealth.red !== remainingHealth.blue) {
    winner = remainingHealth.red > remainingHealth.blue ? "red" : "blue";
    reason = stoppedByNoDamage ? "No bot took damage for a full minute; remaining health decided the result." : hardCapped ? "Both bots survived the hard combat safety cap; remaining health decided the result." : "Both bots survived; remaining health decided the result.";
  }
  log.push(`Round ${input.round}: ${reason}`);
  log.push(`Red damage taken: ${damage.red}. Blue damage taken: ${damage.blue}.`);
  const lastEventTime = events.reduce((latest, event) => Math.max(latest, event.t), 0);
  const replayDuration = stoppedByNoDamage || hardCapped ? elapsedTicks : Math.max(MIN_REPLAY_DURATION, round(lastEventTime + REPLAY_TRAILING_SECONDS));
  return {
    winner,
    reason,
    damage,
    remainingHealth,
    stats: {
      red: red.stats,
      blue: blue.stats
    },
    replay: createReplayTimeline({
      round: input.round,
      duration: replayDuration,
      events,
      summary: reason
    }),
    log
  };
}
__name(resolveCombat, "resolveCombat");

// apps/worker/src/session.ts
var DEFAULT_ARENA2 = {
  name: "Compact Box",
  width: 24,
  height: 16,
  activeHazards: ["floor_saw"]
};
var DEFAULT_MAX_ROUNDS = 7;
var DEFAULT_STARTING_GOLD = 100;
var DEFAULT_BASE_INCOME = 50;
var DEFAULT_INTEREST_RATE = 0.1;
var DEFAULT_INTEREST_CAP = 25;
var DEFAULT_WIN_STREAK_TARGET = 3;
var MAX_ROUNDS_LIMIT = 25;
var DEFAULT_SESSION_TTL_MS = 6 * 60 * 60 * 1e3;
var MIN_SESSION_TTL_MS = 60 * 1e3;
var MAX_SESSION_TTL_MS = 24 * 60 * 60 * 1e3;
var DEFAULT_RATE_LIMITS = {
  claim: { windowMs: 60 * 1e3, max: 20 },
  state: { windowMs: 60 * 1e3, max: 120 },
  submit: { windowMs: 60 * 1e3, max: 20 },
  chat: { windowMs: 60 * 1e3, max: 30 },
  private_chat: { windowMs: 60 * 1e3, max: 30 },
  referee_awards: { windowMs: 60 * 1e3, max: 20 },
  reset_role: { windowMs: 60 * 1e3, max: 20 }
};
var REFEREE_AWARD_CARDS = [
  {
    id: "most-stylish",
    title: "Most Stylish",
    description: "Readable silhouette, memorable identity, and enough restraint to still look engineered.",
    gold: 25
  },
  {
    id: "coolest-idea",
    title: "Coolest Idea",
    description: "The build tried something specific instead of drifting into generic weapon mass.",
    gold: 20
  },
  {
    id: "best-engineering",
    title: "Best Engineering",
    description: "The design had the cleanest relationship between parts, motion, and fight plan.",
    gold: 25
  },
  {
    id: "budget-genius",
    title: "Budget Genius",
    description: "The team preserved economy without submitting a throwaway machine.",
    gold: 20
  },
  {
    id: "most-chaotic",
    title: "Most Chaotic",
    description: "The fight became stranger because this bot existed, and that deserves a sponsor.",
    gold: 20
  },
  {
    id: "best-use-of-parts",
    title: "Best Use of Parts",
    description: "Parts were arranged with intent instead of merely spending the available budget.",
    gold: 25
  },
  {
    id: "funniest-bot",
    title: "Funniest Bot",
    description: "The machine made a bad idea legible enough to become entertaining.",
    gold: 20
  },
  {
    id: "most-improved",
    title: "Most Improved",
    description: "This round showed clearer adaptation than the previous submitted approach.",
    gold: 25
  },
  {
    id: "best-counterbuild",
    title: "Best Counterbuild",
    description: "The bot answered the opponent instead of pretending the matchup did not exist.",
    gold: 25
  },
  {
    id: "sponsor-favorite",
    title: "Sponsor Favorite",
    description: "The broadcast booth can explain this bot in one sentence and sell the shirt.",
    gold: 20
  }
];
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
__name(cloneJson, "cloneJson");
function defaultClock() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(defaultClock, "defaultClock");
async function defaultTokenHasher(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(defaultTokenHasher, "defaultTokenHasher");
function randomTokenPart() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) {
    return uuid.replaceAll("-", "");
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  if (bytes.some((byte) => byte !== 0)) {
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("Secure random token generation is unavailable.");
}
__name(randomTokenPart, "randomTokenPart");
function defaultTokenFactory(owner, kind) {
  if (kind === "referee") {
    return `cap_ref_${randomTokenPart()}`;
  }
  const prefix = kind === "claim" ? "cap" : "role";
  return `${prefix}_${owner}_${randomTokenPart()}`;
}
__name(defaultTokenFactory, "defaultTokenFactory");
function relayError(code, message, issues) {
  return {
    ok: false,
    error: {
      code,
      message,
      ...issues ? { issues } : {}
    }
  };
}
__name(relayError, "relayError");
function isTeamRole(value) {
  return typeof value === "string" && TEAM_ROLES.includes(value);
}
__name(isTeamRole, "isTeamRole");
function isArenaConfig(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const arena = value;
  const width = arena.width;
  const height = arena.height;
  const activeHazards = arena.activeHazards;
  return typeof arena.name === "string" && typeof width === "number" && Number.isInteger(width) && typeof height === "number" && Number.isInteger(height) && width > 0 && height > 0 && Array.isArray(activeHazards) && activeHazards.every((hazard) => typeof hazard === "string");
}
__name(isArenaConfig, "isArenaConfig");
function safeText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
__name(safeText, "safeText");
function safeMaxRounds(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_ROUNDS_LIMIT ? value : DEFAULT_MAX_ROUNDS;
}
__name(safeMaxRounds, "safeMaxRounds");
function safeTtlMs(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_SESSION_TTL_MS;
  }
  const ttlMs = Math.floor(value * 1e3);
  if (ttlMs < MIN_SESSION_TTL_MS || ttlMs > MAX_SESSION_TTL_MS) {
    return DEFAULT_SESSION_TTL_MS;
  }
  return ttlMs;
}
__name(safeTtlMs, "safeTtlMs");
function addMilliseconds(value, ms) {
  return new Date(Date.parse(value) + ms).toISOString();
}
__name(addMilliseconds, "addMilliseconds");
function mergeRateLimits(overrides) {
  return {
    claim: overrides?.claim ?? DEFAULT_RATE_LIMITS.claim,
    state: overrides?.state ?? DEFAULT_RATE_LIMITS.state,
    submit: overrides?.submit ?? DEFAULT_RATE_LIMITS.submit,
    chat: overrides?.chat ?? DEFAULT_RATE_LIMITS.chat,
    private_chat: overrides?.private_chat ?? DEFAULT_RATE_LIMITS.private_chat,
    referee_awards: overrides?.referee_awards ?? DEFAULT_RATE_LIMITS.referee_awards,
    reset_role: overrides?.reset_role ?? DEFAULT_RATE_LIMITS.reset_role
  };
}
__name(mergeRateLimits, "mergeRateLimits");
function rolePublicState(role) {
  return {
    role: role.role,
    claimed: Boolean(role.claimedAt),
    submitted: Boolean(role.submittedAt),
    wins: role.wins,
    losses: role.losses,
    winStreak: role.winStreak
  };
}
__name(rolePublicState, "rolePublicState");
function combatSummary(result2) {
  return {
    winner: result2.winner,
    reason: result2.reason,
    damage: result2.damage,
    remainingHealth: result2.remainingHealth
  };
}
__name(combatSummary, "combatSummary");
function nextActionForRole(state) {
  if (state.phase === "expired" || state.phase === "session_complete") {
    return "stop";
  }
  if (state.phase === "waiting_for_agents") {
    return "wait_for_opponent_claim";
  }
  if (state.phase === "submission_phase") {
    return state.submitted ? "wait_for_opponent_submission" : "submit_round_plan";
  }
  if (state.phase === "referee_awards") {
    return "wait_for_referee";
  }
  return "wait_for_next_round";
}
__name(nextActionForRole, "nextActionForRole");
function calculateInterest(unspentGold) {
  return Math.min(
    Math.floor(Math.max(0, unspentGold) * DEFAULT_INTEREST_RATE),
    DEFAULT_INTEREST_CAP
  );
}
__name(calculateInterest, "calculateInterest");
function generateRefereeAwardOptions(seed, round2) {
  const rng = createSeededRng(`${seed}:awards:${round2}`);
  const cards = [...REFEREE_AWARD_CARDS];
  const options = [];
  while (options.length < 3 && cards.length > 0) {
    const index = Math.floor(rng() * cards.length);
    const [card] = cards.splice(index, 1);
    options.push({
      id: `${card.id}-r${round2}`,
      title: card.title,
      description: card.description,
      gold: card.gold
    });
  }
  return options;
}
__name(generateRefereeAwardOptions, "generateRefereeAwardOptions");
function createSessionId() {
  return `s_${randomTokenPart().slice(0, 12)}`;
}
__name(createSessionId, "createSessionId");
var SessionCoordinator = class _SessionCoordinator {
  static {
    __name(this, "SessionCoordinator");
  }
  state;
  clock;
  tokenFactory;
  tokenHasher;
  rateLimits;
  pendingClaimTokens;
  pendingRefereeToken;
  constructor(state, options = {}) {
    this.state = state;
    this.state.rateLimits ??= {};
    this.state.awardOptions ??= [];
    this.state.awardHistory ??= [];
    this.state.chatLog ??= [];
    for (const role of TEAM_ROLES) {
      this.state.roles[role].wins ??= 0;
      this.state.roles[role].losses ??= 0;
      this.state.roles[role].winStreak ??= 0;
      this.state.roles[role].privateChatLog ??= [];
    }
    this.clock = options.clock ?? defaultClock;
    this.tokenFactory = options.tokenFactory ?? defaultTokenFactory;
    this.tokenHasher = options.tokenHasher ?? defaultTokenHasher;
    this.rateLimits = mergeRateLimits(options.rateLimits);
    this.pendingClaimTokens = options.pendingClaimTokens;
    this.pendingRefereeToken = options.pendingRefereeToken;
  }
  static async create(request = {}, options = {}) {
    const clock = options.clock ?? defaultClock;
    const tokenFactory = options.tokenFactory ?? defaultTokenFactory;
    const tokenHasher = options.tokenHasher ?? defaultTokenHasher;
    const now = clock();
    const sessionId = safeText(request.sessionId) ?? createSessionId();
    const seed = safeText(request.seed) ?? sessionId;
    const arena = isArenaConfig(request.arena) ? request.arena : DEFAULT_ARENA2;
    const claimTokens = {
      red: tokenFactory("red", "claim"),
      blue: tokenFactory("blue", "claim")
    };
    const refereeToken = tokenFactory("referee", "referee");
    const state = {
      id: sessionId,
      phase: "waiting_for_agents",
      round: 1,
      maxRounds: safeMaxRounds(request.maxRounds),
      seed,
      arena,
      createdAt: now,
      expiresAt: addMilliseconds(now, safeTtlMs(request.ttlSeconds)),
      updatedAt: now,
      roles: {
        red: {
          role: "red",
          claimTokenHash: await tokenHasher(claimTokens.red),
          gold: DEFAULT_STARTING_GOLD,
          wins: 0,
          losses: 0,
          winStreak: 0,
          inventory: [],
          privateChatLog: []
        },
        blue: {
          role: "blue",
          claimTokenHash: await tokenHasher(claimTokens.blue),
          gold: DEFAULT_STARTING_GOLD,
          wins: 0,
          losses: 0,
          winStreak: 0,
          inventory: [],
          privateChatLog: []
        }
      },
      refereeTokenHash: await tokenHasher(refereeToken),
      awardOptions: [],
      awardHistory: [],
      chatLog: [],
      rateLimits: {},
      eventLog: [
        {
          at: now,
          type: "session_created",
          message: `Session ${sessionId} opened for role claims.`
        }
      ]
    };
    return new _SessionCoordinator(state, {
      clock,
      tokenFactory,
      tokenHasher,
      rateLimits: options.rateLimits,
      pendingClaimTokens: claimTokens,
      pendingRefereeToken: refereeToken
    });
  }
  static fromState(state, options = {}) {
    return new _SessionCoordinator(cloneJson(state), options);
  }
  exportState() {
    return cloneJson(this.state);
  }
  createResponse() {
    if (!this.pendingClaimTokens || !this.pendingRefereeToken) {
      throw new Error("Capability tokens are only available immediately after session creation.");
    }
    const claimTokens = this.pendingClaimTokens;
    return {
      sessionId: this.state.id,
      phase: this.state.phase,
      invites: TEAM_ROLES.map((role) => ({
        role,
        claimToken: claimTokens[role],
        claimPath: `/sessions/${this.state.id}/claim`
      })),
      refereeToken: this.pendingRefereeToken,
      publicState: this.getPublicState()
    };
  }
  getPublicState() {
    this.expireIfNeeded();
    return cloneJson({
      sessionId: this.state.id,
      stateVersion: this.stateVersion(),
      phase: this.state.phase,
      round: this.state.round,
      maxRounds: this.state.maxRounds,
      expiresAt: this.state.expiresAt,
      arena: this.state.arena,
      roles: {
        red: rolePublicState(this.state.roles.red),
        blue: rolePublicState(this.state.roles.blue)
      },
      replayAvailable: Boolean(this.state.replay),
      ...this.state.awardOptions.length > 0 ? { awardOptions: this.state.awardOptions } : {},
      ...this.state.lastResult ? { lastResult: this.state.lastResult } : {},
      chatLog: this.state.chatLog,
      eventLog: this.state.eventLog
    });
  }
  async claimRole(request) {
    if (!isTeamRole(request.role)) {
      return relayError("INVALID_ROLE", "Claim request must choose red or blue.");
    }
    const now = this.clock();
    const activeError = this.requireActive(now);
    if (activeError) {
      return activeError;
    }
    const rateLimitError = this.takeRateLimit("claim", request.role, now);
    if (rateLimitError) {
      return rateLimitError;
    }
    const role = this.state.roles[request.role];
    if (role.claimedAt) {
      return relayError("ROLE_ALREADY_CLAIMED", `${request.role} has already been claimed.`);
    }
    if (await this.tokenHasher(request.claimToken) !== role.claimTokenHash) {
      return relayError("INVALID_TOKEN", "Claim token does not match the requested role.");
    }
    role.claimedAt = now;
    const roleToken = this.tokenFactory(request.role, "role");
    role.roleTokenHash = await this.tokenHasher(roleToken);
    if (request.agentName?.trim()) {
      role.agentName = request.agentName.trim().slice(0, 80);
    }
    this.touch(now);
    this.appendEvent("role_claimed", `${request.role} role claimed.`, now);
    this.advanceClaimPhase(now);
    return {
      ok: true,
      value: {
        sessionId: this.state.id,
        role: request.role,
        roleToken,
        state: this.buildRoleState(role)
      }
    };
  }
  // CODEX_INTENT: let external agents use one stable invite player key to claim or resume a role.
  // CODEX_RISK: interface
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  async bootstrapRole(roleName, playerKey, request = {}) {
    const validation = validateAgentBootstrapRequestShape(request);
    if (!validation.ok) {
      return relayError(
        "INVALID_REQUEST",
        "Bootstrap request failed validation.",
        validation.issues
      );
    }
    const now = this.clock();
    const activeError = this.requireActive(now);
    if (activeError) {
      return activeError;
    }
    const role = this.state.roles[roleName];
    const rateLimitAction = role.claimedAt ? "state" : "claim";
    const rateLimitError = this.takeRateLimit(rateLimitAction, roleName, now);
    if (rateLimitError) {
      return rateLimitError;
    }
    const auth = await this.findRoleBearer(roleName, playerKey, {
      allowUnclaimedClaimKey: true
    });
    if (!auth) {
      return role.claimedAt ? relayError("ROLE_ALREADY_CLAIMED", `${roleName} has already been claimed by another player key.`) : relayError("INVALID_TOKEN", "Player key does not match the requested role.");
    }
    let claimedNow = false;
    if (!auth.role.claimedAt) {
      auth.role.claimedAt = now;
      claimedNow = true;
      if (request.agentName?.trim()) {
        auth.role.agentName = request.agentName.trim().slice(0, 80);
      }
      this.touch(now);
      this.appendEvent("role_claimed", `${roleName} role claimed.`, now);
      this.advanceClaimPhase(now);
    }
    const state = this.buildRoleState(auth.role);
    return {
      ok: true,
      value: {
        sessionId: this.state.id,
        role: roleName,
        claimedNow,
        state,
        publicState: this.getPublicState(),
        nextAction: nextActionForRole(state)
      }
    };
  }
  async getRoleStateForToken(roleToken) {
    const now = this.clock();
    const activeError = this.requireActive(now);
    if (activeError) {
      return activeError;
    }
    const role = await this.findRoleByToken(roleToken);
    const rateLimitError = this.takeRateLimit("state", role?.role ?? "invalid", now);
    if (rateLimitError) {
      return rateLimitError;
    }
    if (!role) {
      return relayError("INVALID_TOKEN", "Role bearer token is missing or invalid.");
    }
    return {
      ok: true,
      value: this.buildRoleState(role)
    };
  }
  async submitRoundPlan(roleToken, submission) {
    const now = this.clock();
    const activeError = this.requireActive(now);
    if (activeError) {
      return activeError;
    }
    const role = await this.findRoleByToken(roleToken);
    const rateLimitError = this.takeRateLimit("submit", role?.role ?? "invalid", now);
    if (rateLimitError) {
      return rateLimitError;
    }
    if (!role) {
      return relayError("INVALID_TOKEN", "Role bearer token is missing or invalid.");
    }
    if (role.submittedAt) {
      return relayError("ALREADY_SUBMITTED", `${role.role} already submitted this round.`);
    }
    if (this.state.phase !== "submission_phase") {
      return relayError(
        "PHASE_CLOSED",
        `Round plans are only accepted during submission_phase; current phase is ${this.state.phase}.`
      );
    }
    const validation = validateRoundSubmission({
      gold: role.gold,
      inventory: role.inventory,
      submission
    });
    if (!validation.ok) {
      return relayError("SUBMISSION_INVALID", "Round plan failed validation.", validation.issues);
    }
    role.submissionBaseline = {
      gold: role.gold,
      inventory: cloneJson(role.inventory)
    };
    role.gold = validation.goldRemaining;
    role.inventory = validation.inventory;
    role.controls = validation.controls;
    role.submission = cloneJson(submission);
    role.submittedAt = now;
    this.touch(now);
    this.appendChatMessages(role, submission.chat ?? [], now);
    this.appendEvent("round_plan_submitted", `${role.role} submitted a round plan.`, now);
    this.resolveIfReady(now);
    return {
      ok: true,
      value: {
        state: this.buildRoleState(role),
        publicState: this.getPublicState()
      }
    };
  }
  async submitChatMessage(roleToken, request) {
    const now = this.clock();
    const activeError = this.requireActive(now);
    if (activeError) {
      return activeError;
    }
    const role = await this.findRoleByToken(roleToken);
    const rateLimitError = this.takeRateLimit("chat", role?.role ?? "invalid", now);
    if (rateLimitError) {
      return rateLimitError;
    }
    if (!role) {
      return relayError("INVALID_TOKEN", "Role bearer token is missing or invalid.");
    }
    const validation = validateAgentChatMessageRequestShape(request);
    if (!validation.ok) {
      return relayError("INVALID_REQUEST", "Chat message failed validation.", validation.issues);
    }
    const [message] = this.appendChatMessages(
      role,
      [request],
      now
    );
    this.touch(now);
    return {
      ok: true,
      value: {
        message,
        state: this.buildRoleState(role),
        publicState: this.getPublicState()
      }
    };
  }
  async submitPrivateChatMessage(roleToken, request) {
    const now = this.clock();
    const activeError = this.requireActive(now);
    if (activeError) {
      return activeError;
    }
    const role = await this.findRoleByToken(roleToken);
    const rateLimitError = this.takeRateLimit("private_chat", role?.role ?? "invalid", now);
    if (rateLimitError) {
      return rateLimitError;
    }
    if (!role) {
      return relayError("INVALID_TOKEN", "Role bearer token is missing or invalid.");
    }
    const validation = validateAgentChatMessageRequestShape(request);
    if (!validation.ok) {
      return relayError("INVALID_REQUEST", "Private chat message failed validation.", validation.issues);
    }
    const [message] = this.appendPrivateChatMessages(
      role,
      [request],
      now
    );
    return {
      ok: true,
      value: {
        message,
        state: this.buildRoleState(role)
      }
    };
  }
  async submitRefereeAwards(refereeToken, request) {
    const now = this.clock();
    const activeError = this.requireActive(now);
    if (activeError) {
      return activeError;
    }
    const hasRefereeToken = await this.hasRefereeToken(refereeToken);
    const rateLimitError = this.takeRateLimit(
      "referee_awards",
      hasRefereeToken ? "referee" : "invalid",
      now
    );
    if (rateLimitError) {
      return rateLimitError;
    }
    if (!hasRefereeToken) {
      return relayError("INVALID_TOKEN", "Referee capability token is missing or invalid.");
    }
    if (this.state.phase !== "referee_awards") {
      return relayError(
        "PHASE_CLOSED",
        `Referee awards are only accepted during referee_awards; current phase is ${this.state.phase}.`
      );
    }
    if (!this.state.lastResult) {
      return relayError("INVALID_REQUEST", "Combat result is required before awards can be applied.");
    }
    const validation = validateSubmitRefereeAwardsRequestShape(
      request,
      this.state.awardOptions
    );
    if (!validation.ok) {
      return relayError("SUBMISSION_INVALID", "Referee awards failed validation.", validation.issues);
    }
    const selections = cloneJson(request.awards);
    const appliedAwards = this.applyAwardsAndAdvance(selections, now);
    return {
      ok: true,
      value: {
        appliedAwards,
        publicState: this.getPublicState()
      }
    };
  }
  async resetRole(refereeToken, request) {
    const now = this.clock();
    const activeError = this.requireActive(now);
    if (activeError) {
      return activeError;
    }
    const hasRefereeToken = await this.hasRefereeToken(refereeToken);
    const rateLimitError = this.takeRateLimit(
      "reset_role",
      hasRefereeToken ? "referee" : "invalid",
      now
    );
    if (rateLimitError) {
      return rateLimitError;
    }
    if (!hasRefereeToken) {
      return relayError("INVALID_TOKEN", "Referee capability token is missing or invalid.");
    }
    const validation = validateRoleResetRequestShape(request);
    if (!validation.ok) {
      return relayError("INVALID_REQUEST", "Role reset request failed validation.", validation.issues);
    }
    if (this.state.phase !== "waiting_for_agents" && this.state.phase !== "submission_phase") {
      return relayError(
        "PHASE_CLOSED",
        `Roles can be reset only before combat resolves; current phase is ${this.state.phase}.`
      );
    }
    const roleName = request.role;
    const role = this.state.roles[roleName];
    if (role.submittedAt) {
      if (!role.submissionBaseline) {
        return relayError(
          "INVALID_REQUEST",
          `${role.role} cannot be reset because its accepted submission cannot be rolled back.`
        );
      }
      role.gold = role.submissionBaseline.gold;
      role.inventory = cloneJson(role.submissionBaseline.inventory);
    }
    const claimToken = this.tokenFactory(roleName, "claim");
    role.claimTokenHash = await this.tokenHasher(claimToken);
    role.roleTokenHash = void 0;
    role.agentName = void 0;
    role.claimedAt = void 0;
    role.submittedAt = void 0;
    role.controls = void 0;
    role.submission = void 0;
    role.submissionBaseline = void 0;
    role.privateChatLog = [];
    this.touch(now);
    this.appendEvent("role_reset", `${roleName} role reset by referee.`, now);
    if (this.state.phase === "submission_phase") {
      this.changePhase("waiting_for_agents", `${roleName} role needs a fresh claim.`, now);
    }
    return {
      ok: true,
      value: {
        invite: {
          role: roleName,
          claimToken,
          claimPath: `/sessions/${this.state.id}/claim`
        },
        publicState: this.getPublicState()
      }
    };
  }
  getReplay() {
    const activeError = this.requireActive();
    if (activeError) {
      return activeError;
    }
    if (!this.state.replay) {
      return relayError("REPLAY_NOT_AVAILABLE", "Replay is available after both plans resolve.");
    }
    return {
      ok: true,
      value: cloneJson(this.state.replay)
    };
  }
  buildRoleState(role) {
    const opponent = role.role === "red" ? this.state.roles.blue : this.state.roles.red;
    return cloneJson({
      sessionId: this.state.id,
      stateVersion: this.stateVersion(),
      role: role.role,
      phase: this.state.phase,
      round: this.state.round,
      expiresAt: this.state.expiresAt,
      gold: role.gold,
      wins: role.wins,
      losses: role.losses,
      winStreak: role.winStreak,
      inventory: role.inventory,
      ...role.controls ? { controls: role.controls } : {},
      submitted: Boolean(role.submittedAt),
      ...role.submission ? { ownSubmission: role.submission } : {},
      opponent: rolePublicState(opponent),
      replayAvailable: Boolean(this.state.replay),
      ...this.state.awardOptions.length > 0 ? { awardOptions: this.state.awardOptions } : {},
      ...this.state.awardHistory.length > 0 ? { awardHistory: this.state.awardHistory } : {},
      ...this.state.lastResult ? { lastResult: this.state.lastResult } : {},
      chatLog: this.state.chatLog,
      privateChatLog: role.privateChatLog,
      eventLog: this.state.eventLog
    });
  }
  async findRoleByToken(roleToken) {
    const auth = await this.findAnyRoleBearer(roleToken);
    return auth?.role;
  }
  async findAnyRoleBearer(roleToken) {
    if (!roleToken.trim()) {
      return void 0;
    }
    const roleTokenHash = await this.tokenHasher(roleToken);
    for (const roleName of TEAM_ROLES) {
      const role = this.state.roles[roleName];
      const auth = this.matchRoleBearer(role, roleTokenHash, {
        allowUnclaimedClaimKey: false
      });
      if (auth) {
        return auth;
      }
    }
    return void 0;
  }
  async findRoleBearer(roleName, token, options) {
    if (!token.trim()) {
      return void 0;
    }
    const tokenHash = await this.tokenHasher(token);
    return this.matchRoleBearer(this.state.roles[roleName], tokenHash, options);
  }
  matchRoleBearer(role, tokenHash, options) {
    if (role.roleTokenHash === tokenHash) {
      return { role };
    }
    if ((role.claimedAt || options.allowUnclaimedClaimKey) && role.claimTokenHash === tokenHash) {
      return { role };
    }
    return void 0;
  }
  async hasRefereeToken(refereeToken) {
    if (!refereeToken.trim() || !this.state.refereeTokenHash) {
      return false;
    }
    return await this.tokenHasher(refereeToken) === this.state.refereeTokenHash;
  }
  applyAwardsAndAdvance(selections, now) {
    const optionById = new Map(this.state.awardOptions.map((option) => [option.id, option]));
    const appliedAwards = selections.map((selection) => {
      const option = optionById.get(selection.awardId);
      return {
        awardId: selection.awardId,
        targetTeam: selection.targetTeam,
        round: this.state.round,
        title: option.title,
        gold: option.gold
      };
    });
    this.state.awardHistory.push(...appliedAwards);
    this.appendEvent(
      "referee_awards_submitted",
      `${appliedAwards.length} referee award${appliedAwards.length === 1 ? "" : "s"} accepted.`,
      now
    );
    this.changePhase("apply_awards", "Referee awards accepted.", now);
    this.applyCombatResultToScore();
    if (this.shouldCompleteMatch()) {
      this.completeMatch(now);
      return appliedAwards;
    }
    this.advanceToNextRound(appliedAwards, now);
    return appliedAwards;
  }
  applyCombatResultToScore() {
    const result2 = this.state.lastResult;
    if (!result2) {
      return;
    }
    if (result2.winner === "draw") {
      for (const role of TEAM_ROLES) {
        this.state.roles[role].winStreak = 0;
      }
      return;
    }
    const winner = this.state.roles[result2.winner];
    const loserRole = result2.winner === "red" ? "blue" : "red";
    const loser = this.state.roles[loserRole];
    winner.wins += 1;
    winner.winStreak += 1;
    loser.losses += 1;
    loser.winStreak = 0;
  }
  shouldCompleteMatch() {
    return TEAM_ROLES.some(
      (role) => this.state.roles[role].winStreak >= DEFAULT_WIN_STREAK_TARGET
    ) || this.state.round >= this.state.maxRounds;
  }
  completeMatch(now) {
    const red = this.state.roles.red;
    const blue = this.state.roles.blue;
    const winner = red.wins === blue.wins ? "draw" : red.wins > blue.wins ? "red" : "blue";
    const streakWinner = TEAM_ROLES.find(
      (role) => this.state.roles[role].winStreak >= DEFAULT_WIN_STREAK_TARGET
    );
    const finalWinner = streakWinner ?? winner;
    const reason = streakWinner ? `${streakWinner} reached a ${DEFAULT_WIN_STREAK_TARGET}-win streak.` : `Max rounds reached with score Red ${red.wins} - Blue ${blue.wins}.`;
    this.state.awardOptions = [];
    this.appendEvent("session_completed", reason, now);
    this.changePhase("session_complete", `Session complete: ${finalWinner}.`, now);
  }
  advanceToNextRound(appliedAwards, now) {
    const awardGold = TEAM_ROLES.reduce(
      (totals, role) => {
        totals[role] = appliedAwards.filter((award) => award.targetTeam === role).reduce((total, award) => total + award.gold, 0);
        return totals;
      },
      { red: 0, blue: 0 }
    );
    for (const role of TEAM_ROLES) {
      const team = this.state.roles[role];
      const interest = calculateInterest(team.gold);
      team.gold += DEFAULT_BASE_INCOME + interest + awardGold[role];
      team.controls = void 0;
      team.submission = void 0;
      team.submittedAt = void 0;
      team.submissionBaseline = void 0;
    }
    this.state.round += 1;
    this.state.replay = void 0;
    this.state.awardOptions = [];
    this.appendEvent("economy_applied", `Round ${this.state.round} economy applied.`, now);
    this.changePhase("submission_phase", `Round ${this.state.round} plans are open.`, now);
  }
  expireIfNeeded(now = this.clock()) {
    if (this.state.phase === "expired") {
      return false;
    }
    if (Date.parse(now) <= Date.parse(this.state.expiresAt)) {
      return false;
    }
    this.changePhase("expired", "Session expired.", now);
    return true;
  }
  requireActive(now = this.clock()) {
    this.expireIfNeeded(now);
    if (this.state.phase !== "expired") {
      return void 0;
    }
    return relayError("SESSION_EXPIRED", "Session has expired.");
  }
  takeRateLimit(action, key, now) {
    const rule = this.rateLimits[action];
    const bucketKey = `${action}:${key}`;
    const current = this.state.rateLimits[bucketKey];
    const nowMs = Date.parse(now);
    if (!current || Date.parse(current.resetAt) <= nowMs) {
      this.state.rateLimits[bucketKey] = {
        count: 1,
        resetAt: addMilliseconds(now, rule.windowMs)
      };
      return void 0;
    }
    if (current.count >= rule.max) {
      return relayError(
        "RATE_LIMITED",
        `${action} rate limit exceeded. Try again after ${current.resetAt}.`
      );
    }
    current.count += 1;
    return void 0;
  }
  advanceClaimPhase(now) {
    const bothClaimed = TEAM_ROLES.every((role) => this.state.roles[role].claimedAt);
    if (bothClaimed && this.state.phase === "waiting_for_agents") {
      this.changePhase("submission_phase", "Both roles claimed; round plans are open.", now);
    }
  }
  resolveIfReady(now) {
    const red = this.state.roles.red;
    const blue = this.state.roles.blue;
    if (!red.submission || !blue.submission) {
      return;
    }
    this.changePhase("submissions_locked", "Both round plans accepted.", now);
    const result2 = resolveCombat({
      round: this.state.round,
      seed: `${this.state.id}:${this.state.seed}`,
      arena: this.state.arena,
      red: {
        blueprint: red.submission.blueprint,
        turnPlan: red.submission.turnPlan
      },
      blue: {
        blueprint: blue.submission.blueprint,
        turnPlan: blue.submission.turnPlan
      }
    });
    this.state.replay = {
      ...result2.replay,
      botBlueprints: {
        red: cloneJson(red.submission.blueprint),
        blue: cloneJson(blue.submission.blueprint)
      }
    };
    this.state.lastResult = combatSummary(result2);
    this.state.awardOptions = generateRefereeAwardOptions(
      `${this.state.id}:${this.state.seed}`,
      this.state.round
    );
    this.appendEvent("combat_resolved", result2.reason, now);
    this.changePhase("combat_resolved", "Combat result recorded.", now);
    this.changePhase("replay_phase", "Replay timeline is available.", now);
    this.changePhase("referee_awards", "Referee award options are ready.", now);
  }
  changePhase(phase, message, at) {
    this.state.phase = phase;
    this.touch(at);
    this.appendEvent("phase_changed", message, at);
  }
  appendEvent(type, message, at = this.clock()) {
    this.state.eventLog.push({ at, type, message });
  }
  appendChatMessages(role, requests, at) {
    const messages = requests.map((request, index) => {
      const message = safeText(request.message);
      return {
        id: `${this.state.id}:chat:${this.state.chatLog.length + index + 1}`,
        at,
        round: this.state.round,
        phase: this.state.phase,
        role: role.role,
        ...role.agentName ? { agentName: role.agentName } : {},
        kind: request.kind ?? "observation",
        message
      };
    });
    this.state.chatLog.push(...messages);
    return cloneJson(messages);
  }
  appendPrivateChatMessages(role, requests, at) {
    const messages = requests.map((request, index) => {
      const message = safeText(request.message);
      return {
        id: `${this.state.id}:${role.role}:private-chat:${role.privateChatLog.length + index + 1}`,
        at,
        round: this.state.round,
        phase: this.state.phase,
        role: role.role,
        ...role.agentName ? { agentName: role.agentName } : {},
        kind: request.kind ?? "observation",
        message
      };
    });
    role.privateChatLog.push(...messages);
    return cloneJson(messages);
  }
  touch(at = this.clock()) {
    this.state.updatedAt = at;
  }
  stateVersion() {
    return [
      this.state.updatedAt,
      this.state.phase,
      this.state.round,
      this.state.roles.red.submittedAt ? "red-submitted" : "red-open",
      this.state.roles.blue.submittedAt ? "blue-submitted" : "blue-open",
      this.state.eventLog.length,
      this.state.chatLog.length
    ].join("|");
  }
};

// apps/worker/src/index.ts
var STORAGE_KEY = "agent-arena-session";
var SESSION_ID_PATTERN2 = /^s_[A-Za-z0-9_-]{1,64}$/;
var DEFAULT_ALLOWED_CORS_ORIGINS = ["https://arena.dorbii.net"];
var LOCAL_DEV_CORS_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
var MAX_JSON_BODY_BYTES = 64 * 1024;
var BODY_TOO_LARGE = /* @__PURE__ */ Symbol("BODY_TOO_LARGE");
var textDecoder = new TextDecoder();
function normalizeConfiguredOrigin(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return void 0;
  }
  try {
    const originValue = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(originValue).origin;
  } catch {
    return void 0;
  }
}
__name(normalizeConfiguredOrigin, "normalizeConfiguredOrigin");
function configuredCorsOrigins(env) {
  const origins = new Set(
    DEFAULT_ALLOWED_CORS_ORIGINS.map(normalizeConfiguredOrigin).filter((origin) => Boolean(origin))
  );
  for (const value of env.AGENT_ARENA_ALLOWED_ORIGINS?.split(/[\s,]+/) ?? []) {
    const origin = normalizeConfiguredOrigin(value);
    if (origin) {
      origins.add(origin);
    }
  }
  return origins;
}
__name(configuredCorsOrigins, "configuredCorsOrigins");
function allowedCorsOrigin(request, env) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) {
    return void 0;
  }
  try {
    const origin = new URL(originHeader);
    if ((origin.protocol === "http:" || origin.protocol === "https:") && LOCAL_DEV_CORS_HOSTS.has(origin.hostname)) {
      return origin.origin;
    }
    if (configuredCorsOrigins(env).has(origin.origin)) {
      return origin.origin;
    }
  } catch {
    return void 0;
  }
  return void 0;
}
__name(allowedCorsOrigin, "allowedCorsOrigin");
function appendVaryOrigin(headers) {
  const vary = headers.get("vary");
  if (!vary) {
    headers.set("vary", "Origin");
    return;
  }
  if (!vary.split(",").some((value) => value.trim().toLowerCase() === "origin")) {
    headers.set("vary", `${vary}, Origin`);
  }
}
__name(appendVaryOrigin, "appendVaryOrigin");
function corsHeaders(request, env = {}, headersInit) {
  const headers = new Headers(headersInit);
  const origin = request ? allowedCorsOrigin(request, env) : void 0;
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    appendVaryOrigin(headers);
  }
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set("access-control-allow-headers", "authorization, content-type");
  headers.set("access-control-max-age", "86400");
  return headers;
}
__name(corsHeaders, "corsHeaders");
function withCors(response, request, env) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: corsHeaders(request, env, response.headers)
  });
}
__name(withCors, "withCors");
function jsonResponse(value, init = {}, request, env) {
  const headers = corsHeaders(request, env, init.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(value, null, 2), {
    ...init,
    headers
  });
}
__name(jsonResponse, "jsonResponse");
function preflightResponse(request, env) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env)
  });
}
__name(preflightResponse, "preflightResponse");
function errorResponse(status, code, message, issues, request, env) {
  return jsonResponse(
    {
      ok: false,
      error: {
        code,
        message,
        ...issues ? { issues } : {}
      }
    },
    { status },
    request,
    env
  );
}
__name(errorResponse, "errorResponse");
function contentLengthTooLarge(request) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return false;
  }
  const parsedLength = Number(contentLength);
  return Number.isFinite(parsedLength) && parsedLength > MAX_JSON_BODY_BYTES;
}
__name(contentLengthTooLarge, "contentLengthTooLarge");
async function readRequestText(request) {
  if (contentLengthTooLarge(request)) {
    return BODY_TOO_LARGE;
  }
  if (!request.body) {
    return "";
  }
  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    totalBytes += value.byteLength;
    if (totalBytes > MAX_JSON_BODY_BYTES) {
      try {
        await reader.cancel();
      } catch {
      }
      return BODY_TOO_LARGE;
    }
    chunks.push(value);
  }
  if (chunks.length === 0) {
    return "";
  }
  if (chunks.length === 1) {
    return textDecoder.decode(chunks[0]);
  }
  const bodyBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return textDecoder.decode(bodyBytes);
}
__name(readRequestText, "readRequestText");
async function readJsonBody(request) {
  const text = await readRequestText(request);
  if (isBodyTooLarge(text)) {
    return BODY_TOO_LARGE;
  }
  if (text.trim().length === 0) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return void 0;
  }
}
__name(readJsonBody, "readJsonBody");
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
__name(isRecord2, "isRecord");
function isSessionId(value) {
  return SESSION_ID_PATTERN2.test(value);
}
__name(isSessionId, "isSessionId");
function requestWithJson(request, url, body) {
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  return new Request(url, {
    method: request.method,
    headers,
    body: JSON.stringify(body)
  });
}
__name(requestWithJson, "requestWithJson");
function bearerToken(request) {
  const authorization = request.headers.get("authorization");
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? "");
  return match?.[1];
}
__name(bearerToken, "bearerToken");
function sessionRoute(pathname) {
  const match = /^\/sessions\/([^/]+)\/([^/]+)$/.exec(pathname);
  if (!match) {
    return void 0;
  }
  let sessionId = "";
  try {
    sessionId = decodeURIComponent(match[1]);
  } catch {
    sessionId = "";
  }
  return {
    sessionId,
    action: match[2]
  };
}
__name(sessionRoute, "sessionRoute");
function sessionRoleRoute(pathname) {
  const match = /^\/sessions\/([^/]+)\/roles\/([^/]+)\/([^/]+)$/.exec(pathname);
  if (!match) {
    return void 0;
  }
  let sessionId = "";
  let role = "";
  try {
    sessionId = decodeURIComponent(match[1]);
    role = decodeURIComponent(match[2]);
  } catch {
    sessionId = "";
    role = "";
  }
  if (!isTeamRole2(role)) {
    return void 0;
  }
  return {
    sessionId,
    role,
    action: match[3]
  };
}
__name(sessionRoleRoute, "sessionRoleRoute");
function isTeamRole2(value) {
  return typeof value === "string" && TEAM_ROLES.includes(value);
}
__name(isTeamRole2, "isTeamRole");
function isBodyTooLarge(value) {
  return value === BODY_TOO_LARGE;
}
__name(isBodyTooLarge, "isBodyTooLarge");
function bodyTooLargeResponse(request, env) {
  return errorResponse(
    413,
    "INVALID_REQUEST",
    `JSON request body must be ${MAX_JSON_BODY_BYTES} bytes or smaller.`,
    void 0,
    request,
    env
  );
}
__name(bodyTooLargeResponse, "bodyTooLargeResponse");
function statusForRelayError(error) {
  switch (error.code) {
    case "BAD_JSON":
    case "INVALID_ACTION":
    case "INVALID_REQUEST":
    case "INVALID_ROLE":
    case "SUBMISSION_INVALID":
      return 400;
    case "INVALID_TOKEN":
      return 401;
    case "SESSION_NOT_FOUND":
    case "REPLAY_NOT_AVAILABLE":
      return 404;
    case "SESSION_EXPIRED":
      return 410;
    case "ROLE_ALREADY_CLAIMED":
    case "SESSION_EXISTS":
    case "PHASE_CLOSED":
    case "ALREADY_SUBMITTED":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "WORKER_NOT_CONFIGURED":
      return 500;
  }
}
__name(statusForRelayError, "statusForRelayError");
async function forwardToSessionObject(request, env, sessionId) {
  if (!env.AGENT_ARENA_SESSION) {
    return errorResponse(
      500,
      "WORKER_NOT_CONFIGURED",
      "AGENT_ARENA_SESSION Durable Object binding is missing.",
      void 0,
      request,
      env
    );
  }
  const id = env.AGENT_ARENA_SESSION.idFromName(sessionId);
  const stub = env.AGENT_ARENA_SESSION.get(id);
  return withCors(await stub.fetch(request), request, env);
}
__name(forwardToSessionObject, "forwardToSessionObject");
async function handleWorkerRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return preflightResponse(request, env);
  }
  if (request.method === "GET" && url.pathname === "/agent-spec.json") {
    return jsonResponse(createAgentContract({ partCatalog: PART_CATALOG }), {}, request, env);
  }
  if (request.method === "POST" && url.pathname === "/sessions") {
    const body = await readJsonBody(request);
    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse(request, env);
    }
    if (body === void 0 || !isRecord2(body)) {
      return errorResponse(400, "BAD_JSON", "Create session body must be JSON.", void 0, request, env);
    }
    const validation = validateCreateSessionRequestShape(body);
    if (!validation.ok) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "Create session request failed validation.",
        validation.issues,
        request,
        env
      );
    }
    const sessionId = typeof body.sessionId === "string" && body.sessionId.trim().length > 0 ? body.sessionId.trim() : createSessionId();
    if (!isSessionId(sessionId)) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "Session id must start with s_ and contain only letters, numbers, underscores, or hyphens.",
        void 0,
        request,
        env
      );
    }
    const internalUrl = new URL(request.url);
    internalUrl.pathname = `/sessions/${encodeURIComponent(sessionId)}/create`;
    return forwardToSessionObject(
      requestWithJson(request, internalUrl, { ...body, sessionId }),
      env,
      sessionId
    );
  }
  const roleRoute = sessionRoleRoute(url.pathname);
  if (roleRoute) {
    if (!isSessionId(roleRoute.sessionId)) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "Session id must start with s_ and contain only letters, numbers, underscores, or hyphens.",
        void 0,
        request,
        env
      );
    }
    return forwardToSessionObject(request, env, roleRoute.sessionId);
  }
  const route = sessionRoute(url.pathname);
  if (route) {
    if (!isSessionId(route.sessionId)) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "Session id must start with s_ and contain only letters, numbers, underscores, or hyphens.",
        void 0,
        request,
        env
      );
    }
    if (route.action === "create") {
      return errorResponse(404, "INVALID_ACTION", "Unsupported session action.", void 0, request, env);
    }
    return forwardToSessionObject(request, env, route.sessionId);
  }
  return errorResponse(404, "INVALID_REQUEST", "Route not found.", void 0, request, env);
}
__name(handleWorkerRequest, "handleWorkerRequest");
var AgentArenaSession = class {
  static {
    __name(this, "AgentArenaSession");
  }
  state;
  constructor(state) {
    this.state = state;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const roleRoute = sessionRoleRoute(url.pathname);
    if (roleRoute) {
      if (!isSessionId(roleRoute.sessionId)) {
        return errorResponse(
          400,
          "INVALID_REQUEST",
          "Session id must start with s_ and contain only letters, numbers, underscores, or hyphens."
        );
      }
      const coordinator2 = await this.loadSession();
      if (!coordinator2) {
        return errorResponse(404, "SESSION_NOT_FOUND", "Session has not been created.");
      }
      if (roleRoute.action === "bootstrap" && request.method === "POST") {
        return this.bootstrapRole(request, coordinator2, roleRoute.role);
      }
      return errorResponse(404, "INVALID_ACTION", "Unsupported role session action.");
    }
    const route = sessionRoute(url.pathname);
    if (!route) {
      return errorResponse(404, "INVALID_REQUEST", "Session route not found.");
    }
    if (!isSessionId(route.sessionId)) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "Session id must start with s_ and contain only letters, numbers, underscores, or hyphens."
      );
    }
    if (route.action === "create" && request.method === "POST") {
      return this.createSession(request, route.sessionId);
    }
    const coordinator = await this.loadSession();
    if (!coordinator) {
      return errorResponse(404, "SESSION_NOT_FOUND", "Session has not been created.");
    }
    if (route.action === "claim" && request.method === "POST") {
      return this.claimRole(request, coordinator);
    }
    if (route.action === "public" && request.method === "GET") {
      const publicState = coordinator.getPublicState();
      await this.saveSession(coordinator);
      return jsonResponse(publicState);
    }
    if (route.action === "state" && request.method === "GET") {
      const result2 = await coordinator.getRoleStateForToken(bearerToken(request) ?? "");
      await this.saveSession(coordinator);
      if (!result2.ok) {
        return jsonResponse(result2, { status: statusForRelayError(result2.error) });
      }
      return jsonResponse(result2.value);
    }
    if (route.action === "round-plan" && request.method === "POST") {
      return this.submitRoundPlan(request, coordinator);
    }
    if (route.action === "chat" && request.method === "POST") {
      return this.submitChatMessage(request, coordinator);
    }
    if (route.action === "private-chat" && request.method === "POST") {
      return this.submitPrivateChatMessage(request, coordinator);
    }
    if (route.action === "referee-awards" && request.method === "POST") {
      return this.submitRefereeAwards(request, coordinator);
    }
    if (route.action === "reset-role" && request.method === "POST") {
      return this.resetRole(request, coordinator);
    }
    if (route.action === "replay" && request.method === "GET") {
      const result2 = coordinator.getReplay();
      await this.saveSession(coordinator);
      if (!result2.ok) {
        return jsonResponse(result2, { status: statusForRelayError(result2.error) });
      }
      return jsonResponse(result2.value);
    }
    return errorResponse(404, "INVALID_ACTION", "Unsupported session action.");
  }
  async createSession(request, sessionId) {
    const existing = await this.loadSession();
    if (existing) {
      return errorResponse(409, "SESSION_EXISTS", "Session already exists.");
    }
    const body = await readJsonBody(request);
    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse();
    }
    if (body === void 0 || !isRecord2(body)) {
      return errorResponse(400, "BAD_JSON", "Create session body must be JSON.");
    }
    const validation = validateCreateSessionRequestShape(body);
    if (!validation.ok) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "Create session request failed validation.",
        validation.issues
      );
    }
    const coordinator = await SessionCoordinator.create({
      ...body,
      sessionId
    });
    await this.saveSession(coordinator);
    return jsonResponse(coordinator.createResponse(), { status: 201 });
  }
  async claimRole(request, coordinator) {
    const body = await readJsonBody(request);
    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse();
    }
    if (body === void 0 || !isRecord2(body)) {
      return errorResponse(400, "BAD_JSON", "Claim request body must be JSON.");
    }
    const validation = validateRoleClaimRequestShape(body);
    if (!validation.ok) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "Claim request failed validation.",
        validation.issues
      );
    }
    const result2 = await coordinator.claimRole(body);
    await this.saveSession(coordinator);
    if (!result2.ok) {
      return jsonResponse(result2, { status: statusForRelayError(result2.error) });
    }
    return jsonResponse(result2.value, { status: 201 });
  }
  // CODEX_INTENT: expose an idempotent player-key bootstrap path for non-browser agents.
  // CODEX_RISK: interface
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  async bootstrapRole(request, coordinator, role) {
    const body = await readJsonBody(request);
    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse();
    }
    if (body === void 0 || !isRecord2(body)) {
      return errorResponse(400, "BAD_JSON", "Bootstrap request body must be JSON.");
    }
    const validation = validateAgentBootstrapRequestShape(body);
    if (!validation.ok) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "Bootstrap request failed validation.",
        validation.issues
      );
    }
    const result2 = await coordinator.bootstrapRole(
      role,
      bearerToken(request) ?? "",
      body
    );
    await this.saveSession(coordinator);
    if (!result2.ok) {
      return jsonResponse(result2, { status: statusForRelayError(result2.error) });
    }
    return jsonResponse(result2.value, { status: result2.value.claimedNow ? 201 : 200 });
  }
  async submitRoundPlan(request, coordinator) {
    const body = await readJsonBody(request);
    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse();
    }
    if (body === void 0) {
      return errorResponse(400, "BAD_JSON", "Round plan body must be JSON.");
    }
    const result2 = await coordinator.submitRoundPlan(bearerToken(request) ?? "", body);
    await this.saveSession(coordinator);
    if (!result2.ok) {
      return jsonResponse(result2, { status: statusForRelayError(result2.error) });
    }
    return jsonResponse(result2.value);
  }
  async submitChatMessage(request, coordinator) {
    const body = await readJsonBody(request);
    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse();
    }
    if (body === void 0) {
      return errorResponse(400, "BAD_JSON", "Chat message body must be JSON.");
    }
    const result2 = await coordinator.submitChatMessage(bearerToken(request) ?? "", body);
    await this.saveSession(coordinator);
    if (!result2.ok) {
      return jsonResponse(result2, { status: statusForRelayError(result2.error) });
    }
    return jsonResponse(result2.value);
  }
  async submitPrivateChatMessage(request, coordinator) {
    const body = await readJsonBody(request);
    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse();
    }
    if (body === void 0) {
      return errorResponse(400, "BAD_JSON", "Private chat message body must be JSON.");
    }
    const result2 = await coordinator.submitPrivateChatMessage(bearerToken(request) ?? "", body);
    await this.saveSession(coordinator);
    if (!result2.ok) {
      return jsonResponse(result2, { status: statusForRelayError(result2.error) });
    }
    return jsonResponse(result2.value);
  }
  async submitRefereeAwards(request, coordinator) {
    const body = await readJsonBody(request);
    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse();
    }
    if (body === void 0) {
      return errorResponse(400, "BAD_JSON", "Referee awards body must be JSON.");
    }
    const result2 = await coordinator.submitRefereeAwards(bearerToken(request) ?? "", body);
    await this.saveSession(coordinator);
    if (!result2.ok) {
      return jsonResponse(result2, { status: statusForRelayError(result2.error) });
    }
    return jsonResponse(result2.value);
  }
  async resetRole(request, coordinator) {
    const body = await readJsonBody(request);
    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse();
    }
    if (body === void 0) {
      return errorResponse(400, "BAD_JSON", "Role reset body must be JSON.");
    }
    const result2 = await coordinator.resetRole(bearerToken(request) ?? "", body);
    await this.saveSession(coordinator);
    if (!result2.ok) {
      return jsonResponse(result2, { status: statusForRelayError(result2.error) });
    }
    return jsonResponse(result2.value);
  }
  async loadSession() {
    const stored = await this.state.storage.get(STORAGE_KEY);
    return stored ? SessionCoordinator.fromState(stored) : void 0;
  }
  async saveSession(coordinator) {
    await this.state.storage.put(STORAGE_KEY, coordinator.exportState());
  }
};
var src_default = {
  fetch: handleWorkerRequest
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-OlcsbI/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-OlcsbI/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  AgentArenaSession,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default,
  handleWorkerRequest
};
//# sourceMappingURL=index.js.map
