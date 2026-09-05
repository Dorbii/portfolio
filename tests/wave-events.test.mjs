import assert from "node:assert/strict";
import test from "node:test";
import { createWaveEventCatalog, selectWaveEvents } from "../features/career-world/layers/water/ocean/events/model.ts";

function encodeDistance(metres, range) {
  return Math.round(Math.max(0, Math.min(1, 0.5 + metres / (2 * range))) * 255);
}

function encodeFlow(value) {
  return Math.round(Math.max(0, Math.min(1, 0.5 + value * 0.5)) * 255);
}

function domainFrom(width, height, worldMetres, classify, rangeMetres = 24) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const point = [(x + 0.5) / width * worldMetres[0], (y + 0.5) / height * worldMetres[1]];
    const value = classify(...point);
    const index = (y * width + x) * 4;
    rgba[index] = encodeDistance(value.distance, rangeMetres);
    rgba[index + 1] = value.green ?? encodeFlow(value.flow?.[0] ?? 0);
    rgba[index + 2] = encodeFlow(value.flow?.[1] ?? 0);
    rgba[index + 3] = 255;
  }
  return { width, height, rgba, worldMetres, rangeMetres };
}

test("catalog placement is deterministic, metric, and follows the registered wind projection", () => {
  const domain = domainFrom(320, 220, [640, 440], () => ({ distance: 24 }));
  const first = createWaveEventCatalog(domain, 0.73);
  const second = createWaveEventCatalog(domain, 0.73);
  assert.deepEqual(first, second);
  assert.ok(first.some((site) => site.kind === "breaker"));
  for (const site of first) {
    assert.ok(Math.abs(Math.hypot(...site.direction) - 1) < 1e-12);
    assert.ok(site.center[0] >= 0 && site.center[0] < domain.worldMetres[0]);
    assert.ok(site.center[1] >= 0 && site.center[1] < domain.worldMetres[1]);
    assert.ok(site.length > 0 && site.height > 0 && site.period > 0);
  }
});

test("catalog excludes land, inland water, and provisional banks", () => {
  const domain = domainFrom(360, 240, [720, 480], (x, y) => {
    const distance = x - 120;
    if (y >= 330) return { distance, flow: [0.2, 0] };
    if (y < 150) return { distance, green: 126 };
    return { distance };
  });
  const sites = createWaveEventCatalog(domain, 0);
  const impacts = sites.filter((site) => site.kind === "impact");
  assert.ok(impacts.length > 0);
  assert.ok(impacts.every((site) => site.center[0] > 120 && site.center[1] >= 150 && site.center[1] < 330));
  assert.ok(sites.every((site) => site.center[0] > 120 && site.center[1] < 330));
  for (let i = 0; i < impacts.length; i++) for (let j = i + 1; j < impacts.length; j++) {
    assert.ok(Math.hypot(impacts[i].center[0] - impacts[j].center[0], impacts[i].center[1] - impacts[j].center[1]) >= 35 - 1e-9);
  }
});

function scheduledSites(count = 32) {
  return Array.from({ length: count }, (_, id) => ({
    id,
    kind: id % 3 === 0 ? "impact" : "breaker",
    center: [50 + id * 8, 100],
    direction: [1, 0],
    length: 30,
    height: 8,
    period: 40,
    offset: 1,
    seed: id * 7919 + 17,
  }));
}

test("selection is camera-culled, input-order independent, and bounded", () => {
  const sites = scheduledSites();
  const camera = { origin: [0, 0], span: [0.6, 1] };
  const forward = selectWaveEvents(sites, 1, 1, camera, [500, 200], 5);
  const reverse = selectWaveEvents([...sites].reverse(), 1, 1, camera, [500, 200], 5);
  assert.deepEqual(forward, reverse);
  assert.ok(forward.length <= 5);
  assert.ok(forward.every((event) => event.center[0] < 350));
  assert.deepEqual(selectWaveEvents(sites, 1, 1, camera, [500, 200], 0), []);
});

test("clock phase pauses exactly and heavier weather admits and strengthens events", () => {
  const sites = scheduledSites(96);
  const camera = { origin: [0, 0], span: [1, 1] };
  const world = [1000, 200];
  const calm = selectWaveEvents(sites, 1, 0, camera, world, 96);
  const storm = selectWaveEvents(sites, 1, 1, camera, world, 96);
  assert.deepEqual(selectWaveEvents(sites, 1, 1, camera, world, 96), storm);
  assert.ok(calm.length > 0, "calm water should retain rare events");
  assert.ok(storm.length > calm.length);
  const stormById = new Map(storm.map((event) => [event.id, event]));
  assert.ok(calm.every((event) => stormById.get(event.id).strength >= event.strength));
  assert.ok(storm.every((event) => event.age === 2));
});

test("breaker and impact lifecycles use fixed modulo clocks", () => {
  const base = { center: [100, 100], direction: [1, 0], length: 30, height: 8, period: 20, offset: 0, seed: 0 };
  const camera = { origin: [0, 0], span: [1, 1] };
  const breaker = { ...base, id: 1, kind: "breaker" };
  const impact = { ...base, id: 2, kind: "impact" };
  assert.equal(selectWaveEvents([breaker], 0, 1, camera, [200, 200]).length, 1);
  assert.equal(selectWaveEvents([breaker], 8, 1, camera, [200, 200]).length, 1);
  assert.equal(selectWaveEvents([breaker], 9, 1, camera, [200, 200]).length, 0);
  assert.equal(selectWaveEvents([impact], 4, 1, camera, [200, 200]).length, 1);
  assert.equal(selectWaveEvents([impact], 5, 1, camera, [200, 200]).length, 0);
});
