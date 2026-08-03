"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import {
  cameraViewBox,
  type CameraView,
  type Pair,
} from "../../../shared/camera";
import type { WorldLight } from "../../../shared/lighting";
import { PEDESTRIAN_SPAN } from "../../../shared/humanScale";
import {
  LOD_PRESENTATION_EPSILON,
  LOD_PRESENTATION_TRANSITION_MS,
  resolveNodeVisibility,
  type DetailState,
} from "../../../shared/lod";
import { WORLD_PLANE } from "../../../shared/world";
import { resolveTownPresentationOffset } from "../../../shared/townPresentation";
import {
  PEDESTRIAN_INSTANCES,
  PEDESTRIAN_NODE_POLICY,
  RENDERED_PEDESTRIAN_INSTANCES,
  type PedestrianAppearance,
  type PedestrianInstance,
} from "../model/pedestrians";

interface ActorsEffectsLayerProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly light: WorldLight;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const ENDPOINT_VISIBILITY_KEY_TIMES = "0;0.04;0.1;0.9;0.96;1";
const ENDPOINT_VISIBILITY_VALUES = "0;0;1;1;0;0";

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const syncPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => {
      mediaQuery.removeEventListener("change", syncPreference);
    };
  }, []);

  return prefersReducedMotion;
}

function worldPoint([x, y]: Pair): Pair {
  return Object.freeze([
    x * WORLD_PLANE.width,
    y * WORLD_PLANE.height,
  ] as [number, number]);
}

