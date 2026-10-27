---
quick_id: 261026-wve
status: complete
---

# Summary: Playwright E2E-Testanmeldung mit dedizierten Testkonten

Alle 7 Tasks aus `261026-wve-PLAN.md` sind umgesetzt und committed (Branch `ki/team4s-261026-7848`):

| Task | Commit(s) | Inhalt |
|---|---|---|
| 1 | `ed54cf727` | `scripts/e2e/provision-keycloak-users.sh` — idempotentes `kcadm.sh`-Provisioning der 5 `e2e-*@team4s.test`-Konten, `platform_admin`-Rolle für `e2e-admin`, Secrets in `~/.config/team4s-e2e.env` (0600) |
| 2 | `84bf6aa50`, `4ceed1e2a` | `scripts/e2e/provision-fixtures.mjs` — API-getriebene Live-Fixture-Provisionierung ("E2E Gruppe A", Leitung/Stellvertretung als `fansub_lead`, Mitglied historisch verlinkt); Fix für die 409-Falle bei fehlender offener historischer Rolle |
| 3 | `0d4926f32` | `scripts/e2e/provision.sh` (Orchestrator) + `scripts/e2e/reset-fixtures.sh` (Manifest-gebundener Reset über `DELETE /fansubs/:id`) |
| 4 | `6f4ce9b54` | Playwright-Scaffold: `@playwright/test@1.55.0`, `frontend/playwright.config.ts`, `frontend/e2e/auth.setup.ts` (echter Keycloak-Login je Rolle), CORS-Freigabe für den direkten Host-Origin |
| 5 | `08387cc57` | 4 Rollen-Specs (Admin-Benutzerliste, Leiter-Tab-Abschnitte, Mitglied-403, Benutzer-blockiert) |
| 6 | `a7f0fbcd9`, `f8a915244` | `scripts/e2e.sh` als einziger Einstiegspunkt; `tsconfig.json`/`tsconfig.e2e.json`-Trennung; robuster Klick-Retry gegen einen AppShell-Drawer-Flake |
| 7 | `3e12c1810` | `frontend/e2e/README.md` + `DECISIONS.md`-Eintrag |
| Code-Review (intern) | `38c39b630` | 0 Blocker, 4 Warnungen + 2 Infos behoben: unreachable Fehlerdiagnose in `reset-fixtures.sh` (WR-01), fehlendes `per_page` bei 3 Idempotenz-Checks (WR-02), `typecheck:e2e` jetzt verdrahtet statt nur manuell geprüft (WR-03), feste Port-Defaults gegen `_env-defaults.sh`-Ableitung aus der lokalen `.env` ersetzt (WR-04), `SCRIPT_DIR`-Reihenfolge + `jq`/`openssl`/`curl`-Vorbedingungsprüfung (IN-01/02) |
| Unabhängiger Review (Codex), Runde 1 | `96f8ab180` | 2 High-Befunde behoben: `scripts/e2e.sh` exportierte `E2E_API_BASE`/`E2E_KC_BASE` nie selbst vor `npx playwright test` (nur `provision.sh`s eigener, nicht zurückvererbter Subprozess tat das) — der 403-Spec-Fallback-Port `18092` war nur durch Zufall mit diesem Hosts `.env`-Override identisch und wäre auf einem Standard-Dev-Stack (Port `8092`) falsch gelaufen; `auth.setup.ts` meldete `deputy` nie über das echte Login-Formular an (fehlte in `Role`/`ROLES`), obwohl die Anforderung alle 5 Rollen verlangt |

## In diesem Lauf behoben (nach wiederholten Session-Unterbrechungen)

