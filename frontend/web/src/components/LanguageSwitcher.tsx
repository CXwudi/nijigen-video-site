/**
 * Manual language switcher component.
 *
 * Renders an accessible native `<select>` styled with the existing daisyUI
 * baseline.  The active locale is controlled by Paraglide's `getLocale()`,
 * and changing the selection calls `setLocale(locale)` with the default
 * `reload: true`, which writes a `PARAGLIDE_LOCALE` host cookie and performs
 * a full document reload at the unchanged URL.
 *
 * ## Design decisions
 *
 * - Options use the language's self-name (`English`, `简体中文`) rather than
 *   country flags, matching the same-URL, language-agnostic URL policy.
 * - The option values are validated with Paraglide's `toLocale()` before
 *   calling `setLocale()` so a tampered DOM value cannot trigger an invalid
 *   locale switch.
 * - `setLocale` is called **without** `{ reload: false }` to keep the full
 *   document reload that synchronises `<html lang>`, metadata, and SSR state.
 * - The component does not mutate Router, Query, Zustand, or React Context.
 */

import { getLocale, setLocale, toLocale } from '#/paraglide/runtime.js'
import * as m from '#/paraglide/messages.js'

/** Self-named options for the supported locales. */
const LOCALE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '简体中文' },
] as const

/**
 * Accessible language switcher using a native `<select>`.
 *
 * The `<select>` is a controlled component whose value tracks
 * `getLocale()`.  On user change the selected value is validated
 * through `toLocale()` before `setLocale()` triggers a full document
 * reload with the new preference cookie.
 */
export function LanguageSwitcher() {
  const currentLocale = getLocale()

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value
    const validated = toLocale(selected)
    if (validated && validated !== currentLocale) {
      setLocale(validated)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-switcher" className="text-sm font-medium">
        {m.language_switcher_label()}
      </label>
      <select
        id="language-switcher"
        className="select select-bordered select-sm"
        value={currentLocale}
        onChange={handleChange}
        aria-label={m.language_switcher_label()}
      >
        {LOCALE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
