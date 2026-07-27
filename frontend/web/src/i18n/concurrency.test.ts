/**
 * Request isolation and locale-resolution tests for the built-in Paraglide
 * server strategies (`cookie` → `preferredLanguage` → `baseLocale`).
 *
 * These tests verify that:
 *  - a valid `PARAGLIDE_LOCALE` cookie takes precedence over `Accept-Language`;
 *  - `Accept-Language` selects `en` or `zh-CN` when no cookie is present;
 *  - an invalid cookie value falls through to header detection;
 *  - absent cookie and header fall back to the base locale (`zh-CN`);
 *  - automatic detection does not write a `Set-Cookie` header;
 *  - concurrent requests with different locales are isolated via
 *    `AsyncLocalStorage`.
 *
 * Edge-case behaviour of `Accept-Language` parsing (e.g. `q=0` exclusion,
 * generic `zh` aliasing, malformed ranges) is delegated to the pinned
 * Paraglide implementation and is intentionally not locked in by these tests.
 */

import { describe, expect, it } from 'vitest'
import { getLocale, baseLocale } from '#/paraglide/runtime.js'
import { paraglideMiddleware } from '#/paraglide/server.js'

/**
 * Build a minimal Request stub with the given headers.
 */
function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/', { headers })
}

describe('Built-in strategy resolution', () => {
  // -----------------------------------------------------------------------
  // Cookie precedence
  // -----------------------------------------------------------------------

  it('prefers valid PARAGLIDE_LOCALE=en cookie over Accept-Language zh-CN', async () => {
    const req = makeRequest({
      Cookie: 'PARAGLIDE_LOCALE=en',
      'Accept-Language': 'zh-CN',
    })
    const res = await paraglideMiddleware(req, () =>
      Promise.resolve(new Response(getLocale(), { headers: { 'Content-Type': 'text/html' } })),
    )
    expect(await res.text()).toBe('en')
  })

  it('prefers valid PARAGLIDE_LOCALE=zh-CN cookie over Accept-Language en', async () => {
    const req = makeRequest({
      Cookie: 'PARAGLIDE_LOCALE=zh-CN',
      'Accept-Language': 'en',
    })
    const res = await paraglideMiddleware(req, () =>
      Promise.resolve(new Response(getLocale(), { headers: { 'Content-Type': 'text/html' } })),
    )
    expect(await res.text()).toBe('zh-CN')
  })

  it('falls through to header when cookie value is not a valid locale', async () => {
    const req = makeRequest({
      Cookie: 'PARAGLIDE_LOCALE=fr',
      'Accept-Language': 'en',
    })
    const res = await paraglideMiddleware(req, () =>
      Promise.resolve(new Response(getLocale(), { headers: { 'Content-Type': 'text/html' } })),
    )
    expect(await res.text()).toBe('en')
  })

  // -----------------------------------------------------------------------
  // Accept-Language resolution
  // -----------------------------------------------------------------------

  it('resolves en from Accept-Language header', async () => {
    const req = makeRequest({ 'Accept-Language': 'en' })
    const res = await paraglideMiddleware(req, () =>
      Promise.resolve(new Response(getLocale(), { headers: { 'Content-Type': 'text/html' } })),
    )
    expect(await res.text()).toBe('en')
  })

  it('resolves zh-CN from Accept-Language header', async () => {
    const req = makeRequest({ 'Accept-Language': 'zh-CN' })
    const res = await paraglideMiddleware(req, () =>
      Promise.resolve(new Response(getLocale(), { headers: { 'Content-Type': 'text/html' } })),
    )
    expect(await res.text()).toBe('zh-CN')
  })

  // -----------------------------------------------------------------------
  // Base locale fallback
  // -----------------------------------------------------------------------

  it('falls back to baseLocale when no cookie or supported header exists', async () => {
    const req = makeRequest({})
    const res = await paraglideMiddleware(req, () =>
      Promise.resolve(new Response(getLocale(), { headers: { 'Content-Type': 'text/html' } })),
    )
    expect(await res.text()).toBe(baseLocale)
  })

  it('falls back to baseLocale for unsupported Accept-Language values', async () => {
    const req = makeRequest({ 'Accept-Language': 'ja, fr' })
    const res = await paraglideMiddleware(req, () =>
      Promise.resolve(new Response(getLocale(), { headers: { 'Content-Type': 'text/html' } })),
    )
    expect(await res.text()).toBe(baseLocale)
  })

  // -----------------------------------------------------------------------
  // No automatic cookie write
  // -----------------------------------------------------------------------

  it('does not set a Set-Cookie header during automatic detection', async () => {
    const req = makeRequest({ 'Accept-Language': 'en' })
    const res = await paraglideMiddleware(req, () =>
      Promise.resolve(new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } })),
    )
    expect(res.headers.get('Set-Cookie')).toBeNull()
  })
})

describe('Concurrency isolation', () => {
  it('isolates concurrent English and Chinese requests via AsyncLocalStorage', async () => {
    const enReq = makeRequest({ 'Accept-Language': 'en' })
    const zhReq = makeRequest({ 'Accept-Language': 'zh-CN' })

    async function enHandler(): Promise<Response> {
      const localeBefore = getLocale()
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

    const [enRes, zhRes] = await Promise.all([
      paraglideMiddleware(enReq, () => enHandler()),
      paraglideMiddleware(zhReq, () => zhHandler()),
    ])

    expect(await enRes.text()).toBe('en:en')
    expect(await zhRes.text()).toBe('zh-CN:zh-CN')
  })

  it('does not leak locale to a subsequent request after a prior one completes', async () => {
    const enReq = makeRequest({ 'Accept-Language': 'en' })
    const zhReq = makeRequest({ 'Accept-Language': 'zh-CN' })

    const enRes = await paraglideMiddleware(enReq, () =>
      Promise.resolve(new Response(getLocale(), { headers: { 'Content-Type': 'text/html' } })),
    )
    expect(await enRes.text()).toBe('en')

    const zhRes = await paraglideMiddleware(zhReq, () =>
      Promise.resolve(new Response(getLocale(), { headers: { 'Content-Type': 'text/html' } })),
    )
    expect(await zhRes.text()).toBe('zh-CN')
  })
})
