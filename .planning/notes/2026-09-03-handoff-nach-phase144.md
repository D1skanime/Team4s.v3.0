# Handoff — 2026-09-03, nach Abschluss von Phase 144

Geschrieben am Ende einer Sitzung, die Phase 144 ausgeführt, live abgenommen und vier daraus
entstandene Altlasten behoben hat. Der Betriebsteil steht im Vorgänger
[2026-09-02-handoff-phase144.md](2026-09-02-handoff-phase144.md) — Harness-Skripte,
Gate-Antworten, Deployment-Kommandos, Fallstricke. Das gilt unverändert weiter und wird hier
nicht wiederholt.

## Was diese Sitzung erledigt hat

**Phase 144 abgeschlossen und abgenommen.** 7 Pläne über 5 Wellen, dazu Gap-Runde (Plan 08:
Preview-Guard-Lücke, Sprachqualität, toter Code). Live-UAT vom Nutzer im Browser durchgeführt,
belegt in `144-UAT.md` mit dem in der Datenbank gemessenen Ablauf.

**Vier Fixes, alle Altbestand, keiner aus Phase 144** — erst durch die UAT sichtbar:

- `448a4b02` RVM-Cleanup lief in einer Endlosschleife: `HardDeleteRVMAndAsset` löschte die
  Lifecycle-Zeile nie, deren FK steht auf ON DELETE RESTRICT (Migration 0135). 83 Fehlschläge
  alle 10 Minuten. Nach dem Fix: 0 Fehler, Relation 10 abgeräumt.
- `07a8c88d` `has_own_release_work` zählte abgelehnte Arbeit als erledigt (kein
  Lifecycle-Filter), inkonsistent zur Projektlisten-Abfrage.
- `8c910c67` + `3f4ca6b1` Das Dashboard kannte Ablehnungen überhaupt nicht. Jetzt tragen die
  Beiträge `has_own_rejected_notes/media`, der Achtung-Filter blendet abgelehnte Arbeit nicht
  mehr aus, und sie wird als „Überarbeitung nötig" ausgewiesen.
- `6d4955d3` + `fb15c178` CR-01: fehlgeschlagene Uploads meldeten Erfolg. `runUpload` wirft
  jetzt bei harten Fehlern, und `handleUploadClick` prüft die Einzelergebnisse — Toast und
  Schließen nur, wenn jede Datei `ready` ist.

**Teststil-Konvention** in `CLAUDE.md` (`fd6468cd`): Verhaltensbehauptungen brauchen echte
Aufrufe; Quelltextsuche nur für Abwesenheitsprüfungen und für Dateien, die selbst
Prüfgegenstand sind. Mit dem ausdrücklichen Satz, dass die closest-analog-Regel diese Regel nie
überstimmt — der Bestand ist Altlast, kein Vorbild.

**Buchhaltung** (`229bbe4d`, `12e9b144`, `7212ee97`, `6e137767`, `6478767a`): 143/144 in
Roadmap und v1.4-Audit nachgetragen, `STATE.md` richtiggestellt, Phase-117-Historie und die
offene M-Befund-Frage notiert, Design-Entscheidung zur Projektliste in `DECISIONS.md`.

Messwerte am Ende, selbst erhoben: Frontend 289 Dateien / 2183 Tests / 0 Fehler; Go build und
vet sauber; die 144er Repository-Tests 16/16 gegen echtes Postgres.

## Sofort als Erstes: Phase 145 anlegen

**Das ist die einzige unfertige Sache dieser Sitzung.** Der Roadmap-Eintrag scheiterte zweimal
an einem serverseitigen API-Fehler (500), nicht am Inhalt.

### Phase 145: Mitgliedschafts-Grundausstattung in die Rechte-Registry überführen

Am Code verifiziert (2026-09-03):

- `membershipBaselineActions` in `backend/internal/permissions/effective_rights.go:74` ist ein
  Go-Slice mit drei Rechten, die jedes aktive Gruppenmitglied unabhängig von der Rolle erhält:
  `fansub_group.members.view`, `fansub_group_media.view`, `fansub_group_media.upload`.
  Ausgewertet an genau einer Stelle, `effective_rights.go:356`.
- `roleMatrix` in `permissions.go:98` steht bereits in einem Kommentarblock („Runtime authority
  is PostgreSQL"). Die Registry ist produktiv: `LoadRoleCapabilities` in
  `authz_permissions.go:400`, Startup bricht ab, wenn eine Action weder in `role_capabilities`
  steht noch standalone ist (`permissions.go:399`).
- Alle drei Baseline-Actions stehen bereits in `action_definitions` und sind dort 15 Rollen über
  `role_capabilities` zugeordnet.
- In SQL ist die Baseline nirgends nachgebaut. Die Lücke ist auf diese eine Go-Stelle begrenzt.

Die Registry kennt nur Rolle→Recht. Mitgliedschaft→Recht hat keine Darstellung — daher der
Hardcode.

**Entscheidung des Nutzers, bereits getroffen:** Darstellung als reservierte Pseudo-Rolle in
`role_definitions` plus `role_capabilities`-Zeilen (z. B. `group_member`). Nicht erneut zur
Diskussion stellen. Begründung: nutzt Lade-, Cache- und Startup-Prüfmaschinerie vollständig und
macht die Grundausstattung in der Capability-Matrix im Admin bearbeitbar.

**Randbedingungen für die Planung:**

- Die Pseudo-Rolle darf nicht in Rollen-Auswahllisten auftauchen. Die Unterscheidung „zuweisbar
  vs. capability-editierbar" existiert im Code (`permissions.go`, Kommentar bei
  `capabilityRoleCatalog`).
