export const WATER_SHADER_NINJAONE_STREAMS = `
struct NinjaOneStreamSample {
  vec3 bodyColor;
  float bodyAlpha;
  vec3 effectsColor;
  float effectsAlpha;
};

float insideUnitSquare(vec2 value) {
  return step(0.0, value.x)
    * step(0.0, value.y)
    * step(value.x, 1.0)
    * step(value.y, 1.0);
}

float ninjaOneStyleBand(float style, float center, float radius) {
  return 1.0 - smoother(radius * 0.45, radius, abs(style - center));
}

vec4 ninjaOneFetchRegion0(ivec2 coordinate) {
  ivec2 dimensions = ivec2(u_ninjaOneStreamRegion0.zw);
  if (
    any(lessThan(coordinate, ivec2(0)))
    || any(greaterThanEqual(coordinate, dimensions))
  ) {
    return vec4(0.0);
  }
  return texelFetch(u_ninjaOneStreamFlow0, coordinate, 0);
}

vec4 ninjaOneFetchRegion1(ivec2 coordinate) {
  ivec2 dimensions = ivec2(u_ninjaOneStreamRegion1.zw);
  if (
    any(lessThan(coordinate, ivec2(0)))
    || any(greaterThanEqual(coordinate, dimensions))
  ) {
    return vec4(0.0);
  }
  return texelFetch(u_ninjaOneStreamFlow1, coordinate, 0);
}

vec4 ninjaOneSampleRegion0(vec2 fullTexelCoordinate) {
  if (u_ninjaOneStreamSlotCount < 0.5) return vec4(0.0);
  vec2 localCoordinate = fullTexelCoordinate - u_ninjaOneStreamRegion0.xy;
  ivec2 lower = ivec2(floor(localCoordinate));
  vec2 blend = fract(localCoordinate);
  vec4 top = mix(
    ninjaOneFetchRegion0(lower),
    ninjaOneFetchRegion0(lower + ivec2(1, 0)),
    blend.x
  );
  vec4 bottom = mix(
    ninjaOneFetchRegion0(lower + ivec2(0, 1)),
    ninjaOneFetchRegion0(lower + ivec2(1, 1)),
    blend.x
  );
  return mix(top, bottom, blend.y);
}

vec4 ninjaOneSampleRegion1(vec2 fullTexelCoordinate) {
  if (u_ninjaOneStreamSlotCount < 1.5) return vec4(0.0);
  vec2 localCoordinate = fullTexelCoordinate - u_ninjaOneStreamRegion1.xy;
  ivec2 lower = ivec2(floor(localCoordinate));
  vec2 blend = fract(localCoordinate);
  vec4 top = mix(
    ninjaOneFetchRegion1(lower),
    ninjaOneFetchRegion1(lower + ivec2(1, 0)),
    blend.x
  );
  vec4 bottom = mix(
    ninjaOneFetchRegion1(lower + ivec2(0, 1)),
    ninjaOneFetchRegion1(lower + ivec2(1, 1)),
    blend.x
  );
  return mix(top, bottom, blend.y);
}

vec4 sampleNinjaOneRegionalField(vec2 streamUv) {
  // Convert to the texel-center coordinate of the original uncropped field.
  // Each crop contributes transparent zero beyond its exact source bounds, so
  // summing two disjoint slots reconstructs the authored full field without
  // CLAMP_TO_EDGE smearing a bank across the crop boundary.
  vec2 fullTexelCoordinate = streamUv / u_ninjaOneStreamTexel - vec2(0.5);
  return ninjaOneSampleRegion0(fullTexelCoordinate)
    + ninjaOneSampleRegion1(fullTexelCoordinate);
}

NinjaOneStreamSample sampleNinjaOneStreams(vec2 worldUv) {
  NinjaOneStreamSample result;
  result.bodyColor = u_bodyColor;
  result.bodyAlpha = 0.0;
  result.effectsColor = u_foamColor;
  result.effectsAlpha = 0.0;

  vec2 streamUv = (worldUv - u_ninjaOneStreamOrigin) / u_ninjaOneStreamSpan;
  float registered = insideUnitSquare(streamUv) * u_closeAssetsReady;
  if (registered < 0.5) {
    return result;
  }

  vec4 encoded = sampleNinjaOneRegionalField(streamUv);
  float coverage = encoded.r;
  float mask = smoother(0.02, 0.58, coverage) * registered;
  if (mask <= 0.001) {
    return result;
  }

  // Occupied field texels have R=255. At a linearly filtered bank both R and
  // A attenuate by the same amount, so their ratio recovers the authored style
  // instead of turning every antialiased stream edge into a false tarn.
  float style = saturate(encoded.a / max(coverage, 1.0 / 255.0));
  float tarn = ninjaOneStyleBand(style, 32.0 / 255.0, 0.055);
  float stream = ninjaOneStyleBand(style, 96.0 / 255.0, 0.07);
  float turbulence = ninjaOneStyleBand(style, 120.0 / 255.0, 0.055);
  float lip = ninjaOneStyleBand(style, 148.0 / 255.0, 0.055);
  float waterfall = ninjaOneStyleBand(style, 192.0 / 255.0, 0.065);
  float impact = ninjaOneStyleBand(style, 224.0 / 255.0, 0.055);
  float coast = ninjaOneStyleBand(style, 252.0 / 255.0, 0.035);
  float channel = saturate(stream + turbulence);

  // G/B are stored on occupied texels and linearly attenuate with R at the
  // bank. Divide by coverage before decoding so filtered edge pixels preserve
  // the same local vector instead of bending toward the zero-filled exterior.
  vec2 encodedFlow = encoded.gb / max(coverage, 1.0 / 255.0);
  vec2 decodedFlow = (encodedFlow - vec2(128.0 / 255.0)) * (255.0 / 127.0);
  float flowLength = length(decodedFlow);
  vec2 flow = flowLength > 0.035
    ? decodedFlow / flowLength
    : vec2(0.0);
  // Phase/material coordinates stay in the canonical 1440 x 1080 artboard,
  // so a detail/fallback cohort swap changes sampling resolution, not phase.
  vec2 streamPixels = streamUv * u_ninjaOneStreamArtboardDimensions;
  float time = u_time * u_motion;

  // Two-phase flow mapping bounds local displacement and crossfades every
  // reset. Both crest phase and material UVs are advected by the decoded
  // per-pixel vector; there is no global transport axis or in-place flicker.
  // At the half-cycle, phase A is the continuous sample and phase B resets;
  // at the full-cycle, phase B is continuous while phase A resets. Mixing A
  // into B in that order prevents the reset from becoming a visible flash.
  // Every registered water style shares one transport clock. Driving the
  // body clock from the discrete style bands made neighboring stream,
  // turbulence, lip, and impact texels visibly slide as separate segments.
  // Local waterfall energy belongs in the effects layer below, not in the
  // base material phase.
  float flowProgress = time * 0.2;
  float flowPhaseA = fract(flowProgress);
  float flowPhaseB = fract(flowProgress + 0.5);
  float flowPhaseBlend = abs(flowPhaseA * 2.0 - 1.0);
  float phaseAdvance = mix(0.22, 0.055, tarn);
  vec2 phaseBaseUv = streamPixels * 0.021;
  vec2 primaryPhaseUvA = phaseBaseUv - flow * flowPhaseA * phaseAdvance;
  vec2 primaryPhaseUvB = phaseBaseUv - flow * flowPhaseB * phaseAdvance;
  vec2 secondaryPhaseOffset = vec2(0.37, 0.53);
  float primaryTravelSignal = mix(
    heightSample(u_microHeight, primaryPhaseUvA),
    heightSample(u_microHeight, primaryPhaseUvB),
    flowPhaseBlend
  );
  float secondaryTravelSignal = mix(
    heightSample(u_microHeight, primaryPhaseUvA + secondaryPhaseOffset),
    heightSample(u_microHeight, primaryPhaseUvB + secondaryPhaseOffset),
    flowPhaseBlend
  );

  vec2 tarnCenterUv = vec2(606.0 / 1440.0, 616.0 / 1080.0);
  vec2 tarnDeltaPixels =
    (streamUv - tarnCenterUv) * u_ninjaOneStreamArtboardDimensions;
  float tarnRadius = length(tarnDeltaPixels);
  float tarnAngle = atan(tarnDeltaPixels.y, tarnDeltaPixels.x);
  float tarnPhase =
    tarnRadius * 0.41
    - time * 0.28
    + sin(tarnAngle * 3.0) * 0.22;
  float primaryPhase = mix(
    (primaryTravelSignal - 0.5) * 6.2831853,
    tarnPhase,
    tarn
  );
  float secondaryPhase = mix(
    (secondaryTravelSignal - 0.5) * 6.2831853,
    tarnPhase * 0.71 + 1.7,
    tarn
  );

  float flowScale =
    0.00031
    + turbulence * 0.00003
    + waterfall * 0.00014
    + coast * 0.00004;
  // Keep the base material displacement continuous across style boundaries.
  // The decoded flow vector still bends with the authored topology, while
  // foam/falls can accelerate independently without cutting the river body
  // into visible moving regions.
  float materialAdvance = mix(0.014, 0.0035, tarn);
  vec2 materialBaseUv = vec2(0.47, 0.53) + streamPixels * flowScale;
  vec2 flowAlignedUv = fract(
    materialBaseUv - flow * flowPhaseA * materialAdvance
  );
  vec2 offsetFlowUv = fract(
    materialBaseUv - flow * flowPhaseB * materialAdvance
  );
  float primarySurfaceMix = flowPhaseBlend;
  vec2 tarnWorldCenter =
    u_ninjaOneStreamOrigin + tarnCenterUv * u_ninjaOneStreamSpan;
  float streamShelter =
    0.62
    - waterfall * 0.48
    - lip * 0.24
    + tarn * 0.3
    + coast * 0.08;
  // Registered material UVs travel primarily along the decoded local field.
  // A restrained share of the open-water time term retains the same moving
  // crest and micro-normal language as the ocean without overpowering the
  // downhill stream direction. Tarn motion remains radial via tarnPhase.
  OpenWaterSample primaryOceanSurface = sampleWaterBodyAtTime(
    worldUv,
    flowAlignedUv,
    saturate(streamShelter),
    tarnWorldCenter,
    1450.0,
    tarn * 0.32,
    0.025 + tarn * 0.055,
    time * 0.16
  );
  OpenWaterSample offsetOceanSurface = sampleWaterBodyAtTime(
    worldUv,
    offsetFlowUv,
    saturate(streamShelter),
    tarnWorldCenter,
    1450.0,
    tarn * 0.32,
    0.025 + tarn * 0.055,
    time * 0.16
  );
  OpenWaterSample oceanSurface = blendWaterSamples(
    primaryOceanSurface,
    offsetOceanSurface,
    primarySurfaceMix
  );

  float maskLeft = sampleNinjaOneRegionalField(
    streamUv - vec2(u_ninjaOneStreamTexel.x, 0.0)
  ).r;
  float maskRight = sampleNinjaOneRegionalField(
    streamUv + vec2(u_ninjaOneStreamTexel.x, 0.0)
  ).r;
  float maskUp = sampleNinjaOneRegionalField(
    streamUv - vec2(0.0, u_ninjaOneStreamTexel.y)
  ).r;
  float maskDown = sampleNinjaOneRegionalField(
    streamUv + vec2(0.0, u_ninjaOneStreamTexel.y)
  ).r;
  float bankEdge = saturate(
    length(vec2(maskRight - maskLeft, maskDown - maskUp)) * 2.35
  );

  float primaryBreakup = heightSample(
    u_microHeight,
    flowAlignedUv * vec2(4.2, 6.8)
  );
  float offsetBreakup = heightSample(
    u_microHeight,
    offsetFlowUv * vec2(4.2, 6.8)
  );
  float foamBreakup = mix(
    primaryBreakup,
    offsetBreakup,
    primarySurfaceMix
  );
  float travelingCrest = smoother(
    0.62,
    0.93,
    sin(primaryPhase) * 0.5 + 0.5
  ) * mix(0.54, 1.0, foamBreakup);
  float offsetCrest = smoother(
    0.67,
    0.94,
    sin(secondaryPhase) * 0.5 + 0.5
  );
  float travelingTrough = smoother(
    0.68,
    0.94,
    sin(primaryPhase - 1.86) * 0.5 + 0.5
  );
  float tarnCrest = tarn * smoother(
    0.68,
    0.94,
    sin(tarnPhase) * 0.5 + 0.5
  );

  // The style field separates each waterfall stage. The lip accelerates into
  // a brighter narrow crest, the fall becomes a vertically traveling sheet,
  // the registered impact mask owns base foam and restrained mist, and the
  // next downstream style retains turbulence without widening the channel.
  float lipAcceleration = lip * (
    0.34 + travelingCrest * 0.66
  );
  float fallFilament = smoother(
    0.48,
    0.9,
    secondaryTravelSignal
  );
  float fallingSheet = waterfall * (
    0.26
      + travelingCrest * 0.48
      + fallFilament * offsetCrest * 0.34
  );
  float impactFoam = impact * (
    0.5
      + travelingCrest * 0.3
      + offsetCrest * 0.36
  );
  float downstreamTurbulence = turbulence * (
    travelingCrest * 0.54
      + offsetCrest * 0.34
      + bankEdge * 0.18
  );
  float coastalFoam = coast * (
    travelingCrest * 0.18
      + offsetCrest * 0.1
      + bankEdge * 0.05
  );
  float foam = saturate(
    oceanSurface.crest * (channel * 0.16 + waterfall * 0.2)
      + bankEdge * channel * 0.15
      + travelingCrest * stream * 0.44
      + lipAcceleration * 0.42
      + fallingSheet * 0.38
      + impactFoam * 0.48
      + downstreamTurbulence * 0.72
      + coastalFoam * 0.32
      + tarnCrest * 0.06
  );
  float mistNoise = mix(
    heightSample(u_macroHeight, offsetFlowUv * vec2(2.1, 3.4)),
    heightSample(u_microHeight, flowAlignedUv * vec2(5.7, 4.6)),
    0.44
  );
  float mist = impact
    * smoother(0.44, 0.78, mistNoise)
    * (0.2 + offsetCrest * 0.2);

  vec3 streamPalette = mix(u_deepColor, u_bodyColor, 0.68);
  // The ocean material is the single water-body language for oceans, tarns,
  // streams, and falls. Registered hydrology controls direction and coverage;
  // it must not replace that material with a flat blue corridor.
  float authoredSurfaceMix = mix(
    0.88,
    0.8,
    saturate(lip + waterfall + impact)
  );
  vec3 registeredBodyColor = mix(
    streamPalette,
    oceanSurface.color,
    authoredSurfaceMix
  );
  registeredBodyColor = mix(
    registeredBodyColor,
    u_deepColor,
    travelingTrough * (channel * 0.1 + waterfall * 0.14)
  );
  registeredBodyColor = mix(
    registeredBodyColor,
    u_highlightColor,
    tarnCrest * 0.1
  );
  result.bodyColor = registeredBodyColor;

  // Foam, waterfall sheets, impact spray, and mist are a separate semantic
  // layer over the registered water body. They reuse the same field/material
  // samplers, but their volume can move independently without making the
  // channel itself translucent or revealing the baked whitewater beneath it.
  float registeredFoamVolume = saturate(
    oceanSurface.crest * (channel * 0.1 + waterfall * 0.14)
      + travelingCrest * stream * 0.26
      + lipAcceleration * 0.46
      + fallingSheet * 0.5
      + impactFoam * 0.56
      + downstreamTurbulence * 0.42
      + coastalFoam * 0.2
      + tarnCrest * 0.03
  );
  // The broader foam calculation carries the bank, turbulence, and cascade
  // detail that was previously discarded before compositing. Merge it into
  // the registered volume so the neutral water plate regains animated
  // whitewater instead of reading as stagnant dark-blue fill.
  registeredFoamVolume = max(registeredFoamVolume, foam * 0.82);
  float brokenFoamVolume = registeredFoamVolume
    * mix(0.46, 1.0, foamBreakup);
  float movingFoam = smoother(0.08, 0.38, brokenFoamVolume);
  float fallingFilaments = waterfall
    * smoother(0.3, 0.72, mix(foamBreakup, fallFilament, 0.56))
    * (0.36 + travelingCrest * 0.5);
  float impactSpray = impact
    * smoother(0.34, 0.7, mix(mistNoise, offsetCrest, 0.48))
    * (0.22 + travelingCrest * 0.28);
  float registeredEffectsAlpha = saturate(
    movingFoam * 0.78
      + fallingFilaments * 0.72
      + impactSpray * 0.58
      + mist * 0.5
  );
  result.effectsColor = mix(
    u_highlightColor,
    u_foamColor,
    saturate(0.5 + brokenFoamVolume * 0.34)
  );

  // Body coverage contains no time term, so accepted banks, rocks, and
  // shoreline geometry remain invariant. Only the effects layer changes
  // volume over time, and it remains clipped to the same registered mask.
  // Native coast masks follow authored foam around rocks and shingle. Keep
  // that interaction subordinate to the source material instead of fully
  // replacing every registered micro-edge with a bright contour.
  // The neutral terrain plate owns no whitewater. The registered body still
  // needs nearly opaque coverage so all water scales share one moving ocean
  // material, while the thin effects pass supplies foam and fall filaments.
  // Coast remains deliberately light so authored shoreline rock and shingle
  // stay dominant.
  float registeredBodyAlpha = saturate(
    tarn * 0.34
      + channel * 0.82
      + lip * 0.96
      + waterfall * 0.98
      + impact * 0.94
      + coast * 0.08
  );
  result.bodyAlpha = mask
    * u_ninjaOneHydrologyOpacity
    * registeredBodyAlpha;
  result.effectsAlpha = mask
    * u_ninjaOneHydrologyOpacity
    * registeredEffectsAlpha;
  return result;
}
`;
