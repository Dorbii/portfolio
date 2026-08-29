export const WATER_SURFACE_UNIFORM_CONTRACT = Object.freeze([
  ["u_time", "float"],
  ["u_resolution", "vec2"],
  ["u_cameraOrigin", "vec2"],
  ["u_cameraSpan", "vec2"],
  ["u_zoom", "float"],
  ["u_wind", "vec2"],
  ["u_coastTexel", "vec2"],
  ["u_coastMaterialTexel", "vec2"],
  ["u_inlandWaterOverrideOrigin", "vec2"],
  ["u_inlandWaterOverrideSpan", "vec2"],
  ["u_motion", "float"],
  ["u_motionSpeed", "float"],
  ["u_waveStrength", "float"],
  ["u_waveDensity", "float"],
  ["u_swellScale", "float"],
  ["u_oceanFoam", "float"],
  ["u_lightScatter", "float"],
  ["u_relightTravelStrength", "float"],
  ["u_swellShadow", "float"],
  ["u_strokeBlend", "float"],
  ["u_microRelief", "float"],
  ["u_sparkle", "float"],
  ["u_energyOctaves", "float"],
  ["u_energyContrast", "float"],
  ["u_energyDrift", "float"],
  ["u_regionStrength", "float"],
  ["u_regionScale", "float"],
  ["u_regionContrast", "float"],
  ["u_regionPaletteSpread", "float"],
  ["u_regionDrift", "float"],
  ["u_worldFieldWeight", "float"],
  ["u_territoryFieldWeight", "float"],
  ["u_fineDetailStrength", "float"],
  ["u_fineDetailZoomCurve", "float"],
  ["u_foamPatternStrength", "float"],
  ["u_windrowDensity", "float"],
  ["u_whitecapDensity", "float"],
  ["u_laceFoamIntensity", "float"],
  ["u_dominanceTieBand", "float"],
  ["u_weather", "float"],
  ["u_opacity", "float"],
  ["u_detailScale", "float"],
  ["u_coastalAmbience", "float"],
  ["u_microFrequency", "vec2"],
  ["u_territoryLineStrength", "float"],
  ["u_territoryNormalStrength", "float"],
  ["u_lightDirection", "vec3"],
  ["u_deepColor", "vec3"],
  ["u_shallowColor", "vec3"],
  ["u_substrateColor", "vec3"],
  ["u_highlightColor", "vec3"],
  ["u_foamColor", "vec3"],
  ["u_stormColor", "vec3"],
  ["u_materialLow", "sampler2D"],
  ["u_materialResidual", "sampler2D"],
  ["u_macroHeight", "sampler2D"],
  ["u_microHeight", "sampler2D"],
  ["u_coastGeometry", "sampler2D"],
  ["u_coastMaterial", "sampler2D"],
  ["u_inlandWaterOverride", "sampler2D"],
] as const);

export const WATER_SURFACE_UNIFORM_NAMES = Object.freeze(
  WATER_SURFACE_UNIFORM_CONTRACT.map(([name]) => name),
);

export const WATER_SURFACE_UNIFORM_DECLARATIONS =
  WATER_SURFACE_UNIFORM_CONTRACT
    .map(([name, type]) => `uniform ${type} ${name};`)
    .join("\n");

export const WATER_SURFACE_SAMPLER_UNIFORMS = Object.freeze({
  coastGeometry: "u_coastGeometry",
  coastMaterial: "u_coastMaterial",
  inlandWaterOverride: "u_inlandWaterOverride",
  macroHeight: "u_macroHeight",
  microHeight: "u_microHeight",
  materialLow: "u_materialLow",
  materialResidual: "u_materialResidual",
});

export function resolveWaterSurfaceUniforms(
  getUniformLocation: (name: string) => WebGLUniformLocation | null,
): Readonly<Record<string, WebGLUniformLocation>> {
  return Object.fromEntries(
    WATER_SURFACE_UNIFORM_NAMES.map((name) => {
      const location = getUniformLocation(name);
      if (!location) {
        throw new Error(`Water shader is missing uniform ${name}.`);
      }
      return [name, location];
    }),
  );
}
