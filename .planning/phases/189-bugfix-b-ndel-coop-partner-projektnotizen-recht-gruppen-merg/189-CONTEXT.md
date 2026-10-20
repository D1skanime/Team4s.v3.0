# Phase 189: Bugfix-Bündel — Coop-Partner, Projektnotizen-Recht, Gruppen-Merge-Guard — CONTEXT

**Quelle des Auftrags:** Nutzerauftrag vom 2026-10-20, additiv an ROADMAP angehängt, kein neues
Milestone, kein Reset. Dieses Dokument ist reine Ist-Analyse + offene Fragen — **nicht geplant,
nicht ausgeführt, keine Produktcode-Änderung.**

## Problem (laut Auftrag) — drei unabhängige Bugs, gebündelt

1. **Coop-Partner-Bug** (`.planning/todos/pending/2026-10-20-bug-projektseite-coop-partner.md`,
   Status im Todo: `decided`): Die Projektseite `/anime/<animeId>/group/<groupId>` zeigt unter
   „Coop-Partner" fälschlich alle anderen Gruppen, die denselben Anime bearbeitet haben, auch ohne
   gemeinsames Release. Gruppen sind zudem nicht/falsch klickbar.
2. **Projektnotizen-Rechte-Bug** (`.planning/todos/pending/2026-10-20-projektnotizen-falsche-action.md`,
   Status im Todo: `open`): Der Schreib-Handler für Projektnotizen prüft die gruppenweite Action
   `fansub_group.notes.write` statt der vorgesehenen `anime_fansub_project.notes.write` —
   bestätigte Projektrollen (`anime_contribution_roles`) zählen nicht.
3. **Fansub-Gruppen-Merge ohne Guard** (`.planning/todos/pending/2026-10-19-fansub-gruppen-merge-ungeschuetzter-pfad.md`,
   aus Phase 187 ausgelagert): Der Merge zweier Fansub-Gruppen aktualisiert
   `release_version_groups` ohne Prüfung auf abhängige Credits/Crew-Snapshots — der in Phase 187
   gebaute Abhängigkeits-Guard für den direkten Gruppenwechsel greift hier nicht.

**Explizit NICHT Teil dieser Phase:** Keycloak-Account-Konsole-Fehler, Hinweis an fremde Gruppen
senden, Releases ohne Jellyfin-Datei, Mehrsprachigkeit, Theme-Video-Ton-Profileinstellung — alle
bleiben unverändert als offene Todos liegen.

## Nutzerentscheidungen (final gesetzt — nicht neu verhandeln)

### D-01 — Scope: genau diese drei Bugs, additiv, kein neues Milestone
Diese Phase bearbeitet ausschließlich die drei oben genannten Bugs. Additiv an die bestehende
ROADMAP angehängt (nach Phase 188), kein Milestone-Reset, kein neuer Meilenstein.

### D-02 — Coop-Partner: Zielverhalten wie im Todo spezifiziert (bereits vom Nutzer entschieden)
- „Coop-Partner" = nur Gruppen mit mindestens einem **gemeinsamen Release** (beide in
  `release_version_groups` derselben `release_version` dieses Animes). Eigene Backend-Liste
  (z. B. `coop_groups`); `other_groups` bleibt unverändert, da von der Release-Liste weiter genutzt.
- Jede Coop-Gruppe klickbar → Projektseite der Partnergruppe (`/anime/<animeId>/group/<groupId>`).
- „Weitere Gruppen zu diesem Anime" (getrennte Releases) nutzt die bestehende Chip-Komponente aus
  `releases/page.tsx` als gemeinsame, wiederverwendete Komponente (Link-Ziel per Prop), nicht
  kopiert.
- `AvatarStack` ggf. global um optionale Links erweitern statt lokalem Sondermarkup.
- „Weitere Releases dieser Episode" auf der Release-Detailseite bleibt unverändert (bereits korrekt).

### D-03 — Projektnotizen & Merge-Guard: Lösungsrichtung vorgegeben, Details offen
Für Projektnotizen ist die Lösungsrichtung vom Nutzer vorgegeben (Umstellung auf
`anime_fansub_project.notes.write` + `CanForAnimeProject`, analog Phase 188 Plan 05), aber **vor
jeder Umsetzung** ist die Rollenvergleichstabelle (wer gewinnt/verliert) vorzulegen — erledigt,
siehe Abschnitt „Ist-Zustand" unten. Für den Merge-Guard ist nur die Wurzelursache vorgegeben
(Phase-187-Guard wiederverwenden, nicht neu bauen); ob Abhängigkeiten umgezogen oder der Merge
gesperrt wird, ist explizit offen (siehe offene Fragen).

