import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../packages/schemas/src/index.js'
import { attachMesh } from '../rendering/meshHelpers'
import type {
  BotBounds,
  BotFoundationArchetype,
} from './geometry'
import type { TeamMaterialSet } from '../rendering/materials'

export function createBotFoundation(
  scene: Scene,
  root: TransformNode,
  role: TeamRole,
  materials: TeamMaterialSet,
  bounds: BotBounds,
  archetype: BotFoundationArchetype,
): void {
  if (archetype === 'compact_assault') {
    createCompactAssaultFoundation(scene, root, role, materials, bounds)
    return
  }

  if (archetype === 'long_control') {
    createLongControlFoundation(scene, root, role, materials, bounds)
    return
  }

  const base = MeshBuilder.CreateBox(
    `${role}-foundation-hull`,
    { width: bounds.width, height: 0.2, depth: bounds.depth },
    scene,
  )
  const topPlate = MeshBuilder.CreateBox(
    `${role}-foundation-top-armor`,
    { width: bounds.width * 0.78, height: 0.08, depth: bounds.depth * 0.72 },
    scene,
  )
  const forwardStrikeBar = MeshBuilder.CreateBox(
    `${role}-foundation-forward-strike-bar`,
    { width: bounds.width * 0.94, height: 0.2, depth: 0.16 },
    scene,
  )
  const aftServiceRail = MeshBuilder.CreateBox(
    `${role}-foundation-aft-service-rail`,
    { width: bounds.width * 0.74, height: 0.16, depth: 0.12 },
    scene,
  )

  base.position.set(bounds.centerX, 0.16, bounds.centerZ)
  topPlate.position.set(bounds.centerX, 0.31, bounds.centerZ - bounds.depth * 0.03)
  forwardStrikeBar.position.set(bounds.centerX, 0.28, bounds.centerZ + bounds.depth * 0.55)
  aftServiceRail.position.set(bounds.centerX, 0.26, bounds.centerZ - bounds.depth * 0.53)

  attachMesh(base, root, materials.trim)
  attachMesh(topPlate, root, materials.chassis)
  attachMesh(forwardStrikeBar, root, materials.warning)
  attachMesh(aftServiceRail, root, materials.trim)

  for (let side = -1; side <= 1; side += 2) {
    const armorShroud = MeshBuilder.CreateBox(
      `${role}-foundation-side-armor-shroud-${side}`,
      { width: 0.13, height: 0.18, depth: bounds.depth * 0.9 },
      scene,
    )
    const signalRail = MeshBuilder.CreateBox(
      `${role}-foundation-signal-rail-${side}`,
      { width: 0.06, height: 0.07, depth: bounds.depth * 0.46 },
      scene,
    )

    armorShroud.position.set(bounds.centerX + side * bounds.width * 0.54, 0.28, bounds.centerZ)
    signalRail.position.set(bounds.centerX + side * bounds.width * 0.58, 0.44, bounds.centerZ - bounds.depth * 0.04)
    attachMesh(armorShroud, root, materials.trim)
    attachMesh(signalRail, root, materials.light)
  }

  const prowArmor = MeshBuilder.CreateBox(
    `${role}-foundation-prow-armor`,
    { width: bounds.width * 0.58, height: 0.1, depth: 0.42 },
    scene,
  )
  const lowerStrikeRail = MeshBuilder.CreateBox(
    `${role}-foundation-lower-strike-rail`,
    { width: bounds.width * 0.72, height: 0.08, depth: 0.16 },
    scene,
  )
  const electronicsBay = MeshBuilder.CreateBox(
    `${role}-foundation-electronics-bay`,
    { width: bounds.width * 0.44, height: 0.22, depth: bounds.depth * 0.24 },
    scene,
  )
  const sensorBar = MeshBuilder.CreateBox(
    `${role}-foundation-front-sensor-bar`,
    { width: bounds.width * 0.3, height: 0.08, depth: 0.08 },
    scene,
  )

  prowArmor.position.set(bounds.centerX, 0.42, bounds.centerZ + bounds.depth * 0.34)
  lowerStrikeRail.position.set(bounds.centerX, 0.16, bounds.centerZ + bounds.depth * 0.66)
  electronicsBay.position.set(bounds.centerX, 0.56, bounds.centerZ - bounds.depth * 0.1)
  sensorBar.position.set(bounds.centerX, 0.66, bounds.centerZ + bounds.depth * 0.04)
  attachMesh(prowArmor, root, materials.chassis)
  attachMesh(lowerStrikeRail, root, materials.warning)
  attachMesh(electronicsBay, root, materials.trim)
  attachMesh(sensorBar, root, materials.light)

  const commandDeck = MeshBuilder.CreateBox(
    `${role}-foundation-command-deck`,
    { width: bounds.width * 0.34, height: 0.16, depth: bounds.depth * 0.28 },
    scene,
  )
  const sensorPod = MeshBuilder.CreateCylinder(
    `${role}-foundation-raised-sensor-pod`,
    { height: 0.18, diameter: 0.28, tessellation: 10 },
    scene,
  )
  const opticNode = MeshBuilder.CreateSphere(
    `${role}-foundation-forward-optic-node`,
    { diameter: 0.16, segments: 8 },
    scene,
  )
  const powerBay = MeshBuilder.CreateBox(
    `${role}-foundation-asymmetric-power-bay`,
    { width: bounds.width * 0.24, height: 0.2, depth: bounds.depth * 0.2 },
    scene,
  )
  const commsFin = MeshBuilder.CreateBox(
    `${role}-foundation-comms-fin`,
    { width: 0.08, height: 0.48, depth: 0.28 },
    scene,
  )

  commandDeck.position.set(bounds.centerX - bounds.width * 0.08, 0.75, bounds.centerZ - bounds.depth * 0.04)
  sensorPod.position.set(bounds.centerX + bounds.width * 0.03, 0.92, bounds.centerZ + bounds.depth * 0.1)
  opticNode.position.set(bounds.centerX + bounds.width * 0.03, 0.96, bounds.centerZ + bounds.depth * 0.23)
  powerBay.position.set(bounds.centerX + bounds.width * 0.28, 0.62, bounds.centerZ - bounds.depth * 0.22)
  commsFin.position.set(bounds.centerX - bounds.width * 0.28, 0.87, bounds.centerZ - bounds.depth * 0.18)
  commsFin.rotation.z = role === 'red' ? 0.16 : -0.16
  attachMesh(commandDeck, root, materials.chassis)
  attachMesh(sensorPod, root, materials.trim)
  attachMesh(opticNode, root, materials.light)
  attachMesh(powerBay, root, materials.utility)
  attachMesh(commsFin, root, materials.warning)

  for (let side = -1; side <= 1; side += 2) {
    const upperRail = MeshBuilder.CreateCylinder(
      `${role}-foundation-upper-cable-rail-${side}`,
      { height: bounds.depth * 0.58, diameter: 0.035, tessellation: 8 },
      scene,
    )
    const actuatorPod = MeshBuilder.CreateBox(
      `${role}-foundation-side-actuator-pod-${side}`,
      { width: 0.16, height: 0.26, depth: bounds.depth * 0.22 },
      scene,
    )

    upperRail.rotation.x = Math.PI / 2
    upperRail.position.set(bounds.centerX + side * bounds.width * 0.34, 0.71, bounds.centerZ - bounds.depth * 0.03)
    actuatorPod.position.set(bounds.centerX + side * bounds.width * 0.46, 0.55, bounds.centerZ + bounds.depth * 0.18)
    attachMesh(upperRail, root, materials.trim)
    attachMesh(actuatorPod, root, side === 1 ? materials.utility : materials.chassis)
  }

  for (let side = -1; side <= 1; side += 2) {
    const jaw = MeshBuilder.CreateBox(
      `${role}-foundation-front-jaw-${side}`,
      { width: Math.max(bounds.width * 0.18, 0.26), height: 0.24, depth: bounds.depth * 0.38 },
      scene,
    )
    const rearVent = MeshBuilder.CreateCylinder(
      `${role}-foundation-rear-vent-${side}`,
      { height: 0.28, diameter: 0.18, tessellation: 12 },
      scene,
    )
    const diagnosticNode = MeshBuilder.CreateBox(
      `${role}-foundation-diagnostic-node-${side}`,
      { width: 0.2, height: 0.08, depth: 0.045 },
      scene,
    )

    jaw.position.set(
      bounds.centerX + side * bounds.width * 0.32,
      0.33,
      bounds.centerZ + bounds.depth * 0.49,
    )
    rearVent.position.set(
      bounds.centerX + side * bounds.width * 0.22,
      0.34,
      bounds.centerZ - bounds.depth * 0.64,
    )
    diagnosticNode.position.set(
      bounds.centerX + side * bounds.width * 0.22,
      0.64,
      bounds.centerZ - bounds.depth * 0.08,
    )
    rearVent.rotation.x = Math.PI / 2
    attachMesh(jaw, root, materials.chassis)
    attachMesh(rearVent, root, materials.trim)
    attachMesh(diagnosticNode, root, materials.light)
  }

  const antenna = MeshBuilder.CreateCylinder(
    `${role}-foundation-antenna`,
    { height: 0.64, diameter: 0.035, tessellation: 8 },
    scene,
  )
  const beacon = MeshBuilder.CreateSphere(
    `${role}-foundation-beacon`,
    { diameter: 0.14, segments: 10 },
    scene,
  )

  antenna.position.set(bounds.centerX + bounds.width * 0.24, 0.72, bounds.centerZ + bounds.depth * 0.23)
  antenna.rotation.z = role === 'red' ? 0.18 : -0.18
  beacon.position.set(
    antenna.position.x + (role === 'red' ? 0.06 : -0.06),
    1.06,
    antenna.position.z,
  )
  attachMesh(antenna, root, materials.trim)
  attachMesh(beacon, root, materials.light)
}

