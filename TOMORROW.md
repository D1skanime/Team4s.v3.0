# TOMORROW

## Top 3 Priorities
1. Den heutigen Test-Upload auf Release-Version 62 prüfen und entweder löschen oder bewusst als Testdaten stehen lassen.
2. Entscheiden, ob vor Phase 43 noch ein letzter kleiner UI-Cleanup-Slice sinnvoll ist oder ob direkt in den Auth-/Rollen-Block gewechselt wird.
3. Phase 42 weiter geparkt lassen und keine Collaboration-Arbeit beginnen, bevor Phase 43 bis 48 die User-/Rollen-Basis liefern.

## First 15-Minute Task
- Auf `http://localhost:3000/admin/episode-versions/62/edit?tab=media` den heute erzeugten Upload öffnen, die zugehörige Relation `#20` identifizieren und entscheiden, ob sie direkt wieder gelöscht werden soll.

## Dependencies To Unblock Early
- `docker compose up -d team4sv30-db team4sv30-redis`
- Falls der lokale Backend-Bypass gebraucht wird: prüfen, ob `http://localhost:8092/health` antwortet.
- Für echte UI-UAT bevorzugt mit `3000` arbeiten; `3002` nur verwenden, wenn der Container nachweislich den frischen Stand zeigt.
