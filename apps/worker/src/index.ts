import {
  createAgentContract,
  createAgentActionsOpenApi,
  validateCreateSessionRequestShape,
  validateRoleClaimRequestShape,
  type AgentBootstrapRequest,
  type CompactBuildAction,
  type CompactBuildPacket,
  type GameMasterActionParameters,
  type GameMasterLegalAction,
  type GameMasterPacket,
  type PartDefinition,
  type PostFightAgentReflection,
  type RoleClaimRequest,
  type TeamIdentity,
  type TeamRole,
} from '../../../packages/schemas/src/index.js'
import {
  PART_CATALOG,
  createAgentCatalogGuidance,
} from '../../../packages/catalog/src/index.js'
import {
  SessionCoordinator,
  type StoredSessionState,
} from './session.js'
import type {
  InternalCreateSessionRequest,
} from './sessionCreation.js'
import { validateAgentBootstrapPatchRequestShape } from './sessionBootstrapValidation.js'
import {
  bodyTooLargeResponse,
  errorResponse,
  isBodyTooLarge,
  isJsonRecord,
  jsonResponse,
  preflightResponse,
  readJsonBody,
  statusForRelayError,
  withCors,
} from './workerHttp.js'
import {
  bearerToken,
  isSessionId,
  requestWithJson,
  sessionRoleRoute,
  sessionRoute,
} from './workerRoutes.js'
import type { SessionResult } from './sessionTypes.js'
import {
  forwardToSessionObject,
  handlePublicCreateSessionRequest,
  invalidSessionIdResponse,
} from './workerSessionDispatch.js'
import type {
  DurableObjectState,
  WorkerEnv,
} from './workerTypes.js'
export type {
  DurableObjectNamespace,
  WorkerEnv,
} from './workerTypes.js'

const STORAGE_KEY = 'agent-arena-session'
const GPT_MOUNT_SLOT_ALIAS_PREFIX = 'gpt.loadout.mount'
const GPT_MOUNT_SLOT_ALIAS_LIMIT = 6
const GPT_COMPACT_BOARD_CELL_LIMIT = 24
const GPT_COMPACT_BOARD_LIST_LIMIT = 16
const GPT_COMPACT_ACTION_REF_LIMIT = 6
const GPT_COMBAT_PLAN_ACTION_ID = 'combat_plan'
const DEFAULT_GPT_AUTO_POLL_ATTEMPTS = 24
const DEFAULT_GPT_AUTO_POLL_DELAY_MS = 750
const MAX_GPT_AUTO_POLL_ATTEMPTS = 40
const MAX_GPT_AUTO_POLL_DELAY_MS = 1500

type JsonRequestReadResult =
  | {
      ok: true
      body: unknown
    }
  | {
      ok: false
      response: Response
    }

type GptRouteAction = 'claim' | 'next' | 'act' | 'reflection' | 'catalog'

type GptInvite = {
  sessionId: string
  role: TeamRole
  claimToken: string
  apiBase?: string
}

type GptClaimBody = {
  inviteUrl: string
  agentName?: string
  teamIdentity?: GptTeamIdentityInput
}

type GptTeamIdentityInput = TeamIdentity & {
  mode?: 'provided' | 'agent_decides'
}

type GptActBody = {
  inviteUrl: string
  /** Exact id copied from packet.legalActions when that compatibility surface is present. */
  actionId?: string
  parameters?: GameMasterActionParameters
  /** Compact build action; the wrapper hides GameMaster version bookkeeping. */
  action?: CompactBuildAction
  publicMessage?: string
}

type GptReflectBody = {
  inviteUrl: string
  claims: PostFightAgentReflection['claims']
  confidence?: PostFightAgentReflection['confidence']
}

type GptCatalogBody = {
  inviteUrl: string
  partIds?: unknown
}

type GptCatalogPartSummary = Pick<
  PartDefinition,
  'id' | 'category' | 'displayName' | 'cost' | 'mass' | 'durability' | 'size' | 'controls' | 'stats' | 'tags' | 'behavior'
>

type GptCompactPacket = {
  sessionId: GameMasterPacket['sessionId']
  role: GameMasterPacket['role']
  phase: GameMasterPacket['phase']
  nextAction: GameMasterPacket['nextAction']
  round: GameMasterPacket['round']
  decisionVersion: GameMasterPacket['decisionVersion']
  instruction: GameMasterPacket['instruction']
  build?: CompactBuildPacket
  legalActions?: Array<Record<string, unknown>>
  [key: string]: unknown
}

type GptPacketStatus = 'claimed' | 'playable' | 'waiting' | 'complete' | 'expired'

type GptAutoPollConfig = {
  attempts: number
  delayMs: number
}

type GptAutoPollSummary = {
  attempts: number
  resolved: boolean
  exhausted: boolean
  delayMs: number
}

type GptMountSlotAlias = {
  id: string
  kind: 'propose_mount_pose'
  label: string
  summary: string
  mountSlotId: string
  resolvesToActionId: string
  semanticTags: string[]
  parameters: GameMasterActionParameters
}

type GptBoardView = NonNullable<GameMasterPacket['board']>
type GptBoardCell = NonNullable<GptBoardView['cells']>[number]
type GptBoardLegalView = NonNullable<GptBoardCell['legal']>
type GptBoardLegalActionRef = NonNullable<GptBoardLegalView['moveHere']>
type GptBoardAttackRef = NonNullable<GptBoardLegalView['attacksFromHere']>[number]
type GptBoardPose = NonNullable<GptBoardView['reachablePoses']>[number]
type GptBoardTarget = NonNullable<GptBoardView['attackableTargets']>[number]
type GptActionPreview = NonNullable<GameMasterLegalAction['preview']>

function isEmptyRecord(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0
}

export async function handleWorkerRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') {
    return preflightResponse(request, env)
  }

  if (request.method === 'GET' && url.pathname === '/agent-spec.json') {
    return jsonResponse(
      createAgentContract({
        catalogGuidance: createAgentCatalogGuidance(PART_CATALOG),
        partCatalog: PART_CATALOG,
      }),
      {},
      request,
      env,
    )
  }

  if (request.method === 'GET' && url.pathname === '/openapi.json') {
    return jsonResponse(
      createAgentActionsOpenApi({
        apiBase: url.origin,
      }),
      {},
      request,
      env,
    )
  }

  if (request.method === 'POST' && url.pathname === '/sessions') {
    return handlePublicCreateSessionRequest(request, env)
  }

  const gptRoute = gptRouteAction(url.pathname)

  if (gptRoute) {
    return forwardGptRequest(request, env, gptRoute)
  }

  const roleRoute = sessionRoleRoute(url.pathname)

  if (roleRoute) {
    if (!isSessionId(roleRoute.sessionId)) {
      return invalidSessionIdResponse(request, env)
    }

    return forwardToSessionObject(request, env, roleRoute.sessionId)
  }

  const route = sessionRoute(url.pathname)

  if (route) {
    if (!isSessionId(route.sessionId)) {
      return invalidSessionIdResponse(request, env)
    }

    if (route.action === 'create') {
      return errorResponse(404, 'INVALID_ACTION', 'Unsupported session action.', undefined, request, env)
    }

    return forwardToSessionObject(request, env, route.sessionId)
  }

  return errorResponse(404, 'INVALID_REQUEST', 'Route not found.', undefined, request, env)
}

export class AgentArenaSession {
  private readonly state: DurableObjectState

  private readonly env: WorkerEnv

