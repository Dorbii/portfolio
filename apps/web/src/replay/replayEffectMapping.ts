import type { ReplayEvent } from '../../../../packages/replay/src/index.js'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type {
  BotFrameState,
  ReplayEffectState,
} from './replayMappingTypes.js'
import {
  forwardPoint,
  headingForMove,
} from './replayVectorMath.js'

const WEAPON_WINDOW = 0.95
const CONTROL_CUE_WINDOW = 1.15
const IMPACT_WINDOW = 1.35
const DEBRIS_WINDOW = 1.9
const PART_DETACH_WINDOW = 1.9
const DAMAGE_MARKER_WINDOW = 1.4
const HAZARD_WINDOW = 0.9
const LASER_LANCE_WINDOW = 0.95
const DRONE_SWARM_WINDOW = 1.2

export function buildReplayEffects(
  events: ReplayEvent[],
  bots: Record<TeamRole, BotFrameState>,
  time: number,
  resolveBotAtTime: (role: TeamRole, time: number) => BotFrameState,
): ReplayEffectState[] {
  const effects: ReplayEffectState[] = []

  events.forEach((event, index) => {
    if (event.type === 'weapon_fire') {
      const age = time - event.t
      const isControlDeploy = event.controlCue === 'deploy'
      const duration = isControlDeploy ? CONTROL_CUE_WINDOW : WEAPON_WINDOW

      if (age >= 0 && age <= duration) {
        const firingBot = resolveBotAtTime(event.bot, event.t)
        const intensity = Math.max(0, 1 - age / duration)

        effects.push({
          id: `${index}-weapon-${event.bot}`,
          kind: 'weapon_fire',
          position: firingBot.position,
          rotationY: firingBot.rotationY,
          age,
          intensity,
          team: event.bot,
          label: isControlDeploy ? `${event.weaponSlot}-deploy` : event.weaponSlot,
        })

        if (isControlDeploy) {
          effects.push({
            id: `${index}-weapon-control-${event.bot}`,
            kind: 'control_net',
            position: firingBot.position,
            rotationY: firingBot.rotationY,
            age,
            intensity,
            team: event.bot,
            endPosition:
              event.targetPosition ?? forwardPoint(firingBot.position, firingBot.rotationY, 3.4),
            label: 'control_net',
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
          id: `${index}-laser-${event.bot}`,
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

    if (event.type === 'ability' && event.ability === 'drone_swarm') {
      const age = time - event.t
      const firingBot = resolveBotAtTime(event.bot, event.t)
      const endPosition = event.targetPosition ?? forwardPoint(firingBot.position, firingBot.rotationY, 6.5)
      const rotationY = headingForMove(firingBot.position, endPosition, firingBot.rotationY)

      if (age >= 0 && age <= DRONE_SWARM_WINDOW) {
        effects.push({
          id: `${index}-drone-swarm-${event.bot}`,
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

    if (event.type === 'impact') {
      const age = time - event.t

      if (age >= 0 && age <= IMPACT_WINDOW) {
        effects.push({
          id: `${index}-impact`,
          kind: 'impact',
          position: event.position,
          age,
          intensity: 1 - age / IMPACT_WINDOW,
          team: event.attacker,
          damage: event.damage,
        })
        effects.push({
          id: `${index}-smoke`,
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
            id: `${index}-debris-${debrisIndex}`,
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
          id: `${index}-damage-${event.bot}`,
          kind: 'damage_marker',
          position: bots[event.bot].position,
          age,
          intensity: Math.max(0, 1 - age / DAMAGE_MARKER_WINDOW),
          team: event.bot,
          damage: event.amount,
        })
      }
    }

    if (event.type === 'hazard') {
      const age = time - event.t

      if (age >= 0 && age <= HAZARD_WINDOW) {
        effects.push({
          id: `${index}-hazard-${event.hazard}`,
          kind: 'hazard',
          position: event.position,
          age,
          intensity: 1 - age / HAZARD_WINDOW,
          team: event.bot,
          damage: event.damage,
          label: event.hazard,
        })
        effects.push({
          id: `${index}-hazard-damage-${event.bot}`,
          kind: 'damage_marker',
          position: event.position,
          age,
          intensity: 1 - age / HAZARD_WINDOW,
          team: event.bot,
          damage: event.damage,
          label: event.hazard,
        })
      }
    }

    if (event.type === 'knockout' && event.t <= time) {
      effects.push({
        id: `${index}-knockout-${event.bot}`,
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
          id: `${index}-part-detach-focus-${event.blockId}`,
          kind: 'part_detach',
          position: event.position,
          age,
          intensity: Math.max(0, 1 - age / PART_DETACH_WINDOW),
          team: event.bot,
          label: event.blockId,
        })
        effects.push({
          id: `${index}-part-detach-${event.blockId}`,
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
