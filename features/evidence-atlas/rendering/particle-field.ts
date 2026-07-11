import {
  evidenceStrengthByNode,
  graphEdges,
  graphNodes,
  type NodeTone,
} from "../model/evidence-data";
import type { EvidenceQueryResolution } from "../model/evidence-query";
import { randomUnit, type Point, type Size } from "./graph-layout";

type Rgb = [number, number, number];

const colors: Record<NodeTone, Rgb> = {
  cyan: [86, 213, 238],
  lime: [190, 226, 91],
  coral: [255, 139, 111],
  violet: [185, 151, 255],
};

const fieldTuning = {
  bridgeAlphaActive: 0.42,
  bridgeAlphaIdle: 0.072,
  bridgeParticleBase: 14,
  bridgeParticlePerWeight: 11,
  bridgeParticleActive: 34,
  bridgeSpreadBase: 42,
  bridgeSpreadRatio: 0.19,
  nodeRadiusBase: 44,
  nodeRadiusPerStrength: 13,
  nodeParticleBase: 60,
  nodeParticlePerStrength: 48,
  nodeFieldAlphaIdle: 0.46,
  nodeFieldAlphaRelated: 0.76,
  nodeParticleAlphaFloor: 0.24,
  nodeParticleAlphaRange: 0.76,
  nodeParticleSatelliteOpacity: 0.62,
  satelliteScale: 1.62,
};

function rgba(color: Rgb, alpha: number) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function mixColor(left: Rgb, right: Rgb, amount: number): Rgb {
  const eased = amount * amount * (3 - 2 * amount);
  return [
    Math.round(left[0] + (right[0] - left[0]) * eased),
    Math.round(left[1] + (right[1] - left[1]) * eased),
    Math.round(left[2] + (right[2] - left[2]) * eased),
  ];
}

function drawAttentionBloom(
  context: CanvasRenderingContext2D,
  point: Point,
  color: Rgb,
  radius: number,
  strength: number,
  seedBase: number,
  time: number,
) {
  const pulse = 0.94 + (Math.sin(time * 0.0014 + seedBase) + 1) * 0.06;
  const bloomRadius = radius * 2.15 * pulse;
  const bloom = context.createRadialGradient(
    point.x,
    point.y,
    0,
    point.x,
    point.y,
    bloomRadius,
  );
  bloom.addColorStop(0, rgba(color, strength * 0.12));
  bloom.addColorStop(0.22, rgba(color, strength * 0.045));
  bloom.addColorStop(0.62, rgba(color, strength * 0.012));
  bloom.addColorStop(1, rgba(color, 0));
  context.fillStyle = bloom;
  context.beginPath();
  context.arc(point.x, point.y, bloomRadius, 0, Math.PI * 2);
  context.fill();

  const particleCount = Math.round(84 + strength * 76);
  for (let particleIndex = 0; particleIndex < particleCount; particleIndex += 1) {
    const seed = seedBase * 911 + particleIndex * 31;
    const angle = randomUnit(seed) * Math.PI * 2;
    const distance = Math.pow(randomUnit(seed + 3), 0.74) * bloomRadius;
    const drift = Math.sin(time * 0.00065 + seed) * 3.5 * strength;
    context.fillStyle = rgba(
      color,
      strength * (0.08 + randomUnit(seed + 7) * 0.25),
    );
    const particleSize = randomUnit(seed + 11) > 0.86 ? 1.65 : 0.8;
    context.fillRect(
      point.x + Math.cos(angle) * (distance * 1.28 + drift),
      point.y + Math.sin(angle) * (distance * 0.7 + drift * 0.45),
      particleSize,
      particleSize,
    );
  }
}

