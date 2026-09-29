# Google + Local Authentication via ASP.NET Core Identity

**Status:** Approved for implementation planning
**Date:** 2026-09-29
**Relationship to other plans:** Independent of `implementation-plan.md` (the gold/silver live-price pipeline). That plan explicitly defers "user identity" to a follow-up plan; this spec is that follow-up, built standalone. Nothing here depends on the price pipeline being complete, and the price pipeline does not depend on this.

## Goal

Give MarketPulse authenticated accounts: users can register/login with email+password, or sign in with Google. Authentication uses ASP.NET Core Identity with cookie-based sessions, backed by PostgreSQL via EF Core. This is the foundation later work (watchlists, alerts) will build on — but this slice delivers only account creation/authentication, not those downstream features.

## Success criteria

- A visitor can register a local account (email + password) and is signed in immediately after.
- A registered user can log in and log out with a cookie session.
- A visitor can sign in with Google; first-time Google sign-in auto-provisions a local account from the Google identity; a returning Google user is matched to the same account.
- `GET /api/v1/auth/me` returns the current user's identity when authenticated, 401 when anonymous.
- All of the above covered by unit tests (validation/mapping logic) and integration tests (full register/login/me/logout round trips, plus Google callback provisioning) against a real PostgreSQL test instance.

## Out of scope

Roles/authorization policies beyond authenticated-vs-anonymous, email confirmation, password reset, account lockout tuning, 2FA, production cookie-domain/hosting topology, and any watchlist/alert features that will eventually consume the logged-in user.

## Architecture & layering

Identity stays infrastructure-only. `Domain` and `Application` are not coupled to ASP.NET Core Identity types:

- `Application` gains a minimal port: `ICurrentUser` — exposes the current user's id and email (both nullable/empty when anonymous). This is the only way future application-layer code (watchlists, alerts) should learn who's logged in.
- `Infrastructure/Identity/` owns:
  - `ApplicationUser : IdentityUser<Guid>`
  - `ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>` (Npgsql provider)
  - EF Core migrations under `Infrastructure/Identity/Migrations/`
  - An `ICurrentUser` implementation backed by `IHttpContextAccessor`/`ClaimsPrincipal`
- `Api` is the composition root: registers `AddIdentityCore<ApplicationUser>()` + `AddRoles<IdentityRole<Guid>>()`, `AddAuthentication().AddCookie().AddGoogle(...)`, EF Core DbContext, and maps the auth endpoints.

This keeps `IdentityRole<Guid>` wired in now (so role support is a config/data change later, not a schema migration), even though no roles are seeded or enforced in this slice.

## Data model

Standard ASP.NET Core Identity EF Core schema (`AspNetUsers`, `AspNetRoles`, `AspNetUserLogins`, `AspNetUserClaims`, etc.) generated via `IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>`. This lives in the same PostgreSQL instance Plan.md designates as the application's relational source of truth — not a separate database. No custom columns on `ApplicationUser` beyond Identity's defaults are needed for this slice.

## Endpoints

All under `src/MarketPulse.Api/Endpoints/AuthEndpoints.cs`, routed at `/api/v1/auth/...`:

| Method & path | Behavior |
|---|---|
| `POST /register` | Body: email, password. Creates a local `ApplicationUser` via `UserManager`, then signs in with a cookie via `SignInManager`. Returns 400 with Identity's validation errors (weak password, duplicate email) on failure. |
| `POST /login` | Body: email, password. `SignInManager.PasswordSignInAsync`. Returns 401 on invalid credentials. |
| `POST /logout` | Clears the authentication cookie via `SignInManager.SignOutAsync`. Requires an authenticated request. |
| `GET /google/login?returnUrl=` | Issues a `ChallengeResult` for the Google authentication scheme; `returnUrl` is validated against an allow-list of known app origins (no open redirect) and threaded through to the callback. |
| `GET /google/callback` | Completes `SignInManager.ExternalLoginSignInAsync`. If no local user is linked to this Google identity, auto-provisions one from the Google email claim (or links to an existing local account with the same email) via `UserManager.CreateAsync` + `AddLoginAsync`, then signs in with a cookie. Redirects to the validated `returnUrl`. |
| `GET /me` | Returns `{ id, email, hasPassword, externalLogins: string[] }` for the current user. 401 if anonymous. |

## Cookie + SPA integration

Cookie auth: `HttpOnly`, `SameSite=Lax`, `Secure` outside local dev. In local development, the Angular dev server proxies `/api/*` to the API so requests are same-origin from the browser's point of view — no `SameSite=None`/cross-site CORS-with-credentials complexity needed locally. Production hosting topology (shared parent domain vs. reverse proxy) is left as an open item for the deployment/follow-up plan — not solved here.

## Config & secrets

Google OAuth `ClientId`/`ClientSecret` are read from configuration at `Authentication:Google:ClientId` / `Authentication:Google:ClientSecret`. Local development sets these via `dotnet user-secrets set` on `MarketPulse.Api` — never committed. `.env.example` and the README document the required configuration keys (names only, no real values) and note that the Google Cloud Console OAuth client's authorized redirect URI must be `.../api/v1/auth/google/callback` for each environment.

## Testing strategy

- **Unit tests** (`MarketPulse.UnitTests`): request validation for register/login inputs; `ICurrentUser` mapping from a `ClaimsPrincipal` to id/email, including the anonymous case.
- **Integration tests** (`MarketPulse.IntegrationTests`), against a real PostgreSQL instance (test container, consistent with the existing integration-test approach):
  - Register → login → `GET /me` round trip returns the expected identity.
  - Duplicate email registration is rejected with a 400 and does not create a second user.
  - Logout clears the session; a subsequent `/me` call returns 401.
  - Google callback: first-time sign-in provisions a new `ApplicationUser` and links the external login; a second sign-in with the same external identity reuses the same user (no duplicate). The Google handshake itself is not exercised against real Google — the external login/claims are simulated at the `SignInManager`/test-authentication-handler level.

## Self-review

- **Placeholder scan:** no TBD/TODO; the only explicitly deferred items are named under "Out of scope."
- **Internal consistency:** layering section and endpoint section agree on where `ApplicationUser`/`ApplicationDbContext` live; `ICurrentUser` is introduced once and used consistently as the Application-layer seam.
- **Scope check:** single cohesive slice (identity + Google login), no unrelated feature creep (watchlists/alerts explicitly excluded).
- **Ambiguity check:** redirect-URL validation, cookie SameSite policy, and duplicate-email-vs-Google-linking behavior are all specified explicitly rather than left implicit.
