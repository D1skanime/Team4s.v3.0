---
phase: 158
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-09-13
updated: 2026-09-14
technical_verified: true
human_uat: pending
---

# Phase158 — Validation

## Verbindliche Matrix

Die technische Pflichtmatrix ist vollständig verifiziert: 9/9 Anforderungen und 33/33 Produktionsfixture-Prüfgruppen. Quelle: vollständiger 158-USER-REQUEST.md; ausgeführte Nachweise in 158-VERIFICATION.md, 158-INDEPENDENT-VERIFICATION.md und docs/audits/2026-09-13-public-anime-detail/phase158/RESULTS.md. Phase 159 wiederholt alle 33 Browserregressionen erfolgreich. Technische Nachweise ersetzen keine Human-Abnahme für 156/157/158.

Wave-0-Testvoraussetzungen sind erfüllt. `nyquist_compliant` bleibt mangels separat ausgeführtem formalem Nyquist-Audit unverändert false; daraus wird weder ein formaler Score noch ein fehlender technischer Pflichtfall abgeleitet.

| Bereich | Pflichtfälle | Beweisart |
|---|---|---|
| UI | 360, 390, 767, 768 und 1440 Pixel; Episode geschlossen/geöffnet; scrollWidth ≤ Viewport; kein Rootscroll; berechnete Vorder-/Hintergrundfarben; Fokus und Slider nicht abgeschnitten | Browser und Komponententests |
| Session | Access; nur Refresh; Access abgelaufen und Refresh gültig; beide fehlen; Sessionwechsel nach Mount; konkurrierende Consumer mit Singleflight | Session-/APIintegration und isolierter Mockbrowser |
| Fehler | 401, 5xx und Netzwerkfehler; Contributions Laden/leer/Fehler/Retry; unbekannter Watchliststatus; bestehender Eintrag; Custom-Styling; alte Antworten nach Auth-/Animewechsel | Unit-/Integrationstests und Fehlerfixtures |
| Routing | Gültige ID; 1abc; 1.5; 0; negative und unbekannte ID; echter HTTP-Status mit normalem Browser-Useragent; Titel/Canonical/Robots; keine zusätzliche Animequery | Server-/HTTP-/Browsertests und Fetchcounter |
| Navigation | Gruppenbereich mit Pretty-Link und Canonical; autoritative Slugs; numerische Compatibility funktionsfähig | DTO-/Link-/Routeintegration und Browser |
| Relations | Aktiv mit/ohne Relations; unbekannt; deaktiviert; technische Fehler; erfolgreicher Pfad mit höchstens zwei Datenstatements | httptest und Repository-/QueryTracer-Nachweis |

## Gates je Phase

1. Gezielte Unit-/Integrationstests mit tatsächlich ausgeführten Fällen; keine SKIPs als DB-Beweis zählen.
2. Volle relevante Frontend-/Backendregression; neue Fehler gegenüber dem gesamten Phasenstart ausschließen.
3. Typecheck und Lint vollständig; bestehende Fehler namentlich und ursächlich abgrenzen.
4. Produktionsbuild isoliert im Container unter /tmp. Die laufende /app/.next nicht verändern; keine ignoreBuildErrors-Abkürzung.
5. git diff --check; Sichtprüfung im gemeinsamen Browser, ergänzt um Screenshots sowie DOM-/HTTPfakten.
6. Requests nach SSR, Client, Lazy, Auth, Medien und wiederkehrenden Aufrufen trennen. SQLzahlen als statisch oder gemessen kennzeichnen; gleiche Fixtures und Bedingungen vergleichen.
7. GSD-Summary/Verification mit Start-/Endcommit, Findingsstatus, Dateien nach Backend/Frontend/Vertrag/Tests, Prüfresultaten, nicht reproduzierbaren Fällen, Risiken und offenen Human-UATs aktualisieren.

## Baseline

