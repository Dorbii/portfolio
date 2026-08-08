import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CameraView } from "../shared/camera";
import type { DetailState } from "../shared/lod";
import {
  advanceNinjaOneEnvironmentSeamLoadCohort,
  isNinjaOneEnvironmentSeamLoadCohortCurrent,
  ninjaOneEnvironmentSeamRequiredCohortState,
  ninjaOneEnvironmentSeamResourceKey,
  ninjaOneEnvironmentSeamSelectionKey,
  selectNinjaOneEnvironmentSeamIntegration,
  type NinjaOneEnvironmentSeamIntegrationResource,
  type NinjaOneEnvironmentSeamLoadCohort,
  type NinjaOneEnvironmentSeamRequiredCohortState,
  type NinjaOneEnvironmentSeamRequiredCohortStatus,
} from "./model/ninjaOneEnvironmentSeamIntegration";

interface NinjaOneEnvironmentSeamIntegrationProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly onRequiredCohortStateChange?: (
    state: NinjaOneEnvironmentSeamRequiredCohortState,
  ) => void;
  readonly presentationReady?: boolean;
  readonly requiredCohortEpoch?: number;
}

interface SeamIntegrationCohortProps {
  readonly cohortEpoch: number;
  readonly onRequiredCohortStateChange?: (
    state: NinjaOneEnvironmentSeamRequiredCohortState,
  ) => void;
  readonly presentationReady: boolean;
  readonly preloadPathKey: string;
  readonly resources: readonly NinjaOneEnvironmentSeamIntegrationResource[];
  readonly selectionKey: string;
}

type LoadStatus = NinjaOneEnvironmentSeamRequiredCohortStatus;
type PreloadStatus = Exclude<LoadStatus, "ready"> | "decoded";

interface LoadState extends NinjaOneEnvironmentSeamLoadCohort {
  readonly status: PreloadStatus | "ready";
}

