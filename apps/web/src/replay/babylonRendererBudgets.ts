import type { BabylonRendererStats } from './babylonRendererKit'

export type BabylonRendererBudget = {
  activeMeshes: number
  materials: number
  meshes: number
  textures: number
  totalVertices: number
}

export type BabylonRendererBudgetName = 'assembly' | 'replayPreview'

export type BabylonRendererBudgetState = {
  breaches: string[]
  status: 'over_budget' | 'within_budget'
}

export const BABYLON_RENDERER_BUDGETS: Record<
  BabylonRendererBudgetName,
  BabylonRendererBudget
> = {
  assembly: {
    activeMeshes: 260,
    materials: 96,
    meshes: 320,
    textures: 80,
    totalVertices: 75_000,
  },
  replayPreview: {
    activeMeshes: 560,
    materials: 130,
    meshes: 960,
    textures: 120,
    totalVertices: 130_000,
  },
}

export const BABYLON_RENDERER_CHUNK_GZIP_BUDGET_BYTES = 380 * 1024

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
