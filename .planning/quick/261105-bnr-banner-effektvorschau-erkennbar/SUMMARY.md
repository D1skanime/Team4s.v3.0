---
id: 261105-bnr-banner-effektvorschau-erkennbar
kind: quick
status: complete
completed_at: 2026-11-05
---

# Quick 261105-bnr: Banner-Effektvorschau wieder erkennbar gemacht

## Ergebnis

Codex-Review-Befund (Runde 1 von 1, `EffectsShowcase.tsx:107`) behoben. Der Befund war in der
Sache korrekt -- die "Mit Effekt"-Hälfte des Banner-Eintrags zeigte eine fast einfarbige, graubraune
Fläche statt eines erkennbaren Vorher/Nachher-Bildpaars. Eine Korrektur am Zahlendetail des
Befunds: Der behauptete `220px`-Rahmen ist tatsächlich `455px` breit (`.comparePane`s
`flex: 1 1 220px` wächst mit `flex-grow: 1` über die Basisbreite hinaus, live mit Playwright
nachgemessen) -- das ändert aber nichts an der Gültigkeit des Kernbefunds, das Ergebnis blieb auch
bei 455px unkenntlich.

**Zwei Ursachen, zwei Korrekturen, beide ausschließlich in `EffectsShowcase.tsx`:**

1. Die Rahmenbreite war ein Hebel (Rahmen zu schmal relativ zum festen Unschärferadius). Neues,
   lokales Feld `EffectEntry.layout?: 'row' | 'stacked'` (Standard `'row'`, unverändert für die
   vier übrigen Einträge); der Banner-Eintrag setzt `layout: 'stacked'` und rendert Vorher/Nachher
   jetzt untereinander auf voller Kartenbreite statt in geteilten Cluster-Spalten -- über `Stack`s
   bestehenden `align="stretch"`-Standard, ohne neue CSS-Regel.
2. Nach Umsetzung von (1) blieb das Ergebnis live in Storybook weiterhin fast einfarbig -- die
   eigentliche Ursache war das verwendete Fixture-Bild selbst: `FIXTURE_IMAGE` ist mit `400×578px`
   ein enges Hochformat-Coverbild (Gesichtsausschnitt, hautton-dominiert), das `object-fit: cover`
   im breiten/niedrigen Banner-Rahmen so stark hineinzoomt, dass kaum Farbvariation übrig bleibt --
   unabhängig von der Rahmenbreite. Neue, auf den Banner-Eintrag beschränkte Konstante
   `BANNER_FIXTURE_IMAGE` (`cover_1775164698913_...jpg`, dieselbe Datei, die
   `FansubHeroSection.stories.tsx` bereits als `banner_url`-Fixture für dieselbe Unschärfe/Scrim-
   Rezeptur nutzt, die `BannerSection`s Standardvariante laut deren eigenem Kommentar übernimmt) --
   ein bereits im Projekt etabliertes, farblich kontrastreiches Bannerfoto wiederverwendet statt neu
   erfunden. Die Einträge 2-5 (Chip/Knopf/Abzeichen) bleiben beim bisherigen `FIXTURE_IMAGE`, da
   dort unverändert scharf dargestellt (kein Blur-Problem).

## Änderungen

- `frontend/src/components/showcases/EffectsShowcase.tsx`:
  - Neue Konstanten `BANNER_FIXTURE_IMAGE`/`BANNER_FIXTURE_ALT`.
  - `EffectEntry` bekommt `layout?: 'row' | 'stacked'`.
  - Banner-Eintrag: `layout: 'stacked'`, Vorher/Nachher nutzen jetzt `BANNER_FIXTURE_IMAGE`.
  - Render-Schleife verzweigt je nach `entry.layout`: `'stacked'` → `Stack` (volle Breite,
    untereinander), sonst unverändert `Cluster`/`.comparePane` (nebeneinander).

## Live-Sichtprüfung

Storybook `http://127.0.0.1:6006/?path=/story/grundlagen-effekte--standard` (über den
SSH-Tunnel: `http://127.0.0.1:6007/...`), Playwright-Screenshots gegen den laufenden
`team4sv30-storybook`-Container:

