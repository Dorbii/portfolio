import { BOT_STRATEGIES } from '../../game/bots'
import { seatCopy } from '../config'

export default function PlayerPanel({
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
