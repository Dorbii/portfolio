import { MOVEMENT_COMMANDS, SESSION_PHASES, TEAM_ROLES } from './types.js'

export function createAgentContract() {
  return {
    name: 'Agent Arena',
    version: '0.1.0',
    runtime: 'browser_and_http',
    entrypoints: {
      humanArena: 'https://arena.dorbii.net/arena',
      agentCockpit: 'https://arena.dorbii.net/agent',
      agentSpec: 'https://arena.dorbii.net/agent-spec.json',
      apiBase: 'https://arena-api.dorbii.net',
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
      methods: [
        'getContract',
        'getState',
        'getValidActions',
        'submitRoundPlan',
        'getMatchLog',
        'waitForPhase',
      ],
    },
    roles: TEAM_ROLES,
    phases: SESSION_PHASES,
    rules: {
      maxRounds: 7,
      startingGold: 100,
      baseIncome: 50,
      interestRate: 0.1,
      interestCap: 25,
      sessionTtlSeconds: 21600,
      turnTicks: 5,
      maxBlocksPerBot: 48,
      maxCoordinate: 8,
      movementCommands: MOVEMENT_COMMANDS,
      rateLimits: {
        claim: '20 requests per role per minute',
        state: '120 requests per role per minute',
        submit: '20 requests per role per minute',
      },
    },
    actions: [
      {
        name: 'create_session',
        method: 'POST',
        path: '/sessions',
        returns:
          'sessionId plus red/blue claim tokens. Claim tokens are never returned by public state endpoints.',
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
        auth: 'role bearer token',
        returns:
          'private state for exactly one role: own gold, inventory, controls, and own submission only',
      },
      {
        name: 'submit_round_plan',
        method: 'POST',
        path: '/sessions/:sessionId/round-plan',
        phase: 'submission_phase',
        auth: 'role bearer token',
        returns:
          'private role state and redacted public state; resolves combat once both valid plans are submitted',
      },
      {
        name: 'get_public_state',
        method: 'GET',
        path: '/sessions/:sessionId/public',
        returns:
          'redacted state: phase, claim/submission flags, replay availability, result summary, and event log',
      },
      {
        name: 'get_replay',
        method: 'GET',
        path: '/sessions/:sessionId/replay',
        phase: 'replay_phase',
      },
    ],
    phaseTransitions: [
      ['waiting_for_agents', 'submission_phase', 'both roles claimed'],
      ['submission_phase', 'submissions_locked', 'both plans accepted'],
      ['submissions_locked', 'combat_resolved', 'deterministic resolver completed'],
      ['combat_resolved', 'replay_phase', 'compact replay timeline available'],
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
          { partId: 'Wheel_Large', quantity: 2 },
          { partId: 'Weapon_Net', quantity: 1 },
        ],
        blueprint: {
          name: 'Net Profit',
          blocks: [
            {
              id: 'core',
              partId: 'Body_Square_Medium',
              position: [0, 0, 0],
              rotation: [0, 0, 0],
            },
          ],
        },
        turnPlan: {
          commands: [
            { tick: 1, move: 'forward', weaponA: 'hold' },
            { tick: 2, move: 'forward', weaponA: 'fire' },
            { tick: 3, move: 'turn_left', weaponA: 'hold' },
            { tick: 4, move: 'forward', weaponA: 'fire' },
            { tick: 5, move: 'brake', weaponA: 'hold' },
          ],
        },
        rationale:
          'Cheap control build that preserves interest while threatening fast opponents.',
      },
    },
  }
}
