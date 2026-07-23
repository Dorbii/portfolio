export const WATER_SHADER_COAST = `
struct CoastSample {
  vec3 color;
  float contactFoam;
};

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

CoastSample applyCoast(
  vec2 worldUv,
  OpenWaterSample water,
  float lagoon
) {
  vec4 geometry = texture(u_coastGeometry, worldUv);
  float rawShelf = geometry.g;
  float contact = geometry.b;
  float zoom = max(u_territoryLod, u_capitalLod);
  float shelf = pow(
    saturate(rawShelf),
    mix(0.78, 1.38, zoom)
  );
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
  vec2 tangent = vec2(-shoreNormal.y, shoreNormal.x);
  float alongShore = dot(worldUv, tangent) * 510.0;
  float approachPhase =
    (1.0 - shelf) * 15.0
    - time * (1.12 + exposure * 0.34)
    + alongShore * 0.018;
  float advancingBand = smoother(0.58, 0.94, sin(approachPhase) * 0.5 + 0.5);
  float brokenArc = smoother(
    0.24,
    0.79,
    heightSample(
      u_macroHeight,
      worldUv * vec2(5.3, 4.7) + vec2(time * 0.003, -time * 0.001)
    )
  );

  float shallowAmount =
    shelf
    * mix(0.48, 0.3, lagoon)
    * mix(1.0, 0.84, zoom);
  vec3 color = mix(water.color, u_shallowColor, shallowAmount);
  color = mix(color, u_deepColor, contact * 0.07);
  color = mix(
    color,
    u_highlightColor,
    shelf * water.crest * mix(0.055, 0.035, zoom)
  );

  float breakerBand =
    smoother(0.18, 0.42, shelf)
    * (1.0 - smoother(0.66, 0.91, shelf));
  float breakerFoam =
    breakerBand
    * advancingBand
    * brokenArc
    * mix(0.08, 0.3, exposure)
    * mix(1.0, 0.36, lagoon);

  float contactFoam =
    (
      contact
      * advancingBand
      * brokenArc
      * mix(0.08, 0.32, exposure)
      * mix(1.0, 0.42, lagoon)
    )
    + breakerFoam;
  color = mix(
    color,
    u_foamColor,
    contactFoam * mix(0.52, 0.38, zoom)
  );

  CoastSample result;
  result.color = color;
  result.contactFoam = contactFoam;
  return result;
}
`;
