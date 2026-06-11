-- Migration 0106: fansub_group_member_roles.role CHECK → FK auf role_definitions(code).
-- Abhängigkeiten: 0073 (fansub_group_member_roles, CHECK chk_fansub_group_member_roles_role),
--                 0074 (erweiterter CHECK-Constraint), 0085 (role_definitions-Katalog),
--                 0100 (fansub_lead in role_definitions), 0103 (group_history-Context)
-- Zweck (D-08): Rollen-Katalog als einzige Wahrheit; keine hardkodierten CHECK-Listen mehr.
-- Pitfall 6: role VARCHAR(40) → TEXT angleichen (zukunftssicher für Codes > 40 Zeichen).

BEGIN;

-- Schritt 1: Bestehenden CHECK-Constraint entfernen
ALTER TABLE fansub_group_member_roles
    DROP CONSTRAINT IF EXISTS chk_fansub_group_member_roles_role;

-- Schritt 2: Spaltentyp von VARCHAR(40) auf TEXT angleichen
ALTER TABLE fansub_group_member_roles
    ALTER COLUMN role TYPE TEXT;

-- Schritt 3: FK auf role_definitions(code) anlegen
ALTER TABLE fansub_group_member_roles
    ADD CONSTRAINT fk_fansub_group_member_roles_role_code
    FOREIGN KEY (role) REFERENCES role_definitions(code) ON DELETE RESTRICT;

COMMIT;
