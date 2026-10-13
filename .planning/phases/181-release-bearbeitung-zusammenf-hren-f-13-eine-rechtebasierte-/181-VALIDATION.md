---
phase: 181
slug: release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-13
---

# Phase 181 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Frontend)** | Vitest 3 (`frontend/vitest.config.ts`), bereits eingerichtet |
| **Framework (Backend)** | Go `testing` + `testify` (`stretchr/testify`), bereits eingerichtet |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command (Frontend)** | `cd frontend && npx vitest run src/app/releases` (nach Verschieben) |
| **Quick run command (Backend)** | `cd backend && go test ./internal/handlers/... ./internal/repository/... -run "ProjectDetail"` |
| **Full suite command (Frontend)** | `cd frontend && npm test` (`vitest run`) + `npm run typecheck` (`tsc --noEmit`) + `npm run lint` |
| **Full suite command (Backend)** | `cd backend && go test ./...` |
| **Estimated runtime** | ~90s Frontend-Suite, ~60s Backend-Suite (bestehende Baselines) |

---

## Sampling Rate

- **After every task commit:** gezielt betroffene Vitest-/Go-Testdateien (`npx vitest run <pfad>`, `go test ./internal/handlers/... -run <Pattern>`)
- **After every plan wave:** volle Frontend-Suite (`npm test`) + volle Backend-Suite (`go test ./...`) + `tsc --noEmit` + `eslint .`
- **Before `/gsd:verify-work`:** alle vier grün, plus Live-UAT für Redirects/Tab-Sichtbarkeit/Navigation (explizite Pflicht laut CONTEXT.md, nicht durch Automatisierung ersetzbar)
- **Max feedback latency:** ~90 Sekunden (volle Frontend-Suite ist der langsamste Einzelschritt)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 181-02 Task 1 | 02 | 1 | D-01/D-04 | — | `/admin/episode-versions/:versionId/edit` → 308 → `/releases/:versionId/edit` (Query erhalten) | unit | `cd frontend && npx vitest run src/lib/releaseEditorRedirects.test.ts` | ❌ Wave 0 (erstellt in Plan 02) | ⬜ pending |
| 181-02 Task 1 | 02 | 1 | D-01/D-04 | — | `/me/releases/:versionId/workspace` → 308 → `/releases/:versionId/edit` (zweite Regel im selben Modul) | unit | dieselbe Testdatei wie oben | ❌ Wave 0 (erstellt in Plan 02) | ⬜ pending |
| 181-06 Task 3 | 06 | 3 | D-02 | — | Nicht-Admin mit nur `can_view_media=true` sieht ausschließlich den `media`-Tab, kein `files`/`changelog` | unit | `cd frontend && npx vitest run "src/app/releases/[versionId]/edit/releaseEditorTabs.test.ts"` | ❌ Wave 0 (erstellt in Plan 02 Task 3 als `releaseEditorTabs.ts`, konsumiert in Plan 06) | ⬜ pending |
| 181-02 Task 2 | 02 | 1 | D-03 | — | `resolveNavigationContext({returnTo:'/me/projects/5/group/3',...})` liefert `'project'`; `resolveNavigationContext({returnTo:'/admin/fansubs/5/edit',...})` liefert `'episode'`; Fallback ohne jeden Hinweis liefert `'project'` (RESEARCH.md Assumption A1, explizit als Regressionsfall erfasst) | unit | `cd frontend && npx vitest run "src/app/releases/[versionId]/edit/releaseEditorRouting.test.ts"` | ❌ Wave 0 (erstellt in Plan 02; Logik vorher zweimal getrennt in `EpisodeVersionEditorPage.tsx:56-93` und `workspaceHelpers.ts`) | ⬜ pending |
| 181-01 Task 2 | 01 | 1 | D-05 | T-181-01 | App-User ohne verifizierten `member_claims`-Eintrag, aber mit Platform-Admin-Flag → `GET /api/v1/me/projects/:animeId?fansub_group_id=:id` liefert 200 mit echten `release_versions`, nicht 404 | integration | `cd backend && go test ./internal/handlers/... -run TestGetMyProjectDetailGracefulWithoutMemberProfile` | ❌ Wave 0 (neues Testfile `contributions_me_project_handler_test.go`, erstellt in Plan 01) | ⬜ pending |
| 181-01 Task 1 | 01 | 1 | D-05 (SQL) | T-181-01 | `GetMemberProjectDetail(ctx, memberID=0, appUserID, animeID, fansubGroupID)` gegen reale Fixture-Daten liefert `role_codes=[]`, aber korrekte `anime_title`/`release_versions`, kein `ErrNotFound` — Repository-Fix: `JOIN own_roles ON true` → `LEFT JOIN own_roles ON true` | integration | `cd backend && go test ./internal/repository/... -run TestGetMemberProjectDetailWithSentinelMemberID` | ❌ Wave 0 (neues Testfile `anime_contributions_member_project_repository_test.go`, erstellt in Plan 01) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — Status bleibt pending bis `/gsd:execute-phase 181` läuft; diese Tabelle wurde nach Planabschluss mit den tatsächlichen Plan-/Task-Referenzen aktualisiert (gsd-plan-checker-Bericht 2026-10-13, Warnung #5).*

---

## Wave 0 Requirements

- [x] `frontend/src/lib/releaseEditorRedirects.ts` + Test — extrahierte, testbare Redirect-Regelliste für `next.config.mjs` (Plan 181-02 Task 1)
- [x] `frontend/src/app/releases/[versionId]/edit/releaseEditorRouting.ts` + Test — vereinheitlichtes `getSafeReturnPath` + `resolveNavigationContext` (Plan 181-02 Task 2)
- [x] `frontend/src/app/releases/[versionId]/edit/releaseEditorTabs.ts` + Test — `buildReleaseEditorTabIds` (Plan 181-02 Task 3)
- [x] `backend/internal/handlers/contributions_me_project_handler_test.go` — existiert noch gar nicht, erster Test für diesen Handler überhaupt (Plan 181-01 Task 2)
- [x] `backend/internal/repository/anime_contributions_member_project_repository_test.go` — Sentinel-`memberID`-Fall gegen reale Postgres-Fixture (Plan 181-01 Task 1)

*Checkboxen markieren "im Plan vorgesehen", nicht "bereits ausgeführt" — Ausführung erfolgt erst mit `/gsd:execute-phase 181`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Alle 11 externen Einstiegspunkte landen nach Umstellung sichtbar auf der neuen Seite (keine toten Links, kein Redirect-Flackern) | D-01 | Cross-Page-Klickpfade über 11 verschiedene Ausgangsseiten sind nicht sinnvoll in Unit-Tests abbildbar; CLAUDE.md verlangt Live-UAT für Klickabläufe | Jede der 11 Fundstellen aus 181-CONTEXT.md (6 Admin-Route + 5 Workspace-Route) im Browser anklicken, prüfen dass Zielseite lädt und Kontext (Tab, Rückweg) stimmt |
| Tab-Sichtbarkeit je Rolle visuell korrekt (Admin sieht 6-7 Tabs, Mitglied ohne Admin-Rechte nur die 4 capability-gated Tabs, keine ausgegrauten Admin-Tabs sichtbar) | D-02 | Rollenabhängige Sichtbarkeit lässt sich zwar in Unit-Tests auf Tab-ID-Ebene prüfen, aber visuelles "nichts Falsches sichtbar" (CSS/Layout) braucht echten Browser-Blick | Mit einem Plattform-Admin-Account UND einem Nicht-Admin-Mitglied-Account dieselbe Release-Version öffnen, Tab-Leiste vergleichen |
| Vor/Zurück-Navigation zeigt je Einstiegskontext die erwarteten Nachbarn (Projekt-Release-Liste vs. Episoden-Liste) | D-03 | Die Nachbar-Berechnung selbst ist unit-testbar, aber ob der Nutzer die "richtigen" Nachbarn im jeweiligen Alltagskontext sieht, ist eine UX-Abnahme | Aus einem Projekt-Link einsteigen, Vor/Zurück klicken, prüfen dass nur Releases desselben Projekts erscheinen; dann aus der Episoden-Übersicht einsteigen, prüfen dass über alle Episoden geblättert wird |
| Plattform-Admin ohne Mitgliederprofil bekommt auf der neuen Seite UND bei der Navigation kein 404 mehr | D-05 | Integrationstest deckt den Endpunkt ab, aber der vollständige Seitenaufruf (Laden, Rendern, kein Fehlerzustand) ist nur im Browser sichtbar | Mit einem Plattform-Admin-Account ohne verifizierten `member_claim` die neue Seite öffnen und durchblättern, prüfen dass keine 404-Fehlerseite erscheint |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (confirmed by gsd-plan-checker, 2026-10-13)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (5 new test files, all assigned to Plans 01/02)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-13 (plan-level; execution-level sign-off happens at `/gsd:verify-work` after `/gsd:execute-phase 181`)
