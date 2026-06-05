import { Suspense, lazy } from 'react'
import { RefereeConsole } from './referee/RefereeConsole'

const LiveAgentCockpit = lazy(() =>
  import('./agent/LiveAgentCockpit').then((module) => ({ default: module.LiveAgentCockpit })),
)
const ReplayPreview = lazy(() =>
  import('./replay/ReplayPreview').then((module) => ({ default: module.ReplayPreview })),
)

export default function App() {
  const pathname = window.location.pathname
  const isAgentPath = isAgentPathname(pathname)

  if (isReplayPreviewPathname(pathname)) {
    return (
      <Suspense fallback={<RouteFallback label="Loading replay preview." />}>
        <ReplayPreview />
      </Suspense>
    )
  }

  if (isAgentPath) {
    return (
      <Suspense fallback={<RouteFallback label="Loading agent cockpit." />}>
        <LiveAgentCockpit />
      </Suspense>
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

function isAgentPathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/agent' || normalized.endsWith('/agent')
}

function isReplayPreviewPathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')

  return normalized === '/replay-preview' || normalized.endsWith('/replay-preview')
}
