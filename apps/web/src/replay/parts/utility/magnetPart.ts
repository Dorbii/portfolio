import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createPbrSceneMaterial } from '../../rendering/sceneUtils'
import type { UtilityPartRenderArgs } from './types'
import { attachUtilityMesh } from './utilityFrame'

export function createMagnetPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: UtilityPartRenderArgs): void {

  const baseWidth = Math.max(width * 0.84, 0.48)
  const baseDepth = Math.max(depth * 0.78, 0.44)
  const baseHeight = Math.max(height * 0.16, 0.08)
  const coilDiameter = Math.max(Math.min(width, depth) * 0.42, 0.28)
  const coilHeight = Math.max(height * 0.68, 0.38)
  const coilY = Math.max(height * 0.48, 0.28)
  const flangeDiameter = Math.max(coilDiameter * 1.34, 0.38)
  const yokeX = Math.max(width * 0.36, 0.22)
  const terminalX = Math.max(width * 0.3, 0.18)
  const terminalZ = Math.max(depth * 0.28, 0.16)
  const lowerY = coilY - coilHeight * 0.5
  const upperY = coilY + coilHeight * 0.5

  const copperMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-magnet-copper-winding-mat`,
    '#b96b2f',
    '#2a1004',
    0.82,
    0.32,
  )
  const brassMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-magnet-bolted-brass-mat`,
    '#bd8232',
    '#261207',
    0.76,
    0.36,
  )
  const ceramicMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-magnet-ceramic-core-mat`,
    '#d8d1bb',
    '#15120b',
    0.05,
    0.54,
    'utility',
  )
  const darkInsulatorMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-magnet-dark-insulator-mat`,
    '#151716',
    '#030303',
    0.16,
    0.82,
    'rubber',
  )
  const steelYokeMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-magnet-laminated-yoke-mat`,
    '#59605d',
    '#080a0a',
    0.86,
    0.43,
    'utility',
  )

  const base = MeshBuilder.CreateBox(
    `${role}-${blockId}-magnet-bolted-plinth`,
    {
      width: baseWidth,
      height: baseHeight,
      depth: baseDepth,
    },
    scene,
  )
  const isolationPad = MeshBuilder.CreateBox(
    `${role}-${blockId}-magnet-rubber-isolation-pad`,
    {
      width: Math.max(baseWidth * 0.72, 0.36),
      height: Math.max(height * 0.045, 0.026),
      depth: Math.max(baseDepth * 0.68, 0.34),
    },
    scene,
  )
  const core = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-magnet-ceramic-solenoid-core`,
    {
      height: coilHeight,
      diameter: coilDiameter,
      tessellation: 32,
    },
    scene,
  )
  const lowerFlange = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-magnet-lower-bolted-flange`,
    {
      height: Math.max(height * 0.085, 0.048),
      diameter: flangeDiameter,
      tessellation: 32,
    },
    scene,
  )
  const upperFlange = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-magnet-upper-bolted-flange`,
    {
      height: Math.max(height * 0.085, 0.048),
      diameter: flangeDiameter,
      tessellation: 32,
    },
    scene,
  )
  const topTerminalCap = MeshBuilder.CreateSphere(
    `${role}-${blockId}-magnet-domed-top-terminal`,
    { diameter: Math.max(coilDiameter * 0.45, 0.14), segments: 16 },
    scene,
  )

  base.position.y = Math.max(height * 0.08, 0.045)
  isolationPad.position.y = base.position.y + baseHeight * 0.62
  core.position.y = coilY
  lowerFlange.position.y = lowerY
  upperFlange.position.y = upperY
  topTerminalCap.position.y = upperY + Math.max(height * 0.12, 0.07)
  topTerminalCap.scaling.y = 0.42
  attachUtilityMesh(base, parent, darkInsulatorMaterial, 'rubber')
  attachUtilityMesh(isolationPad, parent, darkInsulatorMaterial, 'rubber')
  attachUtilityMesh(core, parent, ceramicMaterial, 'damageable')
  attachUtilityMesh(lowerFlange, parent, brassMaterial, 'weapon_edge')
  attachUtilityMesh(upperFlange, parent, brassMaterial, 'weapon_edge')
  attachUtilityMesh(topTerminalCap, parent, materials.steel, 'weapon_edge')

  for (let index = 0; index < 10; index += 1) {
    const winding = MeshBuilder.CreateTorus(
      `${role}-${blockId}-magnet-copper-winding-ring-${index}`,
      {
        diameter: Math.max(coilDiameter * 1.16, 0.34),
        thickness: Math.max(width * 0.022, 0.014),
        tessellation: 32,
      },
      scene,
    )

    winding.position.y = lowerY + Math.max(height * 0.08, 0.045) + index * ((coilHeight - Math.max(height * 0.16, 0.09)) / 9)
    attachUtilityMesh(winding, parent, copperMaterial, 'weapon_edge')
  }

  for (let index = 0; index < 4; index += 1) {
    const separator = MeshBuilder.CreateTorus(
      `${role}-${blockId}-magnet-silver-lamination-band-${index}`,
      {
        diameter: Math.max(coilDiameter * 1.22, 0.36),
        thickness: Math.max(width * 0.014, 0.01),
        tessellation: 28,
      },
      scene,
    )

    separator.position.y = lowerY + Math.max(height * 0.15, 0.08) + index * Math.max(height * 0.14, 0.075)
    attachUtilityMesh(separator, parent, materials.steel, 'weapon_edge')
  }

  for (const side of [-1, 1]) {
    const yoke = MeshBuilder.CreateBox(
      `${role}-${blockId}-magnet-laminated-side-yoke-${side}`,
      {
        width: Math.max(width * 0.11, 0.065),
        height: Math.max(coilHeight * 0.92, 0.34),
        depth: Math.max(depth * 0.56, 0.3),
      },
      scene,
    )
    const poleShoe = MeshBuilder.CreateBox(
      `${role}-${blockId}-magnet-soft-iron-pole-shoe-${side}`,
      {
        width: Math.max(width * 0.16, 0.09),
        height: Math.max(height * 0.13, 0.075),
        depth: Math.max(depth * 0.34, 0.18),
      },
      scene,
    )
    const bridgeConductor = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-magnet-copper-bridge-conductor-${side}`,
      {
        height: Math.max(depth * 0.58, 0.32),
        diameter: Math.max(width * 0.035, 0.022),
        tessellation: 12,
      },
      scene,
    )

    yoke.position.set(side * yokeX, coilY, 0)
    poleShoe.position.set(side * yokeX, lowerY + Math.max(height * 0.12, 0.07), Math.max(depth * 0.28, 0.16))
    bridgeConductor.rotation.x = Math.PI / 2
    bridgeConductor.position.set(side * Math.max(width * 0.22, 0.14), upperY + Math.max(height * 0.08, 0.05), 0)
    attachUtilityMesh(yoke, parent, steelYokeMaterial, 'weapon_edge')
    attachUtilityMesh(poleShoe, parent, steelYokeMaterial, 'weapon_edge')
    attachUtilityMesh(bridgeConductor, parent, copperMaterial, 'weapon_edge')
  }

  for (const x of [-terminalX, terminalX]) {
    for (const z of [-terminalZ, terminalZ]) {
      const post = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-magnet-insulated-terminal-post-${x}-${z}`,
        {
          height: Math.max(height * 0.28, 0.16),
          diameter: Math.max(width * 0.04, 0.026),
          tessellation: 12,
        },
        scene,
      )
      const cap = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-magnet-terminal-nut-${x}-${z}`,
        {
          height: Math.max(height * 0.035, 0.022),
          diameter: Math.max(width * 0.08, 0.045),
          tessellation: 12,
        },
        scene,
      )

      post.position.set(x, upperY + Math.max(height * 0.08, 0.045), z)
      cap.position.set(x, post.position.y + Math.max(height * 0.15, 0.085), z)
      attachUtilityMesh(post, parent, darkInsulatorMaterial, 'rubber')
      attachUtilityMesh(cap, parent, brassMaterial, 'weapon_edge')
    }
  }

  for (const side of [-1, 1]) {
    const polarityPlate = MeshBuilder.CreateBox(
      `${role}-${blockId}-magnet-polarity-service-plate-${side}`,
      {
        width: Math.max(width * 0.18, 0.1),
        height: Math.max(height * 0.02, 0.014),
        depth: Math.max(depth * 0.08, 0.045),
      },
      scene,
    )

    polarityPlate.position.set(side * Math.max(width * 0.28, 0.16), base.position.y + baseHeight * 0.74, baseDepth * 0.46)
    attachUtilityMesh(polarityPlate, parent, side > 0 ? material : materials.warning, side > 0 ? 'damageable' : 'trim')
  }

  for (let index = 0; index < 6; index += 1) {
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-magnet-plinth-bolt-${index}`,
      {
        height: Math.max(height * 0.025, 0.016),
        diameter: Math.max(width * 0.045, 0.028),
        tessellation: 10,
      },
      scene,
    )
    const angle = (index / 6) * Math.PI * 2

    bolt.position.set(
      Math.cos(angle) * baseWidth * 0.34,
      base.position.y + baseHeight * 0.58,
      Math.sin(angle) * baseDepth * 0.32,
    )
    attachUtilityMesh(bolt, parent, materials.steel, 'weapon_edge')
  }

  for (let index = 0; index < 8; index += 1) {
    const flangeBolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-magnet-upper-flange-bolt-${index}`,
      {
        height: Math.max(height * 0.022, 0.014),
        diameter: Math.max(width * 0.04, 0.024),
        tessellation: 10,
      },
      scene,
    )
    const angle = (index / 8) * Math.PI * 2

    flangeBolt.position.set(
      Math.cos(angle) * flangeDiameter * 0.38,
      upperY + Math.max(height * 0.05, 0.03),
      Math.sin(angle) * flangeDiameter * 0.38,
    )
    attachUtilityMesh(flangeBolt, parent, materials.steel, 'weapon_edge')
  }

  const fieldRoot = new TransformNode(`${role}-${blockId}-magnet-field-pulse-root`, scene)

  fieldRoot.parent = parent
  fieldRoot.metadata = { kind: 'pulse', speed: 0.018 }

  for (let index = 0; index < 3; index += 1) {
    const fieldRing = MeshBuilder.CreateTorus(
      `${role}-${blockId}-magnet-team-field-ring-${index}`,
      {
        diameter: Math.max(coilDiameter * (1.55 + index * 0.2), 0.44),
        thickness: Math.max(width * 0.014, 0.01),
        tessellation: 32,
      },
      scene,
    )

    fieldRing.position.y = coilY - Math.max(height * 0.18, 0.1) + index * Math.max(height * 0.18, 0.1)
    attachUtilityMesh(fieldRing, fieldRoot, material, 'emissive')
  }

  const teamStatusStrip = MeshBuilder.CreateBox(
    `${role}-${blockId}-magnet-team-status-strip`,
    {
      width: Math.max(width * 0.36, 0.2),
      height: Math.max(height * 0.025, 0.016),
      depth: Math.max(depth * 0.055, 0.032),
    },
    scene,
  )

  teamStatusStrip.position.set(0, base.position.y + baseHeight * 0.72, -baseDepth * 0.54)
  attachUtilityMesh(teamStatusStrip, parent, material, 'damageable')
}
