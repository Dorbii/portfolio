import { useCallback, useEffect, useMemo, useState } from 'react'
import { chooseBotAction } from './game/bots'
import AgentConsole from './hex-sovereign/components/AgentConsole'
import BoardPanel from './hex-sovereign/components/BoardPanel'
import CaseStudy from './hex-sovereign/components/CaseStudy'
import EventLog from './hex-sovereign/components/EventLog'
import PlayerPanel from './hex-sovereign/components/PlayerPanel'
import ProtocolPanel from './hex-sovereign/components/ProtocolPanel'
import SelectedPanel from './hex-sovereign/components/SelectedPanel'
import VictoryBanner from './hex-sovereign/components/VictoryBanner'
import {
  assets,
  cardActionTypes,
  demoMatchConfig,
  domainActionTypes,
  pressureActionTypes,
} from './hex-sovereign/config'
import {
  compactResult,
  computeBoardPositions,
  createAgentApiRejection,
  createInviteUrl,
  getDomainTone,
  getInitialRoute,
  getReinforcementSummary,
  makeSeatTokens,
} from './hex-sovereign/uiLogic'
import {
  SEAT_LABELS,
  createAgentRequest,
  createMatch,
  deriveDomains,
  getLegalActions,
  getPublicState,
  submitProtocolAction,
} from './game/engine'

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

          <BoardPanel
            state={state}
            activeRequest={activeRequest}
            victoryState={victoryState}
            controlledDomains={controlledDomains}
            boardPositions={boardPositions}
            legalActionByCell={legalActionByCell}
            reinforcementActionByCell={reinforcementActionByCell}
            selectedCellId={selectedCellId}
            zoneToneByCell={zoneToneByCell}
            pressureToneByCell={pressureToneByCell}
            activeReinforcements={activeReinforcements}
            selectedReinforcementAction={selectedReinforcementAction}
            reinforcementActions={reinforcementActions}
            upkeepActions={upkeepActions}
            cardActions={cardActions}
            passAction={passAction}
            surrenderAction={surrenderAction}
            canHumanAct={canHumanAct}
            onCellClick={handleCellClick}
            onSelectReinforcementTarget={selectReinforcementTarget}
            onSubmitAction={submitActiveAction}
            onReset={resetMatch}
          />

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

export default App
