import type { LayerDescriptor } from "../../shared/layers";

export const WORLD_BACKDROP_LAYER: LayerDescriptor = Object.freeze({
  id: "world-backdrop",
  order: 1,
  status: "active",
  owns: Object.freeze(["atmosphere behind the world plane"]),
});

export function WorldBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="career-world__backdrop"
      data-layer={WORLD_BACKDROP_LAYER.id}
    />
  );
}

