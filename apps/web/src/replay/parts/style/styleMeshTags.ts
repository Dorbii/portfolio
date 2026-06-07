import type { Material } from '@babylonjs/core/Materials/material'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh } from '../../rendering/meshHelpers'
import {
  tagPartChildMaterialRole,
  type BotPartChildMaterialRole,
} from '../../rendering/materials'

export function attachStyleMesh(
  mesh: Mesh,
  parent: TransformNode,
  material: Material,
  role?: BotPartChildMaterialRole,
): Mesh {
  attachMesh(mesh, parent, material)

  if (role) {
    tagPartChildMaterialRole(mesh, role)
  }

  return mesh
}

export function tagStyleMesh<TMesh extends Mesh>(
  mesh: TMesh,
  role: BotPartChildMaterialRole,
): TMesh {
  tagPartChildMaterialRole(mesh, role)

  return mesh
}
