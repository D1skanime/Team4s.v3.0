---
id: 261106-uat1-anime-detail-release-zeile-fixes
kind: quick
status: complete
completed_at: 2026-11-06
---

# Quick 261106-uat1: Live-UAT-Nachbesserung -- vier Befunde behoben

## Ergebnis

Alle vier vom Menschen gemeldeten Befunde behoben, jeweils als Grundbaustein-/Token-Fähigkeit statt
Seiten-/Feature-lokaler Umgehung:

**Befund 1 (heller Rand-Strich, Infokarte):** `Card.module.css`s `.cardPublicHeroInfo` erbte von
`.card` weiterhin eine 1px-Randfläche (nur die Farbe war `transparent`), in die der
Verlaufshintergrund per CSS-Standard-`background-repeat` sein fast opakes oberes Verlaufsende
hineinwiederholte. `border-width: 0` ersetzt `border-color`/`border-top-color: transparent`
vollständig -- identischer, bereits an `.posterMetaCard` etablierter Fix.

**Befund 2 (leerer Streifen unter Posterspalte):** `SplitLayout.module.css`s `.firstColumn`/
`.secondColumn` stretchten als Grid-Zeile zwar gleich hoch (`align="stretch"` war bereits gesetzt),
reichten diese Höhe aber nicht an ihr jeweils einziges Kind weiter. Jetzt `display:flex;
flex-direction:column` mit `flex: 1` auf dem Kind -- bei `align="start"` (Standard) bleibt das
Verhalten ein reiner No-Op (keine zusätzliche Höhe zum Wachsen vorhanden).

**Befund 3 (eigenes Layout-CSS in ReleasePreviewRow):** Drei neue/erweiterte Grundbaustein-
Fähigkeiten ersetzen die lokalen Regeln vollständig: `Cluster shrink?: boolean` (verhindert
Schrumpfen des Clusters SELBST als Flex-Kind, ersetzt `.logos { flex-shrink: 0 }`), `Text
variant="strong"` (Fließtextgröße + `font-weight: 600`, ersetzt `.groupName`s lokales
`font-weight`) sowie `Text tracking?: 'normal' | 'wide'` (ersetzt `.coopLabel`s lokales
`letter-spacing`; dessen `font-weight` entfällt ersatzlos, da es jetzt von der umschließenden
`variant="strong"`-Zeile erbt). `.logos`/`.coopLabel` sind aus `ReleasePreviewRow.module.css`
komplett entfernt, nur `.groupName { word-break: break-word }` (reine Umbruchentscheidung) bleibt.

**Befund 4 (Storybook-Bühne zu niedrig bei 390px):** `BannerSection` bekommt eine neue Prop
`fillHeight?: boolean` (Standard `false`, Zero-Diff für alle bestehenden Aufrufer) -- ersetzt die
feste `--banner-height`/`--banner-height-mobile` durch CSS `inset: 0`, wodurch die Fläche exakt auf
die Höhe ihres `position:relative`-Vorfahren wächst, selbst wenn diese erst durch variablen Inhalt
entsteht. `ReleasePreviewRow.stories.tsx`s Decorator setzt die Prop.

## Änderungen

- `frontend/src/components/ui/Card.module.css`: `.cardPublicHeroInfo` `border-width: 0` statt
  `border-color`/`border-top-color: transparent`.
- `frontend/src/components/ui/SplitLayout.module.css`: `.firstColumn`/`.secondColumn`
  `display:flex;flex-direction:column`, `> *` `flex: 1`.
- `frontend/src/components/ui/Cluster.tsx`: neue Prop `shrink?: boolean` (Standard `true`),
  angewendet auf beide Render-Pfade (Einzelstufen-Element UND äußeres Container-Element des
  Zweistufen-Pfads, NICHT das innere Flex-Kind -- der Cluster selbst als Kind SEINES
  Elternelements ist betroffen, nicht seine eigenen Kinder).
- `frontend/src/components/ui/Cluster.module.css`: neue Regel `.clusterNoShrink { flex-shrink: 0 }`.
- `frontend/src/components/ui/Text.tsx`: neue Variante `strong` (`TextVariant`), neue Prop
  `tracking?: 'normal' | 'wide'` (`TextTracking`), Komponentendoku nachgezogen.
- `frontend/src/components/ui/Text.module.css`: `.textStrong` (Fließtextgröße + `font-weight:
  600`), `.textTrackingWide` (`letter-spacing: var(--text-tracking-wide, 0.04em)`).
- `frontend/src/components/ui/BannerSection.tsx`: neue Prop `fillHeight?: boolean`.
- `frontend/src/components/ui/BannerSection.module.css`: neue Regel `.bannerSectionFillHeight
  { inset: 0; height: auto }`, deklariert nach der mobilen Haltepunkt-Regel, damit sie deren
  `height`-Wert zuverlässig überschreibt.
