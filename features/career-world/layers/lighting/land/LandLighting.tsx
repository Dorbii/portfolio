"use client";

import { useId, type ReactNode } from "react";
import type { CameraView } from "../../../shared/camera";
import { CLOUD_SHADOW_REPEAT_TEXTURE, type SceneLighting } from "../model";

export function LandLighting({ camera, light, enabled = true, children }: {
  readonly camera: CameraView;
  readonly light: SceneLighting;
  readonly enabled?: boolean;
  readonly children: ReactNode;
}) {
  const id = `land-light-${useId().replaceAll(":", "")}`;
  const gain = light.landGain;
  const matrix = `${gain[0]} 0 0 0 0  0 ${gain[1]} 0 0 0  0 0 ${gain[2]} 0 0  0 0 0 1 0`;
  const shadow = light.directFraction.map((value) => value * light.cloudStrength);
  return <div className="career-world__land-lighting" data-lighting-target="land" data-lighting-hour={light.hour.toFixed(2)}>
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        <filter id={id} x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox" colorInterpolationFilters="linearRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values={matrix} result="lit" />
          <feImage href={CLOUD_SHADOW_REPEAT_TEXTURE} preserveAspectRatio="none"
            x={(-1 - camera.origin[0] - light.cloudOffset[0]) / camera.span[0]}
            y={(-1 - camera.origin[1] - light.cloudOffset[1]) / camera.span[1]}
            width={3 / camera.span[0]} height={3 / camera.span[1]} result="cloud" />
          <feComponentTransfer in="cloud" result="shadow">
            <feFuncR type="linear" slope={shadow[0]} intercept={1 - shadow[0]} />
            <feFuncG type="linear" slope={shadow[1]} intercept={1 - shadow[1]} />
            <feFuncB type="linear" slope={shadow[2]} intercept={1 - shadow[2]} />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
          <feComposite in="lit" in2="shadow" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" />
        </filter>
      </defs>
    </svg>
    <div className="career-world__land-lighting-surface" style={{ filter: enabled && light.enabled ? `url(#${id})` : undefined }}>
      {children}
    </div>
  </div>;
}
