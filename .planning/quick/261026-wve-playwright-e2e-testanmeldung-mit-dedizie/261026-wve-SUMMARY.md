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

## In diesem Lauf behoben (nach wiederholten Session-Unterbrechungen)

- Ein durch die Unterbrechung korruptes `npm install` (`@playwright/test` nur mit LICENSE/NOTICE, keine echten Package-Dateien) wurde neu installiert — das war die Ursache des ersten Quality-Gate-Fehlschlags (`TS2307`).
- Auf Hinweis eines menschlichen Gegenchecks: `frontend/e2e/**` und `playwright.config.ts` aus dem normalen `tsconfig.json` ausgeschlossen, eigene `tsconfig.e2e.json` ergänzt.
- Ein echter, reproduzierbarer Flake gefunden und behoben: AppShells linker Hover-Streifen (`edgeStrip`) öffnet sporadisch eine Navigations-Drawer, deren Backdrop den "Anmelden"-Button verdeckt. Ein erster Mausbewegungs-Workaround reduzierte die Rate nur (immer noch ca. 1 von 4 Läufen rot); die endgültige Lösung ist ein gezielter Klick-Retry (`clickAnmeldenRobust`), der eine offen gegangene Drawer über ihren eigenen Schließen-Button bzw. Escape wieder schließt und erneut klickt.
- Zwei kleine Syntax-/Logikfehler aus der zweiten Plan-Checker-Runde direkt behoben (fehlendes `-f`-Gegenteil bei `reset-fixtures.sh`s DELETE-Beispielcode, maskierter Exit-Code in Task 6s Verify-Zeile).

## Finaler Beweis (Abnahmekriterium)

Nach dem Retry-Fix: **6 aufeinanderfolgende volle Läufe von `bash scripts/e2e.sh`, alle `passed=8 failed=0 skipped=0 total=8`, Exit-Code 0.** Die Provisionierung ist nachweislich idempotent (identische IDs über alle Läufe: `fansub_group_id=155`, `leader.app_user_id=13`, `deputy.app_user_id=14`, `member.app_user_id=15`).

Zusätzlich verifiziert: `frontend`-Haupt-Typecheck (`npm run typecheck`) und der separate `tsconfig.e2e.json`-Typecheck beide fehlerfrei; `npm run lint` zeigt nur vier bereits vorbestehende, nicht mit diesem Auftrag zusammenhängende Fehler (unrelated Dateien: `capture-responsive.cjs`, ein Memoization-Hinweis, `ReleasesFilterBar.tsx`); Backend-Container lief während aller Testläufe durchgehend und akzeptierte die neue `CORS_ALLOWED_ORIGINS`-Konfiguration korrekt (bereits bestehender Config-Pfad in `backend/internal/config/config.go`, keine Go-Code-Änderung nötig).

## Bekannte Einschränkungen

- `e2e-deputy` ist provisioniert, aber Phase 1 hat keine eigene Spec dafür (laut CONTEXT.md-Entscheidung so vorgesehen — spätere Specs können das Konto identisch zu `e2e-leader` nutzen).
- "E2E Gruppe B" wurde nicht angelegt, da keine der 4 Phase-1-Specs sie benötigt (Anforderung erlaubte das ausdrücklich als "falls nötig").
- Die Passwort-Secrets-Datei `~/.config/team4s-e2e.env` muss auf jedem Rechner, auf dem `scripts/e2e.sh` läuft, einmalig vom Skript selbst erzeugt werden (kein Transport zwischen Maschinen vorgesehen, bewusst so).
