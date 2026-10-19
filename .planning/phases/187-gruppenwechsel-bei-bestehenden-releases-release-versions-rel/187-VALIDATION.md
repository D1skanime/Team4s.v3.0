---
phase: 187
slug: gruppenwechsel-bei-bestehenden-releases-release-versions-rel
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-19
---

# Phase 187 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + `github.com/stretchr/testify/require`, `net/http/httptest`, `gin.CreateTestContext` |
| **Config file** | none — no test framework config file in this Go stack |
| **Quick run command** | `go test ./backend/internal/repository/... ./backend/internal/handlers/... -run <TestName> -v` |
| **Full suite command** | `go test ./backend/...` (requires `TEAM4S_PHASE187_TEST_DSN` + the project's other `TEAM4S_PHASE*_TEST_DSN` env vars pointing at the disposable dev Postgres instance, per existing `testsupport` convention) |
| **Estimated runtime** | ~30-60 seconds (adds one new real-Postgres fixture on top of existing backend suite) |

---

## Sampling Rate

- **After every task commit:** Run `go test ./backend/internal/... -run TestXxx -v` for the specific new test function(s) touched by that task
- **After every plan wave:** Run `go test ./backend/internal/repository/... ./backend/internal/handlers/...`
- **Before `/gsd:verify-work`:** Full `go test ./backend/...` must be green, plus confirm no existing test in `episode_version_repository_write_helpers_test.go` / `episode_import_repository_apply_test.go` / `admin_episode_import_test.go` regressed
- **Max feedback latency:** ~60 seconds (full backend suite)

---

## Per-Task Verification Map

No formal task IDs exist yet (phase not planned). Rows map CONTEXT.md's locked decisions
(D-01..D-14) — this phase's de facto requirements — to concrete tests; the planner assigns real
task IDs and must preserve this coverage.

| Decision | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|----------|------|------|-------------|------------|-----------------|-----------|--------------------|-------------|--------|
| D-01 | TBD | TBD | Gruppenwechsel erlaubt, wenn nichts dranhängt (Case A) | — | Baseline erlaubt | integration (real Postgres) | `go test ./backend/internal/repository/... -run TestReleaseVersionGroupGuard -v` | ❌ W0 | ⬜ pending |
| D-02/D-10 | TBD | TBD | Server-409 mit deutscher Aufschlüsselung statt 500 (Case B/C) | V4/Tampering (Confused-Deputy via Client-Diff) | 409 statt 500, Breakdown im Body | handler (httptest+fake oder Fixture) | `go test ./backend/internal/handlers/... -run TestUpdateEpisodeVersion -v` | ❌ W0 | ⬜ pending |
| D-06/D-14 (Editor) | TBD | TBD | 0-Gruppen-Reduktion im Editor-Pfad abgelehnt vor jedem DELETE | — | Keine Mutation bei Ablehnung | repository (real Postgres zum Mutationsnachweis) | `go test ./backend/internal/repository/... -run TestSyncEpisodeVersionSelectedGroups -v` | ❌ W0 | ⬜ pending |
| D-06/D-14 (Import) | TBD | TBD | 0-Gruppen-Reduktion im Import-Pfad identisch abgelehnt | — | Keine Mutation bei Ablehnung | repository/handler | `go test ./backend/internal/repository/... -run TestUpsertReleaseVersionGroup -v` | ❌ W0 | ⬜ pending |
| D-07 | TBD | TBD | Entfernen einer Partnergruppe mit Anhang gesperrt (wie Alleingruppe) | — | Gleiche Sperrlogik | integration | `go test ./backend/internal/repository/... -run TestReleaseVersionGroupGuard -v` | ❌ W0 | ⬜ pending |
| D-08 | TBD | TBD | Medien/Notizen mit dieser `fansub_group_id` zählen als Anhang (schließt Case-C-Verwaisung) | V5 Input Validation (kein neuer Injection-Vektor) | Blockiert statt zu verwaisen | integration (neue media/notes-Fixture-Tabellen) | `go test ./backend/internal/repository/... -run TestReleaseVersionGroupGuard -v` | ❌ W0 | ⬜ pending |
| D-09 | TBD | TBD | Leerer `inherited`-Snapshot ohne Credits zählt NICHT als Anhang | — | Kein False-Positive-Block | integration | `go test ./backend/internal/repository/... -run TestReleaseVersionGroupGuard -v` | ❌ W0 | ⬜ pending |
| D-11 | TBD | TBD | Guard gilt auch für Plattform-Admins (keine Bypass) | V4 Access Control (Guard ist Datenkonsistenz, keine Autz-Dimension) | 409 trotz Admin-Identität bei Anhang | handler | `go test ./backend/internal/handlers/... -run TestUpdateEpisodeVersion -v` | ❌ W0 | ⬜ pending |
| D-12 (Same-Group-Update) | TBD | TBD | Import-Update derselben Gruppe am bestehenden Release immer erlaubt, auch mit Anhang | — | Nie 409/Konflikt bei identischer Gruppe | integration/handler | `go test ./backend/internal/repository/... -run TestUpsertReleaseVersionGroup -v` | ❌ W0 | ⬜ pending |
| D-12 (Zeilen-Konflikt) | TBD | TBD | Eine blockierte Zeile wird als Konflikt markiert, Rest der Charge läuft durch, `result.Conflicts` erhöht | V3 Tampering (Partial-Batch-Datenkorruption) | HTTP 200 fürs Gesamt-Apply, N-1 Zeilen erfolgreich, 1 Zeile als Konflikt | handler/repository | `go test ./backend/internal/handlers/... -run TestApplyEpisodeImport -v` | ❌ W0 | ⬜ pending |
| D-13 | TBD | TBD | Merge-Pfad unverändert (Abwesenheits-Prüfung erlaubt) | — | Kein Guard-Code im Merge-Pfad | absence check (CLAUDE.md-Ausnahme) | n/a — Grep auf Abwesenheit ist hier zulässig | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/testsupport/phase187_postgres.go` — neue reale Postgres-Fixture (Release-Tabellen + Migration 0137 angewendet + neue `release_version_media`/`release_version_notes`-Stand-ins, da D-08 diese ohne bestehende Fixture-Abdeckung braucht), nach dem Namensmuster `TEAM4S_PHASE187_TEST_DSN` / `phase187_[a-z0-9_]+`-Schema wie in `phase107/117/165_postgres.go`
- [ ] `backend/internal/repository/release_version_group_guard_test.go` — neue reale-Postgres-Repository-Tests für die Dependents-Count-SQL (RESTRICT/Credits vs. CASCADE/leerer Snapshot vs. orphan-anfällige Medien/Notizen ohne FK)
- [ ] `TEAM4S_PHASE187_TEST_DSN`-Umgebungsvariable im Dev/CI-Postgres-Container bestätigen (gleicher Mechanismus wie `TEAM4S_PHASE117_TEST_DSN` — keine neue Infrastruktur, aber vor Wave 1 zu verifizieren)
- [ ] Architekturentscheidung A3 (Fake-Interface vs. Fixture-only für Handler-Tests) vor dem ersten Handler-Test treffen und dokumentieren, damit alle neuen Handler-Tests einem Muster folgen
- [ ] Architekturentscheidung A2 (Pre-Check vs. Savepoint für die Zeilen-Fortsetzung im Import-Apply-Loop, siehe Pitfall 1) vor dem Schreiben des Fortsetzungs-Tests treffen und dokumentieren
- [ ] D-12s Prüfauftrag (erkennt der Import ein bestehendes Release heute zuverlässig über Anime/Episode/Gruppe/Version?) früh auflösen — das Ergebnis kann den Fixture-Umfang der Import-Pfad-Tests verändern

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chip im Editor vorab deaktiviert/ausgegraut mit sichtbarer Begründung (D-10 Client-Teil); Beschriftung „Partnergruppe hinzufügen" (D-05); Klickabläufe im Gruppen-Abschnitt | D-05, D-10 (Client-Teil) | Per 187-CONTEXT.md explizite Teststil-Vorgabe: keine Render-/Klick-Simulationstests für die Chip-UI — Klickabläufe werden als Live-UAT geprüft, nicht automatisiert | Im Release-Editor (`/admin/episode-versions/[versionId]/edit`) eine Gruppe mit Anhang entfernen versuchen → Chip muss ausgegraut/deaktiviert sein mit sichtbarer deutscher Begründung (Anzahl je Art); eine Gruppe ohne Anhang entfernen → funktioniert; „Partnergruppe hinzufügen" korrekt beschriftet und funktionsfähig |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
