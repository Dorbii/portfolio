import { useCallback, useEffect, useMemo, useState } from 'react'
import { BOT_STRATEGIES, chooseBotAction } from './game/bots'
import {
  REGIONS,
  SEAT_LABELS,
  createAgentRequest,
  createMatch,
  deriveDomains,
  getLegalActions,
  getPublicState,
  submitProtocolAction,
} from './game/engine'

const assetBase = `${import.meta.env.BASE_URL}hex-sovereign/`

const assets = {
  board: `${assetBase}board-poc.png`,
  ui: `${assetBase}ui-component-sheet.png`,
  cards: `${assetBase}cards-decrees-sheet.png`,
}

const demoMatchConfig = {
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

const domainActionTypes = new Set([
  'BUY_DECREE',
  'UPGRADE_DECREE',
  'SCRAP_RUINED_DECREE',
  'CONVERT_RUINED_DECREE',
])

const economyActionTypes = new Set([...domainActionTypes, 'PAY_UPKEEP'])

const pressureActionTypes = new Set([
  'ASSIGN_INFLUENCE_PRESSURE',
  'ASSIGN_INFLUENCE_SUPPORT',
  'TARGET_BRIBE_NETWORK',
  'SPEND_COUNTER_BRIBE',
  'PURGE_CORRUPTION',
])

const cardActionTypes = new Set([
  'DRAFT_CARD',
  'DISCARD_CARD',
  'CASH_SET',
  'COUNTER_IMMEDIATE',
  'COUNTER_SEEK_MISSING',
  'COUNTER_SAFE_FALLBACK',
])

const seatCopy = {
  black: {
    player: 'Player 1',
    role: 'Black',
  },
  white: {
    player: 'Player 2',
    role: 'White',
  },
}

const roadmap = [
  'MVP engine and legal-action protocol',
  'Domains, economy, stability, and decrees',
  'Region cards, sets, and counter-draft',
  'Influence, corruption, pressure, and warnings',
  'Mandates, stronger bots, and Browser Agent Console polish',
]

function getInitialRoute() {
  return window.location.hash.startsWith('#/hex-sovereign/agent')
    ? 'agent'
    : 'game'
}

function getAgentParams() {
  const [, query = ''] = window.location.hash.split('?')
  const params = new URLSearchParams(query)

  return {
    matchId: params.get('match') ?? 'hex-local',
    seat: params.get('seat') ?? 'white',
    token: params.get('token') ?? '',
  }
}

function makeSeatTokens() {
  return {
    black: `black-${Math.random().toString(36).slice(2, 8)}`,
    white: `white-${Math.random().toString(36).slice(2, 8)}`,
  }
}

function compactResult(result, source) {
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

function createAgentApiRejection(reason, message) {
  return {
    type: 'AGENT_REQUEST_REJECTED',
    accepted: false,
    reason,
    message,
  }
}

function createInviteUrl(matchId, seat, token) {
  const url = new URL(window.location.href)
  url.hash = `#/hex-sovereign/agent?match=${encodeURIComponent(
    matchId,
  )}&seat=${encodeURIComponent(seat)}&token=${encodeURIComponent(token)}`
  return url.toString()
}

function computeBoardPositions(cells) {
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

function getDomainTone(domain, activeSeat) {
  if (domain.status === 'controlled' && domain.owner === activeSeat) {
    return 'friendly'
  }

  if (domain.status === 'controlled' && domain.owner !== activeSeat) {
    return 'enemy'
  }

  return domain.status
}

function getReinforcementSummary(state, seat) {
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

function App() {
  const [route, setRoute] = useState(getInitialRoute)

  useEffect(() => {
    const handleHashChange = () => setRoute(getInitialRoute())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (route === 'agent') {
    return <AgentConsole />
  }

  return <GameExperience />
}

function GameExperience() {
  const [state, setState] = useState(() =>
    createMatch(demoMatchConfig),
  )
  const [seatModes, setSeatModes] = useState({
    black: 'human',
    white: 'bot',
  })
  const [botStrategies, setBotStrategies] = useState({
    black: 'balanced',
    white: 'simulation',
  })
  const [seatTokens] = useState(makeSeatTokens)
  const [selectedCellId, setSelectedCellId] = useState(null)
  const [protocolTab, setProtocolTab] = useState('request')
  const [lastResult, setLastResult] = useState(null)

  const domains = useMemo(() => deriveDomains(state), [state])
  const activeRequest = useMemo(
    () => createAgentRequest(state, state.activeSeat),
    [state],
  )
  const legalActionByCell = useMemo(() => {
    return new Map(
      activeRequest.legalActions
        .filter((action) => action.type === 'PLACE_STONE')
        .map((action) => [action.payload.cellId, action]),
    )
  }, [activeRequest])
  const reinforcementActionByCell = useMemo(() => {
    return new Map(
      activeRequest.legalActions
        .filter((action) => action.type === 'SPEND_REINFORCEMENT')
        .map((action) => [action.payload.cellId, action]),
    )
  }, [activeRequest])
  const reinforcementActions = useMemo(
    () =>
      activeRequest.legalActions.filter(
        (action) => action.type === 'SPEND_REINFORCEMENT',
      ),
    [activeRequest],
  )
  const repairActions = useMemo(
    () =>
      activeRequest.legalActions.filter(
        (action) => action.type === 'REPAIR_DOMAIN',
      ),
    [activeRequest],
  )
  const decreeActions = useMemo(
    () =>
      activeRequest.legalActions.filter((action) =>
        domainActionTypes.has(action.type),
      ),
    [activeRequest],
  )
  const upkeepActions = useMemo(
    () =>
      activeRequest.legalActions.filter((action) => action.type === 'PAY_UPKEEP'),
    [activeRequest],
  )
  const pressureActions = useMemo(
    () =>
      activeRequest.legalActions.filter((action) =>
        pressureActionTypes.has(action.type),
      ),
    [activeRequest],
  )
  const cardActions = useMemo(
    () =>
      activeRequest.legalActions.filter((action) =>
        cardActionTypes.has(action.type),
      ),
    [activeRequest],
  )
  const boardPositions = useMemo(
    () => computeBoardPositions(state.board.cells),
    [state.board.cells],
  )
  const selectedCell = useMemo(() => {
    return state.board.cells.find((cell) => cell.id === selectedCellId) ?? null
  }, [state.board.cells, selectedCellId])
  const selectedDomain = useMemo(() => {
    if (!selectedCell) return null

    return (
      domains.find((domain) => domain.anchorId === selectedCell.anchorId) ??
      domains.find((domain) => domain.zoneCellIds.includes(selectedCell.id)) ??
      null
    )
  }, [domains, selectedCell])
  const zoneToneByCell = useMemo(() => {
    const zoneMap = new Map()

    for (const domain of domains) {
      const tone = getDomainTone(domain, state.activeSeat)

      for (const cellId of domain.zoneCellIds) {
        if (!zoneMap.has(cellId) || domain.anchorId === selectedDomain?.anchorId) {
          zoneMap.set(cellId, tone)
        }
      }
    }

    return zoneMap
  }, [domains, selectedDomain, state.activeSeat])
  const pressureToneByCell = useMemo(() => {
    const pressureMap = new Map()

    for (const domain of domains) {
      let tone = null

      if ((domain.pressure?.incomingCorruption ?? 0) > 0) {
        tone = 'corrupted'
      } else if ((domain.pressure?.netPressure ?? 0) > 0) {
        tone = 'pressured'
      } else if ((domain.pressure?.friendlySupport ?? 0) > 0) {
        tone = 'supported'
      }

      if (!tone) continue

      for (const cellId of domain.zoneCellIds) {
        pressureMap.set(cellId, tone)
      }
    }

    return pressureMap
  }, [domains])
  const inviteUrls = useMemo(
    () => ({
      black: createInviteUrl(state.matchId, 'black', seatTokens.black),
      white: createInviteUrl(state.matchId, 'white', seatTokens.white),
    }),
    [seatTokens, state.matchId],
  )
  const activeReinforcements = useMemo(
    () => getReinforcementSummary(state, state.activeSeat),
    [state],
  )
  const selectedPlacementAction = selectedCell
    ? legalActionByCell.get(selectedCell.id)
    : null
  const selectedReinforcementAction = selectedCell
    ? reinforcementActionByCell.get(selectedCell.id)
    : null
  const selectedRepairAction = selectedDomain
    ? repairActions.find(
        (action) => action.payload.anchorId === selectedDomain.anchorId,
      )
    : null
  const selectedDecreeActions = selectedDomain
    ? decreeActions.filter(
        (action) => action.payload.anchorId === selectedDomain.anchorId,
      )
    : []
  const selectedPressureActions = selectedDomain
    ? pressureActions.filter(
        (action) =>
          action.payload.targetAnchorId === selectedDomain.anchorId ||
          action.payload.sourceAnchorId === selectedDomain.anchorId,
      )
    : []

  const submitFromProtocol = useCallback(
    (submission, source = 'ui') => {
      const expectedToken = seatTokens[submission.seat]
      const result = submitProtocolAction(state, submission, { expectedToken })
      const compact = compactResult(result, source)

      setLastResult(compact)

      try {
        localStorage.setItem(
          `hex-sovereign:${state.matchId}:latest-response`,
          JSON.stringify(compact, null, 2),
        )
      } catch {
        // Local debug storage is optional in private or locked-down contexts.
      }

      if (result.accepted) {
        setState(result.state)

        if (
          result.action?.type === 'PLACE_STONE' ||
          result.action?.type === 'SPEND_REINFORCEMENT'
        ) {
          setSelectedCellId(result.action.payload.cellId)
        }
      }

      return compact
    },
    [seatTokens, state],
  )

  const submitActiveAction = useCallback(
    (actionId, source = 'ui') => {
      return submitFromProtocol(
        {
          type: 'AGENT_SUBMIT_ACTION',
          requestId: activeRequest.requestId,
          matchId: state.matchId,
          seat: state.activeSeat,
          selectedActionId: actionId,
          token: seatTokens[state.activeSeat],
        },
        source,
      )
    },
    [activeRequest.requestId, seatTokens, state, submitFromProtocol],
  )

  useEffect(() => {
    if (seatModes[state.activeSeat] !== 'bot') return undefined

    const timer = window.setTimeout(() => {
      const selectedActionId = chooseBotAction(activeRequest, {
        strategy: botStrategies[state.activeSeat],
        seed: `${state.matchId}:${state.turn}:${state.activeSeat}`,
      })

      if (selectedActionId) {
        submitActiveAction(selectedActionId, 'bot')
      }
    }, 620)

    return () => window.clearTimeout(timer)
  }, [activeRequest, botStrategies, seatModes, state, submitActiveAction])

  useEffect(() => {
    const latestState = getPublicState(state)

    try {
      localStorage.setItem(
        `hex-sovereign:${state.matchId}:latest-request`,
        JSON.stringify(activeRequest, null, 2),
      )
      localStorage.setItem(
        `hex-sovereign:${state.matchId}:latest-state`,
        JSON.stringify(latestState, null, 2),
      )
    } catch {
      // The in-page API still works when storage is unavailable.
    }

    const verifyReadToken = (seat, token) => {
      if (seatTokens[seat] !== token) {
        return createAgentApiRejection(
          'BAD_TOKEN',
          'Seat token is required to read a seat-scoped agent request.',
        )
      }

      return null
    }

    window.HexSovereignAgent = {
      getRequest: (seat = state.activeSeat, token) =>
        verifyReadToken(seat, token) ?? createAgentRequest(state, seat),
      getLegalActions: (seat = state.activeSeat, token) => {
        const rejection = verifyReadToken(seat, token)

        if (rejection) return rejection

        return getLegalActions(state, seat)
      },
      submitAction: (selectedActionId, seat = state.activeSeat, token) => {
        return submitFromProtocol(
          {
            type: 'AGENT_SUBMIT_ACTION',
            requestId: createAgentRequest(state, seat).requestId,
            matchId: state.matchId,
            seat,
            selectedActionId,
            token,
          },
          'window-api',
        )
      },
    }
  }, [activeRequest, seatTokens, state, submitFromProtocol])

  useEffect(() => {
    if (!('BroadcastChannel' in window)) return undefined

    const channel = new BroadcastChannel(`hex-sovereign:${state.matchId}`)

    const postResult = (result, source) => {
      channel.postMessage(compactResult(result, source))
    }

    const handleMessage = (event) => {
      const message = event.data

      if (!message || message.matchId !== state.matchId) return

      if (
        message.type === 'AGENT_HELLO' ||
        message.type === 'AGENT_REQUEST_STATE'
      ) {
        if (seatTokens[message.seat] !== message.token) {
          channel.postMessage({
            type: 'AGENT_ACTION_RESULT',
            accepted: false,
            reason: 'BAD_TOKEN',
            message: 'Seat token did not match this browser-local invitation.',
          })
          return
        }

        channel.postMessage({
          type: 'AGENT_STATE',
          request: createAgentRequest(state, message.seat),
          activeSeat: state.activeSeat,
        })
      }

      if (message.type === 'AGENT_SUBMIT_ACTION') {
        const result = submitProtocolAction(state, message, {
          expectedToken: seatTokens[message.seat],
        })

        setLastResult(compactResult(result, 'broadcast'))

        if (result.accepted) {
          setState(result.state)
        }

        postResult(result, 'broadcast')
      }
    }

    channel.addEventListener('message', handleMessage)
    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [seatTokens, state])

  const handleCellClick = (cell) => {
    const legalAction = legalActionByCell.get(cell.id)

    if (legalAction && seatModes[state.activeSeat] === 'human') {
      submitActiveAction(legalAction.id, 'board')
      return
    }

    setSelectedCellId(cell.id)
  }

  const resetMatch = () => {
    setState(createMatch(demoMatchConfig))
    setSelectedCellId(null)
    setLastResult(null)
  }

  const selectReinforcementTarget = (cellId) => {
    if (!cellId) return
    setSelectedCellId(cellId)
  }

  const controlledDomains = domains.filter((domain) => domain.owner)
  const passAction = activeRequest.legalActions.find(
    (action) => action.type === 'PASS',
  )
  const surrenderAction = activeRequest.legalActions.find(
    (action) => action.type === 'SURRENDER',
  )
  const canHumanAct = seatModes[state.activeSeat] === 'human'
  const victoryState = activeRequest.publicState.victory
  const selectedVictoryWarnings =
    selectedDomain && victoryState
      ? victoryState.activeWarnings.filter((warning) =>
          warning.conditionSnapshot?.anchorIds?.includes(selectedDomain.anchorId),
        )
      : []

  return (
    <main
      className="app-shell"
      style={{ '--app-backdrop': `url(${assets.board})` }}
    >
      <header className="topbar" aria-label="Match status">
        <a className="brand-lockup" href="#board" aria-label="Hex Sovereign board">
          <span className="brand-mark">HS</span>
          <span>
            <strong>Hex Sovereign</strong>
            <small>Agent Prototype</small>
          </span>
        </a>
        <div className="turn-strip" aria-live="polite">
          <span>Cycle {state.cycle}</span>
          <span>Round {state.round}</span>
          <span>{SEAT_LABELS[state.activeSeat]} turn</span>
        </div>
        <nav className="top-links" aria-label="Page sections">
          <a href="#protocol">Protocol</a>
          <a href="#architecture">Architecture</a>
          <a href="#roadmap">Roadmap</a>
        </nav>
      </header>

      <section className="game-screen" id="board" aria-labelledby="game-title">
        <div className="game-heading">
          <p className="eyebrow">Static browser strategy game</p>
          <h1 id="game-title">Hex Sovereign</h1>
          <p>
            Place stones, fight for anchor Domains, and inspect every turn as a
            validated legal-action request that humans, bots, and browser agents
            can all use.
          </p>
        </div>

        <div className="game-layout">
          {victoryState?.activeWarnings.length > 0 || victoryState?.winner ? (
            <VictoryBanner victory={victoryState} />
          ) : null}
          <aside className="left-rail" aria-label="Player and selected details">
            <PlayerPanel
              seat="black"
              state={state}
              domains={domains}
              mode={seatModes.black}
              reinforcements={getReinforcementSummary(state, 'black')}
              activeRequest={activeRequest}
              botStrategy={botStrategies.black}
              onModeChange={(mode) =>
                setSeatModes((current) => ({ ...current, black: mode }))
              }
              onBotStrategyChange={(strategy) =>
                setBotStrategies((current) => ({ ...current, black: strategy }))
              }
            />
            <SelectedPanel
              cell={selectedCell}
              domain={selectedDomain}
              placementAction={selectedPlacementAction}
              reinforcementAction={selectedReinforcementAction}
              activeSeat={state.activeSeat}
              reinforcements={activeReinforcements}
              repairAction={selectedRepairAction}
              decreeActions={selectedDecreeActions}
              pressureActions={selectedPressureActions}
              victoryWarnings={selectedVictoryWarnings}
              canHumanAct={canHumanAct}
              onRepair={(actionId) => submitActiveAction(actionId, 'repair-panel')}
              onDecreeAction={(actionId) =>
                submitActiveAction(actionId, 'decree-panel')
              }
              onPressureAction={(actionId) =>
                submitActiveAction(actionId, 'pressure-panel')
              }
            />
          </aside>

          <section className="board-wrap" aria-label="Hex board">
            <div className="board-meta">
              <div>
                <span>Active request</span>
                <strong>{activeRequest.requestId}</strong>
              </div>
              <div>
                <span>Legal moves</span>
                <strong>{activeRequest.legalActions.length}</strong>
              </div>
              <div>
                <span>Era</span>
                <strong>{victoryState?.era.label ?? 'Era I'}</strong>
              </div>
              <div>
                <span>Domains held</span>
                <strong>{controlledDomains.length}</strong>
              </div>
            </div>

            <div className="hex-board" role="grid" aria-label="Playable hex board">
              {state.board.cells.map((cell) => {
                const position = boardPositions.get(cell.id)
                const legalAction = legalActionByCell.get(cell.id)
                const reinforcementAction = reinforcementActionByCell.get(cell.id)
                const isSelected = selectedCellId === cell.id
                const isLastMove = state.lastMove?.cellId === cell.id
                const zoneTone = zoneToneByCell.get(cell.id)
                const pressureTone = pressureToneByCell.get(cell.id)

                return (
                  <button
                    className={[
                      'hex-cell',
                      `region-${cell.regionId}`,
                      cell.type,
                      cell.occupant ? `occupied-${cell.occupant}` : '',
                      legalAction ? 'legal' : '',
                      reinforcementAction ? 'reinforcement-legal' : '',
                      isSelected ? 'selected' : '',
                      isLastMove ? 'last-move' : '',
                      zoneTone ? `zone-${zoneTone}` : '',
                      pressureTone ? `pressure-${pressureTone}` : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={cell.id}
                    type="button"
                    role="gridcell"
                    style={{
                      left: `${position.left}%`,
                      top: `${position.top}%`,
                    }}
                    aria-label={getCellLabel(
                      cell,
                      legalAction,
                      reinforcementAction,
                      zoneTone,
                      pressureTone,
                    )}
                    onClick={() => handleCellClick(cell)}
                  >
                    {cell.type === 'anchor' ? (
                      <span className="anchor-mark" aria-hidden="true">
                        {cell.anchorMark}
                      </span>
                    ) : null}
                    {cell.occupant ? (
                      <span
                        className={`stone stone-${cell.occupant}`}
                        aria-hidden="true"
                      />
                    ) : null}
                    {legalAction ? <span className="legal-dot" /> : null}
                  </button>
                )
              })}
            </div>

            <div className="action-bar" aria-label="Current turn actions">
              <div className="action-summary">
                <span className="small-label">Action tray</span>
                <strong>{SEAT_LABELS[state.activeSeat]}</strong>
              </div>
              {activeReinforcements ? (
                <div className="reinforcement-tray">
                  <label>
                    <span>Reinforcement target</span>
                    <select
                      value={selectedReinforcementAction?.payload.cellId ?? ''}
                      disabled={!canHumanAct || reinforcementActions.length === 0}
                      onChange={(event) =>
                        selectReinforcementTarget(event.target.value)
                      }
                    >
                      <option value="">Select cell</option>
                      {reinforcementActions.map((action) => (
                        <option key={action.id} value={action.payload.cellId}>
                          {action.payload.q}, {action.payload.r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="control-button reinforcement-button"
                    type="button"
                    disabled={!selectedReinforcementAction || !canHumanAct}
                    onClick={() =>
                      submitActiveAction(
                        selectedReinforcementAction.id,
                        'reinforcement-tray',
                      )
                    }
                  >
                    Spend
                  </button>
                </div>
              ) : null}
              {upkeepActions.map((action) => (
                <button
                  className="control-button upkeep-button"
                  key={action.id}
                  type="button"
                  disabled={!canHumanAct}
                  onClick={() => submitActiveAction(action.id, 'upkeep-button')}
                >
                  {action.label}
                </button>
              ))}
              {cardActions.length > 0 ? (
                <div className="card-action-tray">
                  {cardActions.map((action) => (
                    <button
                      className="control-button card-button"
                      key={action.id}
                      type="button"
                      disabled={!canHumanAct}
                      onClick={() => submitActiveAction(action.id, 'card-tray')}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                className="control-button"
                type="button"
                disabled={!passAction || !canHumanAct}
                onClick={() => submitActiveAction(passAction.id, 'pass-button')}
              >
                Pass
              </button>
              {surrenderAction ? (
                <button
                  className="control-button danger"
                  type="button"
                  disabled={!canHumanAct}
                  onClick={() => submitActiveAction(surrenderAction.id, 'surrender-button')}
                >
                  Surrender
                </button>
              ) : null}
              <button className="control-button secondary" type="button" onClick={resetMatch}>
                Reset
              </button>
            </div>
          </section>

          <aside className="right-rail" aria-label="Protocol and log">
            <PlayerPanel
              seat="white"
              state={state}
              domains={domains}
              mode={seatModes.white}
              reinforcements={getReinforcementSummary(state, 'white')}
              activeRequest={activeRequest}
              botStrategy={botStrategies.white}
              onModeChange={(mode) =>
                setSeatModes((current) => ({ ...current, white: mode }))
              }
              onBotStrategyChange={(strategy) =>
                setBotStrategies((current) => ({ ...current, white: strategy }))
              }
            />
            <ProtocolPanel
              activeRequest={activeRequest}
              protocolTab={protocolTab}
              setProtocolTab={setProtocolTab}
              lastResult={lastResult}
              onSubmitAction={(actionId) => submitActiveAction(actionId, 'debug')}
              inviteUrls={inviteUrls}
            />
            <EventLog events={state.eventLog} />
          </aside>
        </div>
      </section>

      <CaseStudy />
    </main>
  )
}

function getCellLabel(
  cell,
  legalAction,
  reinforcementAction,
  zoneTone,
  pressureTone,
) {
  const parts = [`Cell ${cell.q}, ${cell.r}`]

  if (cell.type === 'anchor') {
    parts.push(cell.anchorLabel)
  }

  if (cell.occupant) {
    parts.push(`${SEAT_LABELS[cell.occupant]} stone`)
  }

  if (legalAction) {
    parts.push('legal move')
  }

  if (reinforcementAction) {
    parts.push('reinforcement available')
  }

  if (zoneTone) {
    parts.push(`${zoneTone} Domain zone`)
  }

  if (pressureTone) {
    parts.push(`${pressureTone} pressure`)
  }

  return parts.join(', ')
}

function VictoryBanner({ victory }) {
  if (victory.winner) {
    return (
      <section className="victory-banner won" aria-live="assertive">
        <div>
          <p className="small-label">Game over</p>
          <strong>
            {SEAT_LABELS[victory.winner]} wins by {victory.winReason}
          </strong>
        </div>
      </section>
    )
  }

  return (
    <section
      className={`victory-banner ${victory.suddenDeath ? 'sudden' : ''}`}
      aria-live="assertive"
    >
      <div>
        <p className="small-label">
          {victory.suddenDeath ? 'Sudden Death' : 'Victory warning'}
        </p>
        <strong>
          {victory.activeWarnings
            .map((warning) => `${SEAT_LABELS[warning.seat]} ${warning.label}`)
            .join(' / ')}
        </strong>
      </div>
      <ol className="warning-list banner-warning-list">
        {victory.activeWarnings.map((warning) => (
          <li key={warning.id}>
            <strong>{warning.conditionText}</strong>
            <span>{warning.howToStop}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function PlayerPanel({
  seat,
  state,
  domains,
  mode,
  reinforcements,
  activeRequest,
  botStrategy,
  onModeChange,
  onBotStrategyChange,
}) {
  const controlled = domains.filter((domain) => domain.owner === seat)
  const active = state.activeSeat === seat
  const publicCards = activeRequest.publicState.cards?.players?.[seat] ?? null
  const privateCards = active ? activeRequest.privateState.cards : null
  const cardCount = publicCards?.cardCount ?? privateCards?.hand.length ?? 0
  const handLimit =
    activeRequest.publicState.cards?.handLimit ?? privateCards?.handLimit ?? null
  const victory = activeRequest.publicState.victory
  const warningsForSeat =
    victory?.activeWarnings.filter((warning) => warning.seat === seat) ?? []
  const mandate = victory?.mandates?.[seat] ?? null

  return (
    <section className={`player-card ${seat} ${active ? 'active' : ''}`}>
      <div className="player-kicker">
        <span className="online-dot" />
        {active ? 'Active turn' : 'Waiting'}
      </div>
      <div className="player-title-row">
        <div>
          <p>{seatCopy[seat].player}</p>
          <h2>{seatCopy[seat].role}</h2>
        </div>
        <span className={`stone sample stone-${seat}`} />
      </div>
      <dl className="metric-list">
        <div>
          <dt>Captured</dt>
          <dd>{state.players[seat].captures}</dd>
        </div>
        <div>
          <dt>Domains</dt>
          <dd>{controlled.length}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{mode === 'bot' ? 'Bot' : 'Human'}</dd>
        </div>
        {reinforcements ? (
          <div>
            <dt>Reserve</dt>
            <dd>
              {reinforcements.tokens}/{reinforcements.reserveCap}
            </dd>
          </div>
        ) : null}
        {state.players[seat].gold !== undefined ? (
          <div>
            <dt>Gold</dt>
            <dd>{state.players[seat].gold}</dd>
          </div>
        ) : null}
        {state.players[seat].upkeepDue !== undefined ? (
          <div>
            <dt>Upkeep</dt>
            <dd>{state.players[seat].upkeepDue}</dd>
          </div>
        ) : null}
        {publicCards ? (
          <div>
            <dt>Cards</dt>
            <dd>
              {cardCount}
              {handLimit ? `/${handLimit}` : ''}
            </dd>
          </div>
        ) : null}
        {victory ? (
          <div>
            <dt>Warnings</dt>
            <dd>{warningsForSeat.length}</dd>
          </div>
        ) : null}
      </dl>
      {victory ? (
        <div className="victory-summary">
          <div className="section-heading-row compact">
            <p className="small-label">Victory</p>
            <strong>{victory.era.label}</strong>
          </div>
          {mandate ? <p>{mandate.label}</p> : <p>No mandate unlocked.</p>}
          {warningsForSeat.length > 0 ? (
            <ol className="warning-list">
              {warningsForSeat.map((warning) => (
                <li key={warning.id}>
                  <strong>{warning.label}</strong>
                  <span>{warning.conditionText}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
      {publicCards ? (
        <div className="card-summary">
          <div className="section-heading-row compact">
            <p className="small-label">Region cards</p>
            <strong>{publicCards.completedSetCountVisibleIfRevealed} revealed</strong>
          </div>
          {privateCards ? (
            <>
              <ol className="card-chip-list">
                {privateCards.hand.map((card) => (
                  <li key={card.id}>{card.name}</li>
                ))}
              </ol>
              {privateCards.completedSets.length > 0 ? (
                <p>{privateCards.completedSets.length} cashable set</p>
              ) : null}
              {privateCards.mustDiscard ? <p>Discard down to hand limit.</p> : null}
            </>
          ) : (
            <p>{cardCount} hidden card{cardCount === 1 ? '' : 's'}.</p>
          )}
        </div>
      ) : null}
      <div className="segmented-control" aria-label={`${seatCopy[seat].role} mode`}>
        <button
          className={mode === 'human' ? 'selected' : ''}
          type="button"
          onClick={() => onModeChange('human')}
        >
          Human
        </button>
        <button
          className={mode === 'bot' ? 'selected' : ''}
          type="button"
          onClick={() => onModeChange('bot')}
        >
          Bot
        </button>
      </div>
      <label className="bot-strategy-select">
        <span>Bot plan</span>
        <select
          value={botStrategy}
          disabled={mode !== 'bot'}
          onChange={(event) => onBotStrategyChange(event.target.value)}
        >
          {BOT_STRATEGIES.map((strategy) => (
            <option key={strategy.id} value={strategy.id}>
              {strategy.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}

function ReinforcementSummary({ reinforcements, reinforcementAction, hasCell }) {
  if (!reinforcements) {
    return null
  }

  return (
    <div className="reinforcement-summary">
      <p className="small-label">Reinforcements</p>
      <dl className="detail-list">
        <div>
          <dt>Tokens</dt>
          <dd>{reinforcements.tokens}</dd>
        </div>
        <div>
          <dt>Reserve cap</dt>
          <dd>{reinforcements.reserveCap}</dd>
        </div>
        <div>
          <dt>This round</dt>
          <dd>
            {reinforcements.remainingThisRound} left /{' '}
            {reinforcements.spentThisRound} spent
          </dd>
        </div>
        <div>
          <dt>Selected cell</dt>
          <dd>
            {hasCell
              ? reinforcementAction
                ? 'Can spend'
                : 'Cannot spend'
              : 'No cell'}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function SelectedPanel({
  cell,
  domain,
  placementAction,
  reinforcementAction,
  activeSeat,
  reinforcements,
  repairAction,
  decreeActions,
  pressureActions,
  victoryWarnings = [],
  canHumanAct,
  onRepair,
  onDecreeAction,
  onPressureAction,
}) {
  if (!cell) {
    return (
      <section className="info-panel">
        <p className="small-label">Selected cell</p>
        <h2>Inspect the board</h2>
        <p>
          Click a hex to inspect coordinates, occupant, Domain relationship, and
          legal move status for the active seat.
        </p>
        <ReinforcementSummary
          reinforcements={reinforcements}
          reinforcementAction={reinforcementAction}
          hasCell={false}
        />
      </section>
    )
  }

  const actionPreview = placementAction ?? reinforcementAction

  return (
    <section className="info-panel">
      <p className="small-label">Selected cell</p>
      <h2>
        {cell.type === 'anchor' ? cell.anchorLabel : `${cell.q}, ${cell.r}`}
      </h2>
      <dl className="detail-list">
        <div>
          <dt>Type</dt>
          <dd>{cell.type === 'anchor' ? cell.anchorKind : 'Playable'}</dd>
        </div>
        <div>
          <dt>Occupant</dt>
          <dd>{cell.occupant ? SEAT_LABELS[cell.occupant] : 'Empty'}</dd>
        </div>
        <div>
          <dt>Move</dt>
          <dd>
            {placementAction
              ? `Legal for ${SEAT_LABELS[activeSeat]}`
              : cell.type === 'anchor'
                ? 'Anchors are not playable'
                : cell.occupant
                  ? 'Occupied'
                  : 'Not legal now'}
          </dd>
        </div>
        <div>
          <dt>Captures</dt>
          <dd>{actionPreview?.preview.capturedCount ?? 0}</dd>
        </div>
      </dl>

      <ReinforcementSummary
        reinforcements={reinforcements}
        reinforcementAction={reinforcementAction}
        hasCell
      />

      {domain ? (
        <div className="domain-summary">
          <p className="small-label">Domain</p>
          <h3>{domain.label}</h3>
          <dl className="detail-list">
            <div>
              <dt>Status</dt>
              <dd>{domain.status}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{domain.owner ? SEAT_LABELS[domain.owner] : 'None'}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{domain.size ?? 'None'}</dd>
            </div>
            <div>
              <dt>Group</dt>
              <dd>{domain.controllingGroupSize}</dd>
            </div>
            {domain.baseStability !== undefined ? (
              <div>
                <dt>Stability</dt>
                <dd>
                  {domain.stability}/{domain.baseStability}
                </dd>
              </div>
            ) : null}
            {domain.income !== undefined ? (
              <div>
                <dt>Income</dt>
                <dd>{domain.income}</dd>
              </div>
            ) : null}
            {domain.economyStatus ? (
              <div>
                <dt>Economy</dt>
                <dd>{domain.economyStatus}</dd>
              </div>
            ) : null}
            {domain.decreeSlots !== undefined ? (
              <div>
                <dt>Decree slots</dt>
                <dd>
                  {domain.decreeSlotsUsed}/{domain.decreeSlots}
                </dd>
              </div>
            ) : null}
            {domain.decreeIncome !== undefined ? (
              <div>
                <dt>Decree yield</dt>
                <dd>
                  +{domain.decreeIncome} / upkeep {domain.decreeUpkeep}
                </dd>
              </div>
            ) : null}
            {domain.pressure ? (
              <div>
                <dt>Net pressure</dt>
                <dd>{domain.pressure.netPressure}</dd>
              </div>
            ) : null}
          </dl>
          <p>{domain.reason}</p>
          {domain.inactiveReason ? <p>{domain.inactiveReason}</p> : null}
          {victoryWarnings.length > 0 ? (
            <div className="victory-summary selected-victory-summary">
              <p className="small-label">Victory pressure</p>
              <ol className="warning-list">
                {victoryWarnings.map((warning) => (
                  <li key={warning.id}>
                    <strong>{warning.label}</strong>
                    <span>{warning.conditionText}</span>
                    <span>{warning.howToStop}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          {domain.decrees ? (
            <div className="decree-section">
              <div className="section-heading-row">
                <p className="small-label">Decrees</p>
                <strong>{domain.activeDecreesCount} active</strong>
              </div>
              {domain.decrees.length > 0 ? (
                <ol className="decree-list">
                  {domain.decrees.map((decree) => (
                    <li className={`decree-item ${decree.status}`} key={decree.index}>
                      <div>
                        <strong>
                          {decree.type} L{decree.level}
                        </strong>
                        <span>{decree.status}</span>
                      </div>
                      {decree.inactiveReason ? (
                        <p>{decree.inactiveReason}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No decrees built.</p>
              )}
              {decreeActions.length > 0 ? (
                <div className="domain-action-list">
                  {decreeActions.map((action) => (
                    <button
                      className="control-button"
                      key={action.id}
                      type="button"
                      disabled={!canHumanAct}
                      onClick={() => onDecreeAction(action.id)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {domain.pressure ? (
            <div className="pressure-section">
              <div className="section-heading-row">
                <p className="small-label">Pressure</p>
                <strong>{domain.pressure.projectedEffects.threshold}</strong>
              </div>
              <dl className="detail-list pressure-detail-list">
                <div>
                  <dt>Influence</dt>
                  <dd>{domain.pressure.incomingInfluence}</dd>
                </div>
                <div>
                  <dt>Corruption</dt>
                  <dd>{domain.pressure.effectiveCorruption}</dd>
                </div>
                <div>
                  <dt>Support</dt>
                  <dd>{domain.pressure.friendlySupport}</dd>
                </div>
                <div>
                  <dt>Reduction</dt>
                  <dd>{domain.pressure.defensiveReduction}</dd>
                </div>
                <div>
                  <dt>Siphon</dt>
                  <dd>{domain.pressure.projectedEffects.siphon}</dd>
                </div>
                <div>
                  <dt>Damage</dt>
                  <dd>{domain.pressure.projectedEffects.stabilityDamage}</dd>
                </div>
              </dl>
              {domain.pressure.warningChips.length > 0 ? (
                <div className="warning-chip-row">
                  {domain.pressure.warningChips.map((chip) => (
                    <span className="warning-chip" key={chip}>
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
              {domain.pressure.assignments.length > 0 ? (
                <ol className="pressure-list">
                  {domain.pressure.assignments.map((assignment) => (
                    <li
                      className={`pressure-item ${assignment.pressureType}`}
                      key={`${assignment.sourceId}-${assignment.targetAnchorId}`}
                    >
                      <strong>{assignment.sourceLabel}</strong>
                      <span>
                        {assignment.strength} / {assignment.status}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
              {pressureActions.length > 0 ? (
                <div className="domain-action-list">
                  {pressureActions.map((action) => (
                    <button
                      className="control-button"
                      key={action.id}
                      type="button"
                      disabled={!canHumanAct}
                      onClick={() => onPressureAction(action.id)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {domain.canRepair ? (
            <div className="repair-callout">
              <div>
                <p className="small-label">Repair option</p>
                <strong>
                  {repairAction
                    ? `${repairAction.payload.cost} gold to reach ${repairAction.preview.stabilityAfter}/${domain.baseStability}`
                    : 'Active seat cannot repair this Domain now'}
                </strong>
              </div>
              <button
                className="control-button"
                type="button"
                disabled={!repairAction || !canHumanAct}
                onClick={() => onRepair(repairAction.id)}
              >
                Repair
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function summarizeActionTypes(actions) {
  return actions.reduce((summary, action) => {
    return {
      ...summary,
      [action.type]: (summary[action.type] ?? 0) + 1,
    }
  }, {})
}

function compactEconomyAction(action) {
  return {
    id: action.id,
    type: action.type,
    label: action.label,
    payload: action.payload,
    preview: action.preview,
  }
}

function compactPressureState(pressure) {
  if (!pressure) return null

  return {
    assignments: pressure.assignments,
    counterBribes: pressure.counterBribes,
    purges: pressure.purges,
    metrics: pressure.metrics,
  }
}

function compactCardState(cards) {
  if (!cards) return null

  return {
    handLimit: cards.handLimit,
    players: cards.players,
    pendingCounterDraft: cards.pendingCounterDraft,
    metrics: cards.metrics,
  }
}

function compactPrivateCards(cards) {
  if (!cards) return null

  return {
    hand: cards.hand.map((card) => ({
      id: card.id,
      name: card.name,
      cashableAfterCycle: card.cashableAfterCycle,
    })),
    completedSets: cards.completedSets.map((set) => ({
      id: set.id,
      setType: set.setType,
      regionName: set.regionName,
      cardIds: set.cardIds,
    })),
    mustDiscard: cards.mustDiscard,
  }
}

function compactVictoryState(victory) {
  if (!victory) return null

  return {
    era: victory.era,
    activeWarnings: victory.activeWarnings,
    threatened: victory.threatened,
    suddenDeath: victory.suddenDeath,
    winner: victory.winner,
    winReason: victory.winReason,
    mandates: victory.mandates,
  }
}

function ProtocolPanel({
  activeRequest,
  protocolTab,
  setProtocolTab,
  lastResult,
  onSubmitAction,
  inviteUrls,
}) {
  const [selectedActionId, setSelectedActionId] = useState('')
  const [copiedSeat, setCopiedSeat] = useState(null)

  useEffect(() => {
    const firstAction = activeRequest.legalActions[0]
    setSelectedActionId(firstAction?.id ?? '')
  }, [activeRequest])

  const copyInvite = async (seat) => {
    await navigator.clipboard?.writeText(inviteUrls[seat])
    setCopiedSeat(seat)
    window.setTimeout(() => setCopiedSeat(null), 1200)
  }

  return (
    <section className="protocol-card" id="protocol">
      <div className="panel-header">
        <div>
          <p className="small-label">Legal-action protocol</p>
          <h2>Agent request</h2>
        </div>
        <div className="tab-row" role="tablist" aria-label="Protocol panels">
          {['request', 'submit', 'invite'].map((tab) => (
            <button
              className={protocolTab === tab ? 'selected' : ''}
              key={tab}
              type="button"
              role="tab"
              aria-selected={protocolTab === tab}
              onClick={() => setProtocolTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {protocolTab === 'request' ? (
        <pre className="json-panel">
          {JSON.stringify(
            {
              requestId: activeRequest.requestId,
              seat: activeRequest.seat,
              phase: activeRequest.phase,
              actionCounts: summarizeActionTypes(activeRequest.legalActions),
              economyActions: activeRequest.legalActions
                .filter((action) => economyActionTypes.has(action.type))
                .map(compactEconomyAction),
              pressureActions: activeRequest.legalActions
                .filter((action) => pressureActionTypes.has(action.type))
                .map(compactEconomyAction),
              pressure: compactPressureState(activeRequest.publicState.pressure),
              cardActions: activeRequest.legalActions
                .filter((action) => cardActionTypes.has(action.type))
                .map(compactEconomyAction),
              cards: compactCardState(activeRequest.publicState.cards),
              privateCards: compactPrivateCards(activeRequest.privateState.cards),
              victory: compactVictoryState(activeRequest.privateState.victory),
              eventLog: activeRequest.publicState.eventLog.slice(0, 8),
              legalActions: activeRequest.legalActions.slice(0, 8),
              omittedActions: Math.max(activeRequest.legalActions.length - 8, 0),
            },
            null,
            2,
          )}
        </pre>
      ) : null}

      {protocolTab === 'submit' ? (
        <div className="submit-panel">
          <label>
            <span>Choose action ID</span>
            <select
              value={selectedActionId}
              onChange={(event) => setSelectedActionId(event.target.value)}
            >
              {activeRequest.legalActions.map((action) => (
                <option key={action.id} value={action.id}>
                  {action.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="control-button"
            type="button"
            disabled={!selectedActionId}
            onClick={() => onSubmitAction(selectedActionId)}
          >
            Submit ID
          </button>
          <pre className="json-panel compact">
            {JSON.stringify(lastResult ?? { accepted: null }, null, 2)}
          </pre>
        </div>
      ) : null}

      {protocolTab === 'invite' ? (
        <div className="invite-panel">
          {Object.entries(inviteUrls).map(([seat, url]) => (
            <div className="invite-row" key={seat}>
              <span>{SEAT_LABELS[seat]} seat</span>
              <a href={url} target="_blank" rel="noreferrer">
                Open console
              </a>
              <button type="button" onClick={() => copyInvite(seat)}>
                {copiedSeat === seat ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
          <p>
            Browser Agent Mode is local to this browser session. It is a
            structured page protocol, not a public HTTP API.
          </p>
        </div>
      ) : null}
    </section>
  )
}

function EventLog({ events }) {
  return (
    <section className="event-log" aria-label="Match event log">
      <div className="panel-header">
        <div>
          <p className="small-label">Match log</p>
          <h2>Events</h2>
        </div>
      </div>
      <ol>
        {events.map((event) => (
          <li key={event.id}>
            <span className={`event-dot ${event.seat ?? 'neutral'}`} />
            <div>
              <p>{event.message}</p>
              <small>
                {event.kind} | Cycle {event.cycle} | Turn {event.turn}
              </small>
              {event.detail && Object.keys(event.detail).length > 0 ? (
                <code>{JSON.stringify(event.detail)}</code>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function CaseStudy() {
  return (
    <section className="case-study" id="architecture" aria-labelledby="case-title">
      <div className="case-heading">
        <p className="eyebrow">Portfolio case study</p>
        <h2 id="case-title">A deterministic game engine behind a playable UI</h2>
        <p>
          The prototype is scoped around the strongest engineering idea from the
          design docs: every actor receives legal actions, submits an action ID,
          and lets the engine validate state changes.
        </p>
      </div>

      <div className="architecture-grid">
        <article>
          <p className="small-label">Engine</p>
          <h3>Pure rules</h3>
          <p>
            Board generation, neighbor lookup, liberties, captures, suicide
            prevention, and Domain control live outside React.
          </p>
        </article>
        <article>
          <p className="small-label">Controller</p>
          <h3>Validated actions</h3>
          <p>
            Humans, bots, the debug panel, the window API, and BroadcastChannel
            messages all submit the same selected action ID.
          </p>
        </article>
        <article>
          <p className="small-label">Static deployment</p>
          <h3>Browser-local agents</h3>
          <p>
            The hosted app can expose an in-page protocol and invite URL without
            claiming real online multiplayer or public endpoints.
          </p>
        </article>
      </div>

      <div className="asset-gallery" aria-label="Go-Game design assets">
        <figure>
          <img src={assets.board} alt="Hex Sovereign board interface concept" />
          <figcaption>Board composition reference</figcaption>
        </figure>
        <figure>
          <img src={assets.ui} alt="Hex Sovereign component sheet" />
          <figcaption>UI component sheet</figcaption>
        </figure>
        <figure>
          <img src={assets.cards} alt="Hex Sovereign cards and decrees sheet" />
          <figcaption>Future cards and decrees</figcaption>
        </figure>
      </div>

      <div
        className="roadmap-band"
        id="roadmap"
        style={{ '--roadmap-backdrop': `url(${assets.cards})` }}
      >
        <div>
          <p className="eyebrow">Expansion path</p>
          <h2>Grow one readable system at a time</h2>
        </div>
        <ol>
          {roadmap.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>

      <div className="region-band" aria-label="Region identities">
        {REGIONS.map((region) => (
          <article className={`region-card region-${region.id}`} key={region.id}>
            <p>{region.name}</p>
            <span>{region.theme}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

function AgentConsole() {
  const [{ matchId, seat, token }, setParams] = useState(getAgentParams)
  const [request, setRequest] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [connection, setConnection] = useState('connecting')

  useEffect(() => {
    const refreshParams = () => setParams(getAgentParams())
    window.addEventListener('hashchange', refreshParams)
    return () => window.removeEventListener('hashchange', refreshParams)
  }, [])

  useEffect(() => {
    if (!('BroadcastChannel' in window)) {
      setConnection('unsupported')
      return undefined
    }

    const channel = new BroadcastChannel(`hex-sovereign:${matchId}`)

    const requestState = () => {
      channel.postMessage({
        type: 'AGENT_REQUEST_STATE',
        matchId,
        seat,
        token,
      })
    }

    channel.addEventListener('message', (event) => {
      const message = event.data

      if (message?.type === 'AGENT_STATE') {
        setRequest(message.request)
        setConnection(message.activeSeat === seat ? 'active' : 'waiting')
      }

      if (message?.type === 'AGENT_ACTION_RESULT') {
        setLastResult(message)
      }
    })

    channel.postMessage({
      type: 'AGENT_HELLO',
      matchId,
      seat,
      token,
    })
    requestState()

    const interval = window.setInterval(requestState, 1500)

    return () => {
      window.clearInterval(interval)
      channel.close()
    }
  }, [matchId, seat, token])

  const submitAgentAction = (actionId) => {
    if (!request || !('BroadcastChannel' in window)) return

    const channel = new BroadcastChannel(`hex-sovereign:${matchId}`)
    channel.postMessage({
      type: 'AGENT_SUBMIT_ACTION',
      requestId: request.requestId,
      matchId,
      seat,
      selectedActionId: actionId,
      token,
    })
    channel.close()
  }

  return (
    <main
      className="agent-console"
      style={{ '--agent-backdrop': `url(${assets.ui})` }}
    >
      <header className="topbar">
        <a className="brand-lockup" href="#/">
          <span className="brand-mark">HS</span>
          <span>
            <strong>Agent Console</strong>
            <small>{matchId}</small>
          </span>
        </a>
        <div className={`connection-chip ${connection}`}>{connection}</div>
      </header>

      <section className="agent-layout">
        <div className="agent-actions">
          <p className="eyebrow">Browser Agent Mode</p>
          <h1>{SEAT_LABELS[seat] ?? seat} legal actions</h1>
          <p>
            This console listens over BroadcastChannel and can only submit action
            IDs that the running game tab validates.
          </p>
          <div className="agent-action-list">
            {(request?.legalActions ?? []).map((action) => (
              <button
                className="agent-action"
                key={action.id}
                type="button"
                onClick={() => submitAgentAction(action.id)}
              >
                <span>{action.type}</span>
                <strong>{action.label}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="agent-json">
          <p className="small-label">Current request</p>
          <pre className="json-panel">
            {JSON.stringify(request ?? { status: connection }, null, 2)}
          </pre>
          <p className="small-label">Last result</p>
          <pre className="json-panel compact">
            {JSON.stringify(lastResult ?? { accepted: null }, null, 2)}
          </pre>
        </div>
      </section>
    </main>
  )
}

export default App
