import type { CSSProperties, ReactNode } from "react";
import {
  cameraViewBox,
  type CameraView,
  type Pair,
} from "../../../shared/camera";
import type { WorldLight } from "../../../shared/lighting";
import {
  LOD_PRESENTATION_EPSILON,
  LOD_PRESENTATION_TRANSITION_MS,
  resolveAtomicTierVisibility,
  resolveNodeVisibility,
  type DetailState,
} from "../../../shared/lod";
import { WORLD_PLANE } from "../../../shared/world";
import { resolveTownPresentationAnchor } from "../../../shared/townPresentation";
import {
  DEFAULT_WORLD_WIND_STATE,
  windVectorFromDegrees,
} from "../../../shared/weather";
import {
  ACTIVITY_PROP_INSTANCES,
  ACTIVITY_PROP_SITE_POLICY,
  type ActivityPropInstance,
} from "../model/activityProps";
import {
  KAIZEN_FOLIAGE_INSTANCES,
  NINJAONE_FOLIAGE_ATLAS_DIMENSIONS,
  NINJAONE_FOLIAGE_ATLAS_PATH,
  NINJAONE_FOLIAGE_POOL_ID,
  NINJAONE_FOLIAGE_RESOURCES,
  resolveNinjaOneFoliageResource,
  type FoliageInstance,
} from "../model/kaizenFoliage";
import {
  RURAL_OUTSKIRTS_CLOSE_POLICY,
  RURAL_SCENERY_INSTANCES,
  type RuralSceneryInstance,
} from "../model/ruralOutskirts";

const KAIZEN_FOLIAGE_NODE_POLICY = Object.freeze({
  minimumTier: "site" as const,
});

interface EnvironmentLayerProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly light: WorldLight;
}

interface ActivityPropGlyphProps {
  readonly instance: ActivityPropInstance;
  readonly light: WorldLight;
}

interface RuralSceneryGlyphProps {
  readonly instance: RuralSceneryInstance;
  readonly light: WorldLight;
}

const PROP_COLORS = Object.freeze({
  iron: "#354044",
  ironEdge: "#172126",
  timber: "#72543d",
  timberEdge: "#35281f",
  canvas: "#b77b4d",
  canvasLight: "#d8b276",
  wheel: "#20272a",
});

const ACTIVITY_PROP_SCALE:
Readonly<Record<ActivityPropInstance["kind"], number>> = Object.freeze({
  lamp: 0.34,
  stall: 0.44,
  cart: 0.42,
  bench: 0.42,
  "street-tree": 0.48,
});
const AUTHORED_TOWN_FOUNDATION_OWNER_IDS = new Set([
  "project-kaizen-agent",
]);
const RENDERED_ACTIVITY_PROP_INSTANCES = Object.freeze(
  ACTIVITY_PROP_INSTANCES.filter(
    ({ ownerId }) => !AUTHORED_TOWN_FOUNDATION_OWNER_IDS.has(ownerId),
  ),
);

const RURAL_COLORS = Object.freeze({
  earth: "#66573c",
  earthDark: "#393629",
  earthLight: "#8a7750",
  field: "#6f7444",
  fieldLight: "#9a9861",
  foliage: "#3f5736",
  foliageDark: "#263b2d",
  foliageLight: "#65734a",
  stone: "#747268",
  stoneDark: "#3b403e",
  stoneLight: "#9a9480",
  timber: "#6a4d35",
  timberDark: "#332820",
  canvas: "#a48255",
  ember: "#d77a32",
});

function worldPoint([x, y]: Pair): Pair {
  return Object.freeze([
    x * WORLD_PLANE.width,
    y * WORLD_PLANE.height,
  ] as [number, number]);
}

function PropShadow({ light }: { readonly light: WorldLight }) {
  const x = -light.direction[0] * 0.9;
  const y = -light.direction[1] * 0.9;
  return (
    <ellipse
      cx={x}
      cy={y}
      fill={light.ambientColor}
      opacity={Math.min(0.34, 0.16 + light.intensity * 0.1)}
      rx={2.2}
      ry={0.72}
    />
  );
}

