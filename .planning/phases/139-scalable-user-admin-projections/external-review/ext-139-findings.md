---
phase: 139-scalable-user-admin-projections
type: external-review
status: advisory
---

# Phase 139 — External Planning Pack: Cross-Check Findings

## Was ist das hier?

`external-review/` enthält ein extern erzeugtes Planungspaket für Phase 139
(`ext-139-01-plan.md` … `ext-139-06-plan.md`, `ext-139-research.md`, `ext-139-ui-spec.md`,
`ext-README-EXECUTION.md`).

**Diese Dateien sind NICHT die Phasenpläne.** Sie heißen bewusst `ext-*-plan.md` statt
`139-NN-PLAN.md`, damit GSD sie nicht als ausführbare Pläne einliest. Sie dienen als
Gegenprüfung und als Eingabe für Research/UI-Spec.

Autoritativ als Entscheidungsgrundlage übernommen wurden dagegen:
- `139-CONTEXT.md` — Scope, Abgrenzung, bindende Entscheidungen
- `139-DISCUSS.md` — D01…D27

`ext-139-ui-spec.md` ist ein Entwurf und soll als Eingabe in die GSD-UI-Spec einfließen, damit
diese durch das UI-Checker-Gate läuft.

---

## Verifizierter Stand (2026-08-24, gegen den echten Code auf team4s-linux geprüft)

### Was am externen Paket belastbar ist

Deutlich präziser als das Phase-138-Paket. Direkt nachgeprüft:

- Die vier Roh-Arrays heißen exakt wie behauptet:
  `ProjectDefaults` / `ReleaseOverrides` / `OpenDisputes` / `LegacyHistorical`
  (`backend/internal/models/admin_users.go:180-183`).
- Die Media-DTO-Felder stimmen wörtlich: `PublicURL`, `FileSizeBytes`, `OwnerContext` — letzteres
  trägt im Code sogar den Kommentar `// z. B. "release_version:42"` (`admin_users.go:191-194`).
- `episodes.sort_index` und `episodes.episode_number` existieren beide.
- `release_crew_snapshots.snapshot_mode` existiert mit
  `CHECK (snapshot_mode = ANY (ARRAY['inherited','independent']))`.
- Der eager Fan-out steht tatsächlich in `UserGroupRightsTab.tsx:83`:
  `memberships.map((membership) => getEffectiveRights(membership.fansub_group_id, userId))`.
- Alle übrigen genannten Code-Nahtstellen existieren: `admin_users_tab_repository.go`,
  `admin_users_handler.go`, `release_version_media_repository.go`, `AnimeGroupCard.tsx`,
  `UserMediaTab.tsx`, `/me/releases/[versionId]/workspace/page.tsx`,
  `database/migrations/0137_phase108_contribution_sources.up.sql`.
- Die Einschätzung, dass Phase 138 nur `release_version_label` und `episode_number` ergänzt und
  Phase 139 bewusst nicht vorweggenommen hat, ist korrekt.

Ebenfalls brauchbar: der Wellenschnitt (Backend-Projektionen parallel → UIs → Gate) und die
Scope-Grenzen im README (kein Claims-/Audit-/Rollen-Redesign, kein Media-Editor, kein Metabase,
kein Client-Regrouping, Counts und Items aus derselben gefilterten Projektion).

### Lücken — hier ist das Paket nachzubessern

**F-01 (schwer) — Der identische Fan-out im Übersichts-Tab fehlt.**
`frontend/src/app/admin/users/tabs/UserOverviewTab.tsx:148` enthält exakt dasselbe Muster wie der
Rechte-Tab:
`membershipsResp.memberships.map((membership) => getEffectiveRights(membership.fansub_group_id, userId))`
(plus ein zweites `Promise.all` auf Zeile 143 für Memberships und Matrix).

`ext-139-05-plan.md` listet unter `files_modified` ausschließlich `UserGroupRightsTab.tsx`. Damit
würde der Fan-out in dem Tab behoben, den ein Admin bewusst öffnet, und in dem stehen bleiben, der
**beim Öffnen jedes Benutzers automatisch lädt** — der Übersichts-Tab ist der Standardtab (D-03).
Das ist der wirksamere der beiden Fälle. UADM-06 ist ohne ihn nicht ehrlich erfüllt.

Die Planung muss `UserOverviewTab.tsx` mit abdecken. Dabei ist zu beachten, dass die Übersicht laut
D-05 eine **kompakte Zusammenfassung je Gruppe** zeigt (Rolle plus wenige Schlüsselrechte) — die
Lösung muss also entweder eine gebündelte serverseitige Zusammenfassung liefern oder die
Rechteanzeige dort auf das beschränken, was ohne Fan-out beschaffbar ist. Die Phase-138-Semantik
(D-05-Inhalt der Übersicht) darf dabei nicht heimlich verändert werden; wird sie es doch, ist das
explizit zu melden.

