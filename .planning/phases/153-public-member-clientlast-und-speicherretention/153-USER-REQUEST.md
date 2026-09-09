# Phase 153 — USER REQUEST (verbindlicher Originalauftrag)

Phase 153 – Public Member Profile: Speicherretention, öffentlicher Importgraph und SSR-Sichtbarkeit

## Arbeitsumgebung

Diese Phase wird vollständig auf der Team4s-Linux-VM geplant und ausgeführt.

Verbindlich:

- Repository, GSD, Tests, Build und Agentenläufe auf Linux (`/home/d1sk/team4s`)
- Windows nur als Kommunikations-/Steuerungsoberfläche
- aktuellen `main`-Stand verwenden, keine Worktrees, keine Feature-Branches
- vor Änderungen Branch, HEAD und `git status` dokumentieren
- keine History-Rewrites, keine Force-Pushes, keine fremden Änderungen überschreiben
- niemals `git stash` bei offenen Änderungen; Artefakte gezielt per Pfad committen
- bestehende funktionierende Architektur respektieren, insbesondere die Phasen 150/151/152
  nicht durch parallele neue Lösungen umgehen

## Quelle des Auftrags

Verbindliche Faktenbasis ist der committete Messbericht:

`docs/audits/2026-09-09-public-member-performance/REPORT.md` (Commit `592df665`)

Dazu gehören `TABLES.md`, `ASSETS.md`, `REPRODUCE.md`, `VALIDATION.md` und die JSON-Rohbelege
im selben Verzeichnis. Die Messskripte unter `frontend/scripts/audit-public-member-*.mjs` sind
committet und für die Vorher/Nachher-Verifikation dieser Phase **wiederzuverwenden**, nicht neu
zu schreiben.

Der Bericht ist eine Ursachenanalyse, keine bereits umgesetzte Optimierung. Er enthält bewusst
Aussagen darüber, was **nicht** bewiesen ist. Diese Grenzen sind einzuhalten.

## Ziel

Phase 153 schließt die drei mit **P1** priorisierten Befunde des Berichts (RCA-01, RCA-02, RCA-03).
Die P2-Befunde (RCA-05 Aggregator-Duplikate, RCA-06 Locked-Artwork und Bild-Fallback, RCA-08
Viewer-Auflösung) sind ausdrücklich **nicht** Teil dieser Phase und gehen in Phase 154.

Kein Rewrite. Gezielte Korrektur der belegten Ursachen an den benannten Stellen.

## Ausgangslage (belegt, nicht erneut zu beweisen)

- Die öffentliche Member-Seite lädt in DEV 6,343 MB JavaScript, die Gruppenseite 3,743 MB —
  unabhängig davon, ob das Profil Inhalt hat. Ein fast leeres Profil (`kara`, Member 12) lädt
  identische 6.342.591 JS-Bytes wie ein volles (`timer`, Member 11).
- Bereits serverseitig gerenderte Inhalte bleiben hinter Skeletons, bis der gemeinsame
  Clientgraph geladen und hydratisiert ist.
- Ein Retentionsfehler ist unabhängig von React/Next reproduziert.
- Die 20 SQL-Abfragen sind bestätigt, liegen im vorhandenen Datenbestand aber bei 4–6 ms
  HTTP-Median und erklären die gemessenen Sekunden **nicht**.

## Workstream A — Native Auto-Sizes-Retention (RCA-01, P1)

**Belegter Befund:** Lazy-Images mit `sizes="auto"` und `srcset` halten im getesteten Chromium 140
entfernte DOM-Teilbäume fest. Über zwölf SPA-Navigationszyklen: Produktion 466 → 15.107 DOM-Knoten,
347 → 1.100 Listener. Mit entferntem Auto-Sizing-Anteil: 464 → 1.192 Knoten, 347 → 367 Listener.
Ein Minimalversuch ohne React und ohne Next reproduziert das Verhalten (211 → 2.488 Knoten,
207 Knoten je Zyklus); mit festen `sizes` oder `eager` bleiben 4 Knoten zurück.

