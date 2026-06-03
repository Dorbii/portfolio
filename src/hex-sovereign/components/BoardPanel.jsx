import { SEAT_LABELS } from '../../game/engine'

const PHASE_LABELS = {
  BOARD_PHASE: 'Board',
  DISCARD_PHASE: 'Discard',
  COUNTER_DRAFT: 'Counter',
}

function formatPhase(phase) {
  return PHASE_LABELS[phase] ?? phase.replaceAll('_', ' ').toLowerCase()
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

export default function BoardPanel({
  state,
  controlledDomains,
  boardPositions,
  legalActionByCell,
  reinforcementActionByCell,
  selectedCellId,
  zoneToneByCell,
  pressureToneByCell,
  activeReinforcements,
  selectedReinforcementAction,
  reinforcementActions,
  upkeepActions,
  passAction,
  surrenderAction,
  canHumanAct,
  onCellClick,
  onSelectReinforcementTarget,
  onSubmitAction,
  onReset,
}) {
  const reserveLabel = activeReinforcements
    ? `${activeReinforcements.tokens}/${activeReinforcements.reserveCap}`
    : 'Off'

  return (
    <section className="board-wrap" aria-label="Hex board">
      <div className="board-meta">
        <div>
          <span>Phase</span>
          <strong>{formatPhase(state.phase)}</strong>
        </div>
        <div>
          <span>Legal hexes</span>
          <strong>{legalActionByCell.size}</strong>
        </div>
        <div>
          <span>Reserve</span>
          <strong>{reserveLabel}</strong>
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
              onClick={() => onCellClick(cell)}
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
          <span className="small-label">Board actions</span>
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
                  onSelectReinforcementTarget(event.target.value)
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
                onSubmitAction(selectedReinforcementAction.id, 'reinforcement-tray')
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
            onClick={() => onSubmitAction(action.id, 'upkeep-button')}
          >
            {action.label}
          </button>
        ))}
        <button
          className="control-button"
          type="button"
          disabled={!passAction || !canHumanAct}
          onClick={() => onSubmitAction(passAction.id, 'pass-button')}
        >
          Pass
        </button>
        {surrenderAction ? (
          <button
            className="control-button danger"
            type="button"
            disabled={!canHumanAct}
            onClick={() => onSubmitAction(surrenderAction.id, 'surrender-button')}
          >
            Surrender
          </button>
        ) : null}
        <button className="control-button secondary" type="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </section>
  )
}
