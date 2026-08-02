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
  type DetailState,
} from "../../../shared/lod";
import { WORLD_PLANE } from "../../../shared/world";
import {
  AMBIENT_STRUCTURE_INSTANCES,
  resolveAmbientAnchor,
} from "../../structures/model/ambient";
import { resolveKaizenStructurePresentationScale } from "../../structures/model/kaizenPresentation";
import {
  PROJECT_STRUCTURES,
  resolveProjectAnchor,
} from "../../structures/model/projects";
import {
  resolveSkillAnchor,
  SKILL_STRUCTURE_INSTANCES,
} from "../../structures/model/skills";
import {
  resolveSupportAnchor,
  SUPPORT_STRUCTURE_INSTANCES,
} from "../../structures/model/support";
import {
  CAPITAL_CAMPUS_INFRASTRUCTURE,
  PROJECT_TOWN_INFRASTRUCTURE,
  PROJECT_TOWN_INFRASTRUCTURE_POLICY,
  type ProjectTownPalette,
  type TownPlan,
  type TownPlanPlaza,
  type TownPlanStreet,
  type TownPlanStreetKind,
  type TownPlanTerrainSeam,
} from "../model/projectTowns";
import { resolveTownDistrictFabric } from "../model/districtFabric";
import {
  KaizenGroundIntegration,
  requireKaizenGroundIntegrationAssetId,
} from "./KaizenGroundIntegration";
import { TownDistrictFabric } from "./TownDistrictFabric";

interface InfrastructureLayerProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly light: WorldLight;
}

interface TownPlanNodeProps {
  readonly children: ReactNode;
  readonly className: string;
  readonly ownerId: string;
  readonly plan: TownPlan;
}

interface TownPlanPhaseProps {
  readonly className: string;
  readonly phaseId: string;
  readonly render: (
    plan: TownPlan,
    palette: ProjectTownPalette,
    ownerId: string,
  ) => ReactNode;
  readonly scope?: TownPlanPhaseScope;
}

type TownPlanPhaseScope = "all" | "kaizen-only" | "without-kaizen";

interface TownPlanRoadJunction {
  readonly family: TownSurfaceFamily;
  readonly point: Pair;
  readonly primary: boolean;
  readonly width: number;
}

interface TownStructurePad {
  readonly anchor: Pair;
  readonly assetId: ReturnType<
    typeof requireKaizenGroundIntegrationAssetId
  >;
  readonly footprintSpan: Pair;
  readonly id: string;
  readonly presentationScale: number;
  readonly role: "ambient" | "project" | "skill" | "support";
}

const TOWN_PLAN_STREET_SURFACE_WIDTH:
Readonly<Record<TownPlanStreetKind, number>> = Object.freeze({
  arterial: 1.15,
  collector: 0.92,
  local: 0.62,
  service: 0.48,
  stairs: 0.66,
});

const TOWN_PLAN_STREET_EDGE_WIDTH_ADDITION = 0.5;
const TOWN_PLAN_STREET_BED_WIDTH_ADDITION = 0.24;
const TOWN_PLAN_PLAZA_VISUAL_SCALE = Object.freeze({
  "capital-forecourt": 0.42,
  "project-forecourt": 0.38,
  civic: 0.48,
  "service-court": 0.4,
} satisfies Readonly<Record<TownPlanPlaza["kind"], number>>);
const KAIZEN_AGENT_PLAZA_VISUAL_SCALE = Object.freeze({
  "capital-forecourt": 0.42,
  "project-forecourt": 0.55,
  civic: 0.5,
  "service-court": 0.56,
} satisfies Readonly<Record<TownPlanPlaza["kind"], number>>);
const TOWN_PLAN_GROUND_PATTERN_SIZE = 22;
const TOWN_PLAN_ROAD_PATTERN_SIZE = 10;
const KAIZEN_AGENT_GROUND_PATTERN_SIZE = 46;
const KAIZEN_AGENT_ROAD_PATTERN_SIZE = 20;
const KAIZEN_AGENT_EARTH_ROAD_PATTERN_SIZE = 14;
const KAIZEN_AGENT_TOWN_OWNER_ID = "project-kaizen-agent";
const KAIZEN_AGENT_ROAD_WIDTH_SCALE = 1.18;
const KAIZEN_AGENT_GROUND_MATERIAL_SRC =
  "/career-world/layers/infrastructure/textures/kaizen-agent/heroic-city-ground-r1.png";
