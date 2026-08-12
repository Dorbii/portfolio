import { cameraViewBox, type CameraView, type Pair } from "../shared/camera";
import { WORLD_PLANE } from "../shared/world";
import {
  NINJAONE_CAPITAL_TOPOLOGY_ALLOWED_GRID_CELLS,
  NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
  NINJAONE_CAPITAL_TOPOLOGY_BOUNDARY,
  NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS,
  NINJAONE_CAPITAL_TOPOLOGY_ELEVATION_BANDS,
  NINJAONE_CAPITAL_TOPOLOGY_GRID_CELLS,
  NINJAONE_CAPITAL_TOPOLOGY_PEDESTRIAN_LOOPS,
  NINJAONE_CAPITAL_TOPOLOGY_PLANNING_ENVELOPE,
  NINJAONE_CAPITAL_TOPOLOGY_PLANNING_ENVELOPE_ID,
  NINJAONE_CAPITAL_TOPOLOGY_PLOTS,
  NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR,
  NINJAONE_CAPITAL_TOPOLOGY_REGISTRATION_ID,
  NINJAONE_CAPITAL_TOPOLOGY_RETAINING_WALLS,
  NINJAONE_CAPITAL_TOPOLOGY_ROADS,
  NINJAONE_CAPITAL_TOPOLOGY_STAIRS,
  NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY,
  NINJAONE_CAPITAL_TOPOLOGY_TRANSITION_ZONES,
  NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN,
  NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN,
  type NinjaOneCapitalSkillDistrictId,
  type NinjaOneCapitalTopologyPlot,
} from "./model/ninjaOneCapitalTopologyProof";

interface NinjaOneCapitalTopologyProofProps {
  readonly camera: CameraView;
}

const DISTRICT_COLORS: Readonly<Record<NinjaOneCapitalSkillDistrictId, string>> =
  Object.freeze({
    "apis-integration": "#746b80",
    "application-development": "#687967",
    "infrastructure-data": "#596874",
  });
const DISTRICT_BY_ELEVATION_BAND_ID = new Map(
  NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.map((district) => (
    [district.elevationBandId, district]
  )),
);

