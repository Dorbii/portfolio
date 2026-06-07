import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { UtilityPartRenderArgs } from './types'
import { attachUtilityMesh, createUtilityFrame } from './utilityFrame'

export function createSmokeUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  const box = createUtilityFrame(args, 'Smoke')
  const tankY = Math.max(height * 0.52, 0.3)

  const canister = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-smoke-pressure-canister`,
    {
      height: Math.max(width * 0.6, 0.34),
      diameter: Math.max(depth * 0.42, 0.24),
      tessellation: 18,
    },
    scene,
  )
  const topValve = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-smoke-top-valve`,
    {
      height: Math.max(height * 0.14, 0.08),
      diameter: Math.max(width * 0.14, 0.08),
      tessellation: 12,
    },
    scene,
  )
  const warningBand = MeshBuilder.CreateBox(
    `${role}-${blockId}-smoke-warning-band`,
    {
      width: Math.max(width * 0.5, 0.28),
      height: Math.max(height * 0.035, 0.024),
      depth: Math.max(depth * 0.44, 0.25),
    },
    scene,
  )
  const retainingStrap = MeshBuilder.CreateBox(
    `${role}-${blockId}-smoke-rubber-retaining-strap`,
    {
      width: Math.max(width * 0.68, 0.38),
      height: Math.max(height * 0.06, 0.036),
      depth: Math.max(depth * 0.1, 0.06),
    },
    scene,
  )
  const pressureGauge = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-smoke-cracked-pressure-gauge-glass`,
    {
      height: Math.max(depth * 0.045, 0.03),
      diameter: Math.max(width * 0.16, 0.09),
      tessellation: 16,
    },
    scene,
  )
  const gaugeNeedle = MeshBuilder.CreateBox(
    `${role}-${blockId}-smoke-pressure-gauge-needle`,
    {
      width: Math.max(width * 0.1, 0.06),
      height: Math.max(height * 0.011, 0.008),
      depth: Math.max(depth * 0.012, 0.008),
    },
    scene,
  )
  const pullPinRing = MeshBuilder.CreateTorus(
    `${role}-${blockId}-smoke-pull-pin-ring`,
    {
      diameter: Math.max(width * 0.15, 0.09),
      thickness: Math.max(width * 0.012, 0.008),
      tessellation: 14,
    },
    scene,
  )

  canister.rotation.z = Math.PI / 2
  canister.position.set(0, tankY, -Math.max(depth * 0.08, 0.05))
  topValve.position.set(0, tankY + Math.max(height * 0.26, 0.15), -Math.max(depth * 0.08, 0.05))
  warningBand.position.set(0, tankY, Math.max(depth * 0.08, 0.05))
  retainingStrap.position.set(0, tankY, -Math.max(depth * 0.28, 0.16))
  pressureGauge.rotation.x = Math.PI / 2
  pressureGauge.position.set(Math.max(width * 0.26, 0.15), tankY + Math.max(height * 0.15, 0.09), Math.max(depth * 0.18, 0.1))
  gaugeNeedle.position.copyFrom(pressureGauge.position)
  gaugeNeedle.position.z += Math.max(depth * 0.03, 0.018)
  gaugeNeedle.rotation.z = -0.6
  pullPinRing.rotation.x = Math.PI / 2
  pullPinRing.position.set(-Math.max(width * 0.22, 0.13), topValve.position.y, topValve.position.z)
  attachUtilityMesh(canister, parent, materials.steel, 'weapon_edge')
  attachUtilityMesh(topValve, parent, materials.warning, 'trim')
  attachUtilityMesh(warningBand, parent, material, 'damageable')
  attachUtilityMesh(retainingStrap, parent, materials.rubber, 'rubber')
  attachUtilityMesh(pressureGauge, parent, materials.profile.emissive_led_glass, 'glass')
  attachUtilityMesh(gaugeNeedle, parent, materials.warning, 'trim')
  attachUtilityMesh(pullPinRing, parent, materials.steel, 'weapon_edge')

  const nozzleRack = MeshBuilder.CreateBox(
    `${role}-${blockId}-smoke-nozzle-rack`,
    {
      width: Math.max(width * 0.68, 0.34),
      height: Math.max(height * 0.12, 0.07),
      depth: Math.max(depth * 0.16, 0.09),
    },
    scene,
  )

  nozzleRack.position.set(0, Math.max(height * 0.48, 0.27), Math.max(depth * 0.44, 0.26))
  attachUtilityMesh(nozzleRack, parent, materials.trim, 'trim')

  for (let index = -1; index <= 1; index += 1) {
    const nozzle = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-smoke-nozzle-${index + 1}`,
      {
        height: Math.max(depth * 0.24, 0.14),
        diameterTop: Math.max(width * 0.12, 0.07),
        diameterBottom: Math.max(width * 0.075, 0.045),
        tessellation: 10,
      },
      scene,
    )
    const pipe = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-smoke-feed-pipe-${index + 1}`,
      {
        height: Math.max(depth * 0.28, 0.16),
        diameter: Math.max(width * 0.032, 0.022),
        tessellation: 8,
      },
      scene,
    )
    const shroud = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-smoke-sooted-nozzle-shroud-${index + 1}`,
      {
        height: Math.max(depth * 0.055, 0.034),
        diameter: Math.max(width * 0.15, 0.09),
        tessellation: 12,
      },
      scene,
    )

    nozzle.rotation.x = Math.PI / 2
    pipe.rotation.x = Math.PI / 2
    shroud.rotation.x = Math.PI / 2
    nozzle.position.set(index * Math.max(width * 0.18, 0.1), nozzleRack.position.y, Math.max(depth * 0.62, 0.38))
    pipe.position.set(nozzle.position.x, Math.max(height * 0.48, 0.27), Math.max(depth * 0.26, 0.16))
    shroud.position.set(nozzle.position.x, nozzle.position.y, nozzle.position.z - Math.max(depth * 0.08, 0.05))
    attachUtilityMesh(nozzle, parent, materials.steel, 'weapon_edge')
    attachUtilityMesh(pipe, parent, materials.rubber, 'rubber')
    attachUtilityMesh(shroud, parent, materials.trim, 'trim')
  }

  for (let index = 0; index < 3; index += 1) {
    const puff = MeshBuilder.CreateSphere(
      `${role}-${blockId}-smoke-diffuse-puff-${index}`,
      { diameter: Math.max(width * (0.24 + index * 0.07), 0.16), segments: 10 },
      scene,
    )

    puff.position.set((index - 1) * 0.1, Math.max(height * 0.42, 0.25) + index * 0.07, Math.max(depth * 0.78, 0.46) + index * 0.04)
    puff.metadata = { kind: 'smoke', speed: 0.035 + index * 0.01 }
    attachUtilityMesh(puff, parent, materials.trim, 'trim')
  }

  attachUtilityMesh(box, parent, materials.utility, 'damageable')
}
