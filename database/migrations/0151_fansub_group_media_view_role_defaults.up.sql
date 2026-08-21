-- Migration 0151: GAP-07 / UAT-137-01 closure.
-- Migration 0109 seeded fansub_group_media.view only for the two original
-- group-leadership roles. Migration 0146 (Phase 136) later gave co_leader,
-- founder, gfxler, and techadmin fansub_group_media.upload/.update/.reorder
-- without the matching .view grant, so these four roles can edit group media
-- but cannot see the media tab/list (frontend gate: canUseMainTab's case
-- "media" reads only capabilities.can_view_group_media; backend: the media
-- list enforces ActionFansubGroupMediaView). This migration extends the
-- "can edit implies can view" semantics that app_auth.go already applies to
-- per-member overrides (canViewGroupMediaAllowed := canViewGroupMedia.Allowed
-- || hasAnyCustomMediaPermission) to role-capability seeding: it is purely
-- additive, does not touch action_definitions (the fansub_group_media.view
-- action row and its user_overridable = false value already exist from
-- 0109/0146), and does not modify the two roles' existing 0109 seeds.
-- Migrations 0146 and 0150 are not edited.

BEGIN;

INSERT INTO role_capabilities (role_code, action_code)
VALUES
    ('co_leader', 'fansub_group_media.view'),
    ('founder', 'fansub_group_media.view'),
    ('gfxler', 'fansub_group_media.view'),
    ('techadmin', 'fansub_group_media.view')
ON CONFLICT (role_code, action_code) DO NOTHING;

COMMIT;