## Verbindliche Vorgaben für alle späteren Schritte (Planung + Ausführung)

- **Bestehende Komponenten/Permission-Infrastruktur/Guards wiederverwenden** — keine
  Parallel-Logik, keine hartcodierten Rollennamen in Handler/Frontend, keine seitenspezifischen
  Sonderlösungen.
- **`@/components/ui`-Primitives**, deutsche UI-Texte mit echten Umlauten.
- **Produktverhalten nie ändern, nur um Tests grün zu machen.** Tests prüfen Logik direkt (Backend
  gegen echte Postgres-Fixture), keine Render-/Klick-Simulation.
- **Dateien ≤ 450 Zeilen** — wer eine Produktdatei über dem Limit inhaltlich anfasst, teilt sie im
  selben Auftrag auf (reiner Umbau-Commit zuerst, danach die inhaltliche Änderung).
- **Testdaten für Live-UAT** nur über echte Anlegepfade bzw. vollständig wie ein Bestandsdatensatz,
  vorher selbst per curl/SQL prüfen; echte Bestandsfälle bevorzugen (z. B. `/anime/2/group/26`).
- Todo-Dateien unter `.planning/todos/pending/` sind echte Nutzeraufträge — nicht löschen, nach
  Abschluss nach `completed` verschieben.

---

## Ist-Zustand 1 — Coop-Partner-Bug

**Code-Stand bestätigt deckungsgleich mit dem Todo-Befund:**