**Codestelle:** `frontend/src/components/profile/AchievementArtwork.tsx:37` setzt

```
const sizes = priority ? fallbackSizes : `auto, ${fallbackSizes}`
```

Die deterministischen Deskriptoren `HERO_SIZES` und `STAGE_SIZES` existieren in derselben Datei
bereits und werden heute nur als Fallback hinter `auto` geführt.

**Anforderung:**

- A1: Das `auto`-Präfix im `sizes`-Deskriptor entfällt; die vorhandenen deterministischen
  responsiven `sizes` gelten für lazy und priorisierte Bilder gleichermaßen.
- A2: Lazy Loading bleibt erhalten. **Nicht** global auf `eager` umstellen — der Bericht nennt das
  ausdrücklich als voreilige Lösung. Reservierte Geometrie, Optimizer-Nutzung, `srcset` und
  Bildschärfe bleiben unverändert.
- A3: Die deterministischen Breakpoints müssen zu den tatsächlichen Slot-Größen aus
  `AchievementArtwork.module.css` passen; falls sie abweichen, sind sie an der CSS-Wahrheit
  auszurichten statt geraten.
- A4: Prüfen, ob weitere Aufrufstellen im Repository `sizes="auto"` oder ein `auto,`-Präfix
  verwenden; falls ja, gleich mitbehandeln statt eine zweite Variante entstehen zu lassen.

**Erfolgskriterium:** Keine lineare DOM- und Listener-Retention über zwölf **und** 50
SPA-Navigationszyklen, gemessen mit `frontend/scripts/audit-public-member-navigation-retention.mjs`.
Geometrie, Schärfe und Transfergrößen bleiben belegbar unverändert.

## Workstream B — Öffentlicher Importgraph (RCA-02, P1)

**Belegter Befund:** Der öffentliche Member-Graph zieht den kompletten Editor-Zweig mit:
38 Tiptap-Module (1,187 MB roh), 11 ProseMirror-Module (1,790 MB), 10 Editor-Module (0,172 MB).
Zusätzlich landet das Not-found-Segment mit der privaten Vollvorschau im erfolgreichen
öffentlichen HTTP-200-Profil. A/B-Messung: direkter Renderer bei unveränderter Darstellung
spart 1,653 MB / 26,1 % Gesamt-JS-Transfer; neutraler Not-found-Ersatz separat 1,602 MB.
Die Wirkungen überlappen.

**Codestellen und zusätzlicher Befund:** `frontend/src/components/editor/index.ts` exportiert
`RichTextEditor` (Tiptap/ProseMirror) und `RichTextRenderer` aus demselben Barrel.
`RichTextRenderer.tsx` selbst hat **keine** Tiptap-Abhängigkeit — es importiert nur sein CSS-Modul.
Die Editor-Last kommt ausschließlich über das Barrel.

Über den Bericht hinaus gilt: es sind **vier** reine Renderer-Konsumenten betroffen, die heute
den ganzen Editor mitziehen —

