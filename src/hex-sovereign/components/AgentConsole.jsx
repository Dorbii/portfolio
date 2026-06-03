import { useEffect, useState } from 'react'
import { SEAT_LABELS } from '../../game/engine'
import { assets } from '../config'
import { getAgentParams } from '../uiLogic'

export default function AgentConsole() {
  const [{ matchId, seat, token }, setParams] = useState(getAgentParams)
  const [request, setRequest] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [connection, setConnection] = useState('connecting')

  useEffect(() => {
    const refreshParams = () => setParams(getAgentParams())
    window.addEventListener('hashchange', refreshParams)
    return () => window.removeEventListener('hashchange', refreshParams)
  }, [])

  useEffect(() => {
    if (!('BroadcastChannel' in window)) {
      setConnection('unsupported')
      return undefined
    }

    const channel = new BroadcastChannel(`hex-sovereign:${matchId}`)

    const requestState = () => {
      channel.postMessage({
        type: 'AGENT_REQUEST_STATE',
        matchId,
        seat,
        token,
      })
    }

    channel.addEventListener('message', (event) => {
      const message = event.data

      if (message?.type === 'AGENT_STATE') {
        setRequest(message.request)
        setConnection(message.activeSeat === seat ? 'active' : 'waiting')
      }

      if (message?.type === 'AGENT_ACTION_RESULT') {
        setLastResult(message)
      }
    })

    channel.postMessage({
      type: 'AGENT_HELLO',
      matchId,
      seat,
      token,
    })
    requestState()

    const interval = window.setInterval(requestState, 1500)

    return () => {
      window.clearInterval(interval)
      channel.close()
    }
  }, [matchId, seat, token])

  const submitAgentAction = (actionId) => {
    if (!request || !('BroadcastChannel' in window)) return

    const channel = new BroadcastChannel(`hex-sovereign:${matchId}`)
    channel.postMessage({
      type: 'AGENT_SUBMIT_ACTION',
      requestId: request.requestId,
      matchId,
      seat,
      selectedActionId: actionId,
      token,
    })
    channel.close()
  }

  return (
    <main
      className="agent-console"
      style={{ '--agent-backdrop': `url(${assets.ui})` }}
    >
      <header className="topbar">
        <a className="brand-lockup" href="#/">
          <span className="brand-mark">HS</span>
          <span>
            <strong>Agent Console</strong>
            <small>{matchId}</small>
          </span>
        </a>
        <div className={`connection-chip ${connection}`}>{connection}</div>
      </header>

      <section className="agent-layout">
        <div className="agent-actions">
          <p className="eyebrow">Browser Agent Mode</p>
          <h1>{SEAT_LABELS[seat] ?? seat} legal actions</h1>
          <p>
            This console listens over BroadcastChannel and can only submit action
            IDs that the running game tab validates.
          </p>
          <div className="agent-action-list">
            {(request?.legalActions ?? []).map((action) => (
              <button
                className="agent-action"
                key={action.id}
                type="button"
                onClick={() => submitAgentAction(action.id)}
              >
                <span>{action.type}</span>
                <strong>{action.label}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="agent-json">
          <p className="small-label">Current request</p>
          <pre className="json-panel">
            {JSON.stringify(request ?? { status: connection }, null, 2)}
          </pre>
          <p className="small-label">Last result</p>
          <pre className="json-panel compact">
            {JSON.stringify(lastResult ?? { accepted: null }, null, 2)}
          </pre>
        </div>
      </section>
    </main>
  )
}
