import type { Pair } from "../../../shared/camera";

export const KAIZEN_AGENT_STRUCTURE_OWNER_ID = "project-kaizen-agent";

export type KaizenStructurePresentationRole =
  | "ambient"
  | "project"
  | "skill"
  | "support";

const KAIZEN_PROJECT_SCALE = Object.freeze({
  "project-kaizen-agent": 0.94,
} as const);

const KAIZEN_SKILL_SCALES = Object.freeze({
  "data-contracts": 0.82,
  "protocol-gateway": 0.86,
  "safe-writes": 0.83,
} as const);

const KAIZEN_SKILL_PRESENTATION_ANCHORS = Object.freeze({
  "data-contracts": Object.freeze([0.217214, 0.226311] as Pair),
  "protocol-gateway": Object.freeze([0.262863, 0.281033] as Pair),
  "safe-writes": Object.freeze([0.236748, 0.246124] as Pair),
} as const);

const KAIZEN_SUPPORT_SCALES = Object.freeze({
  "vendy-cargo-depot": 0.72,
  "vendy-maintenance-workshop": 0.74,
  "vendy-worker-housing": 0.75,
} as const);

const KAIZEN_AMBIENT_SCALES = Object.freeze({
  "fantasy-chapel": 0.78,
  "fantasy-conservatory": 0.76,
  "fantasy-guildhouse": 0.78,
  "fantasy-inn": 0.78,
  "fantasy-townhouse": 0.78,
  "fantasy-watchtower": 0.72,
  "kaizen-artisan-rowhouse": 0.48,
  "kaizen-carriage-warehouse": 0.54,
  "kaizen-corner-tenement": 0.48,
  "kaizen-guild-annex": 0.48,
  "kaizen-machinist-workshop": 0.47,
  "kaizen-municipal-pump-house": 0.52,
} as const);

function requireScale(
  scales: Readonly<Record<string, number>>,
  visualId: string,
  role: KaizenStructurePresentationRole,
): number {
  const scale = scales[visualId];
  if (scale === undefined) {
    throw new TypeError(
      `Kaizen ${role} structure ${visualId} is missing a scale profile.`,
    );
  }
  return scale;
}

export function resolveKaizenStructurePresentationScale({
  ownerId,
  role,
  visualId,
}: {
  readonly ownerId: string;
  readonly role: KaizenStructurePresentationRole;
  readonly visualId: string;
}): number {
  if (ownerId !== KAIZEN_AGENT_STRUCTURE_OWNER_ID) {
    return 1;
  }

  switch (role) {
    case "project":
      return requireScale(KAIZEN_PROJECT_SCALE, visualId, role);
    case "skill":
      return requireScale(KAIZEN_SKILL_SCALES, visualId, role);
    case "support":
      return requireScale(KAIZEN_SUPPORT_SCALES, visualId, role);
    case "ambient":
      return requireScale(KAIZEN_AMBIENT_SCALES, visualId, role);
  }
}

export function resolveKaizenStructurePresentationAnchor({
  anchor,
  ownerId,
  role,
  visualId,
}: {
  readonly anchor: Pair;
  readonly ownerId: string;
  readonly role: KaizenStructurePresentationRole;
  readonly visualId: string;
}): Pair {
  if (
    ownerId !== KAIZEN_AGENT_STRUCTURE_OWNER_ID
    || role !== "skill"
  ) {
    return anchor;
  }

  const presentationAnchor = KAIZEN_SKILL_PRESENTATION_ANCHORS[
    visualId as keyof typeof KAIZEN_SKILL_PRESENTATION_ANCHORS
  ];
  if (!presentationAnchor) {
    return anchor;
  }

  return presentationAnchor;
}