function LampGlyph({ light }: { readonly light: WorldLight }) {
  return (
    <>
      <PropShadow light={light} />
      <rect
        fill={PROP_COLORS.ironEdge}
        height={0.55}
        rx={0.16}
        width={1.15}
        x={-0.575}
        y={-0.2}
      />
      <path
        d="M 0 0 L 0 -3.25"
        fill="none"
        stroke={PROP_COLORS.iron}
        strokeLinecap="round"
        strokeWidth={0.42}
      />
      <path
        d="M -0.48 -3.15 L 0 -3.7 L 0.48 -3.15 L 0.36 -2.5 L -0.36 -2.5 Z"
        fill={light.color}
        stroke={PROP_COLORS.ironEdge}
        strokeLinejoin="round"
        strokeWidth={0.26}
      />
      <path
        d="M -0.24 -3.14 L 0 -3.42 L 0.24 -3.14 L 0.18 -2.78 L -0.18 -2.78 Z"
        fill={PROP_COLORS.canvasLight}
        opacity={Math.min(0.82, 0.5 + light.intensity * 0.2)}
      />
    </>
  );
}

function StallGlyph({ light }: { readonly light: WorldLight }) {
  return (
    <>
      <PropShadow light={light} />
      <path
        d="M -1.72 0 L -1.72 -2.35 M 1.72 0 L 1.72 -2.35"
        fill="none"
        stroke={PROP_COLORS.timberEdge}
        strokeLinecap="round"
        strokeWidth={0.42}
      />
      <rect
        fill={PROP_COLORS.timber}
        height={0.92}
        rx={0.18}
        stroke={PROP_COLORS.timberEdge}
        strokeWidth={0.28}
        width={3.75}
        x={-1.875}
        y={-1.18}
      />
      <path
        d="M -2.25 -2.2 L -1.72 -3.25 L 1.72 -3.25 L 2.25 -2.2 Z"
        fill={PROP_COLORS.canvas}
        stroke={PROP_COLORS.timberEdge}
        strokeLinejoin="round"
        strokeWidth={0.3}
      />
      <path
        d="M -1.12 -3.14 L -0.82 -2.28 M 0 -3.16 L 0 -2.25 M 1.12 -3.14 L 0.82 -2.28"
        fill="none"
        opacity={0.8}
        stroke={light.color}
        strokeWidth={0.34}
      />
    </>
  );
}

function CartGlyph({ light }: { readonly light: WorldLight }) {
  return (
    <>
      <PropShadow light={light} />
      <path
        d="M -2.9 -0.65 L -1.65 -0.65"
        fill="none"
        stroke={PROP_COLORS.timberEdge}
        strokeLinecap="round"
        strokeWidth={0.38}
      />
      <path
        d="M -1.7 -1.92 L 1.72 -1.92 L 1.42 -0.38 L -1.4 -0.38 Z"
        fill={PROP_COLORS.canvas}
        stroke={PROP_COLORS.timberEdge}
        strokeLinejoin="round"
        strokeWidth={0.32}
      />
      <path
        d="M -1.38 -1.46 L 1.54 -1.46"
        opacity={0.72}
        stroke={light.color}
        strokeWidth={0.28}
      />
      <circle
        cx={-1.03}
        cy={0}
        fill={PROP_COLORS.wheel}
        r={0.62}
        stroke={PROP_COLORS.ironEdge}
        strokeWidth={0.24}
      />
      <circle
        cx={1.06}
        cy={0}
        fill={PROP_COLORS.wheel}
        r={0.62}
        stroke={PROP_COLORS.ironEdge}
        strokeWidth={0.24}
      />
    </>
  );
}

