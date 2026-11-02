# Quick Task 261102-hlg: Schritt 3 Pilot-Bausteine für /anime und /anime/[id] - Context

**Gathered:** 2026-11-02
**Status:** Ready for planning

**Hinweis:** Dies ist Schritt 3 des Auftrags aus Quick-Task 261102-cb2 (Storybook-Grundlage +
Pilot /anime, /anime/[id]). Der Mensch hat die dort vorgelegte Einordnungs-Rückfrage
(`261102-cb2-EINORDNUNG.md`) beantwortet -- die Entscheidungen unten sind seine wörtliche
Antwort, LOCKED, nicht erneut zur Diskussion stellen.

<domain>
## Task Boundary

Auf Basis der Antwort des Menschen auf die Einordnungs-Rückfrage: zwei neue globale Bausteine
bauen, einen bestehenden Baustein statt eines Neubaus nutzen, und die Pilotseiten /anime und
/anime/[id] konsequent auf die Design-System-Pflichtnutzung umstellen (keine Eigenbau-Elemente
mehr, wo ein Grundbaustein existiert). Beide Pilot-Storys und die Einordnungstabelle danach
nachführen.

</domain>

<decisions>
## Implementation Decisions (wörtliche Antwort des Menschen)

### 1. Neuer Grundbaustein "Link-Chip" (`frontend/src/components/ui`)
Link in Chip-Form, Design-Tokens, sichtbarer Fokus, optional Zähler/Icon. Genres- und Tags-Liste
der Detailseite (`AnimeDetailView.tsx`) auf diesen Baustein umstellen -- EIN gemeinsamer Aufbau,
nur die Ziel-Suchparameter unterscheiden sich (`buildFilterHref('genre'|'tag', ...)`). API bewusst
allgemein halten, damit er später auch für Fansub- und Release-Seiten passt (KEINE Umstellung
dieser anderen Seiten in diesem Auftrag -- nur die API so entwerfen, dass sie dafür passt).
Deutsche, realistische Stories; Grundbaustein-Kriterium beachten (kein Import einer anderen
katalogisierten `components/ui`-Komponente, sonst `catalogTaxonomy.test.ts` rot).

### 2. Neuer zusammengesetzter Baustein "Abschnitt mit Bannerhintergrund"
Bannerbild/Backdrop als Hintergrund mit deckender Abdunklung (WCAG-AA-Kontrast, analog zum
bestehenden Muster in `FansubHeroSection`), unscharfer Fallback, Inhalt darüber. Ersetzt auf der
Detailseite den heutigen `.heroBanner`/`.bannerImage`/`.bannerOverlay`-Inline-Style-Block.
`AnimeBackdropRotator` bleibt eigenständiger Fachbaustein, wird aber INNERHALB des neuen
Abschnitts eingesetzt (Komposition, kein Ersatz). "Besteht aus"-Hinweis in der Autodocs-
Beschreibung nach dem etablierten Muster (`storybookDocsLink()`). Die öffentliche Fansub-Seite
übernimmt diesen Baustein später -- NICHT in diesem Auftrag umstellen, nur als Vorbild dienen
(API so entwerfen, dass eine spätere Migration dorthin plausibel ist, aber keine aktive Änderung
an Fansub-Dateien).

### 3. Episodenzahl auf dem Poster: KEIN neuer Baustein
Vorhandenes `Badge` (Variante `onMedia`, bereits für Banner-Overlays gedacht) über dem Poster
statt des heutigen Eigenbau-`<div>`/`<span>`-Stats-Overlays. Deutscher Text: "12 Folgen" (Plural),
Einzahl "1 Folge", bei 0 oder unbekannt (`max_episodes` null/0) wird das Badge komplett
ausgeblendet (kein "0 Folgen").

### 4. Design-System-Pflichtnutzung (keine neuen Bausteine, nur bestehende konsequent einsetzen)
- **`/anime`-Kopf** (`AnimeListView.tsx`): sichtbaren Entwicklertext entfernen ("P0 MVP",
  "… mit A-Z Filter und Pagination"). Bestehenden `PageHeader`-Baustein bzw. `Heading`/`Text`
  nutzen, fachlich-deutscher Text, z. B. Titel "Anime", Untertitel "1.234 Einträge" (lokalisierte
  Zahl, bestehendes `toLocaleString('de-DE')`-Muster beibehalten).
