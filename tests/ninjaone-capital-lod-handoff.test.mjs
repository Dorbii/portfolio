import assert from "node:assert/strict";
import test from "node:test";

import {
  NINJAONE_CAPITAL_CITY_CANON_HANDOFF,
  ninjaOneCapitalCitySemanticHandoffWeights,
} from "../features/career-world/layers/city/model/ninjaOneCapitalCityRepresentations.ts";

test("the territory register remains symbolic until the capital-detail hand-off", () => {
  const { endSpan, startSpan } = NINJAONE_CAPITAL_CITY_CANON_HANDOFF;
  const beforeCapital = ninjaOneCapitalCitySemanticHandoffWeights(startSpan + 0.01);
  const atCapitalBoundary = ninjaOneCapitalCitySemanticHandoffWeights(startSpan);
  const middle = ninjaOneCapitalCitySemanticHandoffWeights((startSpan + endSpan) / 2);
  const afterHandoff = ninjaOneCapitalCitySemanticHandoffWeights(endSpan);

  assert.deepEqual(beforeCapital, { canonOpacity: 0, territoryRegisterOpacity: 1 });
  assert.deepEqual(atCapitalBoundary, { canonOpacity: 0, territoryRegisterOpacity: 1 });
  assert.ok(middle.canonOpacity > 0 && middle.canonOpacity < 1);
  assert.equal(middle.canonOpacity + middle.territoryRegisterOpacity, 1);
  assert.deepEqual(afterHandoff, { canonOpacity: 1, territoryRegisterOpacity: 0 });
});
