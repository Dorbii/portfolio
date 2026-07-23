import type { CSSProperties } from "react";
import { LAND_ASSETS } from "../../territory-landform/model/assets";
import type { Territory } from "../../territory-landform/model/territories";
import {
  cameraLayerStyle,
  type CameraView,
} from "../../../shared/camera";

interface TerritoryQaOverlayProps {
  readonly camera: CameraView;
  readonly territories: readonly Territory[];
}

const WORLD_WIDTH = 1672;
const WORLD_HEIGHT = 941;

export function TerritoryQaOverlay({
  camera,
  territories,
}: TerritoryQaOverlayProps) {
  const style = cameraLayerStyle(camera) as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="career-world__qa-layer"
      data-qa-overlay="territories-and-development"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className={
          "career-world__world-plane "
          + "career-world__territory-qa"
        }
        draggable={false}
        src={LAND_ASSETS.territoryQa}
        style={style}
      />
      <svg
        className={
          "career-world__world-plane "
          + "career-world__development-qa"
        }
        preserveAspectRatio="none"
        style={style}
        viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
      >
        {territories.map((territory) => {
          const envelope = territory.development.authoringEnvelope;
          const anchor = territory.development.capitalAnchor;
          return (
            <g data-territory-development={territory.id} key={territory.id}>
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
                cx={anchor[0] * WORLD_WIDTH}
                cy={anchor[1] * WORLD_HEIGHT}
                fill={territory.maskColor}
                r="6"
                stroke="#07100d"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
