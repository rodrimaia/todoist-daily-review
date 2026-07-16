import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { RootComponent } from './routes/__root'
import { Home } from './routes/index'
import { ReviewPage } from './routes/review'
import { SettingsPage } from './routes/settings'
import { WeeklyReviewPage } from './routes/weekly-review'

const rootRoute = createRootRoute({
  component: RootComponent,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/review',
  component: ReviewPage,
})

const weeklyReviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/weekly-review',
  component: WeeklyReviewPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  reviewRoute,
  weeklyReviewRoute,
  settingsRoute,
])

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
