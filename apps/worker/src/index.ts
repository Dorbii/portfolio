import {
  createAgentContract,
  validateAgentBootstrapRequestShape,
  validateCreateSessionRequestShape,
  validateRoleClaimRequestShape,
  type AgentBootstrapRequest,
  type CreateSessionRequest,
  type RoleClaimRequest,
  type TeamRole,
} from '../../../packages/schemas/src/index.js'
import { PART_CATALOG } from '../../../packages/catalog/src/index.js'
import {
  SessionCoordinator,
  type StoredSessionState,
} from './session.js'
import {
  bodyTooLargeResponse,
  errorResponse,
  isBodyTooLarge,
  isJsonRecord,
  jsonResponse,
  preflightResponse,
  readJsonBody,
  statusForRelayError,
} from './workerHttp.js'
import {
  bearerToken,
  isSessionId,
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

export async function handleWorkerRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') {
    return preflightResponse(request, env)
  }

  if (request.method === 'GET' && url.pathname === '/agent-spec.json') {
    return jsonResponse(createAgentContract({ partCatalog: PART_CATALOG }), {}, request, env)
  }

  if (request.method === 'POST' && url.pathname === '/sessions') {
    return handlePublicCreateSessionRequest(request, env)
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

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const roleRoute = sessionRoleRoute(url.pathname)

    if (roleRoute) {
      if (!isSessionId(roleRoute.sessionId)) {
        return errorResponse(
          400,
          'INVALID_REQUEST',
          'Session id must start with s_ and contain only letters, numbers, underscores, or hyphens.',
        )
      }

      const coordinator = await this.loadSession()

      if (!coordinator) {
        return errorResponse(404, 'SESSION_NOT_FOUND', 'Session has not been created.')
      }

      if (roleRoute.action === 'bootstrap' && request.method === 'POST') {
        return this.bootstrapRole(request, coordinator, roleRoute.role)
      }

      return errorResponse(404, 'INVALID_ACTION', 'Unsupported role session action.')
    }

    const route = sessionRoute(url.pathname)

    if (!route) {
      return errorResponse(404, 'INVALID_REQUEST', 'Session route not found.')
    }

    if (!isSessionId(route.sessionId)) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Session id must start with s_ and contain only letters, numbers, underscores, or hyphens.',
      )
    }

    if (route.action === 'create' && request.method === 'POST') {
      return this.createSession(request, route.sessionId)
    }

    const coordinator = await this.loadSession()

    if (!coordinator) {
      return errorResponse(404, 'SESSION_NOT_FOUND', 'Session has not been created.')
    }

    if (route.action === 'claim' && request.method === 'POST') {
      return this.claimRole(request, coordinator)
    }

    if (route.action === 'public' && request.method === 'GET') {
      const publicState = coordinator.getPublicState()
      await this.saveSession(coordinator)

      return jsonResponse(publicState)
    }

    if (route.action === 'state' && request.method === 'GET') {
      const result = await coordinator.getRoleStateForToken(bearerToken(request) ?? '')

      return this.sessionResultResponse(coordinator, result)
    }

    if (route.action === 'round-plan' && request.method === 'POST') {
      return this.submitRoundPlan(request, coordinator)
    }

    if (route.action === 'chat' && request.method === 'POST') {
      return this.submitChatMessage(request, coordinator)
    }

    if (route.action === 'private-chat' && request.method === 'POST') {
      return this.submitPrivateChatMessage(request, coordinator)
    }

    if (route.action === 'advance-round' && request.method === 'POST') {
      return this.advanceRound(request, coordinator)
    }

    if (route.action === 'reset-role' && request.method === 'POST') {
      return this.resetRole(request, coordinator)
    }

    if (route.action === 'replay' && request.method === 'GET') {
      const result = coordinator.getReplay()

      return this.sessionResultResponse(coordinator, result)
    }

    return errorResponse(404, 'INVALID_ACTION', 'Unsupported session action.')
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

    const coordinator = await SessionCoordinator.create({
      ...(body as CreateSessionRequest),
      sessionId,
    })
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
    const validation = validateAgentBootstrapRequestShape(body)

    if (!validation.ok) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Bootstrap request failed validation.',
        validation.issues,
      )
    }

    return this.sessionResultResponse(
      coordinator,
      await coordinator.bootstrapRole(
        role,
        bearerToken(request) ?? '',
        body as AgentBootstrapRequest,
      ),
      (value) => ({ status: value.claimedNow ? 201 : 200 }),
    )
  }

  private async submitRoundPlan(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const readResult = await this.readJsonRequest(request, 'Round plan body must be JSON.')

    if (!readResult.ok) {
      return readResult.response
    }

    return this.sessionResultResponse(
      coordinator,
      await coordinator.submitRoundPlan(bearerToken(request) ?? '', readResult.body),
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

export default {
  fetch: handleWorkerRequest,
}
