-- Migration 0105: anime_contributions.member_id — Ankerwechsel von hist_fansub_group_members auf members.
-- Abhängigkeiten: 0086 (anime_contributions), 0091 (uq_anime_contribution_member),
--                 0082 (hist_fansub_group_members.member_id), 0104 (members-Backfill)
-- Zweck (D-01): anime_contributions ankert künftig auf members.id (Person) + Gruppe.
--              fansub_group_member_id bleibt als nullable Übergangsfeld erhalten.

BEGIN;

-- ============================================================
-- Schritt A: Neue Spalte member_id nullable hinzufügen
-- ============================================================
ALTER TABLE anime_contributions
    ADD COLUMN IF NOT EXISTS member_id BIGINT NULL REFERENCES members(id) ON DELETE RESTRICT;

-- ============================================================
-- Schritt B: Kollisionsprüfung vor Backfill (T-82-01-01 Mitigation)
-- Prüft ob der geplante Unique-Key (fansub_group_id, anime_id, member_id, release_version_id)
-- nach dem Backfill Duplikate erzeugen würde. Abbruch bei Konflikten.
-- ============================================================
DO $$
DECLARE
    v_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM (
        SELECT
            ac.fansub_group_id,
            ac.anime_id,
            hfgm.member_id,
            ac.release_version_id,
            COUNT(*) AS cnt
        FROM anime_contributions ac
        JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
        GROUP BY ac.fansub_group_id, ac.anime_id, hfgm.member_id, ac.release_version_id
        HAVING COUNT(*) > 1
    ) duplicates;

    IF v_count > 0 THEN
        RAISE EXCEPTION
            'Backfill-Kollision: % Duplikat-Gruppen gefunden für (fansub_group_id, anime_id, member_id, release_version_id). '
            'Migration abgebrochen — Duplikate vor Fortfahren bereinigen.',
            v_count;
    END IF;
END $$;

-- ============================================================
-- Schritt C: Backfill member_id via JOIN auf hist_fansub_group_members
-- hfgm.member_id ist NOT NULL (Migration 0082) — Backfill ist lückenlos.
-- ============================================================
UPDATE anime_contributions ac
SET member_id = hfgm.member_id
FROM hist_fansub_group_members hfgm
WHERE hfgm.id = ac.fansub_group_member_id;

-- ============================================================
-- Schritt D: NOT NULL setzen (nach vollständigem Backfill)
-- ============================================================
ALTER TABLE anime_contributions
    ALTER COLUMN member_id SET NOT NULL;

-- ============================================================
-- Schritt E: Alten Unique-Key ablösen, neuen auf member_id anlegen
-- ============================================================
ALTER TABLE anime_contributions
    DROP CONSTRAINT IF EXISTS uq_anime_contribution_member;

ALTER TABLE anime_contributions
    ADD CONSTRAINT uq_anime_contribution_member
    UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, member_id, release_version_id);

-- ============================================================
-- Schritt F: fansub_group_member_id nullable machen (Übergangsphase)
-- NICHT droppen — öffentliche Projektion (Anime-Seite, Member-Profil) joiniert noch darüber.
-- ============================================================
ALTER TABLE anime_contributions
    ALTER COLUMN fansub_group_member_id DROP NOT NULL;

-- Index auf die neue Spalte
CREATE INDEX IF NOT EXISTS idx_anime_contributions_member_id
    ON anime_contributions(member_id);

COMMIT;
