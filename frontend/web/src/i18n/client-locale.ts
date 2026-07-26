/**
 * Browser hydration locale helpers for Paraglide's client runtime.
 *
 * The server-rendered `<html lang>` value is the source of truth for the
 * initial browser document.  Before React hydrates, the client entry must
 * override `getLocale()` to return a validated `document.documentElement.lang`
 * so the first client render matches the SSR output without language flicker
 * or a hydration mismatch.
 *
 * This override intentionally bypasses `navigator.languages` detection during
 * hydration — the server already resolved the equivalent `Accept-Language`
 * header, and `<html lang>` is the serialized handoff.  It also prevents
 * Paraglide's default initial client resolution from calling
 * `setLocale(..., { reload: false })`, which would write a cookie before any
 * manual language selection.
 */

import { toLocale, baseLocale, overwriteGetLocale, type Locale } from '#/paraglide/runtime.js'

/**
 * Validate a document language string against the project's supported locales.
 *
 * Uses the Paraglide-generated `toLocale` for canonicalization and falls back
 * to `baseLocale` when the value is empty, undefined, or not a supported locale.
 *
 * @param lang - The `document.documentElement.lang` value from the SSR HTML.
 * @returns A validated `Locale` ready for use by the Paraglide runtime.
 */
export function resolveDocumentLocale(lang: string | undefined | null): Locale {
  if (!lang) return baseLocale
  return toLocale(lang) ?? baseLocale
}

/**
 * Install the hydration locale override on `getLocale()`.
 *
 * Must be called **synchronously** in the client entry before
 * `hydrateRoot(document, <StartClient />)` and before any application module
 * calls `getLocale()` or a message function at module scope.
 *
 * After installation every `getLocale()` and `getTextDirection()` call in the
 * browser reads the SSR-rendered `<html lang>` attribute, so the hydration
 * output agrees with the server HTML.
 */
export function installClientLocaleOverride(): void {
  overwriteGetLocale(() => resolveDocumentLocale(document.documentElement.lang))
}
