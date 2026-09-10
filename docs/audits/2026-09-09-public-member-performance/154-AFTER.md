# Phase 154 Nachmessung — Aggregator-Duplikate, Bildbudget, Viewer-Auflösung

10. September 2026 · /home/d1sk/team4s · Ausgangsstand `286b7fe2` (letzter Commit vor Phase 154),
gemessen gegen den vollständig gemergten Fünf-Plan-Stand (154-01 bis 154-05, `main`, Commit
`fdfc77da` zum Zeitpunkt dieser Messung) · team4s-linux, Docker Compose.

Dieses Dokument ist eine neue, eigenständige Datei in diesem Verzeichnis. `REPORT.md` und
`153-AFTER.md` bleiben byteidentisch (siehe „Validierung dieses Dokuments" unten).

---

## Vollständiges Verifikations-Gate (Task 1)

Alle Gate-Befehle aus `154-06-PLAN.md`'s `<interfaces>`-Block liefen in dieser Session, in dieser
Reihenfolge, auf dem laufenden `team4sv30-*`-Stack:

| Gate-Befehl | Ergebnis |
| --- | --- |
| `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm test"` | **Grün.** 295/296 Testdateien bestanden, 1 Skip (`VerifiedBadge.test.tsx`, vorbestehend — bereits als Skip in `153-AFTER.md` Zeile 211 dokumentiert). 2.275/2.278 Tests bestanden, 3 Todo. 0 Fehlschläge. |
| `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck"` | **Grün.** `tsc --noEmit`, exit 0, 0 Fehler. |
| `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run lint"` | **Exit 1, aber vollständig auf vorbestehende, phasenfremde Befunde zurückgeführt** (siehe D5-Abschnitt unten): 344 Probleme, 13 Errors, 331 Warnings — exakt deckungsgleich mit `153-AFTER.md`'s eigener Zeile 213-Messung derselben Zahlen. |
| `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine sh -c "go build ./... && go vet ./..."` | **Grün.** Exit 0, keine Ausgabe außer Modul-Downloads. |
| DSN-gated `TestPhase131PublicProfileQueryBudgetIsConstant` (`go test ./internal/repository/... -run 'Phase131' -count=1 -v`, `TEAM4S_PHASE131_TEST_DSN` live aus `docker compose exec team4sv30-backend printenv DATABASE_URL` abgeleitet, Datenbankname auf `team4s_phase131_test` getauscht) | **Grün, tatsächlich gelaufen, nicht übersprungen.** `--- PASS: TestPhase131PublicProfileQueryBudgetIsConstant (0.07s)`: „2 projects -> 16 queries; 6 projects -> 16 queries". |
| `docker compose build` | **Grün.** Exit 0, beide Images (`team4s-team4sv30-backend`, `team4s-team4sv30-frontend`) gebaut. |

### Ein roter Befund gefunden und in dieser Session behoben (nicht als vorbestehend etikettiert)

**`npm test` zeigte vor dem Fix einen einzelnen roten Testdatei-Befund:**
`src/lib/api.no-token-boundary.test.ts`, Testfall „keeps direct fetch outside the central client
limited to auth entrypoint, Keycloak, server routes, and public no-auth fetches". Dies ist der in
`deferred-items.md` bereits vollständig dokumentierte, während 154-04's Vollständigkeitslauf
gefundene Befund: 154-03 (Commit `9e0b4da9`, „give animated avatars a single, budgeted code path
(P154-07)") fügte in `frontend/src/components/profile/MemberProfileHero.tsx` einen rohen
`fetch(url, { headers: { Range: 'bytes=0-63' } })`-Aufruf für die animierte-WebP-Erkennungssonde
ein, ohne diese Datei auf die Allow-List des Boundary-Tests zu setzen.

**Root-Cause-Zuordnung (E4-Pflichtprüfung):** Per `git log -- frontend/src/components/profile/MemberProfileHero.tsx`
ist der letzte Autor dieser Zeile Commit `9e0b4da9` (154-03, innerhalb dieser Phase). Dies ist
**kein vorbestehender Befund** — er wurde von dieser Phase selbst eingeführt und darf laut der
verbindlichen Phasen-Disziplin (Lehre aus Phase 152) nicht als „pre-existing" bezeichnet werden.

**Fix (Commit `4aedbff4`, in diesem Plan):** `MemberProfileHero.tsx` zur
`publicNoAuthFetchAllowlist` des Boundary-Tests hinzugefügt, mit Begründungskommentar — die Sonde
liest ausschließlich dieselbe same-origin, bereits öffentliche `/media/profile/**`-Avatarquelle,
die das `<img>`-Element ohnehin lädt, trägt keine Credentials und betrifft keinen zentralen
Team4s-API-Endpunkt (T-154-B3-01). Gleiches Muster wie die bereits vorhandene
`MemberAvatarCard.tsx`-Allow-List-Zeile. Nach dem Fix: `npx vitest run
src/lib/api.no-token-boundary.test.ts` → 9/9 Tests grün; voller `npm test`-Lauf danach 295/296
Dateien grün (siehe Tabelle oben).

**Zusätzlich gefunden während desselben Gate-Laufs und ebenfalls in dieser Phase behoben (nicht
vorbestehend):** `npm run lint` zeigte zunächst 346 Probleme (333 Warnings) statt der in
`153-AFTER.md` zitierten 344/331-Baseline — ein +2-Delta. Root Cause: 154-03's Neufassung von
`ResponsiveImage.test.tsx` destrukturiert `onError` aus zwei Mock-Call-Snapshots absichtlich, um es
aus einem Vergleich auszuschließen (`_beforeOnError`/`_afterOnError`); dieses Repo hat kein
Underscore-Ignore-Muster für `@typescript-eslint/no-unused-vars` konfiguriert, daher erschienen
beide als neue Warnungen. **E4-Zuordnung:** `git log -- frontend/src/components/ui/ResponsiveImage.test.tsx`
zeigt denselben Commit `9e0b4da9` (154-03) als letzten Autor dieser Zeilen — innerhalb dieser
Phase, nicht vorbestehend. Fix (Commit `fdfc77da`, in diesem Plan): zwei gezielte
`eslint-disable-next-line`-Kommentare, keine Verhaltens- oder Assertion-Änderung. Nach dem Fix:
`npm run lint` → exakt 344 Probleme (13 Errors, 331 Warnings), deckungsgleich mit
`153-AFTER.md`'s Baseline.

**Beide Funde erfüllen damit die Task-1-Abnahmekriterien:** „every red result is either resolved or
cites a specific prior commit/phase as evidence of pre-existing status" — hier: resolved, mit
Commit-Zuordnung als Beleg, dass es sich NICHT um einen vorbestehenden Befund handelte.

---

## Vorher/Nachher: Query-Anzahl (RCA-05, Plan 154-01)

| Zustand | Query-Anzahl (Loader, konstant) | Beleg |
| --- | --- | --- |
| Vorher (Baseline `286b7fe2`, vor 154-01) | **20** (mit mindestens einem aktuellen Projekt), **19** (ohne aktuelles Projekt — kara-Muster, entfällt Versionsbatch-Query) | REPORT.md RCA-05: „timer/type 21 inklusive Zugriff, davon 20 GetPublicMemberProfileByID… kara 20 inklusive Zugriff, 19 im Loader"; 154-01-SUMMARY.md reproduzierte das Vorher-Verhalten separat gegen einen `git archive`-Checkout desselben Baseline-Commits: „2 projects -> 20 queries; 6 projects -> 20 queries" |
| Nachher (154-01, live in dieser Session erneut gemessen) | **16**, konstant unabhängig von der Projektanzahl (2 und 6 Projekte identisch geprüft) | Diese Session, live: `--- PASS: TestPhase131PublicProfileQueryBudgetIsConstant`, Log-Zeile: „PMPF-01 constant-budget gate: 2 projects -> 16 queries; 6 projects -> 16 queries" |
| Nachher, 0-Projekt-Fall (kara-Muster) | **Kein eigener automatisierter Guard-Testfall für 0 Projekte in `member_profile_query_budget_test.go`** — arithmetisch erwartet **15** (19 − 4), da die vier gehobenen Duplikat-Loader (`loadRoleVolumeCounts`, `loadContribProjectsCount`, `loadContribChronicleCount`, `loadContribArchivistCount`) laut Quelltext (`GetPublicMemberProfileByID`) unbedingt aufgerufen werden, unabhängig von der Projektanzahl | **Nicht live nachgemessen in dieser Session** — als arithmetische Ableitung ausgewiesen, nicht als gemessener Wert behauptet. Der Plan-Interfaces-Block selbst schreibt „20/19 -> 16/15", ohne dass ein solcher Testfall im Repo existiert; diese Diskrepanz wird hier offengelegt statt stillschweigend geglättet. |

**Bewiesen:** vier identische SQL-Duplikatpaare (Rollen-Volumen, Contribution-Projekte, Chronik,
Archivist) wurden entfernt; das Budget ist jetzt konstant bei 16 für jede getestete Projektanzahl
(N+1-frei erhalten). **Nicht bewiesen (nur abgeleitet):** der exakte 0-Projekt-Wert 15.

---

## Vorher/Nachher: Bildbudget (RCA-06, Pläne 154-02/154-03)

### Badge-Artwork-Bytetransfer unter `AUDIT_FAIL_BADGES=1`

| Profil | Vorher | Nachher (154-03, gemessen) | Nachher (diese Session, unabhängig re-gemessen gegen den vollständig gemergten 154-01..05-Stand) |
| --- | --- | --- | --- |
| `members/timer`, nur Badge-Artwork-Bytes | **9,49 MB** (REPORT.md RCA-06) / präziser: **9.032.573 Bytes** über 6 direkte Rohoriginal-Fetches (154-03-SUMMARY.md, in dieser Session gegen die damalige Vor-Task-1-Codebasis gemessen) | **0 Bytes** — alle `/_next/image?...member-achievement-badges...`-Requests bleiben blockiert; kein zweiter, unblockierter Anfragepfad existiert mehr (154-03-SUMMARY.md) | **0 Bytes**, live bestätigt: `grep 'member-achievement-badges'` über alle 53 Requests des `timer`-Laufs ergibt 0 Treffer |
| `members/kara`, nur Badge-Artwork-Bytes | **2,93 MB** (REPORT.md RCA-06) | Nicht mehr reproduzierbar über denselben Pfad — 154-02's Locked-Hero-Gate (siehe unten) hat den auslösenden 0-Projekt-Codepfad bereits vorher geschlossen; 154-03-SUMMARY.md misst für `kara` nur noch eine geringe Restveränderung (4.299.884 → 4.329.680 Bytes Gesamttransfer, keine Badge-Bytes) | **0 Badge-Artwork-Bytes**, live bestätigt: 11 Requests total für `kara`, kein Treffer für `member-achievement-badges` |
| `members/timer`, **Gesamt**-Transfer (alle Requests, nicht nur Badges) | — (nicht in REPORT.md als Gesamtwert unter `AUDIT_FAIL_BADGES=1` zitiert) | **5.207.533 Bytes** (154-03-SUMMARY.md, Task 1 + Task 2 kombiniert) | **5.210.606 Bytes**, diese Session, live gemessen nach Warm-up-Curl (Differenz zu 154-03's Wert: +3.073 Bytes, innerhalb der von REPORT.md selbst dokumentierten Lauf-zu-Lauf-Streuung) — **bestätigt, dass der Fix nach 154-04/154-05 nicht regressiert ist** |

### `kara`s Zero-Projekt Hero-Artwork-Transfer (RCA-06, `progress-first_contribution-motif.png` + `-frame.png`)

| Zustand | Wert | Beleg |
| --- | --- | --- |
| Vorher | **2.922.646 Bytes Quellbytes** (1.519.106 + 1.403.540, jeweils 1254² Pixel) über den ungegateten `first_contribution`-Hero, ausgelöst wenn `selectedStage ?? family.heroStage` bei 0 Projekten die noch nicht erreichte Stufe zeigt | REPORT.md RCA-06 |
| Nachher | **Locked-Hero, kein Bildrequest.** `AnimeProjectAchievementStage.tsx`'s Hero-Slot ist jetzt auf `currentCode` gegated (154-02), identisch zu den 3 Geschwister-Familien; bei 0 Projekten wird `LockedStageArtwork hero` gerendert statt der unearned Motiv/Rahmen-Kombination | 154-02-SUMMARY.md (Code + 94/94 Unit-Tests); **diese Session live bestätigt:** 0 Treffer für `first_contribution`/`motif`/`frame` in allen 11 Netzwerk-Requests des `kara`-Laufs; Playwright-Screenshot-Beweis (`scripts/shot.mjs`) zeigt sichtbaren Text „Noch nicht freigeschaltet" im Progress-Bereich, 14,95 % Nicht-Hintergrund-Pixel bei `scrollY=1300` — **exakt identisch zu `153-AFTER.md`'s eigenem `kara`-Wert (14,95 %)**, d. h. keine Layout-Regression durch diesen Fix |

---

## Animierter Avatar `w=160`-Transfer für `timer` (P154-07, Plan 154-03)

| Zustand | Wert | Mechanismus-Effekt |
| --- | --- | --- |
| Vorher | **412.249 Bytes** über `/_next/image?url=...&w=160&q=75` (REPORT.md RCA-06: „Optimizer liefert trotz w=160 unverkleinert, 412.249 Bytes Transfer") | GIF-only-Erkennung; animiertes WebP lief unerkannt durch den optimierten `<Image>`-Zweig |
| Nachher (154-03, gemessen) | **Identisch, 412.249 Bytes** — 154-03-SUMMARY.md dokumentiert dies ausdrücklich als „honest limitation, not a fix that isn't true": ein direkter `fetch()`-Vergleich gegen den Optimizer-Endpunkt und das Rohoriginal liefert in beiden Fällen `content-length: 411828` — Next.js' eigener Bildoptimierer umgeht die Größenänderung bei animierten Formaten unabhängig vom angeforderten `w=`, dokumentiertes Next.js-Verhalten, kein Bug dieser Codebasis | **Kein Byte-Rückgang.** Der Mechanismus (RIFF/ANIM-Client-Sonde, gefaltet in denselben bestehenden unoptimierten `<Image>`-Zweig, den GIF-Avatare bereits nutzen) liefert stattdessen: (1) einen einzigen, bewussten Codepfad statt einer stillen Fehlklassifikation, (2) Vermeidung des nutzlosen Optimizer-Roundtrips für ein Format, das ohnehin nie verkleinert wird, (3) ein korrektes `isAnimatedAvatar`-Signal für zukünftige Byte-Cap-Politik |
| Nachher (diese Session, live re-gemessen) | **412.249 Bytes** für den Optimizer-Request; ein zweiter Rohoriginal-Request (nach der Sonden-basierten Zweig-Umschaltung) transferierte 412.120 Bytes; ein dritter, identischer Request desselben URLs transferierte **0 Bytes** (Browser-Cache-Treffer, `Cache-Control: public, max-age=31536000, immutable`) | Bestätigt live sowohl den unveränderten Optimizer-Bytewert als auch die in `deferred-items.md` bereits vorhergesagte Cache-Wirkung bei Wiederholungsanfragen innerhalb derselben Sitzung |

**Kein Widerspruch zu REPORT.md's eigenem „kein Crash"-Befund.** Kein Dokument dieser Phase
behauptet, dass große Original-PNGs oder der animierte Avatar allgemein einen Crash verursachen.

---

## Cross-Referenz: D1 (RCA-07) und D2 (Listener-Restanstieg), Plan 154-05

Vollständig gemessen und dokumentiert in
[`154-D-MEASUREMENTS.md`](154-D-MEASUREMENTS.md) — hier nur zusammengefasst, keine
Zahlenwiederholung im Detail:

- **D1 (RCA-07):** die leeren React-Root-Commits vor dem ersten vollständig benannten Commit fielen
  von 1.664 (`timer`) / 257 (`kara`) auf **0** in zwei unabhängigen Läufen gegen den vollständig
  gemergten 154-01..04-Stand. Entscheidung: keine weitere Untersuchung erforderlich — das Symptom
  ist verschwunden, ohne dass dieses Phase-154-Fenster selbst eine Codeänderung dafür vorgenommen
  hätte (Ursache ist Phase 153's Importgraph-Verkleinerung).
- **D2 (Listener-Restanstieg):** unverändert bei rund 14,24 pro Zyklus (634 → 1.346 über 50 Zyklen)
  gegenüber `153-AFTER.md`'s Baseline von 14,3 pro Zyklus (634 → 1.350) — eine Differenz von
  −0,06/Zyklus, innerhalb der Messrauschen. `addEventListener`-Grep über alle 8 von Plänen
  154-01..04 berührten Dateien ergab 0 Treffer. **Dokumentierter Negativbefund:** kein zweiter
  Listener-Quelle in dieser Phase gefunden; der Phase-153-Restanstieg bleibt eine offene
  Beobachtung, weder verschlechtert noch behoben durch Phase 154 Wave 1.

---

## RCA-04 — ausdrücklich offen

**RCA-04 (gemeldeter Chrome-Tab-Absturz) bleibt offen und unreproduziert; kein Dokument dieser
Phase erklärt ihn als behoben.** Kein Plan in Phase 154 (154-01 bis 154-06) hat einen Reproduktionsversuch
für RCA-04 unternommen — das war laut `154-CONTEXT.md`/`154-USER-REQUEST.md` nie Teil dieses
Phasen-Scopes. REPORT.md's eigener Befund („Kein Tab-Crash, keine JS-Exception… Reines Scrollen im
frischen kontrollierten Tab crashte nicht") und dessen ausdrückliche Einschränkung („**P0: kein
bestätigter Crash/Endlosloop/OOM in der Messumgebung.** Nicht als erledigten Bug schließen.") bleiben
unverändert gültig und werden von keiner Zeile dieses Dokuments widerlegt oder als abgeschlossen
umdeklariert.

---

## Drei benannte, phasenfremde Befunde (D5, `<interfaces>`-Block)

Erneut geprüft in dieser Session unter den für diesen Plan verbindlichen Befehlen (`npm run
typecheck` = `tsc --noEmit`, `docker compose build`, `npm run lint`):

1. **`frontend/src/app/anime/page.tsx:18,56-58`** — `searchParams` weiterhin als Union aus
   Plain-Objekt und `Promise<...>` typisiert. Quelltext in dieser Session verifiziert: **unverändert**
   (Zeilen 18, 56–58 zeigen exakt das von `153-AFTER.md` beschriebene Muster).
   **Reproduktionsstatus: offene Diskrepanz, unverändert gegenüber `153-AFTER.md`.** Weder
   `npm run typecheck` (exit 0, 0 Fehler) noch `docker compose build` (exit 0, kein
   TypeScript-Fehler) lösten in dieser Session einen Fehler an dieser Stelle aus — dieselbe
   Abweichung von REPORT.md's ursprünglicher DEV-Typgenerierungs-Beobachtung, die bereits
   `153-AFTER.md` (Zeilen 149-159) dokumentiert hat. Nicht als behoben behauptet, nicht verändert,
   nicht neu erklärt — nur erneut bestätigt unter denselben verbindlichen Befehlen.
2. **`frontend/src/app/admin/anime/[id]/edit/page.tsx:26`** — exportiert weiterhin
   `formatEditLoadError` aus einer Page-Datei. Quelltext in dieser Session verifiziert:
   **unverändert** (Zeile 26, `export function formatEditLoadError`, weiterhin referenziert in
   Zeile 65). **Reproduktionsstatus: offene Diskrepanz, unverändert gegenüber `153-AFTER.md`.**
   `docker compose build` scheiterte in dieser Session NICHT an dieser Datei (exit 0) — dieselbe
   Abweichung wie in `153-AFTER.md` (Zeilen 160-168): REPORT.md's ursprünglicher Fehler stammte aus
   einem separaten isolierten Diagnose-Container, nicht aus `docker compose build`.
3. **ESLint: 13 Errors** — in dieser Session **exakt bestätigt reproduziert**: `npm run lint`
   zeigt (nach den beiden oben dokumentierten Deviation-Fixes) 344 Probleme, 13 Errors, 331
   Warnings, exit 1. Die 13 Fehlerdateien wurden einzeln aufgelistet und mit
   `153-AFTER.md`'s D5-Dateiliste verglichen: `capture-responsive.cjs`,
   `useEpisodeNeighborNavigation.ts`, `useReleaseVersionMedia.ts`, `GroupMemberFormModals.tsx`,
   `GroupRolesTab.tsx`, `AdminGroupsClient.tsx`, `RoleCapabilityDetail.tsx`,
   `CapabilityDetailRow.tsx`, `CapabilityHistoryPanel.tsx` — **byteidentische Dateiliste**, keine
   neue, keine fehlende. **E4-Zuordnung:** keine dieser 9 Dateien erscheint in den
   `key-files.modified`-Listen der Pläne 154-01 bis 154-05 (siehe deren SUMMARY-Frontmatter) —
   dieser Befund ist somit vor Phase 154 vorbestehend, zitiert bereits in `153-AFTER.md`
   (Phase 153, committed `592df665`ff.) und dort schon als „keiner von einem der sechs
   Phase-153-Pläne berührt" belegt. **Nicht behoben, nicht verändert, nur erneut zitiert mit
   Phasenverweis.**

**Zusammenfassung D5:** Punkt 3 ist reproduziert-und-bestätigt (mit Phase-153-Zitat als Beleg für
den vorbestehenden Status). Punkte 1 und 2 bleiben die bereits in `153-AFTER.md` dokumentierte
Mess-Diskrepanz — unter den für diesen Plan verbindlichen Befehlen nicht auslösbar, aber im
Quelltext weiterhin nachweislich vorhanden. Keiner der drei Befunde wird hier als behoben,
umgangen oder stillschweigend fallengelassen dargestellt.

---

## Kein Ladegeschwindigkeits-Versprechen

**Diese Phase beansprucht keine wahrnehmbare Seitenlade-Beschleunigung.** REPORT.md's eigene
Einordnung bleibt maßgeblich: „Im vorhandenen kleinen Datenbestand liegen die HTTP-Mediane aber
bei 4–6 ms." Die in diesem Dokument gemessenen Verbesserungen betreffen strukturelle Fixkosten
(Query-Duplikate, Byte-Budget-Obergrenzen bei Fehlerzuständen, Roundtrip-Reduktion für den
Edit-Link-Viewer) — keine davon ändert die bereits niedrigen HTTP-Mediane oder verspricht ein
schnelleres wahrgenommenes Laden der Seite unter normalen (nicht gedrosselten,
nicht fehlerinjizierten) Bedingungen. Die einzige Ausnahme mit tatsächlicher Bytereduktion im
Normalfall ist die Viewer-Endpunkt-Verkleinerung (2.738 → 56 Bytes für den Edit-Link-Konsumenten,
live in dieser Session bestätigt, siehe unten) — auch diese wird hier nicht als spürbare
Ladezeitverbesserung ausgegeben, sondern als Roundtrip-/Payload-Reduktion für einen einzelnen,
kleinen, angemeldeten Zusatzrequest.

---

## Ergänzend live bestätigt: RCA-08 Viewer-Endpunkt (Plan 154-04)

Diese Session, live gegen den laufenden Backend-Container (`http://192.168.235.196:18092`):

```
$ curl -s http://192.168.235.196:18092/api/v1/members/d1sk/viewer | wc -c
56
$ curl -s http://192.168.235.196:18092/api/v1/members/d1sk | wc -c
2738
$ curl -s -w "\nHTTP:%{http_code}\n" http://192.168.235.196:18092/api/v1/members/nonexistent-slug-xyz/viewer
{"error":{"message":"Profil nicht verfügbar"}}
HTTP:404
```

Deckungsgleich mit `154-04-SUMMARY.md`'s eigener Messung (98 % Payload-Reduktion für den
Edit-Link-Konsumenten, neutrale 404-Parität). Keine neue Behauptung — reine Reproduktion.

---

## Validierung dieses Dokuments

```
$ git diff --stat docs/audits/2026-09-09-public-member-performance/REPORT.md docs/audits/2026-09-09-public-member-performance/153-AFTER.md
```

liefert keine Ausgabe (0 Zeilen geändert) — beide Dateien bleiben byteidentisch zum committeten
Stand. Dieses Dokument (`154-AFTER.md`) ist eine neue, eigenständige Datei im selben Verzeichnis.

**Grenzen dieser Nachmessung:** ein einzelner Lauf je Skript/Route für die in dieser Session live
nachgemessenen Byte-/Request-Zahlen (kein Wiederholungs-Median wie REPORT.md's 126 Läufe); die
0-Projekt-Query-Zahl (15) ist arithmetisch abgeleitet, nicht live nachgemessen (siehe Query-Tabelle
oben); keine erneute Nutzer-Chrome-Messung für RCA-04; keine erneute isolierte
Produktions-Diagnosecontainer-Messung (nur `docker compose build`, wie von diesem Plan
vorgeschrieben). Alle in diesem Dokument als „diese Session, live" gekennzeichneten Zahlen wurden
tatsächlich in dieser Session gemessen, nicht aus vorherigen Plan-SUMMARYs unkritisch übernommen;
wo eine Zahl direkt aus einem vorherigen Plan-SUMMARY zitiert statt neu gemessen wird, ist das
explizit als Zitat gekennzeichnet.
