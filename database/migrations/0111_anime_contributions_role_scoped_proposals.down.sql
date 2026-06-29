-- Migration 0111 down: stellt den alten Row-Unique wieder her.
-- Schlaegt bewusst fehl, wenn seit 0111 mehrere Contribution-Zeilen fuer
-- denselben Gruppe/Anime/Gruppenmitglied/Release-Kontext entstanden sind.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM anime_contributions
        GROUP BY fansub_group_id, anime_id, fansub_group_member_id, release_version_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'cannot restore uq_anime_contribution_member: duplicate contribution contexts exist';
    END IF;
END $$;

DROP INDEX IF EXISTS idx_anime_contributions_member_context;

ALTER TABLE anime_contributions
    ADD CONSTRAINT uq_anime_contribution_member
    UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id);
