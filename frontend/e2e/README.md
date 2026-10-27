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
  1. Löscht gezielt genau die in `scripts/e2e/fixtures.manifest.json` referenzierten DB-Zeilen —
     die drei `app_users`-Konten (Leitung/Stellvertretung/Mitglied, per `GET /me` während der
     Provisionierung entstanden und mit ihrer `app_user_id` ins Manifest geschrieben) samt ihrer
     Legacy-Bridge-Zeile in `users` (sonst bliebe dort dauerhaft eine verwaiste, per eigenem
     `uq_users_username` eindeutige Zeile liegen), den historischen Eintrag und die Fansub-Gruppe
     selbst — per direktem, auf exakte IDs beschränktem SQL-`DELETE` in FK-sicherer
     Kind-vor-Eltern-Reihenfolge — **nie** ein `TRUNCATE`, **nie** ein schemaweiter Reset, genau im
     selben Muster wie `scripts/reset-member-profile-fixture.sh`. Vor jeder `app_users`-Löschung
     wird die tatsächlich gespeicherte E-Mail gegen die exakt erwartete `@team4s.test`-Adresse
     geprüft — stimmt auch nur eine nicht, bricht der gesamte DB-Fixture-Teil ohne jede Mutation ab.
     Live-Mitgliedschaften und ihre Rollen verschwinden automatisch per `ON DELETE CASCADE`. Die
     Admin-HTTP-API bietet für die Gruppen-/Mitgliedschafts-Löschung bewusst keinen Hard-Delete
     (`DELETE /fansubs/:id` lehnt mit 409 ab, solange Live-Mitgliedschaften bestehen — verifiziert
     über eine vollständige Durchsicht aller registrierten Routen: keine `DELETE` für
     `app-members`/`app_users`, kein Self-Service-Leave-Endpunkt), deshalb der direkte, aber eng
     ID-begrenzte SQL-Zugriff.
  2. Löscht die 5 Keycloak-Konten (eigene `kcadm`-Admin-Session, unabhängig von `e2e-admin`s
     eigenem Passwort) und entfernt `~/.config/team4s-e2e.env`, sodass der nächste
     `provision.sh`-Lauf eine komplett frische Fixture samt frischer Passwörter anlegt.

  Vor jeder Keycloak-Mutation (Passwort/Rolle/Löschung) prüfen sowohl `provision-keycloak-users.sh`
  als auch `reset-fixtures.sh` die exakt erwartete `@team4s.test`-E-Mail des per Username
  gefundenen Kontos — ein Nicht-E2E-Konto mit zufällig demselben Username (z. B. ein reales
  `e2e-admin@team4s.de`) wird dadurch **nie** verändert oder gelöscht; bei Abweichung bricht das
  jeweilige Skript ohne jede Mutation an diesem Konto ab.

  Fehlen sowohl Manifest als auch Secrets-Datei, ist das kein Fehler, sondern bedeutet "nichts
  zurückzusetzen".
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
