import { WATER_WINDY_ENERGETIC_SHORE_GLSL } from "./shore-lifecycle";

export const WATER_SHADER_COAST = `
struct CoastSample {
  vec3 color;
  float overlayAlpha;
  float landMask;
};

${WATER_WINDY_ENERGETIC_SHORE_GLSL}

vec2 coastShelfGradient(vec2 worldUv) {
  float left = texture(
    u_coastGeometry,
    worldUv - vec2(u_coastTexel.x, 0.0)
  ).g;
  float right = texture(
    u_coastGeometry,
    worldUv + vec2(u_coastTexel.x, 0.0)
  ).g;
  float up = texture(
    u_coastGeometry,
    worldUv - vec2(0.0, u_coastTexel.y)
  ).g;
  float down = texture(
    u_coastGeometry,
    worldUv + vec2(0.0, u_coastTexel.y)
  ).g;
  return vec2(right - left, down - up);
}

vec2 coastProfileGradient(vec2 worldUv) {
  float left = texture(
    u_coastMaterial,
    worldUv - vec2(u_coastMaterialTexel.x, 0.0)
  ).b;
  float right = texture(
    u_coastMaterial,
    worldUv + vec2(u_coastMaterialTexel.x, 0.0)
  ).b;
  float up = texture(
    u_coastMaterial,
    worldUv - vec2(0.0, u_coastMaterialTexel.y)
  ).b;
  float down = texture(
    u_coastMaterial,
    worldUv + vec2(0.0, u_coastMaterialTexel.y)
  ).b;
  return vec2(right - left, down - up);
}

CoastSample applyCoast(
  vec2 worldUv,
  OpenWaterSample water,
  float lagoon
) {
  vec4 geometry = texture(u_coastGeometry, worldUv);
  vec3 material = texture(u_coastMaterial, worldUv).rgb;
  float rawShelf = geometry.g;
  float rawContact = geometry.b;
  float substrate = geometry.a;
  // Ocean zoom is a continuous camera-span scalar, shared with open water.
  float zoom = u_zoom;
  float capitalSwashWeight = smoother(0.46, 0.92, zoom);
  float closeSwashWeight = smoother(0.72, 0.98, zoom);
  float beach = saturate(material.r);
  float cliff = saturate(material.g) * (1.0 - beach);
  float rocky = 1.0 - max(beach, cliff);
  float profileHeight = saturate(material.b);
  float land = geometry.r;
  float waterMask = 1.0 - land;

  float coastMacro = heightSample(
    u_macroHeight,
    worldUv * vec2(4.1, 3.6) + vec2(0.13, 0.47)
  );
  float coastFine = heightSample(
    u_microHeight,
    worldUv * vec2(17.0, 14.0) + vec2(0.37, 0.11)
  );
  float profileVariation =
    mix(0.82, 1.18, coastMacro)
    * mix(0.9, 1.1, coastFine);

  float rockyContact = smoother(mix(0.82, 0.68, zoom), 0.98, rawContact);
  float beachContact = smoother(
    mix(0.78, 0.52, zoom) / profileVariation,
    0.98,
    rawContact
  );
  float cliffContact = smoother(
    mix(0.84, 0.67, zoom) / mix(0.94, 1.08, coastMacro),
    0.99,
    rawContact
  );
  float contact =
    rockyContact * rocky
    + beachContact * beach
    + cliffContact * cliff;

  float rockyShelf = pow(
    saturate(rawShelf),
    mix(0.78, 1.38, zoom)
  );
  float beachShelf = pow(
    saturate(rawShelf),
    mix(1.45, 1.08, zoom) / profileVariation
  );
  float cliffShelf = smoother(
    mix(0.72, 0.58, zoom),
    0.98,
    rawShelf
  );
  float shelf =
    rockyShelf * rocky
    + beachShelf * beach
    + cliffShelf * cliff;
  vec2 gradient = coastShelfGradient(worldUv);
  float gradientLength = length(gradient);
  vec2 shoreNormal = gradientLength > 0.0001
    ? gradient / gradientLength
    : -u_wind;
  float exposure = smoother(
    -0.15,
    0.75,
    dot(-shoreNormal, normalize(u_wind))
  );
  exposure = mix(exposure, 0.24, lagoon * 0.74);

  float time = u_time * u_motion;
  // The named shore lifecycle loops every eight seconds. Its spatial phase is
  // local, but its clock is shared, so frame 0 and frame 8 are identical.
  float lifecycleLoopPhase = fract(time / 8.0) * 6.2831853;
  // Offset each stretch of coast with the existing height fields so breakers
  // arrive locally instead of flashing around the whole landmass at once.
  float coastPhaseOffset =
    (coastMacro - 0.5) * 6.4
    + (coastFine - 0.5) * 2.1;
  // Shelf rises toward land, so positive time sends each local crest shoreward.
  float approachPhase =
    (1.0 - shelf) * 7.2
    + lifecycleLoopPhase
    + coastPhaseOffset;
  float advancingBand = smoother(0.62, 0.94, sin(approachPhase) * 0.5 + 0.5);
  float recedingBand = smoother(
    0.58,
    0.93,
    sin(approachPhase - 1.72) * 0.5 + 0.5
  ) * (1.0 - advancingBand * 0.72);
  // T34: named shore-SDF lifecycle. Shelf rises monotonically into land, so
  // these bands read open approach -> impact -> turbulent carry -> breakup.
  float arrival = sin(approachPhase) * 0.5 + 0.5;
  WindyEnergeticShoreLifecycle lifecycle =
    sampleWindyEnergeticShoreLifecycle(
      shelf,
      arrival,
      water.crest,
      exposure,
      zoom
    );
  float arcMacro = heightSample(
    u_macroHeight,
    worldUv * vec2(12.7, 10.9) + vec2(time * 0.0012, -time * 0.0004)
  );
  float arcFine = heightSample(
    u_microHeight,
    worldUv * vec2(29.0, 25.0) + vec2(-time * 0.0022, time * 0.0008)
  );
  float brokenArc = smoother(
    0.43,
    0.69,
    arcMacro * 0.42 + arcFine * 0.58
  );
  float siteArc = smoother(
    0.52,
    0.74,
    heightSample(
      u_microHeight,
      worldUv * vec2(53.0, 47.0)
        + vec2(-time * 0.0031, time * 0.0014)
    )
  );
  float siteSwash = smoother(
    0.68,
    0.96,
    sin(
      (1.0 - shelf) * 13.4
        + time * (1.24 + exposure * 0.18)
        + coastPhaseOffset * 1.55
    ) * 0.5 + 0.5
  );

  float shelfVariation = mix(
    0.58,
    1.04,
    heightSample(
      u_macroHeight,
      worldUv * vec2(3.7, 3.1) + vec2(0.19, 0.43)
    )
  );
  float materialShallow =
    rocky * 0.58
    + beach * 0.78
    + cliff * 0.32;
  float shallowAmount =
    shelf
    * materialShallow
    * mix(1.0, 0.72, lagoon)
    * mix(0.8, 1.0, zoom);
  shallowAmount *= shelfVariation * mix(
    1.0,
    mix(0.72, 1.08, brokenArc),
    beach
  );
  vec3 seabed = mix(
    u_deepColor,
    u_substrateColor,
    0.24 + substrate * 0.2 + profileHeight * 0.28
  );
  seabed = mix(seabed, u_shallowColor, 0.7);
  vec3 beachShallow = mix(u_shallowColor, u_substrateColor, 0.1);
  seabed = mix(
    seabed,
    beachShallow,
    beach * mix(0.24, 0.38, zoom)
  );
  seabed = mix(seabed, u_deepColor, cliff * 0.24);
  vec2 profileGradient = coastProfileGradient(worldUv);
  vec3 profileNormal = normalize(vec3(
    -profileGradient * mix(34.0, 56.0, zoom),
    1.0
  ));
  float profileLight = dot(profileNormal, normalize(u_lightDirection));
  float bathymetryLight = mix(
    0.82,
    1.18,
    saturate(profileLight * 0.5 + 0.5)
  );
  seabed *= mix(
    1.0,
    bathymetryLight,
    shelf * waterMask * mix(0.42, 0.7, zoom)
  );
  seabed *= mix(
    0.88,
    1.16,
    profileHeight
  );
  vec3 color = mix(water.color, seabed, shallowAmount);
  color = mix(
    color,
    seabed,
    contact * (1.0 - geometry.r) * mix(0.12, 0.2, beach)
  );

  vec2 horizontalLight = normalize(u_lightDirection.xy);
  vec2 seawardNormal = -shoreNormal;
  float cliffRelief =
    cliff
    * mix(0.48, 1.08, profileHeight)
    * mix(0.64, 1.0, brokenArc);
  float cliffShadowFacing = smoother(
    -0.18,
    0.76,
    dot(seawardNormal, -horizontalLight)
  );
  float cliffShadow =
    waterMask
    * cliffShelf
    * cliffRelief
    * cliffShadowFacing
    * mix(0.16, 0.3, zoom);
  color = mix(color, u_deepColor, cliffShadow);
  vec2 screenWorldTexel = u_cameraSpan / max(u_resolution, vec2(1.0));
  float shadowPixels =
    mix(2.0, mix(4.0, 10.0, profileHeight), zoom)
    * mix(0.72, 1.18, brokenArc);
  vec2 castSampleOffset =
    horizontalLight * screenWorldTexel * shadowPixels;
  float displacedLand = texture(
    u_coastGeometry,
    clamp(worldUv + castSampleOffset * 0.7, 0.001, 0.999)
  ).r * 0.25;
  displacedLand += texture(
    u_coastGeometry,
    clamp(worldUv + castSampleOffset, 0.001, 0.999)
  ).r * 0.5;
  displacedLand += texture(
    u_coastGeometry,
    clamp(worldUv + castSampleOffset * 1.3, 0.001, 0.999)
  ).r * 0.25;
  float castShadow =
    waterMask
    * displacedLand
    * cliffRelief
    * mix(0.18, 0.3, zoom);
  color = mix(color, u_deepColor, castShadow);
  color = mix(
    color,
    u_highlightColor,
    shelf
      * water.crest
      * mix(0.05, 0.066, zoom)
      * mix(1.0, 1.24, beach)
      * mix(1.0, 0.58, cliff)
  );

  float breakerBand =
    smoother(0.55, 0.75, shelf)
    * (1.0 - smoother(0.9, 0.98, shelf));
  float foamContact = smoother(mix(0.9, 0.78, zoom), 0.995, rawContact);
  float breakerFoam =
    breakerBand
    * advancingBand
    * mix(brokenArc, 0.35 + brokenArc * 0.65, beach)
    * mix(0.22, 0.62, exposure)
    * mix(1.0, 1.45, beach)
    * mix(1.0, 0.72, cliff)
    * mix(1.0, 0.36, lagoon);

  float contactFoam =
    (
      waterMask
      * foamContact
      * advancingBand
      * brokenArc
      * mix(0.2, 0.58, exposure)
      * mix(1.0, 0.9, beach)
      * mix(1.0, 1.55, cliff)
      * mix(1.0, 0.42, lagoon)
    )
    + breakerFoam;
  contactFoam += (
    waterMask
    * foamContact
    * brokenArc
    * mix(0.08, 0.18, exposure)
    * mix(1.0, 0.72, beach)
    * mix(1.0, 1.5, cliff)
    * mix(1.0, 0.35, lagoon)
  );
  contactFoam += (
    closeSwashWeight
    * waterMask
    * foamContact
    * siteSwash
    * siteArc
    * mix(0.08, 0.24, exposure)
    * mix(1.2, 0.78, cliff)
    * mix(1.0, 0.3, lagoon)
  );
  contactFoam += (
    capitalSwashWeight
    * waterMask
    * foamContact
    * recedingBand
    * brokenArc
    * mix(0.035, 0.11, exposure)
    * mix(1.16, 0.82, cliff)
    * mix(1.0, 0.34, lagoon)
  );
  // Impact is brightest at contact. A pair of phase-lagged, flow-advected
  // samples is the one-pass feedback-decay analogue: old impact persists as
  // turbulent foam, then thins and feeds the next shoreward arrival.
  float localEddy = heightSample(
    u_microHeight,
    worldUv * vec2(31.0, 27.0)
      + shoreNormal * sin(lifecycleLoopPhase) * 0.029
      - u_wind * cos(lifecycleLoopPhase) * 0.05
  );
  float priorArrival = sin(approachPhase - 1.18) * 0.5 + 0.5;
  float olderArrival = sin(approachPhase - 2.31) * 0.5 + 0.5;
  float feedbackDecay = max(
    lifecycle.impact,
    max(
      lifecycle.turbulent * (0.44 + localEddy * 0.42),
      lifecycle.dissipation * (0.26 + priorArrival * 0.22 + olderArrival * 0.12)
    )
  );
  float sprayBurst = lifecycle.spray
    * smoother(0.52, 0.86, coastMacro * 0.56 + coastFine * 0.44)
    * (0.48 + brokenArc * 0.52);
  float lifecycleFoam = feedbackDecay
    * waterMask
    * mix(0.06, 0.34, zoom)
    * mix(0.68, 1.0, brokenArc);
  contactFoam += lifecycleFoam;
  color = mix(
    color,
    u_foamColor,
    contactFoam * u_coastalAmbience * mix(0.86, 1.08, zoom)
  );
  // Water-side only: survives the retired global L1_2 overlay, but never
  // paints wet bands over land (the defect class T33d removed). Sparse spray
  // and feedback foam are scale-bounded, so far tiers retain the calm curve.
  float energeticWaterFoam = saturate(
    lifecycleFoam * 0.82 + sprayBurst * mix(0.16, 0.44, zoom)
  );
  color = mix(color, u_foamColor, energeticWaterFoam);

  float wetContact =
    land
    * smoother(0.94, 0.999, rawContact)
    * mix(0.045, 0.12, zoom)
    * mix(0.66, 1.0, brokenArc)
    * mix(1.0, 0.72, cliff)
    * mix(1.0, 0.45, lagoon);
  float landWash =
    land
    * smoother(0.925, 0.998, rawContact)
    * advancingBand
    * brokenArc
    * mix(0.18, 0.52, exposure)
    * mix(1.0, 1.24, beach)
    * mix(1.0, 0.74, cliff)
    * mix(1.0, 0.42, lagoon);
  landWash += (
    closeSwashWeight
    * land
    * smoother(0.94, 0.998, rawContact)
    * siteSwash
    * siteArc
    * mix(0.055, 0.16, exposure)
    * mix(1.15, 0.7, cliff)
    * mix(1.0, 0.3, lagoon)
  );
  landWash += (
    capitalSwashWeight
    * land
    * smoother(0.945, 0.999, rawContact)
    * recedingBand
    * brokenArc
    * mix(0.025, 0.09, exposure)
    * mix(1.12, 0.74, cliff)
    * mix(1.0, 0.36, lagoon)
  );
  float landOverlayMix = saturate(
    landWash / max(landWash + wetContact, 0.0001)
  );
  vec3 wetColor = mix(u_deepColor, u_shallowColor, 0.42);
  color = mix(
    color,
    mix(wetColor, u_foamColor, landOverlayMix),
    land
  );
  float overlayAlpha =
    (
      wetContact * mix(0.2, 0.34, zoom)
      + landWash * mix(0.42, 0.68, zoom)
    ) * u_coastalAmbience;

  CoastSample result;
  vec2 inlandOverride = inlandWaterOverrideAt(worldUv);
  float inlandSurfaceOverride = inlandOverride.x;
  float terrainWaterReveal = inlandOverride.y;
  result.color = mix(color, water.color, inlandSurfaceOverride);
  result.overlayAlpha = saturate(overlayAlpha) * (1.0 - terrainWaterReveal);
  result.landMask = land * (1.0 - terrainWaterReveal);
  return result;
}
`;
