export const WATER_SHADER_NINJAONE_STREAMS = `
struct NinjaOneStreamSample {
  vec3 effectsColor;
  float effectsAlpha;
  vec3 mistColor;
  float mistAlpha;
};

struct NinjaOneFieldSample {
  vec4 primary;
  vec4 auxiliary;
};

struct NinjaOneCascadeSample {
  float approach;
  float crest;
  float fall;
  float impact;
  float pool;
  float wake;
  float mist;
  float energy;
  float fallProgress;
  float fallWidth;
  float impactRadius;
  float outflowExtent;
  vec2 fallDirection;
  vec2 fallCoordinates;
  vec2 impactDelta;
  vec2 impactRadii;
  vec2 mistDelta;
  vec2 mistDrift;
  vec2 poolRadii;
  vec2 wakeCoordinates;
};

float insideUnitSquare(vec2 value) {
  return step(0.0, value.x)
    * step(0.0, value.y)
    * step(value.x, 1.0)
    * step(value.y, 1.0);
}

vec4 ninjaOneFetchPrimary0(ivec2 coordinate) {
  ivec2 dimensions = ivec2(u_ninjaOneStreamRegion0.zw);
  if (
    any(lessThan(coordinate, ivec2(0)))
    || any(greaterThanEqual(coordinate, dimensions))
  ) return vec4(0.0);
  return texelFetch(u_ninjaOneStreamFlow0, coordinate, 0);
}

vec4 ninjaOneFetchAuxiliary0(ivec2 coordinate) {
  ivec2 dimensions = ivec2(u_ninjaOneStreamRegion0.zw);
  if (
    any(lessThan(coordinate, ivec2(0)))
    || any(greaterThanEqual(coordinate, dimensions))
  ) return vec4(0.0);
  return texelFetch(
    u_ninjaOneStreamFlow0,
    coordinate + ivec2(dimensions.x, 0),
    0
  );
}

vec4 ninjaOneFetchPrimary1(ivec2 coordinate) {
  ivec2 dimensions = ivec2(u_ninjaOneStreamRegion1.zw);
  if (
    any(lessThan(coordinate, ivec2(0)))
    || any(greaterThanEqual(coordinate, dimensions))
  ) return vec4(0.0);
  return texelFetch(u_ninjaOneStreamFlow1, coordinate, 0);
}

vec4 ninjaOneFetchAuxiliary1(ivec2 coordinate) {
  ivec2 dimensions = ivec2(u_ninjaOneStreamRegion1.zw);
  if (
    any(lessThan(coordinate, ivec2(0)))
    || any(greaterThanEqual(coordinate, dimensions))
  ) return vec4(0.0);
  return texelFetch(
    u_ninjaOneStreamFlow1,
    coordinate + ivec2(dimensions.x, 0),
    0
  );
}

vec4 ninjaOneBilinear0(vec2 fullTexelCoordinate, bool auxiliary) {
  if (u_ninjaOneStreamSlotCount < 0.5) return vec4(0.0);
  vec2 local = fullTexelCoordinate - u_ninjaOneStreamRegion0.xy;
  ivec2 lower = ivec2(floor(local));
  vec2 blend = fract(local);
  vec4 top = mix(
    auxiliary ? ninjaOneFetchAuxiliary0(lower) : ninjaOneFetchPrimary0(lower),
    auxiliary
      ? ninjaOneFetchAuxiliary0(lower + ivec2(1, 0))
      : ninjaOneFetchPrimary0(lower + ivec2(1, 0)),
    blend.x
  );
  vec4 bottom = mix(
    auxiliary
      ? ninjaOneFetchAuxiliary0(lower + ivec2(0, 1))
      : ninjaOneFetchPrimary0(lower + ivec2(0, 1)),
    auxiliary
      ? ninjaOneFetchAuxiliary0(lower + ivec2(1, 1))
      : ninjaOneFetchPrimary0(lower + ivec2(1, 1)),
    blend.x
  );
  return mix(top, bottom, blend.y);
}

vec4 ninjaOneBilinear1(vec2 fullTexelCoordinate, bool auxiliary) {
  if (u_ninjaOneStreamSlotCount < 1.5) return vec4(0.0);
  vec2 local = fullTexelCoordinate - u_ninjaOneStreamRegion1.xy;
  ivec2 lower = ivec2(floor(local));
  vec2 blend = fract(local);
  vec4 top = mix(
    auxiliary ? ninjaOneFetchAuxiliary1(lower) : ninjaOneFetchPrimary1(lower),
    auxiliary
      ? ninjaOneFetchAuxiliary1(lower + ivec2(1, 0))
      : ninjaOneFetchPrimary1(lower + ivec2(1, 0)),
    blend.x
  );
  vec4 bottom = mix(
    auxiliary
      ? ninjaOneFetchAuxiliary1(lower + ivec2(0, 1))
      : ninjaOneFetchPrimary1(lower + ivec2(0, 1)),
    auxiliary
      ? ninjaOneFetchAuxiliary1(lower + ivec2(1, 1))
      : ninjaOneFetchPrimary1(lower + ivec2(1, 1)),
    blend.x
  );
  return mix(top, bottom, blend.y);
}

NinjaOneFieldSample sampleNinjaOneRegionalField(vec2 streamUv) {
  vec2 coordinate = streamUv / u_ninjaOneStreamTexel - vec2(0.5);
  NinjaOneFieldSample result;
  result.primary = ninjaOneBilinear0(coordinate, false)
    + ninjaOneBilinear1(coordinate, false);
  result.auxiliary = ninjaOneBilinear0(coordinate, true)
    + ninjaOneBilinear1(coordinate, true);
  return result;
}

vec2 decodeNinjaOneVelocity(vec4 encoded) {
  float coverage = encoded.r;
  vec2 packed = encoded.gb / max(coverage, 1.0 / 255.0);
  return (packed - vec2(128.0 / 255.0)) * (255.0 / 127.0);
}

float decodeNinjaOneScalar(float encoded, float coverage) {
  return saturate(encoded / max(coverage, 1.0 / 255.0));
}

float ninjaOneSegmentDistance(vec2 point, vec2 start, vec2 end) {
  vec2 segment = end - start;
  float progress = saturate(
    dot(point - start, segment) / max(dot(segment, segment), 0.0001)
  );
  return length(point - (start + segment * progress));
}

NinjaOneCascadeSample emptyNinjaOneCascade() {
  NinjaOneCascadeSample result;
  result.approach = 0.0;
  result.crest = 0.0;
  result.fall = 0.0;
  result.impact = 0.0;
  result.pool = 0.0;
  result.wake = 0.0;
  result.mist = 0.0;
  result.energy = 0.0;
  result.fallProgress = 0.0;
  result.fallWidth = 1.0;
  result.impactRadius = 1.0;
  result.outflowExtent = 1.0;
  result.fallDirection = vec2(0.0, 1.0);
  result.fallCoordinates = vec2(0.0);
  result.impactDelta = vec2(0.0);
  result.impactRadii = vec2(1.0);
  result.mistDelta = vec2(0.0);
  result.mistDrift = vec2(0.0, 1.0);
  result.poolRadii = vec2(1.0);
  result.wakeCoordinates = vec2(0.0);
  return result;
}

NinjaOneCascadeSample ninjaOneCascadeCandidate(
  vec2 streamUv,
  vec4 approach,
  vec4 crest,
  vec4 fall,
  vec4 impact,
  vec4 mist,
  vec4 pool
) {
  NinjaOneCascadeSample result = emptyNinjaOneCascade();
  float featureActive = step(0.001, mist.z);
  if (featureActive < 0.5) return result;

  vec2 point = streamUv * u_ninjaOneStreamArtboardDimensions;
  vec2 crestStart = crest.xy * u_ninjaOneStreamArtboardDimensions;
  vec2 crestEnd = crest.zw * u_ninjaOneStreamArtboardDimensions;
  vec2 fallDirection = normalize(fall.xy + vec2(0.0001));
  vec2 crossFall = vec2(-fallDirection.y, fallDirection.x);
  vec2 fallStart = (crestStart + crestEnd) * 0.5;
  vec2 fallDelta = point - fallStart;
  float alongFall = dot(fallDelta, fallDirection);
  float acrossFall = dot(fallDelta, crossFall);

  float approachExtent = max(approach.x, 1.0);
  float approachWidth = max(approach.y, 1.0);
  result.approach = featureActive
    * smoother(-approachExtent, -approachExtent * 0.62, alongFall)
    * (1.0 - smoother(-1.25, 0.25, alongFall))
    * (1.0 - smoother(
      approachWidth * 0.42,
      approachWidth,
      abs(acrossFall)
    ));

  result.crest = featureActive * (
    1.0 - smoother(
      max(0.7, mist.w * 0.2),
      max(1.2, mist.w * 0.55),
      ninjaOneSegmentDistance(point, crestStart, crestEnd)
    )
  );

  float fallProgress = saturate(alongFall / max(fall.z, 1.0));
  float fallEnvelope = smoother(-1.0, 0.75, alongFall)
    * (1.0 - smoother(fall.z, fall.z + 1.75, alongFall));
  float sheetOffset = sin(alongFall * 0.21) * fall.w * 0.035;
  float sheetAcross = acrossFall - sheetOffset;
  result.fall = featureActive
    * fallEnvelope
    * (1.0 - smoother(
      fall.w * mix(0.18, 0.22, fallProgress),
      fall.w * mix(0.36, 0.43, fallProgress),
      abs(sheetAcross)
    ));
  result.fallProgress = fallProgress;
  result.fallWidth = max(fall.w, 1.0);
  result.fallDirection = fallDirection;
  result.fallCoordinates = vec2(alongFall, sheetAcross);
  result.energy = smoother(12.0, 20.0, fall.z);

  vec2 impactOrigin = impact.xy * u_ninjaOneStreamArtboardDimensions;
  vec2 impactDelta = point - impactOrigin;
  vec2 impactAxes = vec2(
    dot(impactDelta, fallDirection) / max(impact.z, 1.0),
    dot(impactDelta, crossFall) / max(impact.w, 1.0)
  );
  float impactRadius = length(impactAxes);
  result.impact = featureActive * (1.0 - smoother(0.14, 0.78, impactRadius));
  result.impactRadius = impactRadius;
  result.impactDelta = impactDelta;
  result.impactRadii = impact.zw;

  vec2 poolDelta = impactDelta - fallDirection * pool.x * 0.36;
  vec2 poolAxes = vec2(
    dot(poolDelta, fallDirection) / max(pool.x, 1.0),
    dot(poolDelta, crossFall) / max(pool.y, 1.0)
  );
  result.pool = featureActive
    * pool.w
    * (1.0 - smoother(0.28, 1.0, length(poolAxes)));
  result.poolRadii = pool.xy;
  result.outflowExtent = max(pool.z, 1.0);

  float wakeAlong = dot(impactDelta, fallDirection);
  float wakeAcross = dot(impactDelta, crossFall);
  float wakeLength = max(pool.z, 1.0);
  result.wake = featureActive
    * smoother(-0.5, 1.5, wakeAlong)
    * (1.0 - smoother(wakeLength * 0.35, wakeLength, wakeAlong))
    * (1.0 - smoother(pool.y * 0.28, pool.y, abs(wakeAcross)));
  result.wakeCoordinates = vec2(
    saturate(wakeAlong / wakeLength),
    wakeAcross / max(pool.y, 1.0)
  );

  float mistRadius = max(mist.z * u_mistProfile.x * 0.64, 1.0);
  vec2 mistDrift = normalize(mist.xy + vec2(0.0001));
  vec2 mistCenter = impactOrigin + mistDrift * mistRadius * 0.04;
  result.mistDelta = point - mistCenter;
  vec2 mistCross = vec2(-mistDrift.y, mistDrift.x);
  float mistAlong = dot(result.mistDelta, mistDrift) / mistRadius;
  vec2 mistAxes = vec2(
    mistAlong,
    dot(result.mistDelta, mistCross) / max(mistRadius * 0.72, 1.0)
  );
  float mistEnvelope = 1.0 - smoother(0.08, 0.82, length(mistAxes));
  result.mist = featureActive
    * mistEnvelope * mistEnvelope
    * smoother(-0.32, 0.04, mistAlong);
  result.mistDrift = mistDrift;
  return result;
}

void mergeNinjaOneCascade(
  inout NinjaOneCascadeSample aggregate,
  NinjaOneCascadeSample candidate
) {
  float aggregateScore = max(
    max(max(aggregate.approach, aggregate.crest), max(aggregate.fall, aggregate.impact)),
    max(max(aggregate.pool, aggregate.wake), aggregate.mist * 0.18)
  );
  float candidateScore = max(
    max(max(candidate.approach, candidate.crest), max(candidate.fall, candidate.impact)),
    max(max(candidate.pool, candidate.wake), candidate.mist * 0.18)
  );
  if (candidateScore > aggregateScore) aggregate = candidate;
}

NinjaOneCascadeSample sampleNinjaOneCascades(vec2 streamUv) {
  NinjaOneCascadeSample result = emptyNinjaOneCascade();
  mergeNinjaOneCascade(result, ninjaOneCascadeCandidate(streamUv, u_ninjaOneCascadeApproach0, u_ninjaOneCascadeCrest0, u_ninjaOneCascadeFall0, u_ninjaOneCascadeImpact0, u_ninjaOneCascadeMist0, u_ninjaOneCascadePool0));
  mergeNinjaOneCascade(result, ninjaOneCascadeCandidate(streamUv, u_ninjaOneCascadeApproach1, u_ninjaOneCascadeCrest1, u_ninjaOneCascadeFall1, u_ninjaOneCascadeImpact1, u_ninjaOneCascadeMist1, u_ninjaOneCascadePool1));
  mergeNinjaOneCascade(result, ninjaOneCascadeCandidate(streamUv, u_ninjaOneCascadeApproach2, u_ninjaOneCascadeCrest2, u_ninjaOneCascadeFall2, u_ninjaOneCascadeImpact2, u_ninjaOneCascadeMist2, u_ninjaOneCascadePool2));
  mergeNinjaOneCascade(result, ninjaOneCascadeCandidate(streamUv, u_ninjaOneCascadeApproach3, u_ninjaOneCascadeCrest3, u_ninjaOneCascadeFall3, u_ninjaOneCascadeImpact3, u_ninjaOneCascadeMist3, u_ninjaOneCascadePool3));
  mergeNinjaOneCascade(result, ninjaOneCascadeCandidate(streamUv, u_ninjaOneCascadeApproach4, u_ninjaOneCascadeCrest4, u_ninjaOneCascadeFall4, u_ninjaOneCascadeImpact4, u_ninjaOneCascadeMist4, u_ninjaOneCascadePool4));
  mergeNinjaOneCascade(result, ninjaOneCascadeCandidate(streamUv, u_ninjaOneCascadeApproach5, u_ninjaOneCascadeCrest5, u_ninjaOneCascadeFall5, u_ninjaOneCascadeImpact5, u_ninjaOneCascadeMist5, u_ninjaOneCascadePool5));
  mergeNinjaOneCascade(result, ninjaOneCascadeCandidate(streamUv, u_ninjaOneCascadeApproach6, u_ninjaOneCascadeCrest6, u_ninjaOneCascadeFall6, u_ninjaOneCascadeImpact6, u_ninjaOneCascadeMist6, u_ninjaOneCascadePool6));
  mergeNinjaOneCascade(result, ninjaOneCascadeCandidate(streamUv, u_ninjaOneCascadeApproach7, u_ninjaOneCascadeCrest7, u_ninjaOneCascadeFall7, u_ninjaOneCascadeImpact7, u_ninjaOneCascadeMist7, u_ninjaOneCascadePool7));
  return result;
}

float ninjaOneAdvectedHeight(
  sampler2D source,
  vec2 materialUv,
  float progress,
  float phaseOffset,
  float travel
) {
  float phaseA = fract(progress + phaseOffset);
  float phaseB = fract(progress + phaseOffset + 0.5);
  float blend = abs(phaseA * 2.0 - 1.0);
  float sampleA = heightSample(source, materialUv - vec2(phaseA * travel, 0.0));
  float sampleB = heightSample(source, materialUv - vec2(phaseB * travel, 0.0));
  return mix(sampleA, sampleB, blend);
}

vec2 ninjaOneAdvectedGradient(
  sampler2D source,
  vec2 materialUv,
  float transport,
  float phaseOffset,
  float travel
) {
  float phaseA = fract(transport + phaseOffset);
  float phaseB = fract(transport + phaseOffset + 0.5);
  float blend = abs(phaseA * 2.0 - 1.0);
  vec2 texel = vec2(1.0 / 1024.0);
  vec2 gradientA = heightGradient(
    source,
    materialUv - vec2(phaseA * travel, 0.0),
    texel
  );
  vec2 gradientB = heightGradient(
    source,
    materialUv - vec2(phaseB * travel, 0.0),
    texel
  );
  return mix(gradientA, gradientB, blend);
}

NinjaOneStreamSample sampleNinjaOneStreams(
  vec2 worldUv,
  vec3 inheritedWaterColor
) {
  NinjaOneStreamSample result;
  result.effectsColor = u_foamColor;
  result.effectsAlpha = 0.0;
  result.mistColor = u_foamColor;
  result.mistAlpha = 0.0;

  vec2 streamUv = (worldUv - u_ninjaOneStreamOrigin) / u_ninjaOneStreamSpan;
  float registered = insideUnitSquare(streamUv) * u_closeAssetsReady;
  if (registered < 0.5) return result;

  NinjaOneFieldSample field = sampleNinjaOneRegionalField(streamUv);
  float coverage = field.primary.r;
  float registeredField = step(0.001, coverage);
  float bodyCoverage = smoother(0.035, 0.72, coverage) * registered;
  float effectsCoverage = smoother(0.18, 0.76, coverage) * registered;
  float visualDepth = decodeNinjaOneScalar(field.primary.a, coverage);
  float whitewaterPotential = mix(
    saturate(field.auxiliary.r),
    decodeNinjaOneScalar(field.auxiliary.r, coverage),
    registeredField
  );
  float obstaclePotential = mix(
    0.0,
    decodeNinjaOneScalar(field.auxiliary.g, coverage),
    registeredField
  );
  float mistPotential = mix(
    saturate(field.auxiliary.b),
    decodeNinjaOneScalar(field.auxiliary.b, coverage),
    registeredField
  );
  float cascadePotential = mix(
    saturate(field.auxiliary.a),
    decodeNinjaOneScalar(field.auxiliary.a, coverage),
    registeredField
  );

  NinjaOneCascadeSample cascade = sampleNinjaOneCascades(streamUv);
  float analyticCascadeSupport = max(
    max(cascade.crest, cascade.fall),
    max(cascade.impact, cascade.mist)
  );
  if (bodyCoverage <= 0.001 && analyticCascadeSupport <= 0.001) return result;

  vec2 velocity = coverage > 0.001
    ? decodeNinjaOneVelocity(field.primary)
    : vec2(0.0);
  float speed = length(velocity);
  vec2 flowAxis = speed > 0.015 ? velocity / speed : vec2(0.0, 1.0);
  vec2 crossAxis = vec2(-flowAxis.y, flowAxis.x);

  // Receiving pools and wakes follow the registered channel vector. Cascade
  // descriptors locate an event but do not get to invent downstream topology.
  float recoverySupport = step(
    0.001,
    max(max(cascade.impact, cascade.pool), cascade.wake)
  );
  vec2 recoveryAxis = speed > 0.015 ? flowAxis : cascade.fallDirection;
  vec2 recoveryCross = vec2(-recoveryAxis.y, recoveryAxis.x);
  vec2 recoveryPoolDelta = cascade.impactDelta
    - recoveryAxis * cascade.poolRadii.x * 0.36;
  vec2 recoveryPoolAxes = vec2(
    dot(recoveryPoolDelta, recoveryAxis) / max(cascade.poolRadii.x, 1.0),
    dot(recoveryPoolDelta, recoveryCross) / max(cascade.poolRadii.y, 1.0)
  );
  cascade.pool = recoverySupport
    * (1.0 - smoother(0.28, 1.0, length(recoveryPoolAxes)));
  float recoveryAlong = dot(cascade.impactDelta, recoveryAxis);
  float recoveryAcross = dot(cascade.impactDelta, recoveryCross);
  cascade.wake = recoverySupport
    * smoother(-0.5, 1.5, recoveryAlong)
    * (1.0 - smoother(
      cascade.outflowExtent * 0.35,
      cascade.outflowExtent,
      recoveryAlong
    ))
    * (1.0 - smoother(
      cascade.poolRadii.y * 0.28,
      cascade.poolRadii.y,
      abs(recoveryAcross)
    ));
  cascade.wakeCoordinates = vec2(
    saturate(recoveryAlong / max(cascade.outflowExtent, 1.0)),
    recoveryAcross / max(cascade.poolRadii.y, 1.0)
  );

  vec2 pixels = streamUv * u_ninjaOneStreamArtboardDimensions;
  float alongFlow = dot(pixels, flowAxis);
  float acrossFlow = dot(pixels, crossAxis);
  float time = u_time * u_motion;
  float transport = time * u_riverSurfaceProfile.x
    * mix(0.18, 1.0, smoother(0.02, 0.34, speed));

  float tarnDistance = length(
    pixels - u_ninjaOneTarnFeature.xy * u_ninjaOneStreamArtboardDimensions
  );
  float tarn = u_ninjaOneTarnFeature.w * (
    1.0 - smoother(
      u_ninjaOneTarnFeature.z * 0.72,
      u_ninjaOneTarnFeature.z,
      tarnDistance
    )
  );

  // Pool: broad low-frequency motion. Run: elongated downstream threads.
  // Riffle geometry comes from the authored effects field; noise only varies
  // its intensity downstream so it cannot invent repeated cross-channel bars.
  vec2 poolUv = vec2(
    alongFlow * 0.0085,
    acrossFlow * 0.012
  ) + vec2(0.17, 0.63);
  vec2 poolDetailUv = vec2(
    alongFlow * 0.014 + acrossFlow * 0.011,
    acrossFlow * 0.064 - alongFlow * 0.006
  ) + vec2(0.83, 0.36);
  float channelWarp = heightSample(
    u_macroHeight,
    vec2(alongFlow * 0.0045, acrossFlow * 0.0065) + vec2(0.37, 0.58)
  ) - 0.5;
  float channelShear = sin(
    alongFlow * 0.026 + channelWarp * 4.2
  );
  vec2 runUv = vec2(
    alongFlow * 0.007 + channelWarp * 0.18,
    acrossFlow * 0.035 + channelShear * 0.08
  ) + vec2(0.53, 0.21);
  vec2 runDetailUv = vec2(
    alongFlow * 0.015 + channelWarp * 0.27,
    acrossFlow * 0.11 + channelShear * 0.13
  ) + vec2(0.11, 0.74);

  float poolSignal = ninjaOneAdvectedHeight(
    u_macroHeight,
    poolUv,
    transport * 0.34,
    0.0,
    0.12 + speed * 0.12
  );
  float poolDetail = ninjaOneAdvectedHeight(
    u_microHeight,
    poolDetailUv,
    transport * 0.22,
    0.37,
    0.08 + speed * 0.1
  );
  float runSignal = ninjaOneAdvectedHeight(
    u_macroHeight,
    runUv,
    transport,
    0.23,
    0.2 + speed * 0.3
  );
  float runDetail = ninjaOneAdvectedHeight(
    u_microHeight,
    runDetailUv,
    transport * 1.34,
    0.47,
    0.18 + speed * 0.26
  );
  float materialBreakup = smoother(
    0.14,
    0.54,
    abs(runSignal - runDetail)
  );
  vec2 poolGradient = ninjaOneAdvectedGradient(
    u_microHeight,
    poolDetailUv,
    transport * 0.22,
    0.37,
    0.08 + speed * 0.1
  );
  vec2 runGradient = ninjaOneAdvectedGradient(
    u_microHeight,
    runDetailUv,
    transport * 1.34,
    0.47,
    0.18 + speed * 0.26
  );

  float velocityEnergy = smoother(0.025, 0.38, speed);
  // The offline field is normalized bank distance, not ocean depth. Its C1
  // median is about 0.17, so ocean-scale thresholds misclassified almost the
  // entire river as a pale shelf.
  float deepWater = smoother(0.055, 0.34, visualDepth);
  float poolRegime = saturate(
    tarn * 0.9 + (1.0 - velocityEnergy) * deepWater * 0.58
  );
  float runRegime = velocityEnergy * mix(1.0, 0.34, poolRegime);
  float riffleRegime = smoother(0.06, 0.36, whitewaterPotential)
    * mix(0.48, 1.0, 1.0 - deepWater)
    * (1.0 - smoother(0.24, 0.72, cascadePotential));

  float bankContact = bodyCoverage
    * (1.0 - smoother(0.045, 0.24, visualDepth));
  float intermittentBank = bankContact
    * smoother(0.42, 0.68, runSignal)
    * mix(0.3, 1.0, materialBreakup);

  // The shared water surface owns the base color. A bounded channel mix damps
  // its ocean-scale cross-wave pattern before applying downstream detail.
  float flowMaterialMix = max(
    tarn * 0.12,
    smoother(0.1, 0.24, speed)
  );
  vec3 channelBaseColor = mix(u_deepColor, u_bodyColor, 0.64);
  vec3 bodyColor = mix(
    inheritedWaterColor,
    channelBaseColor,
    flowMaterialMix
  );
  float depthTone = smoother(0.04, 0.58, visualDepth);
  bodyColor = mix(bodyColor, u_deepColor, depthTone * 0.08);
  float bankShadow = saturate(
    bankContact * u_riverInteractionProfile.y * 0.58
      + intermittentBank * u_riverInteractionProfile.y * 0.16
  );
  bodyColor = mix(
    bodyColor,
    mix(u_deepColor, u_stormColor, 0.78),
    bankShadow * 0.24
  );

  vec2 localSurfaceGradient = poolGradient * poolRegime * 0.78
    + runGradient * runRegime * 1.16;
  vec2 worldSurfaceGradient = flowAxis * localSurfaceGradient.x
    + crossAxis * localSurfaceGradient.y;
  vec3 flowNormal = normalize(vec3(
    -worldSurfaceGradient * (18.0 * u_riverSurfaceProfile.w),
    1.0
  ));
  vec3 normalizedLight = normalize(u_lightDirection);
  float surfaceLight = saturate(
    dot(flowNormal, normalizedLight) * 0.5 + 0.5
  );
  bodyColor *= mix(0.88, 1.13, surfaceLight);
  float flowSpecular = pow(
    saturate(dot(flowNormal, normalize(normalizedLight + vec3(0.0, 0.0, 1.0)))),
    16.0
  ) * saturate(poolRegime * 0.56 + runRegime * 0.82);
  bodyColor = mix(bodyColor, u_highlightColor, flowSpecular * 0.24);

  // Reproject the accepted water detail into local hydraulic coordinates.
  // Its ridges become broken transverse wavelets that travel downstream and
  // bend with the velocity field instead of remaining horizontal in world UV.
  vec2 riverArtUv = fract(vec2(
    acrossFlow * 0.021 + channelWarp * 0.18,
    alongFlow * 0.01 - transport * 0.026 + channelShear * 0.06
  ) + vec2(0.29, 0.67));
  vec3 riverArtFine = texture(u_directionalAlbedo, riverArtUv, -0.25).rgb;
  vec3 riverArtBroad = texture(u_directionalAlbedo, riverArtUv, 2.6).rgb;
  float riverArtRelief = dot(
    riverArtFine - riverArtBroad,
    vec3(0.2126, 0.7152, 0.0722)
  );
  float riffleWaveletAuthority = runRegime
    * smoother(0.04, 0.28, whitewaterPotential);
  float riverArtCrest = smoother(0.006, 0.046, riverArtRelief)
    * riffleWaveletAuthority;
  float riverArtTrough = smoother(0.006, 0.044, -riverArtRelief)
    * riffleWaveletAuthority;
  bodyColor = mix(bodyColor, u_deepColor, riverArtTrough * 0.22);
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_highlightColor, 0.38),
    riverArtCrest * 0.3
  );

  float poolDetailSigned = (poolDetail - 0.5) * 2.0 * poolRegime;
  float poolCrest = smoother(0.53, 0.78, poolDetail)
    * mix(0.48, 1.0, smoother(0.3, 0.7, poolSignal))
    * poolRegime;
  float poolGlint = smoother(0.74, 0.92, poolDetail)
    * mix(0.34, 1.0, materialBreakup)
    * poolRegime;
  float poolGroove = (1.0 - smoother(0.2, 0.46, poolDetail))
    * poolRegime;
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_highlightColor, 0.34),
    max(poolDetailSigned, 0.0) * 0.2 + poolCrest * 0.42
  );
  bodyColor = mix(
    bodyColor,
    u_deepColor,
    max(-poolDetailSigned, 0.0) * 0.14 + poolGroove * 0.18
  );
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_highlightColor, 0.68),
    poolGlint * 0.32
  );

  float runSigned = (runSignal - 0.5) * 2.0 * runRegime;
  float threadSigned = (runDetail - 0.5) * 2.0
    * runRegime
    * (1.0 - poolRegime * 0.82);
  float currentThread = smoother(0.56, 0.78, runDetail)
    * mix(0.42, 1.0, smoother(0.34, 0.72, runSignal))
    * mix(0.58, 1.0, materialBreakup)
    * runRegime;
  float currentGroove = (1.0 - smoother(0.24, 0.48, runDetail))
    * mix(0.42, 1.0, 1.0 - runSignal)
    * materialBreakup
    * runRegime
    * (1.0 - poolRegime * 0.76);
  bodyColor = mix(bodyColor, u_deepColor, max(-runSigned, 0.0) * 0.38);
  bodyColor = mix(bodyColor, u_deepColor, max(-threadSigned, 0.0) * 0.32);
  bodyColor = mix(bodyColor, u_deepColor, currentGroove * 0.28);
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_highlightColor, 0.18),
    max(runSigned, 0.0) * 0.3
  );
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_highlightColor, 0.12),
    max(threadSigned, 0.0) * 0.42
  );
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_highlightColor, 0.24),
    currentThread * 0.48
  );

  float obstacleWake = obstaclePotential
    * mix(0.42, 1.0, 1.0 - runSignal)
    * mix(0.45, 1.0, velocityEnergy);
  bodyColor = mix(bodyColor, u_deepColor, obstacleWake * 0.24);
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_highlightColor, 0.22),
    obstaclePotential * materialBreakup * 0.09
  );

  float approachCompression = cascade.approach
    * velocityEnergy
    * mix(0.5, 1.0, 1.0 - runSignal);
  bodyColor = mix(bodyColor, u_deepColor, approachCompression * 0.24);
  float receivingShadow = max(
    cascade.pool * 0.72,
    cascade.wake * (1.0 - whitewaterPotential * 0.34) * 0.46
  );
  bodyColor = mix(
    bodyColor,
    mix(u_stormColor, u_deepColor, 0.44),
    receivingShadow * mix(0.52, 0.88, cascade.energy)
  );

  float authoredRiffle = smoother(0.08, 0.46, whitewaterPotential);
  float rifflePulse = mix(0.4, 1.0, smoother(0.38, 0.74, runSignal));
  float riffleBreakup = rifflePulse
    * mix(0.54, 1.0, materialBreakup);
  float riffleFoam = authoredRiffle
    * riffleBreakup
    * riffleRegime
    * u_riverInteractionProfile.z;
  float obstacleFoam = obstaclePotential
    * smoother(0.08, 0.4, whitewaterPotential)
    * mix(0.32, 1.0, materialBreakup)
    * u_riverInteractionProfile.w;

  float cascadeSupport = max(cascadePotential, whitewaterPotential * 0.54);
  vec2 sheetUv = vec2(
    cascade.fallCoordinates.x * 0.058 - time * 0.42,
    cascade.fallCoordinates.y * 0.086
  ) + vec2(0.31, 0.47);
  float sheetNoise = heightSample(u_macroHeight, sheetUv);
  float sheetBreakup = mix(0.18, 1.0, smoother(0.34, 0.72, sheetNoise));
  float crestFoam = cascade.crest
    * cascadeSupport
    * mix(0.42, 1.0, sheetBreakup)
    * u_waterfallSheetProfile.x;
  float fallFilaments = cascade.fall
    * cascadeSupport
    * sheetBreakup
    * mix(0.48, 1.0, cascade.fallProgress)
    * u_waterfallSheetProfile.z;

  vec2 impactUv = cascade.impactDelta * vec2(0.13, 0.16)
    - cascade.fallDirection * time * 0.12
    + vec2(0.67, 0.19);
  float impactNoise = heightSample(u_macroHeight, impactUv);
  float impactBreakup = mix(0.2, 1.0, smoother(0.32, 0.76, impactNoise));
  float impactFroth = cascade.impact
    * cascadeSupport
    * impactBreakup
    * (1.0 - smoother(0.42, 0.88, cascade.impactRadius))
    * u_waterfallImpactProfile.z;
  float downstreamFroth = cascade.wake
    * whitewaterPotential
    * mix(0.28, 1.0, materialBreakup)
    * (1.0 - cascade.wakeCoordinates.x * 0.58)
    * u_waterfallImpactProfile.w;

  float waterFoamAlpha = effectsCoverage * min(
    0.24,
    riffleFoam * 0.2
      + obstacleFoam * 0.24
      + downstreamFroth * 0.18
  );
  float cascadeFoamAlpha = registered * min(
    0.42,
    crestFoam * 0.3
      + fallFilaments * 0.34
      + impactFroth * 0.38
  );
  float cascadePresence = max(
    max(cascade.crest, cascade.fall),
    cascade.impact
  );
  vec3 foamColor = mix(
    mix(u_swellColor, u_foamColor, 0.58),
    mix(u_foamColor, vec3(0.93, 0.95, 0.94), 0.28),
    smoother(0.04, 0.44, cascadePresence)
  );
  float foamAlpha = u_ninjaOneHydrologyOpacity
    * max(waterFoamAlpha, cascadeFoamAlpha);

  // Corridor completion is deliberately encoded with low velocity. Requiring
  // a channel-speed signal keeps motion off the rejected triangular C1 water
  // lobe while preserving the authored tarn and true river centerlines.
  float channelMotionAuthority = smoother(0.1, 0.24, speed);
  float movingSurfaceLod = mix(
    0.48,
    1.0,
    smoother(0.12, 0.72, u_siteLod)
  );
  float surfaceVariation = saturate(
    poolRegime * (
      abs(poolDetailSigned) * 0.48
        + poolCrest * 0.3
        + poolGlint * 0.22
    )
      + runRegime * (
        abs(runSigned) * 0.34
          + abs(threadSigned) * 0.48
          + currentThread * 0.28
          + currentGroove * 0.2
          + riverArtCrest * 0.34
          + riverArtTrough * 0.2
      )
      + bankShadow * 0.16
      + obstacleWake * 0.14
  );
  float runSurfaceAlpha = channelMotionAuthority
    * min(0.94, 0.68 + surfaceVariation * 0.26);
  float tarnSurfaceAlpha = tarn
    * min(0.14, 0.035 + surfaceVariation * 0.12);
  float surfaceAlpha = u_ninjaOneHydrologyOpacity
    * bodyCoverage
    * movingSurfaceLod
    * max(runSurfaceAlpha, tarnSurfaceAlpha);

  // Source-over inside the regional sample keeps the public compositor to one
  // detail route: flow surface first, then aerated foam above it.
  float combinedEffectsAlpha = foamAlpha
    + surfaceAlpha * (1.0 - foamAlpha);
  result.effectsColor = (
    foamColor * foamAlpha
      + bodyColor * surfaceAlpha * (1.0 - foamAlpha)
  ) / max(combinedEffectsAlpha, 0.00001);
  result.effectsAlpha = combinedEffectsAlpha;

  vec2 windDirection = length(u_wind) > 0.001
    ? normalize(u_wind)
    : vec2(0.0, 1.0);
  vec2 mistDirection = normalize(cascade.mistDrift + windDirection * 0.12);
  vec2 mistUv = cascade.mistDelta * 0.07
    - mistDirection * time * 0.014;
  float mistNoise = heightSample(
    u_macroHeight,
    mistUv + vec2(0.09, 0.61)
  );
  float offlineMist = smoother(0.08, 0.36, mistPotential);
  float majorImpactMist = smoother(0.92, 1.0, cascade.energy);
  float mistBreakup = mix(0.14, 1.0, smoother(0.48, 0.78, mistNoise));
  float mistVolume = cascade.mist
    * offlineMist
    * majorImpactMist
    * mistBreakup;
  result.mistColor = mix(
    mix(u_swellColor, u_foamColor, 0.46),
    vec3(0.83, 0.86, 0.85),
    0.24
  );
  result.mistAlpha = registered
    * u_ninjaOneHydrologyOpacity
    * smoother(0.24, 0.76, u_siteLod)
    * min(0.052, mistVolume * u_mistProfile.y * 0.34);

  return result;
}
`;
