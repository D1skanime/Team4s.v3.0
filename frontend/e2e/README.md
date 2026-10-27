# Team4s E2E-Testanmeldung (Playwright)

Rollenbasierte End-to-End-Tests gegen den echten Login-Pfad, damit auch autonome KI-Aufträge
ohne manuelle Passworteingabe prüfen können, ob Berechtigungen im Frontend und Backend wirklich
greifen.

## Voraussetzungen

Der laufende lokale Docker-Dev-Stack (`docker compose up`) sowie `jq`, `openssl` und `curl` auf
dem ausführenden Host. `scripts/e2e.sh` prüft diese drei Kommandozeilenwerkzeuge selbst und
bricht mit einer klaren Fehlermeldung ab, falls eines fehlt.

## Einstiegspunkt

```bash
bash scripts/e2e.sh
```

Das ist der einzige Befehl, den ein Agent oder eine CI-Pipeline braucht. Er führt in dieser
Reihenfolge aus und bricht bei jedem Fehler mit einem Exit-Code ungleich 0 ab (auch wenn am Ende
0 Tests gelaufen sind):

1. `scripts/e2e/provision.sh` — legt idempotent die 5 Keycloak-Testkonten an und stellt die
   DB-Fixtures für "E2E Gruppe A" sicher (siehe unten). Ein erneuter Lauf erkennt bereits
   vorhandene Konten/Mitgliedschaften und überspringt sie, statt Duplikate zu erzeugen.
2. `npm run typecheck:e2e` im `frontend/`-Verzeichnis — prüft `playwright.config.ts` und
   `frontend/e2e/**` separat vom normalen Next.js-Typecheck (siehe `tsconfig.e2e.json`), damit ein
   kaputter Typ als klare Fehlermeldung auffällt statt als verwirrender Playwright-Laufzeitfehler.
3. `npx playwright test` im `frontend/`-Verzeichnis — meldet jede Rolle über das echte,
   Keycloak-gehostete Login-Formular an (`frontend/e2e/auth.setup.ts`) und führt danach die
   vier Rollen-Specs aus.

Das Skript läuft gegen den laufenden lokalen Docker-Dev-Stack. Backend- und Keycloak-Basis-URL
(`E2E_API_BASE`/`E2E_KC_BASE`) leitet `scripts/e2e/_env-defaults.sh` automatisch aus den
tatsächlichen `BACKEND_PORT`/`KEYCLOAK_PORT` der lokalen `.env` ab (derselben Datei, die
`docker compose` selbst beim Start liest) — fällt kein Wert dort, greifen die reinen
`docker-compose.yml`-Standardports `8092`/`8081`. Die Frontend-Basis-URL ist weiterhin per
`E2E_BASE_URL` überschreibbar (Standard `http://127.0.0.1:3000`).

## Die 5 Testrollen

Alle Konten liegen unter der Dev-only-Domäne `@team4s.test` und sind strikt von den echten
`*@team4s.de`-Konten (Passwort `123`) getrennt — letztere werden von keinem E2E-Skript je
angefasst.

| Konto | Realm-Rolle | Live-Mitgliedschaft in "E2E Gruppe A" | Geprüft durch |
|---|---|---|---|
| `e2e-admin@team4s.test` | `platform_admin` | — | sieht die Admin-Benutzerliste |
| `e2e-leader@team4s.test` | `user` | `fansub_lead` | sieht "Eingehende Hinweise" + "Offene Vorschläge" im Tab "Fansub Members" |
| `e2e-deputy@team4s.test` | `user` | `fansub_lead` (zweite Leitung — siehe Hinweis unten) | provisioniert, noch ohne eigene Spec |
| `e2e-member@team4s.test` | `user` | einfaches Mitglied (historisch verlinkt, keine Live-Rolle) | kein Button + 403 bei der geschützten Bearbeitung |
| `e2e-user@team4s.test` | `user` | keine | erreicht `/admin/users` nicht |

**Hinweis zu "Stellvertretung":** Das Live-Berechtigungsmodell kennt nur eine Leitungsrolle
(`fansub_lead`). Es gibt keine separate Stellvertretungsrolle in der Datenbank. `e2e-deputy`
ist deshalb als zweite Leitung derselben Gruppe modelliert — siehe Begründung im
`DECISIONS.md`-Eintrag "E2E-Testanmeldung".

