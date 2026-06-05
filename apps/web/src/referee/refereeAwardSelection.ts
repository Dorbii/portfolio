import type {
  PublicSessionState,
  RefereeAwardSelection,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'

export type AwardSelections = Partial<Record<string, TeamRole>>

export const MAX_AWARDS_PER_ROUND = 2
export const MAX_AWARDS_PER_TEAM = 1

export type AwardSubmitBlocker =
  | 'wrong_phase'
  | 'no_awards'
  | 'missing_token'
  | 'submitting'
  | undefined

export function countSelectedAwards(selectedAwards: AwardSelections): number {
  return Object.keys(selectedAwards).length
}

export function countSelectedAwardsByTeam(
  selectedAwards: AwardSelections,
): Record<TeamRole, number> {
  const totals: Record<TeamRole, number> = { red: 0, blue: 0 }

  Object.values(selectedAwards).forEach((team) => {
    if (team) {
      totals[team] += 1
    }
  })

  return totals
}

export function createAwardSelectionPayload(
  selectedAwards: AwardSelections,
): RefereeAwardSelection[] {
  return Object.entries(selectedAwards)
    .map(([awardId, targetTeam]) =>
      targetTeam === undefined ? null : ({ awardId, targetTeam } as RefereeAwardSelection),
    )
    .filter((selection): selection is RefereeAwardSelection => selection !== null)
}

export function toggleAwardSelectionState(
  selectedAwards: AwardSelections,
  awardId: string,
  team: TeamRole,
): AwardSelections {
  const currentTeam = selectedAwards[awardId]
  const next = { ...selectedAwards }

  if (currentTeam === team) {
    delete next[awardId]
    return next
  }

  const nextCount = countSelectedAwards(selectedAwards)
  const currentTeamCount = countSelectedAwardsByTeam(selectedAwards)[team]

  if (!currentTeam && nextCount >= MAX_AWARDS_PER_ROUND) {
    return selectedAwards
  }

  if (currentTeam && currentTeam !== team && currentTeamCount >= MAX_AWARDS_PER_TEAM) {
    return selectedAwards
  }

  if (!currentTeam && currentTeamCount >= MAX_AWARDS_PER_TEAM) {
    return selectedAwards
  }

  next[awardId] = team
  return next
}

export function getAwardSubmitBlocker({
  phase,
  selectedCount,
  hasRefereeToken,
  submitState,
}: {
  phase: PublicSessionState['phase'] | undefined
  selectedCount: number
  hasRefereeToken: boolean
  submitState: 'idle' | 'submitting'
}): AwardSubmitBlocker {
  if (phase !== 'referee_awards') {
    return 'wrong_phase'
  }

  if (selectedCount === 0) {
    return 'no_awards'
  }

  if (!hasRefereeToken) {
    return 'missing_token'
  }

  if (submitState === 'submitting') {
    return 'submitting'
  }

  return undefined
}

export function formatAwardSubmitBlocker(blocker: AwardSubmitBlocker): string | undefined {
  if (blocker === 'wrong_phase') {
    return 'Awards can be submitted only during Referee Awards.'
  }

  if (blocker === 'no_awards') {
    return 'Select at least one award.'
  }

  if (blocker === 'missing_token') {
    return 'Paste and save the referee capability token before submitting awards.'
  }

  if (blocker === 'submitting') {
    return 'Award submission is already in progress.'
  }

  return undefined
}
