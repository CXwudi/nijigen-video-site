# ADL-012: Defer Production Deployment Platform Selection

- **Status:** Accepted
- **Date:** 2026-08-11
- **Related:** [ADL-004](./004-component-owned-docker-modules.md),
  [ADL-008](./008-zitadel-with-opaque-token-introspection.md),
  [ADL-009](./009-tanstack-start-bff-with-better-auth.md),
  [GitHub issue #57](https://github.com/CXwudi/nijigen-video-site/issues/57)
- **Supersedes:** only the *production-Compose deployment assumptions* of the
  documents above — not their local Compose or authentication decisions.

## Context

Earlier design documents and the issue #57 implementation plan assumed Docker
Compose would be the production deployment mechanism:
`infra/compose/compose.prod.yml` was maintained as "the production-like stack
entrypoint", a `prod.env.example` template and prod mise tasks were kept under
`infra/compose/`, the OpenTofu provisioner carried a speculative machine-key
(`jwt_profile`) authentication path for production, and the frontend runtime
image baked speculative migration execution into its startup command.

That assumption was not justified. Three reasons:

1. **Docker Compose is normally serving quick bring-up and testing here.** In
   this repository, Compose is the tool for quickly bringing up the stack and
   testing against it (local development, CI, integration); using it as an
   assumed production mechanism goes beyond that role and is unjustified.
2. **Real production will likely use managed PostgreSQL/Redis or equivalent
   cloud services.** A real deployment will probably run stateful services on
   managed offerings (for example Neon/Upstash — named only as examples, not
   chosen here), because this project cannot currently operate and scale
   stateful services responsibly on its own.
3. **The shared-Compose rationale is speculative.** Sharing local and
   production Compose was intended to reduce "works locally but not in cloud"
   drift, but it is uncertain how often that benefit actually materializes,
   while a speculative production topology can itself create false confidence.

Meanwhile, the assumption kept dragging speculative, unverifiable configuration
into the codebase (public-DNS/TLS postures, machine-key expiry rotation paths,
ingress header-stripping rules, prod placeholders) that could not be exercised
in this environment.

## Decision

**Defer production deployment platform selection.** Docker Compose is
explicitly a **local development / CI / integration tool only**. The claimed
production Compose deployment is removed:

- Removed: `infra/compose/compose.prod.yml`, `infra/compose/prod.env.example`,
  `infra/compose/mise.toml`, and the obsolete `infra/compose` env ignores in
  `infra/.gitignore`; `infra/compose` is dropped from the root `mise.toml`
  monorepo `config_roots`.
- Removed: the speculative production-specific provisioning path — the OpenTofu
  provider is simplified to PAT-only (local/CI); the `auth_mode` and
  `jwt_profile_path` variables and `TF_VAR_auth_mode` are deleted.
- Removed: speculative migration execution from the frontend runtime image
  startup command (`frontend/docker/Dockerfile` is restored to its Step 5
  reviewed state).
- Kept: the independent backend runtime-image repair (`api-jvm-runtime` now
  builds on the official `jre-${JDK_VERSION}-glibc` base because no JDK 25 CRaC
  image exists, with the CRaC TODO reworded; `RUN chmod 0755 /app/api`
  guarantees the distZip start-script exec bit; direct
  `ENTRYPOINT ["/app/api"]` is restored).
- Kept: **platform-neutral, portable runtime images** as the deployment
  boundary. The Dockerfiles still produce self-contained JVM/native API images
  and a node web runtime image that any future platform can run unchanged.
- Kept: all local/CI Compose behavior — the shared bases in
  `infra/compose/common-services.yml` (including
  `network_mode: service:zitadel` on the shared `zitadel-provision-base`),
  both concrete local stacks, the local PAT bootstrap, and the authentication
  architecture of ADL-008/ADL-009.
- Deferred (not chosen): the production platform — Railway, Kubernetes,
  managed Neon/Upstash, or anything else. Also deferred: migration/release
  lifecycle for production (when to apply Flyway/Drizzle migrations), which
  the future platform's release process decides; the checked-in
  `db:migrate`/`build:migrate` scripts remain.

## Consequences

- Positive: no unverifiable production configuration claims remain in active
  files; local/CI configuration is the only Compose contract and stays fully
  exercised; the runtime images remain the stable, portable hand-off boundary
  for a future deployment decision.
- The issue #57 plan is revised accordingly: Step 6 becomes the reviewed
  cleanup/deployable-image step (production Compose removed, runtime-image
  repair verified), and its remaining steps/audit/risks no longer carry
  production-Compose acceptance criteria. ADL-004/008/009 remain the authority
  on module layout, the ZITADEL + opaque-token architecture, and the BFF
  design; only their production-Compose deployment assumption is superseded.
- When a real target, traffic, budget, and operator exist, a new ADL will
  select the platform and define the production topology, secret handling, and
  release/migration lifecycle; this decision deliberately does not constrain
  that choice.
