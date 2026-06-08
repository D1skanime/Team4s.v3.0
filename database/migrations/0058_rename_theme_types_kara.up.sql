-- Umbenennung der Theme-Typen: OP → OP Kara, ED → ED Kara, Insert → Insert Kara
-- Outro bleibt unveraendert.
UPDATE theme_types SET name = 'OP Kara'     WHERE name = 'OP';
UPDATE theme_types SET name = 'ED Kara'     WHERE name = 'ED';
UPDATE theme_types SET name = 'Insert Kara' WHERE name = 'Insert';
