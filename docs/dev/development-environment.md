# Development Environment

This document describes the local development tooling for `nijigen-video-site`.

## Official tool manager

We use [`mise`](https://mise.jdx.dev/) as the official development tool manager for this repository.

The repo-local tool configuration lives in [`/.mise.toml`](../../.mise.toml). See that file for the exact tools and versions installed for this repository.

Using `mise` keeps the development environment reproducible across machines and CI-like environments that support it.

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

If your shell is already activated for `mise`, entering the repository may automatically expose the configured tool versions.

## Updating tool versions

When upgrading a tool version:

1. Update `.mise.toml`.
2. Re-run `mise install`.
3. Verify the tool version with `mise exec -- <tool> --version`.
4. Update this document if the workflow changes.
