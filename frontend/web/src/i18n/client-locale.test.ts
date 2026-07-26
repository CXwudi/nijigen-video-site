/**
 * Unit tests for `client-locale.ts` — hydration locale validation.
 *
 * Covers supported locales (en, zh-CN), empty/undefined/null inputs, and
 * unsupported values.  All tests exercise `resolveDocumentLocale` directly
 * because it is the pure validation core; `installClientLocaleOverride` wraps
 * it with a `document.documentElement.lang` read that requires a browser.
 */

import { describe, expect, it } from 'vitest'
import { resolveDocumentLocale } from '#/i18n/client-locale.js'

describe('resolveDocumentLocale', () => {
  // -----------------------------------------------------------------------
  // Supported locales
  // -----------------------------------------------------------------------

  it('resolves "en" to "en"', () => {
    expect(resolveDocumentLocale('en')).toBe('en')
  })

  it('resolves "zh-CN" to "zh-CN"', () => {
    expect(resolveDocumentLocale('zh-CN')).toBe('zh-CN')
  })

  // -----------------------------------------------------------------------
  // Empty / null / undefined → baseLocale (zh-CN)
  // -----------------------------------------------------------------------

  it('falls back to baseLocale for empty string', () => {
    expect(resolveDocumentLocale('')).toBe('zh-CN')
  })

  it('falls back to baseLocale for undefined', () => {
    expect(resolveDocumentLocale(undefined)).toBe('zh-CN')
  })

  it('falls back to baseLocale for null', () => {
    expect(resolveDocumentLocale(null)).toBe('zh-CN')
  })

  // -----------------------------------------------------------------------
  // Unsupported values → baseLocale
  // -----------------------------------------------------------------------

  it('falls back to baseLocale for unsupported "fr"', () => {
    expect(resolveDocumentLocale('fr')).toBe('zh-CN')
  })

  it('falls back to baseLocale for unsupported "ja"', () => {
    expect(resolveDocumentLocale('ja')).toBe('zh-CN')
  })

  it('falls back to baseLocale for unsupported "zh-TW"', () => {
    // Traditional Chinese is not in the project's supported locales.
    expect(resolveDocumentLocale('zh-TW')).toBe('zh-CN')
  })

  it('falls back to baseLocale for arbitrary string "xyz"', () => {
    expect(resolveDocumentLocale('xyz')).toBe('zh-CN')
  })
})
