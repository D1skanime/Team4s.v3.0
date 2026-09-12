-- Migration 0162: theme_segment_contributors
--
-- Fuehrt die explizite Teilmengen-Zuordnung "welche Personen haben an diesem
-- Segment mitgewirkt" ein (Phase 156, GAP-01, 156-UAT.md Nachtrag 2026-09-12,
-- bestaetigter Datenmodell-Entscheid). Diese Tabelle speichert AUSSCHLIESSLICH
-- die Person -- theme_segment_id + member_id + Auditfelder. Bewusst OHNE eine
-- Spalte fuer die Mitwirkungs-Rolle und OHNE eine Bindung an eine konkrete
-- Release-Version:
--
--   * Die Rolle wird nie hier gespeichert, sondern IMMER live ueber die
--     EFFEKTIVE Contributor-Aufloesung (loadPublicEffectiveContributors) der
--     aktuell gesetzten Origin-Release-Version bestimmt -- sowohl beim
--     Schreiben (Zulaessigkeitspruefung) als auch beim Lesen (damit vererbte
--     Anime-Defaults korrekt beruecksichtigt bleiben, siehe Praezedenzfall
--     Anime-Default -> Release-Override -> Entfernung in 156-UAT.md).
--   * Die Quelltabelle der Mitwirkungen hat KEINEN Unique-Key auf der
--     Kombination aus Release-Version und Person, ein Fremdschluessel darauf
--     ist daher strukturell unmoeglich; ausserdem haben live 7 vererbte
--     Anime-Default-Mitwirkungen keine Release-Versions-Bindung -- eine harte
--     Versions-Bindung wuerde diese faelschlich ausschliessen (156-UAT.md
--     "Entscheidender Datenbefund").
--
-- Muster (nullable-FK-plus-Index-Stil) analog 0143/0161.

CREATE TABLE IF NOT EXISTS theme_segment_contributors (
    id BIGSERIAL PRIMARY KEY,
    theme_segment_id BIGINT NOT NULL REFERENCES theme_segments(id) ON DELETE CASCADE,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_theme_segment_contributors_segment_member
    ON theme_segment_contributors (theme_segment_id, member_id);

CREATE INDEX IF NOT EXISTS idx_theme_segment_contributors_segment
    ON theme_segment_contributors (theme_segment_id);
