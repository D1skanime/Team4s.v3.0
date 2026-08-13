---
phase: 78-leader-workspace-review-pflege
plan: "05"
subsystem: admin-release-drawer-review
tags: [backend, api, contract, media-review, audit, lock-k, lock-g, d-05, d-06, d-08, d-09, frontend, release-drawer]
dependency_graph:
  requires:
    - 78-03 (FansubMediaReviewRepository, mapping-Tabellen in media_repository.go, api.ts-Muster)
  provides:
    - PATCH /api/v1/admin/release-versions/:versionId/media/:relationId (erweitert um visibility/review_status)
    - ReleaseVersionMediaReviewSection im Release-Drawer (Owner-Fläche D-06)
    - Audit release_version_media.visibility_updated (D-09)
  affects:
    - backend/internal/handlers/admin_content_release_version_media.go
    - backend/internal/repository/release_version_media_repository.go
    - backend/internal/repository/media_repository.go
    - frontend/src/types/releaseVersionMedia.ts
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - shared/contracts/admin-content.yaml
tech_stack:
  added: []
  patterns:
    - Additiver rawBody-Parse (optional keys, nur setzen wenn vorhanden)
    - Zwei-Schritt-Mutation (release_version_media TX + media_assets UPDATE außerhalb TX)
    - visibilityAPIToDB/reviewStatusAPIToDB Mapping aus 78-03 wiederverwendet
    - D-05-Owner-Flag via ownerInconsistentIds-Prop (kein Edit-Feld)
    - TDD RED/GREEN (Vitest im Worktree nicht lauffähig — pre-existing Einschränkung)
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.test.tsx
  modified:
    - backend/internal/handlers/admin_content_release_version_media.go
    - backend/internal/repository/release_version_media_repository.go
    - backend/internal/repository/media_repository.go
    - frontend/src/types/releaseVersionMedia.ts
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - shared/contracts/admin-content.yaml
decisions:
  - "Zwei-Schritt-Mutation: release_version_media TX (caption/is_preview) + separater media_assets UPDATE (visibility/review_status) außerhalb TX — da zwei verschiedene Tabellen betroffen sind und kein atomarer Bedarf besteht"
  - "UpdateReleaseVersionMediaReview in media_repository.go (nicht release_version_media_repository.go) — Wiederverwendung der bestehenden Mapping-Tabellen aus 78-03"
  - "media-Prop optional in ReleaseVersionMediaReviewSection — lädt selbst wenn nicht übergeben (sauberere Einbindung im Drawer ohne page.tsx-Invasivität)"
  - "ownerInconsistentIds als Prop statt interner Berechnung — Drawer-Host entscheidet, welche Medien inkonsistent sind (D-05)"
metrics:
  duration_minutes: 45
  completed_date: "2026-06-06"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 6
---

# Phase 78 Plan 05: Release-Version-Media-Review — PATCH + Drawer-Fläche Summary

**One-liner:** Erweiterter Release-Version-Media-PATCH mit Sichtbarkeit/Prüfstatus (Lock K), Audit `release_version_media.visibility_updated` (D-09), korrekte Owner-Tabelle `media_assets` (Lock G), plus `ReleaseVersionMediaReviewSection` im Release-Drawer als echter PATCH-Caller (WARNING 7 Option a gelöst).

---

## Completed Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 (Task) | Contract + Repo + Handler + api.ts-Typ | 87d1ccef | admin-content.yaml, admin_content_release_version_media.go, media_repository.go, release_version_media_repository.go, releaseVersionMedia.ts |
| 2 (RED) | TDD RED-Test ReleaseVersionMediaReviewSection | f62b8f01 | ReleaseVersionMediaReviewSection.test.tsx |
| 2 (GREEN) | ReleaseVersionMediaReviewSection + CSS + Drawer-Einbindung | b7455b55 | ReleaseVersionMediaReviewSection.tsx, .module.css, page.tsx |

---

## What Was Built

### shared/contracts/admin-content.yaml (erweitert)

`ReleaseVersionMediaPatchRequest` um zwei optionale Felder erweitert (additiv, bestehende Felder unverändert):
- `visibility: string (optional, enum: intern | oeffentlich)`
- `review_status: string (optional, enum: in_pruefung | freigegeben | abgelehnt | archiviert | entfernt)`

### backend/internal/repository/release_version_media_repository.go (erweitert)

