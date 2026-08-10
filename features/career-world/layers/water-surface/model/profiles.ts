export interface OceanWaterProfile {
  readonly detailScale: number;
  readonly waveDensity: number;
  readonly waveStrength: number;
  readonly weather: number;
}

export interface RiverSurfaceProfile {
  readonly macroWaveFrequency: number;
  readonly microWaveFrequency: number;
  readonly surfaceRelief: number;
  readonly transportCyclesPerSecond: number;
}

export interface RiverInteractionProfile {
  readonly bankContactShadow: number;
  readonly bankFoam: number;
  readonly depthMix: number;
  readonly eddyStrength: number;
}

export interface WaterfallSheetProfile {
  readonly crestStrength: number;
  readonly filamentFrequency: number;
  readonly sheetStrength: number;
  readonly transportCyclesPerSecond: number;
}

export interface WaterfallImpactProfile {
  readonly advectionSpeed: number;
  readonly breakupFrequency: number;
  readonly foamStrength: number;
  readonly turbulenceStrength: number;
}

export interface WaterMistProfile {
  readonly breakup: number;
  readonly dissipation: number;
  readonly opacity: number;
  readonly radiusScale: number;
}

export interface WaterRealismProfile {
  readonly id: string;
  readonly mist: WaterMistProfile;
  readonly ocean: OceanWaterProfile;
  readonly riverInteraction: RiverInteractionProfile;
  readonly riverSurface: RiverSurfaceProfile;
  readonly waterfallImpact: WaterfallImpactProfile;
  readonly waterfallSheet: WaterfallSheetProfile;
}

function finiteInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): number {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(
      `${label} must be finite and between ${minimum} and ${maximum}.`,
    );
  }
  return value;
}

function freezeRecord<T extends object>(value: T): Readonly<T> {
  return Object.freeze({ ...value });
}

export function defineWaterRealismProfile(
  profile: WaterRealismProfile,
): WaterRealismProfile {
  if (!/^[a-z0-9-]+@r\d+$/.test(profile.id)) {
    throw new TypeError("Water profile id must be a revisioned stable id.");
  }

  const ocean = freezeRecord({
    detailScale: finiteInRange(profile.ocean.detailScale, 0, 1, "ocean.detailScale"),
    waveDensity: finiteInRange(profile.ocean.waveDensity, 0.25, 4, "ocean.waveDensity"),
    waveStrength: finiteInRange(profile.ocean.waveStrength, 0, 2, "ocean.waveStrength"),
    weather: finiteInRange(profile.ocean.weather, 0, 1, "ocean.weather"),
  });
  const riverSurface = freezeRecord({
    macroWaveFrequency: finiteInRange(
      profile.riverSurface.macroWaveFrequency,
      0.01,
      2,
      "riverSurface.macroWaveFrequency",
    ),
    microWaveFrequency: finiteInRange(
      profile.riverSurface.microWaveFrequency,
      0.05,
      4,
      "riverSurface.microWaveFrequency",
    ),
    surfaceRelief: finiteInRange(
      profile.riverSurface.surfaceRelief,
      0,
      1,
      "riverSurface.surfaceRelief",
    ),
    transportCyclesPerSecond: finiteInRange(
      profile.riverSurface.transportCyclesPerSecond,
      0,
      2,
      "riverSurface.transportCyclesPerSecond",
    ),
  });
  const riverInteraction = freezeRecord({
    bankContactShadow: finiteInRange(
      profile.riverInteraction.bankContactShadow,
      0,
      1,
      "riverInteraction.bankContactShadow",
    ),
    bankFoam: finiteInRange(
      profile.riverInteraction.bankFoam,
      0,
      1,
      "riverInteraction.bankFoam",
    ),
    depthMix: finiteInRange(
      profile.riverInteraction.depthMix,
      0,
      1,
      "riverInteraction.depthMix",
    ),
    eddyStrength: finiteInRange(
      profile.riverInteraction.eddyStrength,
      0,
      1,
      "riverInteraction.eddyStrength",
    ),
  });
  const waterfallSheet = freezeRecord({
    crestStrength: finiteInRange(
      profile.waterfallSheet.crestStrength,
      0,
      1,
      "waterfallSheet.crestStrength",
    ),
    filamentFrequency: finiteInRange(
      profile.waterfallSheet.filamentFrequency,
      0.1,
      4,
      "waterfallSheet.filamentFrequency",
    ),
    sheetStrength: finiteInRange(
      profile.waterfallSheet.sheetStrength,
      0,
      1,
      "waterfallSheet.sheetStrength",
    ),
    transportCyclesPerSecond: finiteInRange(
      profile.waterfallSheet.transportCyclesPerSecond,
      0,
      3,
      "waterfallSheet.transportCyclesPerSecond",
    ),
  });
  const waterfallImpact = freezeRecord({
    advectionSpeed: finiteInRange(
      profile.waterfallImpact.advectionSpeed,
      0,
      3,
      "waterfallImpact.advectionSpeed",
    ),
    breakupFrequency: finiteInRange(
      profile.waterfallImpact.breakupFrequency,
      0.01,
      2,
      "waterfallImpact.breakupFrequency",
    ),
    foamStrength: finiteInRange(
      profile.waterfallImpact.foamStrength,
      0,
      1,
      "waterfallImpact.foamStrength",
    ),
    turbulenceStrength: finiteInRange(
      profile.waterfallImpact.turbulenceStrength,
      0,
      1,
      "waterfallImpact.turbulenceStrength",
    ),
  });
  const mist = freezeRecord({
    breakup: finiteInRange(profile.mist.breakup, 0, 1, "mist.breakup"),
    dissipation: finiteInRange(
      profile.mist.dissipation,
      0,
      1,
      "mist.dissipation",
    ),
    opacity: finiteInRange(profile.mist.opacity, 0, 0.6, "mist.opacity"),
    radiusScale: finiteInRange(
      profile.mist.radiusScale,
      0.25,
      2,
      "mist.radiusScale",
    ),
  });

  return Object.freeze({
    id: profile.id,
    mist,
    ocean,
    riverInteraction,
    riverSurface,
    waterfallImpact,
    waterfallSheet,
  });
}

export const CAREER_WORLD_WATER_REALISM_PROFILE = defineWaterRealismProfile({
  id: "natural-water@r2",
  ocean: {
    detailScale: 0.58,
    waveDensity: 1,
    waveStrength: 0.7,
    weather: 0.14,
  },
  riverSurface: {
    macroWaveFrequency: 0.42,
    microWaveFrequency: 1.35,
    surfaceRelief: 0.7,
    transportCyclesPerSecond: 0.48,
  },
  riverInteraction: {
    bankContactShadow: 0.72,
    bankFoam: 0.08,
    depthMix: 0.32,
    eddyStrength: 0.42,
  },
  waterfallSheet: {
    crestStrength: 0.84,
    filamentFrequency: 1.35,
    sheetStrength: 0.82,
    transportCyclesPerSecond: 0.52,
  },
  waterfallImpact: {
    advectionSpeed: 0.72,
    breakupFrequency: 0.38,
    foamStrength: 0.82,
    turbulenceStrength: 0.74,
  },
  mist: {
    breakup: 0.74,
    dissipation: 0.84,
    opacity: 0.25,
    radiusScale: 0.9,
  },
});
