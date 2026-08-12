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

interface NinjaOneCapitalMvpProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly light: WorldLight;
}

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
        cy={station.anchor[1] + 2}
        fill="rgba(5, 9, 9, 0.28)"
        filter="url(#ninjaone-capital-contact-soften)"
        rx={station.displayWidth * 0.4}
        ry={Math.max(7, station.displayWidth * 0.065)}
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
}: NinjaOneCapitalMvpProps) {
  const worldX = NINJAONE_CAPITAL_CITY_WORLD_ORIGIN[0] * WORLD_PLANE.width;
  const worldY = NINJAONE_CAPITAL_CITY_WORLD_ORIGIN[1] * WORLD_PLANE.height;
  const scaleX = NINJAONE_CAPITAL_CITY_WORLD_SPAN[0] * WORLD_PLANE.width
    / NINJAONE_CAPITAL_CITY_ARTBOARD[0];
  const scaleY = NINJAONE_CAPITAL_CITY_WORLD_SPAN[1] * WORLD_PLANE.height
    / NINJAONE_CAPITAL_CITY_ARTBOARD[1];
  const detailedCityVisible = (
    detailState.tier.id === "capital"
    || detailState.tier.id === "site"
    || detailState.tier.id === "close"
  );
  const cityVisible = detailedCityVisible;
  const siteDetailVisible = (
    detailState.tier.id === "site"
    || detailState.tier.id === "close"
  );

  return (
    <>
      <svg
        aria-label="Layered NinjaOne Capital city composition preview"
        className="career-world__layer ninjaone-capital-mvp"
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
        data-capital-world-light-direction={light.direction.join(",")}
        data-lod-tier={detailState.tier.id}
        preserveAspectRatio="none"
        role="img"
        viewBox={cameraViewBox(camera, [WORLD_PLANE.width, WORLD_PLANE.height])}
      >
        <defs>
          <filter height="180%" id="ninjaone-capital-shadow-soften" width="180%" x="-40%" y="-40%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter height="180%" id="ninjaone-capital-contact-soften" width="180%" x="-40%" y="-40%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {cityVisible ? (
          <g transform={`translate(${worldX} ${worldY}) scale(${scaleX} ${scaleY})`}>
            {detailedCityVisible ? (
              <g>
                <g data-capital-layer="capital-settlement-overview">
                  <RegisteredRaster
                    asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.overviewSettlement}
                    layer="capital-settlement-overview"
                  />
                </g>
                <g data-capital-layer="registered-water-shoreline-and-bridges">
                  <RegisteredRaster
                    asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.waterTransition}
                    layer="registered-water-shoreline-and-bridges"
                  />
                </g>
                {siteDetailVisible ? (
                  <g data-capital-layer="single-centerline-transport">
                    <RegisteredRaster
                      asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railSupport}
                      layer="rail-supports"
                    />
                    <RegisteredRaster
                      asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railBed}
                      layer="rail-bed"
                    />
                    <RegisteredRaster
                      asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railPortalBack}
                      layer="rail-portal-backs"
                    />
                    <RegisteredRaster
                      asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railTrack}
                      layer="rail-track"
                    />
                    <IndependentStation />
                    <RegisteredRaster
                      asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railStationForeground}
                      layer="rail-station-foreground"
                    />
                    <RegisteredRaster
                      asset={NINJAONE_CAPITAL_CITY_VISUAL_LAYERS.railPortalForeground}
                      layer="rail-portal-foreground"
                    />
                  </g>
                ) : null}
                {detailState.tier.id === "close" ? (
                  <NinjaOneCapitalSkillNodes
                    camera={camera}
                    detailState={detailState}
                    light={light}
                  />
                ) : null}
                <NinjaOneCapitalPopulation
                  camera={camera}
                  detailState={detailState}
                />
              </g>
            ) : null}
          </g>
        ) : null}
      </svg>

      {cityVisible ? (
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
