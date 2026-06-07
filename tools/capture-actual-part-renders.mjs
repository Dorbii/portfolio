import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'
import { extractCatalogParts } from './lib/catalogAst.mjs'

const root = process.cwd()
const webRoot = path.join(root, 'apps', 'web')
const captureHtmlPath = path.join(webRoot, 'part-render-capture.html')
const captureSourcePath = path.join(webRoot, 'src', 'part-render-capture.ts')
const catalogPath = path.join(root, 'packages', 'catalog', 'src', 'parts.ts')
const exportRoot = path.join(root, 'exports')
const stamp = timestamp()
const teamColorHex = normalizeHexColor(process.env.PART_RENDER_TEAM_COLOR ?? '#ff4c5d')
const teamColorSlug = teamColorHex.slice(1).toLowerCase()
const teamName = process.env.PART_RENDER_TEAM_NAME ?? `${teamColorSlug} Team`
const packageName = `agent-arena-actual-part-renders-${teamColorSlug}-${stamp}`
const packageDir = path.join(exportRoot, packageName)
const imageDir = path.join(packageDir, 'part-renders')
const markdownPath = path.join(packageDir, 'Agent Arena Actual Part Renders.md')
const zipPath = path.join(exportRoot, `${packageName}.zip`)
const chromePath = await findChrome()

const categoryOrder = ['body', 'mobility', 'weapon', 'defense', 'utility', 'style']
const categoryLabels = {
  body: 'Body',
  mobility: 'Mobility',
  weapon: 'Weapon',
  defense: 'Defense',
  utility: 'Utility',
  style: 'Style',
}

const parts = await extractCatalogParts(catalogPath)

if (parts.length === 0) {
  throw new Error('No parts found in PART_CATALOG.')
}

await fs.mkdir(imageDir, { recursive: true })
await writeCaptureHarness()

let server
let chrome
let userDataDir

