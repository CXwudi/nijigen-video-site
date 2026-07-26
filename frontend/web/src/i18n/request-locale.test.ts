/**
 * Unit tests for `request-locale.ts` — custom server-side locale resolution.
 *
 * These tests cover the approved cookie / Accept-Language / baseLocale
 * precedence matrix, Simplified-versus-Traditional Chinese matching, `q=0`
 * exclusion, case-insensitivity, and fallback behavior.
 */

import { describe, expect, it } from 'vitest'
import { requestLocale } from '#/i18n/request-locale.js'

/** Build a minimal Request stub with the given headers. */
function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/', { headers })
}

describe('requestLocale', () => {
  // -----------------------------------------------------------------------
  // Cookie precedence
  // -----------------------------------------------------------------------

  it('prefers a valid PARAGLIDE_LOCALE=en cookie over any Accept-Language', () => {
    const req = makeRequest({
      Cookie: 'PARAGLIDE_LOCALE=en',
      'Accept-Language': 'zh-CN',
    })
    expect(requestLocale(req)).toBe('en')
  })

  it('prefers a valid PARAGLIDE_LOCALE=zh-CN cookie over English header', () => {
    const req = makeRequest({
      Cookie: 'PARAGLIDE_LOCALE=zh-CN',
      'Accept-Language': 'en',
    })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('falls through to header when cookie value is not a valid locale', () => {
    const req = makeRequest({
      Cookie: 'PARAGLIDE_LOCALE=fr',
      'Accept-Language': 'en',
    })
    expect(requestLocale(req)).toBe('en')
  })

  it('falls through to header when cookie name is wrong', () => {
    const req = makeRequest({
      Cookie: 'WRONG_COOKIE=en',
      'Accept-Language': 'zh-CN',
    })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('falls through to header when cookie header is absent', () => {
    const req = makeRequest({
      'Accept-Language': 'en',
    })
    expect(requestLocale(req)).toBe('en')
  })

  // -----------------------------------------------------------------------
  // Accept-Language matching — English
  // -----------------------------------------------------------------------

  it('resolves exact en header', () => {
    expect(requestLocale(makeRequest({ 'Accept-Language': 'en' }))).toBe('en')
  })

  it('resolves en-US header to en', () => {
    expect(requestLocale(makeRequest({ 'Accept-Language': 'en-US' }))).toBe('en')
  })

  it('resolves en-GB header to en', () => {
    expect(requestLocale(makeRequest({ 'Accept-Language': 'en-GB' }))).toBe('en')
  })

  // -----------------------------------------------------------------------
  // Accept-Language matching — Simplified Chinese
  // -----------------------------------------------------------------------

  it('resolves exact zh-CN header', () => {
    expect(requestLocale(makeRequest({ 'Accept-Language': 'zh-CN' }))).toBe('zh-CN')
  })

  it('resolves generic zh header to zh-CN', () => {
    expect(requestLocale(makeRequest({ 'Accept-Language': 'zh' }))).toBe('zh-CN')
  })

  it('resolves zh-Hans header to zh-CN', () => {
    expect(requestLocale(makeRequest({ 'Accept-Language': 'zh-Hans' }))).toBe('zh-CN')
  })

  it('resolves zh-Hans-CN header to zh-CN', () => {
    expect(requestLocale(makeRequest({ 'Accept-Language': 'zh-Hans-CN' }))).toBe('zh-CN')
  })

  it('resolves zh-SG header to zh-CN', () => {
    expect(requestLocale(makeRequest({ 'Accept-Language': 'zh-SG' }))).toBe('zh-CN')
  })

  // -----------------------------------------------------------------------
  // Traditional Chinese: must NOT match zh-CN
  // -----------------------------------------------------------------------

  for (const tag of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-TW']) {
    it(`does not resolve ${tag} to zh-CN (falls through)`, () => {
      // With only Traditional Chinese in the header, fall through to baseLocale.
      expect(requestLocale(makeRequest({ 'Accept-Language': tag }))).toBeUndefined()
    })
  }

  it('falls through Traditional Chinese and resolves subsequent English', () => {
    // Traditional Chinese should be skipped; English is next.
    const req = makeRequest({ 'Accept-Language': 'zh-TW, en' })
    expect(requestLocale(req)).toBe('en')
  })

  // -----------------------------------------------------------------------
  // Quality (q) handling
  // -----------------------------------------------------------------------

  it('ignores a q=0 supported range and resolves the next entry', () => {
    // en with q=0 must be ignored; zh-CN is next.
    const req = makeRequest({ 'Accept-Language': 'en;q=0, zh-CN' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('ignores q=0 even when it is the only supported range', () => {
    const req = makeRequest({ 'Accept-Language': 'en;q=0' })
    expect(requestLocale(req)).toBeUndefined()
  })

  it('ignores q=0 with optional whitespace before the semicolon', () => {
    const req = makeRequest({ 'Accept-Language': 'en ; q=0, zh-CN' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('respects quality weighting (higher q wins)', () => {
    const req = makeRequest({ 'Accept-Language': 'en;q=0.5, zh-CN;q=0.9' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('preserves source order for equal qualities and picks first match', () => {
    const req = makeRequest({ 'Accept-Language': 'en, zh-CN' })
    expect(requestLocale(req)).toBe('en')
  })

  // -----------------------------------------------------------------------
  // OWS (optional whitespace) around separators and equal signs
  // -----------------------------------------------------------------------

  it('parses quality with space after semicolon (en; q=0.8)', () => {
    const req = makeRequest({ 'Accept-Language': 'en; q=0.8, zh-CN' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('parses quality with OWS (en ; q = 0.8) — ignores malformed spaces around =', () => {
    // Space around '=' makes the qvalue string ' 0.8', which isn't a valid
    // qvalue.  The segment is therefore malformed and skipped.
    const req = makeRequest({ 'Accept-Language': 'en ; q = 0.8, zh-CN' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('parses quality with no whitespace (en;q=0.8)', () => {
    const req = makeRequest({ 'Accept-Language': 'en;q=0.8, zh-CN' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('parses quality with trailing whitespace in segment', () => {
    const req = makeRequest({ 'Accept-Language': 'en;q=0.3,  zh-CN  ' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('parses multiple ranges with OWS quality values', () => {
    const req = makeRequest({ 'Accept-Language': 'en ; q=0.5 , zh-CN ; q=0.8' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  // -----------------------------------------------------------------------
  // Malformed segments — must be ignored per plan
  // -----------------------------------------------------------------------

  it('ignores a range with an extra parameter like level=1', () => {
    const req = makeRequest({ 'Accept-Language': 'en;level=1, zh-CN' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('ignores a range with extra parameters even when q= is also present', () => {
    const req = makeRequest({ 'Accept-Language': 'en;q=0.8;level=1, zh-CN' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('ignores a range with invalid qvalue format', () => {
    const req = makeRequest({ 'Accept-Language': 'en;q=abc, zh-CN' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('ignores a range with q value above 1', () => {
    const req = makeRequest({ 'Accept-Language': 'en;q=2, zh-CN' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('ignores a range with an empty q parameter', () => {
    const req = makeRequest({ 'Accept-Language': 'en;q=, zh-CN' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('ignores a range with trailing garbage after semicolon', () => {
    const req = makeRequest({ 'Accept-Language': 'en;, zh-CN' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  it('ignores an empty language range (leading comma)', () => {
    const req = makeRequest({ 'Accept-Language': ', en' })
    expect(requestLocale(req)).toBe('en')
  })

  // -----------------------------------------------------------------------
  // Case-insensitivity
  // -----------------------------------------------------------------------

  it('matches case-insensitively (EN, Zh-cn, etc.)', () => {
    const req = makeRequest({ 'Accept-Language': 'EN;q=0.6, ZH-CN;q=0.8' })
    expect(requestLocale(req)).toBe('zh-CN')
  })

  // -----------------------------------------------------------------------
  // Fallback to undefined (baseLocale)
  // -----------------------------------------------------------------------

  it('returns undefined when no cookie or supported header exists', () => {
    expect(requestLocale(makeRequest({}))).toBeUndefined()
  })

  it('returns undefined for unsupported Accept-Language values', () => {
    const req = makeRequest({ 'Accept-Language': 'ja, fr' })
    expect(requestLocale(req)).toBeUndefined()
  })

  it('returns undefined when Accept-Language is *', () => {
    const req = makeRequest({ 'Accept-Language': '*' })
    expect(requestLocale(req)).toBeUndefined()
  })

  // -----------------------------------------------------------------------
  // Cookie edge cases
  // -----------------------------------------------------------------------

  it('ignores cookie with empty value', () => {
    const req = makeRequest({
      Cookie: 'PARAGLIDE_LOCALE=',
      'Accept-Language': 'en',
    })
    expect(requestLocale(req)).toBe('en')
  })

  it('handles multiple cookies and finds PARAGLIDE_LOCALE', () => {
    const req = makeRequest({
      Cookie: 'session=abc123; PARAGLIDE_LOCALE=en; other=xyz',
      'Accept-Language': 'zh-CN',
    })
    expect(requestLocale(req)).toBe('en')
  })
})
