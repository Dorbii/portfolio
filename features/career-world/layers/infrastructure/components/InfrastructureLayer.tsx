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
import { resolveTownPresentationOffset } from "../../../shared/townPresentation";
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

type TownPlanPhaseScope = "all" | "procedural-only";

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
const TOWN_PLAN_GROUND_PATTERN_SIZE = 22;
const TOWN_PLAN_ROAD_PATTERN_SIZE = 10;
const KAIZEN_AGENT_TOWN_OWNER_ID = "project-kaizen-agent";
const AUTHORED_TOWN_FOUNDATION_OWNER_IDS = new Set([
  KAIZEN_AGENT_TOWN_OWNER_ID,
]);
const TOWN_GROUND_MATERIAL_SRC =
  "/career-world/layers/infrastructure/textures/town-ground-r1.webp";
const TOWN_ROAD_MATERIAL_SRC =
  "/career-world/layers/infrastructure/textures/town-road-r1.webp";

type TownSurfaceFamily = "packed-earth" | "stone";

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

function townPlazaVisualScale(
  plaza: TownPlanPlaza,
): number {
  return TOWN_PLAN_PLAZA_VISUAL_SCALE[plaza.kind];
}

function scaledPlazaPoints(
  plaza: TownPlanPlaza,
): string {
  const scale = townPlazaVisualScale(plaza);
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
  const [offsetX, offsetY] = resolveTownPresentationOffset(ownerId);
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
      transform={
        offsetX === 0 && offsetY === 0
          ? undefined
          : `translate(${offsetX * WORLD_PLANE.width} ${
            offsetY * WORLD_PLANE.height
          })`
      }
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
    || !AUTHORED_TOWN_FOUNDATION_OWNER_IDS.has(ownerId)
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

  return (
    <g
      className="town-plan__ground-surface"
      data-ground-material={TOWN_GROUND_MATERIAL_SRC}
      data-ground-union="plazas-only"
      data-paved-block-count={0}
      data-town-surface-owner-id={ownerId}
    >
      <defs>
        <pattern
          height={TOWN_PLAN_GROUND_PATTERN_SIZE}
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={TOWN_PLAN_GROUND_PATTERN_SIZE}
        >
          <image
            height={TOWN_PLAN_GROUND_PATTERN_SIZE}
            href={TOWN_GROUND_MATERIAL_SRC}
            preserveAspectRatio="xMidYMid slice"
            width={TOWN_PLAN_GROUND_PATTERN_SIZE}
          />
        </pattern>
      </defs>
      {plan.plazas.map((plaza) => {
        const family = townPlazaSurfaceFamily(plaza);
        const points = scaledPlazaPoints(plaza);
        const base = family === "stone" ? palette.stone : palette.earth;
        const visualScale = townPlazaVisualScale(plaza);

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
              fill={`url(#${patternId})`}
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

  return (
    <g
      className="town-plan__road-network"
      data-detail-road-visibility={detailVisibility.toFixed(3)}
      data-road-detail="stone-only"
      data-road-grammar="hierarchical-mixed-surface"
      data-road-layer-count={3}
      data-road-material={TOWN_ROAD_MATERIAL_SRC}
      data-road-union="streets-by-hierarchy"
    >
      <defs>
        <pattern
          height={TOWN_PLAN_ROAD_PATTERN_SIZE}
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={TOWN_PLAN_ROAD_PATTERN_SIZE}
        >
          <image
            height={TOWN_PLAN_ROAD_PATTERN_SIZE}
            href={TOWN_ROAD_MATERIAL_SRC}
            preserveAspectRatio="xMidYMid slice"
            width={TOWN_PLAN_ROAD_PATTERN_SIZE}
          />
        </pattern>
      </defs>
      <TownPlanStreetGroup
        detailVisibility={detailVisibility}
        earthPatternId={patternId}
        palette={palette}
        patternId={patternId}
        primary={false}
        streets={plan.streets}
        texturedSurface={false}
        widthScale={1}
      />
      <TownPlanStreetGroup
        detailVisibility={detailVisibility}
        earthPatternId={patternId}
        palette={palette}
        patternId={patternId}
        primary
        streets={plan.streets}
        texturedSurface={false}
        widthScale={1}
      />
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
}: {
  readonly closeVisibility: number;
  readonly scope: TownPlanPhaseScope;
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
        className="town-plan__road-networks"
        phaseId="road-networks"
        render={(plan, palette, ownerId) => (
          <TownPlanRoadNetwork
            detailVisibility={closeVisibility}
            ownerId={ownerId}
            palette={palette}
            plan={plan}
          />
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
  const closeVisibility = detailState.siteToClose;
  const shouldRender = (
    detailState.shouldLoadSiteAssets
    || infrastructureVisibility > LOD_PRESENTATION_EPSILON
  );
  const style = {
    "--career-world-lod-transition-ms":
      `${LOD_PRESENTATION_TRANSITION_MS}ms`,
  } as CSSProperties;

  return (
    <svg
      aria-hidden="true"
      className="career-world__layer career-world__infrastructure-layer"
      data-authored-town-foundation-count={
        AUTHORED_TOWN_FOUNDATION_OWNER_IDS.size
      }
      data-capital-campus-count={1}
      data-close-detail-visibility={closeVisibility.toFixed(3)}
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
        <g
          className="town-plan__site-surface town-plan__site-surface--standard"
          style={{
            opacity: infrastructureVisibility,
            transitionDuration: "0ms",
          }}
        >
          <TownPlanSurfacePhases
            closeVisibility={closeVisibility}
            scope="procedural-only"
          />
        </g>
      ) : null}
    </svg>
  );
}
