import type { Theme } from './theme-provider'

/** Adapt the persisted theme to React's external-store subscription API. */
export function createThemeStore(storageKey: string, defaultTheme: Theme) {
  const listeners = new Set<() => void>()

  return {
    /** Read the saved preference, falling back when it is missing or invalid. */
    getSnapshot(): Theme {
      const stored = localStorage.getItem(storageKey)
      return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : defaultTheme
    },
    /** Defer browser theme synchronization until hydration has finished. */
    getServerSnapshot(): null {
      return null
    },
    /** Subscribe to preference changes made through this provider. */
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** Persist a selection before notifying React to read the updated snapshot. */
    setTheme(theme: Theme) {
      localStorage.setItem(storageKey, theme)
      listeners.forEach((listener) => listener())
    },
  }
}
