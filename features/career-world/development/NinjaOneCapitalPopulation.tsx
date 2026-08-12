import type { CameraView } from "../shared/camera";
import type { DetailState } from "../shared/lod";
import {
  ninjaOneCapitalVisiblePopulationCues,
  type NinjaOneCapitalCityPopulationCue,
} from "./model/ninjaOneCapitalCityNodes";

interface NinjaOneCapitalPopulationProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
}

function PopulationCue({ cue }: { readonly cue: NinjaOneCapitalCityPopulationCue }) {
  const width = cue.displayHeight * cue.dimensions[0] / cue.dimensions[1];
  const x = cue.anchor[0] - width * 0.5;
  const y = cue.anchor[1] - cue.displayHeight;
  const transform = cue.mirrored
    ? `translate(${cue.anchor[0] * 2} 0) scale(-1 1)`
    : undefined;

  return (
    <g
      className="ninjaone-capital-population__cue"
      data-capital-population-cue={cue.id}
      data-capital-population-species={cue.species}
      data-temporary-swappable-layer="true"
      transform={transform}
    >
      <ellipse
        className="ninjaone-capital-population__shadow"
        cx={cue.anchor[0]}
        cy={cue.anchor[1] + 1.5}
        rx={Math.max(3.2, width * 0.34)}
        ry={Math.max(1.4, cue.displayHeight * 0.075)}
      />
      <image
        className="ninjaone-capital-population__sprite"
        height={cue.displayHeight}
        href={cue.path}
        preserveAspectRatio="xMidYMid meet"
        width={width}
        x={x}
        y={y}
      />
    </g>
  );
}

export function NinjaOneCapitalPopulation({
  camera,
  detailState,
}: NinjaOneCapitalPopulationProps) {
  const cues = ninjaOneCapitalVisiblePopulationCues(camera, detailState.tier.id);
  if (cues.length === 0) return null;

  return (
    <g
      data-capital-layer="temporary-population-scale-cues"
      data-population-cue-count={cues.length}
      data-population-render-mode="camera-culled-individual-sprites"
    >
      {cues.map((cue) => <PopulationCue cue={cue} key={cue.id} />)}
    </g>
  );
}
