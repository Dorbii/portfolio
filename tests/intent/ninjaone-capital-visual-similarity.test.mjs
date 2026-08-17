import assert from "node:assert/strict";
import test from "node:test";

import {
  captureNinjaOneCapitalVisualIntent,
} from "../../scripts/capture-ninjaone-capital-visual-intent.mjs";

const DISTRICT_F1_FLOOR = 0.5;
const STATION_RAIL_F1_FLOOR = 0.65;
const EXPECTED_DISTRICTS = Object.freeze([
  "D01",
  "D02",
  "D03",
  "D04",
  "D05",
  "D06",
]);

test("NinjaOne Capital live composition reaches the concept-level city-region intent", async () => {
  const result = await captureNinjaOneCapitalVisualIntent({
    ...(process.env.CAREER_WORLD_CITY_URL
      ? { url: process.env.CAREER_WORLD_CITY_URL }
      : {}),
  });
  const { acceptance, capture, metric } = result.evidence;
  assert.deepEqual(capture.referenceDimensions, [1448, 1086]);
  assert.deepEqual(capture.camera.origin, [0.125, 0]);
  assert.deepEqual(capture.camera.span, [0.25, 1 / 3]);
  assert.equal(metric.ignores, "UI and accepted L1-L3 background pixels");
  assert.deepEqual(
    metric.districtMetrics.map(({ id }) => id),
    EXPECTED_DISTRICTS,
  );
  const failures = [];
  for (const district of metric.districtMetrics) {
    const floor = district.id === "D06"
      ? STATION_RAIL_F1_FLOOR
      : DISTRICT_F1_FLOOR;
    if (district.f1 < floor) {
      failures.push(`${district.id} ${district.label} F1 ${district.f1} is below ${floor}`);
    }
  }
  if (acceptance.score < acceptance.threshold) {
    failures.push(`city-region similarity ${acceptance.score} is below ${acceptance.threshold}`);
  }
  assert.deepEqual(
    failures,
    [],
    `${failures.join("; ")}; evidence=${result.output}`,
  );
});
