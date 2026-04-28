-- Phase 25 follow-up: vereinheitlicht Theme-Typen auf generische Operator-Begriffe.
-- OP2 wird auf OP zusammengefuehrt, ED2 auf ED. Bestehende Themes werden auf die
-- verbleibenden generischen Typen umgebogen.

UPDATE themes
SET theme_type_id = 1
WHERE theme_type_id = 2;

UPDATE themes
SET theme_type_id = 3
WHERE theme_type_id = 4;

DELETE FROM theme_types WHERE id IN (2, 4);

UPDATE theme_types SET name = 'OP' WHERE id = 1;
UPDATE theme_types SET name = 'ED' WHERE id = 3;
UPDATE theme_types SET name = 'Insert' WHERE id = 5;
UPDATE theme_types SET name = 'Outro' WHERE id = 6;
