import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, normalize, resolve } from 'node:path'

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
const repoRoot = process.cwd()
const artifactDir = resolve('smoke-artifacts')

mkdirSync(artifactDir, { recursive: true })

const server = await startStaticServer()
const proofUrl = `${server.origin}/smoke-artifacts/agent-arena-responsive-proof.html`

try {
  const results = {
    mobile: await capture({
      width: 390,
      height: 1200,
      screenshotPath: join(artifactDir, 'agent-arena-responsive-mobile-390-cdp.png'),
      replayScreenshotPath: join(artifactDir, 'agent-arena-responsive-mobile-390-replay-cdp.png'),
    }),
    desktop: await capture({
      width: 1440,
      height: 1100,
      screenshotPath: join(artifactDir, 'agent-arena-responsive-desktop-1440-cdp.png'),
    }),
  }

  console.log(JSON.stringify(results, null, 2))
} finally {
  await server.close()
}

async function capture({ width, height, screenshotPath, replayScreenshotPath }) {
  const profileDir = join(tmpdir(), `agent-arena-cdp-${Date.now()}-${Math.random().toString(16).slice(2)}`)
  mkdirSync(profileDir, { recursive: true })

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-gpu-sandbox',
    '--use-angle=swiftshader',
    '--use-gl=angle',
    '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage',
    '--disable-features=Vulkan,DawnGraphite',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    `--window-size=${width},${height}`,
    'about:blank',
  ], {
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true,
  })

  let stderr = ''
  chrome.stderr.setEncoding('utf8')
  chrome.stderr.on('data', (chunk) => {
    stderr += chunk
  })

  try {
    const portFile = join(profileDir, 'DevToolsActivePort')
    await waitFor(() => existsSync(portFile), 8000)
    const [port] = readFileSync(portFile, 'utf8').trim().split(/\r?\n/)
    const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`)
    const target = targets.find((candidate) => candidate.type === 'page')

    if (!target) {
      throw new Error('No Chrome page target available')
    }

    const cdp = await connectCdp(target.webSocketDebuggerUrl)
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: width,
      screenHeight: height,
    })

    const load = cdp.waitForEvent('Page.loadEventFired', 10000)
    await cdp.send('Page.navigate', { url: proofUrl })
    await load

    const metricsResult = await cdp.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `new Promise((resolve) => {
        setTimeout(() => {
          const clientWidth = document.documentElement.clientWidth
          const invite = Array.from(document.querySelectorAll('p'))
            .find((node) => node.textContent?.includes('Invite URLs are available only'))
          const replayFrame = document.querySelector('.referee-replay-frame')
          const replayShell = document.querySelector('.replay-shell')
          const timeline = document.querySelector('.timeline-list')
          const inviteRect = invite?.getBoundingClientRect()
          const frameRect = replayFrame?.getBoundingClientRect()
          const shellRect = replayShell?.getBoundingClientRect()
          const inviteStyle = invite ? window.getComputedStyle(invite) : null
          const lineHeight = inviteStyle ? Number.parseFloat(inviteStyle.lineHeight) : 0
          resolve({
            clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            bodyScrollWidth: document.body.scrollWidth,
            noHorizontalOverflow: document.documentElement.scrollWidth <= clientWidth,
            inviteText: invite?.textContent ?? null,
            inviteRight: inviteRect ? Math.round(inviteRect.right) : null,
            inviteHeight: inviteRect ? Math.round(inviteRect.height) : null,
            inviteLineEstimate: inviteRect && lineHeight ? Math.round(inviteRect.height / lineHeight) : null,
            inviteFullyVisible: inviteRect ? inviteRect.left >= 0 && inviteRect.right <= clientWidth : false,
            replayFrameRight: frameRect ? Math.round(frameRect.right) : null,
            replayFrameWidth: frameRect ? Math.round(frameRect.width) : null,
            replayFrameFits: frameRect ? frameRect.left >= 0 && frameRect.right <= clientWidth : false,
            replayShellWidth: shellRect ? Math.round(shellRect.width) : null,
            timelineClientWidth: timeline?.clientWidth ?? null,
            timelineScrollWidth: timeline?.scrollWidth ?? null,
          })
        }, 4500)
      })`,
    })

    const screenshotResult = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    })
    writeFileSync(screenshotPath, Buffer.from(screenshotResult.data, 'base64'))

    if (replayScreenshotPath) {
      await cdp.send('Runtime.evaluate', {
        expression: `document.querySelector('.live-replay-panel')?.scrollIntoView({ block: 'start' })`,
      })
      await delay(500)
      const replayScreenshotResult = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
      })
      writeFileSync(replayScreenshotPath, Buffer.from(replayScreenshotResult.data, 'base64'))
    }

    cdp.close()

    return {
      viewport: { width, height },
      screenshotPath,
      replayScreenshotPath,
      metrics: metricsResult.result.value,
    }
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${stderr}`)
  } finally {
    chrome.kill()
    await waitForExit(chrome, 3000)
    rmSync(profileDir, { recursive: true, force: true })
  }
}