  private readonly sessionRoutes: Record<string, SessionRouteSpec> = {
    claim: {
      method: 'POST',
      handle: (request, coordinator) => this.claimRole(request, coordinator),
    },
    public: {
      method: 'GET',
      handle: (_request, coordinator) => this.publicState(coordinator),
    },
    state: {
      method: 'GET',
      handle: (request, coordinator) => this.roleState(request, coordinator),
    },
    action: {
      method: 'POST',
      handle: (request, coordinator) => this.submitGameMasterAction(request, coordinator),
    },
    'build-action': {
      method: 'POST',
      handle: (request, coordinator) => this.submitCompactBuildAction(request, coordinator),
    },
    'combat-plan': {
      method: 'POST',
      handle: (request, coordinator) => this.submitCombatRoundPlan(request, coordinator),
    },
    reflection: {
      method: 'POST',
      handle: (request, coordinator) => this.submitPostFightReflection(request, coordinator),
    },
    chat: {
      method: 'POST',
      handle: (request, coordinator) => this.submitChatMessage(request, coordinator),
    },
    'private-chat': {
      method: 'POST',
      handle: (request, coordinator) => this.submitPrivateChatMessage(request, coordinator),
    },
    'advance-round': {
      method: 'POST',
      handle: (request, coordinator) => this.advanceRound(request, coordinator),
    },
    'reset-role': {
      method: 'POST',
      handle: (request, coordinator) => this.resetRole(request, coordinator),
    },
    replay: {
      method: 'GET',
      handle: (request, coordinator) => this.replay(request, coordinator),
    },
    'gpt-claim': {
      method: 'POST',
      handle: (request, coordinator) => this.gptClaim(request, coordinator),
    },
    'gpt-next': {
      method: 'POST',
      handle: (request, coordinator) => this.gptNext(request, coordinator),
    },
    'gpt-act': {
      method: 'POST',
      handle: (request, coordinator) => this.gptAct(request, coordinator),
    },
    'gpt-reflect': {
      method: 'POST',
      handle: (request, coordinator) => this.gptReflect(request, coordinator),
    },
    'gpt-catalog': {
      method: 'POST',
      handle: (request, coordinator) => this.gptCatalog(request, coordinator),
    },
  }

  private readonly roleRoutes: Record<string, RoleRouteSpec> = {
    bootstrap: {
      method: 'POST',
      handle: (request, coordinator, role) => this.bootstrapRole(request, coordinator, role),
    },
  }

  constructor(state: DurableObjectState, env: WorkerEnv = {}) {
    this.state = state
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const roleRoute = sessionRoleRoute(url.pathname)

    if (roleRoute) {
      return this.dispatchRoleRoute(request, roleRoute)
    }

    const route = sessionRoute(url.pathname)

    if (!route) {
      return errorResponse(404, 'INVALID_REQUEST', 'Session route not found.')
    }

    return this.dispatchSessionRoute(request, route)
  }

  private async dispatchRoleRoute(
    request: Request,
    route: NonNullable<ReturnType<typeof sessionRoleRoute>>,
  ): Promise<Response> {
    if (!isSessionId(route.sessionId)) {
      return invalidDurableObjectSessionIdResponse()
    }

    const coordinator = await this.loadSession()

    if (!coordinator) {
      return errorResponse(404, 'SESSION_NOT_FOUND', 'Session has not been created.')
    }

    const spec = this.roleRoutes[route.action]

    if (!spec || spec.method !== request.method) {
      return errorResponse(404, 'INVALID_ACTION', 'Unsupported role session action.')
    }

    return spec.handle(request, coordinator, route.role)
  }

  private async dispatchSessionRoute(
    request: Request,
    route: NonNullable<ReturnType<typeof sessionRoute>>,
  ): Promise<Response> {
    if (!isSessionId(route.sessionId)) {
      return invalidDurableObjectSessionIdResponse()
    }

    if (route.action === 'create' && request.method === 'POST') {
      return this.createSession(request, route.sessionId)
    }

    const coordinator = await this.loadSession()

    if (!coordinator) {
      return errorResponse(404, 'SESSION_NOT_FOUND', 'Session has not been created.')
    }

    const spec = this.sessionRoutes[route.action]

    return !spec || spec.method !== request.method
      ? errorResponse(404, 'INVALID_ACTION', 'Unsupported session action.')
      : spec.handle(request, coordinator)
  }

  private async createSession(request: Request, sessionId: string): Promise<Response> {
    const existing = await this.loadSession()

    if (existing) {
      return errorResponse(409, 'SESSION_EXISTS', 'Session already exists.')
    }

    const readResult = await this.readJsonRequest(request, 'Create session body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    const body = readResult.body as Record<string, unknown>
    const validation = validateCreateSessionRequestShape(body)

    if (!validation.ok) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Create session request failed validation.',
        validation.issues,
      )
    }

    const createRequest: InternalCreateSessionRequest = {
      ...(body as InternalCreateSessionRequest),
      sessionId,
    }
    const coordinator = await SessionCoordinator.create(createRequest)
    await this.saveSession(coordinator)

