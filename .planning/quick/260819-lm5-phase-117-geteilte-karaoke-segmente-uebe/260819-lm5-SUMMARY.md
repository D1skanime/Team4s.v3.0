---
phase: quick-260819-lm5
plan: 01
subsystem: ui
tags: [nextjs, react, vitest, go, gin, postgres, admin, segmente, karaoke, jellyfin, phase-117-post-hoc-closure]
status: complete

# Dependency graph
requires:
  - phase: 117
    provides: "Backend fuer geteilte Karaoke-Segmente (assign/unassign + Per-Folge-Zeit-Override Endpoints, D-01/D-03), bereits vorhandene, teilweise verdrahtete Frontend-Helfer (useReleaseSegments.assignSegment/unassignSegment, formatAssignmentChipLabel, findAssignedEpisodeNumber) aus den Plaenen 117-01 bis 117-08. 117-09-PLAN.md (Regressions-/Live-UAT-Abschluss von Phase 117) wurde NIE ausgefuehrt (kein 117-09-SUMMARY.md existiert) -- dieser Quick-Task schliesst die dadurch liegen gebliebene admin-seitige Erreichbarkeitsluecke fuer D-01/D-03 post-hoc. Siehe .planning/milestones/pre-v1.3-recovery-2026-08-13/phases/117-kara-segment-zeit-override-anzeige/117-10-POST-HOC-CLOSURE.md"
provides:
  - "adoptSuggestion weist Segment-Vorschlaege jetzt der aktuellen Folge zu statt sie zu duplizieren"
  - "SegmentAssignmentsRow: Zuweisungs-Zeile mit Chips + Zuweisen-/Entfernen-Aktionen fuer JEDES Segment, nicht nur bereits geteilte"
  - "SegmentEditPanel Per-Folge-Zeit-Override ist start-only mit automatisch berechneter, angezeigter und gesendeter Endzeit"
  - "Bereich-Auto-Zuweisung beim Speichern (Create/Update): start_episode/end_episode weisen additiv alle Folgen im Bereich automatisch zu, kein separater Button"
  - "Segmente-Tabelle rendert auf Mobile (<=640px) als gestapelte Karten statt 6-Spalten-Tabelle, verhindert Page-Level-Horizontal-Scroll"
  - "Zuweisungs-Chips und Override-Switch/-Button markieren jetzt PRO Folge korrekt, ob GENAU DIESE Folge einen Zeit-Override hat (Korrektheits-Fix, nicht nur Kosmetik)"
affects: [admin-episode-versions-edit, segmente-tab, admin-content-handler, theme-segment-assignments-repository]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zuweisungs-UI als eigene kleine Komponente (SegmentAssignmentsRow.tsx) ausgelagert, um bestehende ueber-450-Zeilen-Altdateien nicht weiter wachsen zu lassen"
    - "Client-berechnete, abgeleitete Zeitwerte (computedOverrideEndTime) statt zweitem freien Eingabefeld -- reduziert Fehlerflaeche bei Per-Folge-Overrides"
    - "Additiv-only Auto-Zuweisung: ein Episodenbereich ist der alleinige Mechanismus fuer Fan-out-Zuweisung beim Speichern, niemals fuer automatisches Entziehen -- Entziehen bleibt eine bewusste manuelle Aktion"
    - "Responsive Tabelle-zu-Karten via reinem CSS-Reflow (data-label + ::before) statt bedingtem JS-Rendering -- haelt die DOM-Struktur und damit bestehende Testselektoren unveraendert"
    - "Segmentweite vs. Pro-Folge-Flags sind bewusst getrennte Datenfelder (HasEpisodeOverride vs. AssignedEpisodes[i].HasOverride) -- ein aggregiertes Segment-Flag darf NIE fuer eine Pro-Zuweisung-Entscheidung wiederverwendet werden"

key-files:
  created:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentAssignmentsRow.tsx
    - backend/internal/handlers/admin_content_anime_theme_segment_range_autoassign_test.go
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css
    - frontend/src/types/admin.ts
    - backend/internal/repository/theme_segment_assignments.go
    - backend/internal/repository/theme_segment_assignments_integration_test.go
    - backend/internal/repository/theme_segment_playback_resolution.go
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_content_anime_theme_segments.go
    - backend/internal/handlers/admin_content_anime_theme_segment_assignments_test.go
    - backend/internal/handlers/admin_content_fansub_releases_test.go

