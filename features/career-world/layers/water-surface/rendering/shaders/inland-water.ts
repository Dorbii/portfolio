import { WATER_VERTEX_SHADER } from "./vertex";

export const INLAND_WATER_VERTEX_SHADER = WATER_VERTEX_SHADER;

export const INLAND_WATER_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_cameraOrigin;
uniform vec2 u_cameraSpan;
uniform vec2 u_artboardDimensions;
uniform vec2 u_fieldCropOrigin;
uniform vec2 u_fieldCropSpan;
uniform vec2 u_regionOrigin;
uniform vec2 u_regionSpan;
uniform float u_territoryLod;
uniform float u_capitalLod;
uniform float u_siteLod;
uniform float u_effectsEnabled;
uniform float u_aquaticLifeEnabled;
uniform vec3 u_lightDirection;
uniform sampler2D u_inlandField;
uniform sampler2D u_inlandOwnership;
uniform sampler2D u_inlandDetail;
uniform sampler2D u_riverbedAlbedo;
uniform sampler2D u_surfaceAlbedo;

const float DISTANCE_RANGE = 24.0;

float saturate(float value) {
  return clamp(value, 0.0, 1.0);
}

float decodeDetailAlpha(float encoded) {
  return saturate((encoded - 64.0 / 255.0) / (191.0 / 255.0));
}

float hash21(vec2 point) {
  vec3 value = fract(vec3(point.xyx) * vec3(0.1031, 0.1030, 0.0973));
  value += dot(value, value.yzx + 33.33);
  return fract((value.x + value.y) * value.z);
}

float fishSilhouette(vec2 point) {
  float body = 1.0 - smoothstep(
    1.05,
    1.82,
    length(vec2(point.x, point.y * 0.42))
  );
  float tailEnvelope = smoothstep(-4.8, -3.9, point.y)
    * (1.0 - smoothstep(-1.7, -0.9, point.y));
  float tailProgress = saturate((-point.y - 0.9) / 3.9);
  float tailWidth = mix(0.18, 1.55, tailProgress);
  float tail = (1.0 - smoothstep(
    max(0.0, tailWidth - 0.32),
    tailWidth + 0.28,
    abs(point.x)
  )) * tailEnvelope;
  return saturate(max(body, tail));
}

vec4 sampleFlowDetail(
  vec2 localPx,
  vec2 flowDirection,
  float speed,
  float scale
) {
  vec2 flowNormal = vec2(-flowDirection.y, flowDirection.x);
  vec2 coordinate = vec2(
    dot(localPx, flowNormal) / (30.0 * scale),
    dot(localPx, flowDirection) / (54.0 * scale)
  );
  float progress = fract(u_time * mix(0.025, 0.16, saturate(speed)));
  float alternate = fract(progress + 0.5);
  float blend = abs(progress * 2.0 - 1.0);
  vec4 primary = texture(
    u_inlandDetail,
    coordinate - vec2(progress * 0.035, progress)
  );
  vec4 secondary = texture(
    u_inlandDetail,
    coordinate + vec2(0.37, 0.19) - vec2(alternate * 0.035, alternate)
  );
  return mix(secondary, primary, blend);
}

vec2 safeDirection(vec2 velocity) {
  float magnitude = length(velocity);
  return magnitude > 0.004 ? velocity / magnitude : vec2(0.0, 1.0);
}

vec2 surfaceAtlasUv(vec2 coordinate) {
  vec2 tileUv = fract(coordinate);
  return vec2(
    mix(0.004, 0.496, tileUv.x),
    mix(0.008, 0.992, tileUv.y)
  );
}

vec2 waterfallAtlasUv(vec2 coordinate) {
  vec2 tileUv = fract(coordinate);
  return vec2(
    mix(0.504, 0.996, tileUv.x),
    mix(0.008, 0.992, tileUv.y)
  );
}

float waterSpeedAt(vec2 uv, float fallbackSpeed) {
  vec4 sampleValue = texture(u_inlandField, clamp(uv, vec2(0.0), vec2(1.0)));
  float sampleDistance = (sampleValue.r * 2.0 - 1.0) * DISTANCE_RANGE;
  float sampleSpeed = length(sampleValue.gb * 2.0 - 1.0);
  return mix(fallbackSpeed, sampleSpeed, step(0.0, sampleDistance));
}

