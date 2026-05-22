DROP INDEX IF EXISTS idx_fansub_group_invitations_expires_at;
DROP INDEX IF EXISTS idx_fansub_group_invitations_group_status;
DROP INDEX IF EXISTS uq_fansub_group_invitations_token_hash;
DROP INDEX IF EXISTS uq_fansub_group_invitations_pending_email;
DROP TABLE IF EXISTS fansub_group_invitations;
