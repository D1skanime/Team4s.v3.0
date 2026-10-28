# Quick Task 261026-wve: Playwright E2E-Testanmeldung mit dedizierten Testkonten - Context

**Gathered:** 2026-10-26
**Status:** Ready for planning
**Modus:** Autonomer ki-run-Auftrag (261026-7848) — keine interaktive Rückfrage möglich. Alle Gray-Areas sind unten als getroffene Entscheidung mit Begründung dokumentiert, nicht als offene Frage.

<domain>
## Task Boundary

Automatisierte, wiederholbare Playwright-Testanmeldung mit dedizierten Testkonten für rollenbasierte E2E-Tests, damit KI-Aufträge künftig ohne manuelle Passworteingabe gegen Team4s testen können. Umfasst: Keycloak-Testkonten-Provisionierung, DB-Fixtures (Fansub-Gruppe mit Leitung/Stellvertretung/Mitglied), Playwright-Auth-Setup mit persistiertem `storageState`, vier erste Rollen-Specs, ein einziges Einstiegsskript `scripts/e2e.sh`, sowie Doku + Architekturentscheidung.

Vollständige Originalanforderung (6 Punkte) siehe Auftragstext im Chatverlauf — hier nicht wiederholt, aber als bindend behandelt.
</domain>

<decisions>
## Implementation Decisions

### Keycloak-Benutzeranlage (Entscheidung, keine Rückfrage möglich)
- Provisionierung läuft über `kcadm.sh` im laufenden `keycloak`-Container (`docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh ...`), analog zum bestehenden `infra/keycloak/apply-team4s-user-profile.sh`-Muster. Login mit `KEYCLOAK_ADMIN`/`KEYCLOAK_ADMIN_PASSWORD` aus `.env`.
- Idempotenz: vor jeder Anlage `kcadm.sh get users -r team4s -q username=<name>` prüfen; bei Treffer nur Passwort/Rollen nachziehen statt neu anlegen.
- E-Mail-Domäne `@team4s.test` wie vorgegeben (frei von den produktiven `@team4s.de`-Konten, Passwort `123`).
- Realm-Rolle `platform_admin` ausschließlich für `e2e-admin` zuweisen (`kcadm.sh add-roles ... --rname platform_admin`) — das ist die bestehende Realm-Rolle, kein neuer Rechte-Mechanismus. JIT-Sync übernimmt den Rest (`backend/internal/repository/authz_keycloak_sync.go`).

### Passwort-Handling (Entscheidung)
- Secret-Datei `~/.config/team4s-e2e.env` (außerhalb des Repos, `chmod 0600`), Format `E2E_PASSWORD_<ROLLE>=...` je Konto.
- Skript generiert fehlende Einträge einmalig per `openssl rand -base64 24`, schreibt sie in die Datei und verwendet denselben Wert bei jedem weiteren Lauf (liest zuerst, generiert nur bei fehlendem Eintrag) — das macht `kcadm.sh set-password` jedes Mal idempotent (gleicher Zielzustand).
- Passwörter werden nie in Shell-Ausgaben, Logs, Playwright-Reports oder Dateien im Repo sichtbar — nur innerhalb der Secret-Datei und als In-Memory-Variable während des Kcadm-Aufrufs.

### "Stellvertretung" im Datenmodell (Entscheidung mit Begründung — wichtigste Annahme)
- Das Live-Berechtigungsmodell (`fansub_group_member_roles`, Migration `0073`) kennt **nur eine** Leitungsrolle: `fansub_lead` (`models.FansubGroupMemberRoleLead`). Es gibt keine separate "Stellvertretung"-Rolle in der Datenbank oder im Permission-Service.
- **Entscheidung:** `e2e-deputy` wird als zweites Konto mit der Live-Rolle `fansub_lead` in derselben Gruppe angelegt (zweite Leitung). Das ist der nächstliegende bestehende Mechanismus und erfüllt die Vorgabe "keine neuen Rechte-Mechanismen erfinden" wörtlich — eine neue Stellvertretungsrolle zu erfinden wäre ein Verstoß gegen diese Vorgabe.
- Konsequenz: Phase-1-Rollenspecs (Punkt 4 der Anforderung) testen nur Plattform-Admin, Gruppenleitung, einfaches Mitglied und normalen Benutzer — `e2e-deputy` wird provisioniert (Punkt 1 der Anforderung verlangt das Konto), aber keine eigene Spec ist für Phase 1 vorgeschrieben. Spätere Specs können `e2e-deputy` identisch zu `e2e-leader` nutzen.

