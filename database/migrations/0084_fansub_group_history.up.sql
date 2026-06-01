-- Migration 0084: Fansub group history — milestones and key events per group.

CREATE TABLE IF NOT EXISTS fansub_group_history (
    id              BIGSERIAL PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    year            INT NULL,
    event_type      TEXT NOT NULL,
    title           TEXT NULL,
    note            TEXT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'historical',
    created_by      BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fansub_group_history_event_type CHECK (event_type IN ('founding', 'disbanding', 'hiatus', 'rebranding', 'milestone', 'other')),
    CONSTRAINT chk_fansub_group_history_status     CHECK (status IN ('draft', 'historical', 'confirmed', 'disputed'))
);

CREATE INDEX IF NOT EXISTS idx_fansub_group_history_group
    ON fansub_group_history(fansub_group_id);
CREATE INDEX IF NOT EXISTS idx_fansub_group_history_year
    ON fansub_group_history(year);
CREATE INDEX IF NOT EXISTS idx_fansub_group_history_event_type
    ON fansub_group_history(event_type);