const KAIZEN_AGENT_ROAD_MATERIAL_SRC =
  "/career-world/layers/infrastructure/textures/kaizen-agent/road-setts-r1.png";
const KAIZEN_AGENT_EARTH_ROAD_MATERIAL_SRC =
  "/career-world/layers/infrastructure/textures/kaizen-agent/packed-earth-road-r2.png";
const TOWN_GROUND_MATERIAL_SRC =
  "/career-world/layers/infrastructure/textures/town-ground-r1.webp";
const TOWN_ROAD_MATERIAL_SRC =
  "/career-world/layers/infrastructure/textures/town-road-r1.webp";

type TownSurfaceFamily = "packed-earth" | "stone";

const KAIZEN_AGENT_STRUCTURE_PADS: readonly TownStructurePad[] = Object.freeze([
  ...PROJECT_STRUCTURES
    .filter(({ id }) => id === KAIZEN_AGENT_TOWN_OWNER_ID)
    .map((project) => Object.freeze({
      anchor: resolveProjectAnchor(project),
      assetId: requireKaizenGroundIntegrationAssetId(project.id),
      footprintSpan: project.footprintSpan,
      id: project.id,
      presentationScale: resolveKaizenStructurePresentationScale({
        ownerId: project.id,
        role: "project",
        visualId: project.id,
      }),
      role: "project" as const,
    })),
  ...SKILL_STRUCTURE_INSTANCES
    .filter(({ ownerId }) => ownerId === KAIZEN_AGENT_TOWN_OWNER_ID)
    .map((instance) => Object.freeze({
      anchor: resolveSkillAnchor(instance),
      assetId: requireKaizenGroundIntegrationAssetId(instance.archetype.id),
      footprintSpan: instance.archetype.footprintSpan,
      id: instance.id,
      presentationScale: resolveKaizenStructurePresentationScale({
        ownerId: instance.ownerId,
        role: "skill",
        visualId: instance.archetype.id,
      }),
      role: "skill" as const,
    })),
  ...SUPPORT_STRUCTURE_INSTANCES
    .filter(({ ownerId }) => ownerId === KAIZEN_AGENT_TOWN_OWNER_ID)
    .map((instance) => Object.freeze({
      anchor: resolveSupportAnchor(instance),
      assetId: requireKaizenGroundIntegrationAssetId(instance.archetype.id),
      footprintSpan: instance.archetype.footprintSpan,
      id: instance.id,
      presentationScale: resolveKaizenStructurePresentationScale({
        ownerId: instance.ownerId,
        role: "support",
        visualId: instance.archetype.id,
      }),
      role: "support" as const,
    })),
  ...AMBIENT_STRUCTURE_INSTANCES
    .filter(({ ownerId }) => ownerId === KAIZEN_AGENT_TOWN_OWNER_ID)
    .map((instance) => Object.freeze({
      anchor: resolveAmbientAnchor(instance),
      assetId: requireKaizenGroundIntegrationAssetId(instance.archetype.id),
      footprintSpan: instance.archetype.footprintSpan,
      id: instance.id,
      presentationScale: resolveKaizenStructurePresentationScale({
        ownerId: instance.ownerId,
        role: "ambient",
        visualId: instance.archetype.id,
      }),
      role: "ambient" as const,
    })),
]);

function worldPoint([x, y]: Pair): Pair {
  return Object.freeze([
    x * WORLD_PLANE.width,
    y * WORLD_PLANE.height,
  ] as [number, number]);
}

function svgPoints(points: readonly Pair[]): string {
  return points
    .map(worldPoint)
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
}

