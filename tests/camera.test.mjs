import assert from "node:assert/strict";
import test from "node:test";
import {
  cameraLayerStyle,
  cameraViewBox,
  interpolateCameraView,
  normalizeCameraView,
  panCameraViewByPixels,
  WORLD_CAMERA_VIEW,
  zoomCameraViewAt,
} from "../features/career-world/shared/camera.ts";

test("camera normalization keeps every view on the world plane", () => {
  assert.deepEqual(
    normalizeCameraView({
      origin: [-0.4, 0.95],
      span: [0.05, 0.6],
    }),
    {
      origin: [0, 0.4],
      span: [0.055, 0.6],
    },
  );
});

test("zoom preserves the world point beneath the viewport anchor", () => {
  const view = {
    origin: [0.1, 0.2],
    span: [0.7, 0.7],
  };
  const anchor = [0.25, 0.8];
  const before = view.origin.map(
    (value, index) => value + view.span[index] * anchor[index],
  );
  const zoomed = zoomCameraViewAt(view, anchor, 0.5);
  const after = zoomed.origin.map(
    (value, index) => value + zoomed.span[index] * anchor[index],
  );

  assert.ok(Math.abs(before[0] - after[0]) < 1e-9);
  assert.ok(Math.abs(before[1] - after[1]) < 1e-9);
});

test("pan and interpolation retain one normalized orthographic camera", () => {
  const panned = panCameraViewByPixels(
    { origin: [0.2, 0.2], span: [0.5, 0.5] },
    [-100, 50],
    [1000, 500],
  );
  assert.deepEqual(panned, {
    origin: [0.25, 0.15000000000000002],
    span: [0.5, 0.5],
  });

  const halfway = interpolateCameraView(
    WORLD_CAMERA_VIEW,
    { origin: [0.2, 0.2], span: [0.5, 0.5] },
    0.5,
  );
  assert.ok(halfway.span[0] < 1);
  assert.ok(halfway.span[0] > 0.5);
  assert.ok(halfway.origin.every((value) => value >= 0));
});

test("CSS world-plane transform is derived from the same camera contract", () => {
  assert.deepEqual(
    cameraLayerStyle({ origin: [0.25, 0.1], span: [0.5, 0.5] }),
    {
      width: "100%",
      height: "100%",
      left: "0",
      top: "0",
      transformOrigin: "0 0",
      transform: "translate3d(-50%, -20%, 0) scale(2, 2)",
    },
  );
});

test("SVG camera crops rerasterize from the same normalized view", () => {
  assert.equal(
    cameraViewBox(
      { origin: [0.25, 0.1], span: [0.5, 0.5] },
      [1672, 941],
    ),
    "418 94.10000000000001 836 470.5",
  );
});
