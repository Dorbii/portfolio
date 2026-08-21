import { cameraViewBox, type CameraView } from "../../../shared/camera";
import {
  resolveAtomicTierVisibility,
  type DetailState,
} from "../../../shared/lod";
import { WORLD_PLANE } from "../../../shared/world";
import { NinjaOneEnvironmentNativeDetail } from "../detail/components/NinjaOneEnvironmentNativeDetail";
import { NinjaOneEnvironmentGeology } from "./NinjaOneEnvironmentGeology";
import {
  NINJAONE_ENVIRONMENT_ARTBOARD,
  NINJAONE_ENVIRONMENT_GRID_CELLS,
  NINJAONE_ENVIRONMENT_LAYER_ORDER,
  NINJAONE_ENVIRONMENT_LOD_LAYERS,
  NINJAONE_ENVIRONMENT_PROOF_ID,
  NINJAONE_ENVIRONMENT_ROCK_INSTANCES,
  NINJAONE_ENVIRONMENT_SECONDARY_RELIEF_SOURCES,
  NINJAONE_ENVIRONMENT_STATIC_CLUSTER_COUNT,
  NINJAONE_ENVIRONMENT_STATIC_FOLIAGE_SOURCES,
  NINJAONE_ENVIRONMENT_SURFACE_ECOLOGY_SOURCES,
  NINJAONE_ENVIRONMENT_TERTIARY_RELIEF_SOURCES,
  NINJAONE_ENVIRONMENT_TRAIL_SOURCES,
  NINJAONE_ENVIRONMENT_WORLD_ORIGIN,
  NINJAONE_ENVIRONMENT_WORLD_SPAN,
  type NinjaOneEnvironmentLayerId,
  type NinjaOneEnvironmentPlateSource,
  type NinjaOneEnvironmentPlateTier,
  type NinjaOneEnvironmentSharedInstance,
} from "../model/ninjaOneEnvironmentProof";

interface NinjaOneEnvironmentProofProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly onGeologyReadyChange?: (ready: boolean) => void;
  readonly proofMode?: boolean;
  readonly showFoliage?: boolean;
  readonly showSupplementalDetail?: boolean;
}

const TIER_SUMMARIES = Object.freeze({
  world: "Regional terrain hidden",
  territory: "Macro mountain mass / coast / basin",
  capital: "Cliff walls / natural terraces / major drainage",
  site: "Ravines / tarn / cascades / trails / groves",
  close: "Rock strata / scree / wet banks / individual flora",
});

function PlateImage({
  layer,
  source,
}: {
  readonly layer: NinjaOneEnvironmentLayerId;
  readonly source: NinjaOneEnvironmentPlateSource;
}) {
  return (
    <image
      data-environment-layer={layer}
      data-environment-source={source.path}
      height={NINJAONE_ENVIRONMENT_ARTBOARD[1]}
      href={source.path}
      preserveAspectRatio="none"
      width={NINJAONE_ENVIRONMENT_ARTBOARD[0]}
      x="0"
      y="0"
    />
  );
}

function SharedAsset({
  className,
  instance,
  layer,
}: {
  readonly className?: string;
  readonly instance: NinjaOneEnvironmentSharedInstance;
  readonly layer: "rock";
}) {
  const height = instance.width
    * instance.resource.dimensions[1] / instance.resource.dimensions[0];
  return (
    <image
      className={className}
      data-environment-instance={instance.id}
      data-environment-resource-kind={layer}
      data-shared-resource={instance.resource.id}
      height={height}
      href={instance.resource.path}
      preserveAspectRatio="xMidYMid meet"
      width={instance.width}
      x={instance.anchor[0] - instance.width * 0.5}
      y={instance.anchor[1] - height}
    />
  );
}

function visibleAtTier(
  instance: NinjaOneEnvironmentSharedInstance,
  detailState: DetailState,
) {
  return resolveAtomicTierVisibility(
    { minimumTier: instance.minimumTier },
    detailState,
  ) > 0;
}

