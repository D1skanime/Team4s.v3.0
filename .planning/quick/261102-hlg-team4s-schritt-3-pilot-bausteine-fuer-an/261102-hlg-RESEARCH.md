# Quick-Task 261102-hlg: Pilot-Bausteine für /anime und /anime/[id] — Research

**Researched:** 2026-11-02
**Domain:** Next.js/React Design-System-Migration (Grundbaustein + zusammengesetzter Baustein + Pflichtnutzung auf zwei bestehenden Seiten)
**Confidence:** HIGH (alle Kernaussagen per `Read`/`grep` gegen den tatsächlichen Code verifiziert, keine Web-Recherche nötig — reine Repo-Analyse)

<user_constraints>
## User Constraints (aus CONTEXT.md, verbatim)

### Locked Decisions

**1. Neuer Grundbaustein "Link-Chip" (`frontend/src/components/ui`)**
Link in Chip-Form, Design-Tokens, sichtbarer Fokus, optional Zähler/Icon. Genres- und Tags-Liste
der Detailseite (`AnimeDetailView.tsx`) auf diesen Baustein umstellen — EIN gemeinsamer Aufbau,
nur die Ziel-Suchparameter unterscheiden sich (`buildFilterHref('genre'|'tag', ...)`). API bewusst
allgemein halten, damit er später auch für Fansub- und Release-Seiten passt (KEINE Umstellung
dieser anderen Seiten in diesem Auftrag — nur die API so entwerfen, dass sie dafür passt).
Deutsche, realistische Stories; Grundbaustein-Kriterium beachten (kein Import einer anderen
katalogisierten `components/ui`-Komponente, sonst `catalogTaxonomy.test.ts` rot).

**2. Neuer zusammengesetzter Baustein "Abschnitt mit Bannerhintergrund"**
Bannerbild/Backdrop als Hintergrund mit deckender Abdunklung (WCAG-AA-Kontrast, analog zum
bestehenden Muster in `FansubHeroSection`), unscharfer Fallback, Inhalt darüber. Ersetzt auf der
Detailseite den heutigen `.heroBanner`/`.bannerImage`/`.bannerOverlay`-Inline-Style-Block.
`AnimeBackdropRotator` bleibt eigenständiger Fachbaustein, wird aber INNERHALB des neuen
Abschnitts eingesetzt (Komposition, kein Ersatz). "Besteht aus"-Hinweis in der Autodocs-
Beschreibung nach dem etablierten Muster (`storybookDocsLink()`). Die öffentliche Fansub-Seite
übernimmt diesen Baustein später — NICHT in diesem Auftrag umstellen, nur als Vorbild dienen
(API so entwerfen, dass eine spätere Migration dorthin plausibel ist, aber keine aktive Änderung
an Fansub-Dateien).

**3. Episodenzahl auf dem Poster: KEIN neuer Baustein**
Vorhandenes `Badge` (Variante `onMedia`, bereits für Banner-Overlays gedacht) über dem Poster
statt des heutigen Eigenbau-`<div>`/`<span>`-Stats-Overlays. Deutscher Text: "12 Folgen" (Plural),
Einzahl "1 Folge", bei 0 oder unbekannt (`max_episodes` null/0) wird das Badge komplett
ausgeblendet (kein "0 Folgen").

**4. Design-System-Pflichtnutzung (keine neuen Bausteine, nur bestehende konsequent einsetzen)**
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
  gedacht ist — bei der Umsetzung gegen den tatsächlichen Bestand prüfen, welcher passt, nicht
  raten).
- **Fehlerkästen** auf BEIDEN Pilotseiten ("Liste konnte nicht geladen werden" in
  `AnimeListView.tsx`, "Episoden konnten nicht geladen werden" in `AnimeDetailView.tsx`) →
  `ErrorState` (kompakte Variante, `role="alert"` bleibt erhalten/wird von `ErrorState` selbst
  gestellt). Falls zugehörige Tests (`page.test.tsx` o. ä.) auf das alte Eigenbau-Markup
  angewiesen sind: Testassertions auf das neue, tatsächliche Verhalten umstellen — NICHT den
  Eigenbau beibehalten, um Tests grün zu halten.
- **Nicht anfassen:** `AnimeCard`, `AnimeEdgeNavigation`, `AnimeRelations`,
  `FansubVersionBrowser` bleiben in diesem Auftrag unverändert (Fachbausteine, bewusst außerhalb
  des Scopes).

### Abnahme-Pflicht
- `AnimeListView.stories.tsx`/`AnimeDetailView.stories.tsx` auf den neuen Stand aktualisieren:
  Desktop/Mobil, mit/ohne Banner (Detailseite — Fall ohne `coverUrl`/Backdrop), ohne Genres/Tags
  (Leerzustand des neuen Link-Chip-Bausteins), lange Titel.
- `261102-cb2-EINORDNUNG.md` nachführen: die jetzt migrierten Zeilen von "Eigenbau" auf
  "vorhandener Grundbaustein"/"neuer Grundbaustein"/"neuer zusammengesetzter Baustein" aktualisieren
  (Datei:Zeile erneut gegen den finalen Code prüfen, siehe Lektion aus der letzten Korrekturrunde).
- Live-Nachweis `/anime` und `/anime/1` (bzw. eine echte vorhandene Anime-ID) auf Port 3000.

### Claude's Discretion
Nicht separat ausgewiesen — Context hat keinen eigenen "Claude's Discretion"-Abschnitt; die
"Specific Ideas" unten liefern Umsetzungs-Leitplanken, keine offenen Wahlfreiheiten.

### Deferred Ideas (OUT OF SCOPE)
- Umstellung von Fansub-/Release-Seiten auf den neuen Banner-Baustein oder den Link-Chip (nur
  API-Kompatibilität vorbereiten, keine aktive Änderung an Fansub-/Release-Dateien).
