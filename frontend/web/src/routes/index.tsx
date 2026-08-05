import { Button } from '@base-ui/react/button'
import { Menu } from '@base-ui/react/menu'
import { createFileRoute } from '@tanstack/react-router'

import * as m from '../paraglide/messages'
import { getLocale, setLocale } from '../paraglide/runtime'

/** Language switcher. */
function LanguageSwitcher() {
  const currentLocale = getLocale()

  const languages = [
    { code: 'zh-CN' as const, label: '中文' },
    { code: 'en' as const, label: 'English' },
  ]

  return (
    <Menu.Root>
      <Menu.Trigger className="btn btn-ghost btn-sm gap-sm">
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
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4}>
          <Menu.Popup className="w-40 rounded-box bg-base-100 p-sm shadow">
            <Menu.RadioGroup value={currentLocale} onValueChange={(value) => setLocale(value)}>
              {languages.map((lang) => (
                <Menu.RadioItem
                  key={lang.code}
                  value={lang.code}
                  closeOnClick
                  className="flex cursor-pointer select-none items-center gap-sm rounded-md px-sm py-1.5 text-sm text-base-content data-highlighted:bg-base-200"
                >
                  <Menu.RadioItemIndicator
                    keepMounted
                    className="h-4 w-4 opacity-0 data-checked:opacity-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Menu.RadioItemIndicator>
                  {lang.label}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
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
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-lg px-lg py-lg">
        <header className="flex flex-wrap items-center justify-between gap-lg border-b border-base-300 pb-lg">
          <div>
            <p className="text-sm font-medium text-primary">{m.app_name()}</p>
            <h1 className="mt-xs text-2xl font-semibold">{m.home_heading()}</h1>
          </div>
          <div className="flex items-center gap-sm">
            <LanguageSwitcher />
            <Button className="btn btn-primary">{m.home_new_upload()}</Button>
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
            <div className="flex flex-wrap items-center justify-between gap-md">
              <div>
                <h2 className="card-title">{m.home_review_queue_heading()}</h2>
                <p className="mt-xs text-sm text-base-content/70">{m.home_review_queue_empty()}</p>
              </div>
              <span className="badge badge-info">{m.home_review_queue_badge_empty()}</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}
