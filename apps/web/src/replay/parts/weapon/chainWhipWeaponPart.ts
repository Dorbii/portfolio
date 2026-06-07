import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh } from '../../rendering/meshHelpers'
import type { WeaponPartRenderArgs } from './types'

export function createChainWhipWeaponPart({
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
  const hubY = Math.max(height * 0.42, 0.25)
  const sweepRadius = Math.max(width * 0.58, 0.36)
  const hub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-chain-whip-drive-cylinder`,
    {
      height: Math.max(height * 0.32, 0.18),
      diameter: Math.max(width * 0.28, 0.18),
      tessellation: 20,
    },
    scene,
  )
  const axle = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-chain-whip-center-axle`,
    {
      height: Math.max(height * 0.5, 0.28),
      diameter: Math.max(width * 0.06, 0.038),
      tessellation: 12,
    },
    scene,
  )
  const chainRoot = new TransformNode(`${role}-${blockId}-chain-whip-horizontal-sweep-root`, scene)

  hub.position.y = hubY
  axle.position.y = hubY
  chainRoot.position.set(0, hubY + Math.max(height * 0.03, 0.018), 0)
  chainRoot.metadata = { kind: 'spin', axis: 'y', speed: 0.12 }
  chainRoot.parent = parent
  attachMesh(hub, chainRoot, material)
  attachMesh(axle, chainRoot, materials.steel)

  for (let index = 0; index < 7; index += 1) {
    const link = MeshBuilder.CreateTorus(
      `${role}-${blockId}-chain-whip-single-lash-link-${index}`,
      {
        diameter: Math.max(width * 0.12, 0.075),
        thickness: 0.017,
        tessellation: 10,
      },
      scene,
    )
    const t = index / 6

    link.position.set(
      Math.max(width * 0.18, 0.11) + t * sweepRadius,
      Math.sin(t * Math.PI) * Math.max(height * 0.06, 0.035),
      Math.sin(t * Math.PI * 0.8) * Math.max(depth * 0.1, 0.055),
    )
    link.rotation.y = Math.PI / 2
    link.rotation.z = index % 2 === 0 ? 0 : Math.PI / 2
    attachMesh(link, chainRoot, materials.steel)
  }

  const hook = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-chain-whip-hooked-impact-tip`,
    {
      height: Math.max(width * 0.24, 0.14),
      diameterTop: 0,
      diameterBottom: Math.max(width * 0.1, 0.06),
      tessellation: 8,
    },
    scene,
  )
  const hookBack = MeshBuilder.CreateTorus(
    `${role}-${blockId}-chain-whip-return-hook-loop`,
    {
      diameter: Math.max(width * 0.2, 0.12),
      thickness: 0.022,
      tessellation: 10,
    },
    scene,
  )

  hook.position.set(Math.max(width * 0.86, 0.52), 0, Math.max(depth * 0.06, 0.035))
  hook.rotation.z = -Math.PI / 2
  hookBack.position.set(Math.max(width * 0.72, 0.44), 0, Math.max(depth * 0.04, 0.03))
  hookBack.rotation.y = Math.PI / 2
  attachMesh(hook, chainRoot, materials.warning)
  attachMesh(hookBack, chainRoot, materials.steel)
}
