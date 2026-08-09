import { useState } from 'react'
import { Menu, Snowflake, Upload } from 'lucide-react'

import * as m from '../paraglide/messages'
import { cn } from '../lib/utils'
import { Button, buttonVariants } from './ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'
import { LanguageSwitcher } from './language-switcher'
import { ModeToggle } from './mode-toggle'

/** Resolve nav labels per render so SSR message calls follow the request locale. */
function navItems(): ReadonlyArray<{ href: string; label: string }> {
  return [
    { href: '#overview', label: m.header_nav_overview() },
    { href: '#components', label: m.header_nav_components() },
    { href: '#queue', label: m.header_nav_queue() },
  ]
}

/** Brand mark: a Snow Miku-inspired ice-blue tile with a snowflake. */
function BrandMark() {
  return (
    <a href="#overview" className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Snowflake aria-hidden="true" className="size-4" />
      </span>
      <span className="font-semibold tracking-tight">{m.app_name()}</span>
    </a>
  )
}

/** Desktop anchor navigation, hidden on small screens. */
function NavLinks() {
  return (
    <nav aria-label={m.header_nav_main_label()} className="hidden items-center gap-1 md:flex">
      {navItems().map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}

/** Mobile slide-over navigation with real anchor links. */
function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label={m.header_open_menu()}
          />
        }
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72" closeLabel={m.header_close_menu()}>
        <SheetHeader>
          <SheetTitle>{m.app_name()}</SheetTitle>
        </SheetHeader>
        <nav aria-label={m.header_nav_mobile_label()} className="flex flex-col gap-1 px-2">
          {navItems().map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

/** Sticky site header: brand, anchor nav, locale/theme switchers and upload CTA. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <MobileNav />
        <BrandMark />
        <NavLinks />
        <div className="ml-auto flex items-center gap-1.5">
          <LanguageSwitcher />
          <ModeToggle />
          <a
            href="#forms"
            className={cn(
              buttonVariants({ variant: 'default', size: 'sm' }),
              'hidden gap-1.5 sm:inline-flex',
            )}
          >
            <Upload aria-hidden="true" className="size-3.5" />
            {m.home_new_upload()}
          </a>
        </div>
      </div>
    </header>
  )
}
