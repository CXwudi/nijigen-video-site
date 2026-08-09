import { Check, Languages } from 'lucide-react'

import * as m from '../paraglide/messages'
import { getLocale, setLocale } from '../paraglide/runtime'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

const languages = [
  { code: 'zh-CN' as const, label: '中文' },
  { code: 'en' as const, label: 'English' },
]

/**
 * Language switcher. Uses Paraglide's `setLocale`, which navigates to the
 * locale-prefixed URL of the current page (see `paraglide.config.ts`).
 */
export function LanguageSwitcher() {
  const currentLocale = getLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            aria-label={m.language_switcher_label()}
          />
        }
      >
        <Languages aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">{m.language_switcher_label()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            disabled={currentLocale === lang.code}
            onClick={() => setLocale(lang.code)}
          >
            {lang.label}
            {currentLocale === lang.code && <Check aria-hidden="true" className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