function motionPath(points: readonly Pair[]): string {
  return points.map((point, index) => {
    const [x, y] = worldPoint(point);
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
}

function PedestrianGlyph({
  appearance,
  light,
}: {
  readonly appearance: PedestrianAppearance;
  readonly light: WorldLight;
}) {
  const width = PEDESTRIAN_SPAN[0] * WORLD_PLANE.width;
  const height = PEDESTRIAN_SPAN[1] * WORLD_PLANE.height;

  return (
    <>
      <ellipse
        cx={0}
        cy={height * -0.02}
        fill="#090b09"
        opacity={0.58}
        rx={width * 0.46}
        ry={height * 0.055}
      />
      <path
        d={[
          `M ${width * -0.18} ${height * -0.25}`,
          `L ${width * -0.22} ${height * -0.04}`,
          `M ${width * 0.18} ${height * -0.25}`,
          `L ${width * 0.22} ${height * -0.04}`,
        ].join(" ")}
        fill="none"
        stroke={appearance.trousers}
        strokeLinecap="round"
        strokeWidth={width * 0.16}
      />
      <path
        d={[
          `M ${width * -0.2} ${height * -0.64}`,
          `L ${width * 0.2} ${height * -0.64}`,
          `L ${width * 0.45} ${height * -0.16}`,
          `L ${width * 0.14} ${height * -0.09}`,
          `L ${width * -0.14} ${height * -0.09}`,
          `L ${width * -0.45} ${height * -0.16}`,
          "Z",
        ].join(" ")}
        fill={appearance.coat}
        stroke="#171b18"
        strokeWidth={width * 0.1}
      />
      <path
        d={[
          `M ${width * -0.34} ${height * -0.55}`,
          `L ${width * -0.48} ${height * -0.29}`,
          `M ${width * 0.34} ${height * -0.55}`,
          `L ${width * 0.48} ${height * -0.29}`,
        ].join(" ")}
        fill="none"
        stroke={appearance.coat}
        strokeLinecap="round"
        strokeWidth={width * 0.14}
      />
      <circle
        cx={0}
        cy={height * -0.79}
        fill={appearance.skin}
        r={width * 0.29}
        stroke="#171b18"
        strokeWidth={width * 0.08}
      />
      <path
        d={[
          `M ${width * -0.3} ${height * -0.82}`,
          `Q 0 ${height * -0.94}`,
          `${width * 0.3} ${height * -0.82}`,
        ].join(" ")}
        fill="none"
        stroke={appearance.hair}
        strokeLinecap="round"
        strokeWidth={width * 0.25}
      />
      <path
        d={[
          `M ${width * -0.16} ${height * -0.61}`,
          `L ${width * 0.16} ${height * -0.61}`,
        ].join(" ")}
        fill="none"
        opacity={Math.min(0.7, 0.34 + light.intensity * 0.2)}
        stroke={light.color}
        strokeLinecap="round"
        strokeWidth={width * 0.06}
      />
    </>
  );
}

function PedestrianNode({
  instance,
  light,
  prefersReducedMotion,
}: {
  readonly instance: PedestrianInstance;
  readonly light: WorldLight;
  readonly prefersReducedMotion: boolean;
}) {
  const [restX, restY] = worldPoint(instance.restPoint);
  const [offsetX, offsetY] = resolveTownPresentationOffset(instance.ownerId);
  const transform = prefersReducedMotion
    ? `translate(${restX} ${restY})`
    : undefined;

  return (
    <g
      data-owner-id={instance.ownerId}
      data-town-pedestrian-placement={instance.id}
      transform={
        offsetX === 0 && offsetY === 0
          ? undefined
          : `translate(${offsetX * WORLD_PLANE.width} ${
            offsetY * WORLD_PLANE.height
          })`
      }
    >
      <g
        className="town-pedestrian"
        data-direction={instance.direction}
        data-owner-id={instance.ownerId}
        data-owner-kind={instance.ownerKind}
        data-pedestrian-id={instance.id}
        data-pedestrian-loop-id={instance.loop.id}
        data-start-entrance={instance.startEntranceStructureId}
        transform={transform}
      >
        <PedestrianGlyph appearance={instance.appearance} light={light} />
        {prefersReducedMotion ? null : (
          <>
            <animate
              attributeName="opacity"
              dur={`${instance.durationSeconds}s`}
              keyTimes={ENDPOINT_VISIBILITY_KEY_TIMES}
              repeatCount="indefinite"
              values={ENDPOINT_VISIBILITY_VALUES}
            />
            <animateMotion
              dur={`${instance.durationSeconds}s`}
              path={motionPath(instance.motionPath)}
              repeatCount="indefinite"
              rotate="0"
            />
          </>
        )}
      </g>
    </g>
  );
}

export function ActorsEffectsLayer({
  camera,
  detailState,
  light,
}: ActorsEffectsLayerProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const visibility = resolveNodeVisibility(
    PEDESTRIAN_NODE_POLICY,
    detailState,
  );
  const shouldRender = (
    detailState.shouldLoadCloseAssets
    || visibility > LOD_PRESENTATION_EPSILON
  );
  const style = {
    pointerEvents: "none",
    "--career-world-lod-transition-ms":
      `${LOD_PRESENTATION_TRANSITION_MS}ms`,
  } as CSSProperties;

  return (
    <svg
      aria-hidden="true"
      className="career-world__layer career-world__actors-effects-layer"
      data-layer="actors-effects"
      data-light-source={light.id}
      data-lod-tier={detailState.tier.id}
      data-motion-mode={prefersReducedMotion ? "reduced" : "animated"}
      data-pedestrian-count={PEDESTRIAN_INSTANCES.length}
      data-rendered-pedestrian-count={RENDERED_PEDESTRIAN_INSTANCES.length}
      data-pedestrian-visibility={visibility.toFixed(3)}
      focusable="false"
      preserveAspectRatio="none"
      style={style}
      viewBox={cameraViewBox(
        camera,
        [WORLD_PLANE.width, WORLD_PLANE.height],
      )}
    >
      {shouldRender ? (
        <g
          className="town-pedestrians"
          style={{
            opacity: visibility,
            transition: prefersReducedMotion
              ? "none"
              : `opacity ${LOD_PRESENTATION_TRANSITION_MS}ms ease`,
          }}
        >
          {RENDERED_PEDESTRIAN_INSTANCES.map((instance) => (
            <PedestrianNode
              instance={instance}
              key={instance.id}
              light={light}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </g>
      ) : null}
    </svg>
  );
}
