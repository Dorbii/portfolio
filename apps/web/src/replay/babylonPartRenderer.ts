import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import { getPart } from '../../../../packages/catalog/src/index.js'
import type {
  BotBlueprint,
  BlueprintBlock,
  PartCategory,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'

export type TeamMaterialSet = {
  chassis: StandardMaterial
  armor: StandardMaterial
  mobility: StandardMaterial
  weapon: StandardMaterial
  utility: StandardMaterial
  style: StandardMaterial
  trim: StandardMaterial
  rubber: StandardMaterial
  light: StandardMaterial
  warning: StandardMaterial
}

const CELL_SCALE = 0.58
const MAX_RENDERED_BLOCKS = 48

type SurfacePattern = 'panel' | 'armor' | 'mobility' | 'weapon' | 'utility' | 'style' | 'trim' | 'rubber' | 'light' | 'warning'
type TextureDrawingContext = ReturnType<DynamicTexture['getContext']>

type WheelVisual = {
  diameterScale: number
  widthScale: number
  rimScale: number
  hubScale: number
  motorScale: number
  treadCount: number
  treadScale: number
  tessellation: number
  rollSpeed: number
}

type TreadVisual = {
  baseWidthScale: number
  baseHeightScale: number
  baseDepthScale: number
  topWidthScale: number
  topHeightScale: number
  topDepthScale: number
  shroudHeightScale: number
  shroudDepthScale: number
  padCount: number
  rollerCount: number
  rollerScale: number
  suspensionScale: number
  rollSpeed: number
}

type BotBounds = {
  centerX: number
  centerZ: number
  width: number
  depth: number
}

export function createTeamMaterials(
  scene: Scene,
): Record<TeamRole, TeamMaterialSet> {
  return {
    red: {
      chassis: createMaterial(scene, 'red-chassis', '#b72e3b', '#23070a', 0.34, 'panel'),
      armor: createMaterial(scene, 'red-armor', '#e84c5a', '#2b080c', 0.3, 'armor'),
      mobility: createMaterial(scene, 'red-mobility', '#474b4e', '#070808', 0.32, 'mobility'),
      weapon: createMaterial(scene, 'red-weapon', '#f6bd4f', '#4d2a05', 0.36, 'weapon'),
      utility: createMaterial(scene, 'red-utility', '#f47b54', '#321005', 0.34, 'utility'),
      style: createMaterial(scene, 'red-style', '#ff92a8', '#3c1019', 0.4, 'style'),
      trim: createMaterial(scene, 'red-trim', '#17191b', '#050505', 0.26, 'trim'),
      rubber: createMaterial(scene, 'red-rubber', '#0d0e10', '#020202', 0.18, 'rubber'),
      light: createMaterial(scene, 'red-light', '#ff5b68', '#ff1f35', 0.72, 'light'),
      warning: createMaterial(scene, 'red-warning', '#f4c95b', '#5b3605', 0.3, 'warning'),
    },
    blue: {
      chassis: createMaterial(scene, 'blue-chassis', '#1f6fc2', '#051323', 0.34, 'panel'),
      armor: createMaterial(scene, 'blue-armor', '#55a9ff', '#06182d', 0.3, 'armor'),
      mobility: createMaterial(scene, 'blue-mobility', '#3f4c55', '#070b0d', 0.32, 'mobility'),
      weapon: createMaterial(scene, 'blue-weapon', '#f6bd4f', '#3a2503', 0.36, 'weapon'),
      utility: createMaterial(scene, 'blue-utility', '#33c4ca', '#082629', 0.34, 'utility'),
      style: createMaterial(scene, 'blue-style', '#98e5ff', '#09283b', 0.4, 'style'),
      trim: createMaterial(scene, 'blue-trim', '#171b20', '#050608', 0.26, 'trim'),
      rubber: createMaterial(scene, 'blue-rubber', '#0d0f12', '#020203', 0.18, 'rubber'),
      light: createMaterial(scene, 'blue-light', '#58a9ff', '#167cff', 0.78, 'light'),
      warning: createMaterial(scene, 'blue-warning', '#f4c95b', '#4b3205', 0.3, 'warning'),
    },
  }
}

export function createBotNode(
  scene: Scene,
  blueprint: BotBlueprint,
  role: TeamRole,
  materials: TeamMaterialSet,
): TransformNode {
  const root = new TransformNode(`${role}-bot-root`, scene)
  const blocks = blueprint.blocks.slice(0, MAX_RENDERED_BLOCKS)
  const bounds = measureBotBounds(blocks)

  createBotFoundation(scene, root, role, materials, bounds)

  blocks.forEach((block) => {
    const partNode = createPartNode(scene, block, role, materials)
    partNode.parent = root
  })

  return root
}

function measureBotBounds(blocks: BlueprintBlock[]): BotBounds {
  if (blocks.length === 0) {
    return {
      centerX: 0,
      centerZ: 0,
      width: 1.8,
      depth: 2.2,
    }
  }

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY

  blocks.forEach((block) => {
    const part = getPart(block.partId)
    const size = part?.size ?? [1, 1, 1]
    const halfWidth = Math.max(0.22, size[0] * CELL_SCALE) / 2
    const halfDepth = Math.max(0.22, size[2] * CELL_SCALE) / 2
    const x = block.position[0] * CELL_SCALE
    const z = block.position[2] * CELL_SCALE

    minX = Math.min(minX, x - halfWidth)
    maxX = Math.max(maxX, x + halfWidth)
    minZ = Math.min(minZ, z - halfDepth)
    maxZ = Math.max(maxZ, z + halfDepth)
  })

  const width = Math.max(1.55, maxX - minX + 0.62)
  const depth = Math.max(1.8, maxZ - minZ + 0.74)

  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width,
    depth,
  }
}

function heightForCategory(category: PartCategory, cellHeight: number): number {
  const base = cellHeight * CELL_SCALE

  if (category === 'mobility') {
    return Math.max(0.38, base * 0.88)
  }

  if (category === 'weapon') {
    return Math.max(0.48, base * 0.98)
  }

  if (category === 'utility') {
    return Math.max(0.46, base)
  }

  if (category === 'defense') {
    return Math.max(0.36, base * 0.86)
  }

  if (category === 'style') {
    return Math.max(0.28, base * 0.72)
  }

  return Math.max(0.44, base * 0.94)
}

function createBotFoundation(
  scene: Scene,
  root: TransformNode,
  role: TeamRole,
  materials: TeamMaterialSet,
  bounds: BotBounds,
): void {
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

function createPartNode(
  scene: Scene,
  block: BlueprintBlock,
  role: TeamRole,
  materials: TeamMaterialSet,
): TransformNode {
  const part = getPart(block.partId)
  const category = part?.category ?? 'body'
  const size = part?.size ?? [1, 1, 1]
  const partNode = new TransformNode(`${role}-${block.id}`, scene)
  const width = Math.max(0.22, size[0] * CELL_SCALE)
  const height = heightForCategory(category, size[1])
  const depth = Math.max(0.22, size[2] * CELL_SCALE)

  partNode.position = new Vector3(
    block.position[0] * CELL_SCALE,
    0.24 + block.position[1] * CELL_SCALE,
    block.position[2] * CELL_SCALE,
  )
  partNode.rotation = new Vector3(
    degreesToRadians(block.rotation[0]),
    degreesToRadians(block.rotation[1]),
    degreesToRadians(block.rotation[2]),
  )
  partNode.metadata = {
    kind: 'bot_part',
    blockId: block.id,
    partId: block.partId,
    basePosition: [partNode.position.x, partNode.position.y, partNode.position.z],
    baseRotation: [partNode.rotation.x, partNode.rotation.y, partNode.rotation.z],
  }

  const material = materialForCategory(materials, category)

  if (category === 'body') {
    createBodyPart(scene, partNode, material, block.partId, width, height, depth, materials)
  } else if (category === 'mobility') {
    createMobilityPart(scene, partNode, material, role, block.id, block.partId, width, height, depth, materials)
  } else if (category === 'weapon') {
    createWeaponPart(scene, partNode, material, role, block.id, block.partId, width, height, depth, materials)
  } else if (category === 'defense') {
    createDefensePart(scene, partNode, material, role, block.id, block.partId, width, height, depth, materials)
  } else if (category === 'utility') {
    createUtilityPart(scene, partNode, material, role, block.id, block.partId, width, height, depth, materials)
  } else if (category === 'style') {
    createStylePart(scene, partNode, material, role, block.id, block.partId, materials)
  } else {
    createSolidBlock(scene, partNode, material, `${role}-${block.id}-box`, width, height, depth)
  }

  if (category !== 'style') {
    createPartAccents(scene, partNode, role, block.id, category, width, height, depth, materials)
  }

  return partNode
}

function createBodyPart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  partId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  if (partId.includes('Cylinder')) {
    const cylinder = MeshBuilder.CreateCylinder(
      `${parent.name}-chassis-cyl`,
      { height: Math.max(height * 0.95, 0.32), diameter: Math.max(width, depth), tessellation: 18 },
      scene,
    )
    cylinder.rotation.z = Math.PI / 2
    attachMesh(cylinder, parent, material)
    createTopLamp(scene, parent, materials.light, Math.max(width, depth) * 0.52, height * 0.58)
    createRaisedTechCluster(scene, parent, materials, width, height, depth)

    return
  }

  if (partId.includes('Wedge')) {
    const wedge = MeshBuilder.CreateBox(
      `${parent.name}-wedge`,
      { width, height: Math.max(height, 0.35), depth },
      scene,
    )
    wedge.scaling = new Vector3(1.25, 0.9, 1)
    wedge.position.set(0, -height * 0.18, depth * 0.16)
    attachMesh(wedge, parent, material)
    createBoxDetail(
      scene,
      parent,
      materials.trim,
      `${parent.name}-wedge-lip`,
      width * 1.32,
      0.09,
      0.14,
      0,
      height * 0.24,
      depth * 0.66,
    )
    createRaisedTechCluster(scene, parent, materials, width, height, depth)

    return
  }

  if (partId.includes('Heavy')) {
    const core = MeshBuilder.CreateBox(
      `${parent.name}-core`,
      { width, height: Math.max(height, 0.55), depth },
      scene,
    )
    const top = MeshBuilder.CreateBox(
      `${parent.name}-core-top`,
      { width: width * 0.88, height: Math.max(height * 0.45, 0.2), depth: depth * 0.88 },
      scene,
    )

    top.position.y = height * 0.55
    attachMesh(core, parent, material)
    attachMesh(top, parent, material)
    createCornerCaps(scene, parent, materials.trim, width, Math.max(height, 0.55), depth)
    createRaisedTechCluster(scene, parent, materials, width, Math.max(height, 0.55), depth)

    return
  }

  createSolidBlock(scene, parent, material, `${parent.name}-body`, width, height, depth)
  createArmorPanel(scene, parent, material, materials.trim, width, height, depth)
  createRaisedTechCluster(scene, parent, materials, width, height, depth)
}