**F-02 (mittel) — `shared/contracts/admin-users.yaml` existiert nicht.**
`ext-139-01-plan.md`, `-03` und `-05` führen die Datei unter `files_modified`, als wäre sie
vorhanden. Im Verzeichnis `shared/contracts/` liegen u. a. `admin-capabilities.yaml` und
`admin-content.yaml`, aber **keine** `admin-users.yaml`; die Admin-User-Endpunkte haben derzeit
überhaupt keinen eigenen Contract.

Die Planung muss entscheiden und benennen: neue Datei anlegen und in `openapi.yaml` registrieren,
oder die neuen Projektions-Shapes in einen bestehenden Contract aufnehmen. Stillschweigend eine
nicht existierende Datei zu „ändern" führt sonst zu einem Plan, der beim Ausführen improvisiert.

**F-03 (schwer für die Abnahme) — Die Kernfunktion hat keine Live-Daten.**
Live gegen `team4s_v2` gezählt: `release_crew_snapshots` enthält **13 Zeilen, alle
`snapshot_mode = 'inherited'`, null `independent`**.

Die gesamte Override-Erkennung aus D04/D05 — „`independent` muss gegen den Projektstandard
verglichen werden, bevor es Abweichung heißt" — hat damit in der echten Datenbank nichts zu
vergleichen. Folgen:
- Automatisierte Tests können den Fall abdecken (`ext-139-01-plan.md` Task 4 fordert bereits
  Fixtures mit `inherited`, `independent`-aber-gleich und echten Abweichungen — das ist gut).
- Eine **Live-UAT der Abweichungserkennung ist ohne eingespielte Daten unmöglich**: Die
  Oberfläche wird schlicht keine einzige Abweichung zeigen, und der Filter `Nur Abweichungen`
  liefert eine leere Liste. Genau dieses Muster hat in Phase 138 den non-deniable-Fall blockiert
  (siehe `138-HUMAN-UAT.md`, GAP-03).

Die Planung muss dafür einen bewussten Weg festlegen: entweder ein reproduzierbares Seed-Skript
für ein Demo-Projekt mit echten Abweichungen, oder die ausdrückliche Feststellung, dass dieser
Teil ausschliesslich automatisiert abgenommen wird. Nicht offenlassen.

### Weitere Hinweise für die Planung

- Der Umfang ist mit 6 Plänen knapp bemessen: zwei vollständige Backend-Projektionen, zwei
  UI-Neubauten, Rechte-Skalierung und ein Gate. Zum Vergleich: Phase 138 brauchte 18 Pläne bei
  vergleichbarer Breite. Kein Automatismus, aber ein Prüfpunkt.
- Baseline-Schuld korrekt benannt: `139-CONTEXT.md` verlangt, den Ist-Stand vor Ausführung
  festzuhalten und unveränderte Alt-Fehler nicht Phase 139 anzulasten. Der Stand nach Phase 138 ist:
  fünf vorbelastete Frontend-Testdateien (`FansubAppMembersSection`, `fansubs/[id]/edit/page`,
  `useGroupMembersTab`, `UserContributionsTab`, `ResponsiveImage.config`) mit 25 Fehlern, sowie
  ~29 Backend-Fehler durch nil `permissions.Service.LoadCache` in `testmain_test.go`.
- `UserContributionsTab.test.tsx` ist bereits vorbelastet rot (2 Fehler, Ursache Phase-136-
  Farbnormalisierung). Plan 02 baut genau diese Datei um — dort ist besonders sauber zu trennen,
  was Altlast war und was neu bricht.

---

## Prüfliste für die GSD-Pläne

Nach `plan-phase` gegen diese Punkte abgleichen:

1. Ist `UserOverviewTab.tsx` beim Fan-out-Abbau mit abgedeckt? → F-01
2. Ist entschieden und benannt, wo die neuen Contract-Shapes leben? → F-02
3. Gibt es einen festgelegten Weg zur Abnahme der Abweichungserkennung (Seed oder
   „nur automatisiert")? → F-03
4. Sind Counts und Items nachweislich aus derselben gefilterten Projektion? → D24
5. Gibt es Query-Count-Gates, die unabhängig vom Datenvolumen bleiben? → D25/QUAL-06
6. Bleibt die Phase-138-Rechte-Semantik unangetastet (Guided Revoke/Grant, Impact, Provenienz)? → D21
