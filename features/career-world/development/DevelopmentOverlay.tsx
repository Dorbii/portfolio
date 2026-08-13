import type { CSSProperties } from "react";
import { LAND_ASSETS } from "../layers/terrain/model/assets";
import type { Territory } from "../layers/terrain/model/territories";
import {
  NINJAONE_CITY_ALLOCATION_COVERAGE,
  NINJAONE_CITY_ALLOCATIONS,
  PROJECT_STRUCTURES,
  resolveProjectAnchor,
} from "../layers/structures";
import {
  cameraLayerStyle,
  type CameraView,
} from "../shared/camera";
import { WORLD_PLANE } from "../shared/world";

interface DevelopmentOverlayProps {
  readonly camera: CameraView;
  readonly showGrid: boolean;
  readonly showTopography: boolean;
  readonly showTerritories: boolean;
  readonly territories: readonly Territory[];
}

const { width: WORLD_WIDTH, height: WORLD_HEIGHT } = WORLD_PLANE;
const GRID_COLUMNS = 8;
const GRID_ROWS = 6;
const GRID_COLUMN_LABELS = "ABCDEFGH";

export function DevelopmentOverlay({
  camera,
  showGrid,
  showTopography,
  showTerritories,
  territories,
}: DevelopmentOverlayProps) {
  const cameraStyle = cameraLayerStyle(camera) as CSSProperties;
  const labelScale = Math.min(...camera.span);
  const labelSize = 15 * labelScale;

  return (
    <div
      aria-hidden="true"
      className="career-world__development-overlay"
      data-development-overlay={[
        showTopography ? "topography" : "",
        showTerritories ? "territories" : "",
        showGrid ? "grid" : "",
      ].filter(Boolean).join(" ")}
    >
      <svg
        className="career-world__world-plane career-world__development-plane"
        preserveAspectRatio="none"
        style={cameraStyle}
        viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
      >
        <defs>
          <mask
            height={WORLD_HEIGHT}
            id="career-world-development-land-mask"
            maskUnits="userSpaceOnUse"
            width={WORLD_WIDTH}
            x="0"
            y="0"
          >
            <image
              height={WORLD_HEIGHT}
              href={LAND_ASSETS.mask}
              preserveAspectRatio="none"
              width={WORLD_WIDTH}
            />
          </mask>
        </defs>

        {showTopography ? (
          <image
            className="career-world__development-topography"
            height={WORLD_HEIGHT}
            href={LAND_ASSETS.topologyQa}
            mask="url(#career-world-development-land-mask)"
            preserveAspectRatio="none"
            width={WORLD_WIDTH}
          />
        ) : null}

        {showTerritories ? (
          <>
            <image
              className="career-world__development-territories"
              height={WORLD_HEIGHT}
              href={LAND_ASSETS.territoryQa}
              mask="url(#career-world-development-land-mask)"
              preserveAspectRatio="none"
              width={WORLD_WIDTH}
            />
            <g className="career-world__development-envelopes">
              {territories.map((territory) => {
                const envelope = territory.development.capitalEnvelope;
                const anchor = territory.development.capitalAnchor;
                const x = anchor[0] * WORLD_WIDTH;
                const y = anchor[1] * WORLD_HEIGHT;
                return (
                  <g
                    data-territory-development={territory.id}
                    key={territory.id}
                  >
                    <rect
                      fill="none"
                      height={envelope.span[1] * WORLD_HEIGHT}
                      stroke={territory.maskColor}
                      vectorEffect="non-scaling-stroke"
                      width={envelope.span[0] * WORLD_WIDTH}
                      x={envelope.origin[0] * WORLD_WIDTH}
                      y={envelope.origin[1] * WORLD_HEIGHT}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      fill={territory.maskColor}
                      r={5 * labelScale}
                      stroke="#050b09"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      fill={territory.maskColor}
                      fontSize={labelSize}
                      x={x + 9 * labelScale}
                      y={y - 9 * labelScale}
                    >
                      {territory.label} capital
                    </text>
                  </g>
                );
              })}
            </g>
            <g className="career-world__development-project-towns">
              {PROJECT_STRUCTURES.map((project) => {
                const anchor = resolveProjectAnchor(project);
                const x = anchor[0] * WORLD_WIDTH;
                const y = anchor[1] * WORLD_HEIGHT;
                return (
                  <g
                    data-project-town={project.id}
                    key={project.id}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      fill={project.territory.maskColor}
                      r={4 * labelScale}
                      stroke="#050b09"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      fill={project.territory.maskColor}
                      fontSize={labelSize * 0.86}
                      x={x + 8 * labelScale}
                      y={y - 8 * labelScale}
                    >
                      {project.label} town
                    </text>
                  </g>
                );
              })}
            </g>
            <g
              className="career-world__development-city-allocations"
              data-ninjaone-land-coverage={
                NINJAONE_CITY_ALLOCATION_COVERAGE.toFixed(4)
              }
            >
              {NINJAONE_CITY_ALLOCATIONS.map((allocation) => {
                const { origin, span } = allocation.bounds;
                const x = origin[0] * WORLD_WIDTH;
                const y = origin[1] * WORLD_HEIGHT;
                const width = span[0] * WORLD_WIDTH;
                const height = span[1] * WORLD_HEIGHT;
                return (
                  <g
                    data-city-allocation={allocation.id}
                    data-city-allocation-owner={allocation.ownerId}
                    key={allocation.id}
                  >
                    <rect
                      className="career-world__development-allocation-fill"
                      fill={allocation.color}
                      height={height}
                      mask="url(#career-world-development-land-mask)"
                      width={width}
                      x={x}
                      y={y}
                    />
                    <rect
                      className="career-world__development-allocation-boundary"
                      fill="none"
                      height={height}
                      stroke={allocation.color}
                      vectorEffect="non-scaling-stroke"
                      width={width}
                      x={x}
                      y={y}
                    />
                    <text
                      fill={allocation.color}
                      fontSize={labelSize * 0.78}
                      x={x + 7 * labelScale}
                      y={y + 17 * labelScale}
                    >
                      {allocation.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </>
        ) : null}

        {showGrid ? (
          <g className="career-world__development-grid">
            {Array.from({ length: GRID_COLUMNS + 1 }, (_, index) => (
              <line
                key={`column-${index}`}
                vectorEffect="non-scaling-stroke"
                x1={(index / GRID_COLUMNS) * WORLD_WIDTH}
                x2={(index / GRID_COLUMNS) * WORLD_WIDTH}
                y1="0"
                y2={WORLD_HEIGHT}
              />
            ))}
            {Array.from({ length: GRID_ROWS + 1 }, (_, index) => (
              <line
                key={`row-${index}`}
                vectorEffect="non-scaling-stroke"
                x1="0"
                x2={WORLD_WIDTH}
                y1={(index / GRID_ROWS) * WORLD_HEIGHT}
                y2={(index / GRID_ROWS) * WORLD_HEIGHT}
              />
            ))}
            {Array.from(
              { length: GRID_COLUMNS * GRID_ROWS },
              (_, index) => {
                const column = index % GRID_COLUMNS;
                const row = Math.floor(index / GRID_COLUMNS);
                return (
                  <text
                    fontSize={labelSize}
                    key={`cell-${column}-${row}`}
                    x={(column / GRID_COLUMNS) * WORLD_WIDTH + 8 * labelScale}
                    y={(row / GRID_ROWS) * WORLD_HEIGHT + 19 * labelScale}
                  >
                    {GRID_COLUMN_LABELS[column]}
                    {row + 1}
                  </text>
                );
              },
            )}
          </g>
        ) : null}
      </svg>
    </div>
  );
}
