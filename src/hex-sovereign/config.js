const assetBase = `${import.meta.env.BASE_URL}hex-sovereign/`

export const assets = {
  board: `${assetBase}board-poc.png`,
  ui: `${assetBase}ui-component-sheet.png`,
  cards: `${assetBase}cards-decrees-sheet.png`,
}

export const demoMatchConfig = {
  matchId: 'hex-sovereign-demo',
  featureFlags: {
    reinforcements: true,
    income: true,
    stability: true,
    decrees: true,
    influence: true,
    corruption: true,
    regionCards: true,
    setCashIns: true,
    counterDraft: true,
    victoryWarnings: true,
    mandates: true,
  },
  initialStones: [
    { q: -1, r: 2, seat: 'black' },
    { q: 0, r: 2, seat: 'black' },
    { q: 1, r: -2, seat: 'white' },
    { q: 0, r: -2, seat: 'white' },
    { q: -2, r: 1, seat: 'black' },
    { q: -2, r: 0, seat: 'black' },
    { q: -3, r: 0, seat: 'black' },
    { q: -3, r: 2, seat: 'black' },
    { q: -1, r: 0, seat: 'white' },
    { q: -1, r: 1, seat: 'white' },
  ],
  initialReinforcements: {
    black: 1,
    white: 1,
  },
  initialGold: {
    black: 6,
    white: 6,
  },
  initialDomains: {
    temple: {
      stability: 3,
      lastOwner: 'black',
      decrees: [
        {
          type: 'Bribe Network',
          level: 3,
        },
      ],
    },
    ruins: {
      stability: 2,
      lastOwner: 'white',
    },
  },
  initialCards: {
    black: [
      { regionId: 'temple-coast' },
      { regionId: 'temple-coast' },
      { regionId: 'temple-coast' },
    ],
    white: [
      { regionId: 'ash-marsh' },
      { regionId: 'ash-marsh' },
      { regionId: 'wild' },
    ],
  },
}

export const domainActionTypes = new Set([
  'BUY_DECREE',
  'UPGRADE_DECREE',
  'SCRAP_RUINED_DECREE',
  'CONVERT_RUINED_DECREE',
])

export const economyActionTypes = new Set([...domainActionTypes, 'PAY_UPKEEP'])

export const pressureActionTypes = new Set([
  'ASSIGN_INFLUENCE_PRESSURE',
  'ASSIGN_INFLUENCE_SUPPORT',
  'TARGET_BRIBE_NETWORK',
  'SPEND_COUNTER_BRIBE',
  'PURGE_CORRUPTION',
])

export const cardActionTypes = new Set([
  'DRAFT_CARD',
  'DISCARD_CARD',
  'CASH_SET',
  'COUNTER_IMMEDIATE',
  'COUNTER_SEEK_MISSING',
  'COUNTER_SAFE_FALLBACK',
])

export const seatCopy = {
  black: {
    player: 'Player 1',
    role: 'Black',
  },
  white: {
    player: 'Player 2',
    role: 'White',
  },
}

export const roadmap = [
  'Engine, legal-action protocol, and Browser Agent Mode',
  'Domains, economy, stability, and decrees',
  'Influence, corruption, region cards, and counter-draft',
  'Victory warnings, mandates, stronger bots, and simulations',
  'Deferred bridge and backend options only when product need is clear',
]
