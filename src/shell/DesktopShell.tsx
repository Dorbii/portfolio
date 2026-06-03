import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { assets } from '../hex-sovereign/config'
import DesktopIcon from './DesktopIcon'
import DesktopWindow from './DesktopWindow'

const HexSovereignApp = lazy(
  () => import('../apps/hex-sovereign/HexSovereignApp.jsx'),
)

type AppId = 'hex-sovereign'
type WindowMode = 'closed' | 'open' | 'minimized' | 'maximized'

type DesktopApp = {
  id: AppId
  title: string
  subtitle: string
  glyph: string
}

const desktopApps: DesktopApp[] = [
  {
    id: 'hex-sovereign',
    title: 'Hex Sovereign',
    subtitle: 'Strategy prototype',
    glyph: 'HS',
  },
]

const initialWindowModes: Record<AppId, WindowMode> = {
  'hex-sovereign': 'closed',
}

export default function DesktopShell() {
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [windowModes, setWindowModes] = useState(initialWindowModes)
  const [activeAppId, setActiveAppId] = useState<AppId | null>(null)
  const [zOrder, setZOrder] = useState<Record<AppId, number>>({
    'hex-sovereign': 1,
  })
  const [nextZIndex, setNextZIndex] = useState(2)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const visibleApps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) return desktopApps

    return desktopApps.filter((app) =>
      `${app.title} ${app.subtitle}`.toLowerCase().includes(normalizedQuery),
    )
  }, [query])

  const focusApp = (appId: AppId) => {
    setActiveAppId(appId)
    setZOrder((current) => ({ ...current, [appId]: nextZIndex }))
    setNextZIndex((current) => current + 1)
  }

  const launchApp = (appId: AppId) => {
    setWindowModes((current) => ({
      ...current,
      [appId]: current[appId] === 'maximized' ? 'maximized' : 'open',
    }))
    focusApp(appId)
  }

  const closeApp = (appId: AppId) => {
    setWindowModes((current) => ({ ...current, [appId]: 'closed' }))
    setActiveAppId((current) => (current === appId ? null : current))
  }

  const minimizeApp = (appId: AppId) => {
    setWindowModes((current) => ({ ...current, [appId]: 'minimized' }))
    setActiveAppId((current) => (current === appId ? null : current))
  }

  const toggleMaximizeApp = (appId: AppId) => {
    setWindowModes((current) => ({
      ...current,
      [appId]: current[appId] === 'maximized' ? 'open' : 'maximized',
    }))
    focusApp(appId)
  }

  const toggleTaskbarApp = (appId: AppId) => {
    const mode = windowModes[appId]

    if (mode === 'closed' || mode === 'minimized') {
      launchApp(appId)
      return
    }

    if (activeAppId === appId) {
      minimizeApp(appId)
      return
    }

    focusApp(appId)
  }

  const timeLabel = new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit',
  }).format(now)

  const dateLabel = new Intl.DateTimeFormat([], {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
  }).format(now)

  const hexMode = windowModes['hex-sovereign']
  const renderedHexMode = hexMode === 'closed' ? null : hexMode

  return (
    <main
      className="desktop-shell"
      style={{ '--desktop-wallpaper': `url(${assets.ui})` } as CSSProperties}
    >
      <section className="desktop-workspace" aria-label="Portfolio desktop">
        <div className="desktop-icons" aria-label="Desktop applications">
          {visibleApps.map((app) => (
            <DesktopIcon
              key={app.id}
              glyph={app.glyph}
              title={app.title}
              subtitle={app.subtitle}
              isActive={windowModes[app.id] !== 'closed'}
              onLaunch={() => launchApp(app.id)}
            />
          ))}
        </div>

        {renderedHexMode ? (
          <DesktopWindow
            appId="hex-sovereign"
            title="Hex Sovereign"
            glyph="HS"
            mode={renderedHexMode}
            isActive={activeAppId === 'hex-sovereign'}
            zIndex={zOrder['hex-sovereign']}
            onClose={() => closeApp('hex-sovereign')}
            onFocus={() => focusApp('hex-sovereign')}
            onMinimize={() => minimizeApp('hex-sovereign')}
            onToggleMaximize={() => toggleMaximizeApp('hex-sovereign')}
          >
            <Suspense
              fallback={
                <div className="window-loading" role="status">
                  <span>HS</span>
                  <strong>Starting Hex Sovereign</strong>
                </div>
              }
            >
              <HexSovereignApp />
            </Suspense>
          </DesktopWindow>
        ) : null}
      </section>

      <footer className="taskbar" aria-label="Desktop taskbar">
        <button
          className="start-button"
          type="button"
          aria-label="Portfolio start"
          onClick={() => setQuery('')}
        >
          <span aria-hidden="true">[]</span>
        </button>
        <label className="taskbar-search">
          <span aria-hidden="true">/</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search desktop apps"
          />
        </label>
        <div className="taskbar-apps" aria-label="Open applications">
          {desktopApps.map((app) => {
            const mode = windowModes[app.id]

            return (
              <button
                className={`taskbar-app ${mode}${activeAppId === app.id ? ' active' : ''}`}
                key={app.id}
                type="button"
                onClick={() => toggleTaskbarApp(app.id)}
                aria-label={`${app.title} ${mode}`}
              >
                <span aria-hidden="true">{app.glyph}</span>
              </button>
            )
          })}
        </div>
        <div className="taskbar-tray" aria-label="System tray">
          <span aria-label="Network">NET</span>
          <span aria-label="Audio">VOL</span>
          <time dateTime={now.toISOString()}>
            <strong>{timeLabel}</strong>
            <small>{dateLabel}</small>
          </time>
        </div>
      </footer>
    </main>
  )
}
