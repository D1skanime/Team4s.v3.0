---
created: 2026-07-10T14:35:17.851Z
title: Fansub achievement badge catalog implementieren
area: admin-fansub-workspace
files:
  - tmp/history-event-icons/anime-badge-sheets/selected-badges.md
  - tmp/history-event-icons/legendary-badges/db-proposal.md
  - tmp/history-event-icons/legendary-badges/legendary-project-count-v2-approved.png
  - tmp/history-event-icons/legendary-badges/legendary-release-count-v4-violet-1000.png
  - database/migrations/
  - shared/contracts/openapi.yaml
  - frontend/src/lib/api.ts
  - frontend/src/components/fansubs/FansubHistorySection.tsx
  - backend/internal/handlers/fansub_group_history_handler.go
---

## Problem

Fansub-Gruppen brauchen fuer "Historie & Erfolge" einen erweiterten, klar benannten Badge-/Erfolgskatalog mit Anime-artigen Grafiken. Die bisherigen manuellen `fansub_group_history.event_type`-Werte reichen nicht mehr aus, und seltene Mengen-Erfolge wie 500 Projekte oder 10000 Releases duerfen spaeter nicht einfach frei manuell auswaehlbar sein.

Der User hat im Design-Thread konkrete Bildauswahlen getroffen. Diese Auswahl muss beim spaeteren Einbau erhalten bleiben:

- Normale Historie/Event-Typen: `founding`, `disbanding`, `hiatus`, `rebranding`, `milestone`, `other`, `first_release`, `anniversary`, `collaboration`, `revival`, `project_completed`, `team_change`, `website_launch`, `award`.
- Approved project-count sheet: `tmp/history-event-icons/legendary-badges/legendary-project-count-v2-approved.png`.
- Current release-count candidate: `tmp/history-event-icons/legendary-badges/legendary-release-count-v4-violet-1000.png`.
- Project-count Zuordnung: oben links `projects_10`, oben rechts `projects_50`, unten links `projects_100`, unten rechts `projects_500`.
- Release-count Zuordnung: oben links `releases_100`, oben Mitte `releases_500`, oben rechts `releases_1000` violett/amethyst, unten links `releases_5000`, unten rechts `releases_10000` ultra-legendaer.
- Bildsprache: Anime-/Team-/Fansub-Produktion; keine Buecher, DVDs, Discs, CD-Formen oder Cases.

Wichtig: DB/Migration noch nicht anfassen, solange Claudes Layout-Change-Set nicht committed/pushed ist und die Migrationskette unklar ist. Im aktuellen Arbeitsbaum gab es bereits untracked `database/migrations/0124_hist_role_public_defaults.*`; vor neuer Migration muss `git status` und die aktuelle Migrationsnummer erneut geprueft werden.

## Solution

Spaeter als eigenen, kleinen Implementierungs-Slice planen:

1. Vor Implementierung `git status`, aktuelle Migrationskette und bestehende Fansub-History-/Badge-Seams pruefen. Keine historische Migration editieren und keine neue Migration anlegen, wenn untracked Migrationen im Weg liegen.
2. Normale manuelle History-Typen getrennt von automatisch/bedingt freigeschalteten Count-Erfolgen modellieren. Manuelle `event_type`-Werte duerfen weiterhin Leader-/Admin-pflegbare Historie bleiben.
3. Count-Erfolge als eigene Kategorie oder separates Gruppen-Achievement-Modell behandeln, nicht blind als normale `fansub_group_history.event_type`-Werte. Backend muss Bedingungen bestaetigen, bevor UI sie als verdient/auswaehlbar zeigt.
4. Offene Count-Quelle vor Code entscheiden:
   - Projekte: wahrscheinlich distinct bestaetigte/oeffentliche Anime-Fansub-Projekte der Gruppe.
   - Releases: final entscheiden, ob `fansub_releases`, `release_versions` oder nur public/confirmed release versions zaehlen.
5. Approved Sheets in echte Asset-Struktur ueberfuehren, einzelne Badge-Bilder zuschneiden/exportieren und eine stabile Code-zu-Datei-Zuordnung dokumentieren. `first_release` wurde im Thread als zweite Version, Vorschlag 3 gewaehlt; beim Asset-Aufraeumen sicherstellen, dass diese v2-Quelle im Workspace liegt.
6. API/Contracts/Frontend gemeinsam aktualisieren: OpenAPI, frontend types, API helper, deutsche Labels, Icon-/Image-Mapping, Admin-Auswahl und public Fansub-Profil.
7. UI-Regel: Public Profil zeigt verdiente Count-Erfolge; Locked-Katalog nur bauen, wenn Produktentscheidung dafuer explizit ist. Manuelle Historie darf keine noch nicht verdienten Legendary-Erfolge vortaeuschen.
8. Tests/Checks: Migration up/down soweit lokal moeglich, Backend-Tests fuer Bedingungen, Frontend-Tests fuer Label/Icon-Mapping und locked/earned Sichtbarkeit, `typecheck`, relevante Tests und `git diff --check`.

Acceptance:

- Alle oben genannten normalen History-Typen sind im passenden DB-/API-/Frontend-Katalog verfuegbar.
- Project- und Release-Count-Erfolge sind getrennt von manueller Historie modelliert oder bewusst dokumentiert anders entschieden.
- Approved Badge-Grafiken werden aus einer stabilen Asset-Location geladen, nicht aus `tmp/`.
- 10000 Releases bleibt visuell und funktional ein extrem seltener Sonderrang.
- Keine Media-Ownership-Regeln werden verletzt; keine Release-/Fansub-Daten werden an die falsche Domain-Entitaet gehaengt.
