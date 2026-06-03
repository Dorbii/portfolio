export function getInitialRoute() {
  return window.location.hash.startsWith('#/hex-sovereign/agent')
    ? 'agent'
    : 'game'
}

export function getAgentParams() {
  const [, query = ''] = window.location.hash.split('?')
  const params = new URLSearchParams(query)

  return {
    matchId: params.get('match') ?? 'hex-local',
    seat: params.get('seat') ?? 'white',
    token: params.get('token') ?? '',
  }
}

export function makeSeatTokens() {
  return {
    black: `black-${Math.random().toString(36).slice(2, 8)}`,
    white: `white-${Math.random().toString(36).slice(2, 8)}`,
  }
}

export function compactResult(result, source) {
  return {
    type: 'AGENT_ACTION_RESULT',
    source,
    accepted: result.accepted,
    reason: result.reason,
    message: result.message,
    action: result.action
      ? {
          id: result.action.id,
          type: result.action.type,
          label: result.action.label,
        }
      : null,
  }
}

export function createAgentApiRejection(reason, message) {
  return {
    type: 'AGENT_REQUEST_REJECTED',
    accepted: false,
    reason,
    message,
  }
}

export function createInviteUrl(matchId, seat, token) {
  const url = new URL(window.location.href)
  url.hash = `#/hex-sovereign/agent?match=${encodeURIComponent(
    matchId,
  )}&seat=${encodeURIComponent(seat)}&token=${encodeURIComponent(token)}`
  return url.toString()
}

export function computeBoardPositions(cells) {
  const minX = Math.min(...cells.map((cell) => cell.x))
  const maxX = Math.max(...cells.map((cell) => cell.x))
  const minY = Math.min(...cells.map((cell) => cell.y))
  const maxY = Math.max(...cells.map((cell) => cell.y))
  const pad = 8

  return new Map(
    cells.map((cell) => [
      cell.id,
      {
        left: pad + ((cell.x - minX) / (maxX - minX)) * (100 - pad * 2),
        top: pad + ((cell.y - minY) / (maxY - minY)) * (100 - pad * 2),
      },
    ]),
  )
}

export function getDomainTone(domain, activeSeat) {
  if (domain.status === 'controlled' && domain.owner === activeSeat) {
    return 'friendly'
  }

  if (domain.status === 'controlled' && domain.owner !== activeSeat) {
    return 'enemy'
  }

  return domain.status
}

export function getReinforcementSummary(state, seat) {
  const resource = state.players[seat]?.reinforcements

  if (!state.featureFlags.reinforcements || !resource) {
    return null
  }

  const spentThisRound =
    resource.lastSpentRound === state.round && resource.lastSpentCycle === state.cycle
      ? (resource.spentThisRound ?? 0)
      : 0

  return {
    ...resource,
    spentThisRound,
    remainingThisRound: Math.max(0, resource.maxPerRound - spentThisRound),
  }
}