- `AnimeCard`, `AnimeEdgeNavigation`, `AnimeRelations`, `FansubVersionBrowser`.
</user_constraints>

## Summary

Die Recherche deckt neun konkrete Umsetzungsfragen ab. Drei Kernfunde verändern die Umsetzung
gegenüber den Annahmen im Context-Dokument spürbar:

1. **`StatusBadge` nutzt `Badge` NICHT intern** — es ist ein komplett eigenständiges,
   handgebautes `<span>` mit eigenem CSS-Modul (`StatusBadge.module.css`). Die Annahme "optisch
   einheitlich mit dem bereits genutzten StatusBadge" trifft NICHT automatisch zu, wenn die drei
   Pillen auf `Badge variant="neutral"` umgestellt werden — beide Komponenten bleiben visuell
   unabhängig (unterschiedlicher Border-Radius, Padding, `text-transform`). Das ist kein Blocker,
   aber eine Erwartungslücke, die vor der Umsetzung geklärt werden sollte.
2. **`genreChip` und `tagChip` sehen heute bewusst UNTERSCHIEDLICH aus** (hellere Glasfläche vs.
   dunkler Scrim-Chip), weil sie auf unterschiedlichen Hintergründen sitzen (Poster-Spalte vs.
   ausblassende Info-Card). "EIN gemeinsamer Aufbau" in der Decision bezieht sich auf
   Code-Struktur/API, nicht auf identische Optik beider Chip-Typen — das neue `LinkChip`-Primitiv
   braucht einen Tone-/Variant- oder `className`-Hebel, um beide bestehenden Looks 1:1
   zu reproduzieren.
3. **`AnimeBackdropRotator` ist bereits `position: fixed` über den gesamten Viewport** (eigener
   Layer, `z-index: -1`). Die heutige `.heroBanner`/`.bannerImage`-Fläche ist ein zweiter,
   unabhängiger, lokal begrenzter Soft-Fade-Effekt im obersten Seitenbereich — **nicht** die
   Quelle des eigentlichen Kontrasts (`.bannerOverlay { display: none }`, de facto totes CSS).
   Den Rotator innerhalb des neuen Banner-Bausteins zu verschachteln ist visuell risikofrei
   (fixed-Positionierung ignoriert DOM-Verschachtelung), aber der WCAG-AA-Scrim muss komplett NEU
   nach dem `FansubHeroSection`-Muster gebaut werden, nicht aus vorhandenem Code übernommen.

Zusätzlich zerbrechen mehrere bestehende Testassertions an der shallow-JSX-Baumwanderung
(`elements()`-Helper) in `page.test.tsx`/`page.performance.test.ts`, weil diese Helper
Komponentenfunktionen NICHT aufrufen — ein Wechsel von `<Image>`/`<Link>`/rohem `<div style>` zu
`<ResponsiveImage>`/`<LinkChip>`/`<BannerSection>` macht die bisherigen `item.type === Image`
bzw. `item.type === Link`-Suchen unsichtbar für den Baum-Walker. Das ist laut Decision
ausdrücklich erlaubt ("Testassertions auf das neue, tatsächliche Verhalten umstellen"), aber die
betroffenen Stellen müssen bekannt sein, bevor der Plan geschrieben wird.

**Primäre Empfehlung:** `MediaFrame` (fester Seitenverhältnis-Rahmen, `bottomBadge`-Slot) als
äußere Hülle um `ResponsiveImage` (tatsächliches `<img>`, optimiert mit Fallback) fürs Poster
verwenden — exakt das bereits etablierte Kompositionsmuster aus `UploadFileRow.tsx:79-82`. Das
neue `LinkChip`-Primitiv lebt flach unter `src/components/ui/LinkChip.tsx` ohne Importe anderer
katalogisierter `components/ui`-Komponenten; der neue Banner-Baustein lebt ebenfalls unter
`src/components/ui/` (nicht unter `components/anime/`), damit er von
`catalogTaxonomy.test.ts`/`storybookDescriptionLinks.regression.test.ts` erfasst wird und für
eine spätere Fansub-Migration wiederverwendbar bleibt.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Link-Chip-Darstellung (Genre/Tag/künftig Fansub-Links) | Browser/Client (React-Komponente, SSR-fähig) | — | Reines Präsentations-Primitiv ohne eigene Datenbeschaffung, rendert `next/link` |
| Banner-Hintergrund-Abschnitt | Browser/Client (React-Komponente, SSR-fähig) | — | Reines Layout-/Kontrast-Primitiv, bekommt Bild-URL als Prop, holt nichts selbst |
| Episodenzahl-Badge auf Poster | Browser/Client | — | Reine Darstellung aus bereits geladenen `anime.max_episodes` |
| Seiten-Kopfzeile/Fehlerzustände | Browser/Client (SSR-Darstellungskomponente `AnimeListView`/`AnimeDetailView`) | — | Beide Pilotseiten sind bereits reine Props-Komponenten ohne eigene Datenbeschaffung (Server/Ansicht-Split aus Vorgänger-Task) |

Kein Backend-/API-/DB-Anteil in diesem Auftrag — reine Frontend-Präsentationsschicht.

## 1. Badge — Varianten, `onMedia`, Grundbaustein-Status

`frontend/src/components/ui/Badge.tsx:6` — exakte Varianten-Union:
```ts
type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'onMedia'
```
`onMedia` existiert wirklich (sieben Varianten, nicht sechs). `Badge.tsx` importiert nur
`classNames` (kein Stories-File) + sein eigenes CSS-Modul — **Badge ist ein echter Grundbaustein**
(keine Verletzung von `catalogTaxonomy.test.ts`).

