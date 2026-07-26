/**
 * HTML response header helpers for locale-aware SSR caching.
 *
 * The server entry applies these functions to every HTML response so that
 * a shared cache cannot serve one user's locale to another user.  Non-HTML
 * responses (static assets, API) are passed through unchanged.
 */

/**
 * HTTP header tokens that must be listed in `Vary` so intermediate caches
 * partition their store by the negotiated locale.
 */
const LOCALE_VARY_TOKENS = ['Cookie', 'Accept-Language'] as const

/**
 * Apply locale-aware cache headers to an HTML `Response`.
 *
 * When `Content-Type` contains `text/html` (case-insensitive):
 *  - Set `Cache-Control: private, no-store` to prevent shared caching.
 *  - Merge `Cookie` and `Accept-Language` into `Vary` with case-insensitive
 *    de-duplication.  Existing tokens (e.g. `Accept-Encoding`) are preserved
 *    in their original order and spelling.
 *  - `Vary: *` is left untouched because it already varies on every header.
 *
 * Non-HTML responses are returned unchanged.  The original status, status
 * text, headers, and body stream are preserved.
 *
 * @param response - The SSR response returned by the framework handler.
 * @returns A new `Response` with locale-aware headers, or the original.
 */
export function applyHtmlLocaleHeaders(response: Response): Response {
  const contentType = response.headers.get('Content-Type')
  if (!contentType || !/text\/html/i.test(contentType)) {
    return response
  }

  const headers = new Headers(response.headers)

  // Cache-control: prevent shared caches from serving another user's locale.
  headers.set('Cache-Control', 'private, no-store')

  // Vary: merge locale-aware tokens.
  // `Vary: *` (including as one comma-separated token among others) already
  // covers every request header; normalize to `*` by itself.
  const rawVary = headers.get('Vary')
  if (rawVary != null && rawVary.split(',').some((t) => t.trim() === '*')) {
    headers.set('Vary', '*')
  } else {
    headers.set('Vary', mergeVaryTokens(rawVary ?? ''))
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
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