function createMobilityPart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  partId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  if (partId === 'Leg_Spring') {
    createSpringLegPart(scene, parent, material, role, blockId, width, height, depth, materials)
    return
  }

  if (partId === 'Skid_Plate') {
    createSkidPlatePart(scene, parent, material, role, blockId, width, height, depth, materials)
    return
  }

  if (partId.includes('Tread') || partId.includes('Tank')) {
    createTreadPart(scene, parent, material, role, blockId, partId, width, height, depth, materials)
    return
  }

  createWheelPart(scene, parent, material, role, blockId, partId, width, height, depth, materials)
}

function wheelVisualFor(partId: string): WheelVisual {
  if (partId === 'Wheel_Small') {
    return {
      diameterScale: 0.9,
      widthScale: 0.74,
      rimScale: 0.16,
      hubScale: 0.32,
      motorScale: 0.7,
      treadCount: 8,
      treadScale: 0.75,
      tessellation: 18,
      rollSpeed: 0.26,
    }
  }

  if (partId === 'Wheel_Large') {
    return {
      diameterScale: 1.08,
      widthScale: 1.08,
      rimScale: 0.2,
      hubScale: 0.42,
      motorScale: 1.22,
      treadCount: 10,
      treadScale: 1.08,
      tessellation: 28,
      rollSpeed: 0.16,
    }
  }

  if (partId === 'Wheel_Omni') {
    return {
      diameterScale: 1.0,
      widthScale: 0.9,
      rimScale: 0.13,
      hubScale: 0.28,
      motorScale: 0.82,
      treadCount: 6,
      treadScale: 0.56,
      tessellation: 22,
      rollSpeed: 0.3,
    }
  }

  if (partId === 'Wheel_Spiked') {
    return {
      diameterScale: 1.0,
      widthScale: 0.96,
      rimScale: 0.17,
      hubScale: 0.34,
      motorScale: 1,
      treadCount: 8,
      treadScale: 0.9,
      tessellation: 22,
      rollSpeed: 0.19,
    }
  }

  return {
    diameterScale: 1,
    widthScale: 0.9,
    rimScale: 0.17,
    hubScale: 0.32,
    motorScale: 1,
    treadCount: 8,
    treadScale: 0.9,
    tessellation: 22,
    rollSpeed: 0.2,
  }
}

function treadVisualFor(partId: string): TreadVisual {
  if (partId === 'Tread_Heavy') {
    return {
      baseWidthScale: 1.52,
      baseHeightScale: 0.72,
      baseDepthScale: 1.7,
      topWidthScale: 1.42,
      topHeightScale: 0.42,
      topDepthScale: 1.48,
      shroudHeightScale: 0.88,
      shroudDepthScale: 1.86,
      padCount: 7,
      rollerCount: 4,
      rollerScale: 0.5,
      suspensionScale: 1.24,
      rollSpeed: 0.045,
    }
  }

  if (partId === 'Wheel_Tank') {
    return {
      baseWidthScale: 1.28,
      baseHeightScale: 0.64,
      baseDepthScale: 1.46,
      topWidthScale: 1.16,
      topHeightScale: 0.34,
      topDepthScale: 1.18,
      shroudHeightScale: 0.78,
      shroudDepthScale: 1.48,
      padCount: 5,
      rollerCount: 3,
      rollerScale: 0.44,
      suspensionScale: 1.12,
      rollSpeed: 0.052,
    }
  }

  return {
    baseWidthScale: 1.24,
    baseHeightScale: 0.48,
    baseDepthScale: 1.42,
    topWidthScale: 1.08,
    topHeightScale: 0.24,
    topDepthScale: 1.16,
    shroudHeightScale: 0.52,
    shroudDepthScale: 1.46,
    padCount: 5,
    rollerCount: 3,
    rollerScale: 0.38,
    suspensionScale: 0.86,
    rollSpeed: 0.064,
  }
}

function createTreadPart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  partId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  const visual = treadVisualFor(partId)
  const base = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-base`,
    {
      width: Math.max(width * visual.baseWidthScale, 0.68),
      height: Math.max(height * visual.baseHeightScale, 0.15),
      depth: Math.max(depth * visual.baseDepthScale, 0.7),
    },
    scene,
  )
  const top = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-top`,
    {
      width: Math.max(width * visual.topWidthScale, 0.56),
      height: Math.max(height * visual.topHeightScale, 0.08),
      depth: Math.max(depth * visual.topDepthScale, 0.5),
    },
    scene,
  )

  top.position.y = Math.max(height * (0.26 + visual.topHeightScale), 0.11)
  attachMesh(base, parent, materials.rubber)
  attachMesh(top, parent, material)

  const topStripe = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-top-stripe`,
    {
      width: Math.max(width * visual.topWidthScale * 0.58, 0.34),
      height: Math.max(height * 0.06, 0.04),
      depth: Math.max(depth * 0.16, 0.08),
    },
    scene,
  )

  topStripe.position.set(0, top.position.y + Math.max(height * 0.22, 0.1), Math.max(depth * 0.22, 0.12))
  attachMesh(topStripe, parent, partId === 'Tread_Light' ? materials.utility : materials.warning)

  const linkLeft = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-link-l`,
    {
      width: Math.max(width * 0.18, 0.1),
      height: Math.max(height * 0.32, 0.08),
      depth: Math.max(depth * visual.topDepthScale, 0.5),
    },
    scene,
  )
  const linkRight = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-link-r`,
    {
      width: Math.max(width * 0.18, 0.1),
      height: Math.max(height * 0.32, 0.08),
      depth: Math.max(depth * visual.topDepthScale, 0.5),
    },
    scene,
  )

  linkLeft.position.x = -Math.max(width * 0.54, 0.22)
  linkRight.position.x = Math.max(width * 0.54, 0.22)
  attachMesh(linkLeft, parent, materials.trim)
  attachMesh(linkRight, parent, materials.trim)

  const driveModule = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-drive-module`,
    {
      width: Math.max(width * 0.54 * visual.suspensionScale, 0.32),
      height: Math.max(height * 0.48 * visual.suspensionScale, 0.22),
      depth: Math.max(depth * 0.5 * visual.suspensionScale, 0.28),
    },
    scene,
  )

  driveModule.position.set(0, Math.max(height * 0.68, 0.3), -Math.max(depth * 0.18, 0.12))
  attachMesh(driveModule, parent, partId === 'Tread_Heavy' ? materials.warning : materials.utility)

  for (let side = -1; side <= 1; side += 2) {
    createTreadSideDetails(scene, parent, material, role, blockId, width, height, depth, materials, visual, side)
  }

  for (let index = 0; index < visual.padCount; index += 1) {
    const offset = index - (visual.padCount - 1) / 2
    const treadPad = MeshBuilder.CreateBox(
      `${role}-${blockId}-tread-pad-${index}`,
      {
        width: Math.max(width * visual.topWidthScale * 0.94, 0.48),
        height: Math.max(height * 0.1, 0.05),
        depth: Math.max(depth * 0.12, 0.065),
      },
      scene,
    )

    treadPad.position.set(0, Math.max(height * 0.02, 0.04), offset * Math.max(depth * 0.24, 0.13))
    attachMesh(treadPad, parent, materials.rubber)
  }

  for (let index = 0; index < visual.rollerCount; index += 1) {
    const offset = index - (visual.rollerCount - 1) / 2
    const rollerMesh = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-roller-${index}`,
      {
        height: Math.max(depth * 0.42, 0.16),
        diameter: Math.max(width * visual.rollerScale * (index === 1 ? 0.82 : 1), 0.2),
        tessellation: 16,
      },
      scene,
    )

    rollerMesh.rotation.x = Math.PI / 2
    rollerMesh.position.z = offset * Math.max(depth * 0.5, 0.24)
    rollerMesh.metadata = { kind: 'roll', speed: visual.rollSpeed }
    attachMesh(rollerMesh, parent, materials.rubber)
  }
}

function createTreadSideDetails(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
  visual: TreadVisual,
  side: number,
): void {
  const treadArmorShroud = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-armor-shroud-${side}`,
    {
      width: Math.max(width * 0.16 * visual.suspensionScale, 0.1),
      height: Math.max(height * visual.shroudHeightScale, 0.18),
      depth: Math.max(depth * visual.shroudDepthScale, 0.72),
    },
    scene,
  )
  const cableRail = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-tread-cable-rail-${side}`,
    { height: Math.max(depth * visual.shroudDepthScale * 0.7, 0.5), diameter: 0.032, tessellation: 8 },
    scene,
  )
  const suspensionPod = MeshBuilder.CreateBox(
    `${role}-${blockId}-tread-suspension-pod-${side}`,
    {
      width: Math.max(width * 0.2 * visual.suspensionScale, 0.14),
      height: Math.max(height * 0.72 * visual.suspensionScale, 0.3),
      depth: Math.max(depth * 0.36 * visual.suspensionScale, 0.22),
    },
    scene,
  )
  const shockTower = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-tread-shock-tower-${side}`,
    {
      height: Math.max(height * 0.72 * visual.suspensionScale, 0.34),
      diameter: Math.max(width * 0.09, 0.07),
      tessellation: 8,
    },
    scene,
  )

  treadArmorShroud.position.set(side * Math.max(width * 0.76, 0.34), Math.max(height * 0.22, 0.08), 0)
  cableRail.rotation.x = Math.PI / 2
  cableRail.position.set(side * Math.max(width * 0.4, 0.22), Math.max(height * 0.64, 0.22), 0)
  suspensionPod.position.set(
    side * Math.max(width * 0.46, 0.28),
    Math.max(height * 0.68, 0.3),
    -Math.max(depth * 0.34, 0.18),
  )
  shockTower.position.set(
    side * Math.max(width * 0.3, 0.22),
    Math.max(height * 0.74, 0.34),
    Math.max(depth * 0.24, 0.14),
  )
  shockTower.rotation.z = side * 0.18
  attachMesh(treadArmorShroud, parent, material)
  attachMesh(cableRail, parent, materials.trim)
  attachMesh(suspensionPod, parent, material)
  attachMesh(shockTower, parent, materials.trim)
}

