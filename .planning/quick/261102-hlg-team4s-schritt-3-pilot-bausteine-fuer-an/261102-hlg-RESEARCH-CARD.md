# Quick-Task 261102-hlg: Öffentliche Glas-/Karten-Optik als Grundbaustein — Ergänzungsrecherche

**Researched:** 2026-11-02
**Domain:** CSS-Design-Token-Migration + Grundbaustein-Architektur (Card-Erweiterung vs. neuer Baustein)
**Confidence:** HIGH (alle Werte per `Read`/`grep` gegen den tatsächlichen Code verifiziert, keine Web-Recherche)

**Verhältnis zur Schwesterdatei:** `261102-hlg-RESEARCH.md` deckt Decisions 1-4 ab (Badge/ErrorState/
PageHeader/MediaFrame/LinkChip/BannerSection). Diese Datei deckt AUSSCHLIESSLICH Decisions 5-8
(öffentliche Karten-/Glas-/Linien-Optik als Grundbaustein, drei Ebenen) ab. Nicht doppelt
recherchiert, nur referenziert, wo relevant.

<user_constraints>
## User Constraints (Ausschnitt, verbatim aus CONTEXT.md — nur Decisions 5-8, LOCKED)

Vollständiger Text in `261102-hlg-CONTEXT.md` Zeilen 74-162. Kernpflichten:
- Öffentliche Karten-Optiken (Glas/dunkel/blau, `.infoCard` u. a.) werden NICHT durch die helle
  Admin-`Card` ersetzt und NICHT seiteneigenes CSS — sie werden selbst zu offiziellen `Card`-
  Varianten (oder einem begründeten neuen Grundbaustein), aus Tokens, WCAG-AA, mit Stories.
- Grundsatz: öffentliche Optik ist eine ZWEITE offizielle Erscheinung, kein Fehler. Linien/Ränder/
  Trenner bekommen neben Weinrot eine "auf dunkler Fläche"-Variante aus Tokens.
- Vier Episoden-Tönungen (canon=blau hsl222, filler=rot hsl2, mixed=violett hsl272, recap=gold
  hsl42; Fläche ~12-14%, Rand ~32-34%) sind gewollt und werden 1:1 zu globalen Tokens.
- Drei Ebenen: (1) Grundbaustein mit allen Werten als globale Tokens + Stories je Tönung auf
  Bannerhintergrund, (2) zusammengesetzte Bausteine (Episodenkarte, Release-/Versionszeile, weitere
  Kartenvarianten) mit nativen Eigenbau-Elementen auf Grundbausteine umgestellt, (3) komplette
  Seiten als Story. Verhalten (Filter/Gruppenwechsel/Windowing/Tests) MUSS gleich bleiben.
- `FansubVersionBrowser.tsx` bleibt verhaltensgleich, darf aber strukturell angefasst werden.
- 450-Zeilen-Limit beim Anfassen beachten, real nachzählen.
</user_constraints>

## Summary

Die öffentliche Glas-Optik existiert heute in **mindestens fünf unabhängigen, teils dupliziert
deklarierten Stellen** (`EpisodeGlassCard.module.css`, `ReleasePreviewRow.module.css`,
`app/anime/[id]/page.module.css` mit `.heroContainer`/`.posterColumn`/`.infoCard`/
`.relatedRailSection`, sowie der FansubHeroSection-Scrim-Mechanismus) — **kein globaler Token für
"Fläche/Rand auf dunkler Fläche" existiert bisher**, nur der bereits etablierte
`--badge-onmedia-*`-Dreiklang (Hintergrund/Text/Rand) in `components.css` als einziges Vorbild
für "ein Baustein hat eine offizielle, token-basierte zweite Erscheinung für dunkle Flächen".
`Heading`/`Text` haben mit `tone="onScrim"` bereits eine funktionierende helle Textvariante
(**kein Gap**), aber die vier Namen für "liegt auf einer dunklen/Foto-Fläche" sind heute bereits
uneinheitlich über den Bestand verteilt: `Badge variant="onMedia"`, `Heading`/`Text tone="onScrim"`,
`MetricList tone="onDark"`, `IconButton variant="onImage"` — vier verschiedene Namen für
dasselbe Konzept, bevor dieser Auftrag einen fünften hinzufügt.

**Konkreter, bereits in Produktion sichtbarer Beleg für den Bedarf:** `ErrorState`/`EmptyState`/
`LoadingState` rendern IMMER `Card variant="flat"`/`"compact"` (hell) — und werden innerhalb von
`FansubVersionBrowser.tsx` (Zeilen 314-346, 379-385) direkt auf der dunklen `.episodesSection`-
Fläche (`page.module.css:561-566`, `rgba(255,255,255,0.04)` auf `#0f0f12`-Seite) eingesetzt. Das
ist **kein hypothetisches Problem**, sondern ein bereits existierender visueller Bruch in der
Live-Anwendung: eine helle Karte schwebt auf der dunklen Episoden-Fläche, sobald ein Fehler- oder
Leerzustand dort auftritt.

**Primäre Architektur-Empfehlung (Punkt 10):** `Card` um zwei neue, generische Varianten
erweitern (`glass`, `glassStrong`) statt eines komplett neuen Grundbausteins — begründet in
Abschnitt 10. Die vier Episoden-Tönungen werden NICHT Teil von `Card`s generischer API (das wäre
Domänenwissen in einem domänenneutralen Baustein), sondern ein separater, generischer
Tönungs-Hook (`tintHue`/CSS-Variable), den `EpisodeGlassCard` mit seiner eigenen
canon/filler/mixed/recap-Zuordnung befüllt. Die `<li>`-Pflicht von `EpisodeGlassCard` wird NICHT
durch einen neuen `as`-Prop auf `Card` gelöst, sondern durch einen dünnen, unstyled `<li>`-Wrapper
AUSSERHALB von `Card` — null Risiko für die 70+ bestehenden `Card`-Verwendungsstellen.

## 1. Card.tsx — exakter Bestand

