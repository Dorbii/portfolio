import type { ReplayEvent } from '../../../../../packages/replay/src/index.js'
import type { TeamRole } from '../../../../../packages/schemas/src/index.js'
import type { WeaponFirePhase } from '../../../../../packages/replay/src/index.js'
import type {
  BotFrameState,
  IndexedReplayEvent,
  ReplayEffectState,
} from '../replayMappingTypes.js'
import {
  forwardPoint,
  headingForMove,
} from '../replayVectorMath.js'

const WEAPON_WINDOW = 0.95
const CONTROL_CUE_WINDOW = 1.15
const IMPACT_WINDOW = 1.35
const DEBRIS_WINDOW = 1.9
const PART_DETACH_WINDOW = 1.9
const DAMAGE_MARKER_WINDOW = 1.4
const HAZARD_WINDOW = 0.9
const CONTACT_WINDOW = 0.85
const LASER_LANCE_WINDOW = 0.95
const FIRE_BREATH_WINDOW = 1.05
const DRONE_SWARM_WINDOW = 1.2
const STABILITY_WINDOW = 1.1
const DEFAULT_WEAPON_PHASE: WeaponFirePhase = 'release'

const WEAPON_STYLES = [
  'spinner',
  'saw',
  'ram',
  'flipper',
  'turret',
  'net',
] as const

type ReplayEffectInputEvent = ReplayEvent | IndexedReplayEvent

export function getReplayEffectWindowSeconds(event: ReplayEvent): number | undefined {
  if (event.type === 'weapon_fire') {
    return event.controlCue === 'deploy' ? CONTROL_CUE_WINDOW : WEAPON_WINDOW
  }

  if (event.type === 'ability' && event.ability === 'laser_lance') {
    return LASER_LANCE_WINDOW
  }

  if (event.type === 'ability' && event.ability === 'fire_breath') {
    return FIRE_BREATH_WINDOW
  }

  if (event.type === 'ability' && event.ability === 'drone_swarm') {
    return DRONE_SWARM_WINDOW
  }

  if (event.type === 'impact' || event.type === 'ram') {
    return DEBRIS_WINDOW
  }

  if (event.type === 'push' || event.type === 'bounce') {
    return CONTACT_WINDOW
  }

  if (event.type === 'damage') {
    return DAMAGE_MARKER_WINDOW
  }

  if (event.type === 'hazard' || event.type === 'hazard_trigger') {
    return HAZARD_WINDOW
  }

  if (event.type === 'part_detach') {
    return PART_DETACH_WINDOW
  }

  if (isBotStabilityEvent(event)) {
    return event.type === 'bot_flipped' || event.type === 'bot_immobilized'
      ? STABILITY_WINDOW * 1.25
      : STABILITY_WINDOW
  }

  return undefined
}

