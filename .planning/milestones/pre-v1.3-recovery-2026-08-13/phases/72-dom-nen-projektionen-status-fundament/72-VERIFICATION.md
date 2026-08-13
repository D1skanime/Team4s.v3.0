---
phase: 72-dom-nen-projektionen-status-fundament
verified: 2026-06-05T09:31:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
---

# Phase 72: Domänen-Projektionen & Status-Fundament Verification Report

**Phase Goal:** Das phasenübergreifende Backend-/Contract-Fundament für Meilenstein v1.2: Read-Projektionen/DTOs trennen Gruppenmitglied, externe Mitwirkende und historische Nennung sauber, und die übergreifend nötigen Statusfelder existieren (`memorial`-Profilstatus, Contribution-Status/-Sichtbarkeit, Media owner/visibility/review-Metadaten), sodass Phasen 73-80 ohne doppelte DTO-Arbeit darauf aufsetzen. Keine Public-UI-Arbeit in dieser Phase.
**Verified:** 2026-06-05T09:31:00Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Read-Projektion/DTO-Schicht trennt Mitglieder, historische Mitglieder und Mitwirkende; Contributions erzeugen keine Mitgliedszeilen. | VERIFIED | `backend/internal/repository/domain_projection_repository.go` nutzt getrennte Query-Pfade: `FROM fansub_group_members` (Zeile 115), `FROM hist_fansub_group_members` (Zeile 177), `FROM anime_contributions` (Zeile 240). `claimed` kommt aus `member_claims.claim_status='verified'` (Zeilen 111-113, 173-175), nicht aus Contributions. |
| 2 | Member-Profilstatus und Claim-Zustand sind lesbar; `memorial` existiert ohne Phase-72-Setter. | VERIFIED | Migration 0096 ergänzt `members.profile_status` mit CHECK `active/historical/memorial` (up.sql Zeilen 7, 17-18). DTOs liefern `profile_status` plus `claimed` (`domain_projection_repository.go` Zeilen 33-34, 47-48; TS Zeilen 1-25, 38-39). `72-CONTEXT.md` D-06 grenzt Setter/Claim-Sperre explizit auf Phase 74 aus. |
| 3 | Contributions liefern Content-Status, separate Konflikt-Dimension, Visibility und Review getrennt. | VERIFIED | Contributor-Query selektiert `ac.status`, `ac.dispute_state`, `COALESCE(v.name, 'public') AS visibility`, `COALESCE(rs.code, 'approved') AS review_status` und joint `visibilities`/`review_statuses` separat (`domain_projection_repository.go` Zeilen 236-247). Migration 0096 legt `dispute_state`, `visibility_id`, `review_status_id` additiv an. |
| 4 | Medien-Ownership-Projektion liefert Owner-Typ, Owner-ID, Kategorie, Visibility und Review ohne zentrales Owner-Typ-Feld. | VERIFIED | `MediaOwnershipRow` enthält `owner_type`, `owner_id`, `media_category`, `visibility`, `review_status` (`media_ownership_projection_repository.go` Zeilen 13-18). Owner-Kontext wird aus `media_assets.owner_member_id`, `fansub_group_media`, `release_version_media`, `release_theme_assets` komponiert (Zeilen 47-63, 79, 102, 125); kein neues `media_assets.owner_type` in Migration 0096. |
| 5 | OpenAPI, TS-DTOs, `api.ts`-Helper und Paritätstest spiegeln Backend-DTOs direkt ohne Envelope und ohne Write-Endpunkte. | VERIFIED | OpenAPI dokumentiert GET `/fansubs/{id}/domain-projection` und `/media-ownership/{ownerType}/{ownerId}` als direkte DTOs/Array (openapi.yaml Zeilen 6157-6195). TS-Typen spiegeln snake_case Felder. `api.ts` nutzt `apiClientFetch` und gibt `response.json()` direkt als `DomainProjectionResponse` bzw. `MediaOwnershipProjectionResponse` zurück (Zeilen 7734-7785). Paritätstest prüft ExactKeys/Enums und `not.toMatch(data:)` für beide neuen Pfade. |
| 6 | Migrationen sind append-only; bestehende Public/Admin-Reads und Runtime-Authority werden nicht umgestellt. | VERIFIED | `0096_v12_status_foundation.up.sql` nutzt additive `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, Constraints/FKs/Indizes; `down.sql` droppt die ergänzten Indizes, Constraints, Spalten und `review_statuses` zurück. Neue Routen sind nur GET (`main.go` Zeilen 407-408); Suche nach POST/PATCH/DELETE für die beiden Projection-Pfade ergab keine Treffer. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `database/migrations/0096_v12_status_foundation.up.sql` | Additive Statusfelder, Review-Lookup, FK-Achsen | VERIFIED | Substantiv; keine Legacy-`fansubgroup_id`, kein zentrales Owner-Typ-Feld, keine Status-Spalten-Überladung. |
| `database/migrations/0096_v12_status_foundation.down.sql` | Reversibler Mirror | VERIFIED | Droppt Indizes, FKs, CHECKs, Spalten und Lookup-Tabelle. |
| `backend/internal/repository/domain_projection_repository.go` | Getrennte Domain-Projektion | VERIFIED | Drei Query-Pfade, pgx-Parameter, status/dispute/visibility/review getrennt. |
| `backend/internal/handlers/domain_projection_handler.go` | Dünner GET-Handler ohne Envelope | VERIFIED | `c.JSON(http.StatusOK, response)`, ID-Parsing und Fehlerhelper. |
| `backend/internal/repository/media_ownership_projection_repository.go` | Medien-Ownership-Projektion | VERIFIED | Junction-komponiert, owner_member_id-Scoped, Visibility/Review-Lookup getrennt. |
| `backend/internal/handlers/media_ownership_projection_handler.go` | Dünner GET-Handler ohne Envelope | VERIFIED | OwnerType/OwnerID validiert, direkte DTO-Liste. |
| `shared/contracts/openapi.yaml` | Contract-Pfade und Schemas | VERIFIED | Neue Felder und Pfade vorhanden; kein `data`-Envelope in den neuen Response-Schemas. |
| `frontend/src/types/domain-projection.ts` | 1:1 TS-Spiegel Domain | VERIFIED | snake_case Felder und Literal-Unions vorhanden. |
| `frontend/src/types/media-ownership.ts` | 1:1 TS-Spiegel Media | VERIFIED | Owner/Visibility/Review-Felder vorhanden. |
| `frontend/src/lib/api.ts` | Zentrale GET-Helper | VERIFIED | Nutzt `apiClientFetch`, keine ad-hoc Token-/Cookie-Logik. |
| `frontend/src/types/__tests__/v12-projection-contract.test.ts` | Paritäts-Test | VERIFIED | Prüft Keys, Enums, Pfade und no-envelope. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Migration 0096 | `members`, `anime_contributions`, `media_assets`, `review_statuses` | Additive SQL + reversible down | VERIFIED | Up/down-Mirror und Source-Fragment-Test vorhanden. |
| Domain repository | GET `/api/v1/fansubs/:id/domain-projection` | `main.go` route + handler | VERIFIED | `v1.GET` registriert; keine Write-Route gefunden. |
| Media repository | GET `/api/v1/media-ownership/:ownerType/:ownerId` | `main.go` route + handler | VERIFIED | `v1.GET` registriert; keine Write-Route gefunden. |
| Backend DTOs | OpenAPI + TS + `api.ts` | snake_case fields, direct JSON | VERIFIED | Vitest-Paritätstest bestanden. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `domain_projection_repository.go` | `members`, `historical`, `contributors` | DB queries over membership, historical, contribution, visibility, review and claim tables | Yes | FLOWING |
| `media_ownership_projection_repository.go` | `[]MediaOwnershipRow` | DB query over `media_assets`, `media_files`, owner junctions, `visibilities`, `review_statuses` | Yes | FLOWING |
| `api.ts` helpers | `DomainProjectionResponse`, `MediaOwnershipProjectionResponse` | `apiClientFetch` to runtime GET routes | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Migration/domain/media source guards pass | `go test ./internal/repository/... -run "TestV12StatusFoundation|TestProjection|TestMediaProjection" -count=1` from `backend` | `ok team4s.v3/backend/internal/repository` | PASS |
| Backend builds with new wiring | `go build ./...` from `backend` | exit 0 | PASS |
| Contract parity passes | `npx vitest run v12-projection-contract` from `frontend` | 1 file, 3 tests passed | PASS |
| Frontend typecheck accepts new DTO/helpers | `npm run typecheck` from `frontend` | `tsc --noEmit` exit 0 | PASS |
| OpenAPI parses as YAML | `npx --yes js-yaml ../shared/contracts/openapi.yaml` from `frontend` | `yaml-ok` | PASS |
| Whitespace diff check | `git diff --check` | exit 0 | PASS |

### Probe Execution

| Probe | Command | Result | Status |
|---|---|---|---|
| Conventional probes | `Get-ChildItem scripts -Recurse -Filter probe-*.sh` | no probes found | SKIPPED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| Entscheidung A | 72-02, 72-04 | Keine Parallelmodelle; bestehende Tabellen/Repos/Contracts erweitern | SATISFIED | Neue read-only Repos über bestehende Tabellen; Contracts gespiegelt. |
| Entscheidung G | 72-01, 72-03 | Medien folgen Ownership-Matrix; Member-Media über `owner_member_id` | SATISFIED | Media-Projektion nutzt `owner_member_id` und Junction-Tabellen; kein zentrales Owner-Feld. |
| Entscheidung H | 72-02 | Claims/Requests/Contributions getrennt | SATISFIED | `claimed` aus `member_claims`, Contributors aus `anime_contributions`; keine Membership-Erzeugung. |
| Entscheidung I | 72-03 | Scoped Rechte-/Übersichtsdaten vorbereiten | SATISFIED | Read-Projektionen liefern Owner-/Status-/Review-Daten, keine Write-/Permission-Umstellung. |
| Entscheidung J | 72-01, 72-02 | Memorial als eigener Statuswert, Claim-Sperre später | SATISFIED | `members.profile_status` enthält `memorial`; Projektion liest ihn; D-06 verschiebt Setter/Claim-Sperre. |
| Entscheidung K | 72-04 | Contract/API-Disziplin | SATISFIED | OpenAPI, TS, `api.ts` und Paritätstest konsistent; keine Write-Endpunkte dokumentiert. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| Phase-72 scoped files | - | TODO/FIXME/XXX/HACK/PLACEHOLDER/stub scan | none | Keine Treffer in den neuen Phase-72-Dateien. |
| `frontend/src/lib/api.ts` | existing helper lines outside new slice | `return null` | INFO | Bestehende Hilfszweige, nicht Teil der neuen Projection-Helper und kein Phase-72-Stub. |

### Human Verification Required

Keine. Phase 72 liefert Backend-/Contract-Fundament ohne Public-UI-Arbeit; die prüfbaren Verhaltens- und Contract-Aussagen wurden automatisiert beziehungsweise per Codebeleg verifiziert.

### Gaps Summary

Keine blockierenden Gaps gefunden. Bekannte Redocly-/Frontend-Lint-Altlasten außerhalb des Phase-72-Slices sind in `deferred-items.md` dokumentiert; die für Phase 72 relevanten Checks (`go test`, `go build`, Vitest-Parität, TypeScript, YAML-Parse, `git diff --check`) bestehen.

---

_Verified: 2026-06-05T09:31:00Z_
_Verifier: the agent (gsd-verifier)_
