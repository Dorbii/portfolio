# Ocean / page performance — diagnosis for the ocean thread (2026-09-07)

Owner: "help me figure out the issue with the ocean performance? no fix, I'll
pass it on to the other thread." Measured on the dev server
(`codex/land-lod-completion` tip, water layer as merged 2026-09-05) from the
desktop app's embedded Browser pane, viewport 1004 x 564 CSS px, DPR 1, GPU
`ANGLE (NVIDIA GeForce RTX 3080 Ti, D3D11)`. Nothing here is a fix; the two
runtime files the ocean session owns were not touched.

## 1. First, a correction: the app's Browser pane is not a benchmark

Wall-clock frame intervals measured in the pane:

| state of the pane | frame interval |
|---|---|
| pane active, page at site zoom | 33.4 ms mean, 33.5 ms p95 — a hard 30 Hz cadence with no variance |
| pane displayed but not focused / occluded | one frame every ~2.0 s (gaps of 1985-2004 ms, six in ten seconds) |

A GPU-bound page shows variance; a flat 33.4/33.5 is a pacing cap. The
2-second gaps are timer/rAF throttling, not work. So the "28 fps before any
foliage work" figure reported earlier today was the pane, not the page.
**Measure in a real Chrome window**, with the built-in probe (`?perf=1` →
p50/p95 frame ms, frames over 20/33/50 ms) and the water canvas's own
counters (`data-gpu-p50-ms`, `data-gpu-p95-ms`, `data-cpu-render-ms`,
`data-frame-count` on `canvas[data-layer="water"]`).

## 2. What the water actually costs (its own counters, same session)

| counter | value |
|---|---|
| `cpuRenderMs` (main thread per frame) | 0.4 - 0.7 ms |
| `gpuP50Ms` (EXT_disjoint_timer_query, per frame) | 1.6 - 1.8 ms at 1004 x 564 |
| `gpuP95Ms` | 1035 - 1994 ms — see §3, an artefact |
| `water-events` canvas GPU | 0.0 - 0.14 ms |
| main-thread time inside every rAF callback on the page | ~0.1 - 0.3 ms per frame (only a camera-inertia tick was even running) |

On this GPU the ocean is cheap. The spectral simulation is
resolution-independent: `SPECTRUM_SIZE = 128`, two cascades, so
`2 × (2 + 2·log2 128) = 32` small passes per frame on 128² targets. The
screen-sized work is two full-screen triangles (the detail pass and the base
pass) at `min(devicePixelRatio, 1.5)`.

## 3. The 1-2 second p95 is the timer straddling throttled idle

`GpuTimer.begin()`/`end()` bracket one `render()` call; the query's elapsed
time tracked the rAF gap exactly (gaps of ~2.0 s ↔ p95 1994.5 ms; an earlier
window with ~1 s gaps ↔ p95 1035.7 ms). It is not a real stall. Suggestion
for whoever owns it: drop a sample when the frame interval around it exceeds
~100 ms (or when `document.hasFocus()` is false), so `gpuP95Ms` means what it
says.

## 4. The structural suspect for real users: the per-frame canvas copy

`WaterRenderer.ts` ~L287-293: every frame, after drawing the detail pass, the
WebGL canvas is copied into a 2D canvas (`detailContext.drawImage(canvas, 0,
0)`) "to transfer it to its own compositing layer above the land", then the
base pass is drawn. That copy is a full-resolution surface transfer every
frame, and it forces the WebGL frame to be resolved synchronously before the
base pass can proceed. It scales with output pixels, not with the
simulation: at 1004 x 564 it is 0.57 MP; on a 2560 x 1440 display at the
1.5 DPR cap it is 8.3 MP per frame. If real users lag on the ocean, this is
the first thing to measure (toggle the details pass — `oceanDetailsVisible`
/ the L1_2 environment layer — and compare `gpuP50Ms` and the probe's p95)
and the first thing to redesign (a second WebGL context for the detail
layer, or drawing the details in the same context with the z-order solved
another way, avoids the copy entirely).

## 5. Things checked and cleared

- `checkGpu()` (a `gl.getError()` per stage, six per frame) runs only under
  `?probe=1`; the spectrum `readPixels` probe likewise. Not in production.
- No worker / OffscreenCanvas: everything is main-thread, and the main
  thread is idle (§2).
- No per-frame texture allocation in the render path; the `texImage2D` in
  `WaterRenderer.ts` ~L264 is the resize path.
- The terrain canvas redraws only on camera change and presentation fades,
  at a 2x backing store (2007 x 1129 here); it is not in the steady-state
  frame. (Pan/zoom cost is a separate question: that redraw rasterises up to
  twelve 2048² tiles through 2D `drawImage` per camera frame.)

## 6. What to ask the ocean thread for

1. Real-browser numbers with `?perf=1` at world, territory and site zoom on
   the owner's display, plus the water canvas counters, at rest and while
   panning.
2. The same with the ocean details pass off, to price the canvas copy (§4).
3. The `GpuTimer` sample guard (§3) so p95 is trustworthy.