function SeamIntegrationCohort({
  cohortEpoch,
  onRequiredCohortStateChange,
  presentationReady,
  preloadPathKey,
  resources,
  selectionKey,
}: SeamIntegrationCohortProps) {
  const requestCohortRef = useRef<NinjaOneEnvironmentSeamLoadCohort>({ epoch: 0, key: "" });
  const [loadState, setLoadState] = useState<LoadState>({
    epoch: 0,
    key: "",
    status: "idle",
  });
  const [svgLoadError, setSvgLoadError] = useState(false);
  const [svgLoadedResourceKeys, setSvgLoadedResourceKeys] = useState<readonly string[]>([]);
  const recordSvgLoad = useCallback((resourceKey: string) => {
    setSvgLoadedResourceKeys((current) => current.includes(resourceKey)
      ? current
      : Object.freeze([...current, resourceKey]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const images: HTMLImageElement[] = [];
    const requestCohort = advanceNinjaOneEnvironmentSeamLoadCohort(
      requestCohortRef.current,
      selectionKey,
    );
    requestCohortRef.current = requestCohort;
    if (!selectionKey) {
      setLoadState({ ...requestCohort, status: "idle" });
      return () => {
        cancelled = true;
      };
    }
    setLoadState({ ...requestCohort, status: "loading" });
    const paths = preloadPathKey.split("|");
    void Promise.all(paths.map((path) => new Promise<void>((resolve, reject) => {
      const image = new window.Image();
      let decodeStarted = false;
      images.push(image);
      image.decoding = "async";
      const resolveDecoded = () => {
        if (decodeStarted) return;
        decodeStarted = true;
        if (typeof image.decode === "function") {
          void image.decode().then(resolve, reject);
        } else {
          resolve();
        }
      };
      image.onload = resolveDecoded;
      image.onerror = () => reject(new Error(`Unable to load ${path}.`));
      image.src = path;
      if (image.complete && image.naturalWidth > 0) {
        resolveDecoded();
      }
    }))).then(
      () => {
        if (
          !cancelled
          && isNinjaOneEnvironmentSeamLoadCohortCurrent(
            requestCohortRef.current,
            requestCohort,
          )
        ) {
          setLoadState({ ...requestCohort, status: "decoded" });
        }
      },
      () => {
        if (
          !cancelled
          && isNinjaOneEnvironmentSeamLoadCohortCurrent(
            requestCohortRef.current,
            requestCohort,
          )
        ) {
          setLoadState({ ...requestCohort, status: "error" });
        }
      },
    );
    return () => {
      cancelled = true;
      for (const image of images) {
        image.onload = null;
        image.onerror = null;
        image.src = "";
      }
    };
  }, [preloadPathKey, selectionKey]);

  const svgLoadedCount = resources.reduce(
    (count, resource) => count + Number(
      svgLoadedResourceKeys.includes(ninjaOneEnvironmentSeamResourceKey(resource)),
    ),
    0,
  );
  useEffect(() => {
    if (
      resources.length === 0
      || svgLoadError
      || svgLoadedCount !== resources.length
      || loadState.key !== selectionKey
      || loadState.status !== "decoded"
    ) return undefined;
    const requestCohort = Object.freeze({
      epoch: loadState.epoch,
      key: loadState.key,
    });
    let cancelled = false;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (
          !cancelled
          && isNinjaOneEnvironmentSeamLoadCohortCurrent(
            requestCohortRef.current,
            requestCohort,
          )
        ) {
          setLoadState((current) => current.epoch === requestCohort.epoch
            && current.key === requestCohort.key
            && current.status === "decoded"
            ? { ...current, status: "ready" }
            : current);
        }
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== 0) window.cancelAnimationFrame(secondFrame);
    };
  }, [
    loadState.epoch,
    loadState.key,
    loadState.status,
    resources.length,
    selectionKey,
    svgLoadError,
    svgLoadedCount,
  ]);

  const selectedDecodedBytes = resources.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  const selectedPaintedNodeCount = resources.length;
  const status: LoadStatus = resources.length === 0
    ? "idle"
    : svgLoadError
      ? "error"
    : loadState.key === selectionKey
      ? loadState.status === "decoded" ? "loading" : loadState.status
      : "loading";
  const visible = presentationReady && status === "ready";
  const requiredCohortState = useMemo(
    () => ninjaOneEnvironmentSeamRequiredCohortState(resources, status, cohortEpoch),
    [cohortEpoch, resources, status],
  );
  useEffect(() => {
    onRequiredCohortStateChange?.(requiredCohortState);
  }, [onRequiredCohortStateChange, requiredCohortState]);
  const mountedCount = resources.length;
  const mountedDecodedBytes = selectedDecodedBytes;
  const mountedPaintedNodeCount = selectedPaintedNodeCount;

  return (
    <g
      aria-hidden="true"
      data-environment-seam-integration-cohort-epoch={loadState.epoch}
      data-environment-seam-integration-presentation-epoch={cohortEpoch}
      data-environment-seam-integration-cohort-key={selectionKey}
      data-environment-seam-integration-count={mountedCount}
      data-environment-seam-integration-decoded-bytes={mountedDecodedBytes}
      data-environment-seam-integration-hidden-painted-frames={
        loadState.status === "ready" ? 2 : 0
      }
      data-environment-seam-integration-painted-node-count={mountedPaintedNodeCount}
      data-environment-seam-integration-resource-ids={resources
        .map(({ id }) => id).join(",")}
      data-environment-seam-integration-selected-count={resources.length}
      data-environment-seam-integration-selected-decoded-bytes={selectedDecodedBytes}
      data-environment-seam-integration-selected-painted-node-count={selectedPaintedNodeCount}
      data-environment-seam-integration-state={status}
      data-environment-seam-integration-svg-loaded-count={svgLoadedCount}
      data-environment-seam-integration-visible={visible}
      opacity={visible ? 1 : 0}
      pointerEvents="none"
    >
      {resources.map((resource) => (
        <image
          key={resource.id}
          data-environment-layer="seam-integration"
          data-environment-seam-integration-resource={resource.id}
          height={resource.artboardBounds.span[1]}
          href={resource.path}
          onError={() => setSvgLoadError(true)}
          onLoad={() => recordSvgLoad(ninjaOneEnvironmentSeamResourceKey(resource))}
          preserveAspectRatio="none"
          width={resource.artboardBounds.span[0]}
          x={resource.artboardBounds.origin[0]}
          y={resource.artboardBounds.origin[1]}
        />
      ))}
    </g>
  );
}

export function NinjaOneEnvironmentSeamIntegration({
  active,
  camera,
  detailState,
  onRequiredCohortStateChange,
  presentationReady = true,
  requiredCohortEpoch = 0,
}: NinjaOneEnvironmentSeamIntegrationProps) {
  const resources = useMemo(
    () => active && detailState.shouldLoadCloseAssets
      ? selectNinjaOneEnvironmentSeamIntegration(camera)
      : [],
    [active, camera, detailState.shouldLoadCloseAssets],
  );
  const selectionKey = ninjaOneEnvironmentSeamSelectionKey(resources);
  const preloadPathKey = resources.map(({ path }) => path).sort().join("|");

  return (
    <SeamIntegrationCohort
      key={selectionKey || "empty"}
      cohortEpoch={requiredCohortEpoch}
      onRequiredCohortStateChange={onRequiredCohortStateChange}
      presentationReady={presentationReady}
      preloadPathKey={preloadPathKey}
      resources={resources}
      selectionKey={selectionKey}
    />
  );
}
