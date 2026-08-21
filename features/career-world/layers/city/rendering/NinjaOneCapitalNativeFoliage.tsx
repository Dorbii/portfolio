import { useEffect, useMemo, useState } from "react";
import nativeFoliageReuseManifest from "../../../../../public/career-world/capitals/ninjaone/city-r3/authority/city-native-foliage-reuse-r1.json" with { type: "json" };
import type { CameraView } from "../../../shared/camera";
import { decodeImage } from "../../../shared/assets/decodeImage";
import {
  NINJAONE_CAPITAL_CITY_DETAIL_POLICY,
  type NinjaOneCapitalCityDistrictId,
} from "../model/ninjaOneCapitalCityRepresentations";
import {
  NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
  environmentFoliageCameraArtboardView,
  selectNinjaOneEnvironmentFoliageInstances,
} from "../../terrain/detail/model/ninjaOneEnvironmentFoliage";
import {
  NinjaOneEnvironmentFoliageGroup,
  ninjaOneEnvironmentFoliageAtlasImageId,
} from "../../terrain/detail/components/NinjaOneEnvironmentFoliage";
import { NinjaOneEnvironmentFoliageCanvas } from "../../terrain/detail/components/NinjaOneEnvironmentFoliageCanvas";

const APPROVED_NATIVE_FOLIAGE_INSTANCE_IDS = new Set(
  nativeFoliageReuseManifest.instances.map(({ id }) => id),
);
const D02_REGISTERED_NATIVE_FOLIAGE_INSTANCE_IDS = new Set([
  ...APPROVED_NATIVE_FOLIAGE_INSTANCE_IDS,
  ...nativeFoliageReuseManifest.districtInstances.D02.instances.map(({ id }) => id),
]);
const D03_REGISTERED_NATIVE_FOLIAGE_INSTANCE_IDS = new Set([
  ...APPROVED_NATIVE_FOLIAGE_INSTANCE_IDS,
  ...nativeFoliageReuseManifest.districtInstances.D03.instances.map(({ id }) => id),
]);

function nativeFoliageIds(focusDistrict: NinjaOneCapitalCityDistrictId | null) {
  return focusDistrict === "D02"
    ? D02_REGISTERED_NATIVE_FOLIAGE_INSTANCE_IDS
    : focusDistrict === "D03"
      ? D03_REGISTERED_NATIVE_FOLIAGE_INSTANCE_IDS
      : APPROVED_NATIVE_FOLIAGE_INSTANCE_IDS;
}

function projectedCloseCamera(camera: CameraView): CameraView {
  const maximumSpan = NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.close;
  const scale = Math.min(1, maximumSpan / Math.max(...camera.span));
  const span = camera.span.map((value) => value * scale) as [number, number];
  return Object.freeze({
    origin: Object.freeze([
      camera.origin[0] + (camera.span[0] - span[0]) * 0.5,
      camera.origin[1] + (camera.span[1] - span[1]) * 0.5,
    ] as [number, number]),
    span: Object.freeze(span),
  });
}

export function NinjaOneCapitalNativeFoliagePreloader({
  camera,
  focusDistrict,
}: {
  readonly camera: CameraView;
  readonly focusDistrict: NinjaOneCapitalCityDistrictId | null;
}) {
  const projectedCamera = useMemo(() => projectedCloseCamera(camera), [camera]);
  const resources = useMemo(() => [
    ...new Map(selectNinjaOneEnvironmentFoliageInstances(
      projectedCamera,
      true,
      NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
      NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
      nativeFoliageIds(focusDistrict),
      NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.close,
    ).map((instance) => [
      instance.atlasResource.id,
      instance.atlasResource,
    ])).values(),
  ], [focusDistrict, projectedCamera]);
  useEffect(() => {
    resources.forEach((resource) => {
      void decodeImage(resource.path).catch(() => undefined);
    });
  }, [resources]);
  return null;
}

export function NinjaOneCapitalNativeFoliage({
  camera,
  focusDistrict,
  maximumSpan = NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.close,
}: {
  readonly camera: CameraView;
  readonly focusDistrict: NinjaOneCapitalCityDistrictId | null;
  readonly maximumSpan?: number;
}) {
  const approvedInstanceIds = nativeFoliageIds(focusDistrict);
  const instances = useMemo(
    () => selectNinjaOneEnvironmentFoliageInstances(
      camera,
      true,
      NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
      NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
      approvedInstanceIds,
      maximumSpan,
    ),
    [approvedInstanceIds, camera, maximumSpan],
  );
  const resources = useMemo(() => [
    ...new Map(instances.map((instance) => [
      instance.atlasResource.id,
      instance.atlasResource,
    ])).values(),
  ], [instances]);
  const artboardCamera = useMemo(
    () => environmentFoliageCameraArtboardView(camera),
    [camera],
  );
  const [canvasReady, setCanvasReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);
  if (instances.length === 0) return null;

  return (
    <g
      data-city-child-layer="L4_6"
      data-city-native-tree-count={instances.length}
      data-city-native-tree-resource-count={resources.length}
      data-city-tree-source="L2-native-conifer-atlas-reuse"
      data-city-tree-structure="shared-neutralization-plus-animated-canopy"
      pointerEvents="none"
    >
      <defs>
        {resources.map((resource) => (
          <image
            data-shared-resource={resource.id}
            height={resource.dimensions[1]}
            href={resource.path}
            id={ninjaOneEnvironmentFoliageAtlasImageId(resource)}
            key={resource.id}
            preserveAspectRatio="none"
            width={resource.dimensions[0]}
          />
        ))}
      </defs>
      {instances.map((instance) => (
        <g data-city-native-tree-instance={instance.id} key={instance.id}>
          <NinjaOneEnvironmentFoliageGroup
            instance={instance}
            showCanopyFallback={!canvasReady}
          />
        </g>
      ))}
      <foreignObject
        className="ninjaone-environment-native-detail__foliage-viewport"
        height={artboardCamera.span[1]}
        pointerEvents="none"
        width={artboardCamera.span[0]}
        x={artboardCamera.origin[0]}
        y={artboardCamera.origin[1]}
      >
        <NinjaOneEnvironmentFoliageCanvas
          atlases={resources}
          camera={artboardCamera}
          instances={instances}
          motionEnabled={!reduceMotion}
          onReadyChange={setCanvasReady}
        />
      </foreignObject>
    </g>
  );
}
