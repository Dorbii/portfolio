import {
  createAgentContract,
  createAgentActionsOpenApi,
  validateCreateSessionRequestShape,
  validateRoleClaimRequestShape,
  type AgentBootstrapRequest,
  type GameMasterActionParameters,
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
import { validateLegacyAgentBootstrapRequestShape } from './sessionBootstrapLegacy.js'
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

type JsonRequestReadResult =
  | {
      ok: true
      body: unknown
    }
  | {
      ok: false
      response: Response
    }

type GptRouteAction = 'claim' | 'next' | 'act' | 'reflection'

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
  actionId: string
  parameters?: GameMasterActionParameters
  publicMessage?: string
}

type GptReflectBody = {
  inviteUrl: string
  claims: PostFightAgentReflection['claims']
  confidence?: PostFightAgentReflection['confidence']
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
      handle: (_request, coordinator) => this.replay(coordinator),
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
  }

  private readonly roleRoutes: Record<string, RoleRouteSpec> = {
    bootstrap: {
      method: 'POST',
      handle: (request, coordinator, role) => this.bootstrapRole(request, coordinator, role),
    },
  }

  constructor(state: DurableObjectState) {
    this.state = state
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
    const validation = validateLegacyAgentBootstrapRequestShape(body)

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

  private async replay(coordinator: SessionCoordinator): Promise<Response> {
    return this.sessionResultResponse(coordinator, coordinator.getReplay())
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

    const result = await coordinator.bootstrapRole(
      invite.value.role,
      invite.value.claimToken,
      {
        ...(typeof body.agentName === 'string' && body.agentName.trim()
          ? { agentName: body.agentName.trim() }
          : {}),
        ...(body.teamIdentity ? { teamIdentity: normalizeGptTeamIdentity(body.teamIdentity) } : {}),
      },
    )
    await this.saveSession(coordinator)

    if (!result.ok) {
      return jsonResponse(result, { status: statusForRelayError(result.error) })
    }

    return jsonResponse(
      {
        status: 'claimed',
        sessionId: result.value.sessionId,
        role: result.value.role,
        packet: result.value.packet,
      },
    )
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

    return this.sessionResultResponse(
      coordinator,
      result.ok
        ? {
            ok: true,
            value: {
              status: gptPacketStatus(result.value),
              sessionId: result.value.sessionId,
              role: result.value.role,
              packet: result.value,
            },
          }
        : result,
    )
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

    if (typeof body.actionId !== 'string' || body.actionId.trim().length === 0) {
      return errorResponse(400, 'SUBMISSION_INVALID', 'GPT actionId is required.')
    }

    const packetResult = await coordinator.getGameMasterPacketForToken(invite.value.claimToken)

    if (!packetResult.ok) {
      return this.sessionResultResponse(coordinator, packetResult)
    }

    const packet = packetResult.value
    const action = packet.legalActions.find((candidate) => candidate.id === body.actionId)

    if (!action || !packet.actionSetId) {
      return errorResponse(
        409,
        'SUBMISSION_INVALID',
        'actionId is not legal in the latest GameMasterPacket for this role.',
      )
    }

    const result = await coordinator.submitGameMasterAction(invite.value.claimToken, {
      action: 'submit_game_action',
      actionSetId: packet.actionSetId,
      decisionVersion: packet.decisionVersion,
      actionId: action.id,
      ...(body.parameters !== undefined ? { parameters: body.parameters } : {}),
      ...(typeof body.publicMessage === 'string' ? { publicMessage: body.publicMessage } : {}),
    })

    return this.sessionResultResponse(
      coordinator,
      result.ok
        ? {
            ok: true,
            value: {
              status: gptPacketStatus(result.value.packet),
              acceptedActionId: action.id,
              packet: result.value.packet,
              publicState: result.value.publicState,
            },
          }
        : result,
    )
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

    return this.sessionResultResponse(
      coordinator,
      result.ok
        ? {
            ok: true,
            value: {
              status: gptPacketStatus(result.value.packet),
              packet: result.value.packet,
            },
          }
        : result,
    )
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
  const match = /^\/gpt\/(claim|next|act|reflection)$/.exec(pathname)

  return match?.[1] as GptRouteAction | undefined
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

function gptPacketStatus(
  packet: { legalActions: unknown[]; nextAction: string; phase?: string },
): 'playable' | 'waiting' | 'complete' | 'expired' {
  if (packet.phase === 'expired') {
    return 'expired'
  }

  if (packet.nextAction === 'session_complete' || packet.nextAction === 'stop') {
    return 'complete'
  }

  return packet.legalActions.length > 0 || packet.nextAction === 'submit_reflection' || packet.nextAction === 'view_replay'
    ? 'playable'
    : 'waiting'
}

export default {
  fetch: handleWorkerRequest,
}
