BEGIN;

-- D-10: fansub_lead gewinnt anime_fansub_project.timeline.update additiv
-- (bisher: nur project_lead und der fehlerhaft ueber die Matrix-UI gesetzte
-- typesetter-Eintrag hatten dieses Recht; fansub_lead fehlte, obwohl die
-- Gruppenleitung den Projektzeitraum fachlich setzen koennen soll).
INSERT INTO role_capabilities (role_code, action_code)
VALUES ('fansub_lead', 'anime_fansub_project.timeline.update')
ON CONFLICT (role_code, action_code) DO NOTHING;

-- D-11: typesetter verliert anime_fansub_project.timeline.update wieder
-- (Fehlklick ueber die Admin-Rechte-Matrix-UI, siehe 188-CONTEXT.md). Gezielte
-- Loeschung EINER konkreten (role_code, action_code)-Zeile, kein
-- DELETE FROM role_capabilities ohne WHERE (Lehre aus Migration 0154).
DELETE FROM role_capabilities
WHERE role_code = 'typesetter'
  AND action_code = 'anime_fansub_project.timeline.update';

COMMIT;
