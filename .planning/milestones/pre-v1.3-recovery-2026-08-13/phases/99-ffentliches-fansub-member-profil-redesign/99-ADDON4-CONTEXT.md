# Phase 99 – Add-on 4: Öffentliche Gruppen-, Projekt- & Release-Detailseite – Context

**Gathered:** 2026-07-08
**Status:** Ready for planning
**Source:** Nutzer-Spezifikation (Add-on 4) + read-only Codebase-Analyse (Teil A/B geklärt)
**Scope note:** Eigenständiger Add-on-Scope, wird als zusätzliche Pläne `99-05+` an Phase 99 angehängt. Der ID-Namespace `AO4-*` ist bewusst getrennt von den Member-Profil-Decisions `D-01..D-20` derselben Phase. Das Decision-Coverage-Gate zitiert `AO4-*` in `must_haves.truths` (siehe Memory: eigener Tracking-Namespace kann Post-Planning-Gap-Fehlalarm auslösen; echtes Gate ist Decision-Coverage).

<domain>
## Phase Boundary

Überarbeitung der drei zusammenhängenden öffentlichen Seiten Gruppe, Projekt und Release plus eine **neue** Release-Detailseite. Gemeinsame strukturelle Fehler (tote Tab-Reste, leere Boxen, geleakte Backend-nahe Fehlermeldung, widersprüchliche Mitgliederzahlen) werden bereinigt; die Release-Detailansicht wird neu gebaut. Die Seiten verlinken aufeinander.

**In-Scope-Seiten (bestehend):**
- Projekt-/Gruppenseite: `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` (+ `sections/`)
- Release-Listenseite: `frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx`
- Fansub-Gruppenprofil: `frontend/src/app/fansubs/[slug]/page.tsx` (Kennzahlen-Konsistenz)

**Neu zu bauen:**
- Release-Detailroute: `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/`
- Aggregierender Public-Release-Endpoint (Backend) — existiert noch nicht.

**Wichtiger Ausgangsbefund:** Tabs existieren NICHT mehr — beide Seiten nutzen bereits gestapelte Sektionen mit Sprung-Navigation. Der Scope verschiebt sich von „Tabs entfernen" auf **Reihenfolge-Umbau + Leerfall-Bereinigung + Einbettung + neue Detailseite**.
</domain>

<decisions>
## Implementation Decisions (locked)

### Backend / Daten

- **AO4-01 (Mitgliederzahl-Bugfix, einziger erlaubter Datenmodell-Bugfix):** Alle „Mitglieder"-Kennzahlen zählen aktuell ungefiltert die Legacy-Tabelle `fansub_members`:
  - `getGroupStats` → `backend/internal/repository/group_repository.go:92` (deckt Gruppen- UND Projekt-Kennzahl)
  - `MembersCount` → `backend/internal/repository/fansub_repository.go:1617` (Highlights)
  Fix: Zähler exakt an die tatsächlich **angezeigte** Team-Liste angleichen, sodass gilt: `Kennzahl == countVisibleTeamMembers(...)`.

  **WICHTIG — korrigierte Zählsemantik (Ground-Truth-Verifikation am Code, ersetzt eine frühere Fehlannahme):** Die angezeigte aktive Team-Liste stammt aus `listProjectionMembers` (`backend/internal/repository/domain_projection_repository.go:117-124`) und filtert **NUR** `fgm.status='active'` — es gibt **KEINEN** `profile_visibility='public'`-Zeilenfilter (Public wirkt dort ausschließlich auf den `member_slug`, nicht auf die Zeilen-Inklusion; kein `m.id IS NOT NULL`-Filter). `countVisibleTeamMembers` (`frontend/src/components/fansubs/FansubTeamSection.tsx:14-24`) zählt entsprechend **alle** aktiven Mitglieder (inkl. memorial) plus die öffentlich sichtbaren historischen Mitglieder — **ohne** Sichtbarkeitsfilter auf die Zeilen-Inklusion.

  Daher zählt die neue Kennzahl:
  1. **Aktive Mitglieder:** `fansub_group_members` mit `status='active'` (JOIN `app_users` wie in `listProjectionMembers`), **OHNE** `profile_visibility='public'`-Filter — private/unclaimed aktive Mitglieder MÜSSEN mitgezählt werden, weil sie in der Liste angezeigt werden.
  2. **Historische Mitglieder:** öffentlich sichtbare historische (`hist_fansub_group_members` mit `status IN ('historical','confirmed')` und `visibility='public'`), analog `listProjectionHistorical` (`domain_projection_repository.go:186-188`) — damit die Kennzahl der über `/fansubs/[slug]` bereits konsistenten `countVisibleTeamMembers`-Definition entspricht.

  Ergebnis: Kennzahl Gruppe = Kennzahl Projekt = Kennzahl Highlights = Länge der angezeigten Team-Liste. Der pathologische Fall „0 Mitglieder trotz real 1 aktivem Mitglied" ist behoben — **auch** wenn dieses Mitglied privat/unclaimed ist. Referenz-Count für historische Zeilen: `anime_contributions_public_repository.go:275` (`COUNT(DISTINCT member_id) FROM hist_fansub_group_members WHERE visibility='public'`).

  **Test-Vorgabe (korrigiert):** „1 aktives Mitglied → Kennzahl 1" gilt unabhängig von `profile_visibility` (auch privat/unclaimed → 1). NICHT „nur öffentlich → 1" testen (das würde den Bug festschreiben). Zusätzlich Parität gegen die Summe aus aktiven + öffentlich-historischen Zeilen prüfen.

