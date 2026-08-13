import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { CameraView } from "../../../../shared/camera";
import type { DetailState } from "../../../../shared/lod";
import {
  NINJAONE_ENVIRONMENT_FOLIAGE_NODES_PER_GROUP,
  environmentFoliageResourceCohort,
  selectNinjaOneEnvironmentFoliageInstances,
  type NinjaOneEnvironmentFoliageInstance,
  type NinjaOneEnvironmentFoliageResource,
} from "../model/ninjaOneEnvironmentFoliage";
import {
  advanceNinjaOneEnvironmentFoliageHiddenPaintBarrier,
  createNinjaOneEnvironmentFoliageNodeLoadCohort,
  observeNinjaOneEnvironmentFoliageDomResidency,
  recordNinjaOneEnvironmentFoliageNodeLoadEvent,
  retargetNinjaOneEnvironmentFoliageNodeLoadCohort,
  type NinjaOneEnvironmentFoliageDomResidencyState,
  type NinjaOneEnvironmentFoliageNodeLoadCohort,
} from "../model/ninjaOneEnvironmentResidency";

export type NinjaOneEnvironmentFoliageLoadStatus =
  | "error"
  | "idle"
  | "loading"
  | "ready";

export type NinjaOneEnvironmentFoliageResidencyState =
  NinjaOneEnvironmentFoliageDomResidencyState;

export interface NinjaOneEnvironmentFoliageProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly maxDetailEligible: boolean;
  readonly maximumGroups: number;
  readonly onResidencyStateChange?: (
    state: NinjaOneEnvironmentFoliageResidencyState,
  ) => void;
  readonly residencyEpoch: number;
  readonly showFoliage: boolean;
}

function foliageResourceKey(
  resource: NinjaOneEnvironmentFoliageResource,
): string {
  return `${resource.id}\t${resource.path}#sha256=${resource.sha256}`;
}

function exactFoliageResourceCohort(
  resources: readonly NinjaOneEnvironmentFoliageResource[],
): string {
  return resources.map(foliageResourceKey).sort().join("\n");
}

function foliageStyle(
  instance: NinjaOneEnvironmentFoliageInstance,
): CSSProperties {
  return {
    "--ninjaone-foliage-bend-lag": `${(-instance.bendDegrees * 0.18).toFixed(3)}deg`,
    "--ninjaone-foliage-bend-peak": `${instance.bendDegrees.toFixed(3)}deg`,
    "--ninjaone-foliage-bend-return": `${(instance.bendDegrees * 0.22).toFixed(3)}deg`,
    "--ninjaone-foliage-bend-start": `${(-instance.bendDegrees * 0.52).toFixed(3)}deg`,
    "--ninjaone-foliage-duration": `${instance.durationSeconds}s`,
    "--ninjaone-foliage-lag-peak": `${instance.lagDegrees.toFixed(3)}deg`,
    "--ninjaone-foliage-lag-start": `${(-instance.lagDegrees * 0.55).toFixed(3)}deg`,
    "--ninjaone-foliage-phase": `${instance.phaseSeconds}s`,
    "--ninjaone-foliage-pivot-y": `${instance.pivotYPercent}%`,
  } as CSSProperties;
}

