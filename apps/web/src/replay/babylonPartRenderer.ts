import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
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

export function createTeamMaterials(
  scene: Scene,
): Record<TeamRole, TeamMaterialSet> {
  return {
    red: {
      chassis: createMaterial(scene, 'red-chassis', '#b72e3b', '#23070a'),
      armor: createMaterial(scene, 'red-armor', '#e84c5a', '#2b080c'),
      mobility: createMaterial(scene, 'red-mobility', '#2d3032', '#050606'),
      weapon: createMaterial(scene, 'red-weapon', '#f6bd4f', '#4d2a05'),
      utility: createMaterial(scene, 'red-utility', '#f47b54', '#321005'),
      style: createMaterial(scene, 'red-style', '#ff92a8', '#3c1019'),
      trim: createMaterial(scene, 'red-trim', '#17191b', '#050505'),
      rubber: createMaterial(scene, 'red-rubber', '#0d0e10', '#020202'),
      light: createMaterial(scene, 'red-light', '#ff5b68', '#ff1f35', 0.72),
      warning: createMaterial(scene, 'red-warning', '#f4c95b', '#5b3605'),
    },
    blue: {
      chassis: createMaterial(scene, 'blue-chassis', '#1f6fc2', '#051323'),
      armor: createMaterial(scene, 'blue-armor', '#55a9ff', '#06182d'),
      mobility: createMaterial(scene, 'blue-mobility', '#29333a', '#06090c'),
      weapon: createMaterial(scene, 'blue-weapon', '#f6bd4f', '#3a2503'),
      utility: createMaterial(scene, 'blue-utility', '#33c4ca', '#082629'),
      style: createMaterial(scene, 'blue-style', '#98e5ff', '#09283b'),
      trim: createMaterial(scene, 'blue-trim', '#171b20', '#050608'),
      rubber: createMaterial(scene, 'blue-rubber', '#0d0f12', '#020203'),
      light: createMaterial(scene, 'blue-light', '#58a9ff', '#167cff', 0.78),
      warning: createMaterial(scene, 'blue-warning', '#f4c95b', '#4b3205'),
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

  blueprint.blocks.slice(0, MAX_RENDERED_BLOCKS).forEach((block) => {
    const partNode = createPartNode(scene, block, role, materials)
    partNode.parent = root
  })

  return root
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
  const height = Math.max(0.2, size[1] * CELL_SCALE * 0.72)
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

    return
  }

  if (partId.includes('Wedge')) {
    const wedge = MeshBuilder.CreateBox(
      `${parent.name}-wedge`,
      { width, height: Math.max(height, 0.35), depth },
      scene,
    )
    wedge.scaling = new Vector3(1.25, 0.9, 1)
    wedge.position.set(0, -height * 0.18, -depth * 0.16)
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
      -depth * 0.66,
    )

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

    return
  }

  createSolidBlock(scene, parent, material, `${parent.name}-body`, width, height, depth)
  createArmorPanel(scene, parent, material, materials.trim, width, height, depth)
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
  if (partId.includes('Tread') || partId.includes('Tank')) {
    const base = MeshBuilder.CreateBox(
      `${role}-${blockId}-tread-base`,
      {
        width: Math.max(width * 1.4, 0.72),
        height: Math.max(height * 0.55, 0.15),
        depth: Math.max(depth * 1.55, 0.75),
      },
      scene,
    )
    const top = MeshBuilder.CreateBox(
      `${role}-${blockId}-tread-top`,
      {
        width: Math.max(width * 1.32, 0.64),
        height: Math.max(height * 0.3, 0.09),
        depth: Math.max(depth * 1.35, 0.57),
      },
      scene,
    )

    top.position.y = Math.max(height * 0.37, 0.11)
    attachMesh(base, parent, materials.rubber)
    attachMesh(top, parent, material)

    const linkLeft = MeshBuilder.CreateBox(
      `${role}-${blockId}-tread-link-l`,
      {
        width: width * 0.18,
        height: Math.max(height * 0.32, 0.08),
        depth: Math.max(depth * 1.35, 0.5),
      },
      scene,
    )

    const linkRight = MeshBuilder.CreateBox(
      `${role}-${blockId}-tread-link-r`,
      {
        width: width * 0.18,
        height: Math.max(height * 0.32, 0.08),
        depth: Math.max(depth * 1.35, 0.5),
      },
      scene,
    )
    linkLeft.position.x = Math.max(width * -0.55, -0.22)
    linkRight.position.x = Math.max(width * 0.55, 0.22)
    attachMesh(linkLeft, parent, materials.trim)
    attachMesh(linkRight, parent, materials.trim)

    for (let index = -2; index <= 2; index += 1) {
      const treadPad = MeshBuilder.CreateBox(
        `${role}-${blockId}-tread-pad-${index + 2}`,
        {
          width: Math.max(width * 1.24, 0.54),
          height: Math.max(height * 0.12, 0.055),
          depth: Math.max(depth * 0.14, 0.07),
        },
        scene,
      )

      treadPad.position.set(0, Math.max(height * 0.02, 0.04), index * Math.max(depth * 0.28, 0.13))
      attachMesh(treadPad, parent, materials.rubber)
    }

    const rollerMesh = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-roller`,
      {
        height: Math.max(depth * 0.45, 0.16),
        diameter: Math.max(width * 0.35, 0.2),
        tessellation: 16,
      },
      scene,
    )

    rollerMesh.rotation.x = Math.PI / 2
    rollerMesh.metadata = { kind: 'roll', speed: 0.06 }
    rollerMesh.parent = parent
    rollerMesh.material = materials.rubber

    return
  }

  const wheel = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-wheel`,
    {
      height: Math.max(depth * 0.86, 0.22),
      diameter: Math.max(width * 1.08, 0.52),
      tessellation: 22,
    },
    scene,
  )
  const rim = MeshBuilder.CreateTorus(
    `${role}-${blockId}-wheel-rim`,
    {
      diameter: Math.max(width * 1.08, 0.52),
      thickness: Math.max(width * 0.18, 0.09),
      tessellation: 20,
    },
    scene,
  )

  wheel.rotation.z = Math.PI / 2
  rim.rotation.z = Math.PI / 2
  rim.position.y = 0

  wheel.metadata = { kind: 'roll', speed: 0.2 }
  wheel.parent = parent
  wheel.material = materials.rubber
  rim.parent = parent
  rim.material = material

  const hub = MeshBuilder.CreateBox(
    `${role}-${blockId}-wheel-hub`,
    {
      width: Math.max(width * 0.28, 0.2),
      height: Math.max(depth * 0.12, 0.08),
      depth: Math.max(width * 0.28, 0.2),
    },
    scene,
  )
  hub.parent = parent
  hub.material = materials.trim

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const tread = MeshBuilder.CreateBox(
      `${role}-${blockId}-wheel-tread-${index}`,
      {
        width: Math.max(width * 0.18, 0.08),
        height: Math.max(depth * 0.13, 0.055),
        depth: Math.max(width * 0.22, 0.09),
      },
      scene,
    )

    tread.position.set(Math.cos(angle) * Math.max(width * 0.55, 0.26), 0, Math.sin(angle) * Math.max(width * 0.55, 0.26))
    tread.rotation.y = angle
    tread.parent = wheel
    tread.material = materials.rubber
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
  if (partId.includes('Spinner') || partId.includes('Saw')) {
    const disc = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spinner-disc`,
      {
        height: Math.max(height * 0.2, 0.1),
        diameter: Math.max(Math.max(width, depth), 0.7),
        tessellation: 26,
      },
      scene,
    )
    const hub = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spinner-hub`,
      { height: Math.max(height * 0.28, 0.14), diameter: Math.max(Math.max(width, depth) * 0.45, 0.2) },
      scene,
    )
    disc.rotation.z = Math.PI / 2
    hub.rotation.z = Math.PI / 2
    disc.metadata = { kind: 'spin', speed: 0.15 }
    hub.metadata = { kind: 'spin', speed: 0.15 }
    disc.parent = parent
    hub.parent = parent
    disc.material = materials.trim
    hub.material = material

    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6
      const bar = MeshBuilder.CreateBox(
        `${role}-${blockId}-spinner-blade-${index}`,
        { width: Math.max(depth * 0.1, 0.08), height: Math.max(width * 0.24, 0.15), depth: Math.max(width * 0.85, 0.55) },
        scene,
      )
      bar.position.set(Math.cos(angle) * 0.35, 0, Math.sin(angle) * 0.35)
      bar.rotation.y = angle
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
    const frame = MeshBuilder.CreateBox(
      `${role}-${blockId}-net-frame`,
      { width: Math.max(width * 0.9, 0.5), height: Math.max(height * 0.55, 0.35), depth: Math.max(depth * 0.7, 0.35) },
      scene,
    )
    const string01 = MeshBuilder.CreateBox(
      `${role}-${blockId}-net-string-01`,
      { width: Math.max(width * 1.08, 0.55), height: 0.06, depth: 0.06 },
      scene,
    )
    const string02 = MeshBuilder.CreateBox(
      `${role}-${blockId}-net-string-02`,
      { width: Math.max(width * 1.08, 0.55), height: 0.06, depth: 0.06 },
      scene,
    )

    string01.position.y = Math.max(height * 0.42, 0.25)
    string02.position.y = Math.max(height * 0.24, 0.12)
    string01.parent = parent
    string02.parent = parent
    frame.parent = parent
    frame.material = material
    string01.material = materials.warning
    string02.material = materials.warning

    for (let index = -2; index <= 2; index += 1) {
      const rope = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-net-rope-${index + 2}`,
        { height: Math.max(width * 0.98, 0.5), diameter: 0.035, tessellation: 8 },
        scene,
      )

      rope.rotation.z = Math.PI / 2
      rope.position.set(0, Math.max(height * 0.3, 0.18), index * Math.max(depth * 0.12, 0.07))
      attachMesh(rope, parent, materials.warning)
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
        height: Math.max(depth * 0.2, 0.14),
        diameter: Math.max(width * 0.22, 0.14),
        tessellation: 16,
      },
      scene,
    )

    base.rotation.x = Math.PI / 2
    barrel.rotation.x = Math.PI / 2
    barrel.position.z = Math.max(depth * 0.75, 0.45)
    barrel.position.y = Math.max(height * 0.18, 0.18)
    attachMesh(base, parent, material)
    attachMesh(barrel, parent, materials.trim)
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
      { height: Math.max(depth * 0.28, 0.16), diameter: Math.max(width * 0.18, 0.12), tessellation: 10 },
      scene,
    )
    const tip = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spear-tip`,
      {
        height: Math.max(depth * 0.22, 0.14),
        diameterTop: 0,
        diameterBottom: Math.max(width * 0.18, 0.12),
        tessellation: 12,
      },
      scene,
    )

    shaft.rotation.x = Math.PI / 2
    shaft.position.z = Math.max(depth * 0.35, 0.25)
    tip.rotation.x = Math.PI / 2
    tip.position.z = Math.max(depth * 0.78, 0.48)
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
    const frame = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage`,
      { width, height: Math.max(height * 1.2, 0.45), depth },
      scene,
    )
    const railL = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-l`,
      { width: Math.max(width * 0.15, 0.09), height: Math.max(height * 1.2, 0.45), depth: Math.max(depth * 0.12, 0.08) },
      scene,
    )
    const railR = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-r`,
      { width: Math.max(width * 0.15, 0.09), height: Math.max(height * 1.2, 0.45), depth: Math.max(depth * 0.12, 0.08) },
      scene,
    )
    const roof = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-top`,
      { width: Math.max(width * 0.9, 0.6), height: Math.max(height * 0.1, 0.07), depth: Math.max(depth * 0.9, 0.6) },
      scene,
    )

    railL.position.set(-width * 0.5, height * 0.3, 0)
    railR.position.set(width * 0.5, height * 0.3, 0)
    roof.position.y = Math.max(height * 0.7, 0.28)

    attachMesh(frame, parent, material)
    attachMesh(railL, parent, materials.trim)
    attachMesh(railR, parent, materials.trim)
    attachMesh(roof, parent, materials.trim)

    return
  }

  const plate = MeshBuilder.CreateBox(
    `${role}-${blockId}-plate`,
    { width: Math.max(width * 0.95, 0.55), height: Math.max(height * 0.2, 0.14), depth: Math.max(depth, 0.5) },
    scene,
  )

  if (partId.includes('Front') || partId.includes('Shield')) {
    const brace = MeshBuilder.CreateBox(
      `${role}-${blockId}-front-brace`,
      { width: Math.max(width * 1.05, 0.55), height: Math.max(height * 0.2, 0.16), depth: Math.max(depth * 0.6, 0.3) },
      scene,
    )

    brace.position.z = Math.max(depth * 0.25, 0.2)
    attachMesh(plate, parent, material)
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

  if (partId.includes('Booster')) {
    const core = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-booster-core`,
      { height: Math.max(height * 0.45, 0.18), diameter: Math.max(width * 0.35, 0.18), tessellation: 12 },
      scene,
    )
    core.rotation.z = Math.PI / 2
    core.position.z = Math.max(depth * 0.42, 0.2)
    core.material = materials.light
    core.parent = parent
    core.metadata = { kind: 'smoke' }
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
    ring.rotation.x = Math.PI / 2
    attachMesh(ring, parent, materials.light)
  }

  if (partId.includes('Smoke') || partId.includes('Sensor') || partId.includes('RepairKit')) {
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
      -Math.max(depth * 0.42, 0.14),
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
    -Math.max(depth * 0.52, 0.18),
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

  lamp.position.set(0, Math.max(y, 0.24), -Math.max(radius * 0.3, 0.12))
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
): StandardMaterial {
  const material = new StandardMaterial(name, scene)

  material.diffuseColor = Color3.FromHexString(diffuse)
  material.specularColor = new Color3(specular, specular, Math.max(0.18, specular * 0.86))
  material.emissiveColor = Color3.FromHexString(emissive)

  return material
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}
