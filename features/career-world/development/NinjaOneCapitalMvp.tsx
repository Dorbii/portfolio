import { cameraViewBox, type CameraView } from "../shared/camera";
import type { DetailState } from "../shared/lod";
import type { WorldLight } from "../shared/lighting";
import { WORLD_PLANE } from "../shared/world";
import {
  NINJAONE_CAPITAL_CITY_ARTBOARD,
  NINJAONE_CAPITAL_CITY_NODE_COUNT,
  NINJAONE_CAPITAL_CITY_NODE_LAYER_ORDER,
  NINJAONE_CAPITAL_CITY_NODE_TERRAIN_BINDING_STATUS,
  NINJAONE_CAPITAL_CITY_POPULATION_CUE_COUNT,
  NINJAONE_CAPITAL_CITY_RAIL_EXIT,
  NINJAONE_CAPITAL_CITY_STATION,
  NINJAONE_CAPITAL_CITY_VISUAL_LAYERS,
  NINJAONE_CAPITAL_CITY_WORLD_ORIGIN,
  NINJAONE_CAPITAL_CITY_WORLD_SPAN,
  type NinjaOneCapitalCityRasterAsset,
} from "./model/ninjaOneCapitalCityNodes";
import { NinjaOneCapitalPopulation } from "./NinjaOneCapitalPopulation";
import { NinjaOneCapitalSkillNodes } from "./NinjaOneCapitalSkillNodes";
import { NinjaOneStationRiverDetail } from "./NinjaOneStationRiverDetail";

interface NinjaOneCapitalMvpProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly light: WorldLight;
  readonly phase?: "contact" | "city" | "all";
}

const CAPITAL_OVERVIEW_SWITCH_SPAN = 0.125;

function RegisteredRaster({
  asset,
  layer,
}: {
  readonly asset: NinjaOneCapitalCityRasterAsset;
  readonly layer: string;
}) {
  return (
    <image
      data-capital-layer-asset={layer}
      data-capital-layer-source={asset.path}
      height={NINJAONE_CAPITAL_CITY_ARTBOARD[1]}
      href={asset.path}
      preserveAspectRatio="none"
      width={NINJAONE_CAPITAL_CITY_ARTBOARD[0]}
      x="0"
      y="0"
    />
  );
}

function IndependentStation() {
  const station = NINJAONE_CAPITAL_CITY_STATION;
  const height = station.displayWidth * station.dimensions[1] / station.dimensions[0];
  const x = station.anchor[0] - station.displayWidth * station.groundAnchor[0];
  const y = station.anchor[1] - height * station.groundAnchor[1];
  return (
    <g
      data-capital-station={station.id}
      data-capital-station-independent="true"
      data-capital-station-owns-track="false"
      data-capital-station-owns-train="false"
    >
      <ellipse
        cx={station.anchor[0]}
        cy={station.anchor[1] + 1}
        fill="rgba(3, 7, 7, 0.32)"
        filter="url(#ninjaone-capital-contact-soften)"
        rx={station.displayWidth * 0.65}
        ry={Math.max(7, station.displayWidth * 0.09)}
      />
      <image
        height={height}
        href={station.path}
        preserveAspectRatio="xMidYMid meet"
        width={station.displayWidth}
        x={x}
        y={y}
      />
    </g>
  );
}