try {
  server = await createServer({
    root: webRoot,
    logLevel: 'silent',
    server: {
      host: '127.0.0.1',
      port: 5197,
      strictPort: false,
    },
  })
  await server.listen()
  const baseUrl = server.resolvedUrls?.local?.[0]

  if (!baseUrl) {
    throw new Error('Vite did not expose a local URL.')
  }

  userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-arena-part-render-chrome-'))
  chrome = spawn(chromePath, [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-extensions',
    '--disable-dev-shm-usage',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-angle=swiftshader',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  const devToolsEndpoint = waitForSpawnedChromeDevTools(chrome)

  const cdp = await openPageCdp(await devToolsEndpoint, `${baseUrl}part-render-capture.html`)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 900,
    height: 620,
    deviceScaleFactor: 1,
    mobile: false,
  })

  await cdp.send('Page.navigate', { url: `${baseUrl}part-render-capture.html?partId=Body_Wedge&warmup=1` })
  await waitForPartRender(cdp, 'Body_Wedge')

  for (const part of parts) {
    const targetUrl = `${baseUrl}part-render-capture.html?partId=${encodeURIComponent(part.id)}`
    const outputPath = path.join(imageDir, `${part.id}.png`)

    await cdp.send('Page.navigate', { url: targetUrl })
    await waitForPartRender(cdp, part.id)
    const result = await cdp.send('Runtime.evaluate', {
      expression: 'window.AgentArenaPartCapture.toPngDataUrl()',
      awaitPromise: true,
      returnByValue: true,
    })
    const dataUrl = result.result?.value

    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) {
      throw new Error(`Capture for ${part.id} did not return a PNG data URL.`)
    }

    await fs.writeFile(outputPath, Buffer.from(dataUrl.split(',')[1], 'base64'))
    process.stdout.write(`captured ${part.id}\n`)
  }

  await cdp.close()
  await writeMarkdown()
  await zipPackage()

  console.log(`Wrote ${markdownPath}`)
  console.log(`Wrote ${parts.length} actual render PNGs to ${imageDir}`)
  console.log(`Wrote ${zipPath}`)
} finally {
  chrome?.kill()
  await server?.close()
  await removeIfExists(captureHtmlPath)
  await removeIfExists(captureSourcePath)
  if (userDataDir) {
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

async function writeCaptureHarness() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Arena Part Render Capture</title>
    <style>
      html,
      body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #0b1013;
      }

      canvas {
        display: block;
        width: 900px;
        height: 620px;
      }
    </style>
  </head>
  <body>
    <canvas id="capture" width="900" height="620" aria-label="Part render capture"></canvas>
    <script type="module" src="/src/part-render-capture.ts"></script>
  </body>
</html>
`

  const source = `import type { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import type { Node } from '@babylonjs/core/node'
import { PART_CATALOG } from '../../../packages/catalog/src/index.js'
import type { BotBlueprint } from '../../../packages/schemas/src/index.js'
import { createBotNode, createTeamMaterials } from './replay/parts'
import {
  createBabylonRendererCore,
  createCaptureLightingPreset,
  createRendererGlow,
  isBabylonRendererSupported,
} from './replay/rendering/rendererKit'

type CaptureApi = {
  toPngDataUrl: () => string
}

declare global {
  interface Window {
    AgentArenaPartCapture: CaptureApi
    __PART_RENDER_ERROR?: string
    __PART_RENDER_PART_ID?: string
    __PART_RENDER_READY?: boolean
  }
}

const canvas = document.querySelector<HTMLCanvasElement>('#capture')

if (!canvas) {
  throw new Error('Capture canvas is missing.')
}

window.AgentArenaPartCapture = {
  toPngDataUrl: () => canvas.toDataURL('image/png'),
}
window.__PART_RENDER_READY = false

void render()

async function render(): Promise<void> {
  const params = new URLSearchParams(window.location.search)
  const partId = params.get('partId') ?? 'Body_Square_Small'
  const part = PART_CATALOG.find((candidate) => candidate.id === partId)

  window.__PART_RENDER_PART_ID = partId

  if (!part) {
    window.__PART_RENDER_ERROR = \`Unknown part: \${partId}\`
    return
  }

  try {
    if (!isBabylonRendererSupported()) {
      window.__PART_RENDER_ERROR = 'WebGL is not supported.'
      return
    }

    const { camera, scene } = createBabylonRendererCore(canvas, {
      camera: {
        alpha: -Math.PI * 0.58,
        beta: 1.02,
        name: 'part-camera',
        radius: 3,
        target: new Vector3(0, 0.5, 0),
      },
      clearColor: new Color4(0.055, 0.065, 0.07, 1),
    })

    camera.fov = 0.58
    camera.detachControl()
    createCaptureLightingPreset(scene)

    const materials = createTeamMaterials(scene, {
      identities: {
        red: {
          name: ${JSON.stringify(teamName)},
          primaryColor: ${JSON.stringify(teamColorHex)},
        },
      },
    }).red
    const blueprint: BotBlueprint = {
      name: part.displayName,
      blocks: [
        {
          id: 'capture-part',
          partId,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
        },
      ],
    }
    const bot = createBotNode(scene, blueprint, 'red', materials)

    bot.rotation.y = -0.38
    bot.getChildMeshes().forEach((mesh) => {
      mesh.setEnabled(isPartMesh(mesh))
    })

    scene.render()
    frameCamera(camera, bot.getChildMeshes().filter((mesh) => mesh.isEnabled()))
    createRendererGlow(scene, 'capture-glow', 0.26)

    for (let frame = 0; frame < 8; frame += 1) {
      scene.render()
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }

    window.__PART_RENDER_READY = true
  } catch (error) {
    window.__PART_RENDER_ERROR = error instanceof Error ? error.message : 'Part render failed.'
  }
}

function isPartMesh(mesh: AbstractMesh): boolean {
  let parent: Node | null = mesh.parent

  while (parent) {
    const metadata = parent.metadata as { kind?: string } | undefined

    if (metadata?.kind === 'bot_part') {
      return true
    }

    parent = parent.parent
  }

  return false
}

function frameCamera(camera: ArcRotateCamera, meshes: AbstractMesh[]): void {
  const bounds = measureMeshes(meshes)
  const center = bounds.min.add(bounds.max).scale(0.5)
  const size = bounds.max.subtract(bounds.min)
  const largest = Math.max(size.x, size.y, size.z, 0.75)

  camera.setTarget(center.add(new Vector3(0, largest * 0.04, 0)))
  camera.radius = largest * 1.55 + 0.28
  camera.alpha = -Math.PI * 0.58
  camera.beta = 1.0
}

function measureMeshes(meshes: AbstractMesh[]): { min: Vector3; max: Vector3 } {
  const min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)
  const max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)

  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true)
    const boundingBox = mesh.getBoundingInfo().boundingBox

    min.minimizeInPlace(boundingBox.minimumWorld)
    max.maximizeInPlace(boundingBox.maximumWorld)
  }

  if (!Number.isFinite(min.x) || !Number.isFinite(max.x)) {
    return {
      min: new Vector3(-0.5, 0, -0.5),
      max: new Vector3(0.5, 1, 0.5),
    }
  }

  return { min, max }
}
`

  await fs.writeFile(captureHtmlPath, html, 'utf8')
  await fs.writeFile(captureSourcePath, source, 'utf8')
}

async function openPageCdp(devToolsBaseUrl, initialUrl) {
  const target = await fetchJson(`${devToolsBaseUrl}/json/new?${encodeURIComponent(initialUrl)}`, {
    method: 'PUT',
  })

  return createCdpClient(target.webSocketDebuggerUrl)
}

async function waitForSpawnedChromeDevTools(chromeProcess) {
  chromeProcess.stderr.setEncoding('utf8')

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Timed out waiting for spawned Chrome DevTools endpoint.'))
    }, 15_000)

    const cleanup = () => {
      clearTimeout(timeout)
      chromeProcess.stderr.off('data', onData)
      chromeProcess.off('exit', onExit)
    }
    const onData = (chunk) => {
      const text = String(chunk)
      const match = text.match(/DevTools listening on (ws:\/\/\S+)/)

      if (match) {
        cleanup()
        const browserUrl = new URL(match[1])
        resolve(`http://${browserUrl.host}`)
        return
      }

      process.stderr.write(text)
    }
    const onExit = (code, signal) => {
      cleanup()
      reject(new Error(`Chrome exited before DevTools endpoint opened: code ${code ?? 'unknown'}, signal ${signal ?? 'none'}.`))
    }

    chromeProcess.stderr.on('data', onData)
    chromeProcess.once('exit', onExit)
  })
}

