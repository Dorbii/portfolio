import assert from "node:assert/strict";
import test from "node:test";
import {
  OCEAN_COMPOSITE_SHADER,
  OCEAN_FOAM_SHADER,
  OCEAN_SPRAY_SHADER,
  OCEAN_WAVE_SHADER,
} from "../features/career-world/layers/ocean/rendering/shaders/generated/index.ts";
import {
  OCEAN_PASS_SAMPLERS,
  OCEAN_SAMPLER_UNITS,
  RUNTIME_UNIFORMS,
} from "../features/career-world/layers/ocean/rendering/WaterSurfaceRenderer.ts";
import {
  OCEAN_BAKED_STATE,
  OCEAN_PASS_STATES,
  OCEAN_PASS_UNIFORM_TYPES,
  OCEAN_SCREEN_TO_TUNED,
  OCEAN_TUNED_TO_SCREEN,
} from "../features/career-world/layers/ocean/model/generated/oceanStates.ts";

const PASSES = {
  wave: OCEAN_WAVE_SHADER,
  foam: OCEAN_FOAM_SHADER,
  spray: OCEAN_SPRAY_SHADER,
  composite: OCEAN_COMPOSITE_SHADER,
};

/** Declarations only, including the comma-separated ones. */
function declaredUniforms(source) {
  const names = new Set();
  for (const match of source.matchAll(/^uniform\s+\w+\s+([^;]+);/gm)) {
    for (const entry of match[1].split(",")) {
      names.add(entry.trim().split(/\s+/)[0]);
    }
  }
  return names;
}

test("every uniform the ocean shaders declare is written by someone", () => {
  const runtime = new Set(RUNTIME_UNIFORMS);
  const samplers = new Set(Object.keys(OCEAN_SAMPLER_UNITS));
  for (const [pass, source] of Object.entries(PASSES)) {
    const preset = new Set(Object.keys(OCEAN_PASS_UNIFORM_TYPES[pass]));
    const perPass = new Set(Object.keys(OCEAN_PASS_SAMPLERS[pass] ?? {}));
    const orphaned = [...declaredUniforms(source)].filter((name) => (
      !preset.has(name) && !runtime.has(name)
      && !samplers.has(name) && !perPass.has(name)
    ));
    // A uniform nobody writes is not a harmless omission. The location is never
    // looked up, the write is silently skipped, and the shader runs on whatever
    // the default happens to be -- a term quietly missing from the picture with
    // nothing anywhere to say so. The renderer refuses to start on this too;
    // this is the same invariant, without needing a GPU.
    assert.deepEqual(orphaned, [], `${pass} pass has unwritten uniforms`);
  }
});

test("no preset uniform is also claimed by the per-frame path", () => {
  const runtime = new Set(RUNTIME_UNIFORMS);
  for (const [pass, types] of Object.entries(OCEAN_PASS_UNIFORM_TYPES)) {
    const overlap = Object.keys(types).filter((name) => runtime.has(name));
    // Both writers target the same location, so an overlap means whichever ran
    // last wins and the loser is invisible -- exactly the failure the two lists
    // exist to prevent.
    assert.deepEqual(overlap, [], `${pass} pass has a uniform with two writers`);
  }
});

test("each stateful pass reads its own previous frame, not another's texture", () => {
  // texPrev means a different texture in each pass, so it cannot take the
  // default sampler unit: unit 0 is the phase field, and a foam pass bound
  // there advects the coastline's phase instead of its own history.
  for (const pass of ["foam", "spray"]) {
    assert.ok(
      declaredUniforms(PASSES[pass]).has("texPrev"),
      `${pass} pass should declare texPrev`,
    );
    assert.equal(
      OCEAN_PASS_SAMPLERS[pass]?.texPrev,
      OCEAN_SAMPLER_UNITS[pass === "foam" ? "texFoam" : "texSpray"],
    );
  }
  assert.notEqual(OCEAN_SAMPLER_UNITS.texFoam, OCEAN_SAMPLER_UNITS.texSpray);
});

test("weather at 0.5 lands exactly on the state the world field was baked from", () => {
  // The three presets were solved from different wave families, so they are
  // different eikonal solves and cannot be crossfaded. The world phase field is
  // one of them, and the midpoint of the scalar has to be that one exactly --
  // otherwise the shipped default is a sea whose energy belongs to no solve.
  assert.equal(OCEAN_BAKED_STATE, "windy_rolling_surf");
  for (const [pass, states] of Object.entries(OCEAN_PASS_STATES)) {
    assert.equal(states.length, 3, `${pass} should carry calm, windy and heavy`);
    for (const [name, value] of Object.entries(states[1])) {
      const low = states[0][name];
      const high = states[2][name];
      assert.notEqual(low, undefined, `${pass}.${name} missing from calm`);
      assert.notEqual(high, undefined, `${pass}.${name} missing from heavy`);
      assert.equal(
        Array.isArray(value),
        Array.isArray(low),
        `${pass}.${name} changes shape across the scale`,
      );
    }
  }
});

test("the camera conversion claims only uniforms that exist, and never both ways", () => {
  const declared = new Set(
    Object.values(OCEAN_PASS_UNIFORM_TYPES).flatMap((types) => Object.keys(types)),
  );
  for (const name of [...OCEAN_TUNED_TO_SCREEN, ...OCEAN_SCREEN_TO_TUNED]) {
    assert.ok(declared.has(name), `${name} is converted but no pass declares it`);
  }
  for (const name of OCEAN_TUNED_TO_SCREEN) {
    assert.ok(
      !OCEAN_SCREEN_TO_TUNED.has(name),
      `${name} cannot be converted in both directions`,
    );
  }
});

test("the wave field is solved offline, so no pass carries an eikonal solver", () => {
  // The coastline is fixed once set. If a sweep ever appears in a shipped
  // shader it means the bake stopped being the source of the phase field.
  for (const [pass, source] of Object.entries(PASSES)) {
    assert.ok(
      source.includes("texPhase"),
      `${pass} pass should read the baked phase field`,
    );
    assert.doesNotMatch(source, /godunov|eikonal\s+sweep/i, `${pass} pass`);
  }
});
