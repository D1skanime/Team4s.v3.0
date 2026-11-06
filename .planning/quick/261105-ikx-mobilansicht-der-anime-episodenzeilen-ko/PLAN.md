---
id: 261105-ikx-mobilansicht-der-anime-episodenzeilen-ko
kind: quick
status: planned
created_at: 2026-11-05
waves: 2
---

# Quick-Plan: Mobile Ansicht der Anime-Episodenzeilen korrigieren

## Befund und Ziel

Auf `/anime/13` kollidieren bei `390x844` der Titel-/Metadatenblock einer
`EpisodeGlassCard` und der rechts ausgerichtete Versionszähler. Die Messung
zeigt nur `36.7px` für `.headerText`, während `.versionCounter` `93.3px`
beansprucht.

## Runde 1 (verworfen): `Cluster.growFirstChild` allein reicht nicht

Der erste Versuch aktivierte ausschließlich die bereits bestehende globale
`Cluster.growFirstChild`-Fähigkeit am Kopf-`Cluster`. Die anschließende
Live-Nachprüfung zeigte: Der durch Innenabstand und Öffner-Indikator von
`DisclosureTrigger` verbleibende Titelbereich ist nur `142px` breit -- eine
Wachstums-Prop allein kann diesen fest vorgegebenen, bereits zu schmalen
verfügbaren Bereich nicht vergrößern. Titel-/Metadatenblock und
Versionszähler müssen stattdessen unterhalb der eigenen Containerbreite
vertikal gestapelt werden, damit jeder Block den gesamten Bereich erhält.

## Runde 2 (verbindliche menschliche Entscheidung): neuer Grundbaustein statt Cluster-Änderung

Dem Menschen wurde vorgelegt, ob `Cluster` global erweitert werden soll
(zweistufiges Rendering `as`-konsistent machen, neue Container-Query-Klasse).
Antwort: **Nein, `Cluster` NICHT ändern.** Stattdessen einen neuen
Grundbaustein mit genau einem Zweck anlegen: eine Zeile, die ihre Teile
nebeneinander anordnet und sie selbst untereinander stapelt, sobald ihr
eigener Platz nicht reicht (Container-Query auf den Baustein selbst, nicht
Bildschirmbreite). Name nach Zweck, nicht nach Größe. Kein reiner
Mobil-Baustein -- Seiten verwenden ihn überall gleich, er passt sich selbst
an. `Cluster` und alle anderen Seiten bleiben unverändert.

## Scope und feste Grenzen

- Ausschließlich ein neuer, eigenständiger Grundbaustein (`StackingRow`) plus
  dessen Verdrahtung in `EpisodeGlassCard`; keine API-, Daten-, Auth- oder
  Domain-Änderung.
- `Cluster.tsx`/`.module.css`/`.stories.tsx` bleiben BYTE-UNVERÄNDERT. Keine
  andere Aufrufstelle von `Cluster` wird angefasst.
- Der neue Baustein importiert keinen anderen, selbst katalogisierten
  Grundbaustein (Katalog-Taxonomie-Pflicht, siehe `catalogTaxonomy.test.ts`)
  -- eigene Gap-Zweck-Typen, eigenes Zweistufen-Container-Query-Muster nach
  dem bei `Cluster`/`SplitLayout` etablierten Vorbild.
- Den ausnahmslosen Layout-Purity-Guard weder abschwächen noch ändern;
  `EpisodeGlassCard.module.css` bekommt KEIN neues lokales Layout-CSS.
- Keine neuen Tests und keine Testsuiten (einschließlich des Guard-Tests) vor
  der Live-Abnahme. Die zwingende erste Verifikation ist die
  Live-Sichtprüfung; anschließend nur `git diff --check` als
  nicht-testende Diff-Prüfung sowie `npx tsc --noEmit` als Typecheck
  (kein Testlauf).

## Read First

- `docs/FRONTEND_ARCHITEKTUR.md` (Abschnitt zu `Cluster`/`StackingRow`)
- `frontend/src/components/ui/Cluster.tsx` (Vorbild für das
  Zweistufen-Container-Query-Muster, NICHT ändern)
- `frontend/src/components/ui/DisclosureTrigger.tsx` (Titel-Slot, `as="span"`-
  Zwang wegen Inline-Verschachtelung)
- `frontend/src/components/fansubs/EpisodeGlassCard.tsx`/`.module.css`/
  `.stories.tsx`
- `frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts`

## Wave 1 — Neuer Grundbaustein `StackingRow`

1. **`frontend/src/components/ui/StackingRow.tsx` anlegen.** Props: `gap`/
   `gapStacked` (eigene `StackingRowGapPurpose`-Zweck-Typen, Wiederverwendung
   der bestehenden Tokens `--space-label-with-trailing-meta`/
   `--space-independent-blocks`), `as` (wirkt auf Außen- UND Innenelement
   gleichermaßen -- damit `as="span"` niemals ein Block-Element in einem
   Inline-Element verschachtelt), `className`, `children`. Zweistufiges
   Rendering wie `Cluster`s `collapseBelow`-Pfad: äußeres Element trägt nur
   `container: stacking-row / inline-size`, inneres Element die eigentliche
   Flex-Anordnung.
