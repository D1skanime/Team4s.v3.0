# Phase 157: Projekt-Memberseite visuell auf Referenzdesign umbauen — Context

**Gathered:** 2026-09-12
**Status:** Ready for planning
**Source:** `157-USER-REQUEST.md` (verbindliche Auftragsquelle, ersetzt eine interaktive
discuss-phase-Sitzung) + Referenz-Screenshot des Auftraggebers

<domain>
## Phase Boundary

Betroffen ist **ausschließlich** die öffentliche Projekt-Member-Seite
`/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]`.

Phase 157 ist eine **UI-/Layoutphase** mit **einer** additiven Backend-Ergänzung (ein zusätzlicher
Count, siehe Workstream D). Keine Backend-Neumodellierung, keine Änderung an Sichtbarkeits-,
Rollen- oder Paginierungssemantik.

Neun Workstreams: A Hero · B Statistikleiste · C Tab-Navigation mit Aktivzustand ·
D Beitragszusammenfassung · E Notiz-Timeline (Kern) · F Pager-Beschriftung · G Medienbereich ·
H Releases-Empty-State · I Responsive, Tests, Live-UAT.
</domain>

<decisions>
## Implementation Map (Auftragspunkt 14) — am Code geprüft 2026-09-12

Alle Komponenten liegen bereits sauber getrennt vor; **keine** Datei im Zielbereich ist überlang.
Eine Extraktion ist deshalb **nicht** nötig — wohl aber ist neues CSS in **eigene** Module zu
schreiben, statt `ProjectMemberPage.module.css` (270 Zeilen) weiter zu füllen.

| Datei | Zeilen | Rolle in dieser Phase |
|---|---|---|
| `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx` | 72 | Server-Route, lädt Summary; **unverändert** |
| `frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx` | 99 | Komposition Breadcrumb → Hero → Summary → Nav → Sektionen; Reihenfolge stimmt bereits |
| `.../ProjectMemberHero.tsx` | 87 | **Workstream A** |
| `.../ProjectMemberSummary.tsx` | 24 | **Workstream B** (heute 4 Karten) |
| `.../ProjectMemberStickyNav.tsx` | 40 | **Workstream C** (heute ohne Aktivzustand) |
| `.../ProjectMemberNotesSection.tsx` | 87 | **Workstream E/F** |
| `.../ProjectMemberNoteCard.tsx` | 40 | **Workstream E** — Adapter auf die geteilte `PublicNoteCard` |
| `.../ProjectMemberMediaGallery.tsx` | 111 | **Workstream G** |
| `.../ProjectMemberMediaCard.tsx` | 52 | **Workstream G** |
| `.../ProjectMemberReleasesSection.tsx` | 87 | **Workstream H** |
| `.../ProjectMemberPage.module.css` | 270 | Hero/Summary/Nav/Sektionen/Pager |
| `.../ProjectMemberNotesSection.module.css` | 30 | Notiz-Grid |
| `.../ProjectMemberMediaGallery.module.css` | 229 | Galerie |
| `.../ProjectMemberReleasesSection.module.css` | 111 | Releases |
| `.../useProjectMemberCollection.ts` | 130 | Lazy-Load/Pagination — **nicht neu erfinden** |
| `frontend/src/types/projectMember.ts` | 61 | DTO-Typen |
| `backend/internal/repository/project_member_public_repository.go` | 393 | Counts (Workstream D) |
| `backend/internal/handlers/project_member_public_handler.go` | — | Summary-Endpoint (Workstream D) |

**Kritische Wiederverwendungsgrenze:** `ProjectMemberNoteCard` ist nur ein Adapter auf
`frontend/src/components/public/PublicNoteCard.tsx` (151 Zeilen). Diese Karte ist **geteilt** und
wird außerdem von
`frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx`
verwendet. **`PublicNoteCard` darf NICHT umgestaltet werden** — dort ist der Rollen-Header fachlich
richtig, weil dieselbe Notiz im Release-Kontext ohne Rollenangabe nicht zuzuordnen wäre. Workstream
E baut deshalb eine **neue, kompakte Timeline-Komponente** für den Projekt-Member-Kontext und
ersetzt den Adapter, statt die geteilte Karte anzufassen.

## Gemessener Ist-Zustand (Live-Screenshots, Playwright im Container, 2026-09-12)

Route `/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type`, Member „Type",
12 Notizen / 2 Medien / 0 Releases.