function BenchGlyph({ light }: { readonly light: WorldLight }) {
  return (
    <>
      <PropShadow light={light} />
      <path
        d="M -1.4 -0.55 L -1.4 0.18 M 1.4 -0.55 L 1.4 0.18"
        fill="none"
        stroke={PROP_COLORS.ironEdge}
        strokeLinecap="round"
        strokeWidth={0.42}
      />
      <rect
        fill={PROP_COLORS.timber}
        height={0.64}
        rx={0.16}
        stroke={PROP_COLORS.timberEdge}
        strokeWidth={0.25}
        width={3.8}
        x={-1.9}
        y={-1.04}
      />
      <rect
        fill={PROP_COLORS.canvasLight}
        height={0.48}
        opacity={Math.min(0.68, 0.42 + light.intensity * 0.16)}
        rx={0.14}
        stroke={PROP_COLORS.timberEdge}
        strokeWidth={0.22}
        width={3.8}
        x={-1.9}
        y={-2.02}
      />
      <path
        d="M -1.45 -1.55 L -1.45 -0.96 M 1.45 -1.55 L 1.45 -0.96"
        stroke={PROP_COLORS.iron}
        strokeWidth={0.3}
      />
    </>
  );
}

function RuralShadow({
  light,
  rx = 8,
  ry = 2.5,
}: {
  readonly light: WorldLight;
  readonly rx?: number;
  readonly ry?: number;
}) {
  return (
    <ellipse
      cx={-light.direction[0] * 1.8}
      cy={-light.direction[1] * 1.2 + 1.2}
      fill={light.ambientColor}
      opacity={Math.min(0.34, 0.14 + light.intensity * 0.1)}
      rx={rx}
      ry={ry}
    />
  );
}

function FieldFurrowsGlyph({
  light,
}: {
  readonly light: WorldLight;
}) {
  return (
    <>
      <RuralShadow light={light} rx={12} ry={3.4} />
      <path
        d="M -12 -4 L 9 -5.5 L 12 4 L -9 5.5 Z"
        fill={RURAL_COLORS.field}
        opacity={0.72}
        stroke={RURAL_COLORS.earthDark}
        strokeLinejoin="round"
        strokeWidth={0.65}
      />
      {[-8, -4, 0, 4, 8].map((offset) => (
        <path
          d={`M ${offset - 2.5} -3.7 L ${offset + 0.5} 4.2`}
          fill="none"
          key={offset}
          opacity={0.86}
          stroke={
            offset % 8 === 0
              ? RURAL_COLORS.fieldLight
              : RURAL_COLORS.earthDark
          }
          strokeLinecap="round"
          strokeWidth={0.75}
        />
      ))}
      <path
        d="M -9.5 0.2 C -3 -1.1 4 -1.4 10 -0.4"
        fill="none"
        opacity={Math.min(0.72, 0.44 + light.intensity * 0.16)}
        stroke={light.color}
        strokeWidth={0.42}
      />
    </>
  );
}

function HedgerowGlyph({ light }: { readonly light: WorldLight }) {
  return (
    <>
      <RuralShadow light={light} rx={10.5} ry={2.5} />
      <path
        d="M -11 2.2 C -6.5 0.8 -2.5 1.6 1.5 0.4 C 5.6 -0.8 8.4 0.2 11 1.3"
        fill="none"
        stroke={RURAL_COLORS.stoneDark}
        strokeLinecap="round"
        strokeWidth={1.15}
      />
      {[-8.5, -5.3, -1.8, 1.8, 5.2, 8.4].map((x, index) => (
        <ellipse
          cx={x}
          cy={index % 2 === 0 ? -0.5 : 0.1}
          fill={
            index % 3 === 0
              ? RURAL_COLORS.foliageLight
              : RURAL_COLORS.foliage
          }
          key={x}
          rx={2.5}
          ry={2.15}
          stroke={RURAL_COLORS.foliageDark}
          strokeWidth={0.5}
        />
      ))}
      <path
        d="M -8.7 -1.35 C -2.5 -2.35 3.8 -2.45 8.6 -1"
        fill="none"
        opacity={Math.min(0.62, 0.35 + light.intensity * 0.18)}
        stroke={light.color}
        strokeLinecap="round"
        strokeWidth={0.48}
      />
    </>
  );
}

