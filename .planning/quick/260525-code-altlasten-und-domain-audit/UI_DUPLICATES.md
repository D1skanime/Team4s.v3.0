# WP-05 UI-Duplikate und Shared-Component-Kandidaten

Datum: 2026-05-26
Status: Audit-only, keine Runtime-Aenderung

## Zusammenfassung

Der Admin-Bereich hat bereits eine brauchbare Shared-UI-Schicht unter `frontend/src/components/ui`, unter anderem `Button`, `Card`, `Drawer`, `Modal`, `Table`, `FormField`, `Input`, `Select`, `Textarea`, `LoadingState`, `ErrorState` und `EmptyState`.

Die Nutzung ist aber sehr ungleich verteilt. `frontend/src/app/admin/my-groups/page.tsx` und `frontend/src/app/admin/my-groups/[id]/page.tsx` verwenden die Shared-Komponenten konsequent, viele aeltere Admin-Screens verwenden dagegen lokale `panel`, `field`, `hint`, `errorBox`, `emptyState`, `table` und Drawer-/Modal-Klassen. Das ist kein akuter Defekt, erzeugt aber Wartungs- und Design-Drift.

## Bewertungsskala

- `zusammenfuehren`: fachlich gleich genug fuer eine kleine, sichere Shared-Component-Slice.
- `spaeter pruefen`: wahrscheinlich verwandt, aber vorher UX-/Domain-Verhalten oder Tests klaeren.
- `behalten`: bewusst spezialisiertes Pattern, aktuell nicht zusammenfuehren.
- `loeschen`: wahrscheinlich totes Pattern oder nach Migration entfernbar.

## Findings

### Drawer und Dialoge

Status: `spaeter pruefen`, teilweise `zusammenfuehren`
Prioritaet: P1
Groesse: M
Auto-fixbar: nein, manuell mit visueller Pruefung

Betroffene Stellen:
- `frontend/src/components/ui/Drawer.tsx:18` stellt einen generischen Drawer bereit.
- `frontend/src/components/ui/Modal.tsx:18` stellt ein generisches Modal bereit.
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx:3081` rendert einen eigenen Release-Drawer.
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx:3251` rendert einen eigenen Theme-Drawer.
- `frontend/src/app/admin/anime/create/CreateAssetSearchDialog.tsx:128` rendert einen eigenen Asset-Suchdialog.
- `frontend/src/app/admin/anime/components/JellyfinSync/JellyfinSyncPanel.tsx:554` rendert ein lokales Confirm-Modal.

Warum problematisch:
- Mehrere eigene Overlay-/Panel-/Close-/Footer-Strukturen koennen Fokusverhalten, Escape-/Backdrop-Verhalten, Z-Index und Responsive-Regeln auseinanderlaufen lassen.
- Der Fansub-Release-Drawer ist fachlich heikel, weil er Release-Version-Media anzeigt und bereits Race-Condition-Schutz enthaelt. Eine blinde Zusammenfuehrung waere riskant.

Vorschlag:
- `JellyfinSyncPanel` Confirm-Modal als ersten kleinen Kandidaten auf Shared `Modal` pruefen.
- Fansub Release-/Theme-Drawer erst nach separater Drawer-Verhaltens-Spec migrieren; Header/Tabs/Body koennen bleiben, Shell eventuell Shared `Drawer`.
- `CreateAssetSearchDialog` vorerst behalten, weil Suche, Vorschau und Auswahlfluss spezialisiertes Verhalten haben.

### Tabellen

Status: `zusammenfuehren`
Prioritaet: P1
Groesse: S bis M
Auto-fixbar: groesstenteils ja, aber mit Screenshot-/DOM-Pruefung

