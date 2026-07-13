import {
  evidenceStrengthByNode,
  graphEdges,
  graphNodes,
  type NodeKind,
} from "../model/evidence-data";
import { nodeDomainById } from "../model/node-domains";
import type { EvidenceQueryResolution } from "../model/evidence-query";
import { randomUnit, type Point, type Size } from "./graph-layout";
import { graphPointToScreen, type GraphViewport } from "./graph-viewport";
import {
  drawVisualTokenSprite,
  visualTokenByNodeId,
  visualTokenForNode,
  visualTokenForProject,
} from "./visual-tokens";

type Rgb = readonly [number, number, number];
type AmbientGlyphProfile = "low" | "balanced" | "high";

const ambientGlyphs = ["<>", "{}", "[]", "=>", "01", "//", ">_"] as const;
const ambientGlyphProfiles: Record<
  AmbientGlyphProfile,
  { overview: number; deep: number }
> = {
  low: { overview: 0.006, deep: 0.018 },
  balanced: { overview: 0.012, deep: 0.035 },
  high: { overview: 0.02, deep: 0.06 },
};
const activeAmbientGlyphProfile: AmbientGlyphProfile = "balanced";

export type ParticleFieldInteraction = {
  viewport: GraphViewport;
  cursor: Point | null;
  motionEnabled: boolean;
  occludedRight: number;
};

export type SelectionWake = {
  nodeId: string;
  startedAt: number;
};

type ActiveTokenBridge = {
  edgeIndex: number;
  sourceId: string;
  targetId: string;
};

const graphNodeById = new Map(graphNodes.map((node) => [node.id, node]));

const fieldTuning = {
  baseTextureDensity: 0.92,
  baseTextureOpacity: 0.9,
  bridgeAlphaActive: 0.5,
  bridgeAlphaIdle: 0.11,
  bridgeParticleBase: 14,
  bridgeParticlePerWeight: 11,
  bridgeParticleActive: 22,
  bridgeParticleAmbientScale: 0.6,
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
  semanticTokenScale: 1.65,
  semanticTokenFullScale: 4.2,
  semanticNodeTokenScale: 1.8,
  semanticNodeTokenFullScale: 4,
  semanticTokenCursorRadius: 240,
  semanticTokenMaxBridges: 6,
  dataBurstMaxConcurrent: 2,
  dataBurstSlotDuration: 9_000,
  dataBurstTrailLength: 8,
  motionTimeScale: 0.68,
  selectionWakeDuration: 1_050,
  selectionWakeMaxEdges: 5,
};

export const SELECTION_WAKE_DURATION_MS = fieldTuning.selectionWakeDuration;

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

