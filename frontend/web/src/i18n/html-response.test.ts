/**
 * Unit tests for `html-response.ts` — locale-aware cache header helpers.
 *
 * Covers HTML 200, HTML errors, mixed-case Content-Type, existing Vary
 * tokens, Vary: *, repeated tokens, non-HTML passthrough, and header
 * preservation.
 */

import { describe, expect, it } from 'vitest'
import { applyHtmlLocaleHeaders } from '#/i18n/html-response.js'

describe('applyHtmlLocaleHeaders', () => {
  // -----------------------------------------------------------------------
  // HTML responses
  // -----------------------------------------------------------------------

  it('adds Cache-Control and Vary to HTML 200', () => {
    const res = new Response('<html></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(out.status).toBe(200)
    expect(out.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    expect(out.headers.get('Cache-Control')).toBe('private, no-store')
    expect(out.headers.get('Vary')).toBe('Cookie, Accept-Language')
  })

  it('adds headers to HTML error responses', () => {
    const res = new Response('<html>Not Found</html>', {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'text/html' },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(out.status).toBe(404)
    expect(out.statusText).toBe('Not Found')
    expect(out.headers.get('Cache-Control')).toBe('private, no-store')
    expect(out.headers.get('Vary')).toBe('Cookie, Accept-Language')
  })

  it('matches Content-Type case-insensitively', () => {
    const res = new Response('ok', {
      headers: { 'Content-Type': 'TEXT/HTML' },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(out.headers.get('Cache-Control')).toBe('private, no-store')
  })

  // -----------------------------------------------------------------------
  // Vary merging
  // -----------------------------------------------------------------------

  it('preserves existing Vary tokens and appends missing locale tokens', () => {
    const res = new Response('<html></html>', {
      headers: {
        'Content-Type': 'text/html',
        Vary: 'Accept-Encoding',
      },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(out.headers.get('Vary')).toBe('Accept-Encoding, Cookie, Accept-Language')
  })

  it('de-duplicates Vary tokens case-insensitively', () => {
    const res = new Response('<html></html>', {
      headers: {
        'Content-Type': 'text/html',
        Vary: 'cookie, Accept-Encoding',
      },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(out.headers.get('Vary')).toBe('cookie, Accept-Encoding, Accept-Language')
  })

  it('does not duplicate tokens that are already present', () => {
    const res = new Response('<html></html>', {
      headers: {
        'Content-Type': 'text/html',
        Vary: 'Cookie, Accept-Language',
      },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(out.headers.get('Vary')).toBe('Cookie, Accept-Language')
  })

  it('preserves Vary: * as-is', () => {
    const res = new Response('<html></html>', {
      headers: {
        'Content-Type': 'text/html',
        Vary: '*',
      },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(out.headers.get('Vary')).toBe('*')
  })

  it('normalizes Vary: * with surrounding whitespace', () => {
    const res = new Response('<html></html>', {
      headers: {
        'Content-Type': 'text/html',
        Vary: ' * ',
      },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(out.headers.get('Vary')).toBe('*')
  })

  it('normalizes Vary containing * plus other tokens: *, Accept-Encoding', () => {
    const res = new Response('<html></html>', {
      headers: {
        'Content-Type': 'text/html',
        Vary: '*, Accept-Encoding',
      },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(out.headers.get('Vary')).toBe('*')
  })

  it('normalizes Vary containing * plus other tokens: Accept-Encoding, *', () => {
    const res = new Response('<html></html>', {
      headers: {
        'Content-Type': 'text/html',
        Vary: 'Accept-Encoding, *',
      },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(out.headers.get('Vary')).toBe('*')
  })

  it('normalizes Vary containing * plus other tokens: Accept-Encoding, *, Cookie', () => {
    const res = new Response('<html></html>', {
      headers: {
        'Content-Type': 'text/html',
        Vary: 'Accept-Encoding, *, Cookie',
      },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(out.headers.get('Vary')).toBe('*')
  })

  it('handles empty Vary header', () => {
    const res = new Response('<html></html>', {
      headers: { 'Content-Type': 'text/html' },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(out.headers.get('Vary')).toBe('Cookie, Accept-Language')
  })

  // -----------------------------------------------------------------------
  // Non-HTML passthrough
  // -----------------------------------------------------------------------

  it('returns non-HTML responses unchanged', () => {
    const original = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
    const out = applyHtmlLocaleHeaders(original)
    // Should be the same object reference (unchanged).
    expect(out).toBe(original)
    expect(out.headers.get('Cache-Control')).toBe('public, max-age=3600')
    expect(out.headers.get('Vary')).toBeNull()
  })

  it('returns responses with no Content-Type unchanged', () => {
    const original = new Response('body')
    const out = applyHtmlLocaleHeaders(original)
    expect(out).toBe(original)
  })

  // -----------------------------------------------------------------------
  // Body preservation
  // -----------------------------------------------------------------------

  it('preserves the response body for HTML', async () => {
    const body = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'
    const res = new Response(body, {
      headers: { 'Content-Type': 'text/html' },
    })
    const out = applyHtmlLocaleHeaders(res)
    expect(await out.text()).toBe(body)
  })
})
