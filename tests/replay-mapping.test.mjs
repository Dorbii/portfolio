import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildReplayFrame,
  clampReplayTime,
  compileReplayTimeline,
} from '../.test-build/apps/web/src/replay/replayMapping.js'
import {
  activeEffectEventsAt,
} from '../.test-build/apps/web/src/replay/replayCompiledTimeline.js'
import {
  calculateTeamFollowFrame,
  calculateBroadcastFrameForBothBotsAndActiveEffect,
  capBroadcastShakeForNoExcessiveShake,
  NO_EXCESSIVE_BROADCAST_SHAKE_LIMIT,
} from '../.test-build/apps/web/src/replay/camera/framing.js'
import {
  CAMERA_PRESET_OPTIONS,
  CANONICAL_CAMERA_PRESETS,
  normalizeCameraPreset,
} from '../.test-build/apps/web/src/replay/camera/presets.js'
import { mockReplay } from '../.test-build/apps/web/src/mockSession.js'
import {
  createReplayTimeline,
  validateReplayTimeline,
} from '../.test-build/packages/replay/src/index.js'
import {
  MACHINE_REPLAY_VISUAL_AUTHORITY,
  projectMachineDesignToReplayRenderParts,
} from '../.test-build/apps/web/src/replay/bots/geometry.js'

const timeline = createReplayTimeline({
  round: 2,
  duration: 8,
  summary: 'Blue disables Red after a center hit.',
  events: [
    {
      t: 0,
      type: 'spawn',
      bot: 'red',
      position: [0, 0, 0],
      rotation: [0, 90, 0],
    },
    {
      t: 0,
      type: 'spawn',
      bot: 'blue',
      position: [5, 0, 0],
      rotation: [0, -90, 0],
    },
    {
      t: 1,
      type: 'move',
      bot: 'red',
      from: [0, 0, 0],
      to: [4, 0, 0],
    },
    {
      t: 2,
      type: 'weapon_fire',
      bot: 'blue',
      weaponSlot: 'weaponA',
    },
    {
      t: 3,
      type: 'impact',
      attacker: 'blue',
      defender: 'red',
      damage: 14,
      position: [3.6, 0, 0.2],
    },
    {
      t: 3.1,
      type: 'damage',
      bot: 'red',
      amount: 14,
      remainingHealth: 0,
      blockId: 'left-wheel',
      partId: 'Wheel_Large',
      partRemainingHealth: 0,
      partMaxHealth: 12,
    },
    {
      t: 3.25,
      type: 'part_detach',
      bot: 'red',
      blockId: 'left-wheel',
      partId: 'Wheel_Large',
      position: [3.5, 0.2, 0.2],
    },
    {
      t: 4,
      type: 'hazard',
      hazard: 'center saw',
      bot: 'red',
      damage: 8,
      position: [2, 0, -1],
    },
    {
      t: 5,
      type: 'knockout',
      bot: 'red',
      cause: 'drive disabled',
    },
  ],
})

const movingWeaponTimeline = createReplayTimeline({
  round: 1,
  duration: 3,
  summary: 'Red fires while crossing the center.',
  events: [
    {
      t: 0,
      type: 'spawn',
      bot: 'red',
      position: [0, 0, 0],
      rotation: [0, 90, 0],
    },
    {
      t: 0,
      type: 'spawn',
      bot: 'blue',
      position: [5, 0, 0],
      rotation: [0, -90, 0],
    },
    {
      t: 1,
      type: 'move',
      bot: 'red',
      from: [0, 0, 0],
      to: [4, 0, 0],
    },
    {
      t: 1.5,
      type: 'weapon_fire',
      bot: 'red',
      weaponSlot: 'weaponA',
      controlCue: 'deploy',
      targetPosition: [4, 0, 0],
    },
  ],
})

function createWeaponMetadataTimeline({
  controlCue,
  phase = 'release',
  style = 'turret',
  t = 1.5,
} = {}) {
  return createReplayTimeline({
    round: 1,
    duration: 3,
    summary: 'Weapon metadata replay contract.',
    events: [
      {
        t: 0,
        type: 'spawn',
        bot: 'red',
        position: [0, 0, 0],
        rotation: [0, 90, 0],
      },
      {
        t: 0,
        type: 'spawn',
        bot: 'blue',
        position: [5, 0, 0],
        rotation: [0, -90, 0],
      },
      {
        t: 1,
        type: 'move',
        bot: 'red',
        from: [0, 0, 0],
        to: [4, 0, 0],
      },
      {
        t,
        type: 'weapon_fire',
        bot: 'red',
        weaponSlot: 'weaponA',
        controlCue,
        targetPosition: [4.4, 0, 0.2],
        sourceBlockId: 'front-spinner',
        sourcePartId: 'Weapon_Spinner_Small',
        phase,
        style,
      },
    ],
  })
}

const abilityTimeline = createReplayTimeline({
  round: 3,
  duration: 4,
  summary: 'Blue opens a laser lance and cuts across the lane.',
  events: [
    {
      t: 0,
      type: 'spawn',
      bot: 'red',
      position: [0, 0, 0],
      rotation: [0, 90, 0],
    },
    {
      t: 0,
      type: 'spawn',
      bot: 'blue',
      position: [4, 0, 0],
      rotation: [0, -90, 0],
    },
    {
      t: 1,
      type: 'move',
      bot: 'blue',
      from: [4, 0, 0],
      to: [2, 0, -2],
    },
    {
      t: 1.6,
      type: 'ability',
      bot: 'blue',
      ability: 'laser_lance',
      weaponSlot: 'weaponA',
      target: 'red',
      targetPosition: [0.8, 0, -0.4],
    },
  ],
})

const droneSwarmTimeline = createReplayTimeline({
  round: 4,
  duration: 4.5,
  summary: 'Blue drops a coordinated drone swarm across the lane.',
  events: [
    {
      t: 0,
      type: 'spawn',
      bot: 'red',
      position: [0, 0, 0],
      rotation: [0, 90, 0],
    },
    {
      t: 0,
      type: 'spawn',
      bot: 'blue',
      position: [4, 0, 0],
      rotation: [0, -90, 0],
    },
    {
      t: 1,
      type: 'move',
      bot: 'blue',
      from: [4, 0, 0],
      to: [2, 0, -2],
    },
    {
      t: 1.6,
      type: 'ability',
      bot: 'blue',
      ability: 'drone_swarm',
      weaponSlot: 'weaponA',
      target: 'red',
      targetPosition: [0.8, 0, -0.4],
    },
  ],
})

