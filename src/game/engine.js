export const SEATS = ['black', 'white']

export const SEAT_LABELS = {
  black: 'Black',
  white: 'White',
}

export const DEFAULT_RULES_VERSION = 'mvp-0.1'

export const DEFAULT_FEATURE_FLAGS = Object.freeze({
  reinforcements: false,
  income: false,
  stability: false,
  decrees: false,
  influence: false,
  corruption: false,
  regionCards: false,
  setCashIns: false,
  counterDraft: false,
  victoryWarnings: false,
  mandates: false,
  strongerBots: false,
  localhostBridge: false,
  backendSharedMatches: false,
})

export const REGIONS = [
  {
    id: 'iron-basin',
    name: 'Iron Basin',
    theme: 'Rugged mines and forges',
  },
  {
    id: 'temple-coast',
    name: 'Temple Coast',
    theme: 'Sacred shorelines and influence',
  },
  {
    id: 'central-plain',
    name: 'Central Plain',
    theme: 'Fertile center and tempo',
  },
  {
    id: 'northwood',
    name: 'Northwood',
    theme: 'Deep forests and defense',
  },
  {
    id: 'ash-marsh',
    name: 'Ash Marsh',
    theme: 'Volcanic wastes and pressure',
  },
]

export const ANCHORS = [
  {
    id: 'black-capital',
    q: -1,
    r: 3,
    kind: 'Capital',
    label: 'Black Capital',
    regionId: 'central-plain',
    mark: 'C',
  },
  {
    id: 'white-capital',
    q: 1,
    r: -3,
    kind: 'Capital',
    label: 'White Capital',
    regionId: 'central-plain',
    mark: 'C',
  },
  {
    id: 'mine',
    q: -1,
    r: -2,
    kind: 'Mine',
    label: 'Iron Basin Mine',
    regionId: 'iron-basin',
    mark: 'M',
  },
  {
    id: 'temple',
    q: -3,
    r: 1,
    kind: 'Temple',
    label: 'Temple Coast Shrine',
    regionId: 'temple-coast',
    mark: 'T',
  },
  {
    id: 'fort',
    q: 3,
    r: -1,
    kind: 'Fort',
    label: 'Northwood Fort',
    regionId: 'northwood',
    mark: 'F',
  },
  {
    id: 'village',
    q: 2,
    r: 1,
    kind: 'Village',
    label: 'Central Village',
    regionId: 'central-plain',
    mark: 'V',
  },
  {
    id: 'ruins',
    q: 0,
    r: 0,
    kind: 'Ruins',
    label: 'Ash Marsh Ruins',
    regionId: 'ash-marsh',
    mark: 'R',
  },
]

const DIRECTIONS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
]

const OPPONENT = {
  black: 'white',
  white: 'black',
}

const STARTING_STONES = [
  { q: -1, r: 2, seat: 'black' },
  { q: 0, r: 2, seat: 'black' },
  { q: 1, r: -2, seat: 'white' },
  { q: 0, r: -2, seat: 'white' },
]

const DEFAULT_REINFORCEMENT_RULES = Object.freeze({
  maxPerRound: 1,
  reserveCap: 3,
})

const DEFAULT_ECONOMY_RULES = Object.freeze({
  startingGold: 0,
  repairCost: 2,
  repairAmount: 1,
  incomeBySize: {
    small: 1,
    medium: 2,
    large: 3,
  },
  stabilityBySize: {
    small: 2,
    medium: 3,
    large: 4,
  },
})

const DEFAULT_DECREE_RULES = Object.freeze({
  decreeUpkeepByLevel: {
    1: 0,
    2: 0,
    3: 1,
  },
  decreeIncomeByLevel: {
    1: 1,
    2: 2,
    3: 3,
  },
  decreeType: 'Tax Office',
  decreePurchaseCostByLevel: {
    1: 1,
    2: 2,
    3: 3,
  },
  decreeUpgradeCostByLevel: {
    1: 1,
    2: 2,
    3: 3,
  },
  convertRuinBonus: 1,
  convertRuinCost: 2,
  scrapRuinGold: 1,
})

function getDomainDecreeSlots(size, anchorKind) {
  const baseSlotsBySize = {
    small: 1,
    medium: 2,
    large: 3,
  }
  const baseSlots = baseSlotsBySize[size] ?? 0

  if (anchorKind === 'Capital') {
    return baseSlots + 1
  }

  return baseSlots
}

function projectFeatureFlags(featureFlags = DEFAULT_FEATURE_FLAGS) {
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...featureFlags,
  }
}

function resolveRulesConfig(config = {}) {
  return {
    rulesVersion: config.rulesVersion ?? DEFAULT_RULES_VERSION,
    featureFlags: projectFeatureFlags(config.featureFlags),
  }
}

function normalizeWholeNumber(
  value,
  fallback,
  { min = 0, max = Number.MAX_SAFE_INTEGER } = {},
) {
  if (value === undefined || value === null) return fallback

  const number = Number(value)

  if (!Number.isFinite(number)) return fallback

  return Math.min(max, Math.max(min, Math.floor(number)))
}

function resolveReinforcementRules(config = {}) {
  const reserveCap = normalizeWholeNumber(
    config.reinforcementReserveCap ?? config.reinforcements?.reserveCap,
    DEFAULT_REINFORCEMENT_RULES.reserveCap,
  )
  const maxPerRound = normalizeWholeNumber(
    config.reinforcementMaxPerRound ?? config.reinforcements?.maxPerRound,
    DEFAULT_REINFORCEMENT_RULES.maxPerRound,
  )

  return {
    maxPerRound,
    reserveCap,
  }
}

function resolveEconomyRules(config = {}) {
  const economyConfig = config.economy ?? {}

  return {
    startingGold: normalizeWholeNumber(
      economyConfig.startingGold ?? config.startingGold,
      DEFAULT_ECONOMY_RULES.startingGold,
    ),
    repairCost: normalizeWholeNumber(
      economyConfig.repairCost ?? config.repairCost,
      DEFAULT_ECONOMY_RULES.repairCost,
      { min: 1 },
    ),
    repairAmount: normalizeWholeNumber(
      economyConfig.repairAmount ?? config.repairAmount,
      DEFAULT_ECONOMY_RULES.repairAmount,
      { min: 1 },
    ),
    incomeBySize: {
      ...DEFAULT_ECONOMY_RULES.incomeBySize,
      ...economyConfig.incomeBySize,
    },
    stabilityBySize: {
      ...DEFAULT_ECONOMY_RULES.stabilityBySize,
      ...economyConfig.stabilityBySize,
    },
  }
}

function resolveDecreeRules(config = {}) {
  const decreeConfig = config.decrees ?? {}

  return {
    decreeUpkeepByLevel: {
      ...DEFAULT_DECREE_RULES.decreeUpkeepByLevel,
      ...decreeConfig.decreeUpkeepByLevel,
    },
    decreeIncomeByLevel: {
      ...DEFAULT_DECREE_RULES.decreeIncomeByLevel,
      ...decreeConfig.decreeIncomeByLevel,
    },
    decreePurchaseCostByLevel: {
      ...DEFAULT_DECREE_RULES.decreePurchaseCostByLevel,
      ...decreeConfig.decreePurchaseCostByLevel,
    },
    decreeUpgradeCostByLevel: {
      ...DEFAULT_DECREE_RULES.decreeUpgradeCostByLevel,
      ...decreeConfig.decreeUpgradeCostByLevel,
    },
    convertRuinBonus: decreeConfig.convertRuinBonus ?? DEFAULT_DECREE_RULES.convertRuinBonus,
    convertRuinCost: decreeConfig.convertRuinCost ?? DEFAULT_DECREE_RULES.convertRuinCost,
    scrapRuinGold: decreeConfig.scrapRuinGold ?? DEFAULT_DECREE_RULES.scrapRuinGold,
    decreeType: decreeConfig.decreeType ?? DEFAULT_DECREE_RULES.decreeType,
  }
}

function normalizeDecree(decree = {}) {
  const level = normalizeWholeNumber(decree.level, 1, { min: 1, max: 3 })

  return {
    type: decree.type ?? DEFAULT_DECREE_RULES.decreeType,
    level,
    ruined: decree.ruined === true,
  }
}

function normalizeDomainDecrees(decrees = []) {
  return (decrees ?? []).map(normalizeDecree)
}

function projectPersistedDecrees(decrees = []) {
  return normalizeDomainDecrees(decrees).map((decree) => ({
    type: decree.type,
    level: decree.level,
    ruined: decree.ruined,
  }))
}

function ruinDecrees(decrees = []) {
  return normalizeDomainDecrees(decrees).map((decree) => ({
    ...decree,
    ruined: true,
  }))
}

