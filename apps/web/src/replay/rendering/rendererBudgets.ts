import type { BabylonRendererStats } from './rendererKit'

export type BabylonRendererBudget = {
  activeMeshes: number
  materials: number
  meshes: number
  textures: number
  totalVertices: number
}

export type BabylonRendererBudgetName = 'assembly' | 'partCatalog' | 'replayPreview'

export type BabylonRendererBudgetState = {
  breaches: string[]
  status: 'over_budget' | 'within_budget'
}

export const BABYLON_RENDERER_BUDGETS: Record<
  BabylonRendererBudgetName,
  BabylonRendererBudget
> = {
  assembly: {
    activeMeshes: 420,
    materials: 150,
    meshes: 760,
    textures: 150,
    totalVertices: 180_000,
  },
  partCatalog: {
    activeMeshes: 180,
    materials: 90,
    meshes: 260,
    textures: 110,
    totalVertices: 70_000,
  },
  replayPreview: {
    activeMeshes: 900,
    materials: 220,
    meshes: 1_600,
    textures: 220,
    totalVertices: 300_000,
  },
}

export const BABYLON_RENDERER_CHUNK_GZIP_BUDGET_BYTES = 560 * 1024
export const BABYLON_RENDERER_AGGREGATE_GZIP_BUDGET_BYTES = 720 * 1024

export function createBabylonRendererBudgetState(
  stats: BabylonRendererStats,
  budget: BabylonRendererBudget,
): BabylonRendererBudgetState {
  const breaches = [
    createBudgetBreach('activeMeshes', stats.activeMeshes, budget.activeMeshes),
    createBudgetBreach('materials', stats.materials, budget.materials),
    createBudgetBreach('meshes', stats.meshes, budget.meshes),
    createBudgetBreach('textures', stats.textures, budget.textures),
    createBudgetBreach('totalVertices', stats.totalVertices, budget.totalVertices),
  ].filter((breach): breach is string => breach !== null)

  return {
    breaches,
    status: breaches.length > 0 ? 'over_budget' : 'within_budget',
  }
}

function createBudgetBreach(
  label: keyof BabylonRendererBudget,
  actual: number,
  budget: number,
): string | null {
  return actual > budget ? `${label}:${actual}/${budget}` : null
}
