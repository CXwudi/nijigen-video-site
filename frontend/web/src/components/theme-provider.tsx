import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import { ScriptOnce } from '@tanstack/react-router'

import { createThemeStore } from './theme-store'

export type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  readonly children: React.ReactNode
  readonly defaultTheme?: Theme
  readonly storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

/** Inline script that applies the saved/system theme before React hydrates, preventing FOUC. */
function getThemeScript(storageKey: string, defaultTheme: Theme) {
  const key = JSON.stringify(storageKey)
  const fallback = JSON.stringify(defaultTheme)

  return `(function(){try{var t=localStorage.getItem(${key});if(t!=='light'&&t!=='dark'&&t!=='system'){t=${fallback}}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`
}

/** React context carrying the current theme and its setter. */
const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: 'system',
  setTheme: () => {},
})

/** Resolve a theme to its effective `dark`/`light` class, honoring the system preference. */
function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

/** Apply a theme to the document root (`.dark` class drives the CSS tokens). */
function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')

  const resolved = resolveTheme(theme)
  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

/**
 * Theme provider for TanStack Start. Uses `ScriptOnce` to set the theme
 * before hydration, then manages the `.dark` class on the document root.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
}: ThemeProviderProps) {
  // Create our own theme store based on localStorage
  const store = useMemo(
    () => createThemeStore(storageKey, defaultTheme),
    [storageKey, defaultTheme],
  )
  // Bridge React's state to our own theme store
  const savedTheme = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )
  const theme = savedTheme ?? defaultTheme
  const mounted = savedTheme !== null

  // Main effect for applying the theme, mostly triggered by the `setTheme` setter below
  // Is also triggered once after hydration.
  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
  }, [theme, mounted])

  // Main effect for responding to system preference changes, while selected theme is `system`.
  useEffect(() => {
    if (!mounted || theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme, mounted])

  const value = useMemo(
    () => ({
      theme,
      setTheme: store.setTheme,
    }),
    [theme, store],
  )

  return (
    <ThemeProviderContext value={value}>
      <ScriptOnce>{getThemeScript(storageKey, defaultTheme)}</ScriptOnce>
      {children}
    </ThemeProviderContext>
  )
}

/** Access the current theme and its setter. Must be used within ThemeProvider. */
export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