function svgFragmentId(ownerId: string, suffix: string): string {
  return `${ownerId}-${suffix}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function isPrimaryStreet({ kind }: TownPlanStreet): boolean {
  return kind === "arterial" || kind === "collector";
}

function townStreetSurfaceFamily(
  { kind }: TownPlanStreet,
): TownSurfaceFamily {
  return kind === "arterial" || kind === "collector" || kind === "stairs"
    ? "stone"
    : "packed-earth";
}

function townPlazaSurfaceFamily(
  { kind }: TownPlanPlaza,
): TownSurfaceFamily {
  return kind === "service-court" ? "packed-earth" : "stone";
}

function townGroundMaterial(ownerId: string): string {
  return ownerId === KAIZEN_AGENT_TOWN_OWNER_ID
    ? KAIZEN_AGENT_GROUND_MATERIAL_SRC
    : TOWN_GROUND_MATERIAL_SRC;
}

function townRoadMaterial(ownerId: string): string {
  return ownerId === KAIZEN_AGENT_TOWN_OWNER_ID
    ? KAIZEN_AGENT_ROAD_MATERIAL_SRC
    : TOWN_ROAD_MATERIAL_SRC;
}

function townPlanRoadJunctions(
  streets: readonly TownPlanStreet[],
): readonly TownPlanRoadJunction[] {
  const pointEntries = new Map<
  string,
  { point: Pair; streets: TownPlanStreet[] }
  >();

  for (const street of streets) {
    for (const point of street.waypoints) {
      const key = `${point[0].toFixed(7)}:${point[1].toFixed(7)}`;
      const entry = pointEntries.get(key) ?? {
        point,
        streets: [],
      };
      if (!entry.streets.includes(street)) {
        entry.streets.push(street);
      }
      pointEntries.set(key, entry);
    }
  }

  return Object.freeze(
    [...pointEntries.values()]
      .filter(({ streets: connected }) => connected.length > 1)
      .map(({ point, streets: connected }) => {
        const primary = connected.some(isPrimaryStreet);
        return Object.freeze({
          family: primary ? "stone" : "packed-earth",
          point,
          primary,
          width: Math.max(
            ...connected.map(
              ({ kind }) => TOWN_PLAN_STREET_SURFACE_WIDTH[kind],
            ),
          ),
        });
      }),
  );
}

function townPlazaVisualScale(
  plaza: TownPlanPlaza,
  ownerId: string,
): number {
  return ownerId === KAIZEN_AGENT_TOWN_OWNER_ID
    ? KAIZEN_AGENT_PLAZA_VISUAL_SCALE[plaza.kind]
    : TOWN_PLAN_PLAZA_VISUAL_SCALE[plaza.kind];
}

function scaledPlazaPoints(
  plaza: TownPlanPlaza,
  ownerId: string,
): string {
  const scale = townPlazaVisualScale(plaza, ownerId);
  const center = plaza.points.reduce(
    ([totalX, totalY], [x, y]) => [totalX + x, totalY + y],
    [0, 0] as [number, number],
  ).map((value) => value / plaza.points.length) as [number, number];
  return svgPoints(plaza.points.map(([x, y]) => [
    center[0] + (x - center[0]) * scale,
    center[1] + (y - center[1]) * scale,
  ]));
}

function TerrainSeam({
  palette,
  seam,
}: {
  readonly palette: ProjectTownPalette;
  readonly seam: TownPlanTerrainSeam;
}) {
  const points = svgPoints(seam.waypoints);

  return (
    <g
      className={[
        "town-plan__terrain-seam",
        `town-plan__terrain-seam--${seam.kind}`,
      ].join(" ")}
      data-terrain-seam-id={seam.id}
      data-terrain-seam-kind={seam.kind}
    >
      <polyline
        className="town-plan__terrain-seam-bed"
        fill="none"
        points={points}
        stroke={palette.edge}
      />
      <polyline
        className="town-plan__terrain-seam-detail"
        fill="none"
        points={points}
        stroke={palette.highlight}
      />
    </g>
  );
}

function TownPlanNode({
  children,
  className,
  ownerId,
  plan,
}: TownPlanNodeProps) {
  return (
    <g
      className={className}
      data-block-count={plan.blocks.length}
      data-entrance-count={plan.entrances.length}
      data-pedestrian-loop-count={plan.pedestrianLoops.length}
      data-plaza-count={plan.plazas.length}
      data-primary-street-count={
        plan.streets.filter(isPrimaryStreet).length
      }
      data-site-street-count={
        plan.streets.filter((street) => !isPrimaryStreet(street)).length
      }
      data-terrain-seam-count={plan.terrainSeams.length}
      data-town-plan-owner-id={ownerId}
    >
      {children}
    </g>
  );
}

function TownPlanPhase({
  className,
  phaseId,
  render,
  scope = "all",
}: TownPlanPhaseProps) {
  const includesOwner = (ownerId: string) => (
    scope === "all"
    || (scope === "kaizen-only"
      ? ownerId === KAIZEN_AGENT_TOWN_OWNER_ID
      : ownerId !== KAIZEN_AGENT_TOWN_OWNER_ID)
  );

  return (
    <g className={className}>
      {PROJECT_TOWN_INFRASTRUCTURE
        .filter((town) => includesOwner(town.project.id))
        .map((town) => (
          <TownPlanNode
            className="project-town-infrastructure town-plan"
            key={`${town.id}-${phaseId}`}
            ownerId={town.project.id}
            plan={town.townPlan}
          >
            {render(town.townPlan, town.palette, town.project.id)}
          </TownPlanNode>
        ))}
      {includesOwner(CAPITAL_CAMPUS_INFRASTRUCTURE.capital.id) ? (
        <TownPlanNode
          className="capital-campus-infrastructure town-plan"
          key={`${CAPITAL_CAMPUS_INFRASTRUCTURE.id}-${phaseId}`}
          ownerId={CAPITAL_CAMPUS_INFRASTRUCTURE.capital.id}
          plan={CAPITAL_CAMPUS_INFRASTRUCTURE.townPlan}
        >
          {render(
            CAPITAL_CAMPUS_INFRASTRUCTURE.townPlan,
            CAPITAL_CAMPUS_INFRASTRUCTURE.palette,
            CAPITAL_CAMPUS_INFRASTRUCTURE.capital.id,
          )}
        </TownPlanNode>
      ) : null}
    </g>
  );
}

function TownPlanGroundSurface({
  ownerId,
  palette,
  plan,
}: {
  readonly ownerId: string;
  readonly palette: ProjectTownPalette;
  readonly plan: TownPlan;
}) {
  const patternId = svgFragmentId(ownerId, "town-ground-pattern");
  const plazaPatternId = svgFragmentId(ownerId, "town-plaza-pattern");
  const plazaBlurId = svgFragmentId(ownerId, "town-plaza-edge-blur");
  const districtMaskId = svgFragmentId(
    ownerId,
    "town-ground-district-mask",
  );
  const districtBlurId = svgFragmentId(
    ownerId,
    "town-ground-district-blur",
  );
  const isKaizenAgentTown = ownerId === KAIZEN_AGENT_TOWN_OWNER_ID;
  const materialSrc = townGroundMaterial(ownerId);
  const patternSize = isKaizenAgentTown
    ? KAIZEN_AGENT_GROUND_PATTERN_SIZE
    : TOWN_PLAN_GROUND_PATTERN_SIZE;

  return (
    <g
      className={[
        "town-plan__ground-surface",
        isKaizenAgentTown
          ? "town-plan__ground-surface--kaizen-agent"
          : null,
      ].filter(Boolean).join(" ")}
      data-ground-material={materialSrc}
      data-ground-union={
        isKaizenAgentTown
          ? "feathered-authored-blocks-and-plazas"
          : "plazas-only"
      }
      data-paved-block-count={0}
      data-town-surface-owner-id={ownerId}
    >
      <defs>
        <pattern
          height={patternSize}
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={patternSize}
        >
          <image
            height={patternSize}
            href={materialSrc}
            preserveAspectRatio="xMidYMid slice"
            width={patternSize}
          />
        </pattern>
        {isKaizenAgentTown ? (
          <>
            <pattern
              height={KAIZEN_AGENT_ROAD_PATTERN_SIZE}
              id={plazaPatternId}
              patternUnits="userSpaceOnUse"
              width={KAIZEN_AGENT_ROAD_PATTERN_SIZE}
            >
              <image
                height={KAIZEN_AGENT_ROAD_PATTERN_SIZE}
                href={townRoadMaterial(ownerId)}
                preserveAspectRatio="xMidYMid slice"
                width={KAIZEN_AGENT_ROAD_PATTERN_SIZE}
              />
            </pattern>
            <filter
              height="140%"
              id={plazaBlurId}
              width="140%"
              x="-20%"
              y="-20%"
            >
              <feGaussianBlur stdDeviation={0.72} />
            </filter>
          </>
        ) : null}
        {isKaizenAgentTown ? (
          <>
            <filter
              height="140%"
              id={districtBlurId}
              width="140%"
              x="-20%"
              y="-20%"
            >
              <feGaussianBlur stdDeviation={1.8} />
            </filter>
            <mask
              height={WORLD_PLANE.height}
              id={districtMaskId}
              maskUnits="userSpaceOnUse"
              width={WORLD_PLANE.width}
              x={0}
              y={0}
            >
              <rect
                fill="black"
                height={WORLD_PLANE.height}
                width={WORLD_PLANE.width}
              />
              <g filter={`url(#${districtBlurId})`}>
                {plan.blocks.map((block) => (
                  <polygon
                    fill="white"
                    key={`${block.id}-ground-mask`}
                    points={svgPoints(block.points)}
                  />
                ))}
              </g>
            </mask>
          </>
        ) : null}
      </defs>
      {isKaizenAgentTown ? (
        <>
          <g
            className="town-plan__district-ground"
            data-district-count={plan.blocks.length}
            mask={`url(#${districtMaskId})`}
          >
            <rect
              className="town-plan__district-ground-base"
              fill={palette.earth}
              height={WORLD_PLANE.height}
              width={WORLD_PLANE.width}
            />
            <rect
              className="town-plan__district-ground-material"
              fill={`url(#${patternId})`}
              height={WORLD_PLANE.height}
              width={WORLD_PLANE.width}
            />
          </g>
        </>
      ) : null}
      {plan.plazas.map((plaza) => {
        const family = townPlazaSurfaceFamily(plaza);
        const points = scaledPlazaPoints(plaza, ownerId);
        const base = family === "stone" ? palette.stone : palette.earth;
        const visualScale = townPlazaVisualScale(plaza, ownerId);
        const materialPatternId = isKaizenAgentTown && family === "stone"
          ? plazaPatternId
          : patternId;
        const plazaMaskId = svgFragmentId(ownerId, `${plaza.id}-mask`);

        return (
          <g
            className={[
              "town-plan__plaza",
              `town-plan__plaza--${plaza.kind}`,
              `town-plan__plaza--${family}`,
            ].join(" ")}
            data-plaza-id={plaza.id}
            data-plaza-kind={plaza.kind}
            data-surface-family={family}
            data-visual-scale={visualScale}
            key={plaza.id}
          >
            {isKaizenAgentTown ? (
              <defs>
                <mask
                  height={WORLD_PLANE.height}
                  id={plazaMaskId}
                  maskUnits="userSpaceOnUse"
                  width={WORLD_PLANE.width}
                  x={0}
                  y={0}
                >
                  <polygon
                    fill="white"
                    filter={`url(#${plazaBlurId})`}
                    points={points}
                  />
                </mask>
              </defs>
            ) : null}
            <polygon
              className="town-plan__plaza-edge"
              fill={palette.earth}
              points={points}
              stroke={palette.earth}
            />
            <polygon
              className="town-plan__plaza-base"
              fill={base}
              points={points}
              stroke={base}
            />
            <polygon
              className="town-plan__plaza-material"
              fill={`url(#${materialPatternId})`}
              mask={isKaizenAgentTown ? `url(#${plazaMaskId})` : undefined}
              points={points}
            />
          </g>
        );
      })}
    </g>
  );
}

