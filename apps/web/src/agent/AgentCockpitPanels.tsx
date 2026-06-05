import { getPart } from '../../../../packages/catalog/src/index.js'
import type {
  PartDefinition,
  RolePrivateState,
  SessionChatMessage,
  ValidationIssue,
} from '../../../../packages/schemas/src/index.js'
import { capitalize, formatDateTime, formatLabel } from '../shared/format'
import { serializeJsonForScript } from './agentClient'

export type UiError = {
  title: string
  message: string
  code?: string
  status?: number
  issues?: ValidationIssue[]
}

export function InvalidInvite({ errors }: { errors: string[] }) {
  const stateScript = serializeJsonForScript({ ok: false, errors })

  return (
    <main className="agent-live-app">
      <section className="agent-live-panel invalid-invite" aria-labelledby="invalid-invite-heading">
        <SectionTitle id="invalid-invite-heading" title="Invalid invite" />
        <ErrorPanel
          error={{
            title: 'Invite fragment cannot be used',
            message: 'The page needs a fragment with session, role, and api values.',
            code: 'INVALID_INVITE',
            issues: errors.map((message, index) => ({
              code: 'INVALID_INVITE_FRAGMENT',
              path: `fragment.${index}`,
              message,
            })),
          }}
        />
      </section>
      <script
        id="agent-arena-state"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: stateScript }}
      />
    </main>
  )
}

export function SectionTitle({ id, title }: { id: string; title: string }) {
  return <h2 id={id}>{title}</h2>
}

export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function ConnectionGuide({
  guidance,
}: {
  guidance: {
    detail: string
    helperCall: string
    nextAction: string
    status: string
    tone: 'blocked' | 'idle' | 'ready' | 'working'
  }
}) {
  return (
    <div className={`agent-connection tone-${guidance.tone}`} aria-live="polite">
      <strong>{guidance.status}</strong>
      <p>{guidance.nextAction}</p>
      <code>{guidance.helperCall}</code>
      <small>{guidance.detail}</small>
    </div>
  )
}

export function PlanMetric({
  label,
  tone,
  value,
}: {
  label: string
  tone?: 'danger' | 'ok'
  value: string
}) {
  return (
    <div className={`plan-metric ${tone ? `tone-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function AgentChatLog({ messages }: { messages: SessionChatMessage[] }) {
  if (messages.length === 0) {
    return null
  }

  return (
    <ol className="chat-log agent-chat-log">
      {messages.map((message) => (
        <li className={`chat-message ${message.role}`} key={message.id}>
          <div className="chat-message-header">
            <span className={`role-chip ${message.role}`}>{capitalize(message.role)}</span>
            <strong>{formatLabel(message.kind)}</strong>
            <time dateTime={message.at}>{formatDateTime(message.at)}</time>
          </div>
          <p>{message.message}</p>
          <small>
            Round {message.round} / {formatLabel(message.phase)}
            {message.agentName ? ` / ${message.agentName}` : ''}
          </small>
        </li>
      ))}
    </ol>
  )
}

export function InventoryTable({ state }: { state: RolePrivateState | null }) {
  const items = state?.inventory ?? []

  if (items.length === 0) {
    return <p className="agent-empty">No owned parts in current role state.</p>
  }

  return (
    <table className="agent-table">
      <thead>
        <tr>
          <th>Part</th>
          <th>Qty</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const part = getPart(item.partId)

          return (
            <tr key={item.partId}>
              <td>{part?.displayName ?? item.partId}</td>
              <td>{item.quantity}</td>
              <td>{part?.category ?? 'unknown'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function PartTable({ parts }: { parts: PartDefinition[] }) {
  return (
    <table className="agent-table">
      <thead>
        <tr>
          <th>Part</th>
          <th>Type</th>
          <th>Cost</th>
          <th>Tags</th>
        </tr>
      </thead>
      <tbody>
        {parts.map((part) => (
          <tr key={part.id}>
            <td>{part.displayName}</td>
            <td>{part.category}</td>
            <td>{part.cost}</td>
            <td>{part.tags.length > 0 ? part.tags.join(', ') : 'none'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ErrorPanel({ error }: { error: UiError }) {
  return (
    <div className="agent-error" role="alert">
      <strong>{error.title}</strong>
      <p>{error.message}</p>
      <dl className="agent-facts">
        {error.code ? <Fact label="Code" value={error.code} /> : null}
        {error.status ? <Fact label="HTTP" value={String(error.status)} /> : null}
      </dl>
      {error.issues && error.issues.length > 0 ? (
        <ul>
          {error.issues.map((issue) => (
            <li key={`${issue.path}-${issue.code}-${issue.message}`}>
              <code>{issue.path}</code> {issue.code}: {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
