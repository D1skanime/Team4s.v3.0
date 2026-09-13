# Laufzeitbelege und Prüfprotokoll

Stand: 2026-09-13, Commit `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`. Analyse ausschließlich auf der Linux-VM; keine Produktänderung. Alle Uhrzeiten unten UTC.

## Methode und Grenzen

- Gemeinsamer Browser: tatsächlich sichtbaren Rückweg vom Projekt-Member über das Fansub-Projekt zur Anime-Seite benutzt. Auf `/anime/1` den sichtbaren Link „Zum Gruppenbereich“ geöffnet und über „Zurück zum Anime“ zurückgekehrt. Keine versteckte Ersatzroute als erfolgreicher Nutzerflow ausgegeben.
- Unterstützende Messung: vorhandenes Playwright/Chromium im laufenden Frontendcontainer, zwei neue anonyme Browserkontexte. Mobile 390×844, Desktop 1440×900. Temporärer Loopback-Proxy 3300→3000 im Container erhält den erlaubten Browser-Origin; anschließend geschlossen. Keine Installation und kein dauerhaft gestarteter Dienst.
- CDP erfasste Requests, Antwortstatus, Cache-Control, abgeschlossene Transfers und JSON-Responsegrößen. Keine Cookies, Bearertokens, privaten Profildaten oder Streamsource-URLs aufgezeichnet.
- Zeitfenster: Mobile 16:44:01–16:44:38, Desktop 16:44:38–16:44:44. Initialmessung bis networkidle +2 Sekunden, danach Mobile 31 Sekunden idle; anschließend Folge 1 aufklappen. Desktop idle nur 1 Sekunde. Unterschiedliche Idlezeiten sind **kein** Desktop/Mobile-Performancevergleich.
- Laufender **Next-Dev-Server**, warmer Server, frische Browserkontexte, je eine Stichprobe, keine Last-/Produktionsmessung, kein p95 und keine belastbare Core-Web-Vitals-Aussage. Keine SQL-Statements getraced; statisches SQLbudget steht separat im Backendbericht.
- Hintergrundbilder und Video werden zufällig gewählt. Ein zweiter Lauf darf deshalb andere Asset-URLs und Bytes haben. Rotatorvideo ist neutrales Anime-Hintergrundmedium; es wurde kein Release-Play-Link aufgerufen.

## Gemessene Requests

Rohbeleg: [runtime.json](evidence/runtime.json). Erfasst sind Browserrequests; die serverseitigen API-Aufrufe erscheinen nicht als Browser-Fetches.

| Beobachtung | Mobile | Desktop |
|---|---:|---:|
| Dokumentstatus | 200 | 200 |
| TTFB laut Navigation Timing | 160,7 ms | 147,9 ms |
| Initialrequests insgesamt, einschließlich Dev-JS/CSS/Medien | 18 | 18 |
| Zusätzliche Requests im beobachteten Idle | 3 Bilder | 0 |
| Clientinitiale fachliche JSONrequests | 2 | 2 |
| Zusätzlicher Request beim Episode-Expand | 0 | 0 |
| Abgeschlossene Bildtransfers im jeweiligen gesamten Fenster | 2.276.411 B | 1.674.145 B |
| Abgeschlossene JS-Transfers, **Dev-Bundles** | 3.791.828 B | 3.791.838 B |
| Erfasste Console-/Pagefehler | 0 | 0 |

Die zwei fachlichen Clientrequests sind `/api/v1/anime/1/contributions` (200, 13 B JSON) und `/api/v1/anime/1/backdrops` (200, 832 B JSON). In 31 Sekunden kein wiederkehrender JSONrequest. Drei Bilder folgten ungefähr im 9-Sekunden-Rhythmus. Der 200ms-Storage-Timer erzeugt keine Netzwerkrequests.

**Wichtige Messgrenze:** Der initiale Hintergrundvideo-Request antwortete 206, war in CDP aber nicht als abgeschlossener Transfer erfasst. Fehlende encodedBytes sind unbekannt, **nicht null Videokosten**. Die Summen enthalten daher keine vollständige Videogröße. `runtime.json.initialDOM.htmlBytes` ist ein DOM-Snapshotfeld; daraus wird kein HTTP-Payloadbudget abgeleitet.

Initialer Coverrequest auf beiden Viewports:

```text
/api/v1/media/image?item_id=46523903e0af5022d78af0368d89b805&kind=primary&provider=jellyfin
```

740.116 B einschließlich CDP-Transferoverhead, kein width-Parameter. Natürliches Format 1000×1426, gerendert Mobile 160px und Desktop 260px breit. Server setzt ohne width keine Jellyfin-maxWidth. Eine zusätzliche lokale Originaldatei wurde trotz `?width=1920&quality=86` unverändert über StaticFS ausgeliefert (380.457 B im ersten Mobilelauf). Queryparameter sind dort kein Resizing.