CSS (`Badge.module.css:58-66`):
```css
.badgeOnMedia {
  background: var(--badge-onmedia-bg);
  color: var(--badge-onmedia-text);
  border-color: var(--badge-onmedia-border);
  box-shadow: none;
}
```
Eigene, kontrastgeprüfte Tokens — unabhängig von `variant="muted"`.

**Heutige echte Nutzung von `onMedia`:** NUR in `FansubHeroSection.tsx:55-59`
(`statusVariant()`: `onBanner ? 'onMedia' : 'muted'`) für den Status-Badge auf dem dunklen
Banner-Scrim. Das ist die einzige produktive Verwendung — die Annahme "bereits für
Banner-Overlays gedacht" ist durch echten Code belegt, nicht nur durch die Story-Beschreibung
(`Badge.stories.tsx:71-75`).

**Widerlegter Vorbild-Zusammenhang:** `StatusBadge.tsx` (`frontend/src/components/anime/
StatusBadge.tsx:51`) rendert `<span className={styles.badge} …>` mit EIGENEM
`StatusBadge.module.css` (Border-Radius 16px, Padding `8px 12px`, `text-transform: uppercase`,
Farben pro Status fest verdrahtet) — **kein Import von `Badge`**. Die drei neuen
`<Badge variant="neutral">`-Pillen werden visuell NICHT identisch zu `StatusBadge` aussehen,
weil `StatusBadge` selbst außerhalb des globalen Badge-Tokensystems liegt. Offene Frage für die
Umsetzung: entweder akzeptieren (beide sind jetzt "offizielle" Badge-Familien-Mitglieder, nur mit
unterschiedlicher Herkunft), oder zusätzlich `StatusBadge` auf `Badge` umstellen (NICHT im
Decision-Text verlangt, aber sonst inkonsistent im selben `.badges`-Container,
`AnimeDetailView.tsx:145-150`).

## 2. ResponsiveImage vs. MediaFrame — Poster-Komposition

Beide sind unterschiedliche, komplementäre Bausteine, keine Alternativen:

- **`ResponsiveImage.tsx`** (`frontend/src/components/ui/ResponsiveImage.tsx:76-95`): wrappt
  `next/image`, entscheidet automatisch optimiert/unoptimiert anhand konfigurierter Bildpfade,
  kein eigenes Fallback-Visual bei Ladefehler (Browser-Standardverhalten). Liefert NUR das
  `<img>`-Element selbst.
- **`MediaFrame.tsx`** (`frontend/src/components/ui/MediaFrame.tsx:27-56`): liefert die äußere
  Fläche mit festem `aspectRatio`, `shape` (`rect`/`round`), `cornerBadge`-/`bottomBadge`-Slots.
  Enthält selbst KEIN Bild — erwartet `children`.

**Etabliertes Kompositionsmuster** (`UploadFileRow.tsx:79-82`, echter Produktionscode):
```tsx
<MediaFrame aspectRatio={1}>
  <ResponsiveImage src={objectUrl} alt={...} fill sizes={...} />
</MediaFrame>
```
Für das Poster (aktuell `width=260 height=390`, Seitenverhältnis 2:3) ist also BEIDE zu nutzen:
`MediaFrame aspectRatio={260/390}` als Rahmen, `ResponsiveImage` als Bild — und `MediaFrame`s
`bottomBadge`-Prop ist exakt der richtige Slot für das neue Episoden-`Badge` (ersetzt
`posterStats`/`posterEpisodes`, `page.module.css:247-265`), statt eines eigenen absolut
positionierten `<div>`. Kein neuer Positionierungs-Code nötig.

## 3. ErrorState — Props, `compact`, Vorbilder

`ErrorState.tsx:10-18`:
```ts
export interface ErrorStateProps {
  title: string
  description: string
  action?: ReactNode
  compact?: boolean   // Zeile 14-16: "Dezentere Darstellung ... für einen kleineren, lokal
                       // begrenzten Fehlerbereich" — Default false
  className?: string
}
```
`compact` steuert `Card variant={compact ? 'compact' : 'flat'}`. `role="alert"` ist fest im
Primitiv selbst gesetzt (`ErrorState.tsx:71`), nicht optional — Decision-Anforderung "role=alert
bleibt erhalten" ist automatisch erfüllt, sobald `ErrorState` verwendet wird.

**Wichtig:** `compact` wird aktuell NIRGENDS im Produktcode tatsächlich übergeben (grep über alle
Nicht-Test/Nicht-Story-Dateien ergab 0 Treffer) — dieser Auftrag wäre der erste reale Verwender
von `compact={true}`.

