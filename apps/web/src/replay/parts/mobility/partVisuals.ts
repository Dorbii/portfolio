export type WheelVisual = {
  diameterScale: number
  widthScale: number
  rimScale: number
  hubScale: number
  motorScale: number
  treadCount: number
  treadScale: number
  tessellation: number
  rollSpeed: number
}

export type TreadVisual = {
  baseWidthScale: number
  baseHeightScale: number
  baseDepthScale: number
  topWidthScale: number
  topHeightScale: number
  topDepthScale: number
  shroudHeightScale: number
  shroudDepthScale: number
  padCount: number
  rollerCount: number
  rollerScale: number
  suspensionScale: number
  rollSpeed: number
}

type WheelVisualPartId =
  | 'Wheel_Small'
  | 'Wheel_Medium'
  | 'Wheel_Large'
  | 'Wheel_Mecanum'
  | 'Wheel_Omni'
  | 'Wheel_Spiked'

type TreadVisualPartId =
  | 'Tread_Heavy'
  | 'Wheel_Tank'

const DEFAULT_WHEEL_VISUAL: WheelVisual = {
  diameterScale: 1,
  widthScale: 0.9,
  rimScale: 0.17,
  hubScale: 0.32,
  motorScale: 1,
  treadCount: 8,
  treadScale: 0.9,
  tessellation: 22,
  rollSpeed: 0.2,
}

const WHEEL_VISUALS: Record<WheelVisualPartId, WheelVisual> = {
  Wheel_Small: {
    diameterScale: 0.9,
    widthScale: 0.74,
    rimScale: 0.16,
    hubScale: 0.32,
    motorScale: 0.7,
    treadCount: 8,
    treadScale: 0.75,
    tessellation: 18,
    rollSpeed: 0.26,
  },
  Wheel_Medium: {
    diameterScale: 1.0,
    widthScale: 0.9,
    rimScale: 0.17,
    hubScale: 0.34,
    motorScale: 0.95,
    treadCount: 9,
    treadScale: 0.9,
    tessellation: 22,
    rollSpeed: 0.21,
  },
  Wheel_Large: {
    diameterScale: 1.08,
    widthScale: 1.08,
    rimScale: 0.2,
    hubScale: 0.42,
    motorScale: 1.22,
    treadCount: 10,
    treadScale: 1.08,
    tessellation: 28,
    rollSpeed: 0.16,
  },
  Wheel_Omni: {
    diameterScale: 1.0,
    widthScale: 0.9,
    rimScale: 0.13,
    hubScale: 0.28,
    motorScale: 0.82,
    treadCount: 6,
    treadScale: 0.56,
    tessellation: 22,
    rollSpeed: 0.3,
  },
  Wheel_Mecanum: {
    diameterScale: 1.04,
    widthScale: 1.05,
    rimScale: 0.14,
    hubScale: 0.34,
    motorScale: 0.92,
    treadCount: 8,
    treadScale: 0.72,
    tessellation: 22,
    rollSpeed: 0.28,
  },
  Wheel_Spiked: {
    diameterScale: 1.0,
    widthScale: 0.96,
    rimScale: 0.17,
    hubScale: 0.34,
    motorScale: 1,
    treadCount: 8,
    treadScale: 0.9,
    tessellation: 22,
    rollSpeed: 0.19,
  },
}

const DEFAULT_TREAD_VISUAL: TreadVisual = {
  baseWidthScale: 1.24,
  baseHeightScale: 0.48,
  baseDepthScale: 1.42,
  topWidthScale: 1.08,
  topHeightScale: 0.24,
  topDepthScale: 1.16,
  shroudHeightScale: 0.52,
  shroudDepthScale: 1.46,
  padCount: 5,
  rollerCount: 3,
  rollerScale: 0.38,
  suspensionScale: 0.86,
  rollSpeed: 0.064,
}

const TREAD_VISUALS: Record<TreadVisualPartId, TreadVisual> = {
  Tread_Heavy: {
    baseWidthScale: 1.52,
    baseHeightScale: 0.72,
    baseDepthScale: 1.7,
    topWidthScale: 1.42,
    topHeightScale: 0.42,
    topDepthScale: 1.48,
    shroudHeightScale: 0.88,
    shroudDepthScale: 1.86,
    padCount: 7,
    rollerCount: 4,
    rollerScale: 0.5,
    suspensionScale: 1.24,
    rollSpeed: 0.045,
  },
  Wheel_Tank: {
    baseWidthScale: 1.28,
    baseHeightScale: 0.64,
    baseDepthScale: 1.46,
    topWidthScale: 1.16,
    topHeightScale: 0.34,
    topDepthScale: 1.18,
    shroudHeightScale: 0.78,
    shroudDepthScale: 1.48,
    padCount: 5,
    rollerCount: 3,
    rollerScale: 0.44,
    suspensionScale: 1.12,
    rollSpeed: 0.052,
  },
}

export function wheelVisualFor(partId: string): WheelVisual {
  return WHEEL_VISUALS[partId as WheelVisualPartId] ?? DEFAULT_WHEEL_VISUAL
}

export function treadVisualFor(partId: string): TreadVisual {
  return TREAD_VISUALS[partId as TreadVisualPartId] ?? DEFAULT_TREAD_VISUAL
}
