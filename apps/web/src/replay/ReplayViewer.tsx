import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { getPart } from '../../../../packages/catalog/src/index.js'
import type { ReplayEvent, ReplayTimeline } from '../../../../packages/replay/src/index.js'
import type {
  ArenaConfig,
  BotBlueprint,
  PartCategory,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'
import { BabylonReplayScene } from './BabylonReplayScene'
import {
  buildReplayFrame,
  clampReplayTime,
  type CameraPreset,
  type PartFrameState,
} from './replayMapping'

type ReplayViewerProps = {
  arena: ArenaConfig
  botBlueprints: Record<TeamRole, BotBlueprint>
  initialCameraPreset?: CameraPreset
  initialTime?: number
  proofMode?: boolean
  timeline: ReplayTimeline
}

type PartCondition = 'attached' | 'damaged' | 'broken' | 'detached'
type SchematicCategory = PartCategory | 'unknown'

type PartSchematicItem = {
  blockId: string
  blockLabel: string
  category: SchematicCategory
  condition: PartCondition
  healthLabel: string
  hpPercent?: number
  partName: string
  statusLabel: string
  title: string
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
              <span>{formatTime(time)}</span>
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
            <strong>{activeEvent ? formatEvent(activeEvent.type) : 'Ready'}</strong>
            <span>{formatTime(time)} / {formatTime(timeline.duration)}</span>
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

function BotPartMap({
  blueprint,
  partStates,
  role,
}: {
  blueprint: BotBlueprint
  partStates: Record<string, PartFrameState>
  role: TeamRole
}) {
  const parts = buildPartSchematic(blueprint, partStates)

  return (
    <div className={`bot-part-map ${role}`} aria-label={`${capitalize(role)} part map`}>
      <div className="bot-part-map-label">
        <span>{capitalize(role)}</span>
        <strong title={blueprint.name}>{blueprint.name}</strong>
      </div>
      <div className="bot-part-grid">
        {parts.map((part) => {
          const healthStyle =
            part.hpPercent === undefined
              ? undefined
              : ({ '--part-health': `${part.hpPercent}%` } as CSSProperties)

          return (
            <div
              aria-label={part.title}
              className={`part-node part-node-${part.condition} part-category-${part.category}`}
              key={part.blockId}
              title={part.title}
            >
              <span className="part-block-label">{part.blockLabel}</span>
              <span className={`part-condition part-condition-${part.condition}`}>
                {part.statusLabel}
              </span>
              <strong>{part.partName}</strong>
              <span className="part-category-label">{part.category}</span>
              <span className="part-hp-label">{part.healthLabel}</span>
              <span
                className={`part-health-meter ${part.hpPercent === undefined ? 'unknown' : 'known'}`}
                style={healthStyle}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildPartSchematic(
  blueprint: BotBlueprint,
  partStates: Record<string, PartFrameState>,
): PartSchematicItem[] {
  return blueprint.blocks.map((block) => {
    const catalogPart = getPart(block.partId)
    const state = partStates[block.id]
    const category = catalogPart?.category ?? 'unknown'
    const health = state?.health
    const maxHealth = state?.maxHealth
    const condition = resolvePartCondition(state)
    const healthLabel = formatPartHealth(health, maxHealth)
    const hpPercent = resolveHpPercent(health, maxHealth)
    const partName = catalogPart?.displayName ?? block.partId
    const blockLabel = block.label ?? block.id
    const title = [
      `${blockLabel} block`,
      partName,
      `${category} category`,
      `${condition} state`,
      formatPartHealthTitle(healthLabel),
    ].join(', ')

    return {
      blockId: block.id,
      blockLabel,
      category,
      condition,
      healthLabel,
      hpPercent,
      partName,
      statusLabel: formatConditionLabel(condition),
      title,
    }
  })
}

function resolvePartCondition(state: PartFrameState | undefined): PartCondition {
  if (state?.status === 'detached') {
    return 'detached'
  }

  if (typeof state?.health !== 'number') {
    return 'attached'
  }

  if (state.health <= 0) {
    return 'broken'
  }

  if (typeof state.maxHealth === 'number' && state.maxHealth > 0) {
    return state.health < state.maxHealth ? 'damaged' : 'attached'
  }

  return 'damaged'
}

function formatConditionLabel(condition: PartCondition): string {
  if (condition === 'detached') {
    return 'Detached'
  }

  if (condition === 'broken') {
    return 'Broken'
  }

  if (condition === 'damaged') {
    return 'Damaged'
  }

  return 'Attached'
}

function formatPartHealth(health: number | undefined, maxHealth: number | undefined): string {
  if (typeof health !== 'number') {
    return 'HP --'
  }

  const safeHealth = Math.max(0, health)

  if (typeof maxHealth === 'number' && maxHealth > 0) {
    return `${formatHpNumber(safeHealth)}/${formatHpNumber(maxHealth)}`
  }

  return `${formatHpNumber(safeHealth)} HP`
}

function resolveHpPercent(health: number | undefined, maxHealth: number | undefined): number | undefined {
  if (typeof health !== 'number' || typeof maxHealth !== 'number' || maxHealth <= 0) {
    return undefined
  }

  return Math.min(100, Math.max(0, (health / maxHealth) * 100))
}

function formatPartHealthTitle(healthLabel: string): string {
  if (healthLabel === 'HP --') {
    return 'HP unknown at current time'
  }

  return healthLabel.includes('HP') ? healthLabel : `${healthLabel} HP`
}

function formatHpNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
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

function formatTime(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}s`
}

function formatEvent(eventType: string): string {
  return eventType
    .split('_')
    .map((word) => capitalize(word))
    .join(' ')
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
