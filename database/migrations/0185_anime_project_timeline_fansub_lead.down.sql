BEGIN;

-- Spiegelbildlich zur up-Migration: zuerst D-11 rueckgaengig machen
-- (typesetter bekommt die Capability wieder), dann D-10 rueckgaengig machen
-- (fansub_lead verliert sie wieder).
INSERT INTO role_capabilities (role_code, action_code)
VALUES ('typesetter', 'anime_fansub_project.timeline.update')
ON CONFLICT (role_code, action_code) DO NOTHING;

DELETE FROM role_capabilities
WHERE role_code = 'fansub_lead'
  AND action_code = 'anime_fansub_project.timeline.update';

COMMIT;