    return jsonResponse(coordinator.createResponse(), { status: 201 })
  }

  private async claimRole(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'Claim request body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    const body = readResult.body as Record<string, unknown>
    const validation = validateRoleClaimRequestShape(body)

    if (!validation.ok) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Claim request failed validation.',
        validation.issues,
      )
    }

    return this.sessionResultResponse(coordinator, await coordinator.claimRole(body as RoleClaimRequest), {
      status: 201,
    })
  }

  // CODEX_INTENT: expose an idempotent player-key bootstrap path for non-browser agents.
  // CODEX_RISK: interface
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  private async bootstrapRole(
    request: Request,
    coordinator: SessionCoordinator,
    role: TeamRole,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'Bootstrap request body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    const body = readResult.body as Record<string, unknown>
    const validation = validateAgentBootstrapPatchRequestShape(body)

    if (!validation.ok) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Bootstrap request failed validation.',
        validation.issues,
      )
    }

    const result = await coordinator.bootstrapRole(
      role,
      bearerToken(request) ?? '',
      body as Partial<AgentBootstrapRequest>,
    )
    await this.saveSession(coordinator)

    if (!result.ok) {
      return jsonResponse(result, { status: statusForRelayError(result.error) })
    }

    return jsonResponse(result.value.packet, { status: result.value.claimedNow ? 201 : 200 })
  }

  private async submitGameMasterAction(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'GameMaster action body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    return this.sessionResultResponse(
      coordinator,
      await coordinator.submitGameMasterAction(bearerToken(request) ?? '', readResult.body),
    )
  }

  private async submitCompactBuildAction(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'Compact build action body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    return this.sessionResultResponse(
      coordinator,
      await coordinator.submitCompactBuildAction(bearerToken(request) ?? '', readResult.body),
    )
  }

  private async submitCombatRoundPlan(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'Combat round plan body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    return this.sessionResultResponse(
      coordinator,
      await coordinator.submitCombatRoundPlan(bearerToken(request) ?? '', readResult.body),
    )
  }

  private async publicState(coordinator: SessionCoordinator): Promise<Response> {
    const publicState = coordinator.getPublicState()
    await this.saveSession(coordinator)

    return jsonResponse(publicState)
  }

  private async roleState(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const result = await coordinator.getRoleStateForToken(bearerToken(request) ?? '')

    return this.sessionResultResponse(coordinator, result)
  }

  private async replay(request: Request, coordinator: SessionCoordinator): Promise<Response> {
    const fightId = new URL(request.url).searchParams.get('fightId')?.trim() || undefined

    return this.sessionResultResponse(coordinator, coordinator.getReplay(fightId))
  }

  // CODEX_INTENT: provide GPT Actions a narrow wrapper that hides GameMaster version bookkeeping.
  // CODEX_RISK: interface
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  private async gptClaim(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'GPT claim body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    const body = readResult.body as Partial<GptClaimBody>
    const invite = parseGptInvite(body.inviteUrl)

    if (!invite.ok) {
      return invite.response
    }

    const teamIdentity = body.teamIdentity
      ? normalizeGptTeamIdentity(body.teamIdentity)
      : defaultGptTeamIdentity(invite.value)
    const agentName = typeof body.agentName === 'string' && body.agentName.trim()
      ? body.agentName.trim()
      : defaultGptAgentName(invite.value)
    const result = await coordinator.bootstrapRole(
      invite.value.role,
      invite.value.claimToken,
      {
        agentName,
        teamIdentity,
      },
    )
    await this.saveSession(coordinator)

    if (!result.ok) {
      return jsonResponse(result, { status: statusForRelayError(result.error) })
    }

    return this.gptPacketResponse(coordinator, invite.value.claimToken, result.value.packet, {}, {
      statusOverride: 'claimed',
    })
  }

  private compactGptPacketFor(
    coordinator: SessionCoordinator,
    packet: GameMasterPacket,
  ): GptCompactPacket {
    const compactBuild = packet.phase === 'choose_loadout'
      ? coordinator.buildCompactBuildPacketForRole(packet.role)
      : undefined

    return compactGptPacket(packet, compactBuild)
  }

  private async gptPacketResponse(
    coordinator: SessionCoordinator,
    roleToken: string,
    packet: GameMasterPacket,
    extras: Record<string, unknown> = {},
    options: {
      autoPoll?: boolean
      statusOverride?: GptPacketStatus
    } = {},
  ): Promise<Response> {
    const pollResult = options.autoPoll === true && options.statusOverride === undefined
      ? await this.autoPollGptPacket(coordinator, roleToken, packet)
      : {
          coordinator,
          packet,
          autoPoll: undefined,
        }
    const status = options.statusOverride ?? gptPacketStatus(pollResult.packet)
    const continuation = gptContinuationForPacket(pollResult.packet, options.statusOverride)

    return this.sessionResultResponse(pollResult.coordinator, {
      ok: true,
      value: {
        status,
        sessionId: pollResult.packet.sessionId,
        role: pollResult.packet.role,
        ...extras,
        ...(pollResult.autoPoll ? { autoPoll: pollResult.autoPoll } : {}),
        packet: this.compactGptPacketFor(pollResult.coordinator, pollResult.packet),
        continuation,
        nextStep: gptNextStepDirective(continuation),
      },
    })
  }

  private async autoPollGptPacket(
    coordinator: SessionCoordinator,
    roleToken: string,
    packet: GameMasterPacket,
  ): Promise<{
    coordinator: SessionCoordinator
    packet: GameMasterPacket
    autoPoll?: GptAutoPollSummary
  }> {
    const config = gptAutoPollConfig(this.env)

    if (config.attempts <= 0 || gptPacketStatus(packet) !== 'waiting') {
      return { coordinator, packet }
    }

    let activeCoordinator = coordinator
    let activePacket = packet
    let attempts = 0

    await this.saveSession(activeCoordinator)

    while (attempts < config.attempts && gptPacketStatus(activePacket) === 'waiting') {
      await wait(config.delayMs)

      const latestCoordinator = await this.loadSession()

      if (latestCoordinator) {
        activeCoordinator = latestCoordinator
      }

      const packetResult = await activeCoordinator.getGameMasterPacketForToken(roleToken)

      if (!packetResult.ok) {
        break
      }

      attempts += 1
      activePacket = packetResult.value

      await this.saveSession(activeCoordinator)
    }

    const status = gptPacketStatus(activePacket)

    return {
      coordinator: activeCoordinator,
      packet: activePacket,
      autoPoll: {
        attempts,
        resolved: status !== 'waiting',
        exhausted: status === 'waiting',
        delayMs: config.delayMs,
      },
    }
  }

  private async gptNext(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'GPT next body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    const body = readResult.body as Partial<GptClaimBody>
    const invite = parseGptInvite(body.inviteUrl)

    if (!invite.ok) {
      return invite.response
    }

    const result = await coordinator.getGameMasterPacketForToken(invite.value.claimToken)

    if (!result.ok) {
      return this.sessionResultResponse(coordinator, result)
    }

    return this.gptPacketResponse(coordinator, invite.value.claimToken, result.value, {}, {
      autoPoll: true,
    })
  }

  private async gptAct(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'GPT action body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    const body = readResult.body as Partial<GptActBody>
    const invite = parseGptInvite(body.inviteUrl)

    if (!invite.ok) {
      return invite.response
    }

    const hasActionId = typeof body.actionId === 'string' && body.actionId.trim().length > 0
    const hasCompactAction = body.action !== undefined

    if (hasActionId === hasCompactAction) {
      return errorResponse(
        400,
        'SUBMISSION_INVALID',
        'Provide exactly one of actionId or action (compact build action).',
      )
    }

    const packetResult = await coordinator.getGameMasterPacketForToken(invite.value.claimToken)

    if (!packetResult.ok) {
      return this.sessionResultResponse(coordinator, packetResult)
    }

    if (hasCompactAction) {
      if (packetResult.value.phase !== 'choose_loadout') {
        return errorResponse(
          409,
          'PHASE_CLOSED',
          'Compact build actions are only accepted during the build phase. Use actionId combat_plan during combat.',
        )
      }

      const result = await coordinator.submitCompactBuildAction(invite.value.claimToken, {
        action: 'submit_build_action',
        decisionVersion: packetResult.value.decisionVersion,
        command: body.action,
        ...(typeof body.publicMessage === 'string' ? { publicMessage: body.publicMessage } : {}),
      })

      if (!result.ok) {
        return this.sessionResultResponse(coordinator, result)
      }

      return this.gptPacketResponse(coordinator, invite.value.claimToken, result.value.packet, {
        acceptedAction: body.action,
      }, {
        autoPoll: true,
      })
    }

    if (body.actionId === GPT_COMBAT_PLAN_ACTION_ID) {
      const result = await coordinator.submitGptCombatPlan(invite.value.claimToken, body.parameters)

      if (!result.ok) {
        return this.sessionResultResponse(coordinator, result)
      }

      return this.gptPacketResponse(coordinator, invite.value.claimToken, result.value.packet, {
        acceptedActionId: body.actionId,
        submittedSteps: result.value.submittedSteps,
        submittedPlan: result.value.submittedPlan,
      }, {
        autoPoll: true,
      })
    }

    if (typeof body.actionId !== 'string') {
      return errorResponse(400, 'SUBMISSION_INVALID', 'GPT actionId is required when no compact action is provided.')
    }

    const submittedActionId = body.actionId
    const packet = packetResult.value
    const resolvedGptAlias = resolveGptMountSlotAlias(packet, submittedActionId)
    const action = resolvedGptAlias?.canonicalAction ??
      packet.legalActions.find((candidate) => candidate.id === submittedActionId)

    if (!action || !packet.actionSetId) {
      return errorResponse(
        409,
        'SUBMISSION_INVALID',
        'actionId is not legal in the latest GameMasterPacket for this role.',
      )
    }

    const shouldUseParameterExample =
      action.parameterSchema !== undefined &&
      action.parameterExamples?.[0] !== undefined &&
      (body.parameters === undefined || isEmptyRecord(body.parameters))
    const parameters = resolvedGptAlias?.alias.parameters ??
      (shouldUseParameterExample ? action.parameterExamples?.[0] : body.parameters)
    const result = await coordinator.submitGameMasterAction(invite.value.claimToken, {
      action: 'submit_game_action',
      actionSetId: packet.actionSetId,
      decisionVersion: packet.decisionVersion,
      actionId: action.id,
      ...(parameters !== undefined ? { parameters } : {}),
      ...(typeof body.publicMessage === 'string' ? { publicMessage: body.publicMessage } : {}),
    })

    if (!result.ok) {
      return this.sessionResultResponse(coordinator, result)
    }

    return this.gptPacketResponse(coordinator, invite.value.claimToken, result.value.packet, {
      acceptedActionId: body.actionId,
      ...(resolvedGptAlias ? { resolvedActionId: action.id } : {}),
    }, {
      autoPoll: true,
    })
  }

  private async gptReflect(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'GPT reflection body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    const body = readResult.body as Partial<GptReflectBody>
    const invite = parseGptInvite(body.inviteUrl)

    if (!invite.ok) {
      return invite.response
    }

    if (!isJsonRecord(body.claims)) {
      return errorResponse(400, 'INVALID_REQUEST', 'GPT reflection claims are required.')
    }

    const packetResult = await coordinator.getGameMasterPacketForToken(invite.value.claimToken)

    if (!packetResult.ok) {
      return this.sessionResultResponse(coordinator, packetResult)
    }

    const packet = packetResult.value

    if (!packet.fightId) {
      return errorResponse(409, 'PHASE_CLOSED', 'No completed fight is available for reflection.')
    }

    const result = await coordinator.submitPostFightReflection(invite.value.claimToken, {
      action: 'submit_post_fight_reflection',
      fightId: packet.fightId,
      role: invite.value.role,
      decisionVersion: packet.decisionVersion,
      claims: body.claims as PostFightAgentReflection['claims'],
      confidence: body.confidence ?? 'medium',
    })

    if (!result.ok) {
      return this.sessionResultResponse(coordinator, result)
    }

    return this.gptPacketResponse(coordinator, invite.value.claimToken, result.value.packet, {}, {
      autoPoll: true,
    })
  }

  private async gptCatalog(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'GPT catalog body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    const body = readResult.body as GptCatalogBody
    const invite = parseGptInvite(body.inviteUrl)

    if (!invite.ok) {
      return invite.response
    }

    const packetResult = await coordinator.getGameMasterPacketForToken(invite.value.claimToken)

    if (!packetResult.ok) {
      return this.sessionResultResponse(coordinator, packetResult)
    }

    if (!Array.isArray(body.partIds)) {
      return errorResponse(400, 'INVALID_REQUEST', 'GPT catalog partIds must be an array.')
    }

    const partIds = body.partIds.filter((partId): partId is string =>
      typeof partId === 'string' && partId.trim().length > 0,
    )
    const requested = new Set(partIds)
    const parts = PART_CATALOG
      .filter((part) => requested.has(part.id))
      .map(gptCatalogPartSummary)

    await this.saveSession(coordinator)

    return jsonResponse({ parts })
  }

  private async submitPostFightReflection(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'Post-fight reflection body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    return this.sessionResultResponse(
      coordinator,
      await coordinator.submitPostFightReflection(bearerToken(request) ?? '', readResult.body),
    )
  }

  private async submitChatMessage(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'Chat message body must be JSON.')

    if (!readResult.ok) {
      return readResult.response
    }

    return this.sessionResultResponse(
      coordinator,
      await coordinator.submitChatMessage(bearerToken(request) ?? '', readResult.body),
    )
  }

  private async submitPrivateChatMessage(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'Private chat message body must be JSON.')

    if (!readResult.ok) {
      return readResult.response
    }

    return this.sessionResultResponse(
      coordinator,
      await coordinator.submitPrivateChatMessage(bearerToken(request) ?? '', readResult.body),
    )
  }

  private async advanceRound(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'Advance round body must be JSON.', {
      requireRecord: true,
    })

    if (!readResult.ok) {
      return readResult.response
    }

    return this.sessionResultResponse(
      coordinator,
      await coordinator.advanceRound(bearerToken(request) ?? ''),
    )
  }

  private async resetRole(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'Role reset body must be JSON.')

    if (!readResult.ok) {
      return readResult.response
    }

    return this.sessionResultResponse(
      coordinator,
      await coordinator.resetRole(bearerToken(request) ?? '', readResult.body),
    )
  }

  private async readJsonRequest(
    request: Request,
    badJsonMessage: string,
    options: { requireRecord?: boolean } = {},
  ): Promise<JsonRequestReadResult> {
    const body = await readJsonBody(request)

    if (isBodyTooLarge(body)) {
      return { ok: false, response: bodyTooLargeResponse() }
    }

    if (body === undefined || (options.requireRecord === true && !isJsonRecord(body))) {
      return { ok: false, response: errorResponse(400, 'BAD_JSON', badJsonMessage) }
    }

    return { ok: true, body }
  }

  private async sessionResultResponse<T>(
    coordinator: SessionCoordinator,
    result: SessionResult<T>,
    init: ResponseInit | ((value: T) => ResponseInit) = {},
  ): Promise<Response> {
    await this.saveSession(coordinator)

    if (!result.ok) {
      return jsonResponse(result, { status: statusForRelayError(result.error) })
    }

    return jsonResponse(result.value, typeof init === 'function' ? init(result.value) : init)
  }

  private async loadSession(): Promise<SessionCoordinator | undefined> {
    const stored = await this.state.storage.get<StoredSessionState>(STORAGE_KEY)

    return stored ? SessionCoordinator.fromState(stored) : undefined
  }

  private async saveSession(coordinator: SessionCoordinator): Promise<void> {
    await this.state.storage.put(STORAGE_KEY, coordinator.exportState())
  }
}

