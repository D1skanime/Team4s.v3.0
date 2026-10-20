---
phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen
plan: 05
subsystem: auth
tags: [permissions, postgres, gin, nextjs, react, capability-matrix]

# Dependency graph
requires:
  - phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen (188-01..04)
    provides: bestehende Fansub-Edit-UI, bestehendes Capability-Endpoint-Muster, bestehende Permission-Service-Architektur (CanForReleaseVersion-Vorlage)
provides:
  - "CanForAnimeProject: projektbewusste Rechteprüfung (Gruppenrolle ODER bestätigte anime_contribution_roles-Projektrolle für exakt Anime+Gruppe), nach CanForReleaseVersion-Muster, ohne neue Pflichtmethode auf dem bestehenden Resolver-Interface"
  - "ListActorContributionRolesForAnimeProject: confirmed-gefilterte, anime+gruppen-exakte Projektrollen-Query"
  - "Migration 0185: fansub_lead gewinnt anime_fansub_project.timeline.update, typesetter verliert es (gezielt, kein Tabellen-Wipe)"
  - "Projektbezogener Capability-Abruf im Frontend (GET .../capabilities?anime_id=...) überschreibt die gruppenweite Fallback-Prop für die Projektzeitraum-Datumsfelder"
  - "AnimeReleasesCockpit.tsx und AnimeProjectReleaseCard.tsx (D-14-Split, beide ≤450 Zeilen)"
