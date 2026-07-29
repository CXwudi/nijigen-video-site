/**
 * Unit tests for `html-response.ts` — locale-aware cache header helpers.
 *
 * Covers HTML detection, Vary merging, Vary: * handling, and
 * case-insensitive de-duplication.  Pure helpers are tested directly
 * on a `Headers` object without depending on an H3 request context.
 */

import { describe, expect, it } from 'vitest'
import {
  isHtmlContentType,
  mergeVaryLocaleTokens,
  mergeVarySourcesWithLocale,
} from '#/i18n/html-response.js'

// -----------------------------------------------------------------------
// isHtmlContentType
// -----------------------------------------------------------------------

describe('isHtmlContentType', () => {
  it('returns true for text/html with charset', () => {
    const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
    expect(isHtmlContentType(headers)).toBe(true)
  })

  it('returns true for text/html alone', () => {
    const headers = new Headers({ 'Content-Type': 'text/html' })
    expect(isHtmlContentType(headers)).toBe(true)
  })

  it('matches Content-Type case-insensitively', () => {
    const headers = new Headers({ 'Content-Type': 'TEXT/HTML' })
    expect(isHtmlContentType(headers)).toBe(true)
  })

  it('returns false for application/json', () => {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    expect(isHtmlContentType(headers)).toBe(false)
  })

  it('returns false when Content-Type is missing', () => {
    const headers = new Headers()
    expect(isHtmlContentType(headers)).toBe(false)
  })
})

// -----------------------------------------------------------------------
// mergeVaryLocaleTokens
// -----------------------------------------------------------------------

describe('mergeVaryLocaleTokens', () => {
  it('returns Cookie, Accept-Language when given empty string', () => {
    expect(mergeVaryLocaleTokens('')).toBe('Cookie, Accept-Language')
  })

  it('preserves existing Vary tokens and appends missing locale tokens', () => {
    expect(mergeVaryLocaleTokens('Accept-Encoding')).toBe(
      'Accept-Encoding, Cookie, Accept-Language',
    )
  })

  it('de-duplicates Vary tokens case-insensitively', () => {
    expect(mergeVaryLocaleTokens('cookie, Accept-Encoding')).toBe(
      'cookie, Accept-Encoding, Accept-Language',
    )
  })

  it('does not duplicate tokens that are already present', () => {
    expect(mergeVaryLocaleTokens('Cookie, Accept-Language')).toBe('Cookie, Accept-Language')
  })

  it('returns * when existingVary is exactly *', () => {
    expect(mergeVaryLocaleTokens('*')).toBe('*')
  })

  it('normalizes Vary: * with surrounding whitespace', () => {
    expect(mergeVaryLocaleTokens(' * ')).toBe('*')
  })

  it('normalizes Vary containing * plus other tokens: *, Accept-Encoding', () => {
    expect(mergeVaryLocaleTokens('*, Accept-Encoding')).toBe('*')
  })

  it('normalizes Vary containing * plus other tokens: Accept-Encoding, *', () => {
    expect(mergeVaryLocaleTokens('Accept-Encoding, *')).toBe('*')
  })

  it('normalizes Vary containing * plus other tokens: Accept-Encoding, *, Cookie', () => {
    expect(mergeVaryLocaleTokens('Accept-Encoding, *, Cookie')).toBe('*')
  })
})

// -----------------------------------------------------------------------
// mergeVarySourcesWithLocale
// -----------------------------------------------------------------------

describe('mergeVarySourcesWithLocale', () => {
  it('merges two non-null sources and appends locale tokens', () => {
    expect(mergeVarySourcesWithLocale('Accept-Encoding', 'User-Agent')).toBe(
      'Accept-Encoding, User-Agent, Cookie, Accept-Language',
    )
  })

  it('returns locale tokens when both sources are null', () => {
    expect(mergeVarySourcesWithLocale(null, null)).toBe('Cookie, Accept-Language')
  })

  it('returns locale tokens when both sources are empty strings', () => {
    expect(mergeVarySourcesWithLocale('', '')).toBe('Cookie, Accept-Language')
  })

  it('handles one null and one non-null source', () => {
    expect(mergeVarySourcesWithLocale(null, 'Accept-Encoding')).toBe(
      'Accept-Encoding, Cookie, Accept-Language',
    )
  })

  it('de-duplicates tokens across both sources case-insensitively', () => {
    expect(mergeVarySourcesWithLocale('cookie', 'Cookie')).toBe('cookie, Accept-Language')
  })

  it('de-duplicates locale tokens already present in either source', () => {
    expect(mergeVarySourcesWithLocale('Cookie', 'Accept-Language')).toBe('Cookie, Accept-Language')
  })

  it('returns * when first source contains *', () => {
    expect(mergeVarySourcesWithLocale('*', 'Accept-Encoding')).toBe('*')
  })

  it('returns * when second source contains *', () => {
    expect(mergeVarySourcesWithLocale('Accept-Encoding', '*')).toBe('*')
  })

  it('returns * when * appears among other tokens in either source', () => {
    expect(mergeVarySourcesWithLocale('Accept-Encoding, *', 'Cookie')).toBe('*')
  })

  it('preserves non-locale tokens from both sources in order', () => {
    expect(mergeVarySourcesWithLocale('Accept-Encoding', 'User-Agent')).toBe(
      'Accept-Encoding, User-Agent, Cookie, Accept-Language',
    )
  })
})
