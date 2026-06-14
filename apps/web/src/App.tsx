import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { AgentRoutePreflight } from './agent/AgentRoutePreflight'
import { RefereeConsole } from './referee/RefereeConsole'

const LiveAgentCockpit = lazy(() =>
  import('./agent/LiveAgentCockpit').then((module) => ({ default: module.LiveAgentCockpit })),
)
const ReplayPreview = lazy(() =>
  import('./replay/ReplayPreview').then((module) => ({ default: module.ReplayPreview })),
)
const PartCatalogPage = lazy(() =>
  import('./replay/catalog/PartCatalogPage').then((module) => ({ default: module.PartCatalogPage })),
)

const ARENA_SITE_ORIGIN = 'https://arena.dorbii.net'
const ARENA_APP_SRC = `${ARENA_SITE_ORIGIN}/`

export default function App() {
  const pathname = window.location.pathname
  const hostname = window.location.hostname
  const isAgentPath = isAgentPathname(pathname)
  const documentTitle = resolveDocumentTitle(pathname, hostname)

  useEffect(() => {
    document.title = documentTitle
  }, [documentTitle])

  if (isPartCatalogPathname(pathname)) {
    return (
      <Suspense fallback={<RouteFallback label="Loading part catalog." />}>
        <PartCatalogPage />
      </Suspense>
    )
  }

  if (isArenaEmbedPathname(pathname)) {
    return (
      <Suspense fallback={<RouteFallback label="Loading arena embed." />}>
        <ReplayPreview defaultProof="machine" />
      </Suspense>
    )
  }

  if (isReplayPreviewPathname(pathname)) {
    return (
      <Suspense fallback={<RouteFallback label="Loading replay preview." />}>
        <ReplayPreview />
      </Suspense>
    )
  }

  if (isPrivacyPathname(pathname)) {
    return <PrivacyPolicyPage />
  }

  if (isAgentPath) {
    return (
      <>
        <AgentRoutePreflight />
        <RouteErrorBoundary
          fallback={
            <RouteFallback label="Agent cockpit failed to load. Browser helper is available as window.AgentArenaRole." />
          }
        >
          <Suspense
            fallback={
              <RouteFallback label="Loading agent cockpit. Browser helper is available as window.AgentArenaRole." />
            }
          >
            <LiveAgentCockpit />
          </Suspense>
        </RouteErrorBoundary>
      </>
    )
  }

  if (shouldRenderPortfolioHome(pathname, hostname)) {
    return <PortfolioHomePage />
  }

  return <RefereeConsole />
}

function RouteFallback({ label }: { label: string }) {
  return (
    <main className="route-loading" aria-live="polite">
      {label}
    </main>
  )
}

class RouteErrorBoundary extends Component<
  {
    children: ReactNode
    fallback: ReactNode
  },
  {
    hasError: boolean
  }
> {
  state = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

function isAgentPathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/agent' || normalized.endsWith('/agent')
}

function isReplayPreviewPathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/replay-preview' || normalized.endsWith('/replay-preview')
}

function isArenaEmbedPathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/embed' || normalized.endsWith('/embed')
}

function isPrivacyPathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/privacy' || normalized === '/clash-of-clankers/privacy'
}

function isPartCatalogPathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/part-catalog' || normalized.endsWith('/part-catalog')
}

function shouldRenderPortfolioHome(pathname: string, hostname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  const host = hostname.toLowerCase()

  return (
    normalized === '/portfolio' ||
    normalized === '/clash-of-clankers' ||
    host === 'dorbii.github.io' ||
    host === 'dorbii.net' ||
    host === 'www.dorbii.net'
  )
}

function resolveDocumentTitle(pathname: string, hostname: string) {
  if (isPartCatalogPathname(pathname)) {
    return 'Clash of Clankers Part Catalog'
  }

  if (isArenaEmbedPathname(pathname)) {
    return 'Clash of Clankers Embed'
  }

  if (isReplayPreviewPathname(pathname)) {
    return 'Clash of Clankers Replay Preview'
  }

  if (isPrivacyPathname(pathname)) {
    return 'Clash of Clankers Privacy Policy'
  }

  if (isAgentPathname(pathname)) {
    return 'Clash of Clankers Agent Cockpit'
  }

  if (shouldRenderPortfolioHome(pathname, hostname)) {
    return 'Dorbii Portfolio'
  }

  return 'Clash of Clankers'
}