function createWheelPart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  partId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  const visual = wheelVisualFor(partId)
  const diameter = Math.max(width * visual.diameterScale, 0.46)
  const wheelWidth = Math.max(depth * visual.widthScale, 0.2)
  const wheel = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-wheel`,
    {
      height: wheelWidth,
      diameter,
      tessellation: visual.tessellation,
    },
    scene,
  )
  const rim = MeshBuilder.CreateTorus(
    `${role}-${blockId}-wheel-rim`,
    {
      diameter,
      thickness: Math.max(diameter * visual.rimScale, 0.065),
      tessellation: 20,
    },
    scene,
  )

  wheel.rotation.z = Math.PI / 2
  rim.rotation.z = Math.PI / 2
  rim.position.y = 0

  wheel.metadata = { kind: 'roll', speed: visual.rollSpeed }
  wheel.parent = parent
  wheel.material = materials.rubber
  rim.parent = parent
  rim.material = material

  const hub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-wheel-hub`,
    {
      height: Math.max(wheelWidth * 1.14, 0.18),
      diameter: Math.max(diameter * visual.hubScale, 0.16),
      tessellation: 14,
    },
    scene,
  )
  hub.rotation.z = Math.PI / 2
  hub.parent = parent
  hub.material = materials.trim

  const axle = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-wheel-axle`,
    { height: Math.max(wheelWidth * 1.18, 0.28), diameter: Math.max(diameter * 0.12, 0.1), tessellation: 12 },
    scene,
  )
  const motorPod = MeshBuilder.CreateBox(
    `${role}-${blockId}-wheel-motor-pod`,
    {
      width: Math.max(width * 0.48 * visual.motorScale, 0.22),
      height: Math.max(height * 0.5 * visual.motorScale, 0.2),
      depth: Math.max(depth * 0.45 * visual.motorScale, 0.18),
    },
    scene,
  )
  const linkageRail = MeshBuilder.CreateBox(
    `${role}-${blockId}-wheel-linkage-rail`,
    {
      width: Math.max(width * 0.64 * visual.motorScale, 0.3),
      height: Math.max(height * 0.14, 0.08),
      depth: Math.max(depth * 0.2, 0.1),
    },
    scene,
  )

  axle.rotation.x = Math.PI / 2
  motorPod.position.set(0, Math.max(height * 0.78, 0.36), -Math.max(depth * 0.22, 0.12))
  linkageRail.position.set(0, Math.max(height * 1.02, 0.48), Math.max(depth * 0.24, 0.12))
  axle.parent = parent
  axle.material = materials.trim
  attachMesh(motorPod, parent, material)
  attachMesh(linkageRail, parent, materials.trim)

  for (let side = -1; side <= 1; side += 2) {
    const actuator = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-wheel-actuator-${side}`,
      { height: Math.max(height * 0.74 * visual.motorScale, 0.28), diameter: 0.05, tessellation: 8 },
      scene,
    )

    actuator.position.set(
      side * Math.max(width * 0.26, 0.16),
      Math.max(height * 0.82, 0.36),
      Math.max(depth * 0.08, 0.06),
    )
    actuator.rotation.z = side * 0.18
    attachMesh(actuator, parent, materials.trim)
  }

  for (let index = 0; index < visual.treadCount; index += 1) {
    const angle = (Math.PI * 2 * index) / visual.treadCount
    const tread = MeshBuilder.CreateBox(
      `${role}-${blockId}-wheel-tread-${index}`,
      {
        width: Math.max(diameter * 0.16 * visual.treadScale, 0.06),
        height: Math.max(wheelWidth * 0.13, 0.045),
        depth: Math.max(diameter * 0.2 * visual.treadScale, 0.075),
      },
      scene,
    )

    tread.position.set(Math.cos(angle) * diameter * 0.52, 0, Math.sin(angle) * diameter * 0.52)
    tread.rotation.y = angle
    tread.parent = wheel
    tread.material = materials.rubber
  }

  if (partId === 'Wheel_Large') {
    createLargeWheelDetails(scene, wheel, material, role, blockId, diameter, wheelWidth)
  }

  if (partId === 'Wheel_Omni') {
    createOmniWheelRollers(scene, wheel, materials, role, blockId, diameter, wheelWidth)
  }

  if (partId === 'Wheel_Spiked') {
    createSpikedWheelRim(scene, wheel, materials, role, blockId, diameter)
  }
}

function createLargeWheelDetails(
  scene: Scene,
  wheel: Mesh,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  diameter: number,
  wheelWidth: number,
): void {
  const outerBand = MeshBuilder.CreateTorus(
    `${role}-${blockId}-large-wheel-outer-band`,
    {
      diameter: diameter * 1.08,
      thickness: Math.max(diameter * 0.065, 0.08),
      tessellation: 24,
    },
    scene,
  )

  outerBand.rotation.z = Math.PI / 2
  outerBand.parent = wheel
  outerBand.material = material

  for (let index = 0; index < 4; index += 1) {
    const angle = (Math.PI * index) / 4
    const spoke = MeshBuilder.CreateBox(
      `${role}-${blockId}-large-wheel-spoke-${index}`,
      {
        width: Math.max(diameter * 0.08, 0.08),
        height: Math.max(wheelWidth * 0.08, 0.045),
        depth: diameter * 0.82,
      },
      scene,
    )

    spoke.rotation.y = angle
    spoke.parent = wheel
    spoke.material = material
  }
}

function createOmniWheelRollers(
  scene: Scene,
  wheel: Mesh,
  materials: TeamMaterialSet,
  role: TeamRole,
  blockId: string,
  diameter: number,
  wheelWidth: number,
): void {
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const roller = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-omni-roller-${index}`,
      {
        height: Math.max(wheelWidth * 0.62, 0.13),
        diameter: Math.max(diameter * 0.11, 0.07),
        tessellation: 8,
      },
      scene,
    )

    roller.position.set(Math.cos(angle) * diameter * 0.48, 0, Math.sin(angle) * diameter * 0.48)
    roller.rotation.x = Math.PI / 2
    roller.rotation.y = angle + Math.PI / 4
    roller.metadata = { kind: 'roll', speed: 0.1 }
    roller.parent = wheel
    roller.material = materials.warning
  }
}

function createSpikedWheelRim(
  scene: Scene,
  wheel: Mesh,
  materials: TeamMaterialSet,
  role: TeamRole,
  blockId: string,
  diameter: number,
): void {
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const spike = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-wheel-spike-${index}`,
      {
        height: Math.max(diameter * 0.24, 0.12),
        diameterTop: 0,
        diameterBottom: Math.max(diameter * 0.11, 0.06),
        tessellation: 8,
      },
      scene,
    )

    spike.position.set(Math.cos(angle) * diameter * 0.62, 0, Math.sin(angle) * diameter * 0.62)
    spike.rotation.z = -angle
    spike.parent = wheel
    spike.material = materials.warning
  }
}

