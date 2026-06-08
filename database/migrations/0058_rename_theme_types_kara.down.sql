-- Rollback: OP Kara → OP, ED Kara → ED, Insert Kara → Insert
UPDATE theme_types SET name = 'OP'     WHERE name = 'OP Kara';
UPDATE theme_types SET name = 'ED'     WHERE name = 'ED Kara';
UPDATE theme_types SET name = 'Insert' WHERE name = 'Insert Kara';
