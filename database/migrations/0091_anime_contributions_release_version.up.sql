-- Migration 0091: Versions-/Episode-Granularitaet fuer anime_contributions.
-- Fuegt die optionale Spalte release_version_id hinzu (FK -> release_versions),
-- legt einen partiellen Index an und erweitert den UNIQUE-Constraint aus 0088
-- um die Versions-Dimension. Additiv, kein Breaking Change (P67-SC1, D-01/D-02).

-- Schritt 1: Nullable FK-Spalte. ON DELETE SET NULL begruendet: Eine Contribution
-- ist ein historisches Faktum (Tabellen-Kommentar 0086). Wird eine release_version
-- geloescht, bleibt die Beteiligung erhalten und faellt auf "anime-weit" (NULL) zurueck.
-- CASCADE (Datenverlust) und RESTRICT (blockiertes Loeschen) sind hier bewusst vermieden.
ALTER TABLE anime_contributions
    ADD COLUMN IF NOT EXISTS release_version_id BIGINT NULL
    REFERENCES release_versions(id) ON DELETE SET NULL;

-- Schritt 2: Partieller Index nur fuer versions-spezifische Beitraege.
CREATE INDEX IF NOT EXISTS idx_anime_contributions_release_version
    ON anime_contributions(release_version_id)
    WHERE release_version_id IS NOT NULL;

-- Schritt 3 (KRITISCH, Pitfall 1): Bestehenden 3-Spalten-UNIQUE aus 0088 durch
-- eine vierspaltige Variante ersetzen. NULLS NOT DISTINCT (PG15+, Projekt nutzt PG16)
-- sorgt dafuer, dass derselbe Member je Release-Version genau einmal UND anime-weit
-- (release_version_id IS NULL) genau einmal eingetragen werden kann.
ALTER TABLE anime_contributions
    DROP CONSTRAINT IF EXISTS uq_anime_contribution_member;
ALTER TABLE anime_contributions
    ADD CONSTRAINT uq_anime_contribution_member
    UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id);