- **AO4-02 (Neuer aggregierender Public-Release-Endpoint):** Ein öffentlicher Endpoint, der zu einer `release_version_id` liefert: Kopf-Kennzahlen (Anzahl Bilder, Texte, Beteiligte, Veröffentlichungsdatum), Beteiligte (Name + Rolle), Bilder und Texte. Aggregationseinheit ist `release_versions` (NICHT `fansub_releases`). Quellen/Repos existieren bereits:
  - Bilder: `release_version_media` → `ListReleaseVersionMedia` (`release_version_media_repository.go:198`), FK `release_version_id`
  - Texte: `release_version_notes` (`release_version_notes_repository.go`), FK `release_version_id`, mit `member_id`+`role_id`, TipTap-Body
  - Beteiligte: `anime_contributions` (FK `release_version_id`); Lookup `anime_contributions_release_lookup_repository.go:46`
  Neuer Handler + Route + OpenAPI-Contract (`shared/contracts/`) + `frontend/src/lib/api.ts`-Funktion + TS-Typen. Kein Missbrauch der Legacy-`/releases/:id/images`-Endpoints (die behandeln `:id` als `episode_version_id`, nicht `release_version_id`).

- **AO4-03 (Cursor-Pagination, nur an 3 Stellen — additiv):** Cursor-basierte (Seek-)Pagination ausschließlich für die drei nachladenden Listen aus Anforderung 19:
  1. vollständige Release-Liste (Gruppen-/Projektseite)
  2. vollständige Bildergalerie (Release-Detailseite)
  3. vollständige Textliste (Release-Detailseite)
  Bestehende Offset-Endpunkte bleiben unangetastet. Für die Release-Liste den Cursor-Modus **additiv** neben die bestehende Offset-`releases/page.tsx` legen (alte Seite darf nicht brechen). Cursor-Basis für die Release-Liste ist der bereits stabile, eindeutige Sortierschlüssel `ORDER BY CAST(e.episode_number AS INTEGER) ASC, rev.id ASC` (`group_repository.go:172`) → zusammengesetzter Cursor `(episode_number, rev.id)`. Für Bilder/Texte je eindeutiges `(display_order|created_at, id)`. Keine globale Umstellung anderer Listen (Members, Admin, Anime, Comments bleiben Offset).

