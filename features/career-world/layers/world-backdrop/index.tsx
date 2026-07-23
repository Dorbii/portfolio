import type { CSSProperties } from "react";
import type { LayerDescriptor } from "../../shared/layers";
import type { WorldLight } from "../../shared/lighting";

export const WORLD_BACKDROP_LAYER: LayerDescriptor = Object.freeze({
  id: "world-backdrop",
  order: 1,
  status: "active",
  owns: Object.freeze([
    "atmosphere behind the world plane",
    "visible environmental light cue",
  ]),
});

interface WorldBackdropProps {
  readonly light: WorldLight;
}

export function WorldBackdrop({ light }: WorldBackdropProps) {
  const [lightX, lightY] = light.direction;
  const style = {
    "--world-light-x": `${50 + lightX * 36}%`,
    "--world-light-y": `${50 + lightY * 36}%`,
    "--world-light-color": light.ambientColor,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="career-world__backdrop"
      data-layer={WORLD_BACKDROP_LAYER.id}
      data-light-source={light.id}
      style={style}
    />
  );
}
