export const CANONICAL_CAMERA_PRESETS = ['broadcast', 'red', 'blue'] as const

export type CameraPreset = (typeof CANONICAL_CAMERA_PRESETS)[number]

export const CAMERA_PRESET_OPTIONS: { label: string; value: CameraPreset }[] = [
  { label: 'Broadcast', value: 'broadcast' },
  { label: 'Red', value: 'red' },
  { label: 'Blue', value: 'blue' },
]

export function normalizeCameraPreset(value: string | null | undefined): CameraPreset {
  const normalized = value?.trim().toLowerCase()

  if (normalized === 'red' || normalized === 'red_follow') {
    return 'red'
  }

  if (normalized === 'blue' || normalized === 'blue_follow') {
    return 'blue'
  }

  return 'broadcast'
}
