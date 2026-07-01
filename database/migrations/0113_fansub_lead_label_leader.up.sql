-- Migration 0113: fansub_lead-Label auf "Leader" vereinheitlichen.
-- Der Gruppen-Leiter wird auf Fansub-Portalen durchgängig schlicht als "Leader"
-- bezeichnet. Vorher lautete das Label "Gruppenleitung" (gesetzt in Migration 0112).
UPDATE role_definitions SET label_de = 'Leader' WHERE code = 'fansub_lead';