- **AO4-04 (OP/ED/Middle-Zeitcodes ins Public-DTO):** Die Zeitcodes liegen bereits in der DB vor — `theme_segments.start_time`/`end_time` (`interval`, migration 0049) und Sekunden-Offsets in `theme_segment_playback_sources` (migration 0054). Der Public-Themes-Read (`group_themes_repository.go:49`, Mapping `opening→OP`/`ending→ED`/`insert_song→MIDDLE`) liefert bislang Thumbnails, aber KEINE Zeitcodes. Zeitcodes ins Public-DTO `PublicGroupTheme` (`group_themes_repository.go:34`) aufnehmen. KEINE Berechnung, KEINE hartkodierten Platzhalter. KEIN Video-Player — nur Vorschaubild + Zeitcode + Typ-Tag.

- **AO4-05 (Bildtyp-Taxonomie = bestehende 4 Enum-Werte):** Typ-Tags aus dem bestehenden CHECK-Constraint `release_version_media.category`: `screenshot`, `typesetting_karaoke`, `fun_outtake`, `other`, mit deutschen Labels (Screenshot / Typesetting & Karaoke / Fun & Outtake / Sonstiges). Frontend-Union + Labels existieren: `frontend/src/types/releaseVersionMedia.ts` (`CATEGORY_LABELS`, `CATEGORY_ALLOWS_PREVIEW`). KEINE Datenmodell-Änderung (kein neues Encoding/Behind-the-Scenes-Enum).

### Frontend — Gruppenseite (A)

- **AO4-06 (Reihenfolge + Stat-Zeile):** Durchgehender Scroll, Reihenfolge Hero → Laufende Projekte → Team → Geschichte → Erfolge. Kennzahlen (Projekte/Releases/Mitglieder) als kompakte Stat-Zeile im Hero statt separater Leerkarten. (Tabs bereits aufgelöst — nur Reihenfolge/Verdichtung.)
- **AO4-07 (Leerfall-Bereinigung):** Leere Sektionen (Externe Mitwirkende, Medien, Gruppenleitung, Mehr) NICHT einzeln rendern. Stattdessen ein einziger Sammel-Hinweis am Ende, und nur falls tatsächlich etwas fehlt. Geschichte nur rendern, wenn Text vorhanden.
- **AO4-08 (Subgroups-Fehlermeldung entfernen):** Der hartcodierte Frontend-Text „…kein passender Subgroups-Ordner gefunden…" (`frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx:134` sowie zweite Kopie `frontend/src/components/groups/GroupAssetsExperience.tsx:135`) darf NICHT im öffentlichen UI erscheinen. Bei fehlendem Jellyfin-Ordner (Backend gibt still leeres Payload zurück, `group_assets_jellyfin.go:70`) die Asset-Sektion ausblenden und ggf. nur im Sammel-Hinweis (AO4-07) erwähnen.

### Frontend — Projektseite (B)

- **AO4-09 (Hero-Backdrop):** Verlaufs-Overlay statt Vollflächen-Abdunklung; Poster bleibt erkennbar. Durchgehender Scroll.
- **AO4-10 (Beschriftete Navigation):** Projekt-Navigationspfeile erhalten Beschriftung „Weitere Projekte von [Gruppe]" statt unbeschrifteter Pfeile.
- **AO4-11 (Neuestes Release eingebettet):** Titel, Datum, Kennzahlen (Bilder/Texte/Beteiligte-Anzahl), 3–4 Bild-Vorschauen (+X-Kachel für den Rest), 2 Text-Vorschauen, Beteiligten-Avatare, Link „Vollständiges Release ansehen" → Release-Detailseite (AO4-15).
- **AO4-12 (Ältere Releases als Liste):** Kompakte Liste (Name, Bild-/Text-Anzahl, Link), kein Vorschau-Overload für alle Releases. Nachladen via Infinite Scroll (Cursor, AO4-03) + „Mehr laden"-Button.
- **AO4-13 (Reihenfolge):** Hero → Aktionen → Geschichte (nur mit Inhalt) → Neuestes Release (eingebettet) → Weitere Releases (Liste) → Sammel-Hinweis für leere Sektionen → Mehr entdecken.
- **AO4-14 (Keine technische Fehlermeldung öffentlich):** Bei fehlendem Datensatz Sektion ausblenden oder generische, nutzerverständliche Meldung — nie technischer Text (siehe AO4-08).