function decayHighestDecree(decrees = []) {
  const normalized = normalizeDomainDecrees(decrees)

  if (normalized.length === 0) {
    return {
      changed: false,
      decrees: normalized,
      destroyed: false,
      fromLevel: null,
      toLevel: null,
    }
  }

  const target = normalized
    .map((decree, index) => ({ decree, index }))
    .sort(
      (left, right) =>
        right.decree.level - left.decree.level || left.index - right.index,
    )[0]

  if (target.decree.level <= 1) {
    return {
      changed: true,
      decrees: normalized.filter((_, index) => index !== target.index),
      destroyed: true,
      fromLevel: target.decree.level,
      toLevel: null,
    }
  }

  return {
    changed: true,
    decrees: normalized.map((decree, index) =>
      index === target.index
        ? {
            ...decree,
            level: decree.level - 1,
          }
        : decree,
    ),
    destroyed: false,
    fromLevel: target.decree.level,
    toLevel: target.decree.level - 1,
  }
}

function createReinforcementState(config, seat) {
  const rules = resolveReinforcementRules(config)
  const seededTokens = Object.hasOwn(config.initialReinforcements ?? {}, seat)
    ? config.initialReinforcements[seat]
    : 0

  return {
    tokens: normalizeWholeNumber(seededTokens, 0, { max: rules.reserveCap }),
    maxPerRound: rules.maxPerRound,
    reserveCap: rules.reserveCap,
    spentThisRound: 0,
    lastSpentRound: null,
    lastSpentCycle: null,
  }
}

function createPlayerState(seat, config, featureFlags) {
  const player = {
    seat,
    captures: 0,
  }

  if (
    featureFlags.income ||
    featureFlags.stability ||
    featureFlags.decrees
  ) {
    const economyRules = resolveEconomyRules(config)
    player.gold = normalizeWholeNumber(
      config.initialGold?.[seat],
      economyRules.startingGold,
    )
    player.upkeepDue = 0
  }

  if (featureFlags.reinforcements) {
    return {
      ...player,
      reinforcements: createReinforcementState(config, seat),
    }
  }

  return player
}

function createDomainEconomyState(config = {}) {
  const seededDomains = config.initialDomains ?? {}

  return Object.fromEntries(
    ANCHORS.map((anchor) => [
      anchor.id,
      {
        stability: normalizeWholeNumber(
          seededDomains[anchor.id]?.stability,
          seededDomains[anchor.id]?.stability ?? 0,
        ),
        lastOwner: seededDomains[anchor.id]?.lastOwner ?? null,
        decrees: normalizeDomainDecrees(seededDomains[anchor.id]?.decrees),
      },
    ]),
  )
}

export function getOpponent(seat) {
  return OPPONENT[seat]
}

export function cellId(q, r) {
  return `${q},${r}`
}

export function isWithinRadius(q, r, radius) {
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) <= radius
}

function regionForCoord(q, r) {
  if (r <= -2) return 'iron-basin'
  if (q <= -2) return 'temple-coast'
  if (q >= 2) return 'northwood'
  if (r >= 2) return 'central-plain'
  return 'ash-marsh'
}

function getAnchorAt(q, r) {
  return ANCHORS.find((anchor) => anchor.q === q && anchor.r === r)
}

function makeCell(q, r) {
  const anchor = getAnchorAt(q, r)
  const x = 1.5 * q
  const y = Math.sqrt(3) * (r + q / 2)

  return {
    id: cellId(q, r),
    q,
    r,
    x,
    y,
    type: anchor ? 'anchor' : 'playable',
    occupant: null,
    anchorId: anchor?.id ?? null,
    anchorKind: anchor?.kind ?? null,
    anchorLabel: anchor?.label ?? null,
    anchorMark: anchor?.mark ?? null,
    regionId: anchor?.regionId ?? regionForCoord(q, r),
  }
}

function createBoard(radius) {
  const cells = []

  for (let q = -radius; q <= radius; q += 1) {
    for (let r = -radius; r <= radius; r += 1) {
      if (isWithinRadius(q, r, radius)) {
        cells.push(makeCell(q, r))
      }
    }
  }

  const cellsWithStarts = cells.map((cell) => {
    const startingStone = STARTING_STONES.find(
      (stone) => stone.q === cell.q && stone.r === cell.r,
    )

    if (!startingStone || cell.type !== 'playable') {
      return cell
    }

    return {
      ...cell,
      occupant: startingStone.seat,
    }
  })

  return {
    radius,
    cells: cellsWithStarts,
  }
}

function createEvent(state, kind, seat, message, detail = {}) {
  return {
    id: `event-${state.turn}-${kind}-${state.requestCounter}-${detail.anchorId ?? detail.sequence ?? 'base'}`,
    kind,
    seat,
    message,
    turn: state.turn,
    cycle: state.cycle,
    detail,
  }
}

export function createMatch(config = {}) {
  const radius = config.radius ?? 4
  const matchId = config.matchId ?? 'hex-local'
  const { rulesVersion, featureFlags } = resolveRulesConfig(config)
  const state = {
    matchId,
    rulesVersion,
    featureFlags,
    phase: 'BOARD_PHASE',
    cycle: 1,
    round: 1,
    turn: 1,
    activeSeat: 'black',
    board: createBoard(radius),
    players: {
      black: createPlayerState('black', config, featureFlags),
      white: createPlayerState('white', config, featureFlags),
    },
    domains:
      featureFlags.income || featureFlags.stability || featureFlags.decrees
        ? createDomainEconomyState(config)
        : {},
    anchors: ANCHORS,
    passStreak: 0,
    lastMove: null,
    requestCounter: 1,
    eventLog: [],
  }

  return {
    ...state,
    eventLog: [
      createEvent(
        state,
        'MATCH_READY',
        null,
        'Match ready. Black opens the board phase.',
      ),
    ],
  }
}

function cloneCellMap(cells) {
  return new Map(cells.map((cell) => [cell.id, { ...cell }]))
}

function cellsFromMap(cellMap) {
  return Array.from(cellMap.values()).sort((a, b) => {
    if (a.q !== b.q) return a.q - b.q
    return a.r - b.r
  })
}

function getCellMap(state) {
  return new Map(state.board.cells.map((cell) => [cell.id, cell]))
}

export function getNeighborIdsForCoord(q, r, radius) {
  return DIRECTIONS.map(([dq, dr]) => [q + dq, r + dr])
    .filter(([nextQ, nextR]) => isWithinRadius(nextQ, nextR, radius))
    .map(([nextQ, nextR]) => cellId(nextQ, nextR))
}

export function getNeighborIds(state, id) {
  const cellMap = getCellMap(state)
  const cell = cellMap.get(id)

  if (!cell) return []

  return getNeighborIdsForCoord(cell.q, cell.r, state.board.radius).filter(
    (neighborId) => cellMap.has(neighborId),
  )
}

function getNeighborsFromMap(cellMap, cell, radius) {
  return getNeighborIdsForCoord(cell.q, cell.r, radius)
    .map((id) => cellMap.get(id))
    .filter(Boolean)
}

function collectGroup(cellMap, startCell, radius) {
  if (!startCell?.occupant) {
    return {
      ids: [],
      liberties: new Set(),
    }
  }

  const seat = startCell.occupant
  const queue = [startCell.id]
  const visited = new Set()
  const liberties = new Set()

  while (queue.length > 0) {
    const currentId = queue.shift()

    if (visited.has(currentId)) continue
    visited.add(currentId)

    const currentCell = cellMap.get(currentId)

    for (const neighbor of getNeighborsFromMap(cellMap, currentCell, radius)) {
      if (neighbor.type === 'playable' && neighbor.occupant === null) {
        liberties.add(neighbor.id)
      }

      if (neighbor.occupant === seat && !visited.has(neighbor.id)) {
        queue.push(neighbor.id)
      }
    }
  }

  return {
    ids: Array.from(visited),
    liberties,
  }
}

function simulatePlacement(state, seat, targetId) {
  const cellMap = cloneCellMap(state.board.cells)
  const target = cellMap.get(targetId)

  if (!target) {
    return {
      legal: false,
      reason: 'CELL_NOT_FOUND',
    }
  }

  if (target.type !== 'playable') {
    return {
      legal: false,
      reason: 'ANCHOR_NOT_PLAYABLE',
    }
  }

  if (target.occupant !== null) {
    return {
      legal: false,
      reason: 'OCCUPIED',
    }
  }

  target.occupant = seat

  const capturedIds = new Set()
  const opponent = getOpponent(seat)

  for (const neighbor of getNeighborsFromMap(
    cellMap,
    target,
    state.board.radius,
  )) {
    if (neighbor.occupant !== opponent || capturedIds.has(neighbor.id)) {
      continue
    }

    const enemyGroup = collectGroup(cellMap, neighbor, state.board.radius)

    if (enemyGroup.liberties.size === 0) {
      for (const capturedId of enemyGroup.ids) {
        capturedIds.add(capturedId)
      }
    }
  }

  for (const capturedId of capturedIds) {
    const capturedCell = cellMap.get(capturedId)
    capturedCell.occupant = null
  }

  const ownGroup = collectGroup(cellMap, target, state.board.radius)

  if (ownGroup.liberties.size === 0) {
    return {
      legal: false,
      reason: 'SUICIDE',
    }
  }

  return {
    legal: true,
    cells: cellsFromMap(cellMap),
    capturedIds: Array.from(capturedIds),
  }
}

