import type { Pair } from "./camera";

export const TOWN_PRESENTATION_OFFSETS:
Readonly<Record<string, Pair>> = Object.freeze({
  // Vendy is intentionally parked in B1/B2 while its authored city is rebuilt.
  "project-vendy": Object.freeze([-0.14, -0.085] as Pair),
});

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