export function NinjaOneCapitalMvp({
  camera,
  detailState,
  light,
  phase = "all",
}: NinjaOneCapitalMvpProps) {
  const worldX = NINJAONE_CAPITAL_CITY_WORLD_ORIGIN[0] * WORLD_PLANE.width;
  const worldY = NINJAONE_CAPITAL_CITY_WORLD_ORIGIN[1] * WORLD_PLANE.height;
  const scaleX = NINJAONE_CAPITAL_CITY_WORLD_SPAN[0] * WORLD_PLANE.width
    / NINJAONE_CAPITAL_CITY_ARTBOARD[0];
  const scaleY = NINJAONE_CAPITAL_CITY_WORLD_SPAN[1] * WORLD_PLANE.height
    / NINJAONE_CAPITAL_CITY_ARTBOARD[1];
  const cameraSpan = Math.max(...camera.span);
  const territoryOverviewVisible = (
    detailState.tier.id === "territory"
    || (detailState.tier.id === "capital" && cameraSpan > CAPITAL_OVERVIEW_SWITCH_SPAN)
  );
  const detailedCityVisible = (
    (detailState.tier.id === "capital" && cameraSpan <= CAPITAL_OVERVIEW_SWITCH_SPAN)
    || detailState.tier.id === "site"
    || detailState.tier.id === "close"
  );
  const cityVisible = territoryOverviewVisible || detailedCityVisible;
  const contactPhase = phase === "contact" || phase === "all";
  const cityPhase = phase === "city" || phase === "all";

  return (
    <>
      <svg
        aria-hidden={cityPhase ? undefined : true}
        aria-label={cityPhase
          ? "Layered NinjaOne Capital city composition preview"
          : undefined}
        className={`career-world__layer ninjaone-capital-mvp ninjaone-capital-mvp--${phase}`}
        data-capital-city-artboard={NINJAONE_CAPITAL_CITY_ARTBOARD.join(",")}
        data-capital-layer-order={NINJAONE_CAPITAL_CITY_NODE_LAYER_ORDER.join(",")}
        data-capital-mvp="career-world/capitals/ninjaone/city-node-composition@r1"
        data-capital-population-scale-cue-count={NINJAONE_CAPITAL_CITY_POPULATION_CUE_COUNT}
        data-capital-rail-entry={NINJAONE_CAPITAL_CITY_RAIL_EXIT.entryDirection}
        data-capital-rail-off-capital-entry={String(
          NINJAONE_CAPITAL_CITY_RAIL_EXIT.offCapitalEntry,
        )}
        data-capital-rail-exit={NINJAONE_CAPITAL_CITY_RAIL_EXIT.direction}
        data-capital-rail-off-capital-endpoint={String(
          NINJAONE_CAPITAL_CITY_RAIL_EXIT.offCapitalEndpoint,
        )}
        data-capital-rail-terminates-at-building={String(
          NINJAONE_CAPITAL_CITY_RAIL_EXIT.terminatesAtBuilding,
        )}
        data-capital-skill-node-count={NINJAONE_CAPITAL_CITY_NODE_COUNT}
        data-capital-skill-node-terrain-binding={NINJAONE_CAPITAL_CITY_NODE_TERRAIN_BINDING_STATUS}
        data-lod-tier={detailState.tier.id}
        preserveAspectRatio="none"
        role={cityPhase ? "img" : undefined}
        viewBox={cameraViewBox(camera, [WORLD_PLANE.width, WORLD_PLANE.height])}
      >
        {cityPhase ? (
        <defs>
          <filter height="180%" id="ninjaone-capital-shadow-soften" width="180%" x="-40%" y="-40%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter height="180%" id="ninjaone-capital-contact-soften" width="180%" x="-40%" y="-40%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        ) : null}

        {cityVisible ? (
          <g transform={`translate(${worldX} ${worldY}) scale(${scaleX} ${scaleY})`}>
            {territoryOverviewVisible && cityPhase ? (
              <g data-capital-layer="territory-settlement-overview">
                <RegisteredRaster
                  asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.overviewSettlement}
                  layer="territory-settlement-overview"
                />
              </g>
            ) : null}
            {detailedCityVisible && contactPhase ? (
              <g data-capital-layer="city-terrain-contact">
                <RegisteredRaster
                  asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.terrainContact}
                  layer="city-terrain-contact"
                />
              </g>
            ) : null}
            {detailedCityVisible && cityPhase ? (
              <>
                <g data-capital-layer="streets-retaining-and-support-fabric">
                  <RegisteredRaster
                    asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.underlay}
                    layer="streets-retaining-and-support-fabric"
                  />
                  <NinjaOneStationRiverDetail
                    camera={camera}
                    detailState={detailState}
                  />
                </g>
                <g data-capital-layer="territory-rail-supports">
                  <RegisteredRaster
                    asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railSupport}
                    layer="territory-rail-supports"
                  />
                </g>
                <g data-capital-layer="territory-rail-bed">
                  <RegisteredRaster
                    asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railBed}
                    layer="territory-rail-bed"
                  />
                </g>
                <g data-capital-layer="territory-track">
                  <RegisteredRaster
                    asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railTrack}
                    layer="territory-track"
                  />
                </g>
                <g data-capital-layer="station-rear-and-platforms">
                  <IndependentStation />
                </g>
                <g data-capital-layer="skill-building-nodes">
                  <NinjaOneCapitalSkillNodes
                    camera={camera}
                    detailState={detailState}
                    light={light}
                  />
                </g>
                <g data-capital-layer="city-fabric-transition-foreground">
                  <g data-capital-layer="station-and-terrain-foreground-occluders">
                    <RegisteredRaster
                      asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.foreground}
                      layer="city-fabric-transition-foreground"
                    />
                  </g>
                </g>
                <g
                  data-asset-status="production-loop-not-yet-recovered"
                  data-capital-layer="moving-train"
                />
                <g data-capital-layer="city-foliage-and-contact-details">
                  <RegisteredRaster
                    asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.environmentTransitionDetail}
                    layer="city-foliage-and-contact-details"
                  />
                </g>
                <NinjaOneCapitalPopulation
                  camera={camera}
                  detailState={detailState}
                />
              </>
            ) : null}
          </g>
        ) : null}
      </svg>

      {cityPhase && cityVisible ? (
        <aside className="ninjaone-capital-mvp__hud" aria-label="Capital layer status">
          <p>NINJAONE CAPITAL · CITY COMPOSITION R1</p>
          <strong>{detailState.tier.label}</strong>
          <span>{NINJAONE_CAPITAL_CITY_NODE_COUNT} skill buildings · terrain-led districts</span>
          <span>{NINJAONE_CAPITAL_CITY_POPULATION_CUE_COUNT} temporary fantasy scale cues</span>
          <span>Intercity rail exits {NINJAONE_CAPITAL_CITY_RAIL_EXIT.direction}</span>
          <span>Integration preview · independent train loop pending</span>
        </aside>
      ) : null}
    </>
  );
}