### Frontend — Neue Release-Detailseite (C)

- **AO4-15 (Route):** Neue eigenständige öffentliche Seite pro Release: `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx`, verlinkt von der Projektseite (AO4-11). Nutzt den aggregierenden Endpoint (AO4-02). (Nicht über die bestehende `episodes/[id]?releaseId=`-Umleitung.)
- **AO4-16 (Hero-Kennzahlen):** Anzahl Bilder, Texte, Beteiligte, Veröffentlichungsdatum.
- **AO4-17 (Beteiligte):** Horizontale Avatar-Reihe mit Name + Rolle.
- **AO4-18 (Bildergalerie):** Vollständige Galerie als Grid; pro Bild Typ-Tag (AO4-05) und Autor-Chip sichtbar. Nachladen via Infinite Scroll (Cursor) + „Mehr laden"-Button.
- **AO4-19 (Textbeiträge):** Vollständige Liste als Karten mit Avatar, Name, Zeitpunkt, Inhalt. Nachladen via Infinite Scroll (Cursor) + „Mehr laden"-Button.
- **AO4-20 (OP/ED/Middle-Timeline):** Aus dem zugehörigen Projekt: Vorschaubild, Zeitcode (AO4-04), Typ-Tag. KEIN Video-Player, nur Vorschau-Darstellung.

### Performance / Ladeverhalten (D — alle Seiten)

