---
status: resolved
phase: 181-release-bearbeitung-zusammenfuehren-f-13-eine-rechtebasierte-
source: [181-VERIFICATION.md]
started: 2026-10-14T11:10:00Z
updated: 2026-10-14T12:01:08Z
---

## Current Test

[none — both items resolved]

## Tests

### 1. WR-01 — Dashboard-Link kann den Editor für eine seltene Rechte-Kombination leer anzeigen

expected: Eine explizite Entscheidung: entweder jetzt den einzeiligen Fallback in
`visibleActiveTab` (EpisodeVersionEditorPage.tsx:249-257) um `informationen` ergänzen, oder
bewusst als Restrisiko akzeptieren und als Folgeaufgabe vormerken.
result: resolved — Nutzer entschied, jetzt zu fixen (nicht zurückzustellen). Fallback-Kette in
die reine, exportierte `resolveVisibleActiveTab`-Funktion extrahiert; `informationen` als
letzter Fallback nach segmente/media/notizen ergänzt (Reihenfolge per Nutzervorgabe, nicht wie
im ursprünglichen Review-Vorschlag vorangestellt). Logik-only Unit-Test deckt alle 6
Fallback-Fälle ab, inkl. des WR-01-Regressionsfalls (nur `informationen` erlaubt). Keine
sonstige Produktionscode-Änderung an der Datei. Commit `2be605e49`.

### 2. WR-02 — Fehlender Regressionstest für den Exact-Match-Schutz der Allowlist

expected: Eine explizite Entscheidung: entweder jetzt den vorgeschlagenen Negativtest
(`/me/dashboard-evil`-Präfixangriff) in `page.test.tsx` ergänzen, oder bewusst als
Restrisiko akzeptieren.
result: resolved — Nutzer entschied, jetzt zu fixen. 5 Negativtests ergänzt
(`/me/dashboardX`, `/me/dashboard/evil`, `//evil.com`, `/me/contributionsX`,
`/me/contributions/evil`) — alle werden korrekt abgelehnt und fallen auf den bestehenden
Default-`backHref` zurück, decken beide neuen Allowlist-Einträge ab. Keine
Produktionscode-Änderung nötig (die bestehenden `===`-Checks waren bereits korrekt).
Commit `0f6881e83`.

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

Keine. Beide Punkte sind behoben und durch neue Tests abgesichert; voller Gate-Lauf
(Tests/tsc/lint) im Container grün, Frontend-Container neu gestartet und als gesund bestätigt.
