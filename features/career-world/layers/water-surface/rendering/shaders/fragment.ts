import { WATER_SHADER_COAST } from "./coast";
import { WATER_SHADER_COMMON } from "./common";
import { WATER_SHADER_NINJAONE_STREAMS } from "./ninjaone-streams";
import { WATER_SHADER_OPEN_WATER } from "./open-water";

export const WATER_FRAGMENT_SHADER = `#version 300 es
${WATER_SHADER_COMMON}
${WATER_SHADER_OPEN_WATER}
${WATER_SHADER_COAST}
${WATER_SHADER_NINJAONE_STREAMS}

void main() {
  vec2 screenUv = vec2(v_uv.x, 1.0 - v_uv.y);
  vec2 worldUv = u_cameraOrigin + screenUv * u_cameraSpan;
  vec2 hydrology = texture(u_hydrology, worldUv).rg;
  float shelter = max(hydrology.r, hydrology.g);
  OpenWaterSample water = sampleOpenWater(worldUv, hydrology);
  CoastSample coast = applyCoast(worldUv, water, shelter);
  float waterVisibility = 1.0 - smoother(0.02, 0.98, coast.landMask);
  NinjaOneStreamSample stream = sampleNinjaOneStreams(worldUv);
  float streamMix = smoother(0.01, 0.08, stream.alpha);
  vec3 color = mix(coast.color, stream.color, streamMix);
  float globalVisibility = max(
    max(waterVisibility, coast.overlayAlpha),
    stream.alpha
  );
  // At z8 the water canvas is an overlay, not another ocean plane. Exclude
  // global water coverage so native terrain remains visible; only registered
  // coast interaction and NinjaOne hydrology may composite above it.
  float registeredForegroundVisibility = max(coast.overlayAlpha, stream.alpha);
  float visibility = mix(
    globalVisibility,
    registeredForegroundVisibility,
    u_foregroundHydrology
  );
  outColor = vec4(
    color,
    u_opacity * visibility
  );
}
`;
