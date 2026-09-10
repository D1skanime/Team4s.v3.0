# Public Member: Nachmessung D1/D2 nach Phase 154 Wave 1 (RCA-07, Listener-Rest)

10. September 2026 · `/home/d1sk/team4s` · nach Commit `2197789a` (Plans 154-01 bis 154-04 gemergt:
Aggregator-Duplikate beseitigt, Locked-Artwork-Gating, gebundener ResponsiveImage-Fallback,
Animated-Avatar-Budget, schlanker Viewer-Endpunkt mit AbortSignal-Kette) · team4s-linux, Docker
Compose. Sibling-Dokument zu [REPORT.md](REPORT.md) und [153-AFTER.md](153-AFTER.md) — beide
bleiben unverändert (siehe "Validierung dieses Dokuments" unten).

**Zweck:** Diese Phase (154, Plan 05) beantwortet zwei offene Nachmessfragen aus
`154-CONTEXT.md`/Workstream D mit **offenem Ausgang, keine Behebungszusage**:

- **D1 (RCA-07):** Rechtfertigen die leeren React-Root-Commits nach der Graphverkleinerung durch
  Phase 153 noch eine weitere Untersuchung?
- **D2 (Listener-Rest):** Existiert eine zweite Listener-Quelle jenseits des in Phase 153 bereits
  behobenen Auto-Sizing-Befunds — insbesondere eine, die diese Phase (154, Wave 1) selbst
  eingeführt haben könnte?

Ein dokumentierter Negativbefund ist für beide ein vollständig zulässiges Ergebnis.

Container-Hygiene (verbindlich) wurde vor jedem Messlauf ausgeführt: `docker restart
team4sv30-frontend`, danach `curl` auf `/members/timer`, `/members/kara`, `/fansubs/new-subs` zum
Aufwärmen des Compiler-Caches. Vor jedem Lauf wurde per `ps aux | grep chrom` auf verwaiste
Chromium-Prozesse geprüft — keine gefunden.

---

## Methodik-Hinweis (Abweichungspräzedenz)

`154-05-PLAN.md`'s `<interfaces>` verlangt, dieselbe Nachmessungsart zu verwenden, die
`153-AFTER.md` bereits etabliert hat (DEV-Container über `docker compose exec`, nicht der isolierte
Produktions-Diagnosecontainer aus `REPORT.md`), sofern kein konkreter Grund dagegenspricht. Diese
Nachmessung folgt dieser Präzedenz **unverändert**: beide Skripte liefen gegen den normalen
`team4sv30-frontend`-DEV-Container, exakt wie in `<interfaces>` vorgegeben. Kein Grund wurde
gefunden, den isolierten Produktions-Diagnosecontainer (mit `typescript.ignoreBuildErrors=true`,
laut REPORT.md "keine Release-Freigabe") erneut aufzusetzen — dieselbe Begründung wie in
153-AFTER.md's RCA-02-Abschnitt.

---

## D1 · RCA-07 · Leere React-Root-Commits (`audit-public-member-performance.mjs`)

**Befehl (exakt aus `<interfaces>`):**
```
docker exec -e AUDIT_LABEL=154-d1-after -e AUDIT_SLOW=1 -e AUDIT_CPU=4 \
  -e AUDIT_ROUTES=members/timer,members/kara -e AUDIT_BASE=http://127.0.0.1:3000 \
  team4sv30-frontend node scripts/audit-public-member-performance.mjs
```

Ausgewertet wurde `evidence.commits` aus den geschriebenen `/tmp/public-member-rca/<id>.json`-
Dateien: Anzahl führender Einträge mit `changed===0`, bevor der erste Eintrag mit besetztem `names`
folgt (exakt die im Plan vorgegebene Zählmethode).

**Zwei unabhängige Läufe** wurden durchgeführt (Label `154-d1-after` und `154-d1-after-run2`), um
das überraschend niedrige Ergebnis nicht auf Basis eines einzelnen Laufs zu behaupten:

