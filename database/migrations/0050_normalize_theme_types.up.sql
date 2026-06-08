-- Phase 25 follow-up: vereinheitlicht Theme-Typen auf generische Operator-Begriffe.
-- OP2 wird auf OP zusammengefuehrt, ED2 auf ED. Bestehende Themes werden auf die
-- verbleibenden generischen Typen umgebogen.

UPDATE themes
SET theme_type_id = (SELECT id FROM theme_types WHERE name = 'OP1')
WHERE theme_type_id = (SELECT id FROM theme_types WHERE name = 'OP2');

UPDATE themes
SET theme_type_id = (SELECT id FROM theme_types WHERE name = 'ED1')
WHERE theme_type_id = (SELECT id FROM theme_types WHERE name = 'ED2');

DELETE FROM theme_types WHERE name IN ('OP2', 'ED2');

UPDATE theme_types SET name = 'OP' WHERE name = 'OP1';
UPDATE theme_types SET name = 'ED' WHERE name = 'ED1';