`frontend/src/components/ui/Card.tsx:8`:
```ts
type CardVariant = 'default' | 'elevated' | 'interactive' | 'compact' | 'section' | 'flat' | 'nested' | 'nestedFlat'
```
`CardProps` (Zeile 10-16): `variant?`, `title?`, `description?`, `header?`, `footer?`, plus alle
nativen `HTMLAttributes<HTMLDivElement>` (erlaubt bereits `className`/`role`/etc. durchzureichen —
**kein `as`-Prop**, das Wurzelelement ist IMMER hartkodiert `<section>` (Zeile 36), unabhängig von
`variant`). Titel/Beschreibung rendern intern `Heading level={3} size={3}` bzw.
`Text variant="meta"` (Zeile 30-31) — bereits als Ausnahme in `catalogTaxonomy.test.ts:61`
dokumentiert (`Card: ['Heading', 'Text']`).

**Kein `Card.test.tsx` existiert** (0 Treffer im Repo) — Erweiterungen am Variant-Enum/Props haben
keine bestehende Verhaltens-Testsuite, die brechen könnte.

**Tokens, die `Card.module.css` heute konsumiert** (`components.css:10-29`, exakte Werte):
| Token | Wert |
|---|---|
| `--card-gap` | `18px` |
| `--card-padding` | `18px 20px` |
| `--card-border-color` | `rgba(56, 70, 96, 0.07)` |
| `--card-border-top-color` | `rgba(247, 250, 255, 0.82)` |
| `--card-bg` | `#e6ebf3` |
| `--card-bg-gradient` | `linear-gradient(to bottom, #f4f7fb, var(--card-bg))` |
| `--card-shadow` | `0 1px 1px rgba(33,45,72,0.18), 0 2px 3px rgba(33,45,72,0.08)` |
| `--card-shadow-elevated` | `0 2px 6px rgba(33,45,72,0.12), 0 10px 24px rgba(33,45,72,0.08)` |
| `--card-flat-bg` | `linear-gradient(to bottom, #f7f9fc, #edf1f7)` |
| `--card-flat-border-color` | `rgba(56, 70, 96, 0.05)` |
| `--card-nested-flat-bg` | `rgba(246, 249, 253, 0.72)` |

Radius: **nicht** aus `components.css`, sondern `--radius-surface: 4px` (`layout.css:15`) —
ausdrücklich geteilt mit Modal/Drawer, Kommentar Zeile 10-14: "EIN Token statt verstreuter, teils
zufällig übereinstimmender Pixelwerte". **Wichtig für Punkt 10:** Dieser 4px-Wert ist deutlich
kleiner als alle existierenden öffentlichen Glas-Radien (12-24px, siehe Abschnitt 7) — eine neue
`glass`-Variante MUSS ihren eigenen Radius-Override setzen, sonst bricht die Vorgabe "Optik
visuell GLEICH halten".

`Card.stories.tsx` zeigt alle 8 Varianten einzeln unter `Grundbausteine/Card`.

## 2. Token-Landschaft — was existiert, was fehlt

**Kein `--border-on-media`/`--card-glass-*`-Token existiert heute** irgendwo in
`styles/tokens/*.css` (grep über alle sechs Dateien: 0 Treffer für `glass`/`onMedia`-artige Border-
Namen außer den Badge-Tokens unten). Das ist eine echte Lücke, kein Übersehen.

**Einziges existierendes "auf dunkler Fläche"-Token-Triplet** (`components.css:169-171`):
```css
--badge-onmedia-bg: rgba(255, 255, 255, 0.18);
--badge-onmedia-text: #ffffff;
--badge-onmedia-border: rgba(255, 255, 255, 0.24);
```
Nahe an, aber **nicht identisch mit** den feature-lokalen `--glass-border`/`--glass-border-strong`
(`0.14`/`0.22`, siehe Abschnitt 4) — drei unabhängig "von Hand" getroffene, leicht
unterschiedliche Deckkraft-Werte für dasselbe visuelle Konzept.

**Border-Token-Landschaft, Admin (weinrot) vs. neutral** (Punkt 2 der Frage):
| Token | Datei | Wert | Verwendet von |
|---|---|---|---|
| `--ui-line` | `palette.css:95` | `#82122c` (Weinrot) | `SectionHeader`-Unterstrich, `AccentRule`, `Button`/`IconButton` Variante `line`/`clear`, `DisclosureIndicator`-Rahmen, `DatePicker` |
| `--border-accent` | `colors.css:38` | `rgba(255, 106, 61, 0.35)` (Orange, NICHT Weinrot) | `DisclosureTrigger`-Fokusring, `ui.module.css` |
| `--border-subtle` / `--border-strong` | `colors.css:36-37` | `rgba(45,41,38,0.12)` / `rgba(45,41,38,0.24)` (warmgrau) | generische Admin-Trennlinien |
| `--card-border-color` | `components.css:14` | `rgba(56,70,96,0.07)` (kühles Navygrau) | **Card selbst** — NICHT Weinrot |

**Präzisierung für den Plan:** `Card`s eigener Rand ist heute weder weinrot noch der generische
`--border-subtle` — ein dritter, Card-eigener Navygrau-Ton. "Weinrot vs. öffentlich-weiß" (Nachtrag
6) trifft exakt auf `--ui-line`-Verwender zu (SectionHeader/AccentRule/DisclosureIndicator), NICHT
automatisch auf jeden Rand im System. Für `Card`s neue Glas-Variante braucht es einen VIERTEN,
neuen Rand-Ton (durchscheinend weiß, aus den `--glass-border*`-Werten abgeleitet) — kein
Umbenennen eines bestehenden Tokens.

**Kein globaler `Divider`-Baustein existiert** — `AccentRule` (`AccentRule.tsx`) ist der einzige
Trennlinien-Grundbaustein, rendert aber IMMER `background: var(--ui-line)` (fest, keine
Varianten). Die beiden öffentlichen `<hr>`-Trenner auf der Detailseite (`.posterDivider`
Zeile 157-162, `.divider` Zeile 522-527, beide `page.module.css`) sind rohe, seiteneigene Literale
(`rgba(255,255,255,0.15)`/`rgba(255,255,255,0.25)`), nicht `AccentRule`. Das ist eine Lücke
*zusätzlich* zu den im Fokus genannten 10 Punkten — Nachtrag 6 nennt Trennlinien ausdrücklich im
Scope, aber sie sind kein explizit verlangtes Lieferobjekt dieses Fokus-Blocks; als **Open
Question** unten vermerkt, nicht vorgegriffen.

