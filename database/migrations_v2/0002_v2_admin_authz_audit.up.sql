CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

INSERT INTO roles (name)
VALUES ('admin')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_anime_mutation_audit (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL,
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
