import {
  createFaceBoltRow,
  createTaggedBoxDetail,
  createTaggedCylinder,
  createTopBoltGrid,
} from './bodyDetails'
import { createRaisedTechCluster } from './techDetails'
import type { BodyPartRenderArgs } from './types'

export function createSolidBodyPart(args: BodyPartRenderArgs): void {
  if (args.partId === 'Frame_Strut') {
    createFrameStrut(args)
    return
  }

  if (args.partId === 'Mount_Plate') {
    createMountPlate(args)
    return
  }

  if (args.partId === 'Spacer_Block') {
    createSpacerBlock(args)
    return
  }

  createSquareCore(args)
}

function createSquareCore({
  scene,
  parent,
  material,
  partId,
  width,
  height,
  depth,
  materials,
}: BodyPartRenderArgs): void {
  const isLarge = partId === 'Body_Square_Large'
  const isSmall = partId === 'Body_Square_Small'
  const bodyHeight = Math.max(height, isLarge ? 0.52 : 0.38)
  const topY = Math.max(bodyHeight * 0.54, 0.24)

  createTaggedBoxDetail(
    scene,
    parent,
    material,
    `${parent.name}-square-core-shell`,
    width,
    bodyHeight,
    depth,
    0,
    0,
    0,
    'damageable',
  )
  createTaggedBoxDetail(
    scene,
    parent,
    materials.armor,
    `${parent.name}-square-core-top-armor`,
    width * (isSmall ? 0.68 : 0.76),
    Math.max(bodyHeight * 0.12, 0.055),
    depth * (isSmall ? 0.68 : 0.76),
    0,
    topY,
    0,
    'damageable',
  )
  createTaggedBoxDetail(
    scene,
    parent,
    materials.trim,
    `${parent.name}-square-core-front-service-rail`,
    width * 0.78,
    Math.max(bodyHeight * 0.14, 0.07),
    Math.max(depth * 0.08, 0.06),
    0,
    Math.max(bodyHeight * 0.18, 0.12),
    depth * 0.52,
    'trim',
  )
  createTaggedBoxDetail(
    scene,
    parent,
    materials.trim,
    `${parent.name}-square-core-rear-service-rail`,
    width * 0.64,
    Math.max(bodyHeight * 0.11, 0.06),
    Math.max(depth * 0.07, 0.055),
    0,
    Math.max(bodyHeight * 0.2, 0.12),
    -depth * 0.52,
    'trim',
  )

  for (let side = -1; side <= 1; side += 2) {
    createTaggedBoxDetail(
      scene,
      parent,
      materials.trim,
      `${parent.name}-square-core-side-socket-${side}`,
      Math.max(width * 0.08, 0.055),
      Math.max(bodyHeight * 0.24, 0.1),
      depth * (isSmall ? 0.34 : 0.42),
      side * width * 0.52,
      Math.max(bodyHeight * 0.12, 0.08),
      0,
      'trim',
    )
  }

  if (isLarge) {
    createLargeSquareDetails(scene, parent, material, width, bodyHeight, depth, materials)
  } else if (isSmall) {
    createSmallSquareDetails(scene, parent, width, bodyHeight, depth, materials)
  } else {
    createMediumSquareDetails(scene, parent, width, bodyHeight, depth, materials)
  }

  createRaisedTechCluster(scene, parent, materials, width, bodyHeight, depth)
}

