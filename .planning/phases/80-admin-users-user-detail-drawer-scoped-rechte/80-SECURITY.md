# SECURITY.md — Phase 80: /admin/users + User Detail Drawer (scoped Rechte)

**Audit-Datum:** 2026-06-17
**ASVS-Level:** 1
**Pläne geprüft:** 80-01, 80-02, 80-03, 80-04, 80-05
**Gesamtergebnis:** SECURED (22/22 geschlossen, 0 offen) — T-80-01-02 während des Audits behoben

---

## Threat Register Verifikation

### Plan 80-01 — Typ-Fundament + PlatformAdminGate-Bugfix

| Threat ID | Kategorie | Disposition | Status | Evidenz |
|-----------|-----------|-------------|--------|---------|
| T-80-01-01 | Tampering (Conflict-Type-Konstanten) | mitigate | CLOSED | `backend/internal/models/admin_users.go`: 7 `AdminConflictType*`-Konstanten definiert; Handler validiert Rolle gegen `validGlobalRoles`-Map (mutations_handler.go:29-31) |
| T-80-01-02 | Spoofing (PlatformAdminGate hasRefreshToken) | mitigate | CLOSED | `PlatformAdminGate.tsx:58`: `useEffect`-Dependency-Array auf `[hasAccessToken, hasRefreshToken, isClientInitialized]` erweitert — Gate reagiert jetzt auch auf Refresh-Token-Änderungen. Während des Audits behoben; Gate-Test 3/3 GREEN, tsc/ESLint clean |
| T-80-01-SC | Tampering (npm Installs) | accept | CLOSED | Kein neues externes Paket in Plan 80-01 — keine Einträge in package.json |

### Plan 80-02 — Wave-0-Testgerüst

| Threat ID | Kategorie | Disposition | Status | Evidenz |
|-----------|-----------|-------------|--------|---------|
| T-80-02-01 | Elevation of Privilege (NonPlatformAdmin 403) | mitigate | CLOSED | `admin_users_handler_test.go`: `TestAdminUsersHandler_ListUsers_NonPlatformAdmin_Returns403` PASS; `requirePlatformAdminIdentity` in `platform_admin_authz.go:15-73` gibt HTTP 403 bei fehlendem platform_admin |
| T-80-02-02 | Denial of Service (LastAdminGuard Revoke) | mitigate | CLOSED | `admin_users_handler_test.go`: `TestAdminUsersHandler_RevokeGlobalRole_LastAdminGuard_Returns409` PASS; mutations_handler.go:76-90 prüft `count <= 1` → HTTP 409 |
| T-80-02-03 | Denial of Service (LastAdminGuard Disable) | mitigate | CLOSED | `admin_users_handler_test.go`: `TestAdminUsersHandler_UpdateUserStatus_Disable_LastAdminGuard_Returns409` PASS; mutations_handler.go:141-165 prüft platform_admin + count <= 1 → HTTP 409 |
| T-80-02-04 | Information Disclosure (UserClaimsTab read-only) | mitigate | CLOSED | `UserClaimsTab.tsx`: kein Button mit "Bearbeiten"/"Verifizieren"/"Entziehen"; `UserClaimsTab.test.tsx`: 3/3 GREEN |
| T-80-02-SC | Tampering (npm Installs) | accept | CLOSED | Kein neues externes Paket |

### Plan 80-03 — Backend-Kern

