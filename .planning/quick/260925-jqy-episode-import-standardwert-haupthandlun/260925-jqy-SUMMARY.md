---
status: complete
---

# Quick Task Summary

Der kanonische Episode-Import verwendet bei fehlender expliziter AniSearch-Filler-Klassifizierung jetzt `canon` statt `unknown`. Damit werden reguläre Folgen wie bei 07-Ghost als „Haupthandlung“ angelegt. Ausdrücklich gelieferte Klassifizierungen bleiben unverändert.

Geänderte Dateien:

- `backend/internal/repository/episode_import_repository_apply.go`
- `backend/internal/repository/episode_import_source_integration_test.go`
