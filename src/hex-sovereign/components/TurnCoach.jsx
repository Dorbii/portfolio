import { SEAT_LABELS } from '../../game/engine'

const PHASE_LABELS = {
  BOARD_PHASE: 'Board phase',
  DISCARD_PHASE: 'Discard phase',
  COUNTER_DRAFT: 'Counter draft',
}

function formatPhase(phase) {
  return PHASE_LABELS[phase] ?? phase.replaceAll('_', ' ').toLowerCase()
}

function getActionStatus({
  state,
  localSeat,
  seatModes,
  selectedCell,
  selectedPlacementAction,
  selectedReinforcementAction,
  placementCount,
  cardActions,
  canHumanAct,
  victoryState,
}) {
  if (victoryState?.winner) {
    return `${SEAT_LABELS[victoryState.winner]} won`
  }

  if (!canHumanAct) {
    return seatModes[state.activeSeat] === 'bot'
      ? `${SEAT_LABELS[state.activeSeat]} bot resolving`
      : `${SEAT_LABELS[state.activeSeat]} waiting`
  }

  if (state.activeSeat !== localSeat) {
    return `${SEAT_LABELS[state.activeSeat]} is active`
  }

  if (state.phase === 'DISCARD_PHASE') {
    return `${cardActions.length} discard option${cardActions.length === 1 ? '' : 's'}`
  }

  if (state.phase === 'COUNTER_DRAFT') {
    return `${cardActions.length} counter option${cardActions.length === 1 ? '' : 's'}`
  }

  if (selectedPlacementAction && selectedCell) {
    return `Place at ${selectedCell.q}, ${selectedCell.r}`
  }

  if (selectedReinforcementAction && selectedCell) {
    return `Reserve at ${selectedCell.q}, ${selectedCell.r}`
  }

  if (cardActions.length > 0) {
    return `${cardActions.length} card option${cardActions.length === 1 ? '' : 's'}`
  }

  return `${placementCount} legal hex${placementCount === 1 ? '' : 'es'}`
}

export default function TurnCoach({
  state,
  localSeat,
  activeRequest,
  seatModes,
  selectedCell,
  selectedPlacementAction,
  selectedReinforcementAction,
  placementCount,
  reinforcementCount,
  cardActions,
  canHumanAct,
  victoryState,
}) {
  const localTurn = state.activeSeat === localSeat
  const actionStatus = getActionStatus({
    state,
    localSeat,
    seatModes,
    selectedCell,
    selectedPlacementAction,
    selectedReinforcementAction,
    placementCount,
    cardActions,
    canHumanAct,
    victoryState,
  })

  return (
    <section className="turn-coach" aria-label="Turn status">
      <div className={`turn-card ${localTurn ? 'local' : 'opponent'}`}>
        <span className="small-label">Turn</span>
        <strong>{localTurn ? 'Your turn' : `${SEAT_LABELS[state.activeSeat]} turn`}</strong>
        <small>{SEAT_LABELS[state.activeSeat]} to move</small>
      </div>
      <div className="turn-card">
        <span className="small-label">Phase</span>
        <strong>{formatPhase(state.phase)}</strong>
        <small>{activeRequest.legalActions.length} legal actions</small>
      </div>
      <div className="turn-card">
        <span className="small-label">Board</span>
        <strong>{placementCount} placements</strong>
        <small>{reinforcementCount} reserve targets</small>
      </div>
      <div className="turn-card action">
        <span className="small-label">Action</span>
        <strong>{actionStatus}</strong>
        <small>{canHumanAct ? 'Human input' : seatModes[state.activeSeat]}</small>
      </div>
    </section>
  )
}