function placementActionId(state, cell) {
  return `turn-${state.turn}-${state.activeSeat}-place-${cell.id}`
}

function reinforcementActionId(state, cell) {
  return `turn-${state.turn}-${state.activeSeat}-reinforcement-${cell.id}`
}

function passActionId(state) {
  return `turn-${state.turn}-${state.activeSeat}-pass`
}

function repairActionId(state, anchorId) {
  return `turn-${state.turn}-${state.activeSeat}-repair-${anchorId}`
}

function getAdjacentAnchors(state, cell) {
  const cellMap = getCellMap(state)

  return getNeighborIds(state, cell.id)
    .map((neighborId) => cellMap.get(neighborId))
    .filter((neighbor) => neighbor?.type === 'anchor')
    .map((anchorCell) => anchorCell.anchorId)
}

function getReinforcementSpentThisRound(resource, state) {
  if (
    resource.lastSpentRound === state.round &&
    resource.lastSpentCycle === state.cycle
  ) {
    return resource.spentThisRound ?? 1
  }

  return 0
}

function canSpendReinforcement(state, seat) {
  const resource = state.players[seat]?.reinforcements

  if (!state.featureFlags.reinforcements || !resource) {
    return false
  }

  return (
    resource.tokens > 0 &&
    getReinforcementSpentThisRound(resource, state) < resource.maxPerRound
  )
}

function createPlacementAction(state, seat, cell, preview, type) {
  const isReinforcement = type === 'SPEND_REINFORCEMENT'

  return {
    id: isReinforcement
      ? reinforcementActionId(state, cell)
      : placementActionId(state, cell),
    type,
    seat,
    label: isReinforcement
      ? `Spend reinforcement at ${cell.q}, ${cell.r}`
      : `Place at ${cell.q}, ${cell.r}`,
    payload: {
      cellId: cell.id,
      q: cell.q,
      r: cell.r,
    },
    preview: {
      capturedCount: preview.capturedIds.length,
      capturedIds: preview.capturedIds,
      adjacentAnchors: getAdjacentAnchors(state, cell),
    },
  }
}

function getDomainBaseStability(domain, state) {
  if (!domain.size || !state.featureFlags.stability) return 0

  return resolveEconomyRules().stabilityBySize[domain.size] ?? 0
}

function getDomainIncome(domain, state) {
  if (!domain.size || !state.featureFlags.income) return 0

  return resolveEconomyRules().incomeBySize[domain.size] ?? 0
}

function getDomainDecreeIncome(decrees) {
  const decreeRules = resolveDecreeRules()

  return decrees.reduce(
    (sum, decree) =>
      sum + (decree.active && !decree.ruined ? decreeRules.decreeIncomeByLevel[decree.level] ?? 0 : 0),
    0,
  )
}

function getDomainDecreeUpkeep(decrees) {
  const decreeRules = resolveDecreeRules()

  return decrees.reduce(
    (sum, decree) =>
      sum + (decree.active && !decree.ruined ? decreeRules.decreeUpkeepByLevel[decree.level] ?? 0 : 0),
    0,
  )
}

function getDecreeInactiveReason(domain, state, decree, hasSlot) {
  if (decree.ruined) {
    return 'Ruined decrees occupy slots and provide no effect until converted or scrapped.'
  }

  if (domain.status !== 'controlled' || !domain.owner) {
    return 'Domain is contested or neutral, so decrees are inactive.'
  }

  if (state.featureFlags.stability && domain.stability <= 0) {
    return 'Domain stability is depleted, so decrees are inactive.'
  }

  if (!hasSlot) {
    return 'No decree slot is currently available for this decree.'
  }

  return null
}

function projectDomainDecrees(domain, state, persistedDecrees) {
  const decreeSlots = getDomainDecreeSlots(domain.size, domain.anchorKind)
  const canActivate =
    domain.status === 'controlled' &&
    domain.owner &&
    (!state.featureFlags.stability || domain.stability > 0)
  const decrees = normalizeDomainDecrees(persistedDecrees)

  let activeSlotsRemaining = decreeSlots
  const projected = decrees.map((decree, index) => {
    const hasSlot = activeSlotsRemaining > 0
    const active = canActivate && !decree.ruined && hasSlot

    if (hasSlot) {
      activeSlotsRemaining -= 1
    }

    return {
      ...decree,
      index,
      owner: decree.ruined || !domain.owner ? null : domain.owner,
      active,
      status: decree.ruined
        ? 'ruined'
        : active
          ? 'active'
          : 'inactive',
      inactiveReason: active
        ? null
        : getDecreeInactiveReason(domain, state, decree, hasSlot),
    }
  })
  const activeDecrees = projected.filter((decree) => decree.active && !decree.ruined)

  return {
    decrees: projected,
    decreeSlots,
    decreeSlotsUsed: projected.length,
    decreeSlotsFree: Math.max(decreeSlots - projected.length, 0),
    decreeIncome: getDomainDecreeIncome(projected),
    decreeUpkeep: getDomainDecreeUpkeep(projected, state),
    activeDecreesCount: activeDecrees.length,
  }
}

function enrichDomainEconomy(domain, state) {
  const baseStability = getDomainBaseStability(domain, state)
  const persisted = state.domains?.[domain.anchorId]
  const rawStability = persisted?.lastOwner === domain.owner ? persisted.stability : baseStability
  const stability = domain.owner ? Math.min(baseStability, rawStability) : 0
  const stable = !state.featureFlags.stability || stability > 0
  const economyStatus =
    domain.status === 'controlled' && stable ? 'active' : 'shutdown'
  const income = economyStatus === 'active' ? getDomainIncome(domain, state) : 0
  const repairCost = resolveEconomyRules().repairCost
  const domainWithEconomy = {
    ...domain,
    stability,
    baseStability,
  }
  const decreeState = projectDomainDecrees(
    domainWithEconomy,
    state,
    persisted?.decrees,
  )

  return {
    ...domain,
    stability,
    baseStability,
    income,
    decreeSlots: decreeState.decreeSlots,
    decrees: decreeState.decrees,
    decreeIncome: decreeState.decreeIncome,
    decreeUpkeep: decreeState.decreeUpkeep,
    decreeSlotsUsed: decreeState.decreeSlotsUsed,
    decreeSlotsFree: decreeState.decreeSlotsFree,
    activeDecreesCount: decreeState.activeDecreesCount,
    economyStatus,
    canRepair:
      state.featureFlags.stability &&
      domain.status === 'controlled' &&
      stability < baseStability,
    repairCost,
    inactiveReason:
      economyStatus === 'active'
        ? null
        : domain.status !== 'controlled'
          ? 'Domain is contested or neutral, so income and decrees are inactive.'
          : 'Domain stability is depleted, so income and decrees are inactive.',
  }
}

function createRepairActions(state, seat, domains) {
  if (!state.featureFlags.stability) return []

  const economyRules = resolveEconomyRules()
  const player = state.players[seat]

  return domains
    .filter(
      (domain) =>
        domain.owner === seat &&
        domain.canRepair &&
        player.gold >= economyRules.repairCost,
    )
    .map((domain) => ({
      id: repairActionId(state, domain.anchorId),
      type: 'REPAIR_DOMAIN',
      seat,
      label: `Repair ${domain.label}`,
      payload: {
        anchorId: domain.anchorId,
        cost: economyRules.repairCost,
        repairAmount: economyRules.repairAmount,
      },
      preview: {
        stabilityBefore: domain.stability,
        stabilityAfter: Math.min(
          domain.baseStability,
          domain.stability + economyRules.repairAmount,
        ),
      },
    }))
}

function createPayUpkeepActions(state, seat) {
  const upkeepDue = state.players[seat]?.upkeepDue ?? 0

  if (upkeepDue <= 0 || (state.players[seat]?.gold ?? 0) < upkeepDue) {
    return []
  }

  return [
    {
      id: `turn-${state.turn}-${seat}-pay-upkeep`,
      type: 'PAY_UPKEEP',
      seat,
      label: `Pay ${upkeepDue} upkeep`,
      payload: {
        cost: upkeepDue,
      },
      preview: {
        goldAfter: state.players[seat].gold - upkeepDue,
      },
    },
  ]
}

