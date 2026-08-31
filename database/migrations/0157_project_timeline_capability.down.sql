BEGIN;

DELETE FROM role_capabilities
WHERE role_code = 'project_lead'
  AND action_code = 'anime_fansub_project.timeline.update';

DELETE FROM action_definitions
WHERE code = 'anime_fansub_project.timeline.update';

COMMIT;
