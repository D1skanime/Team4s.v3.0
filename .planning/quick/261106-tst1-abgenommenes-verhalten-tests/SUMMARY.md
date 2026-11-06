---
id: 261106-tst1-abgenommenes-verhalten-tests
kind: quick
status: complete
completed_at: 2026-11-06
---

# Quick 261106-tst1: Tests für das abgenommene Verhalten nachgezogen

## Ergebnis

Nach der menschlichen Live-Abnahme-Freigabe Tests für das in diesem Auftrag (261102-226d)
eingeführte/geänderte Verhalten nachgezogen. Ausschließlich Testdateien geändert, kein Produktcode.

**Behobene Testschuld:** `EffectsShowcase.test.tsx` erwartete noch das alte, einheitliche
10-Bild-Verhalten vor dem Banner-Fixture-Split (Quick-Task 261105-bnr) -- schlug bereits fehl
(`expected 8 to be 10`). Aufgeteilt in zwei separate Zählungen (8 Bilder mit dem gemeinsamen
Fixture, 2 mit dem eigenen Banner-Fixture) plus ein neuer Test, der das Banner-Fixture explizit auf
die erwartete Quelldatei prüft.

**Neue Testabdeckung für fünf zuvor ungetestete Grundbaustein-Fähigkeiten** (alle aus
261105-cr2/261106-uat1, bislang nur indirekt über Storybook-Stories/Sichtprüfung verifiziert):

- `Cluster.shrink`: Standard (keine Klasse), `shrink={false}` im Einzelstufen-Pfad, UND im
  Zweistufen-Pfad (`collapseBelow`/`float` gesetzt) -- dort explizit geprüft, dass die Klasse auf
  dem ÄUSSEREN Wurzelelement landet, nicht auf dem inneren Flex-Kind (entscheidend, da das äußere
  Element der tatsächliche Flex-Teilnehmer im Elternelement ist).
- `Text.variant="strong"` und `Text.tracking="wide"`: beide Klassen einzeln und kombiniert geprüft.
- `BannerSection.fillHeight`: Standard (keine Klasse), `true` (Klasse gesetzt) sowie ein
  CSS-Deklarationstest, dass `.bannerSectionFillHeight` NACH der mobilen Haltepunkt-Regel steht
  (entscheidend für die Override-Reihenfolge).
- `SplitLayout`s Spalten-Höhenweitergabe (`display:flex;flex-direction:column`+`flex:1`): als
  CSS-Deklarationstest, da jsdom kein echtes Pixel-Layout berechnet und die Prop-lose,
  unconditioneller Natur der Regel keine Render-Verzweigung zum Prüfen bietet.
- `Card.cardPublicHeroInfo`s `border-width:0`-Fix: CSS-Deklarationstest, der explizit auch
  bestätigt, dass die alte `border-color:transparent`/`border-top-color:transparent`-Lösung
  entfernt wurde.
- `ReleasePreviewRow.test.tsx`: drei neue Tests, die den ECHTEN Komposit-Baustein rendern und
  bestätigen, dass Gruppenname/COOP-Label/Avatar-Gruppe die neuen globalen Klassen tatsächlich
  tragen (`textStrong`, `textTrackingWide`, `clusterNoShrink`) -- nicht nur, dass die Grundbausteine
  selbst die Klassen anwenden können.

## Teststil

Durchgehend direkte Logik-/Render-Assertions, keine Klick-/Maus-Simulation, keine Snapshot-Tests:

- Komponenten mit Props → `render()` + CSS-Klassen-Assertion am DOM-Knoten (identisches Muster wie
  die bereits bestehenden `growFirstChild`/`pinLastChild`/`variant`/`tone`-Tests in denselben
  Dateien).
- Reine, unconditioneller CSS-Mechanik ohne React-Prop-Verzweigung (SplitLayouts Höhenweitergabe,
  Cards Randbreite, BannerSections Deklarationsreihenfolge) → CSS-Datei lesen, konkrete Regel per
  Regex prüfen (identisches, bereits etabliertes Muster wie `cardSeamless`-
  /`backdropWrapperAnime`-Tests in denselben Dateien) -- jsdom berechnet kein echtes Pixel-Layout,
  das ist der einzige tatsächlich ausführbare Nachweis für reine CSS-Mechanik.

## Änderungen (ausschließlich Testdateien)

- `frontend/src/components/showcases/EffectsShowcase.test.tsx`
- `frontend/src/components/ui/Cluster.test.tsx`
- `frontend/src/components/ui/Text.test.tsx`
- `frontend/src/components/ui/SplitLayout.test.tsx`
- `frontend/src/components/ui/BannerSection.test.tsx`
- `frontend/src/components/ui/Card.test.tsx`
- `frontend/src/components/fansubs/ReleasePreviewRow.test.tsx`

## Verifikation

- `npx vitest run` auf allen sieben geänderten Testdateien: 77/77 grün (vorher 60 grün + 1 bekannt
  rot in genau diesen Dateien).
- `npx vitest run` auf den fünf betroffenen Guard-/Taxonomie-Tests (`catalogTaxonomy.test.ts`,
  `gapPurposeNaming.guard.test.ts`, `detailStyleSystem.guard.test.ts`,
  `effectTokenPurity.guard.test.ts`, `compositeLayoutPurity.guard.test.ts`, die alle mindestens
  eine der geänderten `.module.css`-Dateien scannen): 48/48 grün.
- `npx vitest run` auf `AnimeDetailView.test.tsx`/`.fixtures.test.ts`/`page.test.tsx` (der echte
  Konsument von Card/SplitLayout): 49/49 grün.
- `npx tsc --noEmit`: fehlerfrei.
- `npx eslint` auf allen sieben geänderten Dateien: keine Fehler.
- `git status --short`: ausschließlich `*.test.ts(x)`-Dateien geändert, kein Produktcode.
- Backend nicht betroffen (`git log main..HEAD -- backend/` ist für den gesamten Auftrag leer).

Der vollständige Regressionstest läuft anschließend durch `ki-run` selbst.