158 startet auf7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85. Der frische Hauptagentenlauf zeigt: Typecheck Exit2 mit zwei TS2344 bei GroupStoryPageProps; Lint13Errors/331Warnings. Die vollständigen Frontendtests umfassen302Dateien:300pass,1fail,1skip;2334Tests pass,2fail,3todo. Beide Fehler liegen in cssCustomProperties.guard.test.ts:138/142 (Textmention --surface-muted und Allowlistcount). Belege: baseline-typecheck.log, baseline-lint.log und baseline-tests.log im Auditpreflight. Diese Altfehler sind keine Erlaubnis für neue Regressionen.

159 startet erst am technisch verifizierten158-Abschlusscommit und erhält eine eigene frische Baseline. [VERIFIED: Hauptagentenbaseline13.09.2026; FRONTEND-REPAIRS]

## Ausführung und Fixturegrenze

Frontendbefehle im Composecontainer: npm run typecheck, npm run lint und npx vitest run. Gezielte Filter pro Plan und Gesamtgate anschließend. Backend Build/Vet/Tests im vorhandenen Container oder in der projektnahen diagnostischen Go-Containerumgebung. Exakte Testdateien und Kommandos stehen in den Plans; fehlende Fixtures sind Wave0-Arbeit.

Kein DDL/DML gegen die laufende VMdatenbank oder ein ungeprüftes DSN. Browserclientfixtures über RouteMock; SSRfixtures brauchen eine isolierte Nextinstanz mit GET-only-API, denn Browserrouting fängt SSRrequests nicht ab. Keine Backendneustarts mit schreibender Startup-Migration.

## Offene Human-UATs

156-GAP02 mit14Origin-/Contributorchecks und157-06 Task4 bleiben OPEN. Die vollständige Liste steht im GSD-CONTEXT-Preflight. Auch grüne neue Gates erzeugen kein automatisches Sign-off.

## Threat Matrix

| ID | Risiko | Mitigation | Pflichtbeweis |
|---|---|---|---|
|T-AUTH|Refresh-only wird als Logout behandelt oder mehrere Mechanismen refreshen|useAuthSession und zentraler APIclient/Singleflight|Access fehlt/abgelaufen, Refresh gültig; konkurrierende Consumer|
|T-STALE|Status des vorigen Accounts/Anime führt zur falschen Watchlistaktion|Stabile tokenfreie Identität und Authgeneration; gebundene Requests; Abort/Ignore; unknown blockiert Writes|Logout/Login/Rerender während Request; alter Erfolg/Fehler|
|T-ID|Präfix-ID verwechselt Entität; Streaming erzeugt weiche404|Strikte sichere Integerprüfung vor Suspense; memoized Loader; NextnotFound|1abc/1.5/0/negativ/unbekannt; echter HTTP-Status und Metadaten|
|T-VIS|Deaktivierte Daten oder falscher Slug|Bestehende Visibilityprädikate und autoritative Slugs|Aktiv/unbekannt/deaktiviert; keine Browser-Slugheuristik|
|T-MEDIA|SSRF oder unbeschränkter Originaltransfer|Bestehende URLalllowlist und Provider-/Optimizerseams; kein LocalIP-Hack|Lokale/Provider/unbekannte URL; Fehler ohne Originalretry|
|T-CACHE|Unbegrenzte Retention, vergiftete Einträge oder fremdes Manifest|TTL/LRU, Consumerreferenzen, Entryidentität, Abort/Retry|Viele Animewechsel; TTL; Retry; alte Rejection|
|T-PAYLOAD|N+1, unbeschränktes Inventar oder heimliche Trunkierung|Consumergeprüfter begrenzter Abruf und Batchqueries|Kleine/große Fixtures; atomare Rows/Bytes; Querycounter|
|T-IDENTITY|Varianten-/VersionsIDkollision oder Range als zweite Segmentwahrheit|Explizite IDs, kontrollierte Compatibility und Assignmentquelle|Isolierte Kollision; divergente Range/Assignments; alle Consumer|

Quellen: Nutzerauftrag, AGENTS und technische Preflights.158 prüft die berührten Risiken;159 übernimmt die Regressionen. Keine eigene Kryptografie und keine ASVS-Zertifizierungsbehauptung.
