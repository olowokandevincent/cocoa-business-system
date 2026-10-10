# AGENTS.md

Notes for anyone (human or agent) working on this repo inside the Base44 sandbox.

## What this app is

Cocoa Ledger — private business-records app for a small cocoa trader.
- `frontend/` — React 19 CRA app (react-scripts 5 + craco), Tailwind + shadcn/ui, react-router.
- `backend/server.py` — single-file FastAPI app, JWT auth stored in **httpOnly cookies**, MongoDB via `motor`.
- `memory/PRD.md` — product spec and feature history. `backend/tests/backend_test.py` — API regression suite.

## Running it here (development, live reload)

```bash
docker compose -f docker-compose.base44.yml up -d --build
docker compose -f docker-compose.base44.yml ps
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/     # expect 200
```

- `web` (node:20) — CRA dev server on **port 3000** (the preview entry point), source bind-mounted,
  `node_modules` in a named volume that is synced from `yarn.lock` on every container start.
- `api` (python:3.12-slim) — `uvicorn --reload` on internal port 8001, source bind-mounted.
  Backend edits reload automatically; `WATCHFILES_FORCE_POLLING=true` is required because the
  source lives on a bind mount.
- `mongo` (mongo:7) — data in the `app_mongo_data` volume. No migrations/seeds to run: the app
  creates its indexes and seeds the admin account on startup.

Log in with the credentials documented in `auth_testing.md` (also set as sandbox defaults in
`.env.base44-defaults`, read by `backend/server.py` on startup):
`olowokandevincent0@gmail.com` / `Cocoa@2026`.

## Non-obvious setup facts

- **Single origin on purpose.** `web` proxies `/api` to `http://api:8001`, and
  `REACT_APP_BACKEND_URL` is set to the empty string so `frontend/src/lib/api.js` calls the
  relative `/api` path. Auth uses httpOnly cookies with `SameSite=none; Secure`, so they only
  survive inside the preview if the API is on the page's own origin. Publishing the API on a
  second host port instead would break login in the preview iframe.
- **`frontend/craco.config.js` has a `BASE44_PREVIEW_MODE === "1"` block** that (a) adds the
  `/api` dev-server proxy from `API_PROXY_TARGET` and (b) appends
  `.<BASE44_SANDBOX_HOST_DOMAIN>` to webpack-dev-server's `allowedHosts`, because the preview
  reaches the dev server under a rotating sandbox hostname. Both are no-ops when the flag is
  unset, i.e. outside the sandbox nothing changes. No other app code is sandbox-gated.
- **`backend/Dockerfile.base44` is an image for dependencies only** — the source is always
  bind-mounted, never baked in. It installs `backend/requirements.txt` minus
  `emergentintegrations`, which exists only on the platform's private index and is not imported
  anywhere in this repo. Everything else is installed at the committed pins.
- **`JWT_SECRET` is required at boot** (`os.environ["JWT_SECRET"]`); the sandbox gets a generated
  development value from the Base44 secrets store, delivered via `/run/base44/app.env`, which
  compose lists **after** `.env.base44-defaults` so real values always win.
- **`ALPHA_VANTAGE_KEY` is optional** (live global cocoa price on the Cocoa Rate page). Empty is a
  supported state: the page shows its "live price unavailable" message.
- **Dashboard is the "Market Ledger" view** (ruled-paper page, dark ink-green band, numbered ledger
  rows with dotted leaders). Its cocoa imagery is committed under `frontend/public/cocoa/`
  (`cocoa-pods.jpg`, `cocoa-beans.jpg`) and referenced by absolute path, e.g. `/cocoa/cocoa-pods.jpg`.
- **`GET /api/cocoa-rate/live` is admin-only** and, besides the USD figures, now returns `usdngn`,
  `ngn_per_kg` and `trend_ngn` — the same global market converted to naira via Yahoo `NGN=X`. The
  FX call is best-effort: if it fails those keys are simply absent and the UI falls back to USD.
  The dashboard shows the naira figure and live chart to the **owner only**; staff see "Confidential",
  preserving the long-standing "no price on the dashboard" rule. Staff requests to this endpoint
  return 403 (verified), so the secrecy is enforced server-side, not just in the UI.
- Startup is slow the first time: `pip install` of the pinned requirements at image build, then
  `yarn install` into a cold `node_modules` volume on first container start.

## Verifying a change

- Frontend: edits hot-reload; the dev server logs `Compiled successfully` / compile errors.
- Backend: `docker compose -f docker-compose.base44.yml logs -f api` shows the reload.
- API smoke test through the proxy (cookies need https, so use the public preview URL —
  plain `http://localhost:3000` won't persist `Secure` cookies in curl):

```bash
B="https://3000-$BASE44_PUBLIC_HOST_SUFFIX"
curl -s -c /tmp/j.txt -X POST "$B/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"olowokandevincent0@gmail.com","password":"Cocoa@2026"}'
curl -s -b /tmp/j.txt "$B/api/customers"
```

- Regression suite (points at a running server; uses the admin credentials above):

```bash
docker compose -f docker-compose.base44.yml exec -T \
  -e REACT_APP_BACKEND_URL="https://3000-$BASE44_PUBLIC_HOST_SUFFIX" \
  api python -m pytest tests/backend_test.py -q
```