| Messwert | Mobile (390px) | Desktop (1440px) |
|---|---|---|
| Dokumenthöhe | 2996 px | 2746 px |
| Höhe Notizbereich | 1649 px (5 Notizen) | 1637 px (12 Notizen) |
| Rollenname im Notizbereich | 5× (1 pro Notiz) | 12× (1 pro Notiz) |
| horizontale Scrollbar | nein | nein |
| Konsolenfehler | keine | keine |

Weitere belegte Abweichungen zur Referenz:

- **Hero:** Avatar ist **zentriert** über dem Namen, „Vollständiges Memberprofil" ist ein
  vollbreiter Button, „Zurück zum Projekt" darunter ein reiner Textlink. Referenz: Avatar **links**,
  Metadaten rechts, beide Buttons **nebeneinander**.
- **Statistik:** vier **große** Karten (`grid-template-columns: repeat(4, 1fr)`, `padding: 16px`,
  eigener Rahmen und Schatten je Karte), auf Mobile als 2×2. Labels und Reihenfolge weichen ab:
  heute „Rollen, Releases, Textbeiträge, Bilder & Medien", Referenz „Rolle, Beiträge, Medien,
  Releases". Keine Icons.
- **Tab-Navigation:** existiert als Pill-Reihe mit Counts, aber **ohne Aktivzustand**; auf Mobile
  rechts abgeschnitten (`overflow-x: auto`).
