# WORKING_NOTES

## Current Workflow Phase
- Der gemeinsame TipTap-Stand ist funktional brauchbar; die aktuelle Front liegt bei UX-/Design-Politur und anschließendem globalem Rollout.
- Die Fansub-Edit-Seite dient gerade als bewusst lokaler Proving Ground, bevor derselbe Wrapper überall aktiviert wird.

## Useful Facts To Keep
- `docs/architecture/db-schema-fansub-domain.md` is the first domain-reference stop for fansub/anime/release persistence questions.
- `release_version_groups.fansub_group_id` is the canonical runtime group column; `fansubgroup_id` is legacy cleanup territory only.
- Anime and episodes stay neutral; release/process media must not get attached directly to those neutral entities.
- `http://localhost:3000/admin/fansubs/88/edit` ist die aktuelle Live-Oberfläche für die Editor-Politur; `3002` kann einen älteren Stand zeigen.
- Die Fansub-Notizflächen haben lokale Card-Wrapper, Badges, Optionsblock und Preview-nach-Save bekommen.
- Der gemeinsame `RichTextEditor` hat global bereits die bessere Farbpalette und verständliche Tabellenaktionen.
- Die erklärte Hilfszeile im Optionsblock wurde wieder entfernt; fachfremder UI-Erklärtext soll nicht im Produkt stehen.
- Der Nutzer will morgen noch eine Runde gegen den „zu weiß / langweilig“-Eindruck gehen und danach den globalen Rollout.
- Spätere Bildunterstützung im Editor soll denselben globalen Media-/Upload-Flow verwenden wie der Rest des Produkts.
- Lokale Agenten-/Cache-/Temp-Artefakte sollten über selektives Staging draußen bleiben.

## Verification Memory
- 2026-05-13: Farbpalette live auf `/admin/fansubs/88/edit` ausprobiert und als deutlich benutzbarer bestätigt.
- 2026-05-13: Nach `Speichern` klappt die Gruppennotiz in die Lesekarte zurück.
- 2026-05-13: Tabellenaktionen im Editor live geprüft; zusätzliche Spalten/Zeilen funktionieren.
- 2026-05-13: `vitest` grün für `NotesTab`, `AnimeProjectNotesSection` und `RichTextEditor`.