const stabilityTimeline = createReplayTimeline({
  round: 6,
  duration: 7,
  summary: 'Red gets flipped and self-rights from resolved stability events.',
  events: [
    {
      t: 0,
      type: 'spawn',
      bot: 'red',
      position: [0, 0, 0],
      rotation: [0, 90, 0],
    },
    {
      t: 0,
      type: 'spawn',
      bot: 'blue',
      position: [4, 0, 0],
      rotation: [0, -90, 0],
    },
    {
      t: 1,
      type: 'bot_destabilized',
      bot: 'red',
      cause: 'hard turn',
      direction: [1, 0, 0.2],
      duration: 0.8,
      severity: 0.7,
    },
    {
      t: 2,
      type: 'bot_flipped',
      bot: 'red',
      cause: 'flipper',
      direction: [1, 0, 0],
      duration: 0.9,
      severity: 0.95,
    },
    {
      t: 3.5,
      type: 'bot_self_righted',
      bot: 'red',
      cause: 'gyro',
      duration: 1.2,
      severity: 0.8,
    },
    {
      t: 5,
      type: 'bot_immobilized',
      bot: 'blue',
      cause: 'lost drive',
      severity: 0.6,
    },
  ],
})

const fireBreathTimeline = createReplayTimeline({
  round: 7,
  duration: 3,
  summary: 'Dragon Head breathes fire at close range.',
  events: [
    {
      t: 0,
      type: 'spawn',
      bot: 'red',
      position: [0, 0, 0],
      rotation: [0, 90, 0],
    },
    {
      t: 0,
      type: 'spawn',
      bot: 'blue',
      position: [3, 0, 0],
      rotation: [0, -90, 0],
    },
    {
      t: 1.2,
      type: 'ability',
      bot: 'red',
      ability: 'fire_breath',
      weaponSlot: 'weaponB',
      target: 'blue',
      targetPosition: [2.2, 0, 0.4],
    },
  ],
})

const detachMetadataTimeline = createReplayTimeline({
  round: 5,
  duration: 7,
  summary: 'Red sheds armor with deterministic detach metadata.',
  events: [
    {
      t: 0,
      type: 'spawn',
      bot: 'red',
      position: [0, 0, 0],
      rotation: [0, 90, 0],
    },
    {
      t: 0,
      type: 'spawn',
      bot: 'blue',
      position: [-2, 0, 0],
      rotation: [0, -90, 0],
    },
    {
      t: 1,
      type: 'damage',
      bot: 'red',
      amount: 12,
      remainingHealth: 36,
      blockId: 'front-plate',
      partId: 'Armor_Front_Plate',
      partRemainingHealth: 0,
      partMaxHealth: 12,
    },
    {
      t: 2,
      type: 'part_detach',
      bot: 'red',
      blockId: 'front-plate',
      partId: 'Armor_Front_Plate',
      position: [0, 0.4, 0],
      sourcePosition: [-2, 0, 0],
      impactPosition: [0, 0, 0],
      impulse: [1.2, 1, 0.4],
      angularImpulse: [0.5, 1.25, -0.75],
      fractureSeverity: 0.8,
      damageCause: 'weapon',
    },
    {
      t: 5,
      type: 'part_detach',
      bot: 'red',
      blockId: 'rear-panel',
      partId: 'Armor_Rear_Panel',
      position: [-0.5, 0.3, 0.4],
      sourcePosition: [-2, 0, 0],
      impactPosition: [-0.5, 0, 0.4],
      impulse: [0.6, 0.7, 1.1],
      angularImpulse: [0.2, 0.9, -0.3],
      fractureSeverity: 0.45,
      damageCause: 'drone',
    },
  ],
})

test('replay mapping is deterministic for the same timeline and time', () => {
  const first = buildReplayFrame(timeline, 3.2)
  const second = buildReplayFrame(timeline, 3.2)

  assert.deepEqual(first, second)
})

test('machine replay projection preserves machine placement and orientation authority', () => {
  const sideWheelOrientation = {
    right: [0, 0, -1],
    up: [1, 0, 0],
    forward: [0, 1, 0],
  }
  const runtimeWheelOrientation = {
    right: [0, 0, 1],
    up: [-1, 0, 0],
    forward: [0, 1, 0],
  }
  const machine = {
    name: 'weird asymmetric replay machine',
    rootInstanceId: 'core',
    parts: [
      {
        instanceId: 'core',
        definitionId: 'system:machine-core:v1',
        source: 'system_core',
        immutable: true,
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          orientation: {
            right: [1, 0, 0],
            up: [0, 1, 0],
            forward: [0, 0, 1],
          },
        },
      },
      {
        instanceId: 'side-wheel',
        definitionId: 'catalog:Wheel_Large',
        source: 'catalog_part',
        transform: {
          position: [-3.25, 0.1, 1.75],
          rotation: [0, 270, 90],
          orientation: sideWheelOrientation,
        },
      },
      {
        instanceId: 'front-plate',
        definitionId: 'catalog:Armor_Front_Plate',
        source: 'catalog_part',
        transform: {
          position: [0.5, 0.2, 3.4],
          rotation: [89, 181, 44],
        },
      },
    ],
    attachments: [],
    runtime: {
      healthByInstanceId: {
        core: 20,
        'side-wheel': 7,
        'front-plate': 0,
      },
      detachedInstanceIds: ['front-plate'],
      orientationByInstanceId: {
        'side-wheel': runtimeWheelOrientation,
      },
    },
  }

  const parts = projectMachineDesignToReplayRenderParts(machine)
  const core = parts.find((part) => part.instanceId === 'core')
  const wheel = parts.find((part) => part.instanceId === 'side-wheel')
  const plate = parts.find((part) => part.instanceId === 'front-plate')

  assert.equal(MACHINE_REPLAY_VISUAL_AUTHORITY, 'machine:v1')
  assert.ok(core)
  assert.equal(core.partId, 'system:machine-core:v1')
  assert.equal(core.source, 'system_core')
  assert.ok(wheel)
  assert.equal(wheel.partId, 'Wheel_Large')
  assert.deepEqual(wheel.position, [-3.25, 0.1, 1.75])
  assert.deepEqual(wheel.orientation, runtimeWheelOrientation)
  assert.equal(wheel.health, 7)
  assert.ok(plate)
  assert.deepEqual(plate.orientation, {
    right: [1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, 1],
  })
  assert.equal(plate.detached, true)
})

