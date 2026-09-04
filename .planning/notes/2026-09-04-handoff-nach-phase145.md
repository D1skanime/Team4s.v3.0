# Handoff — 2026-09-04, nach Abschluss von Phase 145

Geschrieben am Ende einer Sitzung, die Phase 145 von der Roadmap-Zeile bis zur Live-Abnahme
durchgezogen und danach Phase 146 angelegt hat. Der Betriebsteil steht in
[2026-09-02-handoff-phase144.md](2026-09-02-handoff-phase144.md) — Harness-Skripte, Gate-Antworten,
Deployment-Kommandos, Fallstricke. Das gilt unverändert weiter; hier stehen nur die Ergänzungen.

## Was diese Sitzung erledigt hat

**Phase 145 komplett durch.** Angelegt, `/gsd-ui-phase 145` (UI-SPEC 6/6 approved), geplant
(4 Pläne / 4 Wellen), ausgeführt, vom Nutzer live abgenommen (`145-UAT.md`, alle sechs Schritte),
abgeschlossen. Die drei Mitgliedschafts-Grundrechte kommen jetzt aus der Registry statt aus dem
Go-Slice — als reservierte, nicht zuweisbare Pseudo-Rolle `group_member`.

**Zwei Funde, die der Handoff-Ausgangsbefund nicht kannte** — beide am Code nachgeprüft, nicht aus
Berichten übernommen:

- `RoleCapabilityDetail.tsx:9` hielt mit `membershipBaselineCodes` einen **zweiten** Hardcode
  derselben drei Rechte. Die Annahme „die Lücke ist auf diese eine Go-Stelle begrenzt" war zu eng.
  Im Roadmap-Befund korrigiert, in der Phase gelöst (Filter bleibt für normale Rollen, wird für die
  Pseudo-Rolle abgeschaltet).
- Der Planner fand beim Grounding, dass `LoadFansubGroupRoles` die Pseudo-Rolle ebenfalls
  ausschließen muss — sonst erscheint sie trotz aller Katalog-Logik im zuweisbaren Rollen-Picker.

**Selbst gemessen nach dem Deployment** (nicht aus dem Regressionsbericht übernommen): Migration 160
live angewendet, `role_definitions` hält genau eine reservierte Zeile (`group_member`, assignable
false, reserved true, sort_order -10), `role_capabilities` exakt die drei erwarteten Zeilen, Backend
startet sauber. `go build`/`go vet`/`internal/permissions` grün; Frontend 289 Dateien / 2189 Tests /
0 Fehler. Das Gate hatte „grün bis auf vorbestehende Fehlschläge" gemeldet — im Frontend gibt es
solche gar nicht, die Einschränkung betraf nur DB-abhängige Go-Tests.

## Sofort als Erstes: Phase 146

Angelegt (`9e3a3d5f`), noch nicht geplant. **Nächster Schritt: `/gsd-ui-phase 146`** (Kriterium 2
berührt die Capability-Matrix), danach `plan-phase 146`.

Zwei Blöcke in einer Phase, so vom Nutzer entschieden — erst Registry-Selbstschutz, dann
Testsanierung. Vollständige Kriterien im Roadmap-Block.

### Block 1 — der kritische Befund aus `145-REVIEW.md`

**CR-01, nachgemessen und bestätigt.** `CountRolesWithAction`
(`backend/internal/repository/authz_capability_mutations.go:334`) zählt die Rollen INSGESAMT, die
eine Action gewähren. Da rund 15 weitere Rollen dieselben drei Baseline-Rechte tragen, feuert der
Lockout-Guard beim Entfernen an `group_member` nie. Der laufende Prozess bleibt korrekt fail-closed
(`validateMembershipBaselineRegistryPresence` lässt den alten Cache stehen), aber der nächste Start
bricht in `LoadCache` ab und `cmd/server/main.go:138` beendet mit `log.Fatalf` —
Container-Absturzschleife, bis jemand die Zeile von Hand nachträgt. Auslösbar mit zwei Klicks in der
regulären Admin-Oberfläche, ohne Datenbankzugriff.

Die Ironie: der fail-closed Startup-Check ist Erfolgskriterium 6 der Phase 145 und funktioniert
genau wie geplant — er wird nur dadurch zur Selbstschussanlage, dass die Phase dieselben Rechte
gleichzeitig editierbar gemacht hat.

**Aktueller Zustand: unkritisch.** Alle drei Zeilen sind vorhanden (geprüft 2026-09-04, nach der
UAT), das Backend läuft. Der Nutzer hat in UAT-Schritt 6 ausgeschaltet und wieder eingeschaltet —
wäre er dabei stehen geblieben, hätte der nächste Deploy gecrasht.

