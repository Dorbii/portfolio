import {
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import AgentConsole from './hex-sovereign/components/AgentConsole'
import DesktopShell from './shell/DesktopShell'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const desktopRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DesktopShell,
})

const agentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hex-sovereign/agent',
  component: AgentConsole,
})

const routeTree = rootRoute.addChildren([desktopRoute, agentRoute])

const router = createRouter({
  routeTree,
  history: createHashHistory(),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return <RouterProvider router={router} />
}
