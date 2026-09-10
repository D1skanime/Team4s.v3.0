# Phase 154 — USER REQUEST (verbindlicher Originalauftrag)

Phase 154 – Public Member Profile: Aggregator-Duplikate, Bildbudget und Viewer-Auflösung

## Arbeitsumgebung

Diese Phase wird vollständig auf der Team4s-Linux-VM geplant und ausgeführt.

Verbindlich:

- Repository, GSD, Tests, Build und Agentenläufe auf Linux (`/home/d1sk/team4s`)
- Windows nur als Kommunikations-/Steuerungsoberfläche
- aktuellen `main`-Stand verwenden, keine Worktrees, keine Feature-Branches
- niemals `git stash` bei offenen Änderungen; Artefakte gezielt per Pfad committen
- bestehende funktionierende Architektur respektieren; die Phasen 150 bis 153 nicht durch
  parallele neue Lösungen umgehen

## Quelle des Auftrags

Verbindliche Faktenbasis sind zwei committete Dokumente:

- `docs/audits/2026-09-09-public-member-performance/REPORT.md` (Commit `592df665`) — die
  ursprüngliche Messreihe, Befunde RCA-05, RCA-06, RCA-07 und RCA-08
- `docs/audits/2026-09-09-public-member-performance/153-AFTER.md` — die Nachmessung nach Phase 153,
  inklusive der dort offen gebliebenen Punkte

Die Messskripte unter `frontend/scripts/audit-public-member-*.mjs` und
`frontend/scripts/shot.mjs` sind committet und für Vorher/Nachher-Vergleiche **wiederzuverwenden**,
nicht neu zu schreiben.

Beide Berichte sagen an mehreren Stellen ausdrücklich, was **nicht** bewiesen ist. Diese Grenzen
sind einzuhalten.

## Ziel

Phase 153 hat die drei P1-Befunde geschlossen. Phase 154 schließt die verbliebenen P2-Befunde und
misst die beiden Punkte nach, die erst jetzt sinnvoll messbar sind.

Kein Rewrite. Gezielte Korrektur an den benannten Stellen.

**Ehrlichkeit über den Nutzen:** Der Bericht ordnet RCA-05 ausdrücklich als „aktuell sekundär für
UX, strukturell wichtig für Last und Roundtrips" ein. Die HTTP-Mediane liegen im vorhandenen
Datenbestand bei 4 bis 6 ms. Diese Phase darf deshalb **keine** spürbare Beschleunigung der
Seitenanzeige versprechen. Sie beseitigt strukturelle Redundanz und bereitet größere Datenmengen
vor.

## Workstream A — Sequenzieller Aggregator und vier redundante Faktenabfragen (RCA-05, P2)