- `frontend/src/components/profile/MemberStorySection.tsx:5`
- `frontend/src/components/profile/MemberGroupsHistorySection.tsx:10`
- `frontend/src/components/public/PublicNoteCard.tsx:7`
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx:6`

`app/members/[slug]/not-found.tsx` rendert `OwnHiddenProfilePreview`, das die vollständige
`MemberProfileContent`-Komposition unter eine Client-Grenze in das Not-found-Segment zieht.

**Anforderung:**

- B1: Reine Renderer-Konsumenten importieren `RichTextRenderer` direkt aus seinem Modul statt
  über das Barrel. Alle vier oben genannten Stellen sind zu behandeln, nicht nur die Member-Story.
- B2: Das Barrel bleibt für echte Editor-Konsumenten nutzbar. Kein zweiter Renderer, keine Kopie,
  keine Parallelarchitektur — die bestehende Komponente wird nur direkt adressiert.
- B3: Es ist zu entscheiden und zu begründen, ob das Barrel den `RichTextEditor`-Export behält
  oder ob eine Trennung sinnvoller ist, damit dieser Fehler nicht zurückkehrt. Die Entscheidung
  wird dokumentiert, nicht stillschweigend getroffen.
- B4: Die private Not-found-Vollvorschau bekommt eine echte Ladegrenze, sodass ihr Clientcode
  nicht mehr Teil des erfolgreichen öffentlichen Profils ist. Die Vorschau bleibt für den
  berechtigten Eigentümer funktional und die Privatsphäre-/Owner-Logik unverändert korrekt.
- B5: Kein Verhaltens- oder Darstellungsunterschied im gerenderten Rich Text. Der bestehende
  Tiptap-Link-Contract aus Phase 152 bleibt intakt.

**Erfolgskriterium:** Kein Tiptap-, ProseMirror- oder RichTextEditor-Modul im öffentlichen
DEV-Importgraph der Member- und Gruppenseite, belegt mit
`frontend/scripts/audit-public-member-bundles.mjs`. Produktionswerte neu gemessen
(Ausgangslage: 353 kB transferiert / 1.155 kB dekomprimiert für Member gegenüber 187/632 kB Gruppe).
Die private Vorschau ist ausdrücklich regressionsgeprüft.

## Workstream C — SSR-Sichtbarkeit statt Hydrations-Skeletons (RCA-03, P1)

**Belegter Befund:** Inhalte sind im HTML vorhanden, wirken aber leer oder verspätet.
Unter Drosselung (1,6 Mbit/s, CPU ×4): `timer` Load 36,91 s, Projekt- und Rollen-Skeletons
verschwinden erst bei 37,66 s, weiterer Carousel-Bereich 38,80 s, Beiträge 39,19 s.
Die Gruppenseite zeigt diese Sichtbarkeitswechsel bei 26,63 s Load gar nicht.
Das fast leere Profil `kara` mountet trotz null Inhalt Story- und Projekt-Leerzustände,
sechs Badge-Familien mit gesperrten Stufen sowie Bild- und Viewer-Auflösung.

**Codestellen:** `MemberProfileContent`, `MemberBadgeChain`, `MemberCurrentProjectsSection`,
`LatestContributionsSection`, deren CSS-Module und `frontend/src/hooks/useNearViewportActivation.ts`.
Der Hook verschiebt nur die Interaktionsfreigabe (`rootMargin` 600px), nicht Download, Mount oder
Hydration. Projekt- und Contribution-Skeletons überlagern Inhalte bis `data-visible=false`;
Rollen-Skeletons warten auf `data-interaction-enabled=true`.

**Anforderung:**

- C1: Öffentliche statische Inhalte, die bereits serverseitig vorliegen, sind ohne Wartezeit auf
  den Clientgraph sichtbar. Skeletons zeigen nur noch echte Ladezustände an, nicht den
  Hydrationsfortschritt.
- C2: Leere Bereiche werden serverseitig fachlich entschieden. Ein Profil ohne Projekte,
  Beiträge und Story mountet keine vollständigen Client-Leerzustände samt gesperrter
  Badge-Ladder.
- C3: Kleinere interaktive Inseln mit echten Ladegrenzen statt einer durchgehend clientseitigen
  Gesamtkomposition.
- C4: **Kein kosmetisches Drehen an Skeleton-Timern oder rootMargin-Werten.** Der Bericht
  schließt das ausdrücklich als Scheinlösung aus. Ebenso ist „JavaScript abschalten" keine
  Lösung: ohne JS kommt SSR zwar früher, die Skeletons aktivieren dann aber nie.
- C5: Der fachliche Produktumfang der Badge-Darstellung — welche gesperrten Stufen ein leeres
  Profil überhaupt zeigen soll — ist eine bewusste Entscheidung und mit dem Auftraggeber zu
  klären, keine stille Kürzung durch die Implementierung.
- C6: Daten, SEO und Accessibility bleiben unverändert. Fehler in einem Bereich isolieren,
  statt die Seite zu zerlegen.

**Erfolgskriterium:** Inhalt ist vor vollständigem Client-JS sichtbar; weniger initiale Module und
Dokumentelemente; kürzere Skeleton-Dauer unter denselben Drosselungsbedingungen, gemessen mit
`frontend/scripts/audit-public-member-visibility.mjs`. Referenz sind die vorhandenen
`visibility-members-timer.json`, `visibility-members-kara.json` und
`visibility-fansubs-new-subs.json`.

## Workstream D — Verifikation und Abgrenzung

- D1: Vorher/Nachher-Vergleich mit den committeten Auditskripten unter identischen Bedingungen
  (1440 × 900, DPR 1, anonymer Kontext, Cold und Warm getrennt, Drosselung wie im Bericht).
  Ergebnisse als neues Auditdokument ablegen, den bestehenden Bericht nicht überschreiben.
- D2: Regressionstests für die drei Workstreams. Die vorhandenen 341 relevanten Frontend-Tests
  bleiben grün. Ein Retentions- oder Bundle-Gate ist als dauerhafter Regressionsschutz zu prüfen.
- D3: Volle Frontend-Suite und Produktionsbuild nach dem
  `docker compose build`-Weg — nicht `exec … npm run build`, dessen `.next`-Volume falsche
  Prerender-Fehler meldet.
- D4: **RCA-04 bleibt offen und ist kein Umsetzungsziel dieser Phase.** Der konkrete
  Chrome-Tab-Absturz des Nutzers wurde nicht reproduziert. Die Phase darf ihn **nicht** als
  behoben erklären. Sie darf ausschließlich belegen, dass die Auto-Sizes-Retention beseitigt ist.
  Ob das den gemeldeten Absturz erklärt, ist danach im Nutzer-Chrome zu beobachten.
- D5: Bestehende, phasenfremde Defekte werden dokumentiert und nicht stillschweigend
  mitrepariert oder als „vorbestehend" weggeschrieben, ohne das zu belegen:
  - `frontend/src/app/anime/page.tsx` — Typecheck scheitert an synchronem `searchParams`-Objekt
    neben `Promise` (Next-PageProps-Inkompatibilität)
  - `frontend/src/app/admin/anime/[id]/edit/page.tsx` — unzulässiger Page-Export
    `formatEditLoadError` bricht den regulären Produktionsbuild
  - 13 bestehende ESLint-Errors und 332 Warnings außerhalb des Phasenumfangs
  Falls einer davon Workstream D blockiert, ist er als bewusst begründete Ausnahme zu behandeln
  und der Umfang offenzulegen.

## Grundprinzipien

### Keine neue Parallelarchitektur

Wo Team4s bereits eine gemeinsame Lösung besitzt, wird sie wiederverwendet. Insbesondere gilt
das für `RichTextRenderer`, `AchievementArtwork`, `ResponsiveImage` und die Phase-151-Slots.

### Globales Design-System ist Pflicht

Jede user-facing UI nutzt die Primitives aus `@/components/ui` (`Button`, `Select`, `FormField`,
`Modal`, `Input`, `Textarea`, `Tabs`, `Drawer`, `Card`, `Table`). Handgebaute native
`<select>`, `<input>`, `<textarea>` oder `<button>` sind verboten. Lokale Dateikonsistenz
rechtfertigt kein Abweichen vom globalen Design-System.

### Design-Tokens

UI-CSS nutzt die globalen Tokens (`--surface-canvas`, `--surface-card`, `--surface-sunken`,
`--text-primary`, `--text-muted`, `--color-border`, `--accent-primary`, `--accent-deep`,
`--shadow-*`). Keine eigenen CSS-Variablennamen erfinden.

### Sprachqualität

Deutscher UI-Text verwendet korrekte Umlaute (ä, ö, ü, Ä, Ö, Ü, ß). ASCII-Ersetzungen wie
ae/oe/ue/ss sind in user-facing Strings verboten. Der Scope umfasst JSX-Textknoten,
Button-Labels, Fehlermeldungen, Placeholder, aria-labels, Toast-Nachrichten und
Go-Response-Strings; Codebezeichner sind ausgenommen.

### Modularität

Produktionscodedateien bleiben bei höchstens 450 Zeilen. Größere Implementierungen werden
vorher geteilt. Ein höheres Limit ist eine begründete Einzelfallausnahme, kein neuer Standard.

### Ehrlichkeit über Messwerte

Der Bericht unterscheidet sorgfältig zwischen Gemessenem und Vermutetem. Diese Disziplin gilt
weiter: keine gerundeten Erfolgsmeldungen, keine Übertragung von DEV-Werten auf Produktion ohne
eigene Messung, kein „Crash behoben".

## Requirements (Phasen-eigener Tracking-Namespace)

| ID | Workstream | Anforderung |
|----|-----------|-------------|
| P153-01 | A1, A3, A4 | `auto`-Präfix im `sizes`-Deskriptor entfernt; deterministische, an der CSS-Wahrheit ausgerichtete responsive `sizes` für Hero und Stage; weitere `auto`-Aufrufstellen mitbehandelt |
| P153-02 | A2 | Lazy Loading, reservierte Geometrie, Optimizer, `srcset` und Bildschärfe nachweislich unverändert; kein globales `eager` |
| P153-03 | A | Keine lineare DOM-/Listener-Retention über 12 und 50 SPA-Zyklen, belegt mit dem committeten Retentionsskript |
| P153-04 | B1, B2 | Alle vier reinen Renderer-Konsumenten importieren `RichTextRenderer` direkt; keine Kopie, kein zweiter Renderer |
| P153-05 | B3 | Entscheidung über die künftige Barrel-Struktur getroffen und begründet dokumentiert |
| P153-06 | B4 | Private Not-found-Vollvorschau hinter echter Ladegrenze; Owner-/Privatsphäre-Logik unverändert, Vorschau regressionsgeprüft |
| P153-07 | B5, B | Kein Tiptap/ProseMirror/RichTextEditor im öffentlichen Importgraph; Rich-Text-Darstellung und Phase-152-Link-Contract unverändert; DEV- und Produktionsbytes neu gemessen |
| P153-08 | C1, C6 | Serverseitig vorhandene öffentliche Inhalte vor vollständiger Hydration sichtbar; Daten, SEO und Accessibility unverändert |
| P153-09 | C2, C5 | Leere Bereiche serverseitig entschieden; Umfang der gesperrten Badge-Darstellung bei leerem Profil bewusst geklärt statt still gekürzt |
| P153-10 | C3, C4 | Kleinere interaktive Inseln mit echten Ladegrenzen; keine Skeleton-Timer-Kosmetik, kein rootMargin-Tuning als Ersatzlösung |
| P153-11 | D1 | Vorher/Nachher-Messung unter Berichtsbedingungen als neues Auditdokument; bestehender Bericht unverändert |
| P153-12 | D2, D3 | Regressionstests für alle drei Workstreams grün, bestehende Frontend-Suite grün, Produktionsbuild über `docker compose build` PASS; Retentions-/Bundle-Gate als Dauerschutz geprüft |
| P153-13 | D4 | RCA-04 explizit als offen geführt; kein Crash-Behoben-Claim; Beobachtungsauftrag für das Nutzer-Chrome formuliert |
| P153-14 | D5 | Bestehende phasenfremde Typecheck-, Build- und Lint-Defekte benannt und belegt abgegrenzt statt still mitverändert |

## Nicht in dieser Phase

- RCA-05 (sequenzieller Aggregator, vier redundante Faktenabfragen)
- RCA-06 (Locked-Projekt-Artwork, schwerer Original-Fallback, animierter Avatar)
- RCA-07 (initiale leere React-Root-Wiederholungen — laut Bericht erst **nach** der
  Graphverkleinerung erneut zu messen, also frühestens in Phase 154 sinnvoll)
- RCA-08 (Viewer-Auflösung, ungenutztes AbortSignal)

Diese Punkte sind für Phase 154 vorgesehen und dürfen hier nicht vorweggenommen werden.
