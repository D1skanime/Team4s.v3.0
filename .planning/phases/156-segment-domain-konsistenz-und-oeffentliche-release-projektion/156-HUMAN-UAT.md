---
status: partial
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
source: [156-VERIFICATION.md, 156-UAT.md GAP-02, deferred-items.md]
started: 2026-09-14T00:00:00Z
updated: 2026-09-14T00:00:00Z
---

## Current Test

[awaiting human testing — 3 offene Punkte aus dem gebuendelten GAP-02-Live-UAT-Checkpoint]

## Tests

### 1. GAP-02 Items 10-13 — oeffentliche Anzeige nach Segment-Contributor-Auswahl
expected: Auf `http://127.0.0.1:3300` als Platform-Admin ein Segment mit einer ORIGIN UND einer
gespeicherten `theme_segment_contributors`-Auswahl waehlen (z. B. Segment 3, bereits fuer Items 1-9
der Sitzung vom 2026-09-14 genutzt). Auf der zugehoerigen oeffentlichen Release-Detailseite pruefen:
ausgewaehlte Mitwirkende erscheinen; ein nicht ausgewaehlter Quality-Checker derselben Origin
erscheint NICHT; ein ausgewaehlter Editor erscheint korrekt; ein Encoder erscheint nie als
Segment-Credit.
result: [pending] — die Sitzung vom 2026-09-14 pruefte Release 29 / Segment 4 (ohne Origin, ohne
Auswahl) und konnte diese Punkte nicht beurteilen.

### 2. GAP-02 Item 14 — Re-Bestaetigung nach dem CR-01-Fix
expected: Eine Segment-Origin ueber die manuellen "Zuweisen"/"Aufheben"-Admin-Aktionen aendern
(nicht nur ueber eine Bereichs-Speicherung) und pruefen, dass Origin und Segment-Contributor-Auswahl
konsistent bleiben (keine haengende Origin, keine verwaiste Contributor-Zeile) — sowohl im Admin-UI
als auch auf der oeffentlichen Seite.
result: [pending] — Item 14 bestand bereits einmal in der Sitzung vom 2026-09-14, jedoch VOR dem in
dieser Ausfuehrung gelieferten CR-01-Fix fuer die manuellen Zuweisen/Aufheben-Endpunkte
(`AssignThemeSegmentToReleaseVersion`/`UnassignThemeSegmentFromReleaseVersion`). Der automatisierte
Postgres-Nachweis ist gruen (siehe 156-VERIFICATION.md Truth #13), der Live-UI-Durchlauf fehlt noch
gezielt fuer diese zwei Endpunkte.

### 3. GAP-02 Items 11-12 — Live-Datenluecke (QC/Editor)
expected: Release 29 (oder eine andere Origin-Release ohne QC/Editor-Beitraege) um einen
`quality_checker`- und einen `editor`-Beitrag ergaenzen, dann Items 11-12 erneut durchfuehren:
ausgewaehlter QC/Editor erscheint korrekt; nicht ausgewaehlter QC erscheint nicht.
result: [pending] — die Diagnose vom 2026-09-14 fand auf der getesteten Release keine QC-/
Editor-Beitraege; ohne Live-Datenanlage nicht pruefbar.

## Findings

Keine Code-Defekte. Alle drei offenen Punkte sind reine Live-Browser-/Live-Daten-Pruefungen, die
diese Ausfuehrungsumgebung nicht simulieren darf (siehe `deferred-items.md`s explizite
Nicht-Simulations-Regel). Automatisierter Nachweis fuer die zugrunde liegende Logik existiert und
ist gruen (156-VERIFICATION.md).

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Resolution

Noch offen. Phase 156 bleibt NICHT vollstaendig abgenommen, bis diese drei Punkte live durch den
Auftraggeber bestaetigt sind. Die uebrigen 9 der urspruenglich 14 GAP-02-Punkte bestanden bereits in
der Sitzung vom 2026-09-14 (siehe `deferred-items.md`).
