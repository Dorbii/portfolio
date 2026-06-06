import type { Material } from '@babylonjs/core/Materials/material'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import { getPart } from '../../../../packages/catalog/src/index.js'
import type {
  PartVisualFamily,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { attachMesh } from './babylonMeshHelpers'
import type { TeamMaterialSet } from './babylonMaterials'
import { createDefaultWeaponPart } from './babylonDefaultWeaponPart'
import {
  createFlipperWeaponPart,
  createGrabberWeaponPart,
  createHammerWeaponPart,
  createRamWeaponPart,
  createSpearWeaponPart,
} from './babylonMeleeWeaponParts'
import { createNetWeaponPart } from './babylonNetWeaponPart'
import { createSpinnerWeaponPart } from './babylonSpinnerWeaponPart'
import { createTurretWeaponPart } from './babylonTurretWeaponPart'
import type {
  WeaponPartRenderArgs,
  WeaponPartRenderer,
} from './babylonWeaponPartTypes'

const WEAPON_RENDERERS_BY_VISUAL_FAMILY = new Map<PartVisualFamily, WeaponPartRenderer>([
  ['flipper', createFlipperWeaponPart],
  ['grabber', createGrabberWeaponPart],
  ['hammer', createHammerWeaponPart],
  ['net', createNetWeaponPart],
  ['ram', createRamWeaponPart],
  ['saw', createSpinnerWeaponPart],
  ['spear', createSpearWeaponPart],
  ['spinner', createSpinnerWeaponPart],
  ['turret', createTurretWeaponPart],
])

export function createWeaponPart(
  scene: Scene,
  parent: TransformNode,
  material: Material,
  role: TeamRole,
  blockId: string,
  partId: string,
  width: number,
  height: number,
  depth: number,
  materials: TeamMaterialSet,
): void {
  const args: WeaponPartRenderArgs = {
    scene,
    parent,
    material,
    role,
    blockId,
    partId,
    width,
    height,
    depth,
    materials,
  }

  createWeaponMount(args)
  weaponRendererFor(partId)(args)
}

function weaponRendererFor(partId: string): WeaponPartRenderer {
  const visualFamily = getPart(partId)?.visual.visualFamily

  return visualFamily
    ? WEAPON_RENDERERS_BY_VISUAL_FAMILY.get(visualFamily) ?? createDefaultWeaponPart
    : createDefaultWeaponPart
}

function createWeaponMount({
  scene,
  parent,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
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
}
