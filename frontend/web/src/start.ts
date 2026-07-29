/**
 * Global TanStack Start middleware for request-scoped localization.
 *
 * Paraglide resolves the locale before downstream request handling and keeps
 * it isolated for the full SSR render. After rendering, locale-aware cache
 * headers are applied to HTML responses.
 */

import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'
import { applyHtmlLocaleHeaders } from '#/i18n/html-response.js'
import { paraglideMiddleware } from '#/paraglide/server.js'

const i18nMiddleware = createMiddleware().server(({ request, next }) =>
  paraglideMiddleware(request, async () => {
    const { response } = await next()
    return applyHtmlLocaleHeaders(response)
  }),
)

export const startInstance = createStart(() => ({
  requestMiddleware: [
    // Defining start.ts replaces Start's server-function-only CSRF default.
    createCsrfMiddleware({
      filter: ({ handlerType }) => handlerType === 'serverFn',
    }),
    i18nMiddleware,
  ],
}))
