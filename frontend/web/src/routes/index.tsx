import { createFileRoute } from '@tanstack/react-router'
import * as m from '#/paraglide/messages.js'

import { LanguageSwitcher } from '#/components/LanguageSwitcher.js'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  /** Queue items keyed by language-neutral identifiers. */
  const queueItems = [
    { id: 'anime_clips', labelFn: m.home_stat_anime_clips, count: 0 },
    { id: 'character_edits', labelFn: m.home_stat_character_edits, count: 0 },
    { id: 'uploads_waiting', labelFn: m.home_stat_uploads_waiting, count: 0 },
  ]

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-base-300 pb-5">
          <div>
            <p className="text-sm font-medium text-primary">{m.app_name()}</p>
            <h1 className="mt-1 text-2xl font-semibold">{m.home_heading()}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button className="btn btn-primary">{m.home_new_upload()}</button>
          </div>
        </header>

        <div className="stats stats-vertical border border-base-300 bg-base-100 shadow-sm md:stats-horizontal">
          {queueItems.map((item) => (
            <div className="stat" key={item.id}>
              <div className="stat-title">{item.labelFn()}</div>
              <div className="stat-value text-primary">{item.count}</div>
            </div>
          ))}
        </div>

        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="card-title">{m.home_review_queue_heading()}</h2>
                <p className="mt-1 text-sm text-base-content/70">{m.home_review_queue_empty()}</p>
              </div>
              <span className="badge badge-info">{m.home_review_queue_badge_empty()}</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}
