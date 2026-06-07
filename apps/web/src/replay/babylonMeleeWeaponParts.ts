import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import {
  attachMesh,
  createBoxDetail,
  createRampBlock,
} from './babylonMeshHelpers'
import type { WeaponPartRenderArgs } from './babylonWeaponPartTypes'

export function createHammerWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const armLength = Math.max(depth * 1.28, 0.82)
  const arm = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-hammer-arm`,
    {
      height: armLength,
      diameter: Math.max(width * 0.13, 0.075),
      tessellation: 12,
    },
    scene,
  )
  const head = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-hammer-impact-head`,
    {
      height: Math.max(width * 0.62, 0.34),
      diameter: Math.max(height * 0.54, 0.24),
      tessellation: 12,
    },
    scene,
  )
  const pivot = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-hammer-pivot`,
    {
      height: Math.max(width * 0.46, 0.26),
      diameter: Math.max(height * 0.42, 0.2),
      tessellation: 14,
    },
    scene,
  )

  arm.rotation.x = Math.PI / 2
  arm.position.set(0, Math.max(height * 0.34, 0.2), Math.max(depth * 0.18, 0.12))
  head.rotation.z = Math.PI / 2
  head.position.set(0, Math.max(height * 0.52, 0.32), Math.max(depth * 0.82, 0.48))
  pivot.rotation.z = Math.PI / 2
  pivot.position.set(0, Math.max(height * 0.28, 0.18), -Math.max(depth * 0.42, 0.24))
  attachMesh(arm, parent, materials.steel)
  attachMesh(head, parent, materials.steel)
  attachMesh(pivot, parent, materials.trim)

  for (let side = -1; side <= 1; side += 2) {
    createBoxDetail(
      scene,
      parent,
      material,
      `${role}-${blockId}-hammer-strike-face-${side}`,
      Math.max(width * 0.18, 0.1),
      Math.max(height * 0.42, 0.18),
      Math.max(depth * 0.18, 0.1),
      side * Math.max(width * 0.36, 0.2),
      head.position.y,
      head.position.z,
    )
    createBoxDetail(
      scene,
      parent,
      materials.trim,
      `${role}-${blockId}-hammer-side-bracket-${side}`,
      Math.max(width * 0.12, 0.07),
      Math.max(height * 0.5, 0.2),
      Math.max(depth * 0.18, 0.12),
      side * Math.max(width * 0.3, 0.18),
      Math.max(height * 0.32, 0.2),
      pivot.position.z,
    )
  }

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-hammer-pivot-bolt-${index}`,
      {
        height: 0.028,
        diameter: Math.max(width * 0.055, 0.026),
        tessellation: 8,
      },
      scene,
    )

    bolt.rotation.z = Math.PI / 2
    bolt.position.set(
      -Math.max(width * 0.25, 0.14),
      pivot.position.y + Math.sin(angle) * Math.max(height * 0.17, 0.08),
      pivot.position.z + Math.cos(angle) * Math.max(height * 0.17, 0.08),
    )
    attachMesh(bolt, parent, materials.steel)
  }
}