**Reale Vorbilder** (Pattern: `getErrorStateCopy()` + `<ErrorState>` + Retry-`Button`):
- `frontend/src/app/suche/SearchResults.tsx:161-175` (öffentliche Listenseite, nicht-kompakt,
  mit `Button variant="secondary"` als Retry-Action) — strukturell nächstes Vorbild für die
  `/anime`-Liste.
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx:314-322` (ohne `getErrorStateCopy`,
  Literal-Title/-Description, mit Retry-Button) — Vorbild für die Detailseite.

## 4. PageHeader vs. Heading+Text

`PageHeader.tsx:7-27` — exakte Props:
```ts
interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: ReactNode
}
```
Rendert intern `Heading level={1}` + optional `Text variant="eyebrow"`/`Text variant="meta"`.
**`PageHeader` allein reicht für die `/anime`-Kopfzeile** — Titel "Anime" → `title`, Untertitel
"1.234 Einträge" → `description` (rendert automatisch mit `variant="meta"`, passend zum
bisherigen `.subtitle`-Look). Kein zusätzliches, separates `Heading`/`Text` nötig; `eyebrow`/
`actions`/`breadcrumbs` bleiben ungenutzt (alle optional). `PageHeader` selbst ist unter
"Zusammengesetzte Bausteine" katalogisiert (importiert `Heading`+`Text`, `PageHeader.stories.tsx`
existiert) — für die Liste also `<PageHeader title="Anime" description={`${total.toLocaleString('de-DE')} Einträge`} />`
statt der heutigen drei Zeilen `kicker`/`title`/`subtitle` (`AnimeListView.tsx:48-54`).

## 5. FansubHeroSection — WCAG-AA-Kontrastmechanismus (Vorbild)

Der Kontrast-Mechanismus liegt NICHT direkt in `FansubHeroSection.tsx`, sondern verteilt über
zwei Dateien:

1. **`PublicHeaderBackdrop.tsx`** (generischer Full-Bleed-Hintergrund, `position: absolute,
   z-index: -1`) rendert NUR das Bild selbst; alle visuellen Effekte (Unschärfe, Verdunklung)
   kommen über eine seiten-/kontext-spezifische `className`-Tuning-Klasse.
2. **`frontend/src/app/fansubs/[slug]/page.module.css`**:
   - `.heroBackdropTuning` (Zeile 44-51): `filter: blur(34px) brightness(0.72) saturate(1.25);
     transform: scale(1.15);` — das ist der "unscharfe Fallback".
   - `.heroBackdropTuning::after` (Zeile 53-58): vertikaler Verlauf
     `rgba(15,12,25,0.28) → 0.42 → var(--surface-canvas) 100%` — sanfter Übergang zum
     normalen Seitenhintergrund.
   - **Der eigentliche WCAG-AA-Garant ist NICHT der Backdrop selbst**, sondern ein zweiter,
     FLÄCHIGER Scrim direkt hinter dem Textblock: `.heroBodyOnBanner::before` (Zeile 116-124):
     `background: rgba(10, 8, 14, 0.88);` — 88 % deckende, gleichmäßige (kein Verlauf!) dunkle
     Fläche, kommentiert als rechnerisch nachgewiesen in
     `FansubHeroSection.accessibility.test.ts` (Kontrast >16:1 im Worst Case reinweißes Foto).
     Zeile 95-107 enthält die ausführliche Begründung inkl. eines dokumentierten Live-UAT-Befunds
     (ein früherer Verlauf statt Flächenfarbe ließ den oberen Bereich unzureichend verdunkelt).
   - Badge auf dem Scrim nutzt `variant="onMedia"` (Kommentar Zeile 110-113), Text nutzt feste
     weiße Farben (`.title`/`.subtitle` innerhalb `.heroBodyOnBanner`, Zeile 131-137).

**Für den neuen Baustein zu übernehmendes Muster:** (a) Blur+Brightness-Filter auf dem
Hintergrundbild, (b) eine SEPARATE, FLÄCHIGE (nicht verlaufende) Scrim-Farbe mit ~85-90 %
Deckkraft direkt hinter dem Textbereich — kein einzelner, alles erledigender Verlauf.
(c) konditionales Rendering: Banner-Bild + Scrim nur, wenn tatsächlich eine Bild-URL vorhanden ist
(`FansubHeroSection.tsx:106-118`, `bannerURL ? (...) : null`) — exakt das Modell für die
"ohne Banner"-Story der Detailseite (`FehlendesCover` existiert in
`AnimeDetailView.stories.tsx:75-80` bereits mit `coverUrl: ''`).

## 6. genreChip vs. tagChip — exakte CSS-Werte (`page.module.css`, anime/[id])

**`.genreChip`** (Zeile 301-321, sitzt in der Poster-Spalte auf `.posterColumn`s heller
Glasfläche):
```css
.genreChip {
  padding: 8px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s;
}
.genreChip:hover { background: rgba(255, 255, 255, 0.15); border-color: rgba(255, 255, 255, 0.25); }
.genreChip:focus-visible { outline: none; box-shadow: var(--focus-ring); }
```

**`.tagChip`** (Zeile 425-454, sitzt im unteren, zunehmend transparenten Bereich der `.infoCard`):
```css
/* Kommentar Zeile 425-430 (GAP-10): "Feature-lokale, selbsttragende dunkle Chip-Farben" --
   bewusst NICHT dieselben Tokens wie genreChip, weil der globale Light-Card-Hintergrund im
   unteren Infocard-Bereich fast transparent ist. */
