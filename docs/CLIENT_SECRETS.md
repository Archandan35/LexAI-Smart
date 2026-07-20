# Client Secrets & Backend Proxy Guide

## Why this exists

LexAI is a client-side SPA. Every `VITE_*` variable in your `.env` is **inlined
into the shipped JavaScript bundle** by Vite at build time. Anyone who opens the
app and chooses "View Page Source" (or downloads `/assets/index-*.js`) can read
those values. The HTML shell itself is harmless — it contains no logic. The risk
is what ends up in the JS bundle.

This is **unavoidable for a pure SPA**: the browser must hold any key it uses
directly. The fix is to never let a privileged secret reach the browser, and to
route privileged operations through a backend.

## What is safe in the browser

These are designed to be public and are fine in `VITE_` vars:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — the anon key is scoped by
  Row-Level Security; it is not a secret.
- `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_API_KEY` — public Web API keys.
- `VITE_GOOGLE_DRIVE_CLIENT_ID` — public OAuth client id.
- OAuth provider client ids, project ids, bucket names.

## What must NEVER ship to the browser

| Secret | Risk if leaked |
| --- | --- |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | **CRITICAL** — bypasses RLS, full DB admin. Anyone can read/delete all data. |
| `VITE_GOOGLE_DRIVE_REFRESH_TOKEN` | **HIGH** — long-lived; mints access tokens to a user's Drive. |
| `VITE_FIREBASE_ACCESS_TOKEN` | **HIGH** — bearer credential; acts as the signed-in user. |
| `VITE_OPENAI_API_KEY` / `VITE_ANTHROPIC_API_KEY` / `VITE_GEMINI_API_KEY` / `VITE_INDIANKANOON_API_KEY` | **MEDIUM** — billed to your account; abuse = cost + quota theft. |

> A startup guard (`src/security/clientSecretGuard.js`) scans `import.meta.env`
> and logs a loud console error if any of these are present in the bundle.

## What changed

- `src/config/config.js` no longer reads `supabaseServiceRoleKey`. The client
  never holds the service-role key.
- `src/providers/database/SupabaseDatabaseProvider.js` no longer bootstraps
  `exec_sql` or runs SQL via `/pg/v1/sql` with a service-role key. It only calls
  the `exec_sql` RPC (which must already exist) and otherwise returns
  `needsManual`.
- `src/services/setup/InstallationExecutor.js` prefers the backend proxy
  (`VITE_BACKEND_URL`) when configured, so installation that needs elevated
  privileges runs **server-side**.

## Recommended: backend proxy

Set `VITE_BACKEND_URL` to your API server. The app already has the proxy wiring:

- `src/config/backend.js` — `backendConfig` (base URL, endpoints).
- `src/backend/BackendGateway.js` — `installDatabase`, `testDatabase`, etc.
- `src/core/apiClient.js` — authenticated fetch to the backend.

### Install (service-role key stays server-side)

1. Put `SUPABASE_SERVICE_ROLE_KEY` (and any other secrets) in the **backend's**
   environment, never the frontend `.env`.
2. Implement `POST /api/v1/database/install` on the backend using its server-side
   Supabase admin client. The backend runs the migration SQL.
3. Frontend `InstallationExecutor.executeAll` already calls
   `BackendGateway.installDatabase({ sql })` when `BackendGateway.configured`.

### AI provider keys (avoid client billing abuse)

For multi-user / untrusted deployments, proxy AI calls:

1. Backend holds `OPENAI_API_KEY` etc. in its own env.
2. Add a backend route (e.g. `POST /api/v1/ai/completion`) that calls the
   provider and returns the result.
3. Point the AI providers at the backend instead of embedding the key.
   (Single-admin self-hosted installs may keep keys client-side; the exposure is
   limited to the operator who already controls the deployment.)

### Google Drive / Firebase tokens

OAuth refresh/access tokens must be exchanged and stored on the backend. The
frontend should only ever receive short-lived, scoped access tokens from your
backend — never the refresh token or a long-lived access token.

## Quick checklist before deploy

- [ ] No `VITE_*SERVICE_ROLE*`, `VITE_*REFRESH_TOKEN*`, `VITE_*ACCESS_TOKEN*`
      in frontend `.env`.
- [ ] `VITE_BACKEND_URL` set if you need install / AI proxying.
- [ ] Backend env holds the real secrets (not committed to the repo).
- [ ] Open the built `dist/index.html` → "View Page Source" and confirm no
      secret strings appear; grep the bundle: `grep -R "eyJ\|service_role" dist/assets`.
