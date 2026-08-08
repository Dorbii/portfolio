import type { Pair } from "./camera";

export const TOWN_PRESENTATION_OFFSETS:
Readonly<Record<string, Pair>> = Object.freeze({});

const ZERO_OFFSET = Object.freeze([0, 0] as Pair);

export function resolveTownPresentationOffset(ownerId: string): Pair {
  return TOWN_PRESENTATION_OFFSETS[ownerId] ?? ZERO_OFFSET;
}

export function resolveTownPresentationAnchor(
  ownerId: string,
  anchor: Pair,
): Pair {
  const offset = resolveTownPresentationOffset(ownerId);
  if (offset === ZERO_OFFSET) {
    return anchor;
  }
  return Object.freeze([
    anchor[0] + offset[0],
    anchor[1] + offset[1],
  ] as Pair);
}