function smoothstep(start: number, end: number, value: number) {
  const progress = clampUnit((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
}

export function selectionWakeFrame(
  wake: SelectionWake | null,
  time: number,
  motionEnabled = true,
) {
  if (!wake) {
    return { active: false, progress: 0, envelope: 0, staticEmphasis: false };
  }
  if (!motionEnabled) {
    return { active: true, progress: 1, envelope: 0.72, staticEmphasis: true };
  }

  const elapsed = time - wake.startedAt;
  if (elapsed < 0 || elapsed > fieldTuning.selectionWakeDuration) {
    return { active: false, progress: 0, envelope: 0, staticEmphasis: false };
  }
  const progress = clampUnit(elapsed / fieldTuning.selectionWakeDuration);
  return {
    active: true,
    progress,
    envelope:
      smoothstep(0, 0.1, progress) * (1 - smoothstep(0.82, 1, progress)),
    staticEmphasis: false,
  };
}

export function selectionWakeEdgeTuning(weight: number) {
  const strength = clampUnit(weight / 12);
  return {
    particleCount: Math.round(10 + Math.min(weight, 12) * 3),
    speed: 0.86 + strength * 0.38,
    strength,
  };
}

export function selectionWakeEdges(nodeId: string) {
  return graphEdges
    .filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .sort((left, right) => right.weight - left.weight)
    .slice(0, fieldTuning.selectionWakeMaxEdges);
}

export function semanticZoomLevel(scale: number) {
  return clampUnit((scale - 1.35) / 2.65);
}

export function ambientGlyphDensity(
  scale: number,
  profile: AmbientGlyphProfile = activeAmbientGlyphProfile,
) {
  const density = ambientGlyphProfiles[profile];
  const zoom = semanticZoomLevel(scale);
  return density.overview + (density.deep - density.overview) * zoom;
}

export function ambientGlyphForSeed(seed: number, density: number) {
  if (randomUnit(seed + 41) >= density) return null;
  const glyphIndex = Math.floor(randomUnit(seed + 47) * ambientGlyphs.length);
  return ambientGlyphs[glyphIndex] ?? ambientGlyphs[0];
}

function drawAmbientParticle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  particleSize: number,
  color: Rgb,
  alpha: number,
  seed: number,
  glyphDensity: number,
) {
  const glyph = ambientGlyphForSeed(seed, glyphDensity);
  context.fillStyle = rgba(color, glyph ? Math.min(1, alpha * 1.16) : alpha);
  if (glyph) {
    context.fillText(glyph, x, y);
    return;
  }
  context.fillRect(x, y, particleSize, particleSize);
}

function drawAtmosphereParticle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: Rgb,
  alpha: number,
  seed: number,
  viewportScale: number,
) {
  const screenSize = randomUnit(seed + 53) > 0.95 ? 0.92 : 0.58;
  const particleSize = screenSize / viewportScale;
  context.fillStyle = rgba(color, alpha);
  context.fillRect(
    x - particleSize / 2,
    y - particleSize / 2,
    particleSize,
    particleSize,
  );
}

export function semanticTokenReveal(scale: number) {
  return smoothstep(
    fieldTuning.semanticTokenScale,
    fieldTuning.semanticTokenFullScale,
    scale,
  );
}

export function semanticNodeTokenReveal(scale: number) {
  return smoothstep(
    fieldTuning.semanticNodeTokenScale,
    fieldTuning.semanticNodeTokenFullScale,
    scale,
  );
}

export function semanticTokenBridgePopulation(scale: number) {
  return semanticTokenReveal(scale) * fieldTuning.semanticTokenMaxBridges;
}

export function semanticTokenBridgeLimit(scale: number) {
  return Math.ceil(semanticTokenBridgePopulation(scale));
}