function StoneWallGlyph({ light }: { readonly light: WorldLight }) {
  return (
    <>
      <RuralShadow light={light} rx={10.5} ry={2.4} />
      <path
        d="M -11 1.8 L -9 -1.3 L 9.2 -2.1 L 11 0.9 L 8.8 2.4 L -9.5 3 Z"
        fill={RURAL_COLORS.stone}
        stroke={RURAL_COLORS.stoneDark}
        strokeLinejoin="round"
        strokeWidth={0.72}
      />
      {[-7.2, -3.6, 0, 3.6, 7.2].map((x) => (
        <path
          d={`M ${x} -1.45 L ${x + 0.4} 2.45`}
          key={x}
          opacity={0.78}
          stroke={RURAL_COLORS.stoneDark}
          strokeWidth={0.48}
        />
      ))}
      <path
        d="M -9.2 -1.3 L 9 -2.05"
        opacity={Math.min(0.76, 0.48 + light.intensity * 0.16)}
        stroke={RURAL_COLORS.stoneLight}
        strokeLinecap="round"
        strokeWidth={0.68}
      />
    </>
  );
}

function GroveGlyph({ light }: { readonly light: WorldLight }) {
  const trees = [
    [-6, 1, 3.8],
    [-2.2, -2.5, 4.2],
    [2.8, -2, 4.5],
    [6.2, 1.2, 3.7],
    [0.5, 2.6, 3.9],
  ] as const;
  return (
    <>
      <RuralShadow light={light} rx={9.5} ry={3.5} />
      {trees.map(([x, y, radius], index) => (
        <g key={`${x}:${y}`}>
          <path
            d={`M ${x} ${y + 2.5} L ${x + 0.2} ${y - 1.2}`}
            stroke={RURAL_COLORS.timberDark}
            strokeLinecap="round"
            strokeWidth={0.9}
          />
          <circle
            cx={x}
            cy={y - 2.5}
            fill={
              index % 2 === 0
                ? RURAL_COLORS.foliage
                : RURAL_COLORS.foliageDark
            }
            r={radius}
            stroke={RURAL_COLORS.foliageDark}
            strokeWidth={0.55}
          />
          <circle
            cx={x - 1}
            cy={y - 3.7}
            fill={RURAL_COLORS.foliageLight}
            opacity={Math.min(0.72, 0.42 + light.intensity * 0.18)}
            r={radius * 0.42}
          />
        </g>
      ))}
    </>
  );
}

function ClearingGlyph({ light }: { readonly light: WorldLight }) {
  return (
    <>
      <RuralShadow light={light} rx={8.6} ry={2.8} />
      <path
        d={[
          "M -9.4 -1.6",
          "C -7.1 -4.5 -2.8 -4.9 0.2 -3.7",
          "C 3.4 -5.1 8.2 -3.2 9.1 0.1",
          "C 7.3 3.8 2.4 4.5 -0.6 3.4",
          "C -4.6 4.3 -8.2 2.4 -9.4 -1.6",
          "Z",
        ].join(" ")}
        fill={RURAL_COLORS.earth}
        opacity={0.34}
        stroke={RURAL_COLORS.earthDark}
        strokeWidth={0.34}
      />
      <path
        d="M -6.8 0.7 L -3.1 -0.5 M 0.8 1.8 L 4.7 0.9"
        fill="none"
        opacity={0.24}
        stroke={RURAL_COLORS.earthLight}
        strokeLinecap="round"
        strokeWidth={0.42}
      />
      {[
        [-6.4, -1.8, 0.85],
        [5.7, 2.1, 0.62],
        [7.1, -1.3, 0.74],
      ].map(([x, y, size]) => (
        <path
          d={[
            `M ${x - size} ${y + size * 0.2}`,
            `L ${x - size * 0.25} ${y - size * 0.62}`,
            `L ${x + size * 0.82} ${y - size * 0.18}`,
            `L ${x + size * 0.32} ${y + size * 0.55}`,
            "Z",
          ].join(" ")}
          fill={RURAL_COLORS.stone}
          key={`${x}:${y}`}
          stroke={RURAL_COLORS.stoneDark}
          strokeWidth={0.22}
        />
      ))}
      {[-4.5, -1.4, 2.2, 4.1].map((x, index) => (
        <path
          d={`M ${x} 3 L ${x - 0.45} ${2.1 - index * 0.08} M ${x} 3 L ${x + 0.5} ${2.2 - index * 0.06}`}
          fill="none"
          key={x}
          opacity={0.58}
          stroke={RURAL_COLORS.foliage}
          strokeLinecap="round"
          strokeWidth={0.24}
        />
      ))}
    </>
  );
}

