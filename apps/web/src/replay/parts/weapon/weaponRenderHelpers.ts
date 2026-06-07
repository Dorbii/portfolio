import type { Material } from '@babylonjs/core/Materials/material'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { attachMesh } from '../../rendering/meshHelpers'
import {
  tagPartChildMaterialRole,
  type BotPartChildMaterialRole,
} from '../../rendering/materials'

export function attachRoleMesh(
  mesh: Mesh,
  parent: TransformNode,
  material: Material,
  role: BotPartChildMaterialRole,
): Mesh {
  attachMesh(mesh, parent, material)
  tagPartChildMaterialRole(mesh, role)

  return mesh
}

export function attachWeaponEdgeMesh(
  mesh: Mesh,
  parent: TransformNode,
  material: Material,
): Mesh {
  return attachRoleMesh(mesh, parent, material, 'weapon_edge')
}

export function tagRoleMesh(mesh: Mesh, role: BotPartChildMaterialRole): Mesh {
  tagPartChildMaterialRole(mesh, role)

  return mesh
}

export function tagWeaponEdgeMesh(mesh: Mesh): Mesh {
  return tagRoleMesh(mesh, 'weapon_edge')
}
