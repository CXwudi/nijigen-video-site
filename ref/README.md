# References

This folder contains reference-only materials that capture design history,
decision rationale, implementation plans, and specs.

AI agents and humans should use [`../docs/`](../docs/README.md) and the
app-local docs it links to as the single-source-of-truth documentation, then use
the materials here for context on why a design exists or how a change was
explored.

## Immutability

When a PR is merged with new reference materials (e.g. a new ADR or an updated
plan) added in `adr/`, `plans/`, or `spec/`, these materials should not be
altered from its original intents or deleted in the future. Grammarical fix or
link updates are allowed, but the core content should remain unchanged.

For any new updates, a new reference document should be created to capture the
new design history, the old one can have a link to the new one for traceability.

## Structure

- [`adr/`](adr/): architecture decision records and related rationale notes
- [`plans/`](plans/): implementation plans and work breakdowns
- [`spec/`](spec/): design specs, problem framing, and option analysis
- [`others/`](others/): any other supporting materials