- **Detailseite** (`AnimeDetailView.tsx`): `<h1>` → `Heading`; Beschreibungs-`<p>` → `Text`;
  Emby-`<a>` → `Button` im Link-Modus (as-Link, behält externen Link-Charakter,
  `target="_blank"`/`rel="noopener noreferrer"`); die drei Typ-/Art-/Jahr-Pillen (aktuell
  Eigenbau-`<span className={styles.badge}>`) → `Badge` (neutrale Variante, optisch einheitlich
  mit dem bereits genutzten `StatusBadge`); Poster `next/image` → `ResponsiveImage`/`MediaFrame`
  (je nachdem, welcher der beiden Bausteine für ein festes Seitenverhältnis-Bild mit Fallback
  gedacht ist -- bei der Umsetzung gegen den tatsächlichen Bestand prüfen, welcher passt, nicht
  raten).
- **Fehlerkästen** auf BEIDEN Pilotseiten ("Liste konnte nicht geladen werden" in
  `AnimeListView.tsx`, "Episoden konnten nicht geladen werden" in `AnimeDetailView.tsx`) →
  `ErrorState` (kompakte Variante, `role="alert"` bleibt erhalten/wird von `ErrorState` selbst
  gestellt). Falls zugehörige Tests (`page.test.tsx` o. ä.) auf das alte Eigenbau-Markup
  angewiesen sind: Testassertions auf das neue, tatsächliche Verhalten umstellen -- NICHT den
  Eigenbau beibehalten, um Tests grün zu halten.
- **Nicht anfassen:** `AnimeCard`, `AnimeEdgeNavigation`, `AnimeRelations`,
  `FansubVersionBrowser` bleiben in diesem Auftrag unverändert (Fachbausteine, bewusst außerhalb
  des Scopes).

### 5. Ergänzende Entscheidung (NACHTRAG, wörtliche Antwort des Menschen, LOCKED)
Die öffentlichen Seiten haben eigene Karten-Optiken (durchscheinend/Glas auf Bannerhintergrund,
dunkle bzw. blaue Flächen, z. B. `.infoCard` auf `/anime/[id]` mit rgba-Flächen,
`backdrop-filter`, eigenen Schatten). Diese sollen NICHT durch die vorhandene helle Admin-`Card`
ersetzt werden und auch NICHT als seiteneigenes CSS weiterleben. Stattdessen werden genau diese
öffentlichen Kartenoptiken selbst zu Grundbausteinen:
- `Card` bekommt offizielle Varianten für öffentliche Flächen (z. B. "Glas auf Bild/Hintergrund"
  und die dunkle/blaue Variante -- Bestand prüfen und passend benennen), aus Tokens (keine
  rgba-/px-Literale; fehlende Tokens neu in `styles/tokens` anlegen), WCAG-AA-Kontrast für Text
  darauf, mit Storybook-Stories (hell/dunkel, auf Bannerhintergrund, Desktop/Mobil).
- `Heading`/`Text`/`Badge`/`LinkChip` auf diesen Karten lesbar über offizielle Optionen (z. B. ein
  Ton "auf dunkler Fläche"), NICHT per Überschreiben privater Variablen von außen (der
  Fremd-Override-Wächter, `foreignVariableOverrides.regression.test.ts`, muss leer bleiben). Das
  gilt AUSDRÜCKLICH auch für den in Task 5 ursprünglich geplanten mobilen Kontrast-Fix der
  Badges: dort war ein CSS-Variablen-Override von außen vorgesehen -- das wird durch eine
  offizielle Baustein-Variante ersetzt, NICHT durch das Override-Muster umgesetzt.
- Die Info-Karte der Detailseite UND weitere Karten auf `/anime` und `/anime/[id]` werden auf
  diese neuen `Card`-Varianten umgestellt. Andere öffentliche Seiten mit derselben Optik werden
  in DIESEM Auftrag NICHT umgestellt, aber in der Einordnungstabelle (`261102-cb2-EINORDNUNG.md`)
  mit Datei:Zeile aufgeführt, damit sie im künftigen Seiten-Durchgang folgen.

Der Rest der Entscheidung (Link-Chip, Abschnitt mit Bannerhintergrund, Episodenzahl als Badge auf
Bild, Pflicht-Nutzung vorhandener Bausteine) bleibt unverändert (Punkte 1-4 oben).