affects: [188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen, anime-admin-permissions, fansub-edit-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optionales Resolver-Interface via Typassertion (AnimeProjectContributionResolver), analog GroupRightsMembershipResolver/ReviewContextResolver -- vermeidet Pflicht-Methoden-Breakage in 19 bestehenden Resolver-Stub-Implementierungen"
    - "Projektbezogene Capability-Freischaltung im Frontend per zusätzlichem, fehlertolerantem useEffect (projectCanEdit ?? canEdit), statt die bestehende gruppenweite Prop zu ersetzen"

key-files:
  created:
    - backend/internal/permissions/permissions_types.go
    - backend/internal/permissions/permissions_cache.go
    - backend/internal/permissions/permissions_release.go
    - backend/internal/permissions/permissions_anime_project.go
    - backend/internal/permissions/permissions_anime_project_test.go
    - backend/internal/repository/authz_resolve.go
    - backend/internal/repository/authz_roles.go
    - backend/internal/repository/authz_anime_project.go
    - backend/internal/repository/authz_anime_project_postgres_test.go
    - backend/internal/testsupport/phase188_permissions_postgres.go
    - database/migrations/0185_anime_project_timeline_fansub_lead.up.sql
    - database/migrations/0185_anime_project_timeline_fansub_lead.down.sql
    - backend/internal/migrations/phase188_project_timeline_fansub_lead_test.go
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectReleaseCard.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.test.tsx
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/repository/authz_permissions.go
    - backend/internal/repository/authz_permissions_test.go
    - backend/internal/handlers/admin_content_anime_project_timeline.go
    - backend/internal/handlers/admin_content_anime_project_timeline_test.go
    - backend/internal/handlers/app_auth_capabilities.go
    - backend/internal/handlers/app_auth_test.go
    - shared/contracts/openapi.yaml
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesCockpit.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx
    - frontend/src/lib/api/admin/fansub-members.ts
    - frontend/src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts

key-decisions:
  - "Task-1-Testkorrektur (readAuthzPermissionsSource liest jetzt authz_permissions.go UND authz_roles.go) wurde in den Task-6-Commit 1 (reiner Umbau) nachgezogen, da sie strukturell zum Datei-Split aus Task 1 gehört, dort aber versehentlich ausgelassen wurde -- keine Verhaltensänderung, nur eine notwendige Testpfad-Korrektur."
  - "Task 6 wurde als zwei separate Commits umgesetzt (reiner Umbau vs. inhaltliche Änderung), exakt wie im Plan vorgesehen."

requirements-completed: [D-10, D-11, D-12, D-13, D-14]

# Metrics
duration: ~25min (dieser Fortsetzungs-Lauf: Task 6 Verifikation/Commit + Task 7 Infrastruktur-Teil)
completed: 2026-10-20
---

# Phase 188 Plan 05: Leader/Projektleiter-Projektzeitraum-Bugfix Summary

**CanForAnimeProject-Rechtsprüfung (Gruppenrolle ODER bestätigte Projektrolle) + Migration 0185 (fansub_lead gewinnt/typesetter verliert) + projektbezogenes Frontend-Capability-Wiring, Code-Stand vollständig committet, Live-UAT-Checkpoint steht noch aus.**

## Performance

- **Duration (dieser Fortsetzungs-Lauf):** ca. 25 Minuten
- **Tasks:** 7 von 7 code-/infrastrukturseitig abgeschlossen (Task 1-6 vollständig, Task 7 nur der automatisierbare Infrastruktur-Teil -- der menschliche Live-Checkpoint steht noch aus)
- **Files modified (gesamter Plan):** 22 Dateien (15 neu, 7 modifiziert in den vorherigen Tasks, plus die in diesem Lauf behandelten 6 Dateien aus Task 6)

## Accomplishments

- `permissions.go` (970 Zeilen) und `authz_permissions.go` (588 Zeilen) sind in je 4 bzw. 3 Dateien ≤450 Zeilen aufgeteilt (D-14), reiner Umbau ohne Verhaltensänderung.
- Neue, wiederverwendbare Resolver-Fähigkeit `ListActorContributionRolesForAnimeProject` (confirmed-gefiltert, anime+gruppen-exakt) und Service-Methode `CanForAnimeProject` (optionales Interface, kein Fail-Open-Risiko) nach dem `CanForReleaseVersion`-Muster.
- Migration 0185: `fansub_lead` gewinnt `anime_fansub_project.timeline.update` (D-10), `typesetter` verliert es (D-11) -- additiv/gezielt-subtraktiv, kein Tabellen-Wipe, Live-Up/Down/Up bewiesen.
- Timeline-Write-Endpunkt und Capabilities-Endpunkt berücksichtigen jetzt bestätigte Projektrollen; bestehendes gruppenweites Verhalten ohne `anime_id` bleibt unverändert (Regressionsschutz).
- `AnimeReleasesCockpit.tsx` (vorher 557 Zeilen laut Plankontext) ist in `AnimeReleasesCockpit.tsx` (192 Zeilen) + neue `AnimeProjectReleaseCard.tsx` (352 Zeilen) aufgeteilt (D-14).
- `AnimeProjectTimelineSection.tsx` ruft zusätzlich zur gruppenweiten `canEdit`-Prop einen projektbezogenen Capability-Abruf (`anime_id`-Query-Parameter) ab und schaltet die Datumsfelder projektbezogen frei (D-12/D-13), mit Fehlertoleranz (Fallback auf `canEdit` bei Netzwerkfehler).
- Backend neu gebaut und neu gestartet (Migration 0185 live angewendet, Permission-Cache neu geladen), Frontend neu gestartet -- beide Container laufen sauber.

## Task Commits

Alle Commits aus diesem und vorherigen Executor-Läufen (chronologisch):

1. **Task 1: Backend-Dateien aufteilen (D-14)** - `62fe21202` (refactor)
2. **Task 2: ListActorContributionRolesForAnimeProject + Fixture** - `20c72f4d6` (feat)
3. **Task 3: Service.CanForAnimeProject** - `d84914e43` (feat)
4. **Task 4: Migration 0185** - `d8940375f` (feat)
5. **Task 5: Handler-Wiring Timeline-Write + Capabilities-Endpunkt** - `0e2bd3f9f` (feat)
6. **Task 6, Commit 1: AnimeReleasesCockpit.tsx-Split (D-14) + nachgezogene Task-1-Testkorrektur** - `88b50c8ba` (refactor)
7. **Task 6, Commit 2: projektbezogenes Capability-Wiring (D-12/D-13)** - `eb9d4f127` (feat)
8. **Zwischenstand-Doku (voriger Fortsetzungs-Lauf)** - `c06e286d8` (docs)
9. **Fix: Frontend-Anti-Drift-Test nach Task-1-Split nachgezogen** - `7c2e3903d` (fix, dieser Lauf)

**Plan metadata:** (dieser Commit, siehe unten)

## Files Created/Modified (dieser Fortsetzungs-Lauf, Task 6 + Task 7)

- `frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesCockpit.tsx` - auf 192 Zeilen reduziert, rendert nur noch die Kartenliste + Modal-/Drawer-Blöcke
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectReleaseCard.tsx` - NEU (352 Zeilen), enthält den gesamten Render-Block eines einzelnen Projekt-Releases, inkl. lokalisiertem `teamReadOnlyOpen`-State und `useRoleCatalog`-Aufruf
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx` - projektbezogener `getFansubGroupCapabilities(fansubId, undefined, { animeId })`-Abruf, `effectiveCanEdit = projectCanEdit ?? canEdit`
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.test.tsx` - NEU, 3 Tests (Freischaltung trotz `canEdit=false`, Sperre trotz `canEdit=true`, Fallback bei Netzwerkfehler)
- `frontend/src/lib/api/admin/fansub-members.ts` - `getFansubGroupCapabilities` erhält dritten optionalen Parameter `options?: { animeId?: number }`
- `backend/internal/repository/authz_permissions_test.go` - `readAuthzPermissionsSource` liest jetzt `authz_permissions.go` + `authz_roles.go` zusammen (nachgezogene Task-1-Korrektur)

## Decisions Made

- Die Task-1-Testkorrektur in `authz_permissions_test.go` wurde in den Task-6-"Commit 1" (reiner Umbau) aufgenommen statt einen separaten Nachtrags-Commit für Task 1 zu erzeugen, da sie inhaltlich zum Datei-Split gehört und keine eigenständige Änderung darstellt.
- Task 6 wurde plankonform als zwei separate Commits umgesetzt (reiner Umbau vs. inhaltliche Änderung), um die D-14-Aufteilung von der D-12/D-13-Verhaltensänderung sauber zu trennen.

## Deviations from Plan

**1. [Rule 1 - Bug, von einem weiteren Fortsetzungs-Lauf gefunden] Anti-Drift-Test las nach dem Task-1-Split nur noch das verkleinerte `permissions.go`**
- **Found during:** vollständiger `npm run test`-Lauf (dieser Lauf führte zusätzlich zur im Plan vorgegebenen schmaleren Verify-Teilmenge `AnimeProjectTimelineSection FansubAppMembersSection` auch die GESAMTE Frontend-Suite aus, wie von den projektspezifischen Ausführungsvorgaben verlangt).
- **Issue:** `frontend/src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` liest `backend/internal/permissions/permissions.go` über einen Docker-Mount als reinen Text und vergleicht `MembershipBaselineActionCodes` sowie die referenzierten `Action*`-Konstanten gegen ein TS-Literal. Nach dem Task-1-Split liegen beide Deklarationen nicht mehr in `permissions.go`, sondern in `permissions_cache.go` bzw. `permissions_types.go` -- der Test brach mit "variable declaration must be findable" rot. Analog zum bereits in Commit `88b50c8ba` nachgezogenen Backend-Pendant (`authz_permissions_test.go`), nur auf der Frontend-Seite und von der schmaleren Verify-Teilmenge nicht erfasst.
- **Fix:** Testdatei liest jetzt alle drei betroffenen Dateien (`permissions.go`, `permissions_types.go`, `permissions_cache.go`) zusammen; keine Verhaltensänderung am geprüften Vergleich selbst.
- **Files modified:** `frontend/src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts`
- **Commit:** `7c2e3903d`

Keine weiteren Abweichungen - der von den vorherigen Fortsetzungs-Läufen hinterlassene Diff war ansonsten strukturell vollständig und plankonform; dieser Lauf hat ihn unabhängig re-verifiziert (inkl. `scripts/test-backend.sh` GATE GREEN und einem vollen `npm run test`-Lauf, 394 Dateien/3634 Tests grün nach obigem Fix) und den aktuellen Infrastruktur-Zustand aus Task 7 gegengeprüft (Migration 185 live, `role_capabilities` zeigt exakt `fansub_lead`+`project_lead` für `anime_fansub_project.timeline.update`, Backend/Frontend-Container laufen), ohne weitere inhaltliche Korrekturen vornehmen zu müssen.

## Verification Results

- `cd frontend && npx tsc --noEmit` (im Container `team4sv30-frontend`): clean, keine Ausgabe.
- `npm run test -- AnimeProjectTimelineSection FansubAppMembersSection` (im Container): **2 Test-Dateien, 12 Tests, alle bestanden** (3 neue Tests in `AnimeProjectTimelineSection.test.tsx`, 9 bestehende in `FansubAppMembersSection.test.tsx` unverändert grün).
- `wc -l` Split-Dateien: `AnimeReleasesCockpit.tsx` = 192 Zeilen, `AnimeProjectReleaseCard.tsx` = 352 Zeilen (beide ≤450, D-14 erfüllt).
- `grep -nE "fansub_lead|project_lead|typesetter" "frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx" frontend/src/lib/api/admin/fansub-members.ts` → **0 Treffer** (D-13 bestätigt, kein hartcodierter Rollenname im Produktionscode dieser Task).
- Backend neu gebaut (`docker compose up -d --build team4sv30-backend`): Build erfolgreich, Container neu gestartet, Logzeile `migrations applied: 1`, Server-Log `server listening on :8092`.
- Migrationsprüfung: `docker compose exec team4sv30-db psql -U team4s -d team4s_v2 -tAc "SELECT 1 FROM schema_migrations WHERE version = 185;"` → **`1`** (Migration 185 live angewendet).
- Frontend neu gestartet (`docker restart team4sv30-frontend`): Next.js-Log zeigt `✓ Ready in 1559ms`, nachfolgende Requests mit `200`-Status.

### Zusätzliche unabhängige Re-Verifikation (dieser Fortsetzungs-Lauf)

- `scripts/test-backend.sh` (vollständiges Backend-Gate, frisch reproduzierte Fixtures inkl. der neuen `TEAM4S_PHASE188_PERMISSIONS_TEST_DSN`): **GATE: GREEN (0)**. Ein Testfehler wurde dabei zunächst gefunden und behoben (siehe Deviation oben): `TestListActorContributionRolesForVersion_ReleaseAssignmentsOverrideProjectRoles` in `authz_permissions_test.go` las nach dem Task-1-Split nur `authz_permissions.go`, nicht aber `authz_roles.go`, wohin `ListActorContributionRolesForVersion` umgezogen ist -- Fix ist bereits in Commit `88b50c8ba` enthalten (vom vorherigen Fortsetzungs-Lauf dort mit aufgenommen).
- `npm run test` (volle Frontend-Suite, nicht nur die im Plan genannte Teilmenge): **394 Dateien / 3634 Tests bestanden, 1 übersprungen, 3 todo** -- nach dem oben dokumentierten `RoleCapabilityDetail.membershipBaselineDrift.test.ts`-Fix. Zwei Zwischenläufe zeigten je einen anderen, isoliert reproduzierbar grünen Einzeltest-Fehlschlag (`page.test.tsx`-Drawer-Timing, dann der jetzt gefixte Anti-Drift-Test) -- konsistent mit der in Phase 186 dokumentierten Ressourcen-Konkurrenz-Flakiness bei parallelen Docker-Testläufen auf dieser VM, kein echter Regressionsbefund.
- `docker compose exec team4sv30-db psql ... -c "SELECT role_code FROM role_capabilities WHERE action_code = 'anime_fansub_project.timeline.update' ORDER BY role_code;"` → **exakt `fansub_lead`, `project_lead`** (typesetter korrekt entfernt, D-10/D-11 live bestätigt).
- `docker compose ps`: alle Container laufen, Backend/Frontend "Up" seit dem vorherigen Rebuild/Neustart.
- Alle drei D-13-Greps erneut ausgeführt (Handler, `permissions_anime_project.go`, Frontend) → **0 Treffer** in jedem Fall.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness / Offener Checkpoint

**Task 7 ist NUR im automatisierbaren Infrastruktur-Teil abgeschlossen** (Backend-Rebuild, Frontend-Neustart, Migrationsprüfung). Der blockierende menschliche Live-Checkpoint (`gate="blocking"`) steht noch aus:

- Login als `app_user 6` (Leader, Strawhat Subs) über `http://127.0.0.1:3300`.
- Navigation zu `/admin/fansubs/26/edit`, Releases-Tab, Projekt „11eyes: Pink Phantasmagoria“ (Anime 3) aufklappen.
- Prüfen, ob die Projektzeitraum-Datumsfelder jetzt editierbar sind (vorher: disabled), ein Testdatum setzen, speichern, Reload-Persistenz bestätigen.
- Gegenprobe: `typesetter` darf das Recht nicht mehr tragen, `fansub_lead` muss es tragen (z. B. über die Rechte-Matrix-UI).

Dieser Checkpoint wurde bewusst NICHT durch diesen Executor-Lauf ausgeführt (keine manuellen Browser-Schritte erlaubt). Ein nachfolgender Agent/der Nutzer muss den Live-Checkpoint durchführen und mit "verifiziert" (oder einer Abweichungsbeschreibung) bestätigen, bevor Plan 188-05 als vollständig abgeschlossen gilt.

---
*Phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen*
*Completed (Code-Stand, Live-Checkpoint ausstehend): 2026-10-20*
