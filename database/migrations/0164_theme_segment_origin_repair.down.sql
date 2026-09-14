-- Migration 0164 DOWN:
-- Der Reparaturlauf ist absichtlich nicht destruktiv rueckgaengig zu machen -- dieselbe
-- Haltung wie 0117_backfill_fansub_group_member_historical_links.down.sql: die Zeilen, die 0164
-- korrigiert hat, waren VOR der Migration nachweislich in einem ungueltigen Zustand (Origin
-- zeigte auf eine nicht mehr zugewiesene Release-Version, oder fehlte trotz vorhandener
-- Zuweisung). Ein automatisches "Zuruecksetzen" wuerde diesen bewiesen-ungueltigen Zustand
-- absichtlich wiederherstellen und gleichzeitig die im selben Lauf entfernten
-- theme_segment_contributors-Zeilen nicht rekonstruieren koennen (sie wurden nicht archiviert --
-- ein Wiedereinfuegen waere ohnehin eine verbotene automatische Contributor-Auswahl).

BEGIN;

-- no-op

COMMIT;
