import type { CSSProperties } from "react";
import { cameraLayerStyle, type CameraView } from "../../../shared/camera";
import type { DetailState } from "../../../shared/lod";
import { LAND_ASSETS } from "../model/assets";

interface TerritoryLandformProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly showTerritoryQa: boolean;
}

export function TerritoryLandform({
  camera,
  detailState,
  showTerritoryQa,
}: TerritoryLandformProps) {
  const style = cameraLayerStyle(camera) as CSSProperties;
  const detailOpacity = detailState.worldToTerritory;

  return (
    <div
      aria-hidden="true"
      className="career-world__layer career-world__land-layer"
      data-layer="territory-landform"
      data-lod-tier={detailState.tier.id}
      data-territory-lod={detailOpacity.toFixed(3)}
    >
      {/* A plain image is intentional: it must share the exact CSS camera
          transform used by the QA mask, without optimizer-dependent sizing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className="career-world__world-plane career-world__land-plate"
        draggable={false}
        decoding="async"
        src={LAND_ASSETS.plate}
        style={style}
      />
      {detailOpacity > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className={
            "career-world__world-plane "
            + "career-world__land-plate "
            + "career-world__land-detail"
          }
          draggable={false}
          decoding="async"
          src={LAND_ASSETS.detailPlate}
          style={{
            ...style,
            opacity: detailOpacity,
          }}
        />
      ) : null}
      {showTerritoryQa ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="career-world__world-plane career-world__territory-qa"
          draggable={false}
          src={LAND_ASSETS.territoryQa}
          style={style}
        />
      ) : null}
    </div>
  );
}
