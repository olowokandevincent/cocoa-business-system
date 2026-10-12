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
  source lives on a bind mount. **Changing `.env.base44-defaults` needs `docker compose up -d api`** —
  `env_file` is read at container creation, not on the code reload.
- `mongo` (mongo:7) — data in the `app_mongo_data` volume. No migrations/seeds to run: the app
  creates its indexes and seeds the owner (and optionally the demo) account on startup.

Log in with the credentials documented in `auth_testing.md` (also set as sandbox defaults in
`.env.base44-defaults`, read by `backend/server.py` on startup):
owner `olowokandevincent0@gmail.com` / `Cocoa@2026`, demo `demo@cocoaledger.app` / `CocoaDemo@2026`.

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
- **`ALPHA_VANTAGE_KEY` supplies the naira leg of the live market** — `alpha_vantage_usdngn()`
  in `backend/server.py` calls `CURRENCY_EXCHANGE_RATE` (USD→NGN). Alpha Vantage has **no cocoa
  product** (only copper/corn/cotton/sugar/coffee/wheat/aluminum), so the price itself still comes
  from the global market feed and the key only provides the realtime FX rate. It is **optional at
  boot**: unset, or the call failing, silently falls back to Yahoo `NGN=X`, so the naira chart
  appears either way. The free tier allows 25 calls/day, which the 6-hour cache keeps us inside.
- **`GET /api/cocoa-rate/live` is open to every signed-in user** (owner *and* staff) and, besides the
  USD figures, returns `usdngn`, `ngn_per_kg`, `trend_ngn` and `fx_source` (`"alpha_vantage"` or
  `"yahoo"`) — the same public global market converted to naira. The FX call is best-effort: if both
  sources fail those keys are simply absent and the UI falls back to USD. The dashboard and the
  Cocoa Rate page show the naira figure and live chart to everyone; both poll it every 30 s.
  **Only the private buying rate stays owner-only** (`POST /api/cocoa-rate` is still `require_admin`,
  as is `GET /api/staff`).
- Startup is slow the first time: `pip install` of the pinned requirements at image build, then
  `yarn install` into a cold `node_modules` volume on first container start.

## The "Cocoa Estate" visual language (current design)

Every page shares one theme, defined in **`frontend/src/styles/cocoa-estate.css`**:

- A dark cocoa-bark canvas (radial warmth + a faint cocoa-bean SVG texture) with a photographic
  "estate wall" (`ESTATE` in `frontend/src/styles/imagery.js`) fixed behind it. Cream "ledger
  sheet" cards carry a gold hairline; controls are burnished amber with a pressed 3D edge.
- `frontend/src/styles/imagery.js` is the single registry of photography (the plantation, the pods
  drying on a mat, the sack store, plus the committed `public/cocoa/*.jpg`).
- Shared components: `CocoaMark`/`CocoaBrand` (logo), `PageHeader` (the photographic page banner),
  `components/dashboard/LedgerTile.jsx` (the six dashboard tiles; it replaced `GlassTile.jsx`).
- **The logo is a real cocoa photograph**: `frontend/public/cocoa/logo.jpg`, a 320×320 centre crop of
  the drying-pods photo, framed in a gold ring by CSS. Regenerate it by copying a source image into
  the `api` container (Pillow is installed there) and copying the crop back out.
- **Load order matters.** `src/index.js` imports `index.css` and *then* `styles/cocoa-estate.css`,
  so the theme sits after Tailwind's utilities in the emitted stylesheet and wins on equal
  specificity. The theme therefore sets no `display` where markup relies on responsive utilities —
  `.ce-hdr`, `.ce-nav` and `.ce-btn` deliberately omit it, and callers pass `hidden lg:flex` /
  `flex lg:hidden`. Keep it that way, or `hidden`/`lg:*` break.
- **Form furniture**: the rewritten pages use native inputs carrying `.ce-field` / `.ce-input`
  (`.ce-input` also styles `textarea`) instead of the shadcn `Input`, so dialogs keep one look.
  Dialogs pass `className="ce-dialog"`; confirm buttons are wrapped in `AlertDialogAction asChild`
  so Radix closes the dialog after the handler runs.
- `:root` in `index.css` carries the Tailwind/shadcn tokens in the warm palette, so shadcn
  primitives (dialog/alert-dialog surfaces, switches, toasts) match the theme without being touched.

## The demo account

- Seeded on startup **only when both `DEMO_EMAIL` and `DEMO_PASSWORD` are set** (see
  `.env.base44-defaults`); with either empty, no account is created at all.
- `GET /api/auth/demo` is public and returns `{available: true, email, password}` (or
  `{available: false}`), which is how the sign-in page offers its "Enter demo" button without
  hardcoding credentials in the frontend bundle.
- The demo account is created with `role: "admin"` so a demo shows the whole app, including the
  owner-only controls (setting the buying rate, staff management). It therefore exposes owner-level
  access to anyone with the sign-in page — switch it off by clearing `DEMO_EMAIL`/`DEMO_PASSWORD`
  (or set them to something private) before showing the app to the public.

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
curl -s "$B/api/auth/demo"     # the demo login offered on the sign-in page
```

- Regression suite (points at a running server; uses the owner credentials above):

```bash
docker compose -f docker-compose.base44.yml exec -T \
  -e REACT_APP_BACKEND_URL="https://3000-$BASE44_PUBLIC_HOST_SUFFIX" \
  api python -m pytest tests/backend_test.py -q
```

- In the preview, a screenshot alone proves nothing about layout maths: compare
  `document.documentElement.scrollWidth` with `clientWidth`. On a page tall enough to scroll,
  Chrome reports ~8 px more for the classic scrollbar even with no horizontal overflow — measure
  element `getBoundingClientRect().right` against the *initial containing block* before calling it
  a defect.
