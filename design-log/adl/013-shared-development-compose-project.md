ADL-013: Shared Development Compose Project

Recorded on 2026-09-12 for [issue #72](https://github.com/CXwudi/nijigen-video-site/issues/72).

[ADL-004](004-component-owned-docker-modules.md) chose independently owned frontend and backend Compose projects. Running both consequently created separate API, PostgreSQL, Redis, and Flyway services and separate data volumes. After [ADL-012](012-defer-production-deployment.md) removed production Compose, that independence no longer justified the duplication in the development workflow.

Use one repository-root Docker module with one Compose entrypoint, reusable service definitions imported through `extends`, and explicit top-level services and volumes. Keep each module's Dockerfile in its module root. A shared default project identity lets developers progressively start dependencies, the backend, and the full stack while reusing stateful services.

Profiles describe service selections: the default starts backend dependencies; backend adds API; frontend-deps adds API and frontend volume ownership initialization; full also adds web. Application startup and tool commands use the same Gradle-backed API service. Services explicitly belong to every profile that requires them, because profile dependencies are not inferred.

One mise Docker module handles host ownership, Gradle cache paths, Compose configuration, arbitrary Gradle/pnpm commands, and cleanup. CI uses the same entrypoint with per-run/job project names. Frontend dependency cleanup resolves actual volume names and preserves database and Redis data. Production platform selection remains deferred.

The tradeoff is shared lifecycle: stopping the project affects both frontend and backend work. Independent worktrees must choose different project names and host ports. Starting fewer profiles does not stop previously started services. Changing from the old project names creates fresh volumes, so existing data needs an explicit backup/restore migration.

See [Docker Setup Explain](../../docs/docker-setup-explain.md) for the current commands and migration procedure. Earlier ADLs retain their historical decisions.