- `getOtherGroups` (`backend/internal/repository/group_repository.go:415-454`) liefert `DISTINCT`
  alle Gruppen mit Release zu diesem Anime, ohne Bezug zur Release-Überschneidung mit der
  aktuellen Gruppe. Zwei Call-Sites, beide Package-intern: `GetGroupReleases` (Offset-Variante,
  `group_repository.go:260`) und `GetGroupReleasesCursor` (Cursor-Variante,
  `group_repository_cursor.go:286` — das ist der Pfad, den die Projektseite tatsächlich über
  `group_contributors_handler.go:267` nutzt).
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts:261`:
  `cooperationGroups: activityPage.other_groups ?? []` — ungefiltert übernommen.
- `HeroSection.tsx:62-64` filtert nur die eigene Gruppe/leeren Slug heraus, keine
  Release-Überschneidungs-Prüfung.
- `ProjectStats.tsx:81-84,109`: Links zeigen auf `/fansubs/<slug>` (Gruppenprofil) statt auf die
  Projektseite; bei mehreren Partnern (`AvatarStack`, Zeile 89-97) gibt es **gar keinen** Link —
  `AvatarStack.tsx` hat aktuell kein `href`-Feld pro Item.
- `releases/page.tsx:417-444` (`otherGroupsSection`/`otherGroupChip`) existiert exakt wie im Todo
  beschrieben, Link-Ziel ist aktuell hart auf `/anime/<animeID>/group/<id>/releases` codiert.
- **Contract:** `shared/contracts/openapi.yaml` `GroupReleasesData` (Zeile ~17387-17401) hat nur
  `group`, `episodes`, `other_groups` — kein `coop_groups`. Additive, nicht-required Ergänzung,
  kein Breaking Change.
- **Frontend-Typen:** `frontend/src/types/group.ts:69-72` und Backend-Modell
  `backend/internal/models/group.go:84-88` analog nur `other_groups`/`OtherGroups`.
- **SQL-Vorbild für „gemeinsames Release":** `countMergeVersionConflicts`
  (`fansub_repository_merge_duplicates.go:360-397`) zeigt das passende Muster (Self-Join über
  `release_version_groups`/`release_versions`, `GROUP BY release_version_id`) — als Vorlage
  geeignet, nicht zu kopieren.
- **Dateilängen:** `group_repository.go` bereits **454 Zeilen** (über dem 450-Limit — jede
  inhaltliche Erweiterung erzwingt Split, z. B. neue Datei `group_repository_coop.go`).
  `releases/page.tsx` bereits **556 Zeilen** (deutlich über dem Limit, muss ohnehin gesplittet
  werden — die geforderte Chip-Extraktion hilft hier doppelt).

---

## Ist-Zustand 2 — Projektnotizen-Rechteprüfung (inkl. Pflicht-Vergleichstabelle)

**Handler-Code:**
- `backend/internal/handlers/admin_content_anime_project_notes.go:102-106` (Upsert) und `:178-182`
  (Delete) rufen `h.requireFansubGroupNoteWriteAccess(c)` — dieselbe Guard-Funktion wie für reine
  Gruppennotizen (`admin_content_fansub_group_notes.go:19-43`), die fest `ActionFansubGroupNotesWrite`
  gruppenweit prüft (`CanForFansubGroup`), ohne `animeID`.
- Route `PUT/DELETE /admin/fansubs/:id/anime/:animeId/notes` (`admin_routes.go:237-241`) hat
  `animeId` bereits im Pfad — er wird von der Guard-Funktion schlicht nicht verwendet.
- Fertiges, direkt übertragbares Vorbild existiert bereits 1:1 für die Projektzeitraum-Prüfung aus
  Phase 188: `requireAnimeProjectTimelineWriteAccess`
  (`backend/internal/handlers/admin_content_anime_project_timeline.go:62-98`), das `animeId` parst
  und `CanForAnimeProject` aufruft.
- `CanForAnimeProject` (`backend/internal/permissions/permissions_anime_project.go:39-96`): prüft
  zuerst Gruppenrollen (`ResolveGroupRights`), dann bestätigte (`status='confirmed'`)
  `anime_contribution_roles` (`ListActorContributionRolesForAnimeProject`,
  `backend/internal/repository/authz_anime_project.go:24-65`).

**`role_capabilities` (live DB `team4s_v2`):**

| Action | Rollen |
|---|---|
| `fansub_group.notes.write` | co_leader, fansub_lead, founder, project_lead, quality_checker |
| `anime_fansub_project.notes.write` | editor, fansub_lead, project_lead, quality_checker |

Überschneidung: `fansub_lead`, `project_lead`, `quality_checker`. `co_leader`/`founder` sind NUR in
der gruppenweiten Action, `editor` NUR in der Projekt-Action.

**Vergleichstabelle — echte Daten (7 Mitglieder aus 3 bestätigten Anime-Projekten, live geprüft,
nur SELECT):**

| Mitglied | Gruppe | Projekt | Gruppenrolle(n) | Bestätigte Projektrolle(n) | Recht HEUTE | Recht NEU | Status |
|---|---|---|---|---|---|---|---|
| member 5 | New-Subs | Buddy Complex | encoder, **founder** | encoder | JA (founder) | NEIN | **VERLIERT** |
| member 6 | New-Subs | Buddy Complex | translator | translator | NEIN | NEIN | unverändert |
| member 4 | New-Subs | Buddy Complex | karaoke_fx, typesetter | karaoke_fx, typesetter | NEIN | NEIN | unverändert |
| member 7 | New-Subs | Buddy Complex | **quality_checker** | quality_checker, timer, translator, typesetter | JA | JA | unverändert |
| member 3 | New-Subs | Buddy Complex | timer | **project_lead**, timer | NEIN | **JA** | **GEWINNT** |
| member 8 | Strawhat Subs | 11eyes | editor, **project_lead**, techadmin | editor, project_lead | JA | JA | unverändert |
| member 6 | Strawhat Subs | 11eyes: Pink Phantasmagoria | **fansub_lead**, founder, techadmin | project_lead, translator | JA | JA | unverändert |

**Ergebnis:** 1 Mitglied verliert (reiner `founder`/`encoder`, keine überlappende Rolle), 1
gewinnt (bestätigte `project_lead`-Projektrolle ohne entsprechende Gruppenrolle), 5 unverändert.
`co_leader` kommt in den Live-Daten als vergebene Rolle nicht vor — der Verlust-Fall für diese
Rolle ist nur aus dem Katalog ableitbar, nicht an echten Daten beobachtbar.

**Frontend:** `can_edit_notes` (`app_auth_capabilities.go:113-117`) wird unverändert gruppenweit
berechnet, ohne `anime_id`-Zweig — anders als `can_edit_project_timeline` (Zeilen 118-136), das bei
`?anime_id=` bereits `CanForAnimeProject` nutzt. `fansubEditAccess.ts:45-48` steuert über
`can_edit_notes` auch, ob der Notizen-Tab überhaupt sichtbar ist (nicht nur das Schreibrecht selbst).
Vorbild für den Fix: `AnimeProjectTimelineSection.tsx:72` ruft
`getFansubGroupCapabilities(fansubId, undefined, { animeId })`.

**Dateilängen:** Betroffene Dateien unter dem 450-Zeilen-Limit, kein Split-Zwang bekannt (nicht
abschließend für alle Call-Sites geprüft).

---

## Ist-Zustand 3 — Fansub-Gruppen-Merge ohne Guard

**Merge-Ablauf** (`backend/internal/repository/fansub_repository_merge_core.go`, 236 Zeilen, eine
Transaktion):
1. Zeile 61-69: `UPDATE release_version_groups SET fansub_group_id=$1 WHERE fansub_group_id=ANY($2)`
   — der im Todo genannte ungeschützte Schritt.
2. Zeile 72-81: `anime_fansub_groups` migrieren (`ON CONFLICT DO NOTHING`).
3. Zeile 84-91: `fansub_members` umhängen (Kommentar im Code: „basic handling – no unique
   constraint"; Tabelle hat tatsächlich keine Unique-Constraint, aktuell 0 Zeilen gesamt, Risiko
   nicht reproduzierbar).
4. Zeile 94-130: Quell-**Slugs** (nicht die bestehenden Alias-Zeilen) werden als neue Alias-Strings
   auf die Zielgruppe eingefügt.
5. Zeile 133-137: `DELETE FROM fansub_groups WHERE id=ANY($2)` — Cascade-Delete auf
   `fansub_group_aliases` und `fansub_members`.

Die Vorprüfung `countMergeVersionConflicts` (`fansub_repository_merge_duplicates.go:360-397`)
erkennt nur doppelte `(episode_id, release_version_id, target_group_id, …)`-Kombinationen nach dem
Remapping — keine Abhängigkeits-Prüfung auf Credits/Crew/Medien/Notizen.

**Phase-187-Guard** (`backend/internal/repository/release_version_group_guard.go`, 183 Zeilen):
Zentrale, bereits im selben Package liegende, wiederverwendbare Funktion
`countReleaseVersionGroupDependents(ctx, db, releaseVersionID, fansubGroupID)` — zählt pro **einem**
`(release_version_id, fansub_group_id)`-Paar Credits, Medien, Notizen (jeweils `deleted_at IS NULL`).
Zählt bewusst **nicht** `release_crew_snapshots` (D-09 aus Phase 187). Wrapper liefert bei Treffer
einen typisierten `*GroupHasDependentsError`. Direkt aufrufbar, aber: operiert pro einzelnem
Release — für den Merge müsste man vorher alle betroffenen `release_version_id`s der Quellgruppe(n)
holen und je Paar aufrufen.

**Live-Reproduktion (nur `BEGIN…ROLLBACK`, bestätigt, keine Daten verändert) — zentraler,
vom Todo abweichender Befund:**

```
UPDATE release_version_groups SET fansub_group_id=112 WHERE fansub_group_id=ANY(ARRAY[26]);
ERROR: update or delete on table "release_version_groups" violates foreign key constraint
"release_crew_snapshots_release_version_id_fansub_group_id_fkey" on table "release_crew_snapshots"
DETAIL: Key (release_version_id, fansub_group_id)=(52, 26) is still referenced from table "release_crew_snapshots".
```

Gleicher Fehler bei einer zweiten Gruppe (25, FlameHaze-subs: 0 Credits, aber 12 Crew-Snapshots).
`database/migrations/0137_phase108_contribution_sources.up.sql` definiert für beide Kind-Tabellen
nur `ON DELETE` (CASCADE bzw. RESTRICT) — **kein `ON UPDATE`**. Postgres-Default für fehlendes
`ON UPDATE` ist `NO ACTION`: Ein `UPDATE` auf den referenzierten Composite-Key wird **immer**
blockiert, solange eine Kind-Zeile existiert — unabhängig von `ON DELETE CASCADE`. Live-Check: alle
188 von 188 `release_version_groups`-Zeilen haben eine 1:1-`release_crew_snapshots`-Gegenzeile.

**Das bedeutet: Jeder Merge einer nicht-leeren Quellgruppe scheitert heute zu 100 % hart am
Schritt-1-`UPDATE`** — nicht erst bei vorhandenen Credits, sondern sofort mit FK-Fehler und
vollständigem Transaktionsabbruch (kein Teil-Commit, kein stilles Verwaisen). Der Handler
(`fansub_merge.go:106-111`) fängt nur `ErrNotFound`/`ErrConflict` ab — der FK-Fehler landet
ungefiltert im generischen `500 "interner serverfehler beim zusammenfuehren"`.

**Nebenbefund (kleiner, separater Verlust):** Gruppe 26 hat live eine eigene Alias-Zeile
(„Strawhat" ≠ Slug `strawhat-subs`). Beim Merge wird nur der **Slug** neu als Alias angelegt; die
bestehende Alias-Zeile wird durch den Cascade-Delete in Schritt 5 ersatzlos gelöscht.

**Dateilängen:** `fansub_repository_merge_core.go` 236 Zeilen, `release_version_group_guard.go`
183 Zeilen — beide unter dem Limit.

---

## Offene Fragen an den Nutzer

### Zu Coop-Partner

**Frage 1 — `coop_groups` nur im Cursor-Endpunkt oder auch im Offset-Endpunkt ergänzen?**
Die Projektseite nutzt ausschließlich `GetGroupReleasesCursor`. `GetGroupReleases` (Offset-Variante)
wird von zwei anderen Handlern genutzt, aber nicht für die Projektseite.
*Empfehlung:* Nur im Cursor-Endpunkt ergänzen — kein Auftrag für den Offset-Pfad, vermeidet
unnötige zusätzliche Query-Last und Scope-Zuwachs.

**Frage 2 — Link-Ziel der wiederverwendeten Chip-Komponente als vollständigen Pfad oder als
Suffix parametrisieren?**
`releases/page.tsx` braucht `/anime/<id>/group/<id>/releases`, die Projektseite braucht
`/anime/<id>/group/<id>` (ohne `/releases`).
*Empfehlung:* Vollständigen Pfad per Prop/Builder-Funktion übergeben (nicht nur ein Suffix-String)
— robuster gegenüber künftigen abweichenden Zielmustern, entspricht gängigem Prop-Übergabe-Muster
im Repo.

### Zu Projektnotizen

**Frage 3 — Separate neue Capability oder Umbau der bestehenden `can_edit_notes`?**
`can_edit_notes` steuert heute sowohl das Schreibrecht als auch die Sichtbarkeit des
Notizen-Tabs. Soll sie komplett auf den projektbezogenen `CanForAnimeProject`-Pfad umgestellt
werden (analog `can_edit_project_timeline`), oder soll eine zusätzliche, separate Capability
(z. B. `can_edit_project_notes`) ergänzt werden, damit die reine Tab-Sichtbarkeit unangetastet
bleibt und nur das tatsächliche Schreibrecht projektbezogen geprüft wird?
*Empfehlung:* Separate neue Capability ergänzen (nicht `can_edit_notes` umwidmen) — vermeidet,
dass eine Änderung an der Tab-Sichtbarkeits-Logik unbeabsichtigt mit der Schreibrechts-Korrektur
vermischt wird; entspricht dem bereits etablierten Muster (`can_edit_project_timeline` als eigene,
zusätzliche Capability neben der gruppenweiten).

**Frage 4 — Soll der beobachtete reale Verlust-Fall (`founder`/`encoder` ohne überlappende Rolle)
akzeptiert werden, oder soll vorher eine kompensierende Rolle vergeben werden?**
Die Vergleichstabelle zeigt genau einen echten Verlust (member 5, New-Subs, Buddy Complex) und
einen echten Gewinn (member 3, New-Subs, Buddy Complex). Die Umstellung ist fachlich korrekt
(Projektnotizen sollen projektspezifisch berechtigt sein), ändert aber konkret den Zugriff eines
aktiven Mitglieds.
*Empfehlung:* Verlust akzeptieren — reine Gruppenleitung ohne jeden Bezug zum konkreten Projekt
soll laut Zielbild kein Projektnotizen-Schreibrecht mehr begründen; das Mitglied kann bei Bedarf
regulär als Projektrolle eingetragen werden (wie beim Timeline-Bug in Phase 188 analog akzeptiert).

**Frage 5 — Soll `role_capabilities` für `anime_fansub_project.notes.write` zusätzlich um
`co_leader`/`founder` erweitert werden, um den katalogseitigen Rechteverlust für reine
Gruppenleitungsrollen abzufedern?**
Unabhängig von Projektrollen verlieren `co_leader`/`founder` strukturell die Qualifikation für die
neue Action, da sie nur in `fansub_group.notes.write` stehen (analog zur `fansub_lead`-Ergänzung
in Phase 188, D-10, für die Timeline-Action).
*Empfehlung:* Nicht erweitern — Gruppenleitung allein soll laut dem Bug-Befund gerade NICHT mehr
automatisch Projektnotizen-Schreibrecht verleihen; eine Erweiterung würde den Kern der Korrektur
unterlaufen. Falls gewünscht, wäre dies ein expliziter separater Rechte-Matrix-Entscheid, kein
technischer Zwang.

### Zu Fansub-Gruppen-Merge

**Frage 6 — Abhängigkeiten beim Merge aktiv umziehen oder Merge bei vorhandenen Abhängigkeiten
sperren?**
Heute scheitert JEDER Merge einer nicht-leeren Quellgruppe hart am FK-Fehler (100 % der
Bestandsgruppen mit Releases betroffen, da `release_crew_snapshots` immer 1:1 vorhanden ist). Eine
reine Vorprüfung (wie der Phase-187-Guard) würde das Problem nur sichtbar machen, nicht lösen,
solange `release_crew_snapshots` nicht mitgezählt oder mit umgezogen wird (siehe Frage 7).
Zwei grundsätzliche Richtungen: (a) **Sperren mit klarer Meldung** — Merge nur erlaubt, wenn keine
Abhängigkeiten bestehen (entspricht dem heutigen De-facto-Verhalten, nur mit verständlicher
deutscher Fehlermeldung statt 500er); oder (b) **Umziehen** — Credits/Crew-Snapshots/Medien/Notizen
aktiv per `UPDATE`/`DELETE+INSERT` auf die Zielgruppe umhängen, damit der Merge auch bei
vorhandenen Abhängigkeiten gelingt.
*Empfehlung:* (a) Sperren — entspricht dem heutigen tatsächlichen (wenn auch unklar
kommunizierten) Verhalten, ist deutlich risikoärmer (kein Datenumhängen über mehrere Tabellen mit
Nebenwirkungen auf Lifecycle-Historie) und passt zum bereits in Phase 187 gewählten Muster
(Stufe 2: serverseitig gesperrt mit deutscher Meldung statt FK-Fehler). Ein Merge betroffener
Gruppen würde den Admin stattdessen anleiten, zuerst die abhängigen Releases einzeln umzuhängen
(bestehender Phase-187-Pfad), bevor der Merge möglich ist.

**Frage 7 — Soll die Guard-Zähllogik für den Merge-Fall `release_crew_snapshots` einschließen,
abweichend von der explizit in Phase 187 (D-09) getroffenen Entscheidung, Crew-Snapshots NICHT zu
zählen?**
Ohne Einbeziehung von `release_crew_snapshots` würde der Guard bei jedem Merge „0 Dependents"
melden und die Transaktion trotzdem am FK-Fehler scheitern (siehe Live-Reproduktion) — der Guard
allein reicht hier nicht aus, unabhängig von der Antwort auf Frage 6.
*Empfehlung:* Ja, für den Merge-Fall einschließen — die Phase-187-Entscheidung (D-09) bezog sich
auf den direkten Gruppenwechsel an einem einzelnen Release, wo „geerbte"/geringwertige
Crew-Snapshot-Einträge bewusst nicht blockieren sollten; beim Merge mehrerer kompletter
Release-Bestände ist die reale Blockade (100 % FK-Fehler-Rate) ein anderes Risiko-Niveau, das die
ursprüngliche Ausnahme nicht mehr trägt.

**Frage 8 — Soll der Alias-Verlust (bestehende Alias-Zeile der Quellgruppe wird beim Merge
ersatzlos durch Cascade-Delete entfernt, nur der Slug wird neu angelegt) im selben Zug mitbehoben
werden?**
Kleinerer, unabhängiger Nebenbefund, nicht Kern des Todo-Auftrags.
*Empfehlung:* Mitbeheben, da es dieselbe Datei/denselben Merge-Code-Pfad betrifft und der Aufwand
(bestehende Alias-Zeilen vor dem Cascade-Delete zusätzlich migrieren, analog zum bereits
vorhandenen Slug-Migrations-Schritt) gering ist — sonst müsste dafür ein eigenes Folge-Todo
angelegt werden, was bei ohnehin geöffnetem Code unnötiger Overhead wäre.

---

## Nächster Schritt

Dieses Dokument wartet auf Antworten zu Fragen 1-8. Erst danach `/gsd:plan-phase 189` (oder
`/gsd:discuss-phase 189`, falls weitere Rückfragen nötig werden).