function resetReinforcementRoundSpends(players) {
  let changed = false
  const nextPlayers = { ...players }

  for (const seat of SEATS) {
    const resource = players[seat]?.reinforcements

    if (!resource || resource.spentThisRound === 0) {
      continue
    }

    nextPlayers[seat] = {
      ...players[seat],
      reinforcements: {
        ...resource,
        spentThisRound: 0,
      },
    }
    changed = true
  }

  return changed ? nextPlayers : players
}

export function getLegalActions(state, seat) {
  if (seat !== state.activeSeat) {
    return []
  }

  const domains = deriveDomains(state)
  const legalPlacements = state.board.cells
    .filter((cell) => cell.type === 'playable' && cell.occupant === null)
    .map((cell) => {
      const preview = simulatePlacement(state, seat, cell.id)

      if (!preview.legal) {
        return null
      }

      return {
        cell,
        preview,
      }
    })
    .filter(Boolean)

  const actions = legalPlacements.map(({ cell, preview }) =>
    createPlacementAction(state, seat, cell, preview, 'PLACE_STONE'),
  )

  if (canSpendReinforcement(state, seat)) {
    actions.push(
      ...legalPlacements.map(({ cell, preview }) =>
        createPlacementAction(state, seat, cell, preview, 'SPEND_REINFORCEMENT'),
      ),
    )
  }

  actions.push(...createRepairActions(state, seat, domains))
  actions.push(...createPayUpkeepActions(state, seat))
  actions.push(...createBuyDecreeActions(state, seat, domains))
  actions.push(...createUpgradeDecreeActions(state, seat, domains))
  actions.push(...createRuinConversionActions(state, seat, domains))

  actions.push({
    id: passActionId(state),
    type: 'PASS',
    seat,
    label: 'Pass',
    payload: {},
    preview: {
      capturedCount: 0,
      capturedIds: [],
      adjacentAnchors: [],
    },
  })

  return actions
}

function createEconomyCycleEvent(state, kind, seat, message, detail) {
  return createEvent(state, kind, seat, message, detail)
}

function getDomainRecoveryStability(domain, state) {
  if (!state.featureFlags.stability || !domain.baseStability) {
    return domain.stability ?? 0
  }

  return Math.ceil(domain.baseStability / 2)
}

function resolveImmediateDecreeTransitions(previousState, nextState) {
  if (!nextState.featureFlags.decrees) {
    return {
      state: nextState,
      events: [],
    }
  }

  const previousDomains = new Map(
    deriveDomains(previousState).map((domain) => [domain.anchorId, domain]),
  )
  const nextDomains = deriveDomains(nextState)
  const nextDomainState = { ...(nextState.domains ?? {}) }
  const events = []
  let changed = false

  for (const domain of nextDomains) {
    const previousDomain = previousDomains.get(domain.anchorId)
    const persistedDomain = nextDomainState[domain.anchorId] ?? {}
    const decrees = normalizeDomainDecrees(persistedDomain.decrees)
    const persistedOwner = persistedDomain.lastOwner ?? null

    if (domain.status === 'controlled' && domain.owner) {
      if (persistedOwner && persistedOwner !== domain.owner) {
        const recoveryStability = getDomainRecoveryStability(domain, nextState)

        nextDomainState[domain.anchorId] = {
          ...persistedDomain,
          stability: recoveryStability,
          lastOwner: domain.owner,
          decrees: ruinDecrees(decrees),
        }
        changed = true

        if (decrees.length > 0) {
          events.push(
            createEvent(
              nextState,
              'DOMAIN_DECREES_RUINED',
              domain.owner,
              `${domain.label} changed hands; ${SEAT_LABELS[persistedOwner]} decrees became ruined.`,
              {
                anchorId: domain.anchorId,
                previousOwner: persistedOwner,
                owner: domain.owner,
                decrees: decrees.length,
                stability: recoveryStability,
                baseStability: domain.baseStability,
              },
            ),
          )
        }
      }

      continue
    }

    if (previousDomain?.decrees?.some((decree) => decree.active)) {
      events.push(
        createEvent(
          nextState,
          'DOMAIN_DECREE_SHUTDOWN',
          null,
          `${domain.label} is contested or neutral; decrees are inactive now.`,
          { anchorId: domain.anchorId },
        ),
      )
    }
  }

  return {
    state: changed
      ? {
          ...nextState,
          domains: nextDomainState,
        }
      : nextState,
    events,
  }
}

function resolveCycleEconomy(state) {
  if (
    !state.featureFlags.income &&
    !state.featureFlags.stability &&
    !state.featureFlags.decrees
  ) {
    return {
      state,
      events: [],
    }
  }

  const economyRules = resolveEconomyRules()
  const domains = deriveDomains(state)
  const nextPlayers = projectPlayers(state.players)
  const nextDomainState = { ...(state.domains ?? {}) }
  const events = []

  domains.forEach((domain, index) => {
    const detail = { anchorId: domain.anchorId, sequence: index }
    const persistedDomain = nextDomainState[domain.anchorId] ?? {}
    const persistedDecrees = normalizeDomainDecrees(persistedDomain.decrees)

    let nextDecrees = persistedDecrees

    if (domain.status !== 'controlled' || !domain.owner) {
      const previous = nextDomainState[domain.anchorId]
      const decreeDecay = decayHighestDecree(persistedDecrees)

      nextDomainState[domain.anchorId] = {
        stability: 0,
        lastOwner: previous?.lastOwner ?? null,
        decrees: projectPersistedDecrees(decreeDecay.decrees),
      }

      if (previous?.decrees?.some((decree) => !decree.ruined)) {
        events.push(
          createEconomyCycleEvent(
            state,
            'DOMAIN_DECREE_SHUTDOWN',
            null,
            `${domain.label} is contested or neutral; decrees are inactive this cycle.`,
            detail,
          ),
        )
      }

      if (decreeDecay.changed) {
        events.push(
          createEconomyCycleEvent(
            state,
            'DOMAIN_DECREE_DECAY',
            previous?.lastOwner ?? null,
            decreeDecay.destroyed
              ? `${domain.label} stayed contested; a Level I decree was destroyed.`
              : `${domain.label} stayed contested; its highest decree decayed from Level ${decreeDecay.fromLevel} to Level ${decreeDecay.toLevel}.`,
            {
              ...detail,
              destroyed: decreeDecay.destroyed,
              fromLevel: decreeDecay.fromLevel,
              toLevel: decreeDecay.toLevel,
            },
          ),
        )
      }

      if (previous?.lastOwner) {
        events.push(
          createEconomyCycleEvent(
            state,
            'DOMAIN_SHUTDOWN',
            null,
            `${domain.label} is contested or neutral; income and decrees shut down.`,
            detail,
          ),
        )
      }

      return
    }

    const ownershipChanged = persistedDomain.lastOwner
      && persistedDomain.lastOwner !== domain.owner

    if (ownershipChanged) {
      nextDecrees = persistedDecrees.map((decree) => ({
        ...decree,
        ruined: true,
      }))
      events.push(
        createEconomyCycleEvent(
          state,
          'DOMAIN_DECREES_RUINED',
          domain.owner,
          `${domain.label} ownership changed; decrees from ${SEAT_LABELS[persistedDomain.lastOwner]} became ruined.`,
          { ...detail, decrees: persistedDecrees.length },
        ),
      )
    }

    if (state.featureFlags.stability && domain.stability <= 0) {
      const decreeDecay = decayHighestDecree(nextDecrees)

      nextDomainState[domain.anchorId] = {
        stability: 0,
        lastOwner: domain.owner,
        decrees: projectPersistedDecrees(decreeDecay.decrees),
      }

      if (nextDecrees.some((decree) => !decree.ruined)) {
        events.push(
          createEconomyCycleEvent(
            state,
            'DOMAIN_DECREE_SHUTDOWN',
            domain.owner,
            `${domain.label} stability is depleted; decrees are inactive this cycle.`,
            detail,
          ),
        )
      }

      if (decreeDecay.changed) {
        events.push(
          createEconomyCycleEvent(
            state,
            'DOMAIN_DECREE_DECAY',
            domain.owner,
            decreeDecay.destroyed
              ? `${domain.label} stayed depleted; a Level I decree was destroyed.`
              : `${domain.label} stayed depleted; its highest decree decayed from Level ${decreeDecay.fromLevel} to Level ${decreeDecay.toLevel}.`,
            {
              ...detail,
              destroyed: decreeDecay.destroyed,
              fromLevel: decreeDecay.fromLevel,
              toLevel: decreeDecay.toLevel,
            },
          ),
        )
      }

      events.push(
        createEconomyCycleEvent(
          state,
          'DOMAIN_SHUTDOWN',
          domain.owner,
          `${domain.label} produced no income because stability is depleted.`,
          detail,
        ),
      )

      return
    }

    const resolved = projectDomainDecrees(domain, state, nextDecrees)
    const decreeIncome = getDomainDecreeIncome(resolved.decrees)
    const decreeUpkeep = getDomainDecreeUpkeep(resolved.decrees, state)
    const totalIncome = domain.income + decreeIncome

    if (totalIncome > 0) {
      nextPlayers[domain.owner] = {
        ...nextPlayers[domain.owner],
        gold: (nextPlayers[domain.owner].gold ?? 0) + totalIncome,
      }
      events.push(
        createEconomyCycleEvent(
          state,
          'DOMAIN_INCOME',
          domain.owner,
          `${SEAT_LABELS[domain.owner]} gained ${totalIncome} gold from ${domain.label}.`,
          { ...detail, income: totalIncome },
        ),
      )
    } else {
      events.push(
        createEconomyCycleEvent(
          state,
          'DOMAIN_SHUTDOWN',
          domain.owner,
          `${domain.label} produced no income because stability is depleted.`,
          detail,
        ),
      )
    }

    if (decreeIncome > 0) {
      events.push(
        createEconomyCycleEvent(
          state,
          'DOMAIN_DECREE_INCOME',
          domain.owner,
          `${SEAT_LABELS[domain.owner]} gained ${decreeIncome} gold from decrees in ${domain.label}.`,
          { ...detail, decreeIncome, decrees: resolved.activeDecreesCount },
        ),
      )
    }

    if (decreeUpkeep > 0) {
      nextPlayers[domain.owner] = {
        ...nextPlayers[domain.owner],
        upkeepDue: (nextPlayers[domain.owner].upkeepDue ?? 0) + decreeUpkeep,
      }
      events.push(
        createEconomyCycleEvent(
          state,
          'DOMAIN_DECREE_UPKEEP',
          domain.owner,
          `${SEAT_LABELS[domain.owner]} owes ${decreeUpkeep} upkeep from decrees in ${domain.label}.`,
          {
            ...detail,
            upkeep: decreeUpkeep,
            decrees: resolved.activeDecreesCount,
          },
        ),
      )
    }

    if (resolved.decreeSlotsUsed > resolved.decreeSlots) {
      events.push(
        createEconomyCycleEvent(
          state,
          'DOMAIN_DECREES_SHUTDOWN',
          domain.owner,
          `${domain.label} has more decrees than slots; excess decrees are inactive.`,
          { ...detail, decrees: resolved.decreeSlotsUsed },
        ),
      )
    }

    const nextStability = state.featureFlags.stability
      ? Math.max(0, domain.stability - economyRules.repairAmount)
      : domain.stability

    nextDomainState[domain.anchorId] = {
      stability: nextStability,
      lastOwner: domain.owner,
      decrees: projectPersistedDecrees(resolved.decrees),
    }

    if (state.featureFlags.stability && domain.stability !== nextStability) {
      events.push(
        createEconomyCycleEvent(
          state,
          'DOMAIN_DECAY',
          domain.owner,
          `${domain.label} stability fell to ${nextStability}/${domain.baseStability}.`,
          { ...detail, stability: nextStability, baseStability: domain.baseStability },
        ),
      )
    }
  })

  return {
    state: {
      ...state,
      players: nextPlayers,
      domains: nextDomainState,
    },
    events,
  }
}