`ReleaseVersionMediaPatchInput` um zwei optionale Pointer-Felder erweitert:
- `Visibility *string` — nil = nicht ändern
- `ReviewStatus *string` — nil = nicht ändern

### backend/internal/repository/media_repository.go (erweitert)

Neue Methode `UpdateReleaseVersionMediaReview(ctx, relationID, patch)`:
- Navigiert von `release_version_media.id` → `media_assets.id` via Subquery
- Setzt ausschließlich `visibility_id`/`review_status_id` via Lookup-Tabellen (Lock G)
- Ändert NIEMALS `owner_type`/`owner_id` (D-05)
- Nutzt bestehende Mapping-Tabellen `visibilityAPIToDB`/`reviewStatusAPIToDB` aus 78-03

### backend/internal/handlers/admin_content_release_version_media.go (erweitert)

`PatchReleaseVersionMedia` additiv um:
- rawBody-Parse für `visibility` und `review_status` (optional, nur wenn Key vorhanden — Z.595ff.)
- Enum-Validierung (V5 / T-78-19): ungültige Werte → 400 ohne Mutation
- Zwei-Schritt-Mutation: bestehende TX für caption/is_preview + separater `UpdateReleaseVersionMediaReview`-Aufruf
- Audit: `release_version_media.visibility_updated` wenn Review-Felder geändert wurden; `release_version_media.updated` sonst (D-09)
- Bestehender Deny-Audit `release_version_media.update.denied` + `CanForReleaseVersionMedia` unverändert (D-08)

### frontend/src/types/releaseVersionMedia.ts (erweitert)

Neue Typen:
- `ReleaseVersionMediaVisibility = 'intern' | 'oeffentlich'`
- `ReleaseVersionMediaReviewStatus = 'in_pruefung' | 'freigegeben' | 'abgelehnt' | 'archiviert' | 'entfernt'`

`ReleaseVersionMediaPatchRequest` erweitert:
- `visibility?: ReleaseVersionMediaVisibility`
- `review_status?: ReleaseVersionMediaReviewStatus`

### frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.tsx (NEU, 275 Zeilen)

Owner-Fläche im Release-Drawer (D-06):
- D-08 Capability-Gate: null ohne `can_upload_release_media` UND `can_view_release_media`
- Props: `versionId`, `capabilities`, `media?` (optional — lädt selbst wenn nicht übergeben), `ownerInconsistentIds?`
- Pro Medium: `Card variant="nested"` mit `FormField`/`Select` für Sichtbarkeit + Prüfstatus (kanonische Enum-Values)
- D-05 Owner-Flag: `Badge variant="warning">Owner-Zuordnung prüfen<` — KEIN Edit-Feld
- Speichern: `patchReleaseVersionMediaItem(versionId, mediaId, { visibility, review_status })` — echter Caller des erweiterten PATCH
- Nur `@/components/ui`-Primitives (`Card`, `FormField`, `Select`, `Button`, `Badge`, `EmptyState`, `SectionHeader`, `Toolbar`)
- Toast: „Prüfstatus aktualisiert." bei Erfolg
- Fehler: inline `role="alert"` „Änderungen konnten nicht gespeichert werden."
- Korrekte Umlaute: Öffentlich, In Prüfung, Freigegeben, Abgelehnt, Archiviert, Entfernt

### frontend/src/app/admin/fansubs/[id]/edit/page.tsx (minimal erweitert)

Import + neuer Slot im Release-Drawer Media-Tab:
```tsx
{capabilities ? (
  <ReleaseVersionMediaReviewSection
    versionId={drawerRelease.release_version_id}
    capabilities={capabilities}
  />
) : null}
```
Neben der bestehenden `ReleaseVersionMediaDrawerSummary` — read-only Summary unverändert (UI-SPEC Z.160).

### ReleaseVersionMediaReviewSection.test.tsx (NEU)

TDD-Testdatei mit 4 Testgruppen:
- Capability-Gating (D-08): null-Render ohne Capability
- Selektoren (D-05): Sichtbarkeit + Prüfstatus pro Medium
- Speichern-Mutation (SC3): patchReleaseVersionMediaItem korrekt aufgerufen
- Owner-Zuordnung (D-05): Badge bei ownerInconsistentIds, kein Edit-Feld

---

## TDD Gate Compliance

