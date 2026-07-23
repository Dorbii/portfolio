export const CAREER_WORLD_THEME = Object.freeze({
  colors: Object.freeze({
    backdrop: "#050a09",
    water: Object.freeze({
      abyss: "#061820",
      deep: "#0a222c",
      body: "#123742",
      swell: "#2d5960",
      shallow: "#315f5e",
      highlight: "#87aaa4",
      foam: "#c5cfc0",
      storm: "#101a20",
    }),
    land: Object.freeze({
      shadow: "#24271d",
      body: "#777452",
      light: "#b0a473",
      line: "#26251f",
    }),
    interface: Object.freeze({
      ink: "#dce1d2",
      muted: "#929d8f",
      brass: "#b8aa71",
      panel: "#08100dcf",
      border: "#546557",
    }),
  }),
  lighting: Object.freeze({
    worldDirection: Object.freeze(
      [-0.42, -0.36, 0.83] as [number, number, number],
    ),
  }),
});

export type CareerWorldTheme = typeof CAREER_WORLD_THEME;

export function hexToUnitRgb(color: string): readonly [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!match) {
    throw new TypeError(`Expected a six-digit hex color, received ${color}.`);
  }
  return match.slice(1).map(
    (channel) => Number.parseInt(channel, 16) / 255,
  ) as [number, number, number];
}
