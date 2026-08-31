-- Migration 0153: Phase 142 UAT.
-- Technik-Admin defaults reflect the approved operational setup.
BEGIN;

INSERT INTO role_capabilities (role_code, action_code)
VALUES
    ('techadmin', 'fansub_group_media.upload'),
    ('techadmin', 'fansub_group.links.manage'),
    ('techadmin', 'fansub_group_media.update'),
    ('techadmin', 'fansub_group_page.technical_links_edit'),
    ('techadmin', 'fansub_group.members.view'),
    ('techadmin', 'fansub_group_links.update'),
    ('techadmin', 'fansub_group.invitations.view'),
    ('techadmin', 'fansub_group.invitations.create'),
    ('techadmin', 'fansub_group.invitations.cancel'),
    ('techadmin', 'review.image.decide'),
    ('techadmin', 'review.contribution.decide'),
    ('techadmin', 'fansub_group_media.view')
ON CONFLICT (role_code, action_code) DO NOTHING;

COMMIT;
