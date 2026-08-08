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
    case "ambient":
      throw new TypeError(
        `Kaizen ${role} structure ${visualId} belongs to the authored plate.`,
      );
  }
}

export function resolveKaizenStructurePresentationAnchor({
  anchor,
}: {
  readonly anchor: Pair;
  readonly ownerId: string;
  readonly role: KaizenStructurePresentationRole;
  readonly visualId: string;
}): Pair {
  return anchor;
}
