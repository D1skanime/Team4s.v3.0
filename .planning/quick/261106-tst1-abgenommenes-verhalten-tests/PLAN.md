---
id: 261106-tst1-abgenommenes-verhalten-tests
kind: quick
status: complete
created_at: 2026-11-06
completed_at: 2026-11-06
waves: 1
---

# Quick-Plan: Tests für das von der Live-Abnahme freigegebene Verhalten nachziehen

## Auslöser

Der Mensch hat die Live-Abnahme für Auftrag 261102-226d freigegeben. Per bindender REIHENFOLGE-
Vorgabe (05.11.2026) wurden vor der Abnahme bewusst keine Tests geschrieben; jetzt, nach der
Freigabe, werden Tests für das abgenommene Verhalten nachgezogen. Nur Testdateien werden geändert --
kein Produktcode.

## Bekannte Testschulden aus dem Auftrag

1. `EffectsShowcase.test.tsx` erwartete noch 10 Bild-Instanzen desselben Fixture-Bilds (vor dem
   Banner-Fixture-Split in Quick-Task 261105-bnr, dort explizit als bekannte Einschränkung
   vermerkt) -- schlug bei `npx vitest run` bereits fehl (`expected 8 to be 10`).
2. Fünf globale Baustein-Fähigkeiten aus den letzten Quick-Tasks (261105-cr2, 261106-uat1) hatten
   noch keine direkte Testabdeckung: `Cluster.shrink`, `Text.variant="strong"`, `Text.tracking`,
   `BannerSection.fillHeight`, `SplitLayout`s Spalten-Höhenweitergabe, sowie `Card.cardPublicHeroInfo`s
   Randbreiten-Fix.

## Entscheidung: Teststil

Gemäß Auftrag ausschließlich direkte Logik-/Render-Assertions (keine Klick-/Maus-Simulation, keine
Snapshot-Tests):

- Komponenten mit Props (`Cluster.shrink`, `Text.variant`/`tracking`, `BannerSection.fillHeight`):
  `render()` ausführen und die resultierende CSS-Klasse am DOM-Knoten prüfen -- identisches,
  bereits etabliertes Muster wie die übrigen Tests in denselben Dateien (z. B.
  `Cluster.test.tsx`s `growFirstChild`/`pinLastChild`-Tests, `Text.test.tsx`s `variant`/`tone`-Tests).
- Reine CSS-Mechanik ohne React-Prop-Verzweigung (`SplitLayout`s unbedingte
  `display:flex;flex-direction:column`+`flex:1`-Regel, `Card.cardPublicHeroInfo`s `border-width:0`,
  `BannerSection.fillHeight`s Deklarationsreihenfolge NACH der mobilen Haltepunkt-Regel): CSS-Datei
  lesen und die konkrete Regel per Regex prüfen -- identisches, bereits etabliertes Muster wie die
  bestehenden `*.module.css`-Tests in denselben Dateien (z. B. `Card.test.tsx`s `cardSeamless`-Test,
  `BannerSection.test.tsx`s `backdropWrapperAnime`-Deklarationsreihenfolge-Test). jsdom berechnet
  kein echtes Pixel-Layout -- die tatsächliche Höhenangleichung lässt sich nicht anders als über die
  CSS-Regel selbst verifizieren.
- `ReleasePreviewRow.test.tsx`: prüft, dass der echte Komposit-Baustein die neuen Fähigkeiten
  tatsächlich verdrahtet (Gruppenname trägt `textStrong`, COOP-Label trägt `textTrackingWide`,
  Avatar-Gruppe trägt `clusterNoShrink`) -- rendert die echte Komponente, keine Mock-Doubles.

## Scope und feste Grenzen

- Ausschließlich `*.test.tsx`/`*.test.ts`-Dateien geändert, kein Produktcode.
- Kein Backend betroffen (dieser gesamte Auftrag 261102-226d war ausschließlich Frontend-CSS-/
  Komponentenarbeit, `git log main..HEAD -- backend/` ist leer).
- Keine neuen Guard-/Purity-Tests erfunden -- nur Lücken in bereits bestehenden, etablierten
  Testdateien geschlossen.

## Read First

- `frontend/src/components/ui/Cluster.tsx`, `.test.tsx`, `.module.css`
- `frontend/src/components/ui/Text.tsx`, `.test.tsx`, `.module.css`
- `frontend/src/components/ui/SplitLayout.tsx`, `.test.tsx`, `.module.css`
- `frontend/src/components/ui/BannerSection.tsx`, `.test.tsx`, `.module.css`
- `frontend/src/components/ui/Card.tsx`, `.test.tsx`, `.module.css`
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx`, `.test.tsx`
- `frontend/src/components/showcases/EffectsShowcase.tsx`, `.test.tsx`

## Akzeptanzkriterien

- `git status --short` zeigt ausschließlich `*.test.ts(x)`-Dateien als geändert.
- `npx vitest run` auf allen sieben oben genannten Testdateien plus den fünf Guard-/Taxonomie-Tests
  (`catalogTaxonomy.test.ts`, `gapPurposeNaming.guard.test.ts`, `detailStyleSystem.guard.test.ts`,
  `effectTokenPurity.guard.test.ts`, `compositeLayoutPurity.guard.test.ts`) sowie den
  `AnimeDetailView`-Tests: alle grün.
- `npx tsc --noEmit` fehlerfrei, ESLint ohne neue Fehler.

## Dateien der Umsetzung

- `frontend/src/components/showcases/EffectsShowcase.test.tsx`
- `frontend/src/components/ui/Cluster.test.tsx`
- `frontend/src/components/ui/Text.test.tsx`
- `frontend/src/components/ui/SplitLayout.test.tsx`
- `frontend/src/components/ui/BannerSection.test.tsx`
- `frontend/src/components/ui/Card.test.tsx`
- `frontend/src/components/fansubs/ReleasePreviewRow.test.tsx`
