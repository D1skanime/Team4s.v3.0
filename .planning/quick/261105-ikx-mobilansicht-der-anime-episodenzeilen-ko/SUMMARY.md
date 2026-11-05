---
id: 261105-ikx-mobilansicht-der-anime-episodenzeilen-ko
kind: quick
status: complete
completed_at: 2026-11-05
---

# Quick 261105-ikx: Mobile Ansicht der Anime-Episodenzeilen korrigieren

## Ergebnis

Zwei Runden. Runde 1 (`Cluster.growFirstChild`) erwies sich bei der eigenen
Live-Nachprüfung als unzureichend -- der verfügbare Platz im Titel-Slot ist
mit `142px` schlicht zu schmal für eine Zeilen-Anordnung, unabhängig davon,
wie das erste Kind wächst. Nach menschlicher Entscheidung wurde in Runde 2
ein neuer, eigenständiger Grundbaustein `StackingRow` gebaut: er ordnet
seine Teile nebeneinander an, sobald sein EIGENER Platz reicht, und stapelt
sie sonst untereinander -- über eine `@container`-Abfrage auf sich selbst
(Schwelle 20rem/320px), nicht über die Bildschirmbreite. `Cluster` bleibt
dabei vollständig unverändert.

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

## Live-Sichtprüfung (Runde 2, nach der Umstellung auf StackingRow)

- `/anime/13` bei `390x844`, mehrere Episodenköpfe aufgeklappt: Titelblock
  (Episodennummer/-titel/Klassifikation) und Versionszähler stehen jeweils
  vollständig lesbar untereinander, kein horizontaler Überlauf, keine
  Überlappung (z. B. „Folge 8 Pandoras Schönheitskönigin" / „Haupthandlung ·
  Episode" / „3 Versionen" sauber gestapelt).
- `/anime/13` bei `1440x900`, mehrere Episodenköpfe aufgeklappt: Titelblock
  links, Versionszähler rechtsbündig auf derselben Zeile -- unverändert
  gegenüber dem bisherigen/main-Erscheinungsbild.
- Keine Browser-Konsolenfehler bei beiden Durchläufen.

## Verifikation

- Live-Browser-Sichtprüfung über die laufende Frontend-Instanz auf
  `http://127.0.0.1:3000/anime/13` bei `390x844` und `1440x900` (Playwright,
  disposables Skript, nicht committet).
- `npx tsc --noEmit`: fehlerfrei.
- `git diff --check`: fehlerfrei.
- `Cluster.tsx`/`.module.css`/`.stories.tsx` byte-identisch zum Stand vor
  diesem Auftrag (`git diff` leer für diese drei Dateien).

Keine Tests, Testsuiten oder Layout-Purity-Guard-Änderungen wurden gemäß
Quick-Plan hinzugefügt oder ausgeführt.

## Abweichungen

Keine gegenüber dem (in Runde 2 korrigierten) Plan. Der ursprüngliche,
in Runde 1 verfolgte Ansatz (reine `Cluster`-Erweiterung bzw. später von
Codex entworfene globale `Cluster`-Änderung) wurde nach menschlicher
Entscheidung bewusst verworfen -- siehe `PLAN.md` für die vollständige
Begründung beider Runden.