- **Desktop (1000px Viewport):** Banner-Eintrag jetzt auf voller Kartenbreite (~760px) untereinander
  gestapelt. "Mit Effekt" zeigt deutlich unterscheidbare Farbregionen (orange/schwarz links, dunkles
  Blau rechts, als weiche, aber klar getrennte Farbflächen) statt der vorherigen einfarbigen Fläche.
- **Mobil (390px Viewport):** Banner-Eintrag gestapelt auf voller (schmalerer) Kartenbreite. "Mit
  Effekt" zeigt bei Nahaufnahme einen erkennbaren warmen Orange-Braun-Verlauf links zu dunklerem
  Kühlblau rechts -- subtiler als Desktop (schmalere absolute Breite bei gleichem Unschärferadius
  ist hier eine echte Geräte-Einschränkung, keine Showcase-spezifische Wahl), aber klar
  unterscheidbare Farbregionen statt einer einfarbigen Fläche.
- Zur Gegenprobe: `/anime/8` (echte Produktionsseite, `http://127.0.0.1:3300/anime/8` über den
  Tunnel) live angesehen -- derselbe Unschärfe/Scrim-Effekt zeigt dort bei echten Bannerbreiten
  (>1200px) klar erkennbare Figuren-Silhouetten, bestätigt die Ursachenanalyse (Fixture-Bild, nicht
  der Effekt selbst, war das Problem).
- Einträge 2-5 (Glas-Chip, Scrim-Chip, Glas-Knopf, Abzeichen) unverändert: weiterhin nebeneinander
  auf schmaler Rahmenbreite, unverändertes `FIXTURE_IMAGE`.
- Keine Browser-Konsolenfehler in allen geprüften Zuständen.

## Verifikation

- `npx tsc --noEmit`: fehlerfrei.
- `npx eslint src/components/showcases/EffectsShowcase.tsx`: keine Fehler.
- Live-Browser-Sichtprüfung Desktop UND Mobil in Storybook, zusätzliche Gegenprobe auf der echten
  Produktionsseite (siehe oben).

Keine Tests oder Testsuiten wurden hinzugefügt oder ausgeführt (bindende Vorgabe vor der
Live-Abnahme).

## Bekannte Einschränkung

`EffectsShowcase.test.tsx` enthält zwei Assertions, die durch diese Änderung absichtlich nicht
nachgezogen wurden (bindende Vorgabe: vor der Live-Abnahme keine Tests anfassen):

- `fixtureImages.length` wird nicht mehr `10` sein (Banner-Eintrag nutzt jetzt
  `BANNER_FIXTURE_ALT` statt `FIXTURE_ALT` für sein Vorher/Nachher-Paar, die beiden zählen nicht
  mehr zu den per `alt="Beispielbild für die Effekt-Vorschau"` gefundenen Bildern).
- Die Prüfung `src` enthalte `cover_1775167905284` gilt für den Banner-Eintrag nicht mehr (er nutzt
  jetzt `cover_1775164698913`).

Der nächste Volltest-Lauf nach der Live-Abnahme wird das aufzeigen; die Korrektur gehört dann in
einen eigenen Nachzieh-Schritt (Tests an die neue, absichtliche Zwei-Bild-Aufteilung anpassen), nicht
vorab.

## Abweichungen vom ursprünglichen Plan

Die ursprüngliche "Ursachenanalyse" im Plan ging davon aus, dass die Rahmenbreite der alleinige
Hebel sei (isolierter Vorher/Nachher-Test ohne den `.scrim`-Layer von `BannerSection`). Nach
Umsetzung der reinen Breitenänderung zeigte die Live-Prüfung in Storybook, dass das Ergebnis
weiterhin unkenntlich blieb -- der isolierte Test hatte den immer aktiven `.scrim`
(`rgba(23,21,19,0.45)`) nicht mitgetestet, und das verwendete Fixture-Bild erwies sich zusätzlich
als zu eng/hautton-dominiert für eine Banner-Breitenzuschneidung. Die Lösung wurde daraufhin um den
Fixture-Bild-Tausch (Punkt 2 oben) erweitert und PLAN.md entsprechend nachgezogen, bevor die
Umsetzung als abgeschlossen galt.
