# ADL-006: Keycloak as Initial Self-Hosted IdP

- **Status:** Accepted
- **Date:** 2026-05-09
- **Related:** [ADL-005](./005-separate-databases-for-idp-and-api.md)

## Context

ADL-005 decides that the IdP and API own separate databases. One remaining question is how to run an IdP in test mode with predefined users and clients.

The current priority is fast development. The IdP should be self-hostable, easy to run locally, easy to seed in CI, and production-shaped enough that the local setup does not become throwaway. Opaque-token support is optional for now.

Local development should also use Postgres for the IdP so that state can persist between restarts and local startup does not need to repeat full setup work every time.

## Decision

Use Keycloak as the initial self-hosted IdP.

Keycloak will own its own Postgres database, separate from the API database. A test/dev realm export should define the initial realm, clients, users, roles, and scopes. Local development can persist the Keycloak Postgres volume; realm import runs on first setup and is skipped after the realm already exists. CI can use a fresh database and import the same realm every run.

The API should integrate with Keycloak through generic OIDC/JWT behavior: issuer, audience, signature/JWKS, expiration, and claims. The API should not depend on Keycloak internal tables or admin APIs. Application profiles still link to the IdP through a generic `idp_subject` value.

For backend integration tests, a test-only client may enable direct access grant/password grant so tests can obtain user tokens without browser automation. This should remain test/dev only.

## Alternatives Considered

### Dex

Dex is simpler and very good for static test users and clients, but it is less like a full product IdP and is not the preferred production-facing direction.

### Logto

Logto has a modern product-auth feel and stronger opaque-token direction, but CI/bootstrap setup appears more script/API driven than Keycloak realm import. It remains a possible future revisit if opaque tokens become important.

Logto was the second most favorable option, but Keycloak's boring maturity is more trustworthy for now.

### Spring Authorization Server

Spring Authorization Server is a library/framework for building an IdP. It gives control, but it would make the project own login, users, account flows, and more security-sensitive behavior.

### Ory or ZITADEL

Ory and ZITADEL remain possible future options, especially if the project later prioritizes opaque tokens, introspection, or a more specialized identity architecture. They are not chosen now because the current priority is faster setup.

## Consequences

Keycloak gives the project a practical local and CI IdP story with one reusable realm configuration.

The main cost is that Keycloak is heavier than Dex and realm JSON can become noisy over time. The project also remains JWT-first for now; immediate revocation and opaque-token architecture can be revisited later.

## Open Questions

None.