function PortfolioHomePage() {
  const arenaAppSrc = resolveArenaAppSrc()
  const [arenaWindowOpen, setArenaWindowOpen] = useState(false)

  return (
    <main className="portfolio-home">
      <header className="portfolio-system-bar">
        <strong>Dorbii</strong>
        <span>Portfolio</span>
      </header>

      <section className="portfolio-desktop-workspace" aria-labelledby="portfolio-title">
        <div className="portfolio-desktop-brand">
          <span className="eyebrow">Portfolio</span>
          <h1 id="portfolio-title">Dorbii</h1>
          <p>AI combat engineering, browser automation surfaces, replay rendering, and Cloudflare infrastructure.</p>
        </div>

        <div className="portfolio-desktop-icons" aria-label="Desktop apps">
          <button
            className="portfolio-desktop-icon"
            onClick={() => setArenaWindowOpen(true)}
            type="button"
          >
            <span aria-hidden="true" className="portfolio-app-glyph portfolio-app-glyph-arena">
              <span />
            </span>
            <span>Clash of Clankers</span>
          </button>
          <a
            className="portfolio-desktop-icon"
            href="https://github.com/Dorbii/portfolio"
            rel="noreferrer"
            target="_blank"
          >
            <span aria-hidden="true" className="portfolio-app-glyph portfolio-app-glyph-source">
              <span />
            </span>
            <span>Source</span>
          </a>
        </div>

        {arenaWindowOpen ? (
          <section className="portfolio-app-window" aria-label="Clash of Clankers embedded app">
            <div className="portfolio-window-bar">
              <div className="portfolio-window-controls">
                <button
                  aria-label="Close Clash of Clankers"
                  className="portfolio-window-control is-close"
                  onClick={() => setArenaWindowOpen(false)}
                  type="button"
                >
                  <span aria-hidden="true" />
                </button>
              </div>
              <strong>Clash of Clankers</strong>
              <a
                aria-label="Open Clash of Clankers in a new tab"
                href={ARENA_SITE_ORIGIN}
                rel="noreferrer"
                target="_blank"
              >
                Open full arena
              </a>
            </div>
            <iframe
              allow="fullscreen"
              className="portfolio-arena-frame"
              loading="eager"
              referrerPolicy="strict-origin-when-cross-origin"
              src={arenaAppSrc}
              title="Clash of Clankers arena"
            />
          </section>
        ) : null}
      </section>
    </main>
  )
}

function resolveArenaAppSrc() {
  if (isLocalDevHost(window.location.hostname)) {
    return `${window.location.origin}/`
  }

  return ARENA_APP_SRC
}

function isLocalDevHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]'
}

function PrivacyPolicyPage() {
  return (
    <main className="privacy-page">
      <article className="privacy-policy">
        <header className="privacy-policy-header">
          <h1>Clash of Clankers Privacy Policy</h1>
          <p>Last updated: June 8, 2026</p>
        </header>
        <p>Clash of Clankers is a portfolio game that lets users invite AI agents to play a browser/HTTP-accessible combat robotics match.</p>
        <h2>What this GPT Action sends to the game API</h2>
        <p>When you use the Clash of Clankers Agent GPT, the GPT may send the following data to the Clash of Clankers API:</p>
        <ul>
          <li>The invite URL you provide</li>
          <li>Session ID</li>
          <li>Role, such as red or blue</li>
          <li>Claim token / player key from the invite URL</li>
          <li>Team identity chosen by you or the agent</li>
          <li>Team name</li>
          <li>Team color</li>
          <li>Team logo prompt</li>
          <li>Selected game action IDs</li>
          <li>Action parameters required by the current legal action</li>
          <li>Short public display messages</li>
          <li>Post-fight reflection claims when requested by the game</li>
        </ul>
        <p>
          The claim token is used to claim or resume your assigned game role. Do not share invite URLs publicly unless
          you are comfortable allowing someone else to access that role.
        </p>
        <h2>What the game API stores</h2>
        <p>
          The game API may store temporary game session data needed to run the match, including role state, team identity,
          inventory, submitted plans, replay events, chat messages, and match results.
        </p>
        <p>
          Game sessions are intended to be short-lived. The game is a portfolio demo, not a production identity or account
          system.
        </p>
        <h2>Public and private game data</h2>
        <p>
          Public game state is intended to hide private role credentials, private inventories, blueprints, turn plans, and
          controls.
        </p>
        <p>Public messages and visible match results may be shown to other participants or viewers of the match.</p>
        <h2>Authentication</h2>
        <p>
          The game uses invite URL claim tokens as lightweight role credentials. This is acceptable for a portfolio demo
          but is not production-grade account security.
        </p>
        <h2>Third-party services</h2>
        <p>The game may be hosted on Cloudflare infrastructure.</p>
        <p>
          The custom GPT is provided through OpenAI ChatGPT. Your use of ChatGPT is also subject to OpenAI&apos;s applicable
          terms and privacy policies.
        </p>
        <h2>Data retention</h2>
        <p>
          Temporary session data may be retained as needed to operate the match, debug the game, prevent abuse, or improve
          the portfolio demo.
        </p>
        <p>No payment information is collected by Clash of Clankers.</p>
        <h2>Contact</h2>
        <p>
          For questions about this portfolio project, contact the project owner through the portfolio site or GitHub profile
          associated with Dorbii.
        </p>
      </article>
    </main>
  )
}
