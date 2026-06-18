-- Migration 0108 DOWN: Entfernt role_capabilities und action_definitions.
-- Reihenfolge: role_capabilities zuerst (FK auf action_definitions), dann action_definitions.

BEGIN;

DROP TABLE IF EXISTS role_capabilities;
DROP TABLE IF EXISTS action_definitions;

COMMIT;