key-decisions:
  - "aria-label der Chip-Entfernen-Aktion nutzt die reine Episodennummer ('Zuweisung fuer Folge 7 entfernen'), nicht den vollen Chip-Label-Text -- vermeidet eine redundante 'Folge Folge 7'-Formulierung, die bei woertlicher Plan-Auslegung entstanden waere"
  - "adoptSuggestion ohne bekannte releaseVariantId ist ein No-Op (Zuweisung ohne Ziel-Release-Version ist unmoeglich); kein Fehlertext dafuer noetig, da dieser UI-Pfad releaseVariantId immer aus dem Editor-Kontext hat"
  - "Mobile-UAT-Fix (Runde 2): Drawer-Overflow-Ursache war eine feste 380px-Panel-Breite (breiter als 375px-Viewports) kombiniert mit der impliziten Flex-Item-Mindestbreite (min-width:auto) der Von/Bis- und Start/Ende-Zeitfelder in .panelFieldRow -- gefixt per CSS (min(380px,100vw), min-width:0, @media(max-width:480px) Stapeln statt Nebeneinander), keine Komponentenlogik-Aenderung noetig"
  - "Bereich-Auto-Zuweisung (Runde 3, Nutzer-Korrektur): KEIN separater 'Auf alle Folgen anwenden'-Button -- start_episode/end_episode SIND der Mechanismus, automatisch bei jedem Create/Update ausgefuehrt. Additiv-only: eine Bereichsverengung entfernt keine bestehenden Zuweisungen automatisch (verhindert stilles Loeschen ggf. bereits ueberschriebener Zuweisungen); manuelles Entfernen bleibt ueber die bestehende Unassign-Aktion moeglich"
  - "AssignThemeSegmentToEpisodeRange enumeriert Ziel-Release-Versionen ueber EXAKT dasselbe Join-Muster wie GetSegmentReleaseDuration, damit beide Stellen bei gleichem Input dieselbe Menge an Release-Versionen sehen (keine zweite, driftende Definition von 'Folgen im Bereich')"
  - "Fan-out-/Zuweisungsfehler der Bereich-Auto-Zuweisung sind NICHT fatal fuer die Create-/Update-Response -- das Segment ist bereits erfolgreich gespeichert, ein 500 waere irrefuehrend und ein Retry wuerde bei Create ein Duplikat-Segment anlegen"
  - "Mobile-UAT-Fix (Runde 4): die Segmente-TABELLE selbst (nicht der Drawer) verursachte Page-Level-Horizontal-Scroll bei ~375px (6 Spalten, Header/Aktionen abgeschnitten). Gefixt per reinem CSS-Reflow (@media max-width:640px: thead ausblenden, tr/td auf block/flex umstellen, data-label+::before als Label:Wert-Karten-Darstellung) statt bedingtem JS-Kartenrendering -- haelt bestehende Table-Testselektoren unveraendert gruen. .toolbar bekommt flex-wrap, damit der '+ Segment hinzufuegen'-Button auf Mobile umbricht statt abgeschnitten zu werden."
  - "KORREKTHEITS-BUG (Runde 5, kein Kosmetik-Thema): SegmentAssignmentsRow nutzte fuer JEDEN Zuweisungs-Chip das SEGMENT-WEITE has_episode_override (true, sobald IRGENDEINE Folge einen Override hat) -- ein Zeit-Override auf Folge 2 liess ALLE Folgen (1, 3-12, ...) faelschlich als 'verschoben' erscheinen. Fuehrte im echten Live-UAT bereits zu einer fehlerhaften Nutzeraktion (fast alle Zuweisungen faelschlich entfernt). Gefixt durch ein neues PRO-FOLGE-Feld AssignedEpisodes[i].HasOverride (Backend-Hydrierung + Frontend-Lookup); das segmentweite Flag bleibt fuer die Segment-Badge bestehen, wird aber NICHT mehr fuer Pro-Chip-Entscheidungen verwendet. Derselbe Fix wurde proaktiv auch auf SegmentEditPanel.tsx's Override-Switch-Initialzustand und 'Override entfernen'-Button-Sichtbarkeit angewendet (identisches Bug-Muster, waehrend der Untersuchung entdeckt, nicht explizit vom Koordinator angefordert, aber Rule 1 -- Bugfix)."
  - "Drawer-Overflow Runde 5 Zusatzanfrage: systematische automatisierte Reproduktion (Headless-Chromium gegen eine isolierte, aus dem echten CSS-Modul geladene Kopie des kompletten Drawer-Markups bei 375px, inkl. langer Testinhalte) fand KEINEN messbaren Overflow mehr mit dem Runde-2-Stand (.panel { overflow-x:hidden } + .panelFieldRow min-width:0) -- .panel selbst kann demnach aktuell keinen eigenen horizontalen Scrollbalken mehr zeigen. Trotzdem als Haertung ergaenzt: min-width:0 auf .panelSaveButton/.panelCancelButton (.panelActions ist ein ROW-Flex-Container) sowie auf .suggestionMeta (Vorschlaege-Leiste UEBER der Tabelle, ausserhalb des Drawers -- ein dort sichtbarer Seiten-Scrollbalken waere bei gleichzeitig geoeffnetem Drawer leicht als 'Drawer-Overflow' misszudeuten) + overflow-wrap:break-word auf .sourceHelpText/.suggestionMeta als generelle Absicherung."

patterns-established: []

requirements-completed: []

# Metrics
duration: ~2h30m ueber fuenf Runden (Task 1+2 + Mobile-Fix Drawer Runde 2 + Bereich-Auto-Zuweisung-Backend Runde 3 + Mobile-Fix Segmente-Tabelle Runde 4 + Pro-Folge-Override-Korrektheits-Fix + weitere Drawer-Haertung Runde 5); alle Runden vom Nutzer final bestaetigt ("approved")
completed: 2026-08-20
---

# Quick Task 260819-lm5: Geteilte Karaoke-Segmente ueber Folgen zuweisen Summary

**adoptSuggestion weist statt zu duplizieren; jedes Segment bekommt eine Zuweisungs-Zeile (Chips + Zuweisen/Entfernen); Per-Folge-Zeit-Override ist start-only mit automatisch berechneter Endzeit; ein Episodenbereich weist ein Segment jetzt beim Speichern automatisch und additiv allen Folgen im Bereich zu (kein Button); "verschoben"-Chip markiert jetzt korrekt NUR die tatsaechlich ueberschriebene Folge statt aller zugewiesenen Folgen (Korrektheits-Fix nach realer Fehlbedienung im Live-UAT); Mobile-Overflow im Segment-Edit-Drawer UND in der Segmente-Tabelle (Karten-Layout auf schmaler Breite) per CSS behoben. Alle fuenf Live-UAT-Runden vom Nutzer final bestaetigt ("approved") -- Plan abgeschlossen.**

## Phase-117-Bezug (WICHTIG -- post-hoc Luecken-Schluss)

Dieser Quick-Task schliesst einen **dokumentierten, aber nie GSD-abgenommenen Phase-117-Gap**, kein
neues Feature von Grund auf. Ursprung: `.planning/milestones/pre-v1.3-recovery-2026-08-13/phases/
117-kara-segment-zeit-override-anzeige/`. Phase 117 baute in den Plaenen 117-01 bis 117-08 das volle
Backend + einen Teil der Frontend-Verdrahtung fuer:

- **D-03** (geteiltes, pro-Release-Version zuweisbares Kara-Segment) -- Zuweisung an mehrere
  Release-Versionen, sichtbare "Geteiltes Segment"-Markierung.
- **D-01** (Per-Folge-Zeit-Override) -- eine Folge kann eine vom Basis-Segment abweichende Zeit
  erhalten, ohne ein eigenes Duplikat-Segment.

