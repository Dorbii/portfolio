import { SEAT_LABELS } from '../../game/engine'

export default function VictoryBanner({ victory }) {
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
