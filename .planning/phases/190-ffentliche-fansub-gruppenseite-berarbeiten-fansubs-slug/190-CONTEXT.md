# Phase 190: Öffentliche Fansub-Gruppenseite überarbeiten (`/fansubs/<slug>`) — CONTEXT

**Quelle des Auftrags:** Gemeinsame Live-Durchsicht mit dem Nutzer am 20./21.10.2026 auf
`/fansubs/new-subs` (Desktop 1440 px). Additiv an die bestehende ROADMAP angehängt (nach
Phase 189), kein neues Milestone, kein Reset. Dieses Dokument ist reine Ist-Analyse +
Entscheidungen — **keine Produktcode-Änderung** in diesem Schritt, **keine Planung** (kein
PLAN.md), **keine Ausführung**.

## Problem (laut Live-Durchsicht)

Aktueller Aufbau der Seite: Kopf (Banner, Logo, Name, Status-Badge, Jahre/Land/Status-Zeile,
Kennzahlen Anime-Projekte/Release-Versionen/Mitglieder, Webseite-Chip) → Geschichte (Rich-Text,
„Mehr anzeigen") → Projekte → Team & Mitglieder (Aktive Mitglieder · N, Historische Nennungen · N)
→ Historie & Erfolge (Zeitleiste) → Medien (Raster, „+N weitere"-Kachel, „Alle N anzeigen").

Der Nutzer hat beim gemeinsamen Durchgehen 14 konkrete Abweichungen vom Zielbild benannt (D-a
bis D-n unten), vor allem im Vergleich zur bereits bestehenden öffentlichen Projektseite
(`/fansubs/<slug>/fansubprojekt/<anime>`), die als Vorbild für den Kopfbereich dient.

**Explizit NICHT Teil dieser Phase:** Inhalte/Testdaten (Test-Text in „Geschichte", Tippfehler in
Meilensteinen, inhaltliche Widersprüche wie Umbenennung 2018 nach Auflösung 2015) — das sind
Daten, keine UI.

## Nutzerentscheidungen (final gesetzt — nicht neu verhandeln)

### D-a — Kopfbereich wie auf der öffentlichen Projektseite, Rahmen-Karte entfällt
Die zusätzliche umrahmende Karte um den Kopf (abgerundeter Container mit eigenem Hintergrund/
Schatten) entfällt; Banner, Logo, Name, Infos und Kennzahlen stehen frei auf der Seite. Vorbild-
Komponenten/Styles der Projektseite (HeroSection/HeroMetrics usw.) wiederverwenden bzw. gemeinsam
nutzen statt nachbauen.

### D-b — Banner größer
Etwa in der Breite/Wirkung wie auf der Projektseite statt des heutigen schmalen Streifens.
**Siehe Ist-Befund unten — die aktuellen CSS-Werte beider Seiten sind für die Banner-Höhe
identisch; offene Frage OF-02 klärt das konkrete Zielmaß.**

### D-c — Kennzahl „Release-Versionen" → „Releases"

### D-d — „aufgelöst" nur einmal anzeigen (heute Badge UND Meta-Zeile)
**Siehe Ist-Befund — die Dopplung ist strukturell für JEDEN Status, nicht nur „aufgelöst"; siehe
OF-01.**

### D-e — Aufgelöste Gruppe: nicht „Aktive Mitglieder", sondern eine passende Bezeichnung
Regel abhängig vom Gruppenstatus. Vorschlag in diesem Dokument, siehe OF-03.

### D-f — Team-Karten einheitlich hoch
Zitate gekürzt (z. B. 2–3 Zeilen) und aufklappbar, damit das Raster nicht ausfranst.

### D-g — Historische Nennungen: „unbestätigt" nicht mehr als Badge bei jeder einzelnen Nennung
Höchstens ein Hinweis in der Abschnittsüberschrift.

### D-h — Einzelnes Projekt in normaler Kartengröße im selben Raster, nicht als Großkarte
Linksbündig, wie bei mehreren Projekten.

### D-i — Medien: generische Titel wie „image" (Dateiname/Platzhalter) nicht anzeigen

### D-j — Medien: nur EIN „Alle anzeigen"-Element statt „+N weitere"-Kachel UND „Alle N
anzeigen"-Knopf

### D-k — Medien nach Themen/Kategorien gruppieren
Z. B. Forum, historische Screenshots, Galerie — alle vorhandenen Kategorien aus den Daten
ableiten, jeweils mit eigener Zwischenüberschrift. Die Rasteranordnung selbst bleibt wie heute.

### D-l — Geschichte: Textblock mittig mit guter Lesebreite, Text darin linksbündig
Aktuell nutzt der Textblock nur ca. die halbe Seitenbreite (durch `max-width: 68ch` ohne
Zentrierung — er klebt links). Neu: als Block mittig gesetzt (~70–80 Zeichen Lesebreite), Text
darin linksbündig (nicht zeilenweise zentriert); die Abschnittsüberschrift bleibt wie die anderen
links über volle Breite.

### D-m — Reihenfolge der Abschnitte bleibt wie heute

### D-n — Bleibt unverändert
Kennzahl „Mitglieder" (Zählweise), Zeitleiste „Historie & Erfolge" (vorerst keine Änderung).

## Verbindliche Vorgaben für alle späteren Schritte (Planung + Ausführung)

- **Globale UI-Primitives** aus `@/components/ui` und **Design-Tokens** (keine eigenen
  CSS-Variablennamen).
- **Bestehende Komponenten wiederverwenden** — keine Parallel-UI, keine Kopien (insbesondere
  Hero/HeroMetrics-Vorbild aus der Projektseite, `useClampedOverflow`-Hook, `FocalCarousel`).
- **Logik-Tests statt Render-/Klick-Simulation** für neue/geänderte Tests.
- **Dateien ≤ 450 Zeilen** — wer eine Produktdatei über dem Limit inhaltlich anfasst, teilt sie im
  selben Auftrag auf (reiner Umbau-Commit zuerst, danach die inhaltliche Änderung).
- **Deutsche Texte mit echten Umlauten.**
- **Live-UAT am Ende mit echten Bestandsgruppen** (keine Testdaten nötig) — mindestens
  `new-subs`, `strawhat-subs`, `dragon-subs`.

---

## Ist-Zustand 1 — Dateien der Gruppenseite

| Datei | Zeilen | Rolle |
|---|---|---|
| `frontend/src/app/fansubs/[slug]/page.tsx` | 137 | Route, orchestriert alle Sektionen |
| `frontend/src/app/fansubs/[slug]/pageHelpers.ts` | 5 | `hasStoriesContent` |
| `frontend/src/app/fansubs/[slug]/page.module.css` | 328 | Hero-/Layout-CSS |
| `frontend/src/components/fansubs/FansubHeroSection.tsx` | 190 | Kopf |
| `frontend/src/components/fansubs/FansubStorySection.tsx` | 161 | Geschichte + Archiv-Modal |
| `frontend/src/components/fansubs/FansubStoryBlock.tsx` | 47 | Einzelner Story-Block, Clamp/Expand |
| `frontend/src/components/fansubs/FansubStorySection.module.css` | 180 | CSS Geschichte |
| `frontend/src/components/fansubs/FansubProjectsSection.tsx` | 79 | Projekte-Grid-Wrapper |
| `frontend/src/components/fansubs/FansubProjectsGrid.tsx` | 75 | `FocalCarousel`-Einbindung |
| `frontend/src/components/fansubs/FansubProjectBannerCard.tsx` | 66 | Einzelne Projektkarte |
| `frontend/src/components/fansubs/FansubProjectsSection.module.css` | 139 | CSS Projekte |
| `frontend/src/components/fansubs/FansubTeamSection.tsx` | 45 | Team-Wrapper |
| `frontend/src/components/fansubs/FansubTeamActiveGroup.tsx` | 61 | „Aktive Mitglieder" |
| `frontend/src/components/fansubs/FansubTeamHistoricalGroup.tsx` | 134 | „Ehemalige"/„Historische Nennungen" |
| `frontend/src/components/fansubs/FansubMemberAvatar.tsx` | 40 | Avatar-Fallback |
| `frontend/src/components/fansubs/FansubTeamSection.module.css` | 193 | CSS Team |
| `frontend/src/components/fansubs/FansubHistorySection.tsx` | 119 | Zeitleiste |
| `frontend/src/components/fansubs/FansubMediaSection.tsx` | 18 | Medien-Wrapper |
| `frontend/src/components/fansubs/FansubGroupMediaBlock.tsx` | 169 | Medien-Grid, Overflow |
| `frontend/src/components/fansubs/FansubPublicSections.module.css` | ~360 | geteiltes CSS Media/History |

**Keine dieser Dateien überschreitet aktuell 450 Zeilen.** Größte: `page.module.css` (328).
Da `FansubHeroSection.tsx` aus `page.module.css` importiert (Zeile 10) und D-a/D-b das Hero-CSS
grundlegend ändern, ist beim Anfassen auf das Limit zu achten, falls das Hero-CSS wächst oder in
ein eigenes Modul wandert.

## Ist-Zustand 2 — Projektseite als Vorbild (Kopfbereich)

| Datei | Zeilen |
|---|---|
| `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` | 194 |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.tsx` | 99 |
| `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` | 596 (**>450**) |
| `frontend/src/components/ui/HeroMetrics.tsx` | 59 |

- `HeroMetrics` (`frontend/src/components/ui/HeroMetrics.tsx:21`) ist bereits generisch
  (`items: HeroMetricItem[]`) und wird von BEIDEN Seiten schon direkt genutzt
  (`FansubHeroSection.tsx:153`) — hier ist nichts zu extrahieren.
- `ProjectStats.tsx` ist NICHT generisch (Props `contributorCount`, `coopGroups`, `animeID` sind
  projektspezifisch) und hängt an der 596-Zeilen-`page.module.css` der Projektseite.
  `HeroSection.tsx` ist ebenfalls eng an Anime-Poster/Breadcrumbs/`GroupAssetShowcase` gebunden.
- **Entscheidend für D-a:** `.heroCard` sieht auf beiden Seiten strukturell gleich aus
  (`.heroShell`/`.heroFg`/`.heroCard`/`.heroBannerWrap` — gleiche Klassennamen, gleicher Aufbau),
  aber mit unterschiedlichem CSS-Inhalt:
  - Gruppenseite (`frontend/src/app/fansubs/[slug]/page.module.css:81-89`): `.heroCard` hat
    `background: rgba(255,255,255,0.6)`, `backdrop-filter: blur(18px)`, `border`, `box-shadow` —
    das ist die „Rahmen-Karte", die laut D-a entfallen soll.
  - Projektseite (`frontend/src/app/anime/[id]/group/[groupId]/page.module.css:84-89`): `.heroCard`
    hat **keinen** Hintergrund/Rahmen/Schatten — Kommentar im Code: „Nur Layout-Hülle: Banner und
    Projektidentität stehen ohne sichtbare Karte im Hero." Die Projektseite hat die Rahmen-Karte
    also bereits nicht.
  - Für D-a muss die Gruppenseite ihr `.heroCard`-CSS an das bereits kartenlose Muster der
    Projektseite anpassen — kein Komponenten-Neubau nötig, nur CSS-Abgleich (plus das darüber
    liegende `isCollaboration`-Panel aus `FansubHeroSection.tsx:167-184`, das es auf der
    Projektseite nicht gibt und erhalten bleiben muss).
- **Banner-Höhe (D-b):** `.heroBannerImg` ist auf beiden Seiten mit identischem
  `max-height: clamp(140px, 17vw, 200px)` definiert (Gruppenseite `page.module.css:94-100`,
  Projektseite `page.module.css:97-103`). Die CSS-Werte sind also bereits gleich — siehe OF-02 für
  die offene Frage, was „größer" konkret heißen soll.

## Ist-Zustand 3 — Status-Doppelanzeige (D-d)

- Badge im Kopf: `FansubHeroSection.tsx:147` — `<Badge variant={statusVariant(group.status)}>
  {statusLabel(group.status)}</Badge>`, lokale Label-Funktion `FansubHeroSection.tsx:47-51`.
- Meta-Zeile: `frontend/src/lib/fansub-summary.ts:15-20` (`statusLabel` innerhalb
  `buildFansubFactSummary`), gerendert über `factSummary` in `FansubHeroSection.tsx:149`.
- Beide Stellen haben eigene, separate `statusLabel`-Implementierungen — Dopplung sowohl visuell
  als auch im Code (zwei Funktionen mit identischer Fallunterscheidung).
- **Live bestätigt (Screenshot `dragon-subs`, Status `active`):** Die Dopplung tritt für JEDEN
  Status auf, nicht nur „aufgelöst" — Badge „aktiv" UND eine eigene Klartext-Zeile „aktiv"
  erscheinen beide. Siehe OF-01.

## Ist-Zustand 4 — „Aktive Mitglieder"/Status-abhängige Bezeichnung (D-e)

- `"Aktive Mitglieder · {members.length}"`: `FansubTeamActiveGroup.tsx:41`.
- Datenmodell: `FansubStatus = "active" | "inactive" | "dissolved"` (`frontend/src/types/
  fansub.ts:10`), Feld `status` auf `FansubGroup` (`fansub.ts:41`).
- `FansubTeamActiveGroup` bekommt aktuell nur `members`, keinen Gruppenstatus. Der Aufrufpfad ist
  kurz: `page.tsx:111` (`<FansubTeamSection members=... historical=... />`, `group` ist dort bereits
  in Scope) → `FansubTeamSection.tsx:40` (`<FansubTeamActiveGroup members={activeMembers} />`) →
  Komponente selbst. `group.status` müsste durch zwei Komponentenebenen durchgereicht werden.
- Siehe OF-03 für Bezeichnungsvorschläge je Status.

## Ist-Zustand 5 — Team-Karten/Zitate (D-f)

- Zitat-Rendering ohne jede Längenbegrenzung: `FansubTeamActiveGroup.tsx:27`,
  `FansubTeamHistoricalGroup.tsx:51` (`member.member_slogan` in „…", Typ
  `frontend/src/types/domain-projection.ts:21,36` ohne Längenlimit).
- `memberGrid` (`FansubTeamSection.module.css:13`) hat keine feste Zeilen-/Karten-Höhe — lange
  Zitate sprengen das Raster schon heute.
- Wiederverwendbares Muster existiert bereits 1:1: `FansubStoryBlock.tsx:19-20,34-44` nutzt
  `frontend/src/hooks/useClampedOverflow.ts` + Button „Mehr anzeigen"/„Weniger anzeigen". Dasselbe
  Clamp/Expand-Pattern lässt sich auf die Zitat-Anzeige in den Team-Karten übertragen.

## Ist-Zustand 6 — „unbestätigt"-Badge (D-g)

- `FansubTeamHistoricalGroup.tsx:48` — `{unconfirmed ? <Badge variant="muted">unbestätigt</Badge>
  : null}`.
- Die komplette Teilgruppe „Historische Nennungen" besteht ausschließlich aus Mitgliedern mit
  `claimed === false` (`FansubTeamHistoricalGroup.tsx:78,115`) — **jede** Karte in dieser Gruppe
  bekommt den Badge, er ist also 1:1 redundant zur Abschnittsüberschrift „Historische Nennungen".
  Einfache Korrektur: Badge entfernen, Hinweis stattdessen z. B. in
  `"Historische Nennungen (unbestätigt) · {count}"` an der Überschrift (`:112`).

## Ist-Zustand 7 — Einzelprojekt-Großkarte (D-h)

- `FansubProjectsSection.tsx:53-57` trägt den Kommentar: „alle Projekte in EINEM responsiven Grid
  ... jede Karte gleich gross ... keine ueberbreite Einzelkarte" — die Absicht war also bereits,
  genau das zu vermeiden, was D-h jetzt wieder bemängelt.
- Tatsächlicher Verursacher liegt NICHT in den Fansub-Dateien, sondern im geteilten Primitive:
  `FansubProjectsGrid.tsx` delegiert an `@/components/ui/FocalCarousel`, das bei genau einem
  sichtbaren Element einen generischen „quiet"-Modus aktiviert:
  `frontend/src/components/ui/FocalCarousel.tsx:355` (`const quiet = visibleItems.length === 1`),
  wirksam in `FocalCarouselInternals.tsx:282-283,297,332,342,351` und
  `FocalCarousel.module.css:44-57` (`.quietTrack`, zentriert/ruhig, ohne Navigation/Zähler).
- `FocalCarousel` wird auch von `MemberBadgeChain.tsx`, `RoleAchievementCard.tsx`,
  `ThumbnailStrip.tsx` und `AchievementBadgeShowcase.tsx` genutzt — dort kann der „quiet"-Modus bei
  einem einzelnen Abzeichen durchaus gewünscht sein. Eine globale Abschaltung würde dort Verhalten
  ändern, das nicht Teil dieser Phase ist. Siehe OF-04.

## Ist-Zustand 8 — Medien: generische Titel & Kategorien (D-i, D-j, D-k)

- Titel-Fallback: `FansubGroupMediaBlock.tsx:98` —
  `item.title?.trim() || item.caption?.trim() || item.media_type`.
- `media_type` kommt aus dem Backend-Query `COALESCE(mt.name, ma.mime_type, 'group_media')`
  (`backend/internal/repository/fansub_repository_public_profile.go:327`) — in der Live-DB
  praktisch immer der Wert `"image"` (aus `media_types.name`).
- **Live-Stichprobe (`fansub_group_media`, read-only SELECT):** 5 von 10 öffentlichen Medien der
  Gruppe `new-subs` haben weder `title` noch `caption` gesetzt und würden heute als Titel
  schlicht „image" anzeigen — bestätigt D-i konkret an echten Bestandsdaten.
- „+N weitere"-Kachel: `FansubGroupMediaBlock.tsx:148-152`. „Alle N anzeigen"-Button:
  `FansubGroupMediaBlock.tsx:154-159`. Beide erscheinen aktuell gleichzeitig, sobald
  `media.length > PREVIEW_LIMIT (5)` (D-j: nur eines davon soll bleiben).
- **Kategorie-Feld:** Spalte `category VARCHAR(40)` auf `fansub_group_media`
  (`database/migrations/0109_fansub_group_media_management.up.sql:16-32`), CHECK-Constraint mit
  genau 8 zulässigen Werten: `gallery`, `history_screenshot`, `old_website`, `forum`, `irc_chat`,
  `event_meeting`, `artwork_fanart`, `other`. Frontend-Typ `category: string`
  (`frontend/src/types/fansub-public-profile.ts:69`), deutsches Label-Mapping bereits vorhanden:
  `getFansubMediaCategoryLabel` (`frontend/src/lib/fansub-labels.ts:39-41`), Tag-CSS-Klassen
  bereits vorhanden: `CATEGORY_TAG_CLASS` (`FansubGroupMediaBlock.tsx:34-43`). Für D-k reicht es,
  nach `item.category` zu gruppieren (keine neue Taxonomie nötig) — Live-Stichprobe `new-subs`
  nutzt tatsächlich 4 der 8 Kategorien (`forum`, `old_website`, `gallery`, `artwork_fanart`,
  `history_screenshot`).

## Ist-Zustand 9 — Geschichte-Textbreite (D-l)

- `FansubStorySection.module.css:1-8` — `.storyStack { max-width: 68ch; ... }`, **ohne**
  `margin: 0 auto` und **ohne** `text-align`. Der Block ist also bereits linksbündiger Fließtext,
  aber er klebt am linken Rand der vollen Section-Breite (`.gridSection`,
  `page.module.css:271-274`, selbst `margin: 0 auto` zentriert, aber 100 % breit) — dadurch der
  optische Eindruck „nur halbe Seitenbreite, linksbündig" statt eines mittig gesetzten Blocks.
- Korrektur ist eine reine CSS-Änderung: `.storyStack` zusätzlich `margin: 0 auto` (oder äquivalent
  zentrierter Wrapper), `max-width` ggf. auf Zielwert 70–80 Zeichen justieren (aktuell 68ch).
  `SectionHeader` (`FansubStorySection.tsx:101`) bleibt unverändert außerhalb des zentrierten
  Blocks, wie heute schon strukturell der Fall (Header ist Section-Geschwisterelement, nicht Teil
  von `.storyStack`).

## Ist-Zustand 10 — Design-System-Konformität

- Die Gruppenseite nutzt bereits konsequent `@/components/ui` (`Badge`, `Button`, `SectionHeader`,
  `HeroMetrics`, `Modal`, `EmptyState`, `FocalCarousel`). Keine rohen `<button>`/`<select>`/
  `<input>` gefunden.
- `FansubMemberAvatar.tsx` baut Avatar-Bild/Initialen-Fallback komplett handgestrickt — in
  `@/components/ui` existiert aktuell kein einzelnes `Avatar`-Primitive (nur `AvatarStack` für
  Gruppen). Kandidat für ein generisches Primitive, aber kein klarer Verstoß der heutigen Datei.

## Ist-Zustand 11 — Testabdeckung (betroffene Dateien)

| Datei | Test | Art |
|---|---|---|
| `page.tsx` | vorhanden | gemischt |
| `pageHelpers.ts` | vorhanden | Logik |
| `FansubHeroSection.tsx` | **keiner** | — |
| `FansubStorySection.tsx` | vorhanden | Render (RTL) |
| `FansubStoryBlock.tsx` | vorhanden | `renderToStaticMarkup`, keine Klicks |
| `FansubProjectsSection.tsx` | vorhanden | Render |
| `FansubProjectsGrid.tsx` | vorhanden | Render+Klick |
| `FansubProjectBannerCard.tsx` | **keiner** | — |
| `FansubTeamSection.tsx` | vorhanden | Render |
| `FansubTeamActiveGroup.tsx` | vorhanden | Render |
| `FansubTeamHistoricalGroup.tsx` | vorhanden | Render+Klick |
| `FansubHistorySection.tsx` | vorhanden | Render |
| `FansubMediaSection.tsx` | vorhanden | Render |
| `FansubGroupMediaBlock.tsx` | vorhanden | Render+Klick |
| `HeroSection.tsx` (Projektseite) | **keiner** | — |
| `ProjectStats.tsx` (Projektseite) | vorhanden | Render+Klick |
| `HeroMetrics.tsx` (ui) | vorhanden | Render+Klick |

Fast alle bestehenden Tests sind Render-/Klick-Simulationen (`@testing-library/react`) — laut
CLAUDE.md-Teststil-Regel kein Vorbild zum Weiterkopieren für neue Tests in dieser Phase; neue
Tests sollen, wo möglich, Logik direkt prüfen (z. B. Status-Label-Mapping, Medien-Gruppierung nach
Kategorie, Titel-Fallback-Priorität als reine Funktionen extrahiert und getestet). Besonders
relevant: `FansubHeroSection.tsx` und `FansubProjectBannerCard.tsx` haben aktuell gar keine Tests,
werden aber von dieser Phase am stärksten verändert.

## Ist-Zustand 12 — Live-Sichtprüfung (Desktop 1440 px + Mobil 375 px)

Geprüft: `new-subs` (viele Daten), `strawhat-subs` (weniger Daten), `dragon-subs` (gewählt als
dritte Gruppe ohne Banner/Medien/Historie/Team — 0 Medien, 0 Historie, 0 Mitglieder, 1 Projekt).

**Bestätigt die oben genannten Befunde:** Rahmen-Karte (D-a) auf `new-subs`/`strawhat-subs`
sichtbar; Status-Dopplung (D-d) bei `dragon-subs` mit Status „aktiv" reproduziert (nicht nur
„aufgelöst"); `strawhat-subs` hat 0 Medien → Medien-Abschnitt fehlt komplett ohne Platzhalter
(unverändertes bestehendes Verhalten, nicht Teil der D-Liste, aber relevant für OF-05).

**Neue Beobachtungen, nicht in der D-Liste — siehe offene Fragen unten:**
- `dragon-subs`: Kopf zeigt Status „aktiv" doppelt UND die Seite danach besteht nur aus dem
  Projekte-Abschnitt — Geschichte/Team/Historie/Medien sind komplett ausgeblendet (kein
  Empty-State), die Seite wirkt sehr leer/abrupt zu Ende. → OF-05.
- `strawhat-subs`: Bei Mitglied „founder" erscheint neben den Rollen-Badges zusätzlich „Edit" als
  weiteres Label. Live-DB-Check bestätigt: `role_definitions.label_de = 'Edit'` für Rollen-Code
  `editor` — ein siteweiter Katalog-Datensatz, kein Rendering-Fehler. → OF-06.
- Mobil (375 px), `new-subs`/`strawhat-subs`: Die dreispaltige Kennzahlen-Zeile bricht auf zwei
  Zeilen um, der dritte Wert („Mitglieder") steht dann allein/verwaist in eigener Zeile statt
  gleichmäßig verteilt. → OF-07.
- Kein horizontales Scrollen, keine abgeschnittenen Texte, keine Überlappungen in den drei
  mobilen Screenshots festgestellt (abgesehen vom o. g. Kennzahlen-Umbruch).
- Ein rundes „N"-Icon erscheint in allen drei mobilen Screenshots über dem Seiteninhalt — das ist
  der Next.js-Entwicklungsmodus-Indikator (Dev-Overlay), kein Produktionsverhalten, keine
  Maßnahme nötig.

---

## Offene Fragen an den Nutzer

### OF-01 — Status-Dopplung: nur „aufgelöst" oder alle Status-Werte?
D-d benennt wörtlich „aufgelöst". Der Code erzeugt die Dopplung (Badge + Meta-Zeile-Klartext)
aber strukturell für JEDEN Status — am Beispiel `dragon-subs` (Status „aktiv") live bestätigt.
*Empfehlung:* Für alle drei Status-Werte entdoppeln (einfacher, konsistenter, passt zum
beobachteten Verhalten) statt eine Sonderregel nur für „aufgelöst" einzubauen.

### OF-02 — Banner „größer": konkretes Zielmaß?
Die aktuelle Banner-Höhe (`max-height: clamp(140px, 17vw, 200px)`) ist auf Gruppenseite UND
Projektseite bereits identisch definiert — es gibt also aktuell keinen CSS-Unterschied, den man
„von der Projektseite übernehmen" könnte. Der optische Eindruck „schmaler Streifen" auf der
Gruppenseite entsteht vermutlich im Zusammenspiel mit der entfernten Rahmen-Karte (D-a) und/oder
dem seitlichen Padding (`heroBannerWrap`), nicht aus einem abweichenden Höhenwert.
*Empfehlung:* Zunächst D-a (Rahmen-Karte entfernen) umsetzen und das Banner danach erneut im
Kontext beurteilen, statt vorab einen neuen Zahlenwert festzulegen — falls es dann immer noch zu
klein wirkt, konkretes Zielmaß (z. B. größere `clamp`-Obergrenze) in der Planung nachschärfen.

### OF-03 — Bezeichnung für „Aktive Mitglieder" je Gruppenstatus
D-e verlangt eine passende Bezeichnung für aufgelöste Gruppen, ohne sie festzulegen.
*Empfehlung:* „Mitglieder" für `dissolved` (neutral, kein Aktivitätsanspruch), „Mitglieder" auch
für `inactive` (pausiert ist nicht dasselbe wie aufgelöst, aber „aktiv" wäre ebenfalls irreführend)
und „Aktive Mitglieder" nur für `active`. Alternative: „Letzte Mitglieder" für `dissolved`, um den
historischen Charakter stärker zu betonen — bitte eine der beiden Varianten bestätigen oder eigene
Formulierung vorgeben.

### OF-04 — Technischer Weg für D-h (kein Großkarten-Modus bei 1 Projekt)
`FocalCarousel`s „quiet"-Einzelitem-Modus wird auch von Profil-Komponenten (`MemberBadgeChain`,
`RoleAchievementCard`, `ThumbnailStrip`) genutzt, wo ein zentriertes Einzelabzeichen plausibel
gewünscht ist. Soll das generische Primitive einen neuen, optionalen Prop bekommen (z. B.
`singleItemLayout: 'quiet' | 'grid'`, Default bleibt `'quiet'` → kein Verhaltenswechsel für
bestehende Nutzer), den nur `FansubProjectsGrid` auf `'grid'` setzt? Oder soll
`FansubProjectsGrid` bei genau einem Projekt `FocalCarousel` gar nicht verwenden und die Karte
direkt rendern?
*Empfehlung:* Neuer optionaler Prop am Primitive mit rückwärtskompatiblem Default — vermeidet
Komponenten-Duplikation und hält die Karte im selben Grid-Layout-Pfad wie bei mehreren Projekten
(entspricht der ursprünglichen Absicht aus dem Code-Kommentar in `FansubProjectsSection.tsx:53-57`).

### OF-05 — Leere Abschnitte bei datenarmen Gruppen (Beispiel `dragon-subs`)
Nicht in der D-Liste, aber live beobachtet: Gruppen ohne Geschichte/Team/Historie/Medien zeigen
diese Abschnitte heute komplett ausgeblendet (kein Platzhalter) — die Seite endet abrupt nach dem
Projekte-Abschnitt. Ist das weiterhin das gewünschte Verhalten (nur vorhandene Abschnitte zeigen),
oder soll Phase 190 das mitbehandeln (z. B. generische Empty-States wie bereits bei Medien
vorhanden, `EmptyState`-Primitive)?
*Empfehlung:* Unverändert lassen (kein neuer Scope) — die Phase ist bereits mit 14 Entscheidungen
klar umrissen; leere Abschnitte ausblenden ist ein verbreitetes, bewusstes Muster im Repo
(z. B. `FansubMediaSection`/`FansubTeamSection` geben bei 0 Einträgen `null` zurück) und keines
der D-a bis D-n Themen berührt das.

### OF-06 — Rollen-Label „Edit" statt korrektem deutschen Begriff für `editor`
Sitzweiter Katalog-Datensatz (`role_definitions.label_de = 'Edit'` für Rollen-Code `editor`),
sichtbar genau auf den Team-Karten, die D-f umbaut. Technisch eine Daten-/Katalogkorrektur
(ein Zeilenupdate per Migration), kein UI-Strukturproblem — aber anders als die explizit
ausgeschlossenen Testdaten (Phase-Beschreibung) ist das hier ein siteweites Label, keine
gruppenspezifische Testbefüllung.
*Empfehlung:* Mitbeheben (eine Zeile, z. B. `label_de = 'Editor'`, via append-only Migration) — der
Aufwand ist minimal und die Karten werden in dieser Phase ohnehin inhaltlich angefasst; sonst
bleibt ein sichtbarer Fehler exakt auf der neu gestalteten Fläche stehen.

### OF-07 — Kennzahlen-Zeile auf Mobil: Umbruchverhalten
Bei 375 px bricht die dreispaltige Kennzahlen-Zeile (Anime-Projekte/Releases/Mitglieder) auf zwei
Zeilen um, der dritte Wert steht dann allein. Das ist ein von `HeroMetrics` (bereits geteiltes
Primitive) geerbtes Verhalten, nicht fansub-spezifisch.
*Empfehlung:* Nicht in dieser Phase beheben, da es `HeroMetrics` siteweit betrifft (auch die
Projektseite) und damit über den Scope „Fansub-Gruppenseite" hinausgeht — als separates
Folge-Todo festhalten, falls gewünscht.

---

## Nächster Schritt

Dieses Dokument wartet auf Antworten zu OF-01 bis OF-07. Danach: `/gsd:discuss-phase 190` bzw.
`/gsd:plan-phase 190`, um die Entscheidungen in einen ausführbaren Plan zu überführen. Keine
Planung, keine Ausführung, keine Produktcode-Änderung vor diesem Punkt.
