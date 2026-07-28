---
status: partial
phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung
source: [111-VERIFICATION.md]
started: 2026-07-28T19:32:00Z
updated: 2026-07-28T19:32:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Filter→Detail→Zurück-Kreislauf (inkl. Sonderzeichen in der Suche)
expected: `/admin/users` mit Suche (inkl. `+`/E-Mail-Alias), Status- und Rollenfilter befüllen → Zeilenklick → Detailseite unter `/admin/users/{id}?from=...` mit 4 offenen/geladenen Accordion-Sektionen (Accordion statt Tabs) → „Zurück zur Liste" stellt exakt dieselbe gefilterte Ansicht wieder her, auch mit Sonderzeichen.
result: [pending]

### 2. Bidirektionale RBAC-Querverlinkung mit echten DB-Daten
expected: User mit Gruppenrolle öffnen → „Was darf diese Rolle?" → `/admin/role-capabilities` mit vorausgewählter Rolle. Dann Impact-Count einer globalen Rolle (z. B. „3× vergeben") klicken → `/admin/users?role=...` mit gefilterter Liste. Beide Richtungen mit echten `app_user_global_roles`/`fansub_group_members`-Daten.
result: [pending]

### 3. Visueller Abgleich Accordion-Layout + Impact-Count gegen 111-UI-SPEC.md
expected: Sektionsreihenfolge, Default-States, Abstände, Chevron-Verhalten und Impact-Count-Badge-Platzierung (Label „Globale App-Rolle") entsprechen der UI-SPEC.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

Keine Code-seitigen Gaps. Alle 6 Decisions (D-01…D-06) sind im Code verifiziert; Grund für `human_needed` ist ausschließlich die fehlende Live-Browser-UAT (Docker in den Ausführungssessions nicht erreichbar). Vor Live-Test: `docker compose up -d --build team4sv30-backend` (neue Go-Aggregation) und `docker restart team4sv30-frontend` + Strg+F5; echte Host-Ports via `docker ps`.
