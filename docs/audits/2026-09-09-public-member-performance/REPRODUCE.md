# Reproduktion und Artefakte

Auf team4s-linux in /home/d1sk/team4s ausführen. Ausgangscode a5557720; realer Datensatz im Bericht. Keine Seeds, Resets, Migrationen oder lokale Dependency-Installation. Zuerst git status --short und docker compose ps prüfen.

## Messwerkzeuge

Die Browserwerkzeuge laufen im vorhandenen Frontend-Container:

    docker compose exec -T team4sv30-frontend node scripts/audit-public-member-performance.mjs

Standardausgabe: /tmp/public-member-rca im Container. Für neue Serien AUDIT_LABEL ändern, damit alte Rohwerte erhalten bleiben.

| Variable | Zweck |
| --- | --- |
| AUDIT_BASE | Standard http://127.0.0.1:3000; Produktionsdiagnose http://team4s-member-rca-prod:3105 |
| AUDIT_LABEL | Eindeutiger Serienname |
| AUDIT_ROUTES | members/timer,members/kara,fansubs/new-subs |
| AUDIT_REPEATS | Anzahl Wiederholungen |
| AUDIT_HEAP=1 | Vorher-/Nachher-Snapshots |
| AUDIT_WARM=0 | Nur Cold |
| AUDIT_CYCLES=30 | Scrollstress |
| AUDIT_SLOW=1 / AUDIT_CPU=4 | 150 ms, 200.000 Bytes/s / CPU-Drosselung |
| AUDIT_FAIL_BADGES=1 | Nur Badge-Optimizer blockieren |
| AUDIT_NO_IMAGES=1 | Bilder blockieren |
| AUDIT_JS_OFF=1 | Ohne JavaScript |
| AUDIT_REACT_HOOK=0 | Keine eigene Commit-Zählung, übrige Instrumentierung bleibt |

Umgebungsvariablen jeweils mit Compose-exec -e übergeben.

Weitere eigenständige Frontend-Skripte unter frontend/scripts:

- audit-public-member-bundles.mjs: tatsächliche DEV-Chunks und Modulanteile.
- audit-public-member-images.mjs: Quellmetadaten und reale Auslieferung.
- audit-public-member-visibility.mjs: zeitliche Sichtbarkeit und Skeletons.
- audit-public-member-navigation.mjs: echte Gruppen-/Member-Links.
- audit-public-member-navigation-retention.mjs: zwölf Zyklen, gleiches Enddokument, GC/Snapshots. AUDIT_NAV_CONTROL=group für Kontrolle; AUDIT_IMAGE_INTERVENTION=no-auto-sizes oder eager für isolierte Bildattribute.
- audit-public-member-native-auto-sizes.mjs: Minimalreproduktion ohne React/Next auf about:blank. Benutzt ein existierendes Badge vom Diagnosehost. lazy-auto, lazy-fixed, eager-auto, jeweils mit srcset.
- audit-public-member-native-memory.mjs: Prozess-/Cache-Memory-Dumps.
- audit-public-member-heaps.mjs / audit-public-member-retainers.mjs: Snapshot-Zählung und kürzeste starke Haltepfade.
- summarize-public-member-performance.mjs: getrennte Ressourcen-/Trace-Auswertung. Warm-Dauerzähler bewusst nicht als initiale Dauer ausgegeben.

Die Navigation schließt eine durch die Start-Mausposition geöffnete Sidebar über deren sichtbare UI. Frühere Drawer-Timeouts waren Harness-Fehler, kein Member-Crash.

## SQL

    docker compose exec -T -e TEAM4S_PUBLIC_PERF_AUDIT=1 team4sv30-backend go test ./internal/repository -run '^TestPublicMemberPerformanceAudit$' -count=1 -v

DATABASE_URL bleibt im Backend-Container und wird nicht ausgegeben. Pool mit default_transaction_read_only=on, eine Verbindung, sieben Läufe pro Fall und EXPLAIN ANALYZE/BUFFERS. Ausgabe /tmp/public-member-backend-audit.json, optional TEAM4S_PUBLIC_PERF_AUDIT_OUTPUT. Ohne Opt-in übersprungen. Andere Postgres-Tests nicht ungeprüft mit der Runtime-Datenbank starten.

