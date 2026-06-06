import type { ReactNode } from 'react'
import type {
  SessionChatMessage,
  ValidationIssue,
} from '../../../../packages/schemas/src/index.js'
import { capitalize, formatDateTime, formatLabel } from '../shared/format'
import { MetricRow, SubsectionTitle } from '../shared/ui'
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
      <JsonScriptPanel id="agent-arena-state" json={stateScript} />
    </main>
  )
}

export function JsonScriptPanel({ id, json }: { id: string; json: string }) {
  return (
    <script
      id={id}
      type="application/json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}

export function SectionTitle({ id, title }: { id: string; title: string }) {
  return <SubsectionTitle id={id} title={title} />
}

export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return <MetricRow label={label} value={value} />
}

export function ConnectionGuide({
  compact = false,
  guidance,
}: {
  compact?: boolean
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
      {compact ? null : (
        <>
          <code>{guidance.helperCall}</code>
          <small>{guidance.detail}</small>
        </>
      )}
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
