import type {
  RolePrivateState,
  RoundPlanSubmission,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { MetricGrid } from '../shared/ui'
import { formatLabel } from '../shared/format'
import { BotAssemblyScene } from './BotAssemblyScene'
import {
  Fact,
  PlanMetric,
  SectionTitle,
} from './AgentCockpitPanels'

type AgentInsightWorkbenchProps = {
  role: TeamRole
  roleState: RolePrivateState | null
}

export function AgentInsightWorkbench({
  role,
  roleState,
}: AgentInsightWorkbenchProps) {
  const submission = roleState?.ownSubmission ?? null
  const blueprint = submission?.blueprint ?? null
  const decision = roleState?.combat?.decision
  const hasBlueprint = Boolean(blueprint && blueprint.blocks.length > 0)
  const submissionLabel = roleState?.submitted ? 'Accepted' : 'Pending'
  const teamIdentity = roleState?.identity ?? null

  return (
    <section className="agent-live-panel cockpit-workbench agent-insight-workbench" aria-labelledby="agent-insight-heading">
      <div className="workbench-header">
        <div>
          <SectionTitle id="agent-insight-heading" title="Agent insight" />
          <strong>{createInsightSubtitle(roleState, submission)}</strong>
        </div>
        <span className={`assembly-state${roleState?.submitted ? '' : ' is-draft'}`}>
          {submissionLabel}
        </span>
      </div>

      <div className="plan-metric-strip" aria-label="Agent state summary">
        <PlanMetric label="Phase" value={formatLabel(roleState?.phase ?? 'not_loaded')} />
        <PlanMetric label="Plan" tone={roleState?.submitted ? 'ok' : undefined} value={submissionLabel} />
        <PlanMetric label="Blueprint" value={blueprint ? `${blueprint.blocks.length} blocks` : 'No plan'} />
        <PlanMetric
          label="Combat"
          tone={decision ? 'ok' : undefined}
          value={decision ? `${formatLabel(decision.range.band)} range` : 'No turn'}
        />
      </div>

      {!roleState ? (
        <NoRoleStatePanel />
      ) : null}

      {roleState && teamIdentity && hasBlueprint && blueprint ? (
        <section className="assembly-bay-panel" aria-labelledby="assembly-bay-heading">
          <div className="plan-section-header">
            <SectionTitle id="assembly-bay-heading" title="Assembly bay" />
            <div className="assembly-preview-meta">
              <span className="assembly-state">Submitted bot</span>
              <strong>{blueprint.name}</strong>
              <span>Read-only plan from role state</span>
            </div>
          </div>
          <BotAssemblyScene blueprint={blueprint} identity={teamIdentity} role={role} submitted />
        </section>
      ) : null}

      {roleState ? (
      <div className={`insight-grid${decision ? ' has-decision' : ''}`}>
        <section className="plan-section insight-panel" aria-labelledby="plan-read-heading">
          <SectionTitle id="plan-read-heading" title="Plan read" />
          {submission ? (
            <>
              <div className="insight-readout-grid">
                <ReadoutCard
                  label="Bot"
                  value={submission.blueprint.name}
                  detail={`${submission.blueprint.blocks.length} blocks / ${submission.purchases.length} bought`}
                />
                <ReadoutCard
                  label="Movement"
                  value={formatOptionalLabel(submission.tactics.movementPolicy)}
                  detail={`${formatOptionalLabel(submission.tactics.preferredRange)} range`}
                />
                <ReadoutCard
                  label="Weapons"
                  value={formatOptionalLabel(submission.tactics.weaponCadence)}
                  detail={`${formatAggression(submission.tactics.aggression)} aggression`}
                />
              </div>
              <InsightText title="Rationale" text={submission.rationale} fallback="No rationale was submitted with this plan." />
            </>
          ) : (
            <p className="agent-empty">
              No accepted plan is available yet. That means this agent has not committed a bot, tactics, or rationale for this round.
            </p>
          )}
        </section>

        <section className="plan-section insight-panel combat-decision-panel" aria-labelledby="decision-heading">
          <SectionTitle id="decision-heading" title="Combat decision" />
          {decision && roleState?.combat ? (
            <>
              <MetricGrid className="agent-facts">
                <Fact label="Tick" value={String(decision.tick)} />
                <Fact label="Range" value={`${formatLabel(decision.range.band)} / ${decision.range.distance.toFixed(2)}m`} />
                <Fact label="Preferred" value={formatLabel(decision.range.preferred)} />
                <Fact label="Self health" value={`${Math.round(decision.health.selfPct)}%`} />
                <Fact label="Opponent health" value={`${Math.round(decision.health.opponentPct)}%`} />
                <Fact label="Submitted" value={roleState.combat.submitted[roleState.role] ? 'Yes' : 'No'} />
              </MetricGrid>
              <DecisionReadiness state={roleState} />
              <InsightList
                emptyText="No tactical cues returned for this turn."
                items={decision.tacticalCues}
                title="Tactical cues"
              />
              <InsightList
                emptyText="No movement recommendation returned."
                items={decision.movementOptions.recommended.map(formatLabel)}
                title="Recommended movement"
              />
              <InsightList
                emptyText="No movement avoid-list returned."
                items={decision.movementOptions.avoid.map(formatLabel)}
                title="Avoid"
              />
            </>
          ) : (
            <p className="agent-empty">
              Combat decision context appears once both plans resolve and a turn is open.
            </p>
          )}
        </section>
      </div>
      ) : null}
    </section>
  )
}

function ReadoutCard({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: string
}) {
  return (
    <div className="insight-readout-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function createInsightSubtitle(
  roleState: RolePrivateState | null,
  submission: RoundPlanSubmission | null,
): string {
  if (!roleState) {
    return 'Load role state to inspect the agent.'
  }

  if (submission) {
    return `${roleState.identity?.name ?? 'This role'} submitted ${submission.blueprint.name}.`
  }

  return `${roleState.identity?.name ?? 'This role'} has not submitted a round plan.`
}

function NoRoleStatePanel() {
  return (
    <section className="insight-empty-state" aria-labelledby="empty-state-heading">
      <SectionTitle id="empty-state-heading" title="State not loaded" />
      <p>
        The cockpit has no private role state yet. Refresh with a valid observer or agent key; once state loads, this panel shows the agent plan, rationale, and combat decision context.
      </p>
    </section>
  )
}

function DecisionReadiness({ state }: { state: RolePrivateState }) {
  const decision = state.combat?.decision

  if (!decision) {
    return null
  }

  return (
    <div className="decision-readiness">
      <ReadinessCard
        label="Weapon A"
        ready={decision.actionReadiness.weaponA.canFire}
        reason={decision.actionReadiness.weaponA.reason}
      />
      {decision.actionReadiness.weaponB ? (
        <ReadinessCard
          label="Weapon B"
          ready={decision.actionReadiness.weaponB.canFire}
          reason={decision.actionReadiness.weaponB.reason}
        />
      ) : null}
      {decision.actionReadiness.utility ? (
        <ReadinessCard
          label="Utility"
          ready={decision.actionReadiness.utility.canActivate}
          reason={decision.actionReadiness.utility.reason}
        />
      ) : null}
    </div>
  )
}

function ReadinessCard({
  label,
  ready,
  reason,
}: {
  label: string
  ready: boolean
  reason: string
}) {
  return (
    <div className={`readiness-card ${ready ? 'is-ready' : 'is-waiting'}`}>
      <span>{label}</span>
      <strong>{ready ? 'Ready' : 'Hold'}</strong>
      <p>{reason}</p>
    </div>
  )
}

function InsightText({
  fallback,
  text,
  title,
}: {
  fallback: string
  text?: string
  title: string
}) {
  return (
    <div className="insight-text">
      <strong>{title}</strong>
      <p>{text?.trim() || fallback}</p>
    </div>
  )
}

function InsightList({
  emptyText,
  items,
  title,
}: {
  emptyText: string
  items: string[]
  title: string
}) {
  return (
    <div className="insight-list-block">
      <strong>{title}</strong>
      {items.length > 0 ? (
        <ul className="insight-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="agent-empty">{emptyText}</p>
      )}
    </div>
  )
}

function formatOptionalLabel(value: string | undefined): string {
  return value ? formatLabel(value) : 'Not set'
}

function formatAggression(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'Unknown'
  }

  return `${Math.round(value * 100)}%`
}