type SessionRouteSpec = {
  method: string
  handle: (request: Request, coordinator: SessionCoordinator) => Promise<Response>
}

type RoleRouteSpec = {
  method: string
  handle: (
    request: Request,
    coordinator: SessionCoordinator,
    role: TeamRole,
  ) => Promise<Response>
}

function invalidDurableObjectSessionIdResponse(): Response {
  return errorResponse(
    400,
    'INVALID_REQUEST',
    'Session id must start with s_ and contain only letters, numbers, underscores, or hyphens.',
  )
}

async function forwardGptRequest(
  request: Request,
  env: WorkerEnv,
  action: GptRouteAction,
): Promise<Response> {
  const body = await readJsonBody(request)

  if (isBodyTooLarge(body)) {
    return bodyTooLargeResponse(request, env)
  }

  if (body === undefined || !isJsonRecord(body)) {
    return errorResponse(400, 'BAD_JSON', 'GPT wrapper body must be JSON.', undefined, request, env)
  }

  const invite = parseGptInvite(body.inviteUrl)

  if (!invite.ok) {
    return withCors(invite.response, request, env)
  }

  if (!isSessionId(invite.value.sessionId)) {
    return invalidSessionIdResponse(request, env)
  }

  const internalUrl = new URL(request.url)
  internalUrl.pathname = `/sessions/${encodeURIComponent(invite.value.sessionId)}/gpt-${
    action === 'reflection' ? 'reflect' : action
  }`

  return forwardToSessionObject(
    requestWithJson(request, internalUrl, body),
    env,
    invite.value.sessionId,
  )
}

function gptRouteAction(pathname: string): GptRouteAction | undefined {
  const match = /^\/gpt\/(claim|next|act|reflection|catalog)$/.exec(pathname)

  return match?.[1] as GptRouteAction | undefined
}

function compactBuildGptInstruction(packet: GameMasterPacket): string {
  if (packet.nextAction === 'wait_for_opponent_loadout') {
    return 'Loadout locked; your role is ready. Keep polling gptNext until combat_turn, round_review, session_complete, or expired.'
  }

  return 'Build phase: read packet.build (bot, store, edit, requirements) and submit one compact action through gptAct.action, e.g. {"kind":"choose_part","part":"weapon.Weapon_Turret"}. No actionId is needed for build.'
}

function compactCombatGptInstruction(packet: GameMasterPacket): string {
  if (packet.nextAction !== 'choose_turn') {
    return packet.instruction
  }

  return 'Combat: read packet.combat.combat (self/opponent state, budget) and packet.combat.board (grid bounds + terrain). Submit one compact plan with gptAct actionId combat_plan and parameters.steps, e.g. [{"kind":"move","to":[4,0]},{"kind":"attack","weaponSlot":"weaponA","target":[-6,0]},{"kind":"end_turn"}]. The server validates movement, terrain, range, line of sight, cooldowns, and action time.'
}