## 3. `foreignVariableOverrides.regression.test.ts` — was verletzt den Test NICHT

Der Test prüft ausschließlich Dateien in `src/components/ui/*.module.css` (Zeile 30 `UI_DIR`).
Zwei unabhängige Mechanismen:

1. **Keine Custom-Property-Deklaration `--x: wert;`, die von mehr als einer Datei in `ui/`
   gesetzt wird** (oder, falls als "Override-Hook" registriert, von einer FREMDEN Datei statt des
   eingetragenen Besitzers gesetzt wird, Zeile 60-75). Eine offizielle Form, die NICHT verletzt:
   eine neue Custom Property wird **ausschließlich innerhalb der eigenen `Card.module.css`**
   deklariert (z. B. `--card-glass-tint-hue`) und von keiner anderen `ui/`-Datei je gesetzt.
2. **Keine rohen px-/rem-Längen, Hex-Farben oder `rgb()`/`rgba()`-Literale** direkt in einer
   `ui/*.module.css`-Datei außerhalb einer `@media`/`@container`-Bedingungszeile (Ausnahmen: `0`,
   Prozentwerte, `1px`-Haarlinie). **Jeder neue Wert für die Glas-Variante muss als
   `var(--irgendein-globaler-token)` referenziert werden**, der Token selbst lebt in
   `styles/tokens/*.css` — exakt das, was Nachtrag/Ebene 1 ohnehin verlangt ("aus Tokens").

**Konsequenz für die Umsetzung:** Solange die neuen Glas-Werte (1) als globale Tokens in
`styles/tokens/*.css` (nicht in `components/ui/*.module.css` selbst) angelegt werden und (2) in
`Card.module.css` nur per `var(...)` referenziert werden, verletzt die neue Variante BEIDE Regeln
nicht. Verboten wäre nur: ein Aufrufer von `Card` (z. B. `EpisodeGlassCard.module.css`, das
außerhalb von `ui/` liegt und damit vom Test gar nicht erfasst wird) setzt eine private
`--card-*`-Variable VON AUSSEN — exakt das Muster, das Nachtrag 5 für Badge/Heading/Text/LinkChip
ausdrücklich verbietet ("NICHT per Überschreiben privater Variablen von außen").

## 4. `EpisodeGlassCard.tsx`/`.module.css` — vollständig

**Zeilen:** `.tsx` 66, `.module.css` 127 (beide weit unter 450).

**Props** (`EpisodeGlassCard.tsx:22-30`): `episode: PublicGroupedEpisode`, `episodeTitle: string`,
`expanded: boolean`, `onToggle: () => void`, `panelId: string`, `children: ReactNode`.

