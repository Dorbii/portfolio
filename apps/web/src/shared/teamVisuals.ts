import type {
  TeamRole,
} from '../../../../packages/schemas/src/index.js'

export const LEGACY_TEAM_LOGO_MARKS = [
  'shield',
  'bolt',
  'gear',
  'star',
  'wedge',
  'crosshair',
] as const

export type LegacyTeamLogoMark = (typeof LEGACY_TEAM_LOGO_MARKS)[number]

export type LegacyTeamIdentity = {
  name: string
  primaryColor: string
  logo?: {
    mark: LegacyTeamLogoMark
    initials?: string
  }
}

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

export const DEFAULT_TEAM_IDENTITIES: Record<TeamRole, LegacyTeamIdentity> = {
  red: { name: 'Red Team', primaryColor: '#ff4c5d', logo: { mark: 'shield', initials: 'R' } },
  blue: { name: 'Blue Team', primaryColor: '#5b9dff', logo: { mark: 'shield', initials: 'B' } },
}

export function resolveTeamIdentity(
  role: TeamRole,
  identity: LegacyTeamIdentity | null | undefined,
): LegacyTeamIdentity {
  return identity ?? DEFAULT_TEAM_IDENTITIES[role]
}

export function teamLogoInitials(
  role: TeamRole,
  identity: LegacyTeamIdentity | null | undefined,
): string {
  const resolved = resolveTeamIdentity(role, identity)
  const initials = resolved.logo?.initials?.trim()

  if (initials) {
    return initials.slice(0, 4).toUpperCase()
  }

  return resolved.name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, '')[0])
    .filter(Boolean)
    .join('')
    .slice(0, 4)
    .toUpperCase() || role[0].toUpperCase()
}

export function resolveTeamAccentHex(
  role: TeamRole,
  identity: LegacyTeamIdentity | null | undefined,
): string {
  const color = resolveTeamIdentity(role, identity).primaryColor.trim()

  return HEX_COLOR_PATTERN.test(color) ? color.toLowerCase() : DEFAULT_TEAM_IDENTITIES[role].primaryColor
}

export function createTeamAccentCssVars(
  role: TeamRole,
  identity: LegacyTeamIdentity | null | undefined,
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
  identity: LegacyTeamIdentity | null | undefined,
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
