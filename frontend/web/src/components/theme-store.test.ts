import { afterEach, describe, expect, it, vi } from 'vitest'

import { createThemeStore } from './theme-store'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createThemeStore', () => {
  it('provides a server snapshot without accessing browser storage', () => {
    vi.stubGlobal('localStorage', undefined)

    expect(createThemeStore('theme', 'system').getServerSnapshot()).toBeNull()
  })

  it.each(['light', 'dark', 'system'] as const)('restores the saved %s preference', (theme) => {
    const getItem = vi.fn<() => string>(() => theme)
    vi.stubGlobal('localStorage', { getItem })

    expect(createThemeStore('custom-theme', 'light').getSnapshot()).toBe(theme)
    expect(getItem).toHaveBeenCalledWith('custom-theme')
  })

  it.each([null, 'invalid'])('uses the default for a %s preference', (stored) => {
    vi.stubGlobal('localStorage', { getItem: () => stored })

    expect(createThemeStore('theme', 'dark').getSnapshot()).toBe('dark')
  })

  it('persists selections before notifying subscribers and supports unsubscribing', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
    const store = createThemeStore('custom-theme', 'system')
    const listener = vi.fn<typeof store.getSnapshot>(() => store.getSnapshot())
    const unsubscribe = store.subscribe(listener)

    store.setTheme('dark')

    expect(values.get('custom-theme')).toBe('dark')
    expect(listener).toHaveReturnedWith('dark')

    unsubscribe()
    store.setTheme('light')

    expect(store.getSnapshot()).toBe('light')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
