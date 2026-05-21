---
status: complete
created: 2026-05-21
quick_id: 260521-efz
slug: audit-restliche-direkte-frontend-api-med
---

# Audit Restliche Direkte Frontend API-/Media-Pfade Auf Docker-Live 3002

## Goal
Audit remaining direct frontend API/media URL construction for Docker-live `3002` and fix only real runtime/proxy-path problems. Keep the central Auth/API client as the only token owner.

## Plan
1. Search frontend production source for direct `NEXT_PUBLIC_API_URL`, `localhost:8092`, `127.0.0.1:8092`, and direct fetch usage.
2. Classify findings into central client, explicit server boundaries, and browser-facing public/media helpers.
3. Fix only browser-facing public/media helpers that could build direct loopback backend URLs in the browser.
4. Add a static guard so browser-facing production source cannot reintroduce direct loopback backend fallbacks.
5. Run focused tests, typecheck, build, and a Docker-live smoke check on `3002`.

## Scope Guard
- Do not change page-local auth behavior.
- Do not add raw token reads or bearer construction to screens.
- Do not redesign Jellyfin/streaming auth; server streaming routes remain documented separate boundaries.
