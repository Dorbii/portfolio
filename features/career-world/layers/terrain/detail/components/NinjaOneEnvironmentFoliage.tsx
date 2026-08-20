import { useEffect, useMemo, useRef, useState } from "react";
import type { CameraView } from "../../../../shared/camera";
import type { DetailState } from "../../../../shared/lod";
import {
  environmentFoliageCameraArtboardView,
  selectNinjaOneEnvironmentFoliageInstances,
  type NinjaOneEnvironmentFoliageAtlasRect,
  type NinjaOneEnvironmentFoliageInstance,
  type NinjaOneEnvironmentFoliageResource,
} from "../model/ninjaOneEnvironmentFoliage";
import type { NinjaOneEnvironmentFoliageDomResidencyState } from "../model/ninjaOneEnvironmentResidency";
import { useNinjaOneEnvironmentFoliageResidency } from "../model/useNinjaOneEnvironmentFoliageResidency";
import { NinjaOneEnvironmentFoliageCanvas } from "./NinjaOneEnvironmentFoliageCanvas";

export type NinjaOneEnvironmentFoliageResidencyState =
  NinjaOneEnvironmentFoliageDomResidencyState;

export interface NinjaOneEnvironmentFoliageProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly maxDetailEligible: boolean;
  readonly maximumDecodedBytes: number;
  readonly maximumGroups: number;
  readonly onResidencyStateChange?: (
    state: NinjaOneEnvironmentFoliageResidencyState,
  ) => void;
  readonly residencyEpoch: number;
  readonly showFoliage: boolean;
}

function resourceKey(resource: NinjaOneEnvironmentFoliageResource): string {
  return `${resource.id}\t${resource.path}#sha256=${resource.sha256}`;
}

export function ninjaOneEnvironmentFoliageAtlasImageId(
  resource: NinjaOneEnvironmentFoliageResource,
): string {
  return `ninjaone-pooled-foliage-${resource.id.replaceAll(/[^a-z0-9_-]/gi, "-")}`;
}

function FoliageAtlasFrame({
  atlasImageId,
  frame,
  instance,
  kind,
  paint,
}: {
  readonly atlasImageId: string;
  readonly frame: NinjaOneEnvironmentFoliageAtlasRect;
  readonly instance: NinjaOneEnvironmentFoliageInstance;
  readonly kind: "coherent-canopy" | "neutralization-underlay";
  readonly paint: boolean;
}) {
  const { origin, span } = instance.artboardBounds;
  const [frameX, frameY, frameWidth, frameHeight] = frame;
  return (
    <svg
      className={kind === "coherent-canopy"
        ? "ninjaone-environment-native-detail__canopy-fallback"
        : "ninjaone-environment-native-detail__canopy-neutralization"}
      data-environment-foliage-frame={frame.join(",")}
      data-environment-foliage-instance={kind === "coherent-canopy"
        ? instance.id
        : undefined}
      data-environment-foliage-kind={kind}
      height={span[1]}
      overflow="hidden"
      preserveAspectRatio="none"
      viewBox={`${frameX} ${frameY} ${frameWidth} ${frameHeight}`}
      width={span[0]}
      x={origin[0]}
      y={origin[1]}
    >
      {paint ? <use href={`#${atlasImageId}`} /> : null}
    </svg>
  );
}

export function NinjaOneEnvironmentFoliageGroup({
  instance,
  showCanopyFallback,
}: {
  readonly instance: NinjaOneEnvironmentFoliageInstance;
  readonly showCanopyFallback: boolean;
}) {
  const atlasImageId = ninjaOneEnvironmentFoliageAtlasImageId(instance.atlasResource);
  return (
    <g
      data-environment-foliage-checkpoint={instance.checkpoint}
      data-environment-foliage-composition={instance.composition}
      data-environment-foliage-grid-cell={instance.gridCell}
      data-environment-foliage-group={instance.id}
      data-environment-foliage-group-node-count={instance.paintedNodeCount}
      data-environment-foliage-species={instance.species}
    >
      {instance.neutralizationAtlasRect ? (
        <FoliageAtlasFrame
          atlasImageId={atlasImageId}
          frame={instance.neutralizationAtlasRect}
          instance={instance}
          kind="neutralization-underlay"
          paint
        />
      ) : null}
      <FoliageAtlasFrame
        atlasImageId={atlasImageId}
        frame={instance.canopyAtlasRect}
        instance={instance}
        kind="coherent-canopy"
        paint={showCanopyFallback}
      />
    </g>
  );
}

