import terrain from "../../../../../public/career-world/layers/terrain/authority/manifests/terrain-local-mount-r1.json" with { type: "json" };

// Water-owned art direction anchored to existing land registrations. These
// choices color only submerged materials; they never repaint the land.
export const INLAND_PALETTES = {
  meadow: { sand: [0.11, 0.17, 0.13], stone: [0.20, 0.24, 0.18], deep: [0.012, 0.065, 0.071] },
  amethyst: { sand: [0.045, 0.125, 0.235], stone: [0.21, 0.15, 0.29], deep: [0.008, 0.065, 0.15] },
  crystal: { sand: [0.095, 0.18, 0.23], stone: [0.24, 0.31, 0.34], deep: [0.013, 0.068, 0.12] },
  limestone: { sand: [0.20, 0.22, 0.155], stone: [0.32, 0.33, 0.26], deep: [0.018, 0.093, 0.10] },
  forest: { sand: [0.085, 0.125, 0.105], stone: [0.17, 0.21, 0.145], deep: [0.008, 0.056, 0.060] },
} as const;

export const INLAND_REGION_PALETTES: Readonly<Record<string, keyof typeof INLAND_PALETTES>> = {
  "l2-c1-1": "amethyst",
  "l2-c3-1": "crystal",
  "l2-c3-0": "crystal",
  "l2-c1-0": "limestone",
  "l2-c2-0": "forest",
  "l2-c2-2": "limestone",
  "l2-c3-2": "forest",
  "l2-c3-3": "forest",
  "l2-c4-1": "crystal",
  "l2-c4-2": "limestone",
  "l2-c4-3": "limestone",
  "l2-tanium-c0-1": "meadow",
  "l2-tanium-c3-0": "forest",
  "l2-tanium-c5-1": "meadow",
  "l2-tanium-c4-1": "limestone",
  "l2-tanium-c6-2": "limestone",
  "l2-tanium-c1-2": "forest",
  "l2-review-tanium-c1-1": "forest",
  "l2-review-tanium-c2-1": "forest",
};

export const INLAND_REGIONS = terrain.tiles.filter(tile => tile.id in INLAND_REGION_PALETTES)
  .map(tile => ({ tileId: tile.id, bounds: tile.worldBounds, palette: INLAND_REGION_PALETTES[tile.id] }));

const vector = (values: readonly number[]) => `vec${values.length}(${values.map(n => n.toFixed(7)).join(",")})`;
const palette = (name: keyof typeof INLAND_PALETTES) => {
  const p = INLAND_PALETTES[name];
  return `InlandPalette(${vector(p.sand)},${vector(p.stone)},${vector(p.deep)})`;
};

export const INLAND_PALETTE_SHADER = /* glsl */ `
struct InlandPalette { vec3 sand; vec3 stone; vec3 deep; };
InlandPalette inlandPalette(vec2 world) {
  InlandPalette result=${palette("meadow")};
  ${INLAND_REGIONS.map(region => `{
    vec2 local=(world-${vector(region.bounds.origin)})/${vector(region.bounds.span)};
    vec2 radial=abs(local*2.0-1.0);
    float weight=1.0-smoothstep(0.76,1.3,max(radial.x,radial.y));
    InlandPalette region=${palette(region.palette)};
    result.sand=mix(result.sand,region.sand,weight);
    result.stone=mix(result.stone,region.stone,weight);
    result.deep=mix(result.deep,region.deep,weight);
  }`).join("\n")}
  return result;
}
`;
