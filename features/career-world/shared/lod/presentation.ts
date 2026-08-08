export interface LodPresentationFade {
  readonly value: number;
  readonly target: number;
  readonly lastUpdatedAt: number;
}

export interface LodCrossfadeTargets {
  readonly lower: number;
  readonly upper: number;
}

export interface LodCohortPresentation {
  readonly keys: readonly string[];
  readonly promotedAt: number;
  readonly signature: string;
}

export interface LodCohortTransition {
  readonly incoming: LodCohortPresentation;
  readonly outgoing: LodCohortPresentation;
  readonly promotedAt: number;
  readonly startingOpacities: Readonly<Record<string, number>>;
}

export interface LodPresentationResidency {
  readonly transition: LodCohortTransition;
  readonly value: number;
}

export const LOD_PRESENTATION_TRANSITION_MS = 180;
export const LOD_PRESENTATION_EPSILON = 0.001;
export const EMPTY_LOD_COHORT_PRESENTATION: LodCohortPresentation =
  Object.freeze({
    keys: Object.freeze([]),
    promotedAt: 0,
    signature: "",
  });
export const EMPTY_LOD_COHORT_TRANSITION: LodCohortTransition =
  Object.freeze({
    incoming: EMPTY_LOD_COHORT_PRESENTATION,
    outgoing: EMPTY_LOD_COHORT_PRESENTATION,
    promotedAt: 0,
    startingOpacities: Object.freeze({}),
  });

export function advanceLodPresentationFade(
  current: LodPresentationFade,
  target: number,
  now: number,
): LodPresentationFade {
  if (current.target !== target) {
    return {
      value: current.value,
      target,
      lastUpdatedAt: now,
    };
  }
  if (Math.abs(current.value - target) <= LOD_PRESENTATION_EPSILON) {
    return {
      value: target,
      target,
      lastUpdatedAt: now,
    };
  }
  const step = Math.max(0, now - current.lastUpdatedAt)
    / LOD_PRESENTATION_TRANSITION_MS;
  return {
    value: current.value < target
      ? Math.min(target, current.value + step)
      : Math.max(target, current.value - step),
    target,
    lastUpdatedAt: now,
  };
}

export function resolveLodSourceOpacity(
  decodedAt: number,
  now: number,
): number {
  const elapsed = Math.max(0, now - decodedAt);
  const amount = Math.min(1, elapsed / LOD_PRESENTATION_TRANSITION_MS);
  return amount * amount * (3 - 2 * amount);
}

export function isLodCohortReady(
  requiredKeys: readonly string[],
  decodedKeys: ReadonlySet<string>,
): boolean {
  return requiredKeys.every((key) => decodedKeys.has(key));
}

function normalizedLodCohort(
  requiredKeys: readonly string[],
  now: number,
): LodCohortPresentation {
  const keys = [...new Set(requiredKeys)].sort();
  return Object.freeze({
    keys: Object.freeze(keys),
    promotedAt: now,
    signature: keys.join("\u0000"),
  });
}

export function resolveLodCohortKeyOpacity(
  transition: LodCohortTransition,
  key: string,
  now: number,
): number {
  const isIncoming = transition.incoming.keys.includes(key);
  const isOutgoing = transition.outgoing.keys.includes(key);
  if (!isIncoming && !isOutgoing) {
    return 0;
  }
  const startingOpacity = transition.startingOpacities[key]
    ?? (isOutgoing ? 1 : 0);
  const targetOpacity = isIncoming ? 1 : 0;
  const progress = resolveLodSourceOpacity(transition.promotedAt, now);
  return (
    startingOpacity
    + (targetOpacity - startingOpacity) * progress
  );
}

export function isCurrentLodCohort(
  requiredKeys: readonly string[],
  transition: LodCohortTransition,
): boolean {
  return normalizedLodCohort(requiredKeys, transition.promotedAt).signature
    === transition.incoming.signature;
}

