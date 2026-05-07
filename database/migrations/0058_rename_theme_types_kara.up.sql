-- Umbenennung der Theme-Typen: OP → OP Kara, ED → ED Kara, Insert → Insert Kara
-- Outro bleibt unveraendert.
UPDATE theme_types SET name = 'OP Kara'     WHERE id = 1;
UPDATE theme_types SET name = 'ED Kara'     WHERE id = 3;
UPDATE theme_types SET name = 'Insert Kara' WHERE id = 5;
