BEGIN;

CREATE TABLE point_rules (
    id BIGSERIAL PRIMARY KEY,
    rule_code TEXT NOT NULL,
    rule_version INTEGER NOT NULL CHECK (rule_version > 0),
    category TEXT NOT NULL CHECK (category IN ('fansub_work', 'platform_contribution')),
    point_value INTEGER NOT NULL CHECK (point_value > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rule_code, rule_version)
);

CREATE FUNCTION reject_point_rule_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'point rules are append-only';
END;
$$;

CREATE TRIGGER point_rules_immutable
BEFORE UPDATE OR DELETE ON point_rules
FOR EACH ROW EXECUTE FUNCTION reject_point_rule_mutation();

CREATE TABLE point_ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES members(id),
    actor_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    fansub_group_id BIGINT NULL REFERENCES fansub_groups(id) ON DELETE SET NULL,
    release_version_id BIGINT NULL REFERENCES release_versions(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL CHECK (btrim(source_type) <> ''),
    source_key TEXT NOT NULL CHECK (btrim(source_key) <> ''),
    rule_id BIGINT NOT NULL REFERENCES point_rules(id),
    rule_code_snapshot TEXT NOT NULL,
    rule_version_snapshot INTEGER NOT NULL CHECK (rule_version_snapshot > 0),
    rule_category_snapshot TEXT NOT NULL CHECK (rule_category_snapshot IN ('fansub_work', 'platform_contribution')),
    rule_point_value_snapshot INTEGER NOT NULL CHECK (rule_point_value_snapshot > 0),
    point_value INTEGER NOT NULL CHECK (point_value <> 0),
    entry_kind TEXT NOT NULL CHECK (entry_kind IN ('award', 'reversal')),
    reversal_of_entry_id BIGINT NULL REFERENCES point_ledger_entries(id),
    reversal_reason TEXT NULL,
    effective_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    idempotency_key TEXT NOT NULL CHECK (btrim(idempotency_key) <> ''),
    UNIQUE (idempotency_key),
    CONSTRAINT chk_point_ledger_entry_shape CHECK (
        (entry_kind = 'award' AND reversal_of_entry_id IS NULL AND reversal_reason IS NULL AND point_value > 0)
        OR
        (entry_kind = 'reversal' AND reversal_of_entry_id IS NOT NULL AND btrim(reversal_reason) <> '' AND point_value < 0)
    ),
    CONSTRAINT chk_point_ledger_no_self_reversal CHECK (reversal_of_entry_id IS NULL OR reversal_of_entry_id <> id)
);

CREATE UNIQUE INDEX uq_point_ledger_direct_reversal
ON point_ledger_entries (reversal_of_entry_id)
WHERE reversal_of_entry_id IS NOT NULL;

CREATE FUNCTION validate_point_ledger_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    pr point_rules%ROWTYPE;
    original point_ledger_entries%ROWTYPE;
BEGIN
    IF NEW.entry_kind = 'award' THEN
        SELECT * INTO pr FROM point_rules WHERE id = NEW.rule_id;
        IF NOT FOUND
           OR NEW.rule_code_snapshot <> pr.rule_code
           OR NEW.rule_version_snapshot <> pr.rule_version
           OR NEW.rule_category_snapshot <> pr.category
           OR NEW.rule_point_value_snapshot <> pr.point_value
           OR NEW.point_value <> pr.point_value THEN
            RAISE EXCEPTION 'award snapshot does not match point rule';
        END IF;
    ELSIF NEW.entry_kind = 'reversal' THEN
        IF NOT (NEW.reversal_of_entry_id <> NEW.id) THEN
            RAISE EXCEPTION 'ledger entry cannot reverse itself';
        END IF;

        SELECT * INTO original
        FROM point_ledger_entries
        WHERE id = NEW.reversal_of_entry_id;

        -- Keep the accepted original type explicit before validating the full inherited snapshot.
        IF FOUND AND original.entry_kind = 'award' THEN
            NULL;
        END IF;

        IF NOT FOUND OR NOT (original.entry_kind = 'award')
           OR NEW.member_id <> original.member_id
           OR NEW.source_type <> original.source_type
           OR NEW.source_key <> original.source_key
           OR NEW.rule_id <> original.rule_id
           OR NEW.rule_code_snapshot <> original.rule_code_snapshot
           OR NEW.rule_version_snapshot <> original.rule_version_snapshot
           OR NEW.rule_category_snapshot <> original.rule_category_snapshot
           OR NEW.rule_point_value_snapshot <> original.rule_point_value_snapshot
           OR NEW.fansub_group_id IS DISTINCT FROM original.fansub_group_id
           OR NEW.release_version_id IS DISTINCT FROM original.release_version_id
           OR NOT (NEW.point_value = -original.point_value) THEN
            RAISE EXCEPTION 'reversal does not match original award';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER point_ledger_validate_insert