export function drawParticleField(
  context: CanvasRenderingContext2D,
  size: Size,
  positions: Record<string, Point>,
  resolution: EvidenceQueryResolution,
  previewId: string | null,
  time: number,
) {
  context.clearRect(0, 0, size.width, size.height);
  context.globalCompositeOperation = "lighter";

  const focusSet = new Set(resolution.selectedIds);
  const activeRecordIds = new Set(
    resolution.supportingRecords.map((record) => record.id),
  );
  const relatedNodeIds = new Set(resolution.pathNodeIds);
  const activeSegmentKeys = new Set(
    resolution.pathSegments.map((segment) =>
      [segment.fromId, segment.toId].sort().join("::"),
    ),
  );

  graphEdges.forEach((edge, edgeIndex) => {
    const source = positions[edge.source];
    const target = positions[edge.target];
    if (!source || !target) return;

    const sourceNode = graphNodes.find((node) => node.id === edge.source)!;
    const targetNode = graphNodes.find((node) => node.id === edge.target)!;
    const edgeKey = [edge.source, edge.target].sort().join("::");
    const edgeIsActive =
      activeSegmentKeys.size > 0
        ? activeSegmentKeys.has(edgeKey)
        : edge.recordIds.some((recordId) => activeRecordIds.has(recordId));
    const baseAlpha = edgeIsActive
      ? fieldTuning.bridgeAlphaActive
      : fieldTuning.bridgeAlphaIdle;
    const activeFlow = edgeIsActive ? (time * 0.0001) % 1 : 0;
    const count =
      fieldTuning.bridgeParticleBase +
      Math.min(edge.weight, 12) * fieldTuning.bridgeParticlePerWeight +
      (edgeIsActive ? fieldTuning.bridgeParticleActive : 0);
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const perpendicularX = -dy / distance;
    const perpendicularY = dx / distance;

    for (let particleIndex = 0; particleIndex < count; particleIndex += 1) {
      const seed = edgeIndex * 101 + particleIndex * 19 + 1;
      const progress = edgeIsActive
        ? -0.08 + (randomUnit(seed) + activeFlow) % 1.16
        : -0.08 + randomUnit(seed) * 1.16;
      const spread =
        (randomUnit(seed + 3) - 0.5) *
        (fieldTuning.bridgeSpreadBase +
          distance * fieldTuning.bridgeSpreadRatio);
      const longitudinal = (randomUnit(seed + 5) - 0.5) * 46;
      const drift = Math.sin(time * 0.00022 + seed) * 4.8;
      const x =
        source.x +
        dx * progress +
        (dx / distance) * longitudinal +
        perpendicularX * (spread + drift);
      const y =
        source.y +
        dy * progress +
        (dy / distance) * longitudinal +
        perpendicularY * (spread + drift);
      const color = mixColor(
        colors[sourceNode.tone],
        colors[targetNode.tone],
        Math.max(0, Math.min(1, progress)),
      );
      context.fillStyle = rgba(
        color,
        baseAlpha * (0.36 + randomUnit(seed + 8) * 0.68),
      );
      const particleSize =
        randomUnit(seed + 11) > (edgeIsActive ? 0.86 : 0.92) ? 2.1 : 0.9;
      context.fillRect(x, y, particleSize, particleSize);
    }
  });

  graphNodes.forEach((node, nodeIndex) => {
    const point = positions[node.id];
    if (!point) return;

    const strength = evidenceStrengthByNode[node.id] ?? 1;
    const selected = focusSet.has(node.id);
    const related = relatedNodeIds.has(node.id);
    const attention = selected ? 1 : previewId === node.id ? 0.78 : 0;
    const alpha = selected
      ? 1
      : related
        ? fieldTuning.nodeFieldAlphaRelated
        : fieldTuning.nodeFieldAlphaIdle;
    const radius =
      fieldTuning.nodeRadiusBase +
      strength * fieldTuning.nodeRadiusPerStrength;
    const color = colors[node.tone];
    if (attention > 0) {
      drawAttentionBloom(
        context,
        point,
        color,
        radius,
        attention,
        nodeIndex + 1,
        time,
      );
    }
    const glow = context.createRadialGradient(
      point.x,
      point.y,
      0,
      point.x,
      point.y,
      radius,
    );
    glow.addColorStop(0, rgba(color, alpha * 0.2));
    glow.addColorStop(0.28, rgba(color, alpha * 0.075));
    glow.addColorStop(1, rgba(color, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();

    const particleCount =
      fieldTuning.nodeParticleBase +
      strength * fieldTuning.nodeParticlePerStrength;
    for (let particleIndex = 0; particleIndex < particleCount; particleIndex += 1) {
      const seed = nodeIndex * 1009 + particleIndex * 13 + 23;
      const angle = randomUnit(seed) * Math.PI * 2;
      const distance = Math.pow(randomUnit(seed + 4), 0.69) * radius;
      const isSatellite = randomUnit(seed + 18) > 0.7;
      const spreadScale = isSatellite ? fieldTuning.satelliteScale : 1;
      const drift = Math.sin(time * 0.0003 + seed) * (selected ? 3.8 : 2);
      const x =
        point.x +
        Math.cos(angle) * (distance * spreadScale * 1.15 + drift);
      const y =
        point.y +
        Math.sin(angle) * (distance * spreadScale * 0.78 + drift);
      context.fillStyle = rgba(
        color,
        alpha *
          (isSatellite ? fieldTuning.nodeParticleSatelliteOpacity : 1) *
          (fieldTuning.nodeParticleAlphaFloor +
            randomUnit(seed + 9) * fieldTuning.nodeParticleAlphaRange),
      );
      const particleSize = randomUnit(seed + 15) > 0.91 ? 1.95 : 0.95;
      context.fillRect(x, y, particleSize, particleSize);
    }
  });

  context.globalCompositeOperation = "source-over";
}