**Vier Tönungen, exakte Werte** (`EpisodeGlassCard.module.css:5-19`):
```css
.card {
  --glass-surface: rgba(255, 255, 255, 0.06);
  --glass-surface-strong: rgba(255, 255, 255, 0.10);
  --glass-border: rgba(255, 255, 255, 0.14);
  --glass-border-strong: rgba(255, 255, 255, 0.22);
  --glass-text: rgba(255, 255, 255, 0.92);
  --glass-text-muted: rgba(255, 255, 255, 0.60);
  --glass-tint-canon: hsl(222 70% 62% / 12%);
  --glass-tint-canon-border: hsl(222 70% 62% / 32%);
  --glass-tint-filler: hsl(2 70% 62% / 12%);
  --glass-tint-filler-border: hsl(2 70% 62% / 32%);
  --glass-tint-mixed: hsl(272 60% 64% / 12%);
  --glass-tint-mixed-border: hsl(272 60% 64% / 32%);
  --glass-tint-recap: hsl(42 75% 58% / 14%);
  --glass-tint-recap-border: hsl(42 75% 58% / 34%);
}
```
Fläche: canon/filler/mixed = `12%`, recap = `14%` (nicht alle identisch!). Rand: canon/filler =
`32%`, mixed = `32%`, recap = `34%`. Basisfläche (ohne Tönung, `filler_type === 'unknown'`):
`var(--glass-surface)` = `rgba(255,255,255,0.06)`. Radius `var(--radius-md)` = `12px`. Blur:
`backdrop-filter: blur(14px) saturate(1.15)` (Zeile 28, Kommentar D-45: "leichter als Hero-Blur
20px, da potenziell dutzendfach gleichzeitig gerendert"). Der `@supports`-Block (Zeile 32-37) ist
**funktional redundant** — innerhalb und außerhalb werden identische Werte gesetzt (kein echter
Fallback-Unterschied wie beim analogen `heroContainer`-Block, Abschnitt 7).

**Tönungs-Zuordnung** (`EpisodeGlassCard.tsx:14-20`): `unknown` bekommt bewusst **keine** Tönung
und **keine** Klassifikationszeile wird unterschlagen (`classificationAndTypeLine` zeigt trotzdem
den Episodentyp, nur den Filler-Teil nicht, `episodePreviewFormat.ts:14`).

**Native Eigenbau-Elemente** (`EpisodeGlassCard.tsx:37-64`):
| Element | Zeile | Inhalt | Zielbaustein |
|---|---|---|---|
| `<li>` | 37 | äußerer Listeneintrag, `data-classification` | **bleibt `<li>`** (Listensemantik in `FansubVersionBrowser`s `<ul>`) — Card/Glaskarte wird DARIN verschachtelt, siehe Abschnitt 10 |
| `<button>` | 41-47 | Header, `aria-expanded`/`aria-controls` | `DisclosureTrigger` — bereits fast 1:1 kompatibel (siehe unten) |
| `<p>` ×3 | 49-51 | Episodennummer, Titel, Klassifikationszeile | `Text`/`Heading` |
| `<span>` (versionCounter) + `<span>` (Text) | 53-54 | Versionszähler + `DisclosureIndicator` | `Text as="span"` + bereits vorhandenes `DisclosureIndicator` |

**`DisclosureTrigger`-Kompatibilität, präzise geprüft** (`DisclosureTrigger.tsx:9-40`,
`.module.css:9-49`): `title: ReactNode` + `open: boolean`, rendert intern IMMER
`<span className={styles.disclosureTriggerTitle}>{title}</span>` (`flex: 1`) gefolgt von
`<DisclosureIndicator open={open} size="sm" variant="plain" />` — die äußere `<button>` selbst hat
`justify-content: space-between` (Zeile 10-12), setzt `aria-expanded={open}` bereits selbst
(Zeile 35). **Heutiges `EpisodeGlassCard`-Layout ist headerText (links) + versionCounter-Text +
Icon (rechts)** — `DisclosureTrigger` liefert nur Titel + Icon, KEINEN mittleren Zähler-Slot.
Lösung ohne `DisclosureTrigger`-API-Änderung: der komplette `title`-Inhalt wird selbst ein
`display:flex; justify-content:space-between`-Block aus `headerText` + Zähler-`Text`, sodass das
Endresultat optisch identisch bleibt (headerText links, Zähler unmittelbar vor dem von
`DisclosureTrigger` selbst gerenderten Pfeil). Bereits heute importiert `EpisodeGlassCard` direkt
`DisclosureIndicator` (nicht `DisclosureTrigger`) — Umstieg auf `DisclosureTrigger` ersetzt diesen
Import.

**`ReleasePreviewRow`-Instanzen werden als `children` durchgereicht** (`FansubVersionBrowser.tsx:
289-291`), nicht von `EpisodeGlassCard` selbst erzeugt — bleibt bei der Umstellung unverändert.

## 5. `ReleasePreviewRow.tsx`/`.module.css` — vollständig

**Zeilen:** `.tsx` 89, `.module.css` 145.

**Props** (`ReleasePreviewRow.tsx:18-21`): `version: PublicEpisodeVersion`, `animeID: number`.

**Alle im Code vorkommenden Zustände:**
| Zustand | Bedingung | Zeile |
|---|---|---|
| Mit Gruppenlogo(s) | `group.logo_url` vorhanden, `resolveLogoUrl` liefert URL | 46-60 (`<Image>` pro Gruppe) |
| **Ohne Logo** | `logoURL === null` | **rendert HEUTE GAR NICHTS** für diese Gruppe — kein Avatar-/Kürzel-Fallback existiert im Code (Zeile 49: `return logoURL ? <Image .../> : null`) |
| Koop (≥2 Gruppen) | `groups.length >= 2` | `isCoop` Zeile 25, `COOP`-Suffix Zeile 65, `×`-Join Zeile 26 |
| Technik-Zeile vorhanden/fehlt | `techLine` nicht leer | Zeile 71 (ganze Zeile weggelassen, nicht "Unbekannt") |
| Extras (Bilder/Notizen/Karaoke), 0 bis 3 Stück | `has_images`/`has_notes`/`has_karaoke` | Zeile 36-38, 73 |
| Datumszeile vorhanden/fehlt | `formatReleaseDateLine` liefert Wert | Zeile 75 |

**GAP, nicht Annahme:** Die Decision (CONTEXT Punkt 8, Ebene 2) verlangt explizit eine Story
"ohne Logo (Kürzel/Avatar)" — der heutige Code hat **keinen** Kürzel-/Avatar-Fallback, zeigt bei
fehlendem Logo schlicht keine Bildfläche für diese Gruppe. Der globale `Avatar`-Grundbaustein
(`frontend/src/components/ui/Avatar.tsx:30-37,46-73`) hat bereits exakt diese Fallback-Logik
(Initialen aus `label`, `src`-Prop optional) und würde `<Image>` + den fehlenden Fallback in
EINEM Schritt ersetzen — das ist aber eine **sichtbare Verhaltensänderung** (heute: nichts, neu:
Kürzel-Kreis), nicht nur ein Baustein-Tausch. Als Open Question unten markiert.

**Feature-lokale Glass-Variablen** (`ReleasePreviewRow.module.css:2-5`):
```css
--glass-surface-strong: rgba(255, 255, 255, 0.10);
--glass-border: rgba(255, 255, 255, 0.14);
--glass-text: rgba(255, 255, 255, 0.92);
--glass-text-muted: rgba(255, 255, 255, 0.60);
```
Identische Werte wie die gleichnamigen Variablen in `EpisodeGlassCard.module.css` — **bewusste
Duplikation** (nutzt NUR die "strong"-Oberfläche, keine eigene `--glass-surface`/Tönungen). Radius
`var(--radius-sm)` = `6px` (kleiner als EpisodeGlassCards `12px`). Blur:
`backdrop-filter: blur(9px) saturate(1.65)` (Kommentar Zeile 15: "wörtlich übernommener
Blur/Saturate-Wert aus `OlderReleasesList.module.css`" — ein DRITTER, unabhängiger Blur-Wert im
System). `@supports`-Block (Zeile 20-25) ebenfalls funktional redundant, wie bei EpisodeGlassCard.

**Native Eigenbau-Elemente:**
| Element | Zeile | Zielbaustein |
|---|---|---|
| `<Image>` (next/image, pro Gruppe) | 50-58 | `Avatar` (löst Logo+Fallback in einem) ODER `ResponsiveImage`, falls Fallback bewusst NICHT gewünscht ist (Open Question) |
| `<p>` ×4 (`groupName`, `releaseName`, `techLine`, `extrasLine`, `dateLine` — tatsächlich 5 `<p>`-Tags) | 63,67,71,73,75 | `Text` (variant je nach heutiger Größe: `groupName` 16px/600 passt zu keiner bestehenden `Text`-Variante exakt, siehe Open Question) |
| `<span>` (`coopLabel`) | 65 | `Text as="span"` — Kommentar `ReleasePreviewRow.module.css:68` sagt ausdrücklich "reiner Text, kein Chip/Badge/Rahmen", also NICHT `Badge` |
| `<Button href=...>` | 79-85 | **bereits** globaler Baustein, keine Änderung nötig |

## 6. `FansubVersionBrowser.tsx`/`.module.css`/`.test.tsx` — Struktur, Zeilenzahl, Tests

**Aktuelle Zeilenzahl: 389** (`.tsx`) — exakt der im Nachtrag genannte Stand, noch KEINE Drift.
`.module.css`: 30 Zeilen (trivial: `.section`, `.emptyBox` **tot** — in keiner `.tsx`-Datei
referenziert —, `.episodeList`, `.episodeListDimmed`, `.sentinel`).

**Struktur** (grob, ohne Bewertung): Client-Komponente, hält Gruppen-/Erweiterungs-/Windowing-
Zustand (`useWindowedEpisodePages`-Hook, `useState`/`useEffect`/`useLayoutEffect`), rendert
`FansubGroupPicker` + `FansubGroupContext` (Gruppenwahl, NICHT im Fokus dieser Recherche),
`ErrorState`/`EmptyState`/`LoadingState` an vier Stellen (Zeile 314, 331, 340/346, 380, 386), dann
eine `<ul>` mit `WindowedPageGroup`-Wrappern (`<div data-page-id>`, misst Höhe via
`ResizeObserver`) und Spacer-`<div>`s für ausgefenstere Seiten. `renderEpisode()` (Zeile 267-294)
erzeugt pro Episode ein `<EpisodeGlassCard>` mit `<ReleasePreviewRow>`-Kindern.

**Ein zusätzliches natives Element, das laut Nachtrag 8 im Scope liegt:** Zeile 299,
`<h2>Episoden ({windowing.episodeCount})</h2>` — ein rohes `<h2>`, kein `Heading`-Grundbaustein.
Günstige, risikoarme Korrektur im selben Zug (`<Heading level={2}>`).

**Tests, die beim Umbau grün bleiben müssen** (vier Dateien, 541+x Zeilen gesamt):
- `getByRole('button', { name: /Folge N|Testfolge|Gespeicherter Episodentitel/ })` +
  `.getAttribute('aria-expanded')` — funktioniert mit `DisclosureTrigger` unverändert, weil (a)
  die Accessible Name eines `<button>` aus dessen GESAMTEM Textinhalt berechnet wird (jeder Text
  innerhalb bleibt Teil des Namens, unabhängig davon, ob er in `<p>`/`<Text>` steckt) und (b)
  `DisclosureTrigger` `aria-expanded` selbst auf das native `<button>` setzt
  (`FansubVersionBrowser.filterSwitch.test.tsx:228-239`, `FansubVersionBrowser.test.tsx:123-126`).
- `screen.getByText('Folge 200')`/`getByText('COOP')`/`getByText('📷 Bilder ♪ Karaoke')` — exakte
  String-Matches auf EINEM Element; bleiben gültig, solange der jeweilige Text weiterhin als
  alleiniger Inhalt eines eigenen Elements rendert (bei `Text`/`Heading`-Umstellung automatisch
  erfüllt, solange keine zusätzlichen Geschwister-Textknoten in dasselbe Element gemischt werden).
- `document.querySelectorAll('div[aria-hidden="true"]:not([data-testid])')` (Windowing-Spacer-
  Zählung, `FansubVersionBrowser.windowing.test.tsx:115`) — **unabhängig** von
  EpisodeGlassCard/ReleasePreviewRow, diese Spacer-`<div>`s werden direkt in
  `FansubVersionBrowser.tsx` erzeugt (Zeile 371), kein Risiko durch die Card-Migration.
- Keine Tests lesen `EpisodeGlassCard.module.css`/`ReleasePreviewRow.module.css` als Rohtext (im
  Gegensatz zum `page.test.tsx`-Fund aus der Schwester-Recherche) — kein zusätzliches CSS-Text-
  Bruchrisiko in diesen vier Testdateien.

## 7. Weitere Kartenvarianten auf `/anime/[id]` (über die Info-Karte hinaus)

Alle mit exakten Werten aus `page.module.css`:

| Fläche | Zeilen | Radius | Hintergrund | Rand | Blur | Lebt? |
|---|---|---|---|---|---|---|
| `.heroContainer` (äußere Hülle Poster+Info) | 108-124 | `24px` | Fallback `rgba(30,30,35,0.95)`, mit Support `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.08)` | `blur(20px)` (nur mit `@supports`) | ✅ aktiv genutzt |
| `.posterColumn` (Glas-Panel links) | 129-144 | `24px 0 0 24px` | Verlauf `rgba(255,255,255,0.04-0.12)` | — | `blur(20px)` | ✅ aktiv genutzt |
| `.infoCard` (Info-Karte rechts) | 326-344 | `0 24px 24px 0` | Verlauf weiß `0.95→0.08` | — | `blur(20px)` | ✅ aktiv genutzt |
| `.relatedRailSection`/`.relatedRailWrapper` | 532-548 | `20px` | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.1)` | `blur(16px)` | ❌ **TOTES CSS** — kein Treffer in `AnimeDetailView.tsx` (`AnimeRelations` rendert stattdessen über `.relatedSection`, Zeile 491-497, keine eigene Kartenfläche) |
| `.episodesSection` (Rahmen um FansubVersionBrowser) | 561-566 | `16px` | `rgba(255,255,255,0.04)` | — | keine | ✅ aktiv, aber flach (kein Border/Blur/Shadow — eher ein dunkles Panel als eine "Glaskarte") |
| `.errorBox`/`.errorPage` (Lade-Fehlerfall ganze Seite) | 16-43 | `12px` | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.1)` | keine | ✅ aktiv (separater Fehlerpfad, nicht der `switchState.error`-Pfad in FansubVersionBrowser) |
| `.episodeList`/`.episodeItem`/`.episodeActions`/`.actionButton`/`.episodeMeta` | 581-642 | — | — | — | — | ❌ **TOTES CSS** — 0 Treffer in `AnimeDetailView.tsx`, ersetzt durch `FansubVersionBrowser`/`EpisodeGlassCard` |