test('machine replay node path is quarantined from legacy foundation shells', () => {
  const source = readFileSync('apps/web/src/replay/parts/index.ts', 'utf8')
  const machineStart = source.indexOf('export function createMachineReplayBotNode')
  const machineEnd = source.indexOf('export function createCatalogPartNode')
  const machineNodeSource = source.slice(machineStart, machineEnd)

  assert.ok(machineStart >= 0)
  assert.ok(machineEnd > machineStart)
  assert.equal(machineNodeSource.includes('createBotFoundation'), false)
  assert.equal(source.includes('createLegacyReplayBotBlueprintAdapterNode'), true)
})

test('compiled replay timeline preserves existing frame output', () => {
  const compiled = compileReplayTimeline(timeline)
  const rawFrame = buildReplayFrame(timeline, 3.4)
  const compiledFrame = buildReplayFrame(compiled, 3.4)

  assert.deepEqual(compiledFrame, rawFrame)
  assert.deepEqual(compiled.events, timeline.events)
})

test('compiled replay effect lookup stays bounded to active windows', () => {
  const events = [
    {
      t: 0,
      type: 'spawn',
      bot: 'red',
      position: [0, 0, 0],
      rotation: [0, 90, 0],
    },
    {
      t: 0,
      type: 'spawn',
      bot: 'blue',
      position: [5, 0, 0],
      rotation: [0, -90, 0],
    },
  ]

  for (let index = 0; index < 5000; index += 1) {
    events.push({
      t: 0.01 + index * 0.001,
      type: 'damage',
      bot: 'red',
      amount: 1,
      remainingHealth: 100 - (index % 100),
      blockId: `armor-${index}`,
      partId: 'Armor_Front_Plate',
      partRemainingHealth: 0,
      partMaxHealth: 12,
    })
  }

  events.push({
    t: 8,
    type: 'weapon_fire',
    bot: 'blue',
    weaponSlot: 'weaponA',
    targetPosition: [0, 0, 0],
  })

  const compiled = compileReplayTimeline(createReplayTimeline({
    round: 1,
    duration: 10,
    summary: 'Large inactive history plus one active weapon cue.',
    events,
  }))
  const activeEffects = activeEffectEventsAt(compiled, 8.1)
  const frame = buildReplayFrame(compiled, 8.1)

  assert.equal(compiled.effectWindows.length, 5001)
  assert.deepEqual(
    activeEffects.map(({ event }) => event.type),
    ['weapon_fire'],
  )
  assert.equal(frame.effects.some((effect) => effect.kind === 'weapon_fire'), true)
})

test('replay mapping clamps time and interpolates active moves', () => {
  assert.equal(clampReplayTime(timeline, -4), 0)
  assert.equal(clampReplayTime(timeline, 99), timeline.duration)

  const frame = buildReplayFrame(timeline, 1.41)

  assert.ok(frame.bots.red.position[0] > 1.3)
  assert.ok(frame.bots.red.position[0] < 1.6)
  assert.equal(frame.bots.red.status, 'active')
})

test('replay mapping uses move metadata duration and easing for deterministic progress', () => {
  const metadataTimeline = createReplayTimeline({
    round: 1,
    duration: 3,
    summary: 'Move metadata interpolation',
    events: [
      {
        t: 0,
        type: 'spawn',
        bot: 'red',
        position: [0, 0, 0],
        rotation: [0, 90, 0],
      },
      {
        t: 1,
        type: 'move',
        bot: 'red',
        from: [0, 0, 0],
        to: [4, 0, 0],
        duration: 0.5,
        easing: 'ease_out',
        intent: 'advance',
        facing: [1, 0, 0],
        contactIntent: true,
      },
    ],
  })
  const frame = buildReplayFrame(metadataTimeline, 1.25)

  assert.deepEqual(frame.bots.red.position, [3, 0, 0])
  assert.equal(frame.bots.red.motion.progress, 0.5)
  assert.equal(frame.bots.red.motion.easedProgress, 0.75)
  assert.ok(frame.bots.red.motion.contactIntensity > 0)
  assert.ok(frame.bots.red.motion.driveIntensity > 2)
  assert.ok(frame.bots.red.motion.lean > 0)
})

test('replay mapping keeps old minimal move events on the default interpolation window', () => {
  const minimalMoveTimeline = createReplayTimeline({
    round: 1,
    duration: 3,
    summary: 'Legacy move interpolation',
    events: [
      {
        t: 0,
        type: 'spawn',
        bot: 'blue',
        position: [4, 0, 0],
        rotation: [0, -90, 0],
      },
      {
        t: 1,
        type: 'move',
        bot: 'blue',
        from: [4, 0, 0],
        to: [0, 0, 0],
      },
    ],
  })
  const frame = buildReplayFrame(minimalMoveTimeline, 1.5)

  assert.deepEqual(frame.bots.blue.position, [2, 0, 0])
  assert.equal(frame.bots.blue.motion.progress, 0.5)
  assert.equal(frame.bots.blue.motion.easedProgress, 0.5)
  assert.ok(frame.bots.blue.motion.driveIntensity > 1)
})

test('replay mapping smooths facing changes for a strafe move instead of snapping rotation', () => {
  const strafeTimeline = createReplayTimeline({
    round: 1,
    duration: 3,
    summary: 'Strafe facing interpolation',
    events: [
      {
        t: 0,
        type: 'spawn',
        bot: 'red',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      },
      {
        t: 1,
        type: 'move',
        bot: 'red',
        from: [0, 0, 0],
        to: [0, 0, 2],
        duration: 1,
        easing: 'linear',
        intent: 'strafe',
        facing: [1, 0, 0],
      },
    ],
  })
  const midTurn = buildReplayFrame(strafeTimeline, 1.5)
  const completedTurn = buildReplayFrame(strafeTimeline, 2.05)

  assert.ok(midTurn.bots.red.rotationY > 0)
  assert.ok(midTurn.bots.red.rotationY < Math.PI / 2)
  assert.ok(midTurn.bots.red.motion.turn > 0)
  assert.ok(midTurn.bots.red.motion.drift < 0)
  assert.ok(midTurn.bots.red.motion.driveIntensity > 0)
  assert.equal(completedTurn.bots.red.motion.driveIntensity, 0)
  assert.equal(completedTurn.bots.red.rotationY, Math.PI / 2)
})

