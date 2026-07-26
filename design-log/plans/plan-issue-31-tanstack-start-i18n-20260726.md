# Issue 31 TanStack Start i18n Implementation Plan

## Goal

Add English and Simplified Chinese localization for frontend-owned UI strings while preserving same-URL TanStack Start SSR. Each document must render and hydrate in one request-resolved locale without language flicker, and only a manual language change may persist a locale cookie.

## Context

GitHub issue #31 and its locked design comment define the product behavior. The approved design spec is [`../spec/spec-issue-31-tanstack-start-i18n-20260726.md`](../spec/spec-issue-31-tanstack-start-i18n-20260726.md), which is the source of truth for this plan.

Plan review found that Paraglide 2.23.0's built-in `preferredLanguage` strategy does not map a generic `zh` preference upward to the supported regional locale `zh-CN` and does not exclude `q=0` ranges. The user therefore approved one implementation refinement beyond the spec's plugin snippet: a custom server strategy must preserve cookie precedence, perform the explicit language matching below, and leave Paraglide's built-in `cookie` strategy enabled for manual browser persistence.

At planning time, `frontend/web/` has one TanStack Start route, a hard-coded `<html lang="en">`, static English metadata and UI strings, Node-environment Vitest tests, and no i18n dependency or custom server/client entry. TanStack Router creates a fresh router and Query client for each server render; the i18n setup must preserve that lifecycle while Paraglide keeps locale state request-scoped.

The locale contract is:

1. A valid manually created `PARAGLIDE_LOCALE` cookie.
2. The best supported locale from `Accept-Language`.
3. The `zh-CN` base locale.

Only frontend-owned UI, metadata, validation/status text, and accessibility labels are in scope. Translated URLs, multilingual video fields or domain content, independent multilingual SEO, backend i18n, automatic persistence of detected locales, and preservation of unsaved in-memory state during switching remain out of scope.

Implementation succeeds when production SSR returns the correct locale and translations for the resolution matrix, hydration reuses the server locale without warnings or visible replacement, manual switching reloads the unchanged URL and creates the preference cookie, HTML responses are cache-safe, concurrent requests remain isolated, generated code stays uncommitted, and all frontend checks pass.

## Approach

Use pinned Paraglide JS compiler output as the typed message/runtime boundary, with committed inlang settings and JSON catalogs as translation source. Register a small request-locale strategy for cookie and `Accept-Language` negotiation, wrap the standard TanStack Start server handler in Paraglide middleware, serialize the result through `<html lang>`, and install the browser locale override before React hydration. Add the language switcher only after the compiler, server, and hydration boundaries are independently verified.

## Runtime Flow

```mermaid
sequenceDiagram
  participant Browser
  participant Paraglide as Paraglide middleware
  participant Start as TanStack Start SSR
  participant React as Browser hydration

  Browser->>Paraglide: GET same URL with Cookie and Accept-Language
  Paraglide->>Paraglide: Resolve request-local locale
  Paraglide->>Start: Render inside AsyncLocalStorage context
  Start-->>Browser: Localized HTML and html lang
  Browser->>React: Read and validate html lang before hydrateRoot
  React->>React: Hydrate with the same locale
  Browser->>Browser: Manual setLocale writes cookie and reloads same URL
```

## File and Boundary Map

- `frontend/web/project.inlang/settings.json` and `frontend/web/messages/*.json`: committed configuration and translation source of truth.
- `frontend/web/src/paraglide/`: ignored compiler output; never edit or commit it.
- `frontend/web/vite.config.ts` and `frontend/web/package.json`: Paraglide Vite integration and clean-checkout generation commands.
- `frontend/web/src/server.ts`: request-scoped locale middleware and final HTML response-header boundary.
- `frontend/web/src/i18n/request-locale.ts`: manual-cookie parsing and explicit `Accept-Language` negotiation for the custom server strategy.
- `frontend/web/src/i18n/html-response.ts`: small testable helper for HTML cache headers and `Vary` merging.
- `frontend/web/src/client.tsx` and `frontend/web/src/i18n/client-locale.ts`: pre-hydration locale handoff.
- `frontend/web/src/routes/__root.tsx`: localized document language, direction, and metadata.
- `frontend/web/src/routes/index.tsx` and `frontend/web/src/components/LanguageSwitcher.tsx`: translated initial UI and manual language selection.
- `frontend/web/src/i18n/*.test.ts`: locale resolution, request isolation, cache headers, hydration-locale validation, and catalog behavior.
- `frontend/docs/`: human-authored usage and maintenance guidance requested after the implementation behavior is verified.

