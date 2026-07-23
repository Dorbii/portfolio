import manifest from "@/public/career-world/layers/territory-landform/manifests/world-territories-r4.json";
import type { CameraView } from "../../../shared/camera";

export interface Territory {
  readonly id: string;
  readonly label: string;
  readonly landmassId: string;
  readonly maskColor: string;
  readonly focusView: CameraView;
}

function pair(values: number[]): readonly [number, number] {
  return Object.freeze([values[0], values[1]] as [number, number]);
}

export const TERRITORIES: readonly Territory[] = Object.freeze(
  manifest.territories.map((territory) => Object.freeze({
    ...territory,
    focusView: Object.freeze({
      origin: pair(territory.focusView.origin),
      span: pair(territory.focusView.span),
    }),
  })),
);
