import manifest from "@/public/career-world/layers/structures/manifests/project-structures-r1.json";
import {
  TERRAIN_SITE_TILES,
  TERRITORIES,
} from "../../terrain";
import type { TerrainSiteTile } from "../../terrain/model/siteTiles";
import type { Territory } from "../../terrain/model/territories";
import {
  normalizeCameraView,
  type CameraView,
  type Pair,
} from "../../../shared/camera";
import {
  DETAIL_POLICY,
  type DetailNodePolicy,
} from "../../../shared/lod";

export const PROJECT_ARCHETYPES = [
  "governance-foundry",
  "orchestration-yard",
  "metrics-observatory",
] as const;

export type ProjectArchetype = typeof PROJECT_ARCHETYPES[number];

export const PROJECT_STRUCTURE_VISUAL_FAMILY =
  "career-world-bespoke-project-landmarks@r2";

export interface ProjectStructure {
  readonly id: string;
  readonly evidenceId: string;
  readonly label: string;
  readonly archetype: ProjectArchetype;
  readonly assetPath: string;
  readonly sourceDimensions: Pair;
  readonly groundAnchor: Pair;
  readonly footprintSpan: Pair;
  readonly territoryAnchor: Pair;
  readonly supportedSkillArchetypeIds: readonly string[];
  readonly terrainContact: TerrainSiteTile;
  readonly territory: Territory;
}

export interface ProjectFocusStructure {
  readonly territoryAnchor: Pair;
  readonly groundAnchor: Pair;
  readonly footprintSpan: Pair;
}

export const PROJECT_NODE_POLICY: DetailNodePolicy = Object.freeze({
  minimumTier: "capital",
});

const PROJECT_FOCUS_PADDING_MULTIPLIER = 1.12;
const PROJECT_FOCUS_VERTICAL_BIAS = 0.02;

function pair(
  values: number[],
  label: string,
  normalized = false,
): Pair {
  if (
    values.length !== 2
    || values.some((value) => (
      !Number.isFinite(value)
      || value < 0
      || (normalized && value > 1)
    ))
    || (!normalized && values.some((value) => value === 0))
  ) {
    throw new TypeError(`${label} must contain two valid numbers.`);
  }
  return Object.freeze([values[0], values[1]] as [number, number]);
}

function includes<const Value extends string>(
  values: readonly Value[],
  candidate: string,
): candidate is Value {
  return values.includes(candidate as Value);
}

if (
  manifest.minimumTier !== PROJECT_NODE_POLICY.minimumTier
  || manifest.visualFamily !== PROJECT_STRUCTURE_VISUAL_FAMILY
) {
  throw new TypeError("Project manifest must use the shared capital tier.");
}

const territory = TERRITORIES.find(({ id }) => id === manifest.territoryId);
if (!territory) {
  throw new TypeError("Project manifest references an invalid territory.");
}

export const PROJECT_STRUCTURES: readonly ProjectStructure[] = Object.freeze(
  manifest.nodes.map((node) => {
    const terrainContact = TERRAIN_SITE_TILES.find((tile) => (
      tile.ownerKind === "project"
      && tile.ownerId === node.id
      && tile.territory.id === territory.id
    ));
    if (!includes(PROJECT_ARCHETYPES, node.archetype)) {
      throw new TypeError(`Project ${node.id} has an unknown archetype.`);
    }
    if (!terrainContact) {
      throw new TypeError(
        `Project ${node.id} is missing its territory-owned contact tile.`,
      );
    }
    const isProjectTexture = node.assetPath.startsWith(
      "/career-world/layers/structures/textures/projects/",
    );
    const isRegisteredKaizenSharedTexture = (
      node.id === "project-kaizen-agent"
      && node.assetPath.startsWith(
        "/career-world/layers/structures/textures/semantic/kaizen-agent/",
      )
    );
    if (!isProjectTexture && !isRegisteredKaizenSharedTexture) {
      throw new TypeError(`Project ${node.id} has an invalid asset path.`);
    }

    const sourceDimensions = pair(
      node.sourceDimensions,
      `${node.id} source dimensions`,
    );
    const groundAnchor = pair(
      node.groundAnchor,
      `${node.id} ground anchor`,
      true,
    );
    const footprintSpan = pair(
      node.footprintSpan,
      `${node.id} footprint`,
    );
    const territoryAnchor = pair(
      node.territoryAnchor,
      `${node.id} territory anchor`,
      true,
    );
    const contact = terrainContact.worldBounds;
    if (
      territoryAnchor[0] < contact.origin[0]
      || territoryAnchor[1] < contact.origin[1]
      || territoryAnchor[0] > contact.origin[0] + contact.span[0]
      || territoryAnchor[1] > contact.origin[1] + contact.span[1]
    ) {
      throw new TypeError(
        `Project ${node.id} is outside its terrain contact tile.`,
      );
    }

    if (
      territoryAnchor[0] - footprintSpan[0] * groundAnchor[0] < 0
      || territoryAnchor[1] - footprintSpan[1] * groundAnchor[1] < 0
      || territoryAnchor[0] + footprintSpan[0] * (1 - groundAnchor[0]) > 1
      || territoryAnchor[1] + footprintSpan[1] * (1 - groundAnchor[1]) > 1
    ) {
      throw new TypeError(
        `Project ${node.id} exceeds the world plane.`,
      );
    }

    return Object.freeze({
      ...node,
      archetype: node.archetype,
      sourceDimensions,
      groundAnchor,
      footprintSpan,
      territoryAnchor,
      supportedSkillArchetypeIds: Object.freeze([
        ...node.supportedSkillArchetypeIds,
      ]),
      terrainContact,
      territory,
    });
  }),
);

export function resolveProjectAnchor(project: ProjectStructure): Pair {
  return project.territoryAnchor;
}

export function resolveProjectFocusView(
  project: ProjectStructure,
  supportingStructures: readonly ProjectFocusStructure[] = [],
): CameraView {
  const structures = [project, ...supportingStructures];
  const bounds = structures.map((structure) => {
    const [x, y] = structure.territoryAnchor;
    const [width, height] = structure.footprintSpan;
    const [groundX, groundY] = structure.groundAnchor;
    return {
      left: x - width * groundX,
      top: y - height * groundY,
      right: x + width * (1 - groundX),
      bottom: y + height * (1 - groundY),
    };
  });
  const minX = Math.min(...bounds.map(({ left }) => left));
  const maxX = Math.max(...bounds.map(({ right }) => right));
  const minY = Math.min(...bounds.map(({ top }) => top));
  const maxY = Math.max(...bounds.map(({ bottom }) => bottom));
  const minimumSpan = Math.max(
    project.terrainContact.worldBounds.span[0],
    project.terrainContact.worldBounds.span[1],
    project.footprintSpan[0] * 4,
    project.footprintSpan[1] * 4,
  );
  const span = Math.max(
    maxX - minX,
    maxY - minY,
    minimumSpan,
  ) * PROJECT_FOCUS_PADDING_MULTIPLIER;
  const center: Pair = [
    (minX + maxX) * 0.5,
    (minY + maxY) * 0.5,
  ];

  return normalizeCameraView({
    origin: [
      center[0] - span * 0.5,
      center[1] - span * (0.5 + PROJECT_FOCUS_VERTICAL_BIAS),
    ],
    span: [span, span],
  }, DETAIL_POLICY.cameraMinimumSpan);
}
