import { useEffect, useState } from "react";
import type { CameraView } from "../shared/camera";
import type { DetailState } from "../shared/lod";
import { selectNinjaOneEnvironmentCoastTransition } from "./model/ninjaOneEnvironmentCoastTransition";

interface NinjaOneEnvironmentCoastTransitionProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly detailState: DetailState;
}

type LoadStatus = "error" | "idle" | "loading" | "ready";

export function NinjaOneEnvironmentCoastTransition({
  active,
  camera,
  detailState,
}: NinjaOneEnvironmentCoastTransitionProps) {
  const resource = active && detailState.shouldLoadCloseAssets
    ? selectNinjaOneEnvironmentCoastTransition(camera)
    : undefined;
  const path = resource?.path ?? "";
  const [loadState, setLoadState] = useState<{ path: string; status: LoadStatus }>({
    path: "",
    status: "idle",
  });

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      return () => {
        cancelled = true;
      };
    }
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => {
      if (!cancelled) {
        setLoadState({ path, status: "ready" });
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setLoadState({ path, status: "error" });
      }
    };
    image.src = path;
    if (image.complete && image.naturalWidth > 0) {
      queueMicrotask(() => {
        if (!cancelled) {
          setLoadState({ path, status: "ready" });
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [path]);

  const visible = resource !== undefined
    && loadState.path === path
    && loadState.status === "ready";
  const status: LoadStatus = !resource
    ? "idle"
    : loadState.path === path
      ? loadState.status
      : "loading";

  return (
    <g
      data-environment-coast-transition-decoded-bytes={resource?.decodedBytes ?? 0}
      data-environment-coast-transition-resource={resource?.id ?? ""}
      data-environment-coast-transition-state={status}
      data-environment-coast-transition-visible={visible}
      opacity={visible ? 1 : 0}
    >
      {visible ? (
        <image
          data-environment-layer="coast-transition"
          height={resource.artboardBounds.span[1]}
          href={resource.path}
          preserveAspectRatio="none"
          width={resource.artboardBounds.span[0]}
          x={resource.artboardBounds.origin[0]}
          y={resource.artboardBounds.origin[1]}
        />
      ) : null}
    </g>
  );
}
