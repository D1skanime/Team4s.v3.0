# Phase 156: Segment-Domain-Konsistenz und oeffentliche Release-Projektion — Context

**Gathered:** 2026-09-11
**Status:** Ready for planning
**Source:** `156-USER-REQUEST.md` (verbindliche Auftragsquelle, vom Nutzer als Ersatz für eine interaktive discuss-phase-Sitzung bereitgestellt)

<domain>
## Phase Boundary

Phase 155 hat die öffentliche Fansub-Projektseite auf einen gezielten Read-Model-Resolver umgestellt.
Phase 156 nimmt sich die **fachliche Semantik der Kara-/Theme-Segmente** vor, die quer über Admin-
Segmentverwaltung, Projektseite, Release-Detailseite und segmentbezogene Credits auseinanderdriftet.

Phase 156 ist eine **Domain-Konsistenz-, Datenmodell- und Projektionsphase**. Kein UI-Redesign.
Sichtbare Informationen ändern sich nur dort, wo neue fachliche Semantik sichtbar gemacht werden
muss („gilt Folge 1–10", „seit Folge 1", Credits, Origin).

Sieben Workstreams:

- **A — Assignment-Synchronisation:** `theme_segment_assignments` wird die kanonische Wahrheit;
  Bereichsänderungen erzeugen eine Soll-Menge statt rein additiver Zuweisung.
- **B — Auto-Assignment neuer Release-Versionen:** eine später angelegte Release-Version innerhalb
  eines bestehenden Segmentbereichs bekommt ihr Assignment automatisch.
- **C — Segment-Origin:** stabile, administrativ korrigierbare Origin-Referenz je Segment inkl.
  Migration und dokumentiertem Backfill.
- **D — Zentrale Segment-Credit-Semantik:** Rollen-Codes statt Label-Substring-Heuristik, an genau
  einer Stelle definiert; dynamische Projektion aus den aktuellen Origin-Release-Credits.
- **E — Projektseite:** Segmentableitung aus Assignments statt aus `start_episode`/`end_episode`;
  Anzeige nur beim ersten Auftreten bzw. Segmentwechsel.
- **F — Release-Seite:** alle tatsächlich zugewiesenen Segmente mit Range-/Origin-Kennzeichnung;
  Member-Links im Projektkontext auf die Projekt-Member-Route.
- **G — Tests, Query-Budget, Indizes, Vorher/Nachher-Bericht.**

**Explizit KEIN Umsetzungsziel:** Redesign der Projekt- oder Release-Seite, dauerhafte Kopie von
Credits in Segmenttabellen, neue Rollen, neue parallele Rollen-Mappings im Frontend, Media-/Release-
Probleme außerhalb der Segmente, Wiederholung von Phase 155, RCA-04.
</domain>

<decisions>
## Implementation Decisions

Die folgenden Ist-Zustände sind am Code auf `team4s-linux` vorgeprüft und belegt. Sie sind die
Faktenbasis der Planung; Abweichungen beim Planen sind mit neuem Codebeleg zu begründen.

### Workstream A — Assignment-Synchronisation (P156-01, P156-02, P156-03)

- **Belegter Ist-Zustand:** `backend/internal/repository/theme_segment_assignments.go:57-185`
  (`AssignThemeSegmentToEpisodeRange`) ist per Kommentar und Implementierung **ausdrücklich additiv**:
  „ADDITIV: bestehende Zuweisungen ausserhalb des Bereichs werden NICHT entfernt". Aufgerufen wird sie
  aus `backend/internal/handlers/admin_content_anime_theme_segments.go:338` (Create) und `:552` (Update).
  Eine Bereichsverkürzung lässt damit veraltete Assignments stehen.
- Die Funktion wird zu einer **Soll-Ist-Synchronisation**: Zielmenge über dieselbe Join-Kette
  enumerieren (Anime, Gruppe, Version, Episoden-Sortindex), fehlende Assignments anlegen, überzählige
  Assignments desselben Segments innerhalb derselben Anime/Gruppe/Version-Domäne kontrolliert
  entfernen. Der Rückgabewert für den Render-Fan-out (nur *neu* zugewiesene IDs) bleibt erhalten; die
  entfernten IDs kommen als zweites Ergebnis dazu, damit Aufräumarbeiten (Render-Cache, Playback-
  Quellen) gezielt möglich sind statt pauschal.