function TownPlanStreetGroup({
  detailVisibility,
  earthPatternId,
  palette,
  patternId,
  primary,
  streets,
  texturedSurface,
  widthScale,
}: {
  readonly detailVisibility: number;
  readonly earthPatternId: string;
  readonly palette: ProjectTownPalette;
  readonly patternId: string;
  readonly primary: boolean;
  readonly streets: readonly TownPlanStreet[];
  readonly texturedSurface: boolean;
  readonly widthScale: number;
}) {
  const visibleStreets = streets.filter(
    (street) => isPrimaryStreet(street) === primary,
  );
  const visibility = primary ? 1 : detailVisibility;

  return (
    <g
      className={[
        "town-plan__road-group",
        primary
          ? "town-plan__road-group--primary"
          : "town-plan__road-group--detail",
      ].join(" ")}
      data-road-lod={primary ? "site" : "close"}
      style={{ opacity: visibility }}
    >
      <g className="town-plan__road-edges">
        {visibleStreets.map((street) => (
          <polyline
            className="town-plan__road-edge"
            fill="none"
            key={`${street.id}-edge`}
            points={svgPoints(street.waypoints)}
            stroke={palette.edge}
            strokeWidth={
              (
                TOWN_PLAN_STREET_SURFACE_WIDTH[street.kind]
                + TOWN_PLAN_STREET_EDGE_WIDTH_ADDITION
              ) * widthScale
            }
          />
        ))}
      </g>
      <g className="town-plan__road-beds">
        {visibleStreets.map((street) => {
          const family = townStreetSurfaceFamily(street);
          return (
            <polyline
              className={[
                "town-plan__road-bed",
                `town-plan__road-bed--${family}`,
              ].join(" ")}
              fill="none"
              key={`${street.id}-bed`}
              points={svgPoints(street.waypoints)}
              stroke={palette.earth}
              strokeWidth={
                (
                  TOWN_PLAN_STREET_SURFACE_WIDTH[street.kind]
                  + TOWN_PLAN_STREET_BED_WIDTH_ADDITION
                ) * widthScale
              }
            />
          );
        })}
      </g>
      <g className="town-plan__road-surfaces">
        {visibleStreets.map((street) => {
          const family = townStreetSurfaceFamily(street);
          return (
            <polyline
              className={[
                "town-plan__road-surface",
                `town-plan__road-surface--${family}`,
                `town-plan__road-surface--${street.kind}`,
              ].join(" ")}
              data-primary-road={isPrimaryStreet(street)}
              data-street-id={street.id}
              data-street-kind={street.kind}
              data-surface-family={family}
              data-surface-width={
                TOWN_PLAN_STREET_SURFACE_WIDTH[street.kind]
              }
              fill="none"
              key={`${street.id}-surface`}
              points={svgPoints(street.waypoints)}
              stroke={
                family === "stone"
                  ? `url(#${patternId})`
                  : texturedSurface
                    ? `url(#${earthPatternId})`
                    : palette.earth
              }
              strokeWidth={
                TOWN_PLAN_STREET_SURFACE_WIDTH[street.kind] * widthScale
              }
            />
          );
        })}
      </g>
    </g>
  );
}