export function NinjaOneEnvironmentProof({
  active,
  camera,
  detailState,
  onGeologyReadyChange,
  proofMode = false,
  showFoliage = true,
  showSupplementalDetail = true,
}: NinjaOneEnvironmentProofProps) {
  const worldX = NINJAONE_ENVIRONMENT_WORLD_ORIGIN[0] * WORLD_PLANE.width;
  const worldY = NINJAONE_ENVIRONMENT_WORLD_ORIGIN[1] * WORLD_PLANE.height;
  const scaleX = NINJAONE_ENVIRONMENT_WORLD_SPAN[0] * WORLD_PLANE.width
    / NINJAONE_ENVIRONMENT_ARTBOARD[0];
  const scaleY = NINJAONE_ENVIRONMENT_WORLD_SPAN[1] * WORLD_PLANE.height
    / NINJAONE_ENVIRONMENT_ARTBOARD[1];
  const visibleLayers = NINJAONE_ENVIRONMENT_LOD_LAYERS[detailState.tier.id];
  const plateTier = detailState.tier.id === "world"
    ? null
    : detailState.tier.id as NinjaOneEnvironmentPlateTier;
  const staticFoliageSource = showSupplementalDetail
    && plateTier && visibleLayers.includes("static-foliage")
    ? NINJAONE_ENVIRONMENT_STATIC_FOLIAGE_SOURCES[plateTier]
    : null;
  const secondaryReliefSource = showSupplementalDetail && plateTier
    && visibleLayers.includes("secondary-relief")
    ? NINJAONE_ENVIRONMENT_SECONDARY_RELIEF_SOURCES[plateTier]
    : null;
  const tertiaryReliefSource = showSupplementalDetail && plateTier
    && visibleLayers.includes("tertiary-relief")
    ? NINJAONE_ENVIRONMENT_TERTIARY_RELIEF_SOURCES[plateTier]
    : null;
  const trailSource = showSupplementalDetail
    && plateTier && visibleLayers.includes("trails")
    ? NINJAONE_ENVIRONMENT_TRAIL_SOURCES[plateTier]
    : null;
  const surfaceEcologySource = showSupplementalDetail && plateTier
    && visibleLayers.includes("surface-ecology")
    ? NINJAONE_ENVIRONMENT_SURFACE_ECOLOGY_SOURCES[plateTier]
    : null;
  const visibleRocks = showSupplementalDetail
    && visibleLayers.includes("shared-rocks")
    ? NINJAONE_ENVIRONMENT_ROCK_INSTANCES.filter(
      (instance) => visibleAtTier(instance, detailState),
    )
    : [];
  const sharedNodeCount = visibleRocks.length;
  const environmentOpacity = plateTier ? 1 : 0;

  return (
    <>
      <NinjaOneEnvironmentGeology
        camera={camera}
        detailState={detailState}
        onReadyChange={onGeologyReadyChange}
        proofMode={proofMode}
      />
      <svg
        aria-label={proofMode
          ? "City-free NinjaOne B2 C1 C2 natural environment proof"
          : "NinjaOne authored natural environment"}
        className="career-world__layer ninjaone-environment-proof"
        data-environment-grid-cells={NINJAONE_ENVIRONMENT_GRID_CELLS.join(",")}
        data-environment-layer-order={NINJAONE_ENVIRONMENT_LAYER_ORDER.join(",")}
        data-environment-loaded-layer-count={visibleLayers.length}
        data-environment-neighbor-integration="compiled-b1-buffer"
        data-environment-proof={proofMode
          ? NINJAONE_ENVIRONMENT_PROOF_ID
          : undefined}
        data-environment-role={proofMode ? "isolated-proof" : "production-layer"}
        data-environment-supplemental-detail={showSupplementalDetail}
        data-environment-semantic-summary={TIER_SUMMARIES[detailState.tier.id]}
        data-environment-shared-node-count={sharedNodeCount}
        data-lod-tier={detailState.tier.id}
        preserveAspectRatio="none"
        role="img"
        viewBox={cameraViewBox(camera, [WORLD_PLANE.width, WORLD_PLANE.height])}
      >
        <g
          data-environment-opacity={environmentOpacity.toFixed(3)}
          opacity={environmentOpacity}
          transform={`translate(${worldX} ${worldY}) scale(${scaleX} ${scaleY})`}
        >
              <NinjaOneEnvironmentNativeDetail
                active={active}
                camera={camera}
                detailState={detailState}
                showFoliage={showFoliage
                  && (visibleLayers.includes("shared-animated-foliage")
                    || detailState.shouldLoadSiteAssets)}
              />
            {secondaryReliefSource ? (
              <PlateImage layer="secondary-relief" source={secondaryReliefSource} />
            ) : null}
            {staticFoliageSource ? (
              <PlateImage layer="static-foliage" source={staticFoliageSource} />
            ) : null}
            {tertiaryReliefSource ? (
              <PlateImage layer="tertiary-relief" source={tertiaryReliefSource} />
            ) : null}
            {trailSource ? <PlateImage layer="trails" source={trailSource} /> : null}
            {visibleRocks.length > 0 ? (
              <g data-environment-layer="shared-rocks">
                {visibleRocks.map((instance) => (
                  <SharedAsset instance={instance} key={instance.id} layer="rock" />
                ))}
              </g>
            ) : null}
            {surfaceEcologySource ? (
              <PlateImage layer="surface-ecology" source={surfaceEcologySource} />
            ) : null}
        </g>
      </svg>

      {proofMode ? (
        <aside
          aria-label="Environment layer status"
          className="ninjaone-environment-proof__hud"
        >
          <p>NINJAONE TERRAIN / AUTHORED MASTER R2</p>
          <strong>{detailState.tier.label}</strong>
          <span>B2 / C1 / C2 / one registered geometry</span>
          <span>{TIER_SUMMARIES[detailState.tier.id]}</span>
          <span>{visibleLayers.length}/{NINJAONE_ENVIRONMENT_LAYER_ORDER.length} layers mounted</span>
          <span>{NINJAONE_ENVIRONMENT_STATIC_CLUSTER_COUNT} detached baked groups / {sharedNodeCount} supplemental nodes</span>
          <span>City / roads / rail / buildings disabled</span>
        </aside>
      ) : null}
    </>
  );
}
