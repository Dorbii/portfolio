import type {
  BotBlueprint,
  BotCombatState,
  BotDesignSnapshot,
  BotDetailedSnapshot,
  FightDossier,
  FightKeyEvent,
  HazardExposureStats,
  MovementStats,
  TeamRole,
  WeaponUseStats,
} from '../../schemas/src/index.js'
import type {
  DamageEvent,
  HazardEvent,
  ImpactEvent,
  MoveEvent,
  PartDetachEvent,
  ReplayEvent,
  ReplayTimeline,
  WeaponFireEvent,
} from '../../replay/src/index.js'
import type { CombatResult } from './resolveCombat.js'

export type BuildFightDossierInput = {
  sessionId: string
  fightId: string
  replay: ReplayTimeline
  result: CombatResult
  botBlueprints: Record<TeamRole, BotBlueprint>
  existing?: FightDossier
}

export function buildFightDossier(input: BuildFightDossierInput): FightDossier {
  return buildFightDossierFromCombatResult(input)
}

export function buildFightDossierFromCombatResult(
  input: BuildFightDossierInput,
): FightDossier {
  const fight = {
    fightId: input.fightId,
    winner: input.result.winner,
    reason: input.result.reason,
    duration: input.replay.duration,
    replayTimelineId: `${input.sessionId}:${input.fightId}:replay`,
    bots: {
      red: botDetailedSnapshot('red', input.botBlueprints.red, input.result),
      blue: botDetailedSnapshot('blue', input.botBlueprints.blue, input.result),
    },
    stats: {
      damageDealt: {
        red: input.result.damage.blue,
        blue: input.result.damage.red,
      },
      damageTaken: {
        red: input.result.damage.red,
        blue: input.result.damage.blue,
      },
      damageByPart: {
        red: damageByPart(input.replay.events, 'red'),
        blue: damageByPart(input.replay.events, 'blue'),
      },
      weaponUse: {
        red: weaponUse(input.replay.events, 'red'),
        blue: weaponUse(input.replay.events, 'blue'),
      },
      hazardsTriggered: hazardExposure(input.replay.events),
      movement: {
        red: movementStats(input.replay.events, 'red'),
        blue: movementStats(input.replay.events, 'blue'),
      },
      disabledParts: {
        red: disabledParts(input.result, 'red'),
        blue: disabledParts(input.result, 'blue'),
      },
    },
    keyEvents: keyEvents(input.replay.events),
  }

  return {
    sessionId: input.sessionId,
    fights: [
      ...(input.existing?.fights ?? []).filter(
        (existingFight) => existingFight.fightId !== input.fightId,
      ),
      fight,
    ],
  }
}

export function mergeFightDossier(
  existing: FightDossier | undefined,
  next: FightDossier,
): FightDossier {
  return {
    sessionId: next.sessionId,
    fights: [
      ...(existing?.fights ?? []).filter(
        (fight) => !next.fights.some((nextFight) => nextFight.fightId === fight.fightId),
      ),
      ...next.fights,
    ],
  }
}

function botDetailedSnapshot(
  role: TeamRole,
  blueprint: BotBlueprint,
  result: CombatResult,
): BotDetailedSnapshot {
  return {
    ...botDesignSnapshot(blueprint, result.partHealth[role]),
    combat: botCombatState(role, result),
  }
}

function botDesignSnapshot(
  blueprint: BotBlueprint,
  partHealth: Record<string, number>,
): BotDesignSnapshot {
  return {
    name: blueprint.name,
    rootInstanceId: blueprint.blocks[0]?.id,
    parts: blueprint.blocks.map((block) => ({
      instanceId: block.id,
      partId: block.partId,
      cell: {
        x: Math.trunc(block.position[0]),
        z: Math.trunc(block.position[2]),
      },
      rotation: block.rotation[2],
      health: partHealth[block.id],
      detached: partHealth[block.id] !== undefined && partHealth[block.id] <= 0,
    })),
  }
}

