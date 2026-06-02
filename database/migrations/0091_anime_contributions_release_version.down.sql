-- Migration 0091 down: Macht die Versions-Granularitaet rueckgaengig.
-- Reihenfolge umgekehrt zur up-Migration (zuerst Constraint, dann Index, dann Spalte).

-- Schritt 1: Vierspaltigen UNIQUE-Constraint entfernen und die 3-Spalten-Form
-- aus 0088 wiederherstellen.
ALTER TABLE anime_contributions
    DROP CONSTRAINT IF EXISTS uq_anime_contribution_member;
ALTER TABLE anime_contributions
    ADD CONSTRAINT uq_anime_contribution_member
    UNIQUE (fansub_group_id, anime_id, fansub_group_member_id);

-- Schritt 2: Partiellen Index entfernen.
DROP INDEX IF EXISTS idx_anime_contributions_release_version;

-- Schritt 3: FK-Spalte entfernen.
ALTER TABLE anime_contributions
    DROP COLUMN IF EXISTS release_version_id;