function TownPlanRoadJunctions({
  detailVisibility,
  earthPatternId,
  palette,
  patternId,
  streets,
  widthScale,
}: {
  readonly detailVisibility: number;
  readonly earthPatternId: string;
  readonly palette: ProjectTownPalette;
  readonly patternId: string;
  readonly streets: readonly TownPlanStreet[];
  readonly widthScale: number;
}) {
  const junctions = townPlanRoadJunctions(streets);

  return (
    <g
      className="town-plan__road-junctions"
      data-road-junction-count={junctions.length}
    >
      {junctions.map((junction) => {
        const [cx, cy] = worldPoint(junction.point);
        const key = `${junction.point[0]}-${junction.point[1]}`;
        const surfaceClass = [
          "town-plan__road-surface",
          `town-plan__road-surface--${junction.family}`,
        ].join(" ");

        return (
          <g
            className="town-plan__road-junction"
            data-primary-road-junction={junction.primary}
            key={key}
            style={{
              opacity: junction.primary ? 1 : detailVisibility,
            }}
          >
            <circle
              className="town-plan__road-edge town-plan__road-junction-edge-cap"
              cx={cx}
              cy={cy}
              fill={palette.edge}
              r={(
                junction.width + TOWN_PLAN_STREET_EDGE_WIDTH_ADDITION
              ) * widthScale / 2}
            />
            <circle
              className="town-plan__road-bed town-plan__road-junction-bed-cap"
              cx={cx}
              cy={cy}
              fill={palette.earth}
              r={(
                junction.width + TOWN_PLAN_STREET_BED_WIDTH_ADDITION
              ) * widthScale / 2}
            />
            <circle
              className={`${surfaceClass} town-plan__road-junction-cap`}
              cx={cx}
              cy={cy}
              fill={`url(#${
                junction.family === "stone"
                  ? patternId
                  : earthPatternId
              })`}
              r={(
                junction.width + TOWN_PLAN_STREET_BED_WIDTH_ADDITION
              ) * widthScale / 2}
            />
          </g>
        );
      })}
    </g>
  );
}

