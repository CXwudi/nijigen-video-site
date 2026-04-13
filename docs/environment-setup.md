# Environment Setup

Before any development work, make sure to have:

1. mise
1. docker
1. just
1. git-bash for Windows users

`mise` will manage the rest of the tools needed for development,
see [`.mise.toml`](../.mise.toml) for the complete list.

## Getting started

1. Install `mise` on your machine.
2. From the repository root, trust the repo configuration:

   ```bash
   mise trust
   ```

3. Install the declared tools:

   ```bash
   mise install
   ```

4. Run commands inside the configured tool environment:

   ```bash
   mise exec -- <tool> --version
   ```

If your shell is already activated for `mise`, entering the repository may
automatically expose the configured tool versions.

## Updating tool versions

When upgrading a tool version:

1. Update `.mise.toml`.
2. Re-run `mise install`.
3. Verify the tool version with `mise exec -- <tool> --version`.
4. Update this document if the workflow changes.
