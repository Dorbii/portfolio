import {
  createAgentContract,
  type CreateSessionRequest,
  type RelayErrorResponse,
  type RoleClaimRequest,
} from '../../../packages/schemas/src/index.js'
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
}

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json')

  return new Response(JSON.stringify(value, null, 2), {
    ...init,
    headers,
  })
}

function errorResponse(
  status: number,
  code: RelayErrorResponse['error']['code'],
  message: string,
  issues?: RelayErrorResponse['error']['issues'],
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
  )
}

async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text()

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

  return {
    sessionId: decodeURIComponent(match[1]),
    action: match[2],
  }
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
    )
  }

  const id = env.AGENT_ARENA_SESSION.idFromName(sessionId)
  const stub = env.AGENT_ARENA_SESSION.get(id)

  return stub.fetch(request)
}

export async function handleWorkerRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const url = new URL(request.url)

  if (request.method === 'GET' && url.pathname === '/agent-spec.json') {
    return jsonResponse(createAgentContract())
  }

  if (request.method === 'POST' && url.pathname === '/sessions') {
    const body = await readJsonBody(request)

    if (body === undefined || !isRecord(body)) {
      return errorResponse(400, 'BAD_JSON', 'Create session body must be JSON.')
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

  const route = sessionRoute(url.pathname)

  if (route) {
    if (!isSessionId(route.sessionId)) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Session id must start with s_ and contain only letters, numbers, underscores, or hyphens.',
      )
    }

    return forwardToSessionObject(request, env, route.sessionId)
  }

  return errorResponse(404, 'INVALID_REQUEST', 'Route not found.')
}

export class AgentArenaSession {
  private readonly state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
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

    if (body === undefined || !isRecord(body)) {
      return errorResponse(400, 'BAD_JSON', 'Create session body must be JSON.')
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

    if (body === undefined || !isRecord(body)) {
      return errorResponse(400, 'BAD_JSON', 'Claim request body must be JSON.')
    }

    const result = await coordinator.claimRole(body as RoleClaimRequest)
    await this.saveSession(coordinator)

    if (!result.ok) {
      return jsonResponse(result, { status: statusForRelayError(result.error) })
    }

    return jsonResponse(result.value, { status: 201 })
  }

  private async submitRoundPlan(
    request: Request,
    coordinator: SessionCoordinator,
  ): Promise<Response> {
    const body = await readJsonBody(request)

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