function TownPlanRoadNetwork({
  detailVisibility,
  ownerId,
  palette,
  plan,
}: {
  readonly detailVisibility: number;
  readonly ownerId: string;
  readonly palette: ProjectTownPalette;
  readonly plan: TownPlan;
}) {
  const patternId = svgFragmentId(ownerId, "town-road-pattern");
  const earthPatternId = svgFragmentId(
    ownerId,
    "town-road-earth-pattern",
  );
  const isKaizenAgentTown = ownerId === KAIZEN_AGENT_TOWN_OWNER_ID;
  const materialSrc = townRoadMaterial(ownerId);
  const earthMaterialSrc = isKaizenAgentTown
    ? KAIZEN_AGENT_EARTH_ROAD_MATERIAL_SRC
    : townGroundMaterial(ownerId);
  const patternSize = isKaizenAgentTown
    ? KAIZEN_AGENT_ROAD_PATTERN_SIZE
    : TOWN_PLAN_ROAD_PATTERN_SIZE;
  const earthPatternSize = isKaizenAgentTown
    ? KAIZEN_AGENT_EARTH_ROAD_PATTERN_SIZE
    : patternSize;
  const widthScale = isKaizenAgentTown
    ? KAIZEN_AGENT_ROAD_WIDTH_SCALE
    : 1;

  return (
    <g
      className={[
        "town-plan__road-network",
        isKaizenAgentTown
          ? "town-plan__road-network--kaizen-agent"
          : null,
      ].filter(Boolean).join(" ")}
      data-detail-road-visibility={detailVisibility.toFixed(3)}
      data-road-detail={
        isKaizenAgentTown ? "textured-all-surfaces" : "stone-only"
      }
      data-road-grammar="hierarchical-mixed-surface"
      data-road-layer-count={3}
      data-road-material={materialSrc}
      data-road-union={
        isKaizenAgentTown
          ? "streets-by-hierarchy-with-three-layer-junction-caps"
          : "streets-by-hierarchy"
      }
    >
      <defs>
        <pattern
          height={patternSize}
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={patternSize}
        >
          <image
            height={patternSize}
            href={materialSrc}
            preserveAspectRatio="xMidYMid slice"
            width={patternSize}
          />
        </pattern>
        {isKaizenAgentTown ? (
          <pattern
            height={earthPatternSize}
            id={earthPatternId}
            patternUnits="userSpaceOnUse"
            width={earthPatternSize}
          >
            <image
              height={earthPatternSize}
              href={earthMaterialSrc}
              preserveAspectRatio="xMidYMid slice"
              width={earthPatternSize}
            />
          </pattern>
        ) : null}
      </defs>
      <TownPlanStreetGroup
        detailVisibility={detailVisibility}
        earthPatternId={earthPatternId}
        palette={palette}
        patternId={patternId}
        primary={false}
        streets={plan.streets}
        texturedSurface={isKaizenAgentTown}
        widthScale={widthScale}
      />
      <TownPlanStreetGroup
        detailVisibility={detailVisibility}
        earthPatternId={earthPatternId}
        palette={palette}
        patternId={patternId}
        primary
        streets={plan.streets}
        texturedSurface={isKaizenAgentTown}
        widthScale={widthScale}
      />
      {isKaizenAgentTown ? (
        <TownPlanRoadJunctions
          detailVisibility={detailVisibility}
          earthPatternId={earthPatternId}
          palette={palette}
          patternId={patternId}
          streets={plan.streets}
          widthScale={widthScale}
        />
      ) : null}
    </g>
  );
}

