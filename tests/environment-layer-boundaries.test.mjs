import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { CAREER_WORLD_LAYER_ORDER } from "../features/career-world/shared/layers.ts";
import { WATER_LAYER, WATER_SUBLAYERS } from "../features/career-world/layers/water/contract.ts";

async function imports(file) {
  const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  return source.statements.filter(ts.isImportDeclaration).map((statement) => statement.moduleSpecifier.text);
}

test("water is a separate surface owner below land with ocean and inland children", () => {
  assert.ok(CAREER_WORLD_LAYER_ORDER.indexOf(WATER_LAYER.id) < CAREER_WORLD_LAYER_ORDER.indexOf("terrain"));
  assert.equal(WATER_LAYER.order, CAREER_WORLD_LAYER_ORDER.indexOf(WATER_LAYER.id));
  assert.ok(WATER_SUBLAYERS.every((layer) => layer.parent === WATER_LAYER.id));
  assert.equal(new Set(WATER_SUBLAYERS.map((layer) => layer.id)).size, WATER_SUBLAYERS.length);
});

test("water runtime cannot import land rendering and land cannot import water rendering", async () => {
  const root = path.resolve("features/career-world/layers");
  const water = path.join(root, "water"), terrain = path.join(root, "terrain");
  for (const name of await readdir(water, { recursive: true })) {
    if (!name.endsWith(".ts") && !name.endsWith(".tsx")) continue;
    const file = path.join(water, name);
    for (const specifier of await imports(file)) {
      if (specifier.startsWith(".")) assert.ok(!path.resolve(path.dirname(file), specifier).startsWith(terrain + path.sep), `${name}: ${specifier}`);
    }
  }
  const landFile = path.join(terrain, "components", "TerritoryLandform.tsx");
  for (const specifier of await imports(landFile)) {
    if (!specifier.startsWith(".")) continue;
    const resolved = path.resolve(path.dirname(landFile), specifier);
    assert.ok(!resolved.startsWith(water + path.sep));
    assert.ok(!resolved.startsWith(path.join(root, "inland-water") + path.sep));
  }
});
