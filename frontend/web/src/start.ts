/**
 * Global TanStack Start middleware for request-scoped localization.
 *
 * Paraglide resolves the locale before downstream request handling and keeps
 * it isolated for the full SSR render. After rendering, locale-aware cache
 * headers are written to the response via the framework's public header
 * utilities (`getResponseHeader` / `setResponseHeader`) so the original
 * Response is never cloned solely to set headers.
 */

import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'
import { getResponseHeader, setResponseHeader } from '@tanstack/react-start/server'
import { isHtmlContentType, mergeVarySourcesWithLocale } from '#/i18n/html-response.js'
import { paraglideMiddleware } from '#/paraglide/server.js'

const i18nMiddleware = createMiddleware().server(({ request, next }) =>
  paraglideMiddleware(request, async () => {
    const result = await next()

    if (isHtmlContentType(result.response.headers)) {
      if (result.response.ok) {
        // 2xx: h3 merges prepared event headers into the final Response.
        // Merge both the event-context Vary and the response Vary so that
        // neither source is silently overwritten.
        setResponseHeader('Cache-Control', 'private, no-store')
        const eventVary = getResponseHeader('Vary')
        const respVary = result.response.headers.get('Vary')
        setResponseHeader('Vary', mergeVarySourcesWithLocale(eventVary, respVary))
      } else {
        // TODO: Once H3 includes https://github.com/h3js/h3/pull/1486, use prepared headers for every status below 400 and keep this reconstructed-Response fallback only for errors at or above 400.

        // Non-2xx: h3 skips prepared-header merging, so create a new
        // Response that preserves the original body, status, statusText
        // and headers while adding Cache-Control and a fully merged Vary.
        const newHeaders = new Headers(result.response.headers)
        newHeaders.set('Cache-Control', 'private, no-store')
        const eventVary = getResponseHeader('Vary')
        const respVary = result.response.headers.get('Vary')
        newHeaders.set('Vary', mergeVarySourcesWithLocale(eventVary, respVary))
        result.response = new Response(result.response.body, {
          status: result.response.status,
          statusText: result.response.statusText,
          headers: newHeaders,
        })
      }
    }

    return result
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
