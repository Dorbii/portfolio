import { graphNodes } from "../model/evidence-data";
import { projectSkillRelationshipsByNode } from "../model/project-relations";

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export function randomUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

type LayoutNode = {
  id: string;
  anchor: Point;
  footprint: Size;
};

export function graphNodeFootprint(nodeId: string): Size {
  const label = graphNodes.find((node) => node.id === nodeId)?.label ?? nodeId;
  return {
    width: Math.max(44, Math.min(170, 29 + label.length * 7.1)),
    height: 44,
  };
}

function projectFootprint(viewportWidth: number): Size {
  const width =
    viewportWidth <= 620
      ? Math.max(58, Math.min(104, viewportWidth * 0.2 - 8))
      : Math.max(104, Math.min(136, viewportWidth * 0.084));
  return { width, height: viewportWidth <= 620 ? 44 : 48 };
}

function clampNodePoint(
  point: Point,
  footprint: Size,
  size: Size,
  edgePadding: number,
) {
  return {
    x: Math.min(
      size.width - footprint.width / 2 - edgePadding,
      Math.max(footprint.width / 2 + edgePadding, point.x),
    ),
    y: Math.min(
      size.height - footprint.height / 2 - edgePadding,
      Math.max(footprint.height / 2 + edgePadding, point.y),
    ),
  };
}

function overlaps(
  leftPoint: Point,
  leftFootprint: Size,
  rightPoint: Point,
  rightFootprint: Size,
  gap: number,
) {
  return (
    Math.abs(leftPoint.x - rightPoint.x) <
      (leftFootprint.width + rightFootprint.width) / 2 + gap &&
    Math.abs(leftPoint.y - rightPoint.y) <
      (leftFootprint.height + rightFootprint.height) / 2 + gap
  );
}

function placementIsClear(
  point: Point,
  footprint: Size,
  placed: Array<{ point: Point; footprint: Size }>,
  projectPositions: Record<string, Point>,
  portalFootprint: Size,
  gap: number,
) {
  return (
    placed.every(
      (item) => !overlaps(point, footprint, item.point, item.footprint, gap),
    ) &&
    Object.values(projectPositions).every(
      (project) =>
        !overlaps(point, footprint, project, portalFootprint, gap + 2),
    )
  );
}

function placeNode(
  node: LayoutNode,
  placed: Array<{ point: Point; footprint: Size }>,
  projectPositions: Record<string, Point>,
  portalFootprint: Size,
  size: Size,
  edgePadding: number,
  gap: number,
) {
  const seed = stableHash(node.id);
  const initial = clampNodePoint(
    node.anchor,
    node.footprint,
    size,
    edgePadding,
  );
  if (
    placementIsClear(
      initial,
      node.footprint,
      placed,
      projectPositions,
      portalFootprint,
      gap,
    )
  ) {
    return initial;
  }

  const angleOffset = randomUnit(seed + 97) * Math.PI * 2;
  for (let index = 1; index <= 1_800; index += 1) {
    const radius = 8.5 * Math.sqrt(index);
    const angle = angleOffset + index * Math.PI * (3 - Math.sqrt(5));
    const candidate = clampNodePoint(
      {
        x: node.anchor.x + Math.cos(angle) * radius,
        y: node.anchor.y + Math.sin(angle) * radius * 1.18,
      },
      node.footprint,
      size,
      edgePadding,
    );
    if (
      placementIsClear(
        candidate,
        node.footprint,
        placed,
        projectPositions,
        portalFootprint,
        gap,
      )
    ) {
      return candidate;
    }
  }

  let fallback: Point | null = null;
  let fallbackDistance = Number.POSITIVE_INFINITY;
  const minimumX = node.footprint.width / 2 + edgePadding;
  const maximumX = size.width - node.footprint.width / 2 - edgePadding;
  const minimumY = node.footprint.height / 2 + edgePadding;
  const maximumY = size.height - node.footprint.height / 2 - edgePadding;
  const scanStep = size.width <= 620 ? 3 : 5;
  for (let y = minimumY; y <= maximumY; y += scanStep) {
    for (let x = minimumX; x <= maximumX; x += scanStep) {
      const candidate = { x, y };
      if (
        !placementIsClear(
          candidate,
          node.footprint,
          placed,
          projectPositions,
          portalFootprint,
          gap,
        )
      ) {
        continue;
      }
      const distance = Math.hypot(x - node.anchor.x, y - node.anchor.y);
      if (distance < fallbackDistance) {
        fallback = candidate;
        fallbackDistance = distance;
      }
    }
  }
  return fallback ?? initial;
}

function weightedProjectAnchor(
  nodeId: string,
  projectPositions: Record<string, Point>,
  size: Size,
) {
  const relationships = projectSkillRelationshipsByNode.get(nodeId) ?? [];
  const available = relationships.filter(
    (relationship) => projectPositions[relationship.projectId],
  );
  if (available.length === 0) {
    return { point: { x: size.width / 2, y: size.height / 2 }, count: 0 };
  }

  const totalWeight = available.reduce(
    (total, relationship) => total + relationship.layoutWeight,
    0,
  );
  const point = available.reduce(
    (anchor, relationship) => {
      const project = projectPositions[relationship.projectId];
      anchor.x += (project.x * relationship.layoutWeight) / totalWeight;
      anchor.y += (project.y * relationship.layoutWeight) / totalWeight;
      return anchor;
    },
    { x: 0, y: 0 },
  );
  return { point, count: available.length };
}

export function computeLayout(
  { width, height }: Size,
  projectPositions: Record<string, Point> = {},
): Record<string, Point> {
  if (width <= 0 || height <= 0) return {};

  const edgePadding = width <= 620 ? 6 : 14;
  const nodes: LayoutNode[] = graphNodes.map((node) => {
    const seed = stableHash(node.id);
    const { point: barycenter, count } = weightedProjectAnchor(
      node.id,
      projectPositions,
      { width, height },
    );
    const angle = randomUnit(seed) * Math.PI * 2;
    const compact = width <= 620;
    const orbit =
      count === 1
        ? 112 + randomUnit(seed + 19) * 62
        : compact
          ? 30 + randomUnit(seed + 19) * 54
          : 64 + randomUnit(seed + 19) * 74;
    const anchor = {
      x: barycenter.x + Math.cos(angle) * orbit,
      y:
        barycenter.y +
        Math.sin(angle) * orbit * (compact ? 0.78 : 0.88),
    };
    return {
      id: node.id,
      anchor,
      footprint: graphNodeFootprint(node.id),
    };
  });

  const portalFootprint = projectFootprint(width);
  const gap = width <= 620 ? 3 : 14;
  const relationshipCount = (nodeId: string) =>
    projectSkillRelationshipsByNode.get(nodeId)?.length ?? 0;
  const placementOrder = [...nodes].sort(
    (left, right) =>
      relationshipCount(left.id) - relationshipCount(right.id) ||
      right.footprint.width - left.footprint.width ||
      left.id.localeCompare(right.id),
  );
  const placed: Array<{ id: string; point: Point; footprint: Size }> = [];
  for (const node of placementOrder) {
    const point = placeNode(
      node,
      placed,
      projectPositions,
      portalFootprint,
      { width, height },
      edgePadding,
      gap,
    );
    placed.push({ id: node.id, point, footprint: node.footprint });
  }

  return Object.fromEntries(placed.map((node) => [node.id, node.point]));
}
