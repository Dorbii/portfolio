import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'

export function createDrillWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const gearbox = MeshBuilder.CreateBox(
    `${role}-${blockId}-drill-gearbox`,
    {
      width: Math.max(width * 0.66, 0.34),
      height: Math.max(height * 0.46, 0.24),
      depth: Math.max(depth * 0.34, 0.26),
    },
    scene,
  )
  const shaft = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-drill-shaft`,
    {
      height: Math.max(depth * 0.5, 0.32),
      diameter: Math.max(width * 0.16, 0.08),
      tessellation: 12,
    },
    scene,
  )
  const bitRoot = new TransformNode(`${role}-${blockId}-drill-bit-motion-root`, scene)

  const shaftY = Math.max(height * 0.34, 0.22)

  gearbox.position.set(0, shaftY, -Math.max(depth * 0.16, 0.14))
  bitRoot.position.set(0, shaftY, 0)
  bitRoot.metadata = { kind: 'spin', axis: 'z', speed: 0.16 }
  shaft.rotation.x = Math.PI / 2
  shaft.position.z = Math.max(depth * 0.24, 0.2)
  attachMesh(gearbox, parent, material)
  bitRoot.parent = parent
  attachMesh(shaft, bitRoot, materials.steel)

  const bitSegments = 5
  for (let index = 0; index < bitSegments; index += 1) {
    const bit = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-drill-bit-section-${index}`,
      {
        height: Math.max(depth * 0.16, 0.1),
        diameterTop: Math.max(width * (0.34 - index * 0.04), 0.1),
        diameterBottom: Math.max(width * (0.42 - index * 0.04), 0.14),
        tessellation: 14,
      },
      scene,
    )
    const flute = MeshBuilder.CreateBox(
      `${role}-${blockId}-drill-flute-${index}`,
      {
        width: Math.max(width * 0.06, 0.035),
        height: Math.max(height * 0.12, 0.055),
        depth: Math.max(depth * 0.18, 0.1),
      },
      scene,
    )

    bit.rotation.x = Math.PI / 2
    bit.position.z = Math.max(depth * (0.48 + index * 0.13), 0.34 + index * 0.1)
    flute.position.copyFrom(bit.position)
    flute.rotation.z = index * 0.72
    flute.rotation.x = Math.PI / 2
    attachMesh(bit, bitRoot, materials.steel)
    attachMesh(flute, bitRoot, materials.warning)
  }
}