function buyDecreeActionId(state, anchorId) {
  return `turn-${state.turn}-${state.activeSeat}-buy-decree-${anchorId}`
}

function upgradeDecreeActionId(state, anchorId, decreeIndex) {
  return `turn-${state.turn}-${state.activeSeat}-upgrade-decree-${anchorId}-${decreeIndex}`
}

function scrapRuinedDecreeActionId(state, anchorId, decreeIndex) {
  return `turn-${state.turn}-${state.activeSeat}-scrap-ruined-${anchorId}-${decreeIndex}`
}

function convertRuinedDecreeActionId(state, anchorId, decreeIndex) {
  return `turn-${state.turn}-${state.activeSeat}-convert-ruined-${anchorId}-${decreeIndex}`
}

function createBuyDecreeActions(state, seat, domains) {
  if (!state.featureFlags.decrees || seat !== state.activeSeat) return []

  const player = state.players[seat]
  const rules = resolveDecreeRules(state)
  const cost = rules.decreePurchaseCostByLevel[1] ?? 1

  return domains
    .filter((domain) => domain.owner === seat)
    .filter((domain) => domain.economyStatus === 'active')
    .filter((domain) => domain.decreeSlotsUsed < domain.decreeSlots)
    .filter(() => player.gold >= cost)
    .map((domain) => ({
      id: buyDecreeActionId(state, domain.anchorId),
      type: 'BUY_DECREE',
      seat,
      label: `Buy ${rules.decreeType} on ${domain.label}`,
      payload: {
        anchorId: domain.anchorId,
        decreeType: rules.decreeType,
        level: 1,
        cost,
      },
      preview: {
        decreesAfter: domain.decreeSlotsUsed + 1,
        decreeIncomeAfter: domain.decreeIncome + (rules.decreeIncomeByLevel[1] ?? 0),
      },
    }))
}

function createUpgradeDecreeActions(state, seat, domains) {
  if (!state.featureFlags.decrees || seat !== state.activeSeat) return []

  const player = state.players[seat]
  const rules = resolveDecreeRules(state)
  const actions = []

  for (const domain of domains.filter((candidate) => candidate.owner === seat)) {
    for (const decree of domain.decrees ?? []) {
      if (decree.ruined || decree.active === false || decree.level >= 3) {
        continue
      }

      const cost = rules.decreeUpgradeCostByLevel[decree.level] ?? 1

      if (player.gold < cost) {
        continue
      }

      actions.push({
        id: upgradeDecreeActionId(state, domain.anchorId, decree.index),
        type: 'UPGRADE_DECREE',
        seat,
        label: `Upgrade ${decree.type} to level ${decree.level + 1} on ${domain.label}`,
        payload: {
          anchorId: domain.anchorId,
          decreeIndex: decree.index,
          level: decree.level,
          cost,
        },
        preview: {
          levelAfter: decree.level + 1,
          cost,
        },
      })
    }
  }

  return actions
}

function createRuinConversionActions(state, seat, domains) {
  if (!state.featureFlags.decrees || seat !== state.activeSeat) return []

  const player = state.players[seat]
  const rules = resolveDecreeRules(state)
  const actions = []

  for (const domain of domains.filter((candidate) => candidate.owner === seat)) {
    for (const decree of domain.decrees ?? []) {
      if (!decree.ruined) continue

      actions.push({
        id: scrapRuinedDecreeActionId(state, domain.anchorId, decree.index),
        type: 'SCRAP_RUINED_DECREE',
        seat,
        label: `Scrap ruined ${decree.type} on ${domain.label}`,
        payload: {
          anchorId: domain.anchorId,
          decreeIndex: decree.index,
          cost: 0,
        },
        preview: {
          goldGain: rules.scrapRuinGold,
          decreesAfter: Math.max(domain.decreeSlotsUsed - 1, 0),
          decreeSlotsFree: Math.max(domain.decreeSlots - (domain.decreeSlotsUsed - 1), 0),
        },
      })

      if (player.gold >= (rules.convertRuinCost ?? 1)) {
        actions.push({
          id: convertRuinedDecreeActionId(state, domain.anchorId, decree.index),
          type: 'CONVERT_RUINED_DECREE',
          seat,
          label: `Convert ruined ${decree.type} on ${domain.label}`,
          payload: {
            anchorId: domain.anchorId,
            decreeIndex: decree.index,
            cost: rules.convertRuinCost ?? 1,
          },
          preview: {
            levelAfter: decree.level,
            cost: rules.convertRuinCost ?? 1,
            stabilityAfter: getDomainRecoveryStability(domain, state),
          },
        })
      }
    }
  }

  return actions
}

