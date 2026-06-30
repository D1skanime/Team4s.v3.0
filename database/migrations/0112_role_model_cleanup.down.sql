-- Migration 0112 DOWN: best-effort Rollback fuer Rollenmodell-Bereinigung.
-- Setzt Labels zurueck, entfernt neue Rollen, setzt assignable=false,
-- stellt leader/project_manager zurueck (soweit moeglich).
-- ACHTUNG: hist_group_member_roles-Eintraege koennen nicht eindeutig umgekehrt werden,
-- falls nach der Migration neue Eintraege mit fansub_lead/project_lead erzeugt wurden.

BEGIN;

-- Schritt 1: Neue Rollen entfernen (keine role_capabilities-Eintraege vorhanden, D-08)
DELETE FROM role_definitions WHERE code IN ('techadmin', 'gfxler');

-- Schritt 2: fansub_group-Kontext fuer betroffene Rollen entfernen (best-effort)
UPDATE role_definitions
SET contexts = array_remove(contexts, 'fansub_group')
WHERE code IN ('fansub_lead', 'co_leader', 'founder', 'project_lead');

-- Schritt 3: assignable-Flag fuer bestehende Rollen zuruecksetzen
UPDATE role_definitions SET assignable = false
WHERE code IN ('fansub_lead', 'co_leader', 'founder', 'project_lead');

-- Schritt 4: Alte Codes wiederherstellen (aus 0085-Seed)
INSERT INTO role_definitions (code, label_de, contexts, sort_order, assignable) VALUES
    ('leader',          'Gruppenleitung',    ARRAY['group_history'],                     2, false),
    ('project_manager', 'Projektmanagement', ARRAY['group_history', 'anime_contribution'], 75, false)
ON CONFLICT (code) DO NOTHING;

-- Schritt 5: hist_group_member_roles zurueckmigrieren (best-effort, nur wenn kein Konflikt)
-- WARNUNG: Koennte Eintraege betreffen, die NACH Migration 0112 neu als fansub_lead/project_lead erzeugt wurden.
-- Diese korrekt zu unterscheiden ist ohne Zeitstempel-Vergleich nicht moeglich.
-- Primaer-Migration: Nur Eintraege zurueckstellen, die vor 0112 erstellt wurden.
-- Da kein sicherer Weg existiert, wird dieser Schritt als no-op implementiert.
-- Manuelles Rollback moeglich mit:
--   UPDATE hist_group_member_roles SET role_code = 'leader'          WHERE role_code = 'fansub_lead';
--   UPDATE hist_group_member_roles SET role_code = 'project_manager' WHERE role_code = 'project_lead';

-- Schritt 6: label_de auf 0085-Seed-Werte zuruecksetzen
UPDATE role_definitions SET label_de = 'Projektleitung' WHERE code = 'project_lead';
-- fansub_lead hatte in 0100 kein eigenes Label; Wert aus dem 0100-Seed wiederherstellen:
UPDATE role_definitions SET label_de = 'Gruppenleitung' WHERE code = 'fansub_lead';

-- Schritt 7: assignable-Spalte entfernen (letzte Operation, da obige UPDATEs sie benutzen)
ALTER TABLE role_definitions DROP COLUMN IF EXISTS assignable;

COMMIT;
