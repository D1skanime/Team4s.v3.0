---
id: 261105-bnr-banner-effektvorschau-erkennbar
kind: quick
status: complete
created_at: 2026-11-05
waves: 1
---

# Quick-Plan: Banner-Effektvorschau wieder erkennbar machen

## Befund

`frontend/src/components/showcases/EffectsShowcase.tsx` (Eintrag 1, "Bannerbild-Hintergrund"):
Die "Mit Effekt"-Hälfte rendert `BannerSection` in einem nur `220px` breiten, `160px` hohen
`.previewFrame` (geteilte Vorher/Nachher-Spalten einer `Cluster`-Zeile, `flex: 1 1 220px`).
`BannerSection`s feste `--banner-backdrop-blur: 34px` (plus `brightness(0.72)`/`scale(1.15)`) ist
bei dieser geringen Breite so groß relativ zur sichtbaren Bildfläche, dass praktisch keine
Farbvariation mehr übrig bleibt -- nur eine graubraune, detaillose Fläche.

## Ursachenanalyse (empirisch geprüft, nicht nur angenommen)

Erster Teilbefund (isolierter Vorher/Nachher-Test, dasselbe Fixture-Bild, identischer Filter, nur
die Rahmenbreite verändert): Bei `900×160px` zeigt derselbe Effekt klar unterscheidbare
Farbregionen; bei `220×160px` (ursprüngliche Breite) bleibt nur eine fast einfarbige Fläche übrig.
Die Rahmenbreite ist damit EIN Hebel -- aber nach Umsetzung der reinen Breitenänderung (volle
Kartenbreite, siehe unten) live in Storybook geprüft: Das "Mit Effekt"-Ergebnis blieb weiterhin ein
nahezu einfarbiger, dunkelbrauner Klecks, trotz jetzt ca. 760px Breite.

**Zweiter, eigentlicher Teilbefund:** Das bisherige `FIXTURE_IMAGE`
(`cover_1775167905284_...jpg`) ist mit `400×578px` ein PORTRAIT-Coverbild (enger Gesichtsausschnitt,
hautton-dominiert). `BannerSection` rendert es per `object-fit: cover` in einem breiten,
niedrigen Rahmen -- der Browser zoomt dabei so stark in das schmale Hochformat-Bild hinein (um
dessen Höhe auf die Rahmenhöhe zu strecken), dass nur ein sehr schmaler, fast einfarbiger
Bildstreifen sichtbar bleibt, UNABHÄNGIG von der Rahmenbreite. Der feste Unschärferadius plus der
immer aktive `.scrim`-Layer (`rgba(23,21,19,0.45)`, `BannerSection.tsx`) löschen die wenige
verbleibende Farbvariation dann vollständig aus. Live-Vergleich mit der echten Produktionsseite
(`/anime/8`) bestätigt: Dort zeigt derselbe Effekt (gleiche Unschärfe/Scrim-Rezeptur) klar
erkennbare Figuren-Silhouetten und Farbflächen -- weil die dort verwendeten Cover-Bilder mehr
Farbkontrast und -verteilung über die Bildfläche haben als das gewählte Fixture-Bild. Das
Fixture-Bild selbst war die eigentliche Ursache, nicht (nur) die Rahmengröße.

## Entschiedene Lösung

`BannerSection` selbst bleibt unverändert (ihr echtes Verhalten bei tatsächlicher Bannerbreite und
mit kontrastreicheren Covern ist bereits korrekt und darf sich nicht ändern). Zwei Teile, beide nur
in `EffectsShowcase.tsx`:

1. **Volle Kartenbreite für den Banner-Eintrag:** `EffectEntry` bekommt ein neues, optionales Feld
   `layout?: 'row' | 'stacked'` (Standard `'row'`, unverändertes Verhalten für die vier übrigen
   Einträge). Der Banner-Eintrag setzt `layout: 'stacked'` -- Vorher und Nachher stehen
   UNTEREINANDER, jeweils auf voller Kartenbreite, über ein `Stack` statt des bisherigen `Cluster`
   (`Stack`s eigener Standard `align="stretch"` reicht, keine neue CSS-Regel).
2. **Kontrastreicheres Fixture-Bild NUR für den Banner-Eintrag:** neue Konstante
   `BANNER_FIXTURE_IMAGE = '/covers/cover_1775164698913_a216b01d-a000-4871-878d-46e3a41e08e8.jpg'`
   -- dieselbe Bilddatei, die `FansubHeroSection.stories.tsx` bereits als `banner_url` für ihre
   "Aufgelöst mit Banner"-Story nutzt (die Komponente, deren Unschärfe/Scrim-Rezeptur
   `BannerSection`s Standardvariante laut deren eigenem Kommentar übernimmt -- siehe
   `BannerSection.tsx`). Ein bereits im Projekt etabliertes, nachweislich blur-taugliches
   Bannerfoto wird wiederverwendet, kein neues Bild eingeführt. Das bisherige `FIXTURE_IMAGE` bleibt
   für die Einträge 2-5 (Chip/Knopf/Abzeichen, dort unverändert scharf, Effekt betrifft nur die
   Chip-/Knopf-/Abzeichen-Fläche selbst) unverändert bestehen.

## Scope und feste Grenzen

- Nur `EffectsShowcase.tsx` (lokale Showcase-Verdrahtung); `BannerSection.tsx`/`.module.css` und
  die Effekt-Tokens in `effects.css` bleiben unverändert.
- Keine neue CSS-Regel nötig (Stacks bestehender `align="stretch"`-Standard reicht).
- Kein neues Bild erfunden -- Wiederverwendung eines bereits im Projekt vorhandenen Fixture-Bilds
  (`FansubHeroSection.stories.tsx`).
- Keine neuen Tests, keine Testsuiten vor der Live-Abnahme. Nachweis: `npx tsc --noEmit` + Lint +
  Sichtprüfung in Storybook (Desktop und Mobil).

## Read First

- `frontend/src/components/showcases/EffectsShowcase.tsx`
- `frontend/src/components/showcases/EffectsShowcase.module.css`
- `frontend/src/components/ui/BannerSection.module.css`, `frontend/src/styles/tokens/effects.css`
  (nur zur Bestätigung der Ursache, keine Änderung)

## Akzeptanzkriterien

- `grep -n "layout:" frontend/src/components/showcases/EffectsShowcase.tsx` zeigt `'stacked'` nur
  beim Banner-Eintrag.
- `npx tsc --noEmit` fehlerfrei.
- Live in Storybook (`Grundlagen/Effekte`, Desktop UND Mobil): die "Mit Effekt"-Hälfte des
  Banner-Eintrags zeigt klar unterscheidbare Farbregionen des Fixture-Bilds, keine einfarbige
  Fläche mehr. Die übrigen vier Einträge bleiben unverändert (nebeneinander, 220px-Basis).

## Dateien der Umsetzung

- `frontend/src/components/showcases/EffectsShowcase.tsx`
