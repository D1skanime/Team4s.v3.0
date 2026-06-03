---
phase: 70-tiptap-bilder-fuer-member-profilgeschichte
plan: "07"
subsystem: verification
tags: [verification, uat, test-suite, roadmap, migration-smoke]
status: code-complete-uat-pending
dependency_graph:
  requires:
    - 70-03 (TipTap-Service Image-Node)
    - 70-04 (Upload-Handler + Repository)
    - 70-05 (Frontend Extension + Upload-Utility)
    - 70-06 (Save-Flow: IDOR + Cleanup + deferred Batch-Upload)
  provides:
    - Automatisierte Verifikation (Backend-Suite gruen, Phase-70-Frontend-Tests gruen)
    - Migration-0090-Smoke (DB-Spalte + Index bestaetigt)
    - ROADMAP-Korrekturen (SC1 D-05-Gap, SC5 D-13-Override) bestaetigt vorhanden
  affects:
    - .planning/ROADMAP.md
tech_stack:
  added: []
  patterns:
    - DB-Smoke via information_schema.columns + pg_indexes statt Browser-UAT
    - Out-of-scope Test-Triage via git log -1 je Fehlerquelle
key_files:
  created:
    - .planning/phases/70-tiptap-bilder-fuer-member-profilgeschichte/70-07-SUMMARY.md
  modified: []
decisions:
  - "Task 2 (7 Browser-UAT-Szenarien) per User-Entscheidung auf 'Migration anwenden + Smoke' reduziert — funktionale Browser-Verifikation bleibt ausstehend (UAT-pending)."
  - "13 fremde Frontend-Test-Fehler (Phasen 50/66) als out-of-scope eingestuft und NICHT behoben — gehoeren parallelen Agenten (per User-Entscheidung 'nur melden')."
  - "Migration 0090 wird nicht manuell angewendet — Backend-Entrypoint hatte sie beim Container-Start bereits ausgefuehrt (DB-Smoke bestaetigt)."
  - "Backend-Container NICHT rebuilt — geteilte Infra (:8092) mit parallelen 50/66/67-Agenten; Rebuild ist Voraussetzung fuer Browser-UAT und bleibt dem User ueberlassen."
---

# Plan 70-07 — Verifikation + UAT

## Was verifiziert wurde (automatisiert)

**Task 1 — Test-Suiten:**
- Backend `go test ./... -count=1`: **vollstaendig gruen** (alle Pakete inkl. handlers, services, repository, models).
- Frontend Phase-70-Tests: **17/17 gruen** (`StoryImageExtension.test.ts`, `storyImageUpload.test.ts`); TipTap-Service-Image-Tests + Handler-Tests (IDOR/RoundTrip/Cleanup/PixelBomb/EXIF) gruen.
- Frontend `tsc --noEmit`: sauber.

**Task 1 — ROADMAP-Korrekturen (bereits vorhanden, bestaetigt):**
- SC1 traegt `[Korrigiert D-05]` — Alt-/Caption-Text als dokumentierter Contract-Gap.
- SC5 traegt `[Ueberschrieben D-13]` — Cleanup-on-Save in Phase 70 implementiert.
- Alle 7 Plaene gelistet; Fortschritts-Count wird per SDK gefuehrt.

**Migration-0090-Smoke (statt Browser):**
- DB `team4s_v2`: Spalte `media_assets.owner_member_id` (bigint, nullable) existiert.
- Index `idx_media_assets_owner_member` existiert.
- Route `POST /api/v1/me/profile/story-images` im committeten Source registriert (`main.go:281`, mit `authMiddleware`).
- Backend `/health`: HTTP 200.

## Offene Punkte (NICHT abgeschlossen)

### Browser-UAT ausstehend (Task 2 — blockierender human-verify Gate)
Die 7 funktionalen UAT-Szenarien wurden NICHT durchgefuehrt (User waehlte Smoke statt Browser-UAT):
1. Round-Trip (D-21) · 2. Cleanup-on-Save (D-22) · 3. IDOR 422 (D-23) ·
4. Public-Profil (D-24) · 5. Sanitizing (D-20/D-23) · 6. Upload-Fehler-Atomizitaet (D-06/D-07) ·
7. /me/profile Lesemodus (D-12).

**Voraussetzung fuer UAT:** Backend-Container ist stale (Build 09:04 UTC, vor den 70-03..70-06-Commits) →
laufender `:8092` liefert 404 auf den neuen Endpoint. Vor dem Browser-UAT muss das Backend neu
gebaut/gestartet werden (`docker compose up -d --build team4sv30-backend`). Dev-Server `:3000` fuers Frontend.

### Out-of-scope Test-Fehler (nur gemeldet, nicht behoben)
13 Frontend-Test-Fehler aus Fremdphasen, per git-Triage zugeordnet:
- `api.no-token-boundary.test.ts` — `authToken`-Props in `MemberClaimSection.tsx` (`feat 66-06`), `fetch` in `ProfileBackgroundCard.tsx` (vorbestehend).
- `admin/anime/page.test.tsx`, `admin/anime/create/page.test.tsx`, `useAdminAnimeCreateController.test.ts` — Admin-Anime/Jellyfin (`feat 50`).
Keine dieser Dateien gehoert zu Phase 70.

## Self-Check: PASSED (automatisierter Scope)
Backend-Suite gruen, Phase-70-Frontend-Tests gruen, Migration in DB bestaetigt, Route registriert.
Browser-UAT (D-12/D-21/D-22/D-23/D-24, D-06/D-07) bleibt als manueller Gate offen.
