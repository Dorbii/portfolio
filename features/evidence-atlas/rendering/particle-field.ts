import {
  evidenceStrengthByNode,
  graphNodes,
  type NodeKind,
} from "../model/evidence-data";
import { nodeDomainById } from "../model/node-domains";
import type { EvidenceQueryResolution } from "../model/evidence-query";
import {
  projectSkillRelationships,
  type ProjectRelationshipSupportKind,
} from "../model/project-relations";
import { randomUnit, type Point, type Size } from "./graph-layout";
import { graphPointToScreen, type GraphViewport } from "./graph-viewport";
import {
  drawVisualTokenSprite,
  visualTokenByNodeId,
  visualTokenForNode,
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
  sourceId: string;
  startedAt: number;
};

type ActiveProjectBridge = {
  edgeIndex: number;
  projectId: string;
  nodeId: string;
  weight: number;
};

const PROJECT_COLOR: Rgb = [205, 220, 234];

const graphNodeById = new Map(graphNodes.map((node) => [node.id, node]));
const projectFieldColorsById = new Map<string, Rgb[]>();

projectSkillRelationships.forEach((relationship) => {
  if (relationship.supportKind !== "direct-evidence") return;
  const node = graphNodeById.get(relationship.nodeId);
  if (!node) return;
  const color = nodeDomainById[node.primaryDomain].color;
  const colors = projectFieldColorsById.get(relationship.projectId) ?? [];
  if (
    !colors.some(
      (existing) =>
        existing[0] === color[0] &&
        existing[1] === color[1] &&
        existing[2] === color[2],
    )
  ) {
    colors.push(color);
    projectFieldColorsById.set(relationship.projectId, colors);
  }
});

function projectFieldColors(projectId: string) {
  return projectFieldColorsById.get(projectId) ?? [PROJECT_COLOR];
}

const fieldTuning = {
  baseTextureDensity: 1.08,
  baseTextureOpacity: 0.98,
  bridgeAlphaActive: 0.5,
  bridgeAlphaIdle: 0.1,
  bridgeParticleBase: 10,
  bridgeParticlePerWeight: 7,
  bridgeParticleActive: 22,
  bridgeParticleAmbientScale: 0.5,
  bridgeSpreadBase: 52,
  bridgeSpreadRatio: 0.21,
  nodeRadiusBase: 52,
  nodeRadiusPerStrength: 12,
  nodeParticleBase: 48,
  nodeParticlePerStrength: 32,
  nodeFieldAlphaIdle: 0.66,
  nodeFieldAlphaRelated: 0.78,
  nodeParticleAlphaFloor: 0.22,
  nodeParticleAlphaRange: 0.68,
  nodeParticleSatelliteOpacity: 0.38,
  satelliteScale: 2.5,
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
  selectionWakeParticleBudget: 120,
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
    speed: 1.16 + strength * 0.06,
    strength,
  };
}

export function supportsTrackedProjectBridge(
  supportKind: ProjectRelationshipSupportKind,
) {
  return supportKind === "direct-evidence";
}

export function selectionWakeEdges(sourceId: string) {
  return projectSkillRelationships
    .filter(
      (relationship) =>
        relationship.nodeId === sourceId || relationship.projectId === sourceId,
    )
    .sort((left, right) => right.evidenceWeight - left.evidenceWeight);
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
  const screenSize = randomUnit(seed + 53) > 0.94 ? 1.08 : 0.74;
  const particleSize = screenSize / viewportScale;
  context.fillStyle = rgba(color, alpha);
  context.fillRect(
    x - particleSize / 2,
    y - particleSize / 2,
    particleSize,
    particleSize,
  );
}

