import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import type { CameraView } from "../shared/camera";
import type { DetailState } from "../shared/lod";
import {
  NINJAONE_ENVIRONMENT_NATIVE_FOLIAGE_INSTANCES,
  selectNinjaOneEnvironmentNativeInstances,
  selectNinjaOneEnvironmentNativeTiles,
  type NinjaOneEnvironmentNativeInstance,
} from "./model/ninjaOneEnvironmentNativeDetail";

interface NinjaOneEnvironmentNativeDetailProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly showFoliage: boolean;
  readonly showHydrology: boolean;
}

type NativeLoadStatus = "error" | "idle" | "loading" | "ready";

interface NativeLoadState {
  readonly key: string;
  readonly status: NativeLoadStatus;
}

function preloadImage(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Unable to load ${path}.`));
    image.src = path;
    if (image.complete && image.naturalWidth > 0) {
      resolve();
    }
  });
}

function instanceStyle(
  instance: NinjaOneEnvironmentNativeInstance,
): CSSProperties {
  const flowVector = instance.flowVector;
  return {
    "--ninjaone-native-phase": `${instance.phaseSeconds}s`,
    ...(flowVector
      ? {
        "--ninjaone-native-flow-start-x": `${(-flowVector[0] * 0.55).toFixed(2)}px`,
        "--ninjaone-native-flow-start-y": `${(-flowVector[1] * 0.55).toFixed(2)}px`,
        "--ninjaone-native-flow-end-x": `${flowVector[0].toFixed(2)}px`,
        "--ninjaone-native-flow-end-y": `${flowVector[1].toFixed(2)}px`,
      }
      : {}),
  } as CSSProperties;
}

function NativeInstanceImage({
  instance,
}: {
  readonly instance: NinjaOneEnvironmentNativeInstance;
}) {
  const { origin, span } = instance.artboardBounds;
  return (
    <image
      className={`ninjaone-environment-native-detail__${instance.animation}`}
      data-environment-native-animation={instance.animation}
      data-environment-native-instance={instance.id}
      data-shared-resource={instance.resource.id}
      height={span[1]}
      href={instance.resource.path}
      preserveAspectRatio="none"
      style={instanceStyle(instance)}
      width={span[0]}
      x={origin[0]}
      y={origin[1]}
    />
  );
}

export function NinjaOneEnvironmentNativeDetail({
  active,
  camera,
  detailState,
  showFoliage,
}: NinjaOneEnvironmentNativeDetailProps) {
  const tiles = useMemo(
    () => active && detailState.shouldLoadCloseAssets
      ? selectNinjaOneEnvironmentNativeTiles(camera)
      : [],
    [active, camera, detailState.shouldLoadCloseAssets],
  );
  const instances = useMemo(() => {
    if (!active || !detailState.shouldLoadCloseAssets) {
      return [];
    }
    const candidates = showFoliage
      ? NINJAONE_ENVIRONMENT_NATIVE_FOLIAGE_INSTANCES
      : [];
    return selectNinjaOneEnvironmentNativeInstances(camera, candidates);
  }, [active, camera, detailState.shouldLoadCloseAssets, showFoliage]);
  const assetPaths = useMemo(() => [
    ...tiles.map(({ path }) => path),
    ...instances.map(({ resource }) => resource.path),
  ], [instances, tiles]);
  const assetKey = assetPaths.join("|");
  const [loadState, setLoadState] = useState<NativeLoadState>({
    key: "",
    status: "idle",
  });

  useEffect(() => {
    let cancelled = false;
    if (!assetKey) {
      return () => {
        cancelled = true;
      };
    }
    void Promise.all(assetPaths.map(preloadImage)).then(
      () => {
        if (!cancelled) {
          setLoadState({ key: assetKey, status: "ready" });
        }
      },
      () => {
        if (!cancelled) {
          setLoadState({ key: assetKey, status: "error" });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [assetKey, assetPaths]);

  const ready = assetKey.length > 0
    && loadState.key === assetKey
    && loadState.status === "ready";
  const visibleLoadStatus: NativeLoadStatus = !assetKey
    ? "idle"
    : loadState.key === assetKey
      ? loadState.status
      : "loading";
  const foliage = instances.filter(({ animation }) => animation === "canopy-sway");
  const visible = active && ready && detailState.shouldLoadCloseAssets;

  return (
    <g
      className="ninjaone-environment-native-detail"
      data-environment-native-instance-count={instances.length}
      data-environment-native-paint-order={tiles.map(({ id }) => id).join(",")}
      data-environment-native-state={ready ? "ready" : visibleLoadStatus}
      data-environment-native-tile-count={tiles.length}
      data-environment-native-tile-ids={tiles.map(({ id }) => id).join(",")}
      data-environment-native-visible={visible}
      opacity={visible ? 1 : 0}
    >
      {visible ? (
        <g data-environment-layer="terrain-geology-native">
          {tiles.map((tile) => (
            <image
              data-environment-native-tile={tile.id}
              height={tile.artboardBounds.span[1]}
              href={tile.path}
              key={tile.id}
              preserveAspectRatio="none"
              width={tile.artboardBounds.span[0]}
              x={tile.artboardBounds.origin[0]}
              y={tile.artboardBounds.origin[1]}
            />
          ))}
        </g>
      ) : null}
      {visible && foliage.length > 0 ? (
        <g data-environment-layer="shared-animated-foliage">
          {foliage.map((instance) => (
            <NativeInstanceImage instance={instance} key={instance.id} />
          ))}
        </g>
      ) : null}
    </g>
  );
}
