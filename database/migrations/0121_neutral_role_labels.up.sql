-- Migration 0121: neutrale Rollenlabels fuer UI/API-Anzeigen.
-- Nur label_de wird geaendert; Role-Codes, Kontexte, Sortierung und Capabilities bleiben unveraendert.

UPDATE role_definitions SET label_de = 'Gründung' WHERE code = 'founder';
UPDATE role_definitions SET label_de = 'Gruppenleitung' WHERE code = 'fansub_lead';
UPDATE role_definitions SET label_de = 'Projektleitung' WHERE code = 'project_lead';
UPDATE role_definitions SET label_de = 'Technische Administration' WHERE code = 'techadmin';
UPDATE role_definitions SET label_de = 'Grafik' WHERE code = 'gfxler';
UPDATE role_definitions SET label_de = 'Raw-Bereitstellung' WHERE code = 'raw_provider';
UPDATE role_definitions SET label_de = 'Qualitätsprüfung' WHERE code = 'quality_checker';