**Belegter Befund:** Der öffentliche Profil-Loader führt 20 SQL-Abfragen aus (19 ohne Projekt),
plus eine Zugriffsabfrage. Vier Paare laden identische Fakten doppelt: Rollen-Volumen (#4/#14),
Contribution-Projekte (#5/#10), Chronik (#6/#11) und Archivist (#7/#12). Erworbene Badges und
Progress laden dieselben Fakten getrennt.

**Codestellen, beim Anlegen der Phase verifiziert:**

- `backend/internal/repository/member_profile_public_repository.go:116-159` — dreizehn strikt
  sequenzielle Loader-Aufrufe mit jeweils eigenem Fehler-Check
- `backend/internal/repository/member_profile_role_volume_repository.go:117` — `loadRoleVolumeBadges`
- `backend/internal/repository/member_profile_contribution_badges_repository.go:158` — `loadContributionBadges`
- `backend/internal/repository/member_profile_progress_repository.go:64` — `loadBadgeProgress`

**Anforderung:**

- A1: Die vier Duplikatpaare sind beseitigt. Die betroffenen Fakten werden request-lokal **einmal**
  geladen und mehrfach abgeleitet.
- A2: Die fachliche Trennung zwischen erworbenen Badges und Fortschritt bleibt erhalten. Es
  entsteht **keine** gemeinsame Monsterfunktion, die beide Zuständigkeiten vermischt.
- A3: **Ausdrücklich verboten**, weil der Bericht es benennt: nicht blind alle Abfragen
  parallelisieren, und nicht alles in einen Join pressen, der kartesisch wächst. Ebenso keine
  spekulative Indexmigration — die EXPLAIN-Pläne zeigen im vorhandenen Bestand keine Disk-Reads
  und keine fehlenden Indizes.
- A4: Ein Query-Budget-Test auf Basis der vorhandenen Query-Counter-Infrastruktur sichert die neue
  Zahl ab. Der Sollwert wird dokumentiert. Ein konstanter Testwert ist Regressionsschutz, **kein**
  allgemeiner Performancenachweis — so ist er auch zu beschriften.
- A5: Die ausgelieferten DTOs und die Sichtbarkeitsregeln sind unverändert. Public- und
  Owner-Antworten bleiben inhaltlich identisch zu vorher.

**Erfolgskriterium:** Vier Duplikatpaare nachweislich entfernt, Query-Zahl vorher/nachher
dokumentiert, identische DTOs, Query-Budget-Test grün.

## Workstream B — Locked-Artwork und schwerer Bild-Fallback (RCA-06, P2)

**Belegter Befund:** `AnimeProjectAchievementStage` wählt `selectedStage ?? family.heroStage` und
löst das Artwork ohne earned/current-Gate auf. Ein Profil mit null Projekten (`kara`) lädt dadurch
die erste noch nicht erreichte Contribution-Stufe als Hero: `progress-first_contribution-motif.png`
und `-frame.png`. Normal ausgeliefert sind das zusammen 34.736 Bytes WebP — die Quellen sind
jedoch 1.519.106 + 1.403.540 = 2.922.646 Bytes bei jeweils 1254² Pixeln.

`ResponsiveImage` schaltet nach einem Optimizer-Fehler einmal auf denselben Originalpfad um. Bei
gezielt blockiertem Optimizer stieg der Bildtransfer auf 9,49 MB (timer) und 2,93 MB (kara) statt
0,608 bzw. 0,037 MB. Kein Crash, kein unbegrenzter Retry.

Der Avatar von `timer` ist ein animiertes WebP mit 540 × 260 Pixeln und 26 Frames, 411.828 Bytes.
Der Optimizer liefert trotz `w=160` unverkleinert 412.249 Bytes aus.

**Codestellen:** `frontend/src/components/profile/AnimeProjectAchievementStage.tsx:27-29`,
`frontend/src/components/ui/ResponsiveImage.tsx`.

**Anforderung:**

- B1: Kein Projekt-Hero-Artwork bei null Projekten. Das Locked-Gating folgt dem Muster, das die
  anderen Kategorien bereits verwenden (`LockedStageArtwork` bzw. earned/current-Gates) — keine
  dritte Variante erfinden.
- B2: Der Original-Fallback wird begrenzt. Vorbereitete, größenbegrenzte Derivate über die
  vorhandenen Medienstrukturen nutzen, statt bei einem Optimizer-Fehler mehrere Megabyte
  Originalbytes auszuliefern. Kein Retry-Loop, kein Geometriesprung, keine Layoutverschiebung.
- B3: Animierte Avatare bekommen ein eigenes Budget. Dass der Optimizer ein animiertes WebP
  unverkleinert durchreicht, ist zu behandeln — welcher Weg gewählt wird, ist zu begründen.
- B4: **Keine pauschale PNG-Crash-Zuschreibung.** Der Bericht stellt ausdrücklich fest, dass die
  Baseline-Profile keine großen Original-PNGs laden und dass kein Crash auftrat.

**Erfolgskriterium:** `kara` lädt beide `first_contribution`-Requests nicht mehr; bei absichtlich
defektem Optimizer entsteht keine Multi-Megabyte-Lawine, kein Retry-Loop und kein Layoutsprung;
Bildvarianten und Schärfe belegt.

## Workstream C — Viewer-Auflösung und Abbruchsignal (RCA-08, P3)

**Belegter Befund:** Der angemeldete Edit-Link lädt nach der Session-Initialisierung nochmals das
vollständige Profil, nur um Viewer- und Owner-Information zu bestimmen. Für die private
Vollvorschau ist das nachvollziehbar, für einen kleinen Edit-Link zu breit.

**Codestellen und Befund über den Bericht hinaus, beim Anlegen verifiziert:**
`frontend/src/hooks/useCancellableSlugState.ts` erwartet `fetcher: (signal: AbortSignal) => Promise<T>`
und ruft `fetcher(controller.signal)` auf. `frontend/src/lib/useMemberViewer.ts` übergibt jedoch
`() => getMemberProfile(slug)` und ignoriert das Signal. Der Bericht spricht von „vorhandenes
API-Abbruchsignal durchreichen" — tatsächlich nimmt `getMemberProfile` in
`frontend/src/lib/api.ts:3178` **gar keinen** Signal-Parameter entgegen und reicht auch keinen an
`apiClientFetch` weiter. Die Kette ist deshalb an **zwei** Stellen zu erweitern, nicht an einer.

**Anforderung:**

- C1: Viewer-Bedarf und Vollprofil-Bedarf werden passend getrennt, oder vorhandene Information wird
  weitergereicht, statt ein zweites vollständiges Profil zu laden.
- C2: Das Abbruchsignal wird durchgereicht: `getMemberProfile` nimmt ein optionales `AbortSignal`
  entgegen und gibt es an `apiClientFetch` weiter; `useMemberViewer` übergibt das Signal des Hooks.
- C3: Die Fail-closed-Semantik aus Phase 132 bleibt unangetastet. Der in `useMemberViewer`
  dokumentierte PMFE-10-Invariant — ein hängender oder veralteter Request darf **niemals**
  `resolved` melden und Owner-UI muss sich ausschließlich auf ein positives, schlüsselgleiches
  `resolved` verlassen — gilt unverändert. Ebenso bleibt die Memoisierung des Fetchers auf `slug`
  korrekt, damit keine Endlosschleife aus Selbstabbruch entsteht.
- C4: Keine private Datenfreigabe, keine fälschliche Login-Anzeige, korrektes Verhalten bei
  fehlendem oder abgelaufenem Access Token mit gültigem Refresh Token.

**Erfolgskriterium:** Kein unnötiger Vollprofilabruf für den Edit-Link; Abbruchsignal wirksam
durchgereicht; Auth-Refresh und Fail-closed-Verhalten unverändert und getestet.

## Workstream D — Zwei Nachmessungen, die erst jetzt möglich sind

- D1: **RCA-07 erneut messen.** Der Bericht dokumentiert 1.664 leere React-Root-Commits bei `timer`
  und 257 bei `kara` vor dem ersten vollständigen Clientbaum, unter Produktionsdrosselung. Er hält
  ausdrücklich fest, dass eine erneute Messung erst **nach** der Graphverkleinerung sinnvoll ist —
  die hat Phase 153 geliefert. Messen, Ergebnis dokumentieren, und nur dann weiter untersuchen,
  wenn die Zahlen es rechtfertigen. Kein bewiesener Scroll-Crash, keine Zuschreibung an eine
  einzelne Framework-Funktion ohne Beleg.
- D2: **Dem Listener-Rest aus Phase 153 nachgehen.** Nach dem Auto-Sizes-Fix bleibt ein Zuwachs von
  rund 14 bis 15 Listenern pro Navigationszyklus (634 auf 1.350 über 50 Zyklen), während die
  DOM-Knoten um Faktor 59 bis 170 fielen. Untersuchen, ob eine zweite Quelle existiert, die der
  ursprüngliche Bericht dem Auto-Sizing zugeschrieben hat. Ergebnis offen dokumentieren — auch ein
  „keine weitere Quelle gefunden" ist ein zulässiges und wertvolles Ergebnis.

Dieser Workstream ist **Untersuchung mit offenem Ausgang**, keine Zusage einer Behebung. Falls sich
eine Ursache zeigt, deren Behebung den Rahmen sprengt, wird sie dokumentiert und für eine eigene
Phase vorgeschlagen.

## Workstream E — Verifikation und Abgrenzung

- E1: Vorher/Nachher-Vergleich mit den committeten Skripten unter Berichtsbedingungen. Ergebnisse
  als **neues** Auditdokument ablegen; `REPORT.md` und `153-AFTER.md` bleiben unverändert.
- E2: Volle Frontend-Suite, Backend-Build und -Tests, Produktionsbuild über `docker compose build`
  — nicht über `exec … npm run build`, das wegen eines verschmutzten `.next`-Volumes falsche
  Prerender-Fehler meldet.
- E3: Backend-Tests laufen über einen `golang:1.25-alpine`-Container im Netz `team4s_default`; der
  DSN kommt aus der `DATABASE_URL` des Backend-Containers mit getauschtem Datenbanknamen. Der Wert
  aus `.env` für `POSTGRES_PASSWORD` stimmt nicht.
- E4: **Kein Test wird ohne Beleg als „vorbestehend" abgetan.** Nur namentlich benannte und
  zitierte Altdefekte gelten als solche. Wenn ein Test rot ist, ist zu prüfen, ob eine Änderung
  dieser Phase ihn verursacht hat.
- E5: **RCA-04 bleibt offen.** Der gemeldete Chrome-Tab-Absturz ist unreproduziert und kein
  Umsetzungsziel. Kein Dokument dieser Phase bezeichnet ihn als behoben.
- E6: Aus Phase 153 offen und hier zu erledigen: die **Owner-Ansicht eines versteckten Profils**
  wurde nie live bestätigt. Da Workstream C genau diesen Pfad anfasst, ist eine Live-Prüfung als
  angemeldeter Eigentümer Teil dieser Phase. Der Zugang läuft über den Tunnel
  `http://127.0.0.1:3300`, weil `crypto.subtle` einen Secure Context benötigt.
- E7: **Visuelle Nachweise nur per Playwright im Container** (`frontend/scripts/shot.mjs`). Das in
  Claude Code eingebettete Browser-Panel liefert nach jedem Scrollen weiße Screenshots, obwohl der
  DOM korrekten Inhalt meldet; das betrifft alle Seiten und ist kein Produktdefekt. Ein weißer
  Panel-Screenshot ist **kein** zulässiger Beleg für einen Darstellungsfehler.
- E8: Bestehende, phasenfremde Defekte werden benannt und abgegrenzt statt still mitverändert:
  `frontend/src/app/anime/page.tsx` (synchrones `searchParams` neben `Promise`),
  `frontend/src/app/admin/anime/[id]/edit/page.tsx` (unzulässiger Page-Export `formatEditLoadError`)
  sowie 13 ESLint-Errors und 331 Warnings. Zu beachten: Phase 153 konnte zwei dieser drei unter den
  vorgeschriebenen Kommandos **nicht** reproduzieren. Diese Diskrepanz ist zu klären oder erneut
  als offen zu dokumentieren, nicht stillschweigend zu übernehmen.

## Grundprinzipien

### Keine neue Parallelarchitektur

Wo Team4s bereits eine gemeinsame Lösung besitzt, wird sie wiederverwendet — insbesondere
`LockedStageArtwork`, `AchievementArtwork`, `ResponsiveImage`, `useCancellableSlugState` und die
vorhandenen Medienstrukturen.

### Globales Design-System ist Pflicht

Jede user-facing UI nutzt die Primitives aus `@/components/ui`. Handgebaute native `select`,
`input`, `textarea` oder `button` sind verboten. Lokale Dateikonsistenz rechtfertigt kein Abweichen.

### Design-Tokens

UI-CSS nutzt die globalen Tokens (`--surface-canvas`, `--surface-card`, `--surface-sunken`,
`--text-primary`, `--text-muted`, `--color-border`, `--accent-primary`, `--accent-deep`,
`--shadow-*`). Keine eigenen CSS-Variablennamen erfinden.

### Sprachqualität

Deutscher UI-Text verwendet korrekte Umlaute (ä, ö, ü, Ä, Ö, Ü, ß). ASCII-Ersetzungen wie
ae/oe/ue/ss sind in user-facing Strings verboten. Der Scope umfasst JSX-Textknoten, Button-Labels,
Fehlermeldungen, Placeholder, aria-labels, Toast-Nachrichten und Go-Response-Strings;
Codebezeichner sind ausgenommen.

### Modularität

Produktionscodedateien bleiben bei höchstens 450 Zeilen.

### Ehrlichkeit über Messwerte

Keine gerundeten Erfolgsmeldungen, keine Übertragung von DEV-Werten auf Produktion ohne eigene
Messung, keine Erfolgsaussage ohne Vorher/Nachher-Zahl.

## Requirements (Phasen-eigener Tracking-Namespace)

| ID | Workstream | Anforderung |
|----|-----------|-------------|
| P154-01 | A1 | Vier Duplikatpaare (Rollen-Volumen, Contribution-Projekte, Chronik, Archivist) beseitigt; Fakten request-lokal einmal geladen und mehrfach abgeleitet |
| P154-02 | A2, A3 | Fachliche Trennung Badges/Fortschritt erhalten; keine Monsterfunktion, keine Blind-Parallelisierung, kein kartesisch wachsender Join, keine spekulative Indexmigration |
| P154-03 | A4 | Query-Budget-Test auf vorhandener Counter-Infrastruktur; neuer Sollwert dokumentiert und als Regressionsschutz, nicht als Performancenachweis beschriftet |
| P154-04 | A5 | Ausgelieferte DTOs und Sichtbarkeitsregeln unverändert; Public- und Owner-Antworten inhaltlich identisch |
| P154-05 | B1 | Kein Projekt-Hero-Artwork bei null Projekten; Locked-Gating folgt dem vorhandenen Muster, keine dritte Variante |
| P154-06 | B2, B4 | Original-Fallback begrenzt über vorhandene Medienstrukturen; kein Retry-Loop, kein Geometriesprung; keine pauschale PNG-Crash-Zuschreibung |
| P154-07 | B3 | Animierte Avatare mit eigenem Budget; der unverkleinerte Optimizer-Durchlauf ist behandelt und die Wahl begründet |
| P154-08 | C1 | Kein unnötiger Vollprofilabruf allein für den Edit-Link; Viewer- und Vollprofilbedarf getrennt oder Information weitergereicht |
| P154-09 | C2 | `getMemberProfile` nimmt ein optionales `AbortSignal` und reicht es an `apiClientFetch` weiter; `useMemberViewer` übergibt das Hook-Signal |
| P154-10 | C3, C4 | PMFE-10-Fail-closed-Invariant und Fetcher-Memoisierung unverändert; Auth-Refresh, keine private Datenfreigabe, keine falsche Login-Anzeige |
| P154-11 | D1 | RCA-07 nach der Graphverkleinerung erneut gemessen und dokumentiert; keine Zuschreibung ohne Beleg |
| P154-12 | D2 | Listener-Rest aus Phase 153 untersucht; Ergebnis offen dokumentiert, auch ein Negativbefund ist zulässig |
| P154-13 | E1, E2, E3 | Vorher/Nachher-Messung als neues Auditdokument; volle Suiten, Backend-Tests im Go-Container und `docker compose build` PASS |
| P154-14 | E5, E8 | RCA-04 als offen geführt; phasenfremde Altdefekte benannt und abgegrenzt, die Phase-153-Diskrepanz geklärt oder erneut als offen dokumentiert |
| P154-15 | E6 | Owner-Ansicht eines versteckten Profils live als angemeldeter Eigentümer bestätigt (offener Punkt aus Phase 153) |

## Nicht in dieser Phase

- RCA-01, RCA-02, RCA-03 — in Phase 153 geschlossen, nicht erneut anfassen
- RCA-04 — unreproduziert, kein Umsetzungsziel
- Neue Produktfunktionen jeder Art