function startStaticServer() {
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1')
    const relativePath = normalize(decodeURIComponent(requestUrl.pathname)).replace(/^[/\\]+/, '')
    const absolutePath = resolve(repoRoot, relativePath)

    if (!absolutePath.startsWith(repoRoot) || !existsSync(absolutePath)) {
      response.writeHead(404, { 'content-type': 'text/plain' })
      response.end('not found')
      return
    }

    response.writeHead(200, { 'content-type': mimeType(absolutePath) })
    response.end(readFileSync(absolutePath))
  })

  return new Promise((resolveServer, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Static server did not expose a TCP port'))
        return
      }

      resolveServer({
        origin: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((resolveClose) => server.close(resolveClose)),
      })
    })
  })
}

function mimeType(path) {
  switch (extname(path)) {
    case '.css':
      return 'text/css'
    case '.html':
      return 'text/html'
    case '.js':
    case '.mjs':
      return 'text/javascript'
    case '.png':
      return 'image/png'
    default:
      return 'application/octet-stream'
  }
}

async function fetchJson(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Chrome DevTools request failed ${response.status}: ${url}`)
  }

  return response.json()
}

async function waitFor(check, timeoutMs) {
  const started = Date.now()

  while (Date.now() - started < timeoutMs) {
    if (check()) {
      return
    }

    await delay(50)
  }

  throw new Error(`Timed out after ${timeoutMs}ms`)
}

function connectCdp(url) {
  const ws = new WebSocket(url)
  const pending = new Map()
  const listeners = new Map()
  let nextId = 1

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)

    if (message.id && pending.has(message.id)) {
      const { resolve: resolvePending, reject } = pending.get(message.id)
      pending.delete(message.id)

      if (message.error) {
        reject(new Error(`${message.error.message}: ${message.error.data ?? ''}`))
        return
      }

      resolvePending(message.result)
      return
    }

    const methodListeners = listeners.get(message.method)
    if (methodListeners) {
      methodListeners.forEach((listener) => listener(message.params))
    }
  })

  return new Promise((resolveConnection, rejectConnection) => {
    ws.addEventListener('open', () => {
      resolveConnection({
        send(method, params = {}) {
          const id = nextId++

          return new Promise((resolvePending, reject) => {
            pending.set(id, { resolve: resolvePending, reject })
            ws.send(JSON.stringify({ id, method, params }))
          })
        },
        waitForEvent(method, timeoutMs) {
          return new Promise((resolveEvent, reject) => {
            const timeout = setTimeout(() => {
              remove()
              reject(new Error(`Timed out waiting for ${method}`))
            }, timeoutMs)
            const listener = (params) => {
              clearTimeout(timeout)
              remove()
              resolveEvent(params)
            }
            const methodListeners = listeners.get(method) ?? new Set()
            methodListeners.add(listener)
            listeners.set(method, methodListeners)
            const remove = () => {
              const current = listeners.get(method)
              current?.delete(listener)
              if (current?.size === 0) {
                listeners.delete(method)
              }
            }
          })
        },
        close() {
          ws.close()
        },
      })
    }, { once: true })
    ws.addEventListener('error', () => rejectConnection(new Error('Chrome DevTools WebSocket error')), { once: true })
  })
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs)
    child.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
  })
}