function compactGptPacket(packet: GameMasterPacket, compactBuild?: CompactBuildPacket): GptCompactPacket {
  // Compact combat protocol: combat packets expose compact state only; the
  // agent submits intent and the server resolves legality.
  if (packet.phase === 'combat_turn' && packet.combatCompact) {
    const basePacket = {
      sessionId: packet.sessionId,
      role: packet.role,
      phase: packet.phase,
      nextAction: packet.nextAction,
      round: packet.round,
      ...(packet.fightId ? { fightId: packet.fightId } : {}),
      decisionVersion: packet.decisionVersion,
    }

    if (packet.nextAction !== 'choose_turn') {
      return {
        ...basePacket,
        instruction: 'Waiting for the next combat decision packet. Do not summarize combat state or ask the user to continue; call gptNext again.',
      }
    }

    return {
      ...basePacket,
      instruction: compactCombatGptInstruction(packet),
      combat: packet.combatCompact,
      ...(packet.sharedDebrief ? { sharedDebrief: packet.sharedDebrief } : {}),
    }
  }

  // Compact build protocol: during the build phase the GPT packet exposes
  // compact state (packet.build) instead of legal action menus, store slots,
  // buildState internals, or catalog dumps.
  if (compactBuild && packet.phase === 'choose_loadout') {
    return {
      sessionId: packet.sessionId,
      role: packet.role,
      phase: packet.phase,
      nextAction: packet.nextAction,
      round: packet.round,
      decisionVersion: packet.decisionVersion,
      instruction: compactBuildGptInstruction(packet),
      ...(packet.resources ? { resources: packet.resources } : {}),
      ...(packet.sharedDebrief ? { sharedDebrief: packet.sharedDebrief } : {}),
      build: compactBuild,
    }
  }

  const mountSlotAliases = gptMountSlotAliasesForPacket(packet)
  const isCombatTurn = isGptCombatTurnPacket(packet)
  const legalActions = isCombatTurn
    ? compactGptCombatLegalActions(packet)
    : [
        ...packet.legalActions.map((action) =>
          compactGptLegalAction(action, {
            omitParameterDetails: mountSlotAliases.length > 0 && action.kind === 'propose_mount_pose',
          })),
        ...mountSlotAliases.map(compactGptMountSlotAlias),
      ]
  const compactBoard = packet.board && (packet.legalActions.length > 0 || packet.nextAction === 'choose_turn')
    ? isCombatTurn
      ? compactGptCombatBoard(packet)
      : compactGptBoard(packet.board)
    : undefined

  return {
    sessionId: packet.sessionId,
    role: packet.role,
    phase: packet.phase,
    nextAction: packet.nextAction,
    round: packet.round,
    ...(packet.fightId ? { fightId: packet.fightId } : {}),
    decisionVersion: packet.decisionVersion,
    instruction: packet.instruction,
    ...(packet.resources ? { resources: packet.resources } : {}),
    ...(packet.store
      ? {
          store: {
            foundationPartIds: packet.store.foundationPartIds,
            offeredPartIds: packet.store.offeredPartIds,
            slots: packet.store.slots.map((slot) => ({
              id: slot.id,
              kind: slot.kind,
              partId: slot.partId,
            })),
          },
        }
      : {}),
    ...(packet.buildState
      ? {
          buildState: {
            step: packet.buildState.step,
            selectedPartId: packet.buildState.selectedPartId,
            selectedAttachTargetId: packet.buildState.selectedAttachTargetId,
          },
        }
      : {}),
    ...(compactBoard && Object.keys(compactBoard).length > 0 ? { board: compactBoard } : {}),
    ...(packet.combat ? { combat: compactGptCombat(packet.combat) } : {}),
    ...(packet.review ? { review: packet.review } : {}),
    ...(packet.sharedDebrief ? { sharedDebrief: packet.sharedDebrief } : {}),
    ...(packet.visibleState ? { visibleState: packet.visibleState } : {}),
    ...(isCombatTurn ? { actionSummary: compactGptCombatActionSummary(packet) } : {}),
    legalActions,
    ...(packet.blockedActions
      ? {
          blockedActions: packet.blockedActions.slice(0, 12).map((action) => ({
            kind: action.kind,
            label: action.label,
            summary: action.summary,
            requirements: action.requirements,
            issues: action.issues?.slice(0, 5).map((issue) => ({
              code: issue.code,
              path: issue.path,
              message: issue.message,
            })),
          })),
        }
      : {}),
  }
}

function isGptCombatTurnPacket(packet: GameMasterPacket): boolean {
  return packet.phase === 'combat_turn'
}

function compactGptCombatLegalActions(packet: GameMasterPacket): Array<Record<string, unknown>> {
  if (packet.combat?.submitted) {
    return []
  }

  const surrenderActions = packet.legalActions
    .filter((action) => action.kind === 'surrender')
    .map((action) => compactGptLegalAction(action, { omitParameterDetails: true }))

  return [
    {
      id: GPT_COMBAT_PLAN_ACTION_ID,
      kind: 'use_utility',
      label: 'Submit combat round plan',
      summary: 'Submit the current combat round plan. This is no longer a future-turn queue; both plans resolve in lockstep substeps this round.',
      parameterSchema: {
        type: 'object',
        required: ['steps'],
        properties: {
          steps: {
            type: 'array',
            label: 'Combat round plan steps',
            summary: 'Ordered intent steps. Use board.reachableCells[].cellId for move, board.attackableCells[] for attack, and end_turn when finished.',
            maxItems: 16,
            items: {
              type: 'object',
              required: ['kind'],
              properties: {
                kind: {
                  type: 'string',
                  summary: 'move, attack, utility, or end_turn.',
                },
                cellId: {
                  type: 'string',
                  summary: 'For move or utility: target cellId such as cell:3:0.',
                },
                weaponSlot: {
                  type: 'string',
                  summary: 'For attack: weaponA or weaponB.',
                },
                targetCellId: {
                  type: 'string',
                  summary: 'For attack: usually a cellId from board.attackableCells[].cellId.',
                },
                utilityId: {
                  type: 'string',
                  summary: 'Optional utility identifier from board.utilityOptions[].utilityId.',
                },
              },
            },
          },
        },
      },
    },
    ...surrenderActions,
  ]
}

function compactGptCombatActionSummary(packet: GameMasterPacket): Record<string, unknown> {
  const counts = packet.legalActions.reduce<Record<string, number>>((accumulator, action) => {
    accumulator[action.kind] = (accumulator[action.kind] ?? 0) + 1
    return accumulator
  }, {})
  const cells = packet.board?.cells ?? []
  const reachableCellCount = packet.board?.reachableCells?.length ?? cells.filter((cell) => cell.reachable || cell.legal?.moveHere).length
  const attackCellCount = packet.board?.attackableCells?.length ?? cells.filter((cell) => cell.legal?.attacksFromHere?.length).length
  const movementBudgets = cells
    .map((cell) =>
      typeof cell.mobilityCost === 'number'
        ? cell.mobilityCost + (typeof cell.mobilityRemaining === 'number' ? cell.mobilityRemaining : 0)
        : undefined)
    .filter((value): value is number => typeof value === 'number')

  return {
    mode: packet.combat ? 'lockstep_round_plan' : 'action_menu',
    actionMenuCount: packet.legalActions.length,
    actionKindCounts: counts,
    reachableCellCount,
    attackCellCount,
    ...(packet.combat?.budget ? { budget: packet.combat.budget } : {}),
    ...(movementBudgets.length > 0 ? { movementBudgetEstimate: Math.max(...movementBudgets) } : {}),
  }
}

function compactGptCombat(combat: NonNullable<GameMasterPacket['combat']>): Record<string, unknown> {
  return {
    round: combat.round,
    decisionVersion: combat.decisionVersion,
    deadlineAt: combat.deadlineAt,
    ...(combat.fightStartedAt ? { fightStartedAt: combat.fightStartedAt } : {}),
    ...(combat.fightDeadlineAt ? { fightDeadlineAt: combat.fightDeadlineAt } : {}),
    ...(combat.fightSeconds ? { fightSeconds: combat.fightSeconds } : {}),
    ...(combat.cutoffReason ? { cutoffReason: combat.cutoffReason } : {}),
    submitted: combat.submitted,
    opponentSubmitted: combat.opponentSubmitted,
    budget: combat.budget,
    self: combat.self,
    opponent: combat.opponent,
    ...(combat.submittedPlan ? { submittedPlan: combat.submittedPlan } : {}),
  }
}

function compactGptCombatBoard(packet: GameMasterPacket): Record<string, unknown> {
  const board = packet.board

  if (!board) {
    return {}
  }

  const reachableCells = board.reachableCells?.slice(0, GPT_COMPACT_BOARD_LIST_LIMIT) ?? compactGptReachableCells(board)

  return {
    ...(board.grid ? { grid: board.grid } : {}),
    ...(board.self ? { self: board.self } : {}),
    ...(board.opponent ? { opponent: board.opponent } : {}),
    ...(board.hazardCells ? { hazardCells: board.hazardCells } : {}),
    ascii: asciiGptBoard(board),
    reachableCells,
    ...(board.attackableCells?.length ? { attackableCells: board.attackableCells.slice(0, GPT_COMPACT_BOARD_LIST_LIMIT) } : {}),
    ...(board.utilityOptions?.length ? { utilityOptions: board.utilityOptions.slice(0, GPT_COMPACT_BOARD_LIST_LIMIT) } : {}),
  }
}

function compactGptReachableCells(board: GptBoardView): Array<Record<string, unknown>> {
  return (board.cells ?? [])
    .filter((cell) =>
      cell.occupant ||
      cell.reachable ||
      cell.legal?.moveHere ||
      cell.legal?.attacksFromHere?.length ||
      cell.legal?.useUtilityFromHere)
    .map((cell) => ({
      cellId: cell.cellId,
      x: cell.x,
      z: cell.z,
      ...(typeof cell.mobilityCost === 'number' ? { moveCost: cell.mobilityCost } : {}),
      ...(typeof cell.mobilityRemaining === 'number' ? { remainingMove: cell.mobilityRemaining } : {}),
      ...(cell.hazardIds?.length ? { hazard: true, hazardIds: cell.hazardIds } : { hazard: false }),
      ...(typeof cell.distanceToOpponent === 'number' ? { distanceToOpponent: cell.distanceToOpponent } : {}),
      ...(typeof cell.lineOfSightToOpponent === 'boolean' ? { lineOfSightToOpponent: cell.lineOfSightToOpponent } : {}),
      ...(cell.legal?.moveHere ? { moveActionId: cell.legal.moveHere.actionId } : {}),
      ...(cell.legal?.attacksFromHere?.length
        ? {
            attackActionIds: cell.legal.attacksFromHere.map((attack) => ({
              actionId: attack.actionId,
              kind: attack.kind,
              targetCellId: attack.targetCellId,
              ...(attack.weaponSlot ? { weaponSlot: attack.weaponSlot } : {}),
            })),
          }
        : {}),
      ...(cell.legal?.useUtilityFromHere ? { utilityActionId: cell.legal.useUtilityFromHere.actionId } : {}),
    }))
}

