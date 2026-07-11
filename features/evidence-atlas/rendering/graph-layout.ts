import { graphEdges, graphNodes } from "../model/evidence-data";

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export function randomUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function normalizeLayoutBounds(
  nodes: Array<{ id: string; x: number; y: number }>,
  { width, height }: Size,
): Record<string, Point> {
  const layoutPaddingX = Math.min(150, Math.max(92, width * 0.075));
  const layoutPaddingY = Math.min(120, Math.max(76, height * 0.08));
  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxY = Math.max(...nodes.map((node) => node.y));
  const xRange = Math.max(1, maxX - minX);
  const yRange = Math.max(1, maxY - minY);
  const usableWidth = Math.max(1, width - layoutPaddingX * 2);
  const usableHeight = Math.max(1, height - layoutPaddingY * 2);
  const verticalCoverage = 0.84;
  const verticalOffset =
    layoutPaddingY + (usableHeight * (1 - verticalCoverage)) / 2;

  return Object.fromEntries(
    nodes.map((node) => [
      node.id,
      {
        x: layoutPaddingX + ((node.x - minX) / xRange) * usableWidth,
        y:
          verticalOffset +
          ((node.y - minY) / yRange) * usableHeight * verticalCoverage,
      },
    ]),
  );
}

export function computeLayout({ width, height }: Size): Record<string, Point> {
  if (width <= 0 || height <= 0) return {};

  const paddingX = Math.min(118, width * 0.1);
  const paddingY = Math.min(104, height * 0.11);
  const nodes = graphNodes.map((node, index) => ({
    id: node.id,
    x: paddingX + randomUnit(index + 10) * (width - paddingX * 2),
    y: paddingY + randomUnit(index + 90) * (height - paddingY * 2),
    vx: 0,
    vy: 0,
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));

  for (let iteration = 0; iteration < 620; iteration += 1) {
    const forces = new Map(nodes.map((node) => [node.id, { x: 0, y: 0 }]));

    for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < nodes.length;
        rightIndex += 1
      ) {
        const left = nodes[leftIndex];
        const right = nodes[rightIndex];
        const dx = right.x - left.x;
        const dy = right.y - left.y;
        const distanceSquared = dx * dx + dy * dy + 100;
        const distance = Math.sqrt(distanceSquared);
        const repulsion = Math.min(4.8, 18000 / distanceSquared);
        const fx = (dx / distance) * repulsion;
        const fy = (dy / distance) * repulsion;
        forces.get(left.id)!.x -= fx;
        forces.get(left.id)!.y -= fy;
        forces.get(right.id)!.x += fx;
        forces.get(right.id)!.y += fy;
      }
    }

    for (const edge of graphEdges) {
      const source = byId.get(edge.source)!;
      const target = byId.get(edge.target)!;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const boundedWeight = Math.min(edge.weight, 14);
      const desired = Math.max(110, 220 - boundedWeight * 8);
      const attraction =
        (distance - desired) * 0.0011 * (1 + boundedWeight * 0.18);
      const fx = (dx / distance) * attraction;
      const fy = (dy / distance) * attraction;
      forces.get(source.id)!.x += fx;
      forces.get(source.id)!.y += fy;
      forces.get(target.id)!.x -= fx;
      forces.get(target.id)!.y -= fy;
    }

    for (const node of nodes) {
      const force = forces.get(node.id)!;
      force.x += (width / 2 - node.x) * 0.00034;
      force.y += (height / 2 - node.y) * 0.00034;
      node.vx = (node.vx + force.x) * 0.82;
      node.vy = (node.vy + force.y) * 0.82;
      node.x = Math.min(width - paddingX, Math.max(paddingX, node.x + node.vx));
      node.y = Math.min(height - paddingY, Math.max(paddingY, node.y + node.vy));
    }
  }

  return normalizeLayoutBounds(nodes, { width, height });
}