`117-09-PLAN.md` (der letzte Plan der Phase, "Regressions-/Live-UAT-Abschluss") sollte Phase 117 mit
einer vollstaendigen Regressionspruefung und der laut `117-VALIDATION.md` als "Manual-Only"
markierten Live-Verifikation abschliessen -- **wurde aber nie ausgefuehrt: es existiert kein
`117-09-SUMMARY.md`**. Dadurch blieb ein Teil der bereits gebauten D-01/D-03-Verdrahtung fuer Admins
faktisch unerreichbar (Henne-Ei-Problem: ein Segment wurde nie "shared", weil der einzige Weg dahin
-- die Zuweisung -- selbst hinter `is_shared === true` versteckt war; die Vorschlag-Uebernahme legte
zudem ein Duplikat-Segment an statt zuzuweisen). Diese Luecke fiel erst beim Durchtesten am
2026-08-19 auf und wurde als Quick-Task ausserhalb der formalen Phasen-Ausfuehrung geschlossen.

**Was dieser Quick-Task zusaetzlich zur reinen Luecken-Schliessung liefert (ueber die urspruengliche
117-Spec hinausgehend, aber D-03 direkt vervollstaendigend):** die neue **Bereich-Auto-Zuweisung**
(`start_episode`/`end_episode` treiben additiv/idempotent die Zuweisung beim Speichern) war in der
urspruenglichen Phase-117-Spec nicht vorgesehen -- vorher hatte der Episodenbereich am Segment
keinerlei Effekt auf Zuweisung/Playback. Diese Erweiterung wurde in Runde 3 vom Nutzer direkt
angefordert (nach Korrektur einer zwischenzeitlich erwogenen, dann verworfenen separaten
Button-Loesung).

Eine ausfuehrliche Post-Hoc-Closure-Notiz mit Cross-Referenz liegt bei:
`.planning/milestones/pre-v1.3-recovery-2026-08-13/phases/117-kara-segment-zeit-override-anzeige/
117-10-POST-HOC-CLOSURE.md`. Diese Notiz dokumentiert auch explizit, was NICHT erneut geprueft wurde
(Kein-Re-Encode-Beweis D-01, oeffentliche Release-Detailseiten-Entdopplung D-02, volle
`go test ./internal/...`-Regressionssuite) -- dieser Quick-Task deckte gezielt die admin-seitige
Bedienbarkeit von D-01/D-03 ab, nicht den vollen urspruenglichen 117-09-Scope.

## Performance

- **Duration:** ~2h30m ueber fuenf Runden (Task 1+2 automatisiert, Mobile-Fix Drawer nach erster Live-UAT-Rueckmeldung, Backend-Bereich-Auto-Zuweisung nach einer Nutzer-Korrektur einer zwischenzeitlich vorgeschlagenen, dann verworfenen Button-Idee, Mobile-Fix Segmente-Tabelle nach vierter Live-UAT-Rueckmeldung, Pro-Folge-Override-Korrektheits-Fix + weitere Drawer-Haertung nach fuenfter Live-UAT-Rueckmeldung)
- **Tasks:** 3/3 Plan-Tasks abgeschlossen (Task 1, Task 2, Task 3 [blockierender Live-UAT-Checkpoint, CONFIRMED]) + 5 vom Koordinator angeforderte Nacharbeiten ueber die Runden 2-5 (Mobile-Fix Drawer, Bereich-Auto-Zuweisung, Mobile-Fix Segmente-Tabelle, Pro-Folge-Override-Korrektheits-Fix, weitere Drawer-Haertung)
- **Files modified:** 16 (+ 2 neu erstellt)

## Accomplishments

