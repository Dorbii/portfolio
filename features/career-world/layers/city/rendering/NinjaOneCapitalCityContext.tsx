import {
  NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY,
  type NinjaOneCapitalCityRepresentationMode,
} from "../model/ninjaOneCapitalCityRepresentations";

export function NinjaOneCapitalCityContext({
  mode,
}: {
  readonly mode: NinjaOneCapitalCityRepresentationMode;
}) {
  if (mode === "world-marker") return null;
  const territoryOnly = mode === "territory-proxy";
  const delivery = territoryOnly
    ? NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.deliveries.territory
    : NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.deliveries.context;
  const opacity = territoryOnly
    ? NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.presentation.territoryOpacity
    : NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.presentation.contextOpacity;
  const territoryScale = NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY
    .presentation.territoryScale;
  const [scaleAnchorX, scaleAnchorY] = NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY
    .presentation.territoryScaleAnchor;
  return (
    <g
      className={territoryOnly
        ? "ninjaone-capital-city__proxy ninjaone-capital-city__proxy--territory"
        : "ninjaone-capital-city__proxy ninjaone-capital-city__proxy--context"}
      data-city-context-d06-excluded={!territoryOnly}
      data-city-context-delivery={territoryOnly ? "territory" : "context"}
      data-city-context-proxy-id={NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.id}
      data-city-representation-class="whole-city-proxy"
      data-city-territory-scale={territoryOnly ? territoryScale : undefined}
      opacity={opacity}
      transform={territoryOnly
        ? `translate(${scaleAnchorX * (1 - territoryScale)} ${scaleAnchorY * (1 - territoryScale)}) scale(${territoryScale})`
        : undefined}
    >
      <image
        height={NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.registration.artboard[1]}
        href={delivery.path}
        preserveAspectRatio="xMidYMid meet"
        width={NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.registration.artboard[0]}
        x="0"
        y="0"
      />
    </g>
  );
}
