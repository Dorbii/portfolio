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
 * THE state, not a blend. The wave GEOMETRY is baked from heavy_crashing_surf
 * (export_web asserts it), and every uniform on the heavy row was tuned as a
 * set against that geometry -- the hard whitecap threshold, the paint gate,
 * the crash strokes, the palette. At 0.34 the runtime lerped every one of
 * those two-thirds of the way toward the calm/windy rows, whose soft
 * pre-threshold whitecap ramps re-covered the sea in dense dashes: a night of
 * heavy-state tuning was shipping at one-third strength, blended with the
 * exact old values it replaced. The restrained-ambient-sea intent now lives
 * where it belongs: in the per-zoom resolvability gates (uSecVis/uChopVis/
 * uBreakVis), which quiet the wide views without diluting the sea state.
 */
export const CAREER_WORLD_WATER_REALISM_PROFILE = defineWaterRealismProfile({
  id: "solved-ocean@r1",
  ocean: {
    weather: 1,
    // THE SEA WAS RUNNING AT PLATE SPEED, NOT WORLD SPEED. The owner: "why is
    // it so fast here." The wave periods come from the tuned plate, where the
    // primary swell is 170 px of a cliffside close-up -- a few metres of water,
    // and 2.87 s is right for that. At world scale the same swell is 12 world
    // px, which the terrain-implied scale (6.8-35.2 m per world px) puts at
    // 82-422 m, and deep-water dispersion gives a wave that long a period of
    // 7-16 s. So the sea was moving 2.5x to 5.7x too fast for its own size.
    //
    // 0.30 sits just inside the fast end of that band rather than at the
    // physical middle (which would be 0.23): this lane's standing direction is
    // that the water must FEEL right rather than be simulation-correct, and a
    // map wants a sea that is alive. It scales the clock AND the step, so
    // waves, foam advection and spray all slow together.
    timeScale: 0.30,
  },
});