Dazu zwei Warnungen: `ListGroupHistoryRoleDefinitions` fehlt der `NOT reserved`-Filter seiner drei
Geschwister (derzeit folgenlos), und die drei Action-Codes stehen dreifach hartkodiert
(Migration, Go-Validator, TS-Filter).

**Namensfalle:** Der Review nennt seinen dritten Befund ebenfalls „WR-02". Das ist NICHT die
Testsanierung aus `144-REVIEW.md`. In dieser Sitzung „Quelltext-Substring-Tests" genannt.

### Block 2 — Quelltext-Substring-Tests, Bestand neu vermessen

Selbst gemessen 2026-09-04, die Zahlen aus
[2026-09-02-altlasten-cr01-wr02.md](2026-09-02-altlasten-cr01-wr02.md) (49 Dateien / 236
Behauptungen) sind überholt:

| | Wert |
|---|---|
| Testdateien, die per `os.ReadFile` eine `.go`-Quelle einlesen | **53** |
| `strings.Contains`-Aufrufe darin | **357** (Obergrenze — einige prüfen Response-Bodies) |
| Testfunktionen in diesen Dateien | 302 |
| Verteilung | repository 34, handlers 15, services 3, cmd/server 1 |
| Spitzenreiter | `member_profile_repository_test.go` mit 117 Aufrufen |
| **davon sicherheitsrelevant** (Permission/Authz/Capability/Preview/403) | **17** |

Der evidenz-geführte Zuschnitt sind diese 17, nicht ein alphabetischer Sweep. Die Liste steht im
Roadmap-Block; sie enthält unter anderem
`admin_content_release_version_media_replace_test.go`, `review_delegation_repository_test.go`,
`role_catalog_repository_test.go`, `hist_group_member_roles_whitelist_test.go`.

Kriterium 7 ist das eigentlich Wichtige: ein Guard gegen Neuzugänge nach dem Vorbild von
`LEGACY_NO_RESTRICTED_SYNTAX_FILES`. Die `CLAUDE.md`-Konvention existiert seit `fd6468cd` nur als
Prosa — und der Bestand ist während Phase 144 nachweislich weitergewachsen.

## Betriebsergänzung: SSH-Quoting

Der bekannte Fallstrick „Prompts immer aus einer Datei lesen" gilt auch für **Skripte**, und aus
zwei Gründen:

- **Backticks.** Ein Python-Heredoc inline über `ssh ... <<'EOF'` wird von der äußeren Shell
  angefasst: Backtick-Inhalte verschwinden als Command-Substitution. In dieser Sitzung einmal
  passiert — der Commit ging durch, aber alle Codebezeichner im neuen Roadmap-Text fehlten. Musste
  mit einem zweiten Commit repariert werden.
- **Größe.** Ab ein paar Kilobyte zerbricht der Befehl mit `unexpected EOF while looking for
  matching quote`, ohne dass irgendetwas ausgeführt wird.

**Verlässlicher Weg:** Skript mit dem Write-Tool als lokale Datei schreiben, per `scp` übertragen,
dann `ssh ... python3 /tmp/skript.py`. Commit-Messages genauso: Datei, dann `git commit -F`.

## Weiter offen

Unverändert aus dem Vorgänger-Handoff, nichts davon wurde in dieser Sitzung angefasst:

- **Fünf Phasen ohne `VERIFICATION.md`**: 128, 130, 131, 133, 135. Dazu die zurückgestellte manuelle
  UAT von Phase 133 (visuell + Barrierefreiheit).
- **Phase-142-Arbeit** nachträglich als Requirements erfassen.
- **M3/M5/M6/M7** — vier Befund-Kürzel ohne existierenden Prüfbericht, inhaltlich unbelegt. Die
  laufenden Seitenprüfungen des Nutzers ersetzen sie faktisch.

## Nicht mehr offen

- **Die hartkodierte `membershipBaselineActions`-Stufe** — durch Phase 145 erledigt.
- **Projektlisten-„Erledigt"**, **Phase 117**, **retroaktive Prüfung der Phasen 136–141**: siehe
  [2026-09-03-handoff-nach-phase144.md](2026-09-03-handoff-nach-phase144.md), Abschnitt „Drei
  Punkte, die NICHT mehr offen sind". Unverändert gültig.

## Arbeitsweise, die sich erneut bewährt hat

Nachmessen statt Berichte übernehmen — in dieser Sitzung viermal entscheidend: der zweite
Frontend-Hardcode, den der Ausgangsbefund ausschloss; die Testbestandszahlen, die um ein Drittel
danebenlagen; das Regressionsgate, das pessimistischer meldete als die Wirklichkeit; und CR-01, der
umgekehrt ernster war, als ein „advisory"-Vermerk vermuten lässt.