### 6. Zweiter Nachtrag -- Grundsatz zur öffentlichen Optik (wörtliche Antwort, LOCKED)
Die öffentliche Optik ist KEIN Fehler, den man an die Admin-Optik angleicht, sondern eine ZWEITE
offizielle Erscheinung derselben Bausteine. Beispiel Linien/Ränder/Trenner: im Admin-Bereich
weinrot, auf den öffentlichen Seiten weiß und durchscheinend -- BEIDES ist richtig. Daraus folgt:
- Linien, Ränder und Trenner (Card-Rand, Divider/Trennlinie, Chip-/Badge-Rand, Fokus- und
  Hover-Linien u. ä.) bekommen NEBEN der weinroten Standardvariante eine offizielle Variante "auf
  dunkler/öffentlicher Fläche" (weiß, durchscheinend) aus Tokens (z. B. `--border-on-media` o. ä.
  -- Bestand in `styles/tokens` prüfen, sonst neu anlegen).
- Bausteine wählen diese Erscheinung über eine offizielle Option bzw. über den Kontext der
  öffentlichen Karte/des Bannerabschnitts -- NICHT per Überschreiben von außen.
- Nichts Öffentliches wird auf Weinrot "korrigiert". In Storybook werden beide Erscheinungen
  nebeneinander gezeigt (Admin hell / öffentlich dunkel auf Hintergrund).

Dieser Grundsatz gilt für ALLE in diesem Auftrag berührten/neuen Bausteine (`Card`, `LinkChip`,
`Badge`, `BannerSection`, ggf. `Divider`-artige Trennlinien), nicht nur für die Kartenfläche
selbst.

### 7. Dritter Nachtrag -- EpisodeGlassCard-Tönungen (wörtliche Antwort, Grundlage für Punkt 8)
Die farbigen Glaskarten der Episoden sind gewollt: Die Farbe ergibt sich aus der Episodenart
(`frontend/src/components/fansubs/EpisodeGlassCard.module.css`): Haupthandlung/canon = blau
(hsl 222), Filler = rot (hsl 2), gemischt/mixed = violett (hsl 272), Rückblick/recap = gold
(hsl 42); je Fläche ~12-14 % und Rand ~32-34 %. Heute sind das feature-lokale Variablen
(`--glass-*`) mit rgba-Literalen. (Die Umsetzungsgrenzen aus diesem Punkt -- "nur die
Kartenfläche, FansubVersionBrowser sonst nicht anfassen" -- sind durch Punkt 8 unten PRÄZISIERT/
ERSETZT, nicht mehr wörtlich gültig; als Kontext/Datenquelle stehen gelassen.)

### 8. Vierter Nachtrag -- Präzisierung zum Aufbau: drei Ebenen, erweiterter Umbau-Umfang (wörtliche Antwort, LOCKED, ersetzt die Einschränkung aus Punkt 7)
Die öffentliche Seite hat mehrere Kartenvarianten. Im aktuellen Code nachsehen (`EpisodeGlassCard.
tsx`/`.module.css`, `ReleasePreviewRow.tsx`/`.module.css`, `FansubVersionBrowser.module.css`,
`app/anime/[id]/page*.module.css` und weitere Karten auf `/anime` und `/anime/[id]`) und daraus
DREI Ebenen bauen:

**Ebene 1 -- Grundbaustein:** Die vorhandenen Werte (Glasflächen, Ränder, Text, Blur, Tönungen je
Episodenart canon/filler/mixed/recap usw.) 1:1 übernehmen und als globale Tokens in
`styles/tokens` anlegen. Die Kartenfläche als Grundbaustein: entweder `Card` um die öffentlichen
Varianten (Glas, dunkel, Tönung) ergänzen ODER -- wenn fachlich sauberer -- ein neuer
Grundbaustein (z. B. "Glaskarte"). **Entscheidung im Bericht begründen**, nicht nur umsetzen.
Stories mit allen Varianten/Tönungen auf Bannerhintergrund.

**Ebene 2 -- Zusammengesetzte Bausteine:** die echten Karten mit ihren Inhalten aus
Grundbausteinen aufbauen, je mit Stories für ALLE im Code vorkommenden Varianten. Mindestens:
- **Episodenkarte** (heute `EpisodeGlassCard`): je Episodenart, zu-/aufgeklappt, 1 vs. viele
  Versionen, langer Titel, ohne Klassifikation.