- Vorschlag-Uebernahme (`adoptSuggestion`) ruft jetzt `assignSegment` statt `create()` auf -- legt kein Duplikat-Segment mehr an, sondern weist das existierende Segment der aktuell geoeffneten Folge zu. Bei Fehlschlag bleibt der Vorschlag sichtbar (kein Duplikat-Fallback).
- Neue Komponente `SegmentAssignmentsRow.tsx`: fuer JEDES Segment (nicht nur bereits geteilte) einsehbar via Toggle, zeigt Zuweisungs-Chips (inkl. "verschoben"-Markierung bei Zeit-Override), einen "Diese Folge (N) zuweisen"-Button (nur wenn die aktuelle Folge noch nicht zugewiesen ist) und pro Chip eine Entfernen-Aktion (deaktiviert, wenn nur noch eine Zuweisung uebrig ist -- kein Segment kann ueber die UI auf 0 Zuweisungen fallen).
- `formatAssignmentChipLabel` liefert jetzt "verschoben" statt "Zeit angepasst".
- `SegmentEditPanel.tsx`: Per-Folge-Zeit-Override ist start-only. Die Endzeit wird automatisch aus Basis-Dauer (Basis-Ende minus Basis-Start) berechnet, live als Info-Text angezeigt und beim Speichern formatiert an den bestehenden Override-Endpoint gesendet. Speichern wird deaktiviert (mit erklaerender Fehlermeldung), wenn die Basis-Zeit fehlt oder die berechnete Endzeit die bekannte Videodauer ueberschreitet.
- Alle neu eingefuehrten interaktiven Elemente (Zuweisen-Button, Entfernen-Button pro Chip) nutzen ausschliesslich `@/components/ui`-Primitives (`Button`, `Badge`, `FormField`, `Input`); kein neues natives `<button>`/`<input>`.
- **Mobile-Fix (nach erster Live-UAT-Rueckmeldung):** Horizontaler Overflow im Segment-Edit-Drawer auf schmalen Breiten (z. B. 375px) behoben -- Drawer-Breite ist jetzt `min(380px, 100vw)` statt fest 380px, `.panelFieldRow`-Kindfelder bekommen `min-width: 0` (verhindert die implizite Flex-Item-Mindestbreite, die Von/Bis- bzw. Start/Ende-Zeitfelder am Schrumpfen hinderte) und stapeln unter `@media (max-width: 480px)` untereinander statt nebeneinander. `SegmentAssignmentsRow.tsx` zusaetzlich mit `maxWidth`/`minWidth: 0`/`box-sizing` gegen Overflow abgesichert.
- **Bereich-Auto-Zuweisung (Backend, nach Nutzer-Korrektur):** Neue Repository-Methode `AssignThemeSegmentToEpisodeRange` (enumeriert Ziel-Release-Versionen ueber dasselbe Join-Muster wie `GetSegmentReleaseDuration`, additiv per `ON CONFLICT DO NOTHING` in einer Transaktion, liefert nur die NEU eingefuegten IDs zurueck). `CreateAnimeSegment`/`UpdateAnimeSegment` rufen sie nach erfolgreichem Speichern auf -- Update mit den EFFEKTIVEN (bereits gepatchten) Werten, nicht den rohen Request-Feldern -- und laden das Segment bei neuen Zuweisungen neu, damit `assigned_release_version_ids`/`is_shared` sofort in der Response stehen. Fan-out-/Zuweisungsfehler sind nicht fatal. Additiv-only: eine Bereichsverengung entfernt nie automatisch bestehende Zuweisungen.
- Hinweistext im Episodenbereich-Block von `SegmentEditPanel.tsx`: "Wird beim Speichern automatisch allen Folgen im Bereich zugewiesen -- pro Ausreisser-Folge kann die Startzeit einzeln ueberschrieben werden."
- **Mobile-Fix Segmente-Tabelle (nach vierter Live-UAT-Rueckmeldung):** Die "Aktive Segmente"-Tabelle (6 Spalten: Typ/Name/Episoden/Zeitbereich/Quelle/Aktionen) verursachte bei ~375px Page-Level-Horizontal-Scroll mit abgeschnittenen Spalten. Bei `<=640px` rendert sie jetzt als gestapelte Karten (ein Card pro Segment, Label:Wert je Feld via `data-label`-Attribut + CSS `::before`) statt der 6-Spalten-Tabelle -- reines CSS-Reflow derselben `<table>`-DOM-Struktur, keine bedingte JS-Rendering-Logik, bestehende Test-Selektoren bleiben unveraendert. Ab Tablet-Breite (`>640px`) greift wieder die normale Tabelle. Zusaetzlich bekommt `.toolbar` `flex-wrap`, damit der "+ Segment hinzufuegen"-Button auf schmaler Breite umbricht statt abgeschnitten zu werden.
- **Pro-Folge-Override-Korrektheits-Fix (nach fuenfter Live-UAT-Rueckmeldung, KEIN Kosmetik-Thema):** Neues Backend-Feld `AssignedEpisodes[i].HasOverride` (statt des segmentweiten `HasEpisodeOverride` fuer JEDEN Chip) sorgt dafuer, dass der "verschoben"-Chip nur auf der tatsaechlich ueberschriebenen Folge erscheint. Derselbe Fix wurde proaktiv auch auf `SegmentEditPanel.tsx`s Override-Switch-Initialzustand und "Override entfernen"-Button-Sichtbarkeit angewendet (gleiches Bug-Muster, waehrend der Untersuchung entdeckt).
- **Weitere Drawer-Overflow-Haertung (nach fuenfter Live-UAT-Rueckmeldung):** Systematische automatisierte Reproduktion (Headless-Chromium) fand keinen messbaren Overflow mehr innerhalb von `.panel`; trotzdem `min-width: 0` auf `.panelSaveButton`/`.panelCancelButton` sowie auf `.suggestionMeta` (Vorschlaege-Leiste ausserhalb des Drawers, potenzielle Fehlquelle fuer einen bei gleichzeitig geoeffnetem Drawer sichtbaren Seiten-Scrollbalken) plus `overflow-wrap: break-word` auf `.sourceHelpText`/`.suggestionMeta` ergaenzt.

## Task Commits

1. **Task 1: Assign-statt-Duplikat bei Vorschlag-Uebernahme + fuer jedes Segment sichtbare Zuweisungs-Zeile** - `5ec72a3e` (feat)
2. **Task 2: Start-only Per-Folge-Zeit-Override mit automatisch berechneter Endzeit** - `4ca2f8f0` (feat)
3. **Mobile-Fix (Runde 2) nach Live-UAT-Rueckmeldung: horizontaler Overflow im Segment-Edit-Drawer** - `7c5de5b3` (fix)
4. **Bereich-Auto-Zuweisung beim Speichern (Backend, Runde 3)** - `2c72c3f1` (feat)
5. **Hinweistext zur Bereich-Auto-Zuweisung im Segment-Formular (Frontend, Runde 3)** - `b36ec768` (docs -- UI-Copy-Ergaenzung, keine Logikaenderung)
6. **Mobile-Fix (Runde 4) nach Live-UAT-Rueckmeldung: Segmente-Tabelle als Karten statt Page-Level-Horizontal-Scroll** - `9d19de5c` (fix)
7. **Pro-Folge-Override-Markierung statt segmentweitem Flag (Backend+Frontend Korrektheits-Fix, Runde 5)** - `658c2f4d` (fix)
8. **Weitere Drawer-Overflow-Haertung fuer Mobile (Runde 5)** - `4c30cb7c` (fix)
9. **Task 3: Live-UAT geteilte Segmente ueber Folgen zuweisen + Start-only Zeit-Override + Bereich-Auto-Zuweisung + Mobile-Layout (Drawer + Tabelle) + Pro-Folge-Override-Markierung** - **CONFIRMED** ("approved" nach 5 Live-UAT-Runden auf `:3000`, siehe Plan-`<result>`-Block in `260819-lm5-PLAN.md`; kein eigener Commit, checkpoint:human-verify hat `files: none`)

**Alle 8 Code-Commits dieses Quick-Tasks, chronologisch:**

| # | Runde | Commit | Typ | Beschreibung |
|---|-------|--------|-----|--------------|
| 1 | 1 (Task 1) | `5ec72a3e` | feat | Assign statt Duplikat + Zuweisungs-Zeile fuer jedes Segment |
| 2 | 1 (Task 2) | `4ca2f8f0` | feat | Start-only Per-Folge-Zeit-Override |
| 3 | 2 | `7c5de5b3` | fix | Horizontaler Overflow im Segment-Edit-Drawer (Mobile) |
| 4 | 3 | `2c72c3f1` | feat | Bereich-Auto-Zuweisung beim Speichern (Backend) |
| 5 | 3 | `b36ec768` | docs | Hinweistext zur Bereich-Auto-Zuweisung im Segment-Formular |
| 6 | 4 | `9d19de5c` | fix | Segmente-Tabelle als Karten statt Page-Level-Horizontal-Scroll (Mobile) |
| 7 | 5 | `658c2f4d` | fix | Pro-Folge-Override-Markierung statt segmentweitem Flag (Korrektheits-Fix) |
| 8 | 5 | `4c30cb7c` | fix | Weitere Drawer-Overflow-Haertung fuer Mobile |

