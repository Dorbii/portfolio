import type { Dispatch, SetStateAction } from 'react'
import type { RefereePacingState } from './refereePacingState'

type RefereePacingHudProps = {
  autoAdvance: {
    enabled: boolean
    onChange: Dispatch<SetStateAction<boolean>>
    ready: boolean
    reason: string
    toggleDisabled: boolean
  }
  pacingState: RefereePacingState
}

export function RefereePacingHud({
  autoAdvance,
  pacingState,
}: RefereePacingHudProps) {
  return (
    <section
      className="referee-pacing-hud"
      aria-label="Match pacing"
      data-active-blocker={pacingState.activeBlockerCode}
      data-auto-advance-ready={autoAdvance.ready ? 'true' : 'false'}
      data-combat-watched-seconds={pacingState.metrics.combatWatchedSeconds}
      data-viewer-state={pacingState.viewerState}
    >
      <div className="referee-pacing-state">
        <span>Status</span>
        <strong>{pacingState.viewerStateLabel}</strong>
        <small>{pacingState.activeBlockerLabel}</small>
      </div>
      <div className="referee-pacing-roles" aria-label="Agent wait state">
        {Object.values(pacingState.roleStates).map((roleState) => (
          <span
            className={`referee-pacing-role is-${roleState.role} is-${roleState.status}`}
            data-role={roleState.role}
            data-role-status={roleState.status}
            key={roleState.role}
          >
            {roleState.label}
          </span>
        ))}
      </div>
      <dl className="referee-pacing-metrics">
        <div>
          <dt>Elapsed</dt>
          <dd>{pacingState.metrics.matchElapsedLabel}</dd>
        </div>
        <div>
          <dt>Phase</dt>
          <dd>{pacingState.metrics.currentPhaseLabel}</dd>
        </div>
        <div>
          <dt>Round</dt>
          <dd>{pacingState.metrics.roundLabel}</dd>
        </div>
        <div>
          <dt>Burst</dt>
          <dd>{pacingState.metrics.lastCombatBurstLabel}</dd>
        </div>
        <div>
          <dt>Watched / Wall</dt>
          <dd>
            {pacingState.metrics.combatWatchedVsWallLabel}
            <span>{pacingState.metrics.combatWatchedWallRatioLabel}</span>
          </dd>
        </div>
      </dl>
      <label
        className="referee-auto-advance-toggle"
        title={autoAdvance.reason}
      >
        <input
          type="checkbox"
          checked={autoAdvance.enabled}
          disabled={autoAdvance.toggleDisabled}
          onChange={(event) => autoAdvance.onChange(event.target.checked)}
        />
        <span>Auto advance rounds</span>
      </label>
    </section>
  )
}
