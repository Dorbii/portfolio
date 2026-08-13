export interface OceanWaterProfile {
  readonly detailScale: number;
  readonly waveDensity: number;
  readonly waveStrength: number;
  readonly weather: number;
}

export interface WaterRealismProfile {
  readonly id: string;
  readonly ocean: OceanWaterProfile;
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

export function defineWaterRealismProfile(
  profile: WaterRealismProfile,
): WaterRealismProfile {
  if (!/^[a-z0-9-]+@r\d+$/.test(profile.id)) {
    throw new TypeError("Water profile id must be a revisioned stable id.");
  }

  return Object.freeze({
    id: profile.id,
    ocean: Object.freeze({
      detailScale: finiteInRange(
        profile.ocean.detailScale,
        0,
        1,
        "ocean.detailScale",
      ),
      waveDensity: finiteInRange(
        profile.ocean.waveDensity,
        0.25,
        4,
        "ocean.waveDensity",
      ),
      waveStrength: finiteInRange(
        profile.ocean.waveStrength,
        0,
        2,
        "ocean.waveStrength",
      ),
      weather: finiteInRange(
        profile.ocean.weather,
        0,
        1,
        "ocean.weather",
      ),
    }),
  });
}

export const CAREER_WORLD_WATER_REALISM_PROFILE = defineWaterRealismProfile({
  id: "natural-ocean@r1",
  ocean: {
    detailScale: 0.58,
    waveDensity: 1,
    waveStrength: 0.7,
    weather: 0.14,
  },
});