function createSpringLegPart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  const foot = MeshBuilder.CreateBox(
    `${role}-${blockId}-spring-leg-foot`,
    { width: Math.max(width * 0.72, 0.36), height: 0.08, depth: Math.max(depth * 0.74, 0.34) },
    scene,
  )
  const knee = MeshBuilder.CreateBox(
    `${role}-${blockId}-spring-leg-knee`,
    {
      width: Math.max(width * 0.36, 0.18),
      height: Math.max(height * 0.22, 0.12),
      depth: Math.max(depth * 0.38, 0.18),
    },
    scene,
  )
  const spring = MeshBuilder.CreateTorus(
    `${role}-${blockId}-spring-leg-coil`,
    { diameter: Math.max(width * 0.54, 0.32), thickness: 0.035, tessellation: 18 },
    scene,
  )

  foot.position.y = -Math.max(height * 0.18, 0.12)
  knee.position.y = Math.max(height * 0.5, 0.3)
  spring.rotation.x = Math.PI / 2
  spring.position.y = Math.max(height * 0.24, 0.17)
  spring.metadata = { kind: 'pulse', speed: 0.035 }
  attachMesh(foot, parent, materials.rubber)
  attachMesh(knee, parent, material)
  attachMesh(spring, parent, materials.warning)

  for (let side = -1; side <= 1; side += 2) {
    const strut = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spring-leg-strut-${side}`,
      { height: Math.max(height * 0.82, 0.42), diameter: 0.055, tessellation: 8 },
      scene,
    )

    strut.position.set(side * Math.max(width * 0.24, 0.14), Math.max(height * 0.22, 0.18), 0)
    strut.rotation.z = side * 0.28
    attachMesh(strut, parent, materials.trim)
  }
}

function createSkidPlatePart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  const plate = MeshBuilder.CreateBox(
    `${role}-${blockId}-skid-plate`,
    {
      width: Math.max(width * 1.12, 0.62),
      height: Math.max(height * 0.16, 0.08),
      depth: Math.max(depth * 0.8, 0.36),
    },
    scene,
  )
  const frontLip = MeshBuilder.CreateBox(
    `${role}-${blockId}-skid-plate-lip`,
    {
      width: Math.max(width * 1.02, 0.56),
      height: Math.max(height * 0.22, 0.1),
      depth: Math.max(depth * 0.14, 0.08),
    },
    scene,
  )

  plate.position.y = -Math.max(height * 0.12, 0.08)
  frontLip.position.set(0, Math.max(height * 0.02, 0.04), Math.max(depth * 0.42, 0.2))
  attachMesh(plate, parent, material)
  attachMesh(frontLip, parent, materials.rubber)

  for (let index = -1; index <= 1; index += 1) {
    const skidRib = MeshBuilder.CreateBox(
      `${role}-${blockId}-skid-rib-${index + 1}`,
      {
        width: Math.max(width * 0.14, 0.08),
        height: Math.max(height * 0.08, 0.045),
        depth: Math.max(depth * 0.72, 0.3),
      },
      scene,
    )

    skidRib.position.set(index * Math.max(width * 0.3, 0.18), 0.02, 0)
    attachMesh(skidRib, parent, materials.trim)
  }
}

function createRaisedTechCluster(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  width: number,
  height: number,
  depth: number,
): void {
  const deck = MeshBuilder.CreateBox(
    `${parent.name}-raised-electronics-deck`,
    {
      width: Math.max(width * 0.46, 0.28),
      height: Math.max(height * 0.24, 0.16),
      depth: Math.max(depth * 0.34, 0.24),
    },
    scene,
  )
  const equipmentStack = MeshBuilder.CreateBox(
    `${parent.name}-equipment-stack`,
    {
      width: Math.max(width * 0.28, 0.18),
      height: Math.max(height * 0.48, 0.24),
      depth: Math.max(depth * 0.22, 0.16),
    },
    scene,
  )
  const sensor = MeshBuilder.CreateCylinder(
    `${parent.name}-modular-sensor-pod`,
    {
      height: Math.max(height * 0.22, 0.16),
      diameter: Math.max(Math.min(width, depth) * 0.22, 0.14),
      tessellation: 10,
    },
    scene,
  )
  const electronicsBay = MeshBuilder.CreateBox(
    `${parent.name}-offset-electronics-bay`,
    {
      width: Math.max(width * 0.22, 0.16),
      height: Math.max(height * 0.36, 0.18),
      depth: Math.max(depth * 0.36, 0.18),
    },
    scene,
  )
  const cableRun = MeshBuilder.CreateCylinder(
    `${parent.name}-exposed-cable-run`,
    {
      height: Math.max(depth * 0.72, 0.34),
      diameter: 0.032,
      tessellation: 8,
    },
    scene,
  )

  deck.position.set(-width * 0.08, Math.max(height * 0.9, 0.4), -depth * 0.07)
  equipmentStack.position.set(width * 0.12, Math.max(height * 1.12, 0.54), -depth * 0.08)
  sensor.position.set(width * 0.12, Math.max(height * 1.42, 0.72), depth * 0.12)
  electronicsBay.position.set(width * 0.42, Math.max(height * 0.66, 0.32), -depth * 0.2)
  cableRun.rotation.x = Math.PI / 2
  cableRun.position.set(-width * 0.36, Math.max(height * 0.78, 0.34), 0)
  attachMesh(deck, parent, materials.trim)
  attachMesh(equipmentStack, parent, materials.utility)
  attachMesh(sensor, parent, materials.light)
  attachMesh(electronicsBay, parent, materials.utility)
  attachMesh(cableRun, parent, materials.trim)

  for (let index = -1; index <= 1; index += 1) {
    createBoxDetail(
      scene,
      parent,
      materials.trim,
      `${parent.name}-electronics-fin-${index + 1}`,
      0.035,
      Math.max(height * 0.38, 0.18),
      Math.max(depth * 0.2, 0.12),
      width * 0.2 + index * Math.max(width * 0.075, 0.06),
      Math.max(height * 1.22, 0.58),
      -depth * 0.12,
    )
  }
}

function createWeaponPart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  partId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  const mountPlate = MeshBuilder.CreateBox(
    `${role}-${blockId}-weapon-mount-plate`,
    {
      width: Math.max(width * 0.86, 0.42),
      height: 0.08,
      depth: Math.max(depth * 0.36, 0.24),
    },
    scene,
  )
  const mountRing = MeshBuilder.CreateTorus(
    `${role}-${blockId}-weapon-mount-ring`,
    {
      diameter: Math.max(Math.min(width, depth) * 0.72, 0.38),
      thickness: 0.045,
      tessellation: 18,
    },
    scene,
  )

  mountPlate.position.set(0, Math.max(height * 0.18, 0.12), -Math.max(depth * 0.18, 0.12))
  mountRing.position.set(0, Math.max(height * 0.34, 0.18), 0)
  mountRing.rotation.x = Math.PI / 2
  attachMesh(mountPlate, parent, materials.trim)
  attachMesh(mountRing, parent, materials.warning)

  for (let side = -1; side <= 1; side += 2) {
    const bracket = MeshBuilder.CreateBox(
      `${role}-${blockId}-weapon-side-bracket-${side}`,
      {
        width: Math.max(width * 0.12, 0.08),
        height: Math.max(height * 0.38, 0.18),
        depth: Math.max(depth * 0.3, 0.16),
      },
      scene,
    )

    bracket.position.set(side * Math.max(width * 0.46, 0.26), Math.max(height * 0.34, 0.19), -Math.max(depth * 0.02, 0.02))
    attachMesh(bracket, parent, materials.trim)
  }

  const controlCable = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-weapon-control-cable`,
    { height: Math.max(width * 0.82, 0.36), diameter: 0.03, tessellation: 8 },
    scene,
  )

  controlCable.rotation.z = Math.PI / 2
  controlCable.position.set(0, Math.max(height * 0.58, 0.27), -Math.max(depth * 0.24, 0.12))
  attachMesh(controlCable, parent, materials.trim)

  if (partId.includes('Spinner') || partId.includes('Saw')) {
    const spinnerDiameter = Math.max(Math.max(width, depth) * 1.18, 0.98)
    const spinnerCenterY = Math.max(height * 0.72, 0.42)
    const spinnerCenterZ = Math.max(depth * 0.2, 0.16)
    const disc = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spinner-disc`,
      {
        height: Math.max(height * 0.2, 0.12),
        diameter: spinnerDiameter,
        tessellation: 26,
      },
      scene,
    )
    const hub = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spinner-hub`,
      { height: Math.max(height * 0.3, 0.16), diameter: Math.max(spinnerDiameter * 0.38, 0.26) },
      scene,
    )
    const gearbox = MeshBuilder.CreateBox(
      `${role}-${blockId}-spinner-gearbox`,
      {
        width: Math.max(width * 0.62, 0.42),
        height: Math.max(height * 0.7, 0.34),
        depth: Math.max(depth * 0.38, 0.3),
      },
      scene,
    )
    const upperCowl = MeshBuilder.CreateBox(
      `${role}-${blockId}-spinner-upper-cowl`,
      {
        width: Math.max(width * 0.82, 0.56),
        height: Math.max(height * 0.22, 0.13),
        depth: Math.max(depth * 0.28, 0.2),
      },
      scene,
    )

    disc.rotation.z = Math.PI / 2
    hub.rotation.z = Math.PI / 2
    disc.position.set(0, spinnerCenterY, spinnerCenterZ)
    hub.position.set(0, spinnerCenterY, spinnerCenterZ)
    gearbox.position.set(0, Math.max(height * 0.52, 0.3), -Math.max(depth * 0.24, 0.18))
    upperCowl.position.set(0, Math.max(height * 1.04, 0.58), -Math.max(depth * 0.04, 0.04))
    disc.metadata = { kind: 'spin', speed: 0.15 }
    hub.metadata = { kind: 'spin', speed: 0.15 }
    disc.parent = parent
    hub.parent = parent
    disc.material = materials.trim
    hub.material = material
    attachMesh(gearbox, parent, material)
    attachMesh(upperCowl, parent, materials.trim)

    const forkLeft = MeshBuilder.CreateBox(
      `${role}-${blockId}-spinner-fork-l`,
      { width: Math.max(width * 0.12, 0.08), height: Math.max(height * 0.42, 0.16), depth: Math.max(depth * 1.04, 0.66) },
      scene,
    )
    const forkRight = MeshBuilder.CreateBox(
      `${role}-${blockId}-spinner-fork-r`,
      { width: Math.max(width * 0.12, 0.08), height: Math.max(height * 0.42, 0.16), depth: Math.max(depth * 1.04, 0.66) },
      scene,
    )

    forkLeft.position.set(-Math.max(width * 0.36, 0.24), Math.max(height * 0.18, 0.12), 0.08)
    forkRight.position.set(Math.max(width * 0.36, 0.24), Math.max(height * 0.18, 0.12), 0.08)
    attachMesh(forkLeft, parent, material)
    attachMesh(forkRight, parent, material)

    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6
      const bar = MeshBuilder.CreateBox(
        `${role}-${blockId}-spinner-blade-${index}`,
        { width: Math.max(depth * 0.1, 0.08), height: Math.max(width * 0.18, 0.12), depth: spinnerDiameter * 0.86 },
        scene,
      )

      bar.position.set(0, spinnerCenterY, spinnerCenterZ)
      bar.rotation.x = angle
      attachMesh(bar, parent, materials.warning)
    }

    return
  }

  if (partId.includes('Hammer')) {
    const shaft = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-hammer-shaft`,
      { height: Math.max(height * 1.05, 0.8), diameter: Math.max(width * 0.18, 0.1), tessellation: 12 },
      scene,
    )
    const head = MeshBuilder.CreateBox(
      `${role}-${blockId}-hammer-head`,
      { width: Math.max(width * 1.1, 0.6), height: Math.max(height * 0.24, 0.18), depth: Math.max(depth * 1.7, 0.56) },
      scene,
    )

    shaft.rotation.z = Math.PI / 2
    shaft.position.y = Math.max(height * 0.1, 0.15)
    head.position.set(0, Math.max(height * 0.72, 0.46), 0)
    attachMesh(shaft, parent, materials.trim)
    attachMesh(head, parent, material)

    return
  }

  if (partId.includes('Net')) {
    const barrel = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-net-barrel`,
      {
        height: Math.max(depth * 0.9, 0.62),
        diameter: Math.max(width * 0.62, 0.36),
        tessellation: 18,
      },
      scene,
    )
    const muzzle = MeshBuilder.CreateTorus(
      `${role}-${blockId}-net-muzzle`,
      {
        diameter: Math.max(width * 0.76, 0.42),
        thickness: 0.055,
        tessellation: 18,
      },
      scene,
    )
    const hoop = MeshBuilder.CreateTorus(
      `${role}-${blockId}-net-hoop`,
      {
        diameter: Math.max(width * 1.22, 0.82),
        thickness: 0.045,
        tessellation: 24,
      },
      scene,
    )

    barrel.rotation.x = Math.PI / 2
    muzzle.rotation.x = Math.PI / 2
    hoop.rotation.x = Math.PI / 2
    barrel.position.set(0, Math.max(height * 0.2, 0.18), Math.max(depth * 0.18, 0.2))
    muzzle.position.set(0, Math.max(height * 0.2, 0.18), Math.max(depth * 0.62, 0.45))
    hoop.position.set(0, Math.max(height * 0.34, 0.32), Math.max(depth * 0.88, 0.68))
    attachMesh(barrel, parent, material)
    attachMesh(muzzle, parent, materials.trim)
    attachMesh(hoop, parent, materials.warning)

    for (let side = -1; side <= 1; side += 2) {
      const canister = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-net-canister-${side}`,
        { height: Math.max(depth * 0.62, 0.42), diameter: Math.max(width * 0.22, 0.14), tessellation: 12 },
        scene,
      )

      canister.rotation.x = Math.PI / 2
      canister.position.set(side * Math.max(width * 0.34, 0.24), Math.max(height * 0.2, 0.18), Math.max(depth * 0.18, 0.2))
      attachMesh(canister, parent, materials.trim)
    }

    for (let index = -2; index <= 2; index += 1) {
      const vertical = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-net-vertical-${index + 2}`,
        { height: Math.max(width * 1.05, 0.64), diameter: 0.026, tessellation: 8 },
        scene,
      )
      const horizontal = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-net-horizontal-${index + 2}`,
        { height: Math.max(width * 1.05, 0.64), diameter: 0.026, tessellation: 8 },
        scene,
      )

      vertical.rotation.z = Math.PI / 2
      horizontal.rotation.x = Math.PI / 2
      vertical.position.set(index * Math.max(width * 0.1, 0.055), Math.max(height * 0.34, 0.32), Math.max(depth * 0.88, 0.68))
      horizontal.position.set(0, Math.max(height * 0.34, 0.32) + index * 0.055, Math.max(depth * 0.88, 0.68))
      attachMesh(vertical, parent, materials.warning)
      attachMesh(horizontal, parent, materials.warning)
    }

    for (let index = 0; index < 4; index += 1) {
      const node = MeshBuilder.CreateSphere(
        `${role}-${blockId}-net-corner-node-${index}`,
        { diameter: 0.1, segments: 8 },
        scene,
      )
      const x = index % 2 === 0 ? -Math.max(width * 0.48, 0.32) : Math.max(width * 0.48, 0.32)
      const y = Math.max(height * 0.34, 0.32) + (index < 2 ? -0.28 : 0.28)

      node.position.set(x, y, Math.max(depth * 0.88, 0.68))
      attachMesh(node, parent, materials.light)
    }

    return
  }

  if (partId.includes('Turret')) {
    const base = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-turret-base`,
      {
        height: Math.max(height * 0.48, 0.22),
        diameter: Math.max(Math.max(width, depth), 0.5),
        tessellation: 14,
      },
      scene,
    )
    const barrel = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-turret-barrel`,
      {
        height: Math.max(depth * 0.84, 0.72),
        diameter: Math.max(width * 0.22, 0.14),
        tessellation: 16,
      },
      scene,
    )
    const muzzle = MeshBuilder.CreateTorus(
      `${role}-${blockId}-turret-muzzle`,
      {
        diameter: Math.max(width * 0.34, 0.22),
        thickness: 0.045,
        tessellation: 16,
      },
      scene,
    )
    const shoulder = MeshBuilder.CreateBox(
      `${role}-${blockId}-turret-shoulder`,
      {
        width: Math.max(width * 0.82, 0.5),
        height: Math.max(height * 0.36, 0.22),
        depth: Math.max(depth * 0.46, 0.34),
      },
      scene,
    )

    base.rotation.x = Math.PI / 2
    barrel.rotation.x = Math.PI / 2
    muzzle.rotation.x = Math.PI / 2
    barrel.position.z = Math.max(depth * 0.68, 0.52)
    barrel.position.y = Math.max(height * 0.18, 0.18)
    muzzle.position.set(0, barrel.position.y, Math.max(depth * 1.12, 0.9))
    shoulder.position.y = Math.max(height * 0.42, 0.28)
    attachMesh(base, parent, material)
    attachMesh(shoulder, parent, material)
    attachMesh(barrel, parent, materials.trim)
    attachMesh(muzzle, parent, materials.light)

    for (let side = -1; side <= 1; side += 2) {
      const pod = MeshBuilder.CreateBox(
        `${role}-${blockId}-turret-side-pod-${side}`,
        {
          width: Math.max(width * 0.22, 0.16),
          height: Math.max(height * 0.32, 0.18),
          depth: Math.max(depth * 0.52, 0.3),
        },
        scene,
      )

      pod.position.set(side * Math.max(width * 0.48, 0.3), Math.max(height * 0.36, 0.24), Math.max(depth * 0.24, 0.16))
      attachMesh(pod, parent, material)
    }
    createBoxDetail(
      scene,
      parent,
      materials.light,
      `${role}-${blockId}-turret-eye`,
      Math.max(width * 0.34, 0.18),
      0.08,
      0.08,
      0,
      Math.max(height * 0.48, 0.3),
      Math.max(depth * 0.34, 0.2),
    )

    return
  }

  if (partId.includes('Spear')) {
    const shaft = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spear-shaft`,
      { height: Math.max(depth * 1.15, 0.72), diameter: Math.max(width * 0.16, 0.1), tessellation: 10 },
      scene,
    )
    const tip = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spear-tip`,
      {
        height: Math.max(depth * 0.36, 0.24),
        diameterTop: 0,
        diameterBottom: Math.max(width * 0.28, 0.18),
        tessellation: 12,
      },
      scene,
    )

    shaft.rotation.x = Math.PI / 2
    shaft.position.z = Math.max(depth * 0.48, 0.34)
    tip.rotation.x = Math.PI / 2
    tip.position.z = Math.max(depth * 1.14, 0.74)
    attachMesh(shaft, parent, materials.trim)
    attachMesh(tip, parent, materials.warning)

    return
  }

  if (partId.includes('Flipper') || partId.includes('Grabber') || partId.includes('Ram')) {
    const plate = MeshBuilder.CreateBox(
      `${role}-${blockId}-grabber`,
      {
        width: Math.max(width * 1.25, 0.65),
        height: Math.max(height * 0.3, 0.16),
        depth: Math.max(depth * 1.25, 0.55),
      },
      scene,
    )
    const sideL = MeshBuilder.CreateBox(
      `${role}-${blockId}-grabber-l`,
      {
        width: Math.max(width * 0.18, 0.13),
        height: Math.max(height * 1.05, 0.45),
        depth: Math.max(depth * 0.35, 0.2),
      },
      scene,
    )
    const sideR = MeshBuilder.CreateBox(
      `${role}-${blockId}-grabber-r`,
      {
        width: Math.max(width * 0.18, 0.13),
        height: Math.max(height * 1.05, 0.45),
        depth: Math.max(depth * 0.35, 0.2),
      },
      scene,
    )

    sideL.position.set(-Math.max(width * 0.35, 0.26), Math.max(height * 0.4, 0.22), 0)
    sideR.position.set(Math.max(width * 0.35, 0.26), Math.max(height * 0.4, 0.22), 0)
    attachMesh(plate, parent, material)
    attachMesh(sideL, parent, materials.trim)
    attachMesh(sideR, parent, materials.trim)

    for (let index = -1; index <= 1; index += 1) {
      const tooth = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-grabber-tooth-${index + 1}`,
        {
          height: Math.max(depth * 0.28, 0.2),
          diameterTop: 0,
          diameterBottom: Math.max(width * 0.14, 0.1),
          tessellation: 10,
        },
        scene,
      )

      tooth.rotation.x = Math.PI / 2
      tooth.position.set(index * Math.max(width * 0.24, 0.18), Math.max(height * 0.2, 0.14), Math.max(depth * 0.78, 0.44))
      attachMesh(tooth, parent, materials.warning)
    }

    return
  }

  const weapon = MeshBuilder.CreateBox(
    `${role}-${blockId}-weapon`,
    {
      width: Math.max(width, 0.34),
      height: Math.max(height, 0.24),
      depth: Math.max(depth, 0.68),
    },
    scene,
  )
  weapon.position.z = Math.max(depth * 0.45, 0.32)
  attachMesh(weapon, parent, material)
  createBoxDetail(
    scene,
    parent,
    materials.warning,
    `${role}-${blockId}-weapon-tip`,
    Math.max(width * 0.82, 0.24),
    0.08,
    0.12,
    0,
    Math.max(height * 0.46, 0.16),
    Math.max(depth * 0.86, 0.48),
  )
}

