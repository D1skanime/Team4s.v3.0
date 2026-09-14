---
phase: 159
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-09-13
updated: 2026-09-14
technical_verified: true
human_uat: pending
---

# Phase159 — Validation

## Verbindliche Matrix

Die technische Pflichtmatrix ist vollständig und unabhängig verifiziert: 8/8 Anforderungen, 91/91 Produktionsprüffälle, 48 Medienkonfigurationen mit 96 kalten/warmen Beobachtungen. Verbindliche Nachweise: 159-VERIFICATION.md, 159-INDEPENDENT-VERIFICATION.md, 159-REVIEW.md, 159-SECURITY.md und docs/audits/2026-09-13-public-anime-detail/phase159/RESULTS.md. Typecheck/scoped Lint bestehen; globale Baselineausnahmen sind ausdrücklich dokumentiert.

Wave-0-Testvoraussetzungen sind erfüllt. `nyquist_compliant` bleibt mangels separat ausgeführtem formalem Nyquist-Audit unverändert false; die vollständige technische Pflichtmatrix ist davon getrennt belegt. Kein technischer Nachweis ersetzt Human-UAT 156/157/158/159.

| Bereich | Pflichtfälle | Beweisart |
|---|---|---|
| Gruppe | Primär-/Zweitgruppe; ungültige/entfernte ID; blockiertes Lesen/Schreiben im Storage; Reload/Hydration/StrictMode; Multitab/Event/Clear/Fremdkey; Animewechsel; synchrone Story/Filter/Versionen; keine Wechselrequests | Komponente, SSR/hydrateRoot und zwei Browsertabs |
| Grid | Mindestens drei Seiten; vorwärts/rückwärts über Ränder; erster Klick bei langsamer Antwort; Hover/Focus/Touch; InFlight-Sharing; Navigation während Request; alter Erfolg/Fehler/finally; kein Initialrequest; Retry | Unit- und kontrollierte Browserfixtures |
| Medien | Mobile/Desktop mit DPR1/2; lokal/Provider;404/500/fehlend; URL, MIME, Bytes, dekodierte Maße und Cachehit; alle vier Coverstellen begrenzt; kein Originalretry | Resolver, isolierte Next-/GET-only-Medienfixture und CDP |
| Manifest | Drei Consumer/ein Request; zwei Provider/ein Request; StrictMode; erst letzter Consumer löst Abort aus; Fehlerretry; TTL/Focus/Reacquire; Manifeständerung derselben SPA; identische Antwort stabil; viele Anime/Retentionlimit; alte Rejection | Fake Time, reale AbortSignals und Browser |
| Vertrag | Leere Serie; neutrale Folge ohne Variante; mehrere Gruppen/Varianten; unterschiedliche IDs; isolierte IDkollision; Range-/Assignmentdivergenz; alle Consumer; Go/OpenAPI/TypeScript; Streamcompatibility | Vertragstests und isolierte Fixtures |
| Budget | Atomare Row-/Payloadgrenze beziehungsweise passender Abruf; Fortsetzung ohne Trunkierung; keine Query pro Episode/Variante/Gruppe/Contributor; Gruppenwechsel ohne Request | Querycounter, kleine/große Fixtures und Bytevergleich |

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