export function createSpearWeaponPart({
  scene,
  parent,
  role,
  blockId,
  width,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
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

  for (let side = -1; side <= 1; side += 2) {
    const fin = MeshBuilder.CreateBox(
      `${role}-${blockId}-spear-stabilizer-fin-${side}`,
      {
        width: Math.max(width * 0.08, 0.045),
        height: Math.max(width * 0.28, 0.13),
        depth: Math.max(depth * 0.24, 0.16),
      },
      scene,
    )
    const collar = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-spear-collar-${side}`,
      {
        height: Math.max(width * 0.16, 0.08),
        diameter: Math.max(width * 0.24, 0.14),
        tessellation: 12,
      },
      scene,
    )

    fin.position.set(side * Math.max(width * 0.14, 0.08), 0, Math.max(depth * 0.82, 0.52))
    fin.rotation.z = side * 0.24
    collar.rotation.x = Math.PI / 2
    collar.position.set(0, 0, Math.max(depth * 0.7, 0.46))
    attachMesh(fin, parent, materials.steel)
    attachMesh(collar, parent, materials.steel)
  }
}

export function createFlipperWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const paddle = createRampBlock(
    scene,
    `${role}-${blockId}-flipper-paddle`,
    Math.max(width * 1.24, 0.72),
    Math.max(height * 0.5, 0.22),
    Math.max(depth * 1.42, 0.72),
    Math.max(height * 0.08, 0.035),
  )
  const hinge = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flipper-hinge`,
    { height: Math.max(width * 1.08, 0.62), diameter: Math.max(height * 0.18, 0.1), tessellation: 12 },
    scene,
  )

  paddle.position.set(0, Math.max(height * 0.18, 0.12), Math.max(depth * 0.22, 0.14))
  hinge.rotation.z = Math.PI / 2
  hinge.position.set(0, Math.max(height * 0.26, 0.16), -Math.max(depth * 0.44, 0.24))
  attachMesh(paddle, parent, material)
  attachMesh(hinge, parent, materials.trim)

  for (let side = -1; side <= 1; side += 2) {
    createBoxDetail(
      scene,
      parent,
      materials.warning,
      `${role}-${blockId}-flipper-side-link-${side}`,
      Math.max(width * 0.12, 0.08),
      Math.max(height * 0.38, 0.18),
      Math.max(depth * 0.88, 0.42),
      side * Math.max(width * 0.48, 0.3),
      Math.max(height * 0.28, 0.16),
      0,
    )
  }

  for (let side = -1; side <= 1; side += 2) {
    const actuator = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-flipper-actuator-${side}`,
      {
        height: Math.max(depth * 0.72, 0.38),
        diameter: Math.max(width * 0.055, 0.04),
        tessellation: 10,
      },
      scene,
    )

    actuator.rotation.x = Math.PI / 2
    actuator.rotation.z = side * 0.18
    actuator.position.set(
      side * Math.max(width * 0.28, 0.18),
      Math.max(height * 0.36, 0.2),
      -Math.max(depth * 0.02, 0.02),
    )
    attachMesh(actuator, parent, materials.steel)
  }
}

export function createGrabberWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
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

  for (let side = -1; side <= 1; side += 2) {
    const pivot = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-grabber-claw-pivot-${side}`,
      {
        height: Math.max(width * 0.2, 0.1),
        diameter: Math.max(height * 0.2, 0.1),
        tessellation: 12,
      },
      scene,
    )
    const clawTip = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-grabber-hook-tip-${side}`,
      {
        height: Math.max(depth * 0.3, 0.18),
        diameterTop: 0,
        diameterBottom: Math.max(width * 0.12, 0.08),
        tessellation: 10,
      },
      scene,
    )

    pivot.rotation.z = Math.PI / 2
    pivot.position.set(side * Math.max(width * 0.38, 0.26), Math.max(height * 0.78, 0.36), -Math.max(depth * 0.14, 0.08))
    clawTip.rotation.x = Math.PI / 2
    clawTip.rotation.z = side * 0.42
    clawTip.position.set(side * Math.max(width * 0.42, 0.28), Math.max(height * 0.72, 0.34), Math.max(depth * 0.42, 0.28))
    attachMesh(pivot, parent, materials.steel)
    attachMesh(clawTip, parent, materials.warning)
  }
}

export function createRamWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const ramFace = createRampBlock(
    scene,
    `${role}-${blockId}-ram-impact-wedge`,
    Math.max(width * 1.3, 0.76),
    Math.max(height * 0.54, 0.24),
    Math.max(depth * 1.02, 0.58),
    Math.max(height * 0.18, 0.08),
  )
  const crushBar = MeshBuilder.CreateBox(
    `${role}-${blockId}-ram-crush-bar`,
    {
      width: Math.max(width * 1.22, 0.72),
      height: Math.max(height * 0.16, 0.1),
      depth: Math.max(depth * 0.16, 0.09),
    },
    scene,
  )

  ramFace.position.set(0, Math.max(height * 0.18, 0.12), Math.max(depth * 0.28, 0.16))
  crushBar.position.set(0, Math.max(height * 0.28, 0.16), Math.max(depth * 0.78, 0.42))
  attachMesh(ramFace, parent, material)
  attachMesh(crushBar, parent, materials.warning)

  for (let side = -1; side <= 1; side += 2) {
    createBoxDetail(
      scene,
      parent,
      materials.trim,
      `${role}-${blockId}-ram-side-cheek-${side}`,
      Math.max(width * 0.14, 0.09),
      Math.max(height * 0.42, 0.18),
      Math.max(depth * 0.78, 0.4),
      side * Math.max(width * 0.5, 0.32),
      Math.max(height * 0.24, 0.14),
      Math.max(depth * 0.18, 0.1),
    )
  }

  for (let index = -1; index <= 1; index += 1) {
    createBoxDetail(
      scene,
      parent,
      materials.steel,
      `${role}-${blockId}-ram-rake-tooth-${index + 1}`,
      Math.max(width * 0.12, 0.08),
      Math.max(height * 0.16, 0.08),
      Math.max(depth * 0.24, 0.14),
      index * Math.max(width * 0.28, 0.16),
      Math.max(height * 0.34, 0.18),
      Math.max(depth * 0.92, 0.48),
    )
  }
}

export function createDrillWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const gearbox = MeshBuilder.CreateBox(
    `${role}-${blockId}-drill-gearbox`,
    {
      width: Math.max(width * 0.66, 0.34),
      height: Math.max(height * 0.46, 0.24),
      depth: Math.max(depth * 0.34, 0.26),
    },
    scene,
  )
  const shaft = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-drill-shaft`,
    {
      height: Math.max(depth * 0.5, 0.32),
      diameter: Math.max(width * 0.16, 0.08),
      tessellation: 12,
    },
    scene,
  )
  const bitRoot = new TransformNode(`${role}-${blockId}-drill-bit-motion-root`, scene)

  const shaftY = Math.max(height * 0.34, 0.22)

  gearbox.position.set(0, shaftY, -Math.max(depth * 0.16, 0.14))
  bitRoot.position.set(0, shaftY, 0)
  bitRoot.metadata = { kind: 'spin', axis: 'z', speed: 0.16 }
  shaft.rotation.x = Math.PI / 2
  shaft.position.z = Math.max(depth * 0.24, 0.2)
  attachMesh(gearbox, parent, material)
  bitRoot.parent = parent
  attachMesh(shaft, bitRoot, materials.steel)

  const bitSegments = 5
  for (let index = 0; index < bitSegments; index += 1) {
    const bit = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-drill-bit-section-${index}`,
      {
        height: Math.max(depth * 0.16, 0.1),
        diameterTop: Math.max(width * (0.34 - index * 0.04), 0.1),
        diameterBottom: Math.max(width * (0.42 - index * 0.04), 0.14),
        tessellation: 14,
      },
      scene,
    )
    const flute = MeshBuilder.CreateBox(
      `${role}-${blockId}-drill-flute-${index}`,
      {
        width: Math.max(width * 0.06, 0.035),
        height: Math.max(height * 0.12, 0.055),
        depth: Math.max(depth * 0.18, 0.1),
      },
      scene,
    )

    bit.rotation.x = Math.PI / 2
    bit.position.z = Math.max(depth * (0.48 + index * 0.13), 0.34 + index * 0.1)
    flute.position.copyFrom(bit.position)
    flute.rotation.z = index * 0.72
    flute.rotation.x = Math.PI / 2
    attachMesh(bit, bitRoot, materials.steel)
    attachMesh(flute, bitRoot, materials.warning)
  }
}

export function createFlailWeaponPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: WeaponPartRenderArgs): void {
  const drum = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-flail-drive-drum`,
    {
      height: Math.max(width * 0.72, 0.36),
      diameter: Math.max(height * 0.42, 0.2),
      tessellation: 14,
    },
    scene,
  )
  const y = Math.max(height * 0.42, 0.26)

  drum.rotation.z = Math.PI / 2
  drum.position.set(0, y, -Math.max(depth * 0.22, 0.16))
  attachMesh(drum, parent, material)

  for (let chain = -1; chain <= 1; chain += 2) {
    const chainX = chain * Math.max(width * 0.16, 0.1)
    const chainRoot = new TransformNode(`${role}-${blockId}-flail-chain-root-${chain}`, scene)

    chainRoot.position.set(chainX, y, drum.position.z)
    chainRoot.metadata = { kind: 'spin', axis: 'x', speed: 0.13, phase: chain > 0 ? Math.PI : 0 }
    chainRoot.parent = parent

    for (let index = 0; index < 4; index += 1) {
      const link = MeshBuilder.CreateTorus(
        `${role}-${blockId}-flail-chain-link-${chain}-${index}`,
        {
          diameter: Math.max(width * 0.18, 0.1),
          thickness: 0.022,
          tessellation: 10,
        },
        scene,
      )

      link.rotation.x = Math.PI / 2
      link.rotation.z = index % 2 === 0 ? 0 : Math.PI / 2
      link.position.z = Math.max(depth * (0.18 + index * 0.16), 0.18 + index * 0.1)
      attachMesh(link, chainRoot, materials.steel)
    }

    const ball = MeshBuilder.CreateSphere(
      `${role}-${blockId}-flail-impact-ball-${chain}`,
      { diameter: Math.max(width * 0.28, 0.16), segments: 10 },
      scene,
    )

    ball.position.z = Math.max(depth * 0.9, 0.62)
    attachMesh(ball, chainRoot, materials.steel)

    for (let spike = 0; spike < 4; spike += 1) {
      const angle = (Math.PI * 2 * spike) / 4
      const tooth = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-flail-ball-spike-${chain}-${spike}`,
        {
          height: Math.max(width * 0.16, 0.08),
          diameterTop: 0,
          diameterBottom: Math.max(width * 0.07, 0.04),
          tessellation: 8,
        },
        scene,
      )

      tooth.position.set(
        Math.sin(angle) * Math.max(width * 0.16, 0.08),
        Math.cos(angle) * Math.max(width * 0.16, 0.08),
        ball.position.z,
      )
      tooth.rotation.z = -angle
      attachMesh(tooth, chainRoot, materials.warning)
    }
  }
}