## Passwörter

Die Skripte erzeugen bzw. lesen Passwörter ausschließlich aus `~/.config/team4s-e2e.env`
(Rechte `0600`, außerhalb des Repos, nie committed). Fehlt ein Eintrag, wird beim nächsten Lauf
ein neues, zufälliges Passwort generiert und dort gespeichert — danach bleibt es stabil, bis die
Datei gelöscht wird. Passwörter erscheinen nie in Shell-Ausgaben, Logs, Commits oder
Playwright-Reports.

## Reset

- `bash scripts/e2e/reset-fixtures.sh` — setzt sowohl die DB-Fixture als auch die 5
  Keycloak-Testkonten tatsächlich zurück:
  1. **Setzt ein vollständiges, lokales Manifest zwingend voraus.** Fehlt das Manifest (z. B. weil
     nur die Secrets-Datei existiert, aber keine abgeschlossene Provisionierung), bricht das
     Skript **vor jeder DB- oder Keycloak-Mutation** mit `Exit != 0` ab und verweist auf
     `bash scripts/e2e/provision.sh` — die Fixture-Gruppe wird **nicht mehr** ersatzweise über
     ihre festen Konstanten (`slug = 'e2e-gruppe-a'`, `kuerzel = 'e2e-fixture-261026-wve'`)
     gesucht, wenn kein Manifest existiert. Eine abgebrochene oder unvollständige Provisionierung
     wird **ausschließlich** durch das idempotente `provision.sh` aufgeräumt bzw. fortgesetzt, nie
     durch diesen Reset. Fehlen sowohl Manifest als auch Secrets-Datei, ist das kein Fehler,
     sondern bedeutet "nichts zurückzusetzen" (`Exit 0`).
  2. Das vorhandene Manifest muss alle acht Pflichtfelder (`fansub_group_id`,
     `historical_member_id`, die drei `app_user_id`-Felder, die drei `member_id`-Felder)
     vollständig und numerisch enthalten — fehlt eines oder ist es nicht numerisch, bricht das
     **gesamte** Skript ohne jede Mutation ab. Die Fixture-Gruppe wird danach **anhand der
     Manifest-ID** gesucht; `slug = 'e2e-gruppe-a'` und `kuerzel = 'e2e-fixture-261026-wve'` sind
     dabei nur eine **zusätzliche**, in derselben Abfrage mitgeführte Prüfung neben dieser ID, kein
     eigenständiger Ermittlungsweg — findet sich keine Zeile, die gleichzeitig die Manifest-ID
     **und** beide Konstanten erfüllt, bricht das Skript ab. Für alle drei Rollen (leader/
     deputy/member) werden außerdem die tatsächliche `app_users`-ID **und** die tatsächliche
     `member_id` **immer live aus der Datenbank** aufgelöst — die `member_id` ausschließlich über
     einen **verifizierten** `member_claims`-Datensatz (`claim_status='verified'`), ausgehend von
     der für die Rolle exakt erwarteten E-Mail (dieselbe Kette, die serverseitig beim Anlegen
     entsteht: `ensureAppUserMemberAnchorTx()`/`upsertVerifiedAppMemberClaimTx()` in
     `backend/internal/repository/fansub_group_app_members_repository.go`). Das Manifest muss
     dessen `app_user_id` **und** `member_id` pro Rolle exakt dieser live aufgelösten
     Referenzkette entsprechen — ein manipuliertes Manifest mit der (numerisch gültigen) ID eines
     fremden `app_users` oder einer fremden `members`-Zeile bricht damit ab, ohne dass diese ID je
     in einer Mutation verwendet wird. Bei jeder Abweichung bricht das **gesamte** Skript ohne
     jede Mutation ab (auch die Keycloak-Löschung wird dann nie erreicht).
  3. Löscht danach in **einer einzigen Transaktion**: die `app_users`-Zeilen für **alle 5**
     erlaubten E2E-Adressen (`e2e-admin/leader/deputy/member/user@team4s.test`, ausschließlich über
     exakte E-Mail-Gleichheit, niemals `LIKE`/Muster) samt ihrer Legacy-Bridge-Zeile in `users`
     (sonst bliebe dort dauerhaft eine verwaiste, per eigenem `uq_users_username` eindeutige Zeile
     liegen), den historischen Eintrag (`scoped` auf die verifizierte Gruppen-ID), die
     `member_claims`- und `members`-Zeilen der drei live aufgelösten `member_id`s (sonst bliebe die
     bei der Provisionierung über `CreateWithAutoMember` angelegte `members`-Identität samt
     `verified`-Claim nach jedem Reset bestehen — `member_claims.app_user_id` ist `ON DELETE SET
     NULL`, nicht `CASCADE` — und jeder `provision→reset→provision`-Zyklus würde weitere
     E2E-Fixture-Daten anhäufen) und zuletzt die Fansub-Gruppe selbst. Die Gruppen-Löschung steckt
     in einem PL/pgSQL-`DO`-Block, der die Zeilenzahl der eigenen `DELETE`-Anweisung per `GET
     DIAGNOSTICS` prüft und bei `!= 1` eine Exception auslöst — das bricht die **gesamte
     Transaktion serverseitig** ab (kein `COMMIT` erreicht die vorherigen Löschungen), statt nur
     nachträglich clientseitig nach einem bereits erfolgten `COMMIT` zu prüfen. Nie ein
     `TRUNCATE`, nie ein schemaweiter Reset, im selben Muster wie
     `scripts/reset-member-profile-fixture.sh`. Die Admin-HTTP-API bietet für die
     Gruppen-/Mitgliedschafts-Löschung bewusst keinen Hard-Delete (verifiziert über eine
     vollständige Durchsicht aller registrierten Routen), deshalb der direkte, aber eng begrenzte
     SQL-Zugriff.
  4. Löscht die 5 Keycloak-Konten (eigene `kcadm`-Admin-Session, unabhängig von `e2e-admin`s
     eigenem Passwort) und entfernt `~/.config/team4s-e2e.env`, sodass der nächste
     `provision.sh`-Lauf eine komplett frische Fixture samt frischer Passwörter anlegt.

  Vor jeder Keycloak-Mutation (Passwort/Rolle/Löschung) prüfen sowohl `provision-keycloak-users.sh`
  als auch `reset-fixtures.sh` die exakt erwartete `@team4s.test`-E-Mail des per Username
  gefundenen Kontos — ein Nicht-E2E-Konto mit zufällig demselben Username (z. B. ein reales
  `e2e-admin@team4s.de`) wird dadurch **nie** verändert oder gelöscht; bei Abweichung bricht das
  jeweilige Skript ohne jede Mutation an diesem Konto ab.
