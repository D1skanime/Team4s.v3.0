-- Best-effort rollback: generische Typen wieder auf den alten expliziten Satz erweitern.
-- Bereits zusammengefuehrte Themes bleiben auf OP1 bzw. ED1, da die alte Zuordnung
-- nach dem Merge nicht eindeutig rekonstruiert werden kann.

UPDATE theme_types SET name = 'OP1' WHERE name = 'OP';
UPDATE theme_types SET name = 'ED1' WHERE name = 'ED';

INSERT INTO theme_types (name, created_at)
VALUES
  ('OP2', NOW()),
  ('ED2', NOW())
ON CONFLICT (name) DO NOTHING;

SELECT setval(
  'theme_types_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM theme_types), 1),
  true
);