function createCompactAssaultFoundation(
  scene: Scene,
  root: TransformNode,
  role: TeamRole,
  materials: TeamMaterialSet,
  bounds: BotBounds,
): void {
  const hullWidth = Math.max(1.42, bounds.width * 0.58)
  const hullDepth = Math.max(1.68, bounds.depth * 0.74)
  const coreHeight = 0.28

  const base = MeshBuilder.CreateBox(
    `${role}-foundation-compact-hull`,
    { width: hullWidth, height: coreHeight, depth: hullDepth },
    scene,
  )
  const prow = MeshBuilder.CreateBox(
    `${role}-foundation-compact-prow`,
    { width: hullWidth * 0.64, height: 0.2, depth: hullDepth * 0.25 },
    scene,
  )
  const weaponPlinth = MeshBuilder.CreateBox(
    `${role}-foundation-compact-weapon-plinth`,
    { width: hullWidth * 0.48, height: 0.24, depth: hullDepth * 0.34 },
    scene,
  )
  const rearBlock = MeshBuilder.CreateBox(
    `${role}-foundation-compact-rear-block`,
    { width: hullWidth * 0.52, height: 0.22, depth: hullDepth * 0.22 },
    scene,
  )
  const topArmor = MeshBuilder.CreateBox(
    `${role}-foundation-compact-top-armor`,
    { width: hullWidth * 0.76, height: 0.08, depth: hullDepth * 0.56 },
    scene,
  )

  base.position.set(bounds.centerX, 0.18, bounds.centerZ)
  prow.position.set(bounds.centerX, 0.34, bounds.centerZ + hullDepth * 0.42)
  weaponPlinth.position.set(bounds.centerX, 0.48, bounds.centerZ - hullDepth * 0.3)
  rearBlock.position.set(bounds.centerX, 0.36, bounds.centerZ - hullDepth * 0.48)
  topArmor.position.set(bounds.centerX, 0.38, bounds.centerZ - hullDepth * 0.03)
  attachMesh(base, root, materials.chassis)
  attachMesh(prow, root, materials.armor)
  attachMesh(weaponPlinth, root, materials.trim)
  attachMesh(rearBlock, root, materials.trim)
  attachMesh(topArmor, root, materials.armor)

  for (let side = -1; side <= 1; side += 2) {
    const cheek = MeshBuilder.CreateBox(
      `${role}-foundation-compact-cheek-${side}`,
      { width: 0.2, height: 0.3, depth: hullDepth * 0.72 },
      scene,
    )
    const lowerSkid = MeshBuilder.CreateBox(
      `${role}-foundation-compact-lower-skid-${side}`,
      { width: 0.14, height: 0.08, depth: hullDepth * 0.92 },
      scene,
    )
    const strikeTooth = MeshBuilder.CreateBox(
      `${role}-foundation-compact-strike-tooth-${side}`,
      { width: hullWidth * 0.18, height: 0.16, depth: 0.2 },
      scene,
    )

    cheek.position.set(bounds.centerX + side * hullWidth * 0.49, 0.32, bounds.centerZ + hullDepth * 0.03)
    lowerSkid.position.set(bounds.centerX + side * hullWidth * 0.57, 0.13, bounds.centerZ)
    strikeTooth.position.set(
      bounds.centerX + side * hullWidth * 0.25,
      0.28,
      bounds.centerZ + hullDepth * 0.58,
    )
    strikeTooth.rotation.y = side * 0.08
    attachMesh(cheek, root, materials.trim)
    attachMesh(lowerSkid, root, materials.rubber)
    attachMesh(strikeTooth, root, materials.warning)
  }

  const tower = MeshBuilder.CreateBox(
    `${role}-foundation-compact-control-tower`,
    { width: hullWidth * 0.22, height: 0.26, depth: hullDepth * 0.18 },
    scene,
  )
  const beacon = MeshBuilder.CreateSphere(
    `${role}-foundation-compact-beacon`,
    { diameter: 0.15, segments: 10 },
    scene,
  )

  tower.position.set(bounds.centerX + hullWidth * 0.18, 0.64, bounds.centerZ - hullDepth * 0.03)
  beacon.position.set(bounds.centerX + hullWidth * 0.18, 0.84, bounds.centerZ + hullDepth * 0.05)
  attachMesh(tower, root, materials.utility)
  attachMesh(beacon, root, materials.light)
}