function LookoutGlyph({ light }: { readonly light: WorldLight }) {
  return (
    <>
      <RuralShadow light={light} rx={7.2} ry={2.6} />
      <path
        d="M -6.5 2.2 L -4.2 -1.4 L 4.1 -1.9 L 6.5 1.4 L 4.2 3.1 L -4.5 3.3 Z"
        fill={RURAL_COLORS.stone}
        stroke={RURAL_COLORS.stoneDark}
        strokeLinejoin="round"
        strokeWidth={0.65}
      />
      <path
        d="M -3.8 1.8 L -3.8 -4.5 M 3.8 1.3 L 3.8 -4.9 M -4.5 -4.2 L 4.5 -4.8"
        fill="none"
        stroke={RURAL_COLORS.timberDark}
        strokeLinecap="round"
        strokeWidth={0.82}
      />
      <path
        d="M -4.2 -3.8 L 4.1 -4.4 L 3.2 -6.2 L -3.2 -5.8 Z"
        fill={RURAL_COLORS.timber}
        stroke={RURAL_COLORS.timberDark}
        strokeLinejoin="round"
        strokeWidth={0.58}
      />
      <path
        d="M 0 -4.7 L 0 -8.5 L 3.7 -7.2 L 0 -6.2"
        fill={RURAL_COLORS.canvas}
        stroke={RURAL_COLORS.timberDark}
        strokeLinejoin="round"
        strokeWidth={0.48}
      />
      <path
        d="M -3.1 -5.65 L 2.8 -6.05"
        opacity={Math.min(0.76, 0.46 + light.intensity * 0.18)}
        stroke={light.color}
        strokeWidth={0.46}
      />
    </>
  );
}

function CampGlyph({ light }: { readonly light: WorldLight }) {
  return (
    <>
      <RuralShadow light={light} rx={8.4} ry={2.9} />
      <path
        d="M -8.2 2.5 L -3.5 -4.2 L 1.3 2.2 Z"
        fill={RURAL_COLORS.canvas}
        stroke={RURAL_COLORS.timberDark}
        strokeLinejoin="round"
        strokeWidth={0.62}
      />
      <path
        d="M -3.5 -4.2 L -2.8 2.35 M -5.6 -0.8 L -1 0.1"
        fill="none"
        opacity={0.72}
        stroke={RURAL_COLORS.earthLight}
        strokeWidth={0.48}
      />
      <ellipse
        cx={5.2}
        cy={1.5}
        fill={RURAL_COLORS.stoneDark}
        rx={3}
        ry={1.6}
      />
      <path
        d="M 3.4 2.3 L 6.7 0.6 M 3.5 0.7 L 6.8 2.4"
        stroke={RURAL_COLORS.timber}
        strokeLinecap="round"
        strokeWidth={0.78}
      />
      <path
        d="M 5.1 1.3 C 3.7 -0.3 5.2 -2.2 5.4 -3.4 C 7.4 -1.5 7.2 0.2 5.1 1.3 Z"
        fill={RURAL_COLORS.ember}
        opacity={Math.min(0.9, 0.62 + light.intensity * 0.16)}
        stroke={RURAL_COLORS.earthDark}
        strokeWidth={0.38}
      />
    </>
  );
}

function ruralGlyphFor(
  instance: RuralSceneryInstance,
  light: WorldLight,
): ReactNode {
  switch (instance.kind) {
    case "field-furrows":
      return <FieldFurrowsGlyph light={light} />;
    case "hedgerow":
      return <HedgerowGlyph light={light} />;
    case "stone-wall":
      return <StoneWallGlyph light={light} />;
    case "grove":
      return <GroveGlyph light={light} />;
    case "clearing":
      return <ClearingGlyph light={light} />;
    case "lookout":
      return <LookoutGlyph light={light} />;
    case "camp":
      return <CampGlyph light={light} />;
  }
}

function glyphFor(
  instance: ActivityPropInstance,
  light: WorldLight,
): ReactNode {
  switch (instance.kind) {
    case "lamp":
      return <LampGlyph light={light} />;
    case "stall":
      return <StallGlyph light={light} />;
    case "cart":
      return <CartGlyph light={light} />;
    case "bench":
      return <BenchGlyph light={light} />;
    case "street-tree":
      return null;
  }
}

