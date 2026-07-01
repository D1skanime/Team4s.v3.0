-- Rollback Migration 0113: fansub_lead-Label zurück auf "Gruppenleitung".
UPDATE role_definitions SET label_de = 'Gruppenleitung' WHERE code = 'fansub_lead';
