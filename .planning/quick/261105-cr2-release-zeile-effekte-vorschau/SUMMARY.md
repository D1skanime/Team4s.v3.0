---
id: 261105-cr2-release-zeile-effekte-vorschau
kind: quick
status: complete
completed_at: 2026-11-05
---

# Quick 261105-cr2: Zwei offene Codex-Review-Befunde vor der Live-Abnahme behoben

## Ergebnis

Beide Befunde aus der Live-Abnahme-Rückmeldung behoben.

**Befund 1 (Release-Zeile, eigenes Layout-CSS):** `ReleasePreviewRow.module.css`s lokales
`.body { flex: 1; min-width: 0; }`/`.action { flex-shrink: 0; align-self: center; }` (ab 768px)
entfällt vollständig. `Cluster` bekommt eine neue, zu `growFirstChild` symmetrische Prop
`pinLastChild?: boolean` (hält das letzte Kind auf eigener Höhe/Breite statt es über
`align="stretch"` zu strecken, verhindert sein Schrumpfen) -- der äußere Cluster in
`ReleasePreviewRow.tsx` setzt jetzt `growFirstChild pinLastChild` zusätzlich zu seinen
bestehenden Props. Optik unverändert: Desktop einzeilig (Textspalte wächst, Button auf eigener
Höhe), Mobil gestapelt (Button volle Breite über `fullWidthBelowMd`).

**Befund 2 (Effekt-Vorschauen, keine farbigen Vorher/Nachher-Paare):** Vier der fünf Einträge in
`EffectsShowcase.tsx` nutzten `BannerSection` bereits im Vorher-Zustand -- deren eigene
Unschärfe-/Abdunklungs-Wirkung (das IST Eintrag 1s demonstrierte Wirkung) machte Vorher und
Nachher gleich gedämpft. Neue lokale Hilfskomponente `PlainImageBackground` (reine
Showcase-Verdrahtung, keine neue globale Komponente) zeigt das unveränderte, scharfe Bild als
Hintergrund -- Einträge 2-5 (Glas-Chip, Scrim-Chip, Glas-Knopf, Abzeichen) nutzen sie jetzt in
Vorher UND Nachher, sodass nur noch der jeweils demonstrierte Chip-/Knopf-/Abzeichen-Effekt
selbst den Unterschied ausmacht. Eintrag 1 (demonstriert BannerSection selbst) unverändert.

## Änderungen

- `frontend/src/components/ui/Cluster.tsx`: neue Prop `pinLastChild?: boolean`, an denselben
  zwei Stellen platziert wie `growFirstChild` (Einzelstufen-Pfad, inneres Flex-Element des
  Zweistufen-Pfads) -- NICHT am äußeren Container-Query-Wrapper (`grep -c pinLastChild` → `4`,
  davon `0` im äußeren Wrapper).
- `frontend/src/components/ui/Cluster.module.css`: neue Regel
  `.clusterPinLastChild > :last-child { flex-shrink: 0; align-self: center; }`.
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx`: äußerer `Cluster` bekommt
  `growFirstChild pinLastChild`; Kommentar über `align="stretch"` um die neuen Props ergänzt.
- `frontend/src/components/fansubs/ReleasePreviewRow.module.css`: `.body`s Basisregel und der
  komplette `@media (min-width: 768px)`-Block (`.body`/`.action`) entfernt, durch kurze
  Verweis-Kommentare auf die jetzt verantwortlichen Cluster-Props ersetzt.
  `className={styles.body}`/`className={styles.action}` bleiben in `ReleasePreviewRow.tsx` als
  stylinglose Haken stehen (keine Testdatei angefasst).
- `frontend/src/components/showcases/EffectsShowcase.tsx`: neue lokale Komponente
  `PlainImageBackground` (reines `ResponsiveImage fill` + `.previewSlot`, beide CSS-Klassen
  bereits vorhanden, keine neue CSS-Regel). Einträge 2-5 wechseln `before`/`after` von
  `BannerSection` zu `PlainImageBackground`.
- `docs/FRONTEND_ARCHITEKTUR.md`: `pinLastChild` im bestehenden Cluster-Absatz dokumentiert.

## Live-Sichtprüfung

**Befund 1:**
- `/anime/8` (App, `http://127.0.0.1:3300/anime/8` über den Tunnel) Desktop 1440px, Episode
  aufgeklappt: Avatar+Textspalte links, "Zum Release →"-Button rechts auf eigener Höhe (44px,
  nicht auf die 3-zeilige Textspalte gestreckt) -- per Zoom-Ausschnitt nachgemessen.
- `/anime/13`, mehrere Fansub-Gruppen (Bloody-Shadow/LazySubs/MelonSubs): alle drei Release-Zeilen
  zeigen dieselbe korrekte Anordnung.
- `/anime/8` Mobil 390px: Avatar/Text oben, Button darunter auf voller Breite -- unverändert
  korrekt gestapelt.
- Storybook `http://127.0.0.1:6007/?path=/story/zusammengesetzte-bausteine-release-versionszeile--mit-gruppenlogo`:
  identisches Ergebnis (Button auf eigener Höhe, nicht gestreckt).
- Keine Browser-Konsolenfehler.

**Befund 2:**
- Storybook `http://127.0.0.1:6007/?path=/story/grundlagen-effekte--standard`, Desktop 1000px UND
  Mobil 390px: bei allen fünf Paaren zeigt die linke ("Ohne Effekt") Hälfte jetzt durchgehend das
  scharfe, farbige Originalbild; rechts ("Mit Effekt") ist nur noch der jeweils demonstrierte
  Effekt (Glas-Chip/Scrim-Chip/Glas-Knopf/Abzeichen) sichtbar unterschiedlich. Eintrag 1
  (Bannerbild-Hintergrund) weiterhin unverändert: scharf links, unscharf/abgedunkelt rechts.
- Keine Browser-Konsolenfehler.

## Verifikation

- `npx tsc --noEmit`: fehlerfrei.
- `npx eslint` auf allen geänderten `.tsx`-Dateien: keine Fehler (zwei erwartete Warnungen für die
  beiden `.module.css`-Dateien, da ESLint CSS-Module nicht prüft).
- Live-Browser-Sichtprüfung beider Befunde auf Desktop UND Mobil, App UND Storybook (siehe oben).

Keine Tests, Testsuiten oder Layout-Purity-Guard-Änderungen wurden hinzugefügt oder ausgeführt.

## Abweichungen

Keine gegenüber dem Plan.