async function waitForPartRender(cdp, partId) {
  const deadline = Date.now() + 20_000

  while (Date.now() < deadline) {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify({ ready: window.__PART_RENDER_READY === true, error: window.__PART_RENDER_ERROR, partId: window.__PART_RENDER_PART_ID })`,
      returnByValue: true,
    })
    const state = JSON.parse(result.result?.value ?? '{}')

    if (state.error) {
      throw new Error(`Render failed for ${partId}: ${state.error}`)
    }

    if (state.ready && state.partId === partId) {
      return
    }

    await delay(100)
  }

  throw new Error(`Timed out waiting for ${partId} to render.`)
}

function createCdpClient(webSocketUrl) {
  let nextId = 1
  const pending = new Map()
  const socket = new WebSocket(webSocketUrl)
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      const request = pending.get(message.id)

      if (!request) return
      pending.delete(message.id)

      if (message.error) {
        request.reject(new Error(`${message.error.message}: ${message.error.data ?? ''}`))
        return
      }

      request.resolve(message.result)
  })

  return {
    async send(method, params = {}) {
      await ready
      const id = nextId
      nextId += 1
      const promise = new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject })
      })

      socket.send(JSON.stringify({ id, method, params }))
      return promise
    },
    async close() {
      await ready
      socket.close()
    },
  }
}

async function writeMarkdown() {
  const counts = categoryOrder
    .map((category) => `${categoryLabels[category]} ${parts.filter((part) => part.category === category).length}`)
    .join(', ')
  const lines = [
    '# Agent Arena Actual Part Renders',
    '',
    `Captured from the current Babylon renderer on 2026-06-06 using \`createBotNode()\`, \`createTeamMaterials()\`, and a ${teamColorHex} team identity. The capture uses brighter inspection lighting and tight framing, but the part meshes and procedural materials are the app renderer's own output. Includes ${parts.length} catalog parts (${counts}).`,
    '',
    'These are actual WebGL render captures of each part in isolation. The surrounding bot foundation is hidden so the part geometry and procedural material are easier to inspect. They are not balance proof and they do not show blue-team palette variants.',
    '',
    '## Summary',
    '',
    '| Category | Count | Parts |',
    '| --- | ---: | --- |',
  ]

  for (const category of categoryOrder) {
    const categoryParts = parts.filter((part) => part.category === category)
    lines.push(`| ${categoryLabels[category]} | ${categoryParts.length} | ${categoryParts.map((part) => `\`${part.id}\``).join(', ')} |`)
  }

  for (const category of categoryOrder) {
    lines.push('', `## ${categoryLabels[category]}`, '')

    for (const part of parts.filter((candidate) => candidate.category === category)) {
      lines.push(partEntry(part))
    }
  }

  await fs.writeFile(markdownPath, `${lines.join('\n')}\n`, 'utf8')
}

