# Schlussprüfung und Dateiumfang

Produktcode gegenüber a5557720 unverändert; keine bestehenden getrackten Dateien modifiziert. Nur die hier aufgeführten neuen Auditdateien. Kein Commit/Push und keine Produktoptimierung durchgeführt.

## Geänderte Abschnitte

- Neuer opt-in-pgx-Tracer: Queryzahl, Reihenfolge, Aufrufpfade, Zeit, Zeilen und EXPLAIN mit read-only Verbindung.
- Browser-Instrumentierung: getrennte Network-/CPU-/Memory-/Observer-Messung; keine Rückschlüsse von kumulativen Warm-Zählern auf Hydration.
- Temporäre A/B-Kompositionen mit Sicherung/Wiederherstellung; eigenständiger nativer Auto-Sizes-Minimalversuch.
- Bericht, Tabellen, Assetinventar, Rohbeleg-Manifest, Reproduktionsanleitung und Prüfprotokolle.

Read-only-Grenze im neuen Go-Test:

    if os.Getenv("TEAM4S_PUBLIC_PERF_AUDIT") != "1" { t.Skip("opt-in read-only real dataset audit") }
    cfg.ConnConfig.RuntimeParams["default_transaction_read_only"] = "on"

## Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| Fokussiertes ESLint mit --max-warnings 0 | Bestanden, keine Errors/Warnings |
| Node --check für alle neuen mjs | Bestanden |
| JSON-Parsing / Python compile ohne Cachedateien | Bestanden |
| gofmt + opt-in Backend-Audit | Bestanden, read-only |
| Relevante Frontend-Tests | 341 bestanden, 3 bestehende Todos; 20 Dateien bestanden, 1 übersprungen |
| Gesamt-Typecheck | Bestehende PageProps/searchParams-Inkompatibilität in anime/page.tsx |
| Gesamtlint | 13 bestehende Errors; vollständiges Log vorhanden. Eigene Warnung anschließend beseitigt und fokussiert erneut geprüft |
| Regulärer Production-Build | Bestehender unzulässiger Page-Export formatEditLoadError |
| Isolierter Diagnosebuild | Erfolgreich mit ausschließlich dort ignorierten Type-Buildfehlern; keine Release-Freigabe |
| Rohbeleg-SHA256 | Alle raw/- und build/-Artefakte geprüft |
| git diff --check + Whitespaceprüfung neuer Dateien | Bestanden nach normalisierten Log-Zeilenenden/Whitespace |

Die Logkopien im Repository wurden nur bezüglich abschließender Leerzeilen/Whitespace normalisiert. Messwerte unverändert. Unveränderte Build-/Browser-Rohartefakte im Evidenzvolume.

## Neue Messwerkzeuge

- [backend/internal/repository/public_member_performance_audit_test.go](/home/d1sk/team4s/backend/internal/repository/public_member_performance_audit_test.go)
- [frontend/scripts/audit-public-member-bundles.mjs](/home/d1sk/team4s/frontend/scripts/audit-public-member-bundles.mjs)
- [frontend/scripts/audit-public-member-heaps.mjs](/home/d1sk/team4s/frontend/scripts/audit-public-member-heaps.mjs)
- [frontend/scripts/audit-public-member-images.mjs](/home/d1sk/team4s/frontend/scripts/audit-public-member-images.mjs)
- [frontend/scripts/audit-public-member-native-auto-sizes.mjs](/home/d1sk/team4s/frontend/scripts/audit-public-member-native-auto-sizes.mjs)
- [frontend/scripts/audit-public-member-native-memory.mjs](/home/d1sk/team4s/frontend/scripts/audit-public-member-native-memory.mjs)
- [frontend/scripts/audit-public-member-navigation-retention.mjs](/home/d1sk/team4s/frontend/scripts/audit-public-member-navigation-retention.mjs)
- [frontend/scripts/audit-public-member-navigation.mjs](/home/d1sk/team4s/frontend/scripts/audit-public-member-navigation.mjs)
- [frontend/scripts/audit-public-member-performance.mjs](/home/d1sk/team4s/frontend/scripts/audit-public-member-performance.mjs)
- [frontend/scripts/audit-public-member-retainers.mjs](/home/d1sk/team4s/frontend/scripts/audit-public-member-retainers.mjs)
- [frontend/scripts/audit-public-member-visibility.mjs](/home/d1sk/team4s/frontend/scripts/audit-public-member-visibility.mjs)
- [frontend/scripts/summarize-public-member-performance.mjs](/home/d1sk/team4s/frontend/scripts/summarize-public-member-performance.mjs)

## Neue Auditdokumente und kompakte Belege

- [ASSETS.md](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/ASSETS.md)
- [PLAN.md](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/PLAN.md)
- [REPORT.md](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/REPORT.md)
- [REPRODUCE.md](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/REPRODUCE.md)
- [SHA256SUMS](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/SHA256SUMS)
- [TABLES.md](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/TABLES.md)
- [audit-tooling-checks.log](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/audit-tooling-checks.log)
- [backend-validation.log](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/backend-validation.log)
- [backend.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/backend.json)
- [browser-summary.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/browser-summary.json)
- [bundles.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/bundles.json)
- [frontend-tests.log](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/frontend-tests.log)
- [generate-tables.py](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/generate-tables.py)
- [heaps.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/heaps.json)
- [http.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/http.json)
- [images.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/images.json)
- [lint.log](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/lint.log)
- [native-auto-sizes.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/native-auto-sizes.json)
- [native-memory.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/native-memory.json)
- [navigation.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/navigation.json)
- [production-build-diagnostic.log](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/production-build-diagnostic.log)
- [production-build-original.log](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/production-build-original.log)
- [retainers.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/retainers.json)
- [retention-dev-group.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/retention-dev-group.json)
- [retention-dev-member.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/retention-dev-member.json)
- [retention-production-diagnostic-group.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/retention-production-diagnostic-group.json)
- [retention-production-diagnostic-member.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/retention-production-diagnostic-member.json)
- [retention-production-eager-member.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/retention-production-eager-member.json)
- [retention-production-no-auto-sizes-member.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/retention-production-no-auto-sizes-member.json)
- [run-extra-measurements.sh](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/run-extra-measurements.sh)
- [run-isolation.py](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/run-isolation.py)
- [typecheck.log](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/typecheck.log)
- [visibility-fansubs-new-subs.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/visibility-fansubs-new-subs.json)
- [visibility-members-kara.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/visibility-members-kara.json)
- [visibility-members-timer.json](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/visibility-members-timer.json)
- [VALIDATION.md](/home/d1sk/team4s/docs/audits/2026-09-09-public-member-performance/VALIDATION.md)

## Offene Grenzen

Persönlicher Chrome-Crash nicht reproduziert; genaue Nutzer-Browser-/GPU-/Sessiondaten fehlen. Kontrollgruppe besitzt aktuell nur ein Projekt und keine Story. Komponentenweise React-Profiler-Dauern und genaue native C++-Retainertypen nicht ermittelt. Der nachgewiesene Navigations-Retentionspfad ist ein Kandidat für Langzeitsitzungen, kein Beweis für den konkreten Tab-Crash.

## Umgebung nach Abschluss

Originale Compose-Dienste laufen weiter. Temporäre Produktquellen restauriert. Isolierter Diagnosecontainer wird nach kompakter Abschlusssicherung entfernt; Named-Volume team4s_public_member_rca bleibt als Evidenz erhalten.
