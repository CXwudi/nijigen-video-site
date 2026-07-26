/**
 * Custom server-side locale resolution for Paraglide's `custom-requestLocale` strategy.
 *
 * The resolver enforces the approved locale contract:
 *  1. A valid manual `PARAGLIDE_LOCALE` cookie.
 *  2. The best supported locale from `Accept-Language`.
 *  3. Undefined (fall through to Paraglide's `baseLocale`, which is `zh-CN`).
 *
 * Simplified-versus-Traditional Chinese matching and `q=0` exclusion are handled
 * explicitly because Paraglide 2.22's built-in `preferredLanguage` strategy does not
 * map generic `zh` to `zh-CN` or exclude `q=0` ranges.
 */

import { cookieName, toLocale, type Locale } from '#/paraglide/runtime.js'

/**
 * Extract the `PARAGLIDE_LOCALE` cookie value from a request's Cookie header.
 *
 * Returns `undefined` when the header is absent or the cookie value is not a
 * valid locale, so the caller can fall through to header negotiation.
 *
 * @param cookieHeader - Raw `Cookie` header value from the request, or `null`.
 * @returns A validated locale if the cookie contains a valid preference.
 */
function readLocaleCookie(cookieHeader: string | null): Locale | undefined {
  if (!cookieHeader) return undefined
  const prefix = `${cookieName}=`
  const cookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix))
  if (!cookie) return undefined
  const value = cookie.slice(prefix.length)
  return toLocale(value)
}

/**
 * Match a BCP 47 language-range string against the supported Simplified Chinese
 * and English locales.
 *
 * The matching contract is approved in the i18n design spec and plan:
 *  - `en`, `en-US`, `en-GB`, etc. → `"en"`.
 *  - `zh`, `zh-CN`, `zh-SG`, `zh-Hans`, `zh-Hans-*` → `"zh-CN"`.
 *  - `zh-TW`, `zh-HK`, `zh-MO`, `zh-Hant`, `zh-Hant-*` are Traditional Chinese
 *    and do NOT match `"zh-CN"`.
 *  - `*` and every other unsupported range falls through to the next preference.
 *
 * @param range - Lower-cased primary language tag or full BCP 47 range.
 * @returns The matched locale, or `undefined` for unsupported ranges.
 */
function matchLanguageRange(range: string): Locale | undefined {
  // Exact or regional English.
  if (range === 'en' || /^en-/i.test(range)) {
    return 'en' as Locale
  }
  // Simplified Chinese: generic zh, zh-CN, zh-SG, zh-Hans, zh-Hans-*.
  if (
    range === 'zh' ||
    range === 'zh-cn' ||
    range === 'zh-sg' ||
    range === 'zh-hans' ||
    /^zh-hans-/i.test(range)
  ) {
    return 'zh-CN' as Locale
  }
  // Traditional Chinese and wildcard: no match.
  return undefined
}

/**
 * Parse a single Accept-Language segment and return its language range and
 * quality value, or `null` for a malformed segment.
 *
 * Per RFC 9110 §12.5.4 and RFC 4647 §2.1, each segment is:
 *
 *   language-range [ weight ]
 *   weight = OWS ";" OWS "q=" qvalue
 *   qvalue = ( "0" [ "." *3DIGIT ] ) / ( "1" [ "." *3"0" ] )
 *   OWS    = *( SP / HTAB )
 *
 * Segments with extra parameters (e.g. `;level=1`), malformed qvalues, or
 * empty language ranges are rejected as malformed.
 *
 * @param segment - A single comma-separated Accept-Language element.
 * @returns `{ range, q }` for a valid segment, or `null` for a malformed one.
 */
function parseLanguageSegment(segment: string): { range: string; q: number } | null {
  const trimmed = segment.trim()
  const semiIdx = trimmed.indexOf(';')

  let range: string
  let paramStr: string

  if (semiIdx === -1) {
    range = trimmed
    paramStr = ''
  } else {
    range = trimmed.slice(0, semiIdx).trim()
    paramStr = trimmed.slice(semiIdx) // starts with ';'
  }

  range = range.toLowerCase()
  if (range === '') return null

  if (paramStr === '') return { range, q: 1 }

  // Strip leading ';' and optional whitespace.
  const afterSemi = paramStr.slice(1).trimStart()

  // Only `q=` is accepted; any other parameter makes the range malformed.
  if (!afterSemi.startsWith('q=')) return null

  const qValueStr = afterSemi.slice(2) // content after `q=`

  // Strict qvalue validation per RFC 9110 §12.4.2.
  if (!/^(?:0(?:\.[0-9]{1,3})?|1(?:\.0{1,3})?)$/.test(qValueStr)) return null

  const q = Number(qValueStr)
  return { range, q }
}

/**
 * Parse an `Accept-Language` header value and return the best-matching locale.
 *
 * Language ranges are compared case-insensitively.  Quality `1` is assumed when
 * `q` is absent.  Ranges with `q=0` are excluded.  Malformed segments (extra
 * parameters, invalid qvalues) are silently skipped.  Ranges with equal quality
 * preserve source order.  Unsupported / Traditional-Chinese / wildcard ranges
 * are skipped.
 *
 * @param header - Raw `Accept-Language` header value, or `null`.
 * @returns The negotiated locale, or `undefined` if no range matches.
 */
function negotiateLocaleFromHeader(header: string | null): Locale | undefined {
  if (!header) return undefined

  const parsed = header
    .split(',')
    .map((segment) => parseLanguageSegment(segment))
    .filter((item): item is { range: string; q: number } => item !== null)
    // Exclude q=0 ranges explicitly.
    .filter((item) => item.q > 0)
    // Stable sort by descending quality (preserves source order for equal q).
    .sort((a, b) => b.q - a.q)

  for (const { range } of parsed) {
    // Per the approved contract, toLocale alone is insufficient because it
    // would map `zh` → undefined (our locales are `zh-CN` and `en`).  We
    // therefore apply the explicit matching function first.
    const matched = matchLanguageRange(range)
    if (matched) return matched
    // Fallback: try canonical `toLocale` for direct locale matches.
    const direct = toLocale(range)
    if (direct) return direct
  }

  return undefined
}

/**
 * Resolve a request-scoped locale for Paraglide's custom server strategy.
 *
 * Precedence:
 *  1. Valid `PARAGLIDE_LOCALE` cookie.
 *  2. Best supported `Accept-Language` match.
 *  3. `undefined` → Paraglide falls through to `baseLocale` (`zh-CN`).
 *
 * This function is intentionally synchronous and is designed to be used as the
 * `getLocale` handler of `defineCustomServerStrategy`.
 *
 * @param request - The incoming HTTP request.
 * @returns The resolved locale, or `undefined` to delegate to the next strategy.
 */
export function requestLocale(request: Request): Locale | undefined {
  // 1. Cookie preference.
  const cookieLocale = readLocaleCookie(request.headers.get('Cookie'))
  if (cookieLocale) return cookieLocale

  // 2. Accept-Language negotiation.
  const headerLocale = negotiateLocaleFromHeader(request.headers.get('Accept-Language'))
  if (headerLocale) return headerLocale

  // 3. Fall through to `baseLocale`.
  return undefined
}
