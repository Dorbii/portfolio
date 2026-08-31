import assert from "node:assert/strict";
import test from "node:test";
import { buildCostSurface, chooseOrientation, minimumErrorSeam, overlapRect, rectFeatherSeam } from "../scripts/stitch-content-aware-seam-r1.mjs";

test("content-aware vertical seam follows the low-error diagonal and remains continuous", () => {
  const width = 7; const height = 8; const values = new Float64Array(width * height).fill(10);
  for (let y = 0; y < height; y += 1) values[y * width + Math.min(width - 1, y)] = 0;
  const seam = minimumErrorSeam({ width, height, values }, "vertical");
  assert.deepEqual(seam.points, Array.from({ length: height }, (_, y) => [Math.min(width - 1, y), y]));
  assert.ok(seam.points.every(([x, y], index) => index === 0 || Math.abs(x - seam.points[index - 1][0]) <= 1 && y === index));
});

test("content-aware horizontal seam follows a low-error contour", () => {
  const width = 9; const height = 6; const values = new Float64Array(width * height).fill(9);
  const contour = [0, 1, 2, 3, 4, 5, 4, 3, 2];
  for (let x = 0; x < width; x += 1) values[contour[x] * width + x] = 0;
  const seam = minimumErrorSeam({ width, height, values }, "horizontal");
  assert.deepEqual(seam.points, contour.map((y, x) => [x, y]));
});

test("equal costs choose a reproducible straight path", () => {
  const surface = { width: 5, height: 4, values: new Float64Array(20).fill(1) };
  assert.deepEqual(minimumErrorSeam(surface, "vertical"), minimumErrorSeam(surface, "vertical"));
  assert.deepEqual(minimumErrorSeam(surface, "vertical").points, [[0, 0], [0, 1], [0, 2], [0, 3]]);
});

test("overlap orientation and rectangle fallback agree with strip geometry", () => {
  const overlap = overlapRect({ left: 0, top: 0, right: 100, bottom: 80 }, { left: 90, top: 0, right: 190, bottom: 80 });
  assert.equal(chooseOrientation(overlap), "vertical");
  const seam = rectFeatherSeam(overlap, "vertical");
  assert.equal(seam.points.length, 80); assert.ok(seam.points.every(([x, y]) => x === 4 && y >= 0 && y < 80));
});

test("cost surface includes registered color and gradient difference", () => {
  const left = { width: 3, height: 3, rect: { left: 0, top: 0, right: 3, bottom: 3 }, data: Buffer.alloc(27, 0) };
  const right = { width: 3, height: 3, rect: { left: 0, top: 0, right: 3, bottom: 3 }, data: Buffer.alloc(27, 0) };
  right.data.fill(255);
  const surface = buildCostSurface(left, right, overlapRect(left.rect, right.rect), 0.35);
  assert.equal(surface.values.length, 9); assert.ok(surface.values.every((value) => value > 0.99));
});