http.json enthält separat sieben lokale GET-Zeitmessungen je realem Profil-/Gruppenendpunkt.

## A/B

run-isolation.py neben diesem Dokument führt die unabhängigen Varianten aus. Acht benannte Produktdateien werden in source-backup.json gesichert, zwischen Varianten und im finally restauriert. Existierende Sicherung blockiert Neustart. Nur ohne parallele Bearbeitung dieser Dateien ausführen. Bei Hostausfall zuerst Sicherung prüfen. Diagnose-Stubs sind keine endgültigen Implementierungen. Iteration 0 kann Fast Refresh enthalten; Iteration 1 und Warm sind maßgeblich.

run-extra-measurements.sh setzt restaurierte Quellen voraus und führt finale Baseline, 30-Scrollstress, JS-aus, Optimizer-Fehler und Drosselung aus.

## Produktionsdiagnose

Eigener Compose-Oneoff-Container team4s-member-rca-prod aus vorhandenem Frontend-Service, ohne Abhängigkeiten neu zu starten. HEAD-Archiv mit frontend/src und getrackten Frontend-Wurzeldateien nach /tmp/audit-prod extrahiert. node_modules und public auf vorhandene /app-Verzeichnisse verlinkt. Kein Live-.env kopiert oder verändert.

NODE_ENV=production, PHASE120_IMAGE_PROBE=1 für bestehendes lokales Medien-Testgate, NODE_OPTIONS mit max-old-space-size=2560. Zuerst npm run build -- --webpack: regulärer Page-Exportfehler. Danach ausschließlich in der isolierten Kopie typescript.ignoreBuildErrors=true; erneut gebaut. Exakte Konfiguration im Evidenzvolume build/next.config.diagnostic.mjs. Keine Release-Freigabe.

Next start aus dieser Kopie auf 0.0.0.0:3105, interner Dockerhostname oben. Gleicher Backend-Datenbestand und gleiche Browserwerkzeuge. Der temporäre Container wurde nach Sicherung entfernt. Zur Wiederholung einen eigenen Container mit derselben isolierten Kopie verwenden; Runtime-Frontend und dessen .next-Volume nicht auf Produktion umstellen.

## Rohartefakte

Dauerhaftes Docker-Named-Volume: team4s_public_member_rca.

- raw/: ungefähr 165 MB Network-/Console-JSON, Screenshots, CPU-/Trace-json.gz, Heap-Snapshots.
- build/: exakte Diagnosekonfiguration, erzeugte Production-Static-Chunks als production-static.tar.gz.
- prod-build*.log und prod-server.log.
- SHA256SUMS: Prüfsummen aller raw/- und build/-Dateien; Kopie neben Bericht.
- compact/: Abschlussbericht, Tabellen, JSONs, Logs und Messwerkzeuge.

Zum Lesen das Volume schreibgeschützt an einen kurzlebigen Container des vorhandenen Frontend-Images unter /evidence mounten; keine App starten. Darin sha256sum -c /evidence/SHA256SUMS mit Arbeitsverzeichnis /evidence ausführen. Das Named-Volume bleibt unabhängig vom Diagnosecontainer erhalten.

Entpackte Traces in Chrome DevTools Performance laden, entpackte Heap-Snapshots in Memory. CPU-JSON enthält CDP-Profiler.stop-Ergebnis mit profile. Console/PageErrors in den zugehörigen Lauf-JSONs, Phasen in samples und rca:-Marks. Invasive Snapshot-/GC-Zeiten nicht als Nutzer-Hänger interpretieren.

generate-tables.py liest die kompakten JSONs neben sich und erzeugt TABLES.md/ASSETS.md. Bei neuen Serien Zusammenfassungen gezielt aus dem Container kopieren. Kürzeste starke Haltepfade sind keine Dominator-/Retained-Size-Analyse.

Live-Routen: http://192.168.235.196:3000/members/timer, /members/kara, /fansubs/new-subs. Persönliches Chrome separat für den offenen konkreten Crash erfassen.