- Der bestehende **Guard bleibt zwingend**: bei `segmentID/animeID/fansubGroupID <= 0` oder
  `startEpisode/endEpisode <= 0` passiert nichts. Ein unvollständiger Bereich darf niemals als
  „Soll-Menge = leer" interpretiert werden und dadurch alle Assignments löschen. Das ist der
  gefährlichste Fehlerfall dieser Phase und braucht einen eigenen Test.
- Die Entfernung wirkt **nur auf Assignments derselben Anime/Gruppe/Version-Domäne**. Assignments, die
  nicht in dieser Enumerationsdomäne liegen, werden nicht angefasst.

### Workstream A2 — Schutz legitimer Overrides (P156-02)

- **Belegter Ist-Zustand:** Es existiert `theme_segment_episode_overrides`
  (`database/migrations/0142_theme_segment_episode_overrides.up.sql`): ein optionaler Zeit-Override je
  (Segment, Release-Version), per zusammengesetztem FK auf `theme_segment_assignments` mit
  `ON DELETE CASCADE`. Eine **Unterscheidung automatisch/manuell erzeugter Assignments existiert nicht** —
  `theme_segment_assignments` hat nur `id, theme_segment_id, release_version_id, created_at`.
- Ein vorhandener Zeit-Override ist der einzige heute vorhandene, belastbare Beleg bewusster
  redaktioneller Arbeit an genau dieser (Segment, Release-Version)-Kombination. **Bevorzugte
  Entscheidung:** Assignments mit vorhandenem Override werden von der automatischen Entfernung
  ausgenommen und stattdessen sichtbar gemeldet, statt still gelöscht zu werden (die CASCADE würde
  sonst die redaktionelle Arbeit mitreißen). Eine abweichende Lösung ist zulässig, wenn sie begründet,
  eindeutig und testbar ist.
- Eine **neue Herkunftsspalte** (`assignment_source` o. ä.) wird nur eingeführt, wenn die Planung
  einen realen Bedarf belegt, den der Override-Schutz nicht deckt. Keine neue Komplexität auf Vorrat.
- Ein bestehender manueller Einzelpfad ist `UnassignThemeSegmentFromReleaseVersion`
  (`theme_segment_assignments.go:186-210`); der bleibt erhalten.

### Workstream B — Auto-Assignment neuer Release-Versionen (P156-04)

- **Belegter Ist-Zustand:** Der einzige produktive Insert-Pfad für `release_versions` ist
  `backend/internal/repository/episode_import_repository_release_helpers.go:163`. Dort existiert heute
  keine Rückkopplung zu bestehenden Segmenten — ein nachträglich angelegtes Release innerhalb einer
  bestehenden Range bleibt dauerhaft ohne Assignment.
- Beim Anlegen einer Release-Version werden Anime, Gruppe, Version und Episodennummer bestimmt und
  alle passenden bestehenden Segmente in **einer gebündelten Abfrage** ermittelt; die fehlenden
  Assignments entstehen gebündelt, nicht in einer Schleife pro Segment.
- Die Episoden-Auflösung nutzt **exakt** das vorhandene Muster
  `COALESCE(ep.sort_index, CASE WHEN ep.episode_number ~ '^[0-9]+$' THEN ep.episode_number::int END)`
  und die Versionsnormalisierung `COALESCE(NULLIF(BTRIM(version),''),'v1')`, damit Segmentanlage und
  Release-Anlage bei gleichem Input dieselbe Menge sehen. Keine zweite Auflösungsregel.
- Beide Reihenfolgen müssen funktionieren: Segment zuerst / Release zuerst.

### Workstream C — Segment-Origin (P156-05, P156-06, P156-11)

