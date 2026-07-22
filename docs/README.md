# Documentation

This is the entry point for all authoritative documentation in this repository.
All AI agents and humans should treat the content under `docs/` and the
app-local docs folders it links to as the shared source of truth.

This folder is the documentation home for the entire repository. For
backend-specific and frontend-specific documentation, refer to the respective
folders linked below.

## Structure

- [`Environment Setup`](environment-setup.md): Shared development environment
  setup for working in this repository
- [`Docker Setup Explanation`](docker-setup-explain.md): Docker setup for this repository
- [`Documentation Update Guidance`](doc-update-guidance.md): How to update documentation.
- [`../backend/docs/`](../backend/docs/): Backend-specific documentation
- [`../frontend/docs/`](../frontend/docs/): Frontend-specific documentation
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): Top-level continuous integration workflow for pull requests, pushes to `main`, and manual runs.
  - Actions security and documentation link checks always run.
  - Backend checks run for `.github/workflows/ci.yml`, `.github/workflows/backend-check.yml`, `backend/**`, `infra/compose/**`, `infra/flyway/**`, `mise.toml`, and `backend/docker/mise.toml` changes.
  - Frontend checks run for `.github/workflows/ci.yml`, `.github/workflows/frontend-check.yml`, `frontend/**`, `infra/compose/**`, `infra/flyway/**`, and `mise.toml` changes.
  - Backend checks require Docker Hub credentials. Frontend checks log in when both credentials are available and fail when only one is configured.
  - Manual runs select both backend and frontend checks.
  - `CI Gate` succeeds only when change detection and both always-run checks succeed, each selected component succeeds, and each unselected component is skipped. Failures, cancellations, missing selections, and unexpected results prevent a successful gate.
  - `Actions Security Check` also runs independently during the required-check migration. This temporary compatibility trigger will be removed after the ruleset requires `CI Gate`.