export function resolveLodCohortTransition(
  requiredKeys: readonly string[],
  decodedKeys: ReadonlySet<string>,
  current: LodCohortTransition,
  now: number,
): LodCohortTransition {
  const candidate = normalizedLodCohort(requiredKeys, now);
  if (candidate.signature === current.incoming.signature) {
    if (
      current.outgoing.keys.length > 0
      && resolveLodSourceOpacity(current.promotedAt, now)
        >= 1 - LOD_PRESENTATION_EPSILON
    ) {
      return Object.freeze({
        incoming: current.incoming,
        outgoing: EMPTY_LOD_COHORT_PRESENTATION,
        promotedAt: current.promotedAt,
        startingOpacities: Object.freeze(
          Object.fromEntries(
            current.incoming.keys.map((key) => [key, 1]),
          ),
        ),
      });
    }
    return current;
  }
  if (!isLodCohortReady(candidate.keys, decodedKeys)) {
    return current;
  }

  const previousKeys = [
    ...new Set([
      ...current.outgoing.keys,
      ...current.incoming.keys,
    ]),
  ].sort();
  const startingOpacities = Object.freeze(
    Object.fromEntries(
      [...new Set([...previousKeys, ...candidate.keys])].map((key) => [
        key,
        resolveLodCohortKeyOpacity(current, key, now),
      ]),
    ),
  );
  const outgoingKeys = previousKeys.filter(
    (key) => (startingOpacities[key] ?? 0) > LOD_PRESENTATION_EPSILON,
  );

  return Object.freeze({
    incoming: candidate,
    outgoing: outgoingKeys.length > 0
      ? Object.freeze({
        keys: Object.freeze(outgoingKeys),
        promotedAt: current.promotedAt,
        signature: outgoingKeys.join("\u0000"),
      })
      : EMPTY_LOD_COHORT_PRESENTATION,
    promotedAt: now,
    startingOpacities,
  });
}

export function removeLodCohortKey(
  transition: LodCohortTransition,
  key: string,
): LodCohortTransition {
  if (
    !transition.incoming.keys.includes(key)
    && !transition.outgoing.keys.includes(key)
  ) {
    return transition;
  }
  const incoming = normalizedLodCohort(
    transition.incoming.keys.filter((candidate) => candidate !== key),
    transition.incoming.promotedAt,
  );
  const outgoing = normalizedLodCohort(
    transition.outgoing.keys.filter((candidate) => candidate !== key),
    transition.outgoing.promotedAt,
  );
  return Object.freeze({
    incoming,
    outgoing,
    promotedAt: transition.promotedAt,
    startingOpacities: Object.freeze(
      Object.fromEntries(
        Object.entries(transition.startingOpacities).filter(
          ([candidate]) => candidate !== key,
        ),
      ),
    ),
  });
}

export function resolveLodCrossfadeTargets({
  currentLowerOpacity = 0,
  currentUpperOpacity = 0,
  lowerReady,
  lowerVisibility,
  upperReady,
  upperVisibility,
}: {
  readonly currentLowerOpacity?: number;
  readonly currentUpperOpacity?: number;
  readonly lowerReady: boolean;
  readonly lowerVisibility: number;
  readonly upperReady: boolean;
  readonly upperVisibility: number;
}): LodCrossfadeTargets {
  const upper = upperReady ? upperVisibility : 0;
  if (
    upper < currentUpperOpacity - LOD_PRESENTATION_EPSILON
    && !lowerReady
  ) {
    return Object.freeze({
      lower: currentLowerOpacity,
      upper: currentUpperOpacity,
    });
  }
  return Object.freeze({
    lower: lowerReady ? lowerVisibility * (1 - upper) : 0,
    upper,
  });
}

export function shouldRetainLodSource(
  shouldPreload: boolean,
  presentationValue: number,
): boolean {
  return (
    shouldPreload
    || presentationValue > LOD_PRESENTATION_EPSILON
  );
}

export function resolveRetainedLodPresentationKeys(
  presentations: readonly LodPresentationResidency[],
  decodedKeys: ReadonlySet<string>,
): readonly string[] {
  const retainedKeys = new Set<string>();
  for (const { transition, value } of presentations) {
    if (value <= LOD_PRESENTATION_EPSILON) {
      continue;
    }
    for (const key of [
      ...transition.incoming.keys,
      ...transition.outgoing.keys,
    ]) {
      if (decodedKeys.has(key)) {
        retainedKeys.add(key);
      }
    }
  }
  return Object.freeze([...retainedKeys].sort());
}
