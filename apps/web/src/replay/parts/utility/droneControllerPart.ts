import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { UtilityPartRenderArgs } from './types'
import { attachUtilityMesh, createPcbConnectorDetails, createUtilityFrame } from './utilityFrame'

export function createDroneControllerUtilityPart(args: UtilityPartRenderArgs): void {
  const { scene, parent, material, role, blockId, width, height, depth, materials } = args
  const box = createUtilityFrame(args, 'Drone')
  const deckY = Math.max(height * 0.62, 0.34)
  const antennaX = -Math.max(width * 0.24, 0.14)
  const bayZ = Math.max(depth * 0.3, 0.18)

  const commandDeck = MeshBuilder.CreateBox(
    `${role}-${blockId}-drone-controller-pcb-command-deck`,
    {
      width: Math.max(width * 0.66, 0.38),
      height: Math.max(height * 0.075, 0.045),
      depth: Math.max(depth * 0.54, 0.3),
    },
    scene,
  )
  const radioBackplane = MeshBuilder.CreateBox(
    `${role}-${blockId}-drone-armored-radio-backplane`,
    {
      width: Math.max(width * 0.58, 0.32),
      height: Math.max(height * 0.14, 0.08),
      depth: Math.max(depth * 0.12, 0.07),
    },
    scene,
  )
  const signalLens = MeshBuilder.CreateSphere(
    `${role}-${blockId}-drone-command-signal-lens`,
    { diameter: Math.max(width * 0.15, 0.09), segments: 12 },
    scene,
  )
  const antenna = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-drone-antenna`,
    { height: Math.max(height * 0.68, 0.38), diameter: 0.045, tessellation: 8 },
    scene,
  )
  const dish = MeshBuilder.CreateTorus(
    `${role}-${blockId}-drone-dish`,
    { diameter: Math.max(width * 0.44, 0.24), thickness: 0.035, tessellation: 16 },
    scene,
  )
  const feedHorn = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-drone-dish-feed-horn`,
    {
      height: Math.max(depth * 0.16, 0.09),
      diameterTop: Math.max(width * 0.035, 0.024),
      diameterBottom: Math.max(width * 0.09, 0.05),
      tessellation: 10,
    },
    scene,
  )

  commandDeck.position.set(0, deckY, 0)
  radioBackplane.position.set(0, deckY + Math.max(height * 0.16, 0.09), -Math.max(depth * 0.18, 0.1))
  signalLens.position.set(Math.max(width * 0.22, 0.13), radioBackplane.position.y + Math.max(height * 0.02, 0.014), radioBackplane.position.z + Math.max(depth * 0.07, 0.04))
  signalLens.metadata = { kind: 'pulse', speed: 0.018 }
  antenna.position.set(antennaX, Math.max(height * 0.9, 0.48), Math.max(depth * 0.06, 0.04))
  dish.rotation.x = Math.PI / 2
  dish.position.set(antenna.position.x, Math.max(height * 1.24, 0.66), Math.max(depth * 0.16, 0.12))
  feedHorn.rotation.x = Math.PI / 2
  feedHorn.position.set(dish.position.x, dish.position.y, Math.max(depth * 0.34, 0.2))
  attachUtilityMesh(commandDeck, parent, materials.circuit, 'damageable')
  attachUtilityMesh(radioBackplane, parent, materials.trim, 'trim')
  attachUtilityMesh(signalLens, parent, materials.profile.emissive_led_glass, 'glass')
  attachUtilityMesh(antenna, parent, materials.trim, 'trim')
  attachUtilityMesh(dish, parent, materials.light, 'emissive')
  attachUtilityMesh(feedHorn, parent, materials.steel, 'weapon_edge')

  for (let arcIndex = 0; arcIndex < 2; arcIndex += 1) {
    const signalArc = MeshBuilder.CreateTorus(
      `${role}-${blockId}-drone-signal-arc-${arcIndex}`,
      {
        diameter: Math.max(width * (0.34 + arcIndex * 0.14), 0.2),
        thickness: Math.max(width * 0.01, 0.008),
        tessellation: 18,
      },
      scene,
    )

    signalArc.rotation.x = Math.PI / 2
    signalArc.position.set(antenna.position.x, dish.position.y, dish.position.z)
    signalArc.metadata = { kind: 'pulse', speed: 0.012 + arcIndex * 0.006 }
    attachUtilityMesh(signalArc, parent, materials.light, 'emissive')
  }

  for (let side = -1; side <= 1; side += 2) {
    const droneBay = MeshBuilder.CreateBox(
      `${role}-${blockId}-drone-bay-${side}`,
      {
        width: Math.max(width * 0.3, 0.17),
        height: Math.max(height * 0.16, 0.1),
        depth: Math.max(depth * 0.34, 0.18),
      },
      scene,
    )
    const launchRail = MeshBuilder.CreateBox(
      `${role}-${blockId}-drone-launch-rail-${side}`,
      {
        width: Math.max(width * 0.08, 0.05),
        height: Math.max(height * 0.05, 0.03),
        depth: Math.max(depth * 0.44, 0.24),
      },
      scene,
    )
    const microDroneBody = MeshBuilder.CreateBox(
      `${role}-${blockId}-stowed-micro-drone-body-${side}`,
      {
        width: Math.max(width * 0.16, 0.09),
        height: Math.max(height * 0.06, 0.036),
        depth: Math.max(depth * 0.16, 0.09),
      },
      scene,
    )
    const rotor = MeshBuilder.CreateTorus(
      `${role}-${blockId}-drone-rotor-${side}`,
      { diameter: Math.max(width * 0.22, 0.13), thickness: 0.022, tessellation: 14 },
      scene,
    )
    const rotorHub = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-drone-rotor-hub-${side}`,
      {
        height: Math.max(height * 0.035, 0.022),
        diameter: Math.max(width * 0.06, 0.036),
        tessellation: 10,
      },
      scene,
    )

    droneBay.position.set(side * Math.max(width * 0.24, 0.15), Math.max(height * 0.5, 0.28), bayZ)
    launchRail.position.set(side * Math.max(width * 0.34, 0.2), Math.max(height * 0.55, 0.3), bayZ)
    microDroneBody.position.set(droneBay.position.x, Math.max(height * 0.64, 0.34), bayZ)
    rotor.rotation.x = Math.PI / 2
    rotor.position.set(droneBay.position.x, Math.max(height * 0.73, 0.39), bayZ)
    rotor.metadata = { kind: 'spin', axis: 'z', speed: 0.06 }
    rotorHub.position.copyFrom(rotor.position)
    attachUtilityMesh(droneBay, parent, materials.utility, 'damageable')
    attachUtilityMesh(launchRail, parent, materials.steel, 'weapon_edge')
    attachUtilityMesh(microDroneBody, parent, material, 'damageable')
    attachUtilityMesh(rotor, parent, materials.warning, 'trim')
    attachUtilityMesh(rotorHub, parent, materials.steel, 'weapon_edge')
  }

  createPcbConnectorDetails(scene, parent, materials, role, blockId, width, height, depth, deckY)

  attachUtilityMesh(box, parent, material, 'damageable')
}
