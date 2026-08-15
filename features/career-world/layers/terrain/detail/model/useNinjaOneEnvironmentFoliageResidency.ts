import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";
import type {
  NinjaOneEnvironmentFoliageInstance,
  NinjaOneEnvironmentFoliageResource,
} from "./ninjaOneEnvironmentFoliage";
import {
  advanceNinjaOneEnvironmentFoliageHiddenPaintBarrier,
  createNinjaOneEnvironmentFoliageNodeLoadCohort,
  observeNinjaOneEnvironmentFoliageDomResidency,
  recordNinjaOneEnvironmentFoliageNodeLoadEvent,
  retargetNinjaOneEnvironmentFoliageNodeLoadCohort,
  type NinjaOneEnvironmentFoliageDomResidencyState,
  type NinjaOneEnvironmentFoliageNodeLoadCohort,
} from "./ninjaOneEnvironmentResidency";

export type NinjaOneEnvironmentFoliageLoadStatus =
  | "error"
  | "idle"
  | "loading"
  | "ready";

function resourceKey(resource: NinjaOneEnvironmentFoliageResource): string {
  return `${resource.id}\t${resource.path}#sha256=${resource.sha256}`;
}

function exactResourceCohort(
  resources: readonly NinjaOneEnvironmentFoliageResource[],
): string {
  return resources.map(resourceKey).sort().join("\n");
}

export function useNinjaOneEnvironmentFoliageResidency({
  groupRef,
  instances,
  onResidencyStateChange,
  residencyEpoch,
}: {
  readonly groupRef: RefObject<SVGGElement | null>;
  readonly instances: readonly NinjaOneEnvironmentFoliageInstance[];
  readonly onResidencyStateChange?: (
    state: NinjaOneEnvironmentFoliageDomResidencyState,
  ) => void;
  readonly residencyEpoch: number;
}) {
  const selectedResources = useMemo(() => {
    const resources = new Map(instances.flatMap(({ resources }) => (
      resources.map((resource) => [resource.id, resource] as const)
    )));
    return [...resources.values()].sort((left, right) => (
      left.id.localeCompare(right.id)
    ));
  }, [instances]);
  const exactResourceKeys = useMemo(
    () => selectedResources.map(resourceKey).sort(),
    [selectedResources],
  );
  const cohortKey = useMemo(
    () => selectedResources.length > 0
      ? exactResourceCohort(selectedResources)
      : "",
    [selectedResources],
  );
  const [loadState, setLoadState] = useState<NinjaOneEnvironmentFoliageNodeLoadCohort>(
    createNinjaOneEnvironmentFoliageNodeLoadCohort,
  );
  const [decodedResourceKeys, setDecodedResourceKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  let currentLoadState = loadState;
  if (loadState.key !== cohortKey) {
    currentLoadState = retargetNinjaOneEnvironmentFoliageNodeLoadCohort(
      loadState,
      cohortKey,
    );
    for (const resourceKey of exactResourceKeys) {
      if (!decodedResourceKeys.has(resourceKey)) continue;
      currentLoadState = recordNinjaOneEnvironmentFoliageNodeLoadEvent({
        cohort: currentLoadState,
        epoch: currentLoadState.epoch,
        event: "load",
        key: cohortKey,
        resourceKey,
        resourceKeys: exactResourceKeys,
      });
    }
    setLoadState(currentLoadState);
  }
  const expectedResourceCount = selectedResources.length;
  useEffect(() => {
    if (
      !cohortKey
      || currentLoadState.status !== "loading"
      || currentLoadState.failedKeys.length > 0
      || currentLoadState.loadedKeys.length !== expectedResourceCount
    ) return undefined;
    let cancelled = false;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (cancelled) return;
        setLoadState((previous) => advanceNinjaOneEnvironmentFoliageHiddenPaintBarrier({
          cohort: advanceNinjaOneEnvironmentFoliageHiddenPaintBarrier({
            cohort: previous,
            resourceKeys: exactResourceKeys,
          }),
          resourceKeys: exactResourceKeys,
        }));
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== 0) window.cancelAnimationFrame(secondFrame);
    };
  }, [
    cohortKey,
    currentLoadState.failedKeys.length,
    currentLoadState.loadedKeys.length,
    currentLoadState.status,
    exactResourceKeys,
    expectedResourceCount,
  ]);

  const loadStatus: NinjaOneEnvironmentFoliageLoadStatus = !cohortKey
    ? "idle"
    : currentLoadState.key === cohortKey
      ? currentLoadState.status
      : "loading";
  const cohortMounted = Boolean(cohortKey) && loadStatus !== "error";
  const selectedResourceIds = selectedResources.map(({ id }) => id).join(",");
  const selectedDecodedBytes = selectedResources.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  useLayoutEffect(() => {
    const group = groupRef.current;
    const mountedResourceIds = group
      ? [...group.querySelectorAll<SVGImageElement>("image[data-shared-resource]")]
          .map((node) => node.dataset.sharedResource ?? "")
          .filter(Boolean)
      : [];
    const residencyState = observeNinjaOneEnvironmentFoliageDomResidency({
      cohortKey,
      epoch: residencyEpoch,
      mountedResourceIds,
      selectedResources,
      status: loadStatus,
    });
    if (group) {
      group.dataset.environmentFoliageMountedDecodedBytes = String(
        residencyState.mountedDecodedBytes,
      );
      group.dataset.environmentFoliageMountedImageNodeCount = String(
        residencyState.mountedImageNodeCount,
      );
      group.dataset.environmentFoliageMountedResourceIds =
        residencyState.mountedResourceIds.join(",");
    }
    onResidencyStateChange?.(residencyState);
  }, [
    cohortKey,
    groupRef,
    loadStatus,
    onResidencyStateChange,
    residencyEpoch,
    selectedResources,
  ]);

  const recordResourceEvent = (
    cohortEpoch: number,
    event: "error" | "load",
    key: string,
  ) => {
    if (event === "load") {
      setDecodedResourceKeys((previous) => previous.has(key)
        ? previous
        : new Set([...previous, key]));
    }
    setLoadState((previous) => recordNinjaOneEnvironmentFoliageNodeLoadEvent({
      cohort: previous,
      epoch: cohortEpoch,
      event,
      key: cohortKey,
      resourceKey: key,
      resourceKeys: exactResourceKeys,
    }));
  };

  return {
    cohortEpoch: currentLoadState.epoch,
    cohortKey,
    cohortMounted,
    hiddenPaintedFrames: currentLoadState.hiddenPaintedFrames,
    loadStatus,
    recordResourceError: (epoch: number, key: string) => (
      recordResourceEvent(epoch, "error", key)
    ),
    recordResourceLoad: (epoch: number, key: string) => (
      recordResourceEvent(epoch, "load", key)
    ),
    selectedDecodedBytes,
    selectedResourceIds,
    selectedResources,
  } as const;
}
