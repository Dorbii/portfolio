import { useEffect, useState } from 'react'
import { SEAT_LABELS } from '../../game/engine'
import {
  cardActionTypes,
  economyActionTypes,
  pressureActionTypes,
} from '../config'

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

export default function ProtocolPanel({
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
            structured page protocol, not a public HTTP API, localhost bridge,
            or backend.
          </p>
        </div>
      ) : null}
    </section>
  )
}
