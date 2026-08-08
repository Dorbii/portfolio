import { useCallback, useEffect, useMemo, useState } from "react";
import type { CameraView } from "../shared/camera";
import type { DetailState } from "../shared/lod";
import {
  NinjaOneEnvironmentFoliage,
  type NinjaOneEnvironmentFoliageResidencyState,
} from "./NinjaOneEnvironmentFoliage";
import { NinjaOneEnvironmentSeamIntegration } from "./NinjaOneEnvironmentSeamIntegration";
import {
  NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_NATIVE_TILES,
} from "./model/ninjaOneEnvironmentNativeDetail";
import {
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_MOUNTED_NODES,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
  NINJAONE_ENVIRONMENT_FOLIAGE_NODES_PER_GROUP,
  resolveNinjaOneEnvironmentFoliageEligibility,
  selectNinjaOneEnvironmentFoliageInstances,
  type NinjaOneEnvironmentFoliageInstance,
  type NinjaOneEnvironmentFoliageResource,
} from "./model/ninjaOneEnvironmentFoliage";
import {
  NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_MOUNTED_RESOURCES,
  ninjaOneEnvironmentSeamSelectionKey,
  selectNinjaOneEnvironmentSeamIntegration,
  type NinjaOneEnvironmentSeamRequiredCohortState,
} from "./model/ninjaOneEnvironmentSeamIntegration";
import {
  activateNinjaOneEnvironmentNativeDecodeCohort,
  createNinjaOneEnvironmentNativeDecodeCohort,
  createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot,
  createNinjaOneEnvironmentRequiredPresentationCohort,
  ninjaOneEnvironmentRequiredPresentationKey,
  ninjaOneEnvironmentNativeTileKey,
  planNinjaOneEnvironmentNativeResidency,
  recordNinjaOneEnvironmentNativeDecodeEvent,
  recordNinjaOneEnvironmentRequiredPresentationEvent,
  resolveNinjaOneEnvironmentNativeDemand,
  resolveNinjaOneEnvironmentFoliageResidency,
  resolveNinjaOneEnvironmentOptionalGroupCapacity,
  resolveNinjaOneEnvironmentNativePresentation,
  resolveNinjaOneEnvironmentRequiredPresentation,
  retargetNinjaOneEnvironmentNativeDecodeCohort,
  retargetNinjaOneEnvironmentRequiredPresentationCohort,
  type NinjaOneEnvironmentNativeDecodeCohort,
  type NinjaOneEnvironmentNativeHydrologyAdmissionResource,
  type NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot,
  type NinjaOneEnvironmentRequiredPresentationCohort,
} from "./model/ninjaOneEnvironmentResidency";
import { NINJAONE_STREAM_REGISTRATION } from "../layers/water-surface/model/assets";
import { viewIntersectsHydrologyRegistration } from "../layers/water-surface/rendering/hydrology-runtime";

interface NinjaOneEnvironmentNativeDetailProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly onHydrologyAdmissionChange?: (
    snapshot: NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot | null,
  ) => void;
  readonly showFoliage: boolean;
}

interface NativeAdmissionResourceSource {
  readonly decodedBytes: number;
  readonly id: string;
  readonly path: string;
  readonly sha256: string;
}

const NATIVE_TILES_BY_ID = new Map(
  NINJAONE_ENVIRONMENT_NATIVE_TILES.map((tile) => [tile.id, tile]),
);

function nativeAdmissionResource(
  source: NativeAdmissionResourceSource,
  phase: NinjaOneEnvironmentNativeHydrologyAdmissionResource["phase"],
  nodeCount = 1,
): NinjaOneEnvironmentNativeHydrologyAdmissionResource {
  return Object.freeze({
    decodedBytes: source.decodedBytes,
    id: source.id,
    nodeCount,
    path: source.path,
    phase,
    sha256: source.sha256,
  });
}

