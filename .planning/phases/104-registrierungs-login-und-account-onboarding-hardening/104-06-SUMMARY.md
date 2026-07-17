# Plan 104-06 Summary — Integrierte Live-UAT

**Plan:** 104-06 (type: verification, autonomous: false — human-verify checkpoint)
**Status:** Abgeschlossen — UAT BESTANDEN
**Datum:** 2026-07-17

## Was getan wurde

Integrierte Live-UAT der Phase 104 ausschließlich über sichtbare UI, Start auf
`http://127.0.0.1:3000/`. Umgebung vorab auf 104-Stand gebracht: Frontend neu gestartet,
Backend mit 104-04 neu gebaut (`/health` 200), Keycloak-Config via
`scripts/verify-keycloak-config.ps1` angewendet und live geprüft (38/38 PASS, Account Console
live 200 / kein 403).

Ergebnis in `104-UAT.md`: **D-01 bis D-24 bestanden.**

## Evidenzverteilung

- **[live]** im internen In-App-Browser per echten Klicks verifiziert: D-01–D-08, D-11,
  D-16–D-18, D-20 (Reload-Recovery), D-21, D-22, D-23 sowie „Meine Projekte" fehlt für reinen Account.
- **[real-browser]** vom Operator bestätigt (off-canvas Navigation): D-09 (`csubs-leader` sieht
  „Meine Projekte" + Dashboard), D-24 (Erst-Tap navigiert & schließt Drawer; Logout einmalig).
- **[auto]** verpflichtende Automattests der Pläne 01/03/04: D-10, D-15 (keine DB-Autorisierungszeilen),
  D-12/D-13/D-14 (Keycloak-Config), D-19 (Fehlerzustand), D-20 (`api.auth-refresh`).

## Tooling-Befund (kein App-Defekt)

Der interne Codex-In-App-Browser rendert die off-canvas Navigation dieser App nicht: Screenshots
timeouten, der Drawer-`transform` bleibt trotz `drawerOpen`-Klasse auf `translateX(-100%)`. Nachweis,
dass die CSS-Kaskade zwingend `translateX(0)` ergibt (`.drawerOpen` nach `.drawer`, keine `!important`,
keine höhere Spezifität) → ein konformer Browser öffnet den Drawer. Die betroffenen Punkte (D-09,
D-24, Logout-Optik) wurden deshalb vom Operator in einem echten Browser bestätigt.

## Key files

- `.planning/phases/104-registrierungs-login-und-account-onboarding-hardening/104-UAT.md` (erstellt)

## Nebeneffekt

Test-Account `uat_c_subs_1` (`uat-c-subs-1@team4s.local`) in Keycloak angelegt + Team4s-`app_user`
provisioniert (erwartet, ohne Rollen/Member/Projekt). Bei Bedarf entfernen.

## Self-Check: PASSED
