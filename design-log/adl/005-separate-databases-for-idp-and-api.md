# ADL-005: Separate Databases for IdP and API

- **Status:** Accepted
- **Date:** 2026-05-09

## Context

Assuming we are using JWT Token Auth for now.

Authentication identity and application user profile data have different owners. The IdP owns login identity, credentials, sessions, and OAuth/OIDC state. The API owns video-site-specific profile data.

A shared identity table would blur this ownership. The IdP needs freedom to manage credentials, sessions, verification state, OAuth/OIDC data, and schema details without the API depending on its internal schema. This also keeps a future migration to another IdP stack, such as the Ory stack, easier because the API does not depend on IdP-owned tables.

The safer boundary is that the API stores only its own profile data and links it to the IdP through a stable subject value.

## Decision

The IdP and API will own separate databases.

The API profile should use an IdP subject field as its unique external identity link. Username or email should not be used as the permanent link because they can change.

Because these stores are separate, a user may already exist in the IdP while the API database does not yet contain a matching application profile. The API will treat this as a normal state.

## Concerns and Answers

There are a few concerns with separate databases, but they are not blockers for the current project stage.

### What if the API database does not have a profile for an IdP user?

This is handled by Option 1 for now, and can evolve into Option 2 later.

#### Option 1: Lazy API profile creation

This is the current decision.

When an authenticated request arrives, the API will use the IdP subject from the validated token as the stable identity link. If no API profile exists for that subject, the API may create a minimal profile lazily.

This keeps the system simple while the project is small. It also avoids requiring a distributed transaction or registration-time integration between the IdP and the API.

#### Option 2: Explicit onboarding state

This is the expected future direction.

Later, the API may move from automatic lazy profile creation to an explicit onboarding state. In that model, an authenticated user without a complete API profile can be treated as authenticated but not yet onboarded.

### What if a user is deleted or disabled in the IdP?

The user should no longer be able to log in or obtain new tokens. Existing JWT-based access may still be eventually disabled rather than instantly disabled, depending on token lifetime. If immediate revocation becomes important, this can be revisited with an opaque-token or introspection-based setup, likely as part of the eventual move to the Ory stack.

### Should JWT scopes or roles decide authorization?

JWT claims may contain scopes or roles for coarse API access, but the API should still own application-specific authorization. The IdP/token may express broad access such as whether the caller can use an API area. The API should decide resource-specific rules such as ownership, creator permissions, moderation permissions, bans, and other video-site business rules.

For example, a JWT scope such as `video:write` may allow the caller to use video-writing endpoints, but the API must still check whether the caller owns the specific video, whether the video is locked, or whether the caller has moderation permission. Similarly, a scope such as `comment:write` may allow the caller to post comments, but the API must still check whether the target video allows comments, whether the user is banned, and whether rate limits apply.

### What if the future Ory migration changes subject values?

That migration may be a breaking change, and that is acceptable for now. The API should still use generic naming such as `idp_subject` instead of coupling column names to a specific IdP implementation.

## Open Questions

1. How can the IdP be automatically set up in test mode with predefined test users?
2. Should a future cleanup or sync cron job reconcile IdP identities and API profiles?
3. What account data retention or anonymization policy should the API use if an IdP account is deleted?
