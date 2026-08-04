import { afterEach, describe, expect, it } from 'vitest'

import {
  deLocalizeUrl,
  extractLocaleFromUrl,
  extractLocaleFromRequest,
  localizeUrl,
  localizeHref,
  getLocale,
  overwriteGetLocale,
  baseLocale,
  locales,
  shouldRedirect,
  strategy,
} from './paraglide/runtime'
import * as m from './paraglide/messages'

// Capture the original getLocale so we can restore it after each test
// to prevent locale state from leaking across tests.
const originalGetLocale = getLocale
afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

describe('i18n URL routing', () => {
  it('deLocalizeUrl strips locale prefix from /en path', () => {
    const result = deLocalizeUrl('http://localhost:3000/en')
    expect(result.pathname).toBe('/')
  })

  it('deLocalizeUrl strips locale prefix from /zh-CN path', () => {
    const result = deLocalizeUrl('http://localhost:3000/zh-CN')
    expect(result.pathname).toBe('/')
  })

  it('deLocalizeUrl preserves unprefixed root as a language negotiation path', () => {
    const result = deLocalizeUrl('http://localhost:3000/')
    expect(result.pathname).toBe('/')
  })

  it('deLocalizeUrl strips locale prefix from localized routes', () => {
    const result = deLocalizeUrl('http://localhost:3000/zh-CN/some-page')
    expect(result.pathname).toBe('/some-page')
  })

  it('deLocalizeUrl preserves unprefixed canonical routes for language negotiation', () => {
    const result = deLocalizeUrl('http://localhost:3000/some-page')
    expect(result.pathname).toBe('/some-page')
  })

  it('localizeUrl maps / to /en for en locale', () => {
    const result = localizeUrl('http://localhost:3000/', { locale: 'en' })
    expect(result.pathname).toBe('/en/')
  })

  it('localizeUrl maps / to /zh-CN for the base locale', () => {
    const result = localizeUrl('http://localhost:3000/', { locale: 'zh-CN' })
    expect(result.pathname).toBe('/zh-CN/')
  })

  it('localizeUrl switches /en to /zh-CN', () => {
    const result = localizeUrl('http://localhost:3000/en/', { locale: 'zh-CN' })
    expect(result.pathname).toBe('/zh-CN/')
  })

  it('localizeUrl maps /some-page to /en/some-page for en locale', () => {
    const result = localizeUrl('http://localhost:3000/some-page', { locale: 'en' })
    expect(result.pathname).toBe('/en/some-page')
  })

  it('localizeHref returns relative path preserving the current route', () => {
    // Override getLocale to control the current locale
    overwriteGetLocale(() => 'zh-CN')
    const href = localizeHref('/some-page', { locale: 'en' })
    expect(href).toBe('/en/some-page')
  })

  it('localizeHref adds the base locale prefix', () => {
    overwriteGetLocale(() => 'en')
    const href = localizeHref('/en/some-page', { locale: 'zh-CN' })
    expect(href).toBe('/zh-CN/some-page')
  })

  it('localizeHref at root switches between locales', () => {
    overwriteGetLocale(() => 'zh-CN')
    expect(localizeHref('/', { locale: 'en' })).toBe('/en/')
    expect(localizeHref('/', { locale: 'zh-CN' })).toBe('/zh-CN/')
  })

  it('localizeHref preserves query string and hash from a TanStack Router location.href', () => {
    // TanStack Router's ParsedLocation has .search as a parsed object and
    // .hash without the leading '#'. Always use router.state.location.href,
    // which is the canonical full-path string (pathname + searchStr + hash).
    overwriteGetLocale(() => 'en')
    const locationHref = '/en/some-page?q=search#top'
    const href = localizeHref(locationHref, { locale: 'zh-CN' })
    expect(href).toBe('/zh-CN/some-page?q=search#top')
  })
})