function advanceAfterAction(state, updates, event) {
  const nextTurn = state.turn + 1
  const nextCycle = Math.floor((nextTurn - 1) / 8) + 1
  const nextRound = Math.floor(((nextTurn - 1) % 8) / 2) + 1
  const cycleChanged = nextCycle !== state.cycle
  const roundChanged = nextRound !== state.round || cycleChanged
  const updatedPlayers = updates.players ?? state.players
  const nextPlayers = roundChanged
    ? resetReinforcementRoundSpends(updatedPlayers)
    : updatedPlayers
  const cycleEvent = cycleChanged
    ? createEvent(
        {
          ...state,
          turn: nextTurn,
          cycle: nextCycle,
        },
        'CYCLE_ADVANCED',
        null,
        `Cycle ${nextCycle} begins. Domains are recalculated from the board.`,
      )
    : null
  const baseNextState = {
    ...state,
    ...updates,
    cycle: nextCycle,
    round: nextRound,
    turn: nextTurn,
    activeSeat: getOpponent(state.activeSeat),
    players: nextPlayers,
    requestCounter: state.requestCounter + 1,
  }
  const immediateResolution = resolveImmediateDecreeTransitions(
    state,
    baseNextState,
  )
  const economyResolution = cycleChanged
    ? resolveCycleEconomy(immediateResolution.state)
    : { state: immediateResolution.state, events: [] }

  return {
    ...economyResolution.state,
    eventLog: [
      event,
      ...immediateResolution.events,
      cycleEvent,
      ...economyResolution.events,
      ...state.eventLog,
    ]
      .filter(Boolean)
      .slice(0, 36),
  }
}

function spendReinforcementToken(resource, state) {
  const spentThisRound = getReinforcementSpentThisRound(resource, state) + 1

  return {
    ...resource,
    tokens: Math.max(0, resource.tokens - 1),
    spentThisRound,
    lastSpentRound: state.round,
    lastSpentCycle: state.cycle,
  }
}

function captureTextFor(count) {
  if (count === 1) return ' and captured 1 stone'
  if (count > 1) return ` and captured ${count} stones`
  return ''
}

function createPlacementEvent(state, seat, legalAction, placement) {
  const captureText = captureTextFor(placement.capturedIds.length)
  const actionText =
    legalAction.type === 'SPEND_REINFORCEMENT'
      ? 'spent a reinforcement at'
      : 'placed at'

  return createEvent(
    state,
    legalAction.type,
    seat,
    `${SEAT_LABELS[seat]} ${actionText} ${legalAction.payload.q}, ${legalAction.payload.r}${captureText}.`,
    {
      cellId: legalAction.payload.cellId,
      capturedIds: placement.capturedIds,
    },
  )
}

function getPlacementUpdates(state, seat, legalAction, placement) {
  const nextPlayer = {
    ...state.players[seat],
    captures: state.players[seat].captures + placement.capturedIds.length,
  }

  if (legalAction.type === 'SPEND_REINFORCEMENT') {
    nextPlayer.reinforcements = spendReinforcementToken(
      state.players[seat].reinforcements,
      state,
    )
  }

  return {
    board: {
      ...state.board,
      cells: placement.cells,
    },
    players: {
      ...state.players,
      [seat]: nextPlayer,
    },
    passStreak: 0,
    lastMove: {
      type: legalAction.type,
      seat,
      cellId: legalAction.payload.cellId,
      capturedIds: placement.capturedIds,
    },
  }
}

function applyRepairAction(state, seat, legalAction) {
  const domains = deriveDomains(state)
  const domain = domains.find(
    (candidate) => candidate.anchorId === legalAction.payload.anchorId,
  )

  if (!domain || domain.owner !== seat || !domain.canRepair) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'The Domain cannot be repaired now.',
      state,
    }
  }

  const player = state.players[seat]
  const cost = legalAction.payload.cost

  if ((player.gold ?? 0) < cost) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'Not enough gold to repair this Domain.',
      state,
    }
  }

  const nextStability = Math.min(
    domain.baseStability,
    domain.stability + legalAction.payload.repairAmount,
  )
  const event = createEvent(
    state,
    'REPAIR_DOMAIN',
    seat,
    `${SEAT_LABELS[seat]} repaired ${domain.label} to ${nextStability}/${domain.baseStability} stability.`,
    {
      anchorId: domain.anchorId,
      cost,
      stability: nextStability,
      baseStability: domain.baseStability,
    },
  )

  return {
    accepted: true,
    reason: null,
    message: 'Domain repaired.',
    action: legalAction,
    state: {
      ...state,
      players: {
        ...state.players,
        [seat]: {
          ...player,
          gold: player.gold - cost,
        },
      },
      domains: {
        ...(state.domains ?? {}),
        [domain.anchorId]: {
          ...(state.domains?.[domain.anchorId] ?? {}),
          stability: nextStability,
          lastOwner: seat,
        },
      },
      requestCounter: state.requestCounter + 1,
      eventLog: [event, ...state.eventLog].slice(0, 36),
    },
  }
}

function applyPayUpkeepAction(state, seat, legalAction) {
  const player = state.players[seat]
  const cost = legalAction.payload.cost

  if ((player.upkeepDue ?? 0) <= 0 || (player.gold ?? 0) < cost) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'Upkeep cannot be paid now.',
      state,
    }
  }

  const event = createEvent(
    state,
    'PAY_UPKEEP',
    seat,
    `${SEAT_LABELS[seat]} paid ${cost} upkeep.`,
    { cost },
  )

  return {
    accepted: true,
    reason: null,
    message: 'Upkeep paid.',
    action: legalAction,
    state: {
      ...state,
      players: {
        ...state.players,
        [seat]: {
          ...player,
          gold: player.gold - cost,
          upkeepDue: 0,
        },
      },
      requestCounter: state.requestCounter + 1,
      eventLog: [event, ...state.eventLog].slice(0, 36),
    },
  }
}

function completeReinforcementPlacement(state, updates, event) {
  return {
    ...state,
    ...updates,
    requestCounter: state.requestCounter + 1,
    eventLog: [event, ...state.eventLog].slice(0, 36),
  }
}

function domainLabel(state, anchorId) {
  const domain = deriveDomains(state).find(
    (candidate) => candidate.anchorId === anchorId,
  )

  return domain ? domain.label : anchorId
}

function getPersistedDomainForAction(state, domain, owner) {
  const persisted = state.domains?.[domain.anchorId] ?? {}

  return {
    ...persisted,
    stability:
      persisted.lastOwner === owner
        ? normalizeWholeNumber(persisted.stability, domain.stability)
        : domain.stability,
    lastOwner: owner,
    decrees: normalizeDomainDecrees(persisted.decrees),
  }
}

function applyBuyDecreeAction(state, seat, legalAction) {
  const player = state.players[seat]
  const cost = legalAction.payload.cost
  const domain = deriveDomains(state).find(
    (candidate) => candidate.anchorId === legalAction.payload.anchorId,
  )
  const domainState = domain
    ? getPersistedDomainForAction(state, domain, seat)
    : {
        decrees: [],
        stability: 0,
        lastOwner: seat,
      }

  if ((player.gold ?? 0) < cost) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'Not enough gold to buy this decree.',
      state,
    }
  }

  const nextDecrees = [
    ...normalizeDomainDecrees(domainState.decrees),
    {
      type: legalAction.payload.decreeType ?? resolveDecreeRules().decreeType,
      level: legalAction.payload.level ?? 1,
      ruined: false,
    },
  ]

  const event = createEvent(
    state,
    'BUY_DECREE',
    seat,
    `${SEAT_LABELS[seat]} bought a ${legalAction.payload.decreeType ?? resolveDecreeRules().decreeType} on ${domainLabel(state, legalAction.payload.anchorId)}.`,
    {
      anchorId: legalAction.payload.anchorId,
      cost,
      level: legalAction.payload.level ?? 1,
      decrees: nextDecrees.length,
    },
  )

  return {
    accepted: true,
    reason: null,
    message: 'Decree purchased.',
    action: legalAction,
    state: {
      ...state,
      players: {
        ...state.players,
        [seat]: {
          ...player,
          gold: player.gold - cost,
        },
      },
      domains: {
        ...(state.domains ?? {}),
        [legalAction.payload.anchorId]: {
          ...domainState,
          decrees: nextDecrees,
          lastOwner: seat,
        },
      },
      requestCounter: state.requestCounter + 1,
      eventLog: [event, ...state.eventLog].slice(0, 36),
    },
  }
}

