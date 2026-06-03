export default function ReinforcementSummary({
  reinforcements,
  reinforcementAction,
  hasCell,
}) {
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
