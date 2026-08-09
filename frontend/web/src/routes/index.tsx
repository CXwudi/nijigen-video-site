import { createFileRoute } from '@tanstack/react-router'

import * as m from '../paraglide/messages'
import { SiteHeader } from '../components/site-header'
import { ButtonsCard } from '../components/showcase/buttons-card'
import { FormsCard } from '../components/showcase/forms-card'
import { Hero } from '../components/showcase/hero'
import { MenuCard } from '../components/showcase/menu-card'
import { PeopleCard } from '../components/showcase/people-card'
import { QueueCard } from '../components/showcase/queue-card'
import { TabsCard } from '../components/showcase/tabs-card'

/** Section heading used above the component grid. */
function ComponentsIntro() {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-2xl font-semibold tracking-tight">{m.components_heading()}</h2>
      <p className="text-sm text-muted-foreground">{m.components_description()}</p>
    </div>
  )
}

/** Minimal footer. */
function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-1 px-4 py-8 text-center sm:px-6">
        <p className="text-xs text-muted-foreground">{m.footer_note()}</p>
      </div>
    </footer>
  )
}

export const Route = createFileRoute('/')({
  component: Home,
})

/** Home page composing the showcase sections. */
function Home() {
  return (
    <main className="min-h-svh">
      <SiteHeader />
      <Hero />
      <section
        id="components"
        className="mx-auto flex w-full max-w-6xl scroll-mt-20 flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16"
      >
        <ComponentsIntro />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ButtonsCard />
          <FormsCard />
          <TabsCard />
          <PeopleCard />
          <MenuCard />
          <QueueCard />
        </div>
      </section>
      <Footer />
    </main>
  )
}
