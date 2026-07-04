# Summary

## Geaendert
- Neue Migration `0121_neutral_role_labels` setzt neutrale `role_definitions.label_de`:
  - `fansub_lead` -> `Gruppenleitung`
  - `founder` -> `Gruendung`
  - `project_lead` -> `Projektleitung`
  - `techadmin` -> `Technische Administration`
  - `gfxler` -> `Grafik`
  - `raw_provider` -> `Raw-Bereitstellung`
  - `quality_checker` -> `Qualitaetspruefung`
- Frontend-Fallbacks und zentrale Rollenoptionen nutzen dieselben neutralen Labels.
- Sichtbare Texte wie "Leader-Kontext", "Bearbeitest als Leader" und Einladungsfehler wurden neutral formuliert.
- Die laufende lokale Docker-DB wurde auf Migration 121 aktualisiert.

## Verifikation
- `npm test -- --run ...` fuer Rollen-/Member-/Contribution-Tests: 52 Tests gruen.
- `npm run typecheck`: gruen.
- `go test ./internal/migrations ./internal/handlers`: gruen.
- `git diff --check`: gruen.
- SQL-Pruefung in `team4s_v2` bestaetigt die neuen Labels.

## Risiko
- Interne Namen wie `PublicFansubLeaderEntry` und `leader_timeline` bleiben als API-/Code-Kontrakt erhalten. Das ist bewusst keine UI-Anzeige.
