---
phase: quick-261020-cmi
plan: 01
subsystem: ui
tags: [nextjs, react, go, gin, pgx, member-profile, openapi]

requires: []
provides:
  - "Oeffentliche Mitgliederprofil-Projektkarte (/members/<slug>) zeigt nur noch Animetitel, Gruppe und Rollen-Chips - keine Release-/Episoden-Auflistung, kein 'Projektweit'-Label"
  - "Backend spart eine SQL-Query pro oeffentlichem Profilaufruf (gebatchte Release-Version-Query entfernt)"
affects: [member-profile, public-profile-api]

tech-stack:
  added: []
  patterns:
    - "Tote Backend-Ladelogik (Query + Struct + Contract-Feld) im selben Auftrag wie die zugehoerige Frontend-Darstellung entfernt, statt nur UI zu verstecken"

key-files:
  created: []
  modified:
    - frontend/src/components/profile/MemberCurrentProjectsSection.tsx
    - frontend/src/components/profile/MemberCurrentProjectsSection.module.css
    - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
    - frontend/src/types/profile.ts
    - frontend/src/app/members/[slug]/page.test.tsx
    - frontend/src/components/profile/MemberProfileHero.test.tsx
    - backend/internal/repository/member_profile_projects_repository.go
    - backend/internal/models/member_profile.go
    - backend/internal/handlers/public_member_profile_contract_test.go
    - backend/internal/repository/member_profile_query_budget_test.go
    - shared/contracts/openapi.yaml
    - backend/internal/repository/member_profile_projects_release_versions_repository.go (geloescht)

key-decisions:
  - "Release-Darstellung komplett entfernt statt sameMemberRoleSets zu reparieren (Nutzerentscheidung 20.10.2026)"
  - "Backend-Ladelogik (loadCurrentProjectReleaseVersionsBatch) mitentfernt statt nur Frontend zu verstecken, weil sie ausschliesslich vom oeffentlichen Profil-Loader genutzt wurde (vorab recherchiert) -- spart 1 Query/Profilaufruf"
  - "phase131ConstantQueryBudget real gemessen (nicht geraten): 16 -> 15 via vollem scripts/test-backend.sh-Lauf"

requirements-completed: [261020-cmi-no-release-listing]

duration: 55min
completed: 2026-10-20
---

# Quick 261020-cmi: Oeffentliches Mitgliederprofil ohne Release-Auflistung Summary

**Projekt-Karten auf `/members/<slug>` zeigen nur noch Animetitel, Gruppe und Rollen-Chips; die komplette Release-/Episoden-Auflistung und das "Projektweit"-Label sowie die zugehoerige Backend-Batch-Query und das Contract-Schema wurden entfernt.**

## Performance

- **Duration:** ~55 min (inkl. zweier vollstaendiger `scripts/test-backend.sh`-Laeufe mit 26 Throwaway-Datenbanken)
- **Tasks:** 3/3 completed
- **Files modified:** 11 (6 Frontend, 5 Backend/Contract) + 1 Datei geloescht

## Accomplishments
- Oeffentliche Projekt-Karte reduziert auf Cover, Animetitel, Gruppe, Rollen-Chips -- keine Release-/Episoden-Details mehr sichtbar
- Tote Backend-Ladelogik (`loadCurrentProjectReleaseVersionsBatch`, `sameMemberRoleSets`, `memberProjectKey`) vollstaendig entfernt, `decodeMemberRoles` nach `member_profile_projects_repository.go` verschoben
- `PublicMemberProjectReleaseVersion`-Typ/-Struct/-Contract-Schema entfernt; `release_versions`-Feld aus `PublicMemberCurrentProject` (Frontend-Typ, Go-Struct, OpenAPI) entfernt
- `phase131ConstantQueryBudget` real gemessen und von 16 auf 15 gesenkt (eine SQL-Query weniger pro oeffentlichem Profilaufruf, durch harten Test erzwungen)
- Live per curl bestaetigt: `/members/founder` und `/members/uebersetzung` liefern kein "Folge "/"Projektweit" mehr, zeigen aber weiterhin die 11eyes-Projektkarte mit Titel/Gruppe/Rollen

