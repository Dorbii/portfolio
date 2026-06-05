import { useMemo, type Dispatch, type SetStateAction } from 'react'
import type {
  RolePrivateState,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { BotAssemblyScene } from './BotAssemblyScene'
import {
  Fact,
  PlanMetric,
  SectionTitle,
} from './AgentCockpitPanels'
import {
  buildSubmissionFromDraft,
  summarizeDraft,
  type RoundPlanDraft,
} from './roundPlanDraft'
import { RoundPlanStructuredEditor } from './RoundPlanStructuredEditor'

export type SubmissionMode = 'structured' | 'json'

type RoundPlanWorkbenchProps = {
  canSubmitPlan: boolean
  onSubmitRoundPlan: () => void | Promise<void>
  onSubmissionModeChange: (next: SubmissionMode) => void
  role: TeamRole
  roleState: RolePrivateState | null
  setSubmissionDraft: Dispatch<SetStateAction<RoundPlanDraft>>
  setSubmissionText: Dispatch<SetStateAction<string>>
  submissionDraft: RoundPlanDraft
  submissionMode: SubmissionMode
  submissionText: string
}

export function RoundPlanWorkbench({
  canSubmitPlan,
  onSubmitRoundPlan,
  onSubmissionModeChange,
  role,
  roleState,
  setSubmissionDraft,
  setSubmissionText,
  submissionDraft,
  submissionMode,
  submissionText,
}: RoundPlanWorkbenchProps) {
  const draftSubmission = useMemo(
    () => buildSubmissionFromDraft(submissionDraft),
    [submissionDraft],
  )
  const draftSummary = useMemo(
    () => summarizeDraft(submissionDraft, roleState?.gold),
    [roleState?.gold, submissionDraft],
  )

  return (
    <section className="agent-live-panel cockpit-workbench" aria-labelledby="submission-heading">
      <div className="workbench-header">
        <div>
          <SectionTitle id="submission-heading" title="Round plan workbench" />
          <strong>{submissionDraft.blueprintName || draftSubmission.blueprint.name}</strong>
        </div>
        <div className="submission-mode-toggle" role="group" aria-label="Submission mode">
          <button
            type="button"
            className={submissionMode === 'structured' ? 'active' : ''}
            onClick={() => onSubmissionModeChange('structured')}
          >
            Structured
          </button>
          <button
            type="button"
            className={submissionMode === 'json' ? 'active' : ''}
            onClick={() => onSubmissionModeChange('json')}
          >
            Advanced JSON mode
          </button>
        </div>
      </div>

      <div className="plan-metric-strip" aria-label="Draft summary">
        <PlanMetric
          label="Budget"
          tone={draftSummary.remainingGold !== undefined && draftSummary.remainingGold < 0 ? 'danger' : 'ok'}
          value={
            draftSummary.remainingGold === undefined
              ? `${draftSummary.purchaseCost}g`
              : `${draftSummary.remainingGold}g left`
          }
        />
        <PlanMetric label="Blocks" value={String(draftSummary.blockCount)} />
        <PlanMetric label="Mobility" value={String(draftSummary.mobilityParts)} />
        <PlanMetric label="Weapons" value={String(draftSummary.weaponParts)} />
        <PlanMetric label="Commands" value={`${draftSummary.commandCount} / 5`} />
      </div>

      <section className="assembly-bay-panel" aria-labelledby="assembly-bay-heading">
        <div className="plan-section-header">
          <SectionTitle id="assembly-bay-heading" title="Assembly bay" />
          <span className="assembly-state">
            {roleState?.submitted ? 'Ready' : 'Building'}
          </span>
        </div>
        <BotAssemblyScene
          blueprint={draftSubmission.blueprint}
          role={role}
          submitted={Boolean(roleState?.submitted)}
        />
      </section>

      {submissionMode === 'structured' ? (
        <RoundPlanStructuredEditor
          setSubmissionDraft={setSubmissionDraft}
          submissionDraft={submissionDraft}
        />
      ) : (
        <label className="submission-editor json-editor">
          <span>Round plan JSON</span>
          <textarea
            spellCheck={false}
            value={submissionText}
            onChange={(event) => setSubmissionText(event.target.value)}
          />
        </label>
      )}

      <div className="submit-dock">
        <dl className="agent-facts">
          <Fact label="Action" value={roleState?.submitted ? 'Submitted' : 'Ready to submit'} />
          <Fact label="Blueprint" value={`${draftSubmission.blueprint.blocks.length} blocks`} />
          <Fact label="Plan" value={`${draftSubmission.turnPlan.commands.length} commands`} />
        </dl>
        <button type="button" onClick={() => void onSubmitRoundPlan()} disabled={!canSubmitPlan}>
          Submit round plan
        </button>
      </div>
    </section>
  )
}