| Route | Cache | Lauf 1: führende `changed===0` | Lauf 2: führende `changed===0` | Lauf 1: Gesamt-Commits | Lauf 2: Gesamt-Commits |
| --- | --- | ---: | ---: | ---: | ---: |
| `members/timer` | cold | **0** | **0** | 23 | 17 |
| `members/timer` | warm | **0** | **0** | 19 | 15 |
| `members/kara` | cold | **0** | **0** | 15 | 15 |
| `members/kara` | warm | **0** | **0** | 15 | 15 |

**Vorher/Nachher-Vergleich (REPORT.md, RCA-07-Abschnitt, Zeile 194):**

| Route | Vorher (REPORT.md, Produktions-Diagnosecontainer, `production-slow4g-cpu4`) | Nachher (dieser Lauf, DEV-Container, identische Slow-3G/CPU4×-Drosselung) | Delta |
| --- | ---: | ---: | ---: |
| `timer` | 1.664 | **0** (beide Läufe, cold+warm) | **−1.664** |
| `kara` | 257 | **0** (beide Läufe, cold+warm) | **−257** |

Die erste registrierte Commit-Zeile jedes Laufs trägt bereits echte, benannte Komponenten (z. B.
minifizierte Chunk-Loader-Namen wie `db`, `ev`, `di`), und spätestens der vierte Commit enthält den
vollständigen benannten Clientbaum (`Root`, `ServerRoot`, `AppRouter`, `AppShell`, `FocalCarousel`,
`LockedStageArtwork` usw. — stichprobenartig gegen das rohe JSON geprüft, siehe unten). Es gibt
keine lange Vorkette anonymer, leerer Commits mehr.