- **Beitragszusammenfassung:** existiert **gar nicht**.
- **Notizen:** große Karten mit farbigem Rollen-Header („Typesetting" + Datum), darunter
  Kontextzeile „Notiz zu Folge 12", Titel, Text, Footer-Link „Folge 12 · v1 →" sowie eine farbige
  Unterkante. Drei Stellen nennen dieselbe Folge.
- **Pager:** Button heißt „Weitere Beiträge laden"; „5 von 12 angezeigt" existiert bereits links.
- **Medien:** „Alle 2 angezeigt" unter der Galerie (Referenz zeigt das nicht).
- **Releases:** Textinhalt der Sektion ist wörtlich „Mitwirkung an Releases0Alle 0 angezeigt" —
  genau die vom Auftraggeber kritisierte Doppelung, **ohne** Empty-State-Satz.

## Referenz-Spezifikation in Worten (das Bild liegt Executoren nicht vor)

Reihenfolge von oben: App-Header (unverändert) → Breadcrumb → Hero-Karte → Statistikleiste →
Tab-Reihe → Zusammenfassungsband → Karte „Texte & Notizen" → Karte „Bilder & Medien" →
Karte „Mitwirkung an Releases".

1. **Breadcrumb:** `New-Subs › Buddy Complex › Type`, Links in Akzentfarbe, letztes Element
   neutral. Wie heute.
2. **Hero-Karte** (weiß, `--radius-lg`, feiner Rahmen): Avatar-Kreis links (rosé getönter
   Hintergrund, Initialen in gedecktem Rosé). Rechts daneben in einer Zeile der Name groß und fett
   plus blaues Pill-Badge „✓ Verifiziert". Darunter gedeckt „Mitwirkung an Buddy Complex ·
   New-Subs". Darunter der Rollen-Chip „Typesetting" als kleines rosé getöntes Pill. Darunter zwei
   Buttons **nebeneinander**: links dunkles Primary „Vollständiges Memberprofil" mit Personen-Icon,
   rechts helles Secondary „← Zurück zum Projekt".
3. **Statistikleiste:** **eine** weiße Karte, darin vier Einträge nebeneinander, getrennt durch
   dünne vertikale Trenner. Je Eintrag ein runder, weich getönter Icon-Chip und rechts daneben die
   Zahl (fett) mit Label darunter (klein, gedeckt): Personen-Icon „1 Rolle", Dokument-Icon
   „12 Beiträge", Bild-Icon „2 Medien", Paket-Icon „0 Releases". **Singular/Plural beachten**
   („1 Rolle", nicht „1 Rollen").
4. **Tab-Reihe:** drei Pills mit kleinem Icon, Label und „· Zahl". Der aktive Tab ist gefüllt
   (rosé getönt, sichtbarer Rahmen), die inaktiven weiß mit Rahmen.
5. **Zusammenfassungsband:** hellblau getöntes, gerundetes Band, links ein kleines
   Balkendiagramm-Icon, Text: **„Typesetting für 13 Folgen"** halbfett, dann regulär
   „· 12 dokumentierte Arbeitsnotizen · 2 Medien".
6. **Karte „Texte & Notizen":** Kopfzeile mit Dokument-Icon und Titel links, Anzahl rechts gedeckt.
   Darunter die gedeckte Unterzeile „Alle öffentlichen Textbeiträge dieses Members zu diesem
   Projekt." Darunter eine **Timeline**: senkrechte Linie links, je Eintrag ein gefüllter Punkt auf
   der Linie; der Eintrag selbst ist eine flache, hell umrandete Zeile mit
   (a) gedeckter Meta-Zeile `Folge 13 · v1 · 01.09.2026`, (b) fettem Titel, (c) 2–4 Zeilen Text,
   (d) rechts vertikal zentriert ein Chevron `›`. **Kein** Rollen-Header, **keine** Kontextzeile
   „Notiz zu Folge X", **keine** Footer-Link-Zeile — der Chevron übernimmt die Navigation zum
   Release. Danach ein vollbreiter, dezent blau getönter Streifen mit zentriertem Text
   „↓ Weitere 5 Beiträge anzeigen".
7. **Karte „Bilder & Medien":** Kopfzeile mit Bild-Icon, Titel, Anzahl rechts. Darunter Galerie in
   zwei Spalten; je Karte oben das Bild mit gerundeten Ecken, darunter der Titel und darunter
   gedeckt `Folge 1 · v1`; rechts in der Titelzeile ein kleines Bild-Icon. **Kein** „Alle 2
   angezeigt".
8. **Karte „Mitwirkung an Releases":** Kopfzeile mit Paket-Icon, Titel, `0` rechts. Darunter ein
   gerundeter Kasten mit **gestricheltem** Rahmen, zentriert Paket-Icon und Text „Noch keine
   öffentlichen Release-Einträge." **Kein** „Alle 0 angezeigt".

## Workstream-Entscheidungen

### A — Hero (P157-01)

Avatar links, Metadatenblock rechts, Buttons als Zeile darunter. Auf schmalen Screens dürfen die
Buttons stapeln. Bestehende `Button`-Primitives aus `@/components/ui` verwenden, kein Textlink mehr
für „Zurück zum Projekt" — die Referenz zeigt dort einen Secondary-Button. Keine Änderung an den
angezeigten Daten.

### B — Statistikleiste (P157-02)

Eine Karte statt vier. Reihenfolge und Labels der Referenz: **Rolle(n), Beiträge, Medien,
Releases**. Singular/Plural korrekt bilden. Icons aus `lucide-react` (im Projekt vorhanden).
Mobile: darf zweizeilig umbrechen, aber **nicht** zu vier großen Boxen zurückfallen.

### C — Tab-Navigation mit Aktivzustand (P157-03)

Die vorhandene Anchor-/Scroll-Mechanik in `ProjectMemberStickyNav` **bleibt**; ergänzt wird ein
Aktivzustand. Bevorzugt per `IntersectionObserver` auf die drei Sektionen (Scrollspy), Fallback:
zuletzt geklickter Tab. `prefers-reduced-motion` wird bereits respektiert — das bleibt.
Kein horizontales Abschneiden auf 390 px: die drei Pills müssen umbrechen oder passen.

### D — Beitragszusammenfassung (P157-04) — einzige Backend-Änderung

Der Auftrag verlangt „Typesetting für 13 Folgen · 12 dokumentierte Arbeitsnotizen · 2 Medien" und
verbietet erfundene Zahlen. **Belegte Prüfung an der Livedatenbank:**

- Rohzahl ohne Sichtbarkeitsfilter: 13 Folgen, 14 Notizen — **nicht** verwendbar.
- Mit dem kanonischen `projectMemberPublicNotePredicate`: **12** öffentliche Notizen in **12**
  Folgen.
- Vereinigung „Folgen mit mindestens einer öffentlichen Notiz **oder** einem öffentlichen Medium":
  12 ∪ 2 = **13**.

Die Referenzzahl 13 ist damit **exakt reproduzierbar**, wenn der Zähler definiert wird als:

> **Anzahl der Folgen, zu denen dieser Member in diesem Projekt mindestens einen öffentlichen
> Textbeitrag oder ein öffentliches Medium hat.**

Umsetzung: **ein** zusätzlicher Count `episodes` in `ProjectMemberCounts`, gebildet mit **exakt**
denselben Joins und Prädikaten wie die vorhandenen `countNotes`/`countMedia` (also
`projectMemberPublicNotePredicate`, `projectMemberPublicMediaPredicate`, `projectMemberUserIDsCTE`),
als eine gebündelte Query — kein neuer Ladepfad, keine neue Tabelle, keine neue Businesslogik.
Contract-Parität mitziehen: Go-DTO ↔ `shared/contracts` ↔ `frontend/src/types/projectMember.ts`.

Die Zusammenfassung nennt die Rolle(n) aus `role_labels`. Bei mehreren Rollen werden sie
kommagetrennt genannt. Ist `episodes` 0, entfällt der Folgen-Teil statt „0 Folgen" zu zeigen.

### E — Notiz-Timeline (P157-05, P157-06) — Kern der Phase

**Neue** Komponente im Projekt-Member-Ordner (Arbeitsname `ProjectMemberNoteEntry`) plus eigenes
CSS-Modul. `PublicNoteCard` bleibt **unangetastet** (siehe Wiederverwendungsgrenze oben);
`ProjectMemberNoteCard` wird ersetzt und entfällt.

Aufbau je Eintrag: Timeline-Punkt · Meta-Zeile `Folge {episode} · {version} · {Datum}` · Titel ·
geklammerter Text (bestehende `clampThreshold`-Logik bzw. „Mehr anzeigen" beibehalten) · Chevron
rechts. Der gesamte Eintrag verlinkt auf `${projectPath}/releases/${release_version_id}` — damit
bleibt die Navigationsfunktion des heutigen Footer-Links erhalten, nur kompakt.

**Rollenanzeige (Auftragspunkt 6):** Hat der Member laut `summary.role_labels` **genau eine** Rolle,
erscheint **keine** Rolle am Eintrag. Hat er **mehrere** und weicht `note.role_label` von der
Gesamtmenge unterscheidbar ab, darf ein **kleiner Chip** in der Meta-Zeile stehen
(`Folge 10 · v1 · Typesetting`). Kein Balken, keine bedingungslose Wiederholung. Die Notiz-DTO
liefert `role_label`/`role_code`/`role_color_key` weiterhin — nichts am Backend ändern.

### F — Pager (P157-07)

`useProjectMemberCollection` **nicht** anfassen. Nur die Beschriftung wird konkret: „Weitere {n}
Beiträge anzeigen", wobei `n` die tatsächlich als nächstes sichtbar werdende Anzahl ist
(`min(pageLimit-Schritt, count - shown.length)`), Singular „Weiteren 1 Beitrag anzeigen" korrekt
bilden. „{shown} von {count} angezeigt" bleibt links. „Weniger anzeigen" bleibt erhalten.
Wenn alles gezeigt ist, entfällt der Pager-Streifen; „Alle N angezeigt" verschwindet aus den
Sektionen Medien und Releases (siehe G/H), bleibt aber zulässig, wo er Information trägt.

### G — Medien (P157-08)

Kopfzeile mit Icon und Anzahl rechts, zweispaltige Galerie auf schmalen Screens, 2–3 Spalten auf
Desktop. Bestehende Lightbox (`ProjectMemberMediaViewer`) und Medienlogik **unverändert**.
„Alle 2 angezeigt" entfällt, solange keine weitere Seite existiert.

### H — Releases-Empty-State (P157-09)

Bei `counts.releases === 0`: kompakter Empty-State mit gestricheltem Rahmen und dem Satz
„Noch keine öffentlichen Release-Einträge." Kein „Alle 0 angezeigt", keine große Leerfläche.
Bei `> 0` bleibt die Sektion wie heute. Prüfen, ob das vorhandene `EmptyState`-Primitive aus
`@/components/ui` passt — bevorzugt verwenden statt Eigenbau.

### I — Responsive, Tests, Live-UAT (P157-10, P157-11, P157-12)

Kein horizontales Scrollen bei 320/390/768/1024/1440 px. Desktop mit sinnvoller Max-Width
(vorhandener `.container` bleibt maßgeblich). Die Testmatrix aus Auftragspunkt 16 ist Pflicht,
bestehende Tests werden **angepasst**, nicht gelöscht — betroffen sind mindestens
`ProjectMemberNotesSection.test.tsx`, `ProjectMemberReleasesSection.test.tsx`,
`ProjectMemberMediaGallery.test.tsx` und `page.test.tsx`.

Live-UAT gegen Member „Type"/Buddy Complex mit Screenshots für Header+Statistik, Beiträge, Medien,
Releases-Empty-State, Desktop und schmalen Viewport. **Betriebsdetail, das Zeit spart:** das Backend
erlaubt per CORS **ausschließlich** den Origin `http://127.0.0.1:3300`. Ein Screenshot über
`http://127.0.0.1:3000` lässt alle Sektions-Fetches im Preflight scheitern und die Seite sieht
fälschlich leer aus. Das committete Skript `frontend/scripts/shot-projectmember.mjs` startet dafür
einen kleinen Reverse-Proxy auf 127.0.0.1:3300 im Container und fälscht **keine** Header — dieses
Skript verwenden und um Vorher/Nachher-Kennzahlen erweitern.

## Harte Randbedingungen

- **Keine Änderung** an `PublicNoteCard` und an `ReleaseNotesList`.
- Globale Primitives aus `@/components/ui` verwenden; keine nativen `select`/`input`/`textarea`/
  `button` nachbauen.
- Nur **globale** Design-Tokens (`--surface-canvas/-card/-sunken`, `--text-primary/-muted`,
  `--color-border`, `--accent-primary/-deep`, `--shadow-*`, `--radius-*`). **Keine neuen Tokens.**
- Deutscher UI-Text mit echten Umlauten.
- Produktionsdateien ≤ 450 Zeilen; neues CSS in eigene Module, nicht in
  `ProjectMemberPage.module.css` stapeln.
- Keine Änderung an Sichtbarkeits-, Rollen-, Release- oder Paginierungssemantik.
</decisions>

<deferred>
## Deferred

- Redesign der öffentlichen Release-Detailseite oder der Gruppen-/Projektseite.
- Umgestaltung der geteilten `PublicNoteCard` und damit der Release-Notizliste.
- Neue Design-Tokens oder globale Typografie-Änderungen.
- Der offene Live-UAT-Checkpoint aus Phase 156 (Segment-Origin und Segment-Contributors) — separat.
- Push von `main` nach `origin/main` (193 Commits ahead) — Entscheidung des Auftraggebers.
</deferred>

<scope_fence>
## Scope Fence

**In scope**
- Hero-Layout: Avatar links, Metadaten rechts, Buttons nebeneinander
- Eine kompakte Statistikleiste mit Icons, Referenz-Reihenfolge und Singular/Plural
- Tab-Navigation mit Aktivzustand, ohne Abschneiden auf schmalen Screens
- Beitragszusammenfassung inkl. **einem** additiven `episodes`-Count (definiert und getestet)
- Notizen als kompakte Timeline ohne Rollen-Header, ohne doppelte Folgenangabe
- Optionaler Rollen-Chip nur bei Multi-Rollen-Membern
- Konkrete Pager-Beschriftung auf bestehender Lazy-Load-Mechanik
- Medienkopfzeile und Galerie nach Referenz, Lightbox unverändert
- Kompakter Releases-Empty-State ohne Doppelinformation
- Responsive 320–1440 px ohne horizontales Scrollen
- Angepasste Testmatrix, vollständige Frontend-Suite, Live-UAT mit Screenshots

**Out of scope**
- Änderung der geteilten `PublicNoteCard` oder der Release-Notizliste
- Neue Design-Tokens, globale Farb-/Typografieänderungen
- Backend-Neumodellierung; jede Änderung über den einen `episodes`-Count hinaus
- Änderungen an Sichtbarkeit, Rollenberechnung, Release-Zuordnung, Medienlogik, Pagination
- Erfundene Kennzahlen ohne belegte Ableitung
</scope_fence>


---

### E2 — Rollenfarbe erhalten (Nachtrag, P157-13)

Der Auftraggeber hat am 2026-09-12 nachgereicht, dass die **bestehende Rollenfarb-Semantik
vollständig erhalten** bleiben muss. Das Referenzbild zeigt neutrale weiße Timeline-Zeilen — in
diesem einen Punkt ist es **ausdrücklich nicht verbindlich**. Verbindlich bleiben Struktur,
Reihenfolge und Proportionen.

**Diese Vorgabe überschreibt den Satz aus Workstream E, dass bei genau einer Projektrolle „keine
Rolle am Eintrag" erscheint.** Korrekt ist: der **Rollenname** wird bei genau einer Projektrolle
nicht groß wiederholt, die **Rollenfarbe** ist aber an **jedem** Eintrag sichtbar — unabhängig von
der Anzahl der Projektrollen.

**Belegte zentrale Naht, die zu verwenden ist (keine parallele Farbwelt bauen):**

1. Die Notiz-DTO liefert `role_color_key` (bereits vorhanden, `frontend/src/types/projectMember.ts`).
2. `boundedColorKey()` aus `@/lib/roleCatalog` normalisiert und begrenzt den Wert auf den
   Katalogvorrat, mit `neutral` als Fallback.
3. Das Ergebnis wird als Attribut `data-color-key` an das Wurzelelement des Eintrags gesetzt —
   genau so, wie es `PublicNoteCard.tsx:85` heute tut.
4. `frontend/src/styles/globals.css:271-293` ist die **einzige Ableitungsstelle**: sie mappt
   `[data-color-key='<hex>']` auf `--role-chip-accent` und setzt daraus
   `[data-color-key] { --role-accent: var(--role-chip-accent, #596176); }`.
5. Das neue CSS-Modul konsumiert **ausschließlich** `var(--role-accent)`. Keine Hex-Werte im
   Komponenten-CSS, keine eigene Rollen-Farbtabelle in TS, kein zweites Mapping.

**Katalogfarben zur Orientierung** (live aus `role_definitions` geprüft, nicht hartzucodieren):
`typesetter #7B3C4E`, `translator #27664F`, `timer #C26A2E`, `karaoke_fx #A16207`,
`editor #6D3F83`, `quality_checker #6B7F2A`, `encoder #506B91`. Das Mauve der heutigen
Notiz-Kopfzeilen **ist** die Typesetting-Farbe `#7B3C4E` — sie muss nach dem Umbau erkennbar
bleiben.

**Gestaltungsspielraum innerhalb der Vorgabe:** schmale farbige obere Kante, linke Akzentlinie oder
kleiner Rollen-Chip. Die heutige hohe, vollflächig gefärbte Kopfzeile mit Rollenname **entfällt**.
Bei mehreren Projektrollen muss die Zuordnung eindeutig bleiben — dann ist zusätzlich ein kleiner
Rollen-Chip in der Meta-Zeile zu zeigen, weil Farbe allein für sehbeeinträchtigte Nutzer nicht
ausreicht (Farbe darf nie der **einzige** Informationsträger sein).

**Accessibility:** Es existiert `frontend/src/lib/roleCatalog.accessibility.test.ts` — die
Kontrastanforderungen dieses Guards gelten weiter. Ein farbiger Akzentstreifen ist unkritisch;
farbiger **Text** auf hellem Grund muss den vorhandenen Kontrastregeln genügen. Den Guard nicht
aufweichen.

**Zusätzliches Acceptance Criterion:** nach dem Umbau ist an jedem Beitrag die Rollenfarbe aus der
zentralen Naht sichtbar, die Seite ist nicht rein neutral, und es existiert **kein** zweites
Farbmapping im Projekt-Member-Code.


#### Pflicht-Acceptance-Test (Nachtrag 2, 2026-09-12)

Der Auftraggeber hat einen konkreten Abnahmefall nachgereicht, der über die bisherige Prüfung
„jeder Eintrag hat `data-color-key`" hinausgeht und **verbindlich** ist:

> Member mit `typesetter` **plus einer zweiten Rolle**: Beiträge beider Rollen müssen in
> **derselben** Timeline unterschiedlich und korrekt über die bestehenden Rollenfarben erkennbar
> sein, ohne wieder große Rollenheader einzuführen.

Konkret zu testen ist eine **gemischte Liste**: mindestens zwei Notizen desselben Members in einer
Sektion, deren `role_color_key` sich unterscheidet (z. B. `#7B3C4E` für `typesetter` und
`#27664F` für `translator`).

Der Test muss belegen:

1. Die gerenderten Einträge tragen **unterschiedliche** `data-color-key`-Werte, jeweils dem
   `role_color_key` **ihrer eigenen Notiz** entsprechend — nicht einen gemeinsamen Wert aus der
   Rolle des Headers oder der Summary. **Das ist der eigentliche Regressionsfänger:** ein
   Eintrag, der seine Farbe aus dem Seitenkontext statt aus der Notiz bezieht, fällt hier auf und
   sonst nirgends.
2. Beide Einträge zeigen zusätzlich ihren **kleinen** Rollen-Namens-Chip, weil
   `hasMultipleRoles` wahr ist.
3. Es entsteht **kein** großer, vollflächig gefärbter Rollen-Header — die Prüfung auf das
   Nichtvorhandensein der alten Kopfzeile gilt auch im Multi-Rollen-Fall.

Ergänzt die bestehende Prüfmatrix, ersetzt sie nicht. Er gehört in
`ProjectMemberNoteEntry`-nahe Tests bzw. in `ProjectMemberNotesSection.test.tsx`, wo eine Liste
gerendert wird.
