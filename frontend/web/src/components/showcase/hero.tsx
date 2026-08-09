import { ArrowDown, Upload } from 'lucide-react'

import * as m from '../../paraglide/messages'
import { buttonVariants } from '../ui/button'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'

/** Hero section: badge, headline, tagline, CTAs and workspace stats. */
export function Hero() {
  // Resolved per render so SSR message calls follow the request locale.
  const stats = [
    { label: m.home_stat_anime_clips(), value: '128' },
    { label: m.home_stat_character_edits(), value: '64' },
    { label: m.home_stat_uploads_waiting(), value: '12' },
  ]

  return (
    <section id="overview" className="scroll-mt-20 border-b bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24">
        <Badge className="gap-1.5">{m.home_hero_badge()}</Badge>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{m.home_heading()}</h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
            {m.home_tagline()}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <a href="#forms" className={cn(buttonVariants({ size: 'lg' }), 'gap-1.5')}>
            <Upload aria-hidden="true" className="size-4" />
            {m.home_new_upload()}
          </a>
          <a
            href="#components"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-1.5')}
          >
            {m.home_explore_components()}
            <ArrowDown aria-hidden="true" className="size-4" />
          </a>
        </div>
        <p className="text-xs text-muted-foreground">{m.home_stats_note()}</p>
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="shadow-sm">
              <CardContent className="flex flex-col items-center gap-1 p-5">
                <span className="text-2xl font-semibold tracking-tight text-primary">
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