Dass Cover als Poster, Hero, Reflexion und Fallback vorkommt, beweist keine vier Transfers: im erfassten Browserfenster existiert ein abgeschlossener Request dieser exakten Cover-URL. Es wird kein Optimizer-/Original-Doppeltransfer behauptet.

## Serverseitige API-Payloads

Separate direkte anonyme GET-Stichprobe, kein Browser-Initialrequestzähler: [public-api-shapes.json](evidence/public-api-shapes.json). Größen sind unkomprimierte JSON-Bodybytes.

| Endpoint für Anime 1 | JSONbytes | Aktueller Inhalt |
|---|---:|---|
| `/anime/1` | 3.378 | Anime inkl. neutraler Episoden und Metadaten |
| `/anime/1/fansubs` | 327 | eine Gruppe |
| `/anime/1/episodes` | 10.460 | 13 Episodengruppen, je eine Variante |
| `/anime/1/comments?page=1&per_page=10` | 69 | leer, Pagination-Meta |
| `/anime/1/relations` | 11 | leer |
| `/anime/1/backdrops` | 832 | vier Bilder, ein Themenvideo, Logo/Banner |
| `/anime/1/contributions` | 13 | leere öffentliche Gruppenliste |
| **Summe fachliche JSONbodies** | **15.090** | keine Shell-/Auth-/Medienbytes |

Der kleine aktuelle Datenbestand beweist keine akute JSON-Lastkrise. Größere unlimitierte Listen sind eine strukturelle Skalierungsfrage; der große Covertransfer ist dagegen bereits aktuell messbar.

[backend-window.log](evidence/backend-window.log) enthält gefilterte GET-Logzeilen aus dem Messfenster. Darin sind auch andere gleichzeitige Browser-/Auditabrufe sichtbar. Mangels Korrelations-ID werden sie **nicht sämtlich einem einzelnen Seitenaufruf zugerechnet**. Einzelne Next-Cachehits sind möglich; beispielsweise fehlt im zweiten engen SSR-Zeitfenster ein neuer Relations-GET. Keine historische Logzeile beweist allein eine doppelte Frontendabfrage.

## Visuelle Funktionsfehler

Quelle: [layout.json](evidence/layout.json), erhoben 16:52:19 mit dem reproduzierbaren [measure-layout.mjs](evidence/measure-layout.mjs). Frische anonyme Kontexte, 390×900 und 1440×900.

| Messwert | Mobile | Desktop |
|---|---:|---:|
| Viewportbreite | 390 | 1440 |
| Dokument-scrollWidth | 454 | 1555 |
| Hero-Banner rechte BoundingRect-Kante | 453,5 | 1555,2 |
| scrollX nach `scrollTo(100,0)` | 64 | 100 |
| Episodentitel-Farbe | rgb(255,255,255) | rgb(255,255,255) |
| Hintergrund der Episodenkarte | rgb(255,255,255) | rgb(255,255,255) |
| Contribution-Überschrift | rgb(28,28,30) | rgb(28,28,30) |
| Seitenhintergrund darunter | rgb(15,15,18) | rgb(15,15,18) |

Die Episodentitel sind im DOM/Accessibility-Tree vorhanden, visuell aber mit 1:1-Kontrast unsichtbar. Das ist kein fehlender Titel im API-Response. Berechnete Styles zeigen die vollständige Vererbungskette; siehe C-11 im Komponentenbericht.

Der Hero-Hintergrund ragt durch `left/right:-40px` plus `scale(1.1)` heraus; seine Kante erklärt exakt die Dokumentbreiten. Ein zusätzlich skalierter Rotator liegt ebenfalls außerhalb, reicht aber nicht bis zur maximalen Kante. Der tatsächlich veränderte scrollX belegt Root-Scrollbarkeit trotz `body { overflow-x:clip }`; keine bloße Vermutung anhand einer Screenshotbreite.

Screenshots vom Initialrequest wurden vom koordinierenden Agent visuell geprüft. Originale verbleiben auf dem Docker-Datenträger unter `/tmp/public-anime-audit/{mobile,desktop}-initial.png`, Kopien im Windows-Artefaktordner:

```text
C:/Users/admin/.codex/visualizations/2026/09/13/01a099d3-eae2-7111-a25e-93be2b68e342/anime-audit/
```

Die Screenshots entsprechen den tatsächlich überlaufenden Dokumentbreiten 454px bzw. 1555px. Es wurden keine Screenshotpixel editiert. Die großen Originale werden nicht auf die kleine Linux-Rootpartition kopiert.

## Routingproben

