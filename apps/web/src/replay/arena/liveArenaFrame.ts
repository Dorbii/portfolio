import type {
  BotBlueprint,
  MachineDesign,
  TeamRole,
  Vector3,
} from '../../../../../packages/schemas/src/index.js'
import type { LegacyTeamIdentity } from '../../shared/teamVisuals'
import {
  buildReplayFrame,
} from '../replayMapping.js'
import type {
  BotFrameState,
  BotStabilityFrameState,
  PartFrameState,
  ReplayEndState,
  ReplayVisualFrame,
} from '../replayMappingTypes'
import type { LiveCombatTimeline } from './liveCombatTimeline'

export type LiveArenaBotState = {
  blueprint: BotBlueprint
  health: number
  identity: LegacyTeamIdentity
  machineDesign?: MachineDesign
  maxHealth: number
  partHealth: Record<string, number>
  position: Vector3
  statuses: string[]
}

export type LiveArenaStageState = Record<TeamRole, LiveArenaBotState>

export function liveArenaVisualKey(liveArena: LiveArenaStageState | undefined): string {
  if (!liveArena) {
    return 'no-live-bots'
  }

  return JSON.stringify({
    blue: visualKeyForBot(liveArena.blue),
    red: visualKeyForBot(liveArena.red),
  })
}

export function buildLiveArenaFrame(
  liveArena: LiveArenaStageState,
  time: number,
  liveCombatTimeline?: LiveCombatTimeline | null,
  timelineTime = time,
): ReplayVisualFrame {
  const redStatus = resolveBotStatus(liveArena.red)
  const blueStatus = resolveBotStatus(liveArena.blue)
  const baseParts = {
    blue: createPartFrameStates(liveArena.blue),
    red: createPartFrameStates(liveArena.red),
  }

  if (liveCombatTimeline) {
    const replayFrame = buildReplayFrame(liveCombatTimeline.timeline, timelineTime)

    return {
      ...replayFrame,
      endState: replayFrame.endState ?? resolveEndState(redStatus, blueStatus),
      parts: {
        blue: {
          ...baseParts.blue,
          ...replayFrame.parts.blue,
        },
        red: {
          ...baseParts.red,
          ...replayFrame.parts.red,
        },
      },
    }
  }

  return {
    bots: {
      blue: createBotFrame('blue', liveArena.blue, liveArena.red.position, blueStatus, time),
      red: createBotFrame('red', liveArena.red, liveArena.blue.position, redStatus, time),
    },
    effects: [],
    endState: resolveEndState(redStatus, blueStatus),
    parts: baseParts,
    progress: 0,
    time,
  }
}

function visualKeyForBot(bot: LiveArenaBotState) {
  return {
    blueprint: bot.blueprint,
    identity: bot.identity,
    machineDesign: bot.machineDesign,
  }
}

function createBotFrame(
  role: TeamRole,
  bot: LiveArenaBotState,
  opponentPosition: Vector3,
  status: BotFrameState['status'],
  time: number,
): BotFrameState {
  return {
    health: bot.health,
    motion: createLiveIdleMotion(role, status, time),
    position: bot.position,
    role,
    rotationY: facePosition(bot.position, opponentPosition, role),
    stability: createLiveStability(status),
    status,
  }
}

function createLiveIdleMotion(
  role: TeamRole,
  status: BotFrameState['status'],
  time: number,
): BotFrameState['motion'] {
  if (status === 'knocked_out') {
    return {
      contactIntensity: 0,
      driveIntensity: 0,
      drift: 0,
      easedProgress: 0,
      lean: 0,
      progress: 0,
      speed: 0,
      turn: 0,
    }
  }

  const phase = role === 'red' ? 0 : Math.PI

  return {
    contactIntensity: status === 'immobilized' ? 0.02 : 0.08 + Math.sin(time * 2.4 + phase) * 0.025,
    driveIntensity: status === 'immobilized' ? 0.03 : 0.1 + Math.sin(time * 2.2 + phase) * 0.025,
    drift: Math.sin(time * 0.9 + phase) * 0.08,
    easedProgress: 0,
    lean: Math.sin(time * 1.35 + phase) * 0.025,
    progress: 0,
    speed: 0,
    turn: 0,
  }
}

function createLiveStability(status: BotFrameState['status']): BotStabilityFrameState {
  return {
    age: 0,
    heightOffset: status === 'knocked_out' ? -0.06 : 0,
    pitch: 0,
    pose: status === 'knocked_out' ? 'immobilized' : 'upright',
    progress: 1,
    roll: 0,
    severity: status === 'active' ? 0 : 1,
  }
}

function createPartFrameStates(bot: LiveArenaBotState): Record<string, PartFrameState> {
  const states: Record<string, PartFrameState> = {}

  bot.blueprint.blocks.forEach((block) => {
    states[block.id] = {
      blockId: block.id,
      partId: block.partId,
      status: 'attached',
    }
  })

  bot.machineDesign?.parts.forEach((part) => {
    states[part.instanceId] = {
      blockId: part.instanceId,
      partId: part.definitionId,
      status: 'attached',
    }
  })

  const runtimeHealth = bot.machineDesign?.runtime?.healthByInstanceId ?? {}

  Object.entries({
    ...runtimeHealth,
    ...bot.partHealth,
  }).forEach(([blockId, health]) => {
    const current = states[blockId]

    states[blockId] = {
      blockId,
      partId: current?.partId,
      health,
      status: 'attached',
    }
  })

  return states
}

function facePosition(position: Vector3, target: Vector3, role: TeamRole): number {
  const deltaX = target[0] - position[0]
  const deltaZ = target[2] - position[2]

  if (Math.hypot(deltaX, deltaZ) < 0.001) {
    return role === 'red' ? Math.PI / 2 : -Math.PI / 2
  }

  return Math.atan2(deltaX, deltaZ)
}

function resolveBotStatus(bot: LiveArenaBotState): BotFrameState['status'] {
  const statuses = bot.statuses.map((status) => status.toLowerCase())

  if (bot.health <= 0 || statuses.some((status) => status.includes('knock'))) {
    return 'knocked_out'
  }

  if (statuses.some((status) => status.includes('immobil'))) {
    return 'immobilized'
  }

  return 'active'
}

function resolveEndState(
  redStatus: BotFrameState['status'],
  blueStatus: BotFrameState['status'],
): ReplayEndState | undefined {
  if (redStatus === 'knocked_out' && blueStatus !== 'knocked_out') {
    return { knockedOut: 'red', winner: 'blue' }
  }

  if (blueStatus === 'knocked_out' && redStatus !== 'knocked_out') {
    return { knockedOut: 'blue', winner: 'red' }
  }

  return undefined
}
