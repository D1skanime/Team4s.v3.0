---
id: 261105-ikx-mobilansicht-der-anime-episodenzeilen-ko
kind: quick
status: complete
completed_at: 2026-11-05
---

# Quick 261105-ikx: Mobile Ansicht der Anime-Episodenzeilen korrigieren

## Ergebnis

Drei Runden. Runde 1 (`Cluster.growFirstChild`) erwies sich bei der eigenen
Live-Nachprüfung als unzureichend -- der verfügbare Platz im Titel-Slot ist
mit `142px` schlicht zu schmal für eine Zeilen-Anordnung, unabhängig davon,
wie das erste Kind wächst. Nach menschlicher Entscheidung wurde in Runde 2
ein neuer, eigenständiger Grundbaustein `StackingRow` gebaut: er ordnet
seine Teile nebeneinander an, sobald sein EIGENER Platz reicht, und stapelt
sie sonst untereinander -- über eine `@container`-Abfrage auf sich selbst
(Schwelle 20rem/320px), nicht über die Bildschirmbreite. `Cluster` bleibt
dabei vollständig unverändert. Eine unabhängige Sichtprüfung vor dem Review
(Runde 3) fand einen echten Regressionsbug in Runde 2s eigener Umsetzung:
bei `as="span"` (genau der von `EpisodeGlassCard` verwendete Fall) blieb der
Container-Query-Namensgeber `display: inline` -- laut CSS-Spezifikation hat
`container-type` darauf KEINE Wirkung, die `@container`-Abfrage griff nie,
der Baustein blieb dadurch IMMER im gestapelten Zustand, auch bei vollem
Desktop-Platz. Mit `display: block` auf dem Container-Namensgeber behoben
und erneut live verifiziert.

## Änderungen

**Runde 1 (Commit `d137fa0ac`, durch Runde 2 überholt, Commit bleibt
bestehen):**
- `EpisodeGlassCard.tsx` aktivierte `Cluster.growFirstChild` am Kopf-Cluster.
- `EpisodeGlassCard.stories.tsx` dokumentierte diesen (unzureichenden)
  Zwischenstand.

**Runde 2 (dieser Durchgang):**
- Neuer Grundbaustein `frontend/src/components/ui/StackingRow.tsx` +
  `.module.css` + `.stories.tsx` (Grundbausteine/StackingRow, drei Stories:
  breiter Container, schmaler Container, live ausprobierbarer Haltepunkt).
  Eigene `StackingRowGapPurpose`-Zweck-Typen (kein Import aus
  Cluster/Stack, Katalog-Taxonomie-konform). Zweistufiges
  Container-Query-Rendering nach dem bei `Cluster`/`SplitLayout` etablierten
  Muster, aber mit `as` konsequent auf Außen- UND Innenelement angewandt
  (vermeidet den in Runde 1 diskutierten Span-in-Div-Fallstrick von vornherein,
  ohne `Cluster` selbst anzufassen).
- `frontend/src/components/ui/index.ts`: `StackingRow`-Export ergänzt.
- `EpisodeGlassCard.tsx`: `Cluster`-Nutzung am Kopf-Element durch
  `StackingRow` ersetzt (`as="span" gap="labelWithTrailingMeta"
  gapStacked="independentBlocks"`). Kein lokales Layout-CSS.
- `EpisodeGlassCard.stories.tsx`: „Besteht aus"-Beschreibung und die Story
  `Langer Titel` auf `StackingRow` aktualisiert.
- `docs/FRONTEND_ARCHITEKTUR.md`: kurzer `StackingRow`-Eintrag im
  bestehenden Primitives-Absatz (Zweck, Schwelle, Abgrenzung zu `Cluster`,
  realer Anwendungsfall `EpisodeGlassCard`).
- `Cluster.tsx`/`.module.css`/`.stories.tsx`: unverändert (verifiziert, kein
  Diff).

**Runde 3 (unabhängige Sichtprüfung vor dem Review, dieser Durchgang):**
- `StackingRow.module.css`: `.stackingRowQueryContainer` bekommt `display:
  block` (vorher implizit `display: inline` bei `as="span"`, wodurch
  `container-type` laut Spezifikation wirkungslos blieb -- die
  `@container`-Abfrage griff nie, der Zeilen-Zustand war über `as="span"`
  faktisch unerreichbar). Zero-Pixel-Diff für `as="div"` (Standardwert bleibt
  ohnehin `display: block`).

## Live-Sichtprüfung

**Runde 2 (vor dem in Runde 3 gefundenen Bug, daher teilweise überholt):**
- `/anime/13` bei `390x844`: Titelblock und Versionszähler stapeln sauber
  untereinander -- korrekt, auch nach Runde 3 unverändert.
- `/anime/13` bei `1440x900`: zum Zeitpunkt von Runde 2 fälschlich als
  "unverändert gegenüber main" dokumentiert -- tatsächlich stapelte auch der
  Desktop-Zustand (siehe Runde 3).

**Runde 3 (nach dem `display: block`-Fix, maßgeblich):**
- `/anime/8` und `/anime/13` bei `1440x900`, mehrere Episodenköpfe
  aufgeklappt (jeweils einzeln per Zoom-Ausschnitt nachgemessen, nicht nur im
  Vollbild-Screenshot überflogen): Titelblock links, Versionszähler
  rechtsbündig auf derselben Zeile -- jetzt tatsächlich wie `main`, für ALLE
  aufgeklappten Episoden konsistent (nicht nur die erste).
- `/anime/13` bei `390x844`: weiterhin korrekt gestapelt, keine Regression
  durch den Fix.
- Storybook `Zusammengesetzte Bausteine/EpisodenKarte` → „Langer Titel":
  bestätigt dieselbe korrekte Zeilen-Anordnung bei langem Titel.
- Storybook `Grundbausteine/StackingRow` → „Breiter Container"/„Schmaler
  Container" (beide `as="div"`, vom Bug nicht betroffen): unverändert
  korrekt.
- Keine Browser-Konsolenfehler bei allen Durchläufen.

## Verifikation

- Live-Browser-Sichtprüfung über die laufende Frontend-Instanz auf
  `http://127.0.0.1:3000/anime/8` und `/anime/13` bei `390x844` und
  `1440x900`, sowie Storybook unter `http://127.0.0.1:6006` (Playwright,
  disposable Skripte, nicht committet).
- `npx tsc --noEmit`: fehlerfrei (nach Runde 2 und erneut nach Runde 3).
- `git diff --check`: fehlerfrei.
- `Cluster.tsx`/`.module.css`/`.stories.tsx` byte-identisch zum Stand vor
  diesem Auftrag (`git diff` leer für diese drei Dateien).

Keine Tests, Testsuiten oder Layout-Purity-Guard-Änderungen wurden gemäß
Quick-Plan hinzugefügt oder ausgeführt.

## Abweichungen

Runde 1 (reine `Cluster`-Erweiterung) und der später von Codex entworfene
Ansatz einer globalen `Cluster`-Änderung wurden nach menschlicher
Entscheidung bewusst verworfen -- siehe `PLAN.md` für die vollständige
Begründung. Runde 3s `display: block`-Fix behebt einen in Runde 2 selbst
eingeführten, bei der damaligen Sichtprüfung nicht bemerkten Bug (Vollbild-
Screenshots zeigten die stapelnde Fehlrendering nicht deutlich genug, erst
ein gezielter Zoom-Ausschnitt auf einen einzelnen Episodenkopf deckte ihn
auf) -- kein Abweichen vom Plan, aber ein Beleg, warum ein gezielter,
elementgenauer Blick über ein Vollbild-Screenshot hinaus nötig ist.
