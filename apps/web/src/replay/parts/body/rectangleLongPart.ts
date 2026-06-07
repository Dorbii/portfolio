import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh } from '../../rendering/meshHelpers'
import { tagPartChildMaterialRole } from '../../rendering/materials'
import {
  createFaceBoltRow,
  createTaggedBoxDetail,
  createTopBoltGrid,
} from './bodyDetails'
import type { BodyPartRenderArgs } from './types'

export function createRectangleLongBodyPart({
  scene,
  parent,
  material,
  width,
  height,
  depth,
  materials,
}: BodyPartRenderArgs): void {
  // CODEX_INTENT: make the long chassis read nose-to-tail in replay without changing catalog or sim semantics.
  // CODEX_RISK: behavioral
  // CODEX_CONFIDENCE: medium
  // CODEX_REVIEW: pending

  const visualWidth = Math.max(width * 0.56, 0.86)
  const visualDepth = Math.max(depth * 1.68, 1.72)
  const bodyHeight = Math.max(height, 0.42)
  const deckY = Math.max(bodyHeight * 0.58, 0.31)
  const spine = MeshBuilder.CreateBox(
    `${parent.name}-long-control-spine`,
    { width: visualWidth, height: bodyHeight, depth: visualDepth },
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

  noseDeck.position.set(0, deckY, visualDepth * 0.38)
  rearModule.position.set(0, Math.max(bodyHeight * 0.7, 0.36), -visualDepth * 0.36)
  attachMesh(spine, parent, material)
  attachMesh(noseDeck, parent, materials.utility)
  attachMesh(rearModule, parent, materials.trim)
  tagPartChildMaterialRole(spine, 'damageable')
  tagPartChildMaterialRole(noseDeck, 'damageable')
  tagPartChildMaterialRole(rearModule, 'trim')

  for (let side = -1; side <= 1; side += 2) {
    createTaggedBoxDetail(
      scene,
      parent,
      materials.trim,
      `${parent.name}-long-control-side-rail-${side}`,
      Math.max(visualWidth * 0.12, 0.08),
      Math.max(bodyHeight * 0.2, 0.1),
      visualDepth * 0.86,
      side * visualWidth * 0.52,
      Math.max(bodyHeight * 0.28, 0.18),
      -visualDepth * 0.02,
      'trim',
    )
    createTaggedBoxDetail(
      scene,
      parent,
      materials.light,
      `${parent.name}-long-control-side-light-${side}`,
      0.045,
      0.07,
      visualDepth * 0.48,
      side * visualWidth * 0.58,
      Math.max(bodyHeight * 0.58, 0.3),
      visualDepth * 0.04,
      'emissive',
    )
    createTaggedBoxDetail(
      scene,
      parent,
      materials.armor,
      `${parent.name}-long-control-side-mount-strip-${side}`,
      Math.max(visualWidth * 0.06, 0.05),
      Math.max(bodyHeight * 0.14, 0.08),
      visualDepth * 0.28,
      side * visualWidth * 0.46,
      Math.max(bodyHeight * 0.64, 0.32),
      -visualDepth * 0.24,
      'damageable',
    )
  }

  createTaggedBoxDetail(
    scene,
    parent,
    materials.steel,
    `${parent.name}-long-control-center-hardpoint`,
    visualWidth * 0.48,
    0.055,
    visualDepth * 0.2,
    0,
    deckY + 0.09,
    -visualDepth * 0.02,
    'trim',
  )
  createTaggedBoxDetail(
    scene,
    parent,
    materials.damageByRole.damageable.light,
    `${parent.name}-long-control-scraped-nose-skin`,
    visualWidth * 0.52,
    0.026,
    visualDepth * 0.16,
    0,
    deckY + 0.08,
    visualDepth * 0.42,
    'damageable',
  )
  createTopBoltGrid(scene, parent, materials.trim, `${parent.name}-long-control-hardpoint-bolt`, {
    columns: 2,
    depth: visualDepth * 0.14,
    rows: 2,
    width: visualWidth * 0.34,
    y: deckY + 0.14,
  })
  createFaceBoltRow(scene, parent, materials.trim, `${parent.name}-long-control-nose-fastener`, {
    axis: 'z',
    count: 3,
    fixed: visualDepth * 0.51,
    length: visualWidth * 0.5,
    y: Math.max(bodyHeight * 0.3, 0.18),
  })
}