- Verhalten muss unverändert bleiben; die Migration seedet den Ist-Zustand.
- Persönliche Verbote (`user_deny`) müssen weiterhin ein Baseline-Recht entziehen können.
- Sicherheitsfrage: Was passiert, wenn die Zeilen fehlen? Analog zum bestehenden Startup-Check
  absichern, statt Mitglieder still ihre Rechte verlieren zu lassen.
- Es entsteht UI-Berührung (Capability-Matrix). Laut Vorgänger-Handoff daher vorher
  `/gsd-ui-phase 145` laufen lassen, damit `plan-phase` nicht am UI-Gate fragt.

**Beim Anlegen beachten:** additiv anhängen, KEIN Milestone-Reset — v1.4 ist abgeschlossen und
bleibt es. `gsd-phase` platziert neue Blöcke erfahrungsgemäß falsch; Platzierung danach prüfen
und von Hand korrigieren.

## Weiter offen

- **WR-02** — 49 Testdateien lesen eine `.go`-Quelldatei als Text und belegen Verhalten per
  `strings.Contains`, insgesamt 236 Behauptungen (handlers, repository, services). Die
  Ausbreitung ist durch die neue `CLAUDE.md`-Regel gestoppt, der Bestand nicht saniert. Eigene
  Phase, evidenz-geführt: dort ansetzen, wo die Tests wichtige Zusicherungen schützen sollen
  (Berechtigungen, Preview-Sperre), nicht alphabetisch. Details in
  [2026-09-02-altlasten-cr01-wr02.md](2026-09-02-altlasten-cr01-wr02.md).
- **Fünf Phasen ohne `VERIFICATION.md`**: 128, 130, 131, 133, 135. Dazu die zurückgestellte
  manuelle UAT von Phase 133 (visuell + Barrierefreiheit).
- **Phase-142-Arbeit** nachträglich als Requirements erfassen.
- **M3/M5/M6/M7** — diese vier Befund-Kürzel stehen nur an einer einzigen Stelle im
  Vorgänger-Handoff. Der zugehörige externe Prüfbericht existiert nicht als Datei; das ganze
  Repo wurde durchsucht. Inhaltlich unbelegt. Die laufenden Seitenprüfungen des Nutzers ersetzen
  sie faktisch.

## Drei Punkte, die NICHT mehr offen sind

Damit sie nicht erneut als Schuld auftauchen:

- **Projektlisten-„Erledigt"** ist eine bewusste Entscheidung, kein Defekt — festgehalten in
  `DECISIONS.md` (2026-09-03). Die Projektliste beantwortet Beitragsvollständigkeit, das
  Dashboard beantwortet Überarbeitungsbedarf. Der Phase-144-Code-Review hat es als Befund
  gemeldet; ohne den Eintrag meldet der nächste Review es wieder.
- **Phase 117 ist nicht verloren.** Sie liegt unter
  `.planning/milestones/pre-v1.3-recovery-2026-08-13/phases/117-kara-segment-zeit-override-anzeige/`,
  ausgeführt bis 117-08, Restlücke 117-09 nachträglich per Quick-Task 260819-lm5 geschlossen
  (`117-10-POST-HOC-CLOSURE.md`, Live-UAT abgenommen). **Lehre:** ein fehlendes Verzeichnis
  unter `.planning/phases/` heißt nicht „verloren" — abgeschlossene Milestones werden nach
  `.planning/milestones/<name>/phases/` verschoben, dort ebenfalls suchen.
- **Retroaktive Code-Prüfung der Phasen 136–141** ist nicht nötig. Der Nutzer lässt fortlaufend
  **seitenbezogene** Qualitätsprüfungen laufen und hat dafür bereits eine eigene Liste.
  Prüfungszuschnitt an einer Seite festmachen, nicht an einer Phasennummer. Keine
  chronologischen Nachhol-Läufe vorschlagen.

## Arbeitsweise, die sich erneut bewährt hat

Nachmessen statt Berichte übernehmen — in dieser Sitzung dreimal entscheidend:

- Der Code-Review nannte CR-01 eine „Regression" der Phase 144. Falsch: der `catch` ohne `throw`
  steht schon in `17cca9fb`, dem Stand vor der Phase.
- Der Review bezifferte WR-02 auf fünf Tests in zwei Dateien. Tatsächlich 49 Dateien mit 236
  Behauptungen — und das Muster hat sich während dieser Phase weiter ausgebreitet.
- Eine Behauptung aus dem Sitzungsgedächtnis („Phase 117 ausführbereit, vor Wave 1 gestoppt")
  war veraltet und falsch. Die GSD-Session hat angehalten und widersprochen, statt sie in den
  Audit zu schreiben. Genau richtig — Gedächtnisstände altern, Artefakte nicht.
