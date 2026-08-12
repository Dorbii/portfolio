import type { CameraView } from "../shared/camera";
import type { DetailState } from "../shared/lod";
import {
  NINJAONE_STATION_RIVER_DETAIL_ID,
  NINJAONE_STATION_RIVER_DETAIL_STATUS,
  ninjaOneCapitalVisibleStationRiverDetailTiles,
} from "./model/ninjaOneStationRiverDetail";

interface NinjaOneStationRiverDetailProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
}

export function NinjaOneStationRiverDetail({
  camera,
  detailState,
}: NinjaOneStationRiverDetailProps) {
  if (!detailState.shouldLoadSiteAssets) return null;
  const tiles = ninjaOneCapitalVisibleStationRiverDetailTiles(
    camera,
    detailState.tier.id,
  );
  if (tiles.length === 0) return null;
  const opacity = Math.max(0, Math.min(1, detailState.capitalToSite));

  return (
    <g
      aria-hidden="true"
      data-station-river-detail={NINJAONE_STATION_RIVER_DETAIL_ID}
      data-station-river-detail-status={NINJAONE_STATION_RIVER_DETAIL_STATUS}
      data-station-river-detail-tile-count={tiles.length}
      opacity={opacity}
      pointerEvents="none"
    >
      {tiles.map((tile) => (
        <image
          data-station-river-detail-tile={tile.id}
          height={tile.displayDimensions[1]}
          href={tile.path}
          key={tile.id}
          preserveAspectRatio="none"
          width={tile.displayDimensions[0]}
          x={tile.localOrigin[0]}
          y={tile.localOrigin[1]}
        />
      ))}
    </g>
  );
}
