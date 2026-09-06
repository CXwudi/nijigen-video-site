# ADL-012: Defer Production Deployment Platform Selection

- **Status:** Accepted
- **Date:** 2026-08-11
- **Related:** [ADL-004](./004-component-owned-docker-modules.md), [ADL-008](./008-zitadel-with-opaque-token-introspection.md), [ADL-009](./009-tanstack-start-bff-with-better-auth.md), [GitHub issue #57](https://github.com/CXwudi/nijigen-video-site/issues/57)
- **Supersedes:** only the *production-Compose deployment assumptions* of the documents above — not their local Compose or authentication decisions.

## Context

Earlier design documents and the issue #57 implementation plan assumed Docker Compose would be the production deployment mechanism: `infra/compose/compose.prod.yml` was maintained as "the production-like stack entrypoint", a `prod.env.example` template and prod mise tasks were kept under `infra/compose/`, the OpenTofu provisioner carried a speculative machine-key (`jwt_profile`) authentication path for production, and the frontend runtime image baked speculative migration execution into its startup command.

That assumption was not justified. Three reasons:

1. **Docker Compose is normally serving quick bring-up and testing here.** In this repository, Compose is the tool for quickly bringing up the stack and testing against it (local development, CI, integration); using it as an assumed production mechanism goes beyond that role and is unjustified.
2. **Real production will likely use managed PostgreSQL/Redis or equivalent cloud services.** A real deployment will probably run stateful services on managed offerings (for example Neon/Upstash — named only as examples, not chosen here), because this project cannot currently operate and scale stateful services responsibly on its own.
   1. More importantly, if a managed service even provides a dev environment — e.g., Neon — there is no need to manage it via Docker Compose at all, although setting up the dev environment of a managed service is itself an effort worth considering.
3. **The shared-Compose rationale is speculative.** Sharing local and production Compose was intended to reduce "works locally but not in cloud" drift, but it is uncertain how often that benefit actually materializes, while a speculative production topology can itself create false confidence.

Meanwhile, the assumption kept dragging speculative, unverifiable configuration into the codebase (public-DNS/TLS postures, machine-key expiry rotation paths, ingress header-stripping rules, prod placeholders) that could not be exercised in this environment.

## Decision

**Remove production deployment powered by Docker Compose.** Docker Compose is explicitly a **local development / CI / integration tool only**.

Any further Docker Compose refactoring is deferred to the issue #72 implementation.
