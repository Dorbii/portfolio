import { attachMesh } from '../../rendering/meshHelpers'
import type { UtilityPartRenderArgs } from './types'
import { createUtilityFrame } from './utilityFrame'

export function createPlainUtilityPart(args: UtilityPartRenderArgs): void {
  const { parent, material } = args
  const box = createUtilityFrame(args)

  attachMesh(box, parent, material)
}
