import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'

import type { RouterContext } from '../router'
import appCss from '../styles.css?url'
import { getLocale } from '../paraglide/runtime'
import { ThemeProvider } from '../components/theme-provider'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Nijigen Video',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

/** SSR document shell: html/head/body with the theme provider. */
function RootDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the theme script sets .dark before hydration.
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="theme">
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
