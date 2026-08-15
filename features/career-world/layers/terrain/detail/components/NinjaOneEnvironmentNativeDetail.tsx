import { useMemo, useState } from "react";
import type { CameraView } from "../../../../shared/camera";
import type { DetailState } from "../../../../shared/lod";
import { NinjaOneEnvironmentFoliage } from "./NinjaOneEnvironmentFoliage";
import {
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
  resolveNinjaOneEnvironmentFoliageEligibility,
} from "../model/ninjaOneEnvironmentFoliage";
import {
  planNinjaOneEnvironmentNativeResidency,
  resolveNinjaOneEnvironmentFoliageDecodedBudget,
} from "../model/ninjaOneEnvironmentResidency";

interface NinjaOneEnvironmentNativeDetailProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly showFoliage: boolean;
}

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
  showFoliage,
}: NinjaOneEnvironmentNativeDetailProps) {
  const siteOrCloser = detailState.tier.id === "site"
    || detailState.tier.id === "close";
  const maximumFoliageDecodedBytes = useMemo(() => {
    const terrainPlan = planNinjaOneEnvironmentNativeResidency({
      camera,
      demand: true,
      supplementalCandidates: [],
    });
    return resolveNinjaOneEnvironmentFoliageDecodedBudget(terrainPlan.decodedBytes);
  }, [camera]);

  const publicationIdentity = cameraIdentity(camera);
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
    >
      <NinjaOneEnvironmentFoliage
        active={active && siteOrCloser}
        camera={camera}
        detailState={detailState}
        maxDetailEligible={foliageEligible}
        maximumDecodedBytes={maximumFoliageDecodedBytes}
        maximumGroups={NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS}
        residencyEpoch={admissionEpoch}
        showFoliage={showFoliage}
      />
    </g>
  );
}