## Task Commits

1. **Task 1: Frontend -- Release-Auflistung und Projektweit-Label entfernen** - `1e635f7ee` (feat)
2. **Task 2: Backend -- tote Release-Version-Batch-Ladelogik, -Feld und -Contract entfernen** - `24a50c646` (feat)
3. **Task 3: Backend neu bauen, Frontend neu starten, Live-Check** - kein Code-Commit (reine Verifikation/Infra-Schritt, keine Dateien im `files`-Feld)

**Plan metadata:** wird vom Orchestrator committet (SUMMARY.md, STATE.md)

## Files Created/Modified
- `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` - Release-Ausnahme-Block, Projektweit-Badge und `Layers`-Import entfernt
- `frontend/src/components/profile/MemberCurrentProjectsSection.module.css` - `.releaseException`/`.releaseExceptionLabel`-Klassen entfernt
- `frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx` - Fixture/Assertions an neuen Typ angepasst, alter Release-Test ersetzt durch Abwesenheits-/Sichtbarkeits-Test
- `frontend/src/types/profile.ts` - `PublicMemberProjectReleaseVersion`-Interface entfernt, `release_versions`-Feld aus `PublicMemberCurrentProject` entfernt
- `frontend/src/app/members/[slug]/page.test.tsx` - Fixture an neuen Typ angepasst (Compile-Fix, Rule 3)
- `frontend/src/components/profile/MemberProfileHero.test.tsx` - Fixture an neuen Typ angepasst (Compile-Fix, Rule 3)
- `backend/internal/repository/member_profile_projects_repository.go` - Release-Version-Anreicherungs-Block entfernt, `decodeMemberRoles` uebernommen, `encoding/json`-Import ergaenzt
- `backend/internal/repository/member_profile_projects_release_versions_repository.go` - geloescht (keine Referenz mehr nach Entfernung des Aufrufs)
- `backend/internal/models/member_profile.go` - `PublicMemberProjectReleaseVersion`-Struct entfernt, `ReleaseVersions`-Feld aus `PublicMemberCurrentProject` entfernt
- `backend/internal/handlers/public_member_profile_contract_test.go` - Fixture-Zeile `ReleaseVersions: ...` entfernt (Compile-Fix)
- `backend/internal/repository/member_profile_query_budget_test.go` - `phase131ConstantQueryBudget` 16 -> 15, Kommentar/Logf an neue Realitaet angepasst
- `shared/contracts/openapi.yaml` - Schema `PublicMemberProjectReleaseVersion` entfernt, `release_versions` aus `PublicMemberCurrentProject` (required+properties) entfernt

## Decisions Made
- Backend-Ladelogik wurde mitentfernt (nicht nur im Frontend versteckt), weil die Recherche in der Planung bereits bestaetigt hatte, dass sie ausschliesslich vom oeffentlichen Profil-Loader genutzt wird -- `/me`/Admin-Pfade (`MeProjectDetail`/`MeProjectReleaseVersion`) sind komplett getrennter Code und wurden nicht angefasst (per `grep` verifiziert).
- `phase131ConstantQueryBudget` wurde nicht blind auf 15 geraten, sondern durch zwei vollstaendige `scripts/test-backend.sh`-Laeufe real gemessen (erster Lauf zeigte den erwarteten `expected: 16, actual: 15`-Fehlschlag, zweiter Lauf nach Korrektur war komplett gruen).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking compile issue] Zwei weitere Testdateien referenzierten das entfernte `release_versions`-Feld**
- **Found during:** Task 1 (`npm run typecheck`)
- **Issue:** `frontend/src/app/members/[slug]/page.test.tsx` und `frontend/src/components/profile/MemberProfileHero.test.tsx` (beide nicht im Plan-`files_modified` gelistet) hatten eigene Fixtures mit `release_versions`-Feld, die nach Entfernung des Typs nicht mehr kompilierten.
- **Fix:** Die jeweiligen `release_versions: [...]`-Zeilen in den Fixtures entfernt; keine Assertion in diesen Dateien pruefte den Release-Inhalt, daher keine weitere Anpassung noetig.
- **Files modified:** `frontend/src/app/members/[slug]/page.test.tsx`, `frontend/src/components/profile/MemberProfileHero.test.tsx`
- **Verification:** `npm run typecheck` gruen; beide Testdateien einzeln mit `npm test -- --run` gegengeprueft (31 + 39 Tests gruen)
- **Committed in:** `1e635f7ee` (Teil des Task-1-Commits)