function FoliageGroup({
  cohortEpoch,
  instance,
  onResourceError,
  onResourceLoad,
  visible,
}: {
  readonly cohortEpoch: number;
  readonly instance: NinjaOneEnvironmentFoliageInstance;
  readonly onResourceError: (
    cohortEpoch: number,
    resourceKey: string,
  ) => void;
  readonly onResourceLoad: (
    cohortEpoch: number,
    resourceKey: string,
  ) => void;
  readonly visible: boolean;
}) {
  const { origin, span } = instance.artboardBounds;
  const neutralizationKey = foliageResourceKey(instance.neutralizationResource);
  const canopyKey = foliageResourceKey(instance.canopyResource);
  const handleLoad = (resourceKey: string) => {
    onResourceLoad(cohortEpoch, resourceKey);
  };
  return (
    <g
      data-environment-foliage-checkpoint={instance.checkpoint}
      data-environment-foliage-grid-cell={instance.gridCell}
      data-environment-foliage-group={instance.id}
      data-environment-foliage-group-node-count={
        NINJAONE_ENVIRONMENT_FOLIAGE_NODES_PER_GROUP
      }
    >
      <image
        className="ninjaone-environment-native-detail__canopy-neutralization"
        data-environment-foliage-kind={instance.neutralizationResource.kind}
        data-shared-resource={instance.neutralizationResource.id}
        height={span[1]}
        href={instance.neutralizationResource.path}
        onError={() => onResourceError(cohortEpoch, neutralizationKey)}
        onLoad={() => handleLoad(neutralizationKey)}
        preserveAspectRatio="none"
        width={span[0]}
        x={origin[0]}
        y={origin[1]}
      />
      <image
        className="ninjaone-environment-native-detail__canopy-sway"
        data-environment-foliage-animation={instance.animation}
        data-environment-foliage-instance={instance.id}
        data-environment-foliage-kind={instance.canopyResource.kind}
        data-shared-resource={instance.canopyResource.id}
        height={span[1]}
        href={instance.canopyResource.path}
        onError={() => onResourceError(cohortEpoch, canopyKey)}
        onLoad={() => handleLoad(canopyKey)}
        preserveAspectRatio="none"
        style={{
          ...foliageStyle(instance),
          animationPlayState: visible ? "running" : "paused",
        }}
        width={span[0]}
        x={origin[0]}
        y={origin[1]}
      />
    </g>
  );
}

