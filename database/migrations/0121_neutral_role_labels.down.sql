-- Rollback Migration 0121: vorherige Rollenlabels wiederherstellen.

UPDATE role_definitions SET label_de = 'Gründer/in' WHERE code = 'founder';
UPDATE role_definitions SET label_de = 'Leader' WHERE code = 'fansub_lead';
UPDATE role_definitions SET label_de = 'Fansub-Projektleitung' WHERE code = 'project_lead';
UPDATE role_definitions SET label_de = 'Techadmin' WHERE code = 'techadmin';
UPDATE role_definitions SET label_de = 'GFX / Grafik' WHERE code = 'gfxler';
UPDATE role_definitions SET label_de = 'Raw-Bereitstellung' WHERE code = 'raw_provider';
UPDATE role_definitions SET label_de = 'Qualitätsprüfung' WHERE code = 'quality_checker';
