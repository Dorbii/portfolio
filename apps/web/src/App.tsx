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

function isPartCatalogPathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/part-catalog' || normalized.endsWith('/part-catalog')
}
