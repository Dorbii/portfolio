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

const DECREE_TYPES = Object.freeze({
  TAX_OFFICE: 'Tax Office',
  BRIBE_NETWORK: 'Bribe Network',
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
  decreeType: DECREE_TYPES.TAX_OFFICE,
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

const DEFAULT_BRIBE_NETWORK_RULES = Object.freeze({
  purchaseCost: 4,
  upgradeCostByLevel: {
    1: 5,
    2: 7,
  },
  upkeepByLevel: {
    1: 2,
    2: 3,
    3: 4,
  },
  corruptionByLevel: {
    1: 2,
    2: 3,
    3: 4,
  },
  siphonBonusByLevel: {
    3: 1,
  },
})

const DEFAULT_PRESSURE_RULES = Object.freeze({
  influenceBySize: {
    small: 2,
    medium: 3,
    large: 4,
  },
  counterBribeCost: 2,
  counterBribeReduction: 1,
  purgeReduction: 2,
})

const WILD_CARD = Object.freeze({
  id: 'wild',
  name: 'Wild',
})

const CARD_TYPES = Object.freeze([
  ...REGIONS.map((region) => ({
    id: region.id,
    name: region.name,
  })),
  WILD_CARD,
])

const DEFAULT_CARD_RULES = Object.freeze({
  handLimit: 5,
  fallbackGold: 1,
  majorSetPerCycle: 1,
  era: 1,
  eraFallbacks: {
    1: {
      gold: 2,
      reinforcements: 2,
      repair: 2,
    },
    2: {
      gold: 3,
      reinforcements: 2,
      repair: 2,
    },
    3: {
      gold: 4,
      reinforcements: 2,
      repair: 3,
    },
    4: {
      gold: 5,
      reinforcements: 3,
      repair: 3,
    },
  },
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

function getDecreePurchaseCost(decreeType, level = 1) {
  if (decreeType === DECREE_TYPES.BRIBE_NETWORK) {
    return level === 1 ? DEFAULT_BRIBE_NETWORK_RULES.purchaseCost : 0
  }

  return resolveDecreeRules().decreePurchaseCostByLevel[level] ?? 1
}

function getDecreeUpgradeCost(decreeType, level) {
  if (decreeType === DECREE_TYPES.BRIBE_NETWORK) {
    return DEFAULT_BRIBE_NETWORK_RULES.upgradeCostByLevel[level] ?? 0
  }

  return resolveDecreeRules().decreeUpgradeCostByLevel[level] ?? 1
}

function getDecreeIncomeValue(decree) {
  if (decree.type === DECREE_TYPES.BRIBE_NETWORK) {
    return 0
  }

  return resolveDecreeRules().decreeIncomeByLevel[decree.level] ?? 0
}

function getDecreeUpkeepValue(decree) {
  if (decree.type === DECREE_TYPES.BRIBE_NETWORK) {
    return DEFAULT_BRIBE_NETWORK_RULES.upkeepByLevel[decree.level] ?? 0
  }

  return resolveDecreeRules().decreeUpkeepByLevel[decree.level] ?? 0
}

function getBribeNetworkCorruption(decree) {
  if (decree.type !== DECREE_TYPES.BRIBE_NETWORK) return 0

  return DEFAULT_BRIBE_NETWORK_RULES.corruptionByLevel[decree.level] ?? 0
}

function getBribeNetworkSiphonBonus(decree) {
  if (decree.type !== DECREE_TYPES.BRIBE_NETWORK) return 0

  return DEFAULT_BRIBE_NETWORK_RULES.siphonBonusByLevel[decree.level] ?? 0
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
    featureFlags.decrees ||
    featureFlags.corruption ||
    featureFlags.regionCards ||
    featureFlags.setCashIns ||
    featureFlags.counterDraft
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

function normalizePressureAssignments(assignments = []) {
  return (assignments ?? [])
    .filter((assignment) =>
      [
        'ASSIGN_INFLUENCE_PRESSURE',
        'ASSIGN_INFLUENCE_SUPPORT',
        'TARGET_BRIBE_NETWORK',
      ].includes(assignment.type),
    )
    .map((assignment) => ({
      type: assignment.type,
      seat: assignment.seat,
      sourceId: assignment.sourceId,
      sourceAnchorId: assignment.sourceAnchorId,
      targetAnchorId: assignment.targetAnchorId,
      createdCycle: normalizeWholeNumber(assignment.createdCycle, 1, { min: 1 }),
    }))
}

function normalizePressureDefenses(defenses = [], defaultType) {
  return (defenses ?? [])
    .filter((defense) => defense.targetAnchorId)
    .map((defense) => ({
      type: defense.type ?? defaultType,
      seat: defense.seat,
      sourceId: defense.sourceId ?? null,
      targetAnchorId: defense.targetAnchorId,
      reduction: normalizeWholeNumber(defense.reduction, 1, { min: 1 }),
      cost: normalizeWholeNumber(defense.cost, 0),
      createdCycle: normalizeWholeNumber(defense.createdCycle, 1, { min: 1 }),
    }))
}

function createPressureState(config = {}) {
  const initial = config.initialPressure ?? {}

  return {
    assignments: normalizePressureAssignments(initial.assignments),
    counterBribes: normalizePressureDefenses(
      initial.counterBribes,
      'SPEND_COUNTER_BRIBE',
    ),
    purges: normalizePressureDefenses(initial.purges, 'PURGE_CORRUPTION'),
    metrics: {
      culturalMandateWatch: {},
      ...(initial.metrics ?? {}),
    },
    lastResolvedCycle: initial.lastResolvedCycle ?? null,
  }
}

function getCardType(regionId) {
  return CARD_TYPES.find((cardType) => cardType.id === regionId) ?? WILD_CARD
}

function normalizeCard(card = {}, fallback = {}) {
  const regionId = CARD_TYPES.some((cardType) => cardType.id === card.regionId)
    ? card.regionId
    : fallback.regionId ?? 'central-plain'
  const cardType = getCardType(regionId)

  return {
    id:
      card.id ??
      fallback.id ??
      `card-${fallback.seat ?? 'neutral'}-${regionId}-${fallback.index ?? 0}`,
    regionId,
    name: card.name ?? cardType.name,
    source: card.source ?? fallback.source ?? 'seeded',
    gainedCycle: normalizeWholeNumber(
      card.gainedCycle,
      fallback.gainedCycle ?? 1,
      { min: 1 },
    ),
    cashableAfterCycle: normalizeWholeNumber(
      card.cashableAfterCycle,
      fallback.cashableAfterCycle ?? card.gainedCycle ?? 1,
      { min: 1 },
    ),
  }
}

function normalizeCards(cards = [], seat) {
  return (cards ?? []).map((card, index) =>
    normalizeCard(card, {
      id: `card-${seat}-seed-${index}`,
      seat,
      index,
      gainedCycle: 1,
      cashableAfterCycle: 1,
    }),
  )
}

function normalizeRevealedSets(sets = []) {
  return (sets ?? []).map((set, index) => ({
    id: set.id ?? `revealed-set-${index}`,
    owner: set.owner,
    setType: set.setType,
    regionId: set.regionId ?? null,
    cycle: normalizeWholeNumber(set.cycle, 1, { min: 1 }),
    strength: normalizeWholeNumber(set.strength, 1, { min: 1 }),
    counterDraftChoice: set.counterDraftChoice ?? null,
  }))
}

function createCardState(config = {}) {
  const initial = config.initialCards ?? {}
  const initialState = config.initialCardState ?? {}
  const handLimit = normalizeWholeNumber(
    config.cardRules?.handLimit,
    DEFAULT_CARD_RULES.handLimit,
    { min: 1 },
  )

  return {
    handLimit,
    players: Object.fromEntries(
      SEATS.map((seat) => {
        const seeded = initialState.players?.[seat] ?? {}

        return [
          seat,
          {
            hand: normalizeCards(seeded.hand ?? initial[seat], seat),
            revealedSets: normalizeRevealedSets(seeded.revealedSets),
            lastDraftCycle: seeded.lastDraftCycle ?? null,
            majorSetCashedCycle: seeded.majorSetCashedCycle ?? null,
          },
        ]
      }),
    ),
    pendingCounterDraft: initialState.pendingCounterDraft ?? null,
    discardReturnSeat: initialState.discardReturnSeat ?? null,
    metrics: {
      counterDraftChoices: {},
      seekMissingChoices: {},
      ...(initialState.metrics ?? {}),
    },
  }
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

function createBoard(radius, initialStones = STARTING_STONES) {
  const cells = []

  for (let q = -radius; q <= radius; q += 1) {
    for (let r = -radius; r <= radius; r += 1) {
      if (isWithinRadius(q, r, radius)) {
        cells.push(makeCell(q, r))
      }
    }
  }

  const cellsWithStarts = cells.map((cell) => {
    const startingStone = initialStones.find(
      (stone) => stone.q === cell.q && stone.r === cell.r,
    )

    if (!startingStone || !SEATS.includes(startingStone.seat) || cell.type !== 'playable') {
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
    board: createBoard(radius, config.initialStones ?? STARTING_STONES),
    players: {
      black: createPlayerState('black', config, featureFlags),
      white: createPlayerState('white', config, featureFlags),
    },
    domains:
      featureFlags.income || featureFlags.stability || featureFlags.decrees
        ? createDomainEconomyState(config)
        : {},
    pressure:
      featureFlags.influence || featureFlags.corruption
        ? createPressureState(config)
        : null,
    cards:
      featureFlags.regionCards ||
      featureFlags.setCashIns ||
      featureFlags.counterDraft
        ? createCardState(config)
        : null,
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
  return decrees.reduce(
    (sum, decree) =>
      sum + (decree.active && !decree.ruined ? getDecreeIncomeValue(decree) : 0),
    0,
  )
}

function getDomainDecreeUpkeep(decrees) {
  return decrees.reduce(
    (sum, decree) =>
      sum + (decree.active && !decree.ruined ? getDecreeUpkeepValue(decree) : 0),
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

function pressureEnabled(state) {
  return state.featureFlags.influence || state.featureFlags.corruption
}

function getCurrentPressure(state) {
  return state.pressure ?? createPressureState()
}

function getCyclePressureEntries(entries, state) {
  return (entries ?? []).filter((entry) => entry.createdCycle === state.cycle)
}

function isStableControlledDomain(domain, state) {
  return (
    domain.status === 'controlled' &&
    domain.owner &&
    domain.size &&
    (!state.featureFlags.stability || domain.stability > 0)
  )
}

function isPressureTargetForSeat(domain, seat) {
  return (
    domain.status === 'contested' ||
    (domain.status === 'controlled' && domain.owner && domain.owner !== seat)
  )
}

function isSupportTargetForSeat(domain, seat) {
  return domain.status === 'controlled' && domain.owner === seat
}

function domainsAreAdjacent(state, sourceDomain, targetDomain) {
  if (sourceDomain.anchorId === targetDomain.anchorId) return false

  const targetIds = new Set(targetDomain.zoneCellIds)

  if (sourceDomain.zoneCellIds.some((cellIdValue) => targetIds.has(cellIdValue))) {
    return true
  }

  return sourceDomain.zoneCellIds.some((cellIdValue) =>
    getNeighborIds(state, cellIdValue).some((neighborId) => targetIds.has(neighborId)),
  )
}

function createInfluenceSource(domain) {
  const strength = DEFAULT_PRESSURE_RULES.influenceBySize[domain.size] ?? 0

  if (strength <= 0 || domain.anchorKind !== 'Temple') return null

  return {
    id: `influence:${domain.anchorId}`,
    kind: 'influence',
    sourceType: 'Temple Domain',
    seat: domain.owner,
    anchorId: domain.anchorId,
    label: `${domain.label} influence`,
    regionId: domain.regionId,
    strength,
    corruption: 0,
    siphonBonus: 0,
    level: null,
  }
}

function createBribeNetworkSource(domain, decree) {
  const strength = getBribeNetworkCorruption(decree)

  if (strength <= 0) return null

  return {
    id: `bribe:${domain.anchorId}:${decree.index}`,
    kind: 'corruption',
    sourceType: DECREE_TYPES.BRIBE_NETWORK,
    seat: domain.owner,
    anchorId: domain.anchorId,
    label: `${DECREE_TYPES.BRIBE_NETWORK} L${decree.level} in ${domain.label}`,
    regionId: domain.regionId,
    strength,
    corruption: strength,
    siphonBonus: getBribeNetworkSiphonBonus(decree),
    level: decree.level,
  }
}

function derivePressureSources(state, domains = deriveDomainsWithoutPressure(state)) {
  if (!pressureEnabled(state)) return []

  const sources = []

  for (const domain of domains) {
    if (!isStableControlledDomain(domain, state)) continue

    if (state.featureFlags.influence) {
      const influenceSource = createInfluenceSource(domain)

      if (influenceSource) {
        sources.push(influenceSource)
      }
    }

    if (state.featureFlags.corruption) {
      for (const decree of domain.decrees ?? []) {
        if (!decree.active || decree.ruined) continue

        const bribeSource = createBribeNetworkSource(domain, decree)

        if (bribeSource) {
          sources.push(bribeSource)
        }
      }
    }
  }

  return sources
}

function canSourcePressureTarget(state, source, sourceDomain, targetDomain) {
  if (!source || !sourceDomain || !targetDomain) return false
  if (!isPressureTargetForSeat(targetDomain, source.seat)) return false

  if (source.kind === 'corruption' && source.level >= 3) {
    return (
      sourceDomain.regionId === targetDomain.regionId ||
      domainsAreAdjacent(state, sourceDomain, targetDomain)
    )
  }

  return domainsAreAdjacent(state, sourceDomain, targetDomain)
}

function canSourceSupportTarget(source, targetDomain) {
  return (
    source?.kind === 'influence' &&
    isSupportTargetForSeat(targetDomain, source.seat) &&
    source.regionId === targetDomain.regionId
  )
}

function createEmptyDomainPressure() {
  return {
    incomingInfluence: 0,
    incomingCorruption: 0,
    effectiveCorruption: 0,
    friendlySupport: 0,
    defensiveReduction: 0,
    counterBribeReduction: 0,
    purgeReduction: 0,
    netPressure: 0,
    pressureOwner: null,
    projectedEffects: {
      siphon: 0,
      stabilityDamage: 0,
      passiveRepair: 0,
      threshold: 'none',
    },
    warningChips: [],
    assignments: [],
    defenses: [],
  }
}

function getPressureThresholdEffect(netPressure, domainIncome, siphonBonus = 0) {
  if (netPressure <= 2) {
    return {
      siphon: 0,
      stabilityDamage: 0,
      threshold: '0-2 no effect',
    }
  }

  if (netPressure <= 4) {
    return {
      siphon: Math.min(domainIncome, domainIncome > 0 ? 1 + siphonBonus : 0),
      stabilityDamage: 0,
      threshold: '3-4 siphon 1',
    }
  }

  if (netPressure <= 6) {
    return {
      siphon: Math.min(
        domainIncome,
        domainIncome > 0 ? Math.max(1, Math.floor(domainIncome * 0.25)) + siphonBonus : 0,
      ),
      stabilityDamage: 0,
      threshold: '5-6 siphon 25%',
    }
  }

  if (netPressure <= 9) {
    return {
      siphon: Math.min(
        domainIncome,
        domainIncome > 0 ? Math.max(1, Math.floor(domainIncome * 0.25)) + siphonBonus : 0,
      ),
      stabilityDamage: 1,
      threshold: '7-9 siphon 25%, -1 stability',
    }
  }

  return {
    siphon: Math.min(
      domainIncome,
      domainIncome > 0 ? Math.max(1, Math.floor(domainIncome * 0.5)) + siphonBonus : 0,
    ),
    stabilityDamage: 2,
    threshold: '10+ siphon 50%, -2 stability',
  }
}

function addWarningChips(pressure, hasCorruption) {
  const chips = []

  if (pressure.netPressure >= 3 && pressure.projectedEffects.siphon > 0) {
    chips.push('siphon')
  }

  if (pressure.projectedEffects.stabilityDamage > 0) {
    chips.push('stability damage')
  }

  if (hasCorruption) {
    chips.push('corruption')
  }

  if (pressure.projectedEffects.passiveRepair > 0) {
    chips.push('support repair')
  }

  return chips
}

function derivePressureProjection(state, domains = deriveDomainsWithoutPressure(state)) {
  const pressureState = getCurrentPressure(state)
  const domainsById = new Map(domains.map((domain) => [domain.anchorId, domain]))
  const sourceList = derivePressureSources(state, domains)
  const sourcesById = new Map(sourceList.map((source) => [source.id, source]))
  const domainPressure = Object.fromEntries(
    domains.map((domain) => [domain.anchorId, createEmptyDomainPressure()]),
  )
  const assignments = []
  const pressureBySeatAndDomain = new Map()

  for (const assignment of getCyclePressureEntries(pressureState.assignments, state)) {
    const source = sourcesById.get(assignment.sourceId)
    const sourceDomain = source ? domainsById.get(source.anchorId) : null
    const targetDomain = domainsById.get(assignment.targetAnchorId)
    const targetPressure = domainPressure[assignment.targetAnchorId]

    if (!targetPressure) continue

    const publicAssignment = {
      ...assignment,
      sourceLabel: source?.label ?? 'Inactive source',
      targetLabel: targetDomain?.label ?? assignment.targetAnchorId,
      pressureType: source?.kind ?? 'inactive',
      strength: source?.strength ?? 0,
      status: 'inactive',
      reason: 'Source is not stable or no longer exists.',
    }

    if (
      source &&
      assignment.type === 'ASSIGN_INFLUENCE_PRESSURE' &&
      canSourcePressureTarget(state, source, sourceDomain, targetDomain)
    ) {
      publicAssignment.status = 'projected'
      publicAssignment.reason = null
      targetPressure.incomingInfluence += source.strength
      assignments.push(publicAssignment)
    } else if (
      source &&
      assignment.type === 'ASSIGN_INFLUENCE_SUPPORT' &&
      canSourceSupportTarget(source, targetDomain)
    ) {
      publicAssignment.status = 'projected'
      publicAssignment.reason = null
      targetPressure.friendlySupport += source.strength
      assignments.push(publicAssignment)
    } else if (
      source &&
      assignment.type === 'TARGET_BRIBE_NETWORK' &&
      canSourcePressureTarget(state, source, sourceDomain, targetDomain)
    ) {
      publicAssignment.status = 'projected'
      publicAssignment.reason = null
      publicAssignment.siphonBonus = source.siphonBonus
      targetPressure.incomingCorruption += source.strength
      assignments.push(publicAssignment)
    } else {
      targetPressure.assignments.push(publicAssignment)
      assignments.push(publicAssignment)
      continue
    }

    targetPressure.assignments.push(publicAssignment)

    if (
      publicAssignment.status === 'projected' &&
      publicAssignment.type !== 'ASSIGN_INFLUENCE_SUPPORT'
    ) {
      const key = `${source.seat}:${assignment.targetAnchorId}`
      const previous = pressureBySeatAndDomain.get(key) ?? {
        seat: source.seat,
        anchorId: assignment.targetAnchorId,
        pressure: 0,
        siphonBonus: 0,
      }

      pressureBySeatAndDomain.set(key, {
        ...previous,
        pressure: previous.pressure + source.strength,
        siphonBonus: previous.siphonBonus + (source.siphonBonus ?? 0),
      })
    }
  }

  for (const counterBribe of getCyclePressureEntries(pressureState.counterBribes, state)) {
    const targetPressure = domainPressure[counterBribe.targetAnchorId]

    if (!targetPressure) continue

    targetPressure.counterBribeReduction += counterBribe.reduction
    targetPressure.defenses.push(counterBribe)
  }

  for (const purge of getCyclePressureEntries(pressureState.purges, state)) {
    const targetPressure = domainPressure[purge.targetAnchorId]

    if (!targetPressure) continue

    targetPressure.purgeReduction += purge.reduction
    targetPressure.defenses.push(purge)
  }

  for (const domain of domains) {
    const pressure = domainPressure[domain.anchorId]
    const strongestPressure = Array.from(pressureBySeatAndDomain.values())
      .filter((entry) => entry.anchorId === domain.anchorId)
      .sort((left, right) => right.pressure - left.pressure)[0]
    const corruptionReduction = Math.min(
      pressure.incomingCorruption,
      pressure.counterBribeReduction + pressure.purgeReduction,
    )
    const effectiveCorruption = Math.max(
      0,
      pressure.incomingCorruption - corruptionReduction,
    )
    const rawEnemyPressure = pressure.incomingInfluence + effectiveCorruption
    const netPressure = Math.max(0, rawEnemyPressure - pressure.friendlySupport)
    const projectedEffects = getPressureThresholdEffect(
      netPressure,
      domain.income ?? 0,
      strongestPressure?.siphonBonus ?? 0,
    )
    const supportRepair =
      state.featureFlags.stability &&
      domain.status === 'controlled' &&
      pressure.friendlySupport > rawEnemyPressure &&
      domain.stability < domain.baseStability
        ? 1
        : 0

    pressure.counterBribeReduction = corruptionReduction
    pressure.purgeReduction = Math.min(
      pressure.incomingCorruption - pressure.counterBribeReduction,
      pressure.purgeReduction,
    )
    pressure.defensiveReduction = corruptionReduction
    pressure.effectiveCorruption = effectiveCorruption
    pressure.netPressure = netPressure
    pressure.pressureOwner =
      strongestPressure && strongestPressure.pressure > 0
        ? strongestPressure.seat
        : null
    pressure.projectedEffects = {
      ...projectedEffects,
      passiveRepair: supportRepair,
    }
    pressure.warningChips = addWarningChips(
      pressure,
      pressure.incomingCorruption > 0,
    )
  }

  return {
    sources: sourceList,
    assignments,
    counterBribes: getCyclePressureEntries(pressureState.counterBribes, state),
    purges: getCyclePressureEntries(pressureState.purges, state),
    domains: domainPressure,
    metrics: pressureState.metrics ?? { culturalMandateWatch: {} },
    lastResolvedCycle: pressureState.lastResolvedCycle,
  }
}

function enrichDomainPressure(domain, state, pressureProjection) {
  if (!pressureEnabled(state)) return domain

  return {
    ...domain,
    pressure: pressureProjection.domains[domain.anchorId] ?? createEmptyDomainPressure(),
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

function cardsEnabled(state) {
  return (
    state.featureFlags.regionCards ||
    state.featureFlags.setCashIns ||
    state.featureFlags.counterDraft
  )
}

function getCurrentCards(state) {
  return state.cards ?? createCardState()
}

function getCardPlayer(state, seat) {
  return getCurrentCards(state).players[seat]
}

function getControlledCardRegions(domains, seat) {
  const regionIds = domains
    .filter((domain) => domain.owner === seat && domain.status === 'controlled')
    .map((domain) => domain.regionId)

  return Array.from(new Set(regionIds)).sort()
}

function createCardFromRegion(
  state,
  seat,
  regionId,
  source,
  sequence = 0,
  overrides = {},
) {
  const cardType = getCardType(regionId)

  return normalizeCard(
    {
      id: `card-${seat}-${state.cycle}-${state.turn}-${state.requestCounter}-${source}-${regionId}-${sequence}`,
      regionId,
      name: cardType.name,
      source,
      gainedCycle: state.cycle,
      cashableAfterCycle: state.cycle,
      ...overrides,
    },
    { seat, index: sequence },
  )
}

function cashableCards(hand, cycle) {
  return hand.filter((card) => card.cashableAfterCycle <= cycle)
}

export function detectCompletedCardSets(hand, cycle = Number.MAX_SAFE_INTEGER) {
  const availableCards = cashableCards(hand, cycle)
  const wildCards = availableCards.filter((card) => card.regionId === WILD_CARD.id)
  const regionCards = availableCards.filter((card) => card.regionId !== WILD_CARD.id)
  const byRegion = new Map()
  const sets = []

  for (const card of regionCards) {
    const cards = byRegion.get(card.regionId) ?? []
    cards.push(card)
    byRegion.set(card.regionId, cards)
  }

  for (const [regionId, cards] of byRegion.entries()) {
    if (cards.length >= 3) {
      const setCards = cards.slice(0, 3)
      sets.push(createDetectedCardSet('MATCHING_REGION', regionId, setCards))
    }

    if (cards.length >= 2 && wildCards.length > 0) {
      const setCards = [...cards.slice(0, 2), wildCards[0]]
      sets.push(createDetectedCardSet('MATCHING_REGION', regionId, setCards))
    }
  }

  if (byRegion.size >= 3) {
    const setCards = Array.from(byRegion.values()).map((cards) => cards[0]).slice(0, 3)
    sets.push(createDetectedCardSet('MIXED_REGION', null, setCards))
  }

  return sets
}

function createDetectedCardSet(setType, regionId, cards) {
  const regionName = regionId ? getCardType(regionId).name : 'Mixed Regions'
  const cardIds = cards.map((card) => card.id)

  return {
    id: `${setType}-${regionId ?? 'mixed'}-${cardIds.join('-')}`,
    setType,
    regionId,
    regionName,
    cardIds,
    cards: cards.map((card) => ({
      id: card.id,
      regionId: card.regionId,
      name: card.name,
    })),
    label:
      setType === 'MATCHING_REGION'
        ? `${regionName} major set`
        : 'Mixed region set',
  }
}

function chooseSeekMissingRegion(state, seat) {
  const hand = getCardPlayer(state, seat).hand
  const nonWild = hand.filter((card) => card.regionId !== WILD_CARD.id)
  const wildCount = hand.length - nonWild.length
  const counts = nonWild.reduce((summary, card) => {
    summary[card.regionId] = (summary[card.regionId] ?? 0) + 1
    return summary
  }, {})

  const matchingNeed = Object.entries(counts)
    .filter(([, count]) => count >= 2)
    .map(([regionId]) => regionId)
    .sort()[0]

  if (matchingNeed) return matchingNeed

  if (wildCount > 0) {
    const wildNeed = Object.entries(counts)
      .filter(([, count]) => count >= 1)
      .map(([regionId]) => regionId)
      .sort()[0]

    if (wildNeed) return wildNeed
  }

  const domains = deriveDomains(state)
  return getControlledCardRegions(domains, seat)[0] ?? 'central-plain'
}

function cardDraftActionId(state, regionId) {
  return `turn-${state.turn}-${state.activeSeat}-draft-${regionId ?? 'fallback'}`
}

function discardCardActionId(state, cardId) {
  return `turn-${state.turn}-${state.activeSeat}-discard-${cardId}`
}

function cashSetActionId(state, detectedSet) {
  return `turn-${state.turn}-${state.activeSeat}-cash-${detectedSet.id}`
}

function counterDraftActionId(state, type, option = 'base') {
  return `turn-${state.turn}-${state.activeSeat}-${type.toLowerCase()}-${option}`
}

function createDraftCardActions(state, seat, domains) {
  if (!state.featureFlags.regionCards || seat !== state.activeSeat) return []
  if (getCardPlayer(state, seat).lastDraftCycle === state.cycle) return []

  const controlledRegions = getControlledCardRegions(domains, seat)
  const cardCountAfter = getCardPlayer(state, seat).hand.length + 1

  if (controlledRegions.length === 0) {
    return [
      {
        id: cardDraftActionId(state, null),
        type: 'DRAFT_CARD',
        seat,
        label: 'Take provisional gold instead of drafting',
        payload: {
          regionId: null,
          fallback: 'gold',
          gold: DEFAULT_CARD_RULES.fallbackGold,
        },
        preview: {
          cardCountAfter: getCardPlayer(state, seat).hand.length,
          handLimit: getCurrentCards(state).handLimit,
        },
      },
    ]
  }

  return controlledRegions.map((regionId) => {
    const cardType = getCardType(regionId)

    return {
      id: cardDraftActionId(state, regionId),
      type: 'DRAFT_CARD',
      seat,
      label: `Draft hidden ${cardType.name} card`,
      payload: {
        regionId,
      },
      preview: {
        cardName: cardType.name,
        cardCountAfter,
        handLimit: getCurrentCards(state).handLimit,
      },
    }
  })
}

function createDiscardCardActions(state, seat) {
  if (!cardsEnabled(state) || seat !== state.activeSeat) return []

  const playerCards = getCardPlayer(state, seat)

  if (playerCards.hand.length <= getCurrentCards(state).handLimit) return []

  return playerCards.hand.map((card) => ({
    id: discardCardActionId(state, card.id),
    type: 'DISCARD_CARD',
    seat,
    label: `Discard ${card.name}`,
    payload: {
      cardId: card.id,
    },
    preview: {
      cardCountAfter: playerCards.hand.length - 1,
      handLimit: getCurrentCards(state).handLimit,
    },
  }))
}

function createCashSetActions(state, seat) {
  if (!state.featureFlags.setCashIns || seat !== state.activeSeat) return []

  const playerCards = getCardPlayer(state, seat)

  if (playerCards.majorSetCashedCycle === state.cycle) return []

  return detectCompletedCardSets(playerCards.hand, state.cycle).map((detectedSet) => ({
    id: cashSetActionId(state, detectedSet),
    type: 'CASH_SET',
    seat,
    label: `Cash ${detectedSet.label}`,
    payload: {
      setId: detectedSet.id,
      setType: detectedSet.setType,
      regionId: detectedSet.regionId,
      cardIds: detectedSet.cardIds,
      strength: DEFAULT_CARD_RULES.era,
    },
    preview: {
      setType: detectedSet.setType,
      regionName: detectedSet.regionName,
      cardsSpent: detectedSet.cardIds.length,
      counterDraftRequired: state.featureFlags.counterDraft,
    },
  }))
}

function createCounterDraftActions(state, seat, domains) {
  const pending = getCurrentCards(state).pendingCounterDraft
  if (!state.featureFlags.counterDraft || !pending || pending.responder !== seat) {
    return []
  }

  const eraFallback =
    DEFAULT_CARD_RULES.eraFallbacks[pending.strength] ??
    DEFAULT_CARD_RULES.eraFallbacks[DEFAULT_CARD_RULES.era]
  const actions = [
    {
      id: counterDraftActionId(state, 'COUNTER_IMMEDIATE'),
      type: 'COUNTER_IMMEDIATE',
      seat,
      label: 'Immediate Counter',
      payload: {
        pendingId: pending.id,
        category: 'Immediate Counter',
      },
      preview: {
        mitigation: pending.strength,
      },
    },
    {
      id: counterDraftActionId(state, 'COUNTER_SEEK_MISSING'),
      type: 'COUNTER_SEEK_MISSING',
      seat,
      label: 'Seek Missing Card',
      payload: {
        pendingId: pending.id,
        category: 'Seek Missing Card',
      },
      preview: {
        cardCountAfter: getCardPlayer(state, seat).hand.length + 1,
        cashableAfterCycle: state.cycle + 1,
      },
    },
    {
      id: counterDraftActionId(state, 'COUNTER_SAFE_FALLBACK', 'gold'),
      type: 'COUNTER_SAFE_FALLBACK',
      seat,
      label: `Safe Fallback: gain ${eraFallback.gold} gold`,
      payload: {
        pendingId: pending.id,
        category: 'Safe Fallback',
        fallback: 'gold',
        amount: eraFallback.gold,
      },
      preview: {
        goldAfter: (state.players[seat].gold ?? 0) + eraFallback.gold,
      },
    },
  ]

  if (state.featureFlags.reinforcements) {
    actions.push({
      id: counterDraftActionId(state, 'COUNTER_SAFE_FALLBACK', 'reinforcements'),
      type: 'COUNTER_SAFE_FALLBACK',
      seat,
      label: `Safe Fallback: gain ${eraFallback.reinforcements} reinforcements`,
      payload: {
        pendingId: pending.id,
        category: 'Safe Fallback',
        fallback: 'reinforcements',
        amount: eraFallback.reinforcements,
      },
      preview: {
        tokensAfter:
          (state.players[seat].reinforcements?.tokens ?? 0) +
          eraFallback.reinforcements,
      },
    })
  }

  const repairTargets = domains
    .filter((domain) => domain.owner === seat)
    .filter((domain) => domain.canRepair)

  for (const domain of repairTargets) {
    actions.push({
      id: counterDraftActionId(
        state,
        'COUNTER_SAFE_FALLBACK',
        `repair-${domain.anchorId}`,
      ),
      type: 'COUNTER_SAFE_FALLBACK',
      seat,
      label: `Safe Fallback: repair ${domain.label}`,
      payload: {
        pendingId: pending.id,
        category: 'Safe Fallback',
        fallback: 'repair',
        anchorId: domain.anchorId,
        amount: eraFallback.repair,
      },
      preview: {
        stabilityAfter: Math.min(
          domain.baseStability,
          domain.stability + eraFallback.repair,
        ),
      },
    })
  }

  return actions
}

export function getLegalActions(state, seat) {
  if (seat !== state.activeSeat) {
    return []
  }

  const domains = deriveDomains(state)

  if (cardsEnabled(state)) {
    const pending = getCurrentCards(state).pendingCounterDraft

    if (pending) {
      return createCounterDraftActions(state, seat, domains)
    }

    const discardActions = createDiscardCardActions(state, seat)

    if (discardActions.length > 0) {
      return discardActions
    }
  }

  const pressureProjection = pressureEnabled(state)
    ? derivePressureProjection(state, domains)
    : null
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
  if (pressureProjection) {
    actions.push(
      ...createPressureAssignmentActions(state, seat, domains, pressureProjection),
    )
    actions.push(...createCounterBribeActions(state, seat, domains))
    actions.push(
      ...createPurgeCorruptionActions(state, seat, domains, pressureProjection),
    )
  }
  if (cardsEnabled(state)) {
    actions.push(...createDraftCardActions(state, seat, domains))
    actions.push(...createCashSetActions(state, seat))
  }

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

function projectCyclePressureState(state, domains) {
  if (!pressureEnabled(state)) return null

  return derivePressureProjection(state, domains)
}

function clearCurrentPressureCycle(pressureState, state, metrics) {
  return {
    ...pressureState,
    assignments: (pressureState.assignments ?? []).filter(
      (assignment) => assignment.createdCycle !== state.cycle,
    ),
    counterBribes: (pressureState.counterBribes ?? []).filter(
      (counterBribe) => counterBribe.createdCycle !== state.cycle,
    ),
    purges: (pressureState.purges ?? []).filter(
      (purge) => purge.createdCycle !== state.cycle,
    ),
    metrics,
    lastResolvedCycle: state.cycle,
  }
}

function updateCulturalMandateWatch(metrics, domains, state) {
  const nextWatch = { ...(metrics?.culturalMandateWatch ?? {}) }

  for (const seat of SEATS) {
    const pressuredEnemyDomains = domains.filter(
      (domain) =>
        domain.status === 'controlled' &&
        domain.owner &&
        domain.owner !== seat &&
        domain.pressure?.pressureOwner === seat &&
        domain.pressure.netPressure > 0,
    )
    const thresholdPressuredEnemyDomains = pressuredEnemyDomains.filter(
      (domain) => domain.pressure.netPressure >= 5,
    )
    const regions = new Set(pressuredEnemyDomains.map((domain) => domain.regionId))

    nextWatch[seat] = {
      pressuredEnemyDomains: pressuredEnemyDomains.length,
      thresholdPressuredEnemyDomains: thresholdPressuredEnemyDomains.length,
      pressuredRegions: regions.size,
      cycle: state.cycle,
    }
  }

  return {
    ...(metrics ?? {}),
    culturalMandateWatch: nextWatch,
  }
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
    !state.featureFlags.decrees &&
    !pressureEnabled(state)
  ) {
    return {
      state,
      events: [],
    }
  }

  const economyRules = resolveEconomyRules()
  const pressureResolutionState = pressureEnabled(state)
    ? {
        ...state,
        cycle: Math.max(1, state.cycle - 1),
      }
    : state
  const baseDomains = deriveDomainsWithoutPressure(state)
  const pressureProjection = projectCyclePressureState(
    pressureResolutionState,
    baseDomains,
  )
  const domains = pressureProjection
    ? baseDomains.map((domain) =>
        enrichDomainPressure(domain, state, pressureProjection),
      )
    : baseDomains
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
    const pressure = domain.pressure ?? createEmptyDomainPressure()
    const pressureEffects = pressure.projectedEffects
    const siphonedIncome = Math.min(domain.income, pressureEffects.siphon ?? 0)
    const retainedDomainIncome = Math.max(0, domain.income - siphonedIncome)
    const totalIncome = retainedDomainIncome + decreeIncome

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
          {
            ...detail,
            income: totalIncome,
            domainIncome: retainedDomainIncome,
            decreeIncome,
          },
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

    if (siphonedIncome > 0 && pressure.pressureOwner) {
      nextPlayers[pressure.pressureOwner] = {
        ...nextPlayers[pressure.pressureOwner],
        gold: (nextPlayers[pressure.pressureOwner].gold ?? 0) + siphonedIncome,
      }
      events.push(
        createEconomyCycleEvent(
          state,
          'PRESSURE_SIPHON',
          pressure.pressureOwner,
          `${SEAT_LABELS[pressure.pressureOwner]} siphoned ${siphonedIncome} gold from ${domain.label}.`,
          {
            ...detail,
            pressureOwner: pressure.pressureOwner,
            siphonedIncome,
            netPressure: pressure.netPressure,
            threshold: pressureEffects.threshold,
          },
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

    const stabilityDamage = pressureEffects.stabilityDamage ?? 0
    const passiveRepair = pressureEffects.passiveRepair ?? 0
    const nextStability = state.featureFlags.stability
      ? Math.min(
          domain.baseStability,
          Math.max(
            0,
            domain.stability -
              economyRules.repairAmount -
              stabilityDamage +
              passiveRepair,
          ),
        )
      : domain.stability

    nextDomainState[domain.anchorId] = {
      stability: nextStability,
      lastOwner: domain.owner,
      decrees: projectPersistedDecrees(resolved.decrees),
    }

    if (stabilityDamage > 0) {
      events.push(
        createEconomyCycleEvent(
          state,
          'PRESSURE_STABILITY_DAMAGE',
          pressure.pressureOwner,
          `${domain.label} lost ${stabilityDamage} stability to pressure.`,
          {
            ...detail,
            pressureOwner: pressure.pressureOwner,
            stabilityDamage,
            netPressure: pressure.netPressure,
          },
        ),
      )
    }

    if (passiveRepair > 0) {
      events.push(
        createEconomyCycleEvent(
          state,
          'PRESSURE_SUPPORT_REPAIR',
          domain.owner,
          `${domain.label} restored ${passiveRepair} stability from friendly support.`,
          {
            ...detail,
            passiveRepair,
            friendlySupport: pressure.friendlySupport,
            netPressure: pressure.netPressure,
          },
        ),
      )
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
      pressure: pressureEnabled(state)
        ? clearCurrentPressureCycle(
            getCurrentPressure(state),
            pressureResolutionState,
            updateCulturalMandateWatch(
              pressureProjection?.metrics,
              domains,
              pressureResolutionState,
            ),
          )
        : state.pressure,
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

function pressureActionId(state, type, sourceId, targetAnchorId) {
  return `turn-${state.turn}-${state.activeSeat}-${type.toLowerCase()}-${sourceId}-${targetAnchorId}`
}

function counterBribeActionId(state, targetAnchorId) {
  return `turn-${state.turn}-${state.activeSeat}-counter-bribe-${targetAnchorId}`
}

function purgeCorruptionActionId(state, sourceId, targetAnchorId) {
  return `turn-${state.turn}-${state.activeSeat}-purge-corruption-${sourceId}-${targetAnchorId}`
}

function createBuyDecreeActions(state, seat, domains) {
  if (!state.featureFlags.decrees || seat !== state.activeSeat) return []

  const player = state.players[seat]
  const rules = resolveDecreeRules(state)
  const decreeTypes = [
    DECREE_TYPES.TAX_OFFICE,
    ...(state.featureFlags.corruption ? [DECREE_TYPES.BRIBE_NETWORK] : []),
  ]
  const actions = []

  for (const domain of domains
    .filter((domain) => domain.owner === seat)
    .filter((domain) => domain.economyStatus === 'active')
    .filter((domain) => domain.decreeSlotsUsed < domain.decreeSlots)) {
    for (const decreeType of decreeTypes) {
      const cost = getDecreePurchaseCost(decreeType, 1)

      if (player.gold < cost) continue

      actions.push({
        id:
          decreeType === DECREE_TYPES.TAX_OFFICE
            ? buyDecreeActionId(state, domain.anchorId)
            : `${buyDecreeActionId(state, domain.anchorId)}-bribe-network`,
      type: 'BUY_DECREE',
      seat,
        label: `Buy ${decreeType} on ${domain.label}`,
      payload: {
        anchorId: domain.anchorId,
          decreeType,
        level: 1,
        cost,
      },
      preview: {
        decreesAfter: domain.decreeSlotsUsed + 1,
          decreeIncomeAfter:
            domain.decreeIncome +
            (decreeType === DECREE_TYPES.TAX_OFFICE
              ? rules.decreeIncomeByLevel[1] ?? 0
              : 0),
          corruptionAfter:
            decreeType === DECREE_TYPES.BRIBE_NETWORK
              ? DEFAULT_BRIBE_NETWORK_RULES.corruptionByLevel[1]
              : 0,
      },
      })
    }
  }

  return actions
}

function createUpgradeDecreeActions(state, seat, domains) {
  if (!state.featureFlags.decrees || seat !== state.activeSeat) return []

  const player = state.players[seat]
  const actions = []

  for (const domain of domains.filter((candidate) => candidate.owner === seat)) {
    for (const decree of domain.decrees ?? []) {
      if (decree.ruined || decree.active === false || decree.level >= 3) {
        continue
      }

      const cost = getDecreeUpgradeCost(decree.type, decree.level)

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
          decreeType: decree.type,
          level: decree.level,
          cost,
        },
        preview: {
          levelAfter: decree.level + 1,
          cost,
          corruptionAfter:
            decree.type === DECREE_TYPES.BRIBE_NETWORK
              ? DEFAULT_BRIBE_NETWORK_RULES.corruptionByLevel[decree.level + 1]
              : 0,
        },
      })
    }
  }

  return actions
}

function createPressureAssignmentActions(state, seat, domains, pressureProjection) {
  if (!pressureEnabled(state) || seat !== state.activeSeat) return []

  const domainsById = new Map(domains.map((domain) => [domain.anchorId, domain]))
  const purgedSourceIds = new Set(
    getCyclePressureEntries(getCurrentPressure(state).purges, state).map(
      (purge) => purge.sourceId,
    ),
  )
  const actions = []

  for (const source of pressureProjection.sources.filter(
    (candidate) =>
      candidate.seat === seat && !purgedSourceIds.has(candidate.id),
  )) {
    const sourceDomain = domainsById.get(source.anchorId)

    for (const targetDomain of domains) {
      if (
        source.kind === 'influence' &&
        canSourcePressureTarget(state, source, sourceDomain, targetDomain)
      ) {
        actions.push({
          id: pressureActionId(
            state,
            'ASSIGN_INFLUENCE_PRESSURE',
            source.id,
            targetDomain.anchorId,
          ),
          type: 'ASSIGN_INFLUENCE_PRESSURE',
          seat,
          label: `Pressure ${targetDomain.label} from ${source.label}`,
          payload: {
            sourceId: source.id,
            sourceAnchorId: source.anchorId,
            targetAnchorId: targetDomain.anchorId,
            strength: source.strength,
          },
          preview: {
            incomingInfluenceAfter:
              (targetDomain.pressure?.incomingInfluence ?? 0) + source.strength,
          },
        })
      }

      if (source.kind === 'influence' && canSourceSupportTarget(source, targetDomain)) {
        actions.push({
          id: pressureActionId(
            state,
            'ASSIGN_INFLUENCE_SUPPORT',
            source.id,
            targetDomain.anchorId,
          ),
          type: 'ASSIGN_INFLUENCE_SUPPORT',
          seat,
          label: `Support ${targetDomain.label} from ${source.label}`,
          payload: {
            sourceId: source.id,
            sourceAnchorId: source.anchorId,
            targetAnchorId: targetDomain.anchorId,
            strength: source.strength,
          },
          preview: {
            friendlySupportAfter:
              (targetDomain.pressure?.friendlySupport ?? 0) + source.strength,
          },
        })
      }

      if (
        source.kind === 'corruption' &&
        canSourcePressureTarget(state, source, sourceDomain, targetDomain)
      ) {
        actions.push({
          id: pressureActionId(
            state,
            'TARGET_BRIBE_NETWORK',
            source.id,
            targetDomain.anchorId,
          ),
          type: 'TARGET_BRIBE_NETWORK',
          seat,
          label: `Target ${targetDomain.label} with ${source.label}`,
          payload: {
            sourceId: source.id,
            sourceAnchorId: source.anchorId,
            targetAnchorId: targetDomain.anchorId,
            strength: source.strength,
          },
          preview: {
            incomingCorruptionAfter:
              (targetDomain.pressure?.incomingCorruption ?? 0) + source.strength,
            siphonBonus: source.siphonBonus,
          },
        })
      }
    }
  }

  return actions
}

function createCounterBribeActions(state, seat, domains) {
  if (!state.featureFlags.corruption || seat !== state.activeSeat) return []

  const player = state.players[seat]
  const cost = DEFAULT_PRESSURE_RULES.counterBribeCost

  if ((player.gold ?? 0) < cost) return []

  return domains
    .filter((domain) => {
      const pressure = domain.pressure
      return (
        pressure &&
        pressure.incomingCorruption > pressure.defensiveReduction
      )
    })
    .map((domain) => ({
      id: counterBribeActionId(state, domain.anchorId),
      type: 'SPEND_COUNTER_BRIBE',
      seat,
      label: `Counter-bribe against ${domain.label}`,
      payload: {
        targetAnchorId: domain.anchorId,
        cost,
        reduction: DEFAULT_PRESSURE_RULES.counterBribeReduction,
      },
      preview: {
        effectiveCorruptionAfter: Math.max(
          0,
          domain.pressure.effectiveCorruption -
            DEFAULT_PRESSURE_RULES.counterBribeReduction,
        ),
      },
    }))
}

function createPurgeCorruptionActions(state, seat, domains, pressureProjection) {
  if (!state.featureFlags.corruption || seat !== state.activeSeat) return []

  const existingSourceIds = new Set(
    [
      ...getCyclePressureEntries(
        getCurrentPressure(state).assignments,
        state,
      ).map((assignment) => assignment.sourceId),
      ...getCyclePressureEntries(getCurrentPressure(state).purges, state).map(
        (purge) => purge.sourceId,
      ),
    ],
  )
  const sources = pressureProjection.sources.filter(
    (source) =>
      source.kind === 'influence' &&
      source.seat === seat &&
      !existingSourceIds.has(source.id),
  )

  return sources.flatMap((source) =>
    domains
      .filter((domain) => isSupportTargetForSeat(domain, seat))
      .filter((domain) => domain.regionId === source.regionId)
      .filter((domain) => (domain.pressure?.incomingCorruption ?? 0) > 0)
      .map((domain) => ({
        id: purgeCorruptionActionId(state, source.id, domain.anchorId),
        type: 'PURGE_CORRUPTION',
        seat,
        label: `Purge corruption in ${domain.label}`,
        payload: {
          sourceId: source.id,
          sourceAnchorId: source.anchorId,
          targetAnchorId: domain.anchorId,
          reduction: DEFAULT_PRESSURE_RULES.purgeReduction,
        },
        preview: {
          effectiveCorruptionAfter: Math.max(
            0,
            domain.pressure.effectiveCorruption -
              DEFAULT_PRESSURE_RULES.purgeReduction,
          ),
        },
      })),
  )
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

function upsertPressureAssignment(assignments, nextAssignment) {
  const withoutSameSource = getCyclePressureEntries(assignments, {
    cycle: nextAssignment.createdCycle,
  }).some(
    (assignment) =>
      assignment.sourceId === nextAssignment.sourceId &&
      assignment.seat === nextAssignment.seat,
  )
    ? assignments.filter(
        (assignment) =>
          !(
            assignment.createdCycle === nextAssignment.createdCycle &&
            assignment.sourceId === nextAssignment.sourceId &&
            assignment.seat === nextAssignment.seat
          ),
      )
    : assignments

  return [...withoutSameSource, nextAssignment]
}

function applyPressureAssignmentAction(state, seat, legalAction) {
  const nextAssignment = {
    type: legalAction.type,
    seat,
    sourceId: legalAction.payload.sourceId,
    sourceAnchorId: legalAction.payload.sourceAnchorId,
    targetAnchorId: legalAction.payload.targetAnchorId,
    createdCycle: state.cycle,
  }
  const pressureState = getCurrentPressure(state)
  const event = createEvent(
    state,
    legalAction.type,
    seat,
    `${SEAT_LABELS[seat]} assigned ${legalAction.label.toLowerCase()}.`,
    {
      sourceId: nextAssignment.sourceId,
      sourceAnchorId: nextAssignment.sourceAnchorId,
      targetAnchorId: nextAssignment.targetAnchorId,
    },
  )

  return {
    accepted: true,
    reason: null,
    message: 'Pressure assignment updated.',
    action: legalAction,
    state: {
      ...state,
      pressure: {
        ...pressureState,
        assignments: upsertPressureAssignment(
          pressureState.assignments,
          nextAssignment,
        ),
      },
      requestCounter: state.requestCounter + 1,
      eventLog: [event, ...state.eventLog].slice(0, 36),
    },
  }
}

function applyCounterBribeAction(state, seat, legalAction) {
  const player = state.players[seat]
  const cost = legalAction.payload.cost

  if ((player.gold ?? 0) < cost) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'Not enough gold to spend a counter-bribe.',
      state,
    }
  }

  const pressureState = getCurrentPressure(state)
  const counterBribe = {
    type: 'SPEND_COUNTER_BRIBE',
    seat,
    sourceId: null,
    targetAnchorId: legalAction.payload.targetAnchorId,
    reduction: legalAction.payload.reduction,
    cost,
    createdCycle: state.cycle,
  }
  const event = createEvent(
    state,
    'SPEND_COUNTER_BRIBE',
    seat,
    `${SEAT_LABELS[seat]} spent ${cost} gold to reduce corruption on ${domainLabel(state, legalAction.payload.targetAnchorId)}.`,
    {
      targetAnchorId: legalAction.payload.targetAnchorId,
      cost,
      reduction: legalAction.payload.reduction,
    },
  )

  return {
    accepted: true,
    reason: null,
    message: 'Counter-bribe spent.',
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
      pressure: {
        ...pressureState,
        counterBribes: [...pressureState.counterBribes, counterBribe],
      },
      requestCounter: state.requestCounter + 1,
      eventLog: [event, ...state.eventLog].slice(0, 36),
    },
  }
}

function applyPurgeCorruptionAction(state, seat, legalAction) {
  const pressureState = getCurrentPressure(state)
  const purge = {
    type: 'PURGE_CORRUPTION',
    seat,
    sourceId: legalAction.payload.sourceId,
    targetAnchorId: legalAction.payload.targetAnchorId,
    reduction: legalAction.payload.reduction,
    cost: 0,
    createdCycle: state.cycle,
  }
  const event = createEvent(
    state,
    'PURGE_CORRUPTION',
    seat,
    `${SEAT_LABELS[seat]} purged corruption from ${domainLabel(state, legalAction.payload.targetAnchorId)}.`,
    {
      sourceId: legalAction.payload.sourceId,
      sourceAnchorId: legalAction.payload.sourceAnchorId,
      targetAnchorId: legalAction.payload.targetAnchorId,
      reduction: legalAction.payload.reduction,
    },
  )

  return {
    accepted: true,
    reason: null,
    message: 'Corruption purged.',
    action: legalAction,
    state: {
      ...state,
      pressure: {
        ...pressureState,
        purges: [...pressureState.purges, purge],
      },
      requestCounter: state.requestCounter + 1,
      eventLog: [event, ...state.eventLog].slice(0, 36),
    },
  }
}

function updateCardPlayer(cards, seat, updater) {
  return {
    ...cards,
    players: {
      ...cards.players,
      [seat]: updater(cards.players[seat]),
    },
  }
}

function withDiscardPhaseIfNeeded(state, cards, seat, fallbackReturnSeat = null) {
  const needsDiscard = cards.players[seat].hand.length > cards.handLimit

  return {
    ...state,
    phase: needsDiscard ? 'DISCARD_PHASE' : 'BOARD_PHASE',
    activeSeat: needsDiscard ? seat : fallbackReturnSeat ?? state.activeSeat,
    cards: {
      ...cards,
      discardReturnSeat: needsDiscard ? fallbackReturnSeat ?? state.activeSeat : null,
    },
  }
}

function applyDraftCardAction(state, seat, legalAction) {
  const cards = getCurrentCards(state)
  const playerCards = getCardPlayer(state, seat)

  if (playerCards.lastDraftCycle === state.cycle) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'This seat already drafted during the current cycle.',
      state,
    }
  }

  if (legalAction.payload.fallback === 'gold') {
    const gold = legalAction.payload.gold ?? DEFAULT_CARD_RULES.fallbackGold
    const event = createEvent(
      state,
      'DRAFT_CARD_FALLBACK',
      seat,
      `${SEAT_LABELS[seat]} had no controlled regions and took provisional gold.`,
      {
        cardCountAfter: playerCards.hand.length,
      },
    )

    return {
      accepted: true,
      reason: null,
      message: 'Draft fallback accepted.',
      action: legalAction,
      state: {
        ...state,
        players: {
          ...state.players,
          [seat]: {
            ...state.players[seat],
            gold: (state.players[seat].gold ?? 0) + gold,
          },
        },
        cards: updateCardPlayer(cards, seat, (current) => ({
          ...current,
          lastDraftCycle: state.cycle,
        })),
        requestCounter: state.requestCounter + 1,
        eventLog: [event, ...state.eventLog].slice(0, 36),
      },
    }
  }

  const card = createCardFromRegion(
    state,
    seat,
    legalAction.payload.regionId,
    'draft',
  )
  const nextCards = updateCardPlayer(cards, seat, (current) => ({
    ...current,
    hand: [...current.hand, card],
    lastDraftCycle: state.cycle,
  }))
  const event = createEvent(
    state,
    'DRAFT_CARD',
    seat,
    `${SEAT_LABELS[seat]} drafted 1 hidden region card.`,
    {
      cardCountAfter: nextCards.players[seat].hand.length,
    },
  )
  const nextState = withDiscardPhaseIfNeeded(
    {
      ...state,
      requestCounter: state.requestCounter + 1,
      eventLog: [event, ...state.eventLog].slice(0, 36),
    },
    nextCards,
    seat,
    state.activeSeat,
  )

  return {
    accepted: true,
    reason: null,
    message: 'Card drafted.',
    action: legalAction,
    state: nextState,
  }
}

function applyDiscardCardAction(state, seat, legalAction) {
  const cards = getCurrentCards(state)
  const playerCards = getCardPlayer(state, seat)
  const discarded = playerCards.hand.find(
    (card) => card.id === legalAction.payload.cardId,
  )

  if (!discarded || playerCards.hand.length <= cards.handLimit) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'That card cannot be discarded now.',
      state,
    }
  }

  const nextCards = updateCardPlayer(cards, seat, (current) => ({
    ...current,
    hand: current.hand.filter((card) => card.id !== discarded.id),
  }))
  const stillOverLimit = nextCards.players[seat].hand.length > nextCards.handLimit
  const returnSeat = cards.discardReturnSeat ?? seat
  const event = createEvent(
    state,
    'DISCARD_CARD',
    seat,
    `${SEAT_LABELS[seat]} discarded 1 hidden card to meet the hand limit.`,
    {
      cardCountAfter: nextCards.players[seat].hand.length,
      handLimit: nextCards.handLimit,
    },
  )

  return {
    accepted: true,
    reason: null,
    message: 'Card discarded.',
    action: legalAction,
    state: {
      ...state,
      activeSeat: stillOverLimit ? seat : returnSeat,
      phase: stillOverLimit ? 'DISCARD_PHASE' : 'BOARD_PHASE',
      cards: {
        ...nextCards,
        discardReturnSeat: stillOverLimit ? returnSeat : null,
      },
      requestCounter: state.requestCounter + 1,
      eventLog: [event, ...state.eventLog].slice(0, 36),
    },
  }
}

function applyCashSetAction(state, seat, legalAction) {
  const cards = getCurrentCards(state)
  const playerCards = getCardPlayer(state, seat)
  const detectedSet = detectCompletedCardSets(playerCards.hand, state.cycle).find(
    (candidate) => candidate.id === legalAction.payload.setId,
  )

  if (!detectedSet || playerCards.majorSetCashedCycle === state.cycle) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'That set cannot be cashed now.',
      state,
    }
  }

  const responder = getOpponent(seat)
  const publicSetId = `revealed-set-${state.cycle}-${state.turn}-${state.requestCounter}-${seat}`
  const revealedSet = {
    id: publicSetId,
    owner: seat,
    setType: detectedSet.setType,
    regionId: detectedSet.regionId,
    cycle: state.cycle,
    strength: legalAction.payload.strength ?? DEFAULT_CARD_RULES.era,
    counterDraftChoice: null,
  }
  const pendingCounterDraft = state.featureFlags.counterDraft
    ? {
        id: `counter-${state.cycle}-${state.turn}-${state.requestCounter}-${seat}`,
        setId: revealedSet.id,
        setOwner: seat,
        responder,
        setType: revealedSet.setType,
        regionId: revealedSet.regionId,
        strength: revealedSet.strength,
        createdCycle: state.cycle,
      }
    : null
  const nextCards = updateCardPlayer(cards, seat, (current) => ({
    ...current,
    hand: current.hand.filter(
      (card) => !detectedSet.cardIds.includes(card.id),
    ),
    revealedSets: [...current.revealedSets, revealedSet],
    majorSetCashedCycle: state.cycle,
  }))
  const event = createEvent(
    state,
    'CASH_SET',
    seat,
    pendingCounterDraft
      ? `${SEAT_LABELS[seat]} cashed a ${detectedSet.label}; ${SEAT_LABELS[responder]} must choose a counter-draft.`
      : `${SEAT_LABELS[seat]} cashed a ${detectedSet.label}.`,
    {
      setId: revealedSet.id,
      setType: revealedSet.setType,
      regionId: revealedSet.regionId,
      strength: revealedSet.strength,
      counterDraftRequired: Boolean(pendingCounterDraft),
    },
  )

  return {
    accepted: true,
    reason: null,
    message: pendingCounterDraft ? 'Set cashed; counter-draft pending.' : 'Set cashed.',
    action: legalAction,
    state: {
      ...state,
      activeSeat: pendingCounterDraft ? responder : state.activeSeat,
      phase: pendingCounterDraft ? 'COUNTER_DRAFT' : state.phase,
      cards: {
        ...nextCards,
        pendingCounterDraft,
      },
      requestCounter: state.requestCounter + 1,
      eventLog: [event, ...state.eventLog].slice(0, 36),
    },
  }
}

function incrementCardMetric(metrics, bucket, seat, key) {
  return {
    ...metrics,
    [bucket]: {
      ...(metrics[bucket] ?? {}),
      [seat]: {
        ...(metrics[bucket]?.[seat] ?? {}),
        [key]: (metrics[bucket]?.[seat]?.[key] ?? 0) + 1,
      },
    },
  }
}

function updateRevealedSetCounterChoice(cards, pending, choice) {
  return updateCardPlayer(cards, pending.setOwner, (current) => ({
    ...current,
    revealedSets: current.revealedSets.map((set) =>
      set.id === pending.setId
        ? {
            ...set,
            counterDraftChoice: choice,
          }
        : set,
    ),
  }))
}

function applySafeFallbackReward(state, seat, legalAction) {
  const fallback = legalAction.payload.fallback
  const amount = legalAction.payload.amount ?? 0
  const nextPlayers = { ...state.players }
  const nextDomains = { ...(state.domains ?? {}) }

  if (fallback === 'gold') {
    nextPlayers[seat] = {
      ...nextPlayers[seat],
      gold: (nextPlayers[seat].gold ?? 0) + amount,
    }
  }

  if (fallback === 'reinforcements' && nextPlayers[seat].reinforcements) {
    const resource = nextPlayers[seat].reinforcements
    nextPlayers[seat] = {
      ...nextPlayers[seat],
      reinforcements: {
        ...resource,
        tokens: Math.min(resource.reserveCap, resource.tokens + amount),
      },
    }
  }

  if (fallback === 'repair') {
    const domain = deriveDomains(state).find(
      (candidate) => candidate.anchorId === legalAction.payload.anchorId,
    )

    if (domain && domain.owner === seat && domain.baseStability !== undefined) {
      nextDomains[domain.anchorId] = {
        ...(nextDomains[domain.anchorId] ?? {}),
        stability: Math.min(domain.baseStability, domain.stability + amount),
        lastOwner: seat,
      }
    }
  }

  return {
    players: nextPlayers,
    domains: nextDomains,
  }
}

function applyCounterDraftAction(state, seat, legalAction) {
  const cards = getCurrentCards(state)
  const pending = cards.pendingCounterDraft

  if (
    !pending ||
    pending.responder !== seat ||
    legalAction.payload.pendingId !== pending.id
  ) {
    return {
      accepted: false,
      reason: 'ILLEGAL_ACTION',
      message: 'No counter-draft is pending for this seat.',
      state,
    }
  }

  const choice = legalAction.type
  let nextCards = updateRevealedSetCounterChoice(cards, pending, choice)
  let nextPlayers = state.players
  let nextDomains = state.domains

  if (choice === 'COUNTER_SEEK_MISSING') {
    const rewardRegionId = chooseSeekMissingRegion(state, seat)
    const rewardCard = createCardFromRegion(
      state,
      seat,
      rewardRegionId,
      'counter-seek',
      getCardPlayer(state, seat).hand.length,
      {
        cashableAfterCycle: state.cycle + 1,
      },
    )

    nextCards = updateCardPlayer(nextCards, seat, (current) => ({
      ...current,
      hand: [...current.hand, rewardCard],
    }))
    nextCards = {
      ...nextCards,
      metrics: incrementCardMetric(
        nextCards.metrics,
        'seekMissingChoices',
        seat,
        'total',
      ),
    }
  }

  if (choice === 'COUNTER_SAFE_FALLBACK') {
    const reward = applySafeFallbackReward(state, seat, legalAction)
    nextPlayers = reward.players
    nextDomains = reward.domains
  }

  nextCards = {
    ...nextCards,
    pendingCounterDraft: null,
    metrics: incrementCardMetric(
      nextCards.metrics,
      'counterDraftChoices',
      seat,
      choice,
    ),
  }

  const event = createEvent(
    state,
    choice,
    seat,
    `${SEAT_LABELS[seat]} chose ${legalAction.payload.category} for the counter-draft.`,
    {
      setId: pending.setId,
      choice,
    },
  )
  const baseState = {
    ...state,
    players: nextPlayers,
    domains: nextDomains,
    activeSeat: pending.setOwner,
    phase: 'BOARD_PHASE',
    requestCounter: state.requestCounter + 1,
    eventLog: [event, ...state.eventLog].slice(0, 36),
  }
  const nextState = withDiscardPhaseIfNeeded(
    baseState,
    nextCards,
    seat,
    pending.setOwner,
  )

  return {
    accepted: true,
    reason: null,
    message: 'Counter-draft resolved.',
    action: legalAction,
    state: nextState,
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

  if (
    legalAction.type === 'ASSIGN_INFLUENCE_PRESSURE' ||
    legalAction.type === 'ASSIGN_INFLUENCE_SUPPORT' ||
    legalAction.type === 'TARGET_BRIBE_NETWORK'
  ) {
    return applyPressureAssignmentAction(state, seat, legalAction)
  }

  if (legalAction.type === 'SPEND_COUNTER_BRIBE') {
    return applyCounterBribeAction(state, seat, legalAction)
  }

  if (legalAction.type === 'PURGE_CORRUPTION') {
    return applyPurgeCorruptionAction(state, seat, legalAction)
  }

  if (legalAction.type === 'DRAFT_CARD') {
    return applyDraftCardAction(state, seat, legalAction)
  }

  if (legalAction.type === 'DISCARD_CARD') {
    return applyDiscardCardAction(state, seat, legalAction)
  }

  if (legalAction.type === 'CASH_SET') {
    return applyCashSetAction(state, seat, legalAction)
  }

  if (
    legalAction.type === 'COUNTER_IMMEDIATE' ||
    legalAction.type === 'COUNTER_SEEK_MISSING' ||
    legalAction.type === 'COUNTER_SAFE_FALLBACK'
  ) {
    return applyCounterDraftAction(state, seat, legalAction)
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

function deriveDomainsWithoutPressure(state) {
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

export function deriveDomains(state) {
  const domains = deriveDomainsWithoutPressure(state)

  if (!pressureEnabled(state)) {
    return domains
  }

  const pressureProjection = derivePressureProjection(state, domains)

  return domains.map((domain) =>
    enrichDomainPressure(domain, state, pressureProjection),
  )
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

function projectPublicPlayers(state) {
  const players = projectPlayers(state.players)

  if (!cardsEnabled(state)) return players

  for (const seat of SEATS) {
    const cardPlayer = getCardPlayer(state, seat)
    players[seat] = {
      ...players[seat],
      cardCount: cardPlayer.hand.length,
      completedSetCountVisibleIfRevealed: cardPlayer.revealedSets.length,
    }
  }

  return players
}

function projectPressureState(state) {
  if (!pressureEnabled(state)) return null

  const pressureProjection = derivePressureProjection(state)

  return {
    assignments: pressureProjection.assignments,
    counterBribes: pressureProjection.counterBribes,
    purges: pressureProjection.purges,
    sources: pressureProjection.sources,
    metrics: pressureProjection.metrics,
    lastResolvedCycle: pressureProjection.lastResolvedCycle,
  }
}

function projectRevealedSet(set) {
  return {
    id: set.id,
    owner: set.owner,
    setType: set.setType,
    regionId: set.regionId,
    cycle: set.cycle,
    strength: set.strength,
    counterDraftChoice: set.counterDraftChoice,
  }
}

function projectPublicCardState(state) {
  if (!cardsEnabled(state)) return null

  const cards = getCurrentCards(state)
  const pending = cards.pendingCounterDraft

  return {
    handLimit: cards.handLimit,
    players: Object.fromEntries(
      SEATS.map((seat) => {
        const playerCards = getCardPlayer(state, seat)

        return [
          seat,
          {
            cardCount: playerCards.hand.length,
            completedSetCountVisibleIfRevealed: playerCards.revealedSets.length,
            revealedSets: playerCards.revealedSets.map(projectRevealedSet),
          },
        ]
      }),
    ),
    pendingCounterDraft: pending
      ? {
          id: pending.id,
          setOwner: pending.setOwner,
          responder: pending.responder,
          setType: pending.setType,
          regionId: pending.regionId,
          strength: pending.strength,
          createdCycle: pending.createdCycle,
        }
      : null,
    metrics: cards.metrics,
  }
}

function projectPrivateCardState(state, seat) {
  if (!cardsEnabled(state)) return null

  const cards = getCurrentCards(state)
  const playerCards = getCardPlayer(state, seat)

  return {
    handLimit: cards.handLimit,
    hand: playerCards.hand.map((card) => ({ ...card })),
    completedSets: detectCompletedCardSets(playerCards.hand, state.cycle).map(
      (set) => ({
        ...set,
        cards: set.cards.map((card) => ({ ...card })),
        cardIds: [...set.cardIds],
      }),
    ),
    revealedSets: playerCards.revealedSets.map(projectRevealedSet),
    lastDraftCycle: playerCards.lastDraftCycle,
    majorSetCashedCycle: playerCards.majorSetCashedCycle,
    mustDiscard: playerCards.hand.length > cards.handLimit,
  }
}

function projectLastMove(lastMove) {
  if (!lastMove) return null

  return {
    ...lastMove,
    capturedIds: lastMove.capturedIds ? [...lastMove.capturedIds] : undefined,
  }
}

function projectEvent(event) {
  return {
    ...event,
    detail: event.detail ? { ...event.detail } : {},
    public: event.public ?? true,
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
    players: projectPublicPlayers(state),
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
    pressure: projectPressureState(state),
    cards: projectPublicCardState(state),
    eventLog: state.eventLog.map(projectEvent),
  }
}

export function getSeatState(state, seat) {
  return {
    seat,
    isActive: seat === state.activeSeat,
    hiddenInformation: cardsEnabled(state)
      ? 'Region card hands are seat-scoped. Opponent hands are redacted to public counts.'
      : 'MVP has no hidden hand. Future card state is seat-scoped.',
    cards: projectPrivateCardState(state, seat),
  }
}

export function createRequestId(state, seat = state.activeSeat) {
  return `${state.matchId}:turn-${state.turn}:request-${state.requestCounter}:${seat}`
}

function createExplanationHints(state) {
  const hints = {}

  if (pressureEnabled(state)) {
    hints.pressure =
      'Pressure assignments are public after reveal. Net pressure can siphon Domain income and damage stability at cycle resolution.'
    hints.corruption =
      'Corruption is pressure from Bribe Networks and can be reduced by counter-bribes or purge actions before cycle resolution.'
  }

  if (cardsEnabled(state)) {
    hints.cards =
      'Exact card hands are private to the requesting seat. Public state exposes card counts, revealed sets, and counter-draft categories only.'
  }

  return hints
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
    explanationHints: createExplanationHints(state),
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

  if (!expectedToken || submission.token !== expectedToken) {
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
  const pressureActions = agentRequest.legalActions.filter((action) =>
    [
      'ASSIGN_INFLUENCE_PRESSURE',
      'ASSIGN_INFLUENCE_SUPPORT',
      'TARGET_BRIBE_NETWORK',
      'SPEND_COUNTER_BRIBE',
      'PURGE_CORRUPTION',
    ].includes(action.type),
  )
  const cardActions = agentRequest.legalActions.filter((action) =>
    [
      'DRAFT_CARD',
      'DISCARD_CARD',
      'CASH_SET',
      'COUNTER_IMMEDIATE',
      'COUNTER_SEEK_MISSING',
      'COUNTER_SAFE_FALLBACK',
    ].includes(action.type),
  )

  if (
    placements.length === 0 &&
    repairs.length === 0 &&
    economyActions.length === 0 &&
    pressureActions.length === 0 &&
    cardActions.length === 0
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
        BUY_DECREE:
          30 +
          (action.preview.decreeIncomeAfter ?? 0) +
          (action.preview.corruptionAfter ?? 0),
        UPGRADE_DECREE:
          26 +
          (action.preview.levelAfter ?? 1) * 4 +
          (action.preview.corruptionAfter ?? 0),
        SCRAP_RUINED_DECREE: 20 + (action.preview.goldGain ?? 0) * 3,
      }

      return {
        action,
        score: scoreByType[action.type] ?? 0,
      }
    }),
    ...pressureActions.map((action) => {
      const scoreByType = {
        TARGET_BRIBE_NETWORK:
          44 + (action.preview.incomingCorruptionAfter ?? 0) * 3,
        ASSIGN_INFLUENCE_PRESSURE:
          40 + (action.preview.incomingInfluenceAfter ?? 0) * 2,
        ASSIGN_INFLUENCE_SUPPORT:
          34 + (action.preview.friendlySupportAfter ?? 0) * 2,
        PURGE_CORRUPTION: 38,
        SPEND_COUNTER_BRIBE: 24,
      }

      return {
        action,
        score: scoreByType[action.type] ?? 0,
      }
    }),
    ...cardActions.map((action) => {
      const scoreByType = {
        DISCARD_CARD: 90,
        COUNTER_IMMEDIATE: 78,
        COUNTER_SAFE_FALLBACK: 74,
        COUNTER_SEEK_MISSING: 70,
        CASH_SET: 66,
        DRAFT_CARD: action.payload.fallback === 'gold' ? 18 : 42,
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
