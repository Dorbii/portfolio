import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import { attachMesh } from './babylonMeshHelpers'
import type { TeamMaterialSet } from './babylonMaterials'

export function createUtilityPart(
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
