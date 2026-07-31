import { afterEach, describe, expect, it } from 'vitest'

import {
  deLocalizeUrl,
  extractLocaleFromRequest,
  localizeUrl,
  localizeHref,
  getLocale,
  overwriteGetLocale,
  baseLocale,
  locales,
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

  it('deLocalizeUrl preserves unprefixed root path (base locale)', () => {
    const result = deLocalizeUrl('http://localhost:3000/')
    expect(result.pathname).toBe('/')
  })

  it('deLocalizeUrl strips locale prefix from /en/some-page', () => {
    const result = deLocalizeUrl('http://localhost:3000/en/some-page')
    expect(result.pathname).toBe('/some-page')
  })

  it('deLocalizeUrl preserves unprefixed /some-page (base locale)', () => {
    const result = deLocalizeUrl('http://localhost:3000/some-page')
    expect(result.pathname).toBe('/some-page')
  })

  it('localizeUrl maps / to /en for en locale', () => {
    const result = localizeUrl('http://localhost:3000/', { locale: 'en' })
    expect(result.pathname).toBe('/en/')
  })

  it('localizeUrl maps / to / for base locale (zh-CN)', () => {
    const result = localizeUrl('http://localhost:3000/', { locale: 'zh-CN' })
    expect(result.pathname).toBe('/')
  })

  it('localizeUrl maps /en to / for zh-CN locale', () => {
    const result = localizeUrl('http://localhost:3000/en/', { locale: 'zh-CN' })
    expect(result.pathname).toBe('/')
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

  it('localizeHref with base locale preserves unprefixed path', () => {
    overwriteGetLocale(() => 'en')
    const href = localizeHref('/en/some-page', { locale: 'zh-CN' })
    expect(href).toBe('/some-page')
  })

  it('localizeHref at root switches between locales', () => {
    overwriteGetLocale(() => 'zh-CN')
    expect(localizeHref('/', { locale: 'en' })).toBe('/en/')
    expect(localizeHref('/', { locale: 'zh-CN' })).toBe('/')
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
  it('uses cookie, preferred language, URL, then the base locale', () => {
    expect(strategy).toEqual(['cookie', 'preferredLanguage', 'url', 'baseLocale'])
  })

  it('uses the saved cookie before a locale in the URL', () => {
    const request = new Request('http://localhost:3000/en', {
      headers: {
        cookie: 'PARAGLIDE_LOCALE=zh-CN',
        'accept-language': 'en',
      },
    })

    expect(extractLocaleFromRequest(request)).toBe('zh-CN')
  })

  it('uses the preferred language before the locale in the URL', () => {
    const request = new Request('http://localhost:3000/en', {
      headers: { 'accept-language': 'zh-CN' },
    })

    expect(extractLocaleFromRequest(request)).toBe('zh-CN')
  })

  it('uses the preferred language when no cookie is available', () => {
    const request = new Request('http://localhost:3000/', {
      headers: { 'accept-language': 'en' },
    })

    expect(extractLocaleFromRequest(request)).toBe('en')
  })

  it('uses the URL locale when the preferred language is unsupported', () => {
    const request = new Request('http://localhost:3000/en', {
      headers: { 'accept-language': 'fr' },
    })

    expect(extractLocaleFromRequest(request)).toBe('en')
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
