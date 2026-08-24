import registration from "../../../../../public/career-world/capitals/ninjaone/city-v2/plates/d05-shore-a-registration-r3.json" with { type: "json" };
import s01Provenance from "../../../../../public/career-world/capitals/ninjaone/city-v2/sprites/s01-sprite-r1.provenance.json" with { type: "json" };
import s10Provenance from "../../../../../public/career-world/capitals/ninjaone/city-v2/sprites/s10-sprite-r1.provenance.json" with { type: "json" };
import s11Provenance from "../../../../../public/career-world/capitals/ninjaone/city-v2/sprites/s11-sprite-r1.provenance.json" with { type: "json" };
import s15Provenance from "../../../../../public/career-world/capitals/ninjaone/city-v2/sprites/s15-sprite-r1.provenance.json" with { type: "json" };

type Bbox = readonly [number, number, number, number];
type Dimensions = readonly [number, number];

interface SpriteProvenance {
  readonly canonicalSkillId: string;
  readonly output: {
    readonly alphaBounds: readonly number[];
    readonly nativePixels: readonly number[];
    readonly path: string;
  };
}

export interface NinjaOneCapitalD05SkillSprite {
  readonly id: string;
  readonly path: string;
  readonly nativeDimensions: Dimensions;
  readonly subjectBbox: Bbox;
  readonly masterFootprintBbox: Bbox;
  /** Registered master-space rect occupied by the scaled non-transparent subject. */
  readonly mountRect: Readonly<{ x: number; y: number; width: number; height: number }>;
  /** Full transparent-canvas rect used by the SVG image element. */
  readonly imageMountRect: Readonly<{ x: number; y: number; width: number; height: number }>;
  readonly zBaseline: number;
}

const SPRITE_ROOT = "/career-world/capitals/ninjaone/city-v2/sprites";

function asBbox(values: readonly number[]): Bbox {
  return Object.freeze([values[0], values[1], values[2], values[3]] as const);
}

function asDimensions(values: readonly number[]): Dimensions {
  return Object.freeze([values[0], values[1]] as const);
}

function defineSkillSprite(provenance: SpriteProvenance): NinjaOneCapitalD05SkillSprite {
  const anchor = registration.anchors.find(({ id }) => id === provenance.canonicalSkillId)!;

  const nativeDimensions = asDimensions(provenance.output.nativePixels);
  const subjectBbox = asBbox(provenance.output.alphaBounds);
  const masterFootprintBbox = asBbox(anchor.masterArtboardSpace.footprintBbox);
  const subjectWidth = subjectBbox[2] - subjectBbox[0];
  const subjectHeight = subjectBbox[3] - subjectBbox[1];
  const footprintWidth = masterFootprintBbox[2] - masterFootprintBbox[0];
  const scale = footprintWidth / subjectWidth;
  const mountRect = Object.freeze({
    x: masterFootprintBbox[0],
    y: masterFootprintBbox[3] - subjectHeight * scale,
    width: footprintWidth,
    height: subjectHeight * scale,
  });

  return Object.freeze({
    id: provenance.canonicalSkillId,
    path: `${SPRITE_ROOT}/${provenance.output.path.split("/").at(-1)}`,
    nativeDimensions,
    subjectBbox,
    masterFootprintBbox,
    mountRect,
    imageMountRect: Object.freeze({
      x: mountRect.x - subjectBbox[0] * scale,
      y: mountRect.y - subjectBbox[1] * scale,
      width: nativeDimensions[0] * scale,
      height: nativeDimensions[1] * scale,
    }),
    zBaseline: masterFootprintBbox[3],
  });
}

export const NINJAONE_CAPITAL_D05_SKILL_SPRITES: readonly NinjaOneCapitalD05SkillSprite[] = Object.freeze([
  defineSkillSprite(s15Provenance),
  defineSkillSprite(s10Provenance),
  defineSkillSprite(s01Provenance),
  defineSkillSprite(s11Provenance),
]);

export const NINJAONE_CAPITAL_D05_SKILL_SPRITE_PATHS = Object.freeze(
  NINJAONE_CAPITAL_D05_SKILL_SPRITES.map(({ path }) => path),
);