## Steps

When executing the plan:

- Mark `[ ]` boxes as completed `[x]` while this plan has not been merged. After it is merged, treat it as immutable and record later evidence or changes in issue #31 or a new design-log document.
- After the implementation and verification of each step, spawn a subagent to review the code and fix valuable feedback.
- Before moving to the next step, commit the changes.

### [ ] Step 1: Establish the Paraglide compiler and catalog boundary

Add the pinned dependency, committed translation inputs, generated-output policy, and clean-checkout generation lifecycle without changing runtime locale behavior yet.

#### Step 1 implementation

1. From the `frontend/` pnpm workspace, add exact dev dependency `@inlang/paraglide-js@2.23.0` to `web` and update `frontend/pnpm-lock.yaml`. Do not introduce a version range.
2. Create `frontend/web/project.inlang/settings.json` with:
   - schema `https://inlang.com/schema/project-settings`;
   - base locale `zh-CN` and locales ordered as `["zh-CN", "en"]`;
   - pinned `@inlang/plugin-message-format@4.4.0` and `@inlang/plugin-m-function-matcher@2.2.9` CDN modules;
   - `./messages/{locale}.json` as the message path pattern.
3. Create matching `messages/zh-CN.json` and `messages/en.json` catalogs. Use semantic identifiers rather than source-sentence identifiers. Keep the initial catalogs limited to the strings rendered by the current homepage and root metadata, plus the language switcher's required accessible label:

   | Message identifier | English | Simplified Chinese |
   | --- | --- | --- |
   | `app_name` | Nijigen Video | Nijigen Video |
   | `home_heading` | Workspace | 工作区 |
   | `home_new_upload` | New upload | 新建上传 |
   | `home_stat_anime_clips` | Anime clips | 动画片段 |
   | `home_stat_character_edits` | Character edits | 角色剪辑 |
   | `home_stat_uploads_waiting` | Uploads waiting | 待上传 |
   | `home_review_queue_heading` | Review queue | 审核队列 |
   | `home_review_queue_empty` | No videos are waiting for review yet. | 暂无视频等待审核。 |
   | `home_review_queue_badge_empty` | Empty | 空 |
   | `language_switcher_label` | Language | 语言 |

   Do not add messages for future navigation, forms, validation, upload workflows, or other planned UI until that UI exists.

4. Register `paraglideVitePlugin` in `vite.config.ts` with project `./project.inlang`, output `./src/paraglide`, TypeScript declarations enabled, `message-modules` output, and strategy `["custom-requestLocale", "cookie", "baseLocale"]`. Keep the default cookie name and AsyncLocalStorage; do not add the built-in `preferredLanguage` or `url` strategies, localized route rewrites, or a custom client strategy.
5. Add an `i18n:compile` command matching the Vite configuration, including `--strategy custom-requestLocale cookie baseLocale` and declaration emission. Prefix the existing `typecheck` and `test` scripts with `pnpm i18n:compile` so either command explicitly generates its prerequisite before Vite has run; keep production generation owned by the Vite plugin during `build`.
6. Add `/web/src/paraglide/` to `frontend/.gitignore`. Also ignore `src/paraglide/**` in the web app's Oxlint and Oxfmt configurations so generated code is neither linted nor reformatted.
7. Treat the generated directory as disposable output. Imports may target it, but source code, reviews, and translation edits must target the committed catalogs and inlang settings.

#### Step 1 verification

- Run `pnpm --dir frontend install --frozen-lockfile`.
- Confirm `pnpm --dir frontend --filter web i18n:compile` emits JavaScript and `.d.ts` files under `frontend/web/src/paraglide/`.
- Confirm `mise //frontend:typecheck` succeeds with the generated directory initially absent. Remove only that verified compiler-owned output again, then confirm `mise //frontend:test` independently generates its prerequisite and succeeds.
- Run `mise //frontend:build` and confirm Vite generation succeeds in the production build path used by Docker.
- Run `git check-ignore frontend/web/src/paraglide/runtime.js` and expect the repository-owned ignore rule to match.
- Run `git status --short --untracked-files=all` and confirm no generated Paraglide file appears.