- **Belegter Ist-Zustand:** `theme_segments` hat **keine** Origin-Spalte (Spalten: `id, theme_id,
  created_at, fansub_group_id, version, start_episode, end_episode, start_time, end_time,
  source_jellyfin_item_id, source_type, source_ref, source_label`). Eine gleichwertige bestehende
  Relation ist nicht vorhanden; `theme_segment_playback_sources.release_version_id` ist eine
  technische Playback-Bindung, keine fachliche Herkunft, und taugt nicht als Origin.
- Es wird eine **neue, nullable Spalte `origin_release_version_id`** auf `theme_segments` eingeführt
  (FK auf `release_versions`, `ON DELETE SET NULL`), plus Index. Nächste freie Migrationsnummer ist
  **0161** (letzte vorhandene: `0160_membership_baseline_pseudo_role`), mit funktionierender
  `.down.sql`.
- Die Spalte ist **nullable und korrigierbar**: eine administrative Änderung ist möglich und wird
  validiert (die Ziel-Release-Version muss dem Segment tatsächlich zugewiesen sein). Keine
  unveränderliche Momentaufnahme, kein Kopieren von Credits.
- **Backfill:** die Origin wird pro Segment aus den vorhandenen Assignments deterministisch abgeleitet
  (niedrigste Episode innerhalb der zugewiesenen Release-Versionen als konservativer Fallback). Die
  Strategie inkl. der Fälle ohne eindeutige Origin (Segment ohne Assignment → bleibt NULL) wird
  dokumentiert; NULL wird als „Origin nicht bestimmt" behandelt, nicht als Fehler.
- Solange `origin_release_version_id` NULL ist, zeigt die Darstellung „Credits noch nicht erfasst"
  bzw. den entsprechenden leeren Zustand — keine falsche Präzision.

### Workstream D — Zentrale Segment-Credit-Semantik (P156-07, P156-08, P156-09)

- **Belegter Ist-Zustand der Heuristik:**
  `backend/internal/repository/release_detail_public_repository_helpers.go:104-107` filtert
  `strings.ToLower(c.RoleLabel)` auf `strings.Contains(label, "kara") || strings.Contains(label, "typeset")`.
  Das funktioniert nur, weil `PublicReleaseContributor` (`release_detail_public_repository.go:34-40`)
  ausschließlich ein **kommagetrennt aggregiertes deutsches `RoleLabel`** trägt und keinen Rollen-Code.
- **Belegte Quelle der Rollen-Codes:** `loadPublicEffectiveContributors`
  (`backend/internal/repository/public_effective_contributors.go:43ff`) hat `acr.role_code` bereits in
  der Hand und aggregiert es per `ARRAY_AGG(DISTINCT COALESCE(rd.label_de, acr.role_code))` zu Labels
  weg. Dieselbe Funktion beliefert **beide** Flächen: Projektseite (`group_repository_cursor.go:254`)
  und Release-Seite (`release_detail_public_repository_helpers.go:295`). Sie ist damit der richtige
  einzelne Ort, an dem die Rollen-Codes erhalten bleiben müssen.
- Die Codes existieren als **stabiler Katalog** in `role_definitions` (per DB geprüft): `translator`
  (Übersetzung), `timer` (Timing), `karaoke_fx` (Karaoke-FX), `typesetter` (Typesetting), `encoder`
  (Encoding), `quality_checker` (Qualitätsprüfung) u. a. Es werden **keine neuen Rollen erfunden** und
  keine Katalogeinträge geändert.
- Die Menge der **segmentrelevanten Rollen-Codes** wird an **genau einer** zentralen Stelle im Backend
  definiert (Domain-/Permissions-Nachbarschaft, nicht im Repository, nicht im Handler, nicht im
  Frontend) und von dort konsumiert. Erwartete Menge laut Auftrag: `translator`, `timer`, `karaoke_fx`,
  `typesetter`. Ausgeschlossen: `encoder`, `quality_checker`.
- Das Frontend bekommt **fertig projizierte** Segment-Credits. Kein Rollen-Mapping im Frontend.
- Die Projektion ist **dynamisch**: sie liest bei jedem Request die aktuellen Credits der
  Origin-Release-Version. Eine Creditkorrektur wirkt ohne Segmentbearbeitung (Fälle A–D des Auftrags).