Zusaetzlich (nicht code, nicht in dieser Liste): der finale Docs-Commit (SUMMARY.md/STATE.md/
ROADMAP.md) wird vom Orchestrator separat erstellt, nicht vom Executor.

## Files Created/Modified

- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentAssignmentsRow.tsx` - Neu: Zuweisungs-Zeile (Chips + Zuweisen/Entfernen) fuer jedes Segment, primitives-only, 79 Zeilen; plus Mobile-Overflow-Absicherung (min-width/max-width/box-sizing)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx` - `adoptSuggestion` umgebaut (assign statt create), `assignmentBusySegmentId`-State + Handler, Zuweisungs-Toggle/-Zeile jetzt fuer jedes Segment sichtbar (kein `is_shared`-Gate mehr)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx` - `formatAssignmentChipLabel` liefert "verschoben" statt "Zeit angepasst"
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` - Override-Block auf Start-only mit automatisch berechneter, angezeigter Endzeit umgebaut; vereinfachte Override-Validierung; Hinweistext zur Bereich-Auto-Zuweisung im Episodenbereich-Block
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx` - 3 bestehende Tests aktualisiert (verschoben-Wortlaut, Toggle jetzt fuer jedes Segment, Chip-Label-Test) + 10 neue Behavior-Tests (Adopt-Zuweisung Erfolg/Fehlschlag, Zuweisen-Aktion, Entfernen-Aktion inkl. Letzter-Chip-Schutz, Override-Feld/-Berechnung/-Speichern/-Duration-Grenze)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css` - Mobile-Fix: `.panel` Breite `min(380px, 100vw)`, `.panelFieldRow`-Kindfelder `min-width: 0` + `@media (max-width: 480px)` Stapeln statt Nebeneinander
- `backend/internal/repository/theme_segment_assignments.go` - Neue Methode `AssignThemeSegmentToEpisodeRange` (additiv, transaktional, Guard bei ungueltigem Bereich/Kontext)
- `backend/internal/repository/theme_segment_assignments_integration_test.go` - Neuer Guard-Unit-Test (kein DB-Zugriff bei ungueltigem Bereich) + echter Postgres-Integrationstest (Zuweisung/Idempotenz/Additivitaet/Version-Scoping)
- `backend/internal/handlers/admin_content_handler.go` - `adminThemeRepository`-Interface um `AssignThemeSegmentToEpisodeRange` erweitert
- `backend/internal/handlers/admin_content_anime_theme_segments.go` - `CreateAnimeSegment`/`UpdateAnimeSegment` rufen die Bereich-Auto-Zuweisung nach erfolgreichem Speichern auf (non-fatal bei Fehler, bedingter Reload bei neuen Zuweisungen)
- `backend/internal/handlers/admin_content_anime_theme_segment_assignments_test.go` - `fakeSegmentAssignmentThemeRepo` um Fake-Methode ergaenzt (Interface-Kompatibilitaet)
- `backend/internal/handlers/admin_content_fansub_releases_test.go` - `fansubReleaseThemeRepoStub` um Fake-Methode ergaenzt (Interface-Kompatibilitaet)
- `backend/internal/handlers/admin_content_anime_theme_segment_range_autoassign_test.go` - Neu: 4 Handler-Tests (Create weist Range zu, Idempotenz ueberspringt Reload, Fan-out-Fehler ist non-fatal, Update nutzt effektive statt rohe Werte)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css` (Runde 4) - `@media (max-width: 640px)`-Block wandelt die Segmente-Tabelle in gestapelte Karten um (thead ausgeblendet, tr/td auf block/flex, `[data-label]::before` als Label:Wert-Darstellung, `[colspan]`-Zeilen ausgenommen); `.toolbar` bekommt `flex-wrap`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx` (Runde 4) - `data-label`-Attribute auf den 6 Daten-Zellen pro Segmentzeile (rein deklarativ, keine Logikaenderung)
- `backend/internal/models/admin_anime_themes.go` (Runde 5) - `AdminThemeSegmentAssignmentEpisode` bekommt `HasOverride bool`
- `backend/internal/repository/theme_segment_playback_resolution.go` (Runde 5) - `hydrateSegmentAssignmentMetadataList` liest `release_version_id` aus den Override-Zeilen mit und markiert PRO Folge statt nur segmentweit
- `backend/internal/repository/theme_segment_assignments_integration_test.go` (Runde 5) - Neuer echter Postgres-Integrationstest (12 Folgen, Override nur auf Folge 2) beweist die Pro-Folge-Isolation
- `frontend/src/types/admin.ts` (Runde 5) - `assigned_episodes`-Eintraege fuehren jetzt `has_override: boolean`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx` (Runde 5) - neuer `findAssignedEpisodeHasOverride`-Lookup
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentAssignmentsRow.tsx` (Runde 5) - `chipVariant`/`chipLabel` leiten sich jetzt PRO Folge aus `assigned_episodes` ab statt aus dem segmentweiten Flag
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` (Runde 5) - Override-Switch-Initialzustand + "Override entfernen"-Button pruefen jetzt die AKTUELL geoeffnete Folge statt des segmentweiten Flags
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx` (Runde 5) - bestehende Fixtures auf gemischte Override-Szenarien umgestellt + 3 neue Tests, die das Pro-Folge-Verhalten pinnen
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css` (Runde 5) - weitere Drawer-Haertung: `min-width: 0` auf `.panelSaveButton`/`.panelCancelButton`/`.suggestionMeta`, `overflow-wrap: break-word` auf `.sourceHelpText`/`.suggestionMeta`, `flex-wrap` auf `.suggestionItem`

## Decisions Made

- aria-label der Chip-Entfernen-Aktion nutzt nur die Episodennummer statt des vollen Chip-Labels, um eine redundante "Zuweisung fuer Folge Folge 7 entfernen"-Formulierung zu vermeiden (Sprachqualitaets-Feinschliff waehrend der Implementierung, siehe CLAUDE.md Sprachqualitaet-Vorgabe).
- `adoptSuggestion` ist ohne bekannte `releaseVariantId` ein stiller No-Op (kein Zuweisungsziel vorhanden); dieser UI-Pfad hat im Editor-Kontext immer eine `releaseVariantId`, daher keine zusaetzliche Fehlermeldung noetig.
- Root-Cause-Analyse des Mobile-Overflows: zwei kombinierte Ursachen -- (1) `.panel` hatte eine feste `width: 380px`, breiter als z. B. ein 375px-Viewport; (2) `.panelFieldRow`-Kindfelder (Von/Bis-, Start/Ende-Zeitfelder) hatten kein `min-width: 0`, wodurch die implizite Flex-Item-Mindestbreite (`min-width: auto`) verhinderte, dass die nativen `<input>`-Elemente unter ihre intrinsische Inhaltsbreite schrumpften. Reiner CSS-Fix, keine Komponentenlogik-Aenderung noetig -- die `@/components/ui`-Primitives (`Input`/`.control`) hatten bereits `min-width: 0` eingebaut und waren nicht betroffen.
- **Bereich-Auto-Zuweisung ist additiv-only per Design** (explizite Nutzer-Vorgabe): eine Bereichsverengung (z. B. 1-26 -> 1-12) entfernt NICHT automatisch Zuweisungen fuer Folgen 13-26. Das verhindert stilles Loeschen von ggf. bereits mit individuellem Zeit-Override versehenen Zuweisungen. Manuelles Entfernen bleibt ueber die bestehende "X"-Aktion in `SegmentAssignmentsRow` moeglich (Feinsteuerung fuer Ausreisser).
- `AssignThemeSegmentToEpisodeRange` enumeriert Ziel-Release-Versionen ueber EXAKT dasselbe Join-Muster wie `GetSegmentReleaseDuration` (`release_version_groups` -> `release_versions` (versions-gescopt) -> `fansub_releases` -> `episodes`, `COALESCE(ep.sort_index, ...)`-Bereichspruefung) -- verhindert eine zweite, driftende Definition von "Folgen im Bereich" zwischen Zeit-Validierung und Auto-Zuweisung.
- Fan-out-/Zuweisungsfehler der Bereich-Auto-Zuweisung sind bei Create UND Update nicht fatal fuer die Speicher-Response (nur `log.Printf`) -- das Segment ist zu diesem Zeitpunkt bereits erfolgreich gespeichert; ein 500 waere irrefuehrend, und bei Create wuerde ein Retry ein Duplikat-Segment anlegen.
- **Root-Cause-Analyse des zweiten Mobile-Overflows (Runde 4):** die Segmente-Tabelle hatte technisch bereits einen `overflow-x: auto`-Wrapper (`.tableWrapper`), aber `.tableHeader th { white-space: nowrap; }` erzwang eine Mindestbreite von 6 nicht umbrechenden Spaltenkoepfen, die zusammen mit dem umgebenden Flex-Layout (`.tabContent`) die gesamte Seite statt nur die Tabelle zum Scrollen brachte. Statt den Wrapper-Overflow zu debuggen, wurde die robustere, vom Koordinator bevorzugte Loesung gewaehlt: Karten-Layout via CSS-Reflow (kein JS-Conditional-Rendering), da es das strukturelle Problem (6 Spalten passen nicht auf 375px) direkt loest statt nur zu kaschieren.
- Die `data-label`-Attribute wurden bewusst NICHT auf die beiden `colSpan={6}`-Vollbreite-Zeilen (Leerer-Zustand-Hinweis, aufgeklappte `SegmentAssignmentsRow`) angewendet -- diese behalten ihr bestehendes Block-Layout via CSS-Selektor `[colspan]` statt der Label:Wert-Flex-Darstellung, die dort keinen Sinn ergeben wuerde.
- **KORREKTHEITS-Root-Cause (Runde 5):** `SegmentAssignmentsRow.tsx` und `SegmentEditPanel.tsx` verwendeten `segment.has_episode_override` (aggregiertes "hat IRGENDEINE Folge einen Override?"-Flag) an Stellen, die eine PRO-FOLGE-Entscheidung treffen mussten ("hat GENAU DIESE Folge einen Override?"). Beide Datenfelder existierten bereits im Backend-Modell auf Segment-Ebene, aber es gab bisher keinen Weg, den Override PRO Zuweisung zu unterscheiden -- das neue `AssignedEpisodes[i].HasOverride`-Feld schliesst genau diese Datenmodell-Luecke, ohne das bestehende segmentweite Flag zu veraendern oder zu entfernen (bleibt fuer die Segment-Badge korrekt).
- Fuer den Drawer-Overflow (Runde 5, Zusatzanfrage) wurde eine **automatisierte, nicht-live Reproduktion** gewaehlt (Headless-Chromium gegen eine isolierte Kopie der ECHTEN CSS-Module-Datei, geladen ueber `file://` im laufenden Frontend-Container, keine Interaktion mit der echten Admin-UI/Live-Daten) statt eigenmaechtig im Live-System zu verifizieren -- konsistent mit der Vorgabe, den Checkpoint nicht selbst zu bestaetigen. Die Reproduktion deckte `.panel` vollstaendig ab (alle Panel-Bloecke inkl. Override-Block, Playback-Quelle, Vorschau, Asset-Sektion, Aktionen) mit realistisch langen Testinhalten und fand keinen Overflow -- das ist eine STARKE, aber keine 100%ige Garantie (z. B. koennten browserspezifische `<select>`-Rendering-Eigenheiten oder echte Produktionsdaten mit extremeren Werten nicht abgedeckt sein).

