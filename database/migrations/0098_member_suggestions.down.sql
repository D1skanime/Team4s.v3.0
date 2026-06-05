-- Migration 0098 DOWN: member_suggestions rückgängig machen (Phase 76).
-- Reihenfolge: erst additive Spalte droppen, dann die Tabelle (umgekehrt zu up).

ALTER TABLE anime_contributions
    DROP COLUMN IF EXISTS member_reason;

DROP TABLE IF EXISTS member_suggestions;
