import { SEAT_LABELS } from '../../game/engine'
import ReinforcementSummary from './ReinforcementSummary'

export default function SelectedPanel({
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
