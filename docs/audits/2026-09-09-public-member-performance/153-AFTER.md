# Public Member: Nachmessung nach Phase 153 (D1)

10. September 2026 · /home/d1sk/team4s · Nach Commit `eb20fc76` (Plans 153-01 bis 153-06 gemergt,
153-07 Task 1 committed) · team4s-linux, Docker Compose. Sibling-Dokument zu
[REPORT.md](REPORT.md) — REPORT.md bleibt unverändert (siehe "Validierung dieses Dokuments"
unten).

**Zweck:** Diese Nachmessung wiederholt exakt die drei in REPORT.md/REPRODUCE.md benannten
Audit-Skripte unter denselben Bedingungen (1440×900, DPR 1, anonymer Kontext, Cold/Warm getrennt,
1,6 Mbit/s/CPU×4-Drosselung wo zutreffend) gegen den vollständig gemergten Sechs-Plan-Stand, um zu
belegen, ob die drei P1-Befunde (RCA-01, RCA-02, RCA-03) tatsächlich korrigiert sind, ohne die
originalen Zahlen zu überschreiben oder REPORT.md zu verändern.

Container-Hygiene (verbindlich laut Plan) wurde vor jedem Messlauf ausgeführt:
`docker restart team4sv30-frontend`, danach `curl` auf `/members/timer`, `/members/kara`,
`/fansubs/new-subs` zum Aufwärmen des Compiler-Caches.

---

## RCA-02 · Öffentlicher Importgraph (`audit-public-member-bundles.mjs`)

Befehl: `docker compose exec -T team4sv30-frontend node scripts/audit-public-member-bundles.mjs`
(liest `.next/dev/static/chunks/`, DEV-Kompilat, identisch zur Methode in REPORT.md's
Bundle-Nachweis-Abschnitt).

| Datei | Bytes roh (vorher → nachher) | Gzip (vorher → nachher) | Tiptap-Module | ProseMirror-Module | Editor-Module |
| --- | ---: | ---: | ---: | ---: | ---: |
| `app/members/[slug]/page.js` | 6.845.000 → **3.359.142** | 1.556.000 → **724.570** | 38 → **0** | 11 → **0** | 10 → **2** (9.678 Bytes) |
| `app/members/[slug]/not-found.js` | 7.045.000 → **1.257.791** | 1.600.000 → **309.906** | — → **0** | — → **0** | — → **0** |
| `app/fansubs/[slug]/page.js` (Gruppe, Kontrolle) | 2.635.000 → **2.634.784** | 558.000 → **557.963** | 0 → **0** | 0 → **0** | 2 → **2** (9.678 Bytes, unverändert) |

**Erfolgskriterium erfüllt: 0 Tiptap-/ProseMirror-Bytes in beiden öffentlichen DEV-Importgraphen**
(Member und Gruppe). Die verbleibenden 2 "editor"-Module/9.678 Bytes bei Member entsprechen exakt
dem direkten `RichTextRenderer`-Import (kein Barrel, kein Tiptap/ProseMirror) — derselbe Wert wie
die Gruppe vorher schon hatte, was belegt, dass Member jetzt denselben leichten Renderer-Pfad
nutzt wie die Gruppe.

