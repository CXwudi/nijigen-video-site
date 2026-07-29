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
 * Merge `Cookie` and `Accept-Language` into an existing `Vary` header value.
 *
 * Existing tokens are de-duplicated case-insensitively.  Original order and
 * spelling of pre-existing tokens are preserved; new tokens are appended.
 *
 * When `existingVary` already contains `*` (including as one of several
 * comma-separated tokens), the result is `*` alone — a wildcard already
 * covers every request header.
 *
 * @param existingVary - The current `Vary` value (may be empty).
 * @returns A comma-separated `Vary` value including the locale tokens.
 */
export function mergeVaryLocaleTokens(existingVary: string): string {
  // `Vary: *` (including as one comma-separated token among others) already
  // covers every request header; normalize to `*` by itself.
  if (existingVary.split(',').some((t) => t.trim() === '*')) {
    return '*'
  }
  return mergeVaryTokens(existingVary)
}

/**
 * Merge two `Vary` header values together (e.g. from event context and
 * response), de-duplicate case-insensitively, preserve wildcard semantics,
 * and append locale tokens (`Cookie`, `Accept-Language`).
 *
 * @param first - A `Vary` header value or `null`.
 * @param second - Another `Vary` header value or `null`.
 * @returns A comma-separated `Vary` value including the locale tokens.
 */
export function mergeVarySourcesWithLocale(
  first: string | null | undefined,
  second: string | null | undefined,
): string {
  const merged = [first, second].filter((v): v is string => v != null && v.length > 0).join(', ')
  return mergeVaryLocaleTokens(merged)
}

/**
 * Merge `Cookie` and `Accept-Language` into an existing `Vary` header value.
 *
 * Existing tokens are de-duplicated case-insensitively.  Original order and
 * spelling of pre-existing tokens are preserved; new tokens are appended.
 *
 * @param existingVary - The current `Vary` value (may be empty).
 * @returns A comma-separated `Vary` value including the locale tokens.
 */
function mergeVaryTokens(existingVary: string): string {
  const tokens: string[] = []
  const seen = new Set<string>()

  // Preserve existing tokens in their original order and spelling.
  if (existingVary.length > 0) {
    for (const raw of existingVary.split(',')) {
      const token = raw.trim()
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
