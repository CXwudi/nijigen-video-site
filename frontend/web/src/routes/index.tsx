import { createFileRoute, useRouter } from '@tanstack/react-router'

import * as m from '../paraglide/messages'
import { setLocale, localizeHref, getLocale } from '../paraglide/runtime'

/** Language switcher component. Uses Paraglide's `setLocale` to switch locale. */
function LanguageSwitcher() {
  const router = useRouter()
  const currentPath = router.state.location.pathname
  const currentLocale = getLocale()

  const languages = [
    { code: 'zh-CN' as const, label: '中文' },
    { code: 'en' as const, label: 'English' },
  ]

  return (
    <details className="dropdown dropdown-end" aria-label={m.language_switcher_label()}>
      <summary className="btn btn-ghost btn-sm gap-2" aria-haspopup="menu">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        <span>{m.language_switcher_label()}</span>
      </summary>
      <ul className="menu dropdown-content z-1 w-40 rounded-box bg-base-100 p-2 shadow" role="menu">
        {languages.map((lang) => (
          <li key={lang.code} role="none">
            <a
              role="menuitem"
              href={localizeHref(currentPath, { locale: lang.code })}
              aria-current={currentLocale === lang.code ? 'true' : undefined}
              onClick={(e) => {
                e.preventDefault()
                setLocale(lang.code)
              }}
            >
              {lang.label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const queueItems = [
    { label: m.home_stat_anime_clips(), count: 0 },
    { label: m.home_stat_character_edits(), count: 0 },
    { label: m.home_stat_uploads_waiting(), count: 0 },
  ]

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-base-300 pb-5">
          <div>
            <p className="text-sm font-medium text-primary">{m.app_name()}</p>
            <h1 className="mt-1 text-2xl font-semibold">{m.home_heading()}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button className="btn btn-primary">{m.home_new_upload()}</button>
          </div>
        </header>

        <div className="stats stats-vertical border border-base-300 bg-base-100 shadow-sm md:stats-horizontal">
          {queueItems.map((item) => (
            <div className="stat" key={item.label}>
              <div className="stat-title">{item.label}</div>
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