export function semanticTokenBridgeOpacity(scale: number, index: number) {
  return clampUnit(semanticTokenBridgePopulation(scale) - index);
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

function tokenViewportVisibility(
  point: Point,
  size: Size,
  interaction: ParticleFieldInteraction,
) {
  const screenPoint = graphPointToScreen(point, interaction.viewport);
  const visibleRight = size.width - interaction.occludedRight;
  const edgeDistance = Math.min(
    screenPoint.x,
    visibleRight - screenPoint.x,
    screenPoint.y,
    size.height - screenPoint.y,
  );
  return smoothstep(6, 44, edgeDistance);
}

export function semanticTokenOrbit(
  time: number,
  seed: number,
  motionEnabled = true,
) {
  const direction = randomUnit(seed + 23) > 0.5 ? 1 : -1;
  const speed = 0.000018 + randomUnit(seed + 29) * 0.000026;
  return {
    angle:
      randomUnit(seed) * Math.PI * 2 +
      (motionEnabled ? time * speed * direction : 0),
    breathe: motionEnabled ? 1 + Math.sin(time * 0.00025 + seed) * 0.045 : 1,
  };
}

export function dataBurstWindow(time: number, motionEnabled = true) {
  if (!motionEnabled) {
    return {
      active: false,
      progress: 0,
      envelope: 0,
      slot: 0,
      streamCount: 0,
      bridgeOffset: 0,
    };
  }

  const slot = Math.floor(Math.max(0, time) / fieldTuning.dataBurstSlotDuration);
  const phase = Math.max(0, time) - slot * fieldTuning.dataBurstSlotDuration;
  const seed = slot * 307 + 97;
  const start = 900 + randomUnit(seed + 3) * 5_600;
  const duration = 300 + randomUnit(seed + 7) * 180;
  const active = phase >= start && phase < start + duration;
  const progress = active ? clampUnit((phase - start) / duration) : 0;
  const envelope = active
    ? smoothstep(0, 0.08, progress) * (1 - smoothstep(0.82, 1, progress))
    : 0;

  return {
    active,
    progress,
    envelope,
    slot,
    streamCount: randomUnit(seed + 13) > 0.86 ? 2 : 1,
    bridgeOffset: randomUnit(seed + 17),
  };
}

export function visualTokenPromotion(
  nodeId: string,
  point: Point,
  selectedIds: ReadonlySet<string>,
  previewId: string | null,
  interaction: ParticleFieldInteraction,
) {
  const { viewport, cursor } = interaction;
  if (!visualTokenByNodeId[nodeId]) return 0;
  const zoomReveal = semanticNodeTokenReveal(viewport.scale);
  if (zoomReveal <= 0) return 0;
  if (selectedIds.has(nodeId)) return zoomReveal;
  if (previewId === nodeId) return zoomReveal * 0.88;

  if (cursor) {
    const dx = point.x - cursor.x;
    const dy = point.y - cursor.y;
    const radius = fieldTuning.semanticTokenCursorRadius / viewport.scale;
    const proximity = 1 - Math.sqrt(dx * dx + dy * dy) / radius;
    if (proximity > 0) {
      return zoomReveal * (0.38 + clampUnit(proximity) * 0.46);
    }
  }

  return zoomReveal * 0.46;
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
    const color = nodeDomainById[node.primaryDomain].color;
    const maxEchoCount = visualTokenEchoCount(node.kind, 1);
    for (let tokenIndex = 0; tokenIndex <= maxEchoCount; tokenIndex += 1) {
      const isEcho = tokenIndex > 0;
      const revealStart = isEcho ? 0.22 + (tokenIndex - 1) * 0.2 : 0;
      const layerReveal = smoothstep(
        revealStart,
        Math.min(1, revealStart + (isEcho ? 0.26 : 0.3)),
        promotion,
      );
      if (layerReveal <= 0.01) continue;
      const seed = (nodeIndex + 1) * 173 + tokenIndex * 47;
      const variantSeed = node.id === "go" && !isEcho ? 0 : seed;
      const token = visualTokenForNode(node.id, variantSeed);
      if (!token) continue;
      const orbitState = semanticTokenOrbit(
        time,
        seed,
        interaction.motionEnabled,
      );
      const orbit = radius *
        (isEcho
          ? 0.12 + randomUnit(seed + 7) * 1.08
          : 0.46 + randomUnit(seed + 7) * 0.48);
      const x =
        point.x +
        Math.cos(orbitState.angle) * orbit * 1.18 * orbitState.breathe;
      const y =
        point.y +
        Math.sin(orbitState.angle) * orbit * 0.78 * orbitState.breathe;
      const baseScreenSize = isEcho
        ? 4.1 + layerReveal * 1.4 + semanticZoom * 1.3 + randomUnit(seed + 13) * 0.7
        : 6.2 + layerReveal * 2.2 + semanticZoom * 1.8;
      const screenSize = baseScreenSize *
        (token.kind === "image-mask" ? 1.05 : 1);
      if (!tokenFitsVisibleViewport({ x, y }, screenSize, size, interaction)) {
        continue;
      }
      const viewportVisibility = tokenViewportVisibility(
        { x, y },
        size,
        interaction,
      );
      const alpha = isEcho
        ? layerReveal * viewportVisibility *
          (0.035 + promotion * (0.08 + randomUnit(seed + 17) * 0.05))
        : layerReveal * viewportVisibility * (0.045 + promotion * 0.24);
      drawVisualTokenSprite(
        context,
        token,
        x,
        y,
        screenSize / interaction.viewport.scale,
        color,
        alpha,
        (randomUnit(seed + 11) - 0.5) * (isEcho ? 0.42 : 0.12),
        !isEcho && layerReveal > 0.45,
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
    const screenSize = 7.2 + semanticZoom * 2.4;
    if (!tokenFitsVisibleViewport({ x, y }, screenSize, size, interaction)) {
      continue;
    }
    const viewportVisibility = tokenViewportVisibility(
      { x, y },
      size,
      interaction,
    );
    const bridgeOpacity = semanticTokenBridgeOpacity(
      interaction.viewport.scale,
      renderedBridges,
    );
    const color = mixColor(
      nodeDomainById[sourceNode.primaryDomain].color,
      nodeDomainById[targetNode.primaryDomain].color,
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
      0.52 * bridgeOpacity * viewportVisibility * transit.alpha,
      rotation,
      bridgeOpacity > 0.55,
    );
    renderedBridges += 1;
  }
}

function drawDataBursts(
  context: CanvasRenderingContext2D,
  positions: Record<string, Point>,
  activeBridges: ActiveTokenBridge[],
  time: number,
  interaction: ParticleFieldInteraction,
) {
  const burst = dataBurstWindow(time, interaction.motionEnabled);
  if (!burst.active || burst.envelope <= 0.01 || activeBridges.length === 0) {
    return;
  }

  const semanticZoom = semanticZoomLevel(interaction.viewport.scale);
  const fontSize = 6.4 + semanticZoom * 1.3;
  const trailSpacing = 8 / interaction.viewport.scale;
  const laneSpread = 14 / interaction.viewport.scale;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `600 ${fontSize / interaction.viewport.scale}px "Cascadia Code", Consolas, monospace`;

  const streamCount = Math.min(
    burst.streamCount,
    fieldTuning.dataBurstMaxConcurrent,
    activeBridges.length,
  );
  const firstBridgeIndex = Math.floor(burst.bridgeOffset * activeBridges.length);
  for (let streamIndex = 0; streamIndex < streamCount; streamIndex += 1) {
    const bridge =
      activeBridges[(firstBridgeIndex + streamIndex * 3) % activeBridges.length];
    const reverse =
      randomUnit(burst.slot * 191 + bridge.edgeIndex * 17 + streamIndex) > 0.5;

    const firstId = reverse ? bridge.targetId : bridge.sourceId;
    const secondId = reverse ? bridge.sourceId : bridge.targetId;
    const source = positions[firstId];
    const target = positions[secondId];
    const sourceNode = graphNodeById.get(firstId);
    const targetNode = graphNodeById.get(secondId);
    if (!source || !target || !sourceNode || !targetNode) continue;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const perpendicularX = -dy / distance;
    const perpendicularY = dx / distance;
    const laneOffset =
      (randomUnit(bridge.edgeIndex * 307 + 149) - 0.5) * laneSpread;
    const trailProgress = trailSpacing / distance;

    for (
      let bitIndex = 0;
      bitIndex < fieldTuning.dataBurstTrailLength;
      bitIndex += 1
    ) {
      const progress = burst.progress - bitIndex * trailProgress;
      if (progress < 0 || progress > 1) continue;
      const x =
        source.x + dx * progress + perpendicularX * laneOffset;
      const y =
        source.y + dy * progress + perpendicularY * laneOffset;
      const color = mixColor(
        nodeDomainById[sourceNode.primaryDomain].color,
        nodeDomainById[targetNode.primaryDomain].color,
        progress,
      );
      const trailStrength = 1 - bitIndex / fieldTuning.dataBurstTrailLength;
      const alpha = burst.envelope * Math.pow(trailStrength, 1.45) * 0.78;
      context.fillStyle = rgba(color, alpha);
      context.shadowColor = rgba(color, alpha * 0.86);
      context.shadowBlur = bitIndex === 0 ? 7 / interaction.viewport.scale : 0;
      context.fillText(
        randomUnit(bridge.edgeIndex * 131 + bitIndex * 29 + 5) > 0.5
          ? "1"
          : "0",
        x,
        y,
      );
    }
  }

  context.shadowBlur = 0;
}

function drawWakeBloom(
  context: CanvasRenderingContext2D,
  point: Point,
  color: Rgb,
  radius: number,
  strength: number,
) {
  const bloom = context.createRadialGradient(
    point.x,
    point.y,
    0,
    point.x,
    point.y,
    radius,
  );
  bloom.addColorStop(0, rgba(color, strength * 0.24));
  bloom.addColorStop(0.28, rgba(color, strength * 0.08));
  bloom.addColorStop(1, rgba(color, 0));
  context.fillStyle = bloom;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawSelectionWake(
  context: CanvasRenderingContext2D,
  size: Size,
  positions: Record<string, Point>,
  wake: SelectionWake | null,
  time: number,
  interaction: ParticleFieldInteraction,
) {
  const frame = selectionWakeFrame(wake, time, interaction.motionEnabled);
  if (!wake || !frame.active) return;
  const source = positions[wake.nodeId];
  const sourceNode = graphNodeById.get(wake.nodeId);
  if (!source || !sourceNode) return;

  const sourceColor = nodeDomainById[sourceNode.primaryDomain].color;
  const sourceRadius =
    fieldTuning.nodeRadiusBase +
    (evidenceStrengthByNode[wake.nodeId] ?? 1) *
      fieldTuning.nodeRadiusPerStrength;
  drawWakeBloom(
    context,
    source,
    sourceColor,
    sourceRadius * 1.55,
    frame.staticEmphasis ? 0.58 : frame.envelope * (1 - frame.progress) * 0.72,
  );

  const edges = selectionWakeEdges(wake.nodeId);
  const semanticZoom = semanticZoomLevel(interaction.viewport.scale);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `600 ${6.8 / interaction.viewport.scale}px "Cascadia Code", Consolas, monospace`;

  edges.forEach((edge, edgeIndex) => {
    const targetId = edge.source === wake.nodeId ? edge.target : edge.source;
    const target = positions[targetId];
    const targetNode = graphNodeById.get(targetId);
    if (
      !target ||
      !targetNode ||
      !edgeFitsVisibleViewport(source, target, size, interaction)
    ) return;

    const targetColor = nodeDomainById[targetNode.primaryDomain].color;
    const tuning = selectionWakeEdgeTuning(edge.weight);
    if (frame.staticEmphasis) {
      const targetRadius =
        fieldTuning.nodeRadiusBase +
        (evidenceStrengthByNode[targetId] ?? 1) *
          fieldTuning.nodeRadiusPerStrength;
      drawWakeBloom(
        context,
        target,
        targetColor,
        targetRadius * 1.35,
        0.28 + tuning.strength * 0.24,
      );
      return;
    }

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const direction = Math.atan2(dy, dx);
    const perpendicularX = -dy / distance;
    const perpendicularY = dx / distance;
    const leadingProgress = clampUnit(frame.progress * tuning.speed);

    for (
      let particleIndex = 0;
      particleIndex < tuning.particleCount;
      particleIndex += 1
    ) {
      const seed = edgeIndex * 1_009 + particleIndex * 37 + 211;
      const trail =
        (particleIndex / tuning.particleCount) *
        (0.24 - tuning.strength * 0.08);
      const progress =
        leadingProgress - trail + (randomUnit(seed + 3) - 0.5) * 0.035;
      if (progress <= 0 || progress >= 1) continue;
      const spread =
        (randomUnit(seed + 7) - 0.5) *
        (9 + distance * 0.024) *
        (0.55 + frame.envelope * 0.45);
      const x = source.x + dx * progress + perpendicularX * spread;
      const y = source.y + dy * progress + perpendicularY * spread;
      const color = mixColor(sourceColor, targetColor, progress);
      const trailStrength = 1 - particleIndex / tuning.particleCount;
      const alpha =
        frame.envelope *
        (0.28 + tuning.strength * 0.36) *
        (0.5 + trailStrength * 0.5);

      if (particleIndex > 0 && particleIndex % 7 === 0) {
        context.save();
        context.translate(x, y);
        context.rotate(direction);
        context.fillStyle = rgba(color, alpha * 0.92);
        context.fillText(
          ambientGlyphs[(edgeIndex + particleIndex) % ambientGlyphs.length],
          0,
          0,
        );
        context.restore();
      } else {
        const particleSize =
          (randomUnit(seed + 13) > 0.84 ? 2.2 : 1.1) /
          interaction.viewport.scale;
        context.fillStyle = rgba(color, alpha);
        context.fillRect(x, y, particleSize, particleSize);
      }
    }

    const arrival =
      smoothstep(0.72, 0.9, leadingProgress) *
      (1 - smoothstep(0.9, 1, frame.progress));
    if (arrival > 0.01) {
      const targetRadius =
        fieldTuning.nodeRadiusBase +
        (evidenceStrengthByNode[targetId] ?? 1) *
          fieldTuning.nodeRadiusPerStrength;
      drawWakeBloom(
        context,
        target,
        targetColor,
        targetRadius * 1.45,
        arrival * (0.34 + tuning.strength * 0.34),
      );
    }

    if (edgeIndex < 2 && semanticZoom > 0.18) {
      const token = visualTokenForNode(wake.nodeId, edgeIndex + 71);
      if (token) {
        const tokenProgress = clampUnit(leadingProgress - 0.09);
        const x = source.x + dx * tokenProgress;
        const y = source.y + dy * tokenProgress;
        if (tokenFitsVisibleViewport({ x, y }, 7, size, interaction)) {
          drawVisualTokenSprite(
            context,
            token,
            x,
            y,
            (5.2 + semanticZoom * 1.8) / interaction.viewport.scale,
            mixColor(sourceColor, targetColor, tokenProgress),
            frame.envelope * (0.16 + tuning.strength * 0.18),
            direction,
            false,
          );
        }
      }
    }
  });
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
  const particleBudget =
    (1 - semanticZoom * 0.52) * fieldTuning.baseTextureDensity;
  const particleOpacity =
    (1 - semanticZoom * 0.48) * fieldTuning.baseTextureOpacity;

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
        nodeDomainById[sourceNode.primaryDomain].color,
        nodeDomainById[targetNode.primaryDomain].color,
        Math.max(0, Math.min(1, progress)),
      );
      const particleAlpha =
        baseAlpha * (0.36 + randomUnit(seed + 8) * 0.68);
      drawAtmosphereParticle(
        context,
        x,
        y,
        color,
        particleAlpha,
        seed,
        interaction.viewport.scale,
      );
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
    const color = nodeDomainById[node.primaryDomain].color;
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
      const particleAlpha =
        alpha *
        particleOpacity *
        (isSatellite ? fieldTuning.nodeParticleSatelliteOpacity : 1) *
        (fieldTuning.nodeParticleAlphaFloor +
          randomUnit(seed + 9) * fieldTuning.nodeParticleAlphaRange);
      drawAtmosphereParticle(
        context,
        x,
        y,
        color,
        particleAlpha,
        seed,
        interaction.viewport.scale,
      );
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
  selectionWake: SelectionWake | null,
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
  const glyphDensity = ambientGlyphDensity(interaction.viewport.scale);
  const glyphFontSize = (5.2 + semanticZoom * 1.6) / interaction.viewport.scale;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `600 ${glyphFontSize}px "Cascadia Code", Consolas, monospace`;
  const ambientOnly =
    focusSet.size === 0 &&
    activeProjectId === null &&
    selectionWake === null;
  const bridgeParticleScale = ambientOnly
    ? fieldTuning.bridgeParticleAmbientScale
    : 1;

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
    const count = Math.max(
      1,
      Math.round(
        (fieldTuning.bridgeParticleActive + Math.min(edge.weight, 12) * 3) *
          bridgeParticleScale,
      ),
    );

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
        nodeDomainById[sourceNode.primaryDomain].color,
        nodeDomainById[targetNode.primaryDomain].color,
        clampUnit(transit.progress),
      );
      const particleAlpha =
        fieldTuning.bridgeAlphaActive *
          particleOpacity *
          transit.alpha *
          (0.38 + randomUnit(seed + 8) * 0.62);
      const particleSize = randomUnit(seed + 11) > 0.88 ? 2.05 : 0.9;
      drawAmbientParticle(
        context,
        x,
        y,
        particleSize,
        color,
        particleAlpha,
        seed,
        glyphDensity,
      );
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
      nodeDomainById[node.primaryDomain].color,
      radius,
      attention,
      nodeIndex + 1,
      motionTime,
    );
  });

  drawSelectionWake(
    context,
    size,
    positions,
    selectionWake,
    time,
    interaction,
  );

  context.globalCompositeOperation = "source-over";
  drawDataBursts(
    context,
    positions,
    activeTokenBridges,
    time,
    interaction,
  );
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
