---
phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug
plan: 02
subsystem: ui
tags: [checkpoint, nextjs-image, fansubs]

# Dependency graph
requires: [190-01]
provides:
  - "User-confirmed D-a/D-o live verification on new-subs, strawhat-subs, dragon-subs (desktop 1440px + mobile 375px)"
  - "D-b decision: banner must render identically to the project page's banner (same effective size), root cause diagnosed and documented for Plan 190-04"
affects: [190-04]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "D-b resolved as a bug fix, not a new CSS value: FansubHeroSection.tsx's banner <ResponsiveImage> carries a stray sizes=\"1200px\" prop that HeroSection.tsx (project page) does not have. Because next.config.mjs's deviceSizes ladder is [640, 1080, 1480, 1920] (1200 is not a breakpoint), the browser selects the 1480w srcset candidate for a declared 1200px slot, computes an implied density of 1480/1200≈1.233, and the HTML srcset density-correction mechanism shrinks the image's effective intrinsic size by that same factor for CSS sizing purposes (measured 972.97x178.38 vs the raw decoded resource's real 1200x220) — independent of any max-height clamp or container width, which were already verified pixel-identical between the two pages (.heroFg: 1312px at 1440px viewport on both)."

requirements-completed: [D-p]

# Metrics
duration: ~25min (live checkpoint + root-cause investigation)
completed: 2026-10-21
---

# Phase 190 Plan 02: Blockierender Live-Checkpoint (D-p) — Entscheidung D-b Summary

**Nutzer hat D-a/D-o live bestätigt (Desktop 1440px + Mobil 375px, drei Bestandsgruppen); D-b ist als Bugfix statt als neuer CSS-Wert aufgelöst — die stray `sizes="1200px"`-Prop auf dem Gruppenseiten-Banner ist die Ursache, nicht die Container-Breite.**

## Live-Verifikation durch den Hauptagenten (vor der Nutzerfreigabe)

Vor der Präsentation an den Nutzer wurde das Ergebnis von Plan 190-01 selbst per Playwright im
`team4sv30-frontend`-Container geprüft (Container war bereits neu gestartet):

- `/fansubs/new-subs`, `/fansubs/strawhat-subs`, `/fansubs/dragon-subs` — je Desktop 1440px und
  Mobil 375px, alle sechs Renderings HTTP 200, **keine** JS-Console-Errors/Page-Errors.
- D-a visuell bestätigt: keine umrahmende Glas-Karte mehr auf allen drei Gruppen.
- D-o visuell bestätigt: Status erscheint nur noch einmal (Badge) — `dragon-subs` (aktiv) und
  `strawhat-subs` (aufgelöst) geprüft, keine doppelte Klartext-Zeile mehr.

## Nutzerfreigabe (Resume-Signal)

Nutzer hat D-a/D-o live bestätigt. **D-b-Entscheidung (wörtlich, paraphrasiert aus der
Nutzerantwort):**

> Banner der Gruppenseite soll GENAU wie auf der Projektseite wirken. Messung bei 1440px:
> Gruppenseite `/fansubs/new-subs` Banner-Bild 973×178 px, Projektseite
> `/fansubs/strawhat-subs/fansubprojekt/11eyes` 1080×200 px — die CSS-Höhenregel ist gleich, aber
> der Container der Gruppenseite ist schmaler, daher ca. 10% kleiner. Bitte Container-Breite/Aufbau
> des Banners an die Projektseite angleichen (gleiche Komponente/Styles teilen statt Werte zu
> kopieren), sodass bei 1440px ca. 1080×200 entsteht; auf Mobil gleiches Verhalten wie Projektseite.
> Selbst per Playwright bei 1440px und 375px nachmessen (`getBoundingClientRect` des Banner-Bilds
> auf beiden Seiten) und die Zahlen berichten.

## Root-Cause-Untersuchung (durchgeführt vor Weitergabe an Plan 190-04)

Der Nutzer-Hypothese (Container ist schmaler) wurde nachgegangen, per `getBoundingClientRect()`
auf beiden Seiten bei 1440px und 375px, direkt im Container via Playwright:

| Messung (1440px) | Gruppenseite `/fansubs/new-subs` | Projektseite `/fansubs/strawhat-subs/fansubprojekt/11eyes` |
|---|---|---|
| `.heroFg` Breite | 1312px | **1312px (identisch)** |
| `.heroBannerWrap` Breite | 1312px | 1312px (identisch) |
| Banner-`<img>` gerendert | **973.0 × 178.4 px** | **1080.3 × 200.0 px** |
| Rohe Bilddatei (dekodiert) | 1200 × 220 px (verifiziert: JPEG- und WebP-Variante direkt gefetcht) | 1480 × 274 px |

