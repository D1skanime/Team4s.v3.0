# Handoff — 2026-09-02, Stand vor Ausführung Phase 144

Geschrieben am Ende einer langen Sitzung, die mit einer externen Codeprüfung der Phase 142 begann
und über Phase 143 bis zur fertigen Planung von Phase 144 lief. Dieses Dokument soll einer frischen
Sitzung ersparen, die Betriebsdetails erneut zu erarbeiten.

## Wo gearbeitet wird

Alles auf `team4s-linux` unter `/home/d1sk/team4s`. Das Windows-Checkout ist ein veralteter Spiegel —
siehe `CLAUDE.md`. Keine GSD-Slash-Kommandos in der Windows-Sitzung ausführen; sie würden die
veralteten Dateien beschreiben.

## Wie GSD headless gesteuert wird

Die Skripte liegen in `~/gsd-harness/` auf der VM (vorher in `/tmp`, überlebte keinen Neustart):

    gsd-stream-start.sh <logfile>   Session mit offenem stdin starten
    gsd-send.sh "<text>"            EINE Nachricht hineinschicken (auch Gate-Antworten)
    gsd-status.sh                   Log-Wachstum, Subagenten, letzte Antworten, Artefakte
    gsd-run.sh <promptfile>         einfacher One-Shot ohne Background-Tasks

Ablauf: `setsid ~/gsd-harness/gsd-stream-start.sh /tmp/xyz.log > /tmp/start.out 2>&1 < /dev/null`,
dann `~/gsd-harness/gsd-send.sh "/gsd-plan-phase 144"`.

**Warum das offene stdin nötig ist:** `plan-phase` und `execute-phase` starten ihre Agenten als
Background-Task und beenden den Turn. Bei einem normalen `claude -p "..."` sieht der Prozess dort EOF,
beendet sich und verwaist die Agenten — man bekommt ein, zwei Pläne statt aller. Ein FIFO, das von
`sleep infinity` offen gehalten wird, hält die Session am Leben.

**Fallstricke, alle real erlebt:**

- Die Befehle heißen auf der VM `/gsd-phase`, `/gsd-quick`, `/gsd-plan-phase` — **mit Bindestrich**.
  Ein `/gsd:`-Aufruf endet mit `Unknown command` und **Exit 0**, also stillem Fehlschlag.
- `~/.bashrc` bricht für nicht-interaktive Shells oben ab, `source ~/.bashrc` bringt den
  OAuth-Token daher NICHT. Die Skripte greifen die Zeile gezielt heraus.
- Prompts immer aus einer Datei lesen. Inline-Quoting über SSH zerbricht an Backticks und
  Anführungszeichen.
- **Die Harness verträgt nur eine Session gleichzeitig** — fester FIFO-Pfad, feste PID-Datei. Vor
  jedem Start die alte beenden: `kill $(cat /tmp/gsd-holder.pid)`. Einmal vergessen, und eine
  Session lag zwei Stunden im Leerlauf.
- Session beenden heißt: Holder killen, dann sieht claude EOF und geht selbst.
- Der Prozess beendet sich **nie von selbst**. Abschluss an Artefakten und Commits erkennen, nicht
  am Prozessende. Stall über Log-Größen-Delta messen, drei bis vier Minuten ohne Wachstum sind ein
  Gate, keine Panne.

## Gates, die zuverlässig kommen

- **Nyquist/Validation** bei `--skip-research`: nicht Option 2 wählen (schreibt
  `nyquist_validation false` dauerhaft in die Projekt-Konfiguration). Stattdessen die
  `VALIDATION.md` direkt aus den Kriterien schreiben lassen.
- **UI-Gate** bei Frontend-Phasen: vorher `/gsd-ui-phase <N>` laufen lassen, dann findet
  `plan-phase` die UI-SPEC und fragt nicht.
- **„Phase hat schon Pläne"** bei Gap-Runden: Option 1 (hinzufügen), niemals Option 3
  (alles neu generieren) — das verwirft abgeschlossene Arbeit.
- **Gap-Pläne brauchen `gap_closure: true`** im Frontmatter, sonst findet `--gaps-only` null Pläne
  und meldet Erfolg. Ist einmal passiert.

## Roadmap-Eigenart