export function buildReplayEffects(
  events: ReplayEffectInputEvent[],
  bots: Record<TeamRole, BotFrameState>,
  time: number,
  resolveBotAtTime: (role: TeamRole, time: number) => BotFrameState,
): ReplayEffectState[] {
  const effects: ReplayEffectState[] = []

  events.forEach((entry, fallbackIndex) => {
    const { event, sequence } = replayEffectEventSource(entry, fallbackIndex)

    if (event.type === 'weapon_fire') {
      const age = time - event.t
      const isControlDeploy = event.controlCue === 'deploy'
      const duration = isControlDeploy ? CONTROL_CUE_WINDOW : WEAPON_WINDOW

      if (age >= 0 && age <= duration) {
        const firingBot = resolveBotAtTime(event.bot, event.t)
        const intensity = Math.max(0, 1 - age / duration)
        const weaponPhase = event.phase ?? (isControlDeploy ? 'deploy' : DEFAULT_WEAPON_PHASE)
        const weaponStyle = normalizeWeaponStyle(event.style) ?? inferWeaponStyleFromSourcePart(event.sourcePartId)
        const shouldUseBotForwardFallback =
          isControlDeploy || (!event.sourceBlockId && !event.sourcePartId)
        const endPosition =
          event.targetPosition ?? (shouldUseBotForwardFallback
            ? forwardPoint(firingBot.position, firingBot.rotationY, 3.4)
            : undefined)
        const rotationY = endPosition
          ? headingForMove(firingBot.position, endPosition, firingBot.rotationY)
          : undefined
        const source = {
          sourceBlockId: event.sourceBlockId,
          sourcePartId: event.sourcePartId,
          weaponPhase,
          weaponStyle,
        }

        effects.push({
          id: `${sequence}-weapon-${event.bot}`,
          kind: 'weapon_fire',
          position: firingBot.position,
          age,
          intensity,
          team: event.bot,
          label: createWeaponEffectLabel(event.weaponId ?? event.weaponSlot ?? 'weapon', weaponPhase, weaponStyle, isControlDeploy),
          ...source,
          ...(rotationY !== undefined ? { rotationY } : {}),
          ...(endPosition ? { endPosition } : {}),
        })

        if (isControlDeploy) {
          effects.push({
            id: `${sequence}-weapon-control-${event.bot}`,
            kind: 'control_net',
            position: firingBot.position,
            rotationY,
            age,
            intensity,
            team: event.bot,
            endPosition,
            label: weaponStyle ? `control_net-${weaponStyle}` : 'control_net',
            ...source,
          })
        }
      }
    }

    if (event.type === 'ability' && event.ability === 'laser_lance') {
      const age = time - event.t
      const firingBot = resolveBotAtTime(event.bot, event.t)
      const endPosition = event.targetPosition ?? forwardPoint(firingBot.position, firingBot.rotationY, 5.6)
      const rotationY = headingForMove(firingBot.position, endPosition, firingBot.rotationY)

      if (age >= 0 && age <= LASER_LANCE_WINDOW) {
        effects.push({
          id: `${sequence}-laser-${event.bot}`,
          kind: 'laser_lance',
          position: firingBot.position,
          rotationY,
          age,
          intensity: Math.max(0, 1 - age / LASER_LANCE_WINDOW),
          team: event.bot,
          endPosition,
          label: event.ability,
        })
      }
    }

    if (event.type === 'ability' && event.ability === 'fire_breath') {
      const age = time - event.t
      const firingBot = resolveBotAtTime(event.bot, event.t)
      const endPosition = event.targetPosition ?? forwardPoint(firingBot.position, firingBot.rotationY, 3.1)
      const rotationY = headingForMove(firingBot.position, endPosition, firingBot.rotationY)

      if (age >= 0 && age <= FIRE_BREATH_WINDOW) {
        effects.push({
          id: `${sequence}-fire-breath-${event.bot}`,
          kind: 'fire_breath',
          position: firingBot.position,
          rotationY,
          age,
          intensity: Math.max(0, 1 - age / FIRE_BREATH_WINDOW),
          team: event.bot,
          endPosition,
          label: event.ability,
        })
      }
    }

    if (event.type === 'ability' && event.ability === 'drone_swarm') {
      const age = time - event.t
      const firingBot = resolveBotAtTime(event.bot, event.t)
      const endPosition = event.targetPosition ?? forwardPoint(firingBot.position, firingBot.rotationY, 6.5)
      const rotationY = headingForMove(firingBot.position, endPosition, firingBot.rotationY)

      if (age >= 0 && age <= DRONE_SWARM_WINDOW) {
        effects.push({
          id: `${sequence}-drone-swarm-${event.bot}`,
          kind: 'drone_swarm',
          position: firingBot.position,
          rotationY,
          age,
          intensity: Math.max(0, 1 - age / DRONE_SWARM_WINDOW),
          team: event.bot,
          endPosition,
          label: event.ability,
        })
      }
    }

    if (isBotStabilityEvent(event)) {
      const age = time - event.t
      const duration = getReplayEffectWindowSeconds(event) ?? STABILITY_WINDOW

      if (age >= 0 && age <= duration) {
        const bot = resolveBotAtTime(event.bot, event.t)

        effects.push({
          id: `${sequence}-stability-${event.bot}`,
          kind: 'stability',
          position: bot.position,
          age,
          intensity: Math.max(0, 1 - age / duration),
          team: event.bot,
          label: event.cause ? `${event.type}:${event.cause}` : event.type,
        })
      }
    }


    if (event.type === 'push') {
      const age = time - event.t

      if (age >= 0 && age <= CONTACT_WINDOW) {
        effects.push({
          id: `${sequence}-push-${event.attacker}-${event.defender}`,
          kind: 'impact',
          position: event.to,
          age,
          intensity: Math.max(0, 1 - age / CONTACT_WINDOW),
          team: event.attacker,
          label: `push:${event.reason}`,
        })
      }
    }

    if (event.type === 'ram') {
      const age = time - event.t

      if (age >= 0 && age <= IMPACT_WINDOW) {
        effects.push({
          id: `${sequence}-ram-${event.attacker}-${event.defender}`,
          kind: 'impact',
          position: event.position,
          age,
          intensity: Math.max(0, 1 - age / IMPACT_WINDOW),
          team: event.attacker,
          damage: event.damage,
          label: event.blockedBy ? `ram:${event.blockedBy}` : 'ram',
        })
        effects.push({
          id: `${sequence}-ram-damage-${event.defender}`,
          kind: 'damage_marker',
          position: event.position,
          age,
          intensity: Math.max(0, 1 - age / IMPACT_WINDOW),
          team: event.defender,
          damage: event.damage,
        })
      }
    }

    if (event.type === 'bounce') {
      const age = time - event.t

      if (age >= 0 && age <= CONTACT_WINDOW) {
        effects.push({
          id: `${sequence}-bounce-${event.bot}`,
          kind: 'smoke',
          position: event.to,
          age,
          intensity: Math.max(0, 1 - age / CONTACT_WINDOW),
          team: event.bot,
          label: event.cause,
        })
      }
    }

    if (event.type === 'impact') {
      const age = time - event.t

      if (age >= 0 && age <= IMPACT_WINDOW) {
        effects.push({
          id: `${sequence}-impact`,
          kind: 'impact',
          position: event.position,
          age,
          intensity: 1 - age / IMPACT_WINDOW,
          team: event.attacker,
          damage: event.damage,
        })
        effects.push({
          id: `${sequence}-smoke`,
          kind: 'smoke',
          position: [event.position[0], event.position[1] + 0.35, event.position[2]],
          age,
          intensity: Math.max(0, 1 - age / IMPACT_WINDOW),
          team: event.defender,
        })
      }

      if (age >= 0 && age <= DEBRIS_WINDOW) {
        for (let debrisIndex = 0; debrisIndex < 3; debrisIndex += 1) {
          effects.push({
            id: `${sequence}-debris-${debrisIndex}`,
            kind: 'debris',
            position: event.position,
            age,
            intensity: Math.max(0, 1 - age / DEBRIS_WINDOW),
            team: event.defender,
            damage: event.damage,
          })
        }
      }
    }

    if (event.type === 'damage') {
      const age = time - event.t

      if (age >= 0 && age <= DAMAGE_MARKER_WINDOW) {
        effects.push({
          id: `${sequence}-damage-${event.bot}`,
          kind: 'damage_marker',
          position: bots[event.bot].position,
          age,
          intensity: Math.max(0, 1 - age / DAMAGE_MARKER_WINDOW),
          team: event.bot,
          damage: event.amount,
        })
      }
    }

    if (event.type === 'hazard' || event.type === 'hazard_trigger') {
      const age = time - event.t

      if (age >= 0 && age <= HAZARD_WINDOW) {
        effects.push({
          id: `${sequence}-hazard-${event.hazard}-${event.type === 'hazard_trigger' ? event.trigger : 'legacy'}`,
          kind: 'hazard',
          position: event.position,
          age,
          intensity: 1 - age / HAZARD_WINDOW,
          team: event.bot,
          damage: event.damage,
          label: event.type === 'hazard_trigger' ? `${event.hazard}:${event.trigger}` : event.hazard,
        })
        if (event.damage > 0) {
          effects.push({
            id: `${sequence}-hazard-damage-${event.bot}`,
            kind: 'damage_marker',
            position: event.position,
            age,
            intensity: 1 - age / HAZARD_WINDOW,
            team: event.bot,
            damage: event.damage,
            label: event.type === 'hazard_trigger' ? `${event.hazard}:${event.trigger}` : event.hazard,
          })
        }
      }
    }

    if (event.type === 'knockout' && event.t <= time) {
      effects.push({
        id: `${sequence}-knockout-${event.bot}`,
        kind: 'knockout',
        position: bots[event.bot].position,
        age: time - event.t,
        intensity: 1,
        team: event.bot,
        label: event.cause,
      })
    }

    if (event.type === 'part_detach') {
      const age = time - event.t

      if (age >= 0 && age <= PART_DETACH_WINDOW) {
        effects.push({
          id: `${sequence}-part-detach-focus-${event.blockId}`,
          kind: 'part_detach',
          position: event.position,
          age,
          intensity: Math.max(0, 1 - age / PART_DETACH_WINDOW),
          team: event.bot,
          label: event.blockId,
        })
        effects.push({
          id: `${sequence}-part-detach-${event.blockId}`,
          kind: 'debris',
          position: event.position,
          age,
          intensity: Math.max(0, 1 - age / PART_DETACH_WINDOW),
          team: event.bot,
          damage: 18,
          label: event.blockId,
        })
      }
    }
  })

  return effects
}