function drawNodeAtmosphereHaze(
  context: CanvasRenderingContext2D,
  point: Point,
  color: Rgb,
  radius: number,
  alpha: number,
) {
  context.save();
  context.translate(point.x, point.y);
  context.scale(radius * 1.4, radius);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradient.addColorStop(0, rgba(color, alpha));
  gradient.addColorStop(0.46, rgba(color, alpha * 0.38));
  gradient.addColorStop(1, rgba(color, 0));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, 1, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function radicalInverse(index: number, base: number) {
  let result = 0;
  let fraction = 1 / base;
  let value = index;
  while (value > 0) {
    result += fraction * (value % base);
    value = Math.floor(value / base);
    fraction /= base;
  }
  return result;
}

function drawAmbientDomainField(
  context: CanvasRenderingContext2D,
  size: Size,
  positions: Record<string, Point>,
  particleBudget: number,
  particleOpacity: number,
  viewportScale: number,
) {
  const colorPoints = graphNodes.flatMap((node) => {
    const point = positions[node.id];
    return point
      ? [{ point, color: nodeDomainById[node.primaryDomain].color }]
      : [];
  });
  if (colorPoints.length === 0) return;

  const fieldWidth = size.width * 1.5;
  const fieldHeight = size.height * 1.5;
  const fieldLeft = -size.width * 0.25;
  const fieldTop = -size.height * 0.25;
  const distanceScale = Math.max(
    180,
    Math.min(size.width, size.height) * 0.38,
  );
  const particleCount = Math.round(
    Math.min(
      1_150,
      Math.max(460, (size.width * size.height) / 1_100),
    ) * particleBudget,
  );

  context.save();
  context.globalCompositeOperation = "source-over";
  for (let particleIndex = 1; particleIndex <= particleCount; particleIndex += 1) {
    const seed = 131_000 + particleIndex * 43;
    const jitterX = (randomUnit(seed + 3) - 0.5) * 18;
    const jitterY = (randomUnit(seed + 7) - 0.5) * 18;
    const x = fieldLeft + radicalInverse(particleIndex, 2) * fieldWidth + jitterX;
    const y = fieldTop + radicalInverse(particleIndex, 3) * fieldHeight + jitterY;

    let nearestDistance = Number.POSITIVE_INFINITY;
    let secondDistance = Number.POSITIVE_INFINITY;
    let nearestColor = colorPoints[0].color;
    let secondColor = nearestColor;
    colorPoints.forEach(({ point, color }) => {
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < nearestDistance) {
        secondDistance = nearestDistance;
        secondColor = nearestColor;
        nearestDistance = distance;
        nearestColor = color;
      } else if (distance < secondDistance) {
        secondDistance = distance;
        secondColor = color;
      }
    });

    const colorMix =
      nearestDistance + secondDistance > 0
        ? (nearestDistance / (nearestDistance + secondDistance)) * 0.5
        : 0;
    const influence = Math.exp(-nearestDistance / distanceScale);
    const alpha =
      particleOpacity *
      (0.032 + influence * 0.12) *
      (0.58 + randomUnit(seed + 11) * 0.42);
    drawAtmosphereParticle(
      context,
      x,
      y,
      mixColor(nearestColor, secondColor, colorMix),
      alpha,
      seed,
      viewportScale,
    );
  }
  context.restore();
}

