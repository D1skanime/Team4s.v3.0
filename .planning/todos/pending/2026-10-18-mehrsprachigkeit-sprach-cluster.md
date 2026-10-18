---
created: 2026-10-18T21:00:00+00:00
title: Mehrsprachigkeit plattformweit — zentrales Sprach-Cluster (erst ausdiskutieren, dann bauen)
area: platform-i18n-content
status: discuss-first
files:
  - database/migrations/0032_add_episode_titles_table.up.sql
  - backend/internal/repository/episode_import_repository_apply.go
  - backend/internal/repository/admin_content_episode.go
  - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx
---

## Auslöser

Frage des Nutzers am 18.10.2026: Wie passt man den Titel einer Episode nachträglich in anderen Sprachen an, fügt ihn hinzu oder ändert ihn?

## Befund (18.10.2026)

- Mehrsprachige Episodentitel liegen in `episode_titles` (episode_id, language_id, title; UNIQUE je Sprache). Bestand: de 361, en 357, ja 357.
- Die **einzige** Stelle, die dort schreibt, ist der Episoden-Import (`upsertImportEpisodeTitles`). Er überschreibt per Upsert ohne Schutz manueller Werte.
- **Kein Lesepfad:** Weder öffentliche Seiten noch die Admin-Bereiche lesen `episode_titles`. Angezeigt wird überall nur `episodes.title`.
- Das Bearbeiten-Formular (PATCH `/episodes/:id`) ändert nur `episodes.title`. Der de-Eintrag in `episode_titles` läuft dadurch auseinander.
- Es gibt keine UI und keinen API-Endpunkt, um Sprachtitel nachträglich zu pflegen.
- Vorhandene Sprachbasis: Tabelle `languages` (ja, en, de, fr, es, it, pt, zh, ko). Genutzt von `anime_titles`, `episode_titles`, `genre_names`, `tag_names` und `release_streams`/`streams` (Audio- und Untertitelsprache). Beschreibungen und andere Texte sind derzeit einsprachig.

## Nutzerwunsch (Richtung, NICHT entschieden)

Nicht als Einzel-Fix für Episodentitel bauen, sondern intelligent und plattformweit:
- Ein **allgemeines Sprach-Cluster**, in dem Admins Sprachen definieren und neue hinzufügen können.
- Die dort definierten Sprachen gelten automatisch für **alle** mehrsprachigen Inhalte: Anime-Titel, Episodentitel, Beschreibungen, Texte, Genres/Tags „usw., wo auch immer".
- Wirkt sich auf die ganze Seite aus (Anzeige je Sprache, Fallbacks).

## Offene Diskussionspunkte (vor jeder Planung mit dem Nutzer klären)

1. Welche Inhaltsarten werden mehrsprachig (Titel, Beschreibungen, Episodentitel, Release-Texte, Gruppen-/Profiltexte …)?
2. Ein generisches Übersetzungsmodell (eine Tabelle für alle Entitäten) oder weiterhin je Entität eine `*_titles`/`*_names`-Tabelle mit gemeinsamer Sprachverwaltung?
3. Verwaltung der Sprachen: aktiv/inaktiv, Reihenfolge, Standard- und Fallback-Sprache, wer darf Sprachen anlegen.
4. Anzeige öffentlich: Sprachwahl des Besuchers? Fallback-Kette (z. B. de → en → ja → Haupttitel)?
5. Verhältnis Haupttitel (`episodes.title`, `anime.title`) zur Sprachtabelle: ein Feld oder gekoppelt?
6. Datenhoheit: Manuelle Werte müssen Vorrang vor AniSearch/Jellyfin-Importen haben (Herkunft je Feld und Sprache?). Hängt mit der offenen Provenienz-Frage aus Quick 261018-l5r (Option 2) zusammen.
7. Admin-UX: eine einheitliche „Texte je Sprache"-Komponente aus `@/components/ui`, wiederverwendet überall.
8. Migration des Bestands: `episode_titles`-de gegen `episodes.title` angleichen.

## Wann

Später. Erst nach Phase 187 und erst nach einer eigenen Diskussionsrunde (Explore/Discuss). Voraussichtlich groß genug für einen eigenen Milestone. Kein Einzel-Quick-Fix für Episodentitel vorab.
