# Frontend Tech Stack

- **Languages & Runtime**: [TypeScript](https://www.typescriptlang.org/docs/), [React](https://react.dev/reference/react)
- **Build & Dependency Management**: [pnpm](https://pnpm.io/motivation) (workspace), [Vite](https://vite.dev/guide/)
- **Web & Routing**: [TanStack Start](https://tanstack.com/start/latest/docs), [TanStack Router](https://tanstack.com/router/latest/docs)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/docs), [shadcn/ui](https://ui.shadcn.com/docs) (Base UI flavor, `base-nova` style), [Base UI](https://base-ui.com/react/overview), [Lucide](https://lucide.dev/) icons
- **State & Data**: [TanStack Query](https://tanstack.com/query/latest/docs), [Zustand](https://zustand.docs.pmnd.rs/), [Paraglide JS](https://paraglidejs.com/)
- **Testing & Linting**: [Vitest](https://vitest.dev/guide/), [Oxlint](https://oxc.rs/docs/guide/usage/linter.html), [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html)

## Notes

- shadcn/ui is configured for **Base UI** (not Radix) as the component library, with the project's own Snow Miku semantic tokens. See [UI Baseline](ui/ui-baseline.md).
- `components.json` at `frontend/web/components.json` is the source of truth for the shadcn setup; components live in `frontend/web/src/components/ui`.