export function NinjaOneEnvironmentFoliage({
  active,
  camera,
  detailState,
  maxDetailEligible,
  maximumGroups,
  onResidencyStateChange,
  residencyEpoch,
  showFoliage,
}: NinjaOneEnvironmentFoliageProps) {
  const instances = useMemo(
    () => active
      && showFoliage
      && detailState.shouldLoadSiteAssets
      && maxDetailEligible
      ? selectNinjaOneEnvironmentFoliageInstances(
          camera,
          maxDetailEligible,
          maximumGroups,
        )
      : [],
    [
      active,
      camera,
      detailState.shouldLoadSiteAssets,
      maxDetailEligible,
      maximumGroups,
      showFoliage,
    ],
  );
  const selectedResources = useMemo(() => {
    const resources = new Map(instances.flatMap(({ resources }) => (
      resources.map((resource) => [resource.id, resource] as const)
    )));
    return [...resources.values()].sort((left, right) => (
      left.id.localeCompare(right.id)
    ));
  }, [instances]);
  const assetCohort = useMemo(
    () => environmentFoliageResourceCohort(selectedResources),
    [selectedResources],
  );
  const exactResourceKeys = useMemo(
    () => selectedResources.map(foliageResourceKey).sort(),
    [selectedResources],
  );
  const exactCohortKey = useMemo(
    () => assetCohort ? exactFoliageResourceCohort(selectedResources) : "",
    [assetCohort, selectedResources],
  );
  const [loadState, setLoadState] = useState<NinjaOneEnvironmentFoliageNodeLoadCohort>(
    createNinjaOneEnvironmentFoliageNodeLoadCohort,
  );
  let currentLoadState = loadState;
  if (loadState.key !== exactCohortKey) {
    // React's guarded prop-derived-state pattern makes the replacement epoch
    // part of this render. The old keyed SVG nodes are removed in the same
    // commit, so no passive-effect frame can expose or account both cohorts.
    currentLoadState = retargetNinjaOneEnvironmentFoliageNodeLoadCohort(
      loadState,
      exactCohortKey,
    );
    setLoadState(currentLoadState);
  }
  const recordResourceError = (
    cohortEpoch: number,
    resourceKey: string,
  ) => {
    setLoadState((previous) => recordNinjaOneEnvironmentFoliageNodeLoadEvent({
      cohort: previous,
      epoch: cohortEpoch,
      event: "error",
      key: exactCohortKey,
      resourceKey,
      resourceKeys: exactResourceKeys,
    }));
  };
  const recordResourceLoad = (
    cohortEpoch: number,
    resourceKey: string,
  ) => {
    setLoadState((previous) => recordNinjaOneEnvironmentFoliageNodeLoadEvent({
      cohort: previous,
      epoch: cohortEpoch,
      event: "load",
      key: exactCohortKey,
      resourceKey,
      resourceKeys: exactResourceKeys,
    }));
  };
  const expectedResourceCount = selectedResources.length;
  useEffect(() => {
    if (
      !exactCohortKey
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
    exactCohortKey,
    exactResourceKeys,
    currentLoadState.epoch,
    currentLoadState.failedKeys.length,
    currentLoadState.loadedKeys.length,
    currentLoadState.status,
    expectedResourceCount,
  ]);

  const loadStatus: NinjaOneEnvironmentFoliageLoadStatus = !exactCohortKey
    ? "idle"
    : currentLoadState.key === exactCohortKey
      ? currentLoadState.status
      : "loading";
  const visible = active
    && showFoliage
    && detailState.shouldLoadSiteAssets
    && maxDetailEligible
    && loadStatus === "ready";
  const selectedResourceIds = selectedResources.map(({ id }) => id).join(",");
  const selectedDecodedBytes = selectedResources.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  const selectedImageNodeCount = instances.length
    * NINJAONE_ENVIRONMENT_FOLIAGE_NODES_PER_GROUP;
  const cohortMounted = Boolean(exactCohortKey) && loadStatus !== "error";
  const groupRef = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    const group = groupRef.current;
    const mountedResourceIds = group
      ? [...group.querySelectorAll<SVGImageElement>("image[data-shared-resource]")]
          .map((node) => node.dataset.sharedResource ?? "")
          .filter(Boolean)
      : [];
    const residencyState = observeNinjaOneEnvironmentFoliageDomResidency({
      cohortKey: exactCohortKey,
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
    exactCohortKey,
    loadStatus,
    onResidencyStateChange,
    residencyEpoch,
    selectedResources,
    visible,
  ]);

  return (
    <g
      className="ninjaone-environment-foliage-r3"
      ref={groupRef}
      data-environment-foliage-cohort-epoch={currentLoadState.epoch}
      data-environment-foliage-cohort-key={exactCohortKey}
      data-environment-foliage-hidden-painted-frames={
        currentLoadState.hiddenPaintedFrames
      }
      data-environment-foliage-instance-count={instances.length}
      data-environment-foliage-max-detail-eligible={maxDetailEligible}
      data-environment-foliage-maximum-groups={maximumGroups}
      data-environment-foliage-mounted-decoded-bytes={
        cohortMounted ? selectedDecodedBytes : 0
      }
      data-environment-foliage-mounted-image-node-count={
        cohortMounted ? selectedImageNodeCount : 0
      }
      data-environment-foliage-mounted-resource-ids={
        cohortMounted ? selectedResourceIds : ""
      }
      data-environment-foliage-selected-decoded-bytes={selectedDecodedBytes}
      data-environment-foliage-selected-image-node-count={selectedImageNodeCount}
      data-environment-foliage-selected-resource-ids={selectedResourceIds}
      data-environment-foliage-state={loadStatus}
      data-environment-foliage-visible={visible}
      opacity={visible ? 1 : 0}
    >
      {cohortMounted ? instances.map((instance) => (
        <FoliageGroup
          cohortEpoch={currentLoadState.epoch}
          instance={instance}
          key={`${currentLoadState.epoch}:${instance.id}`}
          onResourceError={recordResourceError}
          onResourceLoad={recordResourceLoad}
          visible={visible}
        />
      )) : null}
    </g>
  );
}