function createLargeSquareDetails(
  scene: BodyPartRenderArgs['scene'],
  parent: BodyPartRenderArgs['parent'],
  material: BodyPartRenderArgs['material'],
  width: number,
  height: number,
  depth: number,
  materials: BodyPartRenderArgs['materials'],
): void {
  for (let xSide = -1; xSide <= 1; xSide += 2) {
    for (let zSide = -1; zSide <= 1; zSide += 2) {
      createTaggedBoxDetail(
        scene,
        parent,
        materials.trim,
        `${parent.name}-square-large-corner-post-${xSide}-${zSide}`,
        Math.max(width * 0.14, 0.08),
        Math.max(height * 0.38, 0.16),
        Math.max(depth * 0.14, 0.08),
        xSide * width * 0.42,
        Math.max(height * 0.2, 0.12),
        zSide * depth * 0.42,
        'trim',
      )
    }
  }

  createTaggedBoxDetail(
    scene,
    parent,
    materials.damageByRole.damageable.light,
    `${parent.name}-square-large-scarred-access-hatch`,
    width * 0.42,
    0.024,
    depth * 0.34,
    -width * 0.08,
    Math.max(height * 0.68, 0.32),
    depth * 0.06,
    'damageable',
  )
  createTaggedBoxDetail(
    scene,
    parent,
    material,
    `${parent.name}-square-large-overlapping-front-plate`,
    width * 0.6,
    Math.max(height * 0.22, 0.1),
    Math.max(depth * 0.07, 0.06),
    0,
    Math.max(height * 0.36, 0.18),
    depth * 0.57,
    'damageable',
  )
  createTopBoltGrid(scene, parent, materials.trim, `${parent.name}-square-large-top-bolt`, {
    columns: 3,
    depth: depth * 0.5,
    rows: 3,
    width: width * 0.5,
    y: Math.max(height * 0.68, 0.32),
  })
}

function createMediumSquareDetails(
  scene: BodyPartRenderArgs['scene'],
  parent: BodyPartRenderArgs['parent'],
  width: number,
  height: number,
  depth: number,
  materials: BodyPartRenderArgs['materials'],
): void {
  createTaggedBoxDetail(
    scene,
    parent,
    materials.trim,
    `${parent.name}-square-medium-cross-seam-x`,
    width * 0.62,
    0.02,
    0.03,
    0,
    Math.max(height * 0.67, 0.29),
    0,
    'trim',
  )
  createTaggedBoxDetail(
    scene,
    parent,
    materials.trim,
    `${parent.name}-square-medium-cross-seam-z`,
    0.03,
    0.02,
    depth * 0.62,
    0,
    Math.max(height * 0.67, 0.29),
    0,
    'trim',
  )
  createTopBoltGrid(scene, parent, materials.trim, `${parent.name}-square-medium-top-bolt`, {
    columns: 2,
    depth: depth * 0.5,
    rows: 2,
    width: width * 0.5,
    y: Math.max(height * 0.68, 0.3),
  })
}

function createSmallSquareDetails(
  scene: BodyPartRenderArgs['scene'],
  parent: BodyPartRenderArgs['parent'],
  width: number,
  height: number,
  depth: number,
  materials: BodyPartRenderArgs['materials'],
): void {
  createTaggedBoxDetail(
    scene,
    parent,
    materials.steel,
    `${parent.name}-square-small-top-hardpoint`,
    Math.max(width * 0.46, 0.22),
    0.05,
    Math.max(depth * 0.42, 0.2),
    0,
    Math.max(height * 0.7, 0.28),
    0,
    'trim',
  )
  createTopBoltGrid(scene, parent, materials.trim, `${parent.name}-square-small-hardpoint-bolt`, {
    columns: 2,
    depth: Math.max(depth * 0.28, 0.13),
    rows: 2,
    width: Math.max(width * 0.3, 0.14),
    y: Math.max(height * 0.76, 0.32),
  })
}