**Wichtigster Befund dieses Abschnitts (bereits in der Summary vorgezogen):** `ErrorState`/
`EmptyState`/`LoadingState` rendern **immer** `Card variant="flat"/"compact"` (hell, siehe
`ErrorState.tsx:70`, `EmptyState.tsx:44`, `LoadingState.tsx:27`) und werden in
`FansubVersionBrowser.tsx` direkt in `.episodesSection` (dunkles Panel) eingesetzt — ein
**bereits in Produktion existierender** Hell-auf-Dunkel-Bruch, kein theoretisches Risiko.

## 8. Admin-`Card` vs. öffentliche Glas-/Dunkel-Flächen — Werte nebeneinander

| Eigenschaft | Admin `Card` (Standard) | Öffentliche Glas-Fläche (Beispiel `.heroContainer`) |
|---|---|---|
| Hintergrund | `#e6ebf3` + hellblauer Verlauf | `rgba(30,30,35,0.95)` opak ODER `rgba(255,255,255,0.06)` mit Blur |
| Rand | `rgba(56,70,96,0.07)` (kühles Navygrau, ~7% Deckkraft) | `rgba(255,255,255,0.08)` (weiß, ~8% Deckkraft) |
| Radius | `4px` (`--radius-surface`, geteilt mit Modal/Drawer) | `24px` (eigenständig, deutlich größer) |
| Schatten | `0 1px 1px …, 0 2px 3px …` (fein, dunkel) | `0 8px 32px rgba(0,0,0,0.5)` (groß, schwarz) |
| Blur | keiner | `blur(20px)`/`blur(14px)`/`blur(9px)` (drei verschiedene Werte je Fläche) |
| Textfarbe (Standard) | `--text-strong` (`#171513`, fast schwarz) | weißliche Werte (`rgba(255,255,255,0.6-0.95)`), KEIN gemeinsamer Token mit Admin |

