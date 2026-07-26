/**
 * Concurrency and request-isolation tests for the Paraglide SSR middleware.
 *
 * Verifies that overlapping requests with different locales do not leak locale
 * state across AsyncLocalStorage contexts.
 */

import { describe, expect, it } from 'vitest'
import { defineCustomServerStrategy, getLocale, baseLocale } from '#/paraglide/runtime.js'
import { paraglideMiddleware } from '#/paraglide/server.js'
import { requestLocale } from '#/i18n/request-locale.js'

// Ensure the custom strategy is registered before any test runs.
defineCustomServerStrategy('custom-requestLocale', {
  getLocale: (request) => {
    if (!request) return undefined
    return requestLocale(request)
  },
})

/**
 * Build a minimal Request stub with the given headers.
 */
function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/', { headers })
}

describe('Concurrency isolation', () => {
  it('isolates concurrent English and Chinese requests via AsyncLocalStorage', async () => {
    // Two requests with opposite Accept-Language headers.
    const enReq = makeRequest({ 'Accept-Language': 'en' })
    const zhReq = makeRequest({ 'Accept-Language': 'zh-CN' })

    // A mock handler that captures the locale seen inside the middleware
    // context AND simulates async work that could be interleaved.
    async function enHandler(): Promise<Response> {
      // Read the locale the middleware set.
      const localeBefore = getLocale()

      // Simulate async work (e.g. data fetching) that could overlap.
      await new Promise((r) => setTimeout(r, 10))

      const localeAfter = getLocale()
      return new Response(`${localeBefore}:${localeAfter}`, {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    async function zhHandler(): Promise<Response> {
      const localeBefore = getLocale()
      await new Promise((r) => setTimeout(r, 10))
      const localeAfter = getLocale()
      return new Response(`${localeBefore}:${localeAfter}`, {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    // Fire both concurrently.
    const [enRes, zhRes] = await Promise.all([
      paraglideMiddleware(enReq, () => enHandler()),
      paraglideMiddleware(zhReq, () => zhHandler()),
    ])

    const enBody = await enRes.text()
    const zhBody = await zhRes.text()

    // Each request must see its own locale consistently.
    expect(enBody).toBe('en:en')
    expect(zhBody).toBe('zh-CN:zh-CN')
  })

  it('does not leak locale to a subsequent request after a prior one completes', async () => {
    const enReq = makeRequest({ 'Accept-Language': 'en' })
    const zhReq = makeRequest({ 'Accept-Language': 'zh-CN' })

    // First, serve English.
    const enRes = await paraglideMiddleware(enReq, () =>
      Promise.resolve(
        new Response(getLocale(), {
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )
    expect(await enRes.text()).toBe('en')

    // Then, serve Chinese. It must see its own locale, not the previous one.
    const zhRes = await paraglideMiddleware(zhReq, () =>
      Promise.resolve(
        new Response(getLocale(), {
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )
    expect(await zhRes.text()).toBe('zh-CN')
  })

  it('falls back to baseLocale when no cookie or header matches', async () => {
    const req = makeRequest()
    const res = await paraglideMiddleware(req, () =>
      Promise.resolve(
        new Response(getLocale(), {
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )
    expect(await res.text()).toBe(baseLocale)
  })

  it('does not set a Set-Cookie header during automatic detection', async () => {
    const req = makeRequest({ 'Accept-Language': 'en' })
    const res = await paraglideMiddleware(req, () =>
      Promise.resolve(
        new Response('<html></html>', {
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )
    expect(res.headers.get('Set-Cookie')).toBeNull()
  })
})
