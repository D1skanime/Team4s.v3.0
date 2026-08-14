# 128-20 SUMMARY — Destructive live-member reset approval gate

**Status:** Approved (Weg B / full reset) by user in interactive session on 2026-08-14.

## What happened
The plan-20 read-only evidence was gathered on team4s-linux against team4s_v2:

- RUNTIME_PROFILE=local (from .env + docker-compose.yml default).
- current_database=team4s_v2, current_user=team4s (superuser).
- members=5, app_users csubs-leader(id2)/sheppert(id3) both active (exactly 2, unambiguous).
- schema_migrations max=144 (0145 not yet applied).

## Blast-radius finding (deviation from plan assumption)
The recursive FK closure of TRUNCATE members ... CASCADE does NOT stay within
disposable member rows. Via media_assets.owner_member_id -> members and
anime.cover_asset_id/banner_asset_id -> media_assets the cascade reaches the
entire content graph: anime(50), episodes(80), fansub_releases(168),
media_files(524), point_ledger_entries(2133), release_versions(168) and ~50
more tables. This was presented to the user in full.

## Second finding: TRUNCATE is guard-blocked
point_ledger_entries (and 6 other review/points tables) carry BEFORE TRUNCATE
and BEFORE DELETE/UPDATE guard triggers (append-only). A plain plan-21
TRUNCATE CASCADE aborts with 'point ledger is append-only' and rolls back
(verified — no data lost on the aborted attempt).

## Decision
User confirmed the content is disposable, outdated, API-seeded test data and
explicitly chose a complete reset (Weg B). A full pg_dump backup was taken
first: /home/d1sk/team4s-backup-pre128-20260813-231426.sql (1.7M).

## Mechanism deviation authorized for plan 21
Because the reject-truncate guards block the literal plan-21 statement, the
reset runs the TRUNCATE inside a single transaction with
SET LOCAL session_replication_role = replica (superuser), which suppresses the
origin guard triggers for that transaction only and auto-restores them at
COMMIT. FK CASCADE semantics are unaffected.