**Ergebnis: die Container-Breiten sind bei 1440px auf beiden Seiten byte-identisch (1312px) — die
Nutzer-Hypothese "Container ist schmaler" trifft nicht zu.** Die tatsächliche Ursache liegt nicht
im Layout/CSS-Container, sondern in der Bild-Komponenten-Konfiguration:

- `frontend/src/components/fansubs/FansubHeroSection.tsx` übergibt dem Banner-`<ResponsiveImage>`
  eine `sizes="1200px"`-Prop.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` (Projektseite) übergibt
  für sein Banner **keine** `sizes`-Prop.
- `next.config.mjs`s `images.deviceSizes` ist `[640, 1080, 1480, 1920]` — 1200 ist **kein**
  konfigurierter Breakpoint. Mit `sizes="1200px"` wählt der Browser daher den nächstgrößeren
  Kandidaten (`1480w`) aus dem von Next.js generierten `srcset`.
- Per HTML-Spezifikation wird bei breitenbasierten (`w`-Deskriptor) `srcset`-Kandidaten eine
  implizite Pixel-Dichte berechnet: `gewählte_Kandidatenbreite / sizes-Wert = 1480/1200 ≈ 1.233`.
  Diese Dichte-Korrektur verkleinert die vom Browser für CSS-Zwecke verwendete "natürliche" Bildgröße
  um exakt diesen Faktor — unabhängig vom `max-height`-Clamp: `1200px / 1.233 ≈ 973px`,
  `220px / 1.233 ≈ 178px`. Beide errechneten Werte stimmen mit den gemessenen Werten (973.0×178.4)
  bis auf Rundungsfehler exakt überein — rechnerisch bestätigt, kein Messfehler.
- Ohne `sizes`-Prop (Projektseite) generiert Next.js stattdessen ein dichte-basiertes `srcset`
  (`1x`/`2x`), das diese Fehlkorrektur nicht auslöst — die Projektseite skaliert ihr Bild daher
  korrekt proportional bis zum `max-height`-Clamp (1480/274-Seitenverhältnis bei Höhe 200px ergibt
  rechnerisch 1080.3px Breite — exakt die gemessenen 1080.3px).
- Dieselbe feste `sizes="1200px"` gilt unverändert auch auf Mobil (375px) — derselbe
  Verkleinerungsfaktor (~1.233) erklärt konsistent auch die dortige Abweichung (Gruppenseite
  279×51px vs. Projektseite 287×53px bei 375px, gleiche Verzerrungsrichtung).

## Entscheidung für Plan 190-04 (verbindlich, ersetzt den ursprünglichen D-b-Auftrag "Container
angleichen")

**Nicht** Container-Breite/-Aufbau ändern (bereits identisch). **Stattdessen:** die stray
`sizes="1200px"`-Prop aus dem Banner-`<ResponsiveImage>`-Aufruf in `FansubHeroSection.tsx`
entfernen, sodass der Aufruf exakt dem bereits korrekten Muster der Projektseite
(`HeroSection.tsx`, keine `sizes`-Prop) entspricht — „gleiche Komponente/Styles teilen statt Werte
zu kopieren" ist damit wörtlich erfüllt, kein neuer CSS-Wert wird erfunden. Erwartetes Ergebnis
nach der Änderung: Banner bei 1440px ca. 1090×200px (berechnet aus dem tatsächlichen
Seitenverhältnis 1200/220 der Gruppenbanner-Datei bei `max-height:200px` — nicht exakt 1080×200,
da das die Projektseite mit einer ANDEREN, eigenen Bilddatei mit leicht abweichendem
Seitenverhältnis 1480/274 ist; beide Seiten nutzen danach aber denselben, korrekten
Skalierungsmechanismus). Plan 190-04 Task 1 MUSS nach der Änderung erneut per Playwright
`getBoundingClientRect()` bei 1440px und 375px nachmessen und die Zahlen im 190-04-SUMMARY
dokumentieren, um zu bestätigen, dass die Diskrepanz tatsächlich behoben ist.

## Nächster Schritt

Checkpoint freigegeben. Wave 3 (190-03 bis 190-07) darf beginnen. Plan 190-04 übernimmt die obige
Entscheidung unverändert für Task 1 (ursprünglich "D-b: Banner-Höhe gemäss Plan-190-02-Entscheidung").

## Self-Check: PASSED

Keine Codeänderung in diesem Plan (reiner Checkpoint). Live-Verifikation vor und während des
Checkpoints durchgeführt und oben dokumentiert; Root-Cause-Messung rechnerisch gegengeprüft.

---
*Phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug*
*Completed: 2026-10-21*
