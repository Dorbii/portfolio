import {
  buildSharedDebrief,
} from '../../../packages/sim/src/index.js'
import type {
  PostFightAgentReflection,
  SharedDebrief,
  TeamRole,
} from '../../../packages/schemas/src/index.js'
import type {
  StoredPostFightReflection,
  StoredSessionState,
} from './sessionTypes.js'

export function latestCompletedFightId(state: StoredSessionState): string | undefined {
  return state.fightDossier?.fights.at(-1)?.fightId
}

export function hasStoredReflection(
  state: StoredSessionState,
  role: TeamRole,
  fightId: string,
): boolean {
  return (state.reflections ?? []).some(
    (entry) => entry.reflection.role === role && entry.reflection.fightId === fightId,
  )
}

export function storedReflectionForRole(
  state: StoredSessionState,
  role: TeamRole,
  fightId: string,
): StoredPostFightReflection | undefined {
  return (state.reflections ?? []).find(
    (entry) => entry.reflection.role === role && entry.reflection.fightId === fightId,
  )
}

export function storePrivateReflection(
  state: StoredSessionState,
  reflection: PostFightAgentReflection,
  submittedAt: string,
): void {
  const reflectionId = `${state.id}:${reflection.fightId}:${reflection.role}:reflection`
  const nextReflection: StoredPostFightReflection = {
    reflectionId,
    status: 'private_pending',
    submittedAt,
    reflection,
  }

  state.reflections = [
    ...(state.reflections ?? []).filter((entry) => entry.reflectionId !== reflectionId),
    nextReflection,
  ]
}

export function consumePendingReflectionsIntoDebrief(
  state: StoredSessionState,
  consumedAt: string,
): SharedDebrief | undefined {
  if (!state.fightDossier) {
    return undefined
  }

  const debrief = buildSharedDebrief({
    sourceSessionId: state.id,
    dossier: state.fightDossier,
    reflections: state.reflections ?? [],
  })

  state.reflections = (state.reflections ?? []).map((entry) =>
    entry.status === 'private_pending'
      ? {
          ...entry,
          status: 'consumed_into_shared_debrief',
          consumedAt,
          debriefId: debrief.debriefId,
        }
      : entry,
  )
  state.sharedDebrief = debrief

  return debrief
}
