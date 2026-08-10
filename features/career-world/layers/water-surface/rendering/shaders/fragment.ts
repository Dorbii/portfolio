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
  // Preserve the opaque body in channel interiors while letting the water-side
  // antialias fringe blend beneath accepted bank silhouettes.
  float streamBodyMix = smoother(0.02, 0.72, stream.bodyAlpha);
  vec3 streamBodyComposite = mix(
    coast.color,
    stream.bodyColor,
    streamBodyMix
  );
  vec3 effectsComposite = mix(
    streamBodyComposite,
    stream.effectsColor,
    stream.effectsAlpha
  );
  vec3 color = mix(
    effectsComposite,
    stream.mistColor,
    stream.mistAlpha
  );
  float registeredStreamVisibility = max(
    max(stream.bodyAlpha, stream.effectsAlpha),
    stream.mistAlpha
  );
  float globalVisibility = max(
    max(waterVisibility, coast.overlayAlpha),
    registeredStreamVisibility
  );
  // The foreground-only contract belongs to site/close inspection. Keeping it
  // enabled at world and territory tiers removes the shared ocean entirely and
  // exposes the scene's black underlay around the registered land plate.
  // Site/close water is composited above the opaque authored terrain. Use the
  // canonical land mask here, not the coast wash alpha: overlayAlpha is
  // intentionally allowed to feather inland and made small coastal islands
  // look translucent when this foreground pass crossed them.
  float registeredForegroundVisibility = max(
    waterVisibility,
    registeredStreamVisibility
  );
  float foregroundOverlay = u_foregroundHydrology
    * smoother(0.08, 0.45, u_siteLod);
  float visibility = mix(
    globalVisibility,
    registeredForegroundVisibility,
    foregroundOverlay
  );
  outColor = vec4(
    color,
    u_opacity * visibility
  );
}
`;
