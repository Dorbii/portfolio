import type { RelayErrorResponse } from '../../../packages/schemas/src/index.js'
import {
  addMilliseconds,
  relayError,
} from './sessionSupport.js'
import type {
  RateLimitAction,
  RateLimitRule,
  StoredSessionState,
} from './sessionTypes.js'

export function takeSessionRateLimit(
  state: StoredSessionState,
  rules: Record<RateLimitAction, RateLimitRule>,
  action: RateLimitAction,
  key: string,
  now: string,
): RelayErrorResponse | undefined {
  const rule = rules[action]
  const bucketKey = `${action}:${key}`
  const current = state.rateLimits[bucketKey]
  const nowMs = Date.parse(now)

  if (!current || Date.parse(current.resetAt) <= nowMs) {
    state.rateLimits[bucketKey] = {
      count: 1,
      resetAt: addMilliseconds(now, rule.windowMs),
    }

    return undefined
  }

  if (current.count >= rule.max) {
    return relayError(
      'RATE_LIMITED',
      `${action} rate limit exceeded. Try again after ${current.resetAt}.`,
    )
  }

  current.count += 1

  return undefined
}
