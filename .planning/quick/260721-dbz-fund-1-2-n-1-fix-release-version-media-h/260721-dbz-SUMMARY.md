---
phase: quick-260721-dbz
plan: 01
subsystem: backend/release-version-media
tags: [refactor, n+1, permissions, file-split]
requires:
  - "MediaRepository (bestehende RVM-Repository-Schicht)"
  - "permissions.Service.CanForFansubGroup"
provides:
  - "ListReleaseVersionMediaRelationMetas (gebuendelter Meta-Loader)"
  - "ListReleaseVersionMediaContributorGroupIDsByRelation (gebuendelter Contributor-Gruppen-Loader)"
  - "evaluateReleaseVersionMediaRelationMutation (reiner Entscheidungshelfer)"
affects:
  - "ReorderReleaseVersionMedia-Endpoint (Query-Struktur, unveraendertes Verhalten)"
tech-stack:
  added: []
  patterns:
    - "Batch-Loader mit id = ANY($1) statt per-Zeile-Query"
    - "Memoisierte Permission-Aufloesung pro eindeutiger Gruppe"
    - "Reiner DB-freier Entscheidungshelfer fuer zwei Aufrufpfade"
key-files:
  created:
    - backend/internal/repository/release_version_media_batch_repository.go
    - backend/internal/handlers/admin_content_release_version_media_reorder.go
  modified:
    - backend/internal/handlers/admin_content_release_version_media.go
    - backend/internal/handlers/admin_content_release_version_media_test.go
decisions:
  - "Reiner Helfer evaluateReleaseVersionMediaRelationMutation buendelt die vier Autorisierungszweige, damit Reorder- und Einzelpfad bit-identisch entscheiden."
  - "Platform-Admins ueberspringen im Reorder-Pfad die Gruppen-Aufloesung (platformBypass), damit keine Gruppen-Queries laufen, die der Einzelpfad zuvor auch nicht ausgefuehrt hat."
metrics:
  duration: "~25 min"
  completed: 2026-07-21
---

# Phase quick-260721-dbz Plan 01: Fund 1+2 N+1-Fix Release-Version-Media-Reorder Summary

Verschachtelte N+1-Queries im Release-Version-Media-Reorder-Pfad eliminiert (Meta- und Contributor-Gruppen-Aufloesung gebuendelt, Gruppen-Permission memoisiert) und den ueberlangen Monolith-Handler durch Auslagern des Reorder-Handlers verkleinert — bei bit-identischem Ownership- und Permission-Verhalten.

## Was umgesetzt wurde

### Task 1 — Gebuendelte Batch-Loader (Commit 193f27fd)
Neue schlanke Repo-Datei `release_version_media_batch_repository.go` (91 Zeilen) mit zwei Methoden auf `*MediaRepository`:
- `ListReleaseVersionMediaRelationMetas(ctx, relationIDs)` — Batch-Variante von `GetReleaseVersionMediaRelation`, ein Query mit `id = ANY($1) AND deleted_at IS NULL`, selektiert dieselben vier Spalten in derselben Reihenfolge. Leerer Input -> leerer Slice ohne Query, kein ErrNotFound.
- `ListReleaseVersionMediaContributorGroupIDsByRelation(ctx, relationIDs)` — Batch-Variante von `ListReleaseVersionMediaContributorGroupIDs`, identische JOIN-/WHERE-Logik (inkl. `ac.release_version_id` vs `anime_id`-Bedingung), `rvm.id = ANY($1)`, zusaetzlich `rvm.id` selektiert, Ergebnis als `map[int64][]int64` (relationID -> aufsteigend sortierte, distinct groupIDs), `ORDER BY rvm.id, ac.fansub_group_id`.

`release_version_media_repository.go` blieb unveraendert.