test('replay mapping does not reveal future move position or facing before its time', () => {
  const futureMoveTimeline = createReplayTimeline({
    round: 1,
    duration: 4,
    summary: 'Future move suppression',
    events: [
      {
        t: 0,
        type: 'spawn',
        bot: 'red',
        position: [0, 0, 0],
        rotation: [0, 90, 0],
      },
      {
        t: 1,
        type: 'move',
        bot: 'red',
        from: [0, 0, 0],
        to: [4, 0, 0],
        duration: 0.5,
        easing: 'linear',
        facing: [1, 0, 0],
      },
      {
        t: 2,
        type: 'move',
        bot: 'red',
        from: [4, 0, 0],
        to: [4, 0, 4],
        duration: 1,
        easing: 'linear',
        facing: [0, 0, 1],
      },
    ],
  })
  const beforeFuture = buildReplayFrame(futureMoveTimeline, 1.99)

  assert.deepEqual(beforeFuture.bots.red.position, [4, 0, 0])
  assert.equal(beforeFuture.bots.red.rotationY, Math.PI / 2)
})

test('replay mapping exposes weapon fire effects with team and slot context', () => {
  const frame = buildReplayFrame(timeline, 2.25)
  const weaponFire = frame.effects.find((effect) => effect.kind === 'weapon_fire')

  assert.ok(weaponFire)
  assert.equal(weaponFire.team, 'blue')
  assert.equal(weaponFire.label, 'weaponA')
  assert.ok(weaponFire.intensity > 0)
  assert.ok(weaponFire.intensity < 1)
})

test('replay mapping preserves weapon source identity and action metadata', () => {
  const frame = buildReplayFrame(createWeaponMetadataTimeline({
    phase: 'wind_up',
    style: 'spinner',
  }), 1.75)
  const weaponFire = frame.effects.find((effect) => effect.kind === 'weapon_fire')

  assert.ok(weaponFire)
  assert.equal(weaponFire.sourceBlockId, 'front-spinner')
  assert.equal(weaponFire.sourcePartId, 'Weapon_Spinner_Small')
  assert.equal(weaponFire.weaponPhase, 'wind_up')
  assert.equal(weaponFire.weaponStyle, 'spinner')
  assert.equal(weaponFire.label, 'weaponA-spinner-wind_up')
  assert.deepEqual(weaponFire.endPosition, [4.4, 0, 0.2])
})

test('replay mapping changes weapon effect labels deterministically by style and phase', () => {
  const turretRelease = buildReplayFrame(createWeaponMetadataTimeline({
    phase: 'release',
    style: 'turret',
  }), 1.75).effects.find((effect) => effect.kind === 'weapon_fire')
  const flipperRecoil = buildReplayFrame(createWeaponMetadataTimeline({
    phase: 'recoil',
    style: 'flipper',
  }), 1.75).effects.find((effect) => effect.kind === 'weapon_fire')

  assert.ok(turretRelease)
  assert.ok(flipperRecoil)
  assert.equal(turretRelease.label, 'weaponA-turret-release')
  assert.equal(flipperRecoil.label, 'weaponA-flipper-recoil')
  assert.notEqual(turretRelease.label, flipperRecoil.label)
})

test('replay mapping preserves source metadata on control-net deploy effects', () => {
  const frame = buildReplayFrame(createWeaponMetadataTimeline({
    controlCue: 'deploy',
    phase: 'deploy',
    style: 'net',
  }), 1.75)
  const deploy = frame.effects.find((effect) => effect.kind === 'weapon_fire')
  const controlNet = frame.effects.find((effect) => effect.kind === 'control_net')

  assert.ok(deploy)
  assert.ok(controlNet)
  assert.equal(deploy.label, 'weaponA-net-deploy')
  assert.equal(controlNet.label, 'control_net-net')
  assert.equal(controlNet.sourceBlockId, 'front-spinner')
  assert.equal(controlNet.sourcePartId, 'Weapon_Spinner_Small')
  assert.equal(controlNet.weaponPhase, 'deploy')
  assert.equal(controlNet.weaponStyle, 'net')
})

test('replay mapping keeps old minimal weapon fire events safe', () => {
  const frame = buildReplayFrame(timeline, 2.25)
  const weaponFire = frame.effects.find((effect) => effect.kind === 'weapon_fire')

  assert.ok(weaponFire)
  assert.equal(weaponFire.label, 'weaponA')
  assert.equal(weaponFire.sourceBlockId, undefined)
  assert.equal(weaponFire.sourcePartId, undefined)
  assert.equal(weaponFire.weaponStyle, undefined)
  assert.equal(weaponFire.weaponPhase, 'release')
})

test('replay mapping anchors weapon fire effects to the firing state', () => {
  const frame = buildReplayFrame(movingWeaponTimeline, 1.75)
  const weaponFire = frame.effects.find((effect) => effect.kind === 'weapon_fire')

  assert.ok(weaponFire)
  assert.deepEqual(weaponFire.position, [2, 0, 0])
  assert.equal(weaponFire.rotationY, Math.PI / 2)
  assert.ok(frame.bots.red.position[0] > weaponFire.position[0])
})

test('replay mapping exposes impact effects and knockout end state', () => {
  const impactFrame = buildReplayFrame(timeline, 3.2)
  const endFrame = buildReplayFrame(timeline, 5.2)

  assert.ok(impactFrame.effects.some((effect) => effect.kind === 'impact'))
  assert.ok(impactFrame.effects.some((effect) => effect.kind === 'debris'))
  assert.ok(impactFrame.effects.some((effect) => effect.kind === 'damage_marker'))
  assert.ok(impactFrame.effects.some((effect) => effect.kind === 'smoke'))
  assert.equal(endFrame.bots.red.status, 'knocked_out')
  assert.deepEqual(endFrame.endState, {
    knockedOut: 'red',
    winner: 'blue',
    cause: 'drive disabled',
  })
})

