/**
 * Custom TanStack Start client entry with Paraglide hydration locale override.
 *
 * The default entry hydrates `<StartClient />` inside `<StrictMode>` using
 * `startTransition`.  This custom entry installs the locale override first so
 * that the browser reads the SSR-rendered `<html lang>` before any React
 * component or message function calls `getLocale()`.
 *
 * @see https://tanstack.com/start/latest/docs/framework/react/guide/client-entry-point
 */

import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'

import { installClientLocaleOverride } from '#/i18n/client-locale.js'

// Override `getLocale()` before the React tree mounts so hydration reuses the
// server-rendered locale.  Must happen synchronously before `hydrateRoot`.
installClientLocaleOverride()

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})