- `bash scripts/e2e/provision.sh` — stellt die Fixtures danach (oder bei Bedarf jederzeit)
  erneut idempotent sicher, egal ob frisch oder bereits vorhanden. Die Gruppe wird bei der
  Erstellung mit einem festen `kuerzel` (`e2e-fixture-261026-wve`) markiert — **in derselben
  `POST /fansubs`-Anfrage**, die die Gruppe erzeugt, nicht in einem separaten, abbruchanfälligen
  Schritt danach. Eine spätere Slug-Kollision (Gruppe `e2e-gruppe-a` existiert bereits) wird deshalb
  rein serverseitig verifiziert: Stimmt das `kuerzel` der gefundenen Gruppe überein, ist sie
  nachweislich die eigene Fixture, egal wie und wann der vorherige Lauf abgebrochen wurde (sogar
  bei einem Abbruch unmittelbar nach der erfolgreichen `201`-Antwort, bevor irgendeine lokale Datei
  geschrieben wurde) — kein lokales Manifest nötig, um diese Sicherheit zu erreichen. Stimmt das
  `kuerzel` nicht überein (oder fehlt), bricht das Skript **vor jeder Mutation** ab, statt eine
  möglicherweise fremde Gruppe stillschweigend zu übernehmen.
- `bash scripts/e2e.sh` — kompletter, erneut idempotenter Durchlauf von Provisionierung bis
  Testlauf (ruft `reset-fixtures.sh` nicht auf).
