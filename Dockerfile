# Production image: the React app is compiled and then served by the FastAPI process, so the
# browser only ever talks to one origin — which is what the httpOnly session cookie needs.
#
# This file is for deployment only. The Base44 sandbox does not use it: docker-compose.base44.yml
# runs the CRA dev server and `uvicorn --reload` from a bind mount so edits appear live.

# ---------- 1. build the frontend ----------
FROM node:20-slim AS web
WORKDIR /web

COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY frontend/ ./
# CRA inlines this at build time. Empty means "call the API on my own origin" (/api).
ENV REACT_APP_BACKEND_URL=""
RUN yarn build

# ---------- 2. api + static runtime ----------
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY backend/requirements.txt /tmp/requirements.txt
# Two pins are not installable outside the platform this repo came from:
# `emergentintegrations` (published on a private index) and the `litellm` wheel on
# customer-assets.emergentagent.com. Nothing in backend/ imports either of them, so they are
# skipped; every other dependency is installed at the committed pin.
RUN grep -viE '^(emergentintegrations|litellm @)' /tmp/requirements.txt > /tmp/requirements-prod.txt \
    && pip install --no-cache-dir -r /tmp/requirements-prod.txt

COPY backend/ ./
COPY --from=web /web/build ./frontend_build

# server.py serves this directory itself when it is set (unset in the sandbox → unchanged).
ENV FRONTEND_BUILD_DIR=/app/frontend_build

EXPOSE 8000
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