- **AO4-21 (Infinite Scroll nur definiert):** Infinite Scroll ausschließlich für die drei Listen aus AO4-03. NICHT auf den Hauptseiten selbst (dort folgt nach der Vorschau weiterer relevanter Content).
- **AO4-22 (Lazy Loading + Skeleton):** `loading="lazy"` für alle Galerie-Bilder und Avatare, inkl. Platzhalter/Skeleton während des Ladens, um Layout-Sprünge zu vermeiden (feste Aspect-Ratio-Boxen).
- **AO4-23 (Responsive Images):** `srcset`/`sizes` für Galerie- und Hero-Bilder, damit mobile Clients keine Desktop-Auflösung laden.
- **AO4-24 (Cursor statt Offset):** Nachladende Listen cursor-basiert (siehe AO4-03), nicht offset-basiert.
- **AO4-25 („Mehr laden"-Fallback):** Manueller „Mehr laden"-Button zusätzlich zum automatischen Nachladen (Accessibility, gezieltes Scrollen).

### Claude's Discretion
- Konkrete Cursor-Kodierung (Base64 des zusammengesetzten Schlüssels o.ä.), Response-Meta-Form (`next_cursor`/`has_more`), Skeleton-Markup und IntersectionObserver-Details, Grid-Spaltenzahlen, Aufteilung großer Komponenten zur Einhaltung des 450-Zeilen-Limits.
</decisions>

<canonical_refs>
## Canonical References

**Downstream-Agenten MÜSSEN diese vor Planung/Umsetzung lesen.**

### Backend – Kennzahlen / Mitglieder
- `backend/internal/repository/group_repository.go` — `getGroupStats:92`, Offset-Release-Query `:119-176` (Cursor-Basis `:172`)
- `backend/internal/repository/fansub_repository.go` — `MembersCount:1617`
- `backend/internal/repository/domain_projection_repository.go` — korrekte Mitglieder-Quelle/Filter `:99`
- `backend/internal/repository/anime_contributions_public_repository.go` — Referenz-Count `:275`

### Backend – Release-Aggregation
- `backend/internal/repository/release_version_media_repository.go` — `ListReleaseVersionMedia:198`
- `backend/internal/repository/release_version_notes_repository.go`
- `backend/internal/repository/anime_contributions_release_lookup_repository.go` — `:46`
- `backend/internal/repository/group_themes_repository.go` — Public-Themes `:49`, DTO `PublicGroupTheme:34`, Mapping `:59-64`
- `backend/internal/handlers/group_assets_jellyfin.go` — Leerfall-Verhalten `:70` (Jellyfin-Ordnersuche, nicht DB/FS)
- DB: `database/migrations/0059_release_version_media_schema.up.sql` (category CHECK), `0049_extend_theme_segments.up.sql` (Zeitcodes), `0054_theme_segment_playback_sources.up.sql` (Sekunden-Offsets)

### Frontend
- `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` — Sektions-Komposition `:104`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` — Subgroups-Text `:134`, `hasGroupFolder:48`
- `frontend/src/components/groups/GroupAssetsExperience.tsx` — zweite Text-Kopie `:135`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx` — Offset-Liste + `<Pagination>` `:544`
- `frontend/src/app/fansubs/[slug]/page.tsx` — Kennzahlen-Konsistenz
- `frontend/src/types/releaseVersionMedia.ts` — `CATEGORY_LABELS`, `CATEGORY_ALLOWS_PREVIEW`
- `frontend/src/lib/api.ts` — `getGroupReleases:6083`, `getGroupAssets:6106`, `getGroupContributors:6131`, `getGroupThemes:6152`, `getGroupReleaseMedia:6173`
- Design-System: `@/components/ui` (Pflicht), Showcase-Route `/dev/ui-system`
</canonical_refs>

<scope_fence>
## Scope Fence

**Erlaubt / Pflicht:**
- Globale `@/components/ui`-Primitives für jede user-facing UI (kein natives `<select>/<input>/<textarea>/<button>`).
- Produktionsdateien ≤ 450 Zeilen (bei Bedarf splitten).
- Korrekte deutsche Umlaute in allen user-facing Strings.
- Nur bestehende Team4s-Tokens/CSS-Variablen — keine neuen CSS-Klassen mit Ad-hoc-Farbwerten außerhalb des Tokensystems.
- Infinite Scroll NUR an den 3 definierten Stellen (AO4-21).
- Lazy Loading + Skeleton (AO4-22), srcset/sizes (AO4-23), „Mehr laden"-Fallback (AO4-25).

**Ausgeschlossen:**
- Kein echter Video-Player/Streaming für OP/ED/Middle.
- Keine Datenmodell-Änderung außer dem Mitgliederzahl-Bugfix (AO4-01).
- Keine Virtualisierung langer Listen (separater Auftrag bei Bedarf).
- Keine Änderung an der Member-Profilseite (bereits Add-on 2 / Phase-99-Kern).
- Keine globale Umstellung bestehender Offset-Endpunkte auf Cursor.
- Keine Layout-Vorgabe für befüllte „Externe Mitwirkende"/„Medien"-Sektionen (nur Leerfall-Bereinigung).
</scope_fence>

<success_criteria>
## Success Criteria (Akzeptanz)

- Keine Tab-Navigation auf Gruppen-/Projektseite (bereits Sektionen — bleibt so).
- Kennzahlen konsistent über alle drei Seiten (keine widersprüchlichen Mitgliederzahlen; kein „0 Mitglieder" bei real 1). [AO4-01]
- Keine technische Fehlermeldung im öffentlichen UI. [AO4-08/AO4-14]
- Neuestes Release auf der Projektseite mit Bild-/Text-/Beteiligten-Vorschau eingebettet. [AO4-11]
- Release-Detailseite existiert, erreichbar über Link von der Projektseite. [AO4-15]
- Release-Detailseite: vollständige Galerie mit Typ-Tag + Autor pro Bild. [AO4-18/AO4-05]
- Release-Detailseite: vollständige Textliste mit Autor + Zeitpunkt. [AO4-19]
- OP/ED/Middle-Timeline vorhanden, ohne Video-Player. [AO4-20]
- Infinite Scroll nur an den definierten Stellen. [AO4-21]
- Lazy Loading + Platzhalter aktiv, kein Layout-Sprung. [AO4-22]
- „Mehr laden"-Button als Fallback vorhanden. [AO4-25]
- Keine neuen CSS-Klassen/Farbwerte außerhalb des Team4s-Tokensystems.
</success_criteria>

---

*Phase: 99 – Add-on 4 (angehängt)*
*Context gathered: 2026-07-08 (Teil A/B geklärt via read-only Analyse)*
