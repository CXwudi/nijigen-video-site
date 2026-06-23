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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <p className="text-sm font-medium text-cyan-300">Nijigen Video</p>
            <h1 className="mt-1 text-2xl font-semibold">Workspace</h1>
          </div>
          <button className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">
            New upload
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {queueItems.map((item) => (
            <article
              className="rounded-md border border-slate-800 bg-slate-900 p-5"
              key={item.label}
            >
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold">{item.count}</p>
            </article>
          ))}
        </div>

        <section className="rounded-md border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Review queue</h2>
              <p className="mt-1 text-sm text-slate-400">
                No videos are waiting for review yet.
              </p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">
              Empty
            </span>
          </div>
        </section>
      </section>
    </main>
  )
}