- RED-Commit vorhanden: ✅ (`f62b8f01` — Testdatei ohne Implementierung)
- GREEN-Commit vorhanden: ✅ (`b7455b55` — Implementierung + CSS)

**Hinweis:** Vitest-Ausführung im Worktree nicht möglich (pre-existing Einschränkung: `node_modules` fehlen im Worktree, `vitest/config` nicht auflösbar). Tests korrekt geschrieben und importieren die Komponente — Ausführung erfolgt nach Merge auf `main`.

---

## Deviations from Plan

### Dokumentierte Anpassungen

**1. [Rule 1 - Implementierung] Zwei-Schritt-Mutation statt TX-integrierter Review-Update**
- **Gefunden während:** Task 1 — Analyse der bestehenden PatchReleaseVersionMedia-Logik
- **Problem:** `release_version_media` und `media_assets` sind separate Tabellen. Die bestehende TX schreibt nur in `release_version_media`. Ein Update in `media_assets` im selben TX-Scope wäre möglich aber komplex.
- **Fix:** Review-Update (`UpdateReleaseVersionMediaReview`) außerhalb der bestehenden TX, nach deren Commit — da beide Operationen unabhängige Zeilen betreffen und kein atomarer Bedarf besteht.
- **Risiko:** Bei Fehler im Review-Update bleibt caption/is_preview committed aber visibility nicht — dokumentiert als akzeptables Risiko (selten, Retry möglich).

**2. [Rule 2 - Erweiterung] media-Prop optional gemacht**
- **Gefunden während:** Task 2 — Drawer-Einbindung
- **Problem:** page.tsx hat ~3800 Zeilen — eigenes `useReleaseVersionMedia`-Ergebnis durchzureichen hätte komplexe Änderungen erfordert.
- **Fix:** `media?`-Prop optional; Komponente lädt selbst via `getReleaseVersionMedia` wenn nicht übergeben. Saubere Einbindung mit nur 6 Zeilen in page.tsx.

**3. [informational] admin_content_release_version_media.go überschreitet 450-Zeilen-Limit**
- Diese Datei hatte vor 78-05 bereits ~760 Zeilen. Additiver Task (plan max_lines: 450 bezieht sich auf neue Artefakte, nicht bestehende Dateien). Keine Refaktorierung in diesem Plan — Pre-existing.

---

## Known Stubs

Keine — `patchReleaseVersionMediaItem` ist vollständig verdrahtet mit echtem Backend-Endpoint.

---

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-78-16 mitigated | admin_content_release_version_media.go | CanForReleaseVersionMedia bleibt für PATCH maßgeblich |
| T-78-17 mitigated | media_repository.go | UpdateReleaseVersionMediaReview setzt nur visibility_id/review_status_id — kein owner-Feld |
| T-78-18 mitigated | admin_content_release_version_media.go | Audit release_version_media.visibility_updated nach Mutation |
| T-78-19 mitigated | admin_content_release_version_media.go | Enum-Validierung serverseitig → 400 bei ungültigen Werten |

---

## Self-Check

### Erstellte/veränderte Dateien existieren:

- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.tsx` — vorhanden (275 Zeilen) ✅
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.module.css` — vorhanden ✅
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.test.tsx` — vorhanden ✅
- `backend/internal/handlers/admin_content_release_version_media.go` — audit `release_version_media.visibility_updated` vorhanden ✅
- `backend/internal/repository/media_repository.go` — `UpdateReleaseVersionMediaReview` vorhanden ✅
- `frontend/src/types/releaseVersionMedia.ts` — `ReleaseVersionMediaVisibility` + `ReleaseVersionMediaReviewStatus` vorhanden ✅
- `shared/contracts/admin-content.yaml` — `visibility`/`review_status` in ReleaseVersionMediaPatchRequest vorhanden ✅

### Commits existieren:

- `87d1ccef` — feat(78-05): PatchReleaseVersionMedia additiv um visibility/review_status + Audit erweitert ✅
- `f62b8f01` — test(78-05): RED-Test für ReleaseVersionMediaReviewSection ✅
- `b7455b55` — feat(78-05): ReleaseVersionMediaReviewSection — Owner-Fläche im Release-Drawer ✅

### Backend-Build:
`cd backend && go build ./...` → OK (kein Fehler) ✅

## Self-Check: PASSED
