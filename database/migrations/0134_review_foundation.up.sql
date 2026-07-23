BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM action_definitions actual
        JOIN (
            VALUES
                ('review.text.decide', 'Texte prüfen', 'review', 90),
                ('review.image.decide', 'Bilder prüfen', 'review', 91),
                ('review.contribution.decide', 'Mitwirkungen prüfen', 'review', 92)
        ) AS expected(code, label_de, category, sort_order)
          ON expected.code = actual.code
        WHERE actual.label_de IS DISTINCT FROM expected.label_de
           OR actual.category IS DISTINCT FROM expected.category
           OR actual.sort_order IS DISTINCT FROM expected.sort_order
    ) THEN
        RAISE EXCEPTION '0134 review action namespace contains incompatible definitions';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM point_rules
        WHERE rule_code = 'review.decision'
          AND rule_version = 1
          AND (
              category <> 'platform_contribution'
              OR point_value <> 1
          )
    ) THEN
        RAISE EXCEPTION 'review.decision version 1 conflicts with the required platform_contribution point value 1';
    END IF;
END;
$$;

CREATE TABLE review_foundation_seed_ownership (
    seed_kind TEXT NOT NULL CHECK (
        seed_kind IN ('action_definition', 'role_capability', 'point_rule')
    ),
    seed_key TEXT NOT NULL CHECK (
        seed_key <> ''
        AND seed_key = phase106_trim_unicode_whitespace(seed_key)
    ),
    created_by_migration BOOLEAN NOT NULL,
    PRIMARY KEY (seed_kind, seed_key)
);

INSERT INTO review_foundation_seed_ownership (
    seed_kind,
    seed_key,
    created_by_migration
)
SELECT
    'action_definition',
    seed.code,
    NOT EXISTS (
        SELECT 1 FROM action_definitions existing WHERE existing.code = seed.code
    )
FROM (
    VALUES
        ('review.text.decide'),
        ('review.image.decide'),
        ('review.contribution.decide')
) AS seed(code);

INSERT INTO action_definitions (code, label_de, category, sort_order) VALUES
    ('review.text.decide', 'Texte prüfen', 'review', 90),
    ('review.image.decide', 'Bilder prüfen', 'review', 91),
    ('review.contribution.decide', 'Mitwirkungen prüfen', 'review', 92)
ON CONFLICT (code) DO NOTHING;

INSERT INTO review_foundation_seed_ownership (
    seed_kind,
    seed_key,
    created_by_migration
)
SELECT
    'role_capability',
    'fansub_lead|' || seed.action_code,
    NOT EXISTS (
        SELECT 1
        FROM role_capabilities existing
        WHERE existing.role_code = 'fansub_lead'
          AND existing.action_code = seed.action_code
    )
FROM (
    VALUES
        ('review.text.decide'),
        ('review.image.decide'),
        ('review.contribution.decide')
) AS seed(action_code);

INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('fansub_lead', 'review.text.decide'),
    ('fansub_lead', 'review.image.decide'),
    ('fansub_lead', 'review.contribution.decide')
ON CONFLICT DO NOTHING;

CREATE TABLE fansub_group_member_review_capabilities (
    fansub_group_member_id BIGINT NOT NULL
        REFERENCES fansub_group_members(id) ON DELETE CASCADE,
    action_code TEXT NOT NULL
        REFERENCES action_definitions(code),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (fansub_group_member_id, action_code),
    CONSTRAINT chk_member_review_capability_action CHECK (
        action_code IN (
            'review.text.decide',
            'review.image.decide',
            'review.contribution.decide'
        )
    )
);

CREATE TABLE review_decisions (
    id BIGSERIAL PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_key TEXT NOT NULL,
    source_revision BIGINT NOT NULL CHECK (source_revision > 0),
    review_kind TEXT NOT NULL CHECK (review_kind IN ('text', 'image', 'contribution')),
    decision TEXT NOT NULL CHECK (decision IN ('confirm', 'reject')),
    rejection_category TEXT NULL,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    reviewer_app_user_id BIGINT NOT NULL REFERENCES app_users(id),
    reviewer_member_id BIGINT NULL REFERENCES members(id),
    is_platform_override BOOLEAN NOT NULL DEFAULT FALSE,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_review_decision_source_type_canonical CHECK (
        source_type <> ''
        AND source_type = phase106_trim_unicode_whitespace(source_type)
    ),
    CONSTRAINT chk_review_decision_source_key_canonical CHECK (
        source_key <> ''
        AND source_key = phase106_trim_unicode_whitespace(source_key)
    ),
    CONSTRAINT chk_review_decision_rejection_category CHECK (
        (
            decision = 'reject'
            AND rejection_category IS NOT NULL
            AND phase106_trim_unicode_whitespace(rejection_category) <> ''
            AND rejection_category = phase106_trim_unicode_whitespace(rejection_category)
        )
        OR
        (decision = 'confirm' AND rejection_category IS NULL)
    ),
    UNIQUE (source_type, source_key, source_revision)
);

