---
phase: 78-leader-workspace-review-pflege
plan: "03"
subsystem: admin-fansub-workspace
tags: [backend, api, contract, media-review, audit, lock-k, lock-g, d-05, d-08, d-09]
dependency_graph:
  requires:
    - 78-01 (RED-Testvertrag für FansubMediaReviewHandler)
  provides:
    - GET /api/v1/admin/fansubs/:id/media (Lese-Quelle für 78-04 GroupMediaReviewSection)
    - PATCH /api/v1/admin/fansubs/:id/media/:mediaId (Mutation für 78-04)
    - api.ts-Helfer listFansubGroupMedia + patchFansubMediaReview
  affects:
    - backend/internal/handlers/
    - backend/internal/repository/
    - backend/cmd/server/
    - frontend/src/lib/api.ts
    - shared/contracts/admin-content.yaml
tech_stack:
  added: []
  patterns:
    - Interface-getrennter Handler (FansubMediaReviewRepository + FansubMediaListRepository)
    - API-zu-DB-Wert-Mapping (kanonische value-Strings ↔ DB-Lookup-IDs)
    - fansubID-Scope per EXISTS-Subquery in UPDATE (IDOR-Schutz)
    - Erfolgs-Audit nach Mutation + Deny-Audit bei Permission-Deny (D-09)
key_files:
  created:
    - backend/internal/handlers/fansub_media_review_handler.go
  modified:
    - backend/internal/repository/media_repository.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - frontend/src/lib/api.ts
    - shared/contracts/admin-content.yaml
decisions:
  - "Interface aufgeteilt: FansubMediaReviewRepository (Patch) + FansubMediaListRepository (List) — Methodennamen an Wave-0-Stub-Signaturen ausgerichtet"
  - "API-DB-Mapping: intern→private/oeffentlich→public; in_pruefung→in_review/freigegeben→approved/..."
  - "Owner-Mismatch via GetFansubMediaOwner + explizitem Vergleich (nicht nur DB-Constraint)"
metrics:
  duration_minutes: 55
  completed_date: "2026-06-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 5
---

# Phase 78 Plan 03: Contract + Repo + Handler + api.ts-Helfer für Gruppenmedien-Review Summary

**One-liner:** Vertragskonformer (Lock K) GET-Listen- + PATCH-Review-Endpoint für fansub_group_media-Sichtbarkeit/Prüfstatus mit Permission-Gate (D-08), Audit-Pflicht (D-09), fansubID-Scope (D-04) und IDOR-Schutz (T-78-08), plus zwei typisierte api.ts-Helfer als Lese-/Schreib-Quelle für 78-04.

---

## Task 0: Schema-Gate (PASSED — vorab durch Orchestrator verifiziert)

Schema-Befund (aus Migration 0097_v12_status_foundation.up.sql + 0026_add_media_tables.up.sql):
- `fansub_group_media` ist eine reine Junction-Tabelle (group_id, media_id) — keine eigenen Visibility/Status-Spalten
- `media_assets` hat `visibility_id` (FK → `visibilities`, Werte: public/registered/fansubber/staff/private) und `review_status_id` (FK → `review_statuses`, Codes: in_review/approved/rejected/archived/removed)
- Kanonische API-Werte (`intern`/`oeffentlich`, `in_pruefung`/`freigegeben`/etc.) werden im Repository auf DB-Lookup-IDs gemappt

**Verdict:** phase72-schema-vorhanden → Tasks 1-2 vollständig ausgeführt.

---

## Completed Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | Contract + Repo + Handler — GET-Liste + PATCH fansub_group_media | 9ecd2748 | fansub_media_review_handler.go, media_repository.go, admin_routes.go, main.go, admin-content.yaml |
| 2 | api.ts-Helfer listFansubGroupMedia + patchFansubMediaReview (Lock K) | 5e3abd73 | frontend/src/lib/api.ts |

---

## What Was Built

### backend/internal/handlers/fansub_media_review_handler.go (289 Zeilen, NEU)

