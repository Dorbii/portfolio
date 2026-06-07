import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh, createBoxDetail } from '../../rendering/meshHelpers'
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
    const spine = MeshBuilder.CreateBox(
      `${parent.name}-long-control-spine`,
      { width: visualWidth, height: Math.max(height, 0.42), depth: visualDepth },
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

    noseDeck.position.set(0, Math.max(height * 0.58, 0.31), visualDepth * 0.38)
    rearModule.position.set(0, Math.max(height * 0.7, 0.36), -visualDepth * 0.36)
    attachMesh(spine, parent, material)
    attachMesh(noseDeck, parent, materials.utility)
    attachMesh(rearModule, parent, materials.trim)

    for (let side = -1; side <= 1; side += 2) {
      createBoxDetail(
        scene,
        parent,
        materials.light,
        `${parent.name}-long-control-side-light-${side}`,
        0.045,
        0.07,
        visualDepth * 0.52,
        side * visualWidth * 0.55,
        Math.max(height * 0.58, 0.3),
        visualDepth * 0.04,
      )
    }
}