## Deviations from Plan

None (Rule 1-3 auto-fixes) beyond the one language-quality judgment call documented above under "Decisions Made" -- the plan's literal `{label}` interpolation for the remove-button aria-label was ambiguous (full chip label vs. bare episode number) and the bare-episode-number interpretation was chosen to avoid a grammatically redundant string, consistent with CLAUDE.md's Sprachqualitaet mandate.

The Mobile-Fix and the Bereich-Auto-Zuweisung backend feature are both **coordinator/user-directed additions to this quick-task's scope**, delivered as follow-up rounds after the original Task 1/2 execution and before the (now confirmed) Task 3 live-UAT checkpoint -- not self-initiated scope changes. The `.panelFieldRow` mobile-stacking fix also affects the pre-existing (not newly added by this plan) Von/Bis-episode-range row and the base Start/Ende time row, since they share the same CSS class as the new override styling; the user explicitly requested this broader fix. The Bereich-Auto-Zuweisung feature itself replaced an earlier, briefly-considered "Auf alle Folgen anwenden"-button design that the user corrected before any button code was written -- no button code ever existed to remove.

**[Rule 1 - Bug] `SegmentEditPanel.tsx`'s Override-Switch/-Button fix (Runde 5) war NICHT explizit vom Koordinator angefordert** -- der Koordinator meldete den Bug nur fuer `SegmentAssignmentsRow.tsx` (die Chips). Waehrend der Untersuchung des neuen `AssignedEpisodes[i].HasOverride`-Feldes wurde dasselbe Bug-Muster (segmentweites statt Pro-Folge-Flag) auch in `SegmentEditPanel.tsx` identifiziert (Override-Switch-Initialzustand + "Override entfernen"-Button haetten fuer JEDE Folge eines Segments mit irgendeinem Override faelschlich als "aktiv" erscheinen koennen). Automatisch mitgefixt (Rule 1: Bugfix direkt im bearbeiteten Code-Bereich, gleiche Root Cause, gleicher Fix-Mechanismus) statt einen inkonsistenten Halbzustand zu hinterlassen.

