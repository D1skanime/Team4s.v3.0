-- Rueckrollung von Migration 0189: der release-scoped Index wird entfernt, der exakte
-- Vorzustand aus Migration 0188 (Schluessel ohne related_release_version_id) wird wiederhergestellt.

DROP INDEX uq_fansub_group_hints_open_topic;

CREATE UNIQUE INDEX uq_fansub_group_hints_open_topic
    ON fansub_group_hints (
        sender_app_user_id,
        target_fansub_group_id,
        COALESCE(related_anime_id, -1)
    )
    WHERE status = 'open';
