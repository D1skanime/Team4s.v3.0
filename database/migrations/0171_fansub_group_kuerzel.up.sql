-- Migration 0171: Gruppenkürzel als Stammdatum der Fansub-Gruppe (GAP-05,
-- fansub.de-Referenz-Review, quick-260924-dso). Additiv/schema-only: keine
-- bestehende Zeile wird angefasst, kein Backfill.
--
-- kuerzel ist die vom Admin gepflegte Original-Schreibweise (GAP-07: wird
-- überall exakt so angezeigt, nie normalisiert). normalized_kuerzel ist eine
-- interne, nie über JSON exponierte Vergleichsform (siehe
-- repository.normalizeAliasKey), analog zu fansub_group_aliases.normalized_alias.
ALTER TABLE fansub_groups ADD COLUMN kuerzel VARCHAR(32);
ALTER TABLE fansub_groups ADD COLUMN normalized_kuerzel VARCHAR(32);

-- Partieller Unique-Index: mehrere NULLs (Gruppen ohne Kürzel) sind erlaubt,
-- ein gesetztes Kürzel muss systemweit eindeutig sein.
CREATE UNIQUE INDEX uq_fansub_groups_normalized_kuerzel
    ON fansub_groups (normalized_kuerzel)
    WHERE normalized_kuerzel IS NOT NULL;

COMMENT ON COLUMN fansub_groups.kuerzel IS 'GAP-05: optionales, admin-gepflegtes Gruppenkürzel in Original-Schreibweise, systemweit eindeutig gegen Kürzel und Alias anderer Gruppen.';
COMMENT ON COLUMN fansub_groups.normalized_kuerzel IS 'Interne, nie über JSON exponierte Vergleichsform von kuerzel (siehe repository.normalizeAliasKey); niemals für Anzeige verwenden.';
