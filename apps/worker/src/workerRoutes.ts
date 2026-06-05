import {
  TEAM_ROLES,
  type TeamRole,
} from '../../../packages/schemas/src/index.js'

const SESSION_ID_PATTERN = /^s_[A-Za-z0-9_-]{1,64}$/

export type WorkerSessionRoute = {
  sessionId: string
  action: string
}

export type WorkerSessionRoleRoute = {
  sessionId: string
  role: TeamRole
  action: string
}

export function isSessionId(value: string): boolean {
  return SESSION_ID_PATTERN.test(value)
}

export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === 'string' && TEAM_ROLES.includes(value as TeamRole)
}

export function requestWithJson(request: Request, url: URL, body: unknown): Request {
  const headers = new Headers(request.headers)
  headers.set('content-type', 'application/json')

  return new Request(url, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
  })
}

export function bearerToken(request: Request): string | undefined {
  const authorization = request.headers.get('authorization')
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '')

  return match?.[1]
}

export function sessionRoute(pathname: string): WorkerSessionRoute | undefined {
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

export function sessionRoleRoute(pathname: string): WorkerSessionRoleRoute | undefined {
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
