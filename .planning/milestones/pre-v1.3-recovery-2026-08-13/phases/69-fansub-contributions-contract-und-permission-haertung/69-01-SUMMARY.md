---
phase: 69-fansub-contributions-contract-und-permission-haertung
plan: "01"
subsystem: database
tags: [migration, constraints, composite-fk, unique-constraint, db-hardening]
dependency_graph:
  requires: [0086_anime_contributions, 0082_historical_fansub_group_members]
  provides: [uq_hist_fansub_group_member_group_id, fk_anime_contributions_member_group, uq_anime_contribution_member]
  affects: [anime_contributions, hist_fansub_group_members]
tech_stack:
  added: []
  patterns: [composite-fk, defense-in-depth, idempotent-rollback]
key_files:
  created:
    - database/migrations/0088_anime_contributions_constraints.up.sql
    - database/migrations/0088_anime_contributions_constraints.down.sql
  modified: []
decisions:
  - "Hilfs-Unique auf hist_fansub_group_members(fansub_group_id, id) als FK-Referenzziel angelegt, da PostgreSQL einen eindeutigen Index auf exakt den referenzierten Spalten benoetigt"
  - "Composite-FK ersetzt den einfachen REFERENCES fuer Cross-Group-Schutz auf DB-Ebene als Defense-in-Depth neben Handler-Guards"
  - "IF EXISTS in allen DOWN-Statements fuer idempotente Rollbacks"
metrics:
  duration: "ca. 3 Minuten"
  completed: "2026-06-02"
  tasks_completed: 2
  files_changed: 2
---

# Phase 69 Plan 01: Migration 0088 Constraints Summary

**One-liner:** PostgreSQL-Composite-FK und Unique-Constraint haerten `anime_contributions` gegen Cross-Group-Beitraege und Duplikate auf DB-Ebene ab.

## Was wurde gemacht

Migration 0088 haertet die `anime_contributions`-Tabelle mit zwei DB-seitigen Constraints ab, die als Defense-in-Depth neben den Handler-Guards in Phase 69 Wave 2 fungieren.

### Task 1 — Migration 0088 up

Datei: `database/migrations/0088_anime_contributions_constraints.up.sql`  
Commit: `d5a55486`

Drei Constraints in korrekter Reihenfolge:

1. **Hilfs-Unique auf `hist_fansub_group_members(fansub_group_id, id)`** (`uq_hist_fansub_group_member_group_id`): PostgreSQL erfordert einen eindeutigen Index auf den referenzierten Spalten fuer einen Composite-FK. Die bestehende `UNIQUE(fansub_group_id, member_id)` reicht nicht — die neue Einschraenkung deckt genau `(fansub_group_id, id)` ab.

2. **Composite-FK auf `anime_contributions`** (`fk_anime_contributions_member_group`): `FOREIGN KEY (fansub_group_id, fansub_group_member_id) REFERENCES hist_fansub_group_members(fansub_group_id, id)` stellt auf DB-Ebene sicher, dass `fansub_group_member_id` zur selben Gruppe gehoert wie die Contribution selbst.

3. **Unique-Constraint** (`uq_anime_contribution_member`): `UNIQUE (fansub_group_id, anime_id, fansub_group_member_id)` verhindert, dass derselbe Member mehrfach fuer dasselbe (Gruppe, Anime)-Paar eingetragen wird.

### Task 2 — Migration 0088 down

Datei: `database/migrations/0088_anime_contributions_constraints.down.sql`  
Commit: `1c0e6676`

Drei `DROP CONSTRAINT IF EXISTS`-Anweisungen in umgekehrter Reihenfolge zur up-Migration (Unique zuerst, dann FK, dann Hilfs-Unique). Alle mit `IF EXISTS` fuer idempotente Rollbacks.

## Deviationen vom Plan

Keine — Plan exakt so ausgefuehrt wie beschrieben.

## Threat-Abdeckung

| Threat ID | Status |
|-----------|--------|
| T-69-01 (Cross-Group-Inserts) | Mitigiert durch `fk_anime_contributions_member_group` (0088) + Handler-Guard Wave 2 |
| T-69-02 (Duplikat-Create) | Mitigiert durch `uq_anime_contribution_member` (0088); 409-Surfacing in Wave 2 |

## Self-Check

- [x] `database/migrations/0088_anime_contributions_constraints.up.sql` existiert
- [x] `database/migrations/0088_anime_contributions_constraints.down.sql` existiert
- [x] up.sql: 3 ADD CONSTRAINT-Anweisungen
- [x] down.sql: 3 DROP CONSTRAINT IF EXISTS-Anweisungen
- [x] Constraint-Namen stimmen zwischen up und down ueberein
- [x] Reihenfolge in up: Hilfs-Unique vor Composite-FK
- [x] Commits d5a55486 und 1c0e6676 existieren im git log

## Self-Check: PASSED