function createDefensePart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  partId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  if (partId.includes('Cage')) {
    const belly = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-belly-armor`,
      { width, height: Math.max(height * 0.28, 0.18), depth },
      scene,
    )
    const leftTruss = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-left-truss`,
      { width: Math.max(width * 0.16, 0.09), height: Math.max(height * 0.46, 0.24), depth: Math.max(depth * 1.08, 0.62) },
      scene,
    )
    const rightTruss = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-right-truss`,
      { width: Math.max(width * 0.16, 0.09), height: Math.max(height * 0.46, 0.24), depth: Math.max(depth * 1.08, 0.62) },
      scene,
    )
    const topShroud = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-top-shroud`,
      { width: Math.max(width * 0.86, 0.6), height: Math.max(height * 0.16, 0.1), depth: Math.max(depth * 0.72, 0.46) },
      scene,
    )
    const leftBrace = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-left-brace`,
      { width: Math.max(width * 0.14, 0.08), height: Math.max(height * 0.18, 0.1), depth: Math.max(depth * 1.12, 0.66) },
      scene,
    )
    const rightBrace = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-right-brace`,
      { width: Math.max(width * 0.14, 0.08), height: Math.max(height * 0.18, 0.1), depth: Math.max(depth * 1.12, 0.66) },
      scene,
    )

    belly.position.y = Math.max(height * 0.08, 0.08)
    leftTruss.position.set(-width * 0.5, Math.max(height * 0.34, 0.2), 0)
    rightTruss.position.set(width * 0.5, Math.max(height * 0.34, 0.2), 0)
    topShroud.position.y = Math.max(height * 0.58, 0.32)
    leftBrace.position.set(-width * 0.23, Math.max(height * 0.44, 0.26), 0)
    rightBrace.position.set(width * 0.23, Math.max(height * 0.44, 0.26), 0)
    leftBrace.rotation.z = 0.34
    rightBrace.rotation.z = -0.34

    attachMesh(belly, parent, material)
    attachMesh(leftTruss, parent, materials.trim)
    attachMesh(rightTruss, parent, materials.trim)
    attachMesh(topShroud, parent, material)
    attachMesh(leftBrace, parent, materials.warning)
    attachMesh(rightBrace, parent, materials.warning)

    return
  }

  const plate = MeshBuilder.CreateBox(
    `${role}-${blockId}-plate`,
    { width: Math.max(width * 0.95, 0.55), height: Math.max(height * 0.2, 0.14), depth: Math.max(depth, 0.5) },
    scene,
  )
  const upperShroud = MeshBuilder.CreateBox(
    `${role}-${blockId}-upper-armor-shroud`,
    {
      width: Math.max(width * 0.62, 0.34),
      height: Math.max(height * 0.14, 0.08),
      depth: Math.max(depth * 0.58, 0.28),
    },
    scene,
  )

  upperShroud.position.set(0, Math.max(height * 0.34, 0.2), -Math.max(depth * 0.08, 0.06))

  if (partId.includes('Front') || partId.includes('Shield')) {
    const brace = MeshBuilder.CreateBox(
      `${role}-${blockId}-front-brace`,
      { width: Math.max(width * 1.05, 0.55), height: Math.max(height * 0.2, 0.16), depth: Math.max(depth * 0.6, 0.3) },
      scene,
    )

    brace.position.z = Math.max(depth * 0.25, 0.2)
    attachMesh(plate, parent, material)
    attachMesh(upperShroud, parent, material)
    attachMesh(brace, parent, materials.trim)

    return
  }

  if (partId.includes('Light') || partId.includes('Reactive')) {
    for (let index = 0; index < 3; index += 1) {
      const spike = MeshBuilder.CreateBox(
        `${role}-${blockId}-def-spike-${index}`,
        {
          width: Math.max(width * 0.2, 0.11),
          height: Math.max(height * 0.9, 0.35),
          depth: Math.max(depth * 0.2, 0.11),
        },
        scene,
      )

      spike.position.set(Math.cos((Math.PI * 2 * index) / 3) * 0.16, Math.max(height * 0.42, 0.25), Math.sin((Math.PI * 2 * index) / 3) * 0.16)
      attachMesh(spike, parent, materials.warning)
    }
  }

  attachMesh(plate, parent, material)
  attachMesh(upperShroud, parent, material)
}

