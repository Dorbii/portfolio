import type { WaterFieldTile } from "./model.ts";

export interface FieldPage { readonly tile: WaterFieldTile; readonly slot: number }

// One page per finest-level tile. A page points at the finest resident ancestor;
// resolution changes never require shading the same screen pixel repeatedly.
export function buildFieldPages(fields: readonly FieldPage[], minimumLevel: number, width: number, height: number): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  const ordered = fields.filter(({ tile }) => Number(tile.id.split("/")[0]) >= minimumLevel)
    .sort((a, b) => Number(b.tile.id.split("/")[0]) - Number(a.tile.id.split("/")[0]));
  for (const { tile, slot } of ordered) {
    const level = Number(tile.id.split("/")[0]);
    const x0 = Math.round(tile.origin[0] * width), y0 = Math.round(tile.origin[1] * height);
    const x1 = Math.min(width, Math.round((tile.origin[0] + tile.span[0]) * width));
    const y1 = Math.min(height, Math.round((tile.origin[1] + tile.span[1]) * height));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      data[i] = slot + 1; data[i + 1] = level;
    }
  }
  return data;
}
