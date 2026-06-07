import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh } from '../../rendering/meshHelpers'
import type { MobilityPartRenderArgs } from './types'

export function createOmniWheelPart(
  { scene, parent, materials, role, blockId }: MobilityPartRenderArgs,
  diameter: number,
  wheelWidth: number,
): void {
  const wheelRoot = new TransformNode(`${role}-${blockId}-omni-wheel-root`, scene)
  const core = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-omni-core`,
    {
      height: Math.max(wheelWidth * 0.58, 0.2),
      diameter: Math.max(diameter * 0.5, 0.3),
      tessellation: 24,
    },
    scene,
  )
  const hub = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-omni-hub`,
    {
      height: Math.max(wheelWidth * 0.9, 0.25),
      diameter: Math.max(diameter * 0.28, 0.18),
      tessellation: 18,
    },
    scene,
  )

  wheelRoot.metadata = { kind: 'roll', axis: 'x', speed: 0.3 }
  wheelRoot.parent = parent
  core.rotation.z = Math.PI / 2
  hub.rotation.z = Math.PI / 2
  attachMesh(core, wheelRoot, materials.steel)
  attachMesh(hub, wheelRoot, materials.steel)

  const sidePlateDiameter = Math.max(diameter * 0.72, 0.4)
  const sidePlateOffset = Math.max(wheelWidth * 0.4, 0.12)

  for (let side = -1; side <= 1; side += 2) {
    const sidePlate = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-omni-side-plate-${side}`,
      {
        height: Math.max(wheelWidth * 0.08, 0.034),
        diameter: sidePlateDiameter,
        tessellation: 24,
      },
      scene,
    )
    const faceRim = MeshBuilder.CreateTorus(
      `${role}-${blockId}-omni-face-rim-${side}`,
      {
        diameter: Math.max(diameter * 0.76, 0.42),
        thickness: Math.max(diameter * 0.028, 0.024),
        tessellation: 28,
      },
      scene,
    )
    const hubCollar = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-omni-hub-collar-${side}`,
      {
        height: Math.max(wheelWidth * 0.06, 0.026),
        diameter: Math.max(diameter * 0.42, 0.24),
        tessellation: 20,
      },
      scene,
    )

    sidePlate.rotation.z = Math.PI / 2
    sidePlate.position.x = side * sidePlateOffset
    faceRim.rotation.z = Math.PI / 2
    faceRim.position.x = side * (sidePlateOffset + Math.max(wheelWidth * 0.045, 0.02))
    hubCollar.rotation.z = Math.PI / 2
    hubCollar.position.x = side * (sidePlateOffset + Math.max(wheelWidth * 0.078, 0.034))
    attachMesh(sidePlate, wheelRoot, materials.trim)
    attachMesh(faceRim, wheelRoot, materials.steel)
    attachMesh(hubCollar, wheelRoot, materials.steel)
    createOmniFaceCutouts(scene, wheelRoot, materials.rubber, role, blockId, side, sidePlateOffset, diameter, wheelWidth)
    createOmniBoltCircle(scene, wheelRoot, materials.steel, `${role}-${blockId}-omni-side-bolt-${side}`, {
      diameter: sidePlateDiameter,
      faceX: side * (sidePlateOffset + Math.max(wheelWidth * 0.04, 0.025)),
      side,
    })
  }

  const rollerCount = 12
  const rollerRadius = diameter * 0.44

  for (let index = 0; index < rollerCount; index += 1) {
    const angle = (Math.PI * 2 * index) / rollerCount
    const rowSide = index % 2 === 0 ? -1 : 1
    const rollerLength = Math.max(wheelWidth * 0.4, 0.14)
    const rollerDiameter = Math.max(diameter * 0.145, 0.075)
    const roller = MeshBuilder.CreateCapsule(
      `${role}-${blockId}-omni-roller-${index}`,
      {
        height: rollerLength,
        radius: rollerDiameter * 0.5,
        subdivisions: 4,
        tessellation: 16,
      },
      scene,
    )

    roller.position.set(
      rowSide * Math.max(wheelWidth * 0.2, 0.075),
      Math.sin(angle) * rollerRadius,
      Math.cos(angle) * rollerRadius,
    )
    roller.rotation.x = -angle
    roller.rotation.y = rowSide * 0.7
    attachMesh(roller, wheelRoot, materials.rubber)
    createOmniRollerCaps(scene, wheelRoot, materials.steel, role, blockId, index, roller.position, angle, rowSide, rollerLength, rollerDiameter)
    createOmniRollerBracket(scene, wheelRoot, materials.steel, role, blockId, index, roller.position, angle, rowSide, diameter, wheelWidth)
  }

  createOmniSpokes(scene, wheelRoot, materials.steel, role, blockId, diameter, wheelWidth)
}