## Issues Encountered

- **Live-UAT Runde 1 (Task 3) ergab eine Mobile-Deviation:** horizontaler Overflow/Scrollbars im Segment-Edit-Drawer auf schmaler Fensterbreite. Root Cause identifiziert und per CSS behoben (siehe "Decisions Made" oben); Container neu gestartet, automatisierte Tests + Typecheck erneut gruen.
- **Zwischen Runde 2 und Runde 3 korrigierte der Nutzer eine zuvor kommunizierte Button-Idee** ("Auf alle Folgen anwenden"): das finale, korrekte Design ist eine automatische, buttonlose Bereich-Auto-Zuweisung beim Speichern -- vor der Korrektur wurde kein Button-Code geschrieben, daher keine Rueckbau-Arbeit noetig.
- **Live-UAT Runde 4 (Task 3) ergab eine ZWEITE, unabhaengige Mobile-Deviation:** diesmal nicht der (in Runde 2 bereits behobene) Drawer, sondern die Segmente-Tabelle selbst (Page-Level-Horizontal-Scroll, abgeschnittene "Quelle"/"Aktionen"-Spalten sowie ein abgeschnittener "+ Segment"-Button im Header). Per reinem CSS-Reflow behoben (siehe "Decisions Made" oben); Container neu gestartet, automatisierte Tests (77/77) + Typecheck erneut gruen.
- **Live-UAT Runde 5 (Task 3) ergab EINEN echten Korrektheits-Bug (kein Mobile/Styling-Thema)** und EINE weitere Mobile-Deviation gleichzeitig: (1) der "verschoben"-Chip erschien faelschlich auf JEDER zugewiesenen Folge statt nur der tatsaechlich ueberschriebenen -- fuehrte im Live-Test bereits zu einer fehlerhaften Nutzeraktion (der Nutzer entfernte faelschlich fast alle Zuweisungen, weil er dachte, sie seien alle "verschoben"); (2) der Segment-Edit-Drawer zeigte laut Nutzer weiterhin einen horizontalen Schiebebalken bei ~375px trotz des Runde-2-Fixes. Beide Punkte in derselben Runde adressiert (siehe "Decisions Made" oben fuer Details inkl. der Grenzen der automatisierten Reproduktion beim zweiten Punkt).
- `npx vitest`/`go test` waren im lokalen Checkout nicht direkt verfuegbar (kein `node_modules` auf dem Linux-Host ausserhalb des Containers; Backend-Tests liefen problemlos direkt im `team4sv30-backend`-Container); alle Tests und Typechecks liefen ueber `docker exec`, gemaess der kanonischen Docker-Compose-Dev-Umgebung aus CLAUDE.md.
- Fuer den echten Postgres-Integrationstest von `AssignThemeSegmentToEpisodeRange`/`TestListAnimeSegmentsAssignedEpisodesHasOverridePerEpisode` wurde eine neue, disposable Testdatenbank `team4s_phase117_test_a1` angelegt (analog zum bereits vorhandenen `team4s_phase135_test_a1`-Praezedenzfall) und `TEAM4S_PHASE117_TEST_DSN` beim Testlauf gesetzt -- ohne diese wuerden die Tests sauber uebersprungen (SKIP-not-FAIL-Konvention), liefen hier aber echt durch.
- Fuer die Drawer-Overflow-Untersuchung (Runde 5) wurde Playwright/Headless-Chromium (bereits im Frontend-Container vorhanden) genutzt, um eine isolierte, CSS-treue Reproduktion des kompletten Drawer-Markups bei 375px zu bauen und per `getBoundingClientRect()`/`scrollWidth`-Vergleich automatisiert auf Overflow zu pruefen -- keine Interaktion mit der echten Admin-UI oder Live-Daten, nur mit einer temporaeren, danach geloeschten statischen HTML-Datei im Container (`/tmp/drawer-repro/`, entfernt nach Abschluss der Untersuchung).

## Verification (automated)