function asciiGptBoard(board: GptBoardView): string {
  const grid = board.grid ?? boundsFromBoard(board)
  const self = board.self?.anchor
  const opponent = board.opponent?.anchor
  const hazards = new Set((board.hazardCells ?? []).map((cell) => coordKey(cell.x, cell.z)))
  const reachable = new Set((board.reachableCells ?? []).map((cell) => coordKey(cell.x, cell.z)))
  const attacks = new Set((board.attackableCells ?? []).map((cell) => coordKey(cell.x, cell.z)))

  for (const cell of board.cells ?? []) {
    const key = coordKey(cell.x, cell.z)
    if (cell.reachable || cell.legal?.moveHere) {
      reachable.add(key)
    }
    if (cell.legal?.attacksFromHere?.length) {
      attacks.add(key)
    }
  }

  const rows = [
    'Legend: B=self, R=opponent, *=reachable attack cell, +=reachable, H=hazard, .=empty',
    `x ${grid.xMin}..${grid.xMax}, z ${grid.zMin}..${grid.zMax}`,
    `     ${range(grid.xMin, grid.xMax).map((x) => String(x).padStart(3, ' ')).join('')}`,
  ]

  for (let z = grid.zMax; z >= grid.zMin; z -= 1) {
    const cells = range(grid.xMin, grid.xMax).map((x) => {
      const key = coordKey(x, z)
      const marker = self?.x === x && self.z === z
        ? 'B'
        : opponent?.x === x && opponent.z === z
          ? 'R'
          : attacks.has(key)
            ? '*'
            : hazards.has(key)
              ? 'H'
              : reachable.has(key)
                ? '+'
                : '.'

      return marker.padStart(3, ' ')
    }).join('')
    rows.push(`z=${String(z).padStart(3, ' ')}${cells}`)
  }

  return rows.join('\n')
}

function boundsFromBoard(board: GptBoardView): NonNullable<GptBoardView['grid']> {
  const coords = [
    ...(board.cells ?? []),
    ...(board.hazardCells ?? []),
    ...(board.self ? [board.self.anchor] : []),
    ...(board.opponent ? [board.opponent.anchor] : []),
  ]
  const xs = coords.map((coord) => coord.x)
  const zs = coords.map((coord) => coord.z)

  return {
    cellSize: 1,
    xMin: Math.min(...xs, -12),
    xMax: Math.max(...xs, 12),
    zMin: Math.min(...zs, -8),
    zMax: Math.max(...zs, 8),
  }
}

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index)
}

function coordKey(x: number, z: number): string {
  return `${x}:${z}`
}

function compactGptBoard(board: GptBoardView): Record<string, unknown> {
  return {
    ...(board.grid ? { grid: board.grid } : {}),
    ...(board.self ? { self: board.self } : {}),
    ...(board.opponent ? { opponent: board.opponent } : {}),
    ...(board.hazardCells ? { hazardCells: board.hazardCells.slice(0, GPT_COMPACT_BOARD_LIST_LIMIT) } : {}),
    ...(board.reachablePoses
      ? { reachablePoses: board.reachablePoses.slice(0, GPT_COMPACT_BOARD_LIST_LIMIT).map(compactGptBoardPose) }
      : {}),
    ...(board.attackableTargets
      ? { attackableTargets: board.attackableTargets.slice(0, GPT_COMPACT_BOARD_LIST_LIMIT).map(compactGptBoardTarget) }
      : {}),
    ...(board.cells ? { cells: compactGptBoardCells(board) } : {}),
  }
}

function compactGptBoardCells(board: GptBoardView): Array<Record<string, unknown>> {
  const cells = board.cells ?? []
  const selected: GptBoardCell[] = []
  const seen = new Set<string>()
  const addCell = (cell: GptBoardCell): void => {
    if (seen.has(cell.cellId) || selected.length >= GPT_COMPACT_BOARD_CELL_LIMIT) {
      return
    }

    seen.add(cell.cellId)
    selected.push(cell)
  }
  const addMatching = (predicate: (cell: GptBoardCell) => boolean): void => {
    for (const cell of cells) {
      if (selected.length >= GPT_COMPACT_BOARD_CELL_LIMIT) {
        return
      }

      if (predicate(cell)) {
        addCell(cell)
      }
    }
  }

  addMatching((cell) => cell.occupant === 'self' || cell.occupant === 'opponent')
  addMatching((cell) => Boolean(cell.legal || cell.targetableByActionIds?.length))
  addMatching((cell) => Boolean(cell.hazardIds?.length))
  addMatching((cell) => cell.reachable === true || Boolean(cell.reachableByActionIds?.length))
  addMatching(() => true)

  return selected.map(compactGptBoardCell)
}

function compactGptBoardCell(cell: GptBoardCell): Record<string, unknown> {
  const legal = cell.legal ? compactGptCellLegal(cell.legal) : undefined

  return {
    cellId: cell.cellId,
    x: cell.x,
    z: cell.z,
    ...(cell.occupant ? { occupant: cell.occupant } : {}),
    ...(cell.blocksMovement ? { blocksMovement: true } : {}),
    ...(cell.hazardIds?.length ? { hazardIds: cell.hazardIds } : {}),
    ...(typeof cell.distanceToOpponent === 'number' ? { distanceToOpponent: cell.distanceToOpponent } : {}),
    ...(typeof cell.lineOfSightToOpponent === 'boolean' ? { lineOfSightToOpponent: cell.lineOfSightToOpponent } : {}),
    ...(cell.reachable === true ? { reachable: true } : {}),
    ...(typeof cell.mobilityCost === 'number' ? { mobilityCost: cell.mobilityCost } : {}),
    ...(typeof cell.mobilityRemaining === 'number' ? { mobilityRemaining: cell.mobilityRemaining } : {}),
    ...(legal ? { legal } : {}),
    ...(cell.reachableByActionIds?.length
      ? { reachableByActionIds: cell.reachableByActionIds.slice(0, GPT_COMPACT_ACTION_REF_LIMIT) }
      : {}),
    ...(cell.targetableByActionIds?.length
      ? { targetableByActionIds: cell.targetableByActionIds.slice(0, GPT_COMPACT_ACTION_REF_LIMIT) }
      : {}),
  }
}

function compactGptCellLegal(legal: GptBoardLegalView): Record<string, unknown> | undefined {
  return stripUndefinedFields({
    moveHere: legal.moveHere ? compactGptBoardActionRef(legal.moveHere) : undefined,
    attacksFromHere: legal.attacksFromHere
      ?.slice(0, GPT_COMPACT_ACTION_REF_LIMIT)
      .map(compactGptBoardAttackRef),
    useUtilityFromHere: legal.useUtilityFromHere ? compactGptBoardActionRef(legal.useUtilityFromHere) : undefined,
  })
}

function compactGptBoardActionRef(ref: GptBoardLegalActionRef): Record<string, unknown> {
  return {
    actionId: ref.actionId,
    kind: ref.kind,
    ...(ref.label ? { label: ref.label } : {}),
    ...(ref.summary ? { summary: ref.summary } : {}),
  }
}

function compactGptBoardAttackRef(ref: GptBoardAttackRef): Record<string, unknown> {
  return {
    ...compactGptBoardActionRef(ref),
    targetId: ref.targetId,
    targetCellId: ref.targetCellId,
    ...(ref.weaponSlot ? { weaponSlot: ref.weaponSlot } : {}),
  }
}

