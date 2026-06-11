---
phase: 82-mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri
plan: 01
subsystem: database
tags: [postgres, migration, members, anime_contributions, fansub_group_members, role_definitions, backfill]

requires:
  - phase: "database/migrations/0073–0091"
    provides: "fansub_group_members, anime_contributions, hist_fansub_group_members, role_definitions Basistabellen"
provides:
  - "fansub_group_members.member_id BIGINT NULL REFERENCES members(id) — App-Member mit members-Anker"
  - "anime_contributions.member_id BIGINT NOT NULL REFERENCES members(id) — Ankerwechsel von hist auf members"
  - "fansub_group_member_roles.role FK auf role_definitions(code) statt hartkodiertem CHECK"
  - "Neue Tabelle fansub_group_default_crew (Stamm-Crew pro Gruppe, D-04)"
affects:
  - "82-02 Backend"
  - "82-03 Frontend"
  - "anime_contributions-Repository (member_id-Backfill lückenlos)"

tech-stack:
  added: []
  patterns:
    - "ADD COLUMN nullable → Backfill → NOT NULL in einer Transaktion (sicherer Schema-Umbau)"
    - "Kollisionsprüfung via DO $$ RAISE EXCEPTION vor UNIQUE-Constraint-Tausch"
    - "COALESCE-Kette claim → legacy → new für deterministischen Backfill ohne Duplikate"

key-files:
  created:
    - database/migrations/0104_members_backfill_and_fansub_group_members_member_id.up.sql
    - database/migrations/0104_members_backfill_and_fansub_group_members_member_id.down.sql
    - database/migrations/0105_anime_contributions_member_id.up.sql
    - database/migrations/0105_anime_contributions_member_id.down.sql
    - database/migrations/0106_fansub_group_member_roles_fk.up.sql
    - database/migrations/0106_fansub_group_member_roles_fk.down.sql
    - database/migrations/0107_fansub_group_default_crew.up.sql
    - database/migrations/0107_fansub_group_default_crew.down.sql
  modified: []

key-decisions:
  - "Backfill-Kollisionsprüfung (T-82-01-01) per DO $$ RAISE EXCEPTION in 0105 vor Unique-Key-Tausch implementiert"
  - "fansub_group_member_roles.role von VARCHAR(40) auf TEXT umgestellt (Pitfall 6 — Zukunftssicherheit bei langen Rollencodes)"
  - "fansub_group_member_id in anime_contributions bleibt nullable statt sofortigem DROP (Übergangsphase für öffentliche Projektionen)"
  - "members-Backfill in 0104 irreversibel — DOWN-Migration entfernt nur die Spalte, nicht die angelegten members-Zeilen"

patterns-established:
  - "Backfill-Sicherheitscheck: vor jedem Unique-Key-Tausch Duplikate via DO $$ prüfen"
  - "COALESCE(verified_claim, legacy_user, new_row) als deterministischer Backfill-Fallback"
  - "Migrationen mit BEGIN/COMMIT-Wrapper für atomare Ausführung"

requirements-completed:
  - D-01
  - D-02
  - D-04
  - D-07
  - D-08

duration: 30min
completed: 2026-06-11
---

# Phase 82 Plan 01: DB-Migrationen 0104–0107 Summary

**Vier SQL-Migrationen verankern anime_contributions auf members.id, versorgen App-Member mit members-Zeilen (Backfill), stellen fansub_group_member_roles auf FK statt CHECK um und legen die Stamm-Crew-Tabelle fansub_group_default_crew an.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-06-11T07:30:00Z
- **Completed:** 2026-06-11T07:55:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Migration 0104: Neue `members`-Zeilen für App-Member ohne `members`-Verknüpfung (D-02); Spalte `member_id` zu `fansub_group_members`, vollständig backgefüllt (COUNT NULL = 0)
- Migration 0105: `anime_contributions.member_id` NOT NULL, Backfill lückenlos via `hist_fansub_group_members.member_id`, Unique-Key auf `member_id` umgestellt, `fansub_group_member_id` nullable (D-01)
- Migration 0106: `fansub_group_member_roles.role` CHECK → FK auf `role_definitions(code)`, Typ auf TEXT angepasst (D-08)
- Migration 0107: Neue Tabelle `fansub_group_default_crew` mit UNIQUE (fansub_group_id, member_id, role_code) und beiden Indizes (D-04)
- Alle vier Migrationen via `docker compose exec team4sv30-backend /app/migrate up` erfolgreich angewendet (4 migrations applied)

## Task Commits

1. **Task 1: Migration 0104 — members-Backfill + fansub_group_members.member_id** - `0c4a360e` (feat)
2. **Task 2: Migration 0105 — anime_contributions.member_id + Backfill + Unique-Key-Tausch** - `07753da6` (feat)
3. **Task 3: Migrationen 0106 (Rollen-FK) + 0107 (Standard-Team-Tabelle)** - `d08a79b0` (feat)

