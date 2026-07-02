-- Migration 0117 DOWN:
-- Der Backfill ist absichtlich nicht destruktiv rueckgaengig zu machen.
-- fansub_group_members.member_id ist ein kanonischer Identitaetsanker; ein automatisches
-- Entfernen koennte gueltige spaetere Verknuepfungen loeschen.

BEGIN;

-- no-op

COMMIT;
