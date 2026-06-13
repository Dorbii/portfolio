import type { RelayErrorResponse } from '../../../packages/schemas/src/index.js'

type WorkerHttpEnv = {
  AGENT_ARENA_ALLOWED_ORIGINS?: string
}

const DEFAULT_ALLOWED_CORS_ORIGINS = [
  'https://arena.dorbii.net',
  'https://chatgpt.com',
  'https://chat.openai.com',
]
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

function configuredCorsOrigins(env: WorkerHttpEnv): Set<string> {
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

function allowedCorsOrigin(request: Request, env: WorkerHttpEnv): string | undefined {
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
  env: WorkerHttpEnv = {},
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

export function withCors(response: Response, request: Request, env: WorkerHttpEnv): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: corsHeaders(request, env, response.headers),
  })
}

export function jsonResponse(
  value: unknown,
  init: ResponseInit = {},
  request?: Request,
  env?: WorkerHttpEnv,
): Response {
  const headers = corsHeaders(request, env, init.headers)
  headers.set('content-type', 'application/json')

  return new Response(JSON.stringify(value, null, 2), {
    ...init,
    headers,
  })
}

export function preflightResponse(request: Request, env: WorkerHttpEnv): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env),
  })
}

export function errorResponse(
  status: number,
  code: RelayErrorResponse['error']['code'],
  message: string,
  issues?: RelayErrorResponse['error']['issues'],
  request?: Request,
  env?: WorkerHttpEnv,
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

export async function readJsonBody(request: Request): Promise<unknown | typeof BODY_TOO_LARGE> {
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

export function isBodyTooLarge(value: unknown): value is typeof BODY_TOO_LARGE {
  return value === BODY_TOO_LARGE
}

export function bodyTooLargeResponse(request?: Request, env?: WorkerHttpEnv): Response {
  return errorResponse(
    413,
    'INVALID_REQUEST',
    `JSON request body must be ${MAX_JSON_BODY_BYTES} bytes or smaller.`,
    undefined,
    request,
    env,
  )
}

export function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function statusForRelayError(error: RelayErrorResponse['error']): number {
  switch (error.code) {
    case 'BAD_JSON':
    case 'INVALID_ACTION':
    case 'INVALID_REQUEST':
    case 'INVALID_ROLE':
    case 'SUBMISSION_INVALID':
      return 400
    case 'FORBIDDEN':
      return 403
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
