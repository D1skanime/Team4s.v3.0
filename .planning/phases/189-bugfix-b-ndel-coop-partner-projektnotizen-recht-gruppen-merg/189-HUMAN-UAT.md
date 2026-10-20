---
status: approved
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
source: [189-VERIFICATION.md]
started: 2026-10-20T15:45:00Z
updated: 2026-10-20T22:20:00Z
---

## Current Test

[abgeschlossen — approved]

## Tests

### 1. Coop-Partner-Kennzahl im Kopfbereich + "Mehr entdecken"
expected: Auf `/anime/2/group/26` bzw. der kanonischen `/fansubs/strawhat-subs/fansubprojekt/11eyes`
zeigt der Kopfbereich die Coop-Partner-Kennzahl nur bei echtem gemeinsamem Release (Namen klickbar
zur Partner-Projektseite, kein Logo/AvatarStack mehr); bei 0 Coop-Partnern ist die Kennzahl komplett
ausgeblendet. "Weitere Gruppen zu diesem Anime" erscheint NICHT im Kopfbereich, sondern unten im
Abschnitt "Mehr entdecken".
result: passed — mit drei Nachbesserungsrunden während der Live-Prüfung durch den Nutzer:
(a) fehlende sichtbare Beschriftung der "Mehr entdecken"-Gruppenliste ergänzt; (b) Beschriftung auf
"<Animetitel> wurde auch gesubbt von" mit echtem Titel umgestellt (statt generischem Text), über
gemeinsamen Helper an beiden Stellen (Projektseite + Release-Liste); (c) Linkziele von der
technischen Route auf die kanonische öffentliche Projekt-URL umgestellt, `ExternalLink`-Symbol durch
internes `ChevronRight`-Symbol ersetzt, Beschriftung optisch verstärkt (halbfett, Primärtext-Token).
Final vom Nutzer auf der kanonischen Seite `/fansubs/strawhat-subs/fansubprojekt/11eyes` abgenommen.

### 2. next/image-Absturz behoben (ursprünglicher Live-Crash-Fall)
expected: `/anime/2/group/26/releases` rendert ohne next/image E426/E231-Absturz; Gruppen-Logo im
Header und in den "Weitere Gruppen"-Chips laden (ggf. unoptimiert) statt die Seite mit 500
abzureißen. Browser-Konsole zeigt keine entsprechenden Fehler.
result: passed — vom Nutzer live bestätigt ("Release-Liste lädt jetzt, Logos laden (Redirect
/api/v1/media/files → /media/fansub/…, 200) — OK").

### 3. 409-Lösch-Sperre-Meldung im Admin-UI
expected: Löschversuch einer Bestandsgruppe mit echten Abhängigkeiten über `/admin/fansubs` zeigt
eine verständliche, vollständige deutsche Fehlermeldung — kein stiller Fehlschlag, keine rohe
500-Antwort.
result: passed — mit vier Nachbesserungsrunden während der Live-Prüfung durch den Nutzer anhand
eigener Testgruppen (keine Bestandsgruppe betroffen): (a) Grammatik "1 Gruppennotiz hängen noch
daran" → "hängt" bei Gesamtzahl 1, sonst "hängen" (`GermanHaengenVerb`, an allen 3 Verwendungsstellen
im Backend korrigiert); (b) technischer "(409)"-Präfix entfernt, Gruppe namentlich genannt
(`formatDeleteFansubError`) — Ursache war ein zweiter Bug (`deleteFansubGroup` verlor `error.code`
über `parseApiError` statt `parseApiErrorPayload`, separat gefixt); (c) veralteter/technischer
Bestätigungsdialog-Text ("fansub_group_id wird entkoppelt") durch verständlichen Text ersetzt;
(d) Liste aktualisiert jetzt sofort nach Löschen statt erst nach manuellem Neuladen. Final vom
Nutzer mit eigener Testgruppe "Phase189-UI-Loeschtest2" (id 154) als vollständig korrekt bestätigt
("alles ✅").

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

Keine. Alle während der Live-Prüfung gefundenen Abweichungen (Beschriftung, Linkziele, Symbol,
Grammatik, Meldungstext, Dialogtext, Listenaktualisierung) wurden noch innerhalb dieser Phase
behoben und erneut live bestätigt (siehe `result`-Felder oben). Zusätzlich wurde ein
Nachfolge-Code-Review (`189-REVIEW-2.md`) über alle seit dem ersten Review hinzugekommenen Commits
durchgeführt; dessen 5 Befunde (Contract-Text-Drift, ein latenter Zwilling des
error.code-Bugs, Plural-Grammatik im Bulk-Löschen, ein ASCII-Umlaut-Tippfehler, fehlende
Teilerfolgs-Rückmeldung beim Bulk-Löschen) sind ebenfalls behoben.
