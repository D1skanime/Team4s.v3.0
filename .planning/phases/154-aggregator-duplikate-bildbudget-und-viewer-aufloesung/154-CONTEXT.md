# Phase 154: Public-Member-Profil: Aggregator-Duplikate, Bildbudget und Viewer-Auflösung — Context

**Gathered:** 2026-09-10
**Status:** Ready for planning
**Source:** 154-USER-REQUEST.md (verbindliche Auftragsquelle, vom Nutzer als Ersatz für eine interaktive discuss-phase-Sitzung bereitgestellt)

<domain>
## Phase Boundary

Phase 153 hat die drei P1-Befunde des Audits `docs/audits/2026-09-09-public-member-performance/REPORT.md`
geschlossen (RCA-01/02/03). Phase 154 schließt die verbliebenen P2/P3-Befunde (RCA-05, RCA-06,
RCA-08), misst RCA-07 nach der Graphverkleinerung erneut, untersucht den Listener-Rest aus Phase 153
mit offenem Ausgang, und schließt die aus Phase 153 offene Live-Verifikation (Owner-Ansicht eines
versteckten Profils) ab.

Fünf Workstreams:
- **A — Aggregator-Duplikate (RCA-05, P2):** vier doppelt geladene Faktenpaare im öffentlichen
  Profil-Loader beseitigen.
- **B — Locked-Artwork und Bildbudget (RCA-06, P2):** kein ungegatetes Hero-Artwork bei null
  Projekten; begrenzter Original-Fallback; Budget für animierte Avatare.
- **C — Viewer-Auflösung und Abbruchsignal (RCA-08, P3):** kein unnötiger Vollprofilabruf für den
  Edit-Link; AbortSignal-Kette vervollständigen.
- **D — Zwei Nachmessungen mit offenem Ausgang:** RCA-07 nachmessen; Listener-Rest aus Phase 153
  untersuchen. Negativbefund ist ein zulässiges Ergebnis für beide.
- **E — Verifikation und Abgrenzung:** Vorher/Nachher-Audit, volle Testsuiten, Produktionsbuild,
  RCA-04 bleibt offen, phasenfremde Altdefekte benannt, Owner-Live-Check als menschlicher
  Checkpoint.

**Explizit ausdrücklich KEIN Umsetzungsziel:** RCA-01/02/03 (in Phase 153 geschlossen), RCA-04
(unreproduzierter Chrome-Tab-Absturz), jede Art neuer Produktfunktion, jedes Beschleunigungsversprechen
für die Seitenanzeige.
</domain>

<decisions>
## Implementation Decisions