#### Step 1 notes

- Before removing generated output for the clean-checkout check, resolve and verify the exact ignored target. Do not use a broad `git clean` command.
- The two catalogs must always have the same message identifiers; Paraglide compilation and type checking are the first consistency checks.

### [ ] Step 2: Add request-scoped SSR locale resolution and cache-safe HTML responses

Run every TanStack Start render inside Paraglide's locale context and apply locale-aware cache headers without affecting static assets.

**Depends on:** Step 1

#### Step 2 implementation

1. Add documented request-locale helpers in `src/i18n/request-locale.ts`. Use generated `cookieName` and `toLocale` rather than duplicating the cookie constant or valid-locale check. The resolver must first read a valid manual preference from the request's `Cookie` header, then parse `Accept-Language`, and return `undefined` when neither source resolves so generated `baseLocale` supplies `zh-CN`.
2. Parse language ranges case-insensitively, use quality `1` when `q` is absent, keep source order for equal qualities, sort by descending quality, ignore malformed ranges and every range with `q=0`, and continue through unsupported preferences. Match only this approved contract:
   - exact `en` and English regional tags such as `en-US` resolve to `en`;
   - `zh`, `zh-CN`, `zh-SG`, `zh-Hans`, and `zh-Hans-*` resolve to `zh-CN`;
   - `zh-TW`, `zh-HK`, `zh-MO`, `zh-Hant`, and `zh-Hant-*` are Traditional Chinese and do not match `zh-CN`;
   - `*` and all other unsupported ranges fall through to the next preference and eventually the base locale.
3. In `src/server.ts`, register `custom-requestLocale` once with generated `defineCustomServerStrategy` before invoking generated `paraglideMiddleware`. The custom resolver intentionally owns both valid-cookie and header precedence because Paraglide 2.23 evaluates registered custom server strategies before its built-in strategies; retaining `cookie` in the compiled strategy keeps normal client `setLocale` persistence available.
4. Wrap the standard `@tanstack/react-start/server-entry` handler with the middleware. Pass the original request and any additional TanStack handler arguments through unchanged, and call the Start handler inside the middleware callback so route rendering, metadata, and streaming work remain in the request's AsyncLocalStorage context.
5. After the Start handler returns, pass its response through a documented helper in `src/i18n/html-response.ts`:
   - detect HTML when `Content-Type` contains `text/html`, case-insensitively;
   - for HTML statuses including errors, set `Cache-Control: private, no-store`;
   - merge `Cookie` and `Accept-Language` into `Vary`;
   - parse comma-separated `Vary` tokens, de-duplicate case-insensitively, preserve existing token order/spelling such as `Accept-Encoding`, and append only missing tokens;
   - preserve `Vary: *` by itself because it already varies on every request header;
   - preserve status, status text, all other headers, and the original response body/stream;
   - return non-HTML responses unchanged.
6. Add focused unit tests for the response helper, including HTML `200`, HTML error, mixed-case content type, existing/repeated `Vary` values, preserved `Accept-Encoding`, `Vary: *`, and non-HTML responses.
7. Add resolver and middleware-level locale tests with stub HTML responses for:
   - no cookie plus English header;
   - no cookie plus `zh-CN` header;
   - weighted and case-insensitive preferences;
   - generic `zh`, `zh-Hans`, and `zh-SG` mapping to `zh-CN`;
   - Traditional Chinese followed by supported English resolving to English;
   - a `q=0` supported range being ignored;
   - absent or unsupported header falling back to `zh-CN`;
   - each valid cookie overriding the opposite header;
   - an invalid cookie falling through to header and base-locale detection;
   - no `Set-Cookie` response header during automatic detection.
8. Add a concurrency test that deliberately overlaps English and Chinese middleware callbacks, reads translated output within each async context, and proves neither request changes locale before its response completes.
9. Document every new exported or non-trivial function. Keep request negotiation, response manipulation, and server-entry orchestration separate so each behavior remains small and testable.

#### Step 2 verification