test('replay mapping exposes hazard effects with damage and hazard context', () => {
  const frame = buildReplayFrame(timeline, 4.2)
  const hazard = frame.effects.find((effect) => effect.kind === 'hazard')

  assert.ok(hazard)
  assert.equal(hazard.team, 'red')
  assert.equal(hazard.label, 'center saw')
  assert.equal(hazard.damage, 8)
  assert.deepEqual(hazard.position, [2, 0, -1])
})

test('replay mapping pulses non-damaging hazards without fake damage markers', () => {
  const oilTimeline = createReplayTimeline({
    round: 1,
    duration: 3,
    summary: 'Oil slick slows Blue.',
    events: [
      { t: 0, type: 'spawn', bot: 'red', position: [-5, 0, 0], rotation: [0, 90, 0] },
      { t: 0, type: 'spawn', bot: 'blue', position: [5, 0, 0], rotation: [0, -90, 0] },
      { t: 1, type: 'hazard', hazard: 'blue oil slick', bot: 'blue', damage: 0, position: [4.8, 0, 0] },
    ],
  })
  const frame = buildReplayFrame(oilTimeline, 1.2)

  assert.ok(frame.effects.some((effect) => effect.kind === 'hazard' && effect.label === 'blue oil slick'))
  assert.equal(frame.effects.some((effect) => effect.kind === 'damage_marker'), false)
})

test('mock replay stays inside the MVP segment duration cap', () => {
  assert.ok(mockReplay.duration >= 15)
  assert.ok(mockReplay.duration <= 30)
  assert.ok(mockReplay.events.every((event) => event.t <= mockReplay.duration))
})

test('replay timeline validation accepts old minimal semantic event shapes', () => {
  const oldMinimalTimeline = createReplayTimeline({
    round: 1,
    duration: 4,
    summary: 'Old minimal replay contract',
    events: [
      {
        t: 0,
        type: 'spawn',
        bot: 'red',
        position: [0, 0, 0],
        rotation: [0, 90, 0],
      },
      {
        t: 1,
        type: 'move',
        bot: 'red',
        from: [0, 0, 0],
        to: [1, 0, 0],
      },
      {
        t: 2,
        type: 'weapon_fire',
        bot: 'red',
        weaponSlot: 'weaponA',
      },
      {
        t: 3,
        type: 'part_detach',
        bot: 'blue',
        blockId: 'left-wheel',
        partId: 'Wheel_Large',
        position: [1, 0.2, 0],
      },
    ],
  })

  assert.equal(validateReplayTimeline(oldMinimalTimeline), true)
})

test('replay timeline validation rejects empty-duration and out-of-range events', () => {
  const outOfRange = createReplayTimeline({
    round: 1,
    duration: 1,
    summary: 'Out of bounds',
    events: [
      {
        t: 3,
        type: 'spawn',
        bot: 'red',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      },
    ],
  })

  assert.equal(
    validateReplayTimeline({
      round: 1,
      duration: 0,
      summary: 'Invalid duration',
      events: [],
    }),
    false,
  )
  assert.equal(validateReplayTimeline(outOfRange), false)
  assert.equal(
    validateReplayTimeline({
      round: 1,
      duration: 602,
      summary: 'Too long',
      events: [],
    }),
    false,
  )
  assert.equal(
    validateReplayTimeline({
      round: 1.5,
      duration: 2,
      summary: 'Fractional round',
      events: [],
    }),
    false,
  )
  assert.equal(
    validateReplayTimeline({
      round: 1,
      duration: 2,
      summary: 'Unsorted equal-time types',
      events: [
        {
          t: 1,
          type: 'weapon_fire',
          bot: 'red',
          weaponSlot: 'weaponA',
        },
        {
          t: 1,
          type: 'spawn',
          bot: 'red',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
        },
      ],
    }),
    false,
  )
  const ordered = createReplayTimeline({
    round: 2,
    duration: 2.5,
    summary: 'Unordered',
    events: [
      {
        t: 2,
        type: 'spawn',
        bot: 'blue',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      },
      {
        t: 0.5,
        type: 'spawn',
        bot: 'red',
        position: [1, 0, 0],
        rotation: [0, 0, 0],
      },
    ],
  })

  assert.equal(validateReplayTimeline(ordered), true)
  assert.equal(ordered.events[0].t, 0.5)
})

test('replay mapping exposes part detach only after the detach event time', () => {
  const before = buildReplayFrame(timeline, 3.2)
  const after = buildReplayFrame(timeline, 3.4)
  const afterVisualWindow = buildReplayFrame(timeline, 5.2)

  assert.equal(before.parts.red['left-wheel'].status, 'attached')
  assert.equal(before.parts.red['left-wheel'].health, 0)
  assert.equal(before.effects.some((effect) => effect.kind === 'part_detach' && effect.label === 'left-wheel'), false)
  assert.equal(before.effects.some((effect) => effect.kind === 'debris' && effect.label === 'left-wheel'), false)
  assert.equal(after.parts.red['left-wheel'].status, 'detached')
  assert.equal(after.parts.red['left-wheel'].blockId, 'left-wheel')
  assert.equal(after.parts.red['left-wheel'].partId, 'Wheel_Large')
  assert.deepEqual(after.parts.red['left-wheel'].detachPosition, [3.5, 0.2, 0.2])
  assert.ok(after.effects.some((effect) => effect.kind === 'part_detach' && effect.label === 'left-wheel'))
  assert.ok(after.effects.some((effect) => effect.kind === 'debris' && effect.label === 'left-wheel'))
  assert.equal(afterVisualWindow.parts.red['left-wheel'].status, 'detached')
  assert.equal(
    afterVisualWindow.effects.some((effect) => effect.kind === 'part_detach' && effect.label === 'left-wheel'),
    false,
  )
  assert.equal(afterVisualWindow.effects.some((effect) => effect.kind === 'debris' && effect.label === 'left-wheel'), false)
})