### DB-Fixtures — welcher API-Pfad (Entscheidung, kritisch für Testbarkeit)
- Es gibt zwei getrennte Fansub-Mitgliedschaftsmodelle im Code: **historisch** (`hist_fansub_group_members`/`hist_group_member_roles`, Crew-Credits, keine Live-Berechtigung) und **live** (`fansub_group_members`/`fansub_group_member_roles`, entscheidet `can_manage_members`/403-Guards). Das bestehende Seed-Skript `scripts/seed-member-profile-fixtures.mjs` nutzt NUR das historische Modell.
- **Entscheidung:** Die E2E-Fixtures müssen zusätzlich die **Live**-Mitgliedschaft über `/admin/fansubs/:id/app-members` setzen (Handler `CreateFansubGroupAppMember`), sonst scheitert jede Rollen-Spec, die `can_manage_members` prüft. Ablauf: (1) `e2e-admin` loggt sich einmal per Keycloak-Direct-Grant ein (erzeugt JIT seinen `app_users`-Eintrag und synchronisiert `platform_admin`), danach legt er als Plattform-Admin (bypass aller Gruppenrechte, siehe `backend/internal/permissions/permissions.go:139`) die Gruppe über `POST /fansubs` an; (2) jedes Testkonto loggt sich einmal ein, damit sein `app_users`-Eintrag existiert; (3) `app_user_id` je Konto über `GET /admin/fansubs/:id/app-member-candidates?q=<email>` auflösen; (4) `POST /admin/fansubs/:id/app-members` mit `roles: ["fansub_lead"]` für Leitung und Stellvertretung; für das einfache Mitglied zuerst einen historischen Eintrag über `POST /admin/fansubs/:id/group-members` anlegen und per `historical_member_id` mit `roles: []` verlinken (der Handler verlangt sonst mindestens eine Rolle oder einen historischen Link).
- Gruppen: "E2E Gruppe A" wird für alle vier Phase-1-Specs benötigt (Leitung+Mitglied). "E2E Gruppe B" wird nur angelegt, falls eine Spec sie tatsächlich braucht (laut Anforderung "falls nötig") — da Phase-1-Specs mit einer Gruppe auskommen, wird B nicht angelegt, es sei denn die Planung findet einen konkreten Bedarf.

### Reset-Mechanismus (Entscheidung)
- Manifest `scripts/e2e/fixtures.manifest.json` nach Muster `scripts/member-profile-fixture.manifest.json`: speichert die erzeugten IDs (Fansub-Gruppen-ID, `app_user_id` je Rolle, `historical_member_id` des Mitglieds) — keine Secrets.
- `scripts/e2e/reset-fixtures.sh` nach Muster `scripts/reset-member-profile-fixture.sh`: löscht ausschließlich die im Manifest referenzierte(n) Gruppe(n) über den bestehenden Endpunkt `DELETE /fansubs/:id` (FK-Kaskaden übernehmen den Rest), keine Keycloak-Benutzer werden gelöscht (Konten sind dauerhaft, nur ihre Gruppenzugehörigkeit wird zurückgesetzt). Kein TRUNCATE, kein DB-Reset — konsistent mit der Vorgabe.
- `scripts/e2e/provision.sh` ist idempotent: Re-Run erkennt vorhandene Gruppe/Mitgliedschaften (laut Manifest) und überspringt Neuanlage statt Duplikate zu erzeugen.

### Playwright — Ausführungsort (Entscheidung)
- `"playwright": "1.55.0"` ist bereits Dev-Dependency in `frontend/package.json`; Chromium-Browser-Binaries sind bereits unter `~/.cache/ms-playwright` auf dem Host (`team4s-linux`) vorhanden. `@playwright/test` ist NICHT installiert und wird ergänzt (gleiche Version `1.55.0`, damit dieselben gecachten Browser-Binaries weiterverwendet werden, kein `playwright install` nötig).
- **Entscheidung:** Playwright Test läuft vom Host aus (`cd frontend && npx playwright test`) gegen den laufenden Frontend-Container über den veröffentlichten Port (`baseURL` konfigurierbar per `E2E_BASE_URL`, Default `http://127.0.0.1:3000`). Kein Docker-Image-Rebuild, kein Anfassen von `frontend/Dockerfile`/`docker-compose.yml` — das vorhandene, bereits im Container gebackene Chromium (`frontend/Dockerfile:39`) wird für die *bisherigen* `frontend/scripts/*.mjs`-Capture-Skripte weiter genutzt, ist für diesen Task aber nicht das Ausführungsziel. Das hält den Task risikoarm (kein Antasten von Build/Compose) und erfüllt die Vorgabe "muss auf dem Linux-Dev-Stack laufen (Frontend `http://127.0.0.1:3000` bzw. Container)" über die Host-Variante.
- `storageState`-Dateien pro Rolle liegen unter einem Verzeichnis außerhalb von Git (z. B. `frontend/e2e/.auth/` + Eintrag in `.gitignore`, oder `$TMPDIR`-Unterordner — Planung entscheidet den genauen Pfad, Hauptsache nicht committed).
- Login-Selektoren: Standard-Keycloak-Basistheme (`#username`, `#password`, `#kc-login`), da kein eigenes `login.ftl` existiert.

