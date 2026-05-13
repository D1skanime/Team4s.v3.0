# WORKING_NOTES

## Current Workflow Phase
- Phase 41 hat jetzt ein bestandenes UAT; der akute Rest ist Doku-/Closeout-Sync, kein bekannter Hauptpfad-Bug.
- Vor der nächsten Folgephase sollte die Phase-40/41/42-Erzählung explizit geglättet werden.

## Useful Facts To Keep
- `docs/architecture/db-schema-fansub-domain.md` is the first domain-reference stop for fansub/anime/release persistence questions.
- `release_version_groups.fansub_group_id` is the canonical runtime group column; `fansubgroup_id` is legacy cleanup territory only.
- Anime and episodes stay neutral; release/process media must not get attached directly to those neutral entities.
- Phase 40 ist technisch verifiziert, hat aber kein eigenes `40-UAT.md`.
- Phase 41 `41-UAT.md` ist `passed` und deckt die wichtigsten praktischen Save-Pfade aus Phase 40 erneut ab.
- Wenn wir formale Vollständigkeit wollen, bleiben nur noch kleine Restpunkte: Gruppennotiz-Delete, expliziter Sanitizing-Nachweis, Member-Story-Livepfad.
- `42-CONTEXT.md` ist veraltet, weil dort Phase 41 noch als nicht vollständig grün beschrieben wird.
- Lokale Agenten-/Cache-/Temp-Artefakte sollten über selektives Staging und die erweiterte `.gitignore` draußen bleiben.

## Verification Memory
- 2026-05-13: `41-UAT.md` passed 6/6.
- 2026-05-13: Gruppennotiz-Browser-Save nach API-Mapping-/UTF-8-Fix bestätigt.
- 2026-05-13: Anime-Projekttext-Browser-Save bestätigt.
- 2026-05-13: Release-Version-Notiz-Browser-Save für echte Rollen bestätigt.
