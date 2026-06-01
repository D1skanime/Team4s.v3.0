---
phase: 61-fansub-contributions-datenmodell
plan: "02"
subsystem: database
tags: [migrations, role_definitions, fansub_group_history, hist_group_member_roles]
dependency_graph:
  requires: [61-01]
  provides: [role_definitions, hist_group_member_roles, fansub_group_history]
  affects: []
tech_stack:
  added: []
  patterns: [deferred-FK-via-ALTER-TABLE, TEXT-PK-lookup-table, contexts-array-multi-context]
key_files:
  created:
    - database/migrations/0083_hist_group_member_roles.up.sql
    - database/migrations/0083_hist_group_member_roles.down.sql
    - database/migrations/0084_fansub_group_history.up.sql
    - database/migrations/0084_fansub_group_history.down.sql
    - database/migrations/0085_role_definitions_seed.up.sql
    - database/migrations/0085_role_definitions_seed.down.sql
  modified: []
decisions:
  - "FK role_code → role_definitions via deferred ALTER TABLE in 0085 (Variante b) — vermeidet Abhängigkeit bei Migrationsreihenfolge"
  - "role_definitions.code ist TEXT PRIMARY KEY — kein SERIAL, kein Enum, leicht erweiterbar"
  - "project_lead erhält ARRAY['anime_contribution','group_history'] — Doppelrolle als operative und Gruppenrolle"
  - "project_manager erhält ARRAY['group_history','anime_contribution'] — spiegelt Kontext-Hierarchie wider"
metrics:
  duration: "~15 min"
  completed: "2026-06-01"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 61 Plan 02: Schicht 2 — Gruppenrollen, Gruppenhistorie, Rollendefinitionen

Drei reversible Migrationen (0083, 0084, 0085) legen Rollenzeiträume pro Mitglied, Gruppen-Meilensteinhistorie und die zentrale role_definitions-Lookup-Tabelle mit 15 Seed-Zeilen an.

## Tasks

| # | Name | Commit | Dateien |
|---|------|--------|---------|
| 1 | Migration 0083 — hist_group_member_roles | 30e4bbfc | 0083.up.sql, 0083.down.sql |
| 2 | Migrationen 0084 und 0085 | 41814ece | 0084.up.sql, 0084.down.sql, 0085.up.sql, 0085.down.sql |

## Was wurde gebaut

**Migration 0083 — hist_group_member_roles:**
- Tabelle für historische Rollenzeiträume pro Mitglied (BIGSERIAL PK)
- FK auf hist_fansub_group_members(id) ON DELETE CASCADE
- role_code TEXT NOT NULL ohne FK (wird in 0085 nachgerüstet — Variante b)
- status CHECK ('draft','historical','confirmed','disputed'), visibility CHECK ('internal','public')
- Jahren-Range-Check (ended_year >= started_year wenn beide gesetzt)
- 3 Indizes: member, code, status

**Migration 0084 — fansub_group_history:**
- Tabelle für Gruppen-Meilensteine (Gründung, Auflösung, Hiatus, Rebranding, Milestone, Sonstiges)
- FK auf fansub_groups(id) ON DELETE CASCADE
- year INT NULL (nullable — manche Ereignisse ohne bekanntes Jahr, by design)
- event_type CHECK auf 6 Werte, status CHECK auf 4 Werte
- 3 Indizes: group, year, event_type

**Migration 0085 — role_definitions + Seeds + FK-Nachtrag:**
- Lookup-Tabelle role_definitions (code TEXT PK, label_de TEXT, contexts TEXT[], sort_order INT)
- 11 operative Rollen mit context 'anime_contribution' (translator bis other)
- 4 historische Gruppenrollen: founder, leader, co_leader (nur 'group_history'), project_manager ('group_history','anime_contribution')
- project_lead erhält ARRAY['anime_contribution','group_history'] (Doppelrolle)
- ON CONFLICT DO UPDATE → idempotente Ausführung
- ALTER TABLE hist_group_member_roles ADD CONSTRAINT fk_hist_group_member_roles_role_code FOREIGN KEY (role_code) REFERENCES role_definitions(code) ON DELETE RESTRICT
- down.sql entfernt erst den FK-Constraint, dann die Tabelle

## Deviations from Plan

None — Plan executed exactly as written.

## Threat Flags

Keine neuen sicherheitsrelevanten Surfaces außerhalb des Threat-Models.

## Self-Check: PASSED

- database/migrations/0083_hist_group_member_roles.up.sql — FOUND
- database/migrations/0083_hist_group_member_roles.down.sql — FOUND
- database/migrations/0084_fansub_group_history.up.sql — FOUND
- database/migrations/0084_fansub_group_history.down.sql — FOUND
- database/migrations/0085_role_definitions_seed.up.sql — FOUND
- database/migrations/0085_role_definitions_seed.down.sql — FOUND
- Commit 30e4bbfc — FOUND
- Commit 41814ece — FOUND
