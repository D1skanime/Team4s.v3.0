-- Migration 0145: Canonical public member identity and closed visibility vocabulary.
-- Existing rows are disposable and must be reset/reseeded through the canonical flow;
-- this migration deliberately refuses to rewrite or preserve them.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM members LIMIT 1) THEN
        RAISE EXCEPTION
            'migration 0145 requires an empty members table; reset and reseed disposable test data before applying';
    END IF;
END;
$$;

ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_profile_visibility;

ALTER TABLE members
    ALTER COLUMN profile_visibility SET DEFAULT 'public',
    ADD COLUMN public_slug VARCHAR(120) NOT NULL,
    ADD CONSTRAINT uq_members_public_slug UNIQUE (public_slug),
    ADD CONSTRAINT chk_members_public_slug_canonical
        CHECK (public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    ADD CONSTRAINT chk_members_public_slug_non_numeric
        CHECK (public_slug !~ '^[0-9]+$'),
    ADD CONSTRAINT chk_members_public_slug_reserved
        CHECK (public_slug NOT IN (
            'admin',
            'api',
            'edit',
            'me',
            'members',
            'new',
            'profile',
            'ranking',
            'settings'
        )),
    ADD CONSTRAINT chk_members_profile_visibility
        CHECK (profile_visibility IN ('public', 'private'));

CREATE FUNCTION prevent_member_public_slug_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.public_slug IS DISTINCT FROM OLD.public_slug THEN
        RAISE EXCEPTION 'members.public_slug is immutable';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_members_public_slug_immutable
    BEFORE UPDATE OF public_slug ON members
    FOR EACH ROW
    EXECUTE FUNCTION prevent_member_public_slug_update();