function createFrameStrut({
  scene,
  parent,
  material,
  width,
  height,
  depth,
  materials,
}: BodyPartRenderArgs): void {
  const beamDepth = Math.max(depth * 0.9, 0.44)
  const webHeight = Math.max(height * 0.28, 0.12)
  const topY = Math.max(height * 0.16, 0.1)

  createTaggedBoxDetail(scene, parent, material, `${parent.name}-strut-center-web`, width * 0.26, webHeight, beamDepth, 0, topY, 0, 'damageable')
  createTaggedBoxDetail(scene, parent, materials.trim, `${parent.name}-strut-top-flange`, width * 0.72, 0.055, beamDepth, 0, topY + webHeight * 0.58, 0, 'trim')
  createTaggedBoxDetail(scene, parent, materials.trim, `${parent.name}-strut-bottom-flange`, width * 0.72, 0.055, beamDepth, 0, topY - webHeight * 0.58, 0, 'trim')

  for (let side = -1; side <= 1; side += 2) {
    createTaggedBoxDetail(
      scene,
      parent,
      materials.steel,
      `${parent.name}-strut-bolted-end-tab-${side}`,
      width * 0.62,
      0.07,
      Math.max(depth * 0.16, 0.08),
      0,
      topY,
      side * beamDepth * 0.52,
      'trim',
    )
  }

  createFaceBoltRow(scene, parent, materials.trim, `${parent.name}-strut-front-tab-bolt`, {
    axis: 'z',
    count: 2,
    fixed: beamDepth * 0.6,
    length: width * 0.36,
    y: topY + 0.055,
  })
  createFaceBoltRow(scene, parent, materials.trim, `${parent.name}-strut-rear-tab-bolt`, {
    axis: 'z',
    count: 2,
    fixed: -beamDepth * 0.6,
    length: width * 0.36,
    y: topY + 0.055,
  })
}

function createMountPlate({
  scene,
  parent,
  material,
  width,
  height,
  depth,
  materials,
}: BodyPartRenderArgs): void {
  const plateHeight = Math.max(height * 0.16, 0.07)
  const plateY = Math.max(height * 0.1, 0.07)

  createTaggedBoxDetail(scene, parent, material, `${parent.name}-mount-flat-base-plate`, width * 0.94, plateHeight, depth * 0.94, 0, plateY, 0, 'damageable')
  createTaggedBoxDetail(scene, parent, materials.steel, `${parent.name}-mount-raised-hardpoint`, width * 0.46, 0.07, depth * 0.46, 0, plateY + plateHeight * 0.75, 0, 'trim')
  createTaggedBoxDetail(scene, parent, materials.warning, `${parent.name}-mount-alignment-stripe`, width * 0.66, 0.026, Math.max(depth * 0.08, 0.05), 0, plateY + plateHeight * 1.3, depth * 0.22, 'trim')

  for (let side = -1; side <= 1; side += 2) {
    createTaggedBoxDetail(
      scene,
      parent,
      materials.trim,
      `${parent.name}-mount-side-clamp-ear-${side}`,
      Math.max(width * 0.1, 0.06),
      0.08,
      depth * 0.58,
      side * width * 0.44,
      plateY + plateHeight * 0.9,
      0,
      'trim',
    )
  }

  createTopBoltGrid(scene, parent, materials.trim, `${parent.name}-mount-corner-bolt`, {
    columns: 2,
    depth: depth * 0.64,
    rows: 2,
    width: width * 0.64,
    y: plateY + plateHeight * 1.35,
  })
}

function createSpacerBlock({
  scene,
  parent,
  material,
  width,
  height,
  depth,
  materials,
}: BodyPartRenderArgs): void {
  const blockHeight = Math.max(height * 0.46, 0.18)
  const blockY = Math.max(height * 0.2, 0.12)

  createTaggedBoxDetail(scene, parent, material, `${parent.name}-spacer-load-block`, width * 0.56, blockHeight, depth * 0.56, 0, blockY, 0, 'damageable')
  createTaggedBoxDetail(scene, parent, materials.trim, `${parent.name}-spacer-top-washer-plate`, width * 0.7, 0.05, depth * 0.7, 0, blockY + blockHeight * 0.56, 0, 'trim')
  createTaggedBoxDetail(scene, parent, materials.trim, `${parent.name}-spacer-bottom-washer-plate`, width * 0.7, 0.05, depth * 0.7, 0, blockY - blockHeight * 0.56, 0, 'trim')

  for (let xSide = -1; xSide <= 1; xSide += 2) {
    for (let zSide = -1; zSide <= 1; zSide += 2) {
      createTaggedCylinder(scene, parent, materials.steel, `${parent.name}-spacer-standoff-pin-${xSide}-${zSide}`, {
        diameter: 0.04,
        height: blockHeight * 1.25,
        role: 'trim',
        tessellation: 8,
        x: xSide * width * 0.24,
        y: blockY,
        z: zSide * depth * 0.24,
      })
    }
  }
}
