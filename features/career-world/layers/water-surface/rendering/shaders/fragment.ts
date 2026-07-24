import { WATER_SHADER_COAST } from "./coast";
import { WATER_SHADER_COMMON } from "./common";
import { WATER_SHADER_OPEN_WATER } from "./open-water";

export const WATER_FRAGMENT_SHADER = `#version 300 es
${WATER_SHADER_COMMON}
${WATER_SHADER_OPEN_WATER}
${WATER_SHADER_COAST}

void main() {
  vec2 screenUv = vec2(v_uv.x, 1.0 - v_uv.y);
  vec2 worldUv = u_cameraOrigin + screenUv * u_cameraSpan;
  vec2 hydrology = texture(u_hydrology, worldUv).rg;
  float shelter = max(hydrology.r, hydrology.g);
  OpenWaterSample water = sampleOpenWater(worldUv, hydrology);
  CoastSample coast = applyCoast(worldUv, water, shelter);
  float waterVisibility = 1.0 - smoother(0.02, 0.98, coast.landMask);
  outColor = vec4(
    coast.color,
    u_opacity * max(waterVisibility, coast.overlayAlpha)
  );
}
`;
