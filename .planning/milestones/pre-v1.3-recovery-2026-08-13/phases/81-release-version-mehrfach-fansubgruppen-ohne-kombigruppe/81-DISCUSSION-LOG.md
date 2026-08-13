# Phase 81 — Discussion Log

**Date:** 2026-06-09
**Mode:** discuss (decisions vom User vorab gesetzt, durch Code-Untersuchung verifiziert)

## Ausgangslage / Root-Cause-Verifikation

Befund am realen Code bestätigt (nicht aus Reports übernommen):
- Mehrere per Chip gewählte Gruppen werden im Backend zu einer synthetischen `group_type='collaboration'`-Gruppe „Gruppe A & Gruppe B" zusammengefasst (`buildImportCollaborationName` → `strings.Join(parts, " & ")`), und nur diese eine Gruppe landet in `release_version_groups`.
- Editor-PATCH und Jellyfin-Import teilen denselben Resolver (`resolveImportFansubSelectionFromInputs`).
- Leseseite liefert via `LIMIT 1` / `scanReleaseVariantAsEpisodeVersion` nur eine Gruppe.
- Frontend schickt bereits korrekt eine ID-Liste — nicht die Ursache.
- Verhalten geht auf Phase 21 (P21-SC3) zurück, die Kombigruppen absichtlich baute.

## Entscheidungen (vom User)

| Frage | Optionen | Wahl | Notiz |
|---|---|---|---|
| Kollaborations-Entität (`group_type='collaboration'` + `fansub_collaboration_members`) | abschaffen / nur Speicherpfad / behalten | **Komplett abschaffen** | Kooperation nur noch als N Zeilen in `release_version_groups`. |
| Junction-Zusatzfelder (`is_primary`, `display_order`, `role`, `note`) | is_primary+order / alle / keine | **Keine Hierarchie** | User: bei gemeinsamer Arbeit gibt es keine Hauptgruppe — beide gleichwertig; `is_primary` fachlich falsch. Sortierung neutral/alphabetisch. |
| Umsetzung aufsetzen | discuss-phase / debug zuerst / nur Diagnose | **discuss-phase** | Mehrschichtiger Umbau (Schema+BE+FE+Migration+Tests). |

## Anzeige

- Release-Ansicht: gleichwertige Chips (Variante 2), `@/components/ui`-Primitives.
- Gruppen-Profil: „Kooperation mit …", aktuelle Gruppe hervorgehoben, keine Hierarchie.

## Deferred

- `role`/`contribution_type`/`note` pro Zuordnung → spätere Phase.
- `is_primary`/Hauptgruppe → verworfen (nicht verschoben).
