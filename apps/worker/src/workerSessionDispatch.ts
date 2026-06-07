import {
  validateCreateSessionRequestShape,
  type CreateSessionRequest,
} from '../../../packages/schemas/src/index.js'
import { createSessionId } from './session.js'
import {
  bodyTooLargeResponse,
  errorResponse,
  isBodyTooLarge,
  isJsonRecord,
  readJsonBody,
  withCors,
} from './workerHttp.js'
import {
  isSessionId,
  requestWithJson,
} from './workerRoutes.js'
import type { WorkerEnv } from './workerTypes.js'

const INVALID_SESSION_ID_MESSAGE =
  'Session id must start with s_ and contain only letters, numbers, underscores, or hyphens.'

export function invalidSessionIdResponse(request?: Request, env?: WorkerEnv): Response {
  return errorResponse(
    400,
    'INVALID_REQUEST',
    INVALID_SESSION_ID_MESSAGE,
    undefined,
    request,
    env,
  )
}

export async function forwardToSessionObject(
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

export async function handlePublicCreateSessionRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const body = await readJsonBody(request)

  if (isBodyTooLarge(body)) {
    return bodyTooLargeResponse(request, env)
  }

  if (body === undefined || !isJsonRecord(body)) {
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

  const createRequest = body as CreateSessionRequest
  const sessionId =
    typeof createRequest.sessionId === 'string' && createRequest.sessionId.trim().length > 0
      ? createRequest.sessionId.trim()
      : createSessionId()
  const sanitizedCreateRequest: CreateSessionRequest = {
    sessionId,
    ...(typeof createRequest.seed === 'string' ? { seed: createRequest.seed } : {}),
    ...(typeof createRequest.maxRounds === 'number' ? { maxRounds: createRequest.maxRounds } : {}),
    ...(typeof createRequest.ttlSeconds === 'number' ? { ttlSeconds: createRequest.ttlSeconds } : {}),
    ...(createRequest.arena ? { arena: createRequest.arena } : {}),
  }

  if (!isSessionId(sessionId)) {
    return invalidSessionIdResponse(request, env)
  }

  const internalUrl = new URL(request.url)
  internalUrl.pathname = `/sessions/${encodeURIComponent(sessionId)}/create`

  return forwardToSessionObject(
    requestWithJson(request, internalUrl, sanitizedCreateRequest),
    env,
    sessionId,
  )
}
