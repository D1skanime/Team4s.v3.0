---
id: 261106-uat1-anime-detail-release-zeile-fixes
kind: quick
status: complete
created_at: 2026-11-06
completed_at: 2026-11-06
waves: 1
---

# Quick-Plan: Live-UAT-Nachbesserung -- Infokarten-Rand, Posterspaltenhöhe, Release-Zeilen-CSS, Storybook-Bühne

## Befunde (Live-Abnahme des Menschen + Vorprüfung)

1. **Heller Strich am unteren Rand der Infokarte** (`/anime/[id]`, rechte Karte, Desktop): `Card`s
   Variante `cardPublicHeroInfo` erbt von `.card` einen `border: 1px solid ...` mit nur
   `border-color: transparent` überschrieben -- die Randfläche bleibt dadurch weiterhin 1px breit.
   Der Verlaufshintergrund (`--card-public-hero-info-bg`) wird per CSS-Standard
   (`background-repeat: repeat`) in diese Randfläche hineinwiederholt, dessen fast opakes oberes
   Verlaufsende erscheint dadurch als helle Linie am unteren Kartenrand.
2. **Dunkler, leerer Streifen unter der Posterspalte** (`/anime/[id]`, Desktop): `SplitLayout`s
   `firstColumn`/`secondColumn`-Wrapper stretchen zwar als GRID-ZEILE gleich hoch (`align="stretch"`
   bereits gesetzt), reichen diese Höhe aber nicht an ihr jeweils einziges Kind weiter -- ein
   normales Block-Element bleibt ohne eigenen Höhenmechanismus bei seiner intrinsischen
   Inhaltshöhe. Die Posterkarte endete dadurch früher als die Infokarte.
3. **Eigenes Layout-CSS in `ReleasePreviewRow.module.css`**: `.logos { flex-shrink: 0 }` sowie
   `font-weight`/`letter-spacing` in `.groupName`/`.coopLabel` sind seiten-/feature-lokale
   Layout-/Typografie-Entscheidungen, die laut Projektregel in die jeweiligen Grundbausteine
   (Cluster/Text) gehören statt lokal dupliziert zu werden.
4. **Storybook "Release-Versionszeile" bei 390px**: Die dunkle `BannerSection`-Bühne hinter der
   Vorschau ist mit `--banner-height-mobile` fest auf ~100px begrenzt -- bei mehrzeiligem/
   gestapeltem Inhalt (Mobil, "Mit allen Extras") ragt die Zeile über die dunkle Fläche hinaus auf
   den hellen Storybook-Hintergrund, Text wird dort kaum lesbar.

## Entschiedene Lösungen (alle als Grundbaustein-/Token-Fähigkeit, nicht seiten-/feature-lokal)

1. **`Card.module.css`**: `.cardPublicHeroInfo` bekommt `border-width: 0` statt
   `border-color: transparent`/`border-top-color: transparent` -- entfernt die Randfläche
   vollständig (identischer, bereits etablierter Fix wie `.posterMetaCard` in
   `AnimeDetailHero.module.css`). `BannerSection` bleibt unverändert.
2. **`SplitLayout.module.css`**: `.firstColumn`/`.secondColumn` werden `display:flex;
   flex-direction:column`, ihr jeweils einziges Kind bekommt `flex: 1` -- reicht die bereits per
   `align="stretch"` ausgeglichene Spaltenhöhe an das Kind weiter. Bei `align="start"` (Standard)
   bleibt das Verhalten unverändert (keine zusätzliche Höhe zum Wachsen vorhanden, reiner
   No-Op-Zero-Pixel-Diff für jeden bestehenden Aufrufer ohne `align="stretch"`).
3. **Drei neue/erweiterte Grundbaustein-Fähigkeiten**:
   - `Cluster` bekommt `shrink?: boolean` (Standard `true`): `false` setzt `flex-shrink: 0` auf den
     Cluster SELBST als Flex-Kind seines Elternelements (eigenständig von `pinLastChild`, das ein
     KIND des Clusters betrifft). Ersetzt `.logos`.
   - `Text` bekommt die neue Variante `strong` (Fließtextgröße, `font-weight: 600`) für
     `.groupName` sowie eine neue, von `variant`/`tone` unabhängige Prop `tracking?: 'normal' |
     'wide'` (`letter-spacing`) für `.coopLabel` -- `.coopLabel`s Fettung erbt sich jetzt von der
     umschließenden `variant="strong"`-Zeile, die Zeichenspreizung kommt aus `tracking="wide"`.
   - `.logos`/`.coopLabel` entfallen ersatzlos aus `ReleasePreviewRow.module.css`, nur
     `.groupName { word-break: break-word }` (reine Umbruchentscheidung) bleibt lokal.
