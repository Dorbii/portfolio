/**
 * Art direction for the ocean, as a point on one continuous scale.
 *
 * The renderer carries three tuned sea states — calm swell, windy rolling surf,
 * heavy crashing surf — but they are NOT three modes to switch between. Each was
 * solved from a different wave family, so switching would tear the phase field
 * and crests would break and re-form mid-frame. What ships is the geometry of
 * one solve with the energy of any point between the three: amplitude,
 * steepness, breaking threshold, foam injection, spray and palette all
 * interpolate cleanly because they are numbers on a fixed geometry.
 *
 * That is also what makes a rare hero wave possible later without a fourth
 * preset: the same scalar spiking.
 */
export interface OceanWaterProfile {
  /** 0 calm swell, 0.5 windy rolling surf, 1 heavy crashing surf. */
  readonly weather: number;
  /** Multiplier on the wave clock. 1 is the rate the states were tuned at. */
  readonly timeScale: number;
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
      weather: finiteInRange(profile.ocean.weather, 0, 1, "ocean.weather"),
      timeScale: finiteInRange(
        profile.ocean.timeScale,
        0,
        3,
        "ocean.timeScale",
      ),
    }),
  });
}

/**
 * Below the windy state the field was baked from, because the world view wants
 * a restrained ambient sea that reveals its detail on approach rather than a
 * working surf. Raise it toward 1 for weather.
 */
export const CAREER_WORLD_WATER_REALISM_PROFILE = defineWaterRealismProfile({
  id: "solved-ocean@r1",
  ocean: {
    weather: 0.34,
    timeScale: 1,
  },
});
