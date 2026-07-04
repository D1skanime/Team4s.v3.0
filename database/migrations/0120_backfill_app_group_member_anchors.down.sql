-- Migration 0120 Down:
-- Kein automatisches Löschen oder Entkoppeln der erzeugten members-Anker.
-- Diese Anker können nach dem Up bereits von anime_contributions, Notizen oder Medien genutzt werden.

BEGIN;

-- No-op by design.

COMMIT;
