CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    actor_legacy_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(120) NOT NULL,
    scope_type VARCHAR(40),
    scope_id BIGINT,
    target_type VARCHAR(80),
    target_id BIGINT,
    action_name VARCHAR(120),
    outcome VARCHAR(20),
    reason_code VARCHAR(80),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
    ON audit_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_scope
    ON audit_logs(scope_type, scope_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target
    ON audit_logs(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs(created_at DESC);