### Umfang der Rollenspecs (keine Abweichung von Vorgabe)
- Exakt die vier in der Anforderung genannten Tests, kein Mehr, kein Weniger: Plattform-Admin sieht Admin-Benutzerliste; Gruppenleitung sieht "Eingehende Hinweise" + "Offene Vorschläge" im Tab "Fansub Members" der eigenen Gruppe; einfaches Mitglied: kein Button für die geschützte Bearbeitung (Confirm-Aktion in `ContributionsReviewSection`) UND 403 bei direktem API-Aufruf; normaler Benutzer ohne Gruppenzugehörigkeit erreicht `/admin/users` nicht (Sperrseite statt Inhalt).

### Claude's Discretion
- Exakte Playwright-Projektstruktur (ein `playwright.config.ts` mit 4 Rollen-Projekten vs. ein globales Setup + einzelne Spec-Dateien) liegt im Ermessen der Planung — Hauptsache: `auth.setup.ts` läuft einmal pro Rolle vor den Specs, erkennt abgelaufene Sessions und erneuert sie automatisch (z. B. durch Prüfen des `storageState`-Alters oder eines Validierungs-Requests vor Testlauf).
- Interner Aufbau von `scripts/e2e.sh` (reines Orchestrierungsskript vs. Aufruf mehrerer Unterskripte) liegt im Ermessen der Planung, solange Exit-Code ≠ 0 bei jedem Fehler oder 0 gelaufenen Tests garantiert ist.
</decisions>

<specifics>
## Specific Ideas

- Siehe `.planning/quick/261026-wve-playwright-e2e-testanmeldung-mit-dedizie/261026-wve-RESEARCH.md` für alle Datei:Zeile-Belege (Keycloak-Setup, Live- vs. historisches Fansub-Modell, Tab-Komponenten, 403-Guard, Admin-Benutzerliste, bestehende Playwright-Infrastruktur, Secrets-Konventionen, Dateigrößen).
- `frontend/src/lib/api/client.ts` (1095 Zeilen) ist bereits über dem 450-Zeilen-Limit — für diesen Task NICHT anfassen (Playwright-Code braucht keine Änderung dort); neue Helfer-Dateien stattdessen separat halten.
- Betroffene/neue Dateien (Richtwert, Planung kann anpassen): `scripts/e2e/provision.sh`, `scripts/e2e/seed-fixtures.sh` (oder in `provision.sh` integriert), `scripts/e2e/reset-fixtures.sh`, `scripts/e2e/fixtures.manifest.json` (wird zur Laufzeit erzeugt, nicht vorab), `scripts/e2e.sh`, `frontend/playwright.config.ts`, `frontend/e2e/auth.setup.ts`, `frontend/e2e/admin-user-list.spec.ts`, `frontend/e2e/fansub-leader-tabs.spec.ts`, `frontend/e2e/member-protected-edit.spec.ts`, `frontend/e2e/user-blocked-admin.spec.ts` (Namen exemplarisch), `frontend/package.json` (+`@playwright/test`), `docs/E2E-TESTANMELDUNG.md` oder `frontend/e2e/README.md`, `DECISIONS.md` (neuer Eintrag).
</specifics>

<canonical_refs>
## Canonical References

- `CLAUDE.md` (Projektregeln: Dateigröße ≤450 Zeilen beim Anfassen aufteilen, Umlaute-Pflicht, globale UI-Primitives — hier nicht relevant da kein UI-Code, Doku-Pflicht bei Code-Änderung).
- `scripts/README-manifest.md`, `scripts/README-seed.md`, `scripts/reset-member-profile-fixture.sh`, `scripts/member-profile-fixture.manifest.json` — Manifest-/Reset-Muster, das 1:1 für `scripts/e2e/` übernommen werden soll.
- `infra/keycloak/apply-team4s-user-profile.sh` — Muster für `kcadm.sh`-Aufrufe im laufenden Container.
- `DECISIONS.md` — Format für den neuen Architekturentscheidungs-Eintrag.
</canonical_refs>
