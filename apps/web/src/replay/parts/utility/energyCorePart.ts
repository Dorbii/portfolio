import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import { createPbrSceneMaterial, createSceneMaterial } from '../../rendering/sceneUtils'
import type { UtilityPartRenderArgs } from './types'

export function createEnergyCorePart({
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

  const baseWidth = Math.max(width * 0.86, 0.48)
  const baseDepth = Math.max(depth * 0.86, 0.48)
  const baseHeight = Math.max(height * 0.16, 0.08)
  const vesselSize = Math.max(Math.min(width, depth) * 0.48, 0.28)
  const vesselY = Math.max(height * 0.48, 0.28)
  const topRailY = vesselY + Math.max(height * 0.38, 0.21)
  const bottomRailY = vesselY - Math.max(height * 0.34, 0.18)
  const cornerX = Math.max(width * 0.36, 0.2)
  const cornerZ = Math.max(depth * 0.36, 0.2)
  const glassMaterial = createSceneMaterial(
    scene,
    `${role}-${blockId}-energy-core-containment-glass-mat`,
    '#8ff4ff',
    '#134f5a',
    0.34,
    0.52,
  )
  const brassMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-energy-core-machined-brass-mat`,
    '#b7822f',
    '#171006',
    0.78,
    0.34,
  )
  const copperMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-energy-core-wound-copper-mat`,
    '#a8642e',
    '#241006',
    0.76,
    0.38,
  )
  const darkInsulatorMaterial = createPbrSceneMaterial(
    scene,
    `${role}-${blockId}-energy-core-dark-insulator-mat`,
    '#171819',
    '#030303',
    0.12,
    0.82,
  )
  const amberMaterial = createSceneMaterial(
    scene,
    `${role}-${blockId}-energy-core-amber-charge-mat`,
    '#f3b35c',
    '#ff6a12',
    0.66,
    0.28,
  )

  const base = MeshBuilder.CreateBox(
    `${role}-${blockId}-energy-core-bolted-plinth`,
    {
      width: baseWidth,
      height: baseHeight,
      depth: baseDepth,
    },
    scene,
  )
  const lowerInsulator = MeshBuilder.CreateBox(
    `${role}-${blockId}-energy-core-rubber-isolation-pad`,
    {
      width: Math.max(baseWidth * 0.72, 0.36),
      height: Math.max(height * 0.055, 0.032),
      depth: Math.max(baseDepth * 0.72, 0.36),
    },
    scene,
  )
  const glassCube = MeshBuilder.CreateBox(
    `${role}-${blockId}-energy-core-containment-vessel`,
    {
      width: vesselSize,
      height: Math.max(height * 0.62, 0.34),
      depth: vesselSize,
    },
    scene,
  )
  const chargeColumn = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-energy-core-pulse-column`,
    {
      height: Math.max(height * 0.38, 0.22),
      diameter: Math.max(width * 0.13, 0.075),
      tessellation: 18,
    },
    scene,
  )
  const chargeSleeve = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-energy-core-amber-charge-sleeve`,
    {
      height: Math.max(height * 0.28, 0.16),
      diameter: Math.max(width * 0.22, 0.125),
      tessellation: 18,
    },
    scene,
  )
  const topLens = MeshBuilder.CreateCylinder(
    `${role}-${blockId}-energy-core-top-energy-lens`,
    {
      height: Math.max(height * 0.055, 0.032),
      diameter: Math.max(width * 0.13, 0.075),
      tessellation: 20,
    },
    scene,
  )
  const topPlate = MeshBuilder.CreateBox(
    `${role}-${blockId}-energy-core-bolted-top-plate`,
    {
      width: Math.max(vesselSize * 0.58, 0.18),
      height: Math.max(height * 0.055, 0.032),
      depth: Math.max(vesselSize * 0.58, 0.18),
    },
    scene,
  )
  const bottomPlate = MeshBuilder.CreateBox(
    `${role}-${blockId}-energy-core-bolted-bottom-plate`,
    {
      width: Math.max(vesselSize * 1.18, 0.34),
      height: Math.max(height * 0.07, 0.04),
      depth: Math.max(vesselSize * 1.18, 0.34),
    },
    scene,
  )

  base.position.y = Math.max(height * 0.1, 0.06)
  lowerInsulator.position.y = base.position.y + baseHeight * 0.68
  glassCube.position.y = vesselY
  chargeColumn.position.y = vesselY
  chargeColumn.metadata = { kind: 'pulse', speed: 0.032 }
  chargeSleeve.position.y = vesselY
  chargeSleeve.metadata = { kind: 'pulse', speed: 0.024 }
  topPlate.position.y = topRailY
  bottomPlate.position.y = bottomRailY
  topLens.position.y = topRailY + Math.max(height * 0.05, 0.03)
  attachMesh(base, parent, darkInsulatorMaterial)
  attachMesh(lowerInsulator, parent, darkInsulatorMaterial)
  attachMesh(glassCube, parent, glassMaterial)
  attachMesh(chargeColumn, parent, materials.light)
  attachMesh(chargeSleeve, parent, amberMaterial)
  attachMesh(topPlate, parent, brassMaterial)
  attachMesh(bottomPlate, parent, brassMaterial)
  attachMesh(topLens, parent, amberMaterial)

  for (let index = 0; index < 3; index += 1) {
    const coil = MeshBuilder.CreateTorus(
      `${role}-${blockId}-energy-core-induction-coil-ring-${index}`,
      {
        diameter: Math.max(vesselSize * (1.04 + index * 0.08), 0.3),
        thickness: 0.018,
        tessellation: 28,
      },
      scene,
    )

    coil.position.y = vesselY - Math.max(height * 0.2, 0.1) + index * Math.max(height * 0.2, 0.1)
    attachMesh(coil, parent, index === 1 ? materials.steel : copperMaterial)
  }

  for (const x of [-cornerX, cornerX]) {
    for (const z of [-cornerZ, cornerZ]) {
      const pillar = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-energy-core-cage-corner-pillar-${x}-${z}`,
        {
          height: Math.max(height * 0.74, 0.42),
          diameter: 0.032,
          tessellation: 10,
        },
        scene,
      )
      const foot = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-energy-core-cage-foot-${x}-${z}`,
        {
          height: 0.035,
          diameter: 0.07,
          tessellation: 12,
        },
        scene,
      )
      const cap = MeshBuilder.CreateSphere(
        `${role}-${blockId}-energy-core-cage-cap-node-${x}-${z}`,
        { diameter: 0.07, segments: 10 },
        scene,
      )

      pillar.position.set(x, vesselY, z)
      foot.position.set(x, bottomRailY - Math.max(height * 0.06, 0.035), z)
      cap.position.set(x, topRailY + Math.max(height * 0.06, 0.035), z)
      attachMesh(pillar, parent, brassMaterial)
      attachMesh(foot, parent, darkInsulatorMaterial)
      attachMesh(cap, parent, brassMaterial)
    }
  }

  for (const railY of [bottomRailY, topRailY]) {
    for (const z of [-cornerZ, cornerZ]) {
      const rail = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-energy-core-cage-x-rail-${railY}-${z}`,
        {
          height: cornerX * 2,
          diameter: 0.026,
          tessellation: 8,
        },
        scene,
      )

      rail.rotation.z = Math.PI / 2
      rail.position.set(0, railY, z)
      attachMesh(rail, parent, brassMaterial)
    }

    for (const x of [-cornerX, cornerX]) {
      const rail = MeshBuilder.CreateCylinder(
        `${role}-${blockId}-energy-core-cage-z-rail-${railY}-${x}`,
        {
          height: cornerZ * 2,
          diameter: 0.026,
          tessellation: 8,
        },
        scene,
      )

      rail.rotation.x = Math.PI / 2
      rail.position.set(x, railY, 0)
      attachMesh(rail, parent, brassMaterial)
    }
  }

  for (const side of [-1, 1]) {
    const conduit = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-energy-core-service-conduit-${side}`,
      {
        height: Math.max(depth * 0.74, 0.4),
        diameter: 0.026,
        tessellation: 8,
      },
      scene,
    )
    const sideGear = MeshBuilder.CreateTorus(
      `${role}-${blockId}-energy-core-side-gear-ring-${side}`,
      {
        diameter: Math.max(width * 0.22, 0.13),
        thickness: 0.018,
        tessellation: 18,
      },
      scene,
    )
    const sideHub = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-energy-core-side-gear-hub-${side}`,
      {
        height: 0.035,
        diameter: Math.max(width * 0.09, 0.055),
        tessellation: 12,
      },
      scene,
    )

    conduit.rotation.x = Math.PI / 2
    conduit.position.set(side * Math.max(width * 0.45, 0.25), Math.max(height * 0.22, 0.13), 0)
    sideGear.rotation.y = Math.PI / 2
    sideGear.position.set(side * Math.max(width * 0.48, 0.28), vesselY - Math.max(height * 0.03, 0.018), 0)
    sideHub.rotation.z = Math.PI / 2
    sideHub.position.copyFrom(sideGear.position)
    attachMesh(conduit, parent, materials.steel)
    attachMesh(sideGear, parent, brassMaterial)
    attachMesh(sideHub, parent, materials.steel)

    for (let toothIndex = 0; toothIndex < 8; toothIndex += 1) {
      const angle = (toothIndex / 8) * Math.PI * 2
      const tooth = MeshBuilder.CreateBox(
        `${role}-${blockId}-energy-core-side-gear-tooth-${side}-${toothIndex}`,
        {
          width: 0.026,
          height: 0.04,
          depth: 0.018,
        },
        scene,
      )

      tooth.position.set(
        side * Math.max(width * 0.49, 0.29),
        sideGear.position.y + Math.sin(angle) * Math.max(width * 0.12, 0.07),
        Math.cos(angle) * Math.max(width * 0.12, 0.07),
      )
      tooth.rotation.x = angle
      attachMesh(tooth, parent, brassMaterial)
    }
  }

  for (let index = 0; index < 4; index += 1) {
    const bolt = MeshBuilder.CreateCylinder(
      `${role}-${blockId}-energy-core-plinth-bolt-${index}`,
      { height: 0.022, diameter: 0.04, tessellation: 10 },
      scene,
    )
    const x = index % 2 === 0 ? -baseWidth * 0.34 : baseWidth * 0.34
    const z = index < 2 ? -baseDepth * 0.34 : baseDepth * 0.34

    bolt.position.set(x, base.position.y + baseHeight * 0.62, z)
    attachMesh(bolt, parent, materials.steel)
  }

  const teamStatusStrip = MeshBuilder.CreateBox(
    `${role}-${blockId}-energy-core-team-status-strip`,
    {
      width: Math.max(width * 0.34, 0.18),
      height: 0.02,
      depth: Math.max(depth * 0.04, 0.026),
    },
    scene,
  )

  teamStatusStrip.position.set(0, base.position.y + baseHeight * 0.7, -baseDepth * 0.54)
  attachMesh(teamStatusStrip, parent, material)
}