- `frontend/src/components/ui/BannerSection.stories.tsx`: neue Story
  `Mit inhaltsabhängiger Höhe (fillHeight)` ("Stories ziehen mit") -- Beispielinhalt rendert
  bewusst als normal fließendes GESCHWISTER neben `BannerSection`, nicht als dessen `children`
  (BannerSection bleibt selbst `position:absolute` und kann deshalb nicht die Höhe seines eigenen
  Vorfahren bestimmen; dasselbe Muster wie `ReleasePreviewRow.stories.tsx`s Decorator). Ein erster
  Versuch mit dem Beispielinhalt als `children` rendere komplett leer (0 Höhe, siehe Abweichungen
  unten) -- live in Storybook gefunden und sofort korrigiert.
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx`: `Text variant="strong"` auf die
  Gruppennamen-Zeile, `Text tracking="wide"` auf das COOP-Label (keine `className` mehr nötig),
  `Cluster shrink={false}` auf die Avatar-Gruppe (keine `className={styles.logos}` mehr nötig).
- `frontend/src/components/fansubs/ReleasePreviewRow.module.css`: `.logos`/`.coopLabel` entfernt,
  `.groupName` nur noch `word-break: break-word`.
- `frontend/src/components/fansubs/ReleasePreviewRow.stories.tsx`: Decorator setzt `fillHeight` auf
  `BannerSection`.
- `docs/FRONTEND_ARCHITEKTUR.md`: alle vier neuen/erweiterten Fähigkeiten (`Cluster.shrink`,
  `Text.strong`/`tracking`, `SplitLayout`s Spalten-Höhenweitergabe, `BannerSection.fillHeight`)
  sowie der Card-Randbreite-Fix dokumentiert.

## Live-Sichtprüfung

- **Befund 1+2** (`http://127.0.0.1:3300/anime/13`, Desktop 1440px): Poster- und Infokarte enden
  per `getBoundingClientRect()` auf EXAKT derselben Höhe (beide `bottom: 1030.14px`), kein dunkler
  Streifen mehr unter der Posterspalte. Zoom-Ausschnitt des unteren Infokarten-Rands zeigt keinen
  hellen Strich mehr, weicher Verlauf in den Bannerhintergrund.
- **Befund 1+2 Mobil** (390px): unverändert korrekt (Poster-/Info-Karten stapeln wie zuvor, keine
  Regression durch die neue `flex:1`-Regel, da `align="start"` dort kein zusätzliches Höhenwachstum
  erzeugt).
- **Befund 3** (`/anime/13`, Episode aufgeklappt, Desktop UND Mobil 390px, sowie Storybook
  `Zusammengesetzte Bausteine/Release-Versionszeile` -- alle fünf Stories inkl. "Koop"):
  Gruppennamen weiterhin fett, "COOP"-Label weiterhin fett + leicht gespreizt, Avatar-Gruppe
  schrumpft bei zwei Logos (Koop-Story) weiterhin nicht. Keine sichtbare optische Änderung
  gegenüber vorher.
- **Befund 4** (Storybook `Release-Versionszeile`, alle fünf Stories, Desktop 1000px UND Mobil
  390px): dunkle Bühne reicht jetzt exakt bis zum Inhaltsende -- bei "Mit allen Extras" (höchster
  Inhalt) UND "Koop" kein Überlauf mehr auf den hellen Storybook-Hintergrund. Neue
  `BannerSection`-Story `fillHeight` (eigener, absichtlich hoher Beispielinhalt) zeigt die Fläche
  korrekt bis zum Textende wachsend, bestehende `BannerSection`-Stories (`Standard` etc.)
  unverändert (weiterhin fester 240px-Decorator des Meta-Objekts).
- Keine Browser-Konsolenfehler in allen geprüften Zuständen.

## Verifikation

- `npx tsc --noEmit`: fehlerfrei.
- `npx eslint` auf allen 14 geänderten `.tsx`/`.module.css`-Dateien: keine Fehler (sechs erwartete
  Warnungen für `.module.css`-Dateien, da ESLint CSS-Module nicht prüft).
- Live-Browser-Sichtprüfung aller vier Befunde, App UND Storybook, Desktop UND Mobil (siehe oben).

Keine Tests, Testsuiten oder Guard-Änderungen wurden hinzugefügt oder ausgeführt (bindende Vorgabe
vor der Live-Abnahme).

## Bekannte Einschränkung

`Card.stories.tsx`, `EpisodeGlassCard.stories.tsx` und `FansubGroupContext.stories.tsx` nutzen
denselben `BannerSection`-Decorator wie `ReleasePreviewRow.stories.tsx` (fester 240px- bzw. 160px-
Rahmen) und haben vermutlich dieselbe Mobil-Schwäche bei hohem Inhalt -- bewusst NICHT mitgezogen,
da Befund 4 explizit nur "Release-Versionszeile" nennt (Scope-Disziplin). `BannerSection fillHeight`
steht als fertige, wiederverwendbare Lösung für diese drei Dateien bereit, falls ein künftiger
Auftrag das dort ebenfalls braucht.

## Abweichungen vom ursprünglichen Plan

Der erste Entwurf der neuen `BannerSection`-Story `fillHeight` rendere den Beispielinhalt als
`children` von `BannerSection` -- das ergab eine komplett LEERE Vorschau (0 Höhe), da
`BannerSection` selbst weiterhin `position:absolute` ist und ihre eigene Höhe nicht aus
`children` innerhalb ihrer selbst, sondern aus einem tatsächlich im Textfluss stehenden GESCHWISTER
beziehen muss (Henne-Ei-Problem: ein `position:absolute`-Element kann nicht gleichzeitig die
Höhenquelle UND der Höhenempfänger seines eigenen Vorfahren sein). Live in Storybook gefunden
(leere Vorschau trotz korrektem DOM-Inhalt laut `innerText`) und sofort auf das korrekte,
geschwister-basierte Muster umgestellt (identisch zu `ReleasePreviewRow.stories.tsx`s bereits
funktionierendem Decorator).