function botCombatState(role: TeamRole, result: CombatResult): BotCombatState {
  const parts = Object.entries(result.partHealth[role]).map(([instanceId, health]) => ({
    instanceId,
    partId: instanceId,
    health,
    detached: health <= 0,
  }))

  return {
    health: result.remainingHealth[role],
    maxHealth: Math.max(result.remainingHealth[role], result.remainingHealth[role] + result.damage[role]),
    parts,
    statuses: result.remainingHealth[role] <= 0 ? ['disabled'] : [],
  }
}

function damageByPart(events: ReplayEvent[], role: TeamRole): Record<string, number> {
  const byPart: Record<string, number> = {}

  for (const event of events) {
    if (isDamageEvent(event) && event.bot === role && event.blockId) {
      byPart[event.blockId] = round((byPart[event.blockId] ?? 0) + event.amount)
    }
  }

  return byPart
}

function weaponUse(events: ReplayEvent[], role: TeamRole): WeaponUseStats[] {
  const byWeapon = new Map<string, WeaponUseStats>()
  const weaponFires = new Map<TeamRole, Array<{ t: number, weapon: WeaponUseStats }>>([
    ['red', []],
    ['blue', []],
  ])
  const pendingImpacts: ImpactEvent[] = []

  for (const event of [...events].sort((left, right) => left.t - right.t)) {
    if (isWeaponFireEvent(event)) {
      const weaponId = event.sourcePartId ?? event.sourceBlockId ?? event.weaponId ?? event.weaponSlot ?? 'weapon'
      const current = byWeapon.get(weaponId) ?? {
        weaponId,
        activations: 0,
        hits: 0,
        damage: 0,
      }

      if (event.bot === role) {
        current.activations += 1
        if (event.phase === 'release' || event.controlCue === 'release' || !event.phase) {
          current.hits += 1
        }
      }

      if (event.bot === role || byWeapon.has(weaponId)) {
        byWeapon.set(weaponId, current)
      }
      weaponFires.get(event.bot)?.push({ t: event.t, weapon: current })
      continue
    }

    if (isImpactEvent(event)) {
      pendingImpacts.push(event)
      continue
    }

    if (isDamageEvent(event)) {
      const impact = takePendingImpact(pendingImpacts, event)

      if (!impact || impact.attacker !== role) {
        continue
      }

      const sourceWeapon = takeRecentWeaponFire(weaponFires.get(role) ?? [], impact.t)

      if (sourceWeapon) {
        sourceWeapon.damage = round(sourceWeapon.damage + event.amount)
      }
    }
  }

  return [...byWeapon.values()]
}

function takePendingImpact(
  pendingImpacts: ImpactEvent[],
  damage: DamageEvent,
): ImpactEvent | undefined {
  const impactIndex = pendingImpacts.findIndex(
    (impact) =>
      impact.defender === damage.bot &&
      Math.abs(impact.damage - damage.amount) < 0.001 &&
      impact.t <= damage.t &&
      damage.t - impact.t <= 0.35,
  )

  return impactIndex >= 0 ? pendingImpacts.splice(impactIndex, 1)[0] : undefined
}

function takeRecentWeaponFire(
  pendingWeaponFires: Array<{ t: number, weapon: WeaponUseStats }>,
  impactAt: number,
): WeaponUseStats | undefined {
  let bestIndex = -1

  for (let index = 0; index < pendingWeaponFires.length; index += 1) {
    const fire = pendingWeaponFires[index]

    if (fire.t <= impactAt && (bestIndex === -1 || fire.t >= pendingWeaponFires[bestIndex].t)) {
      bestIndex = index
    }
  }

  return bestIndex >= 0 ? pendingWeaponFires.splice(bestIndex, 1)[0].weapon : undefined
}

function hazardExposure(events: ReplayEvent[]): HazardExposureStats[] {
  const byKey = new Map<string, HazardExposureStats>()

  for (const event of events) {
    if (!isHazardEvent(event)) {
      continue
    }

    const key = `${event.bot}:${event.hazard}`
    const current = byKey.get(key) ?? {
      role: event.bot,
      hazardId: event.hazard,
      exposureCount: 0,
      damage: 0,
    }

    current.exposureCount += 1
    current.damage = round(current.damage + event.damage)
    byKey.set(key, current)
  }

  return [...byKey.values()]
}

