import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import {
  NINJAONE_CAPITAL_CITY_R3_CONTEXT,
  NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS,
} from "../features/career-world/layers/city/model/ninjaOneCapitalCityFoundationR3.ts";
import {
  NINJAONE_CAPITAL_CITY_LAYER_NODES,
} from "../features/career-world/layers/city/model/ninjaOneCapitalCityLayer.ts";
import {
  NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY,
} from "../features/career-world/layers/city/model/ninjaOneCapitalCityRepresentations.ts";

test("the D06 removal contract has no station runtime assets or replacement records", () => {
  assert.equal(Object.keys(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS).length, 15);
  assert.equal(
    Object.keys(NINJAONE_CAPITAL_CITY_R3_RUNTIME_ASSETS).some((id) => /^I(?:12|13|16|17|20|21|24)$/.test(id)),
    false,
  );
  assert.equal(NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.replacedDistricts.length, 0);
  assert.equal(
    NINJAONE_CAPITAL_CITY_LAYER_NODES.some(({ id }) => /station|d06/i.test(id)),
    false,
  );
});

test("the protected complement assets remain mounted and readable", async () => {
  const paths = [
    NINJAONE_CAPITAL_CITY_R3_CONTEXT.path,
    NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY.deliveries.context.path,
  ];
  for (const assetPath of paths) {
    const file = new URL(`../public${assetPath}`, import.meta.url);
    await access(file);
    assert.ok((await readFile(file)).byteLength > 0);
  }
});
