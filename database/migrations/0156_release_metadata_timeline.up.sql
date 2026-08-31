BEGIN;

ALTER TABLE anime_fansub_groups
    ADD COLUMN production_started_on DATE,
    ADD COLUMN production_completed_on DATE,
    ADD CONSTRAINT chk_anime_fansub_groups_production_timeline
        CHECK (
            production_completed_on IS NULL
            OR production_started_on IS NULL
            OR production_completed_on >= production_started_on
        );

ALTER TABLE release_versions
    ADD COLUMN production_started_on DATE;

INSERT INTO action_definitions (code, label_de, category, sort_order)
VALUES ('release_version.metadata.update', 'Release-Metadaten bearbeiten', 'veroeffentlichungen', 245)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

INSERT INTO role_capabilities (role_code, action_code)
SELECT DISTINCT role_code, 'release_version.metadata.update'
FROM role_capabilities
WHERE action_code = 'release_version.view'
ON CONFLICT (role_code, action_code) DO NOTHING;

INSERT INTO point_rules (rule_code, rule_version, category, point_value)
VALUES ('release_metadata_complete', 1, 'fansub_work', 1)
ON CONFLICT (rule_code, rule_version) DO NOTHING;

COMMIT;
