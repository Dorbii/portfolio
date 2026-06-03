import { BOT_STRATEGIES } from '../../game/bots'
import { seatCopy } from '../config'

export default function PlayerPanel({
  seat,
  viewerRequest,
  state,
  domains,
  mode,
  reinforcements,
  botStrategy,
  onModeChange,
  onBotStrategyChange,
}) {
  const controlled = domains.filter((domain) => domain.owner === seat)
  const active = state.activeSeat === seat
  const publicCards = viewerRequest.publicState.cards?.players?.[seat] ?? null
  const cardCount = publicCards?.cardCount ?? 0
  const handLimit = viewerRequest.publicState.cards?.handLimit ?? null
  const victory = viewerRequest.publicState.victory
  const warningsForSeat =
    victory?.activeWarnings.filter((warning) => warning.seat === seat) ?? []

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
        {state.players[seat].upkeepDue > 0 ? (
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
      {mode === 'bot' ? (
        <label className="bot-strategy-select">
          <span>Bot plan</span>
          <select
            value={botStrategy}
            onChange={(event) => onBotStrategyChange(event.target.value)}
          >
            {BOT_STRATEGIES.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </section>
  )
}