function createUtilityPart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  partId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  const box = MeshBuilder.CreateBox(
    `${role}-${blockId}-utility`,
    {
      width: Math.max(width * 0.85, 0.45),
      height: Math.max(height * 0.85, 0.45),
      depth: Math.max(depth * 0.85, 0.45),
    },
    scene,
  )
  const topBackplane = MeshBuilder.CreateBox(
    `${role}-${blockId}-utility-top-backplane`,
    {
      width: Math.max(width * 0.62, 0.32),
      height: 0.09,
      depth: Math.max(depth * 0.5, 0.24),
    },
    scene,
  )
  const sideCable = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-utility-side-cable`,
    {
      height: Math.max(depth * 0.72, 0.34),
      diameter: 0.03,
      tessellation: 8,
    },
    scene,
  )

  topBackplane.position.set(-width * 0.08, Math.max(height * 0.58, 0.28), -depth * 0.06)
  sideCable.rotation.x = Math.PI / 2
  sideCable.position.set(width * 0.36, Math.max(height * 0.46, 0.24), 0)
  attachMesh(topBackplane, parent, materials.trim)
  attachMesh(sideCable, parent, materials.trim)

  if (partId.includes('Booster')) {
    for (let index = -1; index <= 1; index += 2) {
      const core = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-booster-core-${index}`,
        { height: Math.max(depth * 0.42, 0.22), diameter: Math.max(width * 0.24, 0.16), tessellation: 12 },
        scene,
      )
      const flame = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-booster-flame-${index}`,
        {
          height: Math.max(depth * 0.32, 0.24),
          diameterTop: 0,
          diameterBottom: Math.max(width * 0.2, 0.12),
          tessellation: 12,
        },
        scene,
      )
      const nozzleRing = MeshBuilder.CreateTorus(
        `${role}-${blockId}-booster-nozzle-ring-${index}`,
        {
          diameter: Math.max(width * 0.26, 0.16),
          thickness: 0.035,
          tessellation: 14,
        },
        scene,
      )

      core.rotation.x = Math.PI / 2
      flame.rotation.x = -Math.PI / 2
      nozzleRing.rotation.x = Math.PI / 2
      core.position.set(index * Math.max(width * 0.22, 0.14), Math.max(height * 0.1, 0.12), Math.max(depth * 0.38, 0.24))
      flame.position.set(index * Math.max(width * 0.22, 0.14), Math.max(height * 0.1, 0.12), -Math.max(depth * 0.1, 0.12))
      nozzleRing.position.set(index * Math.max(width * 0.22, 0.14), Math.max(height * 0.1, 0.12), -Math.max(depth * 0.24, 0.18))
      flame.metadata = { kind: 'thrust', speed: 0.09 }
      attachMesh(core, parent, materials.trim)
      attachMesh(nozzleRing, parent, materials.warning)
      attachMesh(flame, parent, materials.light)
    }
  }

  if (partId.includes('Gyro')) {
    const gyroRing = MeshBuilder.CreateTorus(
      `${role}-${blockId}-gyro-ring`,
      {
        diameter: Math.max(Math.max(width, depth) * 0.9, 0.52),
        thickness: Math.max(width * 0.12, 0.07),
        tessellation: 22,
      },
      scene,
    )
    const gyroCore = MeshBuilder.CreateSphere(
      `${role}-${blockId}-gyro-core`,
      { diameter: Math.max(width * 0.34, 0.2), segments: 10 },
      scene,
    )

    gyroRing.rotation.x = Math.PI / 2
    gyroRing.position.y = Math.max(height * 0.18, 0.12)
    gyroRing.metadata = { kind: 'spin', speed: 0.045 }
    gyroCore.position.y = Math.max(height * 0.18, 0.12)
    attachMesh(gyroRing, parent, materials.light)
    attachMesh(gyroCore, parent, materials.trim)
  }

  if (partId.includes('Magnet')) {
    const ring = MeshBuilder.CreateTorus(
      `${role}-${blockId}-magnet-ring`,
      {
        diameter: Math.max(Math.max(width, depth), 0.52),
        thickness: Math.max(width * 0.15, 0.08),
        tessellation: 20,
      },
      scene,
    )
    const leftPole = MeshBuilder.CreateBox(
      `${role}-${blockId}-magnet-left-pole`,
      { width: 0.12, height: Math.max(height * 0.86, 0.46), depth: 0.18 },
      scene,
    )
    const rightPole = MeshBuilder.CreateBox(
      `${role}-${blockId}-magnet-right-pole`,
      { width: 0.12, height: Math.max(height * 0.86, 0.46), depth: 0.18 },
      scene,
    )

    ring.rotation.x = Math.PI / 2
    ring.metadata = { kind: 'pulse', speed: 0.04 }
    leftPole.position.set(-Math.max(width * 0.34, 0.2), 0.04, Math.max(depth * 0.2, 0.12))
    rightPole.position.set(Math.max(width * 0.34, 0.2), 0.04, Math.max(depth * 0.2, 0.12))
    attachMesh(ring, parent, materials.light)
    attachMesh(leftPole, parent, materials.warning)
    attachMesh(rightPole, parent, materials.warning)

    for (let index = 0; index < 2; index += 1) {
      const field = MeshBuilder.CreateTorus(
        `${role}-${blockId}-magnet-field-${index}`,
        {
          diameter: Math.max(Math.max(width, depth) * (1.16 + index * 0.28), 0.7),
          thickness: 0.025,
          tessellation: 22,
        },
        scene,
      )

      field.rotation.x = Math.PI / 2
      field.position.y = 0.02 + index * 0.05
      field.metadata = { kind: 'pulse', speed: 0.035 + index * 0.01 }
      attachMesh(field, parent, materials.light)
    }
  }

  if (partId.includes('Anchor')) {
    for (let side = -1; side <= 1; side += 2) {
      const claw = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-anchor-claw-${side}`,
        {
          height: Math.max(depth * 0.42, 0.28),
          diameterTop: 0,
          diameterBottom: Math.max(width * 0.2, 0.14),
          tessellation: 10,
        },
        scene,
      )

      claw.rotation.x = Math.PI / 2
      claw.rotation.z = side * 0.42
      claw.position.set(side * Math.max(width * 0.28, 0.2), Math.max(height * 0.1, 0.12), Math.max(depth * 0.28, 0.2))
      attachMesh(claw, parent, materials.warning)
    }
  }

  if (partId.includes('Smoke')) {
    for (let index = 0; index < 3; index += 1) {
      const puff = MeshBuilder.CreateSphere(
        `${role}-${blockId}-smoke-puff-${index}`,
        { diameter: Math.max(width * (0.34 + index * 0.08), 0.22), segments: 10 },
        scene,
      )

      puff.position.set((index - 1) * 0.12, Math.max(height * 0.38, 0.25) + index * 0.08, Math.max(depth * 0.26, 0.22))
      puff.metadata = { kind: 'smoke', speed: 0.04 + index * 0.01 }
      attachMesh(puff, parent, materials.trim)
    }
  }

  if (partId.includes('Sensor') || partId.includes('RepairKit')) {
    const detail = MeshBuilder.CreateBox(
      `${role}-${blockId}-utility-detail`,
      {
        width: Math.max(width * 0.3, 0.12),
        height: Math.max(height * 0.3, 0.12),
        depth: Math.max(depth * 0.7, 0.28),
      },
      scene,
    )
    detail.position.z = Math.max(depth * 0.28, 0.22)
    attachMesh(detail, parent, materials.trim)
  }

  if (partId.includes('Sensor')) {
    const mast = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-sensor-mast`,
      { height: Math.max(height * 0.58, 0.32), diameter: 0.055, tessellation: 8 },
      scene,
    )
    const sensorHead = MeshBuilder.CreateBox(
      `${role}-${blockId}-sensor-head`,
      {
        width: Math.max(width * 0.42, 0.2),
        height: Math.max(height * 0.16, 0.1),
        depth: Math.max(depth * 0.24, 0.14),
      },
      scene,
    )
    const optic = MeshBuilder.CreateSphere(
      `${role}-${blockId}-sensor-optic`,
      { diameter: Math.max(width * 0.18, 0.1), segments: 8 },
      scene,
    )

    mast.position.set(-Math.max(width * 0.22, 0.14), Math.max(height * 0.74, 0.42), 0)
    sensorHead.position.set(mast.position.x, Math.max(height * 1.05, 0.58), Math.max(depth * 0.08, 0.08))
    optic.position.set(mast.position.x, sensorHead.position.y, Math.max(depth * 0.24, 0.16))
    attachMesh(mast, parent, materials.trim)
    attachMesh(sensorHead, parent, material)
    attachMesh(optic, parent, materials.light)
  }

  if (partId.includes('RepairKit')) {
    const serviceArm = MeshBuilder.CreateBox(
      `${role}-${blockId}-repair-service-arm`,
      {
        width: Math.max(width * 0.14, 0.08),
        height: Math.max(height * 0.7, 0.34),
        depth: Math.max(depth * 0.18, 0.1),
      },
      scene,
    )
    const toolNode = MeshBuilder.CreateBox(
      `${role}-${blockId}-repair-tool-node`,
      {
        width: Math.max(width * 0.28, 0.16),
        height: Math.max(height * 0.16, 0.1),
        depth: Math.max(depth * 0.28, 0.16),
      },
      scene,
    )

    serviceArm.position.set(Math.max(width * 0.28, 0.18), Math.max(height * 0.78, 0.4), Math.max(depth * 0.16, 0.1))
    serviceArm.rotation.z = -0.28
    toolNode.position.set(Math.max(width * 0.36, 0.22), Math.max(height * 1.06, 0.58), Math.max(depth * 0.24, 0.16))
    attachMesh(serviceArm, parent, materials.warning)
    attachMesh(toolNode, parent, materials.trim)
  }

  attachMesh(box, parent, material)
}

function createStylePart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
  partId: string,
  materials: TeamMaterialSet,
): void {
  if (partId === 'Style_Flag') {
    createFlagPart(scene, parent, material, role, blockId)
    return
  }

  if (partId.includes('Wings')) {
    const body = MeshBuilder.CreateBox(
      `${role}-${blockId}-wings-body`,
      { width: 0.26, height: 0.16, depth: 0.96 },
      scene,
    )
    const left = MeshBuilder.CreateBox(
      `${role}-${blockId}-wing-l`,
      { width: 0.64, height: 0.14, depth: 0.56 },
      scene,
    )
    const right = MeshBuilder.CreateBox(
      `${role}-${blockId}-wing-r`,
      { width: 0.64, height: 0.14, depth: 0.56 },
      scene,
    )
    left.position.set(-0.45, 0.28, 0.01)
    right.position.set(0.45, 0.28, 0.01)
    left.rotation.z = 0.5
    right.rotation.z = -0.5
    attachMesh(body, parent, material)
    attachMesh(left, parent, materials.light)
    attachMesh(right, parent, materials.light)

    return
  }

  if (partId.includes('DragonHead')) {
    const skull = MeshBuilder.CreateBox(
      `${role}-${blockId}-dragon-head`,
      { width: 0.5, height: 0.32, depth: 0.52 },
      scene,
    )
    const jaw = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-jaw`,
      { height: 0.16, diameter: 0.42, tessellation: 12 },
      scene,
    )
    const hornL = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-horn-l`,
      { height: 0.36, diameterTop: 0, diameterBottom: 0.09, tessellation: 12 },
      scene,
    )
    const hornR = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-dragon-horn-r`,
      { height: 0.36, diameterTop: 0, diameterBottom: 0.09, tessellation: 12 },
      scene,
    )
    jaw.rotation.z = Math.PI / 2
    jaw.position.set(0, -0.1, 0.16)
    hornL.position.set(-0.18, 0.26, 0.01)
    hornR.position.set(0.18, 0.26, 0.01)
    attachMesh(skull, parent, material)
    attachMesh(jaw, parent, materials.trim)
    attachMesh(hornL, parent, materials.warning)
    attachMesh(hornR, parent, materials.warning)

    return
  }

  if (partId.includes('Spikes')) {
    const plate = MeshBuilder.CreateBox(
      `${role}-${blockId}-spike-plate`,
      { width: 0.62, height: 0.08, depth: 0.62 },
      scene,
    )
    attachMesh(plate, parent, material)

    for (let index = 0; index < 4; index += 1) {
      const spike = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-spike-${index}`,
        { height: 0.3, diameterTop: 0, diameterBottom: 0.08, tessellation: 8 },
        scene,
      )
      spike.rotation.z = Math.PI / 2
      spike.position.set(
        (index % 2 === 0 ? -0.2 : 0.2) + (index > 1 ? 0 : 0),
        0.2,
        (index < 2 ? -0.2 : 0.2),
      )
      attachMesh(spike, parent, materials.warning)
    }
    return
  }

  if (partId.includes('Neon')) {
    const strip = MeshBuilder.CreateBox(
      `${role}-${blockId}-neon-strip`,
      { width: 0.68, height: 0.1, depth: 0.12 },
      scene,
    )
    const glow = MeshBuilder.CreateTorus(
      `${role}-${blockId}-neon-halo`,
      { diameter: 0.48, thickness: 0.08, tessellation: 12 },
      scene,
    )
    glow.rotation.x = Math.PI / 2
    glow.position.set(0, 0.33, 0)
    attachMesh(strip, parent, material)
    attachMesh(glow, parent, materials.light)

    return
  }

  if (partId.includes('Crown')) {
    const band = MeshBuilder.CreateTorus(
      `${role}-${blockId}-crown-band`,
      { diameter: 0.52, thickness: 0.12, tessellation: 18 },
      scene,
    )
    for (let index = 0; index < 3; index += 1) {
      const tooth = MeshBuilder.CreateBox(
        `${role}-${blockId}-crown-tooth-${index}`,
        { width: 0.09, height: 0.18, depth: 0.2 },
        scene,
      )
      tooth.position.set(-0.19 + index * 0.19, 0.14, 0)
      attachMesh(tooth, parent, materials.warning)
    }
    band.rotation.x = Math.PI / 2
    attachMesh(band, parent, material)

    return
  }

  if (partId.includes('TrashCan')) {
    const shell = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-trash-shell`,
      {
        height: 0.52,
        diameter: 0.36,
        tessellation: 12,
      },
      scene,
    )
    const lid = MeshBuilder.CreateBox(
      `${role}-${blockId}-trash-lid`,
      { width: 0.24, height: 0.08, depth: 0.46 },
      scene,
    )
    lid.position.set(0, 0.32, 0)
    shell.rotation.z = Math.PI / 2
    attachMesh(shell, parent, material)
    attachMesh(lid, parent, materials.trim)

    return
  }

  createSolidBlock(scene, parent, material, `${role}-${blockId}-style`, 0.5, 0.3, 0.5)
}

