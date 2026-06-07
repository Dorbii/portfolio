import type { Material } from '@babylonjs/core/Materials/material'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../../../packages/schemas/src/index.js'
import {
  attachMesh,
  createBoxDetail,
} from '../../rendering/meshHelpers'
import type { TeamMaterialSet } from '../../rendering/materials'

type StyleAccessoryArgs = {
  scene: Scene
  parent: TransformNode
  material: Material
  role: TeamRole
  blockId: string
  materials: TeamMaterialSet
}

export function createAntennaPart(args: StyleAccessoryArgs): void {
  const {
    scene,
    parent,
    role,
    blockId,
    materials,
  } = args

  createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-antenna-bolted-base`, 0.24, 0.055, 0.24, 0, 0.08, 0)

  const mast = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-antenna-flexible-mast`,
    {
      height: 0.76,
      diameter: 0.026,
      tessellation: 8,
    },
    scene,
  )
  const collar = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-antenna-rubber-collar`,
    {
      height: 0.08,
      diameter: 0.075,
      tessellation: 10,
    },
    scene,
  )
  const tip = MeshBuilder.CreateSphere(
    `${role}-${blockId}-antenna-team-signal-tip`,
    {
      diameter: 0.07,
      segments: 8,
    },
    scene,
  )

  mast.position.y = 0.44
  mast.rotation.z = 0.08
  collar.position.y = 0.14
  tip.position.set(0.03, 0.84, 0)
  tip.metadata = { kind: 'pulse', speed: 0.055 }
  attachMesh(mast, parent, materials.steel)
  attachMesh(collar, parent, materials.rubber)
  attachMesh(tip, parent, materials.light)
}

export function createBladeAntennaPart(args: StyleAccessoryArgs): void {
  const {
    scene,
    parent,
    role,
    blockId,
    material,
    materials,
  } = args

  createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-blade-antenna-base`, 0.25, 0.06, 0.22, 0, 0.08, 0)

  const blade = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-blade-antenna-fin-mast`,
    {
      height: 0.62,
      diameterTop: 0.025,
      diameterBottom: 0.11,
      tessellation: 4,
    },
    scene,
  )
  const leadingEdge = MeshBuilder.CreateBox(
    `${role}-${blockId}-blade-antenna-steel-leading-edge`,
    {
      width: 0.025,
      height: 0.48,
      depth: 0.035,
    },
    scene,
  )

  blade.position.y = 0.42
  blade.rotation.y = Math.PI / 4
  leadingEdge.position.set(0.06, 0.42, 0.02)
  attachMesh(blade, parent, material)
  attachMesh(leadingEdge, parent, materials.steel)
}

export function createHornsPart(args: StyleAccessoryArgs): void {
  const {
    scene,
    parent,
    role,
    blockId,
    material,
    materials,
  } = args

  createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-horns-armor-mount-plate`, 0.52, 0.055, 0.28, 0, 0.08, -0.02)

  for (const side of [-1, 1]) {
    const horn = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-horns-swept-metal-horn-${side}`,
      {
        height: 0.58,
        diameterTop: 0.018,
        diameterBottom: 0.105,
        tessellation: 10,
      },
      scene,
    )
    const socket = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-horns-bolted-socket-${side}`,
      {
        height: 0.06,
        diameter: 0.14,
        tessellation: 12,
      },
      scene,
    )

    socket.position.set(side * 0.18, 0.14, -0.02)
    horn.position.set(side * 0.19, 0.44, 0.05)
    horn.rotation.x = -0.55
    horn.rotation.z = side * 0.24
    attachMesh(socket, parent, material)
    attachMesh(horn, parent, materials.steel)
  }
}

export function createTailPart(args: StyleAccessoryArgs): void {
  const {
    scene,
    parent,
    role,
    blockId,
    material,
    materials,
  } = args

  createBoxDetail(scene, parent, materials.trim, `${role}-${blockId}-tail-hinge-box`, 0.28, 0.12, 0.18, 0, 0.14, -0.18)

  for (let segment = 0; segment < 5; segment += 1) {
    const shell = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-tail-armored-segment-${segment}`,
      {
        height: 0.18,
        diameter: Math.max(0.18 - segment * 0.018, 0.08),
        tessellation: 8,
      },
      scene,
    )

    shell.rotation.z = Math.PI / 2
    shell.rotation.y = -0.26 + segment * 0.08
    shell.position.set(0, 0.18 + segment * 0.045, -0.26 - segment * 0.14)
    attachMesh(shell, parent, segment % 2 === 0 ? material : materials.trim)
  }

  const tip = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-tail-warning-stinger-tip`,
    {
      height: 0.18,
      diameterTop: 0,
      diameterBottom: 0.08,
      tessellation: 8,
    },
    scene,
  )

  tip.rotation.x = Math.PI / 2
  tip.position.set(0, 0.38, -0.94)
  attachMesh(tip, parent, materials.steel)
}

export function createTopHatPart(args: StyleAccessoryArgs): void {
  const {
    scene,
    parent,
    role,
    blockId,
    material,
    materials,
  } = args

  const brim = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-top-hat-wide-brim`,
    {
      height: 0.055,
      diameter: 0.55,
      tessellation: 32,
    },
    scene,
  )
  const crown = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-top-hat-tall-crown`,
    {
      height: 0.42,
      diameter: 0.34,
      tessellation: 24,
    },
    scene,
  )
  const band = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-top-hat-team-band`,
    {
      height: 0.045,
      diameter: 0.355,
      tessellation: 24,
    },
    scene,
  )

  brim.position.y = 0.12
  crown.position.y = 0.34
  band.position.y = 0.24
  attachMesh(brim, parent, materials.rubber)
  attachMesh(crown, parent, materials.trim)
  attachMesh(band, parent, material)
}

export function createCowboyHatPart(args: StyleAccessoryArgs): void {
  const {
    scene,
    parent,
    role,
    blockId,
    material,
    materials,
  } = args
  const brim = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-cowboy-hat-curled-brim`,
    {
      height: 0.052,
      diameter: 0.62,
      tessellation: 24,
    },
    scene,
  )
  const crown = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-cowboy-hat-pinched-crown`,
    {
      height: 0.24,
      diameter: 0.34,
      tessellation: 8,
    },
    scene,
  )

  brim.scaling.z = 0.58
  brim.position.y = 0.12
  crown.position.y = 0.26
  crown.scaling.x = 0.72
  attachMesh(brim, parent, materials.trim)
  attachMesh(crown, parent, material)

  for (const side of [-1, 1]) {
    const curledSide = MeshBuilder.CreateBox(
      `${role}-${blockId}-cowboy-hat-raised-side-brim-${side}`,
      {
        width: 0.12,
        height: 0.08,
        depth: 0.34,
      },
      scene,
    )

    curledSide.position.set(side * 0.31, 0.16, 0)
    curledSide.rotation.z = side * 0.32
    attachMesh(curledSide, parent, materials.trim)
  }

  createBoxDetail(scene, parent, materials.light, `${role}-${blockId}-cowboy-hat-small-pin`, 0.055, 0.026, 0.035, 0, 0.34, 0.16)
}
