# ADL-005: Separate Databases for IdP and API

- **Status:** Accepted
- **Date:** 2026-05-09

## Context

Authentication identity and application user profile data have different owners. The IdP owns login identity, credentials, sessions, and OAuth/OIDC state. The API owns video-site-specific profile data.

Because these stores are separate, a user may already exist in the IdP while the API database does not yet contain a matching application profile.

### Why not a shared identity table

A shared identity table would blur ownership between the IdP and the API. The IdP needs freedom to manage credentials, sessions, verification state, OAuth/OIDC data, and schema details without the API depending on its internal schema.

It would also make a future migration to another IdP stack, such as the Ory stack, harder because the API could become coupled to tables that should be owned and migrated by the IdP.

The safer boundary is that the API stores only its own profile data and links it to the IdP through the stable subject value.

## Concerns of Separate Databases

What happens when the API database does not have a profile for a user who already exists in the IdP database?

## Decision

The IdP and API will own separate databases. We will use Option 1 for API profile handling for now, and keep Option 2 as the expected future direction.

### Option 1: Lazy API profile creation

The API will treat a missing application profile as a normal state.

When an authenticated request arrives, the API will use the IdP subject from the validated token as the stable identity link. If no API profile exists for that subject, the API may create a minimal profile lazily.

This keeps the system simple while the project is small. It also avoids requiring a distributed transaction or registration-time integration between the IdP and the API.

### Option 2: Explicit onboarding state

Later, the API may move from automatic lazy profile creation to an explicit onboarding state.

In that model, an authenticated user without a complete API profile can be treated as authenticated but not yet onboarded.

## Identity Link

The API profile should use an IdP subject field as its unique external identity link. Username or email should not be used as the permanent link because they can change.

## Open Questions

1. How can the IdP be automatically set up in test mode with predefined test users?
2. How should this decision stay compatible with an eventual move to the Ory stack?
3. Should a future cleanup or sync cron job reconcile IdP identities and API profiles?
