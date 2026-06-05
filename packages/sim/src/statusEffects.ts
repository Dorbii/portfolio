export const RUNTIME_STATUS_EFFECT_IDS = [
  'slowed',
  'anchored',
  'smoked',
  'drone_harassed',
  'repairing',
] as const

export type RuntimeStatusEffectId = (typeof RUNTIME_STATUS_EFFECT_IDS)[number]

export type RuntimeStatusEffect = {
  id: RuntimeStatusEffectId
  sourceKey: string
  appliedTick: number
  expiresAtTick: number
}

type RuntimeStatusEffectDefinition = {
  movementMultiplier?: number
  incomingWeaponDamageMultiplier?: number
}

const RUNTIME_STATUS_EFFECTS: Record<RuntimeStatusEffectId, RuntimeStatusEffectDefinition> = {
  slowed: { movementMultiplier: 0.55 },
  anchored: { movementMultiplier: 0 },
  smoked: { incomingWeaponDamageMultiplier: 0.72 },
  drone_harassed: { movementMultiplier: 0.85 },
  repairing: { incomingWeaponDamageMultiplier: 0.88 },
}

export function runtimeStatusExpiresAtTick(appliedTick: number, durationTicks: number): number {
  return appliedTick + durationTicks + 1
}

export function expireRuntimeStatuses(
  statuses: RuntimeStatusEffect[],
  tick: number,
): RuntimeStatusEffect[] {
  return statuses.filter((status) => status.expiresAtTick > tick).sort(compareRuntimeStatuses)
}

export function addRuntimeStatus(
  statuses: RuntimeStatusEffect[],
  status: RuntimeStatusEffect,
): RuntimeStatusEffect[] {
  const statusKey = runtimeStatusKey(status)
  const next = statuses.filter((existing) => runtimeStatusKey(existing) !== statusKey)

  next.push(status)
  return next.sort(compareRuntimeStatuses)
}

export function runtimeStatusMovementMultiplier(statuses: RuntimeStatusEffect[]): number {
  return round(
    statuses.reduce((multiplier, status) => {
      const statusMultiplier = RUNTIME_STATUS_EFFECTS[status.id].movementMultiplier

      return multiplier * (statusMultiplier ?? 1)
    }, 1),
  )
}

export function runtimeStatusIncomingDamageMultiplier(
  statuses: RuntimeStatusEffect[],
  cause: string,
): number {
  if (cause !== 'weapon') {
    return 1
  }

  return round(
    statuses.reduce((multiplier, status) => {
      const statusMultiplier = RUNTIME_STATUS_EFFECTS[status.id].incomingWeaponDamageMultiplier

      return multiplier * (statusMultiplier ?? 1)
    }, 1),
  )
}

function runtimeStatusKey(status: RuntimeStatusEffect): string {
  return `${status.id}:${status.sourceKey}`
}

function compareRuntimeStatuses(
  left: RuntimeStatusEffect,
  right: RuntimeStatusEffect,
): number {
  if (left.id !== right.id) {
    return left.id.localeCompare(right.id)
  }

  if (left.sourceKey !== right.sourceKey) {
    return left.sourceKey.localeCompare(right.sourceKey)
  }

  if (left.expiresAtTick !== right.expiresAtTick) {
    return left.expiresAtTick - right.expiresAtTick
  }

  return left.appliedTick - right.appliedTick
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