Betroffene Stellen:
- `frontend/src/components/ui/Table.tsx:14` stellt Shared `Table` bereit.
- `frontend/src/app/admin/my-groups/[id]/page.tsx:242` und `frontend/src/app/admin/my-groups/[id]/page.tsx:318` nutzen die Shared Table bereits.
- `frontend/src/app/admin/fansubs/page.tsx:545` nutzt noch eine lokale rohe Tabelle.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx:451` nutzt noch eine lokale rohe Tabelle.

Warum problematisch:
- Rohes Tabellen-Markup dupliziert Wrapper-, Empty-State- und Aktionsspalten-Logik.
- Der Shared-Table-Pfad ist klein und bereits in einer aktiven Admin-Seite erprobt.

Vorschlag:
- Zuerst `admin/fansubs/page.tsx` migrieren, weil es eine einfache Listen-Tabelle ist.
- Danach `SegmenteTab.tsx` pruefen; dort sind aktive Zeilen und Editor-Kopplung enthalten, daher mit Regressionstest.

### Cards, Panels und Section-Surfaces

Status: `spaeter pruefen`
Prioritaet: P2
Groesse: L
Auto-fixbar: nein

Betroffene Stellen:
- `frontend/src/components/ui/Card.tsx:16` stellt Shared `Card` bereit.
- `frontend/src/app/admin/profile/page.tsx:213` nutzt lokale `panel`-Abschnitte.
- `frontend/src/app/admin/fansubs/page.tsx:416` nutzt lokale `panel`-Abschnitte.
- `frontend/src/app/admin/fansubs/merge/page.tsx:366` und weitere Stellen nutzen lokale Wizard-Panels.
- `frontend/src/app/admin/anime/components/AnimeEditPage/AdminAnimeEditPageClient.tsx:134` nutzt lokale `card`-Abschnitte.
- Viele oeffentliche/domainnahe Komponenten wie `AnimeCard`, `AnimeRelations` oder Fansub-Profilbereiche nutzen eigene Cards.

Warum problematisch:
- Admin-Screens sehen und verhalten sich bei Panels unterschiedlich, obwohl sie strukturell aehnliche Aufgaben haben.
- Eine breite Card-Migration wuerde schnell zu einem verdeckten Redesign werden.

Vorschlag:
- Keine grosse Card-Vereinheitlichung.
- Nur neue Admin-Slices standardmaessig mit Shared `Card`/`SectionHeader` bauen.
- Alte Panels nur dann anfassen, wenn die jeweilige Seite ohnehin funktional bearbeitet wird.
- Oeffentliche/domainnahe Cards behalten; sie sind keine guten Shared-Admin-Kandidaten.

### Uploads und Media-Handling

Status: `spaeter pruefen`
Prioritaet: P1
Groesse: M bis L
Auto-fixbar: nein

Betroffene Stellen:
- `frontend/src/components/admin/MediaUpload.tsx:221` ist ein bestehender, getesteter Admin-Media-Upload fuer Fansub-/Group-Media.
- `frontend/src/app/admin/fansubs/create/page.tsx:1081` und `frontend/src/app/admin/fansubs/[id]/edit/page.tsx:2323` nutzen `MediaUpload`.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx:71` kapselt Release-Version-Media-Upload.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:87` kapselt Release-Version-Media-State und API-Flows.
- `frontend/src/app/admin/anime/create/createAssetUploadPlan.ts:251` und `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx:72` nutzen Anime-Media-Upload-Flows.
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx:3359` enthaelt eine lokale Dropzone fuer Theme-Assets.

Warum problematisch:
- Upload-UI, Fortschritt, Fehleranzeige und Dropzone-Verhalten sind mehrfach gebaut.
- Gleichzeitig liegen unterschiedliche Domain-Kontexte vor: Anime-Media, Fansub-/Group-Media, Release-Version-Media und Theme-Assets duerfen nicht vermischt werden.

Vorschlag:
- `MediaUpload` behalten; nicht auf Release-Version-Media ausdehnen.
- Erst Low-Level-Primitives pruefen: `UploadDropzone`, `UploadProgress`, `UploadError`, `MediaPreviewCard`.
- Release-Version-Media bleibt fachlich separat und muss an `release_version_id` gebunden bleiben.
- Theme-Asset-Dropzone spaeter als eigener Slice pruefen, weil sie nahe am Fansub-Drawer und Race-Condition-Thema liegt.
- Guardrail fuer GSD execute: Vor jedem neuen Upload-Feature zuerst vorhandene Upload-Flows pruefen. Kein neuer Upload-Flow, Hook, Component oder Endpoint ohne dokumentierte Entscheidung, warum `MediaUpload`, `ReleaseVersionMediaSection`/`useReleaseVersionMedia`, Anime-Upload-Planung oder `api.ts`-Upload-Helper nicht passen.

### Forms und Field-Patterns

Status: `zusammenfuehren`, aber schrittweise
Prioritaet: P2
Groesse: M bis L
Auto-fixbar: teilweise

Betroffene Stellen:
- `frontend/src/components/ui/FormField.tsx:15`, `Input.tsx`, `Select.tsx` und `Textarea.tsx` existieren als Shared-Basis.
- `frontend/src/app/admin/profile/page.tsx:259` nutzt lokale Form-/Field-Strukturen.
- `frontend/src/app/admin/episodes/page.tsx:317` nutzt lokale Form-/Field-Strukturen.
- `frontend/src/app/admin/fansubs/create/page.tsx:819` und weitere Stellen nutzen lokale `field`-Bloecke.
- `frontend/src/app/admin/anime/components/AnimePatchForm/*` und `AnimeEditPage/*` haben viele eigene Field-Patterns.

Warum problematisch:
- Labels, Hints, Fehlermeldungen und disabled/read-only-Darstellung laufen auseinander.
- Test- und A11y-Verhalten wird ungleichmaessig.

