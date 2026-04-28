-- Best-effort rollback: generische Typen wieder auf den alten expliziten Satz erweitern.
-- Bereits zusammengefuehrte Themes bleiben auf OP1 bzw. ED1, da die alte Zuordnung
-- nach dem Merge nicht eindeutig rekonstruiert werden kann.

UPDATE theme_types SET name = 'OP1' WHERE id = 1;
UPDATE theme_types SET name = 'ED1' WHERE id = 3;
UPDATE theme_types SET name = 'Insert' WHERE id = 5;
UPDATE theme_types SET name = 'Outro' WHERE id = 6;

INSERT INTO theme_types (id, name, created_at)
VALUES
  (2, 'OP2', NOW()),
  (4, 'ED2', NOW())
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'theme_types_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM theme_types), 1),
  true
);