function svgPoints(points: readonly Pair[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function plotCenter({ polygon }: NinjaOneCapitalTopologyPlot): Pair {
  const sum = polygon.reduce(
    ([sumX, sumY], [x, y]) => [sumX + x, sumY + y] as Pair,
    [0, 0] as Pair,
  );
  return [sum[0] / polygon.length, sum[1] / polygon.length] as Pair;
}

function plotLabelLines(label: string): readonly string[] {
  const words = label.toUpperCase().split(" ");
  if (label.length <= 10 || words.length === 1) {
    return Object.freeze([label.toUpperCase()]);
  }
  const splitAt = Math.ceil(words.length / 2);
  return Object.freeze([
    words.slice(0, splitAt).join(" "),
    words.slice(splitAt).join(" "),
  ]);
}

function stairTreads(
  bottom: Pair,
  top: Pair,
): readonly (readonly [Pair, Pair])[] {
  const dx = top[0] - bottom[0];
  const dy = top[1] - bottom[1];
  const length = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / length;
  const normalY = dx / length;
  return Object.freeze(Array.from({ length: 7 }, (_, index) => {
    const progress = (index + 1) / 8;
    const centerX = bottom[0] + dx * progress;
    const centerY = bottom[1] + dy * progress;
    return Object.freeze([
      Object.freeze([
        centerX - normalX * 15,
        centerY - normalY * 15,
      ] as Pair),
      Object.freeze([
        centerX + normalX * 15,
        centerY + normalY * 15,
      ] as Pair),
    ] as [Pair, Pair]);
  }));
}

export function NinjaOneCapitalTopologyProof({
  camera,
}: NinjaOneCapitalTopologyProofProps) {
  const worldX = NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN[0] * WORLD_PLANE.width;
  const worldY = NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN[1] * WORLD_PLANE.height;
  const scaleX = NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN[0] * WORLD_PLANE.width
    / NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[0];
  const scaleY = NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN[1] * WORLD_PLANE.height
    / NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[1];

  return (
    <>
      <svg
        aria-label="NinjaOne Capital B1, B2, C1, and C2 topology proof"
        className="career-world__layer career-world__topology-proof-layer"
        data-grid-cells={NINJAONE_CAPITAL_TOPOLOGY_GRID_CELLS.join(",")}
        data-registration={NINJAONE_CAPITAL_TOPOLOGY_REGISTRATION_ID}
        data-terrain-authority={
          NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY.worldLayoutId
        }
        preserveAspectRatio="none"
        role="img"
        viewBox={cameraViewBox(
          camera,
          [WORLD_PLANE.width, WORLD_PLANE.height],
        )}
      >
        <defs>
          <pattern
            height="18"
            id="ninjaone-capital-topology-environment-hatch"
            patternUnits="userSpaceOnUse"
            width="18"
          >
            <path d="M-4 18 L18 -4 M5 22 L22 5" />
          </pattern>
          <pattern
            height="22"
            id="ninjaone-capital-topology-rail-hatch"
            patternUnits="userSpaceOnUse"
            width="22"
          >
            <path d="M0 11 H22 M5 0 V22 M17 0 V22" />
          </pattern>
        </defs>

        <g className="ninjaone-capital-topology__grid-contract">
          {NINJAONE_CAPITAL_TOPOLOGY_ALLOWED_GRID_CELLS.map((cell) => {
            const x = cell.origin[0] * WORLD_PLANE.width;
            const y = cell.origin[1] * WORLD_PLANE.height;
            return (
              <g data-grid-cell={cell.id} key={cell.id}>
                <rect
                  height={cell.span[1] * WORLD_PLANE.height}
                  width={cell.span[0] * WORLD_PLANE.width}
                  x={x}
                  y={y}
                />
                <text x={x + 8} y={y + 15}>{cell.id}</text>
              </g>
            );
          })}
        </g>

        <g
          className="ninjaone-capital-topology__registered-city"
          transform={`translate(${worldX} ${worldY}) scale(${scaleX} ${scaleY})`}
        >
          <polygon
            className="ninjaone-capital-topology__planning-envelope"
            data-planning-envelope={NINJAONE_CAPITAL_TOPOLOGY_PLANNING_ENVELOPE_ID}
            points={svgPoints(NINJAONE_CAPITAL_TOPOLOGY_PLANNING_ENVELOPE)}
          />
          <text className="ninjaone-capital-topology__planning-label" x="990" y="48">
            APPROVED PLANNING ENVELOPE
          </text>
          <polygon
            className="ninjaone-capital-topology__registration-bed"
            points={svgPoints(NINJAONE_CAPITAL_TOPOLOGY_BOUNDARY)}
          />

          <g data-topology-layer="environment-transition-reservations">
            {NINJAONE_CAPITAL_TOPOLOGY_TRANSITION_ZONES.map((zone) => (
              <polygon
                className={`ninjaone-capital-topology__transition-zone ninjaone-capital-topology__transition-zone--${zone.kind}`}
                data-transition-zone={zone.id}
                key={zone.id}
                points={svgPoints(zone.polygon)}
              />
            ))}
          </g>

          <g data-topology-layer="base-elevation-bands">
            {NINJAONE_CAPITAL_TOPOLOGY_ELEVATION_BANDS.map((band) => {
              const district = DISTRICT_BY_ELEVATION_BAND_ID.get(band.id);
              if (!district) {
                return null;
              }
              return (
                <polygon
                  className="ninjaone-capital-topology__elevation-band"
                  data-district-id={district.id}
                  data-elevation={band.elevation}
                  data-elevation-band={band.id}
                  fill={DISTRICT_COLORS[district.id]}
                  key={band.id}
                  points={svgPoints(band.polygon)}
                />
              );
            })}
          </g>

          <g data-topology-layer="base-retaining-walls">
            {NINJAONE_CAPITAL_TOPOLOGY_RETAINING_WALLS.map((wall) => (
              <g data-retaining-wall={wall.id} key={wall.id}>
                <polyline
                  className="ninjaone-capital-topology__retaining-wall-face"
                  points={svgPoints(wall.points)}
                />
                <polyline
                  className="ninjaone-capital-topology__retaining-wall-cap"
                  points={svgPoints(wall.points)}
                />
              </g>
            ))}
          </g>

          <g data-topology-layer="base-rail-grade">
            <polyline
              className="ninjaone-capital-topology__rail-grade"
              points={svgPoints(NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR.points)}
              strokeWidth={NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR.width}
            />
          </g>

          <g data-topology-layer="base-road-network">
            {NINJAONE_CAPITAL_TOPOLOGY_ROADS.map((road) => (
              <g
                data-road={road.id}
                data-road-kind={road.kind}
                key={road.id}
              >
                <polyline
                  className="ninjaone-capital-topology__road-edge"
                  points={svgPoints(road.points)}
                  strokeWidth={road.width + 26}
                />
                <polyline
                  className={`ninjaone-capital-topology__road-surface ninjaone-capital-topology__road-surface--${road.kind}`}
                  points={svgPoints(road.points)}
                  strokeWidth={road.width}
                />
              </g>
            ))}
          </g>

          <g data-topology-layer="base-pedestrian-network">
            {NINJAONE_CAPITAL_TOPOLOGY_PEDESTRIAN_LOOPS.map((loop) => (
              <polyline
                className="ninjaone-capital-topology__pedestrian-loop"
                data-elevation={loop.elevation}
                data-pedestrian-loop={loop.id}
                key={loop.id}
                points={svgPoints(loop.points)}
              />
            ))}
            {NINJAONE_CAPITAL_TOPOLOGY_STAIRS.map((stair) => (
              <g data-stair={stair.id} key={stair.id}>
                <polyline
                  className="ninjaone-capital-topology__stair-approach"
                  points={svgPoints(stair.bottomApproach)}
                />
                <polyline
                  className="ninjaone-capital-topology__stair-approach"
                  points={svgPoints(stair.topApproach)}
                />
                <line
                  className="ninjaone-capital-topology__stair-bed"
                  x1={stair.bottomLanding[0]}
                  x2={stair.topLanding[0]}
                  y1={stair.bottomLanding[1]}
                  y2={stair.topLanding[1]}
                />
                {stairTreads(stair.bottomLanding, stair.topLanding).map(
                  ([from, to], index) => (
                    <line
                      className="ninjaone-capital-topology__stair-tread"
                      key={`${stair.id}-${index}`}
                      x1={from[0]}
                      x2={to[0]}
                      y1={from[1]}
                      y2={to[1]}
                    />
                  ),
                )}
                <circle
                  className="ninjaone-capital-topology__landing"
                  cx={stair.bottomLanding[0]}
                  cy={stair.bottomLanding[1]}
                  r="13"
                />
                <circle
                  className="ninjaone-capital-topology__landing"
                  cx={stair.topLanding[0]}
                  cy={stair.topLanding[1]}
                  r="13"
                />
              </g>
            ))}
          </g>

          <g data-topology-layer="anchor-plots">
            {NINJAONE_CAPITAL_TOPOLOGY_PLOTS.map((plot) => {
              const center = plotCenter(plot);
              return (
                <g
                  data-district-id={plot.districtId}
                  data-plot={plot.id}
                  data-plot-owner={plot.layerOwner}
                  data-plot-role={plot.role}
                  data-skill-id={plot.skillId}
                  key={plot.id}
                >
                  <polygon
                    className={`ninjaone-capital-topology__plot ninjaone-capital-topology__plot--${plot.layerOwner}`}
                    points={svgPoints(plot.polygon)}
                  />
                  <line
                    className="ninjaone-capital-topology__plot-access"
                    x1={center[0]}
                    x2={plot.accessPoint[0]}
                    y1={center[1]}
                    y2={plot.accessPoint[1]}
                  />
                  <circle
                    className="ninjaone-capital-topology__plot-access-point"
                    cx={plot.accessPoint[0]}
                    cy={plot.accessPoint[1]}
                    r="9"
                  />
                </g>
              );
            })}
          </g>

          <g data-topology-layer="transportation-preview">
            <polyline
              className="ninjaone-capital-topology__future-rails"
              points={svgPoints(NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR.points)}
            />
            <text
              className="ninjaone-capital-topology__rail-label"
              textAnchor="middle"
              x="390"
              y="625"
            >
              INTERCITY RAIL · TRANSPORTATION LAYER
            </text>
          </g>

          <g data-topology-layer="plot-labels">
            {NINJAONE_CAPITAL_TOPOLOGY_PLOTS.map((plot) => {
              const center = plotCenter(plot);
              const labelLines = plotLabelLines(plot.label);
              const labelY = center[1]
                - (labelLines.length - 1) * 14
                - (plot.role === "station" ? 48 : 0);
              return (
                <text
                  className="ninjaone-capital-topology__plot-label"
                  data-plot-label={plot.id}
                  key={plot.id}
                  textAnchor="middle"
                  x={center[0]}
                  y={labelY}
                >
                  {labelLines.map((line, index) => (
                    <tspan
                      dy={index === 0 ? 0 : 28}
                      key={line}
                      x={center[0]}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            })}
          </g>

          <g data-topology-layer="resume-skill-districts">
            {NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.map((district) => (
              <text
                className="ninjaone-capital-topology__district-label"
                data-district-id={district.id}
                key={district.id}
                textAnchor="middle"
                x={district.labelPoint[0]}
                y={district.labelPoint[1]}
              >
                {`${district.label.toUpperCase()} / ${district.skillIds.length} SKILLS / GRADE ${district.elevation}`}
              </text>
            ))}
          </g>
        </g>
      </svg>

      <aside className="ninjaone-capital-topology__legend" aria-label="Topology legend">
        <p>NinjaOne Capital · topology proof r1</p>
        <strong>
          3 replaceable resume districts / 18 skill plots / station / no project / art not generated
        </strong>
        {NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.map((district) => (
          <span key={district.id}>
            <i data-district-swatch={district.id} />
            {district.label} / {district.skillIds.length} skills
          </span>
        ))}
        <span><i data-swatch="envelope" />Available terrain envelope</span>
        <span><i data-swatch="road" />Continuous vehicle roads + ramps</span>
        <span><i data-swatch="walk" />Closed pedestrian loops + stairs</span>
        <span><i data-swatch="plot" />Registered building plots + access</span>
        <span><i data-swatch="rail" />Rail and station transportation layer</span>
        <span><i data-swatch="green" />Environment transition reservations</span>
        <span><i data-swatch="terrain" />Canonical elevation + slope QA enabled</span>
      </aside>
    </>
  );
}
