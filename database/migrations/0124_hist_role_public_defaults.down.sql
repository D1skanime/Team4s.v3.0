-- Migration 0124 rollback: restore the 'internal' default for historical role visibility.
-- Note: the up-migration's backfill (internal -> public) is NOT reversed, since the
-- original per-row visibility is not recoverable and blindly flipping public -> internal
-- would hide roles that were legitimately published.

ALTER TABLE hist_group_member_roles
    ALTER COLUMN visibility SET DEFAULT 'internal';