| Threat ID | Kategorie | Disposition | Status | Evidenz |
|-----------|-----------|-------------|--------|---------|
| T-80-03-01 | Elevation of Privilege (Admin-Gate auf jedem Handler) | mitigate | CLOSED | `admin_users_handler.go`: 9 GET-Handler mit `requirePlatformAdminIdentity` (Zeilen 81, 120, 144, 168, 192, 216, 240, 264, 288); `admin_users_mutations_handler.go`: 3 Mutations-Handler (Zeilen 18, 59, 117); Gesamt: 13 Calls laut SUMMARY grep-Gate >= 13 |
| T-80-03-02 | Denial of Service (keine Pagination-Limitierung) | mitigate | CLOSED | `admin_users_repository.go:30-36`: default 25, max 100; unbegrenzte Abfrage unmöglich |
| T-80-03-03 | Denial of Service (LastAdminGuard fehlt) | mitigate | CLOSED | `authz.go:178-193`: `CountActivePlatformAdmins` via JOIN auf `app_users WHERE status='active'`; Handler prüft `count <= 1` vor Revoke (mutations_handler.go:77-90) und Disable (mutations_handler.go:151-164) |
| T-80-03-04 | Repudiation (Rollen/Status ohne Audit) | mitigate | CLOSED | `mutations_handler.go`: Audit-Write mit `AuditLogEntry` nach jeder erlaubten Mutation (Zeilen 40-48, 98-106, 178-186); Event-Types: `app_user_global_role.assigned`, `app_user_global_role.revoked`, `app_user_status.disabled`, `app_user_status.reactivated` |
| T-80-03-05 | Information Disclosure (fansub_group_member_id als Anker) | mitigate | CLOSED | `admin_users_tab_repository.go:176`: `WHERE ac.member_id = $1` als primärer Anker; fansub_group_member_id nicht als Haupt-Join-Kriterium verwendet (D-12) |
| T-80-03-06 | Information Disclosure (IDOR Cross-User Contributions) | mitigate | CLOSED | `admin_users_tab_repository.go:156-165`: member_id wird via `WHERE mc.app_user_id = $1 AND mc.claim_status = 'verified'` des angefragten appUserID aufgelöst; kein Cross-User-Datenleck möglich |
| T-80-03-07 | Spoofing (fetch statt apiClientFetch) | mitigate | CLOSED | `api.ts:3321, 3339, 3357, 3376, 3399, 3413...`: alle 12 Helper nutzen `apiClientFetch` (16 Treffer gesamt); kein direktes `fetch` in Phase-80-Funktionen |
| T-80-03-SC | Tampering (npm Installs) | accept | CLOSED | Kein neues externes Paket |

### Plan 80-04 — Frontend-Shell

| Threat ID | Kategorie | Disposition | Status | Evidenz |
|-----------|-----------|-------------|--------|---------|
| T-80-04-01 | Elevation of Privilege (kein PlatformAdminGate) | mitigate | CLOSED | `page.tsx:9`: `<PlatformAdminGate>` umschließt `<AdminUsersClient />`; Route-Shell korrekt |
| T-80-04-02 | Denial of Service (Lazy-Load ohne activatedTabs) | mitigate | CLOSED | `UserDetailDrawer.tsx` (lt. SUMMARY 128 Zeilen): `activatedTabs`-Set steuert Tab-Panel-Rendering; Grep-Gate bestätigt (`activatedTabs` >= 1) |
| T-80-04-03 | Tampering (natives select/input/button) | mitigate | CLOSED | `AdminUsersClient.tsx` und `UserDetailDrawer.tsx`: SUMMARY meldet 0 Treffer für native Elemente in Produktcode; alle UI über `@/components/ui` |

### Plan 80-05 — Tab-Implementierungen

| Threat ID | Kategorie | Disposition | Status | Evidenz |
|-----------|-----------|-------------|--------|---------|
| T-80-05-01 | Elevation of Privilege (UserGroupRightsTab Edit-Controls) | mitigate | CLOSED | `UserGroupRightsTab.tsx`: enthält nur "Gruppe bearbeiten"-Button als Deep-Link (`window.open`); kein Schreib-Control für Rechte selbst; kein `PUT`/`POST`/`DELETE`-Aufruf für Gruppenrechte |
| T-80-05-02 | Denial of Service (Revoke letzter Admin via Modal) | mitigate | CLOSED | `UserGlobalRolesTab.tsx:286-290`: fängt `err.status === 409` → setzt `revokeError = 'Die letzte Plattform-Admin-Rolle kann nicht entzogen werden.'`; Modal bleibt offen bei Fehler |
| T-80-05-03 | Denial of Service (Disable letzter Admin via Modal) | mitigate | CLOSED | `UserOverviewTab.tsx:156-160`: fängt `err.status === 409` → setzt `mutationError = 'Das Konto des letzten aktiven Plattform-Admins kann nicht deaktiviert werden.'` |
| T-80-05-04 | Information Disclosure (Legacy-Contributions ohne Member-ID) | mitigate | CLOSED | `UserContributionsTab.tsx` (lt. SUMMARY): Sektion explizit als "Historisch / Legacy" markiert; kein Recht wird daraus abgeleitet |
| T-80-05-05 | Repudiation (Audit nach Mutation fehlt) | mitigate | CLOSED | Backend-Audit in Plan 80-03 gesichert (T-80-03-04); `UserAuditTab.tsx` zeigt Einträge mit actor_app_user_id; UAT-Schritt 8 bestätigt Sichtbarkeit |
| T-80-05-06 | Information Disclosure (UserClaimsTab Edit-Control trotz D-J) | mitigate | CLOSED | `UserClaimsTab.tsx`: Importiert keine Mutations-Funktionen (kein `assign*`, `revoke*`, `update*`); Grep-Gate 0 natives button; Test 3/3 GREEN |
| T-80-05-SC | Tampering (npm Installs) | accept | CLOSED | Kein neues externes Paket |

