"use client";

import { useEffect, useRef } from "react";

interface PerformanceProbeProps {
  readonly enabled: boolean;
}

interface PerformanceMetrics {
  readonly cameraCommits: number;
  readonly decodedBodyBytes: number;
  readonly durationMs: number;
  readonly frameCount: number;
  readonly framesOver20Ms: number;
  readonly framesOver33Ms: number;
  readonly framesOver50Ms: number;
  readonly longTaskCount: number;
  readonly longTaskDurationMs: number;
  readonly longTaskMaximumMs: number;
  readonly maximumFrameMs: number;
  readonly p50FrameMs: number;
  readonly p95FrameMs: number;
  readonly resourceCount: number;
  readonly transferBytes: number;
}

const SETTLE_DURATION_MS = 850;
const MAXIMUM_RUN_DURATION_MS = 15_000;
const PROFILE_RESOURCE_MARKERS = [
  "/career-world/layers/terrain/authority/tiles/",
  "/career-world/layers/structures/textures/",
];

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[
    Math.min(ordered.length - 1, Math.floor(ordered.length * ratio))
  ];
}

function profileResourcesSince(startedAt: number): {
  readonly decodedBodyBytes: number;
  readonly resourceCount: number;
  readonly transferBytes: number;
} {
  const resources = performance
    .getEntriesByType("resource")
    .filter((entry): entry is PerformanceResourceTiming =>
      entry instanceof PerformanceResourceTiming
      && entry.startTime >= startedAt
      && PROFILE_RESOURCE_MARKERS.some((marker) => entry.name.includes(marker))
    );

  return {
    decodedBodyBytes: resources.reduce(
      (total, resource) => total + resource.decodedBodySize,
      0,
    ),
    resourceCount: resources.length,
    transferBytes: resources.reduce(
      (total, resource) => total + resource.transferSize,
      0,
    ),
  };
}

export function PerformanceProbe({
  enabled,
}: PerformanceProbeProps) {
  const outputRef = useRef<HTMLOutputElement>(null);

  useEffect(() => {
    const output = outputRef.current;
    const shouldProfile = enabled
      && new URLSearchParams(window.location.search).get("perf") === "1";
    if (!output || !shouldProfile) {
      return;
    }

    const viewport = output.closest<HTMLElement>(
      ".career-world__viewport",
    );
    if (!viewport) {
      return;
    }

    let animationFrame = 0;
    let cameraCommits = 0;
    let frameIntervals: number[] = [];
    let lastCameraMutationAt = 0;
    let lastFrameAt = 0;
    let longTaskDurations: number[] = [];
    let running = false;
    let startedAt = 0;

    const beginRun = (timestamp: number) => {
      cameraCommits = 0;
      frameIntervals = [];
      lastCameraMutationAt = timestamp;
      lastFrameAt = 0;
      longTaskDurations = [];
      running = true;
      startedAt = timestamp;
      output.dataset.performanceState = "running";
      delete output.dataset.performanceMetrics;
      output.value = "";
    };

    const finishRun = (timestamp: number) => {
      const resources = profileResourcesSince(startedAt);
      const metrics: PerformanceMetrics = {
        cameraCommits,
        decodedBodyBytes: resources.decodedBodyBytes,
        durationMs: roundMetric(timestamp - startedAt),
        frameCount: frameIntervals.length,
        framesOver20Ms: frameIntervals.filter((value) => value > 20).length,
        framesOver33Ms: frameIntervals.filter((value) => value > 33).length,
        framesOver50Ms: frameIntervals.filter((value) => value > 50).length,
        longTaskCount: longTaskDurations.length,
        longTaskDurationMs: roundMetric(
          longTaskDurations.reduce((total, value) => total + value, 0),
        ),
        longTaskMaximumMs: roundMetric(Math.max(0, ...longTaskDurations)),
        maximumFrameMs: roundMetric(Math.max(0, ...frameIntervals)),
        p50FrameMs: roundMetric(percentile(frameIntervals, 0.5)),
        p95FrameMs: roundMetric(percentile(frameIntervals, 0.95)),
        resourceCount: resources.resourceCount,
        transferBytes: resources.transferBytes,
      };
      const serialized = JSON.stringify(metrics);
      output.dataset.performanceMetrics = serialized;
      output.dataset.performanceState = "complete";
      output.value = serialized;
      running = false;
      lastFrameAt = 0;
    };

    const cameraObserver = new MutationObserver((records) => {
      if (!records.some((record) =>
        record.attributeName === "data-camera-origin"
        || record.attributeName === "data-camera-span"
      )) {
        return;
      }
      const timestamp = performance.now();
      if (!running) {
        beginRun(timestamp);
      }
      cameraCommits += 1;
      lastCameraMutationAt = timestamp;
    });
    cameraObserver.observe(viewport, {
      attributeFilter: ["data-camera-origin", "data-camera-span"],
      attributes: true,
    });

    const longTaskObserver = typeof PerformanceObserver === "undefined"
      ? null
      : new PerformanceObserver((entries) => {
          if (!running) {
            return;
          }
          for (const entry of entries.getEntries()) {
            if (entry.startTime >= startedAt) {
              longTaskDurations.push(entry.duration);
            }
          }
        });
    try {
      longTaskObserver?.observe({ type: "longtask" });
    } catch {
      longTaskObserver?.disconnect();
    }

    const sampleFrame = (timestamp: number) => {
      if (running) {
        if (lastFrameAt > 0) {
          frameIntervals.push(timestamp - lastFrameAt);
        }
        lastFrameAt = timestamp;

        const settled = timestamp - lastCameraMutationAt
          >= SETTLE_DURATION_MS;
        const expired = timestamp - startedAt
          >= MAXIMUM_RUN_DURATION_MS;
        if (settled || expired) {
          finishRun(timestamp);
        }
      }
      animationFrame = requestAnimationFrame(sampleFrame);
    };

    output.dataset.performanceState = "armed";
    animationFrame = requestAnimationFrame(sampleFrame);

    return () => {
      cancelAnimationFrame(animationFrame);
      cameraObserver.disconnect();
      longTaskObserver?.disconnect();
    };
  }, [enabled]);

  return (
    <output
      data-career-world-performance=""
      hidden
      ref={outputRef}
    />
  );
}