function createOmniFaceCutouts(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['rubber'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  side: number,
  sidePlateOffset: number,
  diameter: number,
  wheelWidth: number,
): void {
  for (let index = 0; index < 5; index += 1) {
    const angle = (Math.PI * 2 * index) / 5 + Math.PI / 5
    const slot = MeshBuilder.CreateBox(
      `${role}-${blockId}-omni-face-window-${side}-${index}`,
      {
        width: Math.max(wheelWidth * 0.024, 0.014),
        height: Math.max(diameter * 0.045, 0.026),
        depth: Math.max(diameter * 0.16, 0.08),
      },
      scene,
    )

    slot.position.set(
      side * (sidePlateOffset + Math.max(wheelWidth * 0.072, 0.03)),
      Math.sin(angle) * diameter * 0.24,
      Math.cos(angle) * diameter * 0.24,
    )
    slot.rotation.x = angle
    slot.rotation.z = Math.PI / 2
    attachMesh(slot, parent, material)
  }
}

function createOmniRollerCaps(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['steel'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  index: number,
  position: { x: number; y: number; z: number },
  angle: number,
  rowSide: number,
  rollerLength: number,
  rollerDiameter: number,
): void {
  for (const capSide of [-1, 1]) {
    const cap = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-omni-roller-cap-${index}-${capSide}`,
      {
        height: Math.max(rollerLength * 0.06, 0.018),
        diameter: rollerDiameter * 0.92,
        tessellation: 12,
      },
      scene,
    )

    cap.position.set(
      position.x + capSide * rowSide * rollerLength * 0.48,
      position.y,
      position.z,
    )
    cap.rotation.x = -angle
    cap.rotation.y = rowSide * 0.7
    attachMesh(cap, parent, material)
  }
}

function createOmniRollerBracket(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['steel'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  index: number,
  position: { x: number; y: number; z: number },
  angle: number,
  rowSide: number,
  diameter: number,
  wheelWidth: number,
): void {
  for (const bracketSide of [-1, 1]) {
    const mount = MeshBuilder.CreateBox(
      `${role}-${blockId}-omni-roller-cheek-${index}-${bracketSide}`,
      {
        width: Math.max(wheelWidth * 0.055, 0.026),
        height: Math.max(diameter * 0.052, 0.032),
        depth: Math.max(diameter * 0.12, 0.068),
      },
      scene,
    )

    mount.position.set(
      position.x + bracketSide * rowSide * Math.max(wheelWidth * 0.22, 0.078),
      position.y * 0.98,
      position.z * 0.98,
    )
    mount.rotation.x = -angle
    mount.rotation.y = rowSide * 0.3
    attachMesh(mount, parent, material)
  }
}

function createOmniBoltCircle(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['steel'],
  name: string,
  options: {
    diameter: number
    faceX: number
    side: number
  },
): void {
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8
    const bolt = MeshBuilder.CreateCylinder(
      `${name}-${index}`,
      {
        height: 0.024,
        diameter: Math.max(options.diameter * 0.065, 0.018),
        tessellation: 8,
      },
      scene,
    )

    bolt.rotation.z = Math.PI / 2
    bolt.position.set(
      options.faceX,
      Math.sin(angle) * options.diameter * 0.32,
      Math.cos(angle) * options.diameter * 0.32,
    )
    bolt.scaling.x = options.side
    attachMesh(bolt, parent, material)
  }
}

function createOmniSpokes(
  scene: MobilityPartRenderArgs['scene'],
  parent: MobilityPartRenderArgs['parent'],
  material: MobilityPartRenderArgs['materials']['trim'],
  role: MobilityPartRenderArgs['role'],
  blockId: string,
  diameter: number,
  wheelWidth: number,
): void {
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * index) / 3
    const spoke = MeshBuilder.CreateBox(
      `${role}-${blockId}-omni-spoke-${index}`,
      {
        width: Math.max(wheelWidth * 0.08, 0.045),
        height: Math.max(diameter * 0.06, 0.04),
        depth: Math.max(diameter * 0.56, 0.28),
      },
      scene,
    )

    spoke.rotation.x = angle
    attachMesh(spoke, parent, material)
  }
}
