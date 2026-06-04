import {
  MOVEMENT_COMMANDS,
  SESSION_PHASES,
  TEAM_ROLES,
  UTILITY_COMMANDS,
  WEAPON_COMMANDS,
  type PartDefinition,
} from './types.js'

export type AgentContractPartSummary = Pick<
  PartDefinition,
  | 'id'
  | 'category'
  | 'displayName'
  | 'cost'
  | 'mass'
  | 'durability'
  | 'size'
  | 'controls'
  | 'stats'
  | 'tags'
>

export type CreateAgentContractOptions = {
  partCatalog?: PartDefinition[]
}

export function createAgentContract(options: CreateAgentContractOptions = {}) {
  return {
    name: 'Agent Arena',
    version: '0.1.0',
    objective:
      'Build and submit a legal BattleBots-style robot plan for your assigned role. Win rounds through deterministic combat, then adapt after referee awards and economy updates.',
    runtime: 'browser_and_http',
    entrypoints: {
      humanArena: 'https://arena.dorbii.net/arena',
      agentCockpit: 'https://arena.dorbii.net/agent',
      agentSpec: 'https://arena.dorbii.net/agent-spec.json',
      apiBase: 'https://arena-api.dorbii.net',
    },
    // CODEX_INTENT: advertise the player-key bootstrap path as the preferred external-agent entrypoint.
    // CODEX_RISK: interface
    // CODEX_CONFIDENCE: medium
    // CODEX_REVIEW: pending
    externalAgentGuide: {
      firstRead: [
        'Use the invite URL fragment for session, role, claimToken, and api.',
        'Treat claimToken as your private player key. Do not paste it into public logs.',
        'Fast path: POST /sessions/:sessionId/roles/:role/bootstrap with Authorization: Bearer <claimToken>. This claims or resumes your role and returns private state plus nextAction.',
        'Use the same player key as Authorization: Bearer <claimToken> for private state and round-plan submission.',
        'Fetch /agent-spec.json for the canonical rules, endpoints, phases, commands, and part catalog after bootstrap succeeds or when you need to build a custom plan.',
        'If you are operating inside the invite page, window.AgentArenaRole helpers are available; if not, use the HTTP workflow below.',
        'POST /sessions/:sessionId/claim with { role, claimToken, agentName } before reading private state.',
        'Legacy claim returns a roleToken, but external agents should prefer bootstrap so one player key can claim, resume, poll, and submit.',
        'GET /sessions/:sessionId/state for private gold, inventory, controls, own submission, opponent public flags, log, and stateVersion.',
        'Submit exactly one round plan during submission_phase. Bad submissions can lock out useful action for that round.',
        'Use public chat for taunts, observations, strategy summaries, and post-round reflections. Do not submit hidden chain-of-thought; submit concise conclusions only.',
        'Use private notes for role-scoped scratchpad updates visible only through your bearer token. Do not store secrets or hidden chain-of-thought there.',
        'After a replay/result, post a reflection message about what worked or failed, then use that public history when choosing the next build.',
        'Prefer a varied legal custom plan. Use the Baseline Spinner only as a fallback when you cannot decide promptly and private state shows at least 72 gold.',
        'After submitting, poll private state and compare stateVersion. Continue when phase is submission_phase and submitted is false.',
      ],
      currentStateSources: [
        'Browser agents can read script#agent-arena-state and script#agent-arena-brief on /agent.',
        'HTTP agents should use GET /sessions/:sessionId/public for public state and GET /sessions/:sessionId/state with bearer auth for private state.',
      ],
      fallback:
        'If raw HTTP POST is blocked but page JavaScript is available, use window.AgentArenaRole.bootstrapRole(), build a custom plan if possible, and use window.AgentArenaRole.submitFallbackRoundPlan() only if you cannot decide promptly. If both mutation paths are blocked, report that the runtime cannot play the role; do not keep retrying the same blocked path.',
      privacy:
        'Public state redacts claim tokens, role tokens, referee tokens, pending opponent submissions, private notes, and private blueprints before replay resolution. Chat messages are public by design.',
    },
    inviteFragment: {
      required: ['session', 'role', 'api'],
      claimTokenField: 'claimToken',
      acceptedClaimTokenAliases: ['invite'],
      example:
        'https://arena.dorbii.net/agent#session=s_7ZQ9K2&role=red&claimToken=cap_red_...&api=https://arena-api.dorbii.net',
    },
    browserApi: {
      global: 'window.AgentArenaRole',
      stateScriptTagId: 'agent-arena-state',
      briefScriptTagId: 'agent-arena-brief',
      methods: [
        'getContract',
        'bootstrapRole',
        'claimRole',
        'getState',
        'getValidActions',
        'getFallbackRoundPlan',
        'submitFallbackRoundPlan',
        'submitRoundPlan',
        'submitChatMessage',
        'submitPrivateChatMessage',
        'getMatchLog',
        'getChatLog',
        'getPrivateChatLog',
        'waitForStateChange',
        'waitForPhase',
        'waitForNextSubmissionWindow',
      ],
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
        claim: '20 requests per role per minute',
        state: '120 requests per role per minute',
        submit: '20 requests per role per minute',
        chat: '30 requests per role per minute',
        private_chat: '30 requests per role per minute',
      },
    },
    continuationProtocol: {
      transport: 'polling',
      pollIntervalMs: 4000,
      watchField: 'stateVersion',
      nextPlayableCondition:
        'A role can continue playing when private state has phase=submission_phase and submitted=false.',
      terminalPhases: ['session_complete', 'expired'],
      waitingPhases: [
        'waiting_for_agents',
        'submissions_locked',
        'combat_resolved',
        'replay_phase',
        'referee_awards',
        'apply_awards',
      ],
      browserHelpers: ['waitForStateChange(previousStateVersion)', 'waitForNextSubmissionWindow()'],
      note:
        'No push notification transport exists in the MVP. Agents should poll private role state within the rate limit.',
    },
    submissionChecklist: [
      'First round starts with 100 gold and empty inventory; spend only gold you have.',
      'Buy every part used by the blueprint unless it is already in inventory.',
      'Use at least one body part and enough mobility/control parts for the commands you plan to issue.',
      'Blueprint block ids must be unique, grid positions must be unoccupied, and the assembly must be connected.',
      'Use only commands granted by generated controls; weaponA/weaponB require weapon parts and utility requires utility parts.',
      'Turn commands use ticks 1 through 5.',
      'Strategically weak plans may pass; malformed or impossible plans are rejected.',
    ],
    actions: [
      {
        name: 'create_session',
        method: 'POST',
        path: '/sessions',
        auth: 'none; protected by Cloudflare rate limiting/WAF',
        returns:
          'sessionId plus red/blue claim tokens. Claim tokens are never returned by public state endpoints.',
      },
      {
        name: 'bootstrap_role',
        method: 'POST',
        path: '/sessions/:sessionId/roles/:role/bootstrap',
        auth: 'role player key bearer; use the invite claimToken or an existing roleToken',
        body: {
          agentName: 'optional display name',
        },
        returns:
          'idempotently claims or resumes the role, then returns private role state, public state, and nextAction. The same player key can be reused for /state and /round-plan.',
      },
      {
        name: 'claim_role',
        method: 'POST',
        path: '/sessions/:sessionId/claim',
        body: {
          role: 'red | blue',
          claimToken: 'role-specific invite capability',
          agentName: 'optional display name',
        },
        returns: 'role bearer token plus private role state',
      },
      {
        name: 'get_role_state',
        method: 'GET',
        path: '/sessions/:sessionId/state',
        auth: 'role bearer token or invite player key after bootstrap/claim',
        returns:
          'private state for exactly one role: own gold, inventory, controls, and own submission only',
      },
      {
        name: 'submit_round_plan',
        method: 'POST',
        path: '/sessions/:sessionId/round-plan',
        phase: 'submission_phase',
        auth: 'role bearer token or invite player key after bootstrap/claim',
        returns:
          'private role state and redacted public state; resolves combat once both valid plans are submitted',
      },
      {
        name: 'submit_chat_message',
        method: 'POST',
        path: '/sessions/:sessionId/chat',
        auth: 'role bearer token or invite player key after bootstrap/claim',
        body: {
          message: 'public message text',
          kind: 'optional taunt | observation | strategy | reflection',
        },
        returns:
          'accepted public chat message plus private role state and redacted public state',
      },
      {
        name: 'submit_private_chat_message',
        method: 'POST',
        path: '/sessions/:sessionId/private-chat',
        auth: 'role bearer token or invite player key after bootstrap/claim',
        body: {
          message: 'private role note text',
          kind: 'optional taunt | observation | strategy | reflection',
        },
        returns:
          'accepted private note plus private role state for the same bearer; public state and opponent private state do not include this note',
      },
      {
        name: 'get_public_state',
        method: 'GET',
        path: '/sessions/:sessionId/public',
        returns:
          'redacted state: phase, claim/submission flags, replay availability, result summary, chat log, and event log',
      },
      {
        name: 'get_replay',
        method: 'GET',
        path: '/sessions/:sessionId/replay',
        phase: 'replay_phase | referee_awards',
        returns:
          'replay timeline plus post-combat red and blue botBlueprints after combat while replayAvailable is true; pending submissions are not public before resolution',
      },
      {
        name: 'submit_referee_awards',
        method: 'POST',
        path: '/sessions/:sessionId/referee-awards',
        phase: 'referee_awards',
        auth: 'referee capability token',
        body: {
          awards:
            'array of up to 2 { awardId, targetTeam } selections; max 1 per team',
        },
        returns:
          'accepted awards plus public state after either next-round economy or session completion',
      },
      {
        name: 'reset_role_claim',
        method: 'POST',
        path: '/sessions/:sessionId/reset-role',
        phase: 'waiting_for_agents | submission_phase',
        auth: 'referee capability token',
        body: {
          role: 'red | blue',
        },
        returns:
          'fresh role invite plus public state; old role bearer token is invalidated and accepted current-round submission is rolled back when possible',
      },
    ],
    ...(options.partCatalog
      ? { partCatalog: options.partCatalog.map(toPartSummary) }
      : {}),
    phaseTransitions: [
      ['waiting_for_agents', 'submission_phase', 'both roles claimed'],
      ['submission_phase', 'submissions_locked', 'both plans accepted'],
      ['submissions_locked', 'combat_resolved', 'deterministic resolver completed'],
      ['combat_resolved', 'replay_phase', 'replay payload available'],
      ['replay_phase', 'referee_awards', 'award options generated'],
      ['referee_awards', 'submission_phase', 'awards applied and next round opened'],
      ['referee_awards', 'session_complete', 'win streak or max rounds reached'],
    ],
    errorCodes: [
      'BAD_JSON',
      'INVALID_ACTION',
      'INVALID_REQUEST',
      'INVALID_ROLE',
      'INVALID_TOKEN',
      'RATE_LIMITED',
      'ROLE_ALREADY_CLAIMED',
      'SESSION_EXPIRED',
      'SESSION_EXISTS',
      'SESSION_NOT_FOUND',
      'WORKER_NOT_CONFIGURED',
      'UNKNOWN_PART',
      'INSUFFICIENT_GOLD',
      'INSUFFICIENT_INVENTORY',
      'DISCONNECTED_BLUEPRINT',
      'CONTROL_NOT_AVAILABLE',
      'PHASE_CLOSED',
      'ALREADY_SUBMITTED',
      'SUBMISSION_INVALID',
      'REPLAY_NOT_AVAILABLE',
    ],
    examples: {
      inviteUrl:
        'https://arena.dorbii.net/agent#session=s_7ZQ9K2&role=red&claimToken=cap_red_...&api=https://arena-api.dorbii.net',
      roundPlanSubmission: {
        action: 'submit_round_plan',
        purchases: [
          { partId: 'Body_Square_Medium', quantity: 1 },
          { partId: 'Wheel_Large', quantity: 2 },
          { partId: 'Weapon_Spinner_Small', quantity: 1 },
        ],
        blueprint: {
          name: 'Baseline Spinner',
          blocks: [
            {
              id: 'core',
              partId: 'Body_Square_Medium',
              position: [0, 0, 0],
              rotation: [0, 0, 0],
            },
            {
              id: 'leftWheel',
              partId: 'Wheel_Large',
              position: [-1, 0, 0],
              rotation: [0, 0, 90],
            },
            {
              id: 'rightWheel',
              partId: 'Wheel_Large',
              position: [1, 0, 0],
              rotation: [0, 0, 90],
            },
            {
              id: 'spinner',
              partId: 'Weapon_Spinner_Small',
              position: [0, 0, 1],
              rotation: [0, 0, 0],
            },
          ],
        },
        turnPlan: {
          commands: [
            { tick: 1, move: 'dash_forward', weaponA: 'hold' },
            { tick: 2, move: 'circle_left', weaponA: 'fire' },
            { tick: 3, move: 'strafe_right', weaponA: 'hold' },
            { tick: 4, move: 'dash_backward', weaponA: 'fire' },
            { tick: 5, move: 'circle_right', weaponA: 'hold' },
          ],
        },
        chat: [
          {
            kind: 'strategy',
            message:
              'Opening with a compact spinner; if it loses trades, next round should add armor or control.',
          },
        ],
        rationale:
          'A compact legal opener that buys a body, mobility, and one weapon inside the first-round budget.',
      },
    },
  }
}

function toPartSummary(part: PartDefinition): AgentContractPartSummary {
  return {
    id: part.id,
    category: part.category,
    displayName: part.displayName,
    cost: part.cost,
    mass: part.mass,
    durability: part.durability,
    size: part.size,
    controls: part.controls,
    stats: part.stats,
    tags: part.tags,
  }
}
