---
phase: 189
slug: bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-20
---

# Phase 189 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: Go `testing` + `testify/require`, real Postgres via `backend/internal/testsupport` per-phase fixtures. Frontend: Vitest 3 (`frontend/vitest.config.ts`). |
| **Config file** | No central backend test config — each phase creates its own `testsupport.OpenPhaseNNNPostgres(t)` fixture. Frontend: `frontend/vitest.config.ts`. |
| **Quick run command** | `go test ./backend/internal/repository/... -run <TestName> -v` (backend) / `npm --prefix frontend run test -- <file-glob>` (frontend) |
| **Full suite command** | `go test ./backend/...` (backend, requires `TEAM4S_PHASEnnn_TEST_DSN` env vars or fixtures `t.Skip`) / `npm --prefix frontend run test` (frontend) |
| **Estimated runtime** | ~60-120 seconds (backend full), ~30-60 seconds (frontend full) |

**Critical gotcha (from research):** `backend/internal/repository/test_helpers.go`'s `setupTestRepo`/`createTestAnime` are permanently-skipping placeholders (`t.Skip(...)`) — never actually run. Do NOT use this pattern for new tests. Use a real `testsupport.OpenPhaseNNNPostgres` fixture instead (e.g. `OpenPhase107Postgres`, `OpenPhase187Postgres` already wire the relevant tables).

---

## Sampling Rate

- **After every task commit:** Run the specific new/extended test file (see Per-Task Verification Map).
- **After every plan wave:** `go test ./backend/...` and `npm --prefix frontend run test` (full suites).
- **Before `/gsd:verify-work`:** Full suite must be green. Confirm required `TEAM4S_PHASEnnn_TEST_DSN` env vars are set before trusting a "green" result for Postgres-backed tests.
- **Max feedback latency:** ~120 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 189-xx | TBD | 0 | D-04 | — | N/A | unit (real Postgres) | `go test ./backend/internal/repository/... -run TestGroupRepositoryCoop -v` | ❌ Wave 0 — new file `group_repository_coop_test.go` | ⬜ pending |
| 189-xx | TBD | 0 | D-04 | — | N/A | unit (real Postgres) | extend `group_repository_cursor_test.go` | ❌ Wave 0 — extend | ⬜ pending |
| 189-xx | TBD | 1 | D-05 | — | N/A | unit (Vitest, pure component) | `npm --prefix frontend run test -- ProjectStats.test.tsx` | ✅ exists — extend | ⬜ pending |
| 189-xx | TBD | 1 | D-06 | — | N/A | unit (Vitest, pure function) | new/extended test on data-derivation helper | ❌ Wave 0 — depends on helper location | ⬜ pending |
| 189-xx | TBD | 1 | D-07 | — | N/A | unit (Vitest, already exists) | `npm --prefix frontend run test -- ResponsiveImage` / `publicImagePatterns` + absence-check that `releases/page.tsx` no longer imports raw `next/image` for logo slots | ✅ exists — extend | ⬜ pending |
| 189-xx | TBD | 0 | D-08 | — | N/A | unit (Go, httptest handler, real code path) | `go test ./backend/internal/handlers/... -run TestAnimeProjectNote.*ProjectRole -v` (mirror `TestUpdateAnimeFansubProjectTimelineAllowsConfirmedProjectLeadWithoutGroupRole`) | ❌ Wave 0 | ⬜ pending |
| 189-xx | TBD | 0 | D-08 | — | N/A | unit (Go, httptest) | `go test ./backend/internal/handlers/... -run TestAppAuthCapabilities -v` | check existing file first | ⬜ pending |
| 189-xx | TBD | 2 | D-11 | — | N/A | absence check (grep, CLAUDE.md exception) | `grep -rn "fansub_merge\|MergeFansubs\|mergeFansubs" backend frontend/src shared/contracts` returns nothing outside explicitly-kept files | N/A | ⬜ pending |
| 189-xx | TBD | 2 | D-11 | — | N/A | build integrity | `release_version_group_guard_test.go:283` (`TestFansubRepositoryMergeCoreHasNoGuardReferences`) removed in the same commit as `fansub_repository_merge_core.go` | ⚠️ pre-existing test, must be deleted together | ⬜ pending |
| 189-xx | TBD | 0 | D-12 | — | N/A | unit (Go, real Postgres fixture) | `go test ./backend/internal/repository/... -run TestFansubGroupDeleteDependents -v` | ❌ Wave 0 | ⬜ pending |
| 189-xx | TBD | 0 | D-12 | — | N/A | unit (Go, httptest) | `go test ./backend/internal/handlers/... -run TestDeleteFansub.*Dependents -v` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Task IDs/Plan/Wave are placeholders — the planner assigns final values; this table's requirement coverage must be preserved 1:1.*

---

## Wave 0 Requirements

- [ ] New repository test file for `getCoopGroups` (D-04) — real-fixture test, add `group_repository_coop_test.go` (or extend `group_repository_cursor_test.go`), reusing the `testsupport.OpenPhase107Postgres`-style fixture pattern (already wires anime/episodes/fansub_releases/release_version_groups/anime_fansub_groups).
- [ ] New repository test file for `DeleteGroup` dependents counting (D-12) — reuse `testsupport.OpenPhase187Postgres` (already has `anime`, `release_version_groups`, `anime_fansub_groups`, `release_crew_snapshots`, `release_role_credit_lifecycles`, `release_version_media`/`release_version_notes`) plus new stand-ins for whichever additional tables the plan decides to count (`fansub_group_members`, `fansub_group_notes`, `anime_fansub_project_notes`, `fansub_group_history`, `fansub_group_default_crew`, invitations, overrides, `review_decisions`/`review_audit_events`).
- [ ] New/extended handler test for the new project-notes write-access guard (D-08) — mirror `admin_content_anime_project_timeline_test.go`'s Handler-Test A/B pair, swapping in `UpsertAnimeFansubProjectNote`/`DeleteAnimeFansubProjectNote`.
- [ ] Frontend test for the new "Mehr entdecken" link-list derivation helper (D-06) — pure, independently-testable function, following this repo's existing `fansubProjectRoutes.test.ts` style (pure-function Vitest tests, no render/click simulation).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Projektseite `/anime/2/group/26` zeigt korrekt keine Coop-Partner, „Weitere Gruppen" in „Mehr entdecken" klickbar | D-04/D-05/D-06 | End-to-end visual/UX confirmation of the final page layout, not reducible to a single unit assertion | Login als Admin, Seite öffnen, Kopfbereich + „Mehr entdecken" prüfen, Klickziele verifizieren |
| `/anime/2/group/26/releases` lädt ohne next/image-Absturz | D-07 | Runtime crash reproduction requires an actual browser render against the real media URL shape | Seite im Browser öffnen, Konsole auf Fehler prüfen |
| Admin-UI zeigt 409-Lösch-Sperre-Meldung mit korrekter Abhängigkeitsliste beim Löschversuch einer Gruppe mit echten Abhängigkeiten | D-12 | UI dialog rendering + exact German wording confirmation | Löschversuch einer Bestandsgruppe mit Releases im Admin-UI auslösen, Meldung prüfen |
| Merge-Einstiegspunkte sind aus der Admin-UI vollständig verschwunden (keine toten Links/Buttons) | D-11 | Visual absence check across admin navigation | Admin-Fansubs-Bereich durchklicken, keine Merge-Option mehr vorhanden |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
