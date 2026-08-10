import { useLayoutEffect, useMemo, useState } from "react";
import type { CameraView } from "../shared/camera";
import type { DetailState } from "../shared/lod";
import { NinjaOneEnvironmentFoliage } from "./NinjaOneEnvironmentFoliage";
import {
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
  resolveNinjaOneEnvironmentFoliageEligibility,
} from "./model/ninjaOneEnvironmentFoliage";
import {
  createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot,
  type NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot,
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
  readonly showHydrology: boolean;
}

const EMPTY_ADMISSION_RESOURCES = Object.freeze([]);

function cameraIdentity(camera: CameraView): string {
  return `${camera.origin.join(",")}|${camera.span.join(",")}`;
}

/**
 * Coordinates additive close-detail layers for the registered environment.
 *
 * Terrain is intentionally absent here. All zoom tiers use the geology plate
 * owned by NinjaOneEnvironmentProof, so a camera change can never replace the
 * landscape with an independently generated tile or seam patch.
 */
export function NinjaOneEnvironmentNativeDetail({
  active,
  camera,
  detailState,
  onHydrologyAdmissionChange,
  showFoliage,
  showHydrology,
}: NinjaOneEnvironmentNativeDetailProps) {
  const siteOrCloser = detailState.tier.id === "site"
    || detailState.tier.id === "close";
  const hydrologyIntersects = viewIntersectsHydrologyRegistration(
    camera,
    NINJAONE_STREAM_REGISTRATION.worldOrigin,
    NINJAONE_STREAM_REGISTRATION.worldSpan,
  );
  const hydrologyDemand = active
    && showHydrology
    && siteOrCloser
    && hydrologyIntersects;

  const publicationIdentity = [
    cameraIdentity(camera),
    hydrologyDemand ? "water-on" : "water-off",
  ].join("|");
  const [publication, setPublication] = useState(() => ({
    epoch: 0,
    identity: publicationIdentity,
  }));
  let currentPublication = publication;
  if (publication.identity !== publicationIdentity) {
    currentPublication = {
      epoch: publication.epoch + 1,
      identity: publicationIdentity,
    };
    setPublication(currentPublication);
  }
  const admissionEpoch = currentPublication.epoch;
  const hydrologyAdmission = useMemo(
    () => createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot({
      camera,
      demand: hydrologyDemand,
      epoch: admissionEpoch,
      optionalNodeCount: 0,
      presentationReady: hydrologyDemand,
      registrationIntersects: hydrologyIntersects,
      requiredNodeCount: 0,
      resources: EMPTY_ADMISSION_RESOURCES,
      targetResources: EMPTY_ADMISSION_RESOURCES,
    }),
    [
      admissionEpoch,
      camera,
      hydrologyDemand,
      hydrologyIntersects,
    ],
  );
  useLayoutEffect(() => {
    onHydrologyAdmissionChange?.(hydrologyAdmission);
  }, [hydrologyAdmission, onHydrologyAdmissionChange]);

  const [previousFoliageEligible, setPreviousFoliageEligible] = useState(false);
  const foliageEligible = resolveNinjaOneEnvironmentFoliageEligibility({
    active,
    camera,
    previousEligible: previousFoliageEligible,
    shouldLoadCloseAssets: detailState.shouldLoadSiteAssets,
    showFoliage: showFoliage && siteOrCloser,
  });
  if (foliageEligible !== previousFoliageEligible) {
    setPreviousFoliageEligible(foliageEligible);
  }

  return (
    <g
      className="ninjaone-environment-native-detail"
      data-environment-native-admission-epoch={admissionEpoch}
      data-environment-native-render-mode="additive-only"
      data-environment-native-seam-node-count="0"
      data-environment-native-terrain-node-count="0"
      data-environment-native-water-demand={hydrologyDemand}
    >
      <NinjaOneEnvironmentFoliage
        active={active && siteOrCloser}
        camera={camera}
        detailState={detailState}
        maxDetailEligible={foliageEligible}
        maximumGroups={NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS}
        residencyEpoch={admissionEpoch}
        showFoliage={showFoliage}
      />
    </g>
  );
}