void main() {
  vec2 screenUv = vec2(v_uv.x, 1.0 - v_uv.y);
  vec2 worldUv = u_cameraOrigin + screenUv * u_cameraSpan;
  vec2 regionUv = (worldUv - u_regionOrigin) / u_regionSpan;
  vec2 localPx = regionUv * u_artboardDimensions;
  vec2 fieldUv = (localPx - u_fieldCropOrigin) / u_fieldCropSpan;
  float inField = step(0.0, fieldUv.x) * step(fieldUv.x, 1.0)
    * step(0.0, fieldUv.y) * step(fieldUv.y, 1.0);
  vec2 sampleUv = clamp(fieldUv, vec2(0.0), vec2(1.0));
  vec4 field = texture(u_inlandField, sampleUv);
  float signedDistance = (field.r * 2.0 - 1.0) * DISTANCE_RANGE;
  float waterInterior = step(0.0, signedDistance);
  vec2 velocity = (field.gb * 2.0 - 1.0) * waterInterior;
  float speed = length(velocity);
  vec2 flowDirection = safeDirection(velocity);
  vec2 flowNormal = vec2(-flowDirection.y, flowDirection.x);
  vec2 semanticOffset = vec2(14.0) / u_fieldCropSpan;
  float materialSpeed = (
    speed * 2.0
    + waterSpeedAt(sampleUv + vec2(semanticOffset.x, 0.0), speed)
    + waterSpeedAt(sampleUv - vec2(semanticOffset.x, 0.0), speed)
    + waterSpeedAt(sampleUv + vec2(0.0, semanticOffset.y), speed)
    + waterSpeedAt(sampleUv - vec2(0.0, semanticOffset.y), speed)
  ) / 6.0;

  float pixelFootprint = max(
    length(dFdx(localPx)),
    length(dFdy(localPx))
  );
  float edgeAa = clamp(pixelFootprint * 0.72, 0.72, 3.2);
  float waterCoverage = smoothstep(-edgeAa, edgeAa, signedDistance) * inField;
  vec4 inlandMeta = texture(u_inlandOwnership, sampleUv);
  float inlandOwnership = inlandMeta.r;
  float fallProgress = inlandMeta.g;
  float cascadeImpact = inlandMeta.b;
  float ownershipBlend = smoothstep(0.0, 1.0, inlandOwnership);
  float fallVelocity = mix(materialSpeed, speed, 0.78);
  float fall = smoothstep(0.62, 0.84, fallVelocity);
  float fallEdgeNoise = decodeDetailAlpha(texture(
    u_inlandDetail,
    localPx / vec2(7.0, 17.0) + vec2(0.31, -u_time * 0.026)
  ).a);
  float fallEdgeBreakup = mix(
    3.2,
    7.0,
    smoothstep(0.24, 0.96, fallProgress)
  );
  float fallInset = mix(
    0.40,
    2.40,
    smoothstep(0.12, 0.94, fallProgress)
  );
  float fallCoverage = smoothstep(
    -edgeAa,
    edgeAa + 2.2,
    signedDistance + (fallEdgeNoise - 0.5) * fallEdgeBreakup - fallInset
  ) * inField;
  waterCoverage = mix(waterCoverage, fallCoverage, fall);
  waterCoverage *= ownershipBlend;

  float territoryDetail = mix(0.30, 0.68, saturate(u_territoryLod));
  float capitalDetail = mix(territoryDetail, 0.88, saturate(u_capitalLod));
  float detail = mix(capitalDetail, 1.0, saturate(u_siteLod));
  float lake = 1.0 - smoothstep(0.08, 0.24, materialSpeed);
  float river = smoothstep(0.10, 0.32, materialSpeed)
    * (1.0 - smoothstep(0.72, 0.88, speed));
  float depth = saturate(signedDistance / 22.0);
  float shallow = 1.0 - smoothstep(0.18, 0.82, depth);

  vec4 broadDetail = sampleFlowDetail(localPx, flowDirection, speed, 1.0);
  vec4 fineDetail = sampleFlowDetail(
    localPx + vec2(31.0, -17.0),
    flowDirection,
    speed * 1.12,
    0.46
  );
  float broadFoam = decodeDetailAlpha(broadDetail.a);
  float fineFoam = decodeDetailAlpha(fineDetail.a);
  vec4 lakeDetail = texture(
    u_inlandDetail,
    vec2(-localPx.y, localPx.x) / vec2(84.0, 116.0)
      + vec2(u_time * 0.0022, u_time * -0.0014)
  );
  float lakeFoam = decodeDetailAlpha(lakeDetail.a);
  float flowFoam = mix(
    mix(broadFoam, fineFoam, 0.34),
    lakeFoam,
    lake * 0.22
  );
  vec2 flowSpace = vec2(
    dot(localPx, flowNormal),
    dot(localPx, flowDirection)
  );
  vec2 surfaceCoordinate = flowSpace / vec2(214.0, 286.0);
  float surfaceProgress = fract(
    u_time * mix(0.006, 0.052, saturate(speed))
  );
  float surfaceAlternate = fract(surfaceProgress + 0.5);
  float surfaceBlend = abs(surfaceProgress * 2.0 - 1.0);
  vec3 surfacePrimary = texture(
    u_surfaceAlbedo,
    surfaceAtlasUv(surfaceCoordinate - vec2(0.0, surfaceProgress))
  ).rgb;
  vec3 surfaceSecondary = texture(
    u_surfaceAlbedo,
    surfaceAtlasUv(
      surfaceCoordinate + vec2(0.41, 0.27)
        - vec2(0.0, surfaceAlternate)
    )
  ).rgb;
  vec3 authoredSurface = mix(surfaceSecondary, surfacePrimary, surfaceBlend);
  float authoredSurfaceLuma = dot(
    authoredSurface,
    vec3(0.2126, 0.7152, 0.0722)
  );
  float authoredSurfaceVein = smoothstep(0.13, 0.46, authoredSurfaceLuma);
  vec2 tangentGradient = (broadDetail.rg * 2.0 - 1.0) * 0.72
    + (fineDetail.rg * 2.0 - 1.0) * 0.28 * detail;
  vec2 surfaceGradient = flowNormal * tangentGradient.x
    + flowDirection * tangentGradient.y;
  surfaceGradient = mix(
    surfaceGradient,
    lakeDetail.rg * 2.0 - 1.0,
    lake * 0.30
  );
  float riverRidge = smoothstep(0.45, 0.86, abs(tangentGradient.y))
    * river * detail;
  float streamThread = smoothstep(0.66, 0.92, fineFoam)
    * mix(0.18, 0.86, detail);
  float lakeRipple = smoothstep(0.50, 0.88, length(tangentGradient))
    * lake * mix(0.18, 0.62, detail);

  vec4 staticDetail = texture(
    u_inlandDetail,
    localPx / vec2(68.0, 52.0) + vec2(0.17, 0.39)
  );
  float bedStone = staticDetail.b;
  float bedVariation = decodeDetailAlpha(staticDetail.a);
  vec3 authoredBed = texture(
    u_riverbedAlbedo,
    localPx / vec2(188.0, 188.0)
      + vec2(0.23, 0.41)
      + surfaceGradient * mix(0.003, 0.008, detail)
  ).rgb;
  authoredBed = pow(max(authoredBed, vec3(0.002)), vec3(0.82));
  float bedLuminance = dot(authoredBed, vec3(0.2126, 0.7152, 0.0722));
  authoredBed = mix(vec3(bedLuminance), authoredBed, 0.68);
  vec3 bedDark = vec3(0.105, 0.115, 0.085);
  vec3 bedLight = vec3(0.255, 0.245, 0.175);
  vec3 riverbed = mix(bedDark, bedLight, saturate(bedStone * 0.32 + bedVariation * 0.36));
  riverbed *= mix(0.72, 1.03, bedVariation);
  riverbed = mix(
    riverbed,
    authoredBed * vec3(0.62, 0.70, 0.64),
    0.78
  );

  vec3 shallowWater = vec3(0.055, 0.155, 0.165);
  vec3 bodyWater = vec3(0.035, 0.155, 0.190);
  vec3 deepWater = vec3(0.025, 0.095, 0.125);
  vec3 waterTint = mix(shallowWater, bodyWater, smoothstep(0.08, 0.55, depth));
  waterTint = mix(waterTint, deepWater, smoothstep(0.55, 1.0, depth));
  vec3 lakeShallow = vec3(0.052, 0.150, 0.162);
  vec3 lakeDeep = vec3(0.026, 0.098, 0.120);
  vec3 lakeTint = mix(lakeShallow, lakeDeep, smoothstep(0.20, 0.84, depth));
  waterTint = mix(waterTint, lakeTint, lake * 0.92);
  float opticalDensity = mix(0.46, 0.94, smoothstep(0.02, 0.92, depth));
  float riverDensity = mix(0.60, 0.85, smoothstep(0.04, 0.88, depth));
  float lakeDensity = mix(0.54, 0.91, smoothstep(0.08, 0.82, depth));
  opticalDensity = mix(opticalDensity, riverDensity, river * 0.68);
  opticalDensity = mix(opticalDensity, lakeDensity, lake * 0.92);
  vec3 surface = mix(riverbed, waterTint, opticalDensity);

  vec3 normal = normalize(vec3(
    -surfaceGradient.x * mix(0.18, 0.42, river + fall * 0.35),
    -surfaceGradient.y * mix(0.18, 0.42, river + fall * 0.35),
    1.0
  ));
  vec3 lightDirection = normalize(u_lightDirection);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float specular = pow(max(dot(reflect(-lightDirection, normal), vec3(0.0, 0.0, 1.0)), 0.0), 34.0);
  float reflectedFacet = smoothstep(
    0.04,
    0.34,
    dot(surfaceGradient, normalize(-lightDirection.xy))
  );
  float movingLight = riverRidge * river * 0.042
    + streamThread * river * 0.024
    + lakeRipple * lake * 0.018;
  surface *= mix(0.94, 1.05, diffuse);
  surface += vec3(0.36, 0.49, 0.50) * (
    specular * 0.31
    + movingLight
    + reflectedFacet * mix(0.045, 0.12, lake) * detail
  );
  surface += vec3(0.30, 0.40, 0.41)
    * authoredSurfaceVein
    * (river * 0.23 + lake * 0.15 + fall * 0.13)
    * detail;
  float flowSheen = smoothstep(0.54, 0.88, flowFoam)
    * mix(0.18, 0.88, detail);
  surface += vec3(0.10, 0.17, 0.18)
    * flowSheen * (river * 0.16 + lake * 0.12 + fall * 0.18);
  surface += vec3(0.09, 0.14, 0.15)
    * (flowFoam - 0.5) * (river * 0.42 + lake * 0.12) * detail;
  float waveEnergy = abs(tangentGradient.x) * 0.68
    + abs(tangentGradient.y) * 0.32;
  float waveCrest = smoothstep(0.15, 0.52, waveEnergy)
    * smoothstep(0.42, 0.82, flowFoam)
    * detail;
  float surfaceVariation = (flowFoam - 0.5)
    * (lake * 0.07 + river * 0.18 + fall * 0.10) * detail;
  surface *= 1.0 + surfaceVariation;
  surface += vec3(0.24, 0.33, 0.34)
    * waveCrest * (lake * 0.07 + river * 0.20 + fall * 0.20);
  float reflectedBand = smoothstep(0.56, 0.84, flowFoam) * detail;
  surface = mix(
    surface,
    vec3(0.155, 0.245, 0.265),
    reflectedBand * (lake * 0.07 + river * 0.20 + fall * 0.10)
  );
  float fineGlint = smoothstep(0.72, 0.92, fineFoam)
    * smoothstep(0.18, 0.58, waveEnergy) * detail;
  surface += vec3(0.30, 0.40, 0.40)
    * fineGlint * (river * 0.12 + lake * 0.055 + fall * 0.16);
  float waveClock = u_time * mix(0.34, 1.08, saturate(materialSpeed));
  float broadWavePhase = dot(flowSpace, vec2(0.024, 0.058)) - waveClock;
  float crossingWavePhase = dot(flowSpace, vec2(-0.052, 0.031))
    - waveClock * 0.57 + broadFoam * 1.8;
  float broadWaveTrain = pow(
    0.5 + 0.5 * sin(broadWavePhase),
    mix(5.8, 2.8, river)
  );
  float crossingWaveTrain = pow(
    0.5 + 0.5 * sin(crossingWavePhase),
    7.0
  );
  float resolvedWave = (
    broadWaveTrain * mix(0.34, 0.78, river)
    + crossingWaveTrain * (river * 0.34 + lake * 0.13)
  ) * detail * (1.0 - fall * 0.72);
  float waveShadow = (1.0 - broadWaveTrain)
    * smoothstep(0.14, 0.62, waveEnergy)
    * (river * 0.045 + lake * 0.022) * detail;
  surface *= 1.0 - waveShadow;
  surface += vec3(0.28, 0.39, 0.40) * resolvedWave * 0.11;
  float directionalVein = (
    smoothstep(0.61, 0.77, fineFoam)
    - smoothstep(0.80, 0.93, fineFoam)
  ) * detail;
  surface += vec3(0.27, 0.36, 0.36)
    * directionalVein * (river * 0.15 + lake * 0.035 + fall * 0.18);
  float shallowCaustic = smoothstep(0.68, 0.91, fineFoam + waveEnergy * 0.18)
    * shallow * (1.0 - depth) * detail;
  surface += vec3(0.12, 0.16, 0.13) * shallowCaustic * 0.11;
  vec2 aquaticCell = floor(localPx / vec2(92.0, 78.0));
  vec2 aquaticUv = fract(localPx / vec2(92.0, 78.0)) - 0.5;
  float aquaticSeed = hash21(aquaticCell);
  float schoolWindow = step(0.84, aquaticSeed)
    * smoothstep(0.56, 0.82, u_siteLod)
    * u_aquaticLifeEnabled;
  float fishDirection = mix(-1.0, 1.0, step(0.5, aquaticSeed));
  float fishSwim = fract(
    aquaticUv.y + u_time * mix(0.018, 0.034, aquaticSeed) * fishDirection
  ) - 0.5;
  vec2 fishPoint = vec2(
    (aquaticUv.x + (hash21(aquaticCell + 7.0) - 0.5) * 0.34) * 23.0,
    fishSwim * 24.0
  );
  fishPoint.x += sin(u_time * 1.15 + aquaticSeed * 17.0) * 0.42;
  float fish = fishSilhouette(fishPoint)
    * schoolWindow
    * smoothstep(0.34, 0.72, depth)
    * (lake * 0.82 + river * 0.38)
    * (1.0 - smoothstep(0.48, 0.78, materialSpeed))
    * waterCoverage;
  float companionFish = fishSilhouette(
    vec2(fishPoint.x + 2.7, fishPoint.y + 5.2)
  ) * schoolWindow * smoothstep(0.93, 0.985, aquaticSeed)
    * smoothstep(0.34, 0.72, depth)
    * lake * waterCoverage;
  surface = mix(
    surface,
    surface * vec3(0.36, 0.43, 0.37),
    saturate(fish * 0.38 + companionFish * 0.26)
  );
  vec3 fallRibbonSample = texture(
    u_surfaceAlbedo,
    waterfallAtlasUv(
      flowSpace / vec2(38.0, 176.0)
        + vec2(
          0.17,
          -u_time * mix(0.060, 0.148, smoothstep(0.06, 0.94, fallProgress))
        )
    )
  ).rgb;
  float fallRibbonLuma = dot(
    fallRibbonSample,
    vec3(0.2126, 0.7152, 0.0722)
  );
  float fallRibbonFine = dot(
    texture(
      u_surfaceAlbedo,
      waterfallAtlasUv(
        flowSpace / vec2(17.0, 124.0)
          + vec2(
            0.63,
            -u_time * mix(0.092, 0.188, smoothstep(0.08, 0.96, fallProgress))
          )
      )
    ).rgb,
    vec3(0.2126, 0.7152, 0.0722)
  );
  float fallStrand = smoothstep(
    0.36,
    0.68,
    fallRibbonLuma * 0.42 + fallRibbonFine * 0.40 + fineFoam * 0.18
  ) * fall * detail;
  float fallVeil = smoothstep(
    0.34,
    0.72,
    fallRibbonLuma * 0.26 + fallRibbonFine * 0.48 + broadFoam * 0.26
  ) * fall;
  float fallCrest = fall * (1.0 - smoothstep(0.035, 0.20, fallProgress));
  float fallRelease = fall * smoothstep(0.04, 0.22, fallProgress);
  float fallEdge = fall
    * (1.0 - smoothstep(0.25, 3.4, signedDistance));
  float fallMaterialEnvelope = smoothstep(-0.05, 0.16, fallProgress)
    * (1.0 - smoothstep(0.80, 1.05, fallProgress));
  float fallMaterialMix = fall * (0.34 + 0.66 * fallMaterialEnvelope);
  float fallSheetSignal = saturate(
    fallRibbonLuma * 0.52
      + fallRibbonFine * 0.30
      + broadFoam * 0.10
      + fallEdge * 0.08
  );
  float fallSheetLuma = smoothstep(0.20, 0.64, fallSheetSignal);
  vec3 fallingSheet = mix(
    vec3(0.045, 0.120, 0.145),
    vec3(0.285, 0.430, 0.440),
    fallSheetLuma
  );
  surface = mix(
    surface,
    fallingSheet,
    fallMaterialMix * (0.64 + fallVeil * 0.16)
  );
  surface += vec3(0.46, 0.62, 0.62)
    * fallStrand * 0.30 * (0.20 + 0.80 * fallMaterialEnvelope);
  float crestBreakup = smoothstep(
    0.48,
    0.78,
    broadFoam * 0.54 + fineFoam * 0.46
  );
  surface = mix(
    surface,
    vec3(0.58, 0.69, 0.67),
    fallCrest * (0.24 + crestBreakup * 0.38)
  );
  float fallLip = fall * (1.0 - smoothstep(0.02, 0.09, fallProgress));
  surface += vec3(0.32, 0.42, 0.41)
    * fallLip * (0.12 + crestBreakup * 0.22);
  surface += vec3(0.20, 0.29, 0.28)
    * fallRelease * fallEdge * crestBreakup * 0.16;
  float innerContact = (1.0 - smoothstep(
    0.0,
    mix(1.0, 2.4, bedVariation),
    signedDistance
  ))
    * waterCoverage;
  surface *= mix(1.0, 0.86, innerContact);

  float aeration = saturate((field.a - 64.0 / 255.0) / (191.0 / 255.0));
  float brokenFoam = smoothstep(0.57, 0.86, flowFoam + riverRidge * 0.12);
  float eventEnergy = smoothstep(0.18, 0.62, aeration);
  float eventNoise = decodeDetailAlpha(texture(
    u_inlandDetail,
    localPx / vec2(13.0, 11.0) + vec2(0.29, 0.71)
  ).a);
  float eventBreakup = smoothstep(
    0.38,
    0.66,
    eventNoise * 0.64 + fineFoam * 0.36
  );
  float eventFoam = eventEnergy * (0.04 + eventBreakup * 0.78);
  float shorelineShelf = (1.0 - smoothstep(0.0, 6.8, signedDistance))
    * waterCoverage * (1.0 - fall * 0.88);
  float shoreWave = pow(
    0.5 + 0.5 * sin(
      flowSpace.y * 0.105 - u_time * 0.92 + bedVariation * 2.4
    ),
    5.0
  );
  float shoreFoam = shorelineShelf
    * smoothstep(0.36, 0.82, bedVariation * 0.52 + fineFoam * 0.48)
    * (0.16 + shoreWave * 0.52)
    * (river * 0.72 + lake * 0.31)
    * detail;
  float explicitImpact = smoothstep(0.06, 0.82, cascadeImpact);
  float impactCore = smoothstep(0.46, 0.90, cascadeImpact);
  float impactRing = smoothstep(0.10, 0.42, cascadeImpact)
    * (1.0 - smoothstep(0.76, 1.0, cascadeImpact));
  float impactFoam = explicitImpact
    * (0.28 + eventBreakup * 0.72)
    * (1.0 - fall * 0.92)
    * waterCoverage
    * u_effectsEnabled;
  float bankTurbulence = (1.0 - smoothstep(0.0, 8.5, signedDistance))
    * river * smoothstep(0.64, 0.90, fineFoam);
  float foam = saturate(
    aeration * brokenFoam * mix(0.58, 0.24, fall)
    + bankTurbulence * 0.10
    + shoreFoam * 0.18
    + fall * streamThread * 0.08
    + fallCrest * (0.12 + eventBreakup * 0.24)
    + eventFoam * 0.82
  ) * waterCoverage * u_effectsEnabled;
  vec3 foamColor = vec3(0.65, 0.76, 0.76);
  surface = mix(surface, foamColor, foam * mix(0.44, 0.56, fall));
  surface = mix(
    surface,
    vec3(0.67, 0.76, 0.74),
    impactFoam * (0.34 + impactCore * 0.22 + impactRing * 0.10)
  );
  vec3 estuaryMatch = vec3(0.120, 0.190, 0.205);
  surface = mix(
    estuaryMatch,
    surface,
    smoothstep(0.08, 0.92, ownershipBlend)
  );

  vec4 bankDetail = texture(
    u_inlandDetail,
    localPx / vec2(82.0, 64.0) + vec2(0.43, 0.11)
  );
  float bankNoise = decodeDetailAlpha(bankDetail.a);
  float bankWidth = mix(4.5, 11.5, bankNoise);
  float externalWater = 1.0 - smoothstep(40.0 / 255.0, 60.0 / 255.0, field.a);
  float bankBand = (1.0 - waterCoverage)
    * smoothstep(-bankWidth - edgeAa, -0.4, signedDistance)
    * (1.0 - externalWater)
    * inField;
  float contact = exp(-abs(signedDistance) * 0.38) * inField;
  float bankStone = smoothstep(0.34, 0.78, bankDetail.b);
  vec3 bankMoss = vec3(0.075, 0.105, 0.060);
  vec3 bankRock = vec3(0.235, 0.225, 0.175);
  vec3 bankColor = mix(bankMoss, bankRock, saturate(bankStone * 0.82 + bankNoise * 0.16));
  vec3 authoredBank = texture(
    u_riverbedAlbedo,
    localPx / vec2(126.0, 126.0) + vec2(0.61, 0.19)
  ).rgb;
  authoredBank = pow(max(authoredBank, vec3(0.002)), vec3(0.84));
  bankColor = mix(bankColor, authoredBank * vec3(0.76, 0.80, 0.67), 0.66);
  bankColor *= mix(0.66, 1.02, bankNoise);
  bankColor = mix(bankColor, vec3(0.032, 0.050, 0.039), contact * 0.42);
  float closeBank = mix(0.30, 1.0, saturate(u_capitalLod + u_siteLod * 0.35));
  float bankAlpha = bankBand * mix(0.34, 0.76, bankStone) * closeBank
    + contact * (1.0 - waterCoverage) * 0.34
      * (1.0 - externalWater);
  bankAlpha *= inlandOwnership;

  float outsideMist = cascadeImpact * (1.0 - waterCoverage) * inField;
  float mistNoise = decodeDetailAlpha(texture(
    u_inlandDetail,
    localPx / vec2(24.0, 19.0) + vec2(u_time * 0.041, -u_time * 0.057)
  ).a);
  float mistFine = decodeDetailAlpha(texture(
    u_inlandDetail,
    localPx / vec2(9.0, 13.0) + vec2(-u_time * 0.063, u_time * 0.034)
  ).a);
  float mistTexture = saturate(mistNoise * 0.58 + mistFine * 0.42);
  float impactSpray = explicitImpact
    * (1.0 - fall)
    * (0.04 + mistTexture * 0.16);
  float mist = max(
    smoothstep(0.08, 0.58, outsideMist) * (0.10 + mistTexture * 0.28),
    impactSpray
  ) * u_effectsEnabled;
  vec3 mistColor = vec3(0.58, 0.68, 0.67);

  float fallOpacity = saturate(
    0.88 + fallVeil * 0.03 + fallStrand * 0.08 + fineGlint * 0.01
  );
  float fallEnvelope = 0.86 + 0.14
    * smoothstep(-0.04, 0.09, fallProgress)
    * (1.0 - smoothstep(0.84, 1.04, fallProgress));
  fallOpacity *= mix(1.0, fallEnvelope, fall);
  float waterAlpha = waterCoverage * mix(1.0, fallOpacity, fall);
  float baseAlpha = max(waterAlpha, bankAlpha);
  float surfaceColorCoverage = max(
    waterCoverage,
    fall * ownershipBlend * inField
  );
  vec3 composed = mix(bankColor, surface, surfaceColorCoverage);
  composed = mix(composed, mistColor, mist * 0.52);
  // The authored terminal river reaches the south edge of the registered
  // inland field, where the frozen terrain master already owns the same river
  // channel. Feather only that final handoff so the animated layer dissolves
  // into the painted continuation instead of exposing its rectangular crop.
  float southHandoff = 1.0 - smoothstep(0.965, 1.0, fieldUv.y);
  float alpha = max(baseAlpha, mist * 0.24) * inField * southHandoff;
  alpha *= step(1.0, u_resolution.x + u_resolution.y);
  outColor = vec4(composed, alpha);
}
`;
