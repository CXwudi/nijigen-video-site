# References

This folder captures design history and decision rationale.

AI agents and humans should use [`../docs/`](../docs/README.md) and the app-local docs it links to as the single-source-of-truth documentation.

This folder is just to log the design history behind the docs.

## Immutability

Treat this folder as WAL (write-ahead-log).

When a PR is merged with new materials added, these materials should not be altered from its original intents or deleted in the future.
Grammatical fixes or link updates are allowed, but the core content should remain unchanged.

For any new updates, a new reference document should be created to capture the new design history, the old one can have a link to the new one for traceability.

**Exception**: `plans/` and `spec/` were previously part of this folder but are no longer tracked — rigid plan/spec artifacts can confuse AI agents, especially the newer, stronger models like Fable and Astro.

## Structure

- [`adl/`](adl/): architecture decision logs and related rationale notes
- [`others/`](others/): any other supporting materials
