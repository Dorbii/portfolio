import type { GeometryPalette, PaletteSlot } from "./types";

export const PALETTE_SLOTS = Object.freeze([
  "structure.base",
  "structure.shadow",
  "line.primary",
  "line.secondary",
  "accent.emissive",
  "accent.focus",
  "label.primary",
  "terrain.claim",
] as const satisfies readonly PaletteSlot[]);

export const CAREER_WORLD_PALETTE_IDS = Object.freeze([
  "ninjaone",
  "tanium",
  "independent",
  "ace-hardware",
  "column-technologies",
  "world-neutral",
  "ambient-neutral",
] as const);

export type CareerWorldPaletteId = (typeof CAREER_WORLD_PALETTE_IDS)[number];

function palette(colors: GeometryPalette): GeometryPalette {
  return Object.freeze(colors);
}

export const CAREER_WORLD_PALETTES = Object.freeze({
  ninjaone: palette({
    "structure.base": "#18343B",
    "structure.shadow": "#0F242B",
    "line.primary": "#7FC7CE",
    "line.secondary": "#4C7D86",
    "accent.emissive": "#56D5EE",
    "accent.focus": "#D8E997",
    "label.primary": "#E6F3F2",
    "terrain.claim": "#132C32",
  }),
  tanium: palette({
    "structure.base": "#3A2722",
    "structure.shadow": "#241713",
    "line.primary": "#D28A6E",
    "line.secondary": "#825849",
    "accent.emissive": "#FF8B6F",
    "accent.focus": "#FFD09B",
    "label.primary": "#F5E9E3",
    "terrain.claim": "#30221D",
  }),
  independent: palette({
    "structure.base": "#30263C",
    "structure.shadow": "#1D1726",
    "line.primary": "#B49AD0",
    "line.secondary": "#746287",
    "accent.emissive": "#B997FF",
    "accent.focus": "#E4CFFF",
    "label.primary": "#F0EAF7",
    "terrain.claim": "#292132",
  }),
  "ace-hardware": palette({
    "structure.base": "#392329",
    "structure.shadow": "#24151A",
    "line.primary": "#C77E89",
    "line.secondary": "#7D4E58",
    "accent.emissive": "#E06B7A",
    "accent.focus": "#FFC2C9",
    "label.primary": "#F6E8EA",
    "terrain.claim": "#302026",
  }),
  "column-technologies": palette({
    "structure.base": "#243341",
    "structure.shadow": "#16212B",
    "line.primary": "#88AFC5",
    "line.secondary": "#536F82",
    "accent.emissive": "#78A7C2",
    "accent.focus": "#C6E3F2",
    "label.primary": "#E8F0F4",
    "terrain.claim": "#1E2C38",
  }),
  "world-neutral": palette({
    "structure.base": "#0D1219",
    "structure.shadow": "#080B10",
    "line.primary": "#F0EEE7",
    "line.secondary": "#596978",
    "accent.emissive": "#8CE8F8",
    "accent.focus": "#D8E997",
    "label.primary": "#F0EEE7",
    "terrain.claim": "#101A20",
  }),
  "ambient-neutral": palette({
    "structure.base": "#1B2B2D",
    "structure.shadow": "#101A1C",
    "line.primary": "#8AA5A2",
    "line.secondary": "#536865",
    "accent.emissive": "#A8C8A0",
    "accent.focus": "#D8E997",
    "label.primary": "#DDE7E3",
    "terrain.claim": "#182522",
  }),
} satisfies Readonly<Record<CareerWorldPaletteId, GeometryPalette>>);

const paletteSlotSet = new Set<string>(PALETTE_SLOTS);
const hexColorPattern = /^#[0-9A-F]{6}$/;

export function isPaletteSlot(value: unknown): value is PaletteSlot {
  return typeof value === "string" && paletteSlotSet.has(value);
}

export function hasCanonicalPaletteSlots(slots: readonly PaletteSlot[]): boolean {
  return (
    slots.length === PALETTE_SLOTS.length &&
    slots.every((slot, index) => slot === PALETTE_SLOTS[index])
  );
}

export function validatePalette(paletteValue: unknown): readonly string[] {
  if (!paletteValue || typeof paletteValue !== "object" || Array.isArray(paletteValue)) {
    return Object.freeze(["palette must be an object"]);
  }

  const record = paletteValue as Record<string, unknown>;
  const keys = Object.keys(record);
  const errors: string[] = [];

  for (const slot of PALETTE_SLOTS) {
    const value = record[slot];
    if (typeof value !== "string" || !hexColorPattern.test(value)) {
      errors.push(`palette slot ${slot} must be an uppercase #RRGGBB color`);
    }
  }
  for (const key of keys) {
    if (!paletteSlotSet.has(key)) errors.push(`unknown palette slot ${key}`);
  }

  return Object.freeze(errors);
}

export function assertPalette(paletteValue: unknown): asserts paletteValue is GeometryPalette {
  const errors = validatePalette(paletteValue);
  if (errors.length > 0) {
    throw new TypeError(`Invalid Career World palette: ${errors.join("; ")}`);
  }
}

export function applyPalette(paletteValue: GeometryPalette, slot: PaletteSlot): string {
  return paletteValue[slot];
}
