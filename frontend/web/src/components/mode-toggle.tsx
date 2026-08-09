import { Moon, Sun } from 'lucide-react'

import * as m from '../paraglide/messages'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useTheme, type Theme } from './theme-provider'

/** Sun/Moon icon pair that cross-fades with the `.dark` class. */
function ThemeIcons() {
  return (
    <>
      <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </>
  )
}

/** Theme switcher dropdown with light/dark/system options. */
export function ModeToggle() {
  const { setTheme } = useTheme()
  // Resolved per render so SSR message calls follow the request locale.
  const themeOptions: ReadonlyArray<{ theme: Theme; label: string }> = [
    { theme: 'light', label: m.theme_light() },
    { theme: 'dark', label: m.theme_dark() },
    { theme: 'system', label: m.theme_system() },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={m.theme_toggle()} />}
      >
        <ThemeIcons />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeOptions.map((option) => (
          <DropdownMenuItem key={option.theme} onClick={() => setTheme(option.theme)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
