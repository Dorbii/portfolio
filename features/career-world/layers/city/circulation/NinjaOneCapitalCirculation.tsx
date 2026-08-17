import type { Pair } from "../../../shared/camera";
import { NINJAONE_CAPITAL_CITY_CIRCULATION_PATHS } from "../model/ninjaOneCapitalCityLayer";

function svgPoints(points: readonly Pair[]) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

export function NinjaOneCapitalCirculation({
  circulationVisible,
}: {
  readonly circulationVisible: boolean;
}) {
  return (
    <>
      {circulationVisible ? (
        <g data-city-child-layer="L4_1">
          <g data-city-circulation-sublayer="provisional-inferred-stone-access">
            {NINJAONE_CAPITAL_CITY_CIRCULATION_PATHS
              .filter(({ id }) => id !== "station-terminal-concourse")
              .map((path) => (
              <g data-city-path-id={path.id} data-city-path-kind={path.kind} key={path.id}>
                <polyline
                  className="ninjaone-capital-city__road-foundation"
                  points={svgPoints(path.points)}
                  strokeWidth={path.width}
                />
                <polyline
                  className="ninjaone-capital-city__road-surface"
                  points={svgPoints(path.points)}
                  strokeWidth={path.width * 0.62}
                />
                <polyline
                  className="ninjaone-capital-city__road-detail"
                  points={svgPoints(path.points)}
                  strokeWidth={Math.max(0.7, path.width * 0.07)}
                />
              </g>
            ))}
          </g>
        </g>
      ) : null}
    </>
  );
}