**Root-Cause-Einordnung (nur beobachtend, keine Zuschreibung):** REPORT.md hatte den exakten
Next-/React-Scheduling-Auslöser für die leeren Root-Commits bereits nicht bis auf eine einzelne
Frameworkfunktion belegt (RCA-07, Zeile 198: "Exakter Next-/React-Scheduling-Auslöser nicht bis
auf einzelne Frameworkfunktion bewiesen"). Diese Nachmessung bestätigt keine neue Kausalitätsaussage
— sie zeigt nur, dass das beobachtbare **Symptom** (viele leere Root-Commits vor dem ersten
vollständigen Baum) nach der Bundle-/Graphverkleinerung aus Phase 153 (Tiptap/ProseMirror-Entfernung,
`page.js` 6,845→3,359 MB, `not-found.js` 7,045→1,258 MB roh, siehe `153-AFTER.md`) nicht mehr
auftritt. Eine plausible, aber unbewiesene Erklärung: die leeren Commits entstanden vermutlich durch
Zwischen-Commits während des sequenziellen Ladens der (vor Phase 153 sehr großen) Chunk-Kette unter
Slow-3G/CPU4×-Drosselung — mit deutlich weniger Bytes/Chunks bleibt weniger Zeitfenster für
Zwischen-Commits vor dem vollständigen Baum. Diese Erklärung wird hier **nicht als bewiesen**
behauptet, nur als plausibler Zusammenhang mit der bereits dokumentierten Phase-153-Änderung
benannt; kein bewiesener Scroll-Crash, keine Zuschreibung an eine einzelne Framework-Funktion.

**Entscheidung D1: Keine weitere Untersuchung gerechtfertigt.** Der Ausgangswert (1.664 timer /
257 kara) ist auf 0 in beiden unabhängigen Läufen und beiden Cache-Zuständen (cold/warm) gefallen.
Es gibt kein verbleibendes Symptom, das eine Folgephase rechtfertigen würde — RCA-07 gilt als durch
die Phase-153-Graphverkleinerung bereits messbar aufgelöst, ohne dass diese Phase selbst etwas dafür
geändert hat (154-05 hat ausschließlich gemessen, keinen Code geändert).

---

## D2 · Listener-Rest aus Phase 153 (`audit-public-member-navigation-retention.mjs`)

**Befehl (exakt aus `<interfaces>`, 50 Zyklen, identisch zu 153-AFTER.md's eigener Methodik):**
```
docker compose exec -T -e AUDIT_LABEL=154-d2-cycles50 -e AUDIT_CYCLES=50 team4sv30-frontend \
  node scripts/audit-public-member-navigation-retention.mjs
```

**Ergebnis (Label `154-d2-cycles50`, `mode=member`, Standard-Navigationszyklus new-subs → timer/kara
→ new-subs):**

- Knoten: 1.187 (initial) → 1.542 (idle-5s final) — +355 gesamt, **+7,1/Zyklus**
- Listener: 634 (initial) → 1.346 (idle-5s final) — +712 gesamt, **+14,24/Zyklus**

| Vergleich | 153-AFTER.md (50 Zyklen, nach Phase 153, vor Phase 154) | Diese Nachmessung (50 Zyklen, nach Phase 154 Wave 1) | Delta |
| --- | ---: | ---: | ---: |
| Listener initial → final | 634 → 1.350 | 634 → **1.346** | −4 gesamt |
| Listener/Zyklus | 14,3 | **14,24** | −0,06/Zyklus |
| Knoten initial → final | 1.187 → 1.548 | 1.187 → **1.542** | −6 gesamt |
| Knoten/Zyklus | 7,2 | **7,1** | −0,1/Zyklus |

Die Zahlen liegen innerhalb der Messrauschbreite eines einzelnen Laufs (153-AFTER.md dokumentiert
selbst eine vergleichbare Abweichung zwischen zwei eigenen Läufen desselben Skripts, z. B.
1185 vs. 1187 initiale Knoten). Es gibt **keine erkennbare Verschlechterung und keine erkennbare
Verbesserung** durch die in Phase 154 Wave 1 gelandeten Änderungen (154-01 bis 154-04).

### Prüfung auf eine zweite Listener-Quelle aus dem eigenen Phase-154-Diff

Die Aufgabenstellung verlangt explizit, die von Plan 154-02 (Locked-Artwork-Gate) und Plan 154-03
(gebundener ResponsiveImage-Fallback, Animated-Avatar-Budget) geänderten Dateien auf neue
`addEventListener`-Aufrufe ohne passendes Cleanup zu prüfen. Zusätzlich wurden die Dateien aus
154-01 (Aggregator-Duplikate) und 154-04 (Viewer-Endpunkt/AbortSignal) einbezogen, da diese Phase
sich in Wave 2 auf "diese Phase" insgesamt bezieht, nicht nur auf B-Workstream-Dateien.

**Geprüfte, in Plänen 154-01 bis 154-04 geänderte Frontend-Dateien:**

```
frontend/src/components/profile/AnimeProjectAchievementStage.tsx   (154-02)
frontend/src/components/ui/ResponsiveImage.tsx                     (154-03)
frontend/src/components/ui/ResponsiveImage.test.tsx                (154-03, Test)
frontend/src/components/profile/MemberProfileHero.tsx              (154-03)
frontend/src/components/profile/MemberProfileHero.test.tsx         (154-03, Test)
frontend/src/app/members/[slug]/OwnProfileEditLink.tsx             (154-04)
frontend/src/lib/api.ts                                            (154-04)
frontend/src/lib/useMemberViewer.ts                                (154-04)
```

`grep -n "addEventListener" <jede Datei>` liefert **null Treffer** in allen acht Dateien. Die
einzige neue Nebenwirkung mit externem I/O ist `MemberProfileHero.tsx`'s animierter-WebP-Probe
(`isAnimatedWebpSource`, ein `fetch()`-Aufruf mit `Range`-Header, kein `addEventListener`), verpackt
in einem `useEffect` mit korrektem `cancelled`-Flag-Cleanup (Zeilen 172-185: `return () => { cancelled
= true }`) — dieselbe defensive Pattern-Wahl wie der Rest der Codebasis, kein Leck. Dieselbe Datei
verursachte bereits die in `deferred-items.md` dokumentierte Grenzverletzung des sanktionierten
API-Client-Boundary (154-04's Kontext bereits bekannt, siehe Phase-Kontext) — das betrifft aber die
API-Boundary-Regel, nicht Event-Listener-Retention, und ist außerhalb dieses Plans' Scope.

`backend/internal/handlers/app_public_profile.go` (154-04, neuer schlanker Viewer-Endpunkt) ist
serverseitiger Go-Code ohne Browser-`EventTarget`-Bezug und daher für diese Untersuchung nicht
relevant.

**Befund:** Keine zweite Listener-Quelle im eigenen Phase-154-Diff gefunden — weder textuell
(`grep addEventListener` über alle geänderten Dateien: 0 Treffer) noch messbar (Listener-Wachstum
pro Zyklus 14,24 gegenüber 153-AFTER.md's 14,3, eine Differenz von −0,06/Zyklus, die innerhalb der
Messrauschbreite liegt und keine neue Quelle noch eine Verbesserung an der bestehenden Quelle
belegt).

**Entscheidung D2: Keine weitere Listener-Quelle gefunden — dokumentierter Negativbefund.** Der in
Phase 153 verbliebene Listener-Zuwachs von ca. 14-15 pro Navigationszyklus bleibt nach Phase 154
Wave 1 im selben Rahmen bestehen (14,24 vs. 14,3 pro Zyklus). Weder wurde eine zweite Quelle jenseits
des bereits in Phase 153 behobenen Auto-Sizing-Befunds identifiziert, noch hat Phase 154 Wave 1
selbst eine neue Quelle eingeführt. Diese Beobachtung bleibt eine offene, mit echten Zahlen
belegte Restbeobachtung (wie schon in 153-AFTER.md formuliert), nicht als behoben oder als neu
verursacht markiert. Da keine root cause mit Behebungsbedarf identifiziert wurde, gibt es nichts als
Folgephase vorzuschlagen — sollte eine zukünftige, tiefere Instrumentierung (z. B. Listener-Typ-
Breakdown statt nur der Gesamtzahl aus `Memory.getDOMCounters().jsEventListeners`) eine konkrete
Quelle isolieren, wäre das ein neuer, eigenständiger Untersuchungsauftrag — kein bekannter,
bereits identifizierter Fix, der hier zurückgestellt würde.

---

## Rohbelege

- D1: `/tmp/public-member-rca/154-d1-after-members-{timer,kara}-0-{cold,warm}.json` und
  `154-d1-after-run2-members-{timer,kara}-0-{cold,warm}.json` (Container `team4sv30-frontend`,
  flüchtig — nicht Teil dieses Commits, analog zu REPORT.md's Zitierstil für Rohbelege-Labels ohne
  Volldateicommit).
- D2: `/tmp/public-member-rca/retention-154-d2-cycles50-member.json` (Container
  `team4sv30-frontend`, flüchtig, gleiche Konvention).

---

## Validierung dieses Dokuments

```
$ git diff --stat docs/audits/2026-09-09-public-member-performance/REPORT.md \
    docs/audits/2026-09-09-public-member-performance/153-AFTER.md
```

liefert keine Ausgabe (0 Zeilen geändert) — beide Dokumente bleiben byteidentisch zum committeten
Stand. Dieses Dokument (`154-D-MEASUREMENTS.md`) ist eine neue, eigenständige Datei im selben
Verzeichnis.

Grenzen dieser Nachmessung: D1 wurde mit zwei Läufen statt REPORT.md's 126-Lauf-Median wiederholt
(ausreichend, um den ungewöhnlich niedrigen Wert nicht auf Messrauschen eines Einzellaufs
zurückzuführen, aber kein vollständiger statistischer Median); D2 wurde mit einem Lauf durchgeführt
(identisch zu 153-AFTER.md's eigener Ein-Lauf-Methodik für denselben Test). Beide Messungen liefen
im DEV-Container, nicht im isolierten Produktions-Diagnosecontainer (siehe Methodik-Hinweis oben).
Diese Phase führte keine erneute Backend-SQL-Nachmessung durch (nicht Teil dieses Plans' Scope) und
keine Nutzer-Chrome-Messung für RCA-04 (weiterhin offen, unreproduziert, außerhalb dieser Phase).