function admitOptionalFoliage(
  candidates: readonly NinjaOneEnvironmentFoliageInstance[],
  initialDecodedBytes: number,
): {
  readonly instances: readonly NinjaOneEnvironmentFoliageInstance[];
  readonly resources: ReadonlyMap<string, NinjaOneEnvironmentFoliageResource>;
} {
  const resources = new Map<string, NinjaOneEnvironmentFoliageResource>();
  const instances: NinjaOneEnvironmentFoliageInstance[] = [];
  let decodedBytesValue = initialDecodedBytes;
  for (const instance of candidates) {
    const newResources = instance.resources.filter(({ id }) => !resources.has(id));
    const incrementalBytes = newResources.reduce(
      (total, resource) => total + resource.decodedBytes,
      0,
    );
    if (
      decodedBytesValue + incrementalBytes
        > NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES
    ) break;
    for (const resource of newResources) resources.set(resource.id, resource);
    decodedBytesValue += incrementalBytes;
    instances.push(instance);
  }
  return Object.freeze({ instances: Object.freeze(instances), resources });
}

export function NinjaOneEnvironmentNativeDetail({
  active,
  camera,
  detailState,
  onHydrologyAdmissionChange,
  showFoliage,
}: NinjaOneEnvironmentNativeDetailProps) {
  const [previousDemand, setPreviousDemand] = useState(false);
  const demand = resolveNinjaOneEnvironmentNativeDemand({
    active,
    camera,
    previousDemand,
    shouldLoadCloseAssets: detailState.shouldLoadCloseAssets,
  });
  if (demand !== previousDemand) {
    setPreviousDemand(demand);
  }
  const [previousFoliageEligible, setPreviousFoliageEligible] = useState(false);
  const maxDetailEligible = resolveNinjaOneEnvironmentFoliageEligibility({
    active,
    camera,
    previousEligible: previousFoliageEligible,
    shouldLoadCloseAssets: detailState.shouldLoadCloseAssets,
    showFoliage,
  });
  if (maxDetailEligible !== previousFoliageEligible) {
    setPreviousFoliageEligible(maxDetailEligible);
  }
  const [foliageResidencyState, setFoliageResidencyState] =
    useState<NinjaOneEnvironmentFoliageResidencyState | null>(null);
  const handleFoliageResidencyState = useCallback((
    state: NinjaOneEnvironmentFoliageResidencyState,
  ) => {
    setFoliageResidencyState(state);
  }, []);

  const plan = useMemo(
    () => planNinjaOneEnvironmentNativeResidency({
      camera,
      demand,
      // Foliage r3 owns the only supplemental DOM pool. Keeping the legacy
      // r2 candidates empty prevents duplicate canopy nodes and bytes.
      supplementalCandidates: [],
    }),
    [camera, demand],
  );
  const plannedTiles = plan.terrainTiles;
  const decodeTarget = {
    decodedBytes: plan.decodedBytes,
    resourceKeys: plannedTiles.map(ninjaOneEnvironmentNativeTileKey),
  };
  const [decodeCohort, setDecodeCohort] =
    useState<NinjaOneEnvironmentNativeDecodeCohort>(
      () => createNinjaOneEnvironmentNativeDecodeCohort(decodeTarget),
    );
  const currentCohort = retargetNinjaOneEnvironmentNativeDecodeCohort(
    decodeCohort,
    decodeTarget,
  );
  if (currentCohort !== decodeCohort) {
    setDecodeCohort(currentCohort);
  }
  const cohortEpoch = currentCohort.epoch;
  const cohortPhase = currentCohort.phase;
  useEffect(() => {
    if (cohortPhase !== "evicting") {
      return undefined;
    }
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setDecodeCohort((current) => (
          activateNinjaOneEnvironmentNativeDecodeCohort(current, cohortEpoch)
        ));
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) {
        cancelAnimationFrame(secondFrame);
      }
    };
  }, [cohortEpoch, cohortPhase]);
  const { decodedKeys, failedKeys } = currentCohort;
  const recordDecodeEvent = useCallback((
    epoch: number,
    targetKey: string,
    resourceKey: string,
    status: "decoded" | "failed",
  ) => {
    setDecodeCohort((current) => (
      recordNinjaOneEnvironmentNativeDecodeEvent(current, {
        epoch,
        resourceKey,
        status,
        targetKey,
      })
    ));
  }, []);
  const presentation = resolveNinjaOneEnvironmentNativePresentation({
    decodedKeys,
    failedKeys,
    lowerDetailAvailable: true,
    plan,
  });
  const tiles = currentCohort.phase === "active"
    ? plannedTiles
    : [];
  const requiredPreloadActive = currentCohort.phase === "active"
    && plan.admitted
    && plan.fullyCovered
    && plannedTiles.length > 0;
  const plannedSeamResources = demand
    && plan.admitted
    && plan.fullyCovered
    && plannedTiles.length > 0
    ? selectNinjaOneEnvironmentSeamIntegration(camera)
    : [];
  const selectedSeamResources = requiredPreloadActive
    ? plannedSeamResources
    : [];
  const seamDecodedBytes = selectedSeamResources.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  const seamNodeCount = selectedSeamResources.length;
  const hydrologyRegistrationIntersects = detailState.shouldLoadCloseAssets
    && viewIntersectsHydrologyRegistration(
      camera,
      NINJAONE_STREAM_REGISTRATION.worldOrigin,
      NINJAONE_STREAM_REGISTRATION.worldSpan,
    );
  const requiredDecodedBytes = plan.decodedBytes
    + seamDecodedBytes;
  const requiredSupplementsAdmitted = seamNodeCount
    <= NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_MOUNTED_RESOURCES
    && seamNodeCount <= NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES
    && requiredDecodedBytes <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES;
  const seamSelectionKey = ninjaOneEnvironmentSeamSelectionKey(
    selectedSeamResources,
  );
  const seamRequiredKey = selectedSeamResources.length > 0
    ? ninjaOneEnvironmentRequiredPresentationKey(
        "seam",
        selectedSeamResources,
      )
    : null;
  const requiredTarget = {
    requiredKeys: seamRequiredKey ? [seamRequiredKey] : [],
    terrainCohortKey: currentCohort.targetKey,
  };
  const [requiredCohort, setRequiredCohort] =
    useState<NinjaOneEnvironmentRequiredPresentationCohort>(
      () => createNinjaOneEnvironmentRequiredPresentationCohort(requiredTarget),
    );
  const retargetedRequiredCohort =
    retargetNinjaOneEnvironmentRequiredPresentationCohort(
      requiredCohort,
      requiredTarget,
    );
  // The seam component remounts its complete exact path+hash cohort whenever
  // selection identity changes. Its shared resources therefore reload too;
  // do not preserve their prior ready state across the presentation epoch.
  const currentRequiredCohort = retargetedRequiredCohort === requiredCohort
    ? requiredCohort
    : createNinjaOneEnvironmentRequiredPresentationCohort(
        requiredTarget,
        retargetedRequiredCohort.epoch,
      );
  if (currentRequiredCohort !== requiredCohort) {
    setRequiredCohort(currentRequiredCohort);
  }
  const handleSeamRequiredCohortState = (
    state: NinjaOneEnvironmentSeamRequiredCohortState,
  ) => {
    if (
      !seamRequiredKey
      || state.epoch !== currentRequiredCohort.epoch
      || state.key !== seamSelectionKey
    ) return;
    setRequiredCohort((current) => (
      recordNinjaOneEnvironmentRequiredPresentationEvent(current, {
        epoch: currentRequiredCohort.epoch,
        requiredKey: seamRequiredKey,
        status: state.status,
        targetKey: currentRequiredCohort.targetKey,
      })
    ));
  };
  const requiredPresentation = resolveNinjaOneEnvironmentRequiredPresentation({
    cohort: currentRequiredCohort,
    lowerDetailAvailable: true,
    terrainState: requiredSupplementsAdmitted
      ? presentation.state
      : "budget-blocked",
  });
  const requiredResourcesReady = currentRequiredCohort.requiredKeys.every((key) => (
    currentRequiredCohort.readyKeys.has(key)
  )) && currentRequiredCohort.failedKeys.size === 0;
  const visible = requiredPresentation.visible;
  const maximumFoliageGroups = requiredSupplementsAdmitted
    ? resolveNinjaOneEnvironmentOptionalGroupCapacity({
        maximumGroups: NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
        maximumSupplementalNodes: NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
        nodesPerGroup: NINJAONE_ENVIRONMENT_FOLIAGE_NODES_PER_GROUP,
        requiredSupplementalNodes: seamNodeCount,
      })
    : 0;
  const candidateFoliageInstances = visible
    && maxDetailEligible
    ? selectNinjaOneEnvironmentFoliageInstances(
        camera,
        maxDetailEligible,
        maximumFoliageGroups,
      )
    : [];
  const admittedFoliage = admitOptionalFoliage(
    candidateFoliageInstances,
    requiredDecodedBytes,
  );
  const foliageResources = admittedFoliage.resources;
  const selectedFoliageInstances = admittedFoliage.instances;
  const foliageResourceList = [...foliageResources.values()].sort((left, right) => (
    left.id.localeCompare(right.id)
  ));
  const foliageDecodedBytes = foliageResourceList.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  const foliageNodeCount = selectedFoliageInstances.reduce(
    (total, instance) => total + instance.resources.length,
    0,
  );
  const supplementalNodeCount = foliageNodeCount + seamNodeCount;
  const supplementalDecodedBytes = foliageDecodedBytes + seamDecodedBytes;
  const supplementalAdmitted = requiredSupplementsAdmitted
    && foliageNodeCount
    <= NINJAONE_ENVIRONMENT_FOLIAGE_MAX_MOUNTED_NODES
    && supplementalNodeCount
      <= NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES
    && plan.decodedBytes + supplementalDecodedBytes
      <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES;
  const visibleFoliageInstances = supplementalAdmitted
    ? selectedFoliageInstances
    : [];
  const foliageCohortKey = foliageResourceList.map(({ id, path, sha256 }) => (
    `${id}\t${path}#sha256=${sha256}`
  )).join("\n");
  const foliageResourceIds = foliageResourceList.map(({ id }) => id);
  const foliageResidency = resolveNinjaOneEnvironmentFoliageResidency({
    candidateDecodedBytes: supplementalAdmitted ? foliageDecodedBytes : 0,
    candidateNodeCount: supplementalAdmitted ? foliageNodeCount : 0,
    candidateResourceIds: supplementalAdmitted ? foliageResourceIds : [],
    expectedCohortKey: supplementalAdmitted ? foliageCohortKey : "",
    expectedEpoch: currentRequiredCohort.epoch,
    observation: foliageResidencyState,
  });
  const applicationOwnedFoliageResources = foliageResourceList.filter(({ id }) => (
    foliageResidency.resourceIds.includes(id)
  ));
  const applicationOwnedFoliageDecodedBytes = foliageResidency.decodedBytes;
  const applicationOwnedFoliageNodeCount = foliageResidency.nodeCount;
  const applicationOwnedSupplementalDecodedBytes = seamDecodedBytes
    + applicationOwnedFoliageDecodedBytes;
  const applicationOwnedSupplementalNodeCount = seamNodeCount
    + applicationOwnedFoliageNodeCount;
  const decodedTerrainTiles = tiles.filter((tile) => (
    decodedKeys.has(ninjaOneEnvironmentNativeTileKey(tile))
  ));
  const terrainApplicationOwnedDecodedBytes = currentCohort.mountedDecodedBytes
    + currentCohort.retiringDecodedBytes;
  const mountedTerrainIds = currentCohort.mountedKeys.map((key) => (
    key.replace(/^terrain:/, "")
  ));
  const retiringTerrainIds = currentCohort.retiringKeys.map((key) => (
    key.replace(/^terrain:/, "")
  ));
  const applicationOwnedTerrainIds = [...new Set([
    ...mountedTerrainIds,
    ...retiringTerrainIds,
  ])];
  const applicationOwnedSupplementalIds = supplementalAdmitted
    ? [
        ...applicationOwnedFoliageResources.map(({ id }) => id),
        ...selectedSeamResources.map(({ id }) => id),
      ]
    : [];
  const applicationOwnedResourceIds = [
    ...applicationOwnedTerrainIds,
    ...applicationOwnedSupplementalIds,
  ];
  const applicationOwnedDecodedBytes = terrainApplicationOwnedDecodedBytes
    + (supplementalAdmitted ? applicationOwnedSupplementalDecodedBytes : 0);
  const nativeDecodedUnionBytes = applicationOwnedDecodedBytes;
  const currentAdmissionResources: NinjaOneEnvironmentNativeHydrologyAdmissionResource[] = [];
  for (const id of applicationOwnedTerrainIds) {
    const tile = NATIVE_TILES_BY_ID.get(id);
    if (!tile) throw new TypeError(`Native admission tile ${id} is not registered.`);
    currentAdmissionResources.push(nativeAdmissionResource(
      tile,
      retiringTerrainIds.includes(id) ? "retiring" : "mounted",
    ));
  }
  if (supplementalAdmitted) {
    for (const resource of selectedSeamResources) {
      currentAdmissionResources.push(nativeAdmissionResource(resource, "mounted"));
    }
    for (const resource of applicationOwnedFoliageResources) {
      currentAdmissionResources.push(nativeAdmissionResource(
        resource,
        foliageResidency.mounted ? "mounted" : "incoming",
      ));
    }
  }
  const targetAdmissionResources: NinjaOneEnvironmentNativeHydrologyAdmissionResource[] = [
    ...plannedTiles.map((tile) => nativeAdmissionResource(tile, "incoming")),
    ...plannedSeamResources.map((resource) => (
      nativeAdmissionResource(resource, "incoming")
    )),
    ...(supplementalAdmitted
      ? applicationOwnedFoliageResources.map((resource) => (
          nativeAdmissionResource(resource, "incoming")
        ))
      : []),
  ];
  const targetRequiredNodeCount = plannedTiles.length + plannedSeamResources.length;
  const createHydrologyAdmission = (epoch: number) => (
    createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot({
      camera,
      demand,
      epoch,
      optionalNodeCount: supplementalAdmitted ? applicationOwnedFoliageNodeCount : 0,
      presentationReady: visible,
      registrationIntersects: hydrologyRegistrationIntersects,
      requiredNodeCount: targetRequiredNodeCount,
      resources: currentAdmissionResources,
      targetResources: targetAdmissionResources,
    })
  );
  const draftHydrologyAdmission = createHydrologyAdmission(0);
  const hydrologyAdmissionIdentity = JSON.stringify({
    cameraKey: draftHydrologyAdmission.cameraKey,
    currentPhases: draftHydrologyAdmission.resources.map(({ id, phase }) => `${id}:${phase}`),
    currentResourceKey: draftHydrologyAdmission.currentResourceKey,
    demand: draftHydrologyAdmission.demand,
    optionalNodeCount: draftHydrologyAdmission.optionalNodeCount,
    presentationReady: draftHydrologyAdmission.presentationReady,
    registrationIntersects: draftHydrologyAdmission.registrationIntersects,
    requiredNodeCount: draftHydrologyAdmission.requiredNodeCount,
    targetResourceKey: draftHydrologyAdmission.targetResourceKey,
  });
  const [hydrologyAdmissionPublication, setHydrologyAdmissionPublication] = useState(() => ({
    identity: hydrologyAdmissionIdentity,
    snapshot: draftHydrologyAdmission,
  }));
  const currentHydrologyAdmissionPublication =
    hydrologyAdmissionPublication.identity === hydrologyAdmissionIdentity
      ? hydrologyAdmissionPublication
      : {
          identity: hydrologyAdmissionIdentity,
          snapshot: createHydrologyAdmission(
            hydrologyAdmissionPublication.snapshot.epoch + 1,
          ),
        };
  if (currentHydrologyAdmissionPublication !== hydrologyAdmissionPublication) {
    setHydrologyAdmissionPublication(currentHydrologyAdmissionPublication);
  }
  const hydrologyAdmissionSnapshot = currentHydrologyAdmissionPublication.snapshot;
  useEffect(() => {
    onHydrologyAdmissionChange?.(hydrologyAdmissionSnapshot);
    return () => onHydrologyAdmissionChange?.(null);
  }, [hydrologyAdmissionSnapshot, onHydrologyAdmissionChange]);
  const nativeDetailState = [...failedKeys].some((key) => (
    tiles.some((tile) => ninjaOneEnvironmentNativeTileKey(tile) === key)
  ))
    ? "error"
    : requiredPresentation.state;
  const supplementalDetailState = Object.freeze({
    ...detailState,
    shouldLoadCloseAssets: demand,
  });

  return (
    <g
      className="ninjaone-environment-native-detail"
      data-environment-native-application-owned-decoded-bytes={
        applicationOwnedDecodedBytes
      }
      data-environment-native-application-owned-resource-ids={
        applicationOwnedResourceIds.join(",")
      }
      data-environment-native-decoded-bytes={applicationOwnedDecodedBytes}
      data-environment-native-cohort-epoch={currentCohort.epoch}
      data-environment-native-cohort-key={currentCohort.targetKey}
      data-environment-native-cohort-phase={currentCohort.phase}
      data-environment-native-decoded-tile-ids={
        decodedTerrainTiles.map(({ id }) => id).join(",")
      }
      data-environment-native-demand={demand}
      data-environment-native-fully-covered={plan.fullyCovered}
      data-environment-native-foliage-max-detail-eligible={maxDetailEligible}
      data-environment-native-foliage-maximum-groups={
        supplementalAdmitted ? visibleFoliageInstances.length : 0
      }
      data-environment-native-foliage-residency-cohort-key={foliageCohortKey}
      data-environment-native-foliage-residency-epoch={currentRequiredCohort.epoch}
      data-environment-native-foliage-residency-phase={
        foliageResidency.phase
      }
      data-environment-native-hydrology-admission-camera-key={
        hydrologyAdmissionSnapshot.cameraKey
      }
      data-environment-native-hydrology-admission-current-decoded-bytes={
        hydrologyAdmissionSnapshot.currentDecodedBytes
      }
      data-environment-native-hydrology-admission-current-resource-key={
        hydrologyAdmissionSnapshot.currentResourceKey
      }
      data-environment-native-hydrology-admission-current-resources={
        JSON.stringify(hydrologyAdmissionSnapshot.resources)
      }
      data-environment-native-hydrology-admission-epoch={
        hydrologyAdmissionSnapshot.epoch
      }
      data-environment-native-hydrology-admission-presentation-ready={
        hydrologyAdmissionSnapshot.presentationReady
      }
      data-environment-native-hydrology-admission-reserved-decoded-bytes={
        hydrologyAdmissionSnapshot.reservedDecodedBytes
      }
      data-environment-native-hydrology-admission-target-decoded-bytes={
        hydrologyAdmissionSnapshot.targetDecodedBytes
      }
      data-environment-native-hydrology-admission-target-resource-key={
        hydrologyAdmissionSnapshot.targetResourceKey
      }
      data-environment-native-hydrology-admission-target-resources={
        JSON.stringify(hydrologyAdmissionSnapshot.targetResources)
      }
      data-environment-native-hydrology-registration-intersects={
        hydrologyRegistrationIntersects
      }
      data-environment-native-instance-count={visibleFoliageInstances.length}
      data-environment-native-seam-decoded-bytes={
        supplementalAdmitted ? seamDecodedBytes : 0
      }
      data-environment-native-seam-node-count={
        supplementalAdmitted ? seamNodeCount : 0
      }
      data-environment-native-seam-resource-ids={
        supplementalAdmitted
          ? selectedSeamResources.map(({ id }) => id).join(",")
          : ""
      }
      data-environment-native-supplemental-admitted={supplementalAdmitted}
      data-environment-native-supplemental-decoded-bytes={
        supplementalAdmitted ? applicationOwnedSupplementalDecodedBytes : 0
      }
      data-environment-native-supplemental-node-count={
        supplementalAdmitted ? applicationOwnedSupplementalNodeCount : 0
      }
      data-environment-native-supplemental-resource-ids={
        applicationOwnedSupplementalIds.join(",")
      }
      data-environment-native-lower-detail-required={
        requiredPresentation.lowerDetailRequired
      }
      data-environment-native-maximum-decoded-bytes={
        NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES
      }
      data-environment-native-no-visible-gap={requiredPresentation.noVisibleGap}
      data-environment-native-planned-decoded-union-bytes={nativeDecodedUnionBytes}
      data-environment-native-paint-order={tiles.map(({ id }) => id).join(",")}
      data-environment-native-requested-decoded-bytes={plan.decodedBytes}
      data-environment-native-requested-tile-ids={
        plannedTiles.map(({ id }) => id).join(",")
      }
      data-environment-native-retiring-resource-keys={
        currentCohort.retiringKeys.join(",")
      }
      data-environment-native-retiring-resource-ids={
        retiringTerrainIds.join(",")
      }
      data-environment-native-required-cohort-epoch={currentRequiredCohort.epoch}
      data-environment-native-required-cohort-key={currentRequiredCohort.targetKey}
      data-environment-native-required-decoded-bytes={
        requiredSupplementsAdmitted ? seamDecodedBytes : 0
      }
      data-environment-native-required-no-visible-gap={
        requiredPresentation.noVisibleGap
      }
      data-environment-native-required-node-count={
        requiredSupplementsAdmitted ? seamNodeCount : 0
      }
      data-environment-native-required-preload-active={
        requiredPreloadActive && requiredSupplementsAdmitted
      }
      data-environment-native-required-ready={
        requiredResourcesReady
      }
      data-environment-native-required-failed-keys={
        JSON.stringify([...currentRequiredCohort.failedKeys])
      }
      data-environment-native-required-ready-keys={
        JSON.stringify([...currentRequiredCohort.readyKeys])
      }
      data-environment-native-required-resource-ids={
        requiredSupplementsAdmitted
          ? selectedSeamResources.map(({ id }) => id).join(",")
          : ""
      }
      data-environment-native-required-resource-keys={
        JSON.stringify(currentRequiredCohort.requiredKeys)
      }
      data-environment-native-required-state={requiredPresentation.state}
      data-environment-native-state={nativeDetailState}
      data-environment-native-terrain-mounted-decoded-bytes={
        currentCohort.mountedDecodedBytes
      }
      data-environment-native-terrain-mounted-resource-keys={
        currentCohort.mountedKeys.join(",")
      }
      data-environment-native-terrain-mounted-resource-ids={
        mountedTerrainIds.join(",")
      }
      data-environment-native-terrain-application-owned-decoded-bytes={
        terrainApplicationOwnedDecodedBytes
      }
      data-environment-native-terrain-application-owned-resource-ids={
        applicationOwnedTerrainIds.join(",")
      }
      data-environment-native-terrain-retiring-decoded-bytes={
        currentCohort.retiringDecodedBytes
      }
      data-environment-native-terrain-state={presentation.state}
      data-environment-native-tile-count={tiles.length}
      data-environment-native-tile-ids={tiles.map(({ id }) => id).join(",")}
      data-environment-native-visible={visible}
      opacity={visible ? 1 : 0}
    >
      {tiles.length > 0 ? (
        <g data-environment-layer="terrain-geology-native">
          {tiles.map((tile) => (
            <image
              data-environment-native-tile={tile.id}
              height={tile.artboardBounds.span[1]}
              href={tile.path}
              key={`${currentCohort.epoch}:${tile.id}`}
              onError={() => recordDecodeEvent(
                currentCohort.epoch,
                currentCohort.targetKey,
                ninjaOneEnvironmentNativeTileKey(tile),
                "failed",
              )}
              onLoad={() => recordDecodeEvent(
                currentCohort.epoch,
                currentCohort.targetKey,
                ninjaOneEnvironmentNativeTileKey(tile),
                "decoded",
              )}
              preserveAspectRatio="none"
              width={tile.artboardBounds.span[0]}
              x={tile.artboardBounds.origin[0]}
              y={tile.artboardBounds.origin[1]}
            />
          ))}
        </g>
      ) : null}
      <NinjaOneEnvironmentSeamIntegration
        active={requiredPreloadActive && requiredSupplementsAdmitted}
        camera={camera}
        detailState={supplementalDetailState}
        onRequiredCohortStateChange={handleSeamRequiredCohortState}
        presentationReady={visible}
        requiredCohortEpoch={currentRequiredCohort.epoch}
      />
      <NinjaOneEnvironmentFoliage
        active={visible}
        camera={camera}
        detailState={supplementalDetailState}
        maxDetailEligible={maxDetailEligible}
        maximumGroups={visibleFoliageInstances.length}
        onResidencyStateChange={handleFoliageResidencyState}
        residencyEpoch={currentRequiredCohort.epoch}
        showFoliage={showFoliage && supplementalAdmitted}
      />
    </g>
  );
}
