# Phase 40: Text- und Notizsystem für Fansub-Plattform — Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Source:** PRD Express Path (inline PRD vom Nutzer)

<domain>
## Phase Boundary

Phase 40 liefert ein fachlich abgegrenztes Text-/Notizsystem für vier Ebenen der Fansub-Plattform:

1. **fansub_group_notes** — offizielle/redaktionelle Texte über eine Fansub-Gruppe
2. **member_group_stories** — persönliche Geschichten einzelner Mitglieder in einer Gruppe
3. **anime_fansub_project_notes** — Projekttext einer Gruppe zu einem konkreten Anime
4. **release_version_notes** — rollenbezogene Produktionsnotizen zu einer Release-Version

Nicht in dieser Phase: Episode-Texte, Segment-Texte, `fansub_group_member_notes`.

</domain>

<decisions>
## Implementation Decisions

### Grundregel: Erst prüfen, dann bauen
- Vor jeder neuen Tabelle / API / UI-Komponente: bestehende DB-Struktur, Migrationen, Backend und Frontend prüfen
- Vorhandene oder ähnlich benannte Strukturen wiederverwenden wenn fachlich passend
- Kein Doppelbau. Keine Übermodellierung.
- Texte werden in der DB gespeichert, nicht in externen Dateien

### Pflicht-Analyse vor Implementierung
- Vor Implementierung zwingend liefern: Vorhanden / Ähnlich vorhanden / Fehlt / Wiederverwenden / Neu bauen / Entscheidung / BLOCKER
- Insbesondere prüfen: member_episode_notes, release_member_roles, release_version_notes, episode_version_notes, release_notes, fansub_group_notes, member_group_stories, anime_fansub_project_notes, anime_fansub_groups, roles, members
- Prüfen: repositories für Notizen, Services, API-Endpunkte, DTOs, Validierungen, Rollenlogik, Markdown/HTML-Rendering, Sanitizing, Berechtigungslogik, Admin-Routen

### Rollenmodell: 11 Kernrollen (unveränderlich)
```
translator, editor, timer, typesetter, encoder, raw_provider,
quality_checker, project_lead, designer, admin, other
```
- song_translator → translator
- karaoke_timer → timer  
- fx_karaoke / karaoke_fx / kfx → typesetter
- qc / quality_check / quality_control → quality_checker
- raw / raw_hunter / source_provider → raw_provider
- projectlead / project_leader / project_manager → project_lead
- administrator / group_admin / web_admin → admin
- Alte Spezialrollen nicht mehr neu anbieten
- Historische Daten NICHT löschen

### fansub_group_notes
- Zweck: offizielle/redaktionelle Texte über Gruppe (Gruppengeschichte, Philosophie, Stil, Abschied)
- NICHT für: persönliche Member-Geschichten, Release-Produktionsnotizen, Anime-Beschreibungen
- Zielmodell: id, fansub_group_id, title, body_markdown, body_html, visibility, status, sort_order, created_by_user_id, updated_by_user_id, created_at, updated_at, deleted_at

### member_group_stories
- Zweck: persönliche Geschichten/Erinnerungen einzelner Mitglieder innerhalb einer Gruppe
- NICHT für: offizielle Gruppenbeschreibung, Release-Produktionsnotizen, technische Release-Details
- role_id ist nullable (optional)
- Zielmodell: id, fansub_group_id, member_id, role_id (nullable), title, body_markdown, body_html, visibility, status, sort_order, created_by_user_id, updated_by_user_id, created_at, updated_at, deleted_at
- KEINE dritte Tabelle fansub_group_member_notes bauen

### anime_fansub_project_notes
- Zweck: Projekttext einer Gruppe zu einem Anime (Was hat die Gruppe bei diesem Anime gemacht?)
- Fachlicher Kontext: anime_fansub_groups(anime_id, fansub_group_id)
- KEINE Note Types / Kategorien (kein project_history, production_note, role_note etc.)
- MVP: ein Haupttext pro anime_id + fansub_group_id
- member_id / role_id optional: nur ergänzen wenn fachlich wirklich mehrere Perspektiven gewünscht
- GUI zeigt Schreibimpulse als Hilfe (keine Pflichtfelder):
  ```
  Beschreibe hier das Fansubprojekt dieser Gruppe zu diesem Anime.
  Mögliche Fragen als Hilfe: Wie war dieses Fansubprojekt? Warum hat die Gruppe diesen Anime gemacht?
  Was war besonders? Wie lief die Arbeit? Gab es Coop? Gab es Re-Releases? Gab es Probleme/Abbrüche?
  Welche Rollen waren besonders wichtig? Schöne/schwierige Erinnerungen?
  ```
