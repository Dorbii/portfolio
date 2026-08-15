export const WATER_SHADER_OPEN_WATER = `
struct OpenWaterSample {
  vec3 color;
  float height;
  float crest;
  float expression;
};

// The long bands return height, world-space slope, and a phase-lagged height.
// Short chop uses height only because the authored micro-normal already carries
// the high-frequency surface detail.
vec4 sampleWaveBand(
  vec2 physicalUv,
  vec2 direction,
  float frequency,
  float amplitude,
  float temporalFrequency,
  float phaseOffset,
  float sharpness,
  float time
) {
  float spatialFrequency = frequency * u_waveDensity;
  float phase =
    dot(physicalUv, direction) * spatialFrequency
    + time * temporalFrequency
    + phaseOffset;
  float waveSine = sin(phase);
  float waveCosine = cos(phase);
  float secondSine = 2.0 * waveSine * waveCosine;
  float secondCosine =
    waveCosine * waveCosine - waveSine * waveSine;
  float shapedHeight = waveSine + secondSine * sharpness;
  float shapedDerivative =
    waveCosine + secondCosine * sharpness * 2.0;

  float laggedSine =
    waveSine * 0.913089 - waveCosine * 0.407760;
  float laggedCosine =
    waveCosine * 0.913089 + waveSine * 0.407760;
  float laggedHeight =
    laggedSine
    + 2.0 * laggedSine * laggedCosine * sharpness;

  return vec4(
    shapedHeight * amplitude,
    direction * amplitude * spatialFrequency * shapedDerivative,
    laggedHeight * amplitude
  );
}

float sampleChopBand(
  vec2 physicalUv,
  vec2 direction,
  float frequency,
  float amplitude,
  float temporalFrequency,
  float phaseOffset,
  float sharpness,
  float time
) {
  float phase =
    dot(physicalUv, direction) * frequency * u_waveDensity
    + time * temporalFrequency
    + phaseOffset;
  float waveSine = sin(phase);
  float crestBias = waveSine * waveSine * 2.0 - 1.0;
  return (waveSine + crestBias * sharpness) * amplitude;
}

OpenWaterSample sampleOpenWater(vec2 worldUv) {
  vec2 bodyUv = worldUv;
  float territoryMix = u_territoryLod;
  float capitalMix = u_capitalLod;
  float localDetail =
    mix(0.18, 1.0, territoryMix)
    * mix(1.0, 1.28, capitalMix)
    * u_detailScale;
  float time = u_time * u_motion;

  vec2 crossWind = vec2(-u_wind.y, u_wind.x);
  vec2 macroCoordinate =
    bodyUv * vec2(1.72, 1.34)
    + u_wind * time * 0.006
    + crossWind * time * 0.0018;
  vec2 secondCoordinate =
    bodyUv * vec2(2.63, 2.18)
    - u_wind * time * 0.0038
    + crossWind * time * 0.0025;

  float macroA = heightSample(u_macroHeight, macroCoordinate);
  float macroB = heightSample(
    u_macroHeight,
    secondCoordinate + vec2(0.31, 0.17)
  );
  float expression = smoother(
    0.38,
    0.8,
    macroA * 0.62 + macroB * 0.38
  );

  vec2 macroGradient = heightGradient(
    u_macroHeight,
    macroCoordinate,
    vec2(1.0 / 1024.0)
  );
  vec2 microCoordinate =
    bodyUv
    * u_microFrequency
    * u_waveDensity
    + u_wind * time * 0.018
    - crossWind * time * 0.006;
  vec2 microGradient = heightGradient(
    u_microHeight,
    microCoordinate,
    vec2(1.0 / 1024.0)
  );

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 physicalUv = vec2(bodyUv.x * aspect, bodyUv.y);
  float phaseWarp =
    (macroA - 0.5) * 3.8
    + (macroB - 0.5) * 2.1;
  float stormEnergy = mix(0.92, 1.16, u_weather);

  // Two long swells establish ocean-scale motion. A crossing wind-sea band and
  // two cheaper chop bands break the old parallel, evenly spaced appearance.
  vec4 waveField = vec4(0.0);
  waveField += sampleWaveBand(
    physicalUv,
    u_wind * 0.96 + crossWind * 0.28,
    22.0,
    0.36,
    0.44,
    phaseWarp * 0.38,
    0.18,
    time
  );
  waveField += sampleWaveBand(
    physicalUv,
    u_wind * 0.82 - crossWind * 0.57,
    34.0,
    0.24,
    0.56,
    1.7 - phaseWarp * 0.24,
    0.16,
    time
  );
  waveField += sampleWaveBand(
    physicalUv,
    u_wind * 0.58 + crossWind * 0.81,
    58.0,
    0.18 * stormEnergy,
    -0.71,
    3.1 + phaseWarp * 0.31,
    0.14,
    time
  );
  float chopHeight = sampleChopBand(
    physicalUv,
    u_wind * 0.90 - crossWind * 0.44,
    83.0,
    0.13 * stormEnergy,
    0.88,
    4.6 - phaseWarp * 0.19,
    0.12,
    time
  );
  chopHeight += sampleChopBand(
    physicalUv,
    u_wind * 0.34 + crossWind * 0.94,
    127.0,
    0.09 * stormEnergy,
    -1.16,
    0.9 + phaseWarp * 0.15,
    0.10,
    time
  );

  float waveHeight = (waveField.x + chopHeight) * u_waveStrength;
  vec2 waveSlope = waveField.yz * u_waveStrength;
  float laggedWaveHeight = waveField.w * u_waveStrength;

  // Art, analytic swell, and short texture relief share world coordinates.
  // Camera zoom can reveal detail but cannot resize or rephase the water.
  vec2 artDisplacement =
    (macroGradient * 0.055 + microGradient * 0.028)
      * u_waveStrength
    + waveSlope * 0.00032;
  vec2 authoredUv = clamp(
    bodyUv + artDisplacement * 2.0,
    0.001,
    0.999
  );

  vec3 worldArt = texture(u_worldAlbedo, authoredUv).rgb;
  vec3 directionalFine = texture(
    u_directionalAlbedo,
    authoredUv,
    -0.35
  ).rgb;
  vec3 directionalBroad = texture(
    u_directionalAlbedo,
    authoredUv,
    2.5
  ).rgb;
  vec3 lumaWeights = vec3(0.2126, 0.7152, 0.0722);
  float directionalContrast =
    dot(directionalFine, lumaWeights)
    - dot(directionalBroad, lumaWeights);
  float microFine = heightSample(u_microHeight, microCoordinate);
  float microBroad = texture(
    u_microHeight,
    microCoordinate,
    3.0
  ).r;
  float microRelief = max(0.0, microFine - microBroad);
  float territoryLineDetail =
    smoother(0.035, 0.24, microRelief)
    * territoryMix
    * u_detailScale;
  vec3 authored = clamp(
    worldArt
      + vec3(directionalContrast * territoryMix * 0.42)
      + vec3(territoryLineDetail * u_territoryLineStrength),
    0.0,
    1.0
  );

  float crest = smoother(0.55, 0.92, waveHeight * 0.5 + 0.5);
  crest *= mix(0.52, 1.0, expression);
  float slopeEnergy = smoother(0.18, 0.82, length(waveSlope) * 0.026);
  float breakingCrest = crest * mix(0.38, 1.0, slopeEnergy);

  vec2 surfaceGradient =
    macroGradient * 1.7
    + microGradient
      * localDetail
      * mix(1.0, u_territoryNormalStrength, territoryMix)
    + waveSlope * 0.0075;
  vec3 normal = normalize(vec3(-surfaceGradient * 4.4, 1.0));
  float light = dot(normal, normalize(u_lightDirection));
  float lighting = mix(
    0.88,
    1.12,
    saturate(light * 0.5 + 0.5)
  );

  float authoredValue = dot(authored, lumaWeights);
  vec3 palette = mix(
    u_deepColor,
    u_bodyColor,
    saturate(authoredValue * 1.52)
  );
  palette = mix(palette, u_swellColor, expression * 0.24);
  palette = mix(palette, authored, 0.7);
  float litSwellFace = smoother(
    0.52,
    0.86,
    waveHeight * 0.5 + 0.5
  );
  float deepTroughFace = smoother(
    0.54,
    0.88,
    -waveHeight * 0.5 + 0.5
  );
  palette = mix(
    palette,
    u_swellColor,
    litSwellFace * (0.045 + territoryMix * 0.035)
  );
  palette = mix(palette, u_deepColor, deepTroughFace * 0.035);
  palette *= lighting;

  float specularAmount =
    breakingCrest * (0.12 + territoryMix * 0.11);
  palette = mix(palette, u_highlightColor, specularAmount);

  float foamBreakup = smoother(
    0.58,
    0.84,
    heightSample(
      u_microHeight,
      microCoordinate + vec2(0.31, 0.47)
    )
  );
  float laggedCrest = smoother(
    0.57,
    0.91,
    laggedWaveHeight * 0.5 + 0.5
  );
  float immediateFoam =
    breakingCrest
    * expression
    * foamBreakup
    * (0.026 + territoryMix * 0.046);
  float trailingFoam =
    max(0.0, laggedCrest - crest * 0.46)
    * expression
    * foamBreakup
    * (0.035 + territoryMix * 0.082)
    * mix(0.82, 1.32, u_weather);
  float openFoam = saturate(immediateFoam + trailingFoam);
  palette = mix(palette, u_foamColor, openFoam);
  palette = mix(palette, u_stormColor, u_weather * 0.26);

  OpenWaterSample result;
  result.color = palette;
  result.height = waveHeight;
  result.crest = crest;
  result.expression = expression;
  return result;
}
`;