function compactGptBoardPose(pose: GptBoardPose): Record<string, unknown> {
  return {
    poseId: pose.poseId,
    anchor: pose.anchor,
    facing: pose.facing,
    actionIds: pose.actionIds.slice(0, GPT_COMPACT_ACTION_REF_LIMIT),
    ...(typeof pose.distanceToOpponent === 'number' ? { distanceToOpponent: pose.distanceToOpponent } : {}),
    ...(typeof pose.lineOfSightToOpponent === 'boolean' ? { lineOfSightToOpponent: pose.lineOfSightToOpponent } : {}),
    ...(typeof pose.hazardExposure === 'number' ? { hazardExposure: pose.hazardExposure } : {}),
    ...(pose.riskTags?.length ? { riskTags: pose.riskTags.slice(0, GPT_COMPACT_ACTION_REF_LIMIT) } : {}),
  }
}

function compactGptBoardTarget(target: GptBoardTarget): Record<string, unknown> {
  return {
    targetId: target.targetId,
    kind: target.kind,
    cell: target.cell,
    actionIds: target.actionIds.slice(0, GPT_COMPACT_ACTION_REF_LIMIT),
    ...(typeof target.distance === 'number' ? { distance: target.distance } : {}),
    ...(typeof target.lineOfSight === 'boolean' ? { lineOfSight: target.lineOfSight } : {}),
  }
}

function stripUndefinedFields(record: Record<string, unknown>): Record<string, unknown> | undefined {
  const entries = Object.entries(record).filter(([, value]) => value !== undefined)

  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function compactGptLegalAction(
  action: GameMasterLegalAction,
  options: { omitParameterDetails?: boolean; omitPreview?: boolean } = {},
): Record<string, unknown> {
  return {
    id: action.id,
    kind: action.kind,
    label: action.label,
    summary: action.summary,
    ...(action.requirements ? { requirements: action.requirements } : {}),
    ...(!options.omitParameterDetails && action.parameterSchema ? { parameterSchema: action.parameterSchema } : {}),
    ...(!options.omitParameterDetails && action.parameterExamples ? { parameterExamples: action.parameterExamples.slice(0, 3) } : {}),
    ...(!options.omitPreview && action.preview ? { preview: compactGptActionPreview(action.preview) } : {}),
  }
}

function compactGptActionPreview(preview: GptActionPreview): Record<string, unknown> {
  return {
    basis: preview.basis,
    outcome: preview.outcome,
    ...(preview.finalPose ? { finalPose: preview.finalPose } : {}),
    ...(preview.target ? { target: preview.target } : {}),
    ...(typeof preview.currentLineOfSight === 'boolean' ? { currentLineOfSight: preview.currentLineOfSight } : {}),
    ...(typeof preview.expectedRangeIfOpponentHolds === 'number'
      ? { expectedRangeIfOpponentHolds: preview.expectedRangeIfOpponentHolds }
      : {}),
    ...(typeof preview.hazardExposure === 'number' ? { hazardExposure: preview.hazardExposure } : {}),
    ...(preview.riskTags?.length ? { riskTags: preview.riskTags.slice(0, GPT_COMPACT_ACTION_REF_LIMIT) } : {}),
  }
}

function compactGptMountSlotAlias(alias: GptMountSlotAlias): Record<string, unknown> {
  return {
    id: alias.id,
    kind: alias.kind,
    label: alias.label,
    summary: alias.summary,
    mountSlotId: alias.mountSlotId,
    resolvesToActionId: alias.resolvesToActionId,
    semanticTags: alias.semanticTags,
  }
}

function resolveGptMountSlotAlias(
  packet: GameMasterPacket,
  actionId: string,
): { alias: GptMountSlotAlias; canonicalAction: GameMasterLegalAction } | undefined {
  if (!actionId.startsWith(`${GPT_MOUNT_SLOT_ALIAS_PREFIX}.`)) {
    return undefined
  }

  for (const canonicalAction of packet.legalActions) {
    const alias = gptMountSlotAliasesForAction(canonicalAction)
      .find((candidate) => candidate.id === actionId)

    if (alias) {
      return { alias, canonicalAction }
    }
  }

  return undefined
}

function gptMountSlotAliasesForPacket(packet: GameMasterPacket): GptMountSlotAlias[] {
  if (packet.buildState?.step !== 'propose_mount_pose') {
    return []
  }

  return packet.legalActions
    .flatMap((action) => gptMountSlotAliasesForAction(action))
    .slice(0, GPT_MOUNT_SLOT_ALIAS_LIMIT)
}

function gptMountSlotAliasesForAction(action: GameMasterLegalAction): GptMountSlotAlias[] {
  if (action.kind !== 'propose_mount_pose' || !Array.isArray(action.parameterExamples)) {
    return []
  }

  const aliases: GptMountSlotAlias[] = []
  const seenParameters = new Set<string>()
  const canonicalToken = gptAliasToken(action.id)

  for (const example of action.parameterExamples) {
    if (aliases.length >= GPT_MOUNT_SLOT_ALIAS_LIMIT) {
      break
    }

    const parameters = mountPoseParametersFromExample(example)

    if (!parameters) {
      continue
    }

    const parameterKey = JSON.stringify(parameters)

    if (seenParameters.has(parameterKey)) {
      continue
    }

    seenParameters.add(parameterKey)
    const descriptor = gptMountSlotDescriptor(parameters)
    const slotToken = gptAliasToken(`${descriptor.mountSlotId}.${aliases.length + 1}`)

    aliases.push({
      id: `${GPT_MOUNT_SLOT_ALIAS_PREFIX}.${canonicalToken}.${slotToken}`,
      kind: 'propose_mount_pose',
      label: descriptor.label,
      summary: descriptor.summary,
      mountSlotId: descriptor.mountSlotId,
      resolvesToActionId: action.id,
      semanticTags: descriptor.semanticTags,
      parameters,
    })
  }

  return aliases
}

function mountPoseParametersFromExample(value: GameMasterActionParameters): GameMasterActionParameters | undefined {
  if (
    typeof value.childPartId !== 'string' ||
    typeof value.parentInstanceId !== 'string' ||
    typeof value.mountSurfaceId !== 'string' ||
    typeof value.u !== 'number' ||
    typeof value.v !== 'number' ||
    typeof value.yawDegrees !== 'number' ||
    typeof value.rollDegrees !== 'number'
  ) {
    return undefined
  }

  return {
    childPartId: value.childPartId,
    parentInstanceId: value.parentInstanceId,
    mountSurfaceId: value.mountSurfaceId,
    u: value.u,
    v: value.v,
    yawDegrees: value.yawDegrees,
    rollDegrees: value.rollDegrees,
  }
}

function gptMountSlotDescriptor(parameters: GameMasterActionParameters): {
  mountSlotId: string
  label: string
  summary: string
  semanticTags: string[]
} {
  const u = typeof parameters.u === 'number' ? parameters.u : 0.5
  const v = typeof parameters.v === 'number' ? parameters.v : 0.5
  const surface = typeof parameters.mountSurfaceId === 'string' ? parameters.mountSurfaceId : 'mount_surface'
  const surfaceLabel = surfaceLabelForGpt(surface)
  const horizontal = u < 0.34 ? 'left' : u > 0.66 ? 'right' : 'center'
  const vertical = v < 0.34 ? 'low' : v > 0.66 ? 'high' : 'middle'
  const isCenter = horizontal === 'center' && vertical === 'middle'
  const slotName = isCenter
    ? 'center'
    : [vertical === 'middle' ? undefined : vertical, horizontal === 'center' ? undefined : horizontal]
      .filter(Boolean)
      .join('-')
  const label = isCenter
    ? `Center mount on ${surfaceLabel}`
    : `${titleCase(slotName)} mount on ${surfaceLabel}`
  const summary = isCenter
    ? `Balanced matrix slot on ${surfaceLabel}; useful when the agent wants stable, centered placement.`
    : `Offset matrix slot on ${surfaceLabel}; useful for asymmetric contact, protection, or hazard-bait positioning.`

  return {
    mountSlotId: `${surface}.${slotName}`,
    label,
    summary,
    semanticTags: ['mount_matrix', surface, isCenter ? 'balanced' : 'offset', horizontal, vertical],
  }
}

function surfaceLabelForGpt(surfaceId: string): string {
  return surfaceId
    .replace(/^core[_-]?/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase()) || 'Mount Surface'
}

function titleCase(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ')
}

function gptAliasToken(value: string): string {
  return value
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96)
    .toLowerCase() || 'slot'
}

