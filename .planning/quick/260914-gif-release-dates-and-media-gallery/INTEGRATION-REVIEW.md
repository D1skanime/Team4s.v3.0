# Integrationreview – Datumsfrontend und Backendvertrag

Read-only Codeprüfung durch Backend-Executor; keine Tests oder Implementierungsänderungen im Review. Abschließende Testausführung liegt beim Orchestrator.

## Gefundene und nachgeprüfte Korrekturen

1. **Hoch – Kontext A nach fehlgeschlagenem Wechsel zu B:** Der Adminhook behielt zuvor Kontext/Formular von A, während die aktive Route schon B adressierte. Nach dem Fehler des B-Kontextaufrufs konnte das A-Formular erneut sichtbar werden und nach B speichern. Korrektur im Diff bestätigt: `useEpisodeVersionEditor` löscht Kontext, ausgewählte Gruppen, ausgewählte Datei und Baseline beim neuen Ladevorgang; `loadedRouteVersionId` wird zuerst geleert und erst nach erfolgreichem aktuellem Kontext gesetzt. Save setzt vorhandenen Kontext und gleichen geladenen Routebezug voraus. Die vorhandene Generation-/Cancel-Prüfung verwirft späte Load- und Saveantworten. Der Member-Workspace hatte bereits entsprechende Kontextlöschung. **Codefinding geschlossen.**

2. **Niedrig – widersprüchlicher Speicherhinweis:** Eigene ungültige Datumsfolge und Nachbarwarnung konnten gleichzeitig „Speichern bleibt erlaubt“ anzeigen. Korrektur im Diff bestätigt: „Abweichungen zwischen Folgen verhindern das Speichern nicht.“ Die Aussage bezieht sich jetzt ausschließlich auf die nicht blockierenden Nachbarhinweise. **Codefinding geschlossen.**

## Vertragsabgleich

UTC-Tagesvergleich, explizites null, identische deutsche Datumsfehlermeldung, getrennte Beginn-/Abschlussanker, persistierter Gruppenscope, reale Releaseversion-Identität, leere Ankerliste und Queryfehler entsprechen Backend, TypeScript und den neuen Blöcken in OpenAPI/admin-content. Es gibt keine neue Auth-/Fetchimplementierung. Refresh-only bleibt über vorhandene Session und zentralen API-Client möglich.

## Testhinweis zur Nachprüfung

Die neue Regression A42 → B43-Kontextfehler → kein Save nach B ist vorhanden. Beim Lesen wurde ein Fehler der Erwartung gemeldet: ein gewöhnlicher `Error('Kontext nicht verfügbar')` wird vom bestehenden `formatError` absichtlich als „Anfrage fehlgeschlagen.“ angezeigt; nur ApiError erhält seine spezifische Meldung. Der Orchestrator korrigiert die Erwartung oder den Fixturefehlertyp und führt den Test aus. Dieses Review behauptet keinen eigenständig ausgeführten Testpass.

## Grenzen

Anker sind weiterhin ein Snapshot des letzten vorhandenen Kontextabrufs. Neu ausgewählte Gruppen haben bis zum erneuten Kontextabruf keine neuen Anker. Es werden keine eigenen Nachbarrequests beim Tippen ausgelöst. Bestehende allgemeine Alias-/Routen- oder andere Editoraktionen wurden in diesem eng begrenzten Closingreview nicht neu auditiert. Human-UAT wird damit nicht abgenommen.


Orchestrator-Abschluss: Testassert auf bestehende generische Fehlermeldung berichtigt. Finaler konsolidierter Lauf103/103 bestanden, darunter der neue A→B500-Fall. Beide Codefindings technisch geschlossen; Typecheck und scopedLint weiterhin grün.
