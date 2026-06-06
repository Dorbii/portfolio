import type { Material } from '@babylonjs/core/Materials/material'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import {
  attachMesh,
  createBoxDetail,
  createRampBlock,
  createSolidBlock,
} from './babylonMeshHelpers'
import type { TeamMaterialSet } from './babylonMaterials'
import {
  createArmorPanel,
  createCornerCaps,
  createTopLamp,
} from './babylonPartDetails'

export function createBodyPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  partId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  // CODEX_INTENT: make the long chassis read nose-to-tail in replay without changing catalog or sim semantics.
  // CODEX_RISK: behavioral
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending
  if (partId === 'Body_Rectangle_Long') {
    const visualWidth = Math.max(width * 0.56, 0.86)
    const visualDepth = Math.max(depth * 1.68, 1.72)
    const spine = MeshBuilder.CreateBox(
      `${parent.name}-long-control-spine`,
      { width: visualWidth, height: Math.max(height, 0.42), depth: visualDepth },
      scene,
    )
    const noseDeck = MeshBuilder.CreateBox(
      `${parent.name}-long-control-nose-deck`,
      { width: visualWidth * 0.72, height: 0.12, depth: visualDepth * 0.2 },
      scene,
    )
    const rearModule = MeshBuilder.CreateBox(
      `${parent.name}-long-control-rear-module`,
      { width: visualWidth * 0.82, height: 0.18, depth: visualDepth * 0.22 },
      scene,
    )

    noseDeck.position.set(0, Math.max(height * 0.58, 0.31), visualDepth * 0.38)
    rearModule.position.set(0, Math.max(height * 0.7, 0.36), -visualDepth * 0.36)
    attachMesh(spine, parent, material)
    attachMesh(noseDeck, parent, materials.utility)
    attachMesh(rearModule, parent, materials.trim)

    for (let side = -1; side <= 1; side += 2) {
      createBoxDetail(
        scene,
        parent,
        materials.light,
        `${parent.name}-long-control-side-light-${side}`,
        0.045,
        0.07,
        visualDepth * 0.52,
        side * visualWidth * 0.55,
        Math.max(height * 0.58, 0.3),
        visualDepth * 0.04,
      )
    }

    return
  }

  if (partId === 'Body_Light_Frame') {
    const railWidth = Math.max(width * 0.14, 0.08)
    const railHeight = Math.max(height * 0.34, 0.18)
    const railDepth = Math.max(depth * 0.96, 0.6)
    const crossDepth = Math.max(depth * 0.14, 0.08)

    for (let side = -1; side <= 1; side += 2) {
      createBoxDetail(
        scene,
        parent,
        material,
        `${parent.name}-light-frame-side-rail-${side}`,
        railWidth,
        railHeight,
        railDepth,
        side * Math.max(width * 0.42, 0.28),
        Math.max(height * 0.22, 0.16),
        0,
      )
    }

    for (let side = -1; side <= 1; side += 2) {
      createBoxDetail(
        scene,
        parent,
        materials.trim,
        `${parent.name}-light-frame-crossmember-${side}`,
        Math.max(width * 0.82, 0.56),
        Math.max(height * 0.16, 0.08),
        crossDepth,
        0,
        Math.max(height * 0.34, 0.18),
        side * Math.max(depth * 0.4, 0.24),
      )
    }

    createBoxDetail(
      scene,
      parent,
      materials.utility,
      `${parent.name}-light-frame-battery-tray`,
      Math.max(width * 0.38, 0.24),
      Math.max(height * 0.24, 0.14),
      Math.max(depth * 0.32, 0.18),
      -Math.max(width * 0.08, 0.04),
      Math.max(height * 0.54, 0.26),
      -Math.max(depth * 0.04, 0.02),
    )
    createRaisedTechCluster(scene, parent, materials, width, height, depth)

    return
  }

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
    const wedge = createRampBlock(
      scene,
      `${parent.name}-wedge`,
      width * 1.28,
      Math.max(height * 0.9, 0.34),
      depth * 1.04,
      Math.max(height * 0.16, 0.06),
    )
    wedge.position.set(0, -height * 0.04, depth * 0.08)
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