- Ein durch die Unterbrechung korruptes `npm install` (`@playwright/test` nur mit LICENSE/NOTICE, keine echten Package-Dateien) wurde neu installiert — das war die Ursache des ersten Quality-Gate-Fehlschlags (`TS2307`).
- Auf Hinweis eines menschlichen Gegenchecks: `frontend/e2e/**` und `playwright.config.ts` aus dem normalen `tsconfig.json` ausgeschlossen, eigene `tsconfig.e2e.json` ergänzt.
- Ein echter, reproduzierbarer Flake gefunden und behoben: AppShells linker Hover-Streifen (`edgeStrip`) öffnet sporadisch eine Navigations-Drawer, deren Backdrop den "Anmelden"-Button verdeckt. Ein erster Mausbewegungs-Workaround reduzierte die Rate nur (immer noch ca. 1 von 4 Läufen rot); die endgültige Lösung ist ein gezielter Klick-Retry (`clickAnmeldenRobust`), der eine offen gegangene Drawer über ihren eigenen Schließen-Button bzw. Escape wieder schließt und erneut klickt.
- Zwei kleine Syntax-/Logikfehler aus der zweiten Plan-Checker-Runde direkt behoben (fehlendes `-f`-Gegenteil bei `reset-fixtures.sh`s DELETE-Beispielcode, maskierter Exit-Code in Task 6s Verify-Zeile).

## Finaler Beweis (Abnahmekriterium)

Nach dem Retry-Fix und vor dem internen Code-Review: **6 aufeinanderfolgende volle Läufe von `bash scripts/e2e.sh`, alle `passed=8 failed=0 skipped=0 total=8`, Exit-Code 0.** Nach den internen Review-Fixes (neue `_env-defaults.sh`-Portableitung, verdrahteter `typecheck:e2e`-Vorlauf) **2 weitere volle Läufe erneut 8/8 grün**, zusätzlich `reset-fixtures.sh` gefolgt von einem erneuten `provision.sh` einzeln verifiziert (identische IDs reproduziert: `fansub_group_id=155`, `leader.app_user_id=13`, `deputy.app_user_id=14`, `member.app_user_id=15`). Nach den Codex-Review-Fixes (E2E_API_BASE-Export in `scripts/e2e.sh`, `deputy`-Login) **2 weitere volle Läufe, beide `passed=9 failed=0 skipped=0 total=9`** (9 statt 8, da jetzt 5 statt 4 Logins im `setup`-Projekt laufen) — `e2e/.auth/deputy.json` existiert nach dem Lauf, der Member-403-Test bestand gegen den jetzt korrekt durchgereichten Port. Insgesamt 10 unabhängige volle Durchläufe ohne einen einzigen echten Fehlschlag nach dem urspünglichen Flake-Fix.

Zusätzlich verifiziert: `frontend`-Haupt-Typecheck (`npm run typecheck`) und der separate `tsconfig.e2e.json`-Typecheck beide fehlerfrei; `npm run lint` zeigt nur vier bereits vorbestehende, nicht mit diesem Auftrag zusammenhängende Fehler (unrelated Dateien: `capture-responsive.cjs`, ein Memoization-Hinweis, `ReleasesFilterBar.tsx`); Backend-Container lief während aller Testläufe durchgehend und akzeptierte die neue `CORS_ALLOWED_ORIGINS`-Konfiguration korrekt (bereits bestehender Config-Pfad in `backend/internal/config/config.go`, keine Go-Code-Änderung nötig).

## Bekannte Einschränkungen

- `e2e-deputy` wird provisioniert UND über das echte Login-Formular angemeldet (eigener `storageState` unter `e2e/.auth/deputy.json`), hat aber Phase 1 keine eigene Spec dafür (laut CONTEXT.md-Entscheidung so vorgesehen — spätere Specs können das Konto direkt wiederverwenden).
- "E2E Gruppe B" wurde nicht angelegt, da keine der 4 Phase-1-Specs sie benötigt (Anforderung erlaubte das ausdrücklich als "falls nötig").
- Die Passwort-Secrets-Datei `~/.config/team4s-e2e.env` muss auf jedem Rechner, auf dem `scripts/e2e.sh` läuft, einmalig vom Skript selbst erzeugt werden (kein Transport zwischen Maschinen vorgesehen, bewusst so).
