export const WATER_SHADER_NINJAONE_STREAMS = `
struct NinjaOneStreamSample {
  vec3 color;
  float alpha;
};

float insideUnitSquare(vec2 value) {
  return step(0.0, value.x)
    * step(0.0, value.y)
    * step(value.x, 1.0)
    * step(value.y, 1.0);
}

NinjaOneStreamSample sampleNinjaOneStreams(vec2 worldUv) {
  NinjaOneStreamSample result;
  result.color = u_bodyColor;
  result.alpha = 0.0;

  vec2 streamUv = (worldUv - u_ninjaOneStreamOrigin) / u_ninjaOneStreamSpan;
  float registered = insideUnitSquare(streamUv) * u_closeAssetsReady;
  if (registered < 0.5) {
    return result;
  }

  vec4 encoded = texture(
    u_ninjaOneStreamFlow,
    clamp(streamUv, u_ninjaOneStreamTexel, 1.0 - u_ninjaOneStreamTexel)
  );
  float mask = smoother(0.035, 0.56, encoded.r) * registered;
  if (mask <= 0.001) {
    return result;
  }

  vec2 decodedFlow = (encoded.gb - vec2(128.0 / 255.0)) * (255.0 / 127.0);
  float flowLength = length(decodedFlow);
  vec2 flow = flowLength > 0.035
    ? decodedFlow / flowLength
    : normalize(vec2(0.72, 0.69));
  vec2 crossFlow = vec2(-flow.y, flow.x);
  float style = encoded.a;
  float waterfall = smoother(0.78, 0.98, style);
  float channel = smoother(0.42, 0.72, style) * (1.0 - waterfall);
  float tarn = 1.0 - smoother(0.22, 0.5, style);

  vec2 streamPixels = streamUv / u_ninjaOneStreamTexel;
  vec2 streamCenter = 0.5 / u_ninjaOneStreamTexel;
  vec2 centeredPixels = streamPixels - streamCenter;
  float along = dot(centeredPixels, flow);
  float across = dot(centeredPixels, crossFlow);
  // Every registered ravine descends toward increasing artboard Y. Use that
  // shared elevation axis as the longitudinal phase so a crest remains
  // continuous when it crosses between adjacent flow-vector regions. The
  // local vector still rotates the material across each individual channel.
  float downhillDistance = centeredPixels.y;
  float longitudinalCoordinate = mix(downhillDistance, along, tarn);
  float time = u_time * u_motion;

  // The flow field owns direction only. The surface itself is sampled through
  // the exact open-water material pipeline used by the ocean so the palette,
  // authored albedo, normal response, crests, and texture character stay one
  // visual system. The local basis rotates that material into the downhill
  // direction; translating its longitudinal axis makes it travel downstream.
  float flowScale = mix(0.00042, 0.00056, waterfall);
  float downstreamSpeed =
    mix(0.018, 0.055, channel)
    + waterfall * 0.14;
  downstreamSpeed = mix(downstreamSpeed, 0.006, tarn);
  vec2 rawFlowUv =
    vec2(0.47, 0.53)
    + vec2(across * flowScale * 0.82, longitudinalCoordinate * flowScale)
    - vec2(0.0, time * downstreamSpeed);
  vec2 flowAlignedUv = vec2(
    clamp(rawFlowUv.x, 0.04, 0.96),
    fract(rawFlowUv.y)
  );
  vec2 offsetFlowUv = vec2(
    flowAlignedUv.x,
    fract(rawFlowUv.y + 0.5)
  );
  float longitudinalEdge = min(flowAlignedUv.y, 1.0 - flowAlignedUv.y);
  float primarySurfaceMix = smoother(0.06, 0.18, longitudinalEdge);
  vec2 tarnCenterUv = vec2(735.0, 598.0) * u_ninjaOneStreamTexel;
  vec2 tarnWorldCenter =
    u_ninjaOneStreamOrigin + tarnCenterUv * u_ninjaOneStreamSpan;
  float streamShelter = mix(0.62, 0.1, waterfall);
  streamShelter = mix(streamShelter, 0.9, tarn);
  // Reuse the open-water animation clock as well as its textures, palette,
  // displacement, normals, and foam response. The flow-aligned UV supplies
  // downhill travel; this shared clock preserves the ocean's surface life.
  // The tarn remains slower because standing water should ripple rather than
  // race through the basin.
  float flowingMaterialTime = time * mix(0.62, 1.05, waterfall);
  float materialTime = mix(flowingMaterialTime, time * 0.36, tarn);
  OpenWaterSample primaryOceanSurface = sampleWaterBodyAtTime(
    worldUv,
    flowAlignedUv,
    streamShelter,
    tarnWorldCenter,
    430.0,
    tarn * 0.84,
    0.02 + tarn * 0.12,
    materialTime
  );
  OpenWaterSample offsetOceanSurface = sampleWaterBodyAtTime(
    worldUv,
    offsetFlowUv,
    streamShelter,
    tarnWorldCenter,
    430.0,
    tarn * 0.84,
    0.02 + tarn * 0.12,
    materialTime
  );
  OpenWaterSample oceanSurface = blendWaterSamples(
    offsetOceanSurface,
    primaryOceanSurface,
    primarySurfaceMix
  );

  float maskLeft = texture(
    u_ninjaOneStreamFlow,
    clamp(
      streamUv - vec2(u_ninjaOneStreamTexel.x, 0.0),
      u_ninjaOneStreamTexel,
      1.0 - u_ninjaOneStreamTexel
    )
  ).r;
  float maskRight = texture(
    u_ninjaOneStreamFlow,
    clamp(
      streamUv + vec2(u_ninjaOneStreamTexel.x, 0.0),
      u_ninjaOneStreamTexel,
      1.0 - u_ninjaOneStreamTexel
    )
  ).r;
  float maskUp = texture(
    u_ninjaOneStreamFlow,
    clamp(
      streamUv - vec2(0.0, u_ninjaOneStreamTexel.y),
      u_ninjaOneStreamTexel,
      1.0 - u_ninjaOneStreamTexel
    )
  ).r;
  float maskDown = texture(
    u_ninjaOneStreamFlow,
    clamp(
      streamUv + vec2(0.0, u_ninjaOneStreamTexel.y),
      u_ninjaOneStreamTexel,
      1.0 - u_ninjaOneStreamTexel
    )
  ).r;
  float bankEdge = saturate(
    length(vec2(maskRight - maskLeft, maskDown - maskUp)) * 2.6
  );

  vec2 flowStep = flow * u_ninjaOneStreamTexel * 3.5;
  float upstreamStyle = texture(
    u_ninjaOneStreamFlow,
    clamp(
      streamUv - flowStep,
      u_ninjaOneStreamTexel,
      1.0 - u_ninjaOneStreamTexel
    )
  ).a;
  float downstreamStyle = texture(
    u_ninjaOneStreamFlow,
    clamp(
      streamUv + flowStep,
      u_ninjaOneStreamTexel,
      1.0 - u_ninjaOneStreamTexel
    )
  ).a;
  float lipZone = waterfall
    * (1.0 - smoother(0.78, 0.98, upstreamStyle));
  float impactZone = waterfall
    * (1.0 - smoother(0.78, 0.98, downstreamStyle));

  float crest = oceanSurface.crest;
  float flowFilament = smoother(
    0.5,
    0.88,
    oceanSurface.height * 0.5 + 0.5
  ) * mix(0.5, 1.0, oceanSurface.expression);
  float fallingSheet = waterfall * smoother(
    0.46,
    0.86,
    flowFilament * 0.62
      + crest * 0.24
      + oceanSurface.expression * 0.14
  );
  float primaryFoamBreakup = smoother(
    0.5,
    0.82,
    heightSample(
      u_microHeight,
      flowAlignedUv * vec2(4.2, 6.8)
    )
  );
  float offsetFoamBreakup = smoother(
    0.5,
    0.82,
    heightSample(
      u_microHeight,
      offsetFlowUv * vec2(4.2, 6.8)
    )
  );
  float foamBreakup = mix(
    offsetFoamBreakup,
    primaryFoamBreakup,
    primarySurfaceMix
  );
  // A crest must move through space, not merely brighten in place. The along
  // phase uses one continuous high-to-low coordinate. Keeping the advected
  // breakup outside the sine prevents noise changes from reversing or locally
  // stalling the visible ribbon.
  float downhillPhase =
    downhillDistance * mix(0.11, 0.15, waterfall)
    - time * mix(4.4, 11.5, waterfall);
  float crestWave = sin(downhillPhase) * 0.5 + 0.5;
  float travelingCrest = smoother(
    0.72,
    0.94,
    crestWave
  ) * mix(0.48, 1.0, foamBreakup);
  float travelingTrough = smoother(
    0.7,
    0.94,
    sin(downhillPhase - 1.9) * 0.5 + 0.5
  );
  float foam = saturate(
    crest * mix(0.12, 0.42, waterfall)
      + bankEdge * channel * 0.18
      + fallingSheet * foamBreakup * 0.72
      + lipZone * foamBreakup * 0.4
      + impactZone * foamBreakup * 0.86
      + travelingCrest * (channel * 0.42 + waterfall * 0.78)
  );
  float primaryMistNoise = mix(
    heightSample(u_macroHeight, flowAlignedUv * vec2(2.1, 3.4)),
    heightSample(u_microHeight, flowAlignedUv * vec2(5.7, 4.6)),
    0.42
  );
  float offsetMistNoise = mix(
    heightSample(u_macroHeight, offsetFlowUv * vec2(2.1, 3.4)),
    heightSample(u_microHeight, offsetFlowUv * vec2(5.7, 4.6)),
    0.42
  );
  float mistNoise = mix(
    offsetMistNoise,
    primaryMistNoise,
    primarySurfaceMix
  );
  float mist = impactZone
    * smoother(0.48, 0.78, mistNoise);
  vec3 waterColor = oceanSurface.color;
  waterColor = mix(
    waterColor,
    u_deepColor,
    travelingTrough * (channel * 0.08 + waterfall * 0.13)
  );
  waterColor = mix(waterColor, u_foamColor, foam * 0.82);
  waterColor = mix(waterColor, u_foamColor, mist * 0.46);

  result.color = waterColor;
  // The registered terrain already owns the exact banks, rocks, and base
  // water. Keep this layer translucent so it adds motion without repainting
  // that accepted artwork or turning nearby terrain into a moving sticker.
  // Coverage is topology-owned and time-invariant. Moving highlights may
  // change color inside the registered water, but they must never make the
  // channel blink by changing its alpha from frame to frame.
  result.alpha = mask * (
    0.44
      + channel * 0.08
      + waterfall * 0.18
      + tarn * 0.06
  );
  return result;
}
`;