function applyUpgradeDecreeAction(state, seat, legalAction) {
  const player = state.players[seat]
  const domain = deriveDomains(state).find(
    (candidate) => candidate.anchorId === legalAction.payload.anchorId,
  )
  const domainState = domain
    ? getPersistedDomainForAction(state, domain, seat)
    : {
        decrees: [],
        stability: 0,
        lastOwner: seat,
      }
  const decrees = normalizeDomainDecrees(domainState.decrees)
  const decree = decrees[legalAction.payload.decreeIndex]
  const cost = legalAction.payload.cost

  if (!decree || decree.ruined || decree.level >= 3) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'That decree cannot be upgraded.',
      state,
    }
  }

  if ((player.gold ?? 0) < cost) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'Not enough gold to upgrade this decree.',
      state,
    }
  }

  const nextDecrees = decrees.map((candidate, index) =>
    index === legalAction.payload.decreeIndex
      ? {
          ...candidate,
          level: Math.min(candidate.level + 1, 3),
        }
      : candidate,
  )
  const event = createEvent(
    state,
    'UPGRADE_DECREE',
    seat,
    `${SEAT_LABELS[seat]} upgraded decree #${legalAction.payload.decreeIndex + 1} on ${domainLabel(state, legalAction.payload.anchorId)} to level ${decrees[legalAction.payload.decreeIndex].level + 1}.`,
    {
      anchorId: legalAction.payload.anchorId,
      decreeIndex: legalAction.payload.decreeIndex,
      fromLevel: decree.level,
      toLevel: decree.level + 1,
      cost,
    },
  )

  return {
    accepted: true,
    reason: null,
    message: 'Decree upgraded.',
    action: legalAction,
    state: {
      ...state,
      players: {
        ...state.players,
        [seat]: {
          ...player,
          gold: player.gold - cost,
        },
      },
      domains: {
        ...(state.domains ?? {}),
        [legalAction.payload.anchorId]: {
          ...domainState,
          decrees: nextDecrees,
        },
      },
      requestCounter: state.requestCounter + 1,
      eventLog: [event, ...state.eventLog].slice(0, 36),
    },
  }
}

function applyScrapRuinedDecreeAction(state, seat, legalAction) {
  const player = state.players[seat]
  const domain = deriveDomains(state).find(
    (candidate) => candidate.anchorId === legalAction.payload.anchorId,
  )
  const domainState = domain
    ? getPersistedDomainForAction(state, domain, seat)
    : {
        decrees: [],
        stability: 0,
        lastOwner: seat,
      }
  const decrees = normalizeDomainDecrees(domainState.decrees)
  const goldGain = resolveDecreeRules().scrapRuinGold

  if (!decrees[legalAction.payload.decreeIndex]?.ruined) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'That decree is not ruined and cannot be scrapped.',
      state,
    }
  }

  const event = createEvent(
    state,
    'SCRAP_RUINED_DECREE',
    seat,
    `${SEAT_LABELS[seat]} scrapped a ruined decree on ${domainLabel(state, legalAction.payload.anchorId)}.`,
    {
      anchorId: legalAction.payload.anchorId,
      decreeIndex: legalAction.payload.decreeIndex,
      goldGain,
    },
  )

  return {
    accepted: true,
    reason: null,
    message: 'Ruined decree scrapped.',
    action: legalAction,
    state: {
      ...state,
      players: {
        ...state.players,
        [seat]: {
          ...player,
          gold: (player.gold ?? 0) + goldGain,
        },
      },
      domains: {
        ...(state.domains ?? {}),
        [legalAction.payload.anchorId]: {
          ...domainState,
          decrees: decrees.filter(
            (_, index) => index !== legalAction.payload.decreeIndex,
          ),
        },
      },
      requestCounter: state.requestCounter + 1,
      eventLog: [event, ...state.eventLog].slice(0, 36),
    },
  }
}

function applyConvertRuinedDecreeAction(state, seat, legalAction) {
  const player = state.players[seat]
  const cost = legalAction.payload.cost
  const domain = deriveDomains(state).find(
    (candidate) => candidate.anchorId === legalAction.payload.anchorId,
  )
  const domainState = domain
    ? getPersistedDomainForAction(state, domain, seat)
    : {
        decrees: [],
        stability: 0,
        lastOwner: seat,
      }
  const decrees = normalizeDomainDecrees(domainState.decrees)
  const decree = decrees[legalAction.payload.decreeIndex]

  if (!decree || !decree.ruined) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'That decree is not ruined and cannot be converted.',
      state,
    }
  }

  if ((player.gold ?? 0) < cost) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'Not enough gold to convert this decree.',
      state,
    }
  }

  const nextDecrees = decrees.map((candidate, index) =>
    index === legalAction.payload.decreeIndex
      ? {
          ...candidate,
          ruined: false,
        }
      : candidate,
  )
  const nextStability = domain
    ? getDomainRecoveryStability(domain, state)
    : domainState.stability

  const event = createEvent(
    state,
    'CONVERT_RUINED_DECREE',
    seat,
    `${SEAT_LABELS[seat]} converted a ruined decree on ${domainLabel(state, legalAction.payload.anchorId)}.`,
    {
      anchorId: legalAction.payload.anchorId,
      decreeIndex: legalAction.payload.decreeIndex,
      cost,
      stability: nextStability,
    },
  )

  return {
    accepted: true,
    reason: null,
    message: 'Ruined decree converted.',
    action: legalAction,
    state: {
      ...state,
      players: {
        ...state.players,
        [seat]: {
          ...player,
          gold: player.gold - cost,
        },
      },
      domains: {
        ...(state.domains ?? {}),
        [legalAction.payload.anchorId]: {
          ...domainState,
          stability: nextStability,
          lastOwner: seat,
          decrees: nextDecrees,
        },
      },
      requestCounter: state.requestCounter + 1,
      eventLog: [event, ...state.eventLog].slice(0, 36),
    },
  }
}

export function applyAction(state, actionId, seat) {
  if (seat !== state.activeSeat) {
    return {
      accepted: false,
      reason: 'WRONG_SEAT',
      message: 'Only the active seat can act.',
      state,
    }
  }

  const legalAction = getLegalActions(state, seat).find(
    (action) => action.id === actionId,
  )

  if (!legalAction) {
    return {
      accepted: false,
      reason: 'ACTION_NOT_FOUND',
      message: 'That action is not legal in the current request.',
      state,
    }
  }

  if (legalAction.type === 'PASS') {
    const nextPassStreak = state.passStreak + 1
    const event = createEvent(
      state,
      'PASS',
      seat,
      `${SEAT_LABELS[seat]} passed.`,
      { passStreak: nextPassStreak },
    )

    return {
      accepted: true,
      reason: null,
      message: 'Pass accepted.',
      action: legalAction,
      state: advanceAfterAction(
        state,
        {
          passStreak: nextPassStreak,
          lastMove: {
            type: 'PASS',
            seat,
          },
        },
        event,
      ),
    }
  }

  if (legalAction.type === 'REPAIR_DOMAIN') {
    return applyRepairAction(state, seat, legalAction)
  }

  if (legalAction.type === 'PAY_UPKEEP') {
    return applyPayUpkeepAction(state, seat, legalAction)
  }

  if (legalAction.type === 'BUY_DECREE') {
    return applyBuyDecreeAction(state, seat, legalAction)
  }

  if (legalAction.type === 'UPGRADE_DECREE') {
    return applyUpgradeDecreeAction(state, seat, legalAction)
  }

  if (legalAction.type === 'SCRAP_RUINED_DECREE') {
    return applyScrapRuinedDecreeAction(state, seat, legalAction)
  }

  if (legalAction.type === 'CONVERT_RUINED_DECREE') {
    return applyConvertRuinedDecreeAction(state, seat, legalAction)
  }

  const placement = simulatePlacement(state, seat, legalAction.payload.cellId)

  if (!placement.legal) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'The action failed rule validation.',
      state,
    }
  }

  const event = createPlacementEvent(state, seat, legalAction, placement)
  const updates = getPlacementUpdates(state, seat, legalAction, placement)

  if (legalAction.type === 'SPEND_REINFORCEMENT') {
    return {
      accepted: true,
      reason: null,
      message: 'Reinforcement spent.',
      action: legalAction,
      state: completeReinforcementPlacement(state, updates, event),
    }
  }

  return {
    accepted: true,
    reason: null,
    message: 'Action accepted.',
    action: legalAction,
    state: advanceAfterAction(state, updates, event),
  }
}

function collectZoneGroup(cellMap, startId, seat, zoneIds, radius) {
  const queue = [startId]
  const visited = new Set()

  while (queue.length > 0) {
    const currentId = queue.shift()

    if (visited.has(currentId)) continue
    visited.add(currentId)

    const current = cellMap.get(currentId)

    for (const neighbor of getNeighborsFromMap(cellMap, current, radius)) {
      if (
        zoneIds.has(neighbor.id) &&
        neighbor.occupant === seat &&
        !visited.has(neighbor.id)
      ) {
        queue.push(neighbor.id)
      }
    }
  }

  return Array.from(visited)
}

function getLargestZoneGroup(zoneCells, seat, cellMap, radius) {
  const zoneIds = new Set(zoneCells.map((cell) => cell.id))
  const visited = new Set()
  let largest = []

  for (const cell of zoneCells) {
    if (visited.has(cell.id) || cell.occupant !== seat) {
      continue
    }

    const group = collectZoneGroup(cellMap, cell.id, seat, zoneIds, radius)

    for (const groupId of group) {
      visited.add(groupId)
    }

    if (group.length > largest.length) {
      largest = group
    }
  }

  return largest
}