.tagChip {
  padding: 8px 14px;
  border-radius: 14px;
  background: rgba(20, 18, 16, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  text-transform: none;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.tagChip:hover { background: rgba(20, 18, 16, 0.78); border-color: rgba(255, 255, 255, 0.3); }
.tagChip:focus-visible { outline: none; box-shadow: var(--focus-ring); }
```

**Übereinstimmend (kann als gemeinsame Basis ins Primitiv):** `padding: 8px 14px`,
`border-radius: 14px`, `font-size: 13px`, `font-weight: 500`, identischer Fokus-Ring
(`box-shadow: var(--focus-ring)`), identische Hover-Transition-Timing.

**Divergierend (braucht einen Hebel im Primitiv):** Hintergrundfarbe/-deckkraft
(`rgba(255,255,255,0.1)` vs. `rgba(20,18,16,0.62)`), Border-Farbe, `text-transform` (genreChip
erbt wahrscheinlich keine, tagChip setzt es explizit auf `none`, vermutlich gegen eine vererbte
Großschreibung von einem Vorfahren). **Konsequenz:** `LinkChip` sollte die gemeinsamen Werte als
Default-Stylesheet führen und einen `tone`-Prop ODER die bereits im Decision-API-Entwurf
vorgesehene `className`-Prop nutzen, um pro Einsatzort (Genre = heller Glas-Ton, Tag = dunkler
Scrim-Ton) exakt die bisherige, unterschiedliche Optik zu reproduzieren — "EIN gemeinsamer
Aufbau" bedeutet hier gemeinsame Code-Struktur/API, nicht zwingend identisches Erscheinungsbild
beider Chip-Typen untereinander.

## 7. `page.test.tsx`/`page.performance.test.ts` — konkrete Bruchstellen

Beide Testdateien nutzen einen lokalen `elements()`-Helper, der **nur bereits materialisierte
`.props.children` rekursiv durchläuft, Komponentenfunktionen aber NICHT aufruft** (außer einmal
manuell ganz oben für `AnimeDetailView`). Jeder Wechsel von einem nativen Element (`<Image>`,
`<Link>`, `<div style=...>`) zu einem eigenen Komponenten-Wrapper (`<ResponsiveImage>`,
`<LinkChip>`, `<BannerSection>`) macht die zugehörige alte `item.type === X`-Suche blind, weil der
Walker nie in die neue Komponente hineinrendert.

Betroffene Stellen in `frontend/src/app/anime/[id]/page.test.tsx`:
- **Zeile 164**: `expect(text).toContain('12 Episodes')` — heutiger Text ist ENGLISCH
  ("Episodes"), nicht "Folgen". Muss auf `'12 Folgen'` umgestellt werden (Decision verlangt
  deutsche Pluralisierung); Singular-Fall "1 Folge" fehlt als eigener Testfall komplett und sollte
  ergänzt werden, ebenso ein Fall für `max_episodes: 0`/`null` → Badge darf gar nicht im Text
  vorkommen.
- **Zeile 170-175**: liest `page.module.css` als rohen Text und prüft `.heroBanner`/
  `.heroContainer`/`.page`-Blöcke auf `overflow`-Werte. Sobald `.heroBanner`/`.bannerImage` in die
  CSS-Datei des neuen Bausteins (eigenes Modul unter `components/ui/`) umziehen, verschwindet der
  `.heroBanner`-Block aus `page.module.css` — dieser Test muss auf die neue Komponentendatei
  umgezogen oder durch eine Render-Assertion ersetzt werden.
- **Zeilen 260-346 (gesamter `describe('Tags-Block und Genre-Links …')`-Block)**: alle Checks
  filtern `item.type === Link` (next/link, importiert Zeile 5). Sobald Genre-/Tag-Chips als
  `<LinkChip href=... >` gerendert werden, liefert `elements()` dafür den `LinkChip`-Elementtyp,
  NICHT `Link` — jede dieser `item.type === Link`-Filterungen muss auf `item.type === LinkChip`
  umgestellt werden (Importname ergänzen), exakt nach demselben bereits etablierten Muster wie die
  vorhandenen `item.type === WatchlistAddButton`/`item.type === FansubVersionBrowser`-Checks in
  derselben Datei (Zeile 129, 136, 166, 185 etc.). Die restlichen Prüfungen
  (href-Inhalt via `paramsFromHref`, Text-Inhalt, Reihenfolge, Abwesenheit von `tabIndex`/
  `onClick`) bleiben inhaltlich gültig, solange `LinkChip` `href`/`children` 1:1 als eigene Props
  durchreicht.
- **Zeile 342-344**: Platzhalter-Check `item.type === 'span' && textContent(...) === 'Anime'` für
  den Leerfall ohne Genres bleibt unverändert gültig, SOFERN der Platzhalter weiterhin ein rohes
  `<span>` außerhalb von `LinkChip` bleibt (nicht Teil des neuen Primitivs selbst).

Betroffene Stellen in `frontend/src/app/anime/[id]/page.performance.test.ts`:
- **Zeile 94**: `const poster = all.find((element) => element.type === Image && …)` — `Image` ist
  `next/image`, importiert Zeile 7. Nach Umstellung auf `ResponsiveImage` liefert der Walker den
  `ResponsiveImage`-Elementtyp; Fix: Import ergänzen, `element.type === Image` →
  `element.type === ResponsiveImage`. `.props.src`/`.props.unoptimized`/`.props.alt`-Checks
  (Zeile 99-100) bleiben gültig, weil `ResponsiveImage` diese Props 1:1 als eigene Props annimmt
  (`ResponsiveImageProps` erweitert `ImageProps`).
- **Zeile 95**: `const hero = all.find((element) => (element.props.style as …)?.backgroundImage)`
  — sucht das heutige, direkt in `AnimeDetailView.tsx` liegende `<div style={{backgroundImage}}>`
  (Zeile 74-80 dort). Sobald dieser Code in die neue Banner-Komponente wandert, wird dieser Fund
  **NICHT mehr funktionieren**, da der Walker nicht in die neue Komponentenfunktion hineinrendert
  — `hero` wird `undefined`, die nachfolgende Assertion Zeile 101 schlägt fehl. Muss umgeschrieben
  werden: entweder (a) den neuen Banner-Komponenten-Elementtyp direkt finden und seine Top-Level-
  Props prüfen (z. B. `imageUrl`), oder (b) nach dem bereits vorhandenen Muster in Zeile 107
  (`render(createElement(AnimeBackdropRotator, …))`) die neue Komponente separat mit den
  gefundenen Props rendern und das DOM direkt prüfen.
- **Zeile 96** (`reflection`, sucht `--poster-image` CSS-Var am `.posterWrapper`-`div`) bleibt
  unverändert funktionsfähig — dieser `div` wird laut Decision NICHT angefasst (nur das `<Image>`
  darin wird zu `<ResponsiveImage>`).

## 8. `catalogTaxonomy.test.ts` — exakte Prüflogik für das neue `LinkChip`-Primitiv

`catalogTaxonomy.test.ts:104-114` (`extractLocalImports`) erfasst NUR flache Geschwister-Importe
`from './X'`/`import('./X')` innerhalb von `src/components/ui/`. `catalogTaxonomy.test.ts:160-166`
prüft für jede `Grundbausteine/*`-Story, ob die zugehörige `X.tsx` einen solchen lokalen Import
`./Y` hat, für den `Y.stories.tsx` im selben Ordner existiert — UNABHÄNGIG davon, ob `Y` selbst
unter "Grundbausteine" oder "Zusammengesetzte Bausteine" katalogisiert ist. Für `LinkChip.tsx`
heißt das konkret:

- **Erlaubt:** `import { classNames } from './classNames'` (kein `classNames.stories.tsx`
  vorhanden), `import Link from 'next/link'`, Icons aus `lucide-react` (keine lokalen `./X`-Pfade).
- **Verboten ohne Eintrag in `EXCEPTIONS`:** jeder lokale Import einer Komponente, die eine eigene
  `*.stories.tsx` hat — insbesondere `Badge` (für einen optionalen Zähler NICHT importieren,
  sondern als reines `<span>`/Zahl im eigenen Markup rendern), `IconButton`/`Button`/`NavArrow`.
  Falls das Icon-/Zähler-Feature zwingend eine andere katalogisierte Komponente braucht, muss
  `LinkChip` entweder nach "Zusammengesetzte Bausteine" verschoben werden (widerspricht der
  Decision, die es explizit als Grundbaustein will) oder der Import wird mit fachlicher Begründung
  in die `EXCEPTIONS`-Map (`catalogTaxonomy.test.ts:39-77`) eingetragen — analog zu den
  bestehenden Einträgen für `Button: ['Spinner']`/`Avatar: ['ResponsiveImage', 'VisuallyHidden']`.
  **Empfehlung:** Zähler/Icon im eigenen `LinkChip`-Markup implementieren (kein Import nötig),
  damit kein `EXCEPTIONS`-Eintrag erforderlich wird.

## 9. "Besteht aus"-Vorbild für den neuen zusammengesetzten Baustein

`storybookDescriptionLinks.regression.test.ts` scannt `src/components/ui`, `src/components/
showcases`, `src/components/admin`, `src/components/fansubs` nach `title:`-Werten und nach
`storybookDocsLink(...)`-Aufrufen — jeder dort verlinkte Titel MUSS exakt als `title: '...'` in
irgendeiner `.stories.tsx`-Datei existieren (sonst schlägt der Test fehl). Daraus folgt:
**der neue Banner-Baustein sollte unter `src/components/ui/` liegen**, nicht unter
`src/components/anime/`, sonst wird seine eigene "Besteht aus"-Beschreibung von diesem Scan erst
gar nicht erfasst (kein Fehler, aber auch keine Durchsetzung) — und spätere Wiederverwendung durch
Fansub-Seiten ist über `components/ui` ohnehin der etablierte Ort für wiederverwendbare,
domänenneutrale Bausteine.

Reales, direkt übertragbares Vorbild: `ArtworkHero.stories.tsx:4,13-24` (hell-thematischer
Profil-Hero, NICHT direkt wiederverwendbar für den dunklen Banner-Fall, aber exakt das richtige
Strukturmuster):
```tsx
import { storybookDocsLink } from '@/lib/storybookLinks'
// ...
parameters: {
  docs: {
    description: {
      component:
        `Besteht aus: ${storybookDocsLink('Grundbausteine/Card', 'Card')}, ` +
        `${storybookDocsLink('Grundbausteine/ResponsiveImage', 'ResponsiveImage')}, ` +
        `${storybookDocsLink('Grundbausteine/Heading', 'Heading')} (Hero-Titel), ` +
        `${storybookDocsLink('Grundbausteine/Text', 'Text')} …`,
    },
  },
},
```
Für den neuen Banner-Baustein: `Besteht aus: ResponsiveImage (Backdrop-Fallback-Bild), Badge
(onMedia, falls Status/Episoden-Hinweis auf dem Scrim gezeigt wird) …` plus ein Hinweis, dass
`AnimeBackdropRotator` als eigenständiger Fachbaustein KOMPONIERT (nicht über `storybookDocsLink`
verlinkt, da `AnimeBackdropRotator` kein `components/ui`-Baustein ist und keine eigene
`.stories.tsx` mit `title:`-Eintrag hat, der vom Scan erfasst würde — ggf. als reiner Text ohne
Link erwähnen, wie es die Decision mit "wird aber INNERHALB des neuen Abschnitts eingesetzt"
bereits nahelegt).

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen nutzen | Warum |
|---------|------|-----------|-----|
| Episodenzahl-Overlay auf Poster | eigenes absolut positioniertes `<div>`/`<span>` | `MediaFrame`s `bottomBadge`-Slot + `Badge variant="onMedia"` | Slot existiert bereits exakt für diesen Zweck (`MediaFrame.tsx:17-19`) |
| Fester Seitenverhältnis-Bildrahmen | eigene `aspect-ratio`-CSS-Regel je Seite | `MediaFrame aspectRatio={...}` | Zentrale Geometrie, bereits in `UploadFileRow`/`MediaSlot`/`UploadDropzone` etabliert |
| Dunkler WCAG-AA-Scrim über Fotos | neu erfundene Verlaufs-Opazität raten | 88%-flächige (nicht verlaufende) Scrim-Fläche nach `page.module.css:116-124`-Muster, rechnerisch belegt | Vorheriger Verlauf-Versuch war in Live-UAT nachweislich unzureichend (Kommentar Zeile 95-107) |
| Link-in-Chip-Form | eigenes `<a className=...>` je Seite (bereits 3x im Code: `genreChip`, `tagChip`, `otherGroupChip` in `OtherGroupsChips.tsx`) | neues `LinkChip`-Primitiv | Drei unabhängige, leicht unterschiedliche Implementierungen sind bereits Beleg für fehlendes Primitiv |

**Key insight:** Alle drei neuen/zu nutzenden Bausteine in diesem Auftrag haben bereits ein
funktionierendes Vorbild im Code (`FansubHeroSection` für Banner-Kontrast, `UploadFileRow` für
MediaFrame+ResponsiveImage-Komposition, `OtherGroupsChips`/`genreChip`/`tagChip` für Link-Chip) —
die Aufgabe ist Konsolidierung bestehender Muster in ein Primitiv, kein Neuentwurf von Null.

## Code Examples

### Poster-Komposition (MediaFrame + ResponsiveImage + Badge)
```tsx
// Quelle: UploadFileRow.tsx:79-82 (Muster), MediaFrame.tsx:17-19 (bottomBadge-Slot)
<MediaFrame aspectRatio={260 / 390} bottomBadge={episodeBadge}>
  <ResponsiveImage src={coverUrl} alt={anime.title} width={260} height={390} unoptimized priority />
</MediaFrame>
```
wobei `episodeBadge` `null` ist, wenn `max_episodes` falsy/0 ist (Decision Punkt 3), sonst
`<Badge variant="onMedia">{count === 1 ? '1 Folge' : `${count} Folgen`}</Badge>`.

### Banner-Kontrast-Scrim (Übertragung aus FansubHeroSection-Muster)
```css
/* Quelle: frontend/src/app/fansubs/[slug]/page.module.css:116-124 */
.contentOnBanner::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: rgba(10, 8, 14, 0.88); /* flächig, KEIN Verlauf -- siehe Kommentar dort */
}
.contentOnBanner > * { position: relative; z-index: 1; }
```

### PageHeader für /anime-Liste
```tsx
// Ersetzt AnimeListView.tsx:48-54 (kicker/title/subtitle-Block)
<PageHeader title="Anime" description={`${response.meta.total.toLocaleString('de-DE')} Einträge`} />
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `LinkChip` sollte Icon/Zähler ohne Import anderer `components/ui`-Komponenten selbst rendern (statt `Badge`/`IconButton` zu importieren), um `catalogTaxonomy.test.ts` ohne `EXCEPTIONS`-Eintrag zu erfüllen | Abschnitt 8 | Falls der Planer stattdessen `Badge` importiert, muss ein begründeter `EXCEPTIONS`-Eintrag ergänzt werden — sonst roter Test |
| A2 | Der neue Banner-Baustein sollte unter `src/components/ui/` liegen, nicht unter `src/components/anime/` | Abschnitt 9 | Liegt er anderswo, wird seine "Besteht aus"-Beschreibung von `storybookDescriptionLinks.regression.test.ts` nicht erfasst (kein Fehlschlag, aber auch keine Durchsetzung) und die spätere Fansub-Wiederverwendung ist weniger naheliegend |
| A3 | `LinkChip` braucht einen `tone`/Variant-Hebel (oder bewusste `className`-Nutzung durch die Aufrufer), um `genreChip`- und `tagChip`-Optik unterschiedlich zu reproduzieren | Abschnitt 6 | Falls stattdessen EIN einheitlicher Look gewünscht ist (visuelle Vereinheitlichung statt reiner Code-Wiederverwendung), ändert sich die Optik einer der beiden Listen gegenüber heute — menschliche Bestätigung sinnvoll vor Umsetzung |

**Risiko-Hinweis zu A3:** Dies ist die einzige Stelle, an der die Decision ("EIN gemeinsamer
Aufbau") zwei unterschiedlich lesbare Interpretationen zulässt (Code-Struktur vs. Optik). Beide
Interpretationen sind mit den vorhandenen Primitiven umsetzbar — die Empfehlung ist, bestehende
Optik pro Ort zu erhalten (A3-Hypothese), aber das sollte im Plan explizit als Annahme benannt
und bei Bedarf in der Live-UAT verifiziert werden.

## Open Questions

1. **Sollen die drei Typ-/Art-/Jahr-Pillen UND `StatusBadge` optisch angeglichen werden?**
   - Was wir wissen: `StatusBadge` nutzt `Badge` nicht, hat eigenes CSS (Abschnitt 1).
   - Was unklar ist: Ob "optisch einheitlich mit StatusBadge" bedeutet, dass beide am Ende gleich
     aussehen sollen (würde eine zusätzliche `StatusBadge`-Umstellung auf `Badge` erfordern, nicht
     explizit in Scope) oder nur, dass beide als "Badge-Familie" im selben Container akzeptabel
     nebeneinanderstehen.
   - Empfehlung: Scope wie im Context-Text wörtlich lesen (nur die drei Pillen umstellen,
     `StatusBadge` unverändert lassen) und das Nebeneinander in der Live-UAT sichtbar machen,
     statt es im Plan vorab zu "fixen".

2. **Welchen genauen `aspectRatio`-Wert soll `MediaFrame` für das Poster bekommen?**
   - Was wir wissen: aktuelles `<Image width={260} height={390} />` ⇒ Verhältnis exakt 2:3.
   - Was unklar ist: Ob `260/390` (als Zahl `0.666...`) oder die kürzere Form `2/3` im Code
     verwendet werden soll — rein stilistisch, keine funktionale Differenz.
   - Empfehlung: `2 / 3` im Code (lesbarer), identisches Rendering-Ergebnis.

3. **Soll der "Leerzustand des neuen Link-Chip-Bausteins" (Abnahme-Pflicht) eine eigene
   `LinkChip`-Variante sein, oder bleibt der bestehende Fallback (`<span>Anime</span>` außerhalb
   von `LinkChip`, `AnimeDetailView.tsx:129`) unverändert?**
   - Was wir wissen: Die Decision-API-Skizze für `LinkChip` (href, children, icon, count,
     className) enthält keinen "disabled"/"ohne href"-Modus.
   - Was unklar ist: Ob die Storybook-Story "ohne Genres/Tags" lediglich die Seite im
     Leerzustand zeigt (Fallback-Text bleibt wie heute, kein eigener `LinkChip`-Zustand) oder ob
     `LinkChip` selbst einen visuell erkennbaren "leer"/"deaktiviert"-Zustand braucht.
   - Empfehlung: Erste Lesart (nur Seiten-Leerzustand zeigen, `LinkChip` selbst bleibt ein reiner
     Link mit Pflicht-`href`) — einfacher, deckt die Abnahme-Formulierung wörtlich ab.

## Sources

### Primary (HIGH confidence — alle per `Read`/`grep` gegen den tatsächlichen Code verifiziert)
- `frontend/src/components/ui/Badge.tsx`, `Badge.module.css`, `Badge.stories.tsx`
- `frontend/src/components/ui/ErrorState.tsx`
- `frontend/src/components/ui/PageHeader.tsx`, `Heading.tsx`, `Text.tsx`, `Button.tsx`
- `frontend/src/components/ui/ResponsiveImage.tsx`, `MediaFrame.tsx`, `MediaFrame.module.css`
- `frontend/src/components/ui/UploadFileRow.tsx` (Kompositionsvorbild)
- `frontend/src/components/anime/StatusBadge.tsx`, `StatusBadge.module.css`
- `frontend/src/components/fansubs/FansubHeroSection.tsx`
- `frontend/src/components/public/PublicHeaderBackdrop.tsx`, `.module.css`
- `frontend/src/app/fansubs/[slug]/page.module.css` (Zeile 37-150)
- `frontend/src/app/anime/AnimeListView.tsx`, `AnimeListView.fixtures.ts`, `.stories.tsx`
- `frontend/src/app/anime/[id]/AnimeDetailView.tsx`, `.fixtures.ts`, `.stories.tsx`
- `frontend/src/app/anime/[id]/page.module.css` (Zeile 1-470)
- `frontend/src/app/anime/[id]/page.test.tsx`, `page.performance.test.ts`
- `frontend/src/components/anime/AnimeBackdropRotator.tsx`, `.module.css`
- `frontend/src/components/ui/catalogTaxonomy.test.ts`,
  `storybookDescriptionLinks.regression.test.ts`
- `frontend/src/lib/storybookLinks.ts`
- `frontend/src/components/ui/ArtworkHero.tsx`, `.stories.tsx`, `.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/OtherGroupsChips.tsx`
- `frontend/src/app/suche/SearchResults.tsx` (ErrorState-Vorbild)
- `docs/FRONTEND_ARCHITEKTUR.md` (Zeile 219-227, Storybook-Taxonomie)

### Secondary / Tertiary
Keine — diese Recherche war eine reine Repo-Analyse ohne externe Dokumentation nötig (keine neue
Bibliothek, keine Framework-Version-Frage).

## Dokumentations-Hinweis (Nebenbefund, kein Blocker)

`CLAUDE.md` (Root) nennt aktuell "28 Stories" (Grundbausteine) / "17 Stories"
(Zusammengesetzte Bausteine); `docs/FRONTEND_ARCHITEKTUR.md:219` nennt "27"/"22". Per `grep` über
die tatsächlichen `title: 'Grundbausteine/'`-/`'Zusammengesetzte Bausteine/'`-Vorkommen in
`src/components/ui/*.stories.tsx` ist der TATSÄCHLICHE Stand **27 Grundbausteine / 22
Zusammengesetzte Bausteine** (deckt sich mit `FRONTEND_ARCHITEKTUR.md`, nicht mit `CLAUDE.md`).
Nach diesem Auftrag (ein neuer Grundbaustein `LinkChip`, ein neuer zusammengesetzter Baustein)
wird der reale Stand 28/23 — die Doku-Pflicht aus `CLAUDE.md` ("Dokumentation wächst mit dem
Code") verlangt, BEIDE Dateien auf den neuen, korrekten Zählstand zu bringen; dabei sollte die
bereits bestehende Diskrepanz zwischen `CLAUDE.md` und `FRONTEND_ARCHITEKTUR.md` (28/17 vs.
27/22) im selben Zug bereinigt werden, nicht fortgeschrieben.

## Metadata

**Confidence breakdown:**
- Komponenten-APIs (Badge/ErrorState/PageHeader/ResponsiveImage/MediaFrame): HIGH — direkt aus
  Quellcode gelesen, keine Interpretation nötig.
- Banner-Kontrast-Mechanismus: HIGH — exakte CSS-Werte und begründende Kommentare im Code
  gefunden, inkl. Referenz auf einen nachgewiesenen Live-UAT-Fehlschlag der Vorgängerversion.
- Test-Bruchstellen: HIGH — Testdateien vollständig gelesen, Mechanik des `elements()`-Helpers
  verstanden und an mehreren bestehenden Analogien (`WatchlistAddButton`/`FansubVersionBrowser`-
  Checks) verifiziert.
- Link-Chip-Optik-Divergenz (genreChip vs. tagChip): HIGH für die Beobachtung (CSS-Werte exakt
  gelesen); MEDIUM für die daraus abgeleitete API-Empfehlung (`tone`-Prop) — das ist eine
  Designentscheidung, keine verifizierbare Tatsache (siehe Assumption A3).

**Research date:** 2026-11-02
**Valid until:** Bis zum nächsten Code-Eingriff an den referenzierten Dateien (keine
Ablaufzeit nötig — reine Code-Analyse, keine externen/versionierten Abhängigkeiten).
