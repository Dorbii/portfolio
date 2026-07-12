import {
  evidenceStrengthByNode,
  graphEdges,
  graphNodes,
  type NodeKind,
  type NodeTone,
} from "../model/evidence-data";
import type { EvidenceQueryResolution } from "../model/evidence-query";
import { randomUnit, type Point, type Size } from "./graph-layout";
import { graphPointToScreen, type GraphViewport } from "./graph-viewport";
import {
  drawVisualTokenSprite,
  visualTokenByNodeId,
  visualTokenForNode,
  visualTokenForProject,
} from "./visual-tokens";

type Rgb = [number, number, number];

export type ParticleFieldInteraction = {
  viewport: GraphViewport;
  cursor: Point | null;
  motionEnabled: boolean;
  occludedRight: number;
};

type ActiveTokenBridge = {
  edgeIndex: number;
  sourceId: string;
  targetId: string;
};

const colors: Record<NodeTone, Rgb> = {
  cyan: [86, 213, 238],
  lime: [190, 226, 91],
  coral: [255, 139, 111],
  violet: [185, 151, 255],
};

const graphNodeById = new Map(graphNodes.map((node) => [node.id, node]));

const fieldTuning = {
  bridgeAlphaActive: 0.5,
  bridgeAlphaIdle: 0.072,
  bridgeParticleBase: 14,
  bridgeParticlePerWeight: 11,
  bridgeParticleActive: 22,
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
  semanticTokenScale: 1.45,
  semanticNodeTokenScale: 1.75,
  semanticTokenCursorRadius: 240,
  semanticTokenMaxBridges: 6,
  motionTimeScale: 0.68,
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

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function semanticZoomLevel(scale: number) {
  return clampUnit((scale - 1.35) / 2.65);
}

export function semanticTokenBridgeLimit(scale: number) {
  if (scale < fieldTuning.semanticTokenScale) return 0;
  return Math.min(
    fieldTuning.semanticTokenMaxBridges,
    1 +
      Math.floor(
        semanticZoomLevel(scale) * (fieldTuning.semanticTokenMaxBridges - 1),
      ),
  );
}

export function particleTransit(time: number, seed: number) {
  const duration = 19_000 + randomUnit(seed + 29) * 23_000;
  const offset = randomUnit(seed + 31) * duration;
  const cycle = (time + offset) / duration;
  const progress = cycle - Math.floor(cycle);
  const endpointDistance = Math.min(progress, 1 - progress);
  return {
    progress: -0.1 + progress * 1.2,
    alpha: clampUnit(endpointDistance / 0.085),
  };
}

function pointFitsVisibleViewport(
  point: Point,
  margin: number,
  size: Size,
  interaction: ParticleFieldInteraction,
) {
  const screenPoint = graphPointToScreen(point, interaction.viewport);
  return (
    screenPoint.x >= -margin &&
    screenPoint.x <= size.width - interaction.occludedRight + margin &&
    screenPoint.y >= -margin &&
    screenPoint.y <= size.height + margin
  );
}

function edgeFitsVisibleViewport(
  source: Point,
  target: Point,
  size: Size,
  interaction: ParticleFieldInteraction,
) {
  const margin = 180;
  const a = graphPointToScreen(source, interaction.viewport);
  const b = graphPointToScreen(target, interaction.viewport);
  const visibleRight = size.width - interaction.occludedRight;
  return !(
    (a.x < -margin && b.x < -margin) ||
    (a.x > visibleRight + margin && b.x > visibleRight + margin) ||
    (a.y < -margin && b.y < -margin) ||
    (a.y > size.height + margin && b.y > size.height + margin)
  );
}

function tokenFitsVisibleViewport(
  point: Point,
  screenSize: number,
  size: Size,
  interaction: ParticleFieldInteraction,
) {
  const screenPoint = graphPointToScreen(point, interaction.viewport);
  const padding = screenSize / 2 + 10;
  return (
    screenPoint.x >= padding &&
    screenPoint.x <= size.width - interaction.occludedRight - padding &&
    screenPoint.y >= padding &&
    screenPoint.y <= size.height - padding
  );
}

export function visualTokenPromotion(
  nodeId: string,
  point: Point,
  selectedIds: ReadonlySet<string>,
  previewId: string | null,
  interaction: ParticleFieldInteraction,
) {
  const { viewport, cursor } = interaction;
  if (
    !visualTokenByNodeId[nodeId] ||
    viewport.scale < fieldTuning.semanticNodeTokenScale
  ) {
    return 0;
  }
  if (selectedIds.has(nodeId)) return 1;
  if (previewId === nodeId) return 0.88;

  if (cursor) {
    const dx = point.x - cursor.x;
    const dy = point.y - cursor.y;
    const radius = fieldTuning.semanticTokenCursorRadius / viewport.scale;
    const proximity = 1 - Math.sqrt(dx * dx + dy * dy) / radius;
    if (proximity > 0) return 0.34 + clampUnit(proximity) * 0.5;
  }

  return semanticZoomLevel(viewport.scale) * 0.58;
}

export function visualTokenEchoCount(kind: NodeKind, promotion: number) {
  if (promotion < 0.28) return 0;
  if (promotion < 0.48) return 1;
  if (promotion < 0.72) {
    if (kind === "capability") return 2;
    if (kind === "technology") return 2;
    return 1;
  }
  if (kind === "capability") return 3;
  if (kind === "technology") return 2;
  return 1;
}

function drawSemanticTokens(
  context: CanvasRenderingContext2D,
  size: Size,
  positions: Record<string, Point>,
  resolution: EvidenceQueryResolution,
  previewId: string | null,
  activeProjectId: string | null,
  interaction: ParticleFieldInteraction,
  activeBridges: ActiveTokenBridge[],
  time: number,
) {
  const bridgeLimit = semanticTokenBridgeLimit(interaction.viewport.scale);
  if (bridgeLimit === 0) return;

  const selectedIds = new Set(resolution.selectedIds);
  const semanticZoom = semanticZoomLevel(interaction.viewport.scale);
  graphNodes.forEach((node, nodeIndex) => {
    const point = positions[node.id];
    if (!point || !visualTokenByNodeId[node.id]) return;
    const promotion = visualTokenPromotion(
      node.id,
      point,
      selectedIds,
      previewId,
      interaction,
    );
    if (promotion <= 0.04) return;

    const strength = evidenceStrengthByNode[node.id] ?? 1;
    const radius =
      fieldTuning.nodeRadiusBase + strength * fieldTuning.nodeRadiusPerStrength;
    const color = colors[node.tone];
    const echoCount = visualTokenEchoCount(node.kind, promotion);
    for (let tokenIndex = 0; tokenIndex <= echoCount; tokenIndex += 1) {
      const isEcho = tokenIndex > 0;
      const seed = (nodeIndex + 1) * 173 + tokenIndex * 47;
      const variantSeed = node.id === "go" && !isEcho ? 0 : seed;
      const token = visualTokenForNode(node.id, variantSeed);
      if (!token) continue;
      const angle = randomUnit(seed) * Math.PI * 2;
      const orbit = radius *
        (isEcho
          ? 0.12 + randomUnit(seed + 7) * 1.08
          : 0.46 + randomUnit(seed + 7) * 0.48);
      const drift = interaction.motionEnabled
        ? Math.sin(time * 0.00032 + seed) *
          (isEcho ? 3.8 : 2.2 + promotion * 2.8)
        : 0;
      const x = point.x + Math.cos(angle) * (orbit * 1.18 + drift);
      const y = point.y + Math.sin(angle) * (orbit * 0.78 + drift * 0.45);
      const baseScreenSize = isEcho
        ? 7 + promotion * 4.2 + semanticZoom * 3 + randomUnit(seed + 13) * 1.8
        : 10 + promotion * 7 + semanticZoom * 9;
      const screenSize = baseScreenSize *
        (token.kind === "image-mask" ? (isEcho ? 1.15 : 1) : 1);
      if (!tokenFitsVisibleViewport({ x, y }, screenSize, size, interaction)) {
        continue;
      }
      const alpha = isEcho
        ? 0.12 + promotion * (0.16 + randomUnit(seed + 17) * 0.11)
        : 0.2 + promotion * 0.64;
      drawVisualTokenSprite(
        context,
        token,
        x,
        y,
        screenSize / interaction.viewport.scale,
        color,
        alpha,
        (randomUnit(seed + 11) - 0.5) * (isEcho ? 0.8 : 0.18),
        !isEcho,
      );
    }
  });

  let renderedBridges = 0;
  const projectToken = visualTokenForProject(activeProjectId);
  for (const bridge of activeBridges) {
    if (renderedBridges >= bridgeLimit) break;
    const selectedEndpoint = resolution.selectedIds.find(
      (nodeId) =>
        (nodeId === bridge.sourceId || nodeId === bridge.targetId) &&
        (projectToken || visualTokenByNodeId[nodeId]),
    );
    const ambientEndpoint =
      !projectToken && resolution.selectedIds.length === 0
        ? (bridge.edgeIndex % 2 === 0
            ? [bridge.sourceId, bridge.targetId]
            : [bridge.targetId, bridge.sourceId]
          ).find((nodeId) => visualTokenByNodeId[nodeId])
        : undefined;
    const tokenEndpoint = selectedEndpoint ?? ambientEndpoint;
    if (!projectToken && !tokenEndpoint) continue;
    const travelSourceId = tokenEndpoint ?? bridge.sourceId;
    const otherEndpoint =
      travelSourceId === bridge.sourceId ? bridge.targetId : bridge.sourceId;
    const source = positions[travelSourceId];
    const target = positions[otherEndpoint];
    const sourceNode = graphNodes.find((node) => node.id === travelSourceId);
    const targetNode = graphNodes.find((node) => node.id === otherEndpoint);
    const token =
      projectToken ?? visualTokenForNode(tokenEndpoint!, bridge.edgeIndex + 9);
    if (!source || !target || !sourceNode || !targetNode || !token) continue;

    const transit = interaction.motionEnabled
      ? particleTransit(time, bridge.edgeIndex * 37 + 9)
      : { progress: 0.5, alpha: 1 };
    const progress = transit.progress;
    const x = source.x + (target.x - source.x) * progress;
    const y = source.y + (target.y - source.y) * progress;
    const screenSize = 18 + semanticZoom * 10;
    if (!tokenFitsVisibleViewport({ x, y }, screenSize, size, interaction)) {
      continue;
    }
    const color = mixColor(
      colors[sourceNode.tone],
      colors[targetNode.tone],
      progress,
    );
    const rotation = Math.atan2(target.y - source.y, target.x - source.x) * 0.08;
    drawVisualTokenSprite(
      context,
      token,
      x,
      y,
      screenSize / interaction.viewport.scale,
      color,
      0.9 * transit.alpha,
      rotation,
    );
    renderedBridges += 1;
  }
}

function prepareFieldContext(
  context: CanvasRenderingContext2D,
  interaction: ParticleFieldInteraction,
) {
  context.save();
  context.translate(interaction.viewport.x, interaction.viewport.y);
  context.scale(interaction.viewport.scale, interaction.viewport.scale);
  context.globalCompositeOperation = "lighter";
}

function activeEvidenceSets(resolution: EvidenceQueryResolution) {
  return {
    recordIds: new Set(
      resolution.supportingRecords.map((record) => record.id),
    ),
    segmentKeys: new Set(
      resolution.pathSegments.map((segment) =>
        [segment.fromId, segment.toId].sort().join("::"),
      ),
    ),
  };
}

function edgeIsActive(
  edge: (typeof graphEdges)[number],
  active: ReturnType<typeof activeEvidenceSets>,
) {
  const edgeKey = [edge.source, edge.target].sort().join("::");
  return active.segmentKeys.size > 0
    ? active.segmentKeys.has(edgeKey)
    : edge.recordIds.some((recordId) => active.recordIds.has(recordId));
}

export function drawParticleFieldBase(
  context: CanvasRenderingContext2D,
  size: Size,
  positions: Record<string, Point>,
  resolution: EvidenceQueryResolution,
  interaction: ParticleFieldInteraction,
) {
  context.clearRect(0, 0, size.width, size.height);
  prepareFieldContext(context, interaction);
  const focusSet = new Set(resolution.selectedIds);
  const relatedNodeIds = new Set(resolution.pathNodeIds);
  const active = activeEvidenceSets(resolution);
  const semanticZoom = semanticZoomLevel(interaction.viewport.scale);
  const particleBudget = 1 - semanticZoom * 0.52;
  const particleOpacity = 1 - semanticZoom * 0.48;

  graphEdges.forEach((edge, edgeIndex) => {
    const source = positions[edge.source];
    const target = positions[edge.target];
    if (
      !source ||
      !target ||
      !edgeFitsVisibleViewport(source, target, size, interaction)
    ) return;

    const sourceNode = graphNodeById.get(edge.source)!;
    const targetNode = graphNodeById.get(edge.target)!;
    const activeCorridor = edgeIsActive(edge, active);
    const baseAlpha =
      fieldTuning.bridgeAlphaIdle * (activeCorridor ? 1.55 : 1) * particleOpacity;
    const count = Math.round(
      (fieldTuning.bridgeParticleBase +
        Math.min(edge.weight, 12) * fieldTuning.bridgeParticlePerWeight) *
        particleBudget,
    );
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const perpendicularX = -dy / distance;
    const perpendicularY = dx / distance;

    for (let particleIndex = 0; particleIndex < count; particleIndex += 1) {
      const seed = edgeIndex * 101 + particleIndex * 19 + 1;
      const progress = -0.08 + randomUnit(seed) * 1.16;
      const spread =
        (randomUnit(seed + 3) - 0.5) *
        (fieldTuning.bridgeSpreadBase +
          distance * fieldTuning.bridgeSpreadRatio);
      const longitudinal = (randomUnit(seed + 5) - 0.5) * 46;
      const x =
        source.x +
        dx * progress +
        (dx / distance) * longitudinal +
        perpendicularX * spread;
      const y =
        source.y +
        dy * progress +
        (dy / distance) * longitudinal +
        perpendicularY * spread;
      const color = mixColor(
        colors[sourceNode.tone],
        colors[targetNode.tone],
        Math.max(0, Math.min(1, progress)),
      );
      context.fillStyle = rgba(
        color,
        baseAlpha * (0.36 + randomUnit(seed + 8) * 0.68),
      );
      const particleSize = randomUnit(seed + 11) > 0.92 ? 1.8 : 0.85;
      context.fillRect(x, y, particleSize, particleSize);
    }
  });

  graphNodes.forEach((node, nodeIndex) => {
    const point = positions[node.id];
    if (!point) return;

    const strength = evidenceStrengthByNode[node.id] ?? 1;
    const selected = focusSet.has(node.id);
    const related = relatedNodeIds.has(node.id);
    const alpha = selected
      ? 1
      : related
        ? fieldTuning.nodeFieldAlphaRelated
        : fieldTuning.nodeFieldAlphaIdle;
    const radius =
      fieldTuning.nodeRadiusBase +
      strength * fieldTuning.nodeRadiusPerStrength;
    if (
      !pointFitsVisibleViewport(
        point,
        radius * interaction.viewport.scale * 1.8,
        size,
        interaction,
      )
    ) return;
    const color = colors[node.tone];
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

    const particleCount = Math.round(
      (fieldTuning.nodeParticleBase +
        strength * fieldTuning.nodeParticlePerStrength) *
        particleBudget,
    );
    for (let particleIndex = 0; particleIndex < particleCount; particleIndex += 1) {
      const seed = nodeIndex * 1009 + particleIndex * 13 + 23;
      const angle = randomUnit(seed) * Math.PI * 2;
      const distance = Math.pow(randomUnit(seed + 4), 0.69) * radius;
      const isSatellite = randomUnit(seed + 18) > 0.7;
      const spreadScale = isSatellite ? fieldTuning.satelliteScale : 1;
      const x =
        point.x +
        Math.cos(angle) * distance * spreadScale * 1.15;
      const y =
        point.y +
        Math.sin(angle) * distance * spreadScale * 0.78;
      context.fillStyle = rgba(
        color,
        alpha *
          particleOpacity *
          (isSatellite ? fieldTuning.nodeParticleSatelliteOpacity : 1) *
          (fieldTuning.nodeParticleAlphaFloor +
            randomUnit(seed + 9) * fieldTuning.nodeParticleAlphaRange),
      );
      const particleSize = randomUnit(seed + 15) > 0.91 ? 1.95 : 0.95;
      context.fillRect(x, y, particleSize, particleSize);
    }
  });

  context.restore();
}

export function drawParticleFieldMotion(
  context: CanvasRenderingContext2D,
  size: Size,
  positions: Record<string, Point>,
  resolution: EvidenceQueryResolution,
  previewId: string | null,
  activeProjectId: string | null,
  time: number,
  interaction: ParticleFieldInteraction,
) {
  const motionTime = time * fieldTuning.motionTimeScale;
  prepareFieldContext(context, interaction);

  const focusSet = new Set(resolution.selectedIds);
  const active = activeEvidenceSets(resolution);
  const activeTokenBridges: ActiveTokenBridge[] = [];
  const semanticZoom = semanticZoomLevel(interaction.viewport.scale);
  const particleOpacity = 1 - semanticZoom * 0.68;

  graphEdges.forEach((edge, edgeIndex) => {
    if (!edgeIsActive(edge, active)) return;
    const source = positions[edge.source];
    const target = positions[edge.target];
    if (
      !source ||
      !target ||
      !edgeFitsVisibleViewport(source, target, size, interaction)
    ) return;

    activeTokenBridges.push({
      edgeIndex,
      sourceId: edge.source,
      targetId: edge.target,
    });
    const sourceNode = graphNodeById.get(edge.source)!;
    const targetNode = graphNodeById.get(edge.target)!;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const perpendicularX = -dy / distance;
    const perpendicularY = dx / distance;
    const count =
      fieldTuning.bridgeParticleActive + Math.min(edge.weight, 12) * 3;

    for (let particleIndex = 0; particleIndex < count; particleIndex += 1) {
      const seed = edgeIndex * 101 + particleIndex * 19 + 1;
      const transit = particleTransit(motionTime, seed);
      const spread =
        (randomUnit(seed + 3) - 0.5) *
        (fieldTuning.bridgeSpreadBase * 0.72 +
          distance * fieldTuning.bridgeSpreadRatio * 0.72);
      const longitudinal = (randomUnit(seed + 5) - 0.5) * 24;
      const drift = Math.sin(motionTime * 0.00022 + seed) * 4.2;
      const x =
        source.x +
        dx * transit.progress +
        (dx / distance) * longitudinal +
        perpendicularX * (spread + drift);
      const y =
        source.y +
        dy * transit.progress +
        (dy / distance) * longitudinal +
        perpendicularY * (spread + drift);
      const color = mixColor(
        colors[sourceNode.tone],
        colors[targetNode.tone],
        clampUnit(transit.progress),
      );
      context.fillStyle = rgba(
        color,
        fieldTuning.bridgeAlphaActive *
          particleOpacity *
          transit.alpha *
          (0.38 + randomUnit(seed + 8) * 0.62),
      );
      const particleSize = randomUnit(seed + 11) > 0.88 ? 2.05 : 0.9;
      context.fillRect(x, y, particleSize, particleSize);
    }
  });

  graphNodes.forEach((node, nodeIndex) => {
    const point = positions[node.id];
    if (!point) return;
    const selected = focusSet.has(node.id);
    const attention = selected ? 1 : previewId === node.id ? 0.78 : 0;
    if (attention <= 0) return;
    const strength = evidenceStrengthByNode[node.id] ?? 1;
    const radius =
      fieldTuning.nodeRadiusBase +
      strength * fieldTuning.nodeRadiusPerStrength;
    if (
      !pointFitsVisibleViewport(
        point,
        radius * interaction.viewport.scale * 2.2,
        size,
        interaction,
      )
    ) return;
    drawAttentionBloom(
      context,
      point,
      colors[node.tone],
      radius,
      attention,
      nodeIndex + 1,
      motionTime,
    );
  });

  context.globalCompositeOperation = "source-over";
  drawSemanticTokens(
    context,
    size,
    positions,
    resolution,
    previewId,
    activeProjectId,
    interaction,
    activeTokenBridges,
    motionTime,
  );
  context.restore();
}