**2. [Rule 1 - stale comment] `t.Logf`-Beschreibung im Query-Budget-Test beschrieb nicht mehr existierende Batch-Query**
- **Found during:** Task 2
- **Issue:** `member_profile_query_budget_test.go` beschrieb im Charakterisierungs-Log weiterhin "post-131-03 shape: ... + 1 batched loadCurrentProjectReleaseVersionsBatch query", obwohl diese Query durch diesen Plan entfernt wurde.
- **Fix:** Log-Text auf die neue Realitaet aktualisiert (keine Batch-Query mehr, konstante Basis-Query).
- **Files modified:** `backend/internal/repository/member_profile_query_budget_test.go`
- **Verification:** Vollstaendiger `scripts/test-backend.sh`-Lauf gruen (inkl. `TestPhase131PublicProfileQueryBudgetCharacterization`)
- **Committed in:** `24a50c646` (Teil des Task-2-Commits)

## Deferred Issues (out of scope, logged nicht committet)

- Vorbestehender, von diesem Plan unabhaengiger TS-Fehler im generierten Next.js-Typ-Artefakt `.next/dev/types/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.ts` ("Type 'Props' does not satisfy the constraint 'PageProps'"). Keine der von diesem Plan beruehrten Dateien referenziert diese Route; ausserhalb des Scopes. Dokumentiert in `.planning/quick/261020-cmi-ffentliches-mitgliederprofil-keine-aufli/deferred-items.md`.

## Verification Results

- Task 1: `npm run typecheck` gruen (bis auf den o. g. unrelated Deferred-Issue), `MemberCurrentProjectsSection.test.tsx` (11 Tests) gruen, `npm run lint` liefert nur vorbestehende Warnungen/4 vorbestehende Fehler in unberuehrten Dateien (`capture-responsive.cjs`, Memoization-Hinweis, `CapabilityDetailRow.tsx`).
- Task 2: `go build ./...` und `go vet ./...` fehlerfrei; `go test ./internal/repository/... -run MemberProfile` und `go test ./internal/handlers/... -run PublicMemberProfile` gruen (DSN-abhaengige Tests korrekt uebersprungen ohne Env-Var); `grep` bestaetigt keine verbliebenen Referenzen auf `ReleaseVersions`/`loadCurrentProjectReleaseVersionsBatch`/`sameMemberRoleSets`/`is_release_specific`/`PublicMemberProjectReleaseVersion` ausserhalb unberuehrter `/me`-Pfade.
- Task 3: Zwei vollstaendige `scripts/test-backend.sh`-Laeufe (`GATE: GREEN`, `go test exit code: 0`), Backend neu gebaut (`docker compose up -d --build team4sv30-backend`, `/health` -> `{"status":"ok"}`), Frontend neu gestartet (`docker restart team4sv30-frontend`). `curl` gegen `http://127.0.0.1:3000/members/founder` und `/members/uebersetzung`: beide HTTP 200, 0 Treffer fuer "Folge " und "Projektweit", 11eyes-Projektkarte mit `projectCard`/`roleChip`-Markup weiterhin vorhanden, kein EmptyState-Text.

## Self-Check: PASSED

- `backend/internal/repository/member_profile_projects_release_versions_repository.go` -> MISSING (erwartet geloescht): bestaetigt
- `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` -> FOUND
- `backend/internal/repository/member_profile_projects_repository.go` -> FOUND
- Commit `1e635f7ee` -> FOUND (`git log --oneline --all`)
- Commit `24a50c646` -> FOUND (`git log --oneline --all`)
