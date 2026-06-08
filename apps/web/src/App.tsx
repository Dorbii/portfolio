import { Component, Suspense, lazy, type ReactNode } from 'react'
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

export default function App() {
  const pathname = window.location.pathname
  const isAgentPath = isAgentPathname(pathname)

  if (isPartCatalogPathname(pathname)) {
    return (
      <Suspense fallback={<RouteFallback label="Loading part catalog." />}>
        <PartCatalogPage />
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

function isPrivacyPathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/privacy' || normalized === '/clash-of-clankers/privacy'
}

function isPartCatalogPathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/part-catalog' || normalized.endsWith('/part-catalog')
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
