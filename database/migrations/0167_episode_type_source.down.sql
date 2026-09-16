-- Rollback 0167: entfernt nur die Provenienzspalte des Episodentyps.
ALTER TABLE episodes
    DROP COLUMN IF EXISTS episode_type_source;
