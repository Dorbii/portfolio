import type { CSSProperties } from "react";
import { cameraViewBox, type CameraView } from "../../../shared/camera";
import type { WorldLight } from "../../../shared/lighting";
import {
  resolveNodeVisibility,
  type DetailState,
} from "../../../shared/lod";
import { WORLD_PLANE } from "../../../shared/world";
import {
  CAPITAL_NODE_POLICY,
  CAPITAL_STRUCTURES,
  type CapitalStructure,
} from "../model/capitals";

const ASSET_SIZE = 1254;

interface StructuresLayerProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly light: WorldLight;
}

function CapitalNode({ capital }: { readonly capital: CapitalStructure }) {
  const [anchorX, anchorY] = capital.territory.development.capitalAnchor;
  const scaleX =
    capital.footprintSpan[0] * WORLD_PLANE.width / ASSET_SIZE;
  const scaleY =
    capital.footprintSpan[1] * WORLD_PLANE.height / ASSET_SIZE;

  return (
    <g
      className="capital-structure"
      data-archetype={capital.archetype}
      data-capital-id={capital.id}
      data-territory-id={capital.territory.id}
      transform={
        `translate(${anchorX * WORLD_PLANE.width} `
        + `${anchorY * WORLD_PLANE.height}) scale(${scaleX} ${scaleY})`
      }
    >
      <image
        className="capital-structure__asset"
        height={ASSET_SIZE}
        href={capital.assetPath}
        preserveAspectRatio="xMidYMid meet"
        width={ASSET_SIZE}
        x={-capital.groundAnchor[0] * ASSET_SIZE}
        y={-capital.groundAnchor[1] * ASSET_SIZE}
      />
    </g>
  );
}

export function StructuresLayer({
  camera,
  detailState,
  light,
}: StructuresLayerProps) {
  const visibility = resolveNodeVisibility(CAPITAL_NODE_POLICY, detailState);
  const style = { opacity: visibility } as CSSProperties;

  return (
    <svg
      aria-hidden="true"
      className="career-world__layer career-world__structures-layer"
      data-capital-count={CAPITAL_STRUCTURES.length}
      data-layer="structures"
      data-light-source={light.id}
      data-lod-tier={detailState.tier.id}
      data-structure-visibility={visibility.toFixed(3)}
      preserveAspectRatio="none"
      style={style}
      viewBox={cameraViewBox(
        camera,
        [WORLD_PLANE.width, WORLD_PLANE.height],
      )}
    >
      {CAPITAL_STRUCTURES.map((capital) => (
        <CapitalNode capital={capital} key={capital.id} />
      ))}
    </svg>
  );
}