function createLongControlFoundation(
  scene: Scene,
  root: TransformNode,
  role: TeamRole,
  materials: TeamMaterialSet,
  bounds: BotBounds,
): void {
  const spineWidth = Math.max(1.05, bounds.width * 0.42)
  const spineDepth = Math.max(2.62, bounds.depth * 1.08)
  const outriggerOffset = spineWidth * 0.72

  const spine = MeshBuilder.CreateBox(
    `${role}-foundation-long-spine`,
    { width: spineWidth, height: 0.18, depth: spineDepth },
    scene,
  )
  const nose = MeshBuilder.CreateBox(
    `${role}-foundation-long-sensor-nose`,
    { width: spineWidth * 0.62, height: 0.16, depth: spineDepth * 0.18 },
    scene,
  )
  const rearDeck = MeshBuilder.CreateBox(
    `${role}-foundation-long-rear-deck`,
    { width: spineWidth * 0.78, height: 0.2, depth: spineDepth * 0.2 },
    scene,
  )
  const controlDeck = MeshBuilder.CreateBox(
    `${role}-foundation-long-control-deck`,
    { width: spineWidth * 0.54, height: 0.24, depth: spineDepth * 0.28 },
    scene,
  )

  spine.position.set(bounds.centerX, 0.17, bounds.centerZ)
  nose.position.set(bounds.centerX, 0.31, bounds.centerZ + spineDepth * 0.47)
  rearDeck.position.set(bounds.centerX, 0.34, bounds.centerZ - spineDepth * 0.42)
  controlDeck.position.set(bounds.centerX - spineWidth * 0.08, 0.5, bounds.centerZ - spineDepth * 0.03)
  attachMesh(spine, root, materials.chassis)
  attachMesh(nose, root, materials.utility)
  attachMesh(rearDeck, root, materials.trim)
  attachMesh(controlDeck, root, materials.trim)

  for (let side = -1; side <= 1; side += 2) {
    const rail = MeshBuilder.CreateBox(
      `${role}-foundation-long-outrigger-rail-${side}`,
      { width: 0.12, height: 0.12, depth: spineDepth * 0.82 },
      scene,
    )
    const sensorStrip = MeshBuilder.CreateBox(
      `${role}-foundation-long-sensor-strip-${side}`,
      { width: 0.05, height: 0.08, depth: spineDepth * 0.34 },
      scene,
    )
    const endCap = MeshBuilder.CreateBox(
      `${role}-foundation-long-end-cap-${side}`,
      { width: 0.22, height: 0.14, depth: 0.22 },
      scene,
    )

    rail.position.set(bounds.centerX + side * outriggerOffset, 0.32, bounds.centerZ - spineDepth * 0.02)
    sensorStrip.position.set(
      bounds.centerX + side * (outriggerOffset + 0.08),
      0.46,
      bounds.centerZ + spineDepth * 0.18,
    )
    endCap.position.set(bounds.centerX + side * outriggerOffset, 0.35, bounds.centerZ + spineDepth * 0.48)
    attachMesh(rail, root, materials.trim)
    attachMesh(sensorStrip, root, materials.light)
    attachMesh(endCap, root, materials.utility)
  }

  const launcherCradle = MeshBuilder.CreateBox(
    `${role}-foundation-long-launcher-cradle`,
    { width: spineWidth * 0.42, height: 0.16, depth: spineDepth * 0.18 },
    scene,
  )
  const commsMast = MeshBuilder.CreateCylinder(
    `${role}-foundation-long-comms-mast`,
    { height: 0.56, diameter: 0.035, tessellation: 8 },
    scene,
  )
  const scanner = MeshBuilder.CreateSphere(
    `${role}-foundation-long-scanner`,
    { diameter: 0.14, segments: 10 },
    scene,
  )

  launcherCradle.position.set(bounds.centerX + spineWidth * 0.24, 0.62, bounds.centerZ - spineDepth * 0.22)
  commsMast.position.set(bounds.centerX - spineWidth * 0.32, 0.86, bounds.centerZ + spineDepth * 0.12)
  commsMast.rotation.z = role === 'red' ? 0.12 : -0.12
  scanner.position.set(bounds.centerX - spineWidth * 0.32, 1.14, bounds.centerZ + spineDepth * 0.12)
  attachMesh(launcherCradle, root, materials.weapon)
  attachMesh(commsMast, root, materials.warning)
  attachMesh(scanner, root, materials.light)
}
