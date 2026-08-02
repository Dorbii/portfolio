import type { Pair } from "../../../shared/camera";
import { WORLD_PLANE } from "../../../shared/world";
import type {
  TownDistrictFabricPlan,
  TownRailwayPlan,
} from "../model/districtFabric";
import type { TownPlan } from "../model/projectTowns";

interface TownDistrictFabricProps {
  readonly closeVisibility: number;
  readonly fabric: TownDistrictFabricPlan;
  readonly plan: TownPlan;
}

interface WorldRailSample {
  readonly angle: number;
  readonly point: Pair;
}

function worldPoint([x, y]: Pair): Pair {
  return Object.freeze([
    x * WORLD_PLANE.width,
    y * WORLD_PLANE.height,
  ] as [number, number]);
}

function svgPoints(points: readonly Pair[]): string {
  return points.map(worldPoint).map(([x, y]) => `${x},${y}`).join(" ");
}

function sampleRailway(
  points: readonly Pair[],
  spacing: number,
): readonly WorldRailSample[] {
  const worldPoints = points.map(worldPoint);
  return Object.freeze(worldPoints.slice(1).flatMap((end, index) => {
    const start = worldPoints[index];
    const deltaX = end[0] - start[0];
    const deltaY = end[1] - start[1];
    const length = Math.hypot(deltaX, deltaY);
    const count = Math.max(1, Math.floor(length / spacing));
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    return Array.from({ length: count }, (_, sampleIndex) => {
      const progress = (sampleIndex + 0.5) / count;
      return Object.freeze({
        angle,
        point: Object.freeze([
          start[0] + deltaX * progress,
          start[1] + deltaY * progress,
        ] as Pair),
      });
    });
  }));
}

function offsetPolyline(
  points: readonly Pair[],
  offset: number,
): string {
  const worldPoints = points.map(worldPoint);
  return worldPoints.map((point, index) => {
    const previous = worldPoints[Math.max(0, index - 1)];
    const next = worldPoints[Math.min(worldPoints.length - 1, index + 1)];
    const deltaX = next[0] - previous[0];
    const deltaY = next[1] - previous[1];
    const length = Math.max(0.001, Math.hypot(deltaX, deltaY));
    return `${point[0] - deltaY / length * offset},`
      + `${point[1] + deltaX / length * offset}`;
  }).join(" ");
}

function TownRailway({
  closeVisibility,
  railway,
}: {
  readonly closeVisibility: number;
  readonly railway: TownRailwayPlan;
}) {
  const trackPoints = svgPoints(railway.trackWaypoints);
  const sleepers = sampleRailway(railway.trackWaypoints, 1.08);

  return (
    <g
      className="town-district-fabric__railway"
      data-railway-id={railway.id}
      data-railway-payload="procedural-svg"
    >
      <polygon
        className="town-district-fabric__station-platform-edge"
        points={svgPoints(railway.platformPoints)}
      />
      <polygon
        className="town-district-fabric__station-platform"
        points={svgPoints(railway.platformPoints)}
      />
      <polyline
        className="town-district-fabric__rail-ballast"
        fill="none"
        points={trackPoints}
      />
      <g
        className="town-district-fabric__rail-close-detail"
        data-detail-lod="close"
        style={{ opacity: closeVisibility }}
      >
        {sleepers.map(({ angle, point }, index) => (
          <line
            className="town-district-fabric__rail-sleeper"
            key={`${railway.id}-sleeper-${index}`}
            transform={`translate(${point[0]} ${point[1]}) rotate(${angle + 90})`}
            x1={-0.72}
            x2={0.72}
            y1={0}
            y2={0}
          />
        ))}
        <polyline
          className="town-district-fabric__rail"
          fill="none"
          points={offsetPolyline(railway.trackWaypoints, -0.42)}
        />
        <polyline
          className="town-district-fabric__rail"
          fill="none"
          points={offsetPolyline(railway.trackWaypoints, 0.42)}
        />
        {railway.steamVents.map((vent, index) => {
          const [x, y] = worldPoint(vent);
          return (
            <g
              className="town-district-fabric__steam"
              key={`${railway.id}-steam-${index}`}
              style={{ animationDelay: `${index * -1.7}s` }}
              transform={`translate(${x} ${y})`}
            >
              <circle cx={0} cy={0} r={0.42} />
              <circle cx={0.28} cy={-0.55} r={0.3} />
              <circle cx={-0.14} cy={-1.02} r={0.22} />
            </g>
          );
        })}
      </g>
    </g>
  );
}

export function TownDistrictFabric({
  closeVisibility,
  fabric,
  plan,
}: TownDistrictFabricProps) {
  return (
    <g
      className="town-district-fabric"
      data-district-fabric-id={fabric.id}
      data-district-fabric-owner-id={fabric.ownerId}
      data-district-fabric-renderer="shared-procedural-svg"
      data-parcel-patch-count={fabric.parcelPatches.length}
    >
      <g
        className="town-district-fabric__block-washes"
        style={{ opacity: 0.1 + closeVisibility * 0.1 }}
      >
        {plan.blocks.map((block) => {
          const surfaceKind = fabric.surfaceKindByBlockId[block.id];
          if (!surfaceKind) {
            return null;
          }
          return (
            <polygon
              className={[
                "town-district-fabric__block-wash",
                `town-district-fabric__block-wash--${surfaceKind}`,
              ].join(" ")}
              data-block-id={block.id}
              data-surface-kind={surfaceKind}
              key={block.id}
              points={svgPoints(block.points)}
            />
          );
        })}
      </g>
      <g
        className="town-district-fabric__parcel-patches"
        style={{ opacity: 0.16 + closeVisibility * 0.12 }}
      >
        {fabric.parcelPatches.map((patch) => (
          <polygon
            className={[
              "town-district-fabric__parcel-patch",
              `town-district-fabric__parcel-patch--${patch.kind}`,
            ].join(" ")}
            data-parcel-patch-id={patch.id}
            data-parcel-patch-kind={patch.kind}
            key={patch.id}
            points={svgPoints(patch.points)}
          />
        ))}
      </g>
      <g
        className="town-district-fabric__frontage-edges"
        data-detail-lod="close"
        style={{ opacity: closeVisibility }}
      >
        {fabric.frontageEdges.map((edge) => (
          <polyline
            className={[
              "town-district-fabric__frontage-edge",
              `town-district-fabric__frontage-edge--${edge.kind}`,
            ].join(" ")}
            data-frontage-edge-id={edge.id}
            fill="none"
            key={edge.id}
            points={svgPoints(edge.waypoints)}
          />
        ))}
      </g>
      {fabric.railway ? (
        <TownRailway
          closeVisibility={closeVisibility}
          railway={fabric.railway}
        />
      ) : null}
    </g>
  );
}