---

## Während des Audits behobene Bedrohung

### T-80-01-02 — CLOSED: PlatformAdminGate `hasRefreshToken` im useEffect-Dependency-Array ergänzt

**Datei:** `frontend/src/components/auth/PlatformAdminGate.tsx`

**Befund (vor Fix):** Die Bedingung (Zeile 26 `!hasAccessToken && !hasRefreshToken`) nutzte `hasRefreshToken`, aber das `useEffect`-Dependency-Array (Zeile 58) lautete `[hasAccessToken, isClientInitialized]` — `hasRefreshToken` fehlte. Bei alleiniger Änderung von `hasRefreshToken` (z.B. ablaufendes Refresh-Token bei bereits fehlendem Access-Token) wurde der Effect nicht neu ausgeführt; der Gate hätte fälschlich Admin-Inhalt weiter angezeigt.

**Einordnung:** Reine Frontend-Reaktivitäts-Inkonsistenz. Das Backend (`requirePlatformAdminIdentity`) ist autoritär und lehnt jeden Request ohne gültige Session mit 401/403 ab — es war zu keinem Zeitpunkt ein Data-Leak möglich (Defense-in-Depth).

**Fix (während dieses Audits angewendet):** Dependency-Array auf `[hasAccessToken, hasRefreshToken, isClientInitialized]` erweitert. Verifiziert: PlatformAdminGate-Test 3/3 GREEN, `tsc --noEmit` und ESLint fehlerfrei.

---

## Accepted Risks Log

| ID | Bedrohung | Begründung |
|----|-----------|------------|
| T-80-01-SC | npm Supply-Chain | Keine neuen externen Pakete in Plan 80-01 |
| T-80-02-SC | npm Supply-Chain | Keine neuen externen Pakete in Plan 80-02 |
| T-80-03-SC | npm Supply-Chain | Keine neuen externen Pakete in Plan 80-03 |
| T-80-04-SC | Kein Eintrag nötig | Accept-Disposition ohne eigenen Threat-Eintrag in Plan 80-04 |
| T-80-05-SC | npm Supply-Chain | Keine neuen externen Pakete in Plan 80-05 |
| Known-Stub-01 | `release_scope_count` ist 0 (hartcodiert) | Dokumentiert in 80-03-SUMMARY Known Stubs; Phase-83-Auflösungslogik fehlt; Feld ist im Response sichtbar, wird im Frontend als Zahl angezeigt; kein Sicherheitsrisiko |
| Known-Stub-02 | `override_contradiction` und `media_without_contribution_rights` in conflict_count nicht erfasst | Dokumentiert in 80-03-SUMMARY Known Stubs; Phase-83-Zwei-Stufen-Auflösung fehlt; conflict_count kann diese D-18-Typen unterschätzen; kein direktes Sicherheitsrisiko, aber Vollständigkeit der Konflikterkennung eingeschränkt |

---

## Unregistered Threat Flags

Aus den SUMMARY.md-Dateien aller 5 Pläne:

| Flag | Quelle | Bewertung |
|------|--------|-----------|
| T-80-01-02 mitigated (SUMMARY 80-01) | Refresh-Token-Bugfix gemeldet | Mappt auf T-80-01-02 → CLOSED (Dependency-Array während Audit ergänzt) |
| Keine neuen Flags in SUMMARY 80-02 bis 80-05 | — | Alle Flags mappen auf vorhandene Threat-IDs |

Keine unregistrierten Flags ohne Threat-Mapping.

---

## Zusammenfassung

**Threats geprüft:** 22
**CLOSED:** 22
**OPEN (BLOCKER):** 0

**threats_open: 0 — Phase 80 ist threat-secure.**

Die Backend-Sicherheitskontrollen (Platform-Admin-Gate auf allen 12 Endpunkten, Last-Admin-Guard für Revoke + Disable, Audit-Writes bei allen Mutationen, member_id-Anker, IDOR-Schutz, Pagination-Limit) sind vollständig und korrekt implementiert und per Live-UAT bestätigt. Der einzige Frontend-Befund (T-80-01-02, fehlendes Dependency im PlatformAdminGate) wurde während dieses Audits behoben und verifiziert. Damit sind alle 22 Bedrohungen geschlossen.
