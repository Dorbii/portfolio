import type {
  TeamIdentity,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'

export type TeamAccentCssVars = {
  '--cockpit-team': string
  '--cockpit-team-soft': string
  '--cockpit-team-strong': string
  '--scoreboard-accent': string
}

type Rgb = {
  blue: number
  green: number
  red: number
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

const ROLE_PRESENTATION_ACCENTS: Record<TeamRole, string> = {
  red: '#ff4c5d',
  blue: '#5b9dff',
}

export function resolveTeamAccentHex(
  role: TeamRole,
  identity: TeamIdentity | null | undefined,
): string {
  const color = identity?.primaryColor.trim() ?? ''

  return HEX_COLOR_PATTERN.test(color) ? color.toLowerCase() : ROLE_PRESENTATION_ACCENTS[role]
}

export function createTeamAccentCssVars(
  role: TeamRole,
  identity: TeamIdentity | null | undefined,
): TeamAccentCssVars {
  const accentHex = resolveTeamAccentHex(role, identity)
  const accentRgb = hexToRgbString(accentHex)

  return {
    '--cockpit-team': accentRgb,
    '--cockpit-team-soft': `rgba(${accentRgb}, 0.13)`,
    '--cockpit-team-strong': accentHex,
    '--scoreboard-accent': accentRgb,
  }
}

export function teamAccentRgb(
  role: TeamRole,
  identity: TeamIdentity | null | undefined,
): string {
  return hexToRgbString(resolveTeamAccentHex(role, identity))
}

export function hexLuminance(hex: string): number {
  const rgb = rgbFromHex(hex)
  const red = luminanceChannel(rgb.red)
  const green = luminanceChannel(rgb.green)
  const blue = luminanceChannel(rgb.blue)

  return red * 0.2126 + green * 0.7152 + blue * 0.0722
}

export function mixHexColors(hex: string, targetHex: string, targetWeight: number): string {
  const source = rgbFromHex(hex)
  const target = rgbFromHex(targetHex)
  const sourceWeight = 1 - targetWeight

  return rgbToHex({
    blue: Math.round(source.blue * sourceWeight + target.blue * targetWeight),
    green: Math.round(source.green * sourceWeight + target.green * targetWeight),
    red: Math.round(source.red * sourceWeight + target.red * targetWeight),
  })
}

function hexToRgbString(hex: string): string {
  const rgb = rgbFromHex(hex)

  return `${rgb.red}, ${rgb.green}, ${rgb.blue}`
}

function luminanceChannel(value: number): number {
  const normalized = value / 255

  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

function rgbFromHex(hex: string): Rgb {
  const normalized = hex.replace('#', '')

  return {
    blue: Number.parseInt(normalized.slice(4, 6), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    red: Number.parseInt(normalized.slice(0, 2), 16),
  }
}

function rgbToHex({ blue, green, red }: Rgb): string {
  return `#${hexByte(red)}${hexByte(green)}${hexByte(blue)}`
}

function hexByte(value: number): string {
  return Math.min(255, Math.max(0, value)).toString(16).padStart(2, '0')
}