Der Member-`page.js` schrumpfte um 3,486 MB roh / 831 kB gzip (−50,9 % roh / −53,4 % gzip); der
private `not-found.js` (RCA-02's zweiter Fund — die volle Owner-Vorschau im 404-Segment) schrumpfte
um 5,787 MB roh / 1,290 MB gzip (−82,1 % roh / −80,6 % gzip). Die Gruppen-`page.js` blieb
unverändert (Kontrollgruppe, wie erwartet — Gruppe importierte weder Barrel noch Vollvorschau).

**Produktions-Bytezahlen (353/1.155 kB Member vs. 187/632 kB Gruppe aus REPORT.md's isoliertem
Diagnose-Produktionsbuild) wurden in dieser Nachmessung NICHT erneut über denselben isolierten
Diagnose-Container reproduziert** — jener Container war eine Einweg-Diagnosekopie mit
`typescript.ignoreBuildErrors=true` (REPORT.md, Zeile 62/269, ausdrücklich "keine Release-Freigabe").
Stattdessen wurde `docker compose build` (der für diesen Plan verbindliche Produktionsgate,
siehe Regressions-/Build-Gate unten) genutzt — dieser baut denselben Code reibungslos ohne
`ignoreBuildErrors`, meldet aber aufgrund vollständig dynamischer (`ƒ`) Routen keine Next.js-eigene
First-Load-JS-Bytetabelle (die Next-Größentabelle erscheint nur bei statisch generierten
Routen). Eine erneute isolierte Produktionsdiagnose-Messung war nicht Teil der drei im Plan
genannten Skripte und wurde deshalb nicht durchgeführt; der DEV-Bytevergleich oben und der grüne
`docker compose build`-Lauf sind die für dieses Dokument gemessenen, belastbaren Zahlen.

---

## RCA-01 · DOM-/Listener-Retention (`audit-public-member-navigation-retention.mjs`)

Befehl: `docker compose exec -T -e AUDIT_LABEL=<label> -e AUDIT_CYCLES=<n> team4sv30-frontend node
scripts/audit-public-member-navigation-retention.mjs`

**12-Zyklen-Lauf** (`AUDIT_LABEL=153-07-after-cycles12 AUDIT_CYCLES=12`):
- Knoten: 1.185 (initial) → 1.432 (idle-5s final) — +247 gesamt, **+20,6/Zyklus**
- Listener: 634 (initial) → 818 (idle-5s final) — +184 gesamt, **+15,3/Zyklus**

**50-Zyklen-Lauf** (`AUDIT_LABEL=153-07-after-cycles50 AUDIT_CYCLES=50`):
- Knoten: 1.187 (initial) → 1.548 (idle-5s final) — +361 gesamt, **+7,2/Zyklus**
- Listener: 634 (initial) → 1.350 (idle-5s final) — +716 gesamt, **+14,3/Zyklus**

| Vergleich | Vorher (REPORT.md, RCA-01, 12 Zyklen, Produktion) | Nachher (dieser Lauf, 12 Zyklen, DEV) |
| --- | ---: | ---: |
| Knoten initial → nach 12 | 466 → 15.107 | 1.185 → 1.432 |
| Knoten/Zyklus | ~1.220 | **20,6** |
| Listener initial → nach 12 | 347 → 1.100 | 634 → 818 |
| Listener/Zyklus | ~62,75 | **15,3** |

Diese Nachmessung ist identisch mit den bereits in 153-01-SUMMARY.md dokumentierten Zahlen
(12-Zyklen: 1187→1434/634→818; 50-Zyklen: 1187→1548/634→1350 — die kleine Abweichung 1185 vs. 1187
initial liegt innerhalb der Messrauschbreite eines Cold-Starts) — die hier durchgeführte
Nachmessung gegen den vollständig gemergten Sechs-Plan-Stand (statt nur Plan 01 isoliert)
bestätigt, dass keiner der Plans 02–06 die Retentionskorrektur aus Plan 01 zurückgenommen hat.

Pro-Zyklus-Knotenwachstum ist **~59×–170× kleiner** als der Vorher-Wert (20,6/Zyklus und 7,2/Zyklus
gegenüber ~1.220/Zyklus); Pro-Zyklus-Listenerwachstum ist **~4,1×–4,4× kleiner** (15,3/Zyklus und
14,3/Zyklus gegenüber ~62,75/Zyklus). Ein kleiner linear aussehender Resttrend bleibt bestehen
(v. a. bei Listenern) — das wird hier ehrlich als deutlich kleineres, begrenztes Restwachstum
berichtet, nicht als vollständig behoben behauptet (siehe RCA-04-Status unten für die offene
Kausalitätsfrage zum gemeldeten Crash).

---

## RCA-03 · Sichtbarkeit vor Hydration (`audit-public-member-visibility.mjs`)

Befehl: `docker compose exec -T team4sv30-frontend node scripts/audit-public-member-visibility.mjs`,
verglichen gegen die committeten Baseline-Dateien `visibility-members-timer.json`,
`visibility-members-kara.json`, `visibility-fansubs-new-subs.json`.

| Route | Load-Dauer vorher (REPORT.md/Baseline-JSON) | Load-Dauer nachher (dieser Lauf) | Differenz |
| --- | ---: | ---: | ---: |
| `members/timer` | 36.908,6 ms (36,91 s) | **26.147,6 ms (26,15 s)** | −10.761 ms / **−29,2 %** |
| `members/kara` | 34.268,7 ms (34,27 s) | **23.367,9 ms (23,37 s)** | −10.901 ms / **−31,8 %** |
| `fansubs/new-subs` (Gruppe, Kontrolle) | 26.629,7 ms (26,63 s) | **26.603,7 ms (26,60 s)** | −26 ms / −0,1 % (unverändert, wie erwartet) |

**Skeleton-Overlay-Ereignisse:** Das Audit-Skript beobachtet
`[data-badge-skeleton],[class*="skeletonLayer"],[class*="projectSkeleton"]`-Elemente per
MutationObserver auf `data-visible`/`data-interaction-enabled`.

- **Vorher (Baseline-JSON):** Für `timer` drei benannte Panels (`Fansub-Projekte`,
  `Rollenfortschritt`, `Letzte Beiträge`) sichtbar mit Skeleton-Overlay bis 37.658/38.804/39.191 ms;
  für `kara` ein Panel (`Fortschritt`) bis 36.032,7 ms.
- **Nachher (dieser Lauf):** Die `panels`-Sample-Liste ist für alle drei Routen in jedem Sample
  **leer** — die vom Selektor gesuchten Skeleton-Overlay-DOM-Knoten für "Fansub-Projekte" und
  "Letzte Beiträge" existieren nach den Plänen 04/05/06 nicht mehr im DOM (nicht nur versteckt,
  sondern entfernt), konsistent mit deren committeten Änderungen ("remove initial-mount skeleton
  overlay" / "remove ... skeleton overlay" / "remove MemberBadgeChain carouselSkeleton overlay").
  Einzig verbleibendes `data-interaction-enabled`-Ereignis: `Rollenfortschritt`/`Fortschritt`
  (Badge-Ladder-Interaktionsfreigabe) bei 26.943,9 ms und 28.075,4 ms (timer) bzw. 25.134,7 ms
  (kara) — deutlich früher als vorher (37.658/38.804 ms bzw. 36.032,7 ms), aber weiterhin vorhanden,
  da dieser Mechanismus (Interaktionsfreigabe, nicht Sichtbarkeit) laut P153-09/Plan-06-Entscheidung
  bewusst unverändert bleibt (siehe Badge-Ladder-Scope-Abschnitt unten).

**Erfolgskriterium erfüllt:** Inhalt sichtbar deutlich früher (−29 % bis −32 % Ladezeit unter
identischer Drosselung), die beiden entfernten Skeleton-Overlays hinterlassen keine
Sichtbarkeits-Umschaltungen mehr, Gruppen-Kontrolle unverändert.

---

## RCA-04 — Status

**Der gemeldete Chrome-Tab-Absturz bleibt von dieser Phase unreproduziert und unbehoben.** Kein
Dokument dieser Phase behauptet, dass RCA-04 behoben oder abschließend erklärt wurde. REPORT.md
selbst konnte den Crash nicht reproduzieren und ordnete RCA-01/02/03 lediglich als "gemessene
Kandidatenpfade" ein, keine "zusammengelegte Crash-Erklärung" (REPORT.md, RCA-04). Diese Phase hat
RCA-01 (DOM-/Listener-Retention) und RCA-02 (Importgraph-Gewicht) und RCA-03
(Hydration-Sichtbarkeit) korrigiert und oben mit realen Zahlen belegt — das reduziert die
technische Kandidatenfläche für lange SPA-Sitzungen messbar, beweist aber nicht die Kausalität für
den konkreten, persönlich gemeldeten Crash. Eine Beobachtungsaufgabe für den Nutzer im eigenen
Chrome (Version/Zoom/GPU/angemeldeter Zustand, längere reale Sitzung) bleibt außerhalb dieser
Phase — kein Phasen-Liefergegenstand, sondern eine offene, dem Nutzer selbst überlassene
Nachbeobachtung.

---

## Pre-existing, phase-foreign defects (D5)

Die folgenden drei Befunde wurden diese Session erneut geprüft und **von keinem der sechs Phase-153-
Pläne verändert**:

1. **`frontend/src/app/anime/page.tsx:18,56-58`** — `searchParams` weiterhin als Union aus
   Plain-Objekt und `Promise<...>` typisiert (Quelltext verifiziert, unverändert). **Abweichung von
   der Zitat-Erwartung:** In dieser Session löste weder `npm run typecheck` (`tsc --noEmit`, exit 0,
   0 Fehler) noch `docker compose build` (exit 0, 0 Fehler im TypeScript-Schritt) einen Fehler an
   dieser Stelle aus — anders als REPORT.md's eigene Zeile 267 ("Gesamt-Typecheck scheitert...
   sichtbar in `.next/dev/types`"), die den Fehler über die DEV-Typgenerierung beobachtete, nicht
   über einen `tsc --noEmit`- oder `docker compose build`-Lauf. Diese Abweichung wird hier faktisch
   dokumentiert, nicht stillschweigend geglättet — der Quelltext trägt weiterhin exakt das von D5
   beschriebene Muster, aber die beiden für dieses Plan verbindlichen Befehle (`npm run typecheck`,
   `docker compose build`) reproduzieren den Fehler in dieser Session nicht. Nicht als behoben
   behauptet; nicht verändert.
2. **`frontend/src/app/admin/anime/[id]/edit/page.tsx:26`** — exportiert weiterhin
   `formatEditLoadError` (kein Component-/Metadata-Export) aus einer Page-Datei (Quelltext
   verifiziert, unverändert). **Dieselbe Abweichung wie oben:** `docker compose build` scheiterte in
   dieser Session NICHT an dieser Datei (exit 0), anders als REPORT.md Zeile 269 ("Regulärer
   isolierter HEAD-Produktionsbuild scheitert... an unzulässigem Page-Export
   formatEditLoadError"). REPORT.md's eigener Build lief über einen separaten isolierten
   Diagnose-Container (nicht `docker compose build`); dieser Plan verwendet ausschließlich
   `docker compose build` als verbindlichen Gate-Befehl, der diesen Fehler nicht auslöst. Nicht als
   behoben behauptet; nicht verändert.
3. **ESLint: 13 Errors** bestätigt exakt (`npm run lint`, diese Session: 344 Probleme, 13 Errors,
   331 Warnings — Warnungszahl 1 niedriger als REPORT.md's zitierte 332, keine neue/unerklärte
   Regel-Verletzung; alle 13 Errors liegen in phasenfremden Admin-Dateien —
   `useEpisodeNeighborNavigation.ts`, `useReleaseVersionMedia.ts`, `GroupMemberFormModals.tsx`,
   `GroupRolesTab.tsx`, `AdminGroupsClient.tsx`, `RoleCapabilityDetail.tsx`,
   `CapabilityDetailRow.tsx`, `CapabilityHistoryPanel.tsx`, `capture-responsive.cjs` — keine davon
   von einem der sechs Phase-153-Pläne berührt). Nicht behoben, nicht verändert, nur zitiert.

**Keiner der drei Befunde wurde in dieser Phase angefasst, umgangen oder "hilfsweise" behoben.**
Punkt 1 und 2 zeigen ein reales Mess-Delta zur ursprünglichen Charakterisierung (die
Originalmessung nutzte andere Werkzeuge — DEV-Typegenerierung bzw. einen isolierten
`ignoreBuildErrors`-Diagnosecontainer — als die in diesem Plan verbindlichen Befehle
`npm run typecheck`/`docker compose build`); das wird hier als Messbefund berichtet, nicht als
Befund-Widerlegung oder Fix-Behauptung.

---

## Badge-ladder scope (P153-09)

Bindende Entscheidung des Auftraggebers, wörtlich (aus 153-06-PLAN.md, vor Research/Pattern-Mapping
getroffen und nicht verhandelbar):

> "Das in RCA-03 gemessene Problem ist der Zeitpunkt der Sichtbarkeit, nicht der Umfang der
> Darstellung. Der gesperrte Ladder hat einen fachlichen Zweck — er zeigt neuen Mitgliedern, was
> überhaupt erreichbar ist — und wird deshalb nicht als Nebenwirkung einer Performancekorrektur
> gekürzt."

`kara`'s Badge-Bereich-DOM-Elementzahl (606 Elemente laut REPORT.md's Header-only-G-Kontrollmessung)
ist **absichtlich unverändert** — kein verpasstes Ziel. Diese Phase hat ausschließlich den
Sichtbarkeitszeitpunkt korrigiert (siehe RCA-03-Abschnitt oben: `data-interaction-enabled` feuert
jetzt bei 25.134,7 ms statt 36.032,7 ms für kara), nicht den Umfang des gerenderten Ladders. Der
volle gesperrte Badge-Katalog bleibt vollständig sichtbar/gerendert.

---

## Regressions-/Build-Gate (D1/P153-12, gemessen in 153-07 Task 1)

Vollständig dokumentiert im Commit-Text von `test(153-07): add publicImportGraph regression guard,
confirm full gate green`. Zusammenfassung mit realen Zahlen:

| Gate | Ergebnis |
| --- | --- |
| `npm test` (voller Vitest-Lauf, inkl. neuem `publicImportGraph.test.ts`) | 295/296 Dateien bestanden (1 Skip: `VerifiedBadge.test.tsx`, vorbestehend), 2.263/2.266 Tests bestanden (3 Todo), **0 Fehlschläge** |
| `npm run typecheck` (`tsc --noEmit`) | exit 0, **0 Fehler** |
| `npm run lint` | 344 Probleme (13 Errors, 331 Warnings), exit 1 — Errors decken sich exakt mit D5 (siehe oben); alle in phasenfremden Dateien |
| `docker compose build` (Host-Root) | exit 0, **0 Fehler**, beide Images gebaut |

`publicImportGraph.test.ts` sperrt die vier renderer-only-Konsumenten
(`MemberStorySection.tsx`, `MemberGroupsHistorySection.tsx`, `PublicNoteCard.tsx`,
`AnimeProjectNotesSection.tsx`) gegen einen erneuten Barrel-Import sowie `AchievementArtwork.tsx`
gegen die Wiedereinführung von `auto, ` in `sizes` — beide Prüfungen bestehen aktuell (5/5 Tests
grün).

---

## Validierung dieses Dokuments

```
$ git diff --stat docs/audits/2026-09-09-public-member-performance/REPORT.md
```

liefert keine Ausgabe (0 Zeilen geändert) — `REPORT.md` bleibt byteidentisch zum committeten Stand.
Dieses Dokument (`153-AFTER.md`) ist eine neue, eigenständige Datei im selben Verzeichnis.

Grenzen dieser Nachmessung: ein einzelner Lauf je Skript/Route (kein Wiederholungs-Median wie
REPORT.md's 126 Netzwerk-/Trace-Läufe); keine erneute isolierte Produktions-Diagnosecontainer-Messung
(siehe RCA-02-Abschnitt); keine erneute Backend-SQL-Nachmessung (RCA-05, außerhalb dieser Phase);
keine Nutzer-Chrome-Messung für RCA-04 (siehe RCA-04-Status). Alle hier berichteten Zahlen wurden in
dieser Session tatsächlich gemessen, nicht aus vorherigen Plan-SUMMARYs übernommen, mit Ausnahme des
RCA-01-Vorher-Vergleichswerts (REPORT.md) und des Hinweises auf 153-01-SUMMARY.md's bereits
dokumentierte, hier unabhängig reproduzierte Retentionszahlen.
