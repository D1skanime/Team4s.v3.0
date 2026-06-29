-- Migration 0111: Rollen-spezifische Beitragshinweise erlauben.
--
-- Vorher erzwang uq_anime_contribution_member genau eine anime-weite bzw.
-- release-spezifische Contribution pro Gruppe/Anime/Gruppenmitglied. Da Rollen
-- separat in anime_contribution_roles liegen, blockierte das neue Hinweise fuer
-- andere Rollen, sobald bereits ein bestaetigter Beitrag fuer dasselbe Projekt
-- existierte.
--
-- Die Laufzeitlogik serialisiert denselben Kontext per Advisory Lock und
-- blockiert rollenidentische Duplikate, erlaubt aber neue Rollen als eigenen
-- offenen Vorschlag.

ALTER TABLE anime_contributions
    DROP CONSTRAINT IF EXISTS uq_anime_contribution_member;

CREATE INDEX IF NOT EXISTS idx_anime_contributions_member_context
    ON anime_contributions(fansub_group_id, anime_id, fansub_group_member_id, release_version_id);
