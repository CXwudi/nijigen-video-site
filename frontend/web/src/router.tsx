import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

import { routeTree } from './routeTree.gen'
import { deLocalizeUrl, localizeUrl } from './paraglide/runtime'

export interface RouterContext {
  queryClient: QueryClient
}

export function createQueryClient() {
  return new QueryClient()
}

export function getRouter() {
  const queryClient = createQueryClient()
  const router = createTanStackRouter({
    routeTree,
    context: {
      queryClient,
    },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  })

  // Connect TanStack Query to the router's SSR lifecycle. The integration
  // dehydrates server-side query results, streams pending queries to the
  // browser, hydrates the same cache on the client, and wraps the router with
  // QueryClientProvider so the root route must not add another provider.
  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
