---
created: 2026-10-20T00:00:00+00:00
title: Projektnotizen prüfen die falsche Action — Projektrollen zählen nicht
area: permissions-project-notes
status: erledigt (Phase 189)
files:
  - backend/internal/permissions/permissions_anime_project.go
---

## Befund aus Phase 188 (20.10.2026)

Der Schreib-Handler für Projektnotizen (Fansub-Bearbeiten → Projekt → Notizen) prüft **nicht** die dafür vorgesehene Action `anime_fansub_project.notes.write`, sondern die gruppenweite `fansub_group.notes.write`. Die Projekt-Action ist zwar in `role_capabilities` vergeben (u. a. editor, fansub_lead, project_lead, quality_checker), wird aber von keinem Handler abgefragt — ein toter Katalog-Eintrag. Damit gilt dasselbe Muster wie beim Projektzeitraum-Bug: Eine bestätigte **Projektrolle** (`anime_contribution_roles`) gibt kein Recht für genau dieses Projekt.

## Lösung (analog Phase 188, Plan 05)

- Handler auf `anime_fansub_project.notes.write` umstellen und über die in Phase 188 gebaute `CanForAnimeProject`-Prüfung (Gruppe + Anime, inkl. bestätigter Projektrollen) laufen lassen.
- Frontend-Freischaltung über den projektbezogenen Capability-Abruf (`?anime_id=`), keine Rollenlogik im Frontend.
- Vorher klären: Wer hat heute über `fansub_group.notes.write` Schreibrecht und würde es nach der Umstellung verlieren oder gewinnen? Vergleich beider Rollenlisten vorlegen, bevor etwas geändert wird.
- Keine hartcodierten Rollennamen, keine doppelte Logik.

## Status-Update (2026-10-20, Phase 189, abgenommen)

Umgesetzt in Plan 189-04 (Backend: `requireAnimeProjectNoteWriteAccess` über
`CanForAnimeProject`, neue separate `can_edit_project_notes`-Capability, `can_edit_notes`
unverändert, keine `role_capabilities`-Migration) und 189-06 (Frontend-Wiring). Die vorab
geforderte Vergleichstabelle (wer gewinnt/verliert) wurde in der Ist-Analyse
(`189-CONTEXT.md`) mit echten Daten vorgelegt und vom Nutzer entschieden (Verlust-Fall
akzeptiert, keine Katalog-Erweiterung). Details:
`.planning/phases/189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg/189-VERIFICATION.md`.