**Fazit:** Es handelt sich um zwei strukturell ähnliche (Fläche+Rand+Radius+Schatten+Padding),
aber in JEDEM Einzelwert unterschiedliche Erscheinungen — genau das Muster, das Nachtrag 6 als
"zweite offizielle Erscheinung, kein Fehler" beschreibt. Keine der öffentlichen Flächen teilt sich
heute auch nur EINEN Token mit `Card`s Admin-Werten.

## 9. `FansubHeroSection` — kartenähnliche Fläche?

**Nein, ausdrücklich nicht** — `frontend/src/app/fansubs/[slug]/page.module.css:68`:
```css
/* Nur Layout-Hülle: Banner und Projektidentität stehen ohne sichtbare Karte im Hero. */
.heroCard {
  position: relative;
  display: grid;
  margin-top: 18px;
  overflow: hidden;
}
```
`.heroCard` hat **kein** `background`/`border`/`box-shadow`/`backdrop-filter` — nur Layout
(Grid/Overflow). Der einzige visuelle Effekt im Hero ist der **flächige** (nicht Glas-)Scrim
`.heroBodyOnBanner::before` (`background: rgba(10, 8, 14, 0.88)`, Zeile 108-124) — eine deckende
Abdunklung ohne Blur/Transparenz-Ästhetik, konzeptionell näher an `AnimeBackdropRotator`s
Scrim-Technik (aus der Schwester-Recherche) als an der EpisodeGlassCard-/`.heroContainer`-Glasoptik.
**Konsequenz:** `FansubHeroSection` liefert kein weiteres Kartenbeispiel für diese Recherche,
bestätigt aber (als Negativbefund) die Unterscheidung zwischen "Scrim-Abdunklung" (flächig, für
Text-Kontrast) und "Glaskarte" (transluzent, mit Blur, für abgegrenzte Container) als zwei
verschiedene, beide im System vorkommende Muster.

## 10. Architektur-Empfehlung: `Card`-Erweiterung statt neuer Grundbaustein (begründet)

**Empfehlung: `Card` um zwei neue Varianten erweitern (`glass`, `glassStrong`), KEIN neuer
Grundbaustein "Glaskarte".**

**Begründung anhand des bestehenden Vertrags:**

