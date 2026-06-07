import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'

export function createFlailWeaponPart({
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
  const drum = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flail-drive-drum`,
    {
      height: Math.max(width * 0.72, 0.36),
      diameter: Math.max(height * 0.42, 0.2),
      tessellation: 14,
    },
    scene,
  )
  const y = Math.max(height * 0.42, 0.26)

  drum.rotation.z = Math.PI / 2
  drum.position.set(0, y, -Math.max(depth * 0.22, 0.16))
  attachMesh(drum, parent, material)

  for (let chain = -1; chain <= 1; chain += 2) {
    const chainX = chain * Math.max(width * 0.16, 0.1)
    const chainRoot = new TransformNode(`${role}-${blockId}-flail-chain-root-${chain}`, scene)

    chainRoot.position.set(chainX, y, drum.position.z)
    chainRoot.metadata = { kind: 'spin', axis: 'x', speed: 0.13, phase: chain > 0 ? Math.PI : 0 }
    chainRoot.parent = parent

    for (let index = 0; index < 4; index += 1) {
      const link = MeshBuilder.CreateTorus(
        `${role}-${blockId}-flail-chain-link-${chain}-${index}`,
        {
          diameter: Math.max(width * 0.18, 0.1),
          thickness: 0.022,
          tessellation: 10,
        },
        scene,
      )

      link.rotation.x = Math.PI / 2
      link.rotation.z = index % 2 === 0 ? 0 : Math.PI / 2
      link.position.z = Math.max(depth * (0.18 + index * 0.16), 0.18 + index * 0.1)
      attachMesh(link, chainRoot, materials.steel)
    }

    const ball = MeshBuilder.CreateSphere(
      `${role}-${blockId}-flail-impact-ball-${chain}`,
      { diameter: Math.max(width * 0.28, 0.16), segments: 10 },
      scene,
    )

    ball.position.z = Math.max(depth * 0.9, 0.62)
    attachMesh(ball, chainRoot, materials.steel)

    for (let spike = 0; spike < 4; spike += 1) {
      const angle = (Math.PI * 2 * spike) / 4
      const tooth = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-flail-ball-spike-${chain}-${spike}`,
        {
          height: Math.max(width * 0.16, 0.08),
          diameterTop: 0,
          diameterBottom: Math.max(width * 0.07, 0.04),
          tessellation: 8,
        },
        scene,
      )

      tooth.position.set(
        Math.sin(angle) * Math.max(width * 0.16, 0.08),
        Math.cos(angle) * Math.max(width * 0.16, 0.08),
        ball.position.z,
      )
      tooth.rotation.z = -angle
      attachMesh(tooth, chainRoot, materials.warning)
    }
  }
}