function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);
  return reduceMotion;
}

export function NinjaOneEnvironmentFoliage({
  active,
  camera,
  detailState,
  maxDetailEligible,
  maximumDecodedBytes,
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
          maximumDecodedBytes,
        )
      : [],
    [
      active,
      camera,
      detailState.shouldLoadSiteAssets,
      maxDetailEligible,
      maximumDecodedBytes,
      maximumGroups,
      showFoliage,
    ],
  );
  const groupRef = useRef<SVGGElement>(null);
  const residency = useNinjaOneEnvironmentFoliageResidency({
    groupRef,
    instances,
    onResidencyStateChange,
    residencyEpoch,
  });
  const [canvasReady, setCanvasReady] = useState(false);
  const reduceMotion = useReducedMotion();
  const artboardCamera = useMemo(
    () => environmentFoliageCameraArtboardView(camera),
    [camera],
  );
  const visible = active
    && showFoliage
    && detailState.shouldLoadSiteAssets
    && maxDetailEligible
    && residency.loadStatus === "ready";
  const selectedImageNodeCount = residency.selectedResources.length;
  const atlases = residency.selectedResources;

  return (
    <g
      className="ninjaone-environment-foliage-r6"
      ref={groupRef}
      data-environment-foliage-cohort-epoch={residency.cohortEpoch}
      data-environment-foliage-cohort-key={residency.cohortKey}
      data-environment-foliage-hidden-painted-frames={residency.hiddenPaintedFrames}
      data-environment-foliage-instance-count={instances.length}
      data-environment-foliage-max-detail-eligible={maxDetailEligible}
      data-environment-foliage-maximum-decoded-bytes={maximumDecodedBytes}
      data-environment-foliage-maximum-groups={maximumGroups}
      data-environment-foliage-mounted-decoded-bytes={
        residency.cohortMounted ? residency.selectedDecodedBytes : 0
      }
      data-environment-foliage-mounted-image-node-count={
        residency.cohortMounted ? selectedImageNodeCount : 0
      }
      data-environment-foliage-mounted-resource-ids={
        residency.cohortMounted ? residency.selectedResourceIds : ""
      }
      data-environment-foliage-selected-decoded-bytes={residency.selectedDecodedBytes}
      data-environment-foliage-selected-image-node-count={selectedImageNodeCount}
      data-environment-foliage-selected-resource-ids={residency.selectedResourceIds}
      data-environment-foliage-state={residency.loadStatus}
      data-environment-foliage-visible={visible}
      opacity={visible ? 1 : 0}
    >
      {residency.cohortMounted && atlases.length > 0 ? (
        <defs>
          {atlases.map((atlasResource) => (
            <image
              data-shared-resource={atlasResource.id}
              height={atlasResource.dimensions[1]}
              href={atlasResource.path}
              id={ninjaOneEnvironmentFoliageAtlasImageId(atlasResource)}
              key={atlasResource.id}
              onError={() => residency.recordResourceError(
                residency.cohortEpoch,
                resourceKey(atlasResource),
              )}
              onLoad={() => residency.recordResourceLoad(
                residency.cohortEpoch,
                resourceKey(atlasResource),
              )}
              preserveAspectRatio="none"
              width={atlasResource.dimensions[0]}
            />
          ))}
        </defs>
      ) : null}
      {residency.cohortMounted ? instances.map((instance) => (
        <NinjaOneEnvironmentFoliageGroup
          instance={instance}
          key={`${residency.cohortEpoch}:${instance.id}`}
          showCanopyFallback={!canvasReady}
        />
      )) : null}
      {residency.cohortMounted && atlases.length > 0 ? (
        <foreignObject
          className="ninjaone-environment-native-detail__foliage-viewport"
          height={artboardCamera.span[1]}
          pointerEvents="none"
          width={artboardCamera.span[0]}
          x={artboardCamera.origin[0]}
          y={artboardCamera.origin[1]}
        >
          <NinjaOneEnvironmentFoliageCanvas
            atlases={atlases}
            camera={artboardCamera}
            instances={instances}
            motionEnabled={visible && !reduceMotion}
            onReadyChange={setCanvasReady}
          />
        </foreignObject>
      ) : null}
    </g>
  );
}
