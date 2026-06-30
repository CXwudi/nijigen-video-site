import { Button } from '@base-ui/react/button'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const queueItems = [
    { label: 'Anime clips', count: 0 },
    { label: 'Character edits', count: 0 },
    { label: 'Uploads waiting', count: 0 },
  ]

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-base-300 pb-5">
          <div>
            <p className="text-sm font-medium text-primary">Nijigen Video</p>
            <h1 className="mt-1 text-2xl font-semibold">Workspace</h1>
          </div>
          <Button className="btn btn-primary">New upload</Button>
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
                <h2 className="card-title">Review queue</h2>
                <p className="mt-1 text-sm text-base-content/70">
                  No videos are waiting for review yet.
                </p>
              </div>
              <span className="badge badge-info">Empty</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}