- Zielmodell: id, anime_id, fansub_group_id, title, body_markdown, body_html, visibility, status, sort_order, created_by_user_id, updated_by_user_id, created_at, updated_at, deleted_at

### release_version_notes
- Zweck: kurze rollenbezogene Produktionsnotizen (2–5 Sätze) eines Members/Rolle zu einer Release-Version
- Eindeutigkeitsregel: UNIQUE (release_version_id, member_id, role_id) WHERE deleted_at IS NULL
- Ein Member mit mehreren Rollen erhält pro Rolle ein eigenes Textfeld
- Nur beteiligte Member/Rollen anzeigen (aus release_member_roles oder Editor-Context)
- Status: draft / published / archived / deleted (bestehende Projektkonvention prüfen)
- Visibility: public / internal (bestehende Konvention prüfen)
- Zielmodell: id, release_version_id, member_id, role_id, title (nullable), body_markdown, body_html, visibility, status, sort_order, created_by_user_id, updated_by_user_id, created_at, updated_at, deleted_at
- UI-Bereich: "Notizen / Beiträge" im Release-Version-Editor
- Allgemeiner Hinweis: "Diese Notizen beschreiben die konkrete Release-Version. Schreibe kurz, was du in deiner Rolle gemacht hast oder was an dieser Ausgabe besonders war. 2–5 Sätze reichen."

### Hilfetexte pro Rolle (vollständig, unveränderlich)
| Rolle | Label | Hilfetext | Placeholder |
|-------|-------|-----------|-------------|
| translator | Übersetzung | Schreibe kurz, was an der Übersetzung dieser Version besonders war: Dialogstil, Begriffe, Songtexte, Schilder... | Beispiel: Bei dieser Version wurden die Dialoge etwas freier übersetzt... |
| editor | Editing | Schreibe kurz, was du sprachlich verbessert hast: Lesbarkeit, Stil, Charakterstimmen... | Beispiel: Das Editing wurde überarbeitet, damit die Dialoge flüssiger klingen... |
| timer | Timing | Schreibe kurz, was am Timing besonders war: Dialog-Timing, Karaoke-Timing, Lesbarkeit... | Beispiel: Das Timing wurde für diese Version neu angepasst... |
| typesetter | Typesetting / FX | Schreibe kurz, was du visuell umgesetzt hast: Signs, Overlays, Fonts, Karaoke-FX... | Beispiel: Für diese Version wurden mehrere Signs, Overlays und Karaoke-FX angepasst... |
| encoder | Encoding | Schreibe kurz, was an dieser technischen Ausgabe besonders war: 8bit/10bit, MP4/MKV... | Beispiel: Diese Ausgabe wurde als 10bit-MKV mit Softsubs erstellt... |
| raw_provider | Raw-Bereitstellung | Schreibe kurz, was zur Quelle wichtig ist: Herkunft, Qualität, Probleme, bessere Quelle... | Beispiel: Für diese Version wurde eine bessere Raw-Quelle verwendet... |
| quality_checker | Qualitätsprüfung | Schreibe kurz, worauf bei der Prüfung geachtet wurde: Übersetzung, Timing, Encoding... | Beispiel: Im QC wurden Timing, Rechtschreibung, Typesetting und Encode geprüft... |
| project_lead | Projektleitung | Schreibe kurz, warum diese Version veröffentlicht wurde: Koordination, Ziel, Re-Release... | Beispiel: Diese Version fasst die wichtigsten Korrekturen zusammen... |
| designer | Design | Schreibe kurz, welche visuellen Elemente du beigesteuert hast: Banner, Logos, Vorschaubilder... | Beispiel: Für diese Version wurden zusätzliche Grafiken erstellt... |
| admin | Administration | Schreibe kurz, was organisatorisch wichtig war: Archivierung, Upload, Metadaten... | Beispiel: Die Veröffentlichung wurde archiviert, korrekt zugeordnet... |
| other | Sonstiges | Nutze dieses Feld nur wenn der Beitrag nicht zu den Standardrollen passt. | Beispiel: Bei dieser Version gab es eine besondere Unterstützung... |

### Markdown / HTML / Sanitizing
- Primärquelle: body_markdown
- Gerendert: body_html
- Kein rohes unsanitisiertes HTML public ausgeben
- Wenn Markdown-Rendering/Sanitizing bereits existiert: verwenden
- Wenn nicht vorhanden: minimale sichere Lösung oder BLOCKER/TODO melden
- Leere Texte werden nicht public angezeigt

### Public-Darstellung
Public nur anzeigen bei: status=published, visibility=public, deleted_at IS NULL, body nicht leer
- Keine leeren Bereiche anzeigen
- Keine leeren Rollenblöcke anzeigen
- Sortierung: sort_order → created_at → title
- Release-Version-Notizen: Rollenreihenfolge translator→editor→timer→typesetter→encoder→raw_provider→quality_checker→project_lead→designer→admin→other