function gptCatalogPartSummary(part: PartDefinition): GptCatalogPartSummary {
  return {
    id: part.id,
    category: part.category,
    displayName: part.displayName,
    cost: part.cost,
    mass: part.mass,
    durability: part.durability,
    size: part.size,
    stats: part.stats,
    tags: part.tags,
    ...(part.controls ? { controls: part.controls } : {}),
    ...(part.behavior ? { behavior: part.behavior } : {}),
  }
}

function parseGptInvite(value: unknown): { ok: true; value: GptInvite } | { ok: false; response: Response } {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {
      ok: false,
      response: errorResponse(400, 'INVALID_REQUEST', 'inviteUrl is required.'),
    }
  }

  let url: URL

  try {
    url = new URL(value)
  } catch {
    return {
      ok: false,
      response: errorResponse(400, 'INVALID_REQUEST', 'inviteUrl must be a valid URL.'),
    }
  }

  const params = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
  const sessionId = params.get('session') ?? ''
  const role = params.get('role') ?? ''
  const claimToken = params.get('claimToken') ?? params.get('invite') ?? ''
  const apiBase = params.get('api') ?? undefined

  if (!isSessionId(sessionId)) {
    return {
      ok: false,
      response: invalidDurableObjectSessionIdResponse(),
    }
  }

  if (role !== 'red' && role !== 'blue') {
    return {
      ok: false,
      response: errorResponse(400, 'INVALID_ROLE', 'inviteUrl role must be red or blue.'),
    }
  }

  if (!claimToken.trim()) {
    return {
      ok: false,
      response: errorResponse(401, 'INVALID_TOKEN', 'inviteUrl must include claimToken.'),
    }
  }

  return {
    ok: true,
    value: {
      sessionId,
      role,
      claimToken,
      ...(apiBase ? { apiBase } : {}),
    },
  }
}

function normalizeGptTeamIdentity(input: GptTeamIdentityInput): TeamIdentity {
  return {
    name: input.name,
    colorHex: input.colorHex,
    ...(input.logoPrompt ? { logoPrompt: input.logoPrompt } : {}),
    ...(input.logoAsset ? { logoAsset: input.logoAsset } : {}),
  }
}

function defaultGptTeamIdentity(invite: Pick<GptInvite, 'role' | 'sessionId'>): TeamIdentity {
  const roleLabel = invite.role === 'red' ? 'Red' : 'Blue'
  const suffix = gptIdentitySessionSuffix(invite.sessionId)

  return {
    name: `${roleLabel} ${suffix}`,
    colorHex: invite.role === 'red' ? '#ff4c5d' : '#5b9dff',
    logoPrompt: `${roleLabel} ${suffix} combat robotics logo with ${roleLabel.toLowerCase()} mechanical crest`,
  }
}

function defaultGptAgentName(invite: Pick<GptInvite, 'role' | 'sessionId'>): string {
  const roleLabel = invite.role === 'red' ? 'Red' : 'Blue'
  const suffix = gptIdentitySessionSuffix(invite.sessionId)

  return `${roleLabel} ${suffix} GPT`
}

function gptIdentitySessionSuffix(sessionId: string): string {
  const suffix = sessionId.replace(/^s_/i, '').replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()

  return suffix || 'ARENA'
}

function isGptCompactCombatDecision(
  packet: Pick<GameMasterPacket, 'nextAction' | 'phase'>,
): boolean {
  return packet.phase === 'combat_turn' && packet.nextAction === 'choose_turn'
}

function gptAutoPollConfig(env: WorkerEnv): GptAutoPollConfig {
  return {
    attempts: boundedInteger(
      env.GPT_AUTO_POLL_ATTEMPTS,
      DEFAULT_GPT_AUTO_POLL_ATTEMPTS,
      0,
      MAX_GPT_AUTO_POLL_ATTEMPTS,
    ),
    delayMs: boundedInteger(
      env.GPT_AUTO_POLL_DELAY_MS,
      DEFAULT_GPT_AUTO_POLL_DELAY_MS,
      0,
      MAX_GPT_AUTO_POLL_DELAY_MS,
    ),
  }
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value.trim() === '') {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(Math.max(Math.trunc(parsed), min), max)
}

function wait(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve()
  }

  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

function gptPacketStatus(
  packet: Pick<GameMasterPacket, 'legalActions' | 'nextAction' | 'phase' | 'review' | 'sharedDebrief'>,
): Exclude<GptPacketStatus, 'claimed'> {
  if (packet.phase === 'expired') {
    return 'expired'
  }

  if (packet.nextAction === 'session_complete' || packet.nextAction === 'stop') {
    return 'complete'
  }

  return isGptCompactCombatDecision(packet) ||
      packet.legalActions.length > 0 ||
      packet.nextAction === 'submit_reflection' ||
      (packet.nextAction === 'wait_for_debrief' &&
        packet.review?.debrief.available === true &&
        packet.sharedDebrief !== undefined) ||
      packet.nextAction === 'view_replay'
    ? 'playable'
    : 'waiting'
}

function gptContinuationForPacket(
  packet: Pick<GameMasterPacket, 'legalActions' | 'nextAction' | 'phase' | 'review' | 'sharedDebrief'>,
  statusOverride?: GptPacketStatus,
): Record<string, unknown> {
  const status = statusOverride ?? gptPacketStatus(packet)

  if (status === 'complete' || status === 'expired') {
    return {
      keepGoing: false,
      mustCallBeforeResponding: false,
      recommendedNextCall: 'stop',
      instruction: 'Stop calling actions for this invite unless the user asks to inspect the final state.',
    }
  }

  if (packet.nextAction === 'submit_reflection') {
    return {
      keepGoing: true,
      mustCallBeforeResponding: true,
      recommendedNextCall: 'gptReflection',
      instruction: 'Call gptReflection now with a concise private reflection before writing any user-visible response, then follow the returned continuation. Do not ask the user to type continue.',
    }
  }

  if (packet.nextAction === 'wait_for_debrief') {
    const review = packet.review

    if (review?.debrief.available) {
      return {
        keepGoing: false,
        mustCallBeforeResponding: false,
        recommendedNextCall: 'stop',
        instruction: 'Shared debrief is available in packet.sharedDebrief and the resolved replay remains available to the referee. Present the fight result/debrief now; do not call gptNext again until the user or referee advances the round.',
      }
    }

    if (review?.reflection.submitted && !review.reflection.opponentSubmitted) {
      return {
        keepGoing: true,
        mustCallBeforeResponding: true,
        recommendedNextCall: 'gptNext',
        pollAfterMs: 1500,
        instruction: 'Your private reflection is submitted. The shared debrief is waiting on the opponent reflection, so call gptNext again after a short wait before writing any user-visible response. Do not ask the user to type continue.',
      }
    }

    return {
      keepGoing: true,
      mustCallBeforeResponding: true,
      recommendedNextCall: 'gptNext',
      pollAfterMs: 1500,
      instruction: 'Waiting for a fight-scoped shared debrief or referee round advance. Call gptNext again after a short wait before writing any user-visible response. Do not ask the user to type continue.',
    }
  }

  if (isGptCompactCombatDecision(packet)) {
    return {
      keepGoing: true,
      mustCallBeforeResponding: true,
      recommendedNextCall: 'gptAct',
      instruction: 'Call gptAct now with actionId combat_plan and parameters.steps from packet.combat. Do not choose packet.legalActions during combat and do not ask the user to type continue.',
    }
  }

  if (packet.legalActions.length > 0) {
    return {
      keepGoing: true,
      mustCallBeforeResponding: true,
      recommendedNextCall: 'gptAct',
      instruction: 'Choose exactly one current packet.legalActions[].id and call gptAct now before writing any user-visible response. Do not ask the user to type continue.',
    }
  }

  return {
    keepGoing: true,
    mustCallBeforeResponding: true,
    recommendedNextCall: 'gptNext',
    pollAfterMs: 1500,
    instruction: 'Call gptNext again after a short wait before writing any user-visible response. Keep polling until the returned status is playable, complete, or expired. Do not ask the user to type continue.',
  }
}

function gptNextStepDirective(continuation: Record<string, unknown>): Record<string, unknown> {
  const requiresAction =
    continuation.keepGoing === true || continuation.mustCallBeforeResponding === true

  return {
    beforeUserResponse: requiresAction,
    userVisibleResponseAllowed: !requiresAction,
    recommendedNextCall: continuation.recommendedNextCall,
    instruction: continuation.instruction,
  }
}

export default {
  fetch: handleWorkerRequest,
}
