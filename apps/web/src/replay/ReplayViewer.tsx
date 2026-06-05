import { useEffect, useMemo, useState } from 'react'
import type { ReplayEvent, ReplayTimeline } from '../../../../packages/replay/src/index.js'
import type {
  ArenaConfig,
  BotBlueprint,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { BabylonReplayScene } from './BabylonReplayScene'
import {
  buildReplayFrame,
  clampReplayTime,
  type CameraPreset,
} from './replayMapping'
import { BotPartMap } from './ReplayPartMap'
import { capitalize, formatDurationSeconds, formatLabel } from '../shared/format'

type ReplayViewerProps = {
  arena: ArenaConfig
  botBlueprints: Record<TeamRole, BotBlueprint>
  initialCameraPreset?: CameraPreset
  initialTime?: number
  proofMode?: boolean
  timeline: ReplayTimeline
}

const cameraOptions: { label: string; value: CameraPreset }[] = [
  { label: 'Broadcast', value: 'broadcast' },
  { label: 'Wide', value: 'wide' },
  { label: 'Red follow', value: 'red_follow' },
  { label: 'Blue follow', value: 'blue_follow' },
  { label: 'Impact', value: 'impact' },
  { label: 'Cinematic', value: 'cinematic' },
]

const speedOptions = [0.5, 1, 1.5, 2]

export function ReplayViewer({
  arena,
  botBlueprints,
  initialCameraPreset = 'broadcast',
  initialTime = 0,
  proofMode = false,
  timeline,
}: ReplayViewerProps) {
  const [time, setTime] = useState(() => clampReplayTime(timeline, initialTime))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(initialCameraPreset)
  const frame = useMemo(() => buildReplayFrame(timeline, time), [timeline, time])
  const sortedEvents = useMemo(
    () => sortTimelineEvents(timeline.events),
    [timeline.events],
  )
  const activeEvent = useMemo(
    () => findActiveEvent(sortedEvents, time),
    [sortedEvents, time],
  )

  useEffect(() => {
    setTime(clampReplayTime(timeline, initialTime))
  }, [initialTime, timeline])

  useEffect(() => {
    setCameraPreset(initialCameraPreset)
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
        const next = clampReplayTime(timeline, current + elapsed)

        if (next >= timeline.duration) {
          setPlaying(false)
        }

        return next
      })
      animationFrame = window.requestAnimationFrame(tick)
    }

    animationFrame = window.requestAnimationFrame(tick)

    return () => window.cancelAnimationFrame(animationFrame)
  }, [playing, speed, timeline])

  const reset = () => {
    setPlaying(false)
    setTime(0)
  }

  return (
    <section
      className={`replay-shell${proofMode ? ' replay-shell-proof' : ''}`}
      aria-label="Babylon replay viewer"
    >
      <BabylonReplayScene
        arena={arena}
        botBlueprints={botBlueprints}
        cameraPreset={cameraPreset}
        immediateCamera={proofMode}
        timeline={timeline}
        time={time}
      />
      {proofMode ? null : (
        <>
          <div className="replay-controls" aria-label="Replay controls">
            <button type="button" onClick={() => setPlaying((current) => !current)}>
              {playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" onClick={reset}>
              Reset
            </button>
            <label>
              <span>Speed</span>
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
            </label>
            <label>
              <span>Camera</span>
              <select
                value={cameraPreset}
                onChange={(event) => setCameraPreset(event.target.value as CameraPreset)}
              >
                {cameraOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="replay-scrubber">
              <span>{formatDurationSeconds(time)}</span>
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
            </label>
          </div>
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
        </>
      )}
    </section>
  )
}

function sortTimelineEvents(events: ReplayEvent[]): ReplayEvent[] {
  return [...events].sort((left, right) => {
    if (left.t !== right.t) {
      return left.t - right.t
    }

    return left.type.localeCompare(right.type)
  })
}

function findActiveEvent(events: ReplayEvent[], time: number): ReplayEvent | undefined {
  let current: ReplayEvent | undefined

  for (const event of events) {
    if (event.t > time) {
      break
    }

    current = event
  }

  return current
}
