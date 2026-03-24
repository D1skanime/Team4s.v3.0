CREATE TABLE IF NOT EXISTS admin_anime_mutation_audit (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    actor_user_id BIGINT NOT NULL,
    mutation_kind VARCHAR(64) NOT NULL,
    request_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_anime_mutation_audit_anime_id
    ON admin_anime_mutation_audit(anime_id);

CREATE INDEX IF NOT EXISTS idx_admin_anime_mutation_audit_actor_user_id
    ON admin_anime_mutation_audit(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_anime_mutation_audit_mutation_kind
    ON admin_anime_mutation_audit(mutation_kind);

CREATE INDEX IF NOT EXISTS idx_admin_anime_mutation_audit_created_at
    ON admin_anime_mutation_audit(created_at DESC);
