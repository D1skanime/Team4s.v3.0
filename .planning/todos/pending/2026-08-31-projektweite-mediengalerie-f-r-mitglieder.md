---
created: 2026-08-31T22:11:34.961Z
title: Projektweite Mediengalerie für Mitglieder
area: contributor-workspace
files:
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/media
  - frontend/src/app/me/releases/[versionId]/workspace
  - backend/internal/handlers
  - backend/internal/repository
  - shared/contracts
---

## Problem

Der Button „Medien zu Buddy Complex“ auf der Mitglieder-Projektseite führt aktuell in die interne Admin-Gruppenverwaltung. Für Mitglieder fehlt eine projektbezogene Übersicht aller Release-Medien, die diese Fansubgruppe für genau dieses Anime-Projekt hochgeladen hat. Medien anderer Projekte oder gruppenweite Medien dürfen dort nicht erscheinen.

## Desired Outcome

Eine spätere, getrennte Umsetzung soll eine Mitgliederroute für die Projekt-Mediengalerie bereitstellen. Sie bündelt die kanonischen release_version_media aller Release-Versionen des gewählten Anime-/Fansub-Projekts, zeigt klar den Release-Kontext je Medium und verwendet keine Admin-Route oder parallele Medienownership. Vor Umsetzung Sichtbarkeit, Kategorien, Pagination und die Berechtigungen für interne versus öffentliche Medien gegen den bestehenden Release-Medienvertrag festlegen.
