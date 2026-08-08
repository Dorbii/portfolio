import { cameraViewBox, type CameraView } from "../shared/camera";
import {
  resolveAtomicTierVisibility,
  type DetailState,
} from "../shared/lod";
import { WORLD_PLANE } from "../shared/world";
import { NinjaOneEnvironmentNativeDetail } from "./NinjaOneEnvironmentNativeDetail";
import type {
  NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot,
} from "./model/ninjaOneEnvironmentResidency";
import {
  NINJAONE_ENVIRONMENT_ARTBOARD,
  NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES,
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
  NINJAONE_ENVIRONMENT_WILDLIFE_INSTANCES,
  NINJAONE_ENVIRONMENT_WORLD_ORIGIN,
  NINJAONE_ENVIRONMENT_WORLD_SPAN,
  type NinjaOneEnvironmentLayerId,
  type NinjaOneEnvironmentPlateSource,
  type NinjaOneEnvironmentPlateTier,
  type NinjaOneEnvironmentSharedInstance,
} from "./model/ninjaOneEnvironmentProof";

interface NinjaOneEnvironmentProofProps {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly onHydrologyAdmissionChange?: (
    snapshot: NinjaOneEnvironmentNativeHydrologyAdmissionSnapshot | null,
  ) => void;
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
  readonly layer: "rock" | "wildlife";
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
  onHydrologyAdmissionChange,
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
  const geologySource = plateTier && visibleLayers.includes("terrain-geology")
    ? NINJAONE_ENVIRONMENT_GEOLOGY_SOURCES[plateTier]
    : null;
  const staticFoliageSource = plateTier && visibleLayers.includes("static-foliage")
    ? NINJAONE_ENVIRONMENT_STATIC_FOLIAGE_SOURCES[plateTier]
    : null;
  const secondaryReliefSource = plateTier
    && visibleLayers.includes("secondary-relief")
    ? NINJAONE_ENVIRONMENT_SECONDARY_RELIEF_SOURCES[plateTier]
    : null;
  const tertiaryReliefSource = plateTier
    && visibleLayers.includes("tertiary-relief")
    ? NINJAONE_ENVIRONMENT_TERTIARY_RELIEF_SOURCES[plateTier]
    : null;
  const trailSource = plateTier && visibleLayers.includes("trails")
    ? NINJAONE_ENVIRONMENT_TRAIL_SOURCES[plateTier]
    : null;
  const surfaceEcologySource = plateTier
    && visibleLayers.includes("surface-ecology")
    ? NINJAONE_ENVIRONMENT_SURFACE_ECOLOGY_SOURCES[plateTier]
    : null;
  const visibleRocks = visibleLayers.includes("shared-rocks")
    ? NINJAONE_ENVIRONMENT_ROCK_INSTANCES.filter(
      (instance) => visibleAtTier(instance, detailState),
    )
    : [];
  const visibleWildlife = visibleLayers.includes("wildlife")
    ? NINJAONE_ENVIRONMENT_WILDLIFE_INSTANCES.filter(
      (instance) => visibleAtTier(instance, detailState),
    )
    : [];
  const sharedNodeCount = visibleRocks.length + visibleWildlife.length;
  const environmentOpacity = detailState.tier.id === "capital"
    ? Math.max(0, Math.min(1, (detailState.territoryToCapital - 0.35) / 0.65))
    : detailState.tier.id === "world" || detailState.tier.id === "territory"
      ? 0
      : 1;

  return (
    <>
      <svg
        aria-label="City-free NinjaOne B2 C1 C2 natural environment proof"
        className="career-world__layer ninjaone-environment-proof"
        data-environment-grid-cells={NINJAONE_ENVIRONMENT_GRID_CELLS.join(",")}
        data-environment-layer-order={NINJAONE_ENVIRONMENT_LAYER_ORDER.join(",")}
        data-environment-loaded-layer-count={visibleLayers.length}
        data-environment-proof={NINJAONE_ENVIRONMENT_PROOF_ID}
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
          {geologySource ? (
            <defs>
              <mask
                height={NINJAONE_ENVIRONMENT_ARTBOARD[1]}
                id="ninjaone-environment-proof-alpha"
                maskUnits="userSpaceOnUse"
                width={NINJAONE_ENVIRONMENT_ARTBOARD[0]}
                x="0"
                y="0"
              >
                <image
                  height={NINJAONE_ENVIRONMENT_ARTBOARD[1]}
                  href={geologySource.path}
                  preserveAspectRatio="none"
                  width={NINJAONE_ENVIRONMENT_ARTBOARD[0]}
                  x="0"
                  y="0"
                />
              </mask>
            </defs>
          ) : null}
          {geologySource ? (
            <PlateImage layer="terrain-geology" source={geologySource} />
          ) : null}
          <NinjaOneEnvironmentNativeDetail
            active={active}
            camera={camera}
            detailState={detailState}
            onHydrologyAdmissionChange={onHydrologyAdmissionChange}
            showFoliage={visibleLayers.includes("shared-animated-foliage")}
          />
          <g mask="url(#ninjaone-environment-proof-alpha)">
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
            {visibleWildlife.length > 0 ? (
              <g data-environment-layer="wildlife">
                {visibleWildlife.map((instance) => (
                  <SharedAsset
                    className={instance.resource.id === "ravens"
                      ? "ninjaone-environment-proof__wildlife-flight"
                      : undefined}
                    instance={instance}
                    key={instance.id}
                    layer="wildlife"
                  />
                ))}
              </g>
            ) : null}
          </g>
        </g>
      </svg>

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
    </>
  );
}
