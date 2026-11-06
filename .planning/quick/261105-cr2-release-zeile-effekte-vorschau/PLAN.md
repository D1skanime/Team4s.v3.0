---
id: 261105-cr2-release-zeile-effekte-vorschau
kind: quick
status: planned
created_at: 2026-11-05
waves: 1
---

# Quick-Plan: Zwei offene Codex-Review-Befunde vor der Live-Abnahme beheben

## Befund 1: Release-Zeile hat noch eigenes Layout-CSS

`frontend/src/components/fansubs/ReleasePreviewRow.module.css` (ab `@media (min-width: 768px)`,
ca. Z. 71): `.body { flex: 1; min-width: 0; }` und `.action { flex-shrink: 0; align-self: center; }`
sind lokales Streck-/Ausrichtungs-CSS im Komposit, verboten laut "Pilot-Komposite bestehen
ausschließlich aus Grundbausteinen".

**Analyse:** `.body` ist strukturell immer das ERSTE Kind des äußeren `Cluster
collapseBelow="md"` (`ReleasePreviewRow.tsx`), `.action` (der `Button`) immer das ZWEITE/letzte
Kind. `.body`s `flex: 1; min-width: 0;` ist exakt das, was `Cluster`s bereits bestehende
`growFirstChild`-Prop liefert (`flex: 1 1 0%; min-width: 0;` auf `:first-child`, wirkungslos im
gestapelten Zustand -- bereits in einer vorherigen Runde für `AnimeDetailHero`s Titelzeile gebaut,
hier direkt wiederverwendbar, keine neue Fähigkeit nötig).

`.action`s `flex-shrink: 0; align-self: center;` hat noch KEIN Gegenstück -- `Cluster` kennt
aktuell keine Möglichkeit, nur das LETZTE Kind von der eigenen `align`-Vorgabe (hier
`align="stretch"`) auszunehmen. Neue, zu `growFirstChild` symmetrische Cluster-Prop
`pinLastChild?: boolean`: hält das letzte Kind auf seiner eigenen Höhe/Breite statt es auf die
Cluster-Querachse zu strecken, UND verhindert sein Schrumpfen auf der Hauptachse (`flex-shrink:
0; align-self: center;` auf `:last-child`) -- dieselbe footgun-sichere Platzierung wie
`growFirstChild` (innerer Zweistufen-Pfad UND Einzelstufen-Pfad, NICHT der äußere
Container-Query-Wrapper, siehe `Cluster.tsx` Zeilen 168/195-200).

**Umsetzung:**
- `Cluster.tsx`: neue Prop `pinLastChild?: boolean` (Doku-Kommentar analog `growFirstChild`,
  direkt darunter). In BEIDEN bestehenden `classNames(...)`-Stellen ergänzen, an denen auch
  `growFirstChild` bereits steht (Einzelstufen-Pfad, inneres Flex-Element des Zweistufen-Pfads) --
  NICHT am äußeren `.clusterQueryContainer`-Wrapper.
- `Cluster.module.css`: neue Regel `.clusterPinLastChild > :last-child { flex-shrink: 0;
  align-self: center; }`, direkt nach der bestehenden `.clusterGrowFirstChild`-Regel.
- `ReleasePreviewRow.tsx`: äußerem `<Cluster collapseBelow="md" ... className={styles.row}>`
  zusätzlich `growFirstChild pinLastChild` ergänzen.
- `ReleasePreviewRow.module.css`: `.body`s Basisregel UND der komplette
  `@media (min-width: 768px) { .body {...} .action {...} }`-Block entfallen vollständig. Die
  `className={styles.body}`/`className={styles.action}` in `ReleasePreviewRow.tsx` bleiben als
  reine, jetzt stylinglose Haken stehen (gleiches Vorgehen wie in der vorherigen Runde bei
  `infoCardBody`) -- keine Testdatei wird dafür angefasst.

**Live-Prüfung:** `http://127.0.0.1:3300/anime/8` (oder eine andere Anime-Seite mit Episoden) --
Episode aufklappen, Release-Zeile ansehen. Desktop (1440px): Avatar+Textspalte links, Button
rechts, Button auf eigener Höhe (nicht gestreckt). Mobil (390px): Textspalte oben, Button darunter
auf voller Breite (`fullWidthBelowMd`). Zusätzlich Storybook
`http://127.0.0.1:6007/?path=/docs/zusammengesetzte-bausteine-release-versionszeile--docs`.

## Befund 2: Effekt-Vorschauen zeigen keine farbigen Vorher/Nachher-Bildpaare

`frontend/src/components/showcases/EffectsShowcase.tsx` (Einträge 2-5: Glas-Chip, Scrim-Chip,
Glas-Knopf, Abzeichen): Das Vorher-Bild ist bereits in `BannerSection` eingebettet, die selbst
Unschärfe/Abdunklung/Sättigung auf das Bild anwendet (das ist Eintrag 1s EIGENE Wirkung) --
dadurch sehen Vorher UND Nachher bei diesen vier Einträgen gleich gedämpft/graubraun aus, der
jeweils gezeigte Chip-/Knopf-/Abzeichen-Effekt geht im Vergleich unter.