function activityPropScale(instance: ActivityPropInstance): number {
  return ACTIVITY_PROP_SCALE[instance.kind];
}

function ActivityPropGlyph({
  instance,
  light,
}: ActivityPropGlyphProps) {
  const [x, y] = worldPoint(resolveTownPresentationAnchor(
    instance.ownerId,
    instance.anchor,
  ));
  return (
    <g
      className={[
        "town-activity-prop",
        `town-activity-prop--${instance.kind}`,
      ].filter(Boolean).join(" ")}
      data-activity-prop-id={instance.id}
      data-activity-prop-kind={instance.kind}
      data-entrance-structure-id={instance.entranceStructureId}
      data-heading-degrees={instance.headingDegrees}
      data-owner-id={instance.ownerId}
      data-owner-kind={instance.ownerKind}
      transform={[
        `translate(${x} ${y})`,
        `scale(${activityPropScale(instance)})`,
      ].join(" ")}
    >
      {glyphFor(instance, light)}
    </g>
  );
}

function RuralSceneryGlyph({
  instance,
  light,
}: RuralSceneryGlyphProps) {
  const [x, y] = worldPoint(instance.anchor);
  return (
    <g
      className={[
        "rural-scenery",
        `rural-scenery--${instance.kind}`,
      ].join(" ")}
      data-rural-scenery-id={instance.id}
      data-rural-scenery-kind={instance.kind}
      transform={[
        `translate(${x} ${y})`,
        `rotate(${instance.headingDegrees})`,
        `scale(${instance.scale * 0.48})`,
      ].join(" ")}
    >
      {ruralGlyphFor(instance, light)}
    </g>
  );
}

function FoliageResourceDefinitions() {
  const [atlasWidth, atlasHeight] = NINJAONE_FOLIAGE_ATLAS_DIMENSIONS;
  return (
    <defs data-foliage-resource-pool={NINJAONE_FOLIAGE_POOL_ID}>
      {NINJAONE_FOLIAGE_RESOURCES.map((resource) => {
        const [x, y, width, height] = resource.crop;
        return (
          <symbol
            id={`career-world-foliage-${resource.id}`}
            key={resource.id}
            preserveAspectRatio="xMidYMid meet"
            viewBox={`${x} ${y} ${width} ${height}`}
          >
            <image
              height={atlasHeight}
              href={NINJAONE_FOLIAGE_ATLAS_PATH}
              width={atlasWidth}
              x={0}
              y={0}
            />
          </symbol>
        );
      })}
    </defs>
  );
}

function FoliageInstanceGlyph({
  instance,
  windVector,
}: {
  readonly instance: FoliageInstance;
  readonly windVector: Pair;
}) {
  const resource = resolveNinjaOneFoliageResource(instance.resourceId);
  const [, , width, height] = resource.crop;
  const [x, y] = worldPoint(instance.anchor);
  const motion = DEFAULT_WORLD_WIND_STATE.motion;
  const tilt = windVector[0] * motion * 0.72;
  const breezeStyle = {
    "--foliage-breeze-drift-x": `${(windVector[0] * motion * 5).toFixed(3)}px`,
    "--foliage-breeze-drift-y": `${(windVector[1] * motion * 1.4).toFixed(3)}px`,
    "--foliage-breeze-tilt-start": `${(-tilt * 0.42).toFixed(3)}deg`,
    "--foliage-breeze-tilt-end": `${tilt.toFixed(3)}deg`,
    animationDelay: `${instance.phaseSeconds}s`,
    animationDuration: `${instance.durationSeconds}s`,
  } as CSSProperties;

  return (
    <g
      data-foliage-instance-id={instance.id}
      data-foliage-resource-id={resource.id}
      transform={`translate(${x} ${y}) scale(${instance.scale})`}
    >
      <g className="career-world__foliage-breeze" style={breezeStyle}>
        <use
          height={height}
          href={`#career-world-foliage-${resource.id}`}
          width={width}
          x={-width * 0.5}
          y={-height}
        />
      </g>
    </g>
  );
}