function createFlagPart(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  role: TeamRole,
  blockId: string,
): void {
  const pole = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-pole`,
    { height: 0.9, diameter: 0.07, tessellation: 10 },
    scene,
  )
  const flag = MeshBuilder.CreatePlane(
    `${role}-${blockId}-flag`,
    { width: 0.46, height: 0.26 },
    scene,
  )

  pole.rotation.z = Math.PI / 2
  flag.rotation.z = Math.PI / 2
  pole.position.y = 0.15
  flag.position.set(0.24, 0.56, 0)

  attachMesh(pole, parent, material)
  attachMesh(flag, parent, material)
}

function createPartAccents(
  scene: Scene,
  parent: TransformNode,
  role: TeamRole,
  blockId: string,
  category: PartCategory,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  if (category === 'mobility') {
    return
  }

  const topY = Math.max(height * 0.52, 0.16)

  createBoxDetail(
    scene,
    parent,
    materials.trim,
    `${role}-${blockId}-side-rail-l`,
    Math.max(width * 0.16, 0.08),
    0.08,
    Math.max(depth * 0.78, 0.2),
    -Math.max(width * 0.5, 0.18),
    topY,
    0,
  )
  createBoxDetail(
    scene,
    parent,
    materials.trim,
    `${role}-${blockId}-side-rail-r`,
    Math.max(width * 0.16, 0.08),
    0.08,
    Math.max(depth * 0.78, 0.2),
    Math.max(width * 0.5, 0.18),
    topY,
    0,
  )

  if (category === 'body' || category === 'utility') {
    createBoxDetail(
      scene,
      parent,
      materials.light,
      `${role}-${blockId}-status-light`,
      Math.max(width * 0.38, 0.16),
      0.07,
      0.08,
      0,
      Math.max(height * 0.7, 0.22),
      Math.max(depth * 0.42, 0.14),
    )
  }

  for (let index = 0; index < 4; index += 1) {
    const x = index % 2 === 0 ? -width * 0.34 : width * 0.34
    const z = index < 2 ? -depth * 0.34 : depth * 0.34
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-bolt-${index}`,
      { height: 0.045, diameter: 0.075, tessellation: 8 },
      scene,
    )

    bolt.position.set(x, Math.max(height * 0.7, 0.24), z)
    bolt.rotation.x = Math.PI / 2
    attachMesh(bolt, parent, materials.trim)
  }
}

