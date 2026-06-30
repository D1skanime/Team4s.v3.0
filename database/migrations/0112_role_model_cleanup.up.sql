-- Migration 0112: Rollenmodell-Bereinigung.
-- Legt neue assignable-Spalte an, aktualisiert Labels, migriert historische Eintraege,
-- loescht alte Codes, fuegt techadmin/gfxler ein und setzt Gruppen-Rollen auf assignable=true.
-- Abhaengigkeiten: 0085 (role_definitions + hist_group_member_roles FK), 0108 (role_capabilities)
--
-- Kritische Reihenfolge (FK ON DELETE RESTRICT auf hist_group_member_roles.role_code):
--   UPDATE hist-Eintraege VOR DELETE aus role_definitions (Fallstrick 1 aus RESEARCH.md).

BEGIN;

-- Schritt 1: assignable-Spalte hinzufuegen
ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS assignable BOOLEAN NOT NULL DEFAULT false;

-- Schritt 2: label_de aktualisieren (D-05)
UPDATE role_definitions SET label_de = 'Gruppenleitung'        WHERE code = 'fansub_lead';
UPDATE role_definitions SET label_de = 'Fansub-Projektleitung' WHERE code = 'project_lead';

-- Schritt 3: Historische Eintraege migrieren VOR FK-Delete (D-04, ZWINGEND ZUERST)
UPDATE hist_group_member_roles SET role_code = 'fansub_lead'  WHERE role_code = 'leader';
UPDATE hist_group_member_roles SET role_code = 'project_lead' WHERE role_code = 'project_manager';

-- Schritt 4: Alte role_definitions entfernen (erst nach Schritt 3, wegen FK ON DELETE RESTRICT)
DELETE FROM role_definitions WHERE code IN ('leader', 'project_manager');

-- Schritt 5: Neue Rollen anlegen (D-07) — assignable=true ab Einfuegen
INSERT INTO role_definitions (code, label_de, contexts, sort_order, assignable) VALUES
    ('techadmin', 'Techadmin',    ARRAY['fansub_group'], 5, true),
    ('gfxler',    'GFX / Grafik', ARRAY['fansub_group'], 6, true)
ON CONFLICT (code) DO NOTHING;

-- Schritt 6: assignable=true fuer bestehende Gruppenrollen (D-03/D-08)
UPDATE role_definitions SET assignable = true
WHERE code IN ('fansub_lead', 'co_leader', 'founder', 'project_lead');

-- Schritt 7: fansub_group-Kontext fuer Gruppenrollen erganzen (D-03)
UPDATE role_definitions
SET contexts = array_append(contexts, 'fansub_group')
WHERE code IN ('fansub_lead', 'co_leader', 'founder', 'project_lead')
  AND NOT 'fansub_group' = ANY(contexts);

COMMIT;