test('replay mapping preserves detach metadata into part frame state', () => {
  const frame = buildReplayFrame(detachMetadataTimeline, 2.25)
  const part = frame.parts.red['front-plate']

  assert.equal(part.status, 'detached')
  assert.equal(part.blockId, 'front-plate')
  assert.equal(part.partId, 'Armor_Front_Plate')
  assert.deepEqual(part.detachPosition, [0, 0.4, 0])
  assert.deepEqual(part.sourcePosition, [-2, 0, 0])
  assert.deepEqual(part.impactPosition, [0, 0, 0])
  assert.deepEqual(part.impulse, [1.2, 1, 0.4])
  assert.deepEqual(part.angularImpulse, [0.5, 1.25, -0.75])
  assert.equal(part.fractureSeverity, 0.8)
  assert.equal(part.damageCause, 'weapon')
  assert.deepEqual(part.detachMotion.originPosition, [0, 0.4, 0])
  assert.deepEqual(part.detachMotion.impulse, [1.2, 1, 0.4])
  assert.deepEqual(part.detachMotion.angularImpulse, [0.5, 1.25, -0.75])
})

test('replay mapping computes deterministic detach arc, spin, settle, and fade', () => {
  const airborne = buildReplayFrame(detachMetadataTimeline, 2.25).parts.red['front-plate'].detachMotion
  const settled = buildReplayFrame(detachMetadataTimeline, 4).parts.red['front-plate'].detachMotion
  const fading = buildReplayFrame(detachMetadataTimeline, 6.7).parts.red['front-plate'].detachMotion
  const repeat = buildReplayFrame(detachMetadataTimeline, 2.25).parts.red['front-plate'].detachMotion

  assert.deepEqual(airborne, repeat)
  assert.equal(airborne.age, 0.25)
  assert.equal(airborne.settled, false)
  assert.deepEqual(airborne.position, [0.287, 0.531, 0.096])
  assert.deepEqual(airborne.rotation, [0.125, 0.313, -0.187])
  assert.equal(airborne.fade, 1)
  assert.equal(settled.settled, true)
  assert.deepEqual(settled.position, [0.779, 0.08, 0.26])
  assert.deepEqual(settled.rotation, [0.083, 0.206, -0.124])
  assert.equal(fading.settled, true)
  assert.equal(fading.fade, 0.643)
})

test('replay mapping keeps legacy minimal detach safe with deterministic fallback motion', () => {
  const legacyTimeline = createReplayTimeline({
    round: 1,
    duration: 5,
    summary: 'Legacy detach without optional metadata.',
    events: [
      {
        t: 0,
        type: 'spawn',
        bot: 'blue',
        position: [0, 0, 0],
        rotation: [0, -90, 0],
      },
      {
        t: 2,
        type: 'part_detach',
        bot: 'blue',
        blockId: 'left-wheel',
        partId: 'Wheel_Large',
        position: [1, 0.2, 0],
      },
    ],
  })
  const frame = buildReplayFrame(legacyTimeline, 2.5)
  const part = frame.parts.blue['left-wheel']

  assert.equal(part.status, 'detached')
  assert.equal(part.sourcePosition, undefined)
  assert.equal(part.impactPosition, undefined)
  assert.equal(part.fractureSeverity, 0.55)
  assert.deepEqual(part.detachMotion.originPosition, [1, 0.2, 0])
  assert.equal(part.detachMotion.impulse.every(Number.isFinite), true)
  assert.notDeepEqual(part.detachMotion.position, part.detachMotion.originPosition)
})

test('replay mapping does not leak future detach metadata or motion early', () => {
  const beforeFuture = buildReplayFrame(detachMetadataTimeline, 4.99)
  const afterFuture = buildReplayFrame(detachMetadataTimeline, 5.1)

  assert.equal(beforeFuture.parts.red['rear-panel'], undefined)
  assert.equal(
    beforeFuture.effects.some((effect) => effect.kind === 'part_detach' && effect.label === 'rear-panel'),
    false,
  )
  assert.equal(afterFuture.parts.red['rear-panel'].status, 'detached')
  assert.equal(afterFuture.parts.red['rear-panel'].damageCause, 'drone')
  assert.ok(afterFuture.parts.red['rear-panel'].detachMotion)
})

test('replay mapping exposes laser_lance ability effects with deterministic placement', () => {
  const frame = buildReplayFrame(abilityTimeline, 2.1)
  const laserCore = frame.effects.find(
    (effect) => effect.kind === 'laser_lance',
  )

  assert.ok(laserCore)
  assert.ok(Math.abs(laserCore.position[0] - 2.7) < 0.1)
  assert.ok(Math.abs(laserCore.position[2] + 1.3) < 0.1)
  assert.deepEqual(laserCore.endPosition, [0.8, 0, -0.4])
  assert.equal(laserCore.label, 'laser_lance')
  assert.ok(laserCore.intensity > 0)
  assert.ok(laserCore.intensity < 1)
  assert.equal(
    frame.effects.some((effect) => effect.kind === 'weapon_fire' && effect.label === 'laser_lance'),
    false,
  )
  assert.equal(frame.effects.some((effect) => effect.kind === 'debris' && effect.label === 'laser_lance'), false)
})

test('replay mapping does not reveal laser_lance effects before ability event time', () => {
  const before = buildReplayFrame(abilityTimeline, 1.59)
  const atEvent = buildReplayFrame(abilityTimeline, 1.8)

  assert.equal(before.effects.some((effect) => effect.label === 'laser_lance'), false)
  assert.equal(atEvent.effects.some((effect) => effect.label === 'laser_lance'), true)
})

const cameraTestArena = {
  name: 'Camera test box',
  width: 26,
  height: 18,
  activeHazards: [],
}

test('canonical replay camera presets are limited to broadcast, red, and blue', () => {
  assert.deepEqual(CANONICAL_CAMERA_PRESETS, ['broadcast', 'red', 'blue'])
  assert.deepEqual(
    CAMERA_PRESET_OPTIONS.map((option) => option.value),
    ['broadcast', 'red', 'blue'],
  )
})

test('legacy camera aliases normalize to approved canonical replay presets', () => {
  assert.equal(normalizeCameraPreset('broadcast'), 'broadcast')
  assert.equal(normalizeCameraPreset('red'), 'red')
  assert.equal(normalizeCameraPreset('blue'), 'blue')
  assert.equal(normalizeCameraPreset('red_follow'), 'red')
  assert.equal(normalizeCameraPreset('blue_follow'), 'blue')
  assert.equal(normalizeCameraPreset('wide'), 'broadcast')
  assert.equal(normalizeCameraPreset('impact'), 'broadcast')
  assert.equal(normalizeCameraPreset('cinematic'), 'broadcast')
  assert.equal(normalizeCameraPreset('broad'), 'broadcast')
  assert.equal(normalizeCameraPreset(null), 'broadcast')
})