function partEntry(part) {
  const behavior = part.behavior ? `\`${markdownText(part.behavior)}\`` : 'none'
  const tags = part.tags?.length ? part.tags.map((tag) => `\`${markdownText(tag)}\``).join(', ') : 'none'

  return `### ${part.displayName}

![${part.displayName}](part-renders/${part.id}.png)

| Field | Value |
| --- | --- |
| ID | \`${markdownText(part.id)}\` |
| Category | ${markdownText(categoryLabels[part.category] ?? part.category)} |
| Cost | ${part.cost} |
| Mass | ${part.mass} |
| Durability | ${part.durability} |
| Size | \`${Array.isArray(part.size) ? part.size.join(' x ') : markdownText(part.size)}\` |
| Controls | ${markdownText(formatControls(part.controls))} |
| Stats | ${markdownText(formatStats(part.stats))} |
| Behavior | ${behavior} |
| Tags | ${tags} |
`
}

function formatStats(stats) {
  const keys = Object.keys(stats ?? {}).sort()
  if (keys.length === 0) return 'none'
  return keys.map((key) => `${key} ${stats[key] > 0 ? '+' : ''}${stats[key]}`).join(', ')
}

function formatControls(controls) {
  const keys = Object.entries(controls ?? {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)

  return keys.length === 0 ? 'none' : keys.join(', ')
}

function markdownText(value) {
  return String(value ?? 'none').replaceAll('`', '\\`')
}

async function zipPackage() {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const execFileAsync = promisify(execFile)

  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -LiteralPath ${quotePowerShell(packageDir)} -DestinationPath ${quotePowerShell(zipPath)} -Force`,
  ])
}

function quotePowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

async function fetchJson(url, options) {
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }

  return response.json()
}

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      // Try the next common install location.
    }
  }

  throw new Error('Could not find chrome.exe. Set CHROME_PATH to the browser executable.')
}

async function removeIfExists(filePath) {
  await fs.rm(filePath, { force: true }).catch(() => undefined)
}

function timestamp() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('')
}

function normalizeHexColor(value) {
  const normalized = String(value).trim()

  if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error(`Expected PART_RENDER_TEAM_COLOR to be a #RRGGBB hex color, got ${value}.`)
  }

  return normalized.toLowerCase()
}
