import { defineLayerDetailContract } from "../../../shared/lod";
import { OCEAN_WORLD_FIELDS } from "./generated/worldFields";

const FIELDS = "/career-world/layers/ocean/fields";

/**
 * Four textures, 2.69 MB, replacing 40.3 MB of painted water plates.
 *
 * The water is not painted any more: it is solved. The eikonal phase field for
 * the whole coastline was solved once offline against the live coast authority
 * and baked here, because the coastline is fixed once set — so the phase field
 * is an ASSET, not a runtime cost. Everything else the renderer needs is either
 * derived from these in closed form or generated in screen space.
 *
 * `phase` must be sampled NEAREST. Its red and green channels are the high and
 * low bytes of a 16-bit phase residual, and hardware bilinear would interpolate
 * those two bytes independently — the low byte is a sawtooth, so every wrap
 * would spike the reconstructed phase by up to 256 quantisation steps. The
 * shader decodes four texels and interpolates the decoded values instead.
 *
 * The two noise textures are the exact fields the offline renderer was tuned
 * against. Regenerating them from a different seed would silently invalidate
 * every scale-dependent constant in the composite pass.
 */
export const OCEAN_FIELD_ASSETS = Object.freeze({
  /** RG = phase residual (16 bit), B = |k|, A = depth. NEAREST. */
  phase: `${FIELDS}/ocean-phase-r2.png`,
  /** RG = wave direction, B = signed sdf (square-root encoded), A = ray focus. */
  flow: `${FIELDS}/ocean-flow-r2.png`,
  /** Tileable 4-octave fbm, one octave per channel. */
  noise: `${FIELDS}/ocean-noise-r2.png`,
  /** Small flat companion, for lookups the big texture's mipmap would erase. */
  noiseFine: `${FIELDS}/ocean-noise-fine-r2.png`,
});

export const OCEAN_FIELD_DIMENSIONS = Object.freeze(
  OCEAN_WORLD_FIELDS.world as readonly [number, number],
);

export const WATER_DETAIL_CONTRACT = defineLayerDetailContract({
  layer: "ocean",
  sources: [
    {
      id: "world-phase-field",
      kind: "registered-raster",
      minimumTier: "world",
      path: OCEAN_FIELD_ASSETS.phase,
      dimensions: OCEAN_FIELD_DIMENSIONS,
      worldBounds: {
        origin: [0, 0],
        span: [1, 1],
      },
    },
    {
      id: "world-flow-field",
      kind: "registered-raster",
      minimumTier: "world",
      path: OCEAN_FIELD_ASSETS.flow,
      dimensions: OCEAN_FIELD_DIMENSIONS,
      worldBounds: {
        origin: [0, 0],
        span: [1, 1],
      },
    },
    {
      // The secondary train and the wind chop are sub-pixel at world resolution
      // — 2.6 and 1.0 samples per wave against the primary swell's 4.7 — so they
      // cannot be baked and are laid down analytically in screen space, fading
      // in only at the zoom that can resolve them.
      id: "territory-short-wave-trains",
      kind: "world-procedural",
      minimumTier: "territory",
      path: OCEAN_FIELD_ASSETS.noiseFine,
      fixedWorldFrequency: [
        OCEAN_FIELD_DIMENSIONS[0] / 66,
        OCEAN_FIELD_DIMENSIONS[1] / 66,
      ],
    },
  ],
});
