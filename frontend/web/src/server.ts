/**
 * Custom TanStack Start server entry with Paraglide i18n middleware.
 *
 * Every SSR request is wrapped in `paraglideMiddleware` so that message
 * functions and `getLocale()` resolve within a request-scoped
 * `AsyncLocalStorage` context.  After the TanStack Start handler renders the
 * HTML, locale-aware cache headers (`Vary`, `Cache-Control`) are applied.
 *
 * ## Flow
 *
 * 1. `defineCustomServerStrategy` registers the cookie / `Accept-Language`
 *    resolver from `#/i18n/request-locale` once at module init.
 * 2. `createStartHandler(defaultStreamHandler)` creates the standard TanStack
 *    Start request → Response pipeline.
 * 3. The exported `fetch` wraps that pipeline with `paraglideMiddleware`,
 *    which runs the custom strategy, resolves the locale, and invokes the
 *    Start handler inside the request's `AsyncLocalStorage` context.
 * 4. The original request and any additional TanStack handler arguments
 *    (e.g. early hints, inline CSS options) are forwarded unchanged.
 * 5. `applyHtmlLocaleHeaders` adds cache-safety headers to every HTML
 *    response; non-HTML responses (static assets) are passed through.
 */

import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { defineCustomServerStrategy } from '#/paraglide/runtime.js'
import { paraglideMiddleware } from '#/paraglide/server.js'
import { requestLocale } from '#/i18n/request-locale.js'
import { applyHtmlLocaleHeaders } from '#/i18n/html-response.js'

// ---------------------------------------------------------------------------
// Register the custom server strategy once at module-init time.
// The strategy name must match the first entry in the compiled `strategy`
// array (`custom-requestLocale`).
// ---------------------------------------------------------------------------
defineCustomServerStrategy('custom-requestLocale', {
  getLocale: (request) => {
    if (!request) return undefined
    return requestLocale(request)
  },
})

// Standard TanStack Start request pipeline.
const startHandler = createStartHandler(defaultStreamHandler)

/**
 * Custom SSR handler that resolves the request locale, delegates rendering to
 * TanStack Start, and then applies locale-aware cache headers to HTML
 * responses.
 *
 * The original `request` is passed to the Start handler (not the middleware
 * callback's `resolvedRequest`) because this project does not use the `url`
 * strategy and TanStack Router manages URL localization independently.
 *
 * All additional arguments (e.g. `onEarlyHints`, `context`) are forwarded
 * to the Start handler unchanged so the full TanStack Start API surface
 * remains available.
 *
 * @param request - Incoming HTTP request.
 * @param rest - Additional TanStack Start handler options forwarded unchanged.
 * @returns A Response with locale-aware headers for HTML, unchanged for
 *   non-HTML responses.
 */
export default {
  async fetch(...args: Parameters<typeof startHandler>): Promise<Response> {
    const [request, ...rest] = args
    const response = await paraglideMiddleware(request, () => startHandler(request, ...rest))
    return applyHtmlLocaleHeaders(response)
  },
}