Vorschlag:
- Neue Admin-Formen nur noch mit Shared `FormField` plus Shared Inputs bauen.
- Alte Formulare pro Seite migrieren, nicht global.
- Gute erste Kandidaten: `admin/profile/page.tsx` oder einfache Filter-/Suchformulare.
- Komplexe Anime-Edit-Formulare erst spaeter, weil sie viele lokale Spezialzustaende haben.

### Loading, Error und Empty States

Status: `zusammenfuehren`
Prioritaet: P1
Groesse: S
Auto-fixbar: ja, mit Snapshot-/DOM-Pruefung

Betroffene Stellen:
- `frontend/src/components/ui/LoadingState.tsx:8`, `ErrorState.tsx:12` und `EmptyState.tsx:16` existieren.
- `frontend/src/app/admin/my-groups/page.tsx:143` und `frontend/src/app/admin/my-groups/[id]/page.tsx:123` nutzen diese Shared States.
- Viele Admin-Seiten nutzen lokale `errorBox`, `hint`, `emptyState` und Lade-Texte, z.B. `frontend/src/app/admin/fansubs/page.tsx:531`, `frontend/src/app/admin/episodes/page.tsx:310`, `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx:214`, `frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx:160`.

Warum problematisch:
- Gleiche Zustaende sehen unterschiedlich aus und haben nicht zwingend konsistente ARIA-Rollen.
- Kleine Migrationen sind vergleichsweise risikoarm und verbessern die Wartbarkeit schnell.

Vorschlag:
- Als ersten UI-Cleanup-Slice lokale Page-Level Loading/Error/Empty-Zustaende auf Shared States umstellen.
- Inline-Fehler in komplexen Panels nur dann migrieren, wenn die Shared-Komponente zur Semantik passt.

### Lokale Spezialloesungen, die behalten werden sollten

Status: `behalten`
Prioritaet: P2
Groesse: XS
Auto-fixbar: nein

Betroffene Stellen:
- `frontend/src/components/admin/MediaUpload.tsx` wegen Crop-, Drag- und A11y-Verhalten.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx` wegen Kategorie-lokalem Reordering.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx` wegen Release-Version-Media-spezifischer Metadaten.
- Oeffentliche Anime-/Fansub-Karten unter `frontend/src/components/anime` und `frontend/src/components/fansubs`.

Warum behalten:
- Diese Komponenten tragen echte Domain- oder Interaktionslogik.
- Eine Zusammenfuehrung wuerde eher Verhalten verstecken als Duplikate reduzieren.

### Potenzielle Loeschkandidaten

Status: `spaeter pruefen`, danach ggf. `loeschen`
Prioritaet: P2
Groesse: S
Auto-fixbar: teilweise

Betroffene Stellen:
- Lokale CSS-Klassen fuer alte Panel-/Table-/Drawer-Muster nach einzelnen Migrationen.
- Alte Route-CSS-Reste wurden bei WP-04 bereits fuer die entfernte Versionsroute geloescht.

Warum problematisch:
- CSS-Modul-Reste sind schwer von aktiven lokalen Varianten zu unterscheiden, solange die Komponenten nicht migriert sind.

Vorschlag:
- Jetzt nichts loeschen.
- Nach jeder kleinen UI-Migration gezielt `rg`/Typecheck nutzen und nur eindeutig unreferenzierte Klassen entfernen.

## Empfohlene naechste Mini-Slices

1. `ui-state-components-adoption` (P1, S): Page-Level Loading/Error/Empty in 1-2 einfachen Admin-Seiten auf Shared States umstellen.
2. `admin-fansubs-table-shared-table` (P1, S): `admin/fansubs/page.tsx` auf Shared `Table` umstellen.
3. `segment-table-shared-table` (P1, M): `SegmenteTab.tsx` auf Shared `Table` pruefen und mit Test absichern.
4. `confirm-modal-shared-modal` (P2, S): Jellyfin-Sync Confirm-Modal auf Shared `Modal` pruefen.
5. `upload-primitives-spike` (P2, M): nur Dropzone/Progress/Error-Primitives evaluieren, keine Domain-Flows zusammenlegen.

## Entscheidung

Keine grosse UI-Refactor-Welle starten. Die vorhandenen Shared-Komponenten sind sinnvoll, aber die sichere Strategie ist Adoption in kleinen, testbaren Slices. Besonders Release-Version-Media und Fansub-Drawer bleiben domain-sensibel und duerfen nicht in generische Media-Logik gedrueckt werden.

Upload-bezogene Folgearbeiten sind reuse-first: bestehende Domain-Flows nutzen, nur kleine UI-Primitives extrahieren, keinen weiteren parallelen Upload-Pfad bauen.