function createArmorPanel(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  trim: StandardMaterial,
  width: number,
  height: number,
  depth: number,
): void {
  createBoxDetail(
    scene,
    parent,
    material,
    `${parent.name}-top-plate`,
    width * 0.72,
    0.06,
    depth * 0.72,
    0,
    Math.max(height * 0.66, 0.23),
    0,
  )
  createBoxDetail(
    scene,
    parent,
    trim,
    `${parent.name}-front-guard`,
    width * 0.88,
    0.12,
    0.12,
    0,
    Math.max(height * 0.22, 0.12),
    Math.max(depth * 0.52, 0.18),
  )
}

function createCornerCaps(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  width: number,
  height: number,
  depth: number,
): void {
  for (let index = 0; index < 4; index += 1) {
    createBoxDetail(
      scene,
      parent,
      material,
      `${parent.name}-corner-cap-${index}`,
      Math.max(width * 0.22, 0.1),
      0.12,
      Math.max(depth * 0.22, 0.1),
      index % 2 === 0 ? -width * 0.42 : width * 0.42,
      Math.max(height * 0.56, 0.26),
      index < 2 ? -depth * 0.42 : depth * 0.42,
    )
  }
}

function createTopLamp(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  radius: number,
  y: number,
): void {
  const lamp = MeshBuilder.CreateBox(
    `${parent.name}-top-lamp`,
    { width: Math.max(radius * 0.55, 0.14), height: 0.07, depth: 0.11 },
    scene,
  )

  lamp.position.set(0, Math.max(y, 0.24), Math.max(radius * 0.3, 0.12))
  attachMesh(lamp, parent, material)
}

function createBoxDetail(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  name: string,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene)

  mesh.position.set(x, y, z)
  attachMesh(mesh, parent, material)

  return mesh
}

function createSolidBlock(
  scene: Scene,
  parent: TransformNode,
  material: StandardMaterial,
  name: string,
  width: number,
  height: number,
  depth: number,
): void {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene)

  attachMesh(mesh, parent, material)
}

function attachMesh(mesh: Mesh, parent: TransformNode, material: StandardMaterial): void {
  mesh.parent = parent
  mesh.material = material
}

function materialForCategory(
  materials: TeamMaterialSet,
  category: PartCategory,
): StandardMaterial {
  if (category === 'defense') {
    return materials.armor
  }

  if (category === 'mobility') {
    return materials.mobility
  }

  if (category === 'weapon') {
    return materials.weapon
  }

  if (category === 'utility') {
    return materials.utility
  }

  if (category === 'style') {
    return materials.style
  }

  return materials.chassis
}

function createMaterial(
  scene: Scene,
  name: string,
  diffuse: string,
  emissive: string,
  specular = 0.34,
  pattern: SurfacePattern = 'panel',
): StandardMaterial {
  const material = new StandardMaterial(name, scene)

  material.diffuseColor = Color3.FromHexString(diffuse)
  material.specularColor = new Color3(specular, specular, Math.max(0.18, specular * 0.86))
  material.emissiveColor = Color3.FromHexString(emissive)
  material.diffuseTexture = createSurfaceTexture(scene, name, diffuse, pattern)

  return material
}

function createSurfaceTexture(
  scene: Scene,
  name: string,
  baseColor: string,
  pattern: SurfacePattern,
): DynamicTexture {
  const texture = new DynamicTexture(`${name}-surface`, { width: 256, height: 256 }, scene, true)
  const context = texture.getContext()
  const dark = rgbaFromHex('#050607', 0.52)
  const light = rgbaFromHex('#f6f0d0', pattern === 'light' ? 0.34 : 0.16)

  context.fillStyle = baseColor
  context.fillRect(0, 0, 256, 256)

  if (pattern === 'rubber' || pattern === 'mobility') {
    drawTreadTexture(context, dark, light)
  } else if (pattern === 'warning' || pattern === 'weapon') {
    drawWarningTexture(context, dark, light)
  } else if (pattern === 'utility') {
    drawUtilityTexture(context, dark, light)
  } else if (pattern === 'light') {
    drawLightTexture(context, light)
  } else {
    drawPanelTexture(context, dark, light, pattern === 'armor' ? 58 : 64)
  }

  drawScuffs(context)
  texture.uScale = pattern === 'rubber' || pattern === 'mobility' ? 3 : 2
  texture.vScale = pattern === 'rubber' || pattern === 'mobility' ? 2.6 : 2
  texture.update(false)

  return texture
}

function drawPanelTexture(
  context: TextureDrawingContext,
  dark: string,
  light: string,
  step: number,
): void {
  context.strokeStyle = dark
  context.lineWidth = 3

  for (let offset = step; offset < 256; offset += step) {
    drawLine(context, offset, 0, offset, 256)
    drawLine(context, 0, offset, 256, offset)
  }

  context.strokeStyle = light
  context.lineWidth = 2

  for (let x = 28; x < 256; x += 68) {
    for (let y = 28; y < 256; y += 68) {
      drawLine(context, x - 8, y, x + 8, y)
      drawLine(context, x, y - 8, x, y + 8)
    }
  }
}

function drawTreadTexture(
  context: TextureDrawingContext,
  dark: string,
  light: string,
): void {
  context.fillStyle = rgbaFromHex('#030303', 0.34)

  for (let y = 8; y < 256; y += 24) {
    context.fillRect(0, y, 256, 10)
  }

  context.strokeStyle = dark
  context.lineWidth = 6

  for (let x = -32; x < 256; x += 34) {
    drawLine(context, x, 256, x + 72, 0)
  }

  context.strokeStyle = light
  context.lineWidth = 2

  for (let x = 20; x < 256; x += 52) {
    drawLine(context, x, 12, x, 244)
  }
}

function drawWarningTexture(
  context: TextureDrawingContext,
  dark: string,
  light: string,
): void {
  context.strokeStyle = rgbaFromHex('#101010', 0.54)
  context.lineWidth = 18

  for (let x = -220; x < 256; x += 52) {
    drawLine(context, x, 256, x + 256, 0)
  }

  context.strokeStyle = dark
  context.lineWidth = 3
  drawLine(context, 0, 42, 256, 42)
  drawLine(context, 0, 214, 256, 214)
  context.strokeStyle = light
  context.lineWidth = 2
  drawLine(context, 20, 128, 236, 128)
}

function drawUtilityTexture(
  context: TextureDrawingContext,
  dark: string,
  light: string,
): void {
  drawPanelTexture(context, dark, light, 72)
  context.strokeStyle = rgbaFromHex('#0a1012', 0.62)
  context.lineWidth = 5

  for (let y = 30; y < 256; y += 56) {
    drawLine(context, 28, y, 228, y)
  }

  context.fillStyle = light

  for (let x = 40; x < 256; x += 72) {
    context.fillRect(x, 112, 18, 18)
  }
}

function drawLightTexture(context: TextureDrawingContext, light: string): void {
  context.strokeStyle = light
  context.lineWidth = 12

  for (let y = 24; y < 256; y += 42) {
    drawLine(context, 0, y, 256, y)
  }
}

function drawScuffs(context: TextureDrawingContext): void {
  context.strokeStyle = rgbaFromHex('#ffffff', 0.13)
  context.lineWidth = 2

  for (let index = 0; index < 18; index += 1) {
    const x = (index * 47 + 19) % 256
    const y = (index * 71 + 31) % 256
    drawLine(context, x, y, x + 18, y + 5)
  }
}

function drawLine(
  context: TextureDrawingContext,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void {
  context.beginPath()
  context.moveTo(fromX, fromY)
  context.lineTo(toX, toY)
  context.stroke()
}

function rgbaFromHex(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}
