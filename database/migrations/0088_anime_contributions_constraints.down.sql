-- Migration 0088 down: Entfernt alle in 0088 angelegten Constraints.

-- Reihenfolge umgekehrt zur up-Migration (zuerst Abhaengige entfernen).

-- Schritt 1: Unique-Constraint auf anime_contributions entfernen.
ALTER TABLE anime_contributions
    DROP CONSTRAINT IF EXISTS uq_anime_contribution_member;

-- Schritt 2: Composite-FK auf anime_contributions entfernen.
ALTER TABLE anime_contributions
    DROP CONSTRAINT IF EXISTS fk_anime_contributions_member_group;

-- Schritt 3: Hilfs-Unique auf hist_fansub_group_members entfernen.
ALTER TABLE hist_fansub_group_members
    DROP CONSTRAINT IF EXISTS uq_hist_fansub_group_member_group_id;