**Umsetzung:** Neue lokale Hilfskomponente `PlainImageBackground` in `EffectsShowcase.tsx`
(gleiche Flächenart wie die bereits bestehenden Nur-dieser-Datei-Hilfsfunktionen
`PreviewFrame`/`FlatLabel`, keine neue globale Komponente -- reine Showcase-Verdrahtung ohne
eigenständigen Wiederverwendungswert): rendert das unveränderte Vorschaubild (`ResponsiveImage
fill`, dieselbe Quelle/Klasse wie Eintrag 1s bestehendes Vorher-Bild) als Hintergrund in
`styles.previewFrame`, mit `children` im bestehenden `styles.previewSlot` darübergelegt -- keine
neue CSS-Regel nötig, beide Klassen existieren bereits.

Einträge 2-5 wechseln sowohl im `before`- als auch im `after`-Zweig von
`<BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}><div className={styles.previewSlot}>...</div></BannerSection>`
zu `<PlainImageBackground>...</PlainImageBackground>` -- der jeweils gezeigte Inhalt
(`FlatLabel`/`LinkChip`/`Button`/`Badge`) bleibt unverändert, nur der Bild-Hintergrund verliert
BannerSections Unschärfe-/Abdunklungs-Wirkung. Eintrag 1 (demonstriert BannerSection selbst)
bleibt unverändert -- sein Vorher-Zustand war bereits korrekt (reines `ResponsiveImage`).

**Live-Prüfung:** Storybook `http://127.0.0.1:6007/?path=/docs/grundlagen-effekte--docs` -- bei
allen fünf Paaren muss die linke ("Ohne Effekt") Hälfte das scharfe, farbige Originalbild zeigen;
nur rechts ("Mit Effekt") darf sich die jeweils demonstrierte Wirkung zeigen. Desktop und Mobil
(Storybook-Viewport bzw. Fenstergröße) prüfen.

## Scope und feste Grenzen

- Nur globale Bausteine aus `components/ui` und Tokens; keine Fremd-Overrides privater
  Grundbaustein-Variablen.
- Kommentare kurz, fachlich, deutsch, ohne Prozess-/Plan-/Befund-Verweise im Produktcode.
- Keine neuen Tests, keine Testsuiten vor der Live-Abnahme. Nachweis: `npx tsc --noEmit` + Lint +
  Sichtprüfung im Browser (Desktop UND Mobil, beide Befunde einzeln durchgeklickt).
- `compositeLayoutPurity.guard.test.ts` bleibt unverändert; `ReleasePreviewRow.module.css` bekommt
  kein neues lokales Layout-CSS (es werden nur bestehende Regeln entfernt).

## Read First

- `frontend/src/components/ui/Cluster.tsx`/`.module.css` (Platzierung von `growFirstChild` als
  Vorbild für `pinLastChild`)
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx`/`.module.css`
- `frontend/src/components/showcases/EffectsShowcase.tsx`/`.module.css`
- `frontend/src/components/ui/BannerSection.tsx` (Children-Slot-Mechanik, Vorbild für
  `PlainImageBackground`)
- `docs/FRONTEND_ARCHITEKTUR.md` (Cluster-Absatz, für den `pinLastChild`-Eintrag)

## Akzeptanzkriterien

- `grep -c "flex: 1\|flex-shrink: 0\|align-self" frontend/src/components/fansubs/ReleasePreviewRow.module.css` liefert `0`.
- `grep -n "pinLastChild" frontend/src/components/fansubs/ReleasePreviewRow.tsx` zeigt die Prop
  auf dem äußeren `Cluster`.
- `grep -c "pinLastChild" frontend/src/components/ui/Cluster.tsx` liefert `2` (Einzelstufen-Pfad +
  inneres Zweistufen-Flex-Element, NICHT der äußere Wrapper).
- `grep -n "BannerSection" frontend/src/components/showcases/EffectsShowcase.tsx` zeigt
  BannerSection nur noch im Import und in Eintrag 1 (Zeile ~86), nicht mehr in den Einträgen 2-5.
- `npx tsc --noEmit` fehlerfrei.
- Live-Sichtprüfung beider Befunde auf Desktop (1440px) UND Mobil (390px) bestätigt wie oben
  beschrieben.

## Dateien der Umsetzung

- `frontend/src/components/ui/Cluster.tsx`
- `frontend/src/components/ui/Cluster.module.css`
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx`
- `frontend/src/components/fansubs/ReleasePreviewRow.module.css`
- `frontend/src/components/showcases/EffectsShowcase.tsx`
- `docs/FRONTEND_ARCHITEKTUR.md`