### API-Endpunkte
- Erst prüfen ob passende Endpunkte existieren (episode-versions/:versionId/notes, etc.)
- Wenn vorhanden: wiederverwenden oder minimal erweitern
- Routing-Konvention beibehalten (episode_versions vs release_versions)
- Bulk-Save sinnvoll wenn UI mehrere Textfelder gleichzeitig speichert

### Berechtigungen
- MVP: Admin-only Schreibrechte, in Funktionen kapseln für spätere Erweiterung
- requireReleaseVersionNoteWriteAccess / requireFansubGroupNoteWriteAccess etc. als eigene Funktionen
- Nicht überall requireAdmin() direkt streuen

### Textlängen
- release_version_notes: max. 2000-4000 Zeichen pro Notiz
- fansub_group_notes, member_group_stories, anime_fansub_project_notes: grösser erlaubt

### Nicht bauen
- fansub_group_member_notes (explizit verboten)
- episode_notes, segment_notes, theme_segment_notes
- Keine Note Types / Kategorien für anime_fansub_project_notes

### BLOCKER-Bedingungen
BLOCKER setzen wenn:
- Unklar ob vorhandene Tabelle bereits denselben Zweck erfüllt
- versionId Ziel unklar (release_versions.id oder andere Tabelle?)
- anime_fansub_groups FK-Struktur für Projekttexte unklar
- Member/Rollen-Zuordnung zur Release-Version nicht ermittelbar
- Markdown ohne Sanitizing public ausgegeben würde
- Migrationskonventionen unklar

### Claude's Discretion
- Konkrete Tabellenstruktur (bestehende vs neue Migration) nach Bestandsanalyse entscheiden
- API-Routing: bestehende Konvention aus Codebase ableiten
- Bulk-Save vs einzelne Endpunkte: nach Frontend-Save-Pattern entscheiden
- Markdown-Library: bestehende verwenden oder kleinste sichere Lösung
- Welche Bestandstabellen exakt für Rollen/Member-Zuordnung verwendet werden

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### DB-Schema und Domäne
- `docs/architecture/db-schema-fansub-domain.md` — Fansub-Domänen-Schema (FK-Struktur, anime_fansub_groups, release_versions, fansub_releases)
- `database/migrations/` — Alle historischen Migrationen (Bestandsanalyse)

### Backend-Struktur
- `backend/internal/handlers/` — Bestehende Handler-Patterns (admin_content_*, fansub_*, admin_content_fansub_releases_handlers.go)
- `backend/internal/repository/` — Bestehende Repositories
- `backend/internal/services/` — Bestehende Services
- `backend/cmd/server/main.go` — Handler-Registrierung und Routing

### Frontend-Struktur  
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — Fansub-Gruppen-Editor (Tab-Struktur, Save-Pattern)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` — Release-Version-Editor
- `frontend/src/lib/api.ts` — API-Client-Pattern

### Konventionen
- `AGENTS.md` — Projektregeln für Agenten
- `CLAUDE.md` — Projektkonventionen

</canonical_refs>

<specifics>
## Specific Ideas

### Bestandsanalyse-Pflicht-Output
Vor erster Migration/Code immer ausgeben:
```
Vorhanden: ...
Ähnlich vorhanden / anders benannt: ...
Fehlt: ...
Wiederverwenden: ...
Neu bauen: ...
Entscheidung: ...
BLOCKER: ja/nein
```

### Phasenstruktur (vorgeschlagen, nach Bestandsanalyse anpassen)
- Phase 1: Bestandsanalyse (DB, Backend, Frontend) → kein Code
- Phase 2: Rollenmodell prüfen/vereinheitlichen
- Phase 3: Datenmodell-Entscheidung + Migrationen
- Phase 4: Backend Repository/API
- Phase 5: Frontend Admin-Bereiche
- Phase 6: Public-Vorbereitung (Read-Queries)
- Phase 7: Tests und Checks

</specifics>

<deferred>
## Deferred Ideas

- Member-/Gruppenrechte für Schreibzugriff (MVP: Admin-only, spätere Erweiterung geplant)
- Kategorien/Note Types für anime_fansub_project_notes (explizit nicht in diesem Scope)
- fansub_group_member_notes (explizit nicht gebaut)
- Episode-Texte, Segment-Texte (explizit nicht in diesem Scope)
- Such-/Filterfunktion im Release-Version-Notiz-Bereich (nur wenn nötig)

</deferred>

---

*Phase: 40-text-und-notizsystem-fuer-fansub-plattform*
*Context gathered: 2026-05-11 via PRD Express Path*