- Run `mise //frontend:test` and expect the cookie/header resolution matrix, Simplified-versus-Traditional cases, response-header cases, and concurrency test to pass repeatedly.
- Run `mise //frontend:typecheck` and `mise //frontend:lint`.
- Run `mise //frontend:build` to ensure the custom server entry is selected and bundled into the Nitro production artifact.
- Inspect `.output/server/index.mjs` or its build manifest and confirm the custom entry and Paraglide middleware are present.

#### Step 2 notes

- Do not set a locale cookie on the server. The cookie strategy reads a preference only; manual client selection in Step 4 is its sole writer.
- Do not disable AsyncLocalStorage or store the locale in a module-level variable, React Context, TanStack Query, or Zustand.
- Do not register a custom browser strategy. The client entry owns hydration reads, while Paraglide's compiled built-in cookie strategy remains the manual preference writer.
- Apply cache headers after the Start response exists so ordinary HTML, streamed HTML, and HTML error responses share one final boundary.

### [ ] Step 3: Hand the SSR locale to hydration and the root document

Make the rendered `<html>` locale the validated source of truth for the browser's first React render.

**Depends on:** Step 2

#### Step 3 implementation

1. Add `src/i18n/client-locale.ts` with documented functions that:
   - validate a document language through generated `toLocale`;
   - fall back to generated `baseLocale` only for an empty or unsupported value;
   - install `overwriteGetLocale(() => resolveDocumentLocale(document.documentElement.lang))` so every browser read is validated against the rendered document.
2. Add the optional TanStack Start `src/client.tsx` entry, matching the installed Start version's default `StrictMode`, `startTransition`, `StartClient`, and `hydrateRoot(document, ...)` sequence.
3. Invoke the locale override synchronously before creating or hydrating `<StartClient />`. Do not call message functions or `getLocale()` at module scope before this setup.
4. Change `RootDocument` in `src/routes/__root.tsx` to render `<html lang={getLocale()} dir={getTextDirection()}>` from the generated runtime.
5. Keep TanStack Router and Query setup unchanged. Initial SSR creates a server router, hydration creates the browser router, and subsequent client navigation continues with that browser router and the locale fixed by the current document.
6. Add unit tests for hydration-locale validation with `en`, `zh-CN`, empty, and unsupported document values.

#### Step 3 verification

- Run `mise //frontend:test`, `mise //frontend:typecheck`, and `mise //frontend:build`.
- Start the production artifact and request `/` with English and Chinese headers. Confirm the response document has the corresponding `lang` and `ltr` direction before client JavaScript runs.
- Inspect the generated client bundle or source map inputs and confirm the override call precedes `hydrateRoot`.
- Search application modules for module-scope `getLocale()` or message calls and expect none before the client entry setup.

#### Step 3 notes

- The browser override intentionally bypasses independent `navigator.languages` detection during hydration. The server already used the equivalent request header, and `<html lang>` is the serialized handoff.
- This override also prevents Paraglide's initial browser resolution from calling `setLocale(..., { reload: false })`, which would violate the manual-only cookie rule.

### [ ] Step 4: Translate the initial UI and add the same-URL language switcher

Replace the current frontend-owned strings with generated message functions and expose a minimal accessible manual switch.

**Depends on:** Step 3

#### Step 4 implementation

1. Import generated messages through `src/paraglide/messages.js` and replace every current user-visible English string in `src/routes/index.tsx`, including headings, action text, statistics labels, empty-state text, and badge text.
2. Localize the root document title in `src/routes/__root.tsx` with `app_name`. Keep the product name identical in both catalogs unless product naming is changed separately.
3. Add a documented `LanguageSwitcher` component using a native `<select>` styled consistently with the existing daisyUI baseline:
   - use generated `getLocale()` as its controlled active value;
   - expose a localized accessible label;
   - show `English` and `简体中文` as intentionally hard-coded self-named options without flags; these locale identifiers do not need catalog entries;
   - validate the select's string value with generated `toLocale` before calling normal `setLocale(locale)` only when the user selects an option;
   - do not pass `{ reload: false }`, mutate Router state, or change the URL.
4. Place the switcher beside the existing `New upload` action without redesigning the rest of the page.
5. Give each `queueItems` entry a language-neutral identifier, use that identifier as the React key, and derive its label from a message function during render. Do not use translated text as identity, translate counts, or pass video/domain content through the UI catalogs.
6. Add catalog/message tests for representative English and Chinese output from the current homepage. Do not create test-only or future-facing messages.