function createCameraFrame({
  blue = [1, 0, 0],
  effects = [],
  red = [-1, 0, 0],
} = {}) {
  return {
    time: 0,
    progress: 0,
    bots: {
      red: {
        role: 'red',
        position: red,
        rotationY: Math.PI / 2,
        status: 'active',
      },
      blue: {
        role: 'blue',
        position: blue,
        rotationY: -Math.PI / 2,
        status: 'active',
      },
    },
    parts: {
      red: {},
      blue: {},
    },
    effects,
  }
}

test('replay mapping does not reveal future control, ability, impact, damage, hazard, or detach cues', () => {
  const beforeControl = buildReplayFrame(movingWeaponTimeline, 1.49)
  const beforeWeaponMetadata = buildReplayFrame(createWeaponMetadataTimeline(), 1.49)
  const beforeDroneSwarm = buildReplayFrame(droneSwarmTimeline, 1.59)
  const beforeImpact = buildReplayFrame(timeline, 2.99)
  const beforeDamage = buildReplayFrame(timeline, 3.09)
  const beforeDetach = buildReplayFrame(timeline, 3.24)
  const beforeHazard = buildReplayFrame(timeline, 3.99)

  assert.equal(
    beforeControl.effects.some((effect) => effect.label === 'weaponA-deploy' || effect.kind === 'control_net'),
    false,
  )
  assert.equal(beforeWeaponMetadata.effects.some((effect) => effect.sourceBlockId === 'front-spinner'), false)
  assert.equal(beforeWeaponMetadata.effects.some((effect) => effect.endPosition?.[0] === 4.4), false)
  assert.equal(beforeDroneSwarm.effects.some((effect) => effect.kind === 'drone_swarm'), false)
  assert.equal(beforeImpact.effects.some((effect) => effect.kind === 'impact'), false)
  assert.equal(beforeImpact.effects.some((effect) => effect.kind === 'debris'), false)
  assert.equal(beforeDamage.effects.some((effect) => effect.kind === 'damage_marker'), false)
  assert.equal(beforeDetach.parts.red['left-wheel'].status, 'attached')
  assert.equal(beforeDetach.parts.red['left-wheel'].health, 0)
  assert.equal(
    beforeDetach.effects.some((effect) => effect.kind === 'part_detach' && effect.label === 'left-wheel'),
    false,
  )
  assert.equal(
    beforeHazard.effects.some((effect) => effect.kind === 'hazard' && effect.label === 'center saw'),
    false,
  )
})

test('replay mapping exposes drone_swarm ability effects with separate lane semantics', () => {
  const frame = buildReplayFrame(droneSwarmTimeline, 2.1)
  const droneSwarm = frame.effects.find((effect) => effect.kind === 'drone_swarm')

  assert.ok(droneSwarm)
  assert.ok(Math.abs(droneSwarm.position[0] - 2.7) < 0.1)
  assert.ok(Math.abs(droneSwarm.position[2] + 1.3) < 0.1)
  assert.deepEqual(droneSwarm.endPosition, [0.8, 0, -0.4])
  assert.equal(droneSwarm.team, 'blue')
  assert.equal(droneSwarm.label, 'drone_swarm')
  assert.equal(droneSwarm.kind, 'drone_swarm')
  assert.ok(droneSwarm.intensity > 0)
  assert.ok(droneSwarm.intensity < 1)
  assert.equal(frame.effects.every((effect) => effect.kind !== 'laser_lance'), true)
})

test('replay mapping exposes fire_breath ability effects with target endpoints', () => {
  const before = buildReplayFrame(fireBreathTimeline, 1.19)
  const frame = buildReplayFrame(fireBreathTimeline, 1.55)
  const fireBreath = frame.effects.find((effect) => effect.kind === 'fire_breath')

  assert.equal(before.effects.some((effect) => effect.kind === 'fire_breath'), false)
  assert.ok(fireBreath)
  assert.equal(fireBreath.team, 'red')
  assert.equal(fireBreath.label, 'fire_breath')
  assert.deepEqual(fireBreath.endPosition, [2.2, 0, 0.4])
  assert.ok(fireBreath.intensity > 0)
  assert.ok(fireBreath.intensity < 1)
})

test('replay mapping turns stability events into deterministic bot pose state', () => {
  const before = buildReplayFrame(stabilityTimeline, 0.99)
  const destabilized = buildReplayFrame(stabilityTimeline, 1.2)
  const flipped = buildReplayFrame(stabilityTimeline, 3)
  const selfRighting = buildReplayFrame(stabilityTimeline, 4)
  const recovered = buildReplayFrame(stabilityTimeline, 4.8)
  const immobilized = buildReplayFrame(stabilityTimeline, 5.2)

  assert.equal(before.bots.red.stability.pose, 'upright')
  assert.equal(before.effects.some((effect) => effect.kind === 'stability'), false)
  assert.equal(destabilized.bots.red.stability.pose, 'destabilized')
  assert.ok(Math.abs(destabilized.bots.red.stability.roll) > 0)
  assert.ok(destabilized.effects.some((effect) => effect.kind === 'stability' && effect.team === 'red'))
  assert.equal(flipped.bots.red.stability.pose, 'flipped')
  assert.ok(Math.abs(flipped.bots.red.stability.roll) > 3)
  assert.equal(selfRighting.bots.red.stability.pose, 'self_righting')
  assert.ok(Math.abs(selfRighting.bots.red.stability.roll) < Math.abs(flipped.bots.red.stability.roll))
  assert.equal(recovered.bots.red.stability.pose, 'upright')
  assert.equal(immobilized.bots.blue.status, 'immobilized')
  assert.equal(immobilized.bots.blue.stability.pose, 'immobilized')
})

