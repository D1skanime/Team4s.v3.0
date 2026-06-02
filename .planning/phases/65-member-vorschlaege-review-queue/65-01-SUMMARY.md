---
phase: 65-member-vorschlaege-review-queue
plan: "01"
subsystem: backend/repository
tags: [repository, migration, contributions, proposals, review-queue]
dependency_graph:
  requires: []
  provides:
    - migration-0089-review-note
    - AnimeContributionsRepository.CreateProposal
    - AnimeContributionsRepository.ListProposedByGroup
    - AnimeContributionsRepository.Confirm
    - AnimeContributionsRepository.Reject
    - AnimeContributionsRepository.SelfPublish
    - AnimeContributionsRepository.ListByMemberIDWithProposalFields
  affects:
    - database/migrations
    - backend/internal/repository
tech_stack:
  added: []
  patterns:
    - Repository-Auslagerung (wie anime_contributions_member_repository.go)
    - TX-basiertes CreateProposal (wie anime_contributions_repository.go:Create)
    - Serverseitiger 90-Tage-Check (SELECT-vor-UPDATE, T-65-01-01)
    - On-read CanSelfPublish-Berechnung ohne Hintergrundjob
key_files:
  created:
    - database/migrations/0089_anime_contributions_review_note.up.sql
    - database/migrations/0089_anime_contributions_review_note.down.sql
    - backend/internal/repository/anime_contributions_proposal_repository.go
  modified: []
decisions:
  - "D-11/D-15: SelfPublish setzt Status auf 'proposed' (nicht 'confirmed') — Eintrag erscheint als unverified/(historisch)"
  - "D-08: review_note als eigene Spalte (nicht das bestehende note-Feld) fuer Ablehngruende"
  - "D-12: CanSelfPublish on-read berechnet (kein Hintergrundjob)"
  - "T-65-01-01: 90-Tage-Check laeuft serverseitig via SELECT-vor-UPDATE in SelfPublish"
  - "Repository-Auslagerung in neue Datei wegen 450-Zeilen-Limit (anime_contributions_repository.go hat 447 Zeilen)"
metrics:
  duration: "~12min"
  completed_date: "2026-06-02"
  tasks_completed: 2
  files_modified: 3
---

# Phase 65 Plan 01: Migration 0089 + Proposal-Repository Summary

**One-liner:** Migration 0089 fuegt review_note-Spalte zu anime_contributions hinzu; neues Repository liefert CreateProposal, ListProposedByGroup, Confirm, Reject und SelfPublish als Datenbankschicht fuer die Vorschlags- und Review-Queue-Handler.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration 0089 — review_note-Spalte | 269af8d4 | database/migrations/0089_anime_contributions_review_note.{up,down}.sql |
| 2 | Proposal-Repository — 5 Methoden + ListByMemberIDWithProposalFields | 5176180f | backend/internal/repository/anime_contributions_proposal_repository.go |

## Decisions Made

- **Repository-Auslagerung:** Da anime_contributions_repository.go bereits 447 Zeilen hat, wurden alle Proposal/Review-Methoden in eine separate Datei ausgelagert (gleiches Muster wie anime_contributions_member_repository.go). Die neue Datei hat 311 Zeilen.
- **SelfPublish-Status:** Status bleibt `proposed` — kein Wechsel auf `confirmed` (D-11, D-15). Dadurch erscheint der selbst-geschaltete Eintrag korrekt als unverified/(historisch) in der Public-Query.
- **90-Tage-Check serverseitig:** SELECT-vor-UPDATE innerhalb derselben Methode — Frontend-Gate ist nicht vertrauenswürdig (T-65-01-01).
- **MemberContributionWithProposalRow:** Neuer Einbettungstyp statt Aenderung an AnimeContributionRow, um KEINE Aenderungen an anime_contributions_repository.go vorzunehmen.
- **Reject ohne actorAppUserID in SET:** Die Methode nimmt actorAppUserID entgegen (Handler-Konvention), schreibt es aber nicht in die DB — kein updated_by fuer Reject da der Plan nur review_note und status='disputed' vorschreibt.

## What Was Built

### Migration 0089
- `up.sql`: `ALTER TABLE anime_contributions ADD COLUMN IF NOT EXISTS review_note TEXT NULL`
- `down.sql`: `ALTER TABLE anime_contributions DROP COLUMN IF EXISTS review_note`
- Idempotent (IF NOT EXISTS / IF EXISTS), keine anderen Tabellen betroffen

### Proposal-Repository (311 Zeilen)
- **CreateProposal:** TX mit INSERT status='proposed', is_public_on_*=false; isUniqueViolation → ErrConflict; fk-Verletzung → ErrNotFound; anschließend GetByID
- **ListProposedByGroup:** JOIN anime + hist_fansub_group_members + members; COALESCE fuer Anzeigenamen; ORDER BY created_at ASC
- **Confirm:** UPDATE status='confirmed', beide Sichtbarkeitsflags=true, confirmed_by/confirmed_at; RowsAffected=0 → ErrNotFound
- **Reject:** UPDATE status='disputed', review_note=param; RowsAffected=0 → ErrNotFound; kein Hard-Delete
- **SelfPublish:** SELECT-Check fuer 90-Tage + proposed-Status (pgx.ErrNoRows → ErrConflict); UPDATE ohne Status-Aenderung
- **ListByMemberIDWithProposalFields:** Wie ListByMemberID plus `can_self_publish` on-read und `review_note`; Ergebnis als MemberContributionWithProposalRow (einbettet AnimeContributionRow)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reject-Methode: ueberfluessiger Parameter $2 entfernt**
- **Found during:** Task 2 — Implementierung der Reject-Methode
- **Issue:** actorAppUserID wurde als $2 gebunden, aber nicht in der UPDATE-Anweisung referenziert; reviewer_note war als $3 gebunden
- **Fix:** SQL-Query vereinfacht: review_note als $2, actorAppUserID nicht im SQL referenziert
- **Files modified:** backend/internal/repository/anime_contributions_proposal_repository.go
- **Commit:** 5176180f (im selben Task-Commit)

## Threat Surface Scan

Keine neuen Netzwerkendpunkte in diesem Plan (nur Repository-Schicht). Alle SQL-Queries nutzen parametrisierte pgx-Queries (T-65-01-02 accept). Der 90-Tage-Check laeuft serverseitig in SelfPublish (T-65-01-01 mitigate — erfuellt).

## Known Stubs

Keine. Dieses Plan liefert nur die Datenbankschicht. Handler und Frontend folgen in Wellen 2 und 3.

## Self-Check: PASSED

- [x] database/migrations/0089_anime_contributions_review_note.up.sql existiert
- [x] database/migrations/0089_anime_contributions_review_note.down.sql existiert
- [x] backend/internal/repository/anime_contributions_proposal_repository.go existiert
- [x] Commit 269af8d4 existiert (Migration)
- [x] Commit 5176180f existiert (Repository)
- [x] go build ./internal/repository/... gruen
- [x] SelfPublish setzt keinen status='confirmed'
- [x] anime_contributions_repository.go bleibt bei 447 Zeilen (< 450)
- [x] anime_contributions_proposal_repository.go hat 311 Zeilen (< 450)