1. **Nutzungsbreite spricht klar für Wiederverwendung statt Parallelsystem.** `Card` wird in
   70+ Dateien importiert (admin- UND öffentliche Seiten, u. a. `components/fansubs/
   PublicReleaseBlock.tsx`, `components/profile/*`, `components/groups/GroupHistorySection.tsx`,
   `components/fansubs/FansubHighlightsSection.tsx`) — bereits heute DER etablierte,
   domänenneutrale Flächen-Grundbaustein über Admin- und Public-Grenzen hinweg. Ein zweiter,
   paralleler "Glaskarte"-Baustein würde ~90% derselben Eigenschaften (Grid-Layout, `gap`,
   `padding`, optionaler Titel/Beschreibungs-Header, `className`-Durchreichung) duplizieren — ein
   laut `AGENTS.md`/`CLAUDE.md` ausdrücklich verbotenes Muster ("keine zweite Kopie von … UI-
   Logik").
2. **Card wächst bereits seit Beginn durch zusätzliche Varianten, nicht durch neue Bausteine.**
   Acht Varianten existieren bereits (`default…nestedFlat`), jede fügt nur Hintergrund/Rand/
   Schatten/Radius-Overrides hinzu, ohne die Grundstruktur (`cardHeader`/`children`/`cardFooter`,
   `<section>`-Wurzel) zu verändern — zwei weitere Varianten sind eine additive, in der Komponente
   selbst bereits etablierte Erweiterung, kein Bruch des Vertrags.
3. **`foreignVariableOverrides.regression.test.ts` zwingt ohnehin zu Token-Referenzen innerhalb von
   `Card.module.css` selbst** (Abschnitt 3) — der Aufwand "Werte als Tokens definieren, per
   `var()` referenzieren" ist bei einer Card-Erweiterung IDENTISCH zu dem bei einem neuen
   Baustein; die Wächter-Tests liefern keinen Vorteil für die "neuer Baustein"-Option.
4. **Die einzigen echten strukturellen Hürden sind lösbar, ohne Card selbst zu verändern:**
   - *Tag-Problem:* `EpisodeGlassCard` MUSS ein `<li>` bleiben (Listensemantik in
     `FansubVersionBrowser`s `<ul>`), `Card` rendert aber hart `<section>`. Lösung: `<li>` bleibt
     ein dünner, unstyled Wrapper AUSSERHALB von `Card` (`<li style="list-style:none">
     <Card variant="glass" …>…</Card></li>`) — `Card.tsx` selbst bleibt unverändert, **null
     Risiko für die 70+ bestehenden Aufrufer**. Alternative (nicht empfohlen, aber als Präzedenz
     vorhanden): `IconButton` hat bereits ein polymorphes `as`-Pattern (`as: Tag = 'a'`,
     `IconButton.tsx:167`) — falls der Planer stattdessen einen `as`-Prop an `Card` ergänzen will,
     ist das kein Neuland im Repo, aber unnötig, wenn der Wrapper-Ansatz genügt.
   - *Tönungs-Problem:* Die vier Episodentyp-Tönungen (canon/filler/mixed/recap) sind
     Fach-/Domänenwissen von Fansub-Episoden, NICHT etwas, das irgendeine andere der 70+
     `Card`-Verwendungsstellen je braucht. Diese vier Namen direkt in `Card`s generische API
     aufzunehmen (z. B. `tint?: 'canon' | 'filler' | 'mixed' | 'recap'`) würde Domänenvokabular in
     einen bewusst domänenneutralen Grundbaustein tragen. Empfehlung: `Card` bekommt nur einen
     GENERISCHEN Tönungs-Hook (z. B. eine optionale Prop, die eine CSS-Variable setzt, etwa
     `style={{ '--card-glass-tint-hue': 222 }}`, oder eine kleine generische Enum wie
     `tintHue?: number`), und `EpisodeGlassCard` übernimmt selbst die Zuordnung
     canon→222/filler→2/mixed→272/recap→42 (exakt die heutigen hsl-Werte, 1:1 übernommen). Die
     vier Opazitätspaare (12-14% Fläche / 32-34% Rand) werden als Tokens
     (`--card-glass-tint-surface-alpha`, `--card-glass-tint-border-alpha` o. ä., oder vier
     explizite Tönungstokens analog zu Badges Status-Tokens) in `styles/tokens/components.css`
     unter einer neuen "Card"-Sektion geführt — 1:1 aus Abschnitt 4 übernommen, keine neuen Werte
     erfunden.
   - *Radius-Problem:* `Card`s Basisklasse setzt `border-radius: var(--radius-surface)` (4px) auf
     JEDE Variante. Die neue `glass`-Variante MUSS diesen Wert mit einem eigenen,
     größeren Radius-Token überschreiben (analog dazu, wie `.cardNestedFlat` bereits
     `border-radius: var(--radius-surface)` redundant selbst setzt) — technisch unproblematisch,
     aber ausdrücklich zu benennen, damit "Optik visuell GLEICH halten" nicht an diesem Detail
     übersehen wird.
5. **Zwei Glas-Varianten statt einer**, weil der Bestand selbst bereits zwei unterschiedlich
   deckende Oberflächen pflegt (EpisodeGlassCard `--glass-surface` 6% vs. ReleasePreviewRow
   `--glass-surface-strong` 10%, dazu unterschiedlicher Radius 12px vs. 6px und Blur 14px vs. 9px)
   — `glass`/`glassStrong` spiegelt diesen bereits bestehenden Zwei-Stufen-Unterschied 1:1, statt
   ihn beim Vereinheitlichen zu verlieren (was eine sichtbare Optikänderung wäre, explizit
   verboten).

**Was NICHT in `Card` wandert:** Die vier `<p>`-Textzeilen/Button-Header von EpisodeGlassCard/
ReleasePreviewRow bleiben Komposition auf Ebene 2 (`EpisodeGlassCard`/`ReleasePreviewRow` nutzen
`Card` nur für die Flächen-/Rand-/Blur-Optik, bauen Titel/Zähler/Technik-Zeilen selbst aus
`Heading`/`Text`/`DisclosureTrigger` zusammen, GENAU wie heute schon `title`/`description` bei
`Card` optional bleiben und die meisten Aufrufer eigene `children` liefern).

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen nutzen | Warum |
|---|---|---|---|
| Durchscheinende Kartenfläche mit Blur auf Foto-/Dunkelhintergrund | ein zweiter, paralleler "Glaskarte"-Grundbaustein mit eigenem Padding/Gap/Header-Slot | zwei neue `Card`-Varianten (`glass`/`glassStrong`) | `Card` ist bereits der etablierte, domänenneutrale Flächen-Baustein (70+ Verwendungsstellen); Duplikation verstößt gegen das Wiederverwendungsgebot |
| Fehlende Gruppenlogo-Fallback-Darstellung | ein neues, eigenes Initialen-Kürzel-Markup in `ReleasePreviewRow` | vorhandener `Avatar`-Grundbaustein (`label`+`src`, Fallback bereits fertig) | Avatar löst Bild+Fallback bereits in einem Baustein, exakt der fehlende Teil von Punkt 5 |
| "Auf dunkler Fläche lesbarer Text" | eine neue, fünfte Tonality-Benennung erfinden | zuerst prüfen, ob `tone="onScrim"` (Heading/Text, bereits vorhanden) ausreicht | Vier verschiedene Namen (`onMedia`/`onScrim`/`onDark`/`onImage`) existieren bereits für dasselbe Konzept — ein fünfter vergrößert die Inkonsistenz ohne Not |

**Key insight:** Jeder der drei "neuen" Bedarfe in dieser Recherche hat bereits ein
funktionierendes oder fast-funktionierendes Gegenstück im Code (`Card`-Variantensystem,
`Avatar`-Fallback, `Heading`/`Text tone="onScrim"`) — die Aufgabe ist Konsolidierung bestehender,
teils doppelt gebauter Muster in offizielle Optionen, kein Neuentwurf.

## Assumptions Log

| # | Claim | Abschnitt | Risiko falls falsch |
|---|---|---|---|
| A1 | `Card` sollte einen generischen `tintHue`-Hook bekommen statt vier benannter Fach-Props (`tint="canon"` etc.) | 10 | Falls der Planer stattdessen die vier Fachnamen direkt in `Card` aufnimmt, bleibt es funktional identisch, trägt aber Fansub-Domänenwissen in einen generischen Baustein — keine Falsch-Entscheidung, aber ein Konsistenz-Kompromiss, den der Plan bewusst treffen sollte |
| A2 | Das `<li>`-Problem wird per unstyled Wrapper AUSSERHALB von `Card` gelöst, nicht per neuem `as`-Prop AN `Card` | 10 | Falls stattdessen ein `as`-Prop ergänzt wird (Präzedenz: IconButton), ist das kein Fehler, nur eine zweite gültige Lösung mit etwas größerem Diff an `Card.tsx` selbst |
| A3 | `ReleasePreviewRow`s fehlendes Avatar-Fallback ist eine ECHTE Verhaltensänderung (heute: nichts, mit `Avatar`: Kürzel-Kreis), kein reiner Baustein-Tausch | 5 | Falls der Plan `Avatar` einsetzt, ohne das als bewusste, von der Decision bereits verlangte Optik-Erweiterung zu benennen, könnte das in der Live-UAT als unerwartete Änderung auffallen statt als erwartete Erfüllung von "ohne Logo (Kürzel/Avatar)" |

## Open Questions

1. **Soll `ReleasePreviewRow` beim fehlenden Gruppenlogo tatsächlich ein Avatar-Kürzel NEU
   einführen (sichtbare Optikänderung) oder nur strukturell auf `ResponsiveImage` umstellen und
   den heutigen "nichts rendern"-Zustand für fehlende Logos beibehalten?**
   - Was wir wissen: Die Decision (Ebene 2) verlangt explizit eine Story "ohne Logo
     (Kürzel/Avatar)"; der heutige Code hat dafür keinen Fallback.
   - Empfehlung: `Avatar` einsetzen (löst beide Fälle in einem Baustein) — das ist, wörtlich
     gelesen, bereits von der Decision verlangt, nicht nur erlaubt.

2. **Übernimmt `AccentRule` eine neue "auf dunkler Fläche"-Variante für `.posterDivider`/
   `.divider` in diesem Auftrag, oder bleiben diese beiden `<hr>`-Trenner vorerst seiteneigenes
   CSS (da nicht explizit unter den Fokus-Punkten 1-10 dieser Recherche gelistet)?**
   - Was wir wissen: Nachtrag 6 nennt Trennlinien ausdrücklich im Scope-Grundsatz, aber die
     Decision-Aufzählung der konkret zu migrierenden Bausteine (Ebene 1/2) nennt nur
     Karte+Episodenkarte+Release-Zeile namentlich, keine Trennlinien.
   - Empfehlung: Falls der Plan `AccentRule` nicht anfasst, sollte das als bewusste
     Scope-Entscheidung im Plan vermerkt werden, nicht übersehen werden.

3. **Welche `Text`-Variante passt zu `ReleasePreviewRow`s `.groupName` (16px/600)?** Keine
   bestehende `TextVariant` (`body`/`soft`/`meta`/`small`/`eyebrow`) hat exakt 16px/600 als
   Standardwerte — am nächsten kommt `variant="body"` kombiniert mit einer zusätzlichen
   Gewichts-Anpassung. Keine der fünf Varianten ist falsch, aber keine ist exakt passend; ggf.
   braucht `Heading size={4}`-ähnliche Einstufung oder eine kleine, bewusste Abweichung per
   `className`. Nicht abschließend entscheidbar ohne Rendering-Vergleich — für die Live-UAT
   vormerken.

## Sources

### Primary (HIGH confidence — alle per `Read`/`grep` gegen den tatsächlichen Code verifiziert)
- `frontend/src/components/ui/Card.tsx`, `.module.css`, `.stories.tsx`
- `frontend/src/styles/tokens/components.css`, `colors.css`, `palette.css`, `layout.css`,
  `roleCatalog.css` (vollständig gelesen)
- `frontend/src/components/ui/foreignVariableOverrides.regression.test.ts`,
  `catalogTaxonomy.test.ts` (vollständig gelesen)
- `frontend/src/components/fansubs/EpisodeGlassCard.tsx`, `.module.css` (vollständig)
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx`, `.module.css` (vollständig)
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx`, `.module.css` (vollständig),
  `.test.tsx`, `.filterSwitch.test.tsx`, `.groupSwitch.test.tsx`, `.windowing.test.tsx`
  (Testassertions per `grep` erfasst)
- `frontend/src/app/anime/[id]/page.module.css` (vollständig), `AnimeDetailView.tsx` (Zeile 1-260,
  Klassen-Nutzung per `grep` gegen tote CSS-Blöcke abgeglichen)
- `frontend/src/app/anime/page.module.css` (vollständig)
- `frontend/src/components/fansubs/FansubHeroSection.tsx` (vollständig),
  `frontend/src/app/fansubs/[slug]/page.module.css` (Zeile 1-170)
- `frontend/src/components/ui/DisclosureTrigger.tsx`, `.module.css`, `DisclosureIndicator.tsx`
- `frontend/src/components/ui/Heading.tsx`, `.module.css`, `Text.tsx`, `.module.css`
- `frontend/src/components/ui/Avatar.tsx`, `IconButton.tsx` (`as`-Pattern-Beleg)
- `frontend/src/components/ui/ErrorState.tsx`, `EmptyState.tsx`, `LoadingState.tsx` (Card-Nutzung)
- `frontend/src/components/fansubs/episodePreviewFormat.ts`
- `git log` (bestätigt: `LinkChip`/`BannerSection` aus Decisions 1-2 existieren noch nicht,
  dieser Auftrag ist der erste Umsetzungsschritt)

### Secondary / Tertiary
Keine — reine Repo-Analyse, keine externe Dokumentation/Bibliotheksfrage nötig.

## Metadata

**Confidence breakdown:**
- Bestandswerte (Card/Tokens/EpisodeGlassCard/ReleasePreviewRow/page.module.css): HIGH — jeder
  Wert direkt aus dem Quellcode zitiert, keine Interpretation.
- Tote-CSS-Befunde (`.relatedRailSection`, `.episodeList` u. a.): HIGH — per `grep` gegen die
  einzige Verwenderdatei (`AnimeDetailView.tsx`) mit 0 Treffern verifiziert.
- Architektur-Empfehlung (Punkt 10): HIGH für die Bestandsbeobachtungen (Nutzungsbreite,
  Testabdeckung, Token-Mechanik), MEDIUM für die konkrete API-Form (`tintHue` vs. benannte
  Fach-Props) — das ist eine Gestaltungsentscheidung mit mehreren technisch gültigen Lösungen,
  keine verifizierbare Tatsache (siehe Assumption A1/A2).

**Research date:** 2026-11-02
**Valid until:** Bis zum nächsten Code-Eingriff an den referenzierten Dateien (reine
Code-Analyse, keine versionierten externen Abhängigkeiten).