#### Step 4 verification

- Run `mise //frontend:test`, `mise //frontend:typecheck`, `mise //frontend:lint`, and `mise //frontend:format-check`.
- Run the production app and verify English and Chinese requests return translated body text and localized document metadata in the initial HTML.
- Search `frontend/web/src/` for the original literal UI strings and expect them only where technically intentional, such as tests; translation values must live in catalogs.
- In a browser with no locale cookie, confirm `document.cookie` lacks `PARAGLIDE_LOCALE` after hydration settles.
- Record `location.href`, switch language, and confirm a full document reload returns to the identical pathname, query, and hash with the selected locale and a `PARAGLIDE_LOCALE` cookie.
- Inspect the manual preference cookie and confirm it is host-only, has path `/`, and uses Paraglide's default long-lived maximum age.

#### Step 4 notes

- A full reload may discard unsaved in-memory form state; issue #31 explicitly accepts that trade-off.
- Normal TanStack client navigation does not rerun locale detection or replace the router. Only the explicit language switch leaves the document and starts a new SSR request.

### [ ] Step 5: Request human-authored i18n documentation

Pause agent-authored implementation work and ask a human to provide the durable i18n documentation.

**Depends on:** Step 4

#### Step 5 implementation

1. Ask the human to create `frontend/docs/ui/i18n.md`, link it from `frontend/docs/README.md`, and add Paraglide/inlang to `frontend/docs/tech-stack.md`. Do not author the documentation prose on the human's behalf.
2. Give the human a hint of checklist, but do not enforce it:
   - UI-only localization scope and `en`/`zh-CN` support;
   - catalog locations and semantic message-ID convention;
   - generated-output ownership and `i18n:compile`;
   - cookie, header, and base-locale precedence;
   - the approved Simplified Chinese aliases, Traditional Chinese non-matches, and `q=0` behavior;
   - SSR-to-hydration handoff through `<html lang>`;
   - normal `setLocale` full-reload switching and same-URL behavior;
   - manual-only cookie creation;
   - why locale state must not be added to Router, Query, Zustand, or React Context;
   - how to add a message and run verification.
3. Wait for the human-authored files before completing this step. Review them for consistency with the implemented behavior and ask the human to resolve any substantive discrepancy rather than silently changing their intended wording.
4. Apply only agreed technical corrections and mechanical Markdown formatting, then include the human-authored documentation in this step's review and commit.

#### Step 5 verification

- Confirm `frontend/docs/ui/i18n.md` is technically consistent with the implementation and provides useful maintenance guidance; do not require every suggested checklist item.
- Confirm `frontend/docs/README.md` links the new guide and `frontend/docs/tech-stack.md` lists Paraglide/inlang.
- Run Markdown lint on only the human-provided Markdown files.
- Run `mise //:docs-link-check`.

#### Step 5 notes

- Human input is intentionally required for this step. Do not proceed to final acceptance until the requested documentation is provided.

### [ ] Step 6: Perform production acceptance verification

Prove the complete behavior through the real Nitro artifact and close every validation item from the design spec.

**Depends on:** Step 5

#### Step 6 implementation

1. Build and start the same `.output/server/index.mjs` artifact used by the runtime image. Exercise the complete SSR matrix with reproducible HTTP requests and assert body language, `<html lang>`, absence of automatic `Set-Cookie`, `Vary`, and `Cache-Control`. Also request a real Nitro/TanStack HTML `404` or error document and assert that it passes through the same locale-aware header boundary.
2. Run repeated overlapping English and Chinese production requests and confirm each body remains internally consistent with its request.
3. In a browser, clear only `PARAGLIDE_LOCALE`, test both initial languages, enable network throttling, and verify:
   - the first painted text already matches the response HTML;
   - React logs no hydration mismatch;
   - the DOM does not change language when hydration settles;
   - automatic detection still creates no locale cookie;
   - each manual switch creates/updates the cookie, reloads, and preserves the exact URL.
