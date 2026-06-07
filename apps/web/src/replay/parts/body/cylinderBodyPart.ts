import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import { tagPartChildMaterialRole } from '../../rendering/materials'
import {
  createTaggedBoxDetail,
  createTaggedCylinder,
  createTopBoltGrid,
} from './bodyDetails'
import { createRaisedTechCluster } from './techDetails'
import type { BodyPartRenderArgs } from './types'

export function createCylinderBodyPart({
  scene,
  parent,
  material,
  partId,
  width,
  height,
  depth,
  materials,
}: BodyPartRenderArgs): void {
  const diameter = Math.max(width, depth)
  const length = Math.max(partId === 'Body_Cylinder_Large' ? width * 1.2 : width * 0.92, 0.42)
  const radius = diameter * 0.5
  const cylinder = MeshBuilder.CreateCylinder(
    `${parent.name}-armored-cylinder-shell`,
    {
      diameter,
      height: Math.max(length, 0.42),
      tessellation: partId === 'Body_Cylinder_Large' ? 18 : 14,
    },
    scene,
  )

  cylinder.rotation.z = Math.PI / 2
  attachMesh(cylinder, parent, material)
  tagPartChildMaterialRole(cylinder, 'damageable')

  for (let side = -1; side <= 1; side += 2) {
    createTaggedCylinder(scene, parent, materials.steel, `${parent.name}-cylinder-end-cap-${side}`, {
      axis: 'x',
      diameter: diameter * 1.04,
      height: Math.max(length * 0.08, 0.055),
      role: 'trim',
      tessellation: partId === 'Body_Cylinder_Large' ? 18 : 14,
      x: side * length * 0.54,
      y: 0,
      z: 0,
    })
    createTaggedCylinder(scene, parent, materials.trim, `${parent.name}-cylinder-end-hub-${side}`, {
      axis: 'x',
      diameter: diameter * 0.34,
      height: Math.max(length * 0.1, 0.055),
      role: 'trim',
      tessellation: 10,
      x: side * length * 0.59,
      y: 0,
      z: 0,
    })
  }

  for (let index = -1; index <= 1; index += 1) {
    if (index === 0 && partId !== 'Body_Cylinder_Large') {
      continue
    }

    createTaggedCylinder(scene, parent, materials.trim, `${parent.name}-cylinder-hoop-band-${index + 1}`, {
      axis: 'x',
      diameter: diameter * 1.06,
      height: Math.max(length * 0.055, 0.042),
      role: 'trim',
      tessellation: partId === 'Body_Cylinder_Large' ? 18 : 14,
      x: index * length * 0.24,
      y: 0,
      z: 0,
    })
  }

  createTaggedBoxDetail(
    scene,
    parent,
    materials.steel,
    `${parent.name}-cylinder-top-saddle-plate`,
    Math.max(length * 0.48, 0.24),
    0.055,
    Math.max(radius * 0.5, 0.16),
    0,
    radius + Math.max(height * 0.08, 0.04),
    0,
    'trim',
  )
  createTaggedBoxDetail(
    scene,
    parent,
    materials.damageByRole.damageable.light,
    `${parent.name}-cylinder-side-scrape-strip`,
    Math.max(length * 0.36, 0.2),
    0.034,
    Math.max(radius * 0.28, 0.12),
    -length * 0.08,
    radius * 0.62,
    radius * 0.72,
    'damageable',
  )
  createTopBoltGrid(scene, parent, materials.trim, `${parent.name}-cylinder-saddle-bolt`, {
    columns: partId === 'Body_Cylinder_Large' ? 3 : 2,
    depth: Math.max(radius * 0.3, 0.12),
    rows: 2,
    width: Math.max(length * 0.36, 0.18),
    y: radius + Math.max(height * 0.14, 0.075),
  })

  if (partId === 'Body_Cylinder_Large') {
    for (let side = -1; side <= 1; side += 2) {
      createTaggedBoxDetail(
        scene,
        parent,
        materials.trim,
        `${parent.name}-cylinder-saddle-foot-${side}`,
        Math.max(length * 0.22, 0.16),
        Math.max(height * 0.13, 0.065),
        Math.max(radius * 0.28, 0.12),
        side * length * 0.22,
        -radius * 0.58,
        radius * 0.72,
        'trim',
      )
    }
  } else {
    createTaggedBoxDetail(
      scene,
      parent,
      materials.light,
      `${parent.name}-cylinder-compact-status-window`,
      Math.max(length * 0.28, 0.14),
      0.045,
      Math.max(radius * 0.24, 0.09),
      0,
      radius * 0.78,
      radius * 0.72,
      'emissive',
    )
  }

  createRaisedTechCluster(scene, parent, materials, width, height, depth)
}