2. **`frontend/src/components/ui/StackingRow.module.css` anlegen.**
   Gestapelter Standardzustand (`flex-direction: column`, `align-items:
   stretch`), ab `@container stacking-row (min-width: 20rem)` Zeilen-Zustand
   (`flex-direction: row`, `justify-content: space-between`, `align-items:
   center`). Erstes Kind wächst (`flex: 1 1 0%; min-width: 0`).
3. **`frontend/src/components/ui/StackingRow.stories.tsx` anlegen** unter
   `Grundbausteine/StackingRow`: breiter Container (Zeilen-Anordnung),
   schmaler Container (gestapelt), beide mit langem Titel plus
   Versionszähler-Inhalt; zusätzlich eine per Rahmen-Ziehgriff live
   ausprobierbare Haltepunkt-Demo (identisches, funktionierendes Muster wie
   `Cluster.stories.tsx`s `HaltepunktUmkehr` -- eine `@container`-Abfrage
   reagiert auf die tatsächliche Elementgröße, ein `resize:horizontal`-Griff
   auf einem umschließenden `<div>` löst sie deshalb zuverlässig aus, anders
   als bei `@media`-Viewport-Abfragen).
4. **`frontend/src/components/ui/index.ts`**: `StackingRow`-Export ergänzen
   (alphabetisch zwischen `Stack` und `StatusIcon`).

## Wave 2 — `EpisodeGlassCard` auf `StackingRow` umstellen, Dokumentation, Abnahme

5. **`EpisodeGlassCard.tsx`**: `Cluster`-Import und -Nutzung am Kopf-Element
   durch `StackingRow` ersetzen (`as="span" gap="labelWithTrailingMeta"
   gapStacked="independentBlocks"`). Kein lokales CSS, kein eigenes
   Wrapper-Layout.
6. **`EpisodeGlassCard.stories.tsx`**: „Besteht aus"-Beschreibung und die
   Story `Langer Titel` auf `StackingRow` statt `Cluster.growFirstChild`
   aktualisieren.
7. **`docs/FRONTEND_ARCHITEKTUR.md`**: kurzen `StackingRow`-Eintrag im
   bestehenden Primitives-Absatz ergänzen (Zweck, Schwelle, Abgrenzung zu
   `Cluster`, realer Anwendungsfall).
8. **Live-Abnahme.** `/anime/13` (oder vergleichbare Episodenliste) bei
   `390x844`: Episodenköpfe aufklappen, Titel/Metadaten und Versionszähler
   müssen lesbar untereinander stehen, kein horizontaler Überlauf. Bei
   `1440x900`: einzeilige Kopf-Anordnung mit Titelblock links und
   Versionszähler rechts bleibt wie zuvor/wie `main` erhalten. Danach `npx
   tsc --noEmit` und `git diff --check`. Keine Testdatei, keine Testsuite und
   keine Layout-Purity-Guard-Änderung/-Ausführung.

## Akzeptanzkriterien

- Bei `390x844` sind Episodennummer, Episodentitel, Klassifikations-Metadaten
  und Versionszähler lesbar untereinander gestapelt; kein horizontaler
  Überlauf, keine Überlappung.
- Bei `1440x900` bleibt die vorhandene einzeilige Kopf-Anordnung mit
  Titelblock links und Versionszähler rechts visuell unverändert (wie
  `main`).
- `Cluster.tsx`/`.module.css`/`.stories.tsx` sind byte-identisch zum Stand
  vor diesem Auftrag.
- Der neue Grundbaustein `StackingRow` importiert keinen anderen
  katalogisierten Grundbaustein, hat eine eigene Story unter
  `Grundbausteine/StackingRow` und einen kurzen Eintrag in
  `docs/FRONTEND_ARCHITEKTUR.md`.
- `compositeLayoutPurity.guard.test.ts` bleibt unverändert;
  `EpisodeGlassCard.module.css` bekommt kein neues lokales Layout-CSS.
- Keine Tests werden hinzugefügt oder ausgeführt. `npx tsc --noEmit` ist
  fehlerfrei, `git diff --check` endet fehlerfrei.

## Dateien der Umsetzung

- `frontend/src/components/ui/StackingRow.tsx` (neu)
- `frontend/src/components/ui/StackingRow.module.css` (neu)
- `frontend/src/components/ui/StackingRow.stories.tsx` (neu)
- `frontend/src/components/ui/index.ts`
- `frontend/src/components/fansubs/EpisodeGlassCard.tsx`
- `frontend/src/components/fansubs/EpisodeGlassCard.stories.tsx`
- `docs/FRONTEND_ARCHITEKTUR.md`