`gsd-phase` platziert neue Phasenblöcke falsch — sie landen am Ende des v1.3-Abschnitts oder hinter
der Fortschrittstabelle statt bei den Phasendetails, und die Checklisten-Zeile fehlt. Das ROADMAP-
Format mit zwei Milestones in einer Datei bringt die SDK durcheinander. Bei 143 und 144 jeweils von
Hand korrigiert; beim nächsten Mal wieder prüfen.

## Deployment — wird leicht vergessen

Committeter Code läuft nicht. Nach Backend-Änderungen:

    docker compose up -d --build team4sv30-backend     # entrypoint fuehrt ./migrate up aus
    docker restart team4sv30-frontend                  # HMR greift nicht

Echte Host-Ports über `docker ps` prüfen: Backend liegt auf **18092**, nicht 8092. Ein Health-Check
auf 8092 liefert `000` und sieht nach Ausfall aus.

## Arbeitsweise, die sich bewährt hat

Behauptungen aus Berichten nicht übernehmen, sondern nachmessen. In dieser Sitzung war das mehrfach
entscheidend:

- Ein Verifikationsbericht meldete „passed", die volle Testsuite hatte 59 Fehler.
- Migration 0159 sollte Migration 0154s destruktives `DELETE FROM` ersetzen und enthielt selbst
  eines, während ihr Kopfkommentar das Gegenteil behauptete.
- Zwei meiner eigenen Anweisungen waren falsch und wurden von der Session nachgemessen und
  begründet widerlegt. Das ist erwünscht.

## Stand der Arbeit

**Phase 143 abgeschlossen.** 20 Befunde aus der externen Prüfung, 19 Pläne, fünf Live-UAT-Befunde,
alle vom Nutzer im Browser abgenommen (`143-UAT.md`, Abschnitt „Abnahme der zweiten UAT-Runde").
Frontend-Suite grün: 289 Dateien, 2162 Tests, 0 Fehler.

**Phase 144 geplant, nicht ausgeführt.** 7 Pläne, UI-SPEC und VALIDATION vorhanden. Ziel: abgelehnte
Release-Medien an Ort und Stelle ersetzen statt nur den Text daneben zu ändern.

Die drei Design-Entscheidungen sind in den Plänen getroffen:

- eigener Endpunkt `PUT /admin/release-versions/:versionId/media/:relationId/file` (Multipart)
- alte Datei verwerfen über die bestehende `release_review_file_delete_jobs`-Outbox
- Berechtigung `ActionReleaseVersionMediaUpdate`, kein neuer Action-Code — mit einem Test, der die
  Abwesenheit von `ActionReleaseVersionMediaReplace` erzwingt

**Nächster Schritt:** `/gsd-execute-phase 144`.

## Offene Punkte

- `v1.4-MILESTONE-AUDIT.md` kennt die Phasen 143 und 144 noch nicht.
- Akzeptierter Grenzfall aus 143: eine Folge mit bestätigter *und* abgelehnter Arbeit zeigt
  „Erledigt". Bewusst so, damit die Zähler nicht doppelt zählen. Mit dem Nutzer besprochen.
- Aus der Prüfung offen geblieben: die hartkodierte `membershipBaselineActions`-Stufe in
  `permissions/effective_rights.go` (Design-Entscheidung, eigene Discuss-Runde), das nachträgliche
  Erfassen der ungeplanten Phase-142-Arbeit als Requirements, sowie M3/M5/M6/M7 aus dem
  Prüfbericht.
- Größere offene Frage des Nutzers: 12 der ursprünglich 17 roten Testdateien stammten aus den
  Phasen 136–141, die nie extern geprüft wurden. Empfohlener Zuschnitt für eine zweite Prüfrunde ist
  evidenz-geführt — bei dem ansetzen, was nachweislich kaputt ist, statt chronologisch zu sweepen.

## Testdaten, die in der UAT entstanden sind

Erstmals existieren abgelehnte Einreichungen — vorher war der Bestand nur `confirmed`/`tombstoned`,
weshalb die Fehler nie auffielen. Beide liegen auf `release_version_id 48`, Folge 12 von
Buddy Complex, Gruppe New-Subs, von `type@team4s.de`:

    1 abgelehnte Notiz  (source_revision 2, zweimal abgelehnt)
    1 abgelehntes Bild
    2 tombstoned Notizen

Damit ist auch der kombinierte Fall live prüfbar. Für Phase 144 wird ein abgelehntes Bild gebraucht —
es ist vorhanden.

Login für Live-UAT nur über den Tunnel `http://127.0.0.1:3300`; `crypto.subtle` braucht einen
Secure Context.