### Task 2 — Reorder-Handler ausgelagert + N+1 eliminiert (Commit e71966cf)
- **Schritt A:** `ReorderReleaseVersionMedia` samt reorder-spezifischer Typen (`rvmReorderItem`, `rvmReorderBody`) in neue Datei `admin_content_release_version_media_reorder.go` (178 Zeilen) verschoben. Monolith von 1254 auf 1169 Zeilen verkleinert.
- **Schritt B (Fund 1):** per-Bild `GetReleaseVersionMediaRelation` entfaellt; einmalig `ListReleaseVersionMediaRelationMetas` vor der Schleife, `UploadedByUserID` in `map[int64]*int64`. Defensive Meta-Count-Pruefung liefert dieselbe 404 ("eine oder mehrere relationen gehoeren nicht zu dieser release version") wie zuvor.
- **Schritt C (Fund 2):** einmalig `ListReleaseVersionMediaContributorGroupIDsByRelation`; Permission pro eindeutiger Gruppe genau einmal via `CanForFansubGroup(..., ActionReleaseVersionMediaUpdate, groupID)` ausgewertet und in `map[int64]bool` memoisiert.
- **Schritt D:** reiner Helfer `evaluateReleaseVersionMediaRelationMutation(actor, baseResult, uploadedByUserID, currentLegacyUserID, action, anyGroupAllowed)` mit den exakt vier Zweigen des bisherigen `canMutateReleaseVersionMediaRelation`. Beide Pfade (Reorder + Einzel/Annotate) nutzen ihn; bei Ablehnung derselbe Zweig (releaseVersionMediaOwnerMismatchResult + auditPermissionDenied "release_version_media.reorder.denied" + writePermissionDenied).
- **Schritt E:** `canMutateReleaseVersionMediaRelation` und `annotateReleaseVersionMediaItemPermissions` bleiben in der Hauptdatei; die Query-Zeilen `ListReleaseVersionMediaContributorGroupIDs` und `CanForFansubGroup(c.Request.Context(), actor, action, groupID)` sind unveraendert (Source-String-Guard). Guard-Test `TestReleaseVersionMedia_ReorderRequiresVersionOwnership` liest jetzt die ausgelagerte Reorder-Datei.

## Verhaltensgarantie (bit-identisch)

- **T-dbz-01 (EoP):** Der reine Helfer entscheidet in beiden Pfaden ueber dieselben Eingaben; `anyGroupAllowed` ist OR ueber dieselben `CanForFansubGroup`-Ergebnisse; Memoisierung ist deterministisch pro (actor, action, groupID).
- **T-dbz-02 (Tampering):** `ValidateReleaseVersionMediaOwnership` bleibt der maszgebliche Ownership-Gate; die Meta-Count-Pruefung reproduziert die 404 bei fehlenden/fremden Relationen. Da Ownership bereits Duplikate/fremde IDs als 404 verwirft, sind beim Meta-Schritt alle IDs distinct und vorhanden.
- **Platform-Admin:** `platformBypass` ueberspringt die Gruppen-Aufloesung genau wie der urspruengliche `canMutate`-Frueh-Return, damit keine zusaetzlichen Gruppen-Queries (und keine neuen Fehlerpfade) entstehen.

## Verifikation

| Gate | Ergebnis |
|------|----------|
| `go build ./...` | OK (fehlerfrei) |
| `go test ./internal/repository/... -run ReleaseVersionMedia -count=1` | ok (1.413s) |
| `go test ./internal/handlers/... -run ReleaseVersionMedia -count=1` | ok (2.036s) |
| Fund-1-Grep (`GetReleaseVersionMediaRelation` im Reorder-Handler) | keine Treffer (OK) |
| Fund-2-Grep (Batch-Loader im Reorder-Handler) | Treffer in Z. 84 + 106 (OK) |
| Groessen-Gate (`admin_content_release_version_media.go` < 1254) | 1169 Zeilen (OK) |

## Deviations from Plan

### Concurrency-Handling (kein Code-Deviation, Git-Recovery)
Beim ersten Task-2-Commit hatte ein paralleler GSD-Writer bereits fremde Dateien in den Git-Index gestaged; `git commit` erfasste dadurch 25 statt 3 Dateien. Recovery: `git reset --soft HEAD~1` + mixed `git reset` (Inhalte im Working Tree erhalten, kein `--hard`, kein `git stash`), dann nur die drei Task-2-Dateien erneut gestaged und committed (e71966cf). Die fremden Writer-Aenderungen liegen unversioniert im Working Tree zurueck. Keine funktionale Abweichung vom Plan.

Ansonsten: Plan exakt wie geschrieben ausgefuehrt.

## Commits

- `193f27fd` feat(quick-260721-dbz): add batched release-version-media relation loaders
- `e71966cf` refactor(quick-260721-dbz): bundle reorder permission queries and split handler

## Self-Check: PASSED

- FOUND: backend/internal/repository/release_version_media_batch_repository.go
- FOUND: backend/internal/handlers/admin_content_release_version_media_reorder.go
- FOUND commit: 193f27fd
- FOUND commit: e71966cf
