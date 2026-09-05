import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

// plan-territory.mjs is territory-generic (lock change 12). Two things have to
// stay true for that to be safe:
//
//   1. It must reproduce NinjaOne's committed plan.json BYTE-IDENTICALLY. That
//      territory is authored and accepted; a refactor that quietly moved a
//      shelf or reworded a rule would invalidate twenty baked cells.
//   2. Its guards must actually refuse things. A guard that has never refused
//      anything is not a guard, and every case below mutates a VALID
//      definition in exactly one way so a failure cannot be blamed elsewhere.
//
// Nothing here writes to a real territory: the guard cases use a scratch id
// that is removed afterwards, and the NinjaOne case restores the file it read.

const SCRIPT = "tools/world-authoring/plan-territory.mjs";
const L2 = "art-source/career-world/l2-land/";

function run(id) {
  try {
    execFileSync("node", [SCRIPT, id], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, err: "" };
  } catch (e) {
    return { ok: false, err: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

test("the generalised plan script reproduces NinjaOne's plan byte-identically", () => {
  const path = `${L2}ninjaone/plan.json`;
  const committed = fs.readFileSync(path);
  // Delete it first. Otherwise a script that crashes before writing leaves the
  // committed file in place and the comparison passes without proving anything
  // -- which is exactly what happened the first time this control was run.
  fs.rmSync(path);
  try {
    const r = run("ninjaone");
    assert.ok(r.ok, `plan-territory.mjs ninjaone failed:\n${r.err}`);
    assert.ok(fs.existsSync(path), "nothing was written");
    assert.deepEqual(
      fs.readFileSync(path),
      committed,
      "regenerated NinjaOne plan.json differs from the committed one",
    );
  } finally {
    if (!fs.existsSync(path)) fs.writeFileSync(path, committed);
  }
});

// A SPARSE territory (the coast, owner 2026-09-04: coasts are authored in the
// sea cells beside the island's placed art) has a `coastCells` list: its block
// covers the island plus a margin, but it authors only the listed cells. The
// planner cannot make it (no capital, no loop, no biome per cell), so
// docs/career-world/session3-tools/coast-plan.mjs writes its definition and
// plan together, copying the world canon verbatim from the planner's own output.
const readDef = (id) => JSON.parse(fs.readFileSync(`${L2}${id}/territory.def.json`, "utf8"));
const territoryIds = () => fs.readdirSync(L2, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(`${L2}${d.name}/territory.def.json`))
  .map((d) => d.name);

test("every authored territory definition still produces its plan", () => {
  const ids = territoryIds();
  assert.ok(ids.length >= 1, "no territory definitions found");
  for (const id of ids) {
    const def = readDef(id);
    if (def.coastCells) {
      // sparse: the plan is the coast writer's, and must agree with the definition
      const planPath = `${L2}${id}/plan.json`;
      assert.ok(fs.existsSync(planPath), `${id} is sparse and has no plan.json (run coast-plan.mjs)`);
      const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
      assert.equal(plan.territory, id);
      assert.deepEqual(plan.cellBiomes, def.cellBiomes, `${id}: plan and definition disagree on cell biomes`);
      for (const x of def.coastCells) {
        const key = `${x.at[0]},${x.at[1]}`;
        assert.ok(plan.biomes[def.cellBiomes[key]], `${id} ${key}: biome ${def.cellBiomes[key]} is not in the plan`);
      }
      continue;
    }
    const r = run(id);
    assert.ok(r.ok, `${id} failed to plan:\n${r.err}`);
  }
});

test("territory blocks fit the plane and no two territories author the same lattice cell", () => {
  const PLANE = [16, 9];
  const claims = new Map();   // "wx,wy" -> territory id
  for (const id of territoryIds()) {
    const def = readDef(id);
    const [bx, by] = def.lattice.block, w = def.grid.cols, h = def.grid.rows;
    assert.ok(bx >= 0 && by >= 0 && bx + w <= PLANE[0] && by + h <= PLANE[1], `${id} block does not fit the plane`);
    // a dense territory authors every cell of its block; a sparse one only its listed cells
    const cells = def.coastCells
      ? def.coastCells.map((x) => [bx + x.at[0], by + x.at[1]])
      : Array.from({ length: w * h }, (_, i) => [bx + (i % w), by + Math.floor(i / w)]);
    for (const [wx, wy] of cells) {
      assert.ok(wx >= 0 && wy >= 0 && wx < PLANE[0] && wy < PLANE[1], `${id} authors [${wx},${wy}], outside the plane`);
      const key = `${wx},${wy}`;
      assert.ok(!claims.has(key), `${claims.get(key)} and ${id} both author lattice cell [${key}]`);
      claims.set(key, id);
    }
  }
});

test("plan-territory refuses every definition it should refuse", () => {
  const ID = "zzz-plan-guard-control";
  const DIR = `${L2}${ID}/`;
  const base = {
    territory: ID,
    grid: { cols: 2, rows: 2 },
    lattice: { block: [0, 0] },
    shelves: [
      { id: "capital", cell: [0, 0], off: [0.5, 0.5], role: "capital" },
      { id: "town", cell: [1, 1], off: [0.5, 0.5], role: "project city" },
    ],
    loop: [[0.5, 0.5], [1.5, 0.5], [1.5, 1.5], [0.5, 0.5]],
    railFeatures: [{ at: [1.5, 0.5], kind: "gorge span", note: "x" }],
    cellBiomes: { "0,0": "lush-shelf", "1,0": "moor", "0,1": "moor", "1,1": "lush-shelf" },
    sites: [{ cell: [1, 0], id: "a-site", terrain: "a level bench" }],
    rules: {},
  };
  const write = (def) => {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(`${DIR}territory.def.json`, JSON.stringify(def, null, 1));
  };
  const mut = (f) => { const d = JSON.parse(JSON.stringify(base)); f(d); return d; };

  try {
    write(base);
    assert.ok(run(ID).ok, "the valid control definition was refused");

    const cases = [
      ["a cell with no biome", (d) => { delete d.cellBiomes["1,1"]; }, "has no valid biome"],
      ["an unknown biome name", (d) => { d.cellBiomes["1,1"] = "swamp"; }, "has no valid biome"],
      ["a block overrunning the plane", (d) => { d.lattice.block = [15, 8]; }, "does not fit"],
      ["a negative block origin", (d) => { d.lattice.block = [-1, 0]; }, "does not fit"],
      ["a shelf outside the grid", (d) => { d.shelves[1].cell = [5, 5]; }, "outside the grid"],
      ["a shelf offset outside its cell", (d) => { d.shelves[1].off = [1.4, 0.5]; }, "off outside the cell"],
      ["a site outside the grid", (d) => { d.sites[0].cell = [9, 9]; }, "outside the grid"],
      ["a loop waypoint off the grid", (d) => { d.loop[1] = [7, 0.5]; }, "outside the grid"],
      ["a rail feature off the grid", (d) => { d.railFeatures[0].at = [7, 0.5]; }, "outside the grid"],
      ["an unclosed rail loop", (d) => { d.loop.pop(); }, "must close on its first waypoint"],
      ["a territory with no capital", (d) => { d.shelves[0].id = "not-a-capital"; }, "needs a capital shelf"],
      ["a rule name with no place in the order", (d) => { d.rules.somewhereBorder = "x"; }, "not in RULE_ORDER"],
      ["a definition naming a different territory", (d) => { d.territory = "somewhere-else"; }, "was asked for"],
    ];
    for (const [what, mutate, expected] of cases) {
      write(mut(mutate));
      const r = run(ID);
      assert.ok(!r.ok, `${what} was accepted`);
      assert.match(r.err, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        `${what} was refused for the wrong reason:\n${r.err}`);
    }

    fs.rmSync(DIR, { recursive: true, force: true });
    const missing = run(ID);
    assert.ok(!missing.ok && missing.err.includes("no territory definition"),
      "a territory with no definition was not refused");
  } finally {
    fs.rmSync(DIR, { recursive: true, force: true });
  }
});

test("plan-territory refuses to run without a territory argument", () => {
  let out = "";
  try {
    execFileSync("node", [SCRIPT], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    assert.fail("running with no argument exited 0");
  } catch (e) {
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  assert.match(out, /usage:/);
});
