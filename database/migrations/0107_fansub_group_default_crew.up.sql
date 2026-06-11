-- Migration 0107: Neue Tabelle fansub_group_default_crew — Stamm-Crew pro Gruppe.
-- Abhängigkeiten: 0009 (fansub_groups), 0044 (members), 0072 (app_users),
--                 0085 (role_definitions), 0104 (members-Backfill)
-- Zweck (D-04): Leader pflegen eine feste Stamm-Crew (Rolle → Person) pro Gruppe.
--              „Team übernehmen" füllt leere Projekte aus dieser Tabelle.
-- Mehrere Rollen pro Person via mehrere Zeilen (D-05: many-to-many, kein 1:1).
-- UNIQUE (fansub_group_id, member_id, role_code): eine Person kann dieselbe Rolle
-- pro Gruppe nur einmal in der Stamm-Crew haben.

BEGIN;

CREATE TABLE IF NOT EXISTS fansub_group_default_crew (
    id               BIGSERIAL PRIMARY KEY,
    fansub_group_id  BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    member_id        BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_code        TEXT NOT NULL REFERENCES role_definitions(code) ON DELETE RESTRICT,
    created_by       BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fansub_group_default_crew UNIQUE (fansub_group_id, member_id, role_code)
);

CREATE INDEX IF NOT EXISTS idx_fansub_group_default_crew_group
    ON fansub_group_default_crew(fansub_group_id);

CREATE INDEX IF NOT EXISTS idx_fansub_group_default_crew_member
    ON fansub_group_default_crew(member_id);

COMMIT;
