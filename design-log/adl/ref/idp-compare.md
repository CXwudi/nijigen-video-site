# Opaque Token Support in LobeHub-Listed Self-Hostable Open-Source IdPs

Below is a per-IdP assessment of **OAuth 2.0/OIDC support**, **access-token format and behavior**, **token introspection**, and **practical automation/config-as-code or API support**.

---

## 1. Authelia

| Dimension | Verdict | Details |
| ----------- | --------- | --------- |
| **OAuth 2.0 / OIDC** | ✅ Yes | OpenID Certified™. Comprehensive OIDC provider implementation. |
| **Opaque Tokens** | ✅ **YES — default** | Access tokens are opaque by default. Tokens carry the prefix `authelia_at_` (confirmed in their own docs: "tokens with the prefix `authelia_at_`" vs refresh token prefix `authelia_rt_`). The Authelia blog explicitly states: *"The Access Token is traditionally an opaque token… Effectively an Access Token was completely opaque and meaningless to the party that was utilizing it."* |
| **JWT vs Opaque** | Opaque is the default; JWT is opt-in | The provider config has `enable_jwt_access_token_stateless_introspection` (default: `false`). Their own docs caution: *"Using the JWT Profile for Access Tokens effectively makes the introspection stateless and is discouraged for this purpose unless you have specific performance issues."* So opaque is the recommended mode. |
| **Introspection** | ✅ Yes | Full RFC 7662 introspection endpoint with signed/encrypted response support per-client. |
| **Config-as-Code / API** | ⚠️ Limited | Configuration is a single **YAML file** (`configuration.yml`) — fully declarative and GitOps-friendly (Flux CD compatible). Has a **REST API for auth flows** (login, MFA, session management) but **no management API** for provisioning OIDC clients or users programmatically. No Terraform provider. |

> **Sources:**
>
> - OAuth 2.0 Bearer Token Usage (token prefix): <https://www.authelia.com/integration/openid-connect/oauth-2.0-bearer-token-usage/>
> - OIDC Provider config (`enable_jwt_access_token_stateless_introspection`): <https://www.authelia.com/configuration/identity-providers/openid-connect/provider/>
> - Technical blog on opaque tokens: <https://www.authelia.com/blog/technical-openid-connect-1.0-nuances/>
> - OpenCloud bug confirming opaque access token format: <https://github.com/opencloud-eu/opencloud/issues/2455>

---

## 2. Authentik

| Dimension | Verdict | Details |
| ----------- | --------- | --------- |
| **OAuth 2.0 / OIDC** | ✅ Yes | Comprehensive OIDC/OAuth 2.0 provider. All standard flows, PKCE, device code. |
| **Opaque Tokens** | ⚠️ **UNCERTAIN** | The glossary defines "Token Introspection" as an *"endpoint to validate opaque tokens"* and has the introspection endpoint at `/application/o/introspect/`. However, **I could not find any explicit documentation** confirming whether Authentik can *issue* access tokens in opaque/reference format (as opposed to always JWT). The provider docs focus on JWT signing/encryption alg config. This signals opaque tokens may be used internally (e.g., for refresh tokens) but it's unclear if access tokens can be opaque. |
| **Introspection** | ✅ Yes | RFC 7662 introspection endpoint. Cross-provider introspection supported. |
| **Config-as-Code / API** | ✅ **Excellent** | **Full OpenAPI v3 schema** (`/api/v3/schema/`). Built-in API browser at every instance. **Official Terraform provider** (`goauthentik/authentik` on Terraform Registry). Community Pulumi provider. Strong IaC ecosystem. |

> **Sources:**
>
> - OAuth2 Provider Docs: <https://docs.goauthentik.io/add-secure-apps/providers/oauth2/>
> - API Overview: <https://docs.goauthentik.io/developer-docs/api/>
> - Terraform Provider: <https://registry.terraform.io/providers/goauthentik/authentik/latest/docs>
> - Glossary (introspection = "Endpoint to validate opaque tokens"): <https://docs.goauthentik.io/core/glossary/>

---

## 3. Casdoor

| Dimension | Verdict | Details |
| ----------- | --------- | --------- |
| **OAuth 2.0 / OIDC** | ✅ Yes | OAuth 2.0 / OIDC provider, supports SAML, CAS, LDAP, etc. |
| **Opaque Tokens** | ❌ **NO** | Explicitly documented: *"In Casdoor, `access_token` and `id_token` are the same. Both contain the same JWT payload."* Only four **JWT format variants** exist: `JWT`, `JWT-Empty`, `JWT-Custom`, `JWT-Standard`. There is no opaque/reference token format. |
| **Introspection** | ✅ Yes | Token introspection and revocation are supported, but tokens are always JWTs. |
| **Config-as-Code / API** | ✅ **Good** | RESTful API backend (Golang + Beego). Third-party **Terraform provider** (`prochac/casdoor`). Config via `app.conf` file. |

> **Sources:**
>
> - Token Overview (JWT-only): <https://casdoor.ai/docs/token/overview/>
> - Terraform Provider: <https://registry.terraform.io/providers/prochac/casdoor/latest/docs>

---

## 4. Keycloak

| Dimension | Verdict | Details |
| ----------- | --------- | --------- |
| **OAuth 2.0 / OIDC** | ✅ Yes | Industry-standard OIDC/OAuth 2.0 provider. |
| **Opaque Tokens** | ❌ **NO** | The definitive statement from the Keycloak mailing list (2016, still true today): *"There's no such thing as a 'simple token'. Tokens are always a signed JWT."* GitHub discussion #19649 ("Supporting reference access/refresh tokens") has been open since April 2023 with no resolution. Keycloak is architected to be **stateless** — all token state is encoded in the JWT itself. No server-side token store exists for opaque token lookup. |
| **Workarounds** | Partial | Token Exchange (RFC 8693) can swap tokens, but both input and output are JWTs. The **Phantom Token** pattern (API gateway swaps opaque→JWT) is an architectural workaround, not native support. |
| **Config-as-Code / API** | ✅ **Excellent** | Comprehensive REST Admin API. Official Terraform provider. Well-established IaC ecosystem. |

