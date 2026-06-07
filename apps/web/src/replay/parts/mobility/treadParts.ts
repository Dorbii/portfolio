import type { MobilityPartRenderArgs } from './types'
import { treadVisualFor } from './partVisuals'
import { createStandardTreadPart } from './standardTreadPart'
import { createTankTrackPart } from './tankTrackPart'

export function createTreadPart(args: MobilityPartRenderArgs): void {
  const { partId } = args

  if (partId === 'Wheel_Tank') {
    createTankTrackPart(args)
    return
  }

  createStandardTreadPart(args, treadVisualFor(partId))
}
