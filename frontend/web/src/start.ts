import { createStart, createCsrfMiddleware, createMiddleware } from '@tanstack/react-start'

import { paraglideMiddleware } from './paraglide/server'

/**
 * Global request middleware for TanStack Start.
 *
 * - CSRF protection is applied to all server function requests (the TanStack
 *   Start default when no custom `src/start.ts` is provided).
 * - Paraglide locale detection and request isolation via AsyncLocalStorage.
 *   The original Request passes through to the TanStack handler because URL
 *   rewriting (deLocalizeUrl / localizeUrl) is handled by the Router's
 *   `rewrite.input` / `rewrite.output` options, avoiding redirect loops.
 */
const paraglideRequestMiddleware = createMiddleware({ type: 'request' }).server(
  ({ request, next }) => {
    return paraglideMiddleware(request, () => next())
  },
)

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCsrfMiddleware({
      filter: (ctx) => ctx.handlerType === 'serverFn',
    }),
    paraglideRequestMiddleware,
  ],
}))