> **Sources:**
>
> - Keycloak mailing list (tokens always JWT): <https://lists.jboss.org/pipermail/keycloak-user/2016-February/004753.html>
> - GitHub discussion #19649: <https://github.com/keycloak/keycloak/discussions/19649>
> - Keycloak Token Exchange: <https://www.keycloak.org/securing-apps/token-exchange>

---

## 5. Logto

| Dimension | Verdict | Details |
| ----------- | --------- | --------- |
| **OAuth 2.0 / OIDC** | ✅ Yes | Full OIDC/OAuth 2.0 provider. |
| **Opaque Tokens** | ✅ **YES — conditional** | When **no resource indicator** is specified during authentication, Logto issues an opaque access token (random string). Example from their docs: `"access_token": "some-random-string"`. If a resource IS specified, a JWT is issued instead. |
| **Limitations** | ⚠️ Notable | Logto's opaque tokens **cannot be used as organization tokens** — org tokens are always JWT. Custom claims are supported for both formats. |
| **Introspection** | ✅ Yes | RFC 7662 introspection at `/oidc/token/introspection`. Supports both HTTP Basic and POST client auth. |
| **Config-as-Code / API** | ✅ **Good** | Comprehensive **Management API** (REST). OpenAPI/Swagger spec at `/api/swagger.json`. **No first-party Terraform provider** found, but the Management API is extensive enough for automation scripts. |

> **Sources:**
>
> - Opaque Token docs: <https://docs.logto.io/concepts/opaque-token>
> - Custom Token Claims: <https://docs.logto.io/developers/custom-token-claims>
> - Management API: <https://docs.logto.io/integrate-logto/interact-with-management-api>

---

## 6. ZITADEL

| Dimension | Verdict | Details |
| ----------- | --------- | --------- |
| **OAuth 2.0 / OIDC** | ✅ Yes | Full OIDC/OAuth 2.0 provider. SAML also supported. |
| **Opaque Tokens** | ✅ **YES — default** | Opaque tokens are the **default token type** in ZITADEL. Has a dedicated docs page explaining the architecture. The platform is designed around opaque tokens as the primary model with JWT as an alternative. |
| **JWT vs Opaque** | Both supported | ZITADEL supports both and compares them in depth — opaque for security/confidentiality, JWT for performance/scalability. Explicitly documents trade-offs. |
| **Introspection** | ✅ Yes | RFC 7662 introspection. Works for both opaque and JWT tokens. *"Unlike client side JWT validation, this endpoint will check if the token is still valid."* |
| **Config-as-Code / API** | ✅ **Excellent** | **Full gRPC and REST APIs** (v2 recommended for new integrations). Management, Admin, Auth, System APIs. **Official Terraform provider** (`zitadel/zitadel` on Terraform Registry). Postman collection. Multiple SDKs. JavaScript Actions for custom logic. |

> **Sources:**
>
> - Opaque Tokens concept: <https://zitadel.com/docs/concepts/knowledge/opaque-tokens>
> - Token Introspection: <https://zitadel.com/docs/guides/integrate/token-introspection>
> - API Reference: <https://zitadel.com/docs/apis/introduction>
> - Terraform Provider: <https://zitadel.com/docs/guides/manage/terraform-provider>
> - JWT vs Opaque blog: <https://zitadel.com/blog/jwt-vs-opaque-tokens>

---

## Summary Matrix

| IdP | OAuth 2.0/OIDC | Opaque Access Tokens | Config-as-Code / API | Overall Fit |
| ----- | :---: | :---: | :---: | --- |
| **Authelia** | ✅ | ✅ **Default** | ⚠️ YAML only; no mgmt API | Best for simple setups; no runtime provisioning |
| **Authentik** | ✅ | ⚠️ **Uncertain** | ✅ Excellent (Terraform + API) | Needs verification on opaque token issuance |
| **Casdoor** | ✅ | ❌ **JWT only** | ✅ Good (API + TF) | Not suitable for opaque token requirement |
| **Keycloak** | ✅ | ❌ **JWT only** | ✅ Excellent (API + TF) | Not suitable for opaque token requirement |
| **Logto** | ✅ | ✅ **Conditional** | ✅ Good (Mgmt API) | Opaque when no resource specified; no org-token opaque |
| **ZITADEL** | ✅ | ✅ **Default** | ✅ Excellent (gRPC/REST + TF + SDKs) | **Strongest overall match** |

### Key Takeaways

1. **ZITADEL** is the strongest candidate: opaque by default, excellent API surface, official Terraform provider, comprehensive documentation on the opaque-vs-JWT trade-off. It was purpose-built with both token formats as first-class citizens.

2. **Logto** is a good runner-up but has the limitation that requesting a resource indicator forces JWT, and organization tokens are always JWT. If your API auth doesn't require org tokens, this may be fine.

3. **Authelia** has the right token model (opaque by default) but lacks a management API for programmatic client/user provisioning — you'd need to restart the service to pick up YAML changes or build custom automation around its limited REST API.

4. **Authentik's** opaque token support is the main uncertainty in this analysis — it has introspection, but I couldn't confirm it can *issue* opaque access tokens (vs only opaque refresh tokens). Would recommend testing directly.

5. **Keycloak** and **Casdoor** are definitively JWT-only and unsuitable if opaque access tokens are a hard requirement.
