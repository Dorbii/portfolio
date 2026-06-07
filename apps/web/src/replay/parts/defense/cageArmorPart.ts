import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { attachMesh, createBoxDetail } from '../../rendering/meshHelpers'
import type { DefensePartRenderArgs } from './types'

export function createCageArmorPart({
  scene,
  parent,
  material,
  role,
  blockId,
  width,
  height,
  depth,
  materials,
}: DefensePartRenderArgs): void {

    const cageWidth = Math.max(width * 0.94, 0.58)
    const cageDepth = Math.max(depth * 0.94, 0.58)
    const cageHeight = Math.max(height * 0.74, 0.42)
    const postDiameter = Math.max(Math.min(width, depth) * 0.055, 0.045)
    const railThickness = Math.max(postDiameter * 0.9, 0.04)
    const baseY = Math.max(height * 0.06, 0.05)
    const topY = baseY + cageHeight
    const belly = MeshBuilder.CreateBox(
      `${role}-${blockId}-cage-belly-armor`,
      { width: cageWidth, height: Math.max(height * 0.16, 0.1), depth: cageDepth },
      scene,
    )

    belly.position.y = baseY
    attachMesh(belly, parent, material)

    for (const x of [-cageWidth * 0.46, cageWidth * 0.46]) {
      for (const z of [-cageDepth * 0.46, cageDepth * 0.46]) {
        const post = MeshBuilder.CreateCylinder(
          `${role}-${blockId}-cage-post-${x > 0 ? 'r' : 'l'}-${z > 0 ? 'f' : 'b'}`,
          { height: cageHeight, diameter: postDiameter, tessellation: 10 },
          scene,
        )

        post.position.set(x, baseY + cageHeight * 0.5, z)
        attachMesh(post, parent, materials.steel)
      }
    }

    createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-cage-front-rail`, cageWidth, railThickness, railThickness, 0, topY, cageDepth * 0.46)
    createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-cage-rear-rail`, cageWidth, railThickness, railThickness, 0, topY, -cageDepth * 0.46)
    createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-cage-left-rail`, railThickness, railThickness, cageDepth, -cageWidth * 0.46, topY, 0)
    createBoxDetail(scene, parent, materials.steel, `${role}-${blockId}-cage-right-rail`, railThickness, railThickness, cageDepth, cageWidth * 0.46, topY, 0)

    for (let index = -1; index <= 1; index += 1) {
      createBoxDetail(
        scene,
        parent,
        materials.steel,
        `${role}-${blockId}-cage-roof-slat-${index + 1}`,
        cageWidth * 0.82,
        railThickness * 0.78,
        railThickness,
        0,
        topY + railThickness * 0.55,
        index * cageDepth * 0.24,
      )
    }

    for (const z of [-cageDepth * 0.24, cageDepth * 0.24]) {
      createBoxDetail(
        scene,
        parent,
        materials.warning,
        `${role}-${blockId}-cage-service-tab-${z > 0 ? 'front' : 'rear'}`,
        cageWidth * 0.24,
        railThickness * 0.86,
        railThickness,
        0,
        baseY + cageHeight * 0.48,
        z,
      )
    }
}
