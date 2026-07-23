export const WATER_SHADER_OPEN_WATER = `
struct OpenWaterSample {
  vec3 color;
  float height;
  float crest;
  float expression;
};

OpenWaterSample sampleOpenWater(vec2 worldUv, float lagoon) {
  float time = u_time * u_motion;
  float closeMix = u_territoryLod;
  float capitalMix = u_capitalLod;
  float localDetail =
    mix(0.18, 1.0, closeMix)
    * mix(1.0, 1.28, capitalMix)
    * u_detailScale;
  float lagoonWave = mix(1.0, 0.34, lagoon);

  vec2 crossWind = vec2(-u_wind.y, u_wind.x);
  vec2 macroCoordinate =
    worldUv * vec2(1.72, 1.34)
    + u_wind * time * 0.006
    + crossWind * time * 0.0018;
  vec2 secondCoordinate =
    worldUv * vec2(2.63, 2.18)
    - u_wind * time * 0.0038
    + crossWind * time * 0.0025;

  float macroA = heightSample(u_macroHeight, macroCoordinate);
  float macroB = heightSample(u_macroHeight, secondCoordinate + vec2(0.31, 0.17));
  float expression = smoother(0.38, 0.8, macroA * 0.62 + macroB * 0.38);

  vec2 macroGradient = heightGradient(
    u_macroHeight,
    macroCoordinate,
    vec2(1.0 / 1024.0)
  );
  vec2 microCoordinate =
    worldUv
    * mix(vec2(7.2, 6.1), vec2(12.5, 10.6), closeMix)
    * mix(1.0, 1.36, capitalMix)
    + u_wind * time * 0.018
    - crossWind * time * 0.006;
  vec2 microGradient = heightGradient(
    u_microHeight,
    microCoordinate,
    vec2(1.0 / 1024.0)
  );

  vec2 displacement =
    macroGradient * 0.052
    + microGradient * (0.012 + localDetail * 0.018);
  displacement *= u_waveStrength * lagoonWave;

  vec2 movedUv = clamp(worldUv + displacement, 0.001, 0.999);
  vec3 worldArt = texture(u_worldAlbedo, movedUv).rgb;
  vec2 closeUvA =
    movedUv * vec2(2.25, 2.05)
    + displacement * 0.42
    + vec2(0.17, 0.29);
  mat2 detailRotation = mat2(0.82, -0.57, 0.57, 0.82);
  vec2 closeUvB =
    detailRotation * (movedUv - 0.5) * 3.65
    + vec2(0.71, 0.38)
    - displacement * 0.24;
  vec3 closeArtA = texture(u_closeAlbedo, closeUvA).rgb;
  vec3 closeArtB = texture(u_closeAlbedo, closeUvB).rgb;
  vec3 closeArt = mix(closeArtA, closeArtB, 0.38);
  vec3 authored = mix(worldArt, closeArt, closeMix * 0.78);

  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 physicalUv = vec2(worldUv.x * aspect, worldUv.y);
  float phaseWarp = (macroA - 0.5) * 3.8 + (macroB - 0.5) * 2.1;
  float longWave =
    sin(dot(physicalUv, normalize(vec2(0.92, 0.39))) * 62.0 + time * 1.05 + phaseWarp);
  float crossingWave =
    sin(dot(physicalUv, normalize(vec2(0.54, -0.84))) * 79.0 - time * 0.68 - phaseWarp * 0.7);
  float brokenWave =
    sin(dot(physicalUv, normalize(vec2(-0.18, 0.98))) * 117.0 + time * 0.43 + macroA * 5.2);
  float waveHeight =
    longWave * 0.52
    + crossingWave * 0.31
    + brokenWave * 0.17;
  waveHeight *= u_waveStrength * lagoonWave;

  float crest = smoother(0.56, 0.94, waveHeight * 0.5 + 0.5);
  crest *= mix(0.55, 1.0, expression);
  crest *= mix(1.0, 0.18, lagoon);

  vec2 surfaceGradient = macroGradient * 1.7 + microGradient * localDetail;
  vec3 normal = normalize(vec3(-surfaceGradient * 4.4, 1.0));
  float light = dot(normal, normalize(u_lightDirection));
  float lighting = mix(0.88, 1.12, saturate(light * 0.5 + 0.5));

  float authoredValue = dot(authored, vec3(0.2126, 0.7152, 0.0722));
  vec3 palette = mix(u_deepColor, u_bodyColor, saturate(authoredValue * 1.52));
  palette = mix(palette, u_swellColor, expression * 0.24);
  palette = mix(palette, authored, 0.62);
  palette *= lighting;
  palette = mix(palette, u_highlightColor, crest * (0.08 + closeMix * 0.08));
  palette = mix(palette, u_stormColor, u_weather * 0.26);

  OpenWaterSample result;
  result.color = palette;
  result.height = waveHeight;
  result.crest = crest;
  result.expression = expression;
  return result;
}
`;