test('replay mapping emits a larger deploy control cue for net/control-linked weapon fire', () => {
  const frame = buildReplayFrame(movingWeaponTimeline, 2)
  const deploy = frame.effects.find((effect) => effect.label === 'weaponA-deploy')
  const cue = frame.effects.find((effect) => effect.kind === 'control_net')

  assert.ok(deploy)
  assert.ok(cue)
  assert.equal(deploy.kind, 'weapon_fire')
  assert.equal(cue.label, 'control_net')
  assert.equal(deploy.rotationY, Math.PI / 2)
  assert.equal(cue.damage, undefined)
  assert.ok(deploy.intensity >= cue.intensity)
  assert.deepEqual(cue.endPosition, [4, 0, 0])
  assert.ok(cue.intensity > 0)
  assert.ok(cue.intensity <= 1)
  assert.equal(frame.effects.some((effect) => effect.kind === 'damage_marker'), false)
  assert.deepEqual(frame.parts.red, {})
})

test('broadcast camera framing keeps both bots visible and expands for bot spread', () => {
  const closeFrame = createCameraFrame()
  const spreadFrame = createCameraFrame({
    red: [-8, 0, 0],
    blue: [8, 0, 0],
  })
  const closeCamera = calculateBroadcastFrameForBothBotsAndActiveEffect(
    closeFrame,
    cameraTestArena,
    16 / 9,
  )
  const spreadCamera = calculateBroadcastFrameForBothBotsAndActiveEffect(
    spreadFrame,
    cameraTestArena,
    16 / 9,
  )

  assert.equal(spreadCamera.focusPoints.length, 2)
  assert.deepEqual(spreadCamera.target, [0, 0, 0])
  assert.ok(spreadCamera.radius > closeCamera.radius)
})

test('broadcast camera framing includes active effect endpoints in target and radius', () => {
  const baselineCamera = calculateBroadcastFrameForBothBotsAndActiveEffect(
    createCameraFrame(),
    cameraTestArena,
    16 / 9,
  )
  const effectCamera = calculateBroadcastFrameForBothBotsAndActiveEffect(
    createCameraFrame({
      effects: [
        {
          id: 'laser',
          kind: 'laser_lance',
          position: [0, 0, 0],
          endPosition: [10, 0, -6],
          age: 0.2,
          intensity: 0.8,
          team: 'blue',
        },
      ],
    }),
    cameraTestArena,
    16 / 9,
  )

  assert.equal(effectCamera.activeEffectFocusPoints.length, 2)
  assert.ok(effectCamera.focusPoints.some((point) => point[0] === 10 && point[2] === -6))
  assert.ok(effectCamera.target[0] > baselineCamera.target[0])
  assert.ok(effectCamera.radius > baselineCamera.radius)
})

test('replay timeline validation accepts stability and fire-breath semantic events', () => {
  assert.equal(validateReplayTimeline(stabilityTimeline), true)
  assert.equal(validateReplayTimeline(fireBreathTimeline), true)
})

test('broadcast camera framing clamps tall effect focus to an above-floor target band', () => {
  const effectCamera = calculateBroadcastFrameForBothBotsAndActiveEffect(
    createCameraFrame({
      effects: [
        {
          id: 'tall-effect',
          kind: 'control_net',
          position: [0, 8, 0],
          endPosition: [4, 6, 2],
          age: 0.2,
          intensity: 0.8,
          team: 'red',
        },
      ],
    }),
    cameraTestArena,
    16 / 9,
  )

  assert.ok(effectCamera.activeEffectFocusPoints.some((point) => point[1] > 1))
  assert.ok(effectCamera.target[1] >= 0)
  assert.ok(effectCamera.target[1] <= 0.9)
})

test('broadcast camera framing widens for a narrow viewport instead of cropping the fight', () => {
  const frame = createCameraFrame({
    red: [-3, 0, 0],
    blue: [3, 0, 0],
  })
  const desktopCamera = calculateBroadcastFrameForBothBotsAndActiveEffect(
    frame,
    cameraTestArena,
    16 / 9,
  )
  const narrowCamera = calculateBroadcastFrameForBothBotsAndActiveEffect(
    frame,
    cameraTestArena,
    390 / 844,
  )
  const edgeFrame = createCameraFrame({
    red: [-8, 0, 0],
    blue: [3, 0, -2],
    effects: [
      {
        id: 'knockout',
        kind: 'knockout',
        position: [-8, 0, 0],
        age: 2,
        intensity: 1,
        team: 'red',
      },
    ],
  })
  const edgeDesktopCamera = calculateBroadcastFrameForBothBotsAndActiveEffect(
    edgeFrame,
    cameraTestArena,
    16 / 9,
  )
  const edgeActualCanvasNarrowCamera = calculateBroadcastFrameForBothBotsAndActiveEffect(
    edgeFrame,
    cameraTestArena,
    353 / 439,
  )

  assert.ok(narrowCamera.radius > desktopCamera.radius)
  assert.ok(edgeActualCanvasNarrowCamera.radius > edgeDesktopCamera.radius * 2)
})

test('broadcast camera framing caps shake for no excessive shake invariant', () => {
  assert.equal(
    capBroadcastShakeForNoExcessiveShake(10),
    NO_EXCESSIVE_BROADCAST_SHAKE_LIMIT,
  )
  assert.equal(capBroadcastShakeForNoExcessiveShake(-1), 0)
})

test('red and blue follow cameras deterministically target the selected bot only', () => {
  const frame = createCameraFrame({
    red: [-7, 0.2, 2],
    blue: [4, 0.1, -3],
    effects: [
      {
        id: 'impact',
        kind: 'impact',
        position: [12, 0, 12],
        age: 0.1,
        intensity: 1,
      },
    ],
  })
  const redFollow = calculateTeamFollowFrame(frame, cameraTestArena, 'red')
  const blueFollow = calculateTeamFollowFrame(frame, cameraTestArena, 'blue')
  const redRepeat = calculateTeamFollowFrame(frame, cameraTestArena, 'red')

  assert.deepEqual(redFollow, redRepeat)
  assert.equal(redFollow.team, 'red')
  assert.equal(blueFollow.team, 'blue')
  assert.deepEqual(redFollow.target, [-7, 0.55, 2])
  assert.deepEqual(blueFollow.target, [4, 0.45, -3])
  assert.equal(redFollow.alpha, blueFollow.alpha)
  assert.equal(redFollow.beta, blueFollow.beta)
  assert.equal(redFollow.radius, blueFollow.radius)
})