function movementStats(events: ReplayEvent[], role: TeamRole): MovementStats {
  let cellsMoved = 0
  let hazardsCrossed = 0
  let finalPose: MovementStats['finalPose']

  for (const event of events) {
    if (isMoveEvent(event) && event.bot === role) {
      cellsMoved = round(cellsMoved + distance2d(event.from, event.to))
      finalPose = {
        anchor: {
          x: Math.trunc(event.to[0]),
          z: Math.trunc(event.to[2]),
        },
        facing: role === 'red' ? 'east' : 'west',
      }
    }
    if (isHazardEvent(event) && event.bot === role) {
      hazardsCrossed += 1
    }
  }

  return {
    cellsMoved,
    hazardsCrossed,
    ...(finalPose ? { finalPose } : {}),
  }
}

function disabledParts(result: CombatResult, role: TeamRole): string[] {
  return Object.entries(result.partHealth[role])
    .filter(([, health]) => health <= 0)
    .map(([instanceId]) => instanceId)
}

function keyEvents(events: ReplayEvent[]): FightKeyEvent[] {
  return events
    .filter((event) =>
      event.type === 'damage' ||
      event.type === 'knockout' ||
      event.type === 'part_detach' ||
      event.type === 'hazard' ||
      isBotStabilityEvent(event))
    .slice(0, 12)
    .map((event) => ({
      at: event.t,
      type: event.type,
      summary: summarizeEvent(event),
    }))
}

function summarizeEvent(event: ReplayEvent): string {
  if (isDamageEvent(event)) {
    return `${event.bot} took ${event.amount} damage.`
  }
  if (isHazardEvent(event)) {
    return `${event.bot} triggered ${event.hazard} for ${event.damage} damage.`
  }
  if (isPartDetachEvent(event)) {
    return `${event.bot} lost part ${event.blockId}.`
  }
  if (event.type === 'knockout') {
    return `${event.bot} was knocked out by ${event.cause}.`
  }
  if (isBotStabilityEvent(event)) {
    return `${event.bot} ${summarizeStabilityEventType(event.type)}${event.cause ? ` from ${event.cause}` : ''}.`
  }

  return `${event.type} event.`
}

function summarizeStabilityEventType(eventType: ReplayEvent['type']): string {
  switch (eventType) {
    case 'bot_destabilized':
      return 'destabilized'
    case 'bot_tipped':
      return 'tipped'
    case 'bot_flipped':
      return 'flipped'
    case 'bot_self_righted':
      return 'self-righted'
    case 'bot_immobilized':
      return 'was immobilized'
    default:
      return 'changed stability'
  }
}

function distance2d(from: [number, number, number], to: [number, number, number]): number {
  return Math.hypot(to[0] - from[0], to[2] - from[2])
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function isMoveEvent(event: ReplayEvent): event is MoveEvent {
  return event.type === 'move'
}

function isWeaponFireEvent(event: ReplayEvent): event is WeaponFireEvent {
  return event.type === 'weapon_fire'
}

function isDamageEvent(event: ReplayEvent): event is DamageEvent {
  return event.type === 'damage'
}

function isImpactEvent(event: ReplayEvent): event is ImpactEvent {
  return event.type === 'impact'
}

function isHazardEvent(event: ReplayEvent): event is HazardEvent {
  return event.type === 'hazard'
}

function isPartDetachEvent(event: ReplayEvent): event is PartDetachEvent {
  return event.type === 'part_detach'
}

function isBotStabilityEvent(event: ReplayEvent): event is Extract<ReplayEvent, {
  type:
    | 'bot_destabilized'
    | 'bot_tipped'
    | 'bot_flipped'
    | 'bot_self_righted'
    | 'bot_immobilized'
}> {
  return (
    event.type === 'bot_destabilized' ||
    event.type === 'bot_tipped' ||
    event.type === 'bot_flipped' ||
    event.type === 'bot_self_righted' ||
    event.type === 'bot_immobilized'
  )
}