Interface-getriebener Handler mit zwei separaten Interfaces:
- **FansubMediaReviewRepository** (PATCH): `UpdateFansubMediaReview` + `GetFansubMediaOwner` — ausgerichtet auf Wave-0-Stub-Signaturen
- **FansubMediaListRepository** (GET): `ListFansubGroupMediaForReview`

**ListFansubGroupMedia (GET):**
- permissionActorFromContext → parseFansubID → CanForFansubGroup(ActionFansubGroupEdit)
- Deny → auditPermissionDenied("fansub_group_media.list.denied") + writePermissionDenied (D-09)
- Erfolg → ListFansubGroupMediaForReview → FansubGroupMediaListResponse mit owner_consistent-Flag (D-05)

**PatchFansubMediaReview (PATCH):**
- permissionActorFromContext → parseFansubID → parse mediaId → CanForFansubGroup(ActionFansubGroupEdit)
- Deny → auditPermissionDenied("fansub_group_media.review.denied") + writePermissionDenied (D-09)
- Enum-Validierung gegen kanonischen value-Satz (V5): ungültig → 400 ohne Mutation
- Owner-Mismatch via GetFansubMediaOwner: ownerGroupID ≠ fansubID → 403 ohne Mutation (T-78-03)
- Mutation → UpdateFansubMediaReview → Erfolgs-Audit "fansub_group_media.visibility_updated" (D-09)
- Ändert NIEMALS owner_type/owner_id (D-05)

### backend/internal/repository/media_repository.go (erweitert)

Neue Typen: `FansubGroupMediaReviewRow`, `FansubMediaReviewPatch`, API↔DB-Mapping-Tabellen

Neue Methoden:
- `ListFansubGroupMediaForReview(ctx, fansubGroupID)` — JOIN fansub_group_media + media_assets + visibilities + review_statuses; mappt DB-Werte auf kanonische API-Strings; scoped auf fansubGroupID (D-04)
- `UpdateFansubMediaReview(ctx, fansubGroupID, mediaID, patch)` — UPDATE media_assets mit EXISTS-Subquery auf fansub_group_media für fansubID-Zugehörigkeitsprüfung; ändert ausschließlich visibility_id/review_status_id (D-05)
- `GetFansubMediaOwner(ctx, mediaID)` — SELECT group_id FROM fansub_group_media für Owner-Mismatch-Prüfung (T-78-03)

### backend/cmd/server/ (verdrahtet)

- `admin_routes.go`: `fansubMediaReviewHandler`-Feld in `adminRouteHandlers`; GET + PATCH registriert mit authMiddleware
- `main.go`: `fansubMediaReviewHandler := handlers.NewFansubMediaReviewHandler(mediaRepo, permissionSvc, auditLogRepo)`

### shared/contracts/admin-content.yaml (erweitert)

Neue Endpoint-Einträge:
- `admin-fansub-group-media-list` (GET /api/v1/admin/fansubs/{id}/media)
- `admin-fansub-group-media-patch-review` (PATCH /api/v1/admin/fansubs/{id}/media/{mediaId})

Neue Schema-Typen:
- `FansubGroupMediaItem` mit allen Feldern inkl. owner_consistent-Dokumentation
- `FansubGroupMediaListResponse`

### frontend/src/lib/api.ts (erweitert)

Neue Typen: `FansubMediaVisibility`, `FansubMediaReviewStatus`, `FansubGroupMediaItem`, `FansubGroupMediaListResponse`, `FansubMediaReviewPatch`

Neue Helfer:
- `listFansubGroupMedia(fansubId, authToken?)` — GET-Lese-Quelle für 78-04 GroupMediaReviewSection
- `patchFansubMediaReview(fansubId, mediaId, patch, authToken?)` — PATCH-Mutation für 78-04

Beide nutzen `authorizedFetch` (kein nacktes `fetch`, Lock K).

---

## TDD Gate Compliance

