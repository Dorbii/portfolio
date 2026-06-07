import type { Material } from '@babylonjs/core/Materials/material'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../../packages/schemas/src/index.js'
import { attachMesh } from '../../rendering/meshHelpers'
import {
  tagPartChildMaterialRole,
  type BotPartChildMaterialRole,
  type TeamMaterialSet,
} from '../../rendering/materials'
import type { UtilityPartRenderArgs } from './types'

export function attachUtilityMesh(
  mesh: Mesh,
  parent: TransformNode,
  material: Material,
  materialRole: BotPartChildMaterialRole,
): void {
  tagPartChildMaterialRole(mesh, materialRole)
  attachMesh(mesh, parent, material)
}

export function createUtilityFrame({
  scene,
  parent,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: UtilityPartRenderArgs, partId = '') {
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

  tagPartChildMaterialRole(box, 'damageable')
  topBackplane.position.set(-width * 0.08, Math.max(height * 0.58, 0.28), -depth * 0.06)
  sideCable.rotation.x = Math.PI / 2
  sideCable.position.set(width * 0.36, Math.max(height * 0.46, 0.24), 0)
  attachUtilityMesh(topBackplane, parent, materials.trim, 'trim')
  attachUtilityMesh(sideCable, parent, materials.trim, 'trim')
  createUtilityCasingBreakup(scene, parent, materials, role, blockId, width, height, depth, partId)

  if (isElectronicsPart(partId)) {
    createWireHarness(scene, parent, materials, role, blockId, width, height, depth)
  }

  return box
}

function isElectronicsPart(partId: string): boolean {
  return [
    'AIModule',
    'Battery',
    'Drone',
    'EnergyCore',
    'RepairKit',
    'Sensor',
    'Smoke',
  ].some((token) => partId.includes(token))
}

function createUtilityCasingBreakup(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
  partId: string,
): void {
  const label = partId.length > 0 ? partId.toLowerCase() : 'plain'
  const topY = Math.max(height * 0.79, 0.4)
  const frontZ = Math.max(depth * 0.45, 0.24)
  const crackMaterial = partId.includes('Smoke') || partId.includes('Booster')
    ? materials.steel
    : materials.trim

  for (let index = 0; index < 3; index += 1) {
    const crack = MeshBuilder.CreateBox(
      `${role}-${blockId}-${label}-casing-crack-${index}`,
      {
        width: Math.max(width * (0.13 + index * 0.03), 0.075),
        height: Math.max(height * 0.012, 0.008),
        depth: Math.max(depth * 0.026, 0.016),
      },
      scene,
    )

    crack.position.set(
      -Math.max(width * 0.2, 0.12) + index * Math.max(width * 0.13, 0.075),
      topY + index * 0.003,
      -Math.max(depth * 0.22, 0.12) + index * Math.max(depth * 0.09, 0.05),
    )
    crack.rotation.y = -0.5 + index * 0.34
    attachUtilityMesh(crack, parent, crackMaterial, index === 1 ? 'weapon_edge' : 'trim')
  }

  const serviceCavity = MeshBuilder.CreateBox(
    `${role}-${blockId}-${label}-exposed-service-cavity`,
    {
      width: Math.max(width * 0.26, 0.15),
      height: Math.max(height * 0.1, 0.06),
      depth: Math.max(depth * 0.04, 0.026),
    },
    scene,
  )

  serviceCavity.position.set(-Math.max(width * 0.28, 0.16), Math.max(height * 0.42, 0.23), frontZ)
  attachUtilityMesh(serviceCavity, parent, materials.rubber, 'rubber')

  for (let index = 0; index < 3; index += 1) {
    const bus = MeshBuilder.CreateBox(
      `${role}-${blockId}-${label}-exposed-internal-bus-${index}`,
      {
        width: Math.max(width * 0.18, 0.1),
        height: Math.max(height * 0.014, 0.01),
        depth: Math.max(depth * 0.018, 0.012),
      },
      scene,
    )

    bus.position.set(
      serviceCavity.position.x + (index - 1) * Math.max(width * 0.05, 0.03),
      serviceCavity.position.y + (index - 1) * Math.max(height * 0.026, 0.016),
      frontZ + Math.max(depth * 0.03, 0.018),
    )
    bus.rotation.y = (index - 1) * 0.18
    attachUtilityMesh(bus, parent, index === 1 ? materials.warning : materials.steel, index === 1 ? 'trim' : 'weapon_edge')
  }
}

export function createWireHarness(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
): void {
  for (let index = -1; index <= 1; index += 2) {
    const cable = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-utility-wire-harness-${index}`,
      {
        height: Math.max(depth * 0.56, 0.28),
        diameter: 0.024,
        tessellation: 8,
      },
      scene,
    )
    const plug = MeshBuilder.CreateBox(
      `${role}-${blockId}-utility-wire-plug-${index}`,
      {
        width: Math.max(width * 0.12, 0.07),
        height: 0.055,
        depth: Math.max(depth * 0.08, 0.045),
      },
      scene,
    )

    cable.rotation.x = Math.PI / 2
    cable.position.set(index * Math.max(width * 0.22, 0.12), Math.max(height * 0.72, 0.36), Math.max(depth * 0.05, 0.03))
    plug.position.set(index * Math.max(width * 0.22, 0.12), cable.position.y, Math.max(depth * 0.36, 0.18))
    attachUtilityMesh(cable, parent, index > 0 ? materials.warning : materials.trim, 'trim')
    attachUtilityMesh(plug, parent, materials.steel, 'weapon_edge')
  }

  const loop = MeshBuilder.CreateTorus(
    `${role}-${blockId}-utility-service-loop`,
    {
      diameter: Math.max(Math.min(width, depth) * 0.42, 0.22),
      thickness: 0.018,
      tessellation: 14,
    },
    scene,
  )

  loop.rotation.x = Math.PI / 2
  loop.position.set(-Math.max(width * 0.32, 0.18), Math.max(height * 0.7, 0.34), Math.max(depth * 0.2, 0.1))
  attachUtilityMesh(loop, parent, materials.trim, 'trim')
}

export function createBatteryBusBars(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
): void {
  for (let index = -1; index <= 1; index += 1) {
    const busBar = MeshBuilder.CreateBox(
      `${role}-${blockId}-battery-bus-bar-${index + 1}`,
      {
        width: Math.max(width * 0.055, 0.034),
        height: 0.032,
        depth: Math.max(depth * 0.58, 0.28),
      },
      scene,
    )

    busBar.position.set(index * Math.max(width * 0.2, 0.11), Math.max(height * 0.79, 0.42), 0)
    attachUtilityMesh(busBar, parent, materials.warning, 'trim')
  }
}

export function createPcbConnectorDetails(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
  boardY: number,
): void {
  for (let index = 0; index < 6; index += 1) {
    const pin = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-pcb-header-pin-${index}`,
      {
        height: 0.055,
        diameter: 0.024,
        tessellation: 6,
      },
      scene,
    )

    pin.position.set(
      -Math.max(width * 0.3, 0.16) + index * Math.max(width * 0.12, 0.055),
      boardY + Math.max(height * 0.1, 0.045),
      -Math.max(depth * 0.32, 0.16),
    )
    attachUtilityMesh(pin, parent, materials.steel, 'weapon_edge')
  }

  for (let index = -1; index <= 1; index += 1) {
    const capacitor = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-pcb-capacitor-${index + 1}`,
      {
        height: Math.max(height * 0.16, 0.08),
        diameter: Math.max(width * 0.07, 0.04),
        tessellation: 10,
      },
      scene,
    )

    capacitor.position.set(
      index * Math.max(width * 0.16, 0.08),
      boardY + Math.max(height * 0.14, 0.07),
      Math.max(depth * 0.28, 0.14),
    )
    attachUtilityMesh(capacitor, parent, index === 0 ? materials.light : materials.steel, index === 0 ? 'emissive' : 'weapon_edge')
  }
}

export function createVacuumTubePair(
  scene: Scene,
  parent: TransformNode,
  materials: TeamMaterialSet,
  role: TeamRole,
  blockId: string,
  width: number,
  height: number,
  depth: number,
): void {
  for (let index = -1; index <= 1; index += 2) {
    const glass = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-vacuum-tube-glow-${index}`,
      {
        height: Math.max(height * 0.34, 0.16),
        diameter: Math.max(width * 0.13, 0.075),
        tessellation: 12,
      },
      scene,
    )
    const cap = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-vacuum-tube-cap-${index}`,
      {
        height: 0.045,
        diameter: Math.max(width * 0.15, 0.085),
        tessellation: 12,
      },
      scene,
    )

    glass.position.set(index * Math.max(width * 0.28, 0.15), Math.max(height * 0.82, 0.42), -Math.max(depth * 0.24, 0.12))
    glass.metadata = { kind: 'pulse', speed: 0.026 }
    cap.position.set(glass.position.x, glass.position.y + Math.max(height * 0.2, 0.09), glass.position.z)
    attachUtilityMesh(glass, parent, materials.light, 'glass')
    attachUtilityMesh(cap, parent, materials.steel, 'weapon_edge')
  }
}
