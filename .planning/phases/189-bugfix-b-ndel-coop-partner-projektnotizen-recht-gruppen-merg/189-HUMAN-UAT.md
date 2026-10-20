---
status: partial
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
source: [189-VERIFICATION.md]
started: 2026-10-20T15:45:00Z
updated: 2026-10-20T15:45:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Coop-Partner-Kennzahl im Kopfbereich + "Mehr entdecken"
expected: Auf `/anime/2/group/26` zeigt der Kopfbereich die Coop-Partner-Kennzahl nur bei echtem
gemeinsamem Release (Namen klickbar zur Partner-Projektseite, kein Logo/AvatarStack mehr); bei 0
Coop-Partnern ist die Kennzahl komplett ausgeblendet; bei ≥3 ist die aufklappbare Liste nutzbar;
alle Links führen zu `/anime/<id>/group/<id>`, nie zu `/fansubs/<slug>`. "Weitere Gruppen zu
diesem Anime" erscheint NICHT im Kopfbereich, sondern unten im Abschnitt "Mehr entdecken" im
dortigen Linkstil.
result: [pending]

### 2. next/image-Absturz behoben (ursprünglicher Live-Crash-Fall)
expected: `/anime/2/group/26/releases` rendert ohne next/image E426/E231-Absturz; Gruppen-Logo im
Header und in den "Weitere Gruppen"-Chips laden (ggf. unoptimiert) statt die Seite mit 500
abzureißen. Browser-Konsole zeigt keine entsprechenden Fehler.
result: [pending]

### 3. 409-Lösch-Sperre-Meldung im Admin-UI
expected: Löschversuch einer Bestandsgruppe mit echten Abhängigkeiten (z. B. Releases) über
`/admin/fansubs` zeigt die bestehende Fehler-Banner-UI mit der deutschen Meldung "Diese Gruppe
kann nicht entfernt werden: <N Kategorie(n)> hängen noch daran." verständlich und vollständig an
— kein stiller Fehlschlag, keine rohe 500-Antwort.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
