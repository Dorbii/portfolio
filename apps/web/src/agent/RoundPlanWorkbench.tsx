import { useMemo, type Dispatch, type SetStateAction } from 'react'
import type {
  RolePrivateState,
  RoundPlanSubmission,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { BotAssemblyScene } from './BotAssemblyScene'
import {
  Fact,
  PlanMetric,
  SectionTitle,
} from './AgentCockpitPanels'
import { Button } from '../shared/Button'
import {
  buildSubmissionFromDraft,
  summarizeDraft,
  type RoundPlanDraft,
} from './roundPlanDraft'
import { RoundPlanStructuredEditor } from './RoundPlanStructuredEditor'

export type SubmissionMode = 'structured' | 'json'

type RoundPlanWorkbenchProps = {
  canSubmitPlan: boolean
  hasLocalDraftEdits: boolean
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
  hasLocalDraftEdits,
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
  const submittedSubmission = roleState?.ownSubmission ?? null
  const previewSubmission = submittedSubmission ?? draftSubmission
  const previewBlueprint = previewSubmission.blueprint
  const previewCommandCount = getOpeningScriptCommandCount(previewSubmission)
  const previewStateLabel = submittedSubmission
    ? 'Submitted bot'
    : roleState
      ? 'Local draft'
      : 'Sample draft'
  const previewStateDetail = submittedSubmission
    ? 'Locked from role state'
    : roleState?.submitted
      ? 'Submitted flag is set, but no submitted blueprint was returned'
      : roleState
        ? 'Not submitted yet'
        : 'Sample fallback before role state loads'
  const draftStateLabel = hasLocalDraftEdits
    ? 'Edited local draft'
    : submittedSubmission
      ? 'Draft seeded from submitted bot'
      : roleState
        ? 'Empty local draft'
        : 'Sample fallback draft'
  const hasPreviewBlueprint = previewBlueprint.blocks.length > 0
  const submitActionLabel = getSubmitActionLabel(roleState, canSubmitPlan)

  return (
    <section className="agent-live-panel cockpit-workbench" aria-labelledby="submission-heading">
      <div className="workbench-header">
        <div>
          <SectionTitle id="submission-heading" title="Round plan workbench" />
          <strong>{draftStateLabel}: {draftSubmission.blueprint.name}</strong>
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

      <div className="plan-metric-strip" aria-label="Local draft summary">
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
        <PlanMetric label="Opening" value={`${draftSummary.commandCount} / 5`} />
      </div>

      <div className="submit-dock">
        <dl className="agent-facts">
          <Fact label="Action" value={submitActionLabel} />
          <Fact label="Draft" value={draftStateLabel} />
          <Fact
            label={submittedSubmission ? 'Submitted blueprint' : 'Draft blueprint'}
            value={`${previewBlueprint.blocks.length} blocks`}
          />
          <Fact
            label={submittedSubmission ? 'Submitted plan' : 'Draft plan'}
            value={`${previewCommandCount} opening commands`}
          />
        </dl>
        <Button
          type="button"
          variant="primary"
          onClick={() => void onSubmitRoundPlan()}
          disabled={!canSubmitPlan}
        >
          Submit round plan
        </Button>
      </div>

      <section className="assembly-bay-panel" aria-labelledby="assembly-bay-heading">
        <div className="plan-section-header">
          <SectionTitle id="assembly-bay-heading" title="Assembly bay" />
          <div className="assembly-preview-meta">
            <span className={`assembly-state${submittedSubmission ? '' : ' is-draft'}`}>
              {previewStateLabel}
            </span>
            <strong>{previewBlueprint.name || 'No blueprint'}</strong>
            <span>{previewStateDetail}</span>
          </div>
        </div>
        {hasPreviewBlueprint ? (
          <BotAssemblyScene
            blueprint={previewBlueprint}
            role={role}
            submitted={Boolean(submittedSubmission)}
          />
        ) : (
          <p className="agent-empty assembly-empty">
            No submitted bot or local draft blueprint loaded.
          </p>
        )}
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
    </section>
  )
}

function getSubmitActionLabel(
  roleState: RolePrivateState | null,
  canSubmitPlan: boolean,
): string {
  if (!roleState) {
    return 'Connect first'
  }

  if (roleState.submitted) {
    return 'Submitted'
  }

  if (canSubmitPlan) {
    return 'Ready to submit'
  }

  return 'Waiting'
}

function getOpeningScriptCommandCount(submission: RoundPlanSubmission): number {
  return submission.openingScript?.commands.length ?? 0
}
