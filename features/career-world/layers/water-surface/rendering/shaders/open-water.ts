export const WATER_SHADER_OPEN_WATER = `
struct OpenWaterSample {
  vec3 color;
  float height;
  float crest;
  float expression;
};

vec2 transformWaterCoordinate(
  vec2 worldUv,
  vec2 worldAnchor,
  vec2 textureOrigin,
  vec2 textureScale,
  float textureRotation
) {
  vec2 local = worldUv - worldAnchor;
  float cosine = cos(textureRotation);
  float sine = sin(textureRotation);
  vec2 rotated = vec2(
    local.x * cosine - local.y * sine,
    local.x * sine + local.y * cosine
  );
  return clamp(
    textureOrigin + rotated * textureScale,
    0.001,
    0.999
  );
}

OpenWaterSample blendWaterSamples(
  OpenWaterSample base,
  OpenWaterSample body,
  float amount
) {
  OpenWaterSample result;
  result.color = mix(base.color, body.color, amount);
  result.height = mix(base.height, body.height, amount);
  result.crest = mix(base.crest, body.crest, amount);
  result.expression = mix(
    base.expression,
    body.expression,
    amount
  );
  return result;
}

OpenWaterSample sampleWaterBody(
  vec2 worldUv,
  vec2 bodyUv,
  float shelter,
  vec2 rippleCenter,
  float rippleFrequency,
  float rippleMix,
  float tintMix
) {
  float time = u_time * u_motion;
  float territoryMix = u_territoryLod;
  float capitalMix = u_capitalLod;
  float localDetail =
    mix(0.18, 1.0, territoryMix)
    * mix(1.0, 1.28, capitalMix)
    * u_detailScale;
  float waveScale = mix(1.0, 0.54, shelter);

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

  // This displacement is animated in world space and never depends on camera
  // span or semantic LOD. Zoom therefore cannot resize or rephase the art.
  vec2 artDisplacement =
    macroGradient * 0.055
    + microGradient * 0.028;
  artDisplacement *= u_waveStrength * waveScale;
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

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 physicalUv = vec2(bodyUv.x * aspect, bodyUv.y);
  float phaseWarp =
    (macroA - 0.5) * 3.8
    + (macroB - 0.5) * 2.1;
  float longWave = sin(
    dot(physicalUv, normalize(vec2(0.92, 0.39)))
      * 62.0
      * u_waveDensity
    + time * 1.05
    + phaseWarp
  );
  float crossingWave = sin(
    dot(physicalUv, normalize(vec2(0.54, -0.84)))
      * 79.0
      * u_waveDensity
    - time * 0.68
    - phaseWarp * 0.7
  );
  float brokenWave = sin(
    dot(physicalUv, normalize(vec2(-0.18, 0.98)))
      * 117.0
      * u_waveDensity
    + time * 0.43
    + macroA * 5.2
  );
  float directionalWave =
    longWave * 0.52
    + crossingWave * 0.31
    + brokenWave * 0.17;

  vec2 rippleDelta = worldUv - rippleCenter;
  rippleDelta.x *= aspect;
  float rippleDistance = length(rippleDelta);
  float radialWave = sin(
    rippleDistance * rippleFrequency
    - time * 1.12
    + phaseWarp * 0.18
  );
  float radialCross = sin(
    rippleDistance * rippleFrequency * 1.73
    - time * 0.66
    + macroB * 2.4
  );
  float lakeWave = radialWave * 0.74 + radialCross * 0.26;
  float waveHeight = mix(
    directionalWave,
    lakeWave,
    rippleMix
  );
  waveHeight *= u_waveStrength * waveScale;

  float crest = smoother(0.56, 0.94, waveHeight * 0.5 + 0.5);
  crest *= mix(0.55, 1.0, expression);
  crest *= mix(1.0, 0.58, shelter);

  vec2 surfaceGradient =
    macroGradient * 1.7
    + microGradient
      * localDetail
      * mix(1.0, u_territoryNormalStrength, territoryMix);
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
  vec3 inlandColor = mix(
    u_shallowColor,
    u_highlightColor,
    0.18
  );
  palette = mix(palette, inlandColor, tintMix);
  palette *= lighting;

  float specularAmount =
    crest * (0.12 + territoryMix * 0.11);
  palette = mix(palette, u_highlightColor, specularAmount);

  float foamBreakup = smoother(
    0.58,
    0.84,
    heightSample(
      u_microHeight,
      microCoordinate + vec2(0.31, 0.47)
    )
  );
  float openFoam =
    crest
    * expression
    * foamBreakup
    * (1.0 - shelter)
    * (0.045 + territoryMix * 0.055);
  palette = mix(palette, u_foamColor, openFoam);
  palette = mix(palette, u_stormColor, u_weather * 0.26);

  OpenWaterSample result;
  result.color = palette;
  result.height = waveHeight;
  result.crest = crest;
  result.expression = expression;
  return result;
}

OpenWaterSample sampleOpenWater(
  vec2 worldUv,
  vec2 hydrology
) {
  OpenWaterSample result = sampleWaterBody(
    worldUv,
    worldUv,
    0.0,
    vec2(0.0),
    1.0,
    0.0,
    0.0
  );

  float basinMix = smoother(0.08, 0.92, hydrology.r);
  if (basinMix > 0.001) {
    vec2 basinUv = transformWaterCoordinate(
      worldUv,
      u_basinWorldAnchor,
      u_basinTextureOrigin,
      u_basinTextureScale,
      u_basinTextureRotation
    );
    OpenWaterSample basin = sampleWaterBody(
      worldUv,
      basinUv,
      1.0,
      u_basinWorldAnchor,
      u_basinRippleFrequency,
      u_basinRippleMix,
      u_basinTintMix
    );
    result = blendWaterSamples(result, basin, basinMix);
  }

  float lakeMix = smoother(0.08, 0.92, hydrology.g);
  if (lakeMix > 0.001) {
    vec2 lakeUv = transformWaterCoordinate(
      worldUv,
      u_lakeWorldAnchor,
      u_lakeTextureOrigin,
      u_lakeTextureScale,
      u_lakeTextureRotation
    );
    OpenWaterSample lake = sampleWaterBody(
      worldUv,
      lakeUv,
      1.0,
      u_lakeWorldAnchor,
      u_lakeRippleFrequency,
      u_lakeRippleMix,
      u_lakeTintMix
    );
    result = blendWaterSamples(result, lake, lakeMix);
  }

  return result;
}
`;
