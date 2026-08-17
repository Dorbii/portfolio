import {
  NINJAONE_CAPITAL_D06_STATION_PROOF,
} from "../model/ninjaOneCapitalCityLayer";

export function NinjaOneCapitalD06StationMaskDefinitions() {
  const { crop, masks } = NINJAONE_CAPITAL_D06_STATION_PROOF;
  return (
    <>
      <mask
        height={crop.height}
        id="ninjaone-capital-d06-station-mask"
        maskUnits="userSpaceOnUse"
        width={crop.width}
        x={crop.left}
        y={crop.top}
      >
        <image
          height={crop.height}
          href={masks.district}
          preserveAspectRatio="none"
          width={crop.width}
          x={crop.left}
          y={crop.top}
        />
      </mask>
      <mask
        height={crop.height}
        id="ninjaone-capital-d06-transition-mask"
        maskUnits="userSpaceOnUse"
        width={crop.width}
        x={crop.left}
        y={crop.top}
      >
        <image
          height={crop.height}
          href={masks.transitionFringe}
          preserveAspectRatio="none"
          width={crop.width}
          x={crop.left}
          y={crop.top}
        />
      </mask>
    </>
  );
}

export function NinjaOneCapitalD06StationGrounding() {
  const { crop } = NINJAONE_CAPITAL_D06_STATION_PROOF;
  return (
    <g
      data-city-child-layer="L4_2"
      data-city-proof-district="D06"
      data-city-proof-status={NINJAONE_CAPITAL_D06_STATION_PROOF.status}
    >
      <path
        className="ninjaone-capital-city__d06-contact"
        d="M 688 1000 C 808 955 920 958 1038 987 C 1165 1018 1295 1035 1434 1068 L 1434 1086 L 684 1086 Z"
        mask="url(#ninjaone-capital-d06-station-mask)"
      />
      <rect
        className="ninjaone-capital-city__d06-transition"
        height={crop.height}
        mask="url(#ninjaone-capital-d06-transition-mask)"
        width={crop.width}
        x={crop.left}
        y={crop.top}
      />
    </g>
  );
}
