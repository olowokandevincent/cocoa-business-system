# Deploying Cocoa Ledger (Render + MongoDB Atlas)

The app is one web service: the compiled React bundle is served by the FastAPI process itself,
so the browser talks to a single origin and the httpOnly session cookie works. `render.yaml` in
the repo root describes that service; `Dockerfile` builds it.

You need two accounts, both free to start: [Render](https://render.com) and
[MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

## 1. Merge the deployment branch

Render deploys the repository's default branch (`main`). The app changes and the deploy config
live on `base44/setup-4dc04e62` until that PR is merged — deploy before merging and you get the
old app.

## 2. Create the database (Atlas)

1. Create a **free M0 cluster** (any region close to Frankfurt).
2. **Database Access** → add a user with a password (this is your database login, not your app login).
3. **Network Access** → allow `0.0.0.0/0`. Render's free instances have no fixed outbound IP, so
   the allowlist cannot be narrower without a paid static IP.
4. **Connect → Drivers** and copy the connection string:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`

## 3. Create the service (Render)

1. **New → Blueprint**, pick this repository. Render reads `render.yaml`.
2. Fill in the prompted values:
   - `MONGO_URL` — the Atlas string from step 2 (URL-encode special characters in the password).
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — your real owner login; the account is created on first boot.
   - `ALPHA_VANTAGE_KEY` — optional, the free key from alphavantage.co (realtime naira rate).
   - `DEMO_EMAIL` / `DEMO_PASSWORD` — optional; leave blank to switch the demo login off.
   - `JWT_SECRET` is generated for you.
3. Wait for the first build (the React build takes a few minutes), then open the service URL —
   `https://<service-name>.onrender.com`. That is the link to send to a phone: HTTPS, permanent,
   and safe to bookmark.

If the build fails with `JavaScript heap out of memory`, the free instance is too small for the
React build: retry on the Starter plan, or build the image elsewhere and deploy it.

## 4. Give someone access

There is no self-signup. Create the account yourself on the **Staff** page and send the person the
URL plus those credentials. Keep the `DEMO_*` login switched off unless you want strangers holding
owner-level access to your ledger.

## Changing settings later

- Environment variables: Render dashboard → the service → **Environment**.
- Changing `ADMIN_PASSWORD` on Render updates that account's password on the next deploy/restart.
- Pushing to `main` redeploys automatically (`autoDeploy: true`).

## The sandbox is untouched

`docker-compose.base44.yml` still runs the development servers on port 3000 for the Base44 preview.
The Dockerfile is only used by Render, and the static-serving code in `backend/server.py` activates
only when `FRONTEND_BUILD_DIR` is set — which the sandbox never sets.
