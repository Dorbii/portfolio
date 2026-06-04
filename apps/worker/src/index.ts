import {
  TEAM_ROLES,
  createAgentContract,
  validateAgentBootstrapRequestShape,
  validateCreateSessionRequestShape,
  validateRoleClaimRequestShape,
  type AgentBootstrapRequest,
  type CreateSessionRequest,
  type RelayErrorResponse,
  type RoleClaimRequest,
  type TeamRole,
} from '../../../packages/schemas/src/index.js'
import { PART_CATALOG } from '../../../packages/catalog/src/index.js'
import {
  SessionCoordinator,
  createSessionId,
  type StoredSessionState,
} from './session.js'

const STORAGE_KEY = 'agent-arena-session'
const SESSION_ID_PATTERN = /^s_[A-Za-z0-9_-]{1,64}$/

type DurableObjectId = unknown

type DurableObjectStorage = {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
}

type DurableObjectState = {
  storage: DurableObjectStorage
}

type DurableObjectStub = {
  fetch(request: Request): Promise<Response>
}

export type DurableObjectNamespace = {
  idFromName(name: string): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub
}

export type WorkerEnv = {
  AGENT_ARENA_SESSION?: DurableObjectNamespace
  AGENT_ARENA_ALLOWED_ORIGINS?: string
}

const DEFAULT_ALLOWED_CORS_ORIGINS = ['https://arena.dorbii.net']
const LOCAL_DEV_CORS_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
const MAX_JSON_BODY_BYTES = 64 * 1024
const BODY_TOO_LARGE = Symbol('BODY_TOO_LARGE')
const textDecoder = new TextDecoder()

