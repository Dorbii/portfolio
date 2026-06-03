import { SEAT_LABELS } from '../../game/engine'

function getOpponentSeat(seat) {
  return seat === 'black' ? 'white' : 'black'
}

function getRegionClass(regionId) {
  return `region-${regionId ?? 'wild'}`
}

function getActionMeta(action) {
  if (action.type === 'DRAFT_CARD') {
    if (action.payload?.fallback === 'gold') {
      return `+${action.payload.gold} gold`
    }

    return `Hand ${action.preview?.cardCountAfter}/${action.preview?.handLimit}`
  }

  if (action.type === 'CASH_SET') {
    return `${action.preview?.cardsSpent ?? 3} cards`
  }

  if (action.type === 'DISCARD_CARD') {
    return `Hand ${action.preview?.cardCountAfter}/${action.preview?.handLimit}`
  }

  if (action.type === 'COUNTER_IMMEDIATE') {
    return `Mitigate ${action.preview?.mitigation ?? 0}`
  }

  if (action.type === 'COUNTER_SEEK_MISSING') {
    return `Cashable cycle ${action.preview?.cashableAfterCycle ?? '?'}`
  }

  if (action.type === 'COUNTER_SAFE_FALLBACK') {
    if (action.payload?.fallback === 'gold') {
      return `Gold ${action.preview?.goldAfter ?? ''}`
    }

    return action.payload?.fallback ?? 'Fallback'
  }

  return action.type.replaceAll('_', ' ').toLowerCase()
}

function getCardActionGroups(cardActions) {
  return {
    cashSet: cardActions.filter((action) => action.type === 'CASH_SET'),
    draft: cardActions.filter((action) => action.type === 'DRAFT_CARD'),
    counter: cardActions.filter((action) => action.type.startsWith('COUNTER_')),
    discardByCardId: new Map(
      cardActions
        .filter((action) => action.type === 'DISCARD_CARD')
        .map((action) => [action.payload.cardId, action]),
    ),
  }
}

export default function HandPanel({
  seat,
  cycle,
  viewerRequest,
  cardActions,
  canAct,
  onSubmitAction,
}) {
  const privateCards = viewerRequest.privateState.cards
  const publicCards = viewerRequest.publicState.cards
  const opponentSeat = getOpponentSeat(seat)
  const opponentCards = publicCards?.players?.[opponentSeat] ?? null
  const pendingCounterDraft = publicCards?.pendingCounterDraft ?? null
  const actionGroups = getCardActionGroups(cardActions)
  const hand = privateCards?.hand ?? []
  const handLimit = privateCards?.handLimit ?? publicCards?.handLimit ?? 0
  const visibleOpponentCards = Math.min(opponentCards?.cardCount ?? 0, 5)
  const extraOpponentCards = Math.max((opponentCards?.cardCount ?? 0) - 5, 0)

  return (
    <section className="hand-panel" id="hand" aria-label={`${SEAT_LABELS[seat]} hand`}>
      <div className="hand-header">
        <div>
          <p className="small-label">Your hand</p>
          <h2>{SEAT_LABELS[seat]} region cards</h2>
        </div>
        <div className="hand-count" aria-label="Cards in hand">
          <strong>{hand.length}</strong>
          <span>/ {handLimit}</span>
        </div>
      </div>

      {privateCards?.mustDiscard ? (
        <div className="hand-alert" role="status">
          Discard required before other actions unlock.
        </div>
      ) : null}

      <ol className="hand-card-list">
        {hand.map((card) => {
          const discardAction = actionGroups.discardByCardId.get(card.id)
          const ready = card.cashableAfterCycle <= cycle

          return (
            <li
              className={`hand-card ${getRegionClass(card.regionId)} ${
                ready ? 'ready' : 'locked'
              }`}
              key={card.id}
            >
              <div className="hand-card-face">
                <span>{card.regionId === 'wild' ? 'Wild' : 'Region'}</span>
                <strong>{card.name}</strong>
                <small>{ready ? 'Cashable' : `Cycle ${card.cashableAfterCycle}`}</small>
              </div>
              {discardAction ? (
                <button
                  className="control-button secondary hand-card-action"
                  type="button"
                  disabled={!canAct}
                  onClick={() => onSubmitAction(discardAction.id, 'hand-discard')}
                >
                  Discard
                </button>
              ) : null}
            </li>
          )
        })}
        {hand.length === 0 ? (
          <li className="empty-hand">
            <strong>No cards held</strong>
            <span>Draft actions appear when controlled regions are eligible.</span>
          </li>
        ) : null}
      </ol>

      {privateCards?.completedSets.length > 0 ? (
        <div className="set-panel">
          <div className="section-heading-row">
            <p className="small-label">Cashable sets</p>
            <strong>{privateCards.completedSets.length}</strong>
          </div>
          <ol className="set-list">
            {privateCards.completedSets.map((set) => {
              const cashAction = actionGroups.cashSet.find(
                (action) => action.payload.setId === set.id,
              )

              return (
                <li className="set-card" key={set.id}>
                  <div>
                    <strong>{set.label}</strong>
                    <span>{set.cards.map((card) => card.name).join(' / ')}</span>
                  </div>
                  {cashAction ? (
                    <button
                      className="control-button"
                      type="button"
                      disabled={!canAct}
                      onClick={() => onSubmitAction(cashAction.id, 'hand-cash-set')}
                    >
                      Cash
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}

      {actionGroups.draft.length > 0 || actionGroups.counter.length > 0 ? (
        <div className="hand-action-panel">
          <div className="section-heading-row">
            <p className="small-label">Card actions</p>
            <strong>{cardActions.length}</strong>
          </div>
          <div className="hand-action-grid">
            {[...actionGroups.draft, ...actionGroups.counter].map((action) => (
              <button
                className={`card-action-card ${action.type.toLowerCase()}`}
                key={action.id}
                type="button"
                disabled={!canAct}
                onClick={() => onSubmitAction(action.id, 'hand-card-action')}
              >
                <span>{getActionMeta(action)}</span>
                <strong>{action.label}</strong>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="opponent-hand-summary" aria-label={`${SEAT_LABELS[opponentSeat]} public card count`}>
        <div>
          <p className="small-label">Opponent hand</p>
          <strong>{SEAT_LABELS[opponentSeat]} cards hidden</strong>
        </div>
        <div className="card-back-row" aria-hidden="true">
          {Array.from({ length: visibleOpponentCards }).map((_, index) => (
            <span className="card-back" key={index} />
          ))}
          {extraOpponentCards > 0 ? <span className="card-extra">+{extraOpponentCards}</span> : null}
        </div>
        <span>
          {opponentCards?.cardCount ?? 0} in hand /{' '}
          {opponentCards?.completedSetCountVisibleIfRevealed ?? 0} revealed sets
        </span>
      </div>

      {pendingCounterDraft ? (
        <div className="counter-draft-strip">
          <p className="small-label">Counter draft</p>
          <strong>{SEAT_LABELS[pendingCounterDraft.responder]} response pending</strong>
        </div>
      ) : null}
    </section>
  )
}
