DROP INDEX uq_fansub_group_hints_open_topic;

ALTER TABLE fansub_group_hints ADD COLUMN requested_role_code VARCHAR(50) NULL REFERENCES role_definitions(code) ON DELETE RESTRICT;
ALTER TABLE fansub_group_hints ADD COLUMN hint_type VARCHAR(20) NOT NULL DEFAULT 'correction';
ALTER TABLE fansub_group_hints ALTER COLUMN hint_type DROP DEFAULT;

ALTER TABLE fansub_group_hints ALTER COLUMN related_anime_id DROP NOT NULL;

CREATE UNIQUE INDEX uq_fansub_group_hints_open_topic
    ON fansub_group_hints (
        sender_app_user_id,
        target_fansub_group_id,
        hint_type,
        COALESCE(related_anime_id, -1),
        COALESCE(requested_role_code, '')
    )
    WHERE status = 'open';

ALTER TABLE fansub_group_hints ADD CONSTRAINT chk_fansub_group_hints_type
    CHECK (hint_type IN ('correction', 'membership_request'));
ALTER TABLE fansub_group_hints ADD CONSTRAINT chk_fansub_group_hints_role_scope
    CHECK (requested_role_code IS NULL OR hint_type = 'membership_request');
ALTER TABLE fansub_group_hints ADD CONSTRAINT chk_fansub_group_hints_anime_scope
    CHECK (
        (hint_type = 'correction' AND related_anime_id IS NOT NULL)
        OR (hint_type = 'membership_request' AND related_anime_id IS NULL)
    );

CREATE INDEX idx_fansub_group_hints_role_status
    ON fansub_group_hints (requested_role_code, status)
    WHERE requested_role_code = 'fansub_lead';
