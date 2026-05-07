# Documentation

This is the entry point for all authoritative documentation in this repository.
All AI agents and humans should treat the content under `docs/` and the
app-local docs folders it links to as the shared source of truth.

Updates to documentation should be made in a way that benefits both AI agents
and humans.

While the documentation can be updated by both AI agents and humans, only humans
can write/update headers, that is any line starting with `#`. AI agents are not
allowed to write/update headers, but they can update the content under the
headers. Humans should decide the structure of the documentation.

This folder is the documentation home for the entire repository. For
backend-specific and frontend-specific documentation, refer to the respective
folders linked below.

## Structure

- [`Environment Setup`](environment-setup.md): Shared development environment
  setup for working in this repository
- [`Docker Setup Explanation`](docker-setup-explain.md): Docker setup for this repository
- [`../backend/docs/`](../backend/docs/): Backend-specific documentation
- [`../frontend/docs/`](../frontend/docs/): Frontend-specific documentation