function drawRelationshipHaze(
  context: CanvasRenderingContext2D,
  source: Point,
  target: Point,
  color: Rgb,
  alpha: number,
  width: number,
) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));

  context.save();
  context.translate(source.x + dx * 0.5, source.y + dy * 0.5);
  context.rotate(Math.atan2(dy, dx));
  context.scale(distance * 0.58, width);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradient.addColorStop(0, rgba(color, alpha));
  gradient.addColorStop(0.5, rgba(color, alpha * 0.42));
  gradient.addColorStop(1, rgba(color, 0));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, 1, 0, Math.PI * 2);
  context.fill();
  context.restore();
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
  const padding = screenSize / 2 + 72;
  return (
    screenPoint.x >= -padding &&
    screenPoint.x <= size.width - interaction.occludedRight + padding &&
    screenPoint.y >= -padding &&
    screenPoint.y <= size.height + padding
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
  return smoothstep(-42, 52, edgeDistance);
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
  interaction: ParticleFieldInteraction,
) {
  const { viewport, cursor } = interaction;
  if (!visualTokenByNodeId[nodeId]) return 0;
  const zoomReveal = semanticNodeTokenReveal(viewport.scale);
  if (zoomReveal <= 0) return 0;
  if (selectedIds.has(nodeId)) return zoomReveal;

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
  activeProjectId: string | null,
  interaction: ParticleFieldInteraction,
  projectPositions: Record<string, Point>,
  activeBridges: ActiveProjectBridge[],
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
      interaction,
    );
    if (promotion <= 0.001) return;

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
        : layerReveal *
          viewportVisibility *
          (0.045 + promotion * 0.24);
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
  for (const bridge of activeBridges) {
    if (renderedBridges >= bridgeLimit) break;
    const nodePoint = positions[bridge.nodeId];
    const projectPoint = projectPositions[bridge.projectId];
    const node = graphNodeById.get(bridge.nodeId);
    const token = visualTokenForNode(bridge.nodeId, bridge.edgeIndex + 9);
    if (!nodePoint || !projectPoint || !node || !token) continue;
    const source = nodePoint;
    const target = projectPoint;

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
      nodeDomainById[node.primaryDomain].color,
      PROJECT_COLOR,
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
  projectPositions: Record<string, Point>,
  activeBridges: ActiveProjectBridge[],
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
    const nodePoint = positions[bridge.nodeId];
    const projectPoint = projectPositions[bridge.projectId];
    const node = graphNodeById.get(bridge.nodeId);
    if (!nodePoint || !projectPoint || !node) continue;
    const source = nodePoint;
    const target = projectPoint;

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
        nodeDomainById[node.primaryDomain].color,
        PROJECT_COLOR,
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
  projectPositions: Record<string, Point>,
  wake: SelectionWake | null,
  time: number,
  interaction: ParticleFieldInteraction,
) {
  const frame = selectionWakeFrame(wake, time, interaction.motionEnabled);
  if (!wake || !frame.active) return;
  const wakePoint = positions[wake.sourceId] ?? projectPositions[wake.sourceId];
  const wakeNode = graphNodeById.get(wake.sourceId);
  if (!wakePoint) return;

  const wakeColor = wakeNode
    ? nodeDomainById[wakeNode.primaryDomain].color
    : PROJECT_COLOR;
  const projectWake = !wakeNode;
  const wakeRadius = wakeNode
    ? fieldTuning.nodeRadiusBase +
      (evidenceStrengthByNode[wake.sourceId] ?? 1) *
        fieldTuning.nodeRadiusPerStrength
    : 54;
  if (!projectWake) {
    drawWakeBloom(
      context,
      wakePoint,
      wakeColor,
      wakeRadius * 1.2,
      frame.staticEmphasis
        ? 0.38
        : frame.envelope * (1 - frame.progress) * 0.42,
    );
  }

  const edges = selectionWakeEdges(wake.sourceId).filter((edge) =>
    supportsTrackedProjectBridge(edge.supportKind),
  );
  const wakeParticleScale = Math.min(
    1,
    fieldTuning.selectionWakeParticleBudget /
      Math.max(
        1,
        edges.reduce(
          (total, edge) =>
            total +
              selectionWakeEdgeTuning(edge.evidenceWeight).particleCount,
          0,
        ),
      ),
  );
  const semanticZoom = semanticZoomLevel(interaction.viewport.scale);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `600 ${6.8 / interaction.viewport.scale}px "Cascadia Code", Consolas, monospace`;

  edges.forEach((edge, edgeIndex) => {
    const sourceId = edge.nodeId;
    const targetId = edge.projectId;
    const source = positions[sourceId];
    const target = projectPositions[targetId];
    const sourceNode = graphNodeById.get(sourceId);
    const targetNode = graphNodeById.get(targetId);
    if (
      !source ||
      !target ||
      !sourceNode ||
      !edgeFitsVisibleViewport(source, target, size, interaction)
    ) {
      return;
    }

    const sourceColor = nodeDomainById[sourceNode.primaryDomain].color;
    const targetColor = projectWake ? sourceColor : PROJECT_COLOR;
    const tuning = selectionWakeEdgeTuning(edge.evidenceWeight);
    const wakeParticleCount = Math.max(
      4,
      Math.round(tuning.particleCount * wakeParticleScale),
    );
    if (frame.staticEmphasis) {
      const sourceRadius =
        fieldTuning.nodeRadiusBase +
        (evidenceStrengthByNode[sourceId] ?? 1) *
          fieldTuning.nodeRadiusPerStrength;
      const targetRadius = targetNode
        ? fieldTuning.nodeRadiusBase +
          (evidenceStrengthByNode[targetId] ?? 1) *
            fieldTuning.nodeRadiusPerStrength
        : 72;
      drawWakeBloom(
        context,
        source,
        sourceColor,
        sourceRadius * 1.2,
        0.2 + tuning.strength * 0.18,
      );
      drawWakeBloom(
        context,
        target,
        targetColor,
        targetRadius * 1.1,
        (0.12 + tuning.strength * 0.08) / Math.max(1, edges.length),
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
      particleIndex < wakeParticleCount;
      particleIndex += 1
    ) {
      const seed = edgeIndex * 1_009 + particleIndex * 37 + 211;
      const trail =
        (particleIndex / wakeParticleCount) *
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
      const trailStrength = 1 - particleIndex / wakeParticleCount;
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
      const targetRadius = targetNode
        ? fieldTuning.nodeRadiusBase +
          (evidenceStrengthByNode[targetId] ?? 1) *
            fieldTuning.nodeRadiusPerStrength
        : 72;
      drawWakeBloom(
        context,
        target,
        targetColor,
        targetRadius * 1.12,
        (arrival * (0.1 + tuning.strength * 0.1)) /
          Math.max(1, edges.length),
      );
    }

    if (edgeIndex < 2 && semanticZoom > 0.18) {
      const token = visualTokenForNode(sourceId, edgeIndex + 71);
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

export function drawParticleFieldBase(
  context: CanvasRenderingContext2D,
  size: Size,
  positions: Record<string, Point>,
  resolution: EvidenceQueryResolution,
  interaction: ParticleFieldInteraction,
  projectPositions: Record<string, Point> = {},
) {
  context.clearRect(0, 0, size.width, size.height);
  prepareFieldContext(context, interaction);
  const focusSet = new Set(resolution.selectedIds);
  const relatedNodeIds = new Set(resolution.pathNodeIds);
  const activeProjectIds = new Set(resolution.relatedTraceIds);
  const semanticZoom = semanticZoomLevel(interaction.viewport.scale);
  const particleBudget =
    (1 - semanticZoom * 0.52) * fieldTuning.baseTextureDensity;
  const particleOpacity =
    (1 - semanticZoom * 0.48) * fieldTuning.baseTextureOpacity;

  drawAmbientDomainField(
    context,
    size,
    positions,
    particleBudget,
    particleOpacity,
    interaction.viewport.scale,
  );

  projectSkillRelationships.forEach((relationship, edgeIndex) => {
    if (relationship.supportKind !== "direct-evidence") return;
    const source = positions[relationship.nodeId];
    const target = projectPositions[relationship.projectId];
    if (
      !source ||
      !target ||
      !edgeFitsVisibleViewport(source, target, size, interaction)
    ) return;

    const sourceNode = graphNodeById.get(relationship.nodeId)!;
    const activeCorridor =
      focusSet.has(relationship.nodeId) ||
      (activeProjectIds.has(relationship.projectId) &&
        relatedNodeIds.has(relationship.nodeId));
    const baseAlpha =
      fieldTuning.bridgeAlphaIdle *
      (activeCorridor ? 1.9 : 0.72) *
      particleOpacity;
    const count = Math.round(
      (fieldTuning.bridgeParticleBase +
        Math.min(relationship.evidenceWeight, 12) *
          fieldTuning.bridgeParticlePerWeight *
          0.42) *
        particleBudget,
    );
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const perpendicularX = -dy / distance;
    const perpendicularY = dx / distance;
    const evidenceStrength = Math.min(relationship.evidenceWeight, 12) / 12;
    drawRelationshipHaze(
      context,
      source,
      target,
      nodeDomainById[sourceNode.primaryDomain].color,
      (0.008 + evidenceStrength * 0.011) *
        (activeCorridor ? 1.8 : 1) *
        particleOpacity,
      58 + distance * 0.085,
    );

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
        PROJECT_COLOR,
        Math.pow(Math.max(0, Math.min(1, progress)), 2.2) * 0.55,
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
        radius * interaction.viewport.scale * 2.5,
        size,
        interaction,
      )
    ) return;
    const color = nodeDomainById[node.primaryDomain].color;
    drawNodeAtmosphereHaze(
      context,
      point,
      color,
      radius * 2.35,
      alpha * 0.014,
    );
    const glow = context.createRadialGradient(
      point.x,
      point.y,
      0,
      point.x,
      point.y,
      radius,
    );
    glow.addColorStop(0, rgba(color, alpha * 0.095));
    glow.addColorStop(0.36, rgba(color, alpha * 0.025));
    glow.addColorStop(0.72, rgba(color, alpha * 0.008));
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
      const distance = Math.pow(randomUnit(seed + 4), 0.58) * radius;
      const isSatellite = randomUnit(seed + 18) > 0.52;
      const spreadScale = isSatellite ? fieldTuning.satelliteScale : 1;
      const x =
        point.x +
        Math.cos(angle) * distance * spreadScale * 1.28;
      const y =
        point.y +
        Math.sin(angle) * distance * spreadScale * 0.98;
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

  const portalPoints = Object.entries(projectPositions).sort(
    ([, left], [, right]) => left.x - right.x || left.y - right.y,
  );
  if (portalPoints.length > 0) {
    const portalColor = PROJECT_COLOR;
    portalPoints.forEach(([projectId, point], portalIndex) => {
      const radius = 120;
      const glowRadius = 92;
      const fieldColors = projectFieldColors(projectId);
      if (
        !pointFitsVisibleViewport(
          point,
          radius * interaction.viewport.scale * 1.7,
          size,
          interaction,
        )
      ) return;
      const glow = context.createRadialGradient(
        point.x,
        point.y,
        0,
        point.x,
        point.y,
        glowRadius,
      );
      glow.addColorStop(0, rgba(portalColor, 0.055));
      glow.addColorStop(0.28, rgba(portalColor, 0.018));
      glow.addColorStop(1, rgba(portalColor, 0));
      context.fillStyle = glow;
      context.beginPath();
      context.arc(point.x, point.y, glowRadius, 0, Math.PI * 2);
      context.fill();

      const particleCount = Math.round(144 * particleBudget);
      for (let index = 0; index < particleCount; index += 1) {
        const seed = 83_000 + portalIndex * 1009 + index * 17;
        const angle = randomUnit(seed) * Math.PI * 2;
        const distance = Math.pow(randomUnit(seed + 4), 0.7) * radius;
        const particleColor =
          fieldColors[
            Math.floor(randomUnit(seed + 11) * fieldColors.length)
          ];
        drawAtmosphereParticle(
          context,
          point.x + Math.cos(angle) * distance * 1.24,
          point.y + Math.sin(angle) * distance * 0.62,
          particleColor,
          particleOpacity * (0.17 + randomUnit(seed + 7) * 0.33),
          seed,
          interaction.viewport.scale,
        );
      }
    });
  }

  context.restore();
}

export function drawParticleFieldMotion(
  context: CanvasRenderingContext2D,
  size: Size,
  positions: Record<string, Point>,
  resolution: EvidenceQueryResolution,
  activeProjectId: string | null,
  selectionWake: SelectionWake | null,
  time: number,
  interaction: ParticleFieldInteraction,
  projectPositions: Record<string, Point> = {},
) {
  const motionTime = time * fieldTuning.motionTimeScale;
  prepareFieldContext(context, interaction);

  const focusSet = new Set(resolution.selectedIds);
  const activeProjectBridges: ActiveProjectBridge[] = [];
  const semanticZoom = semanticZoomLevel(interaction.viewport.scale);
  const particleOpacity = 1 - semanticZoom * 0.68;
  const glyphDensity = ambientGlyphDensity(interaction.viewport.scale);
  const glyphFontSize = (5.2 + semanticZoom * 1.6) / interaction.viewport.scale;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `600 ${glyphFontSize}px "Cascadia Code", Consolas, monospace`;
  const ambientOnly = activeProjectId === null && selectionWake === null;
  const bridgeParticleScale = ambientOnly
    ? fieldTuning.bridgeParticleAmbientScale
    : 1;

  projectSkillRelationships.forEach((relationship, edgeIndex) => {
    if (relationship.supportKind !== "direct-evidence") return;
    const relationshipActive = activeProjectId === relationship.projectId;
    if (!ambientOnly && !relationshipActive) return;
    const nodePoint = positions[relationship.nodeId];
    const projectPoint = projectPositions[relationship.projectId];
    const source = nodePoint;
    const target = projectPoint;
    if (
      !source ||
      !target ||
      !edgeFitsVisibleViewport(source, target, size, interaction)
    ) return;

    if (supportsTrackedProjectBridge(relationship.supportKind)) {
      activeProjectBridges.push({
        edgeIndex,
        projectId: relationship.projectId,
        nodeId: relationship.nodeId,
        weight: relationship.evidenceWeight,
      });
    }
    const node = graphNodeById.get(relationship.nodeId)!;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const perpendicularX = -dy / distance;
    const perpendicularY = dx / distance;
    const count = Math.max(
      1,
      Math.round(
        (fieldTuning.bridgeParticleActive +
          Math.min(relationship.evidenceWeight, 12) * 3) *
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
        nodeDomainById[node.primaryDomain].color,
        PROJECT_COLOR,
        clampUnit(transit.progress),
      );
      const particleAlpha =
        fieldTuning.bridgeAlphaActive *
          particleOpacity *
          transit.alpha *
          (0.38 + randomUnit(seed + 8) * 0.62) *
          (relationshipActive ? 1 : 0.42);
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
    const attention = selected ? 1 : 0;
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

  Object.entries(projectPositions).forEach(
    ([projectId, point], portalIndex) => {
      if (
        !pointFitsVisibleViewport(
          point,
          120 * interaction.viewport.scale,
          size,
          interaction,
        )
      ) return;
      const fieldColors = projectFieldColors(projectId);
      for (let index = 0; index < 12; index += 1) {
        const seed = 97_000 + portalIndex * 503 + index * 31;
        const direction = randomUnit(seed + 11) > 0.5 ? 1 : -1;
        const angle =
          randomUnit(seed) * Math.PI * 2 +
          motionTime * 0.000025 * direction * (0.7 + randomUnit(seed + 3));
        const radius = 28 + randomUnit(seed + 5) * 46;
        const particleColor =
          fieldColors[
            Math.floor(randomUnit(seed + 13) * fieldColors.length)
          ];
        drawAtmosphereParticle(
          context,
          point.x + Math.cos(angle) * radius * 1.28,
          point.y + Math.sin(angle) * radius * 0.58,
          particleColor,
          0.1 + randomUnit(seed + 9) * 0.18,
          seed,
          interaction.viewport.scale,
        );
      }
    },
  );

  drawSelectionWake(
    context,
    size,
    positions,
    projectPositions,
    selectionWake,
    time,
    interaction,
  );

  context.globalCompositeOperation = "source-over";
  drawDataBursts(
    context,
    positions,
    projectPositions,
    activeProjectBridges,
    time,
    interaction,
  );
  drawSemanticTokens(
    context,
    size,
    positions,
    resolution,
    activeProjectId,
    interaction,
    projectPositions,
    activeProjectBridges,
    motionTime,
  );
  context.restore();
}
