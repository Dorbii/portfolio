export const WATER_SHADER_NINJAONE_STREAMS = `
struct NinjaOneStreamSample {
  vec3 bodyColor;
  float bodyAlpha;
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
  float fallShadow;
  float impact;
  float pool;
  float wake;
  float mist;
  float energy;
  float fallExtent;
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
  result.fallShadow = 0.0;
  result.impact = 0.0;
  result.pool = 0.0;
  result.wake = 0.0;
  result.mist = 0.0;
  result.energy = 0.0;
  result.fallExtent = 1.0;
  result.fallProgress = 0.0;
  result.fallWidth = 1.0;
  result.impactRadius = 0.0;
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
  float approachEnvelope = smoother(
    -approachExtent,
    -approachExtent * 0.7,
    alongFall
  ) * (1.0 - smoother(-1.5, 0.5, alongFall));
  result.approach = featureActive
    * approachEnvelope
    * (1.0 - smoother(
      approachWidth * 0.45,
      approachWidth,
      abs(acrossFall)
    ));
  float fallEnvelope = smoother(-2.0, 1.0, alongFall)
    * (1.0 - smoother(fall.z, fall.z + 3.0, alongFall));
  result.crest = featureActive * (
    1.0 - smoother(
      max(0.75, mist.w * 0.28),
      max(1.25, mist.w * 0.82),
      ninjaOneSegmentDistance(point, crestStart, crestEnd)
    )
  );
  float fallProgress = saturate(alongFall / max(fall.z, 1.0));
  float sheetCenterOffset = sin(alongFall * 0.3) * fall.w * 0.08
    + sin(alongFall * 0.13 + 1.7) * fall.w * 0.04;
  float sheetAcross = acrossFall - sheetCenterOffset;
  float sheetInnerWidth = fall.w * mix(0.14, 0.22, fallProgress);
  float sheetOuterWidth = fall.w * mix(0.3, 0.46, fallProgress);
  result.fall = featureActive
    * fallEnvelope
    * (1.0 - smoother(
      sheetInnerWidth,
      sheetOuterWidth,
      abs(sheetAcross)
    ));
  float shadowAcross = acrossFall + fall.w * 0.18;
  result.fallShadow = featureActive
    * fallEnvelope
    * (1.0 - smoother(
      fall.w * 0.38,
      fall.w * 0.7,
      abs(shadowAcross)
    ));
  result.fallDirection = fallDirection;
  result.fallCoordinates = vec2(alongFall, sheetAcross);
  result.fallExtent = fall.z;
  result.fallProgress = fallProgress;
  result.fallWidth = fall.w;
  // Keep the 20px outlet and 17px secondary drop legible while suppressing the
  // 10px/7px connectors. The previous 12..28 ramp left the authored hero drop
  // at half energy before the remaining support and breakup terms were applied.
  result.energy = smoother(7.0, 20.0, fall.z);
  vec2 impactOrigin = impact.xy * u_ninjaOneStreamArtboardDimensions;
  vec2 impactDelta = point - impactOrigin;
  vec2 impactAxes = vec2(
    dot(impactDelta, fallDirection) / max(impact.z, 1.0),
    dot(impactDelta, crossFall) / max(impact.w, 1.0)
  );
  float impactDistance = length(impactAxes);
  result.impact = featureActive * (1.0 - smoother(0.24, 0.64, impactDistance));
  result.impactRadius = impactDistance;
  result.impactDelta = impactDelta;
  result.impactRadii = impact.zw;
  vec2 poolDelta = impactDelta - fallDirection * pool.x * 0.46;
  vec2 poolAxes = vec2(
    dot(poolDelta, fallDirection) / max(pool.x, 1.0),
    dot(poolDelta, crossFall) / max(pool.y, 1.0)
  );
  result.pool = featureActive
    * pool.w
    * (1.0 - smoother(0.34, 1.0, length(poolAxes)));
  result.poolRadii = pool.xy;
  result.outflowExtent = pool.z;
  float wakeAlong = dot(impactDelta, fallDirection);
  float signedWakeAcross = dot(impactDelta, crossFall);
  float wakeAcross = abs(signedWakeAcross);
  float wakeLength = max(pool.z, 1.0);
  float wakeWidth = max(pool.y, 1.0);
  result.wake = featureActive
    * smoother(-1.0, 2.0, wakeAlong)
    * (1.0 - smoother(wakeLength * 0.4, wakeLength, wakeAlong))
    * (1.0 - smoother(wakeWidth * 0.35, wakeWidth, wakeAcross));
  result.wakeCoordinates = vec2(
    saturate(wakeAlong / wakeLength),
    signedWakeAcross / wakeWidth
  );
  float mistRadius = max(mist.z * u_mistProfile.x * 0.72, 1.0);
  vec2 mistDrift = normalize(mist.xy + vec2(0.0001));
  vec2 mistCenter = impactOrigin + mistDrift * mistRadius * 0.08;
  result.mistDelta = point - mistCenter;
  vec2 mistCross = vec2(-mistDrift.y, mistDrift.x);
  float mistAlong = dot(result.mistDelta, mistDrift)
    / max(mistRadius, 1.0);
  vec2 mistAxes = vec2(
    mistAlong,
    dot(result.mistDelta, mistCross) / max(mistRadius * 0.58, 1.0)
  );
  result.mist = featureActive * (
    1.0 - smoother(0.24, 1.0, length(mistAxes))
  ) * smoother(-0.45, 0.1, mistAlong);
  result.mistDrift = mistDrift;
  return result;
}

void mergeNinjaOneCascade(
  inout NinjaOneCascadeSample aggregate,
  NinjaOneCascadeSample candidate
) {
  // Keep every stage tied to one authored event. Independently taking the
  // strongest crest, fall, pool, and mist cross-wired nearby drops into a
  // diffuse composite that had no physically readable sequence.
  float aggregateScore = max(
    max(max(aggregate.approach, aggregate.crest), max(aggregate.fall, aggregate.impact)),
    max(
      max(aggregate.pool, aggregate.wake),
      aggregate.mist * 0.35
    )
  );
  float candidateScore = max(
    max(max(candidate.approach, candidate.crest), max(candidate.fall, candidate.impact)),
    max(
      max(candidate.pool, candidate.wake),
      candidate.mist * 0.35
    )
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

vec4 ninjaOneWaterfallArtSample(vec2 artUv) {
  float bounds = insideUnitSquare(artUv);
  vec4 art = texture(u_waterfallVfx, artUv);
  art.a *= bounds;
  return art;
}

NinjaOneStreamSample sampleNinjaOneStreams(vec2 worldUv) {
  NinjaOneStreamSample result;
  result.bodyColor = u_bodyColor;
  result.bodyAlpha = 0.0;
  result.effectsColor = u_foamColor;
  result.effectsAlpha = 0.0;
  result.mistColor = u_foamColor;
  result.mistAlpha = 0.0;

  vec2 streamUv = (worldUv - u_ninjaOneStreamOrigin) / u_ninjaOneStreamSpan;
  float registered = insideUnitSquare(streamUv) * u_closeAssetsReady;
  if (registered < 0.5) return result;

  NinjaOneCascadeSample cascade = sampleNinjaOneCascades(streamUv);
  float analyticCascadeSupport = max(
    max(cascade.crest, cascade.fall),
    max(
      cascade.impact,
      cascade.mist * 0.72
    )
  );
  NinjaOneFieldSample field = sampleNinjaOneRegionalField(streamUv);
  float coverage = field.primary.r;
  float bodyCoverage = smoother(0.035, 0.64, coverage) * registered;
  float effectsCoverage = smoother(0.24, 0.82, coverage) * registered;
  if (bodyCoverage <= 0.001 && analyticCascadeSupport <= 0.001) return result;

  float visualDepth = decodeNinjaOneScalar(field.primary.a, coverage);
  float whitewaterPotential = decodeNinjaOneScalar(field.auxiliary.r, coverage);
  float obstaclePotential = decodeNinjaOneScalar(field.auxiliary.g, coverage);
  float mistPotential = decodeNinjaOneScalar(field.auxiliary.b, coverage);
  float cascadePotential = decodeNinjaOneScalar(field.auxiliary.a, coverage);
  vec2 velocity = coverage > 0.001
    ? decodeNinjaOneVelocity(field.primary)
    : vec2(0.0);
  float speed = length(velocity);
  vec2 flowAxis = speed > 0.015 ? velocity / speed : vec2(0.0, 1.0);
  vec2 crossAxis = vec2(-flowAxis.y, flowAxis.x);
  // Pool recovery belongs to the registered channel, not the projected fall
  // vector. This turns the two short diagonal B2 annotations into undertow and
  // outflow rather than two additional staircase waterfalls.
  float recoverySupport = step(
    0.001,
    max(max(cascade.impact, cascade.pool), cascade.wake)
  );
  vec2 recoveryAxis = speed > 0.015 ? flowAxis : cascade.fallDirection;
  vec2 recoveryCross = vec2(-recoveryAxis.y, recoveryAxis.x);
  vec2 recoveryPoolDelta = cascade.impactDelta
    - recoveryAxis * cascade.poolRadii.x * 0.46;
  vec2 recoveryPoolAxes = vec2(
    dot(recoveryPoolDelta, recoveryAxis) / max(cascade.poolRadii.x, 1.0),
    dot(recoveryPoolDelta, recoveryCross) / max(cascade.poolRadii.y, 1.0)
  );
  cascade.pool = recoverySupport
    * (1.0 - smoother(0.3, 1.0, length(recoveryPoolAxes)));
  float recoveryAlong = dot(cascade.impactDelta, recoveryAxis);
  float recoveryAcrossSigned = dot(cascade.impactDelta, recoveryCross);
  float recoveryAcross = abs(recoveryAcrossSigned);
  cascade.wake = recoverySupport
    * smoother(-1.0, 1.5, recoveryAlong)
    * (1.0 - smoother(
      cascade.outflowExtent * 0.45,
      cascade.outflowExtent,
      recoveryAlong
    ))
    * (1.0 - smoother(
      cascade.poolRadii.y * 0.32,
      cascade.poolRadii.y,
      recoveryAcross
    ));
  cascade.wakeCoordinates = vec2(
    saturate(recoveryAlong / max(cascade.outflowExtent, 1.0)),
    recoveryAcrossSigned / max(cascade.poolRadii.y, 1.0)
  );
  vec2 pixels = streamUv * u_ninjaOneStreamArtboardDimensions;
  float alongFlow = dot(pixels, flowAxis);
  float acrossFlow = dot(pixels, crossAxis);
  float time = u_time * u_motion;
  vec4 waterfallDecalArt = vec4(0.0);
  float waterfallDecalProgress = 0.0;
  float waterfallStagePresence = max(
    max(max(cascade.crest, cascade.fall), cascade.fallShadow),
    max(max(cascade.impact, cascade.pool), cascade.wake)
  );
  if (waterfallStagePresence > 0.001) {
    float wakeStageProgress = saturate(
      (cascade.fallCoordinates.x - cascade.fallExtent)
        / max(cascade.outflowExtent, 1.0)
    );
    waterfallDecalProgress = mix(
      cascade.fallProgress * 0.58,
      mix(0.58, 1.0, wakeStageProgress),
      step(cascade.fallExtent - 0.5, cascade.fallCoordinates.x)
    );
    float eventWidth = mix(
      cascade.fallWidth,
      cascade.poolRadii.y * 1.05,
      smoother(0.5, 0.78, waterfallDecalProgress)
    );
    float waterfallSourceCenter = mix(
      0.61,
      0.64,
      smoother(0.32, 0.74, waterfallDecalProgress)
    );
    vec2 waterfallDecalUv = vec2(
      waterfallSourceCenter
        + cascade.fallCoordinates.y / max(eventWidth * 1.78, 1.0),
      waterfallDecalProgress
    );
    float decalMotionGate = smoother(0.06, 0.92, waterfallDecalProgress);
    waterfallDecalUv += vec2(
      sin(time * 1.35 + waterfallDecalProgress * 19.0) * 0.004,
      sin(time * 1.7 + waterfallDecalUv.x * 15.0) * 0.003
    ) * decalMotionGate;
    waterfallDecalArt = ninjaOneWaterfallArtSample(waterfallDecalUv);
  }
  float waterfallOpaqueCore = smoother(0.34, 0.78, waterfallDecalArt.a);
  float waterfallMajorMist = smoother(0.88, 1.0, cascade.energy);
  float waterfallImpactMistGate = mix(
    waterfallMajorMist,
    1.0,
    waterfallOpaqueCore
  );
  float waterfallDecalAlpha = waterfallDecalArt.a
    * smoother(0.001, 0.12, waterfallStagePresence)
    * mix(
      1.0,
      waterfallImpactMistGate,
      smoother(0.5, 0.7, waterfallDecalProgress)
    );
  float waterfallSheetArtAlpha = waterfallDecalAlpha
    * max(max(cascade.crest, cascade.fall), cascade.fallShadow * 0.46)
    * (1.0 - smoother(0.56, 0.7, waterfallDecalProgress));
  float waterfallImpactArtAlpha = waterfallDecalAlpha
    * max(cascade.impact, cascade.pool * 0.48)
    * smoother(0.5, 0.62, waterfallDecalProgress)
    * (1.0 - smoother(0.74, 0.9, waterfallDecalProgress))
    * 0.42;
  float waterfallWakeArtAlpha = waterfallDecalAlpha
    * max(cascade.wake, cascade.pool * 0.22)
    * smoother(0.68, 0.8, waterfallDecalProgress)
    * mix(0.34, 1.0, whitewaterPotential);
  float waterfallArtAlpha = saturate(max(
    waterfallSheetArtAlpha,
    max(waterfallImpactArtAlpha, waterfallWakeArtAlpha)
  )) * mix(0.72, 1.0, cascade.energy);
  float waterfallArtWeight = waterfallSheetArtAlpha
    + waterfallImpactArtAlpha
    + waterfallWakeArtAlpha;
  float waterfallSheetLuma = dot(
    waterfallDecalArt.rgb,
    vec3(0.2126, 0.7152, 0.0722)
  );
  float waterfallImpactLuma = waterfallSheetLuma;
  float waterfallWakeLuma = waterfallSheetLuma;
  float waterfallSheetFoam = smoother(0.14, 0.5, waterfallSheetLuma);
  float waterfallImpactFoam = smoother(0.16, 0.56, waterfallImpactLuma);
  float waterfallWakeFoam = smoother(0.16, 0.52, waterfallWakeLuma);
  vec3 waterfallSheetColor = mix(
    mix(u_stormColor, u_swellColor, 0.58),
    waterfallDecalArt.rgb,
    0.32 + waterfallSheetFoam * 0.46
  );
  vec3 waterfallImpactColor = mix(
    mix(u_stormColor, u_swellColor, 0.42),
    waterfallDecalArt.rgb,
    0.42 + waterfallImpactFoam * 0.38
  );
  vec3 waterfallWakeColor = mix(
    u_deepColor,
    waterfallDecalArt.rgb,
    0.32 + waterfallWakeFoam * 0.34
  );
  vec3 waterfallArtColor = (
    waterfallSheetColor * waterfallSheetArtAlpha
      + waterfallImpactColor * waterfallImpactArtAlpha
      + waterfallWakeColor * waterfallWakeArtAlpha
  ) / max(waterfallArtWeight, 0.001);
  float waterfallArtLuma = dot(
    waterfallArtColor,
    vec3(0.2126, 0.7152, 0.0722)
  );
  float waterfallArtAeration = max(
    waterfallSheetArtAlpha * waterfallSheetFoam,
    max(
      waterfallImpactArtAlpha * waterfallImpactFoam,
      waterfallWakeArtAlpha * waterfallWakeFoam
    )
  );
  float waterfallArtBodyBlend = saturate(
    waterfallSheetArtAlpha * 0.68
      + waterfallImpactArtAlpha * 0.78
      + waterfallWakeArtAlpha * 0.5
  );
  float waterfallDisplayFoam = max(
    waterfallSheetFoam,
    max(waterfallImpactFoam, waterfallWakeFoam)
  );
  vec3 waterfallArtDisplayColor = mix(
    mix(
      mix(u_stormColor, u_swellColor, 0.62),
      mix(u_swellColor, u_foamColor, 0.72),
      waterfallDisplayFoam
    ),
    waterfallDecalArt.rgb,
    0.62
  );
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

  vec2 macroUv = vec2(
    alongFlow * (0.0015 + u_riverSurfaceProfile.y * 0.0015),
    acrossFlow * (0.0026 + u_riverSurfaceProfile.y * 0.003)
  ) + vec2(0.17, 0.63);
  vec2 microUv = vec2(
    alongFlow * (0.011 + u_riverSurfaceProfile.z * 0.007),
    acrossFlow * (0.027 + u_riverSurfaceProfile.z * 0.025)
  ) + vec2(0.53, 0.21);
  float macroSignal = ninjaOneAdvectedHeight(
    u_macroHeight,
    macroUv,
    transport,
    0.0,
    0.16 + speed * 0.22
  );
  // The shared micro height is a dense crossing-wave lattice. At close river
  // scale it reads as rain/hatching, so channels use a second transformed macro
  // sample for organic breakup while the ocean keeps its finer wave resource.
  float microSignal = ninjaOneAdvectedHeight(
    u_macroHeight,
    microUv,
    transport,
    0.31,
    0.22 + speed * 0.32
  );
  float materialBreakup = smoother(
    0.16,
    0.52,
    abs(macroSignal - microSignal)
  );
  float broadFlowSignal = macroSignal;
  float eventSupport = saturate(
    whitewaterPotential * 0.52
      + obstaclePotential * 0.64
      + cascadePotential * 0.82
  );
  float flowEnergy = max(
    smoother(0.02, 0.34, speed),
    eventSupport * 0.5
  );
  // Preserve the tarn's calm mass while allowing the physically authored
  // outlet events to pull a broad current through the connecting pools.
  float activeFlow = 1.0 - tarn * mix(0.72, 0.18, eventSupport);
  float runStrength = flowEnergy * activeFlow;
  float broadSignedFlow = (broadFlowSignal - 0.5) * 2.0 * runStrength;
  float broadCurrentLight = max(broadSignedFlow, 0.0);
  float broadCurrentDark = max(-broadSignedFlow, 0.0);

  float bankContact = bodyCoverage
    * (1.0 - smoother(0.08, 0.46, visualDepth));
  float bankCrevice = bodyCoverage
    * (1.0 - smoother(0.018, 0.16, visualDepth));
  float shallowShelf = bodyCoverage
    * smoother(0.045, 0.18, visualDepth)
    * (1.0 - smoother(0.22, 0.48, visualDepth));
  float intermittentBank = bankContact
    * smoother(0.28, 0.62, macroSignal)
    * mix(0.35, 1.0, materialBreakup);

  vec3 quietWater = mix(u_deepColor, u_bodyColor, 0.24);
  vec3 bodyColor = mix(
    quietWater,
    u_deepColor,
    visualDepth * u_riverInteractionProfile.x * 0.82
  );
  bodyColor = mix(
    bodyColor,
    mix(u_substrateColor, u_shallowColor, 0.34),
    shallowShelf * 0.24
  );
  float bankShadow = saturate(
    bankContact * u_riverInteractionProfile.y * 0.34
      + bankCrevice * u_riverInteractionProfile.y * 0.52
      + intermittentBank * u_riverInteractionProfile.y * 0.12
  );
  bodyColor = mix(
    bodyColor,
    mix(u_deepColor, u_stormColor, 0.76),
    bankShadow
  );
  float wetBankGlint = bankContact
    * smoother(0.48, 0.76, macroSignal)
    * mix(0.32, 1.0, materialBreakup)
    * (1.0 - tarn * 0.42);
  bodyColor = mix(
    bodyColor,
    mix(u_shallowColor, u_highlightColor, 0.26),
    wetBankGlint * 0.22
  );
  bodyColor = mix(bodyColor, u_deepColor, broadCurrentDark * 0.18);
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_highlightColor, 0.14),
    broadCurrentLight * 0.16
  );
  float microSheen = smoother(0.48, 0.72, microSignal)
    * materialBreakup
    * speed
    * eventSupport
    * 0.004;
  bodyColor = mix(bodyColor, u_highlightColor, microSheen);

  float currentRibbon = saturate((broadFlowSignal - 0.28) * 1.4)
    * flowEnergy
    * eventSupport
    * activeFlow;
  float hydraulicCompression = cascadePotential
    * speed
    * (1.0 - max(cascade.crest, cascade.impact) * 0.62);
  bodyColor = mix(bodyColor, u_deepColor, hydraulicCompression * 0.18);
  float approachCompression = cascade.approach
    * speed
    * mix(0.42, 1.0, 1.0 - macroSignal);
  bodyColor = mix(bodyColor, u_deepColor, approachCompression * 0.32);
  bodyColor = mix(
    bodyColor,
    u_swellColor,
    cascade.approach * currentRibbon * 0.26
  );
  float eventCurrent = max(cascade.approach, cascade.wake)
    * mix(0.3, 1.0, speed)
    * mix(0.38, 1.0, broadFlowSignal);
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_highlightColor, 0.18),
    eventCurrent * 0.36
  );
  bodyColor = mix(
    bodyColor,
    u_deepColor,
    max(cascade.approach, cascade.wake)
      * (1.0 - broadFlowSignal)
      * 0.16
  );
  float sheetCavity = cascade.fallShadow
    * (1.0 - smoother(0.18, 0.86, cascade.fall))
    * mix(0.62, 1.0, cascade.energy);
  bodyColor = mix(
    bodyColor,
    mix(u_stormColor, u_deepColor, 0.76),
    sheetCavity * 0.72
  );
  bodyColor = mix(
    bodyColor,
    mix(u_stormColor, u_deepColor, 0.62),
    waterfallArtAlpha * 0.18
  );
  float lipUndercut = cascade.fall
    * (1.0 - smoother(0.03, 0.16, cascade.fallProgress))
    * mix(0.58, 1.0, cascade.energy);
  float darkLip = max(cascade.crest * 0.34, lipUndercut);
  bodyColor = mix(
    bodyColor,
    mix(u_deepColor, u_stormColor, 0.58),
    darkLip * 0.78
  );
  float undertowPulse = 0.64 + 0.36 * (
    sin(cascade.wakeCoordinates.x * 13.0 - time * 2.2) * 0.5 + 0.5
  );
  float undertowCore = cascade.wake
    * (1.0 - smoother(0.12, 0.5, abs(cascade.wakeCoordinates.y)))
    * undertowPulse;
  float poolShadow = max(
    cascade.impact * 0.48,
    max(
      cascade.pool * 0.92,
      max(cascade.wake * 0.62, undertowCore * 0.72)
    )
  )
    * mix(0.56, 1.0, cascade.energy)
    * (1.0 - whitewaterPotential * 0.24);
  bodyColor = mix(
    bodyColor,
    mix(u_stormColor, u_deepColor, 0.38),
    saturate(poolShadow * 0.92)
  );
  bodyColor = mix(
    bodyColor,
    u_deepColor,
    obstaclePotential * (1.0 - whitewaterPotential * 0.58) * 0.5
  );
  float obstacleWakeLight = obstaclePotential
    * mix(0.24, 1.0, materialBreakup)
    * mix(0.46, 1.0, flowEnergy);
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_highlightColor, 0.34),
    obstacleWakeLight * 0.12
  );

  // Descriptor envelopes own the silhouette. Continuous, field-aligned value
  // variation breaks those envelopes into a veil, boil, and wake without the
  // thresholded contour islands or screen-space hatching of earlier passes.
  float organicVariation = mix(0.54, 1.0, materialBreakup);
  float turbulentImpactWater = cascade.impact
    * whitewaterPotential
    * organicVariation;
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_highlightColor, 0.18),
    turbulentImpactWater * 0.24
  );
  float fieldFoam = whitewaterPotential
    * mix(0.38, 1.0, materialBreakup)
    * mix(
      u_riverInteractionProfile.z,
      mix(0.1, 0.24, cascade.energy),
      cascadePotential
    );
  float obstacleFoam = obstaclePotential
    * whitewaterPotential
    * organicVariation
    * u_riverInteractionProfile.w
    * 0.55;

  float crestRhythm = sin(
    cascade.fallCoordinates.y * 1.35 + time * 1.8
  ) * 0.5 + 0.5;
  float movingSheetAcross = cascade.fallCoordinates.y
    + sin(cascade.fallCoordinates.x * 0.36 - time * 0.85) * 0.72
    + sin(cascade.fallCoordinates.x * 0.17 + time * 0.36) * 0.38;
  float localSheetNoise = 0.5;
  float localImpactNoise = 0.5;
  float cascadeDetailPresence = max(
    max(cascade.crest, cascade.fall),
    max(cascade.impact, cascade.wake)
  );
  if (cascadeDetailPresence > 0.001) {
    localSheetNoise = heightSample(
      u_macroHeight,
      vec2(
        movingSheetAcross * 0.12,
        cascade.fallCoordinates.x * 0.055 - time * 0.28
      ) + vec2(0.31, 0.47)
    );
    localImpactNoise = heightSample(
      u_macroHeight,
      cascade.impactDelta * vec2(0.14, 0.17)
        - cascade.fallDirection * time * 0.14
        + vec2(0.67, 0.19)
    );
  }
  float normalizedSheetAcross = cascade.fallCoordinates.y
    / max(cascade.fallWidth, 1.0);
  float sheetBreakup = smoother(0.32, 0.72, localSheetNoise);
  // Whitewater is authored into the registered regional field at build time.
  // Runtime noise only breathes that structure; it never invents parallel
  // filaments or a generic rectangular curtain.
  float registeredAeration = smoother(
    0.08,
    0.5,
    max(whitewaterPotential, waterfallArtAeration)
  );
  float sheetTexture = registeredAeration
    * mix(0.82, 1.0, sheetBreakup)
    * (1.0 - smoother(0.42, 0.7, abs(normalizedSheetAcross)));
  float sheetAeration = mix(0.68, 1.0, cascade.fallProgress);
  float sheetLaunch = mix(
    0.62,
    1.0,
    smoother(0.02, 0.3, cascade.fallProgress)
  );
  float impactRhythm = sin(
    cascade.impactDelta.x * 1.17
      + cascade.impactDelta.y * 0.73
      - time * 1.9
  ) * 0.5 + 0.5;
  float impactCrossRhythm = sin(
    cascade.impactDelta.x * 0.63
      - cascade.impactDelta.y * 1.21
      + time * 0.8
  ) * 0.5 + 0.5;
  float impactComposite = impactRhythm * 0.35
    + impactCrossRhythm * 0.25
    + localImpactNoise * 0.4;
  float impactBreakup = mix(
    0.16,
    1.0,
    pow(impactComposite, 2.0)
  );
  float impactAccent = cascade.impact
    * pow(impactComposite, 2.6)
    * mix(0.68, 1.0, cascade.energy);
  float compactImpact = cascade.impact
    * (1.0 - smoother(0.08, 0.36, cascade.impactRadius))
    * mix(0.22, 1.0, pow(localImpactNoise, 1.6))
    * mix(0.72, 1.0, cascade.energy);
  float impactShape = cascade.impact
    * waterfallArtAeration
    * mix(0.64, 1.0, impactBreakup);
  impactShape = max(
    impactShape,
    max(impactAccent * 0.58, compactImpact * 0.38)
  );
  float wakeShoulders = smoother(
    0.22,
    0.58,
    abs(cascade.wakeCoordinates.y)
  ) * (1.0 - smoother(0.78, 1.0, abs(cascade.wakeCoordinates.y)));
  float wakeRhythm = sin(
    cascade.wakeCoordinates.x * 15.0
      - abs(cascade.wakeCoordinates.y) * 4.0
      - time * 2.0
  ) * 0.5 + 0.5;
  float cascadeFoamAuthority = mix(0.6, 1.0, cascadePotential);
  float impactFoamAuthority = mix(0.52, 1.0, whitewaterPotential);
  float crestAccent = cascade.crest
    * mix(
      0.2,
      1.0,
      pow(crestRhythm * 0.44 + localSheetNoise * 0.56, 2.8)
    )
    * mix(0.72, 1.0, cascade.energy);
  float crestFlecks = cascade.crest
    * cascadeFoamAuthority
    * registeredAeration
    * mix(
      0.72,
      1.0,
      pow(crestRhythm * 0.55 + localSheetNoise * 0.45, 2.0)
    )
    * mix(0.72, 1.0, cascade.energy)
    * u_waterfallSheetProfile.w;
  crestFlecks = max(crestFlecks, crestAccent * 0.82);
  float fallFilaments = cascade.fall
    * cascadeFoamAuthority
    * mix(0.72, 1.0, cascade.energy)
    * sheetTexture
    * sheetAeration
    * sheetLaunch
    * mix(1.05, 1.45, u_waterfallSheetProfile.z);
  fallFilaments = max(
    fallFilaments * 0.52,
    waterfallSheetArtAlpha
      * waterfallSheetFoam
      * mix(0.28, 1.0, pow(localSheetNoise, 2.2))
      * 0.42
  );
  float impactFroth = impactShape
    * impactFoamAuthority
    * mix(0.78, 1.0, cascade.energy)
    * mix(0.7, 1.0, impactRhythm)
    * mix(0.9, 1.3, u_waterfallImpactProfile.z);
  impactFroth = max(
    impactFroth * 0.56,
    waterfallImpactArtAlpha * waterfallImpactFoam * 0.82
  );
  float downstreamFroth = cascade.wake
    * whitewaterPotential
    * mix(0.46, 1.0, wakeRhythm * 0.6 + localImpactNoise * 0.4)
    * mix(0.4, 1.0, wakeShoulders)
    * (1.0 - cascade.wakeCoordinates.x * 0.42)
    * u_waterfallImpactProfile.w;
  downstreamFroth = max(
    downstreamFroth * 0.62,
    waterfallWakeArtAlpha * waterfallWakeFoam * 0.68
  );
  float foamVolume = saturate(
    fieldFoam * 0.24
      + obstacleFoam * 0.42
      + crestFlecks * 1.2
      + fallFilaments * 1.15
      + impactFroth * 1.18
      + downstreamFroth * 0.65
  );
  float aeratedWater = saturate(
    crestFlecks + fallFilaments * 0.58 + impactFroth * 1.8
  );
  float analyticDrySheet = cascade.fall
    * (1.0 - smoother(0.68, 1.0, abs(normalizedSheetAcross)))
    * mix(0.38, 1.0, pow(localSheetNoise, 1.7));
  float sheetBodyPresence = analyticDrySheet
    * mix(0.72, 1.0, cascade.energy);
  bodyColor = mix(
    bodyColor,
    mix(u_stormColor, u_swellColor, 0.48),
    sheetBodyPresence * 0.62
  );
  float drySheetBody = (1.0 - bodyCoverage)
    * max(waterfallSheetArtAlpha, analyticDrySheet * 0.68)
    * registered;
  float drySheetShadow = (1.0 - bodyCoverage)
    * cascade.fallShadow
    * mix(0.74, 1.0, cascade.energy)
    * registered;
  float dryImpactBody = (1.0 - bodyCoverage)
    * waterfallImpactArtAlpha
    * registered;
  float dryPoolWetContact = (1.0 - bodyCoverage)
    * cascade.pool
    * mix(0.34, 1.0, materialBreakup)
    * registered;
  bodyColor = mix(
    bodyColor,
    mix(u_stormColor, u_deepColor, 0.82),
    saturate(drySheetShadow * 0.82 + dryImpactBody * 0.42)
  );
  bodyColor = mix(
    bodyColor,
    mix(u_stormColor, u_deepColor, 0.68),
    drySheetBody * 0.72
  );
  bodyColor = mix(
    bodyColor,
    mix(u_stormColor, u_deepColor, 0.74),
    dryPoolWetContact * 0.18
  );
  float waterfallArtPulse = 0.86 + 0.14 * (
    sin(cascade.fallProgress * 16.0 - time * 1.35) * 0.5 + 0.5
  );
  bodyColor = mix(
    bodyColor,
    waterfallArtDisplayColor * waterfallArtPulse,
    waterfallArtAlpha * 0.76
  );
  float receivingPocket = max(
    cascade.pool * 0.56,
    cascade.impact
      * (1.0 - smoother(0.18, 0.62, cascade.impactRadius))
      * 0.72
  );
  bodyColor = mix(
    bodyColor,
    mix(u_deepColor, u_stormColor, 0.28),
    receivingPocket * 0.68
  );
  float recoveryShear = cascade.wake
    * (1.0 - cascade.wakeCoordinates.x * 0.68)
    * smoother(0.28, 0.56, abs(cascade.wakeCoordinates.y))
    * (1.0 - smoother(0.7, 1.0, abs(cascade.wakeCoordinates.y)))
    * mix(0.32, 1.0, materialBreakup);
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_highlightColor, 0.12),
    recoveryShear * 0.22
  );
  bodyColor = mix(
    bodyColor,
    mix(u_deepColor, u_stormColor, 0.52),
    lipUndercut * 0.82
  );
  float waterfallCrestWhite = cascade.crest
    * waterfallSheetArtAlpha
    * mix(0.34, 1.0, waterfallSheetFoam)
    * mix(0.72, 1.0, cascade.energy);
  float waterfallImpactWhite = waterfallImpactArtAlpha
    * mix(0.24, 1.0, waterfallImpactFoam)
    * mix(0.72, 1.0, cascade.energy);
  float waterfallTexturedImpact = cascade.impact
    * smoother(0.22, 0.6, impactComposite)
    * (1.0 - smoother(0.14, 0.72, cascade.impactRadius))
    * mix(0.72, 1.0, cascade.energy);
  float impactCollar = cascade.impact
    * smoother(0.1, 0.26, cascade.impactRadius)
    * (1.0 - smoother(0.44, 0.7, cascade.impactRadius))
    * mix(0.22, 1.0, pow(impactComposite, 1.6))
    * mix(0.72, 1.0, cascade.energy);
  bodyColor = mix(
    bodyColor,
    mix(u_swellColor, u_foamColor, 0.58),
    min(
      0.68,
      waterfallCrestWhite * 0.52
        + waterfallImpactWhite * 0.24
        + crestAccent * 0.96
        + impactAccent * 0.9
        + compactImpact * 0.82
        + waterfallTexturedImpact * 0.62
        + impactCollar * 0.78
    )
  );
  float aeratedSheetVeil = cascade.fall
    * waterfallArtAeration
    * mix(0.12, 0.22, sheetBreakup)
    * mix(0.7, 1.0, cascade.energy);
  bodyColor = mix(
    bodyColor,
    mix(u_deepColor, u_swellColor, 0.48),
    aeratedSheetVeil
  );
  float analyticEffectsCoverage = saturate(
    cascade.crest * 0.9
      + cascade.fall * 0.92
      + cascade.impact * 0.86
  ) * registered;
  float effectsCompositeCoverage = max(
    effectsCoverage,
    analyticEffectsCoverage
  );
  vec3 aeratedWhite = mix(u_foamColor, u_highlightColor, 0.28);
  vec3 genericEffectsColor = mix(u_highlightColor, u_foamColor, 0.24);
  vec3 cascadeEffectsColor = mix(
    mix(u_stormColor, u_swellColor, 0.42),
    aeratedWhite,
    smoother(0.18, 0.86, aeratedWater) * 0.86
  );
  float cascadeColorPresence = max(
    max(cascade.crest, cascade.fall),
    cascade.impact
  );
  result.effectsColor = mix(
    genericEffectsColor,
    cascadeEffectsColor,
    smoother(0.02, 0.32, cascadeColorPresence)
  );
  float genericEffectsAlpha = effectsCoverage * min(
    0.48,
    fieldFoam * 0.24
      + obstacleFoam * 0.38
      + max(cascade.approach, cascade.wake) * currentRibbon * 0.18
  );
  float crestEffectsAlpha = registered * min(
    0.68,
    crestAccent * 0.78
  );
  float sheetEffectsAlpha = analyticEffectsCoverage * min(
    0.34,
    fallFilaments * 0.78
  ) * mix(1.0, 0.24, waterfallArtAlpha);
  float impactEffectsAlpha = registered * min(
    0.4,
    max(
      impactAccent * 0.34,
      max(compactImpact * 0.3, impactCollar * 0.38)
    )
  );
  float wakeEffectsAlpha = effectsCoverage * min(
    0.52,
    downstreamFroth * 0.92
  );
  result.effectsAlpha = u_ninjaOneHydrologyOpacity * max(
    genericEffectsAlpha,
    max(
      crestEffectsAlpha,
      max(sheetEffectsAlpha, max(impactEffectsAlpha, wakeEffectsAlpha))
    )
  );

  vec2 windDirection = length(u_wind) > 0.001
    ? normalize(u_wind)
    : vec2(0.0, 1.0);
  vec2 mistDirection = normalize(cascade.mistDrift + windDirection * 0.16);
  vec2 mistUv = cascade.mistDelta * 0.025
    - mistDirection * time * 0.012;
  float mistMacro = heightSample(u_macroHeight, mistUv + vec2(0.41, 0.17));
  float mistMicro = heightSample(
    u_macroHeight,
    mistUv * vec2(2.5, 2.1) + vec2(0.09, 0.61)
  );
  float mistTexture = mix(mistMacro, mistMicro, u_mistProfile.z);
  float mistBreakup = mix(0.34, 1.0, mistTexture)
    * (1.0 - smoother(0.74, 1.0, length(cascade.mistDelta)
      / max(1.0, u_mistProfile.x * 38.0)) * u_mistProfile.w);
  float majorImpactMist = smoother(0.88, 1.0, cascade.energy);
  float mistVolume = (
    mistPotential * 0.18
      + cascade.mist * u_mistProfile.y * 1.8
  )
    * majorImpactMist
    * mistBreakup;
  result.mistColor = mix(
    mix(u_foamColor, u_highlightColor, 0.2),
    vec3(0.86, 0.88, 0.84),
    0.42
  );
  float mistCompositeCoverage = max(
    bodyCoverage,
    cascade.mist * 0.9 * registered
  );
  result.mistAlpha = mistCompositeCoverage
    * u_ninjaOneHydrologyOpacity
    * smoother(0.2, 0.75, u_siteLod)
    * min(0.13, mistVolume);

  result.bodyColor = bodyColor;
  float registeredBodyOpacity = mix(
    0.56,
    0.9,
    smoother(0.035, 0.62, visualDepth)
  );
  float registeredBodyAlpha = bodyCoverage
    * u_ninjaOneHydrologyOpacity
    * registeredBodyOpacity;
  float dryLipShadowAlpha = (1.0 - bodyCoverage)
    * lipUndercut
    * u_ninjaOneHydrologyOpacity
    * 0.22;
  float drySheetBodyAlpha = u_ninjaOneHydrologyOpacity
    * min(0.5, drySheetBody * 0.72);
  float drySheetShadowAlpha = u_ninjaOneHydrologyOpacity
    * min(0.34, drySheetShadow * 0.42);
  float dryImpactBodyAlpha = u_ninjaOneHydrologyOpacity
    * min(0.34, dryImpactBody * 0.58);
  float dryPoolContactAlpha = u_ninjaOneHydrologyOpacity
    * min(0.12, dryPoolWetContact * 0.12);
  float waterfallArtBodyAlpha = waterfallArtAlpha
    * u_ninjaOneHydrologyOpacity
    * 0.84;
  result.bodyAlpha = max(
    max(registeredBodyAlpha, waterfallArtBodyAlpha),
    max(
      dryLipShadowAlpha,
      max(
        drySheetShadowAlpha,
        max(
          drySheetBodyAlpha,
          max(dryImpactBodyAlpha, dryPoolContactAlpha)
        )
      )
    )
  );
  return result;
}
`;
