-- Revert only the capability defaults introduced by migration 0153.
BEGIN;

DELETE FROM role_capabilities
WHERE role_code = 'techadmin'
  AND action_code IN (
      'fansub_group.links.manage',
      'fansub_group.members.view',
      'fansub_group_links.update',
      'fansub_group.invitations.view',
      'fansub_group.invitations.create',
      'fansub_group.invitations.cancel',
      'review.image.decide',
      'review.contribution.decide'
  );

COMMIT;
