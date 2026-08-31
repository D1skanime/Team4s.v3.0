-- The snapshot migration intentionally has no data rollback: its purpose is to
-- make reset/reseed environments converge to the approved role-default catalog.
BEGIN;
COMMIT;