### Workstream A — Aggregator-Duplikate (P154-01 bis P154-04)
- Die vier Duplikatpaare — Rollen-Volumen (#4/#14), Contribution-Projekte (#5/#10), Chronik
  (#6/#11), Archivist (#7/#12) — werden request-lokal **einmal** geladen und mehrfach abgeleitet,
  statt zweimal geladen.
- Betroffene Loader-Aufrufe: `backend/internal/repository/member_profile_public_repository.go:116-159`
  (13 strikt sequenzielle Aufrufe), `member_profile_role_volume_repository.go:117`
  (`loadRoleVolumeBadges`), `member_profile_contribution_badges_repository.go:158`
  (`loadContributionBadges`), `member_profile_progress_repository.go:64` (`loadBadgeProgress`).
- Fachliche Trennung zwischen erworbenen Badges und Fortschritt bleibt erhalten — keine gemeinsame
  Monsterfunktion.
- **Ausdrücklich verboten:** blinde Parallelisierung aller Abfragen, ein kartesisch wachsender
  Gesamt-Join, spekulative Indexmigration (EXPLAIN zeigt keine Disk-Reads, keine fehlenden Indizes
  im vorhandenen Bestand).
- Ein Query-Budget-Test auf der vorhandenen Query-Counter-Infrastruktur sichert die neue Zahl ab;
  neuer Sollwert dokumentiert, explizit als Regressionsschutz beschriftet, nicht als
  Performancenachweis.
- Ausgelieferte DTOs und Sichtbarkeitsregeln bleiben unverändert; Public- und Owner-Antworten
  bleiben inhaltlich identisch zu vorher.

### Workstream B — Locked-Artwork und Bildbudget (P154-05 bis P154-07)
- `frontend/src/components/profile/AnimeProjectAchievementStage.tsx:27-29` wählt aktuell
  `selectedStage ?? family.heroStage` und löst das Artwork ohne earned/current-Gate auf. Ein Profil
  mit null Projekten (`kara`) lädt dadurch ungegatet die erste noch nicht erreichte
  Contribution-Stufe (`progress-first_contribution-motif.png`/`-frame.png`, zusammen 2.922.646 Bytes
  Quellgröße statt 34.736 Bytes normal ausgeliefert).
- Locked-Gating folgt dem **vorhandenen** Muster (`LockedStageArtwork` bzw. earned/current-Gates
  anderer Kategorien) — keine dritte Variante erfinden.
- `ResponsiveImage` (`frontend/src/components/ui/ResponsiveImage.tsx`) schaltet nach einem
  Optimizer-Fehler auf den Originalpfad um; bei blockiertem Optimizer beobachtet: 9,49 MB (timer)
  bzw. 2,93 MB (kara) statt 0,608/0,037 MB. Fallback muss über vorhandene, größenbegrenzte
  Medien-Derivate begrenzt werden — kein Retry-Loop, kein Geometriesprung, keine Layoutverschiebung.
- Animierte Avatare (Beispiel: `timer`, 540×260px, 26 Frames, 411.828 Bytes) werden vom Optimizer
  trotz `w=160` unverkleinert durchgereicht. Eigenes Budget für animierte Avatare einführen; der
  gewählte Weg muss begründet werden (z. B. Format-Policy, Frame-Reduktion, größenbasierter
  Passthrough-Grenzwert — Wahl liegt beim Planer/Executor, Begründung ist Pflicht).
- **Keine pauschale PNG-Crash-Zuschreibung** — der Bericht stellt ausdrücklich fest, dass die
  Baseline-Profile keine großen Original-PNGs laden und dass kein Crash auftrat.

### Workstream C — Viewer-Auflösung und Abbruchsignal (P154-08 bis P154-10)
- Der angemeldete Edit-Link löst aktuell einen zweiten vollständigen Profilabruf nur zur
  Viewer/Owner-Bestimmung aus. Viewer-Bedarf und Vollprofil-Bedarf werden passend getrennt, oder
  vorhandene Information wird weitergereicht.
- **Zwei Stellen sind zu erweitern, nicht nur zu verdrahten** (über den Bericht hinaus beim
  Anlegen der Phase verifiziert):
  1. `frontend/src/hooks/useCancellableSlugState.ts` erwartet
     `fetcher: (signal: AbortSignal) => Promise<T>` und ruft `fetcher(controller.signal)` auf.
  2. `frontend/src/lib/useMemberViewer.ts` übergibt aktuell `() => getMemberProfile(slug)` — das
     Signal wird ignoriert.
  3. `getMemberProfile` in `frontend/src/lib/api.ts:3178` nimmt **gar keinen** Signal-Parameter
     entgegen und reicht auch keinen an `apiClientFetch` weiter.
  - Ziel: `getMemberProfile` nimmt ein optionales `AbortSignal` entgegen und reicht es an
    `apiClientFetch` weiter; `useMemberViewer` übergibt das Hook-Signal.
- Die PMFE-10-Fail-closed-Invariant aus Phase 132 (dokumentiert in `useMemberViewer`: ein hängender
  oder veralteter Request darf **niemals** `resolved` melden; Owner-UI verlässt sich ausschließlich
  auf ein positives, schlüsselgleiches `resolved`) bleibt unangetastet. Die Memoisierung des
  Fetchers auf `slug` bleibt korrekt — keine Endlosschleife aus Selbstabbruch.
- Kein privater Datenzugriff, keine fälschliche Login-Anzeige, korrektes Verhalten bei fehlendem
  oder abgelaufenem Access Token mit gültigem Refresh Token.

### Workstream D — Nachmessungen mit offenem Ausgang (P154-11, P154-12)
- **D1 (RCA-07):** Nach der Graphverkleinerung aus Phase 153 erneut messen (1.664 leere
  React-Root-Commits bei `timer`, 257 bei `kara` vor dem ersten vollständigen Clientbaum, unter
  Produktionsdrosselung, war der Ausgangswert). Ergebnis dokumentieren. Nur bei rechtfertigenden
  Zahlen weiter untersuchen. Kein bewiesener Scroll-Crash, keine Zuschreibung an eine einzelne
  Framework-Funktion ohne Beleg.
- **D2 (Listener-Rest):** Nach dem Auto-Sizes-Fix aus Phase 153 bleibt ein Zuwachs von ca. 14–15
  Listenern pro Navigationszyklus (634 → 1.350 über 50 Zyklen), während DOM-Knoten um Faktor
  59–170 fielen. Untersuchen, ob eine zweite Listener-Quelle existiert, die der ursprüngliche
  Bericht dem Auto-Sizing zugeschrieben hat.
- **Ausdrücklich: Untersuchung mit offenem Ausgang, keine Behebungszusage.** Ein dokumentierter
  Negativbefund ("keine weitere Quelle gefunden") ist ein zulässiges und wertvolles Ergebnis für
  D1 und D2. Zeigt sich eine Ursache, deren Behebung den Rahmen dieser Phase sprengt, wird sie
  dokumentiert und als eigene Folgephase vorgeschlagen — nicht in diese Phase hineingezwängt.

### Workstream E — Verifikation und Abgrenzung (P154-13 bis P154-15)
- Vorher/Nachher-Vergleich mit den **committeten** Skripten (`frontend/scripts/audit-public-member-*.mjs`,
  `frontend/scripts/shot.mjs`) unter Berichtsbedingungen wiederverwenden, nicht neu schreiben.
  Ergebnisse als **neues** Auditdokument ablegen; `REPORT.md` und `153-AFTER.md` bleiben
  unverändert.
- Volle Frontend-Suite, Backend-Build und -Tests, Produktionsbuild ausschließlich über
  `docker compose build` (nicht `exec … npm run build`, das wegen eines verschmutzten
  `.next`-Volumes falsche Prerender-Fehler meldet).
- Backend-Tests laufen über einen `golang:1.25-alpine`-Container im Netz `team4s_default`; DSN aus
  der `DATABASE_URL` des Backend-Containers mit getauschtem Datenbanknamen (der
  `POSTGRES_PASSWORD`-Wert aus `.env` stimmt nicht).
- **Kein Test wird ohne Beleg als „vorbestehend" abgetan** (Lehre aus Phase 152). Nur namentlich
  benannte und zitierte Altdefekte gelten als solche. Bei rotem Test: prüfen, ob eine Änderung
  dieser Phase ihn verursacht hat.
- **RCA-04 bleibt offen.** Kein Dokument dieser Phase bezeichnet den gemeldeten Chrome-Tab-Absturz
  als behoben.
- Phasenfremde Altdefekte benennen und abgrenzen statt still mitverändern:
  `frontend/src/app/anime/page.tsx` (synchrones `searchParams` neben `Promise`),
  `frontend/src/app/admin/anime/[id]/edit/page.tsx` (unzulässiger Page-Export
  `formatEditLoadError`), sowie 13 ESLint-Errors und 331 Warnings. Phase 153 konnte zwei der drei
  unter den vorgeschriebenen Kommandos **nicht** reproduzieren — diese Diskrepanz klären oder
  erneut als offen dokumentieren, nicht stillschweigend übernehmen.
- **P154-15 (Owner-Live-Check) ist ein expliziter menschlicher Checkpoint, kein Agenten-Abnicken.**
  Zugang über den Tunnel `http://127.0.0.1:3300` (Secure Context für `crypto.subtle` nötig). Ein
  Agent darf diesen Punkt nicht selbst als erledigt markieren — der Plan muss ihn als
  Nutzer-Checkpoint mit expliziter Bestätigungsaufforderung modellieren.
- Visuelle Nachweise ausschließlich per Playwright im Container (`frontend/scripts/shot.mjs`). Das
  eingebettete Browser-Panel liefert nach jedem Scrollen weiße Screenshots trotz korrektem DOM —
  betrifft alle Seiten, ist kein Produktdefekt, und ist **kein** zulässiger Beleg für einen
  Darstellungsfehler.

### Betriebsrahmen (für alle Workstreams)
- Alles auf `/home/d1sk/team4s`, direkt auf `main`, keine Worktrees, keine Feature-Branches.
  Niemals `git stash` bei offenen Änderungen.
- Frontend-Verifikation im Container: `docker compose exec -T team4sv30-frontend sh -c "cd /app && ..."`.
  Auf dem Host keine `node_modules`.
- Neue Go-Routen erscheinen erst nach `docker compose up -d --build team4sv30-backend`.
- Globale UI-Primitives aus `@/components/ui` verbindlich, keine handgebauten nativen
  select/input/textarea/button. Globale Design-Tokens statt eigener CSS-Variablennamen. Korrekte
  Umlaute in deutschem UI-Text. Produktionscodedateien höchstens 450 Zeilen.

### Claude's Discretion
- Konkrete Implementierung der request-lokalen Einmal-Ladung in Workstream A (z. B. Struktur des
  gemeinsamen Zwischenergebnisses, das Rollen-Volumen/Contribution/Chronik/Archivist-Daten an beide
  Konsumenten reicht) — Planer/Executor entscheiden, solange DTOs/Sichtbarkeit unverändert bleiben
  und keine Monsterfunktion entsteht.
- Konkreter Mechanismus für das Bildbudget der animierten Avatare (B3) — muss nur begründet sein.
- Konkrete Methode zur Trennung von Viewer- und Vollprofilbedarf in Workstream C (getrennter
  schlanker Endpunkt vs. Informationsweitergabe) — Planer entscheidet nach Analyse der
  bestehenden Datenflüsse.
- Format und Tiefe der D1/D2-Nachmessungsdokumentation, solange Negativbefunde zulässig bleiben und
  keine unbelegte Zuschreibung erfolgt.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Faktenbasis (bindend, unverändert lassen)
- `docs/audits/2026-09-09-public-member-performance/REPORT.md` (Commit `592df665`) — Befunde
  RCA-05, RCA-06, RCA-07, RCA-08; explizite Nicht-Beweise beachten
- `docs/audits/2026-09-09-public-member-performance/153-AFTER.md` — Nachmessung nach Phase 153,
  offen gebliebene Punkte (Listener-Rest, Owner-Live-Check)
- `.planning/phases/154-aggregator-duplikate-bildbudget-und-viewer-aufloesung/154-USER-REQUEST.md`
  — verbindlicher Originalauftrag dieser Phase, Quelle dieses CONTEXT.md

### Backend (Workstream A)
- `backend/internal/repository/member_profile_public_repository.go` — Aggregator, Zeilen 116-159
- `backend/internal/repository/member_profile_role_volume_repository.go` — `loadRoleVolumeBadges`,
  Zeile 117
- `backend/internal/repository/member_profile_contribution_badges_repository.go` —
  `loadContributionBadges`, Zeile 158
- `backend/internal/repository/member_profile_progress_repository.go` — `loadBadgeProgress`,
  Zeile 64

### Frontend (Workstream B)
- `frontend/src/components/profile/AnimeProjectAchievementStage.tsx` — Zeilen 27-29
- `frontend/src/components/ui/ResponsiveImage.tsx` — Optimizer-Fallback-Verhalten
- Vorhandenes Locked-Gating-Muster (`LockedStageArtwork`, `AchievementArtwork`) — wiederverwenden,
  keine dritte Variante

### Frontend (Workstream C)
- `frontend/src/hooks/useCancellableSlugState.ts` — Fetcher-Signatur `(signal: AbortSignal) => Promise<T>`
- `frontend/src/lib/useMemberViewer.ts` — PMFE-10-Invariant, Fetcher-Übergabe
- `frontend/src/lib/api.ts` — `getMemberProfile`, Zeile 3178

### Messskripte (wiederverwenden, nicht neu schreiben)
- `frontend/scripts/audit-public-member-*.mjs`
- `frontend/scripts/shot.mjs`

### Projektregeln
- `CLAUDE.md` — Sprachqualität (Umlaute), globales Design-System, 450-Zeilen-Grenze, GSD-Workflow
  auf `main`

</canonical_refs>

<specifics>
## Specific Ideas

- Query-Budget-Test: neuer Sollwert für die Query-Anzahl im Public-Member-Loader, auf Basis der
  vorhandenen Query-Counter-Infrastruktur, explizit als Regressionsschutz beschriftet.
- Konkrete Messwerte aus dem Bericht (zur Referenz für die Nachmessung, nicht zum Kopieren in neue
  Erfolgsmeldungen ohne eigene Messung):
  - Aggregator: 20 SQL-Abfragen (19 ohne Projekt) + 1 Zugriffsabfrage, vier Duplikatpaare
  - `kara` (0 Projekte): 34.736 Bytes normal vs. 2.922.646 Bytes Quellgröße bei ungegatetem Hero
  - Blockierter Optimizer: 9,49 MB (timer) / 2,93 MB (kara) statt 0,608 / 0,037 MB
  - `timer`-Avatar: animiertes WebP 540×260px, 26 Frames, 411.828 Bytes; Optimizer liefert bei
    `w=160` unverkleinert 412.249 Bytes
  - RCA-07 Ausgangswert: 1.664 (timer) / 257 (kara) leere React-Root-Commits vor erstem
    vollständigen Clientbaum
  - Listener-Rest: 634 → 1.350 über 50 Navigationszyklen (~14-15/Zyklus), DOM-Knoten fielen um
    Faktor 59-170

</specifics>

<deferred>
## Deferred Ideas

- RCA-01/02/03 — in Phase 153 geschlossen, nicht erneut anfassen
- RCA-04 (Chrome-Tab-Absturz) — unreproduziert, ausdrücklich kein Umsetzungsziel dieser oder einer
  vorhersehbaren nächsten Phase, bis ein Reproduktionsschritt vorliegt
- Jede neue Produktfunktion
- Jedes Beschleunigungsversprechen für die Seitenanzeige (HTTP-Mediane bereits bei 4-6 ms)
- Falls Workstream D eine Ursache mit Behebungsbedarf jenseits dieser Phase findet: als eigene
  Folgephase vorschlagen, nicht hier umsetzen

</deferred>

<scope_fence>
## Scope Fence

**In scope:** P154-01 bis P154-15 wie in `154-USER-REQUEST.md` definiert (Requirements-Tabelle
unten). Gezielte Korrekturen an den benannten Stellen — kein Rewrite.

**Out of scope:** RCA-01/02/03, RCA-04, neue Produktfunktionen, Performance-Versprechen für die
Seitenanzeige, Behebung von in Workstream D entdeckten Ursachen jenseits des Phasenrahmens.

**Requirements (phasen-eigener Tracking-Namespace — nicht in `.planning/REQUIREMENTS.md`):**

| ID | Workstream | Anforderung |
|----|-----------|-------------|
| P154-01 | A1 | Vier Duplikatpaare beseitigt; Fakten request-lokal einmal geladen und mehrfach abgeleitet |
| P154-02 | A2, A3 | Fachliche Trennung Badges/Fortschritt erhalten; keine Monsterfunktion, keine Blind-Parallelisierung, kein kartesisch wachsender Join, keine spekulative Indexmigration |
| P154-03 | A4 | Query-Budget-Test auf vorhandener Counter-Infrastruktur; neuer Sollwert dokumentiert als Regressionsschutz |
| P154-04 | A5 | Ausgelieferte DTOs und Sichtbarkeitsregeln unverändert; Public- und Owner-Antworten inhaltlich identisch |
| P154-05 | B1 | Kein Projekt-Hero-Artwork bei null Projekten; Locked-Gating folgt vorhandenem Muster |
| P154-06 | B2, B4 | Original-Fallback begrenzt über vorhandene Medienstrukturen; kein Retry-Loop, kein Geometriesprung; keine pauschale PNG-Crash-Zuschreibung |
| P154-07 | B3 | Animierte Avatare mit eigenem Budget; unverkleinerter Optimizer-Durchlauf behandelt und begründet |
| P154-08 | C1 | Kein unnötiger Vollprofilabruf allein für den Edit-Link |
| P154-09 | C2 | `getMemberProfile` nimmt optionales `AbortSignal`, reicht es an `apiClientFetch` weiter; `useMemberViewer` übergibt Hook-Signal |
| P154-10 | C3, C4 | PMFE-10-Fail-closed-Invariant und Fetcher-Memoisierung unverändert; Auth-Refresh korrekt |
| P154-11 | D1 | RCA-07 nach Graphverkleinerung erneut gemessen und dokumentiert; keine Zuschreibung ohne Beleg |
| P154-12 | D2 | Listener-Rest aus Phase 153 untersucht; Ergebnis offen dokumentiert, Negativbefund zulässig |
| P154-13 | E1, E2, E3 | Vorher/Nachher-Messung als neues Auditdokument; volle Suiten, Backend-Tests im Go-Container, `docker compose build` PASS |
| P154-14 | E5, E8 | RCA-04 offen geführt; phasenfremde Altdefekte benannt und abgegrenzt |
| P154-15 | E6 | Owner-Ansicht eines versteckten Profils live als angemeldeter Eigentümer bestätigt (menschlicher Checkpoint) |

</scope_fence>

---

*Phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung*
*Context gathered: 2026-09-10 aus 154-USER-REQUEST.md (verbindliche Auftragsquelle, kein
interaktives discuss-phase nötig — der Nutzer hat die Entscheidungen bereits vollständig
schriftlich fixiert)*