- RED-Commit vorhanden: ✅ (`1db71040` aus 78-01)
- GREEN-Commits vorhanden: ✅ (`9ecd2748` + `5e3abd73`)
- Alle 6 TestFansubMediaReview-Tests GRÜN:
  - TestFansubMediaReview_PermissionDeny ✅
  - TestFansubMediaReview_Success_AuditRequired ✅
  - TestFansubMediaReview_InvalidEnum_Returns400 ✅
  - TestFansubMediaReview_InvalidReviewStatusEnum_Returns400 ✅
  - TestFansubMediaReview_OwnerMismatch_NoUpdate ✅
  - TestFansubMediaReview_ValidEnumValues_Accepted (5 Sub-Tests) ✅

---

## Deviations from Plan

### Auto-angepasste Implementierung

**1. [Rule 1 - Interface-Aufteilung] Separate Interfaces für PATCH vs. GET**
- **Gefunden während:** Task 1 — Test-Kompilierung
- **Problem:** RED-Testkontrakt aus 78-01 definiert `fansubMediaRepoStub` mit nur 2 Methoden (`UpdateFansubMediaReview`, `GetFansubMediaOwner`), aber der Plan beschreibt ein 3-Methoden-Interface
- **Fix:** Interface aufgeteilt in `FansubMediaReviewRepository` (PATCH-Methoden, Stub-kompatibel) + `FansubMediaListRepository` (GET-Methode, optional via Type-Assertion extrahiert)
- **Methodennamen angepasst:** `UpdateFansubGroupMediaReview` → `UpdateFansubMediaReview` (Stub-Signatur aus 78-01 ist kanonisch)
- **Keine funktionale Auswirkung:** MediaRepository implementiert beide Interfaces; Handler extrahiert listRepo via Type-Assertion

**2. [Rule 1 - Bug] Enum-Validierung in Handler statt Repository**
- **Entscheidung:** Enum-Validierung findet im Handler statt (vor Repository-Aufruf), damit 400 vor DB-Query zurückgegeben wird und kein unnötiger DB-Roundtrip entsteht. Repository-Methoden validieren ebenfalls als Defense-in-Depth.

---

## Known Stubs

Keine — alle implementierten Methoden sind vollständig verdrahtet. Die LIST-Route gibt leere Arrays zurück wenn keine Medien vorhanden sind (kein Stub-Verhalten).

---

## Threat Flags

Keine neuen Bedrohungsflächen jenseits des Plans.

| Flag | File | Description |
|------|------|-------------|
| T-78-07 mitigated | fansub_media_review_handler.go | CanForFansubGroup auf GET + PATCH |
| T-78-08 mitigated | media_repository.go | fansubID-Scope via EXISTS-Subquery in UPDATE |
| T-78-09 mitigated | fansub_media_review_handler.go | Audit nach Mutation + Deny-Audit |
| T-78-10 mitigated | media_repository.go | Kein owner_type/owner_id in UPDATE |
| T-78-11 mitigated | fansub_media_review_handler.go | Enum-Validierung serverseitig → 400 |

---

## Deferred Issues

Pre-existing Fehler (nicht durch 78-03 verursacht) — dokumentiert in `deferred-items.md`:
- `TestRejectContributionRequiresReason` — nil pointer auf DB-Pool
- `TestFansubNotesRepository_ScopedMutationSourceInvariants` — Methodensignaturen-Test
- TypeScript: `GroupMediaReviewSection` fehlt (78-04), `ContributionInbox`/`ContributionSummary` fehlen, `api.test.ts` Name-Mismatch

---

## Self-Check

### Erstellte/veränderte Dateien existieren:

- `backend/internal/handlers/fansub_media_review_handler.go` — vorhanden (289 Zeilen) ✅
- `backend/internal/repository/media_repository.go` — UpdateFansubMediaReview + ListFansubGroupMediaForReview vorhanden ✅
- `frontend/src/lib/api.ts` — listFansubGroupMedia + patchFansubMediaReview vorhanden ✅
- `shared/contracts/admin-content.yaml` — GET + PATCH Einträge + FansubGroupMediaItem vorhanden ✅

### Commits existieren:

- `9ecd2748` — feat(78-03): Gruppenmedien-Review GET-Liste + PATCH Sichtbarkeit/Prüfstatus ✅
- `5e3abd73` — feat(78-03): api.ts-Helfer listFansubGroupMedia + patchFansubMediaReview ✅

## Self-Check: PASSED
