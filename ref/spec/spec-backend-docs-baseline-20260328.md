# Backend Documentation Baseline Design Spec

## Problem or Goal

Task 5 needs a small but durable backend documentation baseline. The current
backend documentation surface is too thin to explain the technology choices and
the intended Gradle and module layout, but it is also too early to create a
large documentation tree.

The goal is to introduce the minimum backend-specific documentation that makes
the new Gradle workspace understandable without turning `backend/README.md` into
a long-form reference document.

## Context

The repository now uses a split-root structure where backend-specific material
should live close to `backend/`, while cross-cutting documentation stays under
`docs/`.

`docs/README.md` is already the shared documentation entry point and links to
`backend/docs/`. `backend/docs/README.md` exists as the backend-specific docs
home, but it does not yet describe the actual backend documentation set.

ADR-001 is still useful context for the split-root repository shape and the
intended backend boundary, but it is no longer the source of truth for the
documentation folder layout. The current documentation structure should be
derived from `docs/README.md` and the app-local docs indexes instead.

Task 5 is specifically about documenting the backend bootstrap work that has
already established:

- the backend tech stack and build conventions
- the initial Gradle module structure under `apps/` and `modules/`
- the current implemented skeleton of `apps/api` and `modules/common`, without
  documenting reserved future modules as if they already exist

## Design Options

### Option 1: Two focused backend docs plus a short landing page

Create:

- `backend/docs/tech-stack.md`
- `backend/docs/folder-structure.md`

Keep:

- `backend/README.md` as a short landing page only
- `backend/docs/README.md` as the local index into backend-specific docs

This keeps the documentation explicit, easy to scan, and ready to grow. The two
topics are separate enough that future updates can happen independently without
turning one document into a catch-all overview.

### Option 2: Put both topics directly in `backend/README.md`

This is the lightest structure in terms of file count. Readers would only need
one file to understand the backend.

The downside is that `backend/README.md` would quickly become a mixed landing
page and reference document. As more backend-specific notes appear, the README
would become harder to navigate and harder to keep concise.

### Option 3: One combined backend overview document

Create a single file such as `backend/docs/overview.md` that contains sections
for both the stack and the folder structure, while leaving `backend/README.md`
short.

This is workable, but it weakens topic boundaries. Stack decisions and folder
structure tend to evolve at different speeds, so one combined document would be
more likely to accumulate unrelated edits over time.

## Recommendation

Choose Option 1.

It gives the backend documentation a clear starting shape without over-designing
the docs tree:

- `backend/README.md` stays a short landing page
- `backend/docs/README.md` becomes the backend docs index
- `backend/docs/tech-stack.md` explains the current backend stack
- `backend/docs/folder-structure.md` explains the backend layout and module
  roles

This is the best fit for the current stage of the project because it is small,
easy to maintain, and aligned with the broader documentation split already
established in `docs/README.md`.

## Decision Constraints

This spec supersedes the earlier Task 5 wording in
`plans/plan-backend-gradle-bootstrap-20260328.md` where the documentation work
was framed primarily as updating `backend/README.md`.

The approved Task 5 direction is now:

- `backend/README.md` stays a short landing page only
- `backend/docs/README.md` is the backend docs index
- `backend/docs/tech-stack.md` documents the current backend stack and shared
  build conventions
- `backend/docs/folder-structure.md` documents the current backend folder and
  module structure

The documents must describe the backend as currently implemented. ADR-001 may
reserve future structure such as `apps/worker`, but this baseline should not
document future modules as if they are already part of the current backend
bootstrap.

For documentation layout decisions, this spec should follow the current
`docs/README.md` structure rather than the older documentation tree shown in
ADR-001.

## Target Deliverables

- `backend/README.md` Short backend landing page with a brief description and
  links into `backend/docs/`; it should not duplicate the detailed stack or
  folder-structure content.
- `backend/docs/README.md` Backend docs index that links to the available
  backend-specific documents and briefly explains what each one covers.
- `backend/docs/tech-stack.md` Current committed backend stack only, including
  the Gradle/Kotlin/Spring/GraalVM direction and the shared
  version-catalog-based build setup already present in the codebase.
- `backend/docs/folder-structure.md` Current backend tree and module roles only,
  including `apps/api`, `modules/common`, and the Gradle plugin infrastructure
  that exists today.
- `docs/README.md` No structural change required unless its current backend-docs
  link or wording becomes inaccurate after the backend docs are added.

## Scope and Non-Goals

- In scope: create the two backend docs and shape the backend docs index around
  them
- In scope: keep `backend/README.md` short and focused on navigation
- In scope: document the backend as it exists today, not as a future idealized
  architecture
- Out of scope: detailed runtime documentation, deployment guidance, or module
  deep-dives
- Out of scope: frontend-specific documentation changes beyond existing links
- Out of scope: revising ADR-001 in this task, even though its documentation
  folder example is now outdated

## Risks and Open Questions

- The backend structure will continue to grow, so `folder-structure.md` must be
  written in a way that tolerates near-term expansion.
- The tech stack document should describe only committed choices, not planned
  components that are not yet represented in the codebase.
- If the worker app or more shared modules appear soon, the folder structure
  document will likely need an early follow-up update.
- There is a risk of documenting ADR-intended future structure instead of the
  currently implemented backend skeleton, so the docs must stay grounded in the
  repository state.
- There is also a risk of following the older documentation tree shown in
  ADR-001 rather than the current docs index, so the documentation map in
  `docs/README.md` should take precedence for this work.

## Validation Considerations

The resulting documentation should be considered successful if:

- a new contributor can tell where backend-specific docs live
- the current backend stack can be understood without reading Gradle files
- the purpose of `apps/api` and `modules/common` is clear from the documented
  folder layout
- `backend/README.md` remains short rather than duplicating the detailed docs

## References

- ![plans/plan-backend-gradle-bootstrap-20260328.md](../plans/plan-backend-gradle-bootstrap-20260328.md)
  Implementation plan that defines Task 5 as the backend documentation follow-up
  to the Gradle bootstrap work. Important.
- ![adr/0001-project-structure-baseline.md](../adr/0001-project-structure-baseline.md)
  Accepted ADR describing the split-root monorepo and the intended high-level
  backend structure; its documentation tree example is older than the current
  docs layout. Important.
- ![docs/README.md](../../docs/README.md) Root documentation index that routes
  readers to backend-specific documentation. Must Read.
- ![backend/docs/README.md](../../backend/docs/README.md) Existing backend docs
  landing page that should become the index for the new backend documents. Must
  Read.
- ![backend/README.md](../../backend/README.md) Backend landing page that should
  stay short and act as a navigation entry point. Must Read.
- ![backend/settings.gradle.kts](../../backend/settings.gradle.kts) Current
  backend module declarations and included plugin build that the
  folder-structure doc should reflect accurately. Important.
- ![backend/gradle/libs.versions.toml](../../backend/gradle/libs.versions.toml)
  Current backend stack and version catalog source of truth that the tech-stack
  doc should describe. Important.
- ![backend/apps/api/build.gradle.kts](../../backend/apps/api/build.gradle.kts)
  Current API module skeleton showing the first application module and its
  dependency on `modules:common`. Important.
- ![backend/modules/common/build.gradle.kts](../../backend/modules/common/build.gradle.kts)
  Current shared module skeleton showing the initial reusable backend module.
  Important.
