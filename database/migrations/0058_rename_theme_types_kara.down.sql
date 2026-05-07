-- Rollback: OP Kara → OP, ED Kara → ED, Insert Kara → Insert
UPDATE theme_types SET name = 'OP'     WHERE id = 1;
UPDATE theme_types SET name = 'ED'     WHERE id = 3;
UPDATE theme_types SET name = 'Insert' WHERE id = 5;
