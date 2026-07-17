import { evidenceTraces } from "../model/evidence-data";
import { randomUnit, stableHash, type Point, type Size } from "./graph-layout";

export const PROJECT_PORTAL_ENTRY_SCALE = 2.15;
export const PROJECT_PORTAL_FOCUS_SCALE = 2.7;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const PROJECT_GAP = 18;

type ProjectHub = {
  id: string;
  anchor: Point;
  point: Point;
  velocity: Point;
};

export function projectPortalFootprint(viewportWidth: number): Size {
  const width =
    viewportWidth <= 620
      ? Math.max(58, Math.min(104, viewportWidth * 0.2 - 8))
      : Math.max(104, Math.min(136, viewportWidth * 0.084));
  return { width, height: viewportWidth <= 620 ? 44 : 48 };
}

function clampHub(point: Point, size: Size, footprint: Size) {
  return {
    x: Math.max(
      footprint.width / 2 + 14,
      Math.min(size.width - footprint.width / 2 - 14, point.x),
    ),
    y: Math.max(
      footprint.height / 2 + 18,
      Math.min(size.height - footprint.height / 2 - 18, point.y),
    ),
  };
}

export function computeProjectPortalLayout(size: Size): Record<string, Point> {
  const { width, height } = size;
  if (width <= 0 || height <= 0) return {};

  const footprint = projectPortalFootprint(width);
  const radiusX = Math.max(40, width * 0.36);
  const radiusY = Math.max(80, height * 0.34);
  const center = { x: width / 2, y: height / 2 };
  const denominator = Math.max(1, evidenceTraces.length - 0.35);
  const hubs: ProjectHub[] = evidenceTraces.map((project, index) => {
    const seed = stableHash(project.id);
    const normalizedRadius = Math.sqrt((index + 0.7) / denominator);
    const angle = index * GOLDEN_ANGLE + randomUnit(seed) * 0.28 - 0.14;
    const radialJitter = 0.92 + randomUnit(seed + 17) * 0.12;
    const anchor = clampHub(
      {
        x:
          center.x +
          Math.cos(angle) * radiusX * normalizedRadius * radialJitter,
        y:
          center.y +
          Math.sin(angle) * radiusY * normalizedRadius * radialJitter,
      },
      size,
      footprint,
    );
    return {
      id: project.id,
      anchor,
      point: { ...anchor },
      velocity: { x: 0, y: 0 },
    };
  });

  for (let iteration = 0; iteration < 320; iteration += 1) {
    const forces = hubs.map(() => ({ x: 0, y: 0 }));
    for (let leftIndex = 0; leftIndex < hubs.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < hubs.length;
        rightIndex += 1
      ) {
        const left = hubs[leftIndex];
        const right = hubs[rightIndex];
        const dx = right.point.x - left.point.x || 0.001;
        const dy = right.point.y - left.point.y || 0.001;
        const overlapX = footprint.width + PROJECT_GAP - Math.abs(dx);
        const overlapY = footprint.height + PROJECT_GAP - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX < overlapY) {
          const push = Math.sign(dx) * overlapX * 0.08;
          forces[leftIndex].x -= push;
          forces[rightIndex].x += push;
        } else {
          const push = Math.sign(dy) * overlapY * 0.08;
          forces[leftIndex].y -= push;
          forces[rightIndex].y += push;
        }
      }
    }

    hubs.forEach((hub, index) => {
      const force = forces[index];
      force.x += (hub.anchor.x - hub.point.x) * 0.0025;
      force.y += (hub.anchor.y - hub.point.y) * 0.0025;
      hub.velocity.x = (hub.velocity.x + force.x) * 0.72;
      hub.velocity.y = (hub.velocity.y + force.y) * 0.72;
      hub.point = clampHub(
        {
          x: hub.point.x + hub.velocity.x,
          y: hub.point.y + hub.velocity.y,
        },
        size,
        footprint,
      );
    });
  }

  return Object.fromEntries(hubs.map((hub) => [hub.id, hub.point]));
}
