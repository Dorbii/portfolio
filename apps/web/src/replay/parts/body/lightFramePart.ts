import {
  createTaggedBoxDetail,
  createTaggedCylinder,
  createTopBoltGrid,
} from './bodyDetails'
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
  const railWidth = Math.max(width * 0.11, 0.075)
  const railHeight = Math.max(height * 0.28, 0.16)
  const railDepth = Math.max(depth * 1.02, 0.66)
  const topY = Math.max(height * 0.32, 0.18)
  const sideX = Math.max(width * 0.45, 0.3)
  const crossDepth = Math.max(depth * 0.11, 0.075)

  for (let side = -1; side <= 1; side += 2) {
    createTaggedBoxDetail(
      scene,
      parent,
      material,
      `${parent.name}-open-frame-long-rail-${side}`,
      railWidth,
      railHeight,
      railDepth,
      side * sideX,
      topY,
      0,
      'damageable',
    )
    createTaggedBoxDetail(
      scene,
      parent,
      materials.trim,
      `${parent.name}-open-frame-upper-lip-${side}`,
      railWidth * 1.3,
      Math.max(railHeight * 0.32, 0.055),
      railDepth * 0.92,
      side * sideX,
      topY + railHeight * 0.58,
      0,
      'trim',
    )
  }

  for (let side = -1; side <= 1; side += 2) {
    createTaggedBoxDetail(
      scene,
      parent,
      materials.steel,
      `${parent.name}-open-frame-crossmember-${side}`,
      Math.max(width * 0.86, 0.58),
      Math.max(height * 0.13, 0.07),
      crossDepth,
      0,
      Math.max(height * 0.38, 0.19),
      side * Math.max(depth * 0.44, 0.27),
      'trim',
    )
  }

  for (let side = -1; side <= 1; side += 2) {
    const diagonal = createTaggedBoxDetail(
      scene,
      parent,
      materials.trim,
      `${parent.name}-open-frame-diagonal-brace-${side}`,
      Math.max(width * 0.78, 0.48),
      Math.max(height * 0.08, 0.05),
      Math.max(depth * 0.08, 0.055),
      0,
      Math.max(height * 0.52, 0.24),
      side * Math.max(depth * 0.18, 0.11),
      'trim',
    )

    diagonal.rotation.y = side * 0.72
  }

  createTaggedBoxDetail(
    scene,
    parent,
    materials.utility,
    `${parent.name}-open-frame-battery-tray`,
    Math.max(width * 0.42, 0.26),
    Math.max(height * 0.16, 0.1),
    Math.max(depth * 0.3, 0.18),
    -Math.max(width * 0.08, 0.04),
    Math.max(height * 0.55, 0.27),
    -Math.max(depth * 0.04, 0.02),
    'damageable',
  )
  createTaggedBoxDetail(
    scene,
    parent,
    materials.warning,
    `${parent.name}-open-frame-lift-point-mark`,
    Math.max(width * 0.24, 0.16),
    0.028,
    Math.max(depth * 0.09, 0.06),
    Math.max(width * 0.2, 0.09),
    Math.max(height * 0.66, 0.32),
    Math.max(depth * 0.16, 0.08),
    'trim',
  )

  for (let side = -1; side <= 1; side += 2) {
    createTaggedCylinder(scene, parent, materials.steel, `${parent.name}-open-frame-tube-pin-${side}`, {
      axis: 'x',
      diameter: Math.max(height * 0.12, 0.055),
      height: Math.max(width * 0.86, 0.52),
      role: 'trim',
      tessellation: 8,
      x: 0,
      y: Math.max(height * 0.18, 0.12),
      z: side * Math.max(depth * 0.43, 0.25),
    })
  }

  createTopBoltGrid(scene, parent, materials.trim, `${parent.name}-open-frame-tray-bolt`, {
    columns: 2,
    depth: Math.max(depth * 0.22, 0.14),
    rows: 2,
    width: Math.max(width * 0.3, 0.18),
    y: Math.max(height * 0.65, 0.32),
  })
  createRaisedTechCluster(scene, parent, materials, width, height, depth)
}