4. Re-run generation from a state where `src/paraglide/` is absent, then run the full frontend gate. Confirm generated files remain ignored and no unrelated repository files changed.
5. Record the production/browser evidence in issue #31 or the implementation pull request. If any acceptance item fails, fix it in the owning earlier boundary rather than adding a second locale state mechanism.

#### Step 6 verification

- Run `mise //frontend:format-check`.
- Run `mise //frontend:lint`.
- Run `mise //frontend:typecheck`.
- Run `mise //frontend:test`.
- Run `mise //frontend:build`.
- Run `mise //:docs-link-check`.
- Build the frontend Docker `web-build` or runtime target and confirm Paraglide compilation succeeds in the repository's offline-pnpm installation flow.
- Run `git status --short --untracked-files=all` and expect only intended source, documentation, lockfile, and plan changes; no file under `frontend/web/src/paraglide/` may appear.
- Compare every acceptance result against the design spec's Validation section before marking this step complete.

## Risks and Guardrails

- Hydration import order: installing the override after React starts rendering can produce a mismatch or automatic cookie. Keep the client entry tiny and test the browser behavior.
- Request leakage: disabling AsyncLocalStorage or caching locale in application globals can mix languages under concurrent SSR. Preserve middleware ownership and the overlap test.
- Negotiation drift: the custom strategy exists because pinned Paraglide matching is insufficient for the approved Chinese aliases and `q=0`. Preserve cookie-first resolution and the explicit Simplified-versus-Traditional test table when upgrading Paraglide.
- Same-URL caching: omitting either varying request header can serve another user's language from a shared cache. Keep `private, no-store` until a separate bounded cache-key design exists.
- Generated-source drift: editing or committing `src/paraglide/` creates an unreliable second source of truth. Regenerate only from the catalogs and settings.
- Build-path drift: Vite generation alone does not cover standalone type checking or tests. Preserve the lifecycle prerequisites and the clean-checkout check.
- Cookie regression: using default browser resolution before the hydration override, calling `setLocale` outside manual interaction, or using `{ reload: false }` breaks the locked persistence policy.
- Scope expansion: do not translate video titles, transcripts, descriptions, user input, backend content, or URLs as part of this work.

## References

| Resource | Description | Notes |
| --- | --- | --- |
| [Issue #31: i18n Setup for TanStack](https://github.com/CXwudi/nijigen-video-site/issues/31) | Product request, discussion, and locked same-URL behavior. | Must Read |
| [Issue 31 design spec](../spec/spec-issue-31-tanstack-start-i18n-20260726.md) | Approved locale, SSR, hydration, cookie, caching, scope, and validation decisions. | Must Read |
| [Frontend root document](../../frontend/web/src/routes/__root.tsx) | Current hard-coded document language and metadata boundary. | Must Read |
| [Frontend home route](../../frontend/web/src/routes/index.tsx) | Complete initial UI string migration surface at planning time. | Important |
| [Frontend router](../../frontend/web/src/router.tsx) | Per-render Router and Query lifecycle that must remain unchanged. | Important |
| [Frontend package manifest](../../frontend/web/package.json) | Pinned dependency, script, and TanStack Start version baseline. | Important |
| [Frontend UI baseline](../../frontend/docs/ui/ui-baseline.md) | Repository UI component and styling convention. | Important |
| [Paraglide TanStack Start guide](https://paraglidejs.com/tanstack-start) | Official server middleware, Vite, and document-language integration. | Must Read |
| [Paraglide compiler options](https://paraglidejs.com/compiler-options) | Generated-output, declaration, strategy, and AsyncLocalStorage options. | Important |
| [Paraglide compiling guide](https://paraglidejs.com/compiling-messages) | Vite and CLI generation behavior. | Important |
| [Paraglide strategy guide](https://paraglidejs.com/strategy) | Built-in and custom locale strategy behavior. | Must Read |
| [Paraglide middleware guide](https://paraglidejs.com/middleware) | Request isolation, original-request handling, and manual cookie behavior. | Must Read |
| [TanStack Start client entry guide](https://tanstack.com/start/latest/docs/framework/react/guide/client-entry-point) | Supported custom browser entry and hydration sequence. | Must Read |
| [TanStack Start default server entry](https://github.com/TanStack/router/blob/main/packages/react-start/src/default-entry/server.ts) | Standard handler behavior to preserve when adding the custom entry. | Important |