function TownPlanTerrainSeams({
  palette,
  plan,
}: {
  readonly palette: ProjectTownPalette;
  readonly plan: TownPlan;
}) {
  return plan.terrainSeams.map((seam) => (
    <TerrainSeam
      key={seam.id}
      palette={palette}
      seam={seam}
    />
  ));
}

function TownPlanEntrances({
  plan,
}: {
  readonly plan: TownPlan;
}) {
  return plan.entrances.map((entrance) => {
    const [x, y] = worldPoint(entrance.point);
    return (
      <g
        className="town-plan__entrance"
        data-entrance-structure-id={entrance.structureId}
        data-pedestrian-loop-id={entrance.loopId}
        key={entrance.structureId}
        transform={`translate(${x} ${y})`}
      />
    );
  });
}

function TownPlanSurfacePhases({
  closeVisibility,
  scope,
  surfaceVisibility,
}: {
  readonly closeVisibility: number;
  readonly scope: TownPlanPhaseScope;
  readonly surfaceVisibility: number;
}) {
  return (
    <>
      <TownPlanPhase
        className="town-plan__ground-surfaces"
        phaseId="ground-surfaces"
        render={(plan, palette, ownerId) => (
          <TownPlanGroundSurface
            ownerId={ownerId}
            palette={palette}
            plan={plan}
          />
        )}
        scope={scope}
      />
      <TownPlanPhase
        className="town-plan__terrain-seams"
        phaseId="terrain-seams"
        render={(plan, palette) => (
          <g style={{ opacity: closeVisibility * 0.16 }}>
            <TownPlanTerrainSeams
              palette={palette}
              plan={plan}
            />
          </g>
        )}
        scope={scope}
      />
      <TownPlanPhase
        className="town-plan__district-fabrics"
        phaseId="district-fabrics"
        render={(plan, _palette, ownerId) => {
          const fabric = resolveTownDistrictFabric(ownerId);
          return fabric ? (
            <TownDistrictFabric
              closeVisibility={closeVisibility}
              fabric={fabric}
              plan={plan}
            />
          ) : null;
        }}
        scope={scope}
      />
      <TownPlanPhase
        className="town-plan__road-networks"
        phaseId="road-networks"
        render={(plan, palette, ownerId) => (
          <TownPlanRoadNetwork
            detailVisibility={
              ownerId === KAIZEN_AGENT_TOWN_OWNER_ID
                ? Math.max(closeVisibility, surfaceVisibility)
                : closeVisibility
            }
            ownerId={ownerId}
            palette={palette}
            plan={plan}
          />
        )}
        scope={scope}
      />
      <TownPlanPhase
        className="town-plan__structure-interfaces"
        phaseId="structure-interfaces"
        render={(_plan, _palette, ownerId) => (
          ownerId === KAIZEN_AGENT_TOWN_OWNER_ID ? (
            <KaizenGroundIntegration sites={KAIZEN_AGENT_STRUCTURE_PADS} />
          ) : null
        )}
        scope={scope}
      />
      <TownPlanPhase
        className="town-plan__entrances"
        phaseId="entrances"
        render={(plan) => (
          <TownPlanEntrances plan={plan} />
        )}
        scope={scope}
      />
    </>
  );
}

