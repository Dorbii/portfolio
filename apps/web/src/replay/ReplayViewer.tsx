import { useEffect, useMemo, useState } from 'react'
import type { ReplayEvent, ReplayTimeline } from '../../../../packages/replay/src/index.js'
import type {
  ArenaConfig,
  BotBlueprint,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { BabylonReplayScene } from './scene/BabylonReplayScene'
import type { LegacyTeamIdentity } from '../shared/teamVisuals'
import {
  buildReplayFrame,
  clampReplayTime,
  compileReplayTimeline,
  type CameraPreset,
  type ReplayEffectState,
} from './replayMapping'
import { CAMERA_PRESET_OPTIONS, normalizeCameraPreset } from './camera/presets'
import { BotPartMap } from './ReplayPartMap'
import { capitalize, formatDurationSeconds, formatLabel } from '../shared/format'
import {
  ActionGroup,
  Button,
  FormField,
} from '../shared/ui'

type ReplayViewerProps = {
  arena: ArenaConfig
  botBlueprints: Record<TeamRole, BotBlueprint>
  initialCameraPreset?: CameraPreset
  initialTime?: number
  proofMode?: boolean
  showDamageSchematic?: boolean
  teamIdentities: Record<TeamRole, LegacyTeamIdentity>
  timeline: ReplayTimeline
}

const speedOptions = [0.5, 1, 1.5, 2]

export function ReplayViewer({
  arena,
  botBlueprints,
  initialCameraPreset = 'broadcast',
  initialTime = 0,
  proofMode = false,
  showDamageSchematic = true,
  teamIdentities,
  timeline,
}: ReplayViewerProps) {
  const [time, setTime] = useState(() => clampReplayTime(timeline, initialTime))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(() =>
    normalizeCameraPreset(initialCameraPreset),
  )
  const compiledTimeline = useMemo(() => compileReplayTimeline(timeline), [timeline])
  const firstActionTime = useMemo(
    () => findFirstReplayActionTime(compiledTimeline.events),
    [compiledTimeline.events],
  )
  const frame = useMemo(() => buildReplayFrame(compiledTimeline, time), [compiledTimeline, time])
  const activeEvent = useMemo(
    () => findActiveEvent(compiledTimeline.events, time, frame.effects),
    [compiledTimeline.events, frame.effects, time],
  )

  useEffect(() => {
    setTime(clampReplayTime(timeline, initialTime))
  }, [initialTime, timeline])

  useEffect(() => {
    setCameraPreset(normalizeCameraPreset(initialCameraPreset))
  }, [initialCameraPreset])

  useEffect(() => {
    if (!playing) {
      return undefined
    }

    let animationFrame = 0
    let previous = performance.now()

    const tick = (now: number) => {
      const elapsed = ((now - previous) / 1000) * speed
      previous = now

      setTime((current) => {
        const next = clampReplayTime(compiledTimeline, current + elapsed)

        if (next >= compiledTimeline.duration) {
          setPlaying(false)
        }

        return next
      })
      animationFrame = window.requestAnimationFrame(tick)
    }

    animationFrame = window.requestAnimationFrame(tick)

    return () => window.cancelAnimationFrame(animationFrame)
  }, [compiledTimeline, playing, speed])

  const reset = () => {
    setPlaying(false)
    setTime(0)
  }

  const togglePlayback = () => {
    if (playing) {
      setPlaying(false)
      return
    }

    setTime((current) => {
      if (current >= compiledTimeline.duration) {
        return firstActionTime
      }

      if (current <= 0.05 && firstActionTime > 0.05) {
        return Math.max(0, firstActionTime - 0.12)
      }

      return current
    })
    setPlaying(true)
  }

  return (
    <section
      className={`replay-shell${proofMode ? ' replay-shell-proof' : ''}`}
      aria-label="Babylon replay viewer"
      data-replay-camera={cameraPreset}
      data-replay-playing={playing ? 'true' : 'false'}
      data-replay-time={time.toFixed(2)}
    >
      <BabylonReplayScene
        arena={arena}
        botBlueprints={botBlueprints}
        cameraPreset={cameraPreset}
        immediateCamera={proofMode}
        teamIdentities={teamIdentities}
        timeline={timeline}
        time={time}
      />
      {proofMode ? null : (
        <>
          <ActionGroup className="replay-controls" aria-label="Replay controls">
            <Button
              type="button"
              variant={playing ? 'secondary' : 'primary'}
              onClick={togglePlayback}
            >
              {playing ? 'Pause' : 'Play'}
            </Button>
            <Button type="button" variant="secondary" onClick={reset}>
              Reset
            </Button>
            <FormField label="Speed">
              <select
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              >
                {speedOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}x
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Camera">
              <select
                value={cameraPreset}
                onChange={(event) => setCameraPreset(normalizeCameraPreset(event.target.value))}
              >
                {CAMERA_PRESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField className="replay-scrubber" label={formatDurationSeconds(time)}>
              <input
                aria-label="Replay time"
                max={timeline.duration}
                min={0}
                step={0.05}
                type="range"
                value={time}
                onChange={(event) => {
                  setPlaying(false)
                  setTime(Number(event.target.value))
                }}
              />
            </FormField>
          </ActionGroup>
          <div className="replay-status-strip">
            <span>Round {timeline.round}</span>
            <strong>{activeEvent ? formatLabel(activeEvent.type) : 'Ready'}</strong>
            <span>{formatDurationSeconds(time)} / {formatDurationSeconds(timeline.duration)}</span>
            {frame.endState ? (
              <span>
                {capitalize(frame.endState.winner ?? 'draw')} wins,{' '}
                {capitalize(frame.endState.knockedOut ?? 'draw')} KO
              </span>
            ) : (
              <span>{frame.effects.length} active effects</span>
            )}
          </div>
          {showDamageSchematic ? (
            <div className="replay-damage-schematic" aria-label="Current bot part state">
              <BotPartMap
                blueprint={botBlueprints.red}
                partStates={frame.parts.red}
                role="red"
              />
              <BotPartMap
                blueprint={botBlueprints.blue}
                partStates={frame.parts.blue}
                role="blue"
              />
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

function findActiveEvent(
  events: ReplayEvent[],
  time: number,
  effects: ReplayEffectState[],
): ReplayEvent | undefined {
  let current: ReplayEvent | undefined

  for (const event of events) {
    if (event.t > time) {
      break
    }

    current = event
  }

  if (current?.type === 'part_detach' && !hasVisiblePartDetach(current, effects)) {
    return undefined
  }

  return current
}

function findFirstReplayActionTime(events: ReplayEvent[]): number {
  for (const event of events) {
    if (isNonTrivialMove(event)) {
      return event.t
    }
  }

  return events.find((event) => event.type !== 'spawn')?.t ?? 0
}

function isNonTrivialMove(event: ReplayEvent): boolean {
  if (event.type !== 'move') {
    return false
  }

  return Math.hypot(event.to[0] - event.from[0], event.to[2] - event.from[2]) > 0.05
}

function hasVisiblePartDetach(
  event: ReplayEvent,
  effects: ReplayEffectState[],
): boolean {
  if (event.type !== 'part_detach') {
    return true
  }

  return effects.some(
    (effect) => effect.kind === 'part_detach' && effect.label === event.blockId,
  )
}