describe('i18n message output', () => {
  it('returns Chinese text for zh-CN locale', () => {
    expect(m.app_name({}, { locale: 'zh-CN' })).toBe('Nijigen Video')
    expect(m.home_heading({}, { locale: 'zh-CN' })).toBe('工作区')
    expect(m.home_new_upload({}, { locale: 'zh-CN' })).toBe('新建上传')
    expect(m.language_switcher_label({}, { locale: 'zh-CN' })).toBe('语言')
  })

  it('returns English text for en locale', () => {
    expect(m.app_name({}, { locale: 'en' })).toBe('Nijigen Video')
    expect(m.home_heading({}, { locale: 'en' })).toBe('Workspace')
    expect(m.home_new_upload({}, { locale: 'en' })).toBe('New upload')
    expect(m.language_switcher_label({}, { locale: 'en' })).toBe('Language')
  })

  it('returns different text for different locales on the same message', () => {
    const zh = m.home_review_queue_empty({}, { locale: 'zh-CN' })
    const en = m.home_review_queue_empty({}, { locale: 'en' })
    expect(zh).toBe('暂无视频等待审核。')
    expect(en).toBe('No videos are waiting for review yet.')
    expect(zh).not.toBe(en)
  })

  it('message functions throw or return fallback for unknown locale', () => {
    // Messages should fall back to the last locale (en) when given unknown locale
    const result = m.home_heading({}, { locale: 'fr' as 'en' })
    // With the generated code, unknown locale falls through to the last variant
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('i18n runtime', () => {
  it('uses URL, cookie, preferred language, then the base locale', () => {
    expect(strategy).toEqual(['url', 'cookie', 'preferredLanguage', 'baseLocale'])
  })

  it('only extracts a URL locale from prefixed routes', () => {
    expect(extractLocaleFromUrl('http://localhost:3000/some-page')).toBeUndefined()
    expect(extractLocaleFromUrl('http://localhost:3000/zh-CN/some-page')).toBe('zh-CN')
    expect(extractLocaleFromUrl('http://localhost:3000/en/some-page')).toBe('en')
  })

  it('uses the URL locale over conflicting cookie and preferred language', () => {
    const request = new Request('http://localhost:3000/en', {
      headers: {
        cookie: 'PARAGLIDE_LOCALE=zh-CN',
        'accept-language': 'zh-CN',
      },
    })

    expect(extractLocaleFromRequest(request)).toBe('en')
  })

  it('uses the URL locale over a conflicting preferred language', () => {
    const request = new Request('http://localhost:3000/en', {
      headers: { 'accept-language': 'zh-CN' },
    })

    expect(extractLocaleFromRequest(request)).toBe('en')
  })

  it('uses the saved cookie when the URL is unprefixed', () => {
    const request = new Request('http://localhost:3000/', {
      headers: {
        cookie: 'PARAGLIDE_LOCALE=en',
        'accept-language': 'zh-CN',
      },
    })

    expect(extractLocaleFromRequest(request)).toBe('en')
  })

  it('uses the preferred language when an unprefixed URL has no locale cookie', () => {
    const request = new Request('http://localhost:3000/some-page', {
      headers: { 'accept-language': 'en' },
    })

    expect(extractLocaleFromRequest(request)).toBe('en')
  })

  it('falls back to the base locale when no request preference is supported', () => {
    const request = new Request('http://localhost:3000/some-page', {
      headers: { 'accept-language': 'fr' },
    })

    expect(extractLocaleFromRequest(request)).toBe('zh-CN')
  })

  it('redirects an unprefixed first visit to the preferred-language URL', async () => {
    const decision = await shouldRedirect({
      request: new Request('http://localhost:3000/some-page', {
        headers: { 'accept-language': 'en' },
      }),
    })

    expect(decision.shouldRedirect).toBe(true)
    expect(decision.locale).toBe('en')
    expect(decision.redirectUrl?.pathname).toBe('/en/some-page')
  })

  it('baseLocale is zh-CN', () => {
    expect(baseLocale).toBe('zh-CN')
  })

  it('locales contains zh-CN and en', () => {
    expect(locales).toContain('zh-CN')
    expect(locales).toContain('en')
    expect(locales).toHaveLength(2)
  })

  it('getLocale returns the overwritten locale when set', () => {
    overwriteGetLocale(() => 'en')
    expect(getLocale()).toBe('en')
    overwriteGetLocale(() => 'zh-CN')
    expect(getLocale()).toBe('zh-CN')
  })
})