- **Release-/Versionszeile** (heute `ReleasePreviewRow`): mit Gruppenlogo, ohne Logo
  (Kürzel/Avatar), Koop mit mehreren Gruppen, weitere im Code vorkommende Zustände.
- weitere Kartenvarianten der Seite, die sich im Code finden (Info-Karte usw.).
"Besteht aus: …" mit Links. Native `<button>`/`<p>`/`<span>`-Eigenbauten darin auf Grundbausteine
(`DisclosureTrigger`, `Heading`/`Text`, `Badge`, `Avatar`, `LinkChip` …) umstellen. Bestehende
Optik visuell GLEICH halten.

**Ebene 3 -- Im Einsatz:** am Ende die komplette Seite `/anime/[id]` (und `/anime`) als Story,
einmal ausgeloggt und einmal eingeloggt (Rollen-Umschalter), Desktop/Mobil, mit echten
zusammengesetzten Bausteinen.

**Grenzen:** Große Dateien dabei fachlich aufteilen (450-Zeilen-Limit, `FansubVersionBrowser`
389 Z. beachten -- nach den Änderungen real nachzählen, nicht die alte Zahl annehmen). Verhalten
(Filter, Gruppenwechsel, Windowing, Tests) darf sich NICHT ändern; bestehende Tests müssen grün
bleiben.

**Status:** Dies ersetzt die engere Umbau-Grenze aus Punkt 7 ("nur Kartenfläche, sonst nicht
anfassen") durch einen deutlich größeren Umbau-Umfang: `EpisodeGlassCard.tsx`,
`ReleasePreviewRow.tsx` und ihre jeweiligen CSS-Module sind jetzt vollständig im Scope (Inhalt +
Fläche), `FansubVersionBrowser.tsx` selbst bleibt verhaltensgleich, darf aber bei Bedarf
strukturell angefasst werden (Eigenbau-Markup innerhalb auf Grundbausteine umstellen), solange
Filter-/Gruppenwechsel-/Windowing-Verhalten und bestehende Tests unverändert bleiben.

### Abnahme-Pflicht für diesen Auftrag
- `AnimeListView.stories.tsx`/`AnimeDetailView.stories.tsx` auf den neuen Stand aktualisieren:
  Desktop/Mobil, mit/ohne Banner (Detailseite -- Fall ohne `coverUrl`/Backdrop), ohne Genres/Tags
  (Leerzustand des neuen Link-Chip-Bausteins), lange Titel.
- `261102-cb2-EINORDNUNG.md` nachführen: die jetzt migrierten Zeilen von "Eigenbau" auf
  "vorhandener Grundbaustein"/"neuer Grundbaustein"/"neuer zusammengesetzter Baustein" aktualisieren
  (Datei:Zeile erneut gegen den finalen Code prüfen, siehe Lektion aus der letzten Korrekturrunde).
- Live-Nachweis `/anime` und `/anime/1` (bzw. eine echte vorhandene Anime-ID) auf Port 3000.

</decisions>

<specifics>
## Specific Ideas

- "Link-Chip" API-Entwurf sollte mindestens aufnehmen: `href`, sichtbarer Text/Children, optional
  `icon`/`count`, `className`. Prüfen, wie `genreChip`/`tagChip` heute aussehen (Farbe, Form,
  Hover/Fokus) und das 1:1 ins neue Primitiv übernehmen, keine optische Änderung erfinden.
- "Abschnitt mit Bannerhintergrund": `FansubHeroSection` als Vorbild für den WCAG-AA-Kontrast-
  Mechanismus (Overlay-Opazität/-Farbe) genau studieren, nicht neu erfinden.
- Badge-Variante `onMedia` bereits für Banner-Overlays gedacht laut Aussage des Menschen --
  tatsächliche Prop-Namen/Varianten in `Badge.tsx` verifizieren, nicht annehmen.

</specifics>

<canonical_refs>
## Canonical References

- `.planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/261102-cb2-EINORDNUNG.md`
  (Rückfrage, die dieser Auftrag beantwortet)
- `.planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/` (gesamter Vorgänger-
  Auftrag: PLAN/RESEARCH/REVIEW/SUMMARY, technische Grundlage MSW/Storybook, Pagination-Fix)
- `frontend/src/components/fansubs/FansubHeroSection.tsx`/`.stories.tsx` (Vorbild Banner-Kontrast)
- `CLAUDE.md` (Design-System-Pflicht, 450-Zeilen-Limit, Sprachqualität, Teststil)

</canonical_refs>
