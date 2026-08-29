import { WATER_SPECULAR_GLSL } from "./specular";

export const WATER_SHADER_OPEN_WATER = `
struct OpenWaterSample {
  vec3 color;
  float height;
  float crest;
  float expression;
};

float waveEnergyHash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}

float waveEnergyNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 curve = local * local * (3.0 - 2.0 * local);
  float lower = mix(
    waveEnergyHash(cell),
    waveEnergyHash(cell + vec2(1.0, 0.0)),
    curve.x
  );
  float upper = mix(
    waveEnergyHash(cell + vec2(0.0, 1.0)),
    waveEnergyHash(cell + vec2(1.0, 1.0)),
    curve.x
  );
  return mix(lower, upper, curve.y);
}

// This is the first composable adjustment mask over the fixed painted base.
// Future distortion, colour, and detail masks can multiply or bias the same
// energy value without repainting or advecting the material underneath.
float waveEnergyMask(vec2 worldUv, float time, float frequency) {
  float accumulated = 0.0;
  float weight = 0.5;
  float weightTotal = 0.0;
  vec2 coordinate = worldUv * 2.15 * frequency;
  for (int octave = 0; octave < 4; octave++) {
    if (float(octave) >= u_energyOctaves) break;
    float speed = (0.009 + float(octave) * 0.006) * u_energyDrift;
    float angle = time * speed + float(octave) * 1.73;
    mat2 driftRotation = mat2(
      cos(angle), -sin(angle),
      sin(angle), cos(angle)
    );
    vec2 advected = driftRotation * coordinate
      + u_wind * time * speed * (1.0 + float(octave) * 0.37);
    accumulated += waveEnergyNoise(advected) * weight;
    weightTotal += weight;
    coordinate = coordinate * 2.07 + vec2(13.7, -8.9);
    weight *= 0.5;
  }
  float fbm = accumulated / max(weightTotal, 0.0001);
  float centered = clamp((fbm - 0.5) * u_energyContrast + 0.5, 0.0, 1.0);
  return smoother(0.1, 0.84, centered);
}

// A deliberately slower, lower-frequency sibling to the energy field. It is
// a colour/depth adjustment mask only: the fixed painted base is never
// replaced or advected by this layer.
float regionalColorMask(vec2 worldUv, float time, float frequency) {
  float accumulated = 0.0;
  float weight = 0.58;
  float weightTotal = 0.0;
  vec2 coordinate = worldUv * max(u_regionScale, 0.01) * frequency;
  for (int octave = 0; octave < 3; octave++) {
    float speed = (0.001 + float(octave) * 0.0006) * u_regionDrift;
    float angle = time * speed + float(octave) * 2.11;
    mat2 driftRotation = mat2(
      cos(angle), -sin(angle),
      sin(angle), cos(angle)
    );
    vec2 advected = driftRotation * coordinate
      + u_wind * time * speed * (1.0 + float(octave) * 0.29);
    accumulated += waveEnergyNoise(advected) * weight;
    weightTotal += weight;
    coordinate = coordinate * 1.93 + vec2(-9.2, 14.3);
    weight *= 0.48;
  }
  float centered = clamp(
    (accumulated / max(weightTotal, 0.0001) - 0.5) * u_regionContrast + 0.5,
    0.0,
    1.0
  );
  return smoother(0.08, 0.92, centered);
}

// Pairwise soft-max priority. The incoming system wins once its magnitude is
// clearly heavier; the symmetric tie band blends near-equal systems so phase
// crossings do not pop like z-fighting. It is intentionally stateless: the
// continuous band is the temporal hysteresis substitute in a one-pass shader.
float softDominantWave(float incumbent, float challenger) {
  float tieBand = max(u_dominanceTieBand, 0.0001);
  float challengerWeight = smoother(
    -tieBand,
    tieBand,
    abs(challenger) - abs(incumbent)
  );
  return mix(incumbent, challenger, challengerWeight);
}

// A seeded, event-scheduled clock for one water region. Gusts use explicit
// seconds-scale attack and decay ramps: tempo stays in [0.82, 1.24] (1:1.51),
// and a quiet cycle boundary has no temporal step. x = local tempo, y = rare
// larger-event envelope, z = region phase seed.
vec3 boundedChaosSchedule(vec2 region, float time) {
  float cycleDuration = 384.0;
  float cycle = floor(time / cycleDuration);
  float cycleTime = fract(time / cycleDuration) * cycleDuration;
  float gust = 0.0;
  float rare = 0.0;
  for (int eventIndex = 0; eventIndex < 6; eventIndex++) {
    float eventSeed = waveEnergyHash(region + vec2(
      float(eventIndex) * 31.73 + 2.9,
      cycle * 11.41 - 4.7
    ));
    float start = 50.0 + float(eventIndex) * 52.0 + waveEnergyHash(region + vec2(
      float(eventIndex) * 19.17,
      cycle * 7.31
    )) * 24.0;
    float attack = mix(3.8, 6.4, waveEnergyHash(region + vec2(
      float(eventIndex) * 5.81,
      cycle * 17.29
    )));
    float hold = mix(2.0, 4.0, eventSeed);
    float decay = mix(6.2, 10.8, waveEnergyHash(region + vec2(
      float(eventIndex) * 43.17 + 8.1,
      cycle * 3.29 - 5.2
    )));
    float end = start + attack + hold + decay;
    float envelope = smoother(start, start + attack, cycleTime)
      * (1.0 - smoother(end - decay, end, cycleTime));
    gust = max(gust, envelope * mix(0.18, 0.42, eventSeed));
    rare = max(rare, envelope * smoother(0.82, 0.98, eventSeed));
  }
  return vec3(0.82 + gust, rare, waveEnergyHash(region + vec2(41.7, -9.2)));
}

// All wave motion belongs to this cone. The axis drifts only at weather scale
// (about 35 minutes per oscillation); no regional input can reverse it.
vec2 directionWithinCone(vec2 axis, float deviation) {
  float angle = clamp(deviation, -0.4363323, 0.4363323); // 25 degrees.
  mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  return normalize(rotation * axis);
}

OpenWaterSample sampleOpenWater(vec2 worldUv) {
  vec2 bodyUv = worldUv;
  // This is deliberately independent of tier IDs. Camera span maps once to
  // u_zoom in the renderer, then every ocean parameter is evaluated on these
  // smooth curves. A continuous flight cannot hit a tier-specific branch.
  float zoom = u_zoom;
  float detailCurve = smoother(0.36, 0.98, zoom);
  float motionCurve = smoother(0.18, 0.98, zoom);
  float localDetail = mix(0.22, 1.32, detailCurve) * u_detailScale;
  float time = u_time * u_motion * u_motionSpeed;
  // World still has a material amount of change: T30's zero-motion calm path
  // was the cause of the owner-reported dead sea. These are floors, not an
  // abrupt far/near handoff; near remains the T31b anchor at curve == 1.
  float fieldFloor = max(
    0.42,
    0.5 * (u_worldFieldWeight + u_territoryFieldWeight)
  );
  float fieldWeight = mix(fieldFloor, 1.0, motionCurve);
  float fieldSpeed = mix(0.48, 1.0, motionCurve);
  float fieldFrequency = mix(3.15, 1.0, motionCurve);
  float fieldTime = time * fieldSpeed;
  float energyMask = mix(
    0.5,
    waveEnergyMask(bodyUv, fieldTime, fieldFrequency),
    fieldWeight
  );
  float regionMask = regionalColorMask(bodyUv, fieldTime, fieldFrequency);

  float weatherDrift = sin(time * 0.003) * 0.05236;
  vec2 prevailingFlow = directionWithinCone(u_wind, weatherDrift);
  vec2 crossWind = vec2(-prevailingFlow.y, prevailingFlow.x);
  // Close retains the director-verified T31b chaos at 1.0. The small far
  // floor keeps its broad glints from freezing without exporting close chop.
  float chaosWeight = mix(0.055, 1.0, smoother(0.58, 0.98, zoom));
  vec2 chaosRegion = floor(bodyUv * vec2(5.7, 4.1) + vec2(3.0, 7.0));
  vec3 chaosSchedule = boundedChaosSchedule(chaosRegion, time);
  // Coast shelter is a single wide, bounded curve. It never drives an
  // open-water term to zero, so it cannot draw a second water regime inside
  // the viewport; the dedicated coast pass owns the final shore contact.
  float coastDistance = texture(u_coastGeometry, bodyUv).g;
  float coastShelter = smoother(0.18, 1.0, coastDistance);
  float coastActivity = mix(1.0, 0.78, coastShelter);
  // The shore-distance field compresses directional trains as they climb the
  // shelf. This only raises close-tier energy; world remains calm-but-alive.
  float shoreApproach = smoother(0.28, 0.78, coastDistance)
    * smoother(0.35, 0.98, zoom);
  vec2 macroCoordinate =
    bodyUv * vec2(1.72, 1.34)
    - prevailingFlow * time * 0.006
    - directionWithinCone(prevailingFlow, 0.291) * time * 0.0018;
  vec2 microCoordinate =
    bodyUv * u_microFrequency * u_waveDensity
    - prevailingFlow * time * 0.018
    - directionWithinCone(prevailingFlow, -0.322) * time * 0.006;
  float macroHeight = heightSample(u_macroHeight, macroCoordinate);
  float microHeight = heightSample(u_microHeight, microCoordinate);
  float expression = smoother(0.38, 0.8, macroHeight);

  // The authored material is deterministically split offline into a wide low
  // tone field plus an encoded high-frequency residual. This is the r4
  // frequency-separation boundary: regional color may only change the low band, and
  // the residual is re-added without resampling or temporal blending.
  // The material is registered to the world. Zoom may increase treatment, but
  // must never retile or rephase the painted source: that was the bare-material
  // fibrous register visible at territory and capital spans.
  float closeDetailOctave = smoother(0.52, 0.98, zoom);
  vec2 materialBaseUv = clamp(bodyUv, vec2(0.001), vec2(0.999));
  vec2 materialSecondaryBaseUv = materialBaseUv;
  float deTileMask = 0.0;
  vec3 materialMean = vec3(0.08663, 0.24986, 0.34664);
  float deTileVarianceScale = 1.0;
  vec3 low = materialMean + (
    mix(
      texture(u_materialLow, materialBaseUv).rgb,
      texture(u_materialLow, materialSecondaryBaseUv).rgb,
      deTileMask
    ) - materialMean
  ) * deTileVarianceScale;
  vec3 lumaWeights = vec3(0.2126, 0.7152, 0.0722);
  // Residual march is a coordinate translation, never a blend between frames:
  // its edge energy therefore remains that of the painted residual. The
  // tangent comes from the local painted residual contour, so glints and
  // inter-stroke shadows roll along their own direction field.
  vec3 residualDirectionSeed = (
    mix(
      texture(u_materialResidual, materialBaseUv).rgb,
      texture(u_materialResidual, materialSecondaryBaseUv).rgb,
      deTileMask
    ) - vec3(0.5)
  ) * 2.0;
  float residualDirectionLuma = dot(residualDirectionSeed, lumaWeights);
  vec2 residualTangent = vec2(
    -dFdy(residualDirectionLuma),
    dFdx(residualDirectionLuma)
  );
  float residualTangentLength = length(residualTangent);
  vec2 localResidualTangent = residualTangentLength > 0.00001
    ? residualTangent / residualTangentLength
    : directionWithinCone(prevailingFlow, (chaosSchedule.z - 0.5) * 0.44);
  float residualDeviation = asin(clamp(
    dot(localResidualTangent, crossWind),
    -0.4226183,
    0.4226183
  ));
  vec2 residualFlowDirection = directionWithinCone(prevailingFlow, residualDeviation);
  float residualMarchSpeed = mix(
    0.0038,
    0.0116,
    waveEnergyHash(chaosRegion + vec2(13.1, -6.4))
  );
  float residualMotion = mix(0.22, 1.0, closeDetailOctave);
  float residualMarchDistance = time * residualMarchSpeed
    * chaosSchedule.x * residualMotion * coastActivity;
  vec2 residualMarchOffset = -residualFlowDirection * residualMarchDistance;
  vec3 residual = (
    mix(
      texture(
        u_materialResidual,
        clamp(materialBaseUv + residualMarchOffset, vec2(0.001), vec2(0.999))
      ).rgb,
      texture(
        u_materialResidual,
        clamp(
          materialSecondaryBaseUv + residualMarchOffset * 1.19,
          vec2(0.001),
          vec2(0.999)
        )
      ).rgb,
      deTileMask
    ) - vec3(0.5)
  ) * 2.0 * deTileVarianceScale;
  float lowValue = dot(low, lumaWeights);
  float lowCrest = smoother(0.46, 0.68, lowValue);
  float microRelief = smoother(0.48, 0.78, microHeight) * u_microRelief;
  float terrainLine = microRelief * zoom * u_territoryLineStrength;

  // The ocean uses three incommensurate, phase-warped trains rather than one
  // global oscillator: no common period can pulse the whole field together.
  // World is broad and slow; close converges on the T31b band density/travel.
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 physicalUv = vec2(bodyUv.x * aspect, bodyUv.y);
  // Screen UV is a camera-normalized coordinate, not a second material space:
  // it is used only for feature-size caps. World UV continues to own the
  // painted material, wave direction, and all far-tier carriers.
  vec2 screenUv = clamp(
    (bodyUv - u_cameraOrigin) / max(u_cameraSpan, vec2(0.00001)),
    vec2(0.0),
    vec2(1.0)
  );
  vec2 screenPhysicalUv = vec2(screenUv.x * aspect, screenUv.y);
  float closeBandWavelength = mix(0.42, 5.6, motionCurve);
  float closeBandTravel = mix(0.70, 1.55, motionCurve);
  float swellDensity = u_waveDensity * closeBandWavelength
    * (1.0 + shoreApproach * 0.42);
  float directionJitter = (chaosSchedule.z - 0.5) * 0.16 * chaosWeight;
  float regionalSpeed = mix(
    0.88,
    1.14,
    waveEnergyHash(chaosRegion + vec2(-8.2, 16.3))
  );
  float regionalPhase = waveEnergyHash(chaosRegion + vec2(24.9, 3.6))
    * 6.2831853;
  float swellTime = time * fieldSpeed
    * closeBandTravel * mix(1.0, regionalSpeed * chaosSchedule.x, chaosWeight);
  float swellAmplitude = u_swellScale * u_waveStrength
    * mix(0.30, 0.72, motionCurve) * coastActivity * fieldWeight
    * mix(0.1, 1.55, energyMask)
    * (1.0 + shoreApproach * 0.36);
  vec2 swellAFlow = directionWithinCone(prevailingFlow, 0.08 + directionJitter);
  vec2 swellBFlow = directionWithinCone(prevailingFlow, -0.34 + directionJitter);
  vec2 swellCFlow = directionWithinCone(prevailingFlow, 0.39 + directionJitter);
  float swellA = sin(
    dot(physicalUv, -swellAFlow)
      * 17.0 * swellDensity
    + swellTime * 0.76
    + (macroHeight - 0.5) * 1.61
    + regionalPhase
  );
  float swellB = sin(
    dot(physicalUv, -swellBFlow)
      * 11.73 * swellDensity
    + swellTime * 0.47
    + (microHeight - 0.5) * 2.37
    + 1.19 + regionalPhase * 0.73
  );
  float swellC = sin(
    dot(physicalUv, -swellCFlow)
      * 29.11 * swellDensity
    + swellTime * 0.93
    + (macroHeight + microHeight - 1.0) * 1.17
    + 2.71 + regionalPhase * 1.19
  );
  float dominantSwell = softDominantWave(
    swellA * (0.57 + energyMask * 0.18),
    swellB * (0.48 + energyMask * 0.27)
  );
  dominantSwell = softDominantWave(
    dominantSwell,
    swellC * (0.36 + energyMask * 0.34)
  );
  // The rare event never introduces a fourth rhythm: it only opens the crest
  // envelope on top of the same heavier-wins competition, then clamps back to
  // the painted register.
  float rareEvent = chaosSchedule.y * chaosWeight * coastActivity;
  float swell = saturate(0.5 + 0.5 * dominantSwell + rareEvent * 0.075);
  float analyticCrest = smoother(0.66 - rareEvent * 0.055, 0.94, swell);
  float waveHeight =
    (swell - 0.5) * swellAmplitude * (1.0 + rareEvent * 0.18)
    + (microHeight - 0.5) * microRelief * 0.08;
  float crest = analyticCrest
    * mix(0.52, 1.0, expression)
    * mix(0.18, 1.0, energyMask);

  // Relighting derives its normal from the moving material luminance and the
  // continuous swell field; it never resamples or blurs the painted strokes.
  vec2 luminanceGradient = vec2(dFdx(lowValue), dFdy(lowValue));
  vec2 swellGradient = vec2(dFdx(swell), dFdy(swell));
  vec2 surfaceGradient =
    luminanceGradient * u_strokeBlend * 0.92
    + swellGradient * swellAmplitude * 1.8
    + vec2(microHeight - 0.5, (microHeight - 0.5) * -0.7)
      * localDetail
      * u_territoryNormalStrength
      * 0.12;
  vec3 normal = normalize(vec3(
    -surfaceGradient,
    1.0
  ));
  float lighting = mix(
    0.9,
    1.1,
    saturate(dot(normal, normalize(u_lightDirection)) * 0.5 + 0.5)
  );

  // These low-band endpoints are measured canon-water percentile colors by
  // build-ocean-frequency-bands.mjs; they are not an unrelated sampled texel.
  vec3 regionalDark = vec3(0.044424, 0.181428, 0.274047);
  vec3 regionalLight = vec3(0.272723, 0.407542, 0.488512);
  vec3 regionalTarget = mix(regionalDark, regionalLight, regionMask);
  float regionalWeight = abs(regionMask - 0.5) * 2.0
    * u_regionStrength
    * u_regionPaletteSpread
    * fieldWeight;
  float fineDetailZoom = pow(
    saturate(zoom),
    max(u_fineDetailZoomCurve, 0.01)
  );
  float fineStroke = smoother(
    0.42,
    0.82,
    abs(microHeight - 0.5) * 1.78 + lowCrest * 0.38
  );
  float fineDetail = u_fineDetailStrength * fineDetailZoom * fineStroke;
  low = mix(low, regionalTarget, regionalWeight * 0.46);
  // Near tiers increase only the painting's residual; at far tiers the gain
  // is exactly one, preserving the native r2 material reconstruction.
  vec3 palette = low + residual * (1.0 + fineDetail * 0.88)
    + vec3(terrainLine);
  float swellFaceBand = smoother(0.54, 0.80, swell)
    * mix(0.62, 1.0, energyMask);
  float travellingRelight = swellFaceBand
    * u_relightTravelStrength
    * coastActivity
    * fieldWeight
    * 0.22
    * (1.0 + chaosWeight * (0.31 * chaosSchedule.x + 0.27 * rareEvent));
  palette = mix(palette, u_highlightColor, saturate(travellingRelight));
  // Broad light and trough bands are the primary motion carrier. Sparkle is
  // intentionally smaller and comes later as secondary material motion.
  palette *= lighting;
  // T34b: the long trough still selects where a shadow can occur, but it is
  // never painted as the shadow itself at capital/close. Screen-space facets
  // repeat at no more than 14 CSS px and the high-frequency breakup closes
  // every facet into a wave-scale island. This retains T34's compression and
  // steepening while preventing the dark lava-lamp slabs seen in live review.
  float broadTrough = 1.0 - smoother(0.24, 0.54, swell);
  float shadowFacetTier = smoother(0.34, 0.58, zoom);
  float shadowFeaturePeriodPx = 14.0;
  float shadowCarrierFrequency = max(36.0, u_resolution.x / shadowFeaturePeriodPx);
  vec2 shadowFlow = directionWithinCone(
    prevailingFlow,
    0.12 + directionJitter * 0.5
  );
  float shadowCarrier = 0.5 + 0.5 * sin(
    dot(screenPhysicalUv, -shadowFlow) * shadowCarrierFrequency
      + swellTime * 0.91
      + waveEnergyNoise(bodyUv * 8.3 + vec2(4.1, -7.7)) * 2.3
  );
  float shadowBreakupFrequency = mix(
    47.0,
    max(64.0, u_resolution.x / 10.0),
    shadowFacetTier
  );
  float shadowBreakup = waveEnergyNoise(
    screenUv * vec2(
      shadowBreakupFrequency,
      shadowBreakupFrequency * u_resolution.y / max(u_resolution.x, 1.0)
    ) + prevailingFlow * time * 0.024
  );
  float crispShadowFacet = smoother(0.62, 0.76, shadowCarrier)
    * smoother(0.48, 0.72, shadowBreakup);
  float troughShadowUnclamped = broadTrough
    * mix(1.0, crispShadowFacet, shadowFacetTier)
    * (0.52 + lowCrest * 0.48)
    * u_swellShadow
    * coastActivity
    * mix(0.35, 1.0, energyMask)
    * fieldWeight
    * 0.17
    * (1.0 + chaosWeight * (0.22 * chaosSchedule.x + 0.34 * rareEvent));
  // Per-pixel darkening is hard-capped at 8.5%; the deterministic T34b probe
  // additionally asserts that no connected dark island exceeds 0.40% of a
  // 1200x675 close/capital open-water frame.
  float troughShadow = min(0.085, troughShadowUnclamped);
  palette *= 1.0 - troughShadow;
  // Sparkle is moving wave-field specular, not an independent hash clock.
  // A lit crest facet persists only while it transits the half-vector; the
  // crest itself advects with the same cone-bound velocity as the swells.
${WATER_SPECULAR_GLSL}
  palette = mix(palette, u_highlightColor, saturate(specularGlint));
  float foamStreak = smoother(
    0.56,
    0.86,
    lowCrest * 0.74 + microRelief * 0.58
  );
  float openFoam =
    crest
    * foamStreak
    * u_oceanFoam
    * coastActivity
    * energyMask
    * fieldWeight
    * mix(0.025, 0.082, motionCurve)
    * mix(0.82, 1.2, u_weather);
  // Like the shadow facets, close/capital foam is evaluated in screen-space
  // wave strokes. The world-coordinate carrier remains below the capital
  // transition, preserving the director-verified calm far treatment.
  float foamDetailTier = smoother(0.34, 0.58, zoom);
  float windrowWorldPhase = dot(physicalUv, normalize(u_wind)) * 46.0;
  float windrowScreenPhase = dot(
    screenPhysicalUv,
    normalize(u_wind)
  ) * max(48.0, u_resolution.x / 12.0);
  float windrowPhase = 0.5 + 0.5 * sin(
    mix(windrowWorldPhase, windrowScreenPhase, foamDetailTier)
      + time * 0.18
      + waveEnergyNoise(bodyUv * 8.7) * 4.4
  );
  // T34 raises near-tier windrow occupancy to the owner sheet's foam-streak
  // register. A continuous tier multiplier keeps world calm-but-alive.
  float energeticFoamTier = mix(0.3, 1.0, motionCurve);
  float windrow = smoother(0.46, 0.78, windrowPhase)
    * energyMask
    * lowCrest
    * analyticCrest
    * u_windrowDensity
    * energeticFoamTier;
  float whitecap = smoother(
    0.46,
    0.76,
    waveEnergyNoise(mix(
      bodyUv * 17.3,
      screenUv * vec2(
        max(28.0, u_resolution.x / 15.0),
        max(28.0, u_resolution.x / 15.0) * u_resolution.y / max(u_resolution.x, 1.0)
      ),
      foamDetailTier
    ) + vec2(time * 0.012, -time * 0.009))
  )
    * energyMask
    * analyticCrest
    * smoother(0.42, 0.78, microHeight)
    * u_whitecapDensity
    * energeticFoamTier;
  float laceWorldPhase = dot(
    physicalUv,
    normalize(u_wind * 0.68 + crossWind * 0.73)
  ) * 31.0;
  float laceScreenPhase = dot(
    screenPhysicalUv,
    normalize(u_wind * 0.68 + crossWind * 0.73)
  ) * max(36.0, u_resolution.x / 17.0);
  float lacePhase = 0.5 + 0.5 * sin(
    mix(laceWorldPhase, laceScreenPhase, foamDetailTier)
      + sin(dot(physicalUv, crossWind) * 10.7 + time * 0.11) * 1.7
      + waveEnergyNoise(bodyUv * 11.1) * 3.6
  );
  float foamFragment = smoother(
    0.28,
    0.58,
    waveEnergyNoise(screenUv * vec2(
      max(44.0, u_resolution.x / 11.0),
      max(44.0, u_resolution.y / 11.0)
    ))
  );
  float foamSegment = smoother(
    0.20,
    0.54,
    0.5 + 0.5 * sin(
      dot(screenPhysicalUv, crossWind) * max(34.0, u_resolution.x / 24.0)
        + waveEnergyNoise(bodyUv * 9.7) * 3.1
    )
  );
  foamFragment *= foamSegment;
  float lace = smoother(0.48, 0.8, lacePhase)
    * smoother(0.38, 0.82, lowCrest + microRelief * 0.4)
    * energyMask
    * analyticCrest
    * u_laceFoamIntensity
    * energeticFoamTier;
  float foamPattern = softDominantWave(windrow * foamFragment, whitecap * foamFragment);
  foamPattern = softDominantWave(foamPattern, lace * foamFragment);
  float layeredFoam = max(
    0.0,
    softDominantWave(openFoam, foamPattern * u_foamPatternStrength)
  );
  // The sheet target is occupied white water, not a relative multiplier over
  // T33d. This crisp coverage curve turns the existing clustered wave-scale
  // windrow/whitecap/lace field into visible paint without filling it into
  // large soft patches. T34b's deterministic probe holds close occupancy in
  // [0.12, 0.20] at two owner-zoom analogues.
  float foamCoverage = smoother(0.02, 0.10, layeredFoam);
  vec3 paintedFoam = mix(u_foamColor, palette, 0.42);
  palette = mix(palette, paintedFoam, foamCoverage);
  palette = mix(palette, u_stormColor, u_weather * 0.26);
  // Match the expanded near-tier histogram back toward the measured coast
  // register instead of letting independent burst peaks spend unbounded light.
  // This is a contrast normalization around the painted-ocean mean, not a
  // blur: all residual and band coordinates remain untouched.
  vec3 tonalRegisterMean = vec3(0.115, 0.265, 0.355);
  float tonalRegisterScale = mix(1.0, 0.76, chaosWeight);
  palette = tonalRegisterMean + (palette - tonalRegisterMean) * tonalRegisterScale;

  OpenWaterSample result;
  result.color = palette;
  result.height = waveHeight;
  result.crest = crest;
  result.expression = expression;
  return result;
}
`;