function getDomainSize(count) {
  if (count >= 6) return 'large'
  if (count >= 4) return 'medium'
  if (count >= 2) return 'small'
  return null
}

export function deriveDomains(state) {
  const cellMap = getCellMap(state)

  const domains = state.anchors.map((anchor) => {
    const anchorCell = cellMap.get(cellId(anchor.q, anchor.r))
    if (!anchorCell) {
      return {
        anchorId: anchor.id,
        anchorKind: anchor.kind,
        label: anchor.label,
        mark: anchor.mark,
        regionId: anchor.regionId,
        owner: null,
        status: 'neutral',
        size: null,
        controllingGroupSize: 0,
        zoneCellIds: [],
        zoneOccupancy: {
          black: 0,
          white: 0,
        },
        reason: 'This Domain anchor is outside the current board radius.',
      }
    }
    const zoneCells = getNeighborsFromMap(
      cellMap,
      anchorCell,
      state.board.radius,
    ).filter((cell) => cell.type === 'playable')
    const blackGroup = getLargestZoneGroup(
      zoneCells,
      'black',
      cellMap,
      state.board.radius,
    )
    const whiteGroup = getLargestZoneGroup(
      zoneCells,
      'white',
      cellMap,
      state.board.radius,
    )
    const blackValid = blackGroup.length >= 2
    const whiteValid = whiteGroup.length >= 2
    let owner = null
    let status = 'neutral'
    let controllingGroupSize = 0
    let reason = 'No connected group of at least two stones controls this Domain.'

    if (blackValid || whiteValid) {
      if (blackGroup.length > whiteGroup.length && blackValid) {
        owner = 'black'
        status = 'controlled'
        controllingGroupSize = blackGroup.length
        reason = `Black has the largest connected group in the ${anchor.kind} zone.`
      } else if (whiteGroup.length > blackGroup.length && whiteValid) {
        owner = 'white'
        status = 'controlled'
        controllingGroupSize = whiteGroup.length
        reason = `White has the largest connected group in the ${anchor.kind} zone.`
      } else {
        status = 'contested'
        reason = 'Both seats tie or block clear connected control.'
      }
    } else if (zoneCells.some((cell) => cell.occupant)) {
      status = 'contested'
      reason = 'There is presence here, but no valid connected Domain group yet.'
    }

    return {
      anchorId: anchor.id,
      anchorKind: anchor.kind,
      label: anchor.label,
      mark: anchor.mark,
      regionId: anchor.regionId,
      owner,
      status,
      size: getDomainSize(controllingGroupSize),
      controllingGroupSize,
      zoneCellIds: zoneCells.map((cell) => cell.id),
      zoneOccupancy: {
        black: zoneCells.filter((cell) => cell.occupant === 'black').length,
        white: zoneCells.filter((cell) => cell.occupant === 'white').length,
      },
      reason,
    }
  })

  if (
    !state.featureFlags.income &&
    !state.featureFlags.stability &&
    !state.featureFlags.decrees
  ) {
    return domains
  }

  return domains.map((domain) => enrichDomainEconomy(domain, state))
}

function projectPlayerState(player) {
  const projected = { ...player }

  if (player.reinforcements) {
    projected.reinforcements = { ...player.reinforcements }
  }

  return projected
}

function projectPlayers(players) {
  return Object.fromEntries(
    SEATS.map((seat) => [seat, projectPlayerState(players[seat])]),
  )
}

function projectLastMove(lastMove) {
  if (!lastMove) return null

  return {
    ...lastMove,
    capturedIds: lastMove.capturedIds ? [...lastMove.capturedIds] : undefined,
  }
}

export function getPublicState(state) {
  return {
    matchId: state.matchId,
    rulesVersion: state.rulesVersion,
    featureFlags: projectFeatureFlags(state.featureFlags),
    phase: state.phase,
    cycle: state.cycle,
    round: state.round,
    turn: state.turn,
    activeSeat: state.activeSeat,
    players: projectPlayers(state.players),
    lastMove: projectLastMove(state.lastMove),
    board: {
      radius: state.board.radius,
      cells: state.board.cells.map((cell) => ({
        id: cell.id,
        q: cell.q,
        r: cell.r,
        type: cell.type,
        occupant: cell.occupant,
        anchorId: cell.anchorId,
        anchorKind: cell.anchorKind,
        regionId: cell.regionId,
      })),
    },
    domains: deriveDomains(state),
  }
}

export function getSeatState(state, seat) {
  return {
    seat,
    isActive: seat === state.activeSeat,
    hiddenInformation: 'MVP has no hidden hand. Future card state is seat-scoped.',
  }
}

export function createRequestId(state, seat = state.activeSeat) {
  return `${state.matchId}:turn-${state.turn}:request-${state.requestCounter}:${seat}`
}

export function createAgentRequest(state, seat = state.activeSeat) {
  return {
    type: 'AGENT_REQUEST',
    requestId: createRequestId(state, seat),
    matchId: state.matchId,
    seat,
    phase: state.phase,
    rulesVersion: state.rulesVersion,
    featureFlags: projectFeatureFlags(state.featureFlags),
    cycle: state.cycle,
    round: state.round,
    turn: state.turn,
    publicState: getPublicState(state),
    privateState: getSeatState(state, seat),
    legalActions: getLegalActions(state, seat),
  }
}

export function submitProtocolAction(state, submission, options = {}) {
  const expectedToken = options.expectedToken

  if (submission.matchId !== state.matchId) {
    return {
      accepted: false,
      reason: 'MATCH_NOT_FOUND',
      message: 'Submission matchId does not match this match.',
      state,
    }
  }

  if (expectedToken && submission.token !== expectedToken) {
    return {
      accepted: false,
      reason: 'BAD_TOKEN',
      message: 'Seat token did not match this browser-local invitation.',
      state,
    }
  }

  if (submission.seat !== state.activeSeat) {
    return {
      accepted: false,
      reason: 'WRONG_SEAT',
      message: 'Submission seat is not the active seat.',
      state,
    }
  }

  if (submission.requestId !== createRequestId(state, state.activeSeat)) {
    return {
      accepted: false,
      reason: 'STALE_REQUEST',
      message: 'This request is no longer current.',
      state,
    }
  }

  return applyAction(state, submission.selectedActionId, submission.seat)
}

export function chooseBotAction(agentRequest) {
  const placements = agentRequest.legalActions.filter(
    (action) =>
      action.type === 'PLACE_STONE' || action.type === 'SPEND_REINFORCEMENT',
  )
  const repairs = agentRequest.legalActions.filter(
    (action) => action.type === 'REPAIR_DOMAIN',
  )
  const economyActions = agentRequest.legalActions.filter((action) =>
    [
      'PAY_UPKEEP',
      'BUY_DECREE',
      'UPGRADE_DECREE',
      'SCRAP_RUINED_DECREE',
      'CONVERT_RUINED_DECREE',
    ].includes(action.type),
  )

  if (
    placements.length === 0 &&
    repairs.length === 0 &&
    economyActions.length === 0
  ) {
    return agentRequest.legalActions.find((action) => action.type === 'PASS')?.id
  }

  const scored = [
    ...placements.map((action) => {
      const centerBias =
        4 - Math.max(Math.abs(action.payload.q), Math.abs(action.payload.r))
      const anchorBias = action.preview.adjacentAnchors.length * 4
      const captureBias = action.preview.capturedCount * 16
      const reinforcementBias = action.type === 'SPEND_REINFORCEMENT' ? 1 : 0

      return {
        action,
        score: centerBias + anchorBias + captureBias + reinforcementBias,
      }
    }),
    ...repairs.map((action) => ({
      action,
      score:
        12 +
        (action.preview.stabilityAfter - action.preview.stabilityBefore) * 5,
    })),
    ...economyActions.map((action) => {
      const scoreByType = {
        PAY_UPKEEP: 60,
        CONVERT_RUINED_DECREE: 36 + (action.preview.levelAfter ?? 1) * 4,
        BUY_DECREE: 30 + (action.preview.decreeIncomeAfter ?? 0),
        UPGRADE_DECREE: 26 + (action.preview.levelAfter ?? 1) * 4,
        SCRAP_RUINED_DECREE: 20 + (action.preview.goldGain ?? 0) * 3,
      }

      return {
        action,
        score: scoreByType[action.type] ?? 0,
      }
    }),
  ]

  scored.sort((a, b) => b.score - a.score || a.action.id.localeCompare(b.action.id))

  return scored[0].action.id
}
