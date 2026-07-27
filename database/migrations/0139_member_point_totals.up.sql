BEGIN;

CREATE TABLE member_point_totals (
    member_id    BIGINT PRIMARY KEY REFERENCES members(id),
    total_points BIGINT NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE FUNCTION apply_point_ledger_entry_to_member_total() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO member_point_totals (member_id, total_points, updated_at)
    VALUES (NEW.member_id, NEW.point_value, NOW())
    ON CONFLICT (member_id) DO UPDATE
    SET total_points = member_point_totals.total_points + NEW.point_value,
        updated_at = NOW();
    RETURN NULL;
END;
$$;

CREATE TRIGGER point_ledger_apply_member_total
AFTER INSERT ON point_ledger_entries
FOR EACH ROW EXECUTE FUNCTION apply_point_ledger_entry_to_member_total();

CREATE FUNCTION guard_member_point_totals_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF pg_trigger_depth() <= 1 THEN
        RAISE EXCEPTION 'member_point_totals is maintained exclusively by the point_ledger_entries trigger';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER member_point_totals_guard_direct_write
BEFORE INSERT OR UPDATE OR DELETE ON member_point_totals
FOR EACH ROW EXECUTE FUNCTION guard_member_point_totals_mutation();

COMMIT;