**Plan-Metadaten:** (dieser Commit)

## Files Created/Modified

- `database/migrations/0104_members_backfill_and_fansub_group_members_member_id.up.sql` — members-Backfill + fansub_group_members.member_id-Spalte
- `database/migrations/0104_members_backfill_and_fansub_group_members_member_id.down.sql` — DROP COLUMN member_id (Backfill-INSERT irreversibel)
- `database/migrations/0105_anime_contributions_member_id.up.sql` — Ankerwechsel anime_contributions auf members.id
- `database/migrations/0105_anime_contributions_member_id.down.sql` — Rollback auf fansub_group_member_id-Anker
- `database/migrations/0106_fansub_group_member_roles_fk.up.sql` — CHECK → FK-Umstellung
- `database/migrations/0106_fansub_group_member_roles_fk.down.sql` — FK-Rückbau + CHECK-Wiederherstellung
- `database/migrations/0107_fansub_group_default_crew.up.sql` — Neue Stamm-Crew-Tabelle
- `database/migrations/0107_fansub_group_default_crew.down.sql` — DROP TABLE fansub_group_default_crew

## Decisions Made

- **Irreversibler Backfill (0104):** Die in Schritt A angelegten `members`-Zeilen werden im DOWN nicht zurückgenommen — sie könnten bereits anderweitig referenziert werden. Die DOWN-Migration entfernt nur die `member_id`-Spalte.
- **Kollisionsprüfung vor Unique-Key-Tausch (0105):** DO $$ RAISE EXCEPTION wenn doppelte (fansub_group_id, anime_id, member_id, release_version_id)-Gruppen entstehen würden. Threat T-82-01-01 abgesichert.
- **TEXT statt VARCHAR(40) für role-Spalte (0106):** Angleichung an `role_definitions.code TEXT` — zukunftssicher für Codes > 40 Zeichen (RESEARCH Pitfall 6).

## Deviations from Plan

### Abweichung: Docker-Backend-Container-Pfad

**Gefunden während:** Migration-Run (alle Tasks)

**Problem:** Das Plan-Acceptance-Kriterium `docker compose exec backend /app/migrate up` scheiterte mit Service-Name-Fehler, da der tatsächliche Container-Name `team4sv30-backend` ist (nicht `backend`). Außerdem konvertierte Git Bash den Pfad `/app/migrate` zu `C:/Program Files/Git/app/migrate`.

**Lösung (Regel 3 — Blockierendes Problem):** `powershell.exe -Command "docker compose exec team4sv30-backend /app/migrate up"` verwendet den korrekten Service-Namen und umgeht die Git-Bash-Pfad-Konvertierung.

**Ergebnis:** `2026/06/11 07:52:59 migrations applied: 4` — alle vier Migrationen erfolgreich angewendet.

---

**Total Abweichungen:** 1 auto-behoben (Regel 3 — Blocking)
**Impact:** Kein inhaltlicher Einfluss auf die Migrationen. Nur Ausführungs-Workaround für Windows-spezifisches Git-Bash-Pfad-Problem.

## Issues Encountered

- Git Bash unter Windows konvertiert Unix-Pfade in docker-Compose-exec-Aufrufen zu Windows-Pfaden → PowerShell-Workaround nötig

## User Setup Required

Keine externen Konfigurationsschritte erforderlich. Migrationen wurden bereits ausgeführt.

## Next Phase Readiness

- Alle vier Migrationen angewendet und verifiziert
- `anime_contributions.member_id` NOT NULL, COUNT NULL = 0
- `fansub_group_members.member_id` backgefüllt, COUNT NULL = 0
- `fansub_group_default_crew` bereit für Plan 02 (Backend-CRUD)
- `fansub_group_member_roles.role` per FK an `role_definitions(code)` gebunden
- **Blocker für Plan 02:** Keine — DB-Grundlage vollständig

## Self-Check

- [x] `database/migrations/0104_*.up.sql` existiert
- [x] `database/migrations/0105_*.up.sql` existiert
- [x] `database/migrations/0106_*.up.sql` existiert
- [x] `database/migrations/0107_*.up.sql` existiert
- [x] Commits 0c4a360e, 07753da6, d08a79b0 existieren
- [x] `SELECT COUNT(*) FROM fansub_group_members WHERE member_id IS NULL` → 0
- [x] `SELECT COUNT(*) FROM anime_contributions WHERE member_id IS NULL` → 0
- [x] `fansub_group_default_crew` Tabelle mit korrekten Spalten und Constraints
- [x] `fk_fansub_group_member_roles_role_code` FK auf role_definitions(code)

## Self-Check: PASSED

---

*Phase: 82-mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri*
*Completed: 2026-06-11*