4. **`BannerSection` bekommt `fillHeight?: boolean`** (Standard `false`, Zero-Diff für alle
   bestehenden Aufrufer): ersetzt die feste `--banner-height`/`--banner-height-mobile` durch CSS
   `inset: 0` -- die Fläche wächst dadurch auf die tatsächliche Höhe ihres `position:relative`-
   Vorfahren, selbst wenn diese erst durch variablen Inhalt entsteht (`top`/`bottom`-Insets lösen
   sich bei einem `height:auto`-Vorfahren zuverlässig auf, eine reine Prozent-Höhenangabe nicht).
   `ReleasePreviewRow.stories.tsx`s Decorator setzt die Prop; die drei anderen Dateien mit
   identischem Decorator-Muster (`Card.stories.tsx`, `EpisodeGlassCard.stories.tsx`,
   `FansubGroupContext.stories.tsx`) bleiben UNVERÄNDERT -- nicht Teil dieses Befunds, siehe Scope.

## Scope und feste Grenzen

- Nur die vier genannten Befunde; `Card.stories.tsx`/`EpisodeGlassCard.stories.tsx`/
  `FansubGroupContext.stories.tsx` nutzen denselben Decorator wie `ReleasePreviewRow.stories.tsx`
  und hätten vermutlich dieselbe Mobil-Schwäche -- bewusst NICHT mitgezogen (Befund 4 nennt explizit
  nur "Release-Versionszeile"), siehe SUMMARY für den Hinweis an künftige Aufträge.
  Behoben wird jeweils der Grundbaustein, keine seiten-/feature-lokale Umgehung.
- Keine neuen Tests, keine Testsuiten vor der Live-Abnahme. Nachweis: `npx tsc --noEmit` + ESLint +
  Live-Sichtprüfung in Browser (App `/anime/13` Desktop 1440px + Mobil 390px, App-Release-Zeile
  aufgeklappt, Storybook alle fünf `Release-Versionszeile`-Stories + neue `BannerSection`-Story
  `fillHeight` je Desktop/Mobil).
- "Stories ziehen mit": `BannerSection.stories.tsx` bekommt eine neue Story
  `Mit inhaltsabhängiger Höhe (fillHeight)`.

## Read First

- `frontend/src/components/ui/Card.module.css`, `Card.tsx`
- `frontend/src/components/ui/SplitLayout.tsx`, `.module.css`
- `frontend/src/components/ui/Cluster.tsx`, `.module.css`
- `frontend/src/components/ui/Text.tsx`, `.module.css`
- `frontend/src/components/ui/BannerSection.tsx`, `.module.css`, `.stories.tsx`
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx`, `.module.css`, `.stories.tsx`
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx`, `.module.css` (Aufrufstelle, nur lesend)

## Akzeptanzkriterien

- `/anime/13` Desktop 1440px: Poster- und Infokarte enden auf derselben Höhe (per Playwright
  `getBoundingClientRect()` nachgemessen), kein heller Strich am unteren Infokarten-Rand.
- Storybook `Release-Versionszeile`, alle fünf Stories, Desktop UND Mobil: dunkle Bühne reicht
  exakt bis zum Inhaltsende, kein Überlauf auf hellen Hintergrund.
- `grep -n "shrink" Cluster.tsx` / `grep -n "fillHeight" BannerSection.tsx` zeigen die neuen Props.
- `ReleasePreviewRow.module.css` enthält keine `flex-shrink`/`font-weight`/`letter-spacing`-Regel
  mehr.
- `npx tsc --noEmit` fehlerfrei, ESLint ohne neue Fehler.

## Dateien der Umsetzung

- `frontend/src/components/ui/Card.module.css`
- `frontend/src/components/ui/SplitLayout.module.css`
- `frontend/src/components/ui/Cluster.tsx`, `Cluster.module.css`
- `frontend/src/components/ui/Text.tsx`, `Text.module.css`
- `frontend/src/components/ui/BannerSection.tsx`, `BannerSection.module.css`,
  `BannerSection.stories.tsx`
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx`, `ReleasePreviewRow.module.css`,
  `ReleasePreviewRow.stories.tsx`
- `docs/FRONTEND_ARCHITEKTUR.md`