### Workstream E — Projektseite (P156-10, P156-12)

- **Belegter Ist-Zustand:** `backend/internal/repository/group_repository_cursor.go:290-330` leitet die
  Timeline-Segmente direkt aus dem Bereich ab
  (`ts.start_episode <= e.episode_number::int AND ts.end_episode >= …`) **und** klassifiziert den
  Segmenttyp per SQL-Substring-Heuristik (`LOWER(tt.name) LIKE '%op%'`, `'%kara%'` …) inklusive
  `is_karaoke`. Beides ist parallele Wahrheit zur Release-Seite.
- Die Ableitung wird auf `theme_segment_assignments` umgestellt. Die Range bleibt als **fachliche
  Gültigkeitsangabe** erhalten und wird für die Anzeige („gilt Folge 1–10") mitgeliefert, entscheidet
  aber nicht mehr über Existenz.
- **First-Occurrence-Regel:** ein Segment erscheint in der Projekt-Timeline nur bei seinem ersten
  zugewiesenen Release bzw. beim Segmentwechsel. Die Entscheidung beruht **ausschließlich** auf
  `theme_segment_id` und den Assignments — nicht auf Members, Rollen, Credits, Timing oder Rendering.
  Die Regel wird über die geordnete Assignment-Menge des Projekts bestimmt, gebündelt, nicht per
  Query je Release.
- Die Typklassifikation (`OP`/`ED`/`INSERT`/`MIDDLE`/`KARA`) wird kanonisch im Backend/in der Domäne
  entschieden statt per SQL-`LIKE` und per Frontend-Mapping.

### Workstream F — Release-Seite (P156-13, P156-14)

- **Belegter Ist-Zustand:** `loadReleaseSegments`
  (`release_detail_public_repository_helpers.go:83-120`) liest bereits über
  `theme_segment_assignments` — das ist die vorbildliche Seite. Sie **unterdrückt** aber anschließend
  über `suppressSegmentsAlreadyVisibleOnPreviousEpisode` jedes Segment, das schon der Vorfolge
  zugewiesen war (D-02 aus Phase 117). Genau diese Unterdrückung widerspricht Auftragsabschnitt 7:
  Release Folge 5 soll Segment A weiterhin zeigen.
- Die Unterdrückung auf der **Release-Seite** entfällt; die First-Occurrence-Regel gehört auf die
  **Projektseite**. Stattdessen wird das Segment fachlich gekennzeichnet („verwendet seit Folge 1",
  „gültig bis Folge 10"). Das ist eine bewusste, dokumentierte Ablösung der Phase-117-Entscheidung
  D-02 für diese Fläche — `DECISIONS.md` wird entsprechend ergänzt.
- Segmentbezogene Member-Links führen im Projektkontext auf
  `/fansubs/[groupSlug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]` (Muster aus Phase 155,
  P155-05), nicht auf `/members/[slug]`.

### Workstream F2 — ThemeTimeline (P156-15)

- **Belegter Ist-Zustand:**
  `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx:32-58`
  hält eine eigene fachliche Typwelt: Label-Map (`OP`, `ED`, `MIDDLE`, `KARA`) plus eine
  String-Schlüssel-Map über Varianten wie `'OP KARA'`, `'OPENING KARA'`, `'IN KARA'`, `'INSERT KARA'`,
  `'MIDDLE KARA'`, `'OTHER KARA'`. Das ist das Frontend-Gegenstück zur SQL-Heuristik aus Workstream E.
- Sobald Backend/Domäne einen kanonischen Typ liefert, rendert das Frontend nur noch. Rein
  **darstellerische** Zuordnungen (CSS-Klasse, Icon) dürfen im Frontend bleiben; fachliche
  Klassifikation nicht.
- Die Komponente hat 396 Zeilen — das 450-Zeilen-Limit ist einzuhalten, im Zweifel splitten.

### Workstream G — Performance, Indizes, Tests, Bericht (P156-16, P156-17, P156-18, P156-19)

- Kein N+1: keine Query je Segment, Member, Release oder Credit. Segmentdaten und Origin-Credits
  werden gebündelt geladen. Das Query-Budget wird auf der vorhandenen Counter-Infrastruktur gemessen,
  die Phase 154/155 bereits verwendet hat, und als **Regressionsschutz** beschriftet, nicht als
  Performancenachweis.
- **Vorhandene Indizes (geprüft):** `theme_segment_assignments` hat bereits
  `uq_theme_segment_assignments_segment_version`, `idx_theme_segment_assignments_release_version` und
  `idx_theme_segment_assignments_segment`; `theme_segments` hat
  `idx_theme_segment_ep_range (fansub_group_id, version, start_episode, end_episode)`,
  `idx_theme_segment_group`, `idx_theme_segment_theme`. Für die Auftragspunkte 21 ist damit vieles
  bereits abgedeckt — **neu** kommt allenfalls ein Index auf `origin_release_version_id` hinzu. Kein
  blindes Hinzufügen: jeder neue Index braucht einen Query-Plan-Beleg.
- Die Testmatrix aus den Auftragsabschnitten 25–28 ist Pflicht und wird vollständig abgedeckt, inkl.
  der Negativfälle (Encoding/QC erscheinen nicht) und des Guard-Falls „unvollständiger Bereich löscht
  nichts".
- Abschlussbericht mit Vorher/Nachher nach dem Muster von Phase 154/155 als eigenes Auditdokument.
- Öffentliche Sichtbarkeitsregeln bleiben unverändert; die Credit-Projektion nutzt ausschließlich die
  bereits öffentlich zulässige Menge aus `loadPublicEffectiveContributors` (`is_public`-Logik bleibt).
</decisions>

<deferred>
## Deferred

- Visuelles Redesign von Projekt- oder Release-Seite (Design-Politur kommt später).
- Weitere Media-/Release-Themen außerhalb der Segmente.
- `/media`-Route ohne Range-Header (Backlog seit Phase 154, bricht das Springen in Videos).
- RCA-04 aus Phase 154 (unreproduzierter Chrome-Tab-Absturz) bleibt offen.
- Wiederholung oder Nacharbeit an Phase 155.
- Neue Rollen oder Änderungen am Rollenkatalog `role_definitions`.
</deferred>

<scope_fence>
## Scope Fence

**In scope**
- `theme_segment_assignments` als kanonische Release↔Segment-Wahrheit
- Soll-Ist-Synchronisation der Assignments bei Bereichsänderung (Verkürzung entfernt, Erweiterung ergänzt)
- Schutz legitimer Overrides vor automatischer Entfernung
- Auto-Assignment neu angelegter Release-Versionen innerhalb bestehender Segmentbereiche
- Neue, nullable und korrigierbare `theme_segments.origin_release_version_id` inkl. Migration 0161 und Backfill
- Zentrale Definition der segmentrelevanten Rollen-Codes; Entfernung der Label-Substring-Heuristik
- Durchreichen der Rollen-Codes in `loadPublicEffectiveContributors`
- Dynamische Segment-Credit-Projektion aus den aktuellen Origin-Release-Credits
- Projektseite: Ableitung aus Assignments, Anzeige nur bei erstem Auftreten/Segmentwechsel
- Release-Seite: alle zugewiesenen Segmente mit Range-/Origin-Kennzeichnung
- Kanonische Segmenttypen aus Backend/Domäne statt SQL-`LIKE` und Frontend-Typwelt
- Member-Links im Projektkontext auf die Projekt-Member-Route
- Query-Budget-Messung, Indexprüfung mit Query-Plan-Beleg, Testmatrix, Vorher/Nachher-Bericht

**Out of scope**
- Redesign der Projekt- oder Release-Seite
- Dauerhafte Kopie von Credits in Segmenttabellen oder eine neue Segment-Credit-Tabelle
- Neue Rollen, neue Rechte, Änderungen an Visibility-Regeln
- Neue parallele Rollen-Mappings im Frontend
- Blinde Index-Migrationen ohne Query-Plan-Beleg
- Beschleunigungsversprechen ohne Messbeleg
- Media-/Release-Probleme außerhalb der Segmente, RCA-04, Phase-155-Nacharbeit
</scope_fence>
