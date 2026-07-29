/**
 * HTML response header helpers for locale-aware SSR caching.
 *
 * Pure helpers that can be called from TanStack Start request middleware
 * (using `getResponseHeader` / `setResponseHeader`) without depending on
 * an H3 request context, keeping the core Vary and HTML-detection logic
 * unit-testable.
 */

/**
 * HTTP header tokens that must be listed in `Vary` so intermediate caches
 * partition their store by the negotiated locale.
 */
const LOCALE_VARY_TOKENS = ['Cookie', 'Accept-Language'] as const

/**
 * Returns `true` when a response (or response headers) has a `Content-Type`
 * that classifies it as an HTML document.
 *
 * The check is case-insensitive and matches `text/html` anywhere in the
 * header value (e.g. `text/html; charset=utf-8`).
 */
export function isHtmlContentType(headers: { get(name: string): string | null }): boolean {
  const contentType = headers.get('Content-Type')
  return contentType != null && /text\/html/i.test(contentType)
}

/**
 * Merge `Vary` header values, de-duplicate tokens case-insensitively, preserve
 * wildcard semantics, and append locale tokens (`Cookie`, `Accept-Language`).
 *
 * @param sources - Existing `Vary` values, such as event and response headers.
 * @returns A comma-separated `Vary` value including the locale tokens.
 */
export function mergeVarySourcesWithLocale(...sources: Array<string | null | undefined>): string {
  const tokens: string[] = []
  const seen = new Set<string>()

  for (const source of sources) {
    if (source == null) {
      continue
    }

    for (const raw of source.split(',')) {
      const token = raw.trim()
      if (token === '*') {
        return '*'
      }
      if (token.length > 0 && !seen.has(token.toLowerCase())) {
        seen.add(token.toLowerCase())
        tokens.push(token)
      }
    }
  }

  // Append locale-specific tokens not already present.
  for (const token of LOCALE_VARY_TOKENS) {
    if (!seen.has(token.toLowerCase())) {
      seen.add(token.toLowerCase())
      tokens.push(token)
    }
  }

  return tokens.join(', ')
}
