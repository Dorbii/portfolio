import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, normalize, relative, resolve } from 'node:path'
import test from 'node:test'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const sourceRoots = ['apps', 'packages']
const sourceFiles = sourceRoots
  .flatMap((root) => walk(join(repoRoot, root)))
  .map((file) => normalize(file))
const sourceFileSet = new Set(sourceFiles)

test('source import graph has no local cycles', () => {
  const graph = new Map(sourceFiles.map((file) => [file, localImportsFor(file)]))
  const cycles = findCycles(graph)

  assert.deepEqual(
    cycles.map((cycle) =>
      cycle.map((file) => relative(repoRoot, file).replaceAll('\\', '/')),
    ),
    [],
  )
})

test('replay playback uses compiled timeline instead of per-frame sorting', () => {
  const replayViewerSource = readFileSync(
    join(repoRoot, 'apps/web/src/replay/ReplayViewer.tsx'),
    'utf8',
  )
  const babylonReplaySceneSource = readFileSync(
    join(repoRoot, 'apps/web/src/replay/scene/BabylonReplayScene.tsx'),
    'utf8',
  )
  const replayBotPlaybackSource = readFileSync(
    join(repoRoot, 'apps/web/src/replay/bots/playback.ts'),
    'utf8',
  )
  const replayMappingSource = readFileSync(
    join(repoRoot, 'apps/web/src/replay/replayMapping.ts'),
    'utf8',
  )

  assert.match(replayViewerSource, /compileReplayTimeline\(timeline\)/)
  assert.match(replayViewerSource, /buildReplayFrame\(compiledTimeline, time\)/)
  assert.match(replayViewerSource, /timeline=\{compiledTimeline\}/)
  assert.equal(replayViewerSource.includes('window.requestAnimationFrame(tick)'), false)
  assert.match(babylonReplaySceneSource, /MAX_REPLAY_FRAME_DELTA_SECONDS/)
  assert.match(babylonReplaySceneSource, /REPLAY_SCENE_FRAME_INTERVAL_MS/)
  assert.match(babylonReplaySceneSource, /engine.runRenderLoop\(render\)/)
  assert.match(babylonReplaySceneSource, /buildReplayFrame\(timelineRef.current/)
  assert.match(replayBotPlaybackSource, /botPlaybackCaches/)
  assert.match(replayBotPlaybackSource, /getBotPlaybackCache\(bot\)/)
  assert.match(replayBotPlaybackSource, /KNOCKOUT_COLLAPSE_DURATION_SECONDS/)
  assert.match(replayBotPlaybackSource, /function knockoutProgressForRole\(frame: ReplayVisualFrame, role: TeamRole\)/)
  assert.match(replayBotPlaybackSource, /const damageSeverity = Math\.max\(partDamageSeverity\(state\), knockoutProgress\)/)
  assert.match(replayBotPlaybackSource, /collapsedPartPose\(role, metadata\.blockId\)/)
  assert.equal(replayViewerSource.includes('sortTimelineEvents'), false)
  assert.equal(replayViewerSource.includes('.sort('), false)
  assert.equal(extractFunction(replayMappingSource, 'buildReplayFrame').includes('.sort('), false)
})

test('replay art pass keeps texture profiles procedural and emission-capable', () => {
  const surfaceTexturesSource = readFileSync(
    join(repoRoot, 'apps/web/src/replay/rendering/surfaceTextures.ts'),
    'utf8',
  )
  const materialsSource = readFileSync(
    join(repoRoot, 'apps/web/src/replay/rendering/materials.ts'),
    'utf8',
  )

  assert.match(surfaceTexturesSource, /const TEXTURE_SIZE = 512/)
  assert.match(surfaceTexturesSource, /emissiveTexture\?: DynamicTexture/)
  assert.match(surfaceTexturesSource, /function createEmissiveTexture/)
  assert.match(surfaceTexturesSource, /drawBoltHalos/)
  assert.match(surfaceTexturesSource, /drawServiceLabelsAndVents/)
  assert.match(surfaceTexturesSource, /drawRubberSidewalls/)
  assert.match(materialsSource, /material\.emissiveTexture = textures\.emissiveTexture/)
})

test('weapon fire effects can resolve visible muzzle anchors before falling back to part roots', () => {
  const replayEffectsSource = readFileSync(
    join(repoRoot, 'apps/web/src/replay/effects/replayEffects.ts'),
    'utf8',
  )
  const effectMappingSource = readFileSync(
    join(repoRoot, 'apps/web/src/replay/effects/effectMapping.ts'),
    'utf8',
  )
  const turretSource = readFileSync(
    join(repoRoot, 'apps/web/src/replay/parts/weapon/turretWeaponPart.ts'),
    'utf8',
  )

  assert.match(turretSource, /turret-muzzle-fire-anchor/)
  assert.match(turretSource, /weaponFireAnchor: 'muzzle'/)
  assert.match(turretSource, /weaponFireDirection: 'localZ'/)
  assert.match(effectMappingSource, /inferWeaponStyleFromSourcePart\(event\.sourcePartId\)/)
  assert.match(replayEffectsSource, /resolveWeaponStyle\(effect\.weaponStyle, effect\.sourcePartId, profile\)/)
  assert.match(replayEffectsSource, /resolveSourceAnchor\(effect, bots, weaponStyle\)/)
  assert.match(replayEffectsSource, /findWeaponFireAnchor/)
  assert.match(replayEffectsSource, /headingForFireAnchor/)
  assert.match(replayEffectsSource, /matchingSourcePartNodes\.length === 1/)
  assert.match(replayEffectsSource, /sourceAnchor\?\.heading !== undefined/)
  assert.match(replayEffectsSource, /Math\.sin\(heading\) \* tracerReach \* 0\.5/)
})

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name)

    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.test-build'].includes(entry.name)) {
        return []
      }

      return walk(file)
    }

    return /\.(ts|tsx|mjs)$/.test(entry.name) ? [file] : []
  })
}

function localImportsFor(file) {
  const source = readFileSync(file, 'utf8')
  const imports = []
  const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g

  for (const match of source.matchAll(importPattern)) {
    const resolved = resolveLocalImport(file, match[1])

    if (resolved) {
      imports.push(resolved)
    }
  }

  return imports
}

function resolveLocalImport(file, specifier) {
  if (!specifier.startsWith('.')) {
    return undefined
  }

  const base = resolve(dirname(file), specifier.replace(/\.js$/, ''))

  for (const extension of ['.ts', '.tsx', '.mjs']) {
    const candidate = normalize(`${base}${extension}`)

    if (sourceFileSet.has(candidate)) {
      return candidate
    }
  }

  for (const extension of ['.ts', '.tsx', '.mjs']) {
    const candidate = normalize(join(base, `index${extension}`))

    if (sourceFileSet.has(candidate)) {
      return candidate
    }
  }

  return undefined
}

function findCycles(graph) {
  const cycles = []
  const visited = new Set()
  const active = new Map()
  const stack = []

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      visit(node)
    }
  }

  return cycles

  function visit(node) {
    visited.add(node)
    active.set(node, stack.length)
    stack.push(node)

    for (const dependency of graph.get(node) ?? []) {
      if (!visited.has(dependency)) {
        visit(dependency)
      } else if (active.has(dependency)) {
        cycles.push(stack.slice(active.get(dependency)).concat(dependency))
      }
    }

    stack.pop()
    active.delete(node)
  }
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`)

  assert.notEqual(start, -1)

  const next = source.indexOf('\nfunction ', start + 1)

  return next === -1 ? source.slice(start) : source.slice(start, next)
}
