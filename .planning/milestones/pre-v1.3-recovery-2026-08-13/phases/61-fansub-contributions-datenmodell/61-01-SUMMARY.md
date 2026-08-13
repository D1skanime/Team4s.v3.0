---
phase: 61-fansub-contributions-datenmodell
plan: "01"
subsystem: database
tags: [migration, schema, member-identity, fansub-history]
dependency_graph:
  requires: []
  provides: [member_claims, hist_fansub_group_members, members.noindex]
  affects: [members, app_users, fansub_groups]
tech_stack:
  added: []
  patterns: [bigserial-pk, on-delete-restrict, check-constraints, partial-nullable-fk]
key_files:
  created:
    - database/migrations/0081_historical_members_identity.up.sql
    - database/migrations/0081_historical_members_identity.down.sql
    - database/migrations/0082_historical_fansub_group_members.up.sql
    - database/migrations/0082_historical_fansub_group_members.down.sql
  modified: []
decisions:
  - "noindex DEFAULT true schützt Member-Profile vor sofortiger Suchmaschinenindexierung"
  - "ON DELETE RESTRICT auf hist_fansub_group_members verhindert versehentliches Löschen von Mitgliedschaftsankern"
  - "UNIQUE(member_id, app_user_id) in member_claims erlaubt NULL app_user_id für unverknüpfte Members"
metrics:
  duration: 8min
  completed: 2026-06-01
  tasks: 2
  files: 4
---

# Phase 61 Plan 01: Historisches Identitätsfundament — member_claims und hist_fansub_group_members Summary

Zwei reversible SQL-Migrationen (0081, 0082) legen BIGSERIAL-basierte Tabellen für App-User-zu-Member-Verbindung (member_claims) und historische Gruppenmitgliedschaft (hist_fansub_group_members) an — FK-Anker für alle nachfolgenden Phases 62–68.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration 0081 — member_claims und members.noindex | 8ba7ac50 | 0081_*.up.sql, 0081_*.down.sql |
| 2 | Migration 0082 — hist_fansub_group_members | 188b4a5f | 0082_*.up.sql, 0082_*.down.sql |

## What Was Built

**Migration 0081** (`0081_historical_members_identity`):
- `ALTER TABLE members ADD COLUMN noindex BOOLEAN NOT NULL DEFAULT true` — steuert Suchmaschinenindexierung des Member-Profils
- `member_claims`-Tabelle: verbindet `app_user_id` optional mit `member_id`; claim_status CHECK IN ('pending', 'verified', 'rejected'); UNIQUE(member_id, app_user_id) als `uq_member_claims_member_user`; drei Indizes
- Down: entfernt `member_claims` und die `noindex`-Spalte vollständig

**Migration 0082** (`0082_historical_fansub_group_members`):
- `hist_fansub_group_members`-Tabelle (getrennt von `fansub_group_members` aus 0073, der app-user-basiert bleibt)
- UNIQUE(fansub_group_id, member_id) als `uq_hist_fansub_group_members_group_member`
- Beide FKs mit ON DELETE RESTRICT (kein kaskadierendes Löschen nach oben)
- status CHECK IN ('draft', 'historical', 'confirmed', 'disputed')
- visibility CHECK IN ('internal', 'public')
- joined_year/left_year Jahresvergleich-CHECK: `left_year >= joined_year` (NULL-tolerant)
- Vier Indizes: group, member, status, visibility
- Down: entfernt Tabelle vollständig

## Deviations from Plan

None — Plan executed exactly as written.

## Known Stubs

None — reine SQL-Migrationen ohne UI oder API.

## Threat Flags

None — keine neuen Netzwerkendpunkte, Auth-Pfade oder Dateizugriffe.

## Self-Check: PASSED

- `database/migrations/0081_historical_members_identity.up.sql` — FOUND
- `database/migrations/0081_historical_members_identity.down.sql` — FOUND
- `database/migrations/0082_historical_fansub_group_members.up.sql` — FOUND
- `database/migrations/0082_historical_fansub_group_members.down.sql` — FOUND
- Commit 8ba7ac50 — FOUND
- Commit 188b4a5f — FOUND
