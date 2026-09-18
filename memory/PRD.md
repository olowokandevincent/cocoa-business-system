# Cocoa Ledger — PRD

## Original Problem Statement
Private, business record web app for a small cocoa trader (owner in his 70s + trusted staff). Digitizes the physical notebook: customers, debts, repayments, cocoa store records, and a separate cocoa rate page. Originally specified as offline/SQLite; user's final instruction: "make it online now" → built on React + FastAPI + MongoDB. Not a marketplace or customer-facing app.

## Architecture
- Frontend: React 19, react-router, Tailwind + shadcn/ui, Playfair Display + Plus Jakarta Sans, warm-cocoa high-contrast senior-friendly theme.
- Backend: FastAPI, JWT httpOnly-cookie auth, MongoDB (motor).
- Integrations: JWT custom auth (admin/staff roles); live global cocoa price via Alpha Vantage (optional key, graceful fallback).

## User Personas
- Owner (Admin): full control — edit/delete confirmed records, set cocoa rate, manage staff.
- Staff: create customers/records, add debts/repayments/weights; cannot delete or edit confirmed records; no staff management.

## Core Requirements (static)
- Sequential permanent customer IDs (001, 002...), searchable by ID/name/phone/caretaker.
- Dashboard: customers, total owed, cocoa in store, unscaled count, today's records, confidential Cocoa Rate tile (never shows price on dashboard).
- Cocoa arrivals are general store stock (NOT tied to the customer who brought them).
- Scaled vs unscaled cocoa; enter weight later to mark scaled.
- Edit-safety: read-only by default with an unlock switch; two-step confirm on deletes.
- Currency NGN, weight kg (64kg/bag).

## Implemented (2026-06)
- JWT auth with seeded admin, brute-force lockout, role-based access. ✅
- Dashboard with 6 stat tiles incl. confidential rate tile. ✅
- Customers list + debounced search + add + profile (caretakers, debts, repayments, full history, edit-lock, built-in calculator). ✅
- Cocoa store records: scaled/unscaled arrivals, enter-weight flow, human-readable store summary, status filters, admin-only delete. ✅
- Cocoa Rate page: admin buying rate + history, payout calculator, live global price (graceful unavailable state). ✅
- Staff management (admin): create, activate/deactivate, delete. ✅
- Tested: 21/21 backend pytest + full frontend E2E, 100% pass.

## Backlog / Remaining
- P1: Set ALPHA_VANTAGE_KEY to enable live global cocoa price value.
- P2: Explicit CORS origin (currently '*'); server-side password strength; split server.py into routers; FastAPI lifespan handlers.
- P2: Daily cocoa history export / date-range picker; receipt printing.

## Next Tasks
- Optionally add Alpha Vantage key for live pricing.
- Await user feedback for feature depth.
