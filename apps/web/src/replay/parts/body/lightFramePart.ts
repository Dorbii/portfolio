import { createBoxDetail } from '../../rendering/meshHelpers'
import { createRaisedTechCluster } from './techDetails'
import type { BodyPartRenderArgs } from './types'

export function createLightFrameBodyPart({
  scene,
  parent,
  material,
  width,
  height,
  depth,
  materials,
}: BodyPartRenderArgs): void {

    const railWidth = Math.max(width * 0.14, 0.08)
    const railHeight = Math.max(height * 0.34, 0.18)
    const railDepth = Math.max(depth * 0.96, 0.6)
    const crossDepth = Math.max(depth * 0.14, 0.08)

    for (let side = -1; side <= 1; side += 2) {
      createBoxDetail(
        scene,
        parent,
        material,
        `${parent.name}-light-frame-side-rail-${side}`,
        railWidth,
        railHeight,
        railDepth,
        side * Math.max(width * 0.42, 0.28),
        Math.max(height * 0.22, 0.16),
        0,
      )
    }

    for (let side = -1; side <= 1; side += 2) {
      createBoxDetail(
        scene,
        parent,
        materials.trim,
        `${parent.name}-light-frame-crossmember-${side}`,
        Math.max(width * 0.82, 0.56),
        Math.max(height * 0.16, 0.08),
        crossDepth,
        0,
        Math.max(height * 0.34, 0.18),
        side * Math.max(depth * 0.4, 0.24),
      )
    }

    createBoxDetail(
      scene,
      parent,
      materials.utility,
      `${parent.name}-light-frame-battery-tray`,
      Math.max(width * 0.38, 0.24),
      Math.max(height * 0.24, 0.14),
      Math.max(depth * 0.32, 0.18),
      -Math.max(width * 0.08, 0.04),
      Math.max(height * 0.54, 0.26),
      -Math.max(depth * 0.04, 0.02),
    )
    createRaisedTechCluster(scene, parent, materials, width, height, depth)
}