**Frontend (alle Runden):**
- `npx vitest run "src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx"` (inside `team4sv30-frontend` container): **82/82 tests green** nach Runde 5 (67 pre-existing + 3 updated in Runde 1 + 10 new behavior tests aus Task 1/2 + 3 neue/aktualisierte Tests aus Runde 5 fuer das Pro-Folge-Override-Verhalten + 2 aktualisierte Fixtures). Alle Mobile-Fixes sind reines CSS, keine Testaenderung dafuer noetig; die `has_override`-Feld-Ergaenzung (Runde 5) erforderte Fixture-Updates in bestehenden Tests (TS-Typ ist jetzt required) plus 3 neue Tests, die das Pro-Folge-Verhalten explizit pinnen.
- `npm run typecheck` (inside `team4sv30-frontend` container, nach `rm -rf .next/dev/types` zur Vermeidung stale Build-Artefakte): vollstaendig sauber (Exit 0) nach jeder Runde inkl. Runde 5. Kein neuer Fehler durch irgendeine Datei in diesem Plan, ueber alle Runden.
- `docker restart team4sv30-frontend` nach jeder Frontend-Runde ausgefuehrt (Runde 5: EINMAL fuer beide Fixes zusammen, wie vom Koordinator gewuenscht); zuletzt "Ready in 1224ms", Folgeseite lud erfolgreich (200).
- File-size check: `SegmenteTab.tsx` bleibt bei 821 Zeilen. `SegmentEditPanel.tsx` 693 Zeilen (Runde 5: `currentReleaseHasOverride`-Ableitung +7 Zeilen, netto minimal). `SegmentAssignmentsRow.tsx` unveraendert in der Struktur (nur Logik-Zeile getauscht). Alle unter/nahe dem 450-Zeilen-Ziel bzw. als dokumentierte Alt-Schuld akzeptiert.

**Backend (alle Runden):**
- `go build ./...` und `go vet ./...` (inside `team4sv30-backend` container): clean, keine neuen Fehler, ueber alle Runden inkl. Runde 5.
- `go test ./internal/handlers/... ./internal/repository/...`: alle Segment-/Assignment-/Range-Auto-Assign-/Pro-Folge-Override-Tests gruen; die bereits VOR Runde 3 bestehenden Fehlschlaege (4 in `handlers` -- OpenAPI-Contract-Pfad/Public-Member-Source-Inspection; diverse in `repository` -- Phase 128/134/Member-Points DB-Integration-Fixtures, die eine live Keycloak-Nutzer-Fixture bzw. spezielle DSNs voraussetzen) sind unveraendert vorhanden und nachweislich unrelated (andere Dateien, gleiche Fehlerzahl vor und nach jeder Runde geprueft).
- `go test ./internal/repository/... -run 'TestAssignThemeSegmentToEpisodeRange|TestListAnimeSegmentsAssignedEpisodesHasOverridePerEpisode|TestThemeSegmentAssignmentsAndOverrides'` mit `TEAM4S_PHASE117_TEST_DSN` gesetzt (Testdatenbank `team4s_phase117_test_a1`): **alle echten Postgres-Integrationstests gruen** -- inkl. des neuen Runde-5-Tests, der beweist, dass bei 12 zugewiesenen Folgen mit Override NUR auf Folge 2 auch NUR deren `assigned_episodes`-Eintrag `has_override=true` traegt.
- Backend nutzt `air` Hot-Reload (kein Container-Restart noetig, gemaess CLAUDE.md); per Datei-Zeitstempel-Abgleich bestaetigt, dass der laufende Container alle Produktivcode-Aenderungen bereits geladen hat (letzter Rebuild nach dem letzten Source-Edit), ueber alle Runden.

## Known Stubs

None.

## Threat Flags

None. Frontend: keine neuen Endpoints/Auth-Pfade -- nur zusaetzliche UI-Aufrufstellen fuer bereits bestehende, authentifizierte API-Funktionen. Backend: `AssignThemeSegmentToEpisodeRange` haengt an den bestehenden, bereits authentifizierten `requireSegmentManage`-gegateten Create-/Update-Handlern (kein neuer Endpoint, keine Routen-Aenderung); der additive Guard (ungueltiger Bereich/Kontext -> kein Fan-out) verhindert ein versehentliches "allen Folgen aller Zeiten"-Zuweisen bei leeren Feldern. Der Runde-5-Korrektheits-Fix haengt an bestehenden Read-Pfaden (Segment-Hydrierung), fuegt keine neue Schreib-/Auth-Oberflaeche hinzu.

## Next Phase Readiness

- **Task 3 (blocking `checkpoint:human-verify`) ist CONFIRMED.** Der Nutzer bestaetigte "approved"
  nach fuenf Live-UAT-Runden auf `:3000` und listete alle fuenf Punkte explizit als funktionierend:
  (1) Vorschlag-Uebernahme weist zu statt zu duplizieren, (2) Bereich-Auto-Zuweisung beim Speichern,
  (3) Start-Only Per-Folge-Zeit-Override, (4) Pro-Folge-"verschoben"-Marker korrekt, (5) Mobile:
  Segmente-Liste als Karten + Drawer ohne Overflow. Der `<result>`-Block in `260819-lm5-PLAN.md`
  dokumentiert die vollstaendige Runden-Chronologie mit Commit-Referenzen.
- Alle 8 Code-Commits sind bereits auf `main` (siehe Tabelle oben); keine offenen Code-Aenderungen.
- Backend laeuft bereits mit allen Aenderungen (air Hot-Reload bestaetigt); Frontend wurde nach dem
  letzten Fix-Commit neu gestartet und ist healthy.
- SUMMARY.md/PLAN.md-Aktualisierung (dieser Abschluss) wird bewusst NICHT vom Executor committed --
  der Orchestrator erstellt den finalen Docs-Commit (SUMMARY.md + PLAN.md + STATE.md + ROADMAP.md)
  separat.
- Offene Anschlusspunkte (nicht Teil dieses Quick-Tasks, siehe `117-10-POST-HOC-CLOSURE.md`): der
  Kein-Re-Encode-Negativbeweis (D-01) und die oeffentliche Release-Detailseiten-Entdopplung (D-02)
  aus dem urspruenglichen `117-09-PLAN.md`-Scope wurden hier nicht erneut geprueft.

---
*Quick Task: 260819-lm5*
*Status: COMPLETE -- alle 8 Code-Commits auf main, Task 3 (Live-UAT ueber fuenf Runden) vom Nutzer final bestaetigt ("approved")*