Quelle: [route-probes.json](evidence/route-probes.json), 16:50:26. Direkte Dokument-GETs, keine Datenmutation.

| Pfad | HTTP | Gerendertes Ergebnis | Canonical / Robots |
|---|---:|---|---|
| `/anime/1` | 200 | Buddy Complex | kein seiteneigener Canonical, kein Robots-Meta |
| `/anime/1abc` | 200 | ebenfalls Buddy Complex | kein Canonical / Robots |
| `/anime/buddy-complex` | 200 | „Ungültige Anime-ID“ | kein Canonical / Robots |
| `/anime/999999999` | 200 | „Anime nicht gefunden“ | kein Canonical / Robots |

Alle vier liefern den generischen Titel „Team4s v3.0“. Der aktuelle numerische Anime-Einstieg ist legitim; daraus folgt keine vorhandene oder geforderte Anime-Slugroute. Belegt sind permissive ID-Auslegung und Soft-Error-/Metadata-Verhalten.

Im gemeinsamen Browser führt „Zum Gruppenbereich“ erfolgreich nach `/anime/1/group/1`; das Dokument rendert das Projekt und enthält canonical `/fansubs/new-subs/fansubprojekt/buddy-complex`. Die URL bleibt numerisch: Canonical-Metadaten sind kein Redirect. Der Rückweg zur Anime-Seite funktioniert. Episode-Expand zeigt Playhref `/api/releases/27/stream`; der Link wurde nicht abgespielt.

## Ausgeführte Checks

| Check | Ergebnis / Beleg |
|---|---|
| Vorhandene vier relevante Vitest-Dateien | **6 Tests bestanden**, [focused-tests.log](evidence/focused-tests.log) |
| Typecheck `npx tsc --noEmit --incremental false` | **fehlgeschlagen**, 2 TS2344-Meldungen in generierten `.next/dev/types` zur existierenden numerischen GroupStoryPageProps-params-Union; [typecheck.log](evidence/typecheck.log) |
| Globales `npm run lint` | **fehlgeschlagen**, 13 Fehler / 331 Warnungen; [lint.log](evidence/lint.log) |
| Route-Kompilierung / Live-Aufruf | Anime und numerische Projektseite im laufenden Devserver erfolgreich |
| Produktionsbuild | nicht gestartet: derselbe laufende Frontendcontainer benutzt `.next`; Build würde den Live-Devzustand verändern. Typecheck ist bereits rot. Keine Isolation/Dependencies für einen zusätzlichen Build eingerichtet |
| Git-/Whitespaceprüfung | abschließender Nachweis in AUDIT.md; bestehende Produktdateien unverändert |

Die 13 Lintfehler betreffen `capture-responsive.cjs` und bestehende Admin-Seams (EpisodeNeighborNavigation, ReleaseVersionMedia, GroupMemberFormModals, GroupRolesTab, AdminGroupsClient, RoleCapabilityDetail, CapabilityDetailRow, CapabilityHistoryPanel). Vollständige Pfade/Zeilen im Log. Keine automatische Korrektur gestartet.

Die vorhandenen Tests schützen Manifestsharing, Storysummary, Contributiondarstellung und nichtblockierendes Backdrop-Laden. Sie beweisen keine Auth-, Kontrast-, Seitenrand-, Mehrgruppen- oder Skalierungsabnahme. Neue Regressionstests sind Bestandteil des Folgeplans, nicht dieses Audits.

## Offene Livefälle

- Gültige Refresh-only-Session, abgelaufener Access und Authwechsel nach Mount: Sourcebeweis vorhanden, kein authentifizierter Liveflow ausgeführt.
- Mehrgruppenpersistierung, Gridseitenrand, >10 Kommentare: aktuelle öffentliche Liste enthält nur Anime 1, eine Gruppe und keine Kommentare. Keine DBfixtures erzeugt.
- Hohe Episoden-/Varianten-/Contributionzahlen, Heap-Retention, p95, Produktionsbundle und exakte Provider-/SQLcounts: nicht gemessen.
- Kein Claim, dass historische Phase-156/157-Human-UAT durch diesen Audit erledigt wurde.

## Reproduktion der Layoutprobe

Im kanonischen Repository ausführen; benutzt vorhandene Containerabhängigkeiten und legt keine DBdaten an:

```sh
docker compose exec -T team4sv30-frontend node --input-type=module < docs/audits/2026-09-13-public-anime-detail/evidence/measure-layout.mjs
```

Port 3300 muss innerhalb des Frontendcontainers frei sein. Die Probe startet und schließt ihren eigenen lokalen HTTP-Proxy, öffnet anonyme isolierte Browserkontexte und gibt Messwerte als JSON auf stdout aus. DOMscrolling geschieht ausschließlich in diesen temporären Kontexten.