function isBotStabilityEvent(
  event: ReplayEvent,
): event is Extract<ReplayEvent, {
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

function replayEffectEventSource(
  input: ReplayEffectInputEvent,
  fallbackIndex: number,
): IndexedReplayEvent {
  if ('event' in input) {
    return input
  }

  return {
    event: input,
    sequence: fallbackIndex,
  }
}

function normalizeWeaponStyle(style: string | undefined): string | undefined {
  if (!style) {
    return undefined
  }

  const normalized = style.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')

  return WEAPON_STYLES.find((candidate) => normalized.includes(candidate)) ?? normalized
}

function inferWeaponStyleFromSourcePart(sourcePartId: string | undefined): string | undefined {
  if (!sourcePartId) {
    return undefined
  }

  const style = sourcePartId.trim().toLowerCase()

  if (style.includes('net')) {
    return 'net'
  }

  if (style.includes('turret') || style.includes('laser')) {
    return 'turret'
  }

  if (style.includes('saw')) {
    return 'saw'
  }

  if (style.includes('spinner')) {
    return 'spinner'
  }

  if (style.includes('flipper')) {
    return 'flipper'
  }

  if (style.includes('ram') || style.includes('spear') || style.includes('grabber')) {
    return 'ram'
  }

  return undefined
}

function createWeaponEffectLabel(
  weaponSlot: string,
  phase: WeaponFirePhase,
  style: string | undefined,
  isControlDeploy: boolean,
): string {
  if (!style && phase === DEFAULT_WEAPON_PHASE && !isControlDeploy) {
    return weaponSlot
  }

  if (!style) {
    return `${weaponSlot}-${phase}`
  }

  return `${weaponSlot}-${style}-${phase}`
}
