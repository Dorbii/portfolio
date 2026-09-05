import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import sharp from "sharp";
import { lightingIrradiance, linearRgb, resolveSceneLighting, srgbByte } from "../features/career-world/layers/lighting/model.ts";
import { waterFallbackColor } from "../features/career-world/layers/lighting/water/WaterLighting.ts";

const base = JSON.parse(await fs.readFile("public/career-world/layers/world-backdrop/manifests/world-light-r1.json", "utf8"));

test("neutral daylight preserves the original land RGB gain and original world light", () => {
  const light = resolveSceneLighting(13, 0, base);
  assert.deepEqual(light.direction, base.direction);
  assert.equal(light.color, base.color);
  assert.equal(light.ambientColor, base.ambientColor);
  for (const gain of light.landGain) assert.ok(Math.abs(gain - 1) < 1e-10);
  assert.equal(light.cloudStrength, 0);
});

test("daylight cycle is continuous across midnight and changes both adapters' lighting", () => {
  const a = resolveSceneLighting(-0.01, 0.4, base), b = resolveSceneLighting(0.01, 0.4, base);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(a.landGain[i] - b.landGain[i]) < 0.01);
  const day = resolveSceneLighting(13, 0.4, base), night = resolveSceneLighting(22, 0.4, base);
  for (let i = 0; i < 3; i++) assert.ok(night.landGain[i] < day.landGain[i]);
  assert.notEqual(waterFallbackColor(day), waterFallbackColor(night));
  const lightOnly = { ...night, intensity: 0, ambientColor: "#000000" };
  assert.equal(waterFallbackColor(lightOnly), "rgb(0 0 0)");
});

test("cloud shadows share registration and attenuate direct illumination only", () => {
  const clear = resolveSceneLighting(13, 0, base), storm = resolveSceneLighting(13, 1, base);
  assert.deepEqual(clear.direction, storm.direction);
  assert.deepEqual(clear.landGain, storm.landGain);
  assert.ok(storm.cloudStrength > clear.cloudStrength);
  const { total, direct } = lightingIrradiance(storm);
  for (let i = 0; i < 3; i++) {
    const cloudSample = 0.35;
    const factor = 1 - storm.directFraction[i] * storm.cloudStrength * (1 - cloudSample);
    const expected = total[i] - direct[i] * storm.cloudStrength * (1 - cloudSample);
    assert.ok(Math.abs(total[i] * factor - expected) < 1e-12);
  }
  assert.ok(storm.cloudOffset.every(Number.isFinite));
});

test("sRGB conversion round-trips the shared palette without inventing a grade", () => {
  for (const color of [base.color, base.ambientColor, "#000000", "#ffffff", "#0a8fc3"]) {
    assert.equal("#" + linearRgb(color).map((n) => srgbByte(n).toString(16).padStart(2, "0")).join(""), color.toLowerCase());
  }
});

test("land's shadow atlas repeats exactly the water's shadow texture", async () => {
  const single = sharp("public/career-world/layers/lighting/cloud-shadow-r1.png");
  const meta = await single.metadata(), expected = await single.raw().toBuffer();
  for (const [x, y] of [[0, 0], [1, 1], [2, 2]]) {
    const actual = await sharp("public/career-world/layers/lighting/cloud-shadow-repeat-r1.png")
      .extract({ left: x * meta.width, top: y * meta.height, width: meta.width, height: meta.height }).removeAlpha().raw().toBuffer();
    assert.deepEqual(actual, expected);
  }
});