BEFORE INSERT ON point_ledger_entries
FOR EACH ROW EXECUTE FUNCTION validate_point_ledger_insert();

CREATE FUNCTION guard_point_ledger_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    actor_nulled BOOLEAN;
    group_nulled BOOLEAN;
    version_nulled BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'point ledger is append-only';
    END IF;

    actor_nulled := OLD.actor_app_user_id IS NOT NULL AND NEW.actor_app_user_id IS NULL;
    group_nulled := OLD.fansub_group_id IS NOT NULL AND NEW.fansub_group_id IS NULL;
    version_nulled := OLD.release_version_id IS NOT NULL AND NEW.release_version_id IS NULL;

    IF pg_trigger_depth() > 1
       AND (actor_nulled OR group_nulled OR version_nulled)
       AND (actor_nulled OR NEW.actor_app_user_id IS NOT DISTINCT FROM OLD.actor_app_user_id)
       AND (group_nulled OR NEW.fansub_group_id IS NOT DISTINCT FROM OLD.fansub_group_id)
       AND (version_nulled OR NEW.release_version_id IS NOT DISTINCT FROM OLD.release_version_id)
       AND NEW.id IS NOT DISTINCT FROM OLD.id
       AND NEW.member_id IS NOT DISTINCT FROM OLD.member_id
       AND NEW.source_type IS NOT DISTINCT FROM OLD.source_type
       AND NEW.source_key IS NOT DISTINCT FROM OLD.source_key
       AND NEW.rule_id IS NOT DISTINCT FROM OLD.rule_id
       AND NEW.rule_code_snapshot IS NOT DISTINCT FROM OLD.rule_code_snapshot
       AND NEW.rule_version_snapshot IS NOT DISTINCT FROM OLD.rule_version_snapshot
       AND NEW.rule_category_snapshot IS NOT DISTINCT FROM OLD.rule_category_snapshot
       AND NEW.rule_point_value_snapshot IS NOT DISTINCT FROM OLD.rule_point_value_snapshot
       AND NEW.point_value IS NOT DISTINCT FROM OLD.point_value
       AND NEW.entry_kind IS NOT DISTINCT FROM OLD.entry_kind
       AND NEW.reversal_of_entry_id IS NOT DISTINCT FROM OLD.reversal_of_entry_id
       AND NEW.reversal_reason IS NOT DISTINCT FROM OLD.reversal_reason
       AND NEW.effective_at IS NOT DISTINCT FROM OLD.effective_at
       AND NEW.recorded_at IS NOT DISTINCT FROM OLD.recorded_at
       AND NEW.idempotency_key IS NOT DISTINCT FROM OLD.idempotency_key
       AND (NOT actor_nulled OR NOT EXISTS (SELECT 1 FROM app_users WHERE id = OLD.actor_app_user_id))
       AND (NOT group_nulled OR NOT EXISTS (SELECT 1 FROM fansub_groups WHERE id = OLD.fansub_group_id))
       AND (NOT version_nulled OR NOT EXISTS (SELECT 1 FROM release_versions WHERE id = OLD.release_version_id)) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'point ledger is append-only';
END;
$$;

CREATE TRIGGER point_ledger_guard_mutation
BEFORE UPDATE OR DELETE ON point_ledger_entries
FOR EACH ROW EXECUTE FUNCTION guard_point_ledger_mutation();

COMMIT;