export function InfrastructureLayer({
  camera,
  detailState,
  light,
}: InfrastructureLayerProps) {
  const infrastructureVisibility = resolveAtomicTierVisibility(
    PROJECT_TOWN_INFRASTRUCTURE_POLICY,
    detailState,
  );
  const kaizenOverviewVisibility = detailState.shouldLoadSiteAssets
    ? 1
    : infrastructureVisibility;
  const closeVisibility = detailState.siteToClose;
  const shouldRender = (
    detailState.shouldLoadSiteAssets
    || infrastructureVisibility > LOD_PRESENTATION_EPSILON
    || kaizenOverviewVisibility > LOD_PRESENTATION_EPSILON
  );
  const style = {
    "--career-world-lod-transition-ms":
      `${LOD_PRESENTATION_TRANSITION_MS}ms`,
  } as CSSProperties;

  return (
    <svg
      aria-hidden="true"
      className="career-world__layer career-world__infrastructure-layer"
      data-capital-campus-count={1}
      data-close-detail-visibility={closeVisibility.toFixed(3)}
      data-kaizen-overview-visibility={kaizenOverviewVisibility.toFixed(3)}
      data-layer="infrastructure"
      data-light-source={light.id}
      data-lod-tier={detailState.tier.id}
      data-primary-street-visibility={infrastructureVisibility.toFixed(3)}
      data-project-town-count={PROJECT_TOWN_INFRASTRUCTURE.length}
      data-site-detail-visibility={infrastructureVisibility.toFixed(3)}
      preserveAspectRatio="none"
      style={style}
      viewBox={cameraViewBox(
        camera,
        [WORLD_PLANE.width, WORLD_PLANE.height],
      )}
    >
      {shouldRender ? (
        <>
          <g
            className="town-plan__site-surface town-plan__site-surface--standard"
            style={{
              opacity: infrastructureVisibility,
              transitionDuration: "0ms",
            }}
          >
            <TownPlanSurfacePhases
              closeVisibility={closeVisibility}
              scope="without-kaizen"
              surfaceVisibility={infrastructureVisibility}
            />
          </g>
          <g
            className="town-plan__site-surface town-plan__site-surface--kaizen-overview"
            style={{
              opacity: kaizenOverviewVisibility,
              transitionDuration: "0ms",
            }}
          >
            <TownPlanSurfacePhases
              closeVisibility={closeVisibility}
              scope="kaizen-only"
              surfaceVisibility={kaizenOverviewVisibility}
            />
          </g>
        </>
      ) : null}
    </svg>
  );
}
