import { useMemo } from "react";
import nativeFoliageReuseManifest from "../../../../../public/career-world/capitals/ninjaone/city-r3/authority/city-native-foliage-reuse-r1.json" with { type: "json" };
import type { CameraView } from "../../../shared/camera";
import { NINJAONE_CAPITAL_CITY_DETAIL_POLICY } from "../model/ninjaOneCapitalCityRepresentations";
import {
  NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
  selectNinjaOneEnvironmentFoliageInstances,
  type NinjaOneEnvironmentFoliageResource,
} from "../../terrain/detail/model/ninjaOneEnvironmentFoliage";

const APPROVED_NATIVE_FOLIAGE_INSTANCE_IDS = new Set(
  nativeFoliageReuseManifest.instances.map(({ id }) => id),
);

function atlasImageId(resource: NinjaOneEnvironmentFoliageResource): string {
  return `ninjaone-capital-native-foliage-${resource.id.replaceAll(/[^a-z0-9_-]/gi, "-")}`;
}

export function NinjaOneCapitalNativeFoliage({ camera }: {
  readonly camera: CameraView;
}) {
  const instances = useMemo(
    () => selectNinjaOneEnvironmentFoliageInstances(
      camera,
      true,
      NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
      NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
      APPROVED_NATIVE_FOLIAGE_INSTANCE_IDS,
      NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.close,
    ),
    [camera],
  );
  const resources = useMemo(() => [
    ...new Map(instances.map((instance) => [
      instance.atlasResource.id,
      instance.atlasResource,
    ])).values(),
  ], [instances]);
  if (instances.length === 0) return null;

  return (
    <g
      data-city-child-layer="L4_6"
      data-city-native-tree-count={instances.length}
      data-city-native-tree-resource-count={resources.length}
      data-city-tree-source="L2-native-conifer-atlas-reuse"
      pointerEvents="none"
    >
      <defs>
        {resources.map((resource) => (
          <image
            data-shared-resource={resource.id}
            height={resource.dimensions[1]}
            href={resource.path}
            id={atlasImageId(resource)}
            key={resource.id}
            preserveAspectRatio="none"
            width={resource.dimensions[0]}
          />
        ))}
      </defs>
      {instances.map((instance) => {
        const [frameX, frameY, frameWidth, frameHeight] = instance.canopyAtlasRect;
        return (
          <svg
            data-city-native-tree-instance={instance.id}
            height={instance.artboardBounds.span[1]}
            key={instance.id}
            overflow="hidden"
            preserveAspectRatio="none"
            viewBox={`${frameX} ${frameY} ${frameWidth} ${frameHeight}`}
            width={instance.artboardBounds.span[0]}
            x={instance.artboardBounds.origin[0]}
            y={instance.artboardBounds.origin[1]}
          >
            <use href={`#${atlasImageId(instance.atlasResource)}`} />
          </svg>
        );
      })}
    </g>
  );
}