export function EnvironmentLayer({
  camera,
  detailState,
  light,
}: EnvironmentLayerProps) {
  const visibility = resolveAtomicTierVisibility(
    ACTIVITY_PROP_SITE_POLICY,
    detailState,
  );
  const ruralVisibility = resolveNodeVisibility(
    RURAL_OUTSKIRTS_CLOSE_POLICY,
    detailState,
  );
  const foliageVisibility = resolveNodeVisibility(
    KAIZEN_FOLIAGE_NODE_POLICY,
    detailState,
  );
  const windVector = windVectorFromDegrees(
    DEFAULT_WORLD_WIND_STATE.directionDegrees,
  );
  const style = {
    "--career-world-lod-transition-ms":
      `${LOD_PRESENTATION_TRANSITION_MS}ms`,
    pointerEvents: "none",
  } as CSSProperties;
  const detailStyle = {
    opacity: visibility,
    transitionDuration: "var(--career-world-lod-transition-ms)",
    transitionProperty: "opacity",
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  } as CSSProperties;
  const ruralStyle = {
    ...detailStyle,
    opacity: ruralVisibility,
  } as CSSProperties;
  const foliageStyle = {
    ...detailStyle,
    opacity: foliageVisibility,
  } as CSSProperties;
  return (
    <svg
      aria-hidden="true"
      className="career-world__layer career-world__environment-layer"
      data-activity-prop-count={RENDERED_ACTIVITY_PROP_INSTANCES.length}
      data-authored-town-activity-suppression-count={
        ACTIVITY_PROP_INSTANCES.length - RENDERED_ACTIVITY_PROP_INSTANCES.length
      }
      data-layer="environment"
      data-light-source={light.id}
      data-lod-tier={detailState.tier.id}
      data-foliage-instance-count={KAIZEN_FOLIAGE_INSTANCES.length}
      data-foliage-resource-count={NINJAONE_FOLIAGE_RESOURCES.length}
      data-foliage-resource-pool={NINJAONE_FOLIAGE_POOL_ID}
      data-foliage-visibility={foliageVisibility.toFixed(3)}
      data-rural-scenery-count={RURAL_SCENERY_INSTANCES.length}
      data-rural-scenery-visibility={ruralVisibility.toFixed(3)}
      data-site-detail-visibility={visibility.toFixed(3)}
      data-world-wind-direction={DEFAULT_WORLD_WIND_STATE.directionDegrees}
      data-world-wind-motion={DEFAULT_WORLD_WIND_STATE.motion}
      focusable="false"
      height="100%"
      preserveAspectRatio="none"
      style={style}
      viewBox={cameraViewBox(
        camera,
        [WORLD_PLANE.width, WORLD_PLANE.height],
      )}
      width="100%"
    >
      {foliageVisibility > LOD_PRESENTATION_EPSILON ? (
        <FoliageResourceDefinitions />
      ) : null}
      {visibility > LOD_PRESENTATION_EPSILON ? (
        <g className="town-activity-props" style={detailStyle}>
          {RENDERED_ACTIVITY_PROP_INSTANCES.map((instance) => (
              <ActivityPropGlyph
                instance={instance}
                key={instance.id}
                light={light}
              />
            ))}
        </g>
      ) : null}
      {ruralVisibility > LOD_PRESENTATION_EPSILON ? (
        <g
          className="rural-outskirts rural-outskirts--close"
          style={ruralStyle}
        >
          {RURAL_SCENERY_INSTANCES.map((instance) => (
            <RuralSceneryGlyph
              instance={instance}
              key={instance.id}
              light={light}
            />
          ))}
        </g>
      ) : null}
      {foliageVisibility > LOD_PRESENTATION_EPSILON ? (
        <g
          className="career-world__foliage-instances"
          data-foliage-animation="shared-world-wind"
          style={foliageStyle}
        >
          {KAIZEN_FOLIAGE_INSTANCES.map((instance) => (
            <FoliageInstanceGlyph
              instance={instance}
              key={instance.id}
              windVector={windVector}
            />
          ))}
        </g>
      ) : null}
    </svg>
  );
}
