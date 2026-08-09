# ADL-011: shadcn/ui on Base UI as the Frontend UI Baseline

- **Status:** Accepted
- **Date:** 2026-08-09
- **Related:** [ADL-009](./009-tanstack-start-bff-with-better-auth.md), [GitHub issue #68](https://github.com/CXwudi/nijigen-video-site/issues/68)

## Context

The early-stage frontend used daisyUI v5 (Tailwind v4 plugin) for theme and CSS plus Base UI for interactivity. That split left every interactive component with two sources of truth: daisyUI's theme-driven class names for visuals and Base UI primitives for behavior. The single dashboard page mixed `btn`/`card`/`stats` daisyUI classes with hand-rolled markup, and the theme lived entirely inside `@plugin "daisyui/theme"` blocks.

Meanwhile shadcn/ui officially adopted Base UI as its default component library, with a `base-nova` style whose registry components are built directly on `@base-ui/react` primitives. This gives copy-and-own components that already encode Base UI's accessibility, plus a semantic CSS-variable token system that works with any palette.

## Decision

Migrate the frontend web app from daisyUI to shadcn/ui configured for Base UI:

- **Setup**: official `shadcn` CLI (`init` + `add`) with `components.json` style `base-nova`, base `base` (Base UI), CSS variables enabled, `@/*` aliases.
- **Tokens**: daisyUI's verified Snow Miku 2019 palette (light `snowmiku2019-E`, dark `snowmiku2019-B-dark-2`) is re-expressed as shadcn semantic tokens (`--background`, `--foreground`, `--primary`, …) under `:root` / `.dark` in `src/styles.css`, exposed through `@theme inline`. The character-sourced info/success/warning tokens are re-exposed as custom `--color-*` utilities.
- **Dark mode**: class-based `.dark` strategy driven by a `ThemeProvider` using the official TanStack Start `ScriptOnce` pattern (no FOUC, hydration-safe), replacing daisyUI's `prefersdark`.
- **Components**: reusable shadcn/ui components under `src/components/ui` (button, card, badge, input, select, tabs, switch, progress, avatar, dropdown-menu, tooltip, table, sheet, …), all backed by `@base-ui/react`.
- **Showcase page**: the single dashboard route is replaced by a bilingual, responsive component showcase using mock data only; Paraglide zh-CN/en behavior and localized URLs are preserved.

## Consequences

- One component system with a single source of truth for behavior (Base UI) and styling (shadcn tokens).
- Theming is now data, not plugin config: changing the Snow Miku palette is a matter of editing CSS variables, and adding tokens follows the documented shadcn pattern.
- New UI primitives should be added via `pnpm dlx shadcn@latest add <name>` to stay in sync with the official registry.
- daisyUI is fully removed from `frontend/web` dependencies, styles, and documentation.