function normalizeConfiguredOrigin(value: string): string | undefined {
  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  try {
    const originValue = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`

    return new URL(originValue).origin
  } catch {
    return undefined
  }
}

function configuredCorsOrigins(env: WorkerEnv): Set<string> {
  const origins = new Set(
    DEFAULT_ALLOWED_CORS_ORIGINS
      .map(normalizeConfiguredOrigin)
      .filter((origin): origin is string => Boolean(origin)),
  )

  for (const value of env.AGENT_ARENA_ALLOWED_ORIGINS?.split(/[\s,]+/) ?? []) {
    const origin = normalizeConfiguredOrigin(value)

    if (origin) {
      origins.add(origin)
    }
  }

  return origins
}

function allowedCorsOrigin(request: Request, env: WorkerEnv): string | undefined {
  const originHeader = request.headers.get('origin')

  if (!originHeader) {
    return undefined
  }

  try {
    const origin = new URL(originHeader)

    if (
      (origin.protocol === 'http:' || origin.protocol === 'https:') &&
      LOCAL_DEV_CORS_HOSTS.has(origin.hostname)
    ) {
      return origin.origin
    }

    if (configuredCorsOrigins(env).has(origin.origin)) {
      return origin.origin
    }
  } catch {
    return undefined
  }

  return undefined
}

function appendVaryOrigin(headers: Headers): void {
  const vary = headers.get('vary')

  if (!vary) {
    headers.set('vary', 'Origin')

    return
  }

  if (!vary.split(',').some((value) => value.trim().toLowerCase() === 'origin')) {
    headers.set('vary', `${vary}, Origin`)
  }
}

function corsHeaders(
  request?: Request,
  env: WorkerEnv = {},
  headersInit?: HeadersInit,
): Headers {
  const headers = new Headers(headersInit)
  const origin = request ? allowedCorsOrigin(request, env) : undefined

  if (origin) {
    headers.set('access-control-allow-origin', origin)
    appendVaryOrigin(headers)
  }

  headers.set('access-control-allow-methods', 'GET, POST, OPTIONS')
  headers.set('access-control-allow-headers', 'authorization, content-type')
  headers.set('access-control-max-age', '86400')

  return headers
}

function withCors(response: Response, request: Request, env: WorkerEnv): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: corsHeaders(request, env, response.headers),
  })
}

function jsonResponse(
  value: unknown,
  init: ResponseInit = {},
  request?: Request,
  env?: WorkerEnv,
): Response {
  const headers = corsHeaders(request, env, init.headers)
  headers.set('content-type', 'application/json')

  return new Response(JSON.stringify(value, null, 2), {
    ...init,
    headers,
  })
}

function preflightResponse(request: Request, env: WorkerEnv): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env),
  })
}

function errorResponse(
  status: number,
  code: RelayErrorResponse['error']['code'],
  message: string,
  issues?: RelayErrorResponse['error']['issues'],
  request?: Request,
  env?: WorkerEnv,
): Response {
  return jsonResponse(
    {
      ok: false,
      error: {
        code,
        message,
        ...(issues ? { issues } : {}),
      },
    },
    { status },
    request,
    env,
  )
}

function contentLengthTooLarge(request: Request): boolean {
  const contentLength = request.headers.get('content-length')

  if (!contentLength) {
    return false
  }

  const parsedLength = Number(contentLength)

  return Number.isFinite(parsedLength) && parsedLength > MAX_JSON_BODY_BYTES
}

async function readRequestText(request: Request): Promise<string | typeof BODY_TOO_LARGE> {
  if (contentLengthTooLarge(request)) {
    return BODY_TOO_LARGE
  }

  if (!request.body) {
    return ''
  }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    if (!value) {
      continue
    }

    totalBytes += value.byteLength

    if (totalBytes > MAX_JSON_BODY_BYTES) {
      try {
        await reader.cancel()
      } catch {
        // The stream may already be closed by the runtime after the oversized chunk.
      }

      return BODY_TOO_LARGE
    }

    chunks.push(value)
  }

  if (chunks.length === 0) {
    return ''
  }

  if (chunks.length === 1) {
    return textDecoder.decode(chunks[0])
  }

  const bodyBytes = new Uint8Array(totalBytes)
  let offset = 0

  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return textDecoder.decode(bodyBytes)
}

async function readJsonBody(request: Request): Promise<unknown | typeof BODY_TOO_LARGE> {
  const text = await readRequestText(request)

  if (isBodyTooLarge(text)) {
    return BODY_TOO_LARGE
  }

  if (text.trim().length === 0) {
    return {}
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSessionId(value: string): boolean {
  return SESSION_ID_PATTERN.test(value)
}

function requestWithJson(request: Request, url: URL, body: unknown): Request {
  const headers = new Headers(request.headers)
  headers.set('content-type', 'application/json')

  return new Request(url, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
  })
}

function bearerToken(request: Request): string | undefined {
  const authorization = request.headers.get('authorization')
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '')

  return match?.[1]
}

function sessionRoute(pathname: string):
  | {
      sessionId: string
      action: string
    }
  | undefined {
  const match = /^\/sessions\/([^/]+)\/([^/]+)$/.exec(pathname)

  if (!match) {
    return undefined
  }

  let sessionId = ''

  try {
    sessionId = decodeURIComponent(match[1])
  } catch {
    sessionId = ''
  }

  return {
    sessionId,
    action: match[2],
  }
}

function sessionRoleRoute(pathname: string):
  | {
      sessionId: string
      role: TeamRole
      action: string
    }
  | undefined {
  const match = /^\/sessions\/([^/]+)\/roles\/([^/]+)\/([^/]+)$/.exec(pathname)

  if (!match) {
    return undefined
  }

  let sessionId = ''
  let role = ''

  try {
    sessionId = decodeURIComponent(match[1])
    role = decodeURIComponent(match[2])
  } catch {
    sessionId = ''
    role = ''
  }

  if (!isTeamRole(role)) {
    return undefined
  }

  return {
    sessionId,
    role,
    action: match[3],
  }
}

function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === 'string' && TEAM_ROLES.includes(value as TeamRole)
}

function isBodyTooLarge(value: unknown): value is typeof BODY_TOO_LARGE {
  return value === BODY_TOO_LARGE
}

function bodyTooLargeResponse(request?: Request, env?: WorkerEnv): Response {
  return errorResponse(
    413,
    'INVALID_REQUEST',
    `JSON request body must be ${MAX_JSON_BODY_BYTES} bytes or smaller.`,
    undefined,
    request,
    env,
  )
}

function statusForRelayError(error: RelayErrorResponse['error']): number {
  switch (error.code) {
    case 'BAD_JSON':
    case 'INVALID_ACTION':
    case 'INVALID_REQUEST':
    case 'INVALID_ROLE':
    case 'SUBMISSION_INVALID':
      return 400
    case 'INVALID_TOKEN':
      return 401
    case 'SESSION_NOT_FOUND':
    case 'REPLAY_NOT_AVAILABLE':
      return 404
    case 'SESSION_EXPIRED':
      return 410
    case 'ROLE_ALREADY_CLAIMED':
    case 'SESSION_EXISTS':
    case 'PHASE_CLOSED':
    case 'ALREADY_SUBMITTED':
      return 409
    case 'RATE_LIMITED':
      return 429
    case 'WORKER_NOT_CONFIGURED':
      return 500
  }
}

async function forwardToSessionObject(
  request: Request,
  env: WorkerEnv,
  sessionId: string,
): Promise<Response> {
  if (!env.AGENT_ARENA_SESSION) {
    return errorResponse(
      500,
      'WORKER_NOT_CONFIGURED',
      'AGENT_ARENA_SESSION Durable Object binding is missing.',
      undefined,
      request,
      env,
    )
  }

  const id = env.AGENT_ARENA_SESSION.idFromName(sessionId)
  const stub = env.AGENT_ARENA_SESSION.get(id)

  return withCors(await stub.fetch(request), request, env)
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
    const body = await readJsonBody(request)

    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse(request, env)
    }

    if (body === undefined || !isRecord(body)) {
      return errorResponse(400, 'BAD_JSON', 'Create session body must be JSON.', undefined, request, env)
    }

    const validation = validateCreateSessionRequestShape(body)

    if (!validation.ok) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Create session request failed validation.',
        validation.issues,
        request,
        env,
      )
    }

    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId.trim().length > 0
        ? body.sessionId.trim()
        : createSessionId()

    if (!isSessionId(sessionId)) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Session id must start with s_ and contain only letters, numbers, underscores, or hyphens.',
        undefined,
        request,
        env,
      )
    }

    const internalUrl = new URL(request.url)
    internalUrl.pathname = `/sessions/${encodeURIComponent(sessionId)}/create`

    return forwardToSessionObject(
      requestWithJson(request, internalUrl, { ...body, sessionId }),
      env,
      sessionId,
    )
  }

  const roleRoute = sessionRoleRoute(url.pathname)

  if (roleRoute) {
    if (!isSessionId(roleRoute.sessionId)) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Session id must start with s_ and contain only letters, numbers, underscores, or hyphens.',
        undefined,
        request,
        env,
      )
    }

    return forwardToSessionObject(request, env, roleRoute.sessionId)
  }

  const route = sessionRoute(url.pathname)

  if (route) {
    if (!isSessionId(route.sessionId)) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Session id must start with s_ and contain only letters, numbers, underscores, or hyphens.',
        undefined,
        request,
        env,
      )
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
      await this.saveSession(coordinator)

      if (!result.ok) {
        return jsonResponse(result, { status: statusForRelayError(result.error) })
      }

      return jsonResponse(result.value)
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

    if (route.action === 'referee-awards' && request.method === 'POST') {
      return this.submitRefereeAwards(request, coordinator)
    }

    if (route.action === 'reset-role' && request.method === 'POST') {
      return this.resetRole(request, coordinator)
    }

    if (route.action === 'replay' && request.method === 'GET') {
      const result = coordinator.getReplay()
      await this.saveSession(coordinator)

      if (!result.ok) {
        return jsonResponse(result, { status: statusForRelayError(result.error) })
      }

      return jsonResponse(result.value)
    }

    return errorResponse(404, 'INVALID_ACTION', 'Unsupported session action.')
  }

  private async createSession(request: Request, sessionId: string): Promise<Response> {
    const existing = await this.loadSession()

    if (existing) {
      return errorResponse(409, 'SESSION_EXISTS', 'Session already exists.')
    }

    const body = await readJsonBody(request)

    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse()
    }

    if (body === undefined || !isRecord(body)) {
      return errorResponse(400, 'BAD_JSON', 'Create session body must be JSON.')
    }

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
    const body = await readJsonBody(request)

    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse()
    }

    if (body === undefined || !isRecord(body)) {
      return errorResponse(400, 'BAD_JSON', 'Claim request body must be JSON.')
    }

    const validation = validateRoleClaimRequestShape(body)

    if (!validation.ok) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Claim request failed validation.',
        validation.issues,
      )
    }

    const result = await coordinator.claimRole(body as RoleClaimRequest)
    await this.saveSession(coordinator)

    if (!result.ok) {
      return jsonResponse(result, { status: statusForRelayError(result.error) })
    }

    return jsonResponse(result.value, { status: 201 })
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
    const body = await readJsonBody(request)

    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse()
    }

    if (body === undefined || !isRecord(body)) {
      return errorResponse(400, 'BAD_JSON', 'Bootstrap request body must be JSON.')
    }

    const validation = validateAgentBootstrapRequestShape(body)

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
      body as AgentBootstrapRequest,
    )
    await this.saveSession(coordinator)

    if (!result.ok) {
      return jsonResponse(result, { status: statusForRelayError(result.error) })
    }

    return jsonResponse(result.value, { status: result.value.claimedNow ? 201 : 200 })
  }

  private async submitRoundPlan(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const body = await readJsonBody(request)

    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse()
    }

    if (body === undefined) {
      return errorResponse(400, 'BAD_JSON', 'Round plan body must be JSON.')
    }

    const result = await coordinator.submitRoundPlan(bearerToken(request) ?? '', body)
    await this.saveSession(coordinator)

    if (!result.ok) {
      return jsonResponse(result, { status: statusForRelayError(result.error) })
    }

    return jsonResponse(result.value)
  }

  private async submitChatMessage(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const body = await readJsonBody(request)

    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse()
    }

    if (body === undefined) {
      return errorResponse(400, 'BAD_JSON', 'Chat message body must be JSON.')
    }

    const result = await coordinator.submitChatMessage(bearerToken(request) ?? '', body)
    await this.saveSession(coordinator)

    if (!result.ok) {
      return jsonResponse(result, { status: statusForRelayError(result.error) })
    }

    return jsonResponse(result.value)
  }

  private async submitPrivateChatMessage(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const body = await readJsonBody(request)

    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse()
    }

    if (body === undefined) {
      return errorResponse(400, 'BAD_JSON', 'Private chat message body must be JSON.')
    }

    const result = await coordinator.submitPrivateChatMessage(bearerToken(request) ?? '', body)
    await this.saveSession(coordinator)

    if (!result.ok) {
      return jsonResponse(result, { status: statusForRelayError(result.error) })
    }

    return jsonResponse(result.value)
  }

  private async submitRefereeAwards(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const body = await readJsonBody(request)

    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse()
    }

    if (body === undefined) {
      return errorResponse(400, 'BAD_JSON', 'Referee awards body must be JSON.')
    }

    const result = await coordinator.submitRefereeAwards(bearerToken(request) ?? '', body)
    await this.saveSession(coordinator)

    if (!result.ok) {
      return jsonResponse(result, { status: statusForRelayError(result.error) })
    }

    return jsonResponse(result.value)
  }

  private async resetRole(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const body = await readJsonBody(request)

    if (isBodyTooLarge(body)) {
      return bodyTooLargeResponse()
    }

    if (body === undefined) {
      return errorResponse(400, 'BAD_JSON', 'Role reset body must be JSON.')
    }

    const result = await coordinator.resetRole(bearerToken(request) ?? '', body)
    await this.saveSession(coordinator)

    if (!result.ok) {
      return jsonResponse(result, { status: statusForRelayError(result.error) })
    }

    return jsonResponse(result.value)
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