CREATE TABLE review_audit_events (
    id BIGSERIAL PRIMARY KEY,
    event_code TEXT NOT NULL CHECK (
        event_code IN (
            'delegation.granted',
            'delegation.revoked',
            'review.confirmed',
            'review.rejected',
            'review.override',
            'review_credit.awarded',
            'review_credit.reversed',
            'source.submitted',
            'source.edited_after_reject',
            'source.resubmitted',
            'source.published',
            'reason.scrubbed'
        )
    ),
    review_decision_id BIGINT NULL REFERENCES review_decisions(id),
    actor_kind TEXT NOT NULL CHECK (actor_kind IN ('app_user', 'system')),
    actor_app_user_id BIGINT NULL REFERENCES app_users(id),
    actor_member_id BIGINT NULL REFERENCES members(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    source_type TEXT NOT NULL,
    source_key TEXT NOT NULL,
    source_revision BIGINT NOT NULL CHECK (source_revision > 0),
    decision TEXT NULL CHECK (decision IN ('confirm', 'reject')),
    is_platform_override BOOLEAN NOT NULL DEFAULT FALSE,
    has_reason BOOLEAN NOT NULL DEFAULT FALSE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_review_audit_actor_shape CHECK (
        (actor_kind = 'app_user' AND actor_app_user_id IS NOT NULL)
        OR
        (actor_kind = 'system' AND actor_app_user_id IS NULL AND actor_member_id IS NULL)
    ),
    CONSTRAINT chk_review_audit_source_type_canonical CHECK (
        source_type <> ''
        AND source_type = phase106_trim_unicode_whitespace(source_type)
    ),
    CONSTRAINT chk_review_audit_source_key_canonical CHECK (
        source_key <> ''
        AND source_key = phase106_trim_unicode_whitespace(source_key)
    )
);

CREATE TABLE review_reason_texts (
    audit_event_id BIGINT NOT NULL REFERENCES review_audit_events(id),
    reason_kind TEXT NOT NULL CHECK (reason_kind IN ('reject', 'override')),
    reason_text TEXT NOT NULL CHECK (
        phase106_trim_unicode_whitespace(reason_text) <> ''
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (audit_event_id, reason_kind)
);

CREATE FUNCTION validate_review_audit_event_contract() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    linked_decision review_decisions%ROWTYPE;
    reason_count INTEGER;
    reject_reason_count INTEGER;
    override_reason_count INTEGER;
BEGIN
    SELECT
        count(*),
        count(*) FILTER (WHERE reason_kind = 'reject'),
        count(*) FILTER (WHERE reason_kind = 'override')
    INTO reason_count, reject_reason_count, override_reason_count
    FROM review_reason_texts
    WHERE audit_event_id = NEW.id;

    CASE NEW.event_code
        WHEN 'delegation.granted', 'delegation.revoked',
             'source.submitted', 'source.edited_after_reject',
             'source.resubmitted', 'source.published', 'reason.scrubbed' THEN
            IF NEW.review_decision_id IS NOT NULL
               OR NEW.decision IS NOT NULL
               OR NEW.is_platform_override
               OR NEW.has_reason
               OR reason_count <> 0 THEN
                RAISE EXCEPTION 'review audit event % has contradictory fields', NEW.event_code;
            END IF;
        WHEN 'review.confirmed' THEN
            IF NEW.review_decision_id IS NULL
               OR NEW.decision IS NULL
               OR NEW.decision <> 'confirm'
               OR NEW.has_reason
               OR reason_count <> 0 THEN
                RAISE EXCEPTION 'confirmed review audit event has contradictory fields';
            END IF;
        WHEN 'review.rejected' THEN
            IF NEW.review_decision_id IS NULL
               OR NEW.decision IS NULL
               OR NEW.decision <> 'reject'
               OR NOT NEW.has_reason
               OR reason_count <> 1
               OR reject_reason_count <> 1
               OR override_reason_count <> 0 THEN
                RAISE EXCEPTION 'rejected review audit event requires exactly one reject reason';
            END IF;
        WHEN 'review.override' THEN
            IF NEW.review_decision_id IS NULL
               OR NEW.decision IS NULL
               OR NOT NEW.is_platform_override
               OR NOT NEW.has_reason
               OR reason_count <> 1
               OR override_reason_count <> 1
               OR reject_reason_count <> 0 THEN
                RAISE EXCEPTION 'override review audit event requires exactly one override reason';
            END IF;
        WHEN 'review_credit.awarded', 'review_credit.reversed' THEN
            IF NEW.review_decision_id IS NULL
               OR NEW.decision IS NULL
               OR NEW.is_platform_override
               OR NEW.has_reason
               OR reason_count <> 0 THEN
                RAISE EXCEPTION 'review credit audit event has contradictory fields';
            END IF;
        ELSE
            RAISE EXCEPTION 'unknown review audit event code %', NEW.event_code;
    END CASE;

    IF NEW.review_decision_id IS NOT NULL THEN
        SELECT *
        INTO linked_decision
        FROM review_decisions
        WHERE id = NEW.review_decision_id;

        IF NOT FOUND
           OR NEW.fansub_group_id <> linked_decision.fansub_group_id
           OR NEW.source_type <> linked_decision.source_type
           OR NEW.source_key <> linked_decision.source_key
           OR NEW.source_revision <> linked_decision.source_revision
           OR NEW.decision <> linked_decision.decision
           OR NEW.is_platform_override <> linked_decision.is_platform_override THEN
            RAISE EXCEPTION 'review audit event does not match its review decision';
        END IF;
    END IF;

    IF NEW.event_code IN (
        'review.confirmed',
        'review.rejected',
        'review.override',
        'review_credit.awarded'
    ) AND (
        NEW.actor_kind <> 'app_user'
        OR NEW.actor_app_user_id IS DISTINCT FROM linked_decision.reviewer_app_user_id
        OR NEW.actor_member_id IS DISTINCT FROM linked_decision.reviewer_member_id
    ) THEN
        RAISE EXCEPTION 'review audit actor does not match its review decision';
    END IF;

    RETURN NEW;
END;
$$;

CREATE FUNCTION validate_review_reason_contract() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    parent_event review_audit_events%ROWTYPE;
BEGIN
    SELECT *
    INTO parent_event
    FROM review_audit_events
    WHERE id = NEW.audit_event_id;

    IF NOT FOUND
       OR NOT parent_event.has_reason
       OR (NEW.reason_kind = 'reject' AND parent_event.event_code <> 'review.rejected')
       OR (NEW.reason_kind = 'override' AND parent_event.event_code <> 'review.override') THEN
        RAISE EXCEPTION 'review reason kind does not match its audit event';
    END IF;

    RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER review_audit_events_validate_contract
AFTER INSERT ON review_audit_events
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_review_audit_event_contract();

CREATE CONSTRAINT TRIGGER review_reason_texts_validate_contract
AFTER INSERT ON review_reason_texts
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_review_reason_contract();

CREATE TABLE review_credit_slots (
    id BIGSERIAL PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_key TEXT NOT NULL,
    credit_slot TEXT NOT NULL CHECK (credit_slot IN ('reject', 'confirm')),
    reviewer_member_id BIGINT NOT NULL REFERENCES members(id),
    review_decision_id BIGINT NOT NULL REFERENCES review_decisions(id),
    point_ledger_entry_id BIGINT NOT NULL REFERENCES point_ledger_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_review_credit_source_type_canonical CHECK (
        source_type <> ''
        AND source_type = phase106_trim_unicode_whitespace(source_type)
    ),
    CONSTRAINT chk_review_credit_source_key_canonical CHECK (
        source_key <> ''
        AND source_key = phase106_trim_unicode_whitespace(source_key)
    ),
    UNIQUE (source_type, source_key, credit_slot),
    UNIQUE (point_ledger_entry_id)
);

CREATE FUNCTION validate_review_credit_slot_contract() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    linked_decision review_decisions%ROWTYPE;
    linked_award point_ledger_entries%ROWTYPE;
    linked_rule point_rules%ROWTYPE;
    expected_source_key TEXT;
    expected_idempotency_key TEXT;
BEGIN
    SELECT *
    INTO linked_decision
    FROM review_decisions
    WHERE id = NEW.review_decision_id;

    IF NOT FOUND
       OR NEW.source_type <> linked_decision.source_type
       OR NEW.source_key <> linked_decision.source_key
       OR NEW.credit_slot <> linked_decision.decision
       OR linked_decision.reviewer_member_id IS NULL
       OR NEW.reviewer_member_id <> linked_decision.reviewer_member_id
       OR linked_decision.is_platform_override THEN
        RAISE EXCEPTION 'review credit slot does not match its review decision';
    END IF;

    SELECT *
    INTO linked_award
    FROM point_ledger_entries
    WHERE id = NEW.point_ledger_entry_id;

    SELECT *
    INTO linked_rule
    FROM point_rules
    WHERE id = linked_award.rule_id;

    expected_source_key :=
        'source:' || octet_length(linked_decision.source_type) || ':' ||
        encode(convert_to(linked_decision.source_type, 'UTF8'), 'hex') ||
        ':key:' || octet_length(linked_decision.source_key) || ':' ||
        encode(convert_to(linked_decision.source_key, 'UTF8'), 'hex');
    expected_idempotency_key :=
        'v1|review|review_decision|' || expected_source_key ||
        '|beneficiary:' || NEW.reviewer_member_id ||
        '|slot:' || NEW.credit_slot;

    IF linked_award.id IS NULL
       OR linked_rule.id IS NULL
       OR linked_award.entry_kind <> 'award'
       OR linked_award.member_id <> NEW.reviewer_member_id
       OR linked_award.actor_app_user_id IS DISTINCT FROM linked_decision.reviewer_app_user_id
       OR linked_award.fansub_group_id IS DISTINCT FROM linked_decision.fansub_group_id
       OR linked_award.source_type <> 'review_decision'
       OR linked_award.source_key <> expected_source_key
       OR linked_award.idempotency_key <> expected_idempotency_key
       OR linked_rule.rule_code <> 'review.decision'
       OR linked_rule.rule_version <> 1
       OR linked_award.rule_code_snapshot <> 'review.decision'
       OR linked_award.rule_version_snapshot <> 1
       OR linked_award.rule_category_snapshot <> 'platform_contribution'
       OR linked_award.rule_point_value_snapshot <> 1
       OR linked_award.point_value <> 1 THEN
        RAISE EXCEPTION 'review credit slot does not reference its PointService award';
    END IF;

    RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER review_credit_slots_validate_contract
AFTER INSERT ON review_credit_slots
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_review_credit_slot_contract();

CREATE FUNCTION reject_review_append_only_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'review structured history is append-only';
END;
$$;

CREATE FUNCTION reject_review_append_only_truncate() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'review structured history is append-only';
END;
$$;

CREATE FUNCTION reject_review_reason_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'review reason text cannot be updated';
END;
$$;

CREATE FUNCTION reject_review_reason_truncate() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'review reason text cannot be truncated';
END;
$$;

CREATE TRIGGER review_decisions_guard_mutation
BEFORE UPDATE OR DELETE ON review_decisions
FOR EACH ROW EXECUTE FUNCTION reject_review_append_only_mutation();

CREATE TRIGGER review_decisions_reject_truncate
BEFORE TRUNCATE ON review_decisions
FOR EACH STATEMENT EXECUTE FUNCTION reject_review_append_only_truncate();

CREATE TRIGGER review_audit_events_guard_mutation
BEFORE UPDATE OR DELETE ON review_audit_events
FOR EACH ROW EXECUTE FUNCTION reject_review_append_only_mutation();

CREATE TRIGGER review_audit_events_reject_truncate
BEFORE TRUNCATE ON review_audit_events
FOR EACH STATEMENT EXECUTE FUNCTION reject_review_append_only_truncate();

CREATE TRIGGER review_credit_slots_guard_mutation
BEFORE UPDATE OR DELETE ON review_credit_slots
FOR EACH ROW EXECUTE FUNCTION reject_review_append_only_mutation();

CREATE TRIGGER review_credit_slots_reject_truncate
BEFORE TRUNCATE ON review_credit_slots
FOR EACH STATEMENT EXECUTE FUNCTION reject_review_append_only_truncate();

CREATE TRIGGER review_reason_texts_guard_update
BEFORE UPDATE ON review_reason_texts
FOR EACH ROW EXECUTE FUNCTION reject_review_reason_update();

CREATE TRIGGER review_reason_texts_reject_truncate
BEFORE TRUNCATE ON review_reason_texts
FOR EACH STATEMENT EXECUTE FUNCTION reject_review_reason_truncate();

CREATE TRIGGER review_foundation_seed_ownership_guard_mutation
BEFORE UPDATE OR DELETE ON review_foundation_seed_ownership
FOR EACH ROW EXECUTE FUNCTION reject_review_append_only_mutation();

CREATE TRIGGER review_foundation_seed_ownership_reject_truncate
BEFORE TRUNCATE ON review_foundation_seed_ownership
FOR EACH STATEMENT EXECUTE FUNCTION reject_review_append_only_truncate();

INSERT INTO review_foundation_seed_ownership (
    seed_kind,
    seed_key,
    created_by_migration
)
VALUES (
    'point_rule',
    'review.decision|1',
    NOT EXISTS (
        SELECT 1
        FROM point_rules
        WHERE rule_code = 'review.decision'
          AND rule_version = 1
    )
);

INSERT INTO point_rules (rule_code, rule_version, category, point_value)
VALUES ('review.decision', 1, 'platform_contribution', 1)
ON CONFLICT (rule_code, rule_version) DO NOTHING;

COMMIT;
