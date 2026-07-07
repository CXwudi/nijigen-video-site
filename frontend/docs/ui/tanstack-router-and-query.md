# Guidance of integrating TanStack Router and Query

This is an in-depth guidance of TanStack Router and Query Integration, based on [TanStack Router and Query — TkDodo's blog](https://tkdodo.eu/blog/tan-stack-router-and-query).
Recommend both AI and Human to understand it fully

## TanStack Router and Query Combination Comparasion Table

Loader + React Hook Combination Table

Assumptions in this table:

- `q` means shared `queryOptions(...)`.
- SSR means TanStack Start / TanStack Router SSR behavior.
- Blocking means whether the loader blocks route rendering / SSR rendering.
- A Suspense hook can still block or stream its own Suspense boundary even if the loader does not block.

Core rule:

> **Returning or awaiting a query promise in a loader blocks the loader. Fire-and-forget does not.**

| Loader function | React function | SSR effect | Prefetching effect | Blocking? | Ideal use case | Notes |
|---|---|---|---|---|---|---|
| `return queryClient.ensureQueryData(q)` | `useSuspenseQuery(q)` | Strong SSR path. Loader ensures data is in Query cache before route render. | Good route-level preload. | **Blocks loader / SSR if data is missing.** | Main route data: post detail, product detail, dashboard shell, auth/session user. | This is usually the clean default. |
| `return queryClient.fetchQuery(q)` | `useSuspenseQuery(q)` | Strong SSR path, but more freshness-oriented. | Good route-level preload. | **Blocks if data is missing or stale according to `staleTime`.** | Critical data where stale cache is not acceptable. | Prefer when you need stricter freshness than `ensureQueryData`. |
| `void queryClient.ensureQueryData(q)` | `useSuspenseQuery(q)` | Starts query without blocking loader. Component Suspense may wait/stream if data is not ready. | Good early start. | **Loader: no. Suspense boundary: yes, if missing.** | Deferred but SSR-friendly route sections. | Useful when shell can render first. |
| `void queryClient.fetchQuery(q)` | `useSuspenseQuery(q)` | Starts freshness-aware fetch without blocking loader. Component Suspense may wait/stream. | Good early start. | **Loader: no. Suspense boundary: yes, if missing.** | Deferred SSR section that should refresh stale data. | Good with nested Suspense. |
| `void queryClient.prefetchQuery(q)` | `useQuery(q)` | Loader can warm/hydrate cache, but `useQuery` is mostly client-side/non-Suspense consumption. | Excellent optional-data preload. | **Loader: no. React: no Suspense.** | Comments, recommendations, related items, sidebars, below-the-fold widgets. | Very common for non-critical data. |
| `void queryClient.prefetchQuery(q)` | `useSuspenseQuery(q)` | Starts query early without blocking loader; Suspense boundary waits/streams if data is not ready. | Good early preload. | **Loader: no. Suspense boundary: yes, if missing.** | Optional route section that should use Suspense UX. | Good with nested `<Suspense fallback={...}>`. |
| `return queryClient.prefetchQuery(q)` | `useQuery(q)` | SSR waits for prefetch to finish, but loader gets no data and prefetch does not throw to caller. | Cache warmed before render/hydration. | **Blocks loader / SSR.** | Rare. | Usually awkward. If blocking anyway, prefer `ensureQueryData` or `fetchQuery`. |
| `return queryClient.prefetchQuery(q)` | `useSuspenseQuery(q)` | SSR waits for prefetch to finish; component likely finds cache ready. | Cache warmed before render. | **Blocks loader / SSR.** | Rare. | Awkward combo: blocking behavior without useful return/error semantics. |
| No loader | `useSuspenseQuery(q)` | Query starts during component render. Can SSR/stream, but starts later than loader-based fetching. | No route-level intent preload. | **Suspense boundary blocks/streams.** | Simple pages, leaf components, less concern about waterfalls. | Fine, but loader can start earlier. |
| No loader | `useQuery(q)` | No SSR Suspense fetch from the hook. Fetches after hydration / on client. | No route-level preload. | **No SSR block. No Suspense.** | Client-only or low-priority data. | Simplest client-side query usage. |
| `return queryClient.ensureQueryData(q)` | `Route.useLoaderData()` | SSR works as route loader data; Query cache is also filled. | Route preloading works. | **Blocks loader / SSR.** | Usually avoid when intentionally using Query. | Component is not observing Query cache. Prefer `useSuspenseQuery(q)` or `useQuery(q)`. |

## Common Combinations - Decision Guide

### Need data in the initial HTML?

Use:

```tsx
loader: ({ context, params }) => {
  return context.queryClient.ensureQueryData(postQuery(params.postId))
}

function PostPage() {
  const { postId } = Route.useParams()
  const { data } = useSuspenseQuery(postQuery(postId))

  return <PostView post={data} />
}
```

Use for:

- main page content
- SEO-relevant content
- route-critical data
- page title/detail records
- auth/session data needed to choose the page

### Need fresh-enough data before SSR render?

Use:

```tsx
loader: ({ context, params }) => {
  return context.queryClient.fetchQuery(postQuery(params.postId))
}
```

Use for:

- checkout data
- permission-sensitive data
- rapidly changing important data
- data where stale display would be misleading

### Can render the shell first?

Use:

```tsx
loader: ({ context, params }) => {
  void context.queryClient.prefetchQuery(commentsQuery(params.postId))
}
```

Then consume with `useQuery`:

```tsx
function CommentsSection() {
  const { postId } = Route.useParams()
  const { data, isPending } = useQuery(commentsQuery(postId))

  if (isPending) return <CommentsSkeleton />

  return <Comments comments={data} />
}
```

Use for:

- comments
- recommendations
- related products
- analytics widgets
- below-the-fold content

### Want non-blocking SSR plus Suspense streaming?

Use a nested Suspense boundary:

```tsx
loader: ({ context, params }) => {
  void context.queryClient.fetchQuery(commentsQuery(params.postId))
}

function PostPage() {
  return (
    <>
      <PostHeader />

      <Suspense fallback={<CommentsSkeleton />}>
        <CommentsSection />
      </Suspense>
    </>
  )
}

function CommentsSection() {
  const { postId } = Route.useParams()
  const { data: comments } = useSuspenseQuery(commentsQuery(postId))

  return <Comments comments={comments} />
}
```

Use when:

```text
The whole route should not wait,
but this section can suspend or stream independently.
```

## Blocking vs Non-blocking in TanStack Router

The critical distinction is often not only the function name, but whether the promise is returned or awaited.

### Blocking

```tsx
loader: ({ context, params }) => {
  return context.queryClient.ensureQueryData(postQuery(params.postId))
}
```

or:

```tsx
loader: async ({ context, params }) => {
  await context.queryClient.ensureQueryData(postQuery(params.postId))
}
```

Meaning:

```text
Route loader starts
  ↓
Query must resolve if data is missing
  ↓
Route can render
```

Use this for data the route cannot meaningfully render without.

### Non-blocking / fire-and-forget

```tsx
loader: ({ context, params }) => {
  void context.queryClient.prefetchQuery(commentsQuery(params.postId))
}
```

Meaning:

```text
Route loader starts query
  ↓
Route does not wait
  ↓
Component renders
  ↓
Component handles pending state or Suspense boundary
```

Use this for optional, below-the-fold, or secondary data.

## Difference between TanStack Query methods

### `ensureQueryData(q)`

Mental model:

```text
Give me data if it exists in cache.
If not, fetch it.
```

Behavior:

- Returns `Promise<TData>`.
- If cache has data, returns cached data.
- If cache has no data, fetches.
- By default, can return stale data immediately.
- Can use `revalidateIfStale: true` to return stale data and also refetch in the background.

Example:

```tsx
await queryClient.ensureQueryData(postQuery(postId))
```

Use when:

- You need data to exist before continuing.
- Stale data is acceptable for initial render.
- You want a cache-first style loader.

### `fetchQuery(q)`

Mental model:

```text
Give me data, but respect freshness rules.
If cached data is stale, fetch fresh data.
```

Behavior:

- Returns `Promise<TData>`.
- Returns cached data only if fresh enough according to `staleTime`.
- Fetches if missing or stale.
- Throws if fetch fails.

Example:

```tsx
await queryClient.fetchQuery(postQuery(postId))
```

Use when:

- Data is critical.
- Stale data is not acceptable.
- SSR should wait for fresh-enough data.

### `prefetchQuery(q)`

Mental model:

```text
Warm the cache. I do not need the data here.
```

Behavior:

- Returns `Promise<void>`.
- Does not return data.
- Does not throw errors to the caller in the same way as `fetchQuery`.
- Uses freshness rules to decide whether to fetch.

Example:

```tsx
void queryClient.prefetchQuery(commentsQuery(postId))
```

Use when:

- Data is optional.
- Data may be needed soon.
- You want to start fetching during route preload or navigation.
- The component can handle loading state itself.

## References

Below are links that worth to be check

### Original article

- [TanStack Router and Query — TkDodo's blog](https://tkdodo.eu/blog/tan-stack-router-and-query)

### TanStack Router / TanStack Start-related docs

- [TanStack Router Docs — Data Loading](https://tanstack.com/router/latest/docs/guide/data-loading)
- [TanStack Router Docs — Preloading](https://tanstack.com/router/latest/docs/guide/preloading)
- [TanStack Router Docs — External Data Loading](https://tanstack.com/router/latest/docs/guide/external-data-loading)
- [TanStack Router Docs — TanStack Query Integration](https://tanstack.com/router/latest/docs/integrations/query)

### TanStack Query API references

- [TanStack Query Docs — QueryClient](https://tanstack.com/query/latest/docs/reference/QueryClient)
- [TanStack Query React Docs — useQuery](https://tanstack.com/query/latest/docs/framework/react/reference/useQuery)
- [TanStack Query React Docs — useSuspenseQuery](https://tanstack.com/query/latest/docs/framework/react/reference/useSuspenseQuery)
- [TanStack Query React Docs — usePrefetchQuery](https://tanstack.com/query/latest/docs/framework/react/reference/usePrefetchQuery)

### TanStack Query guides

- [TanStack Query React Docs — Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [TanStack Query React Docs — Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
- [TanStack Query React Docs — Prefetching & Router Integration](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching)
- [TanStack Query React Docs — Server Rendering & Hydration](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
