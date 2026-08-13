# 74-11 — Live-UAT (Gap-Closure) Summary

**Datum:** 2026-06-08
**Modus:** Live-Verifikation auf Dev-Server `:3000` (Frontend, Hot-Reload) gegen frisch
neu gebautes Backend `:8092` (Go-Binary aus dem Haupt-Tree, `AUTH_BYPASS_LOCAL`).
**Testdaten:** echte DB (`team4s_v2`). Ballelboy = member 3 (app_user 2, `fansub_lead`@AnimeOwnage);
Angeldust = member 16 (hist + app + Anime-Beitrag); Phase Admin = member 2 (`members_only`).

## Ergebnisse je Gap

| Gap | Verfahren | Ergebnis |
|-----|-----------|----------|
| GAP-1 (5 Filter) | Live `/members/angeldust` + `/members/ballelboy` | **PASS** — 5 `@/components/ui` Select: Anime, Gruppe, Rolle, Zeitraum, Status; Optionen aus role_timeline abgeleitet; deutsche Labels |
| GAP-1 (Filter wirkt) | Live: Rolle=„Fansub-Lead" auf Angeldust | **PASS** — Liste 3 → 1, rein clientseitig |
| GAP-2 (Durchreichen) | Live: gefilterte Liste rendert über `MemberRoleTimeline` | **PASS** — keine Eigenliste mehr; „Gruppenhistorie/Anime-Beitrag"-Badges sichtbar |
| GAP-2 (Inline-Expand) | Live: „Details anzeigen" auf Ballelboy | **PASS** — aria-expanded false→true, „Details ausblenden", zeigt „Rollencode: fansub_lead" |
| GAP-3 (App-Gruppenrollen) | API + Live | **PASS** — Ballelboy liefert 1 `group_history`-Eintrag „Fansub-Lead/AnimeOwnage"; Angeldust zeigt hist (`Projektmanagement`) + App (`Fansub-Lead`) + Anime (`Typesetting/FX`, Naruto) sauber getrennt, kein Duplikat |
| GAP-3 (deutsches Label) | Folgefix Migration 0100 | **PASS** — `role_definitions` Seed `fansub_lead`→„Fansub-Lead"; vorher Rohcode |
| GAP-9 (/me-Link Slug) | Code + Contract | **PASS (code)** — `MemberProfile.slug` end-to-end (Modell/Repo/OpenAPI/Type); Link `/members/${slug || member_id}`; `deriveMemberSlug` spiegelt `memberSlugExpr`. Voll-Login-Spotcheck offen (low-risk) |
| #4 Story/Tabelle | Live 375px Ballelboy | **PASS** — kein horizontaler Overflow (docScrollWidth 375), Tabelle 309px passt, keine Mojibake (Umlaute korrekt) |
| #5 Badges | Live Angeldust + Code | **PASS (teilw.)** — Badges aus `public_badges`-DTO; Top-N=4 Slicing + `showAll`-Toggle + Memorial-Suppression im Code. „alle anzeigen"-Toggle mit echten Daten nicht auslösbar (kein öffentliches Profil >4 Badges) |
| #6/#7 Memorial | `go test` (Plan 74-10) | **PASS (code)** — alle 4 Backend-Schutzmechanismen vorhanden + 2 Coverage-Tests; kein Live-Test (keine Memorial-Daten, Nutzer-Entscheidung) |
| #11 Sticky/Mobile-Nav | Live 375px Angeldust | **PASS** — kein horizontaler Overflow (Filter + Chip-Nav); Reihenfolge Hero→Badges→Geschichte→Beiträge |
| #12 Hidden/Noindex | Live `/members/phase-admin` (members_only) | **PASS** — „Dieses Profil ist nicht öffentlich zugänglich.", keine Daten-Sektionen für Nicht-Besitzer; API `{visible:false}` |

## Automatisierte Gates
- `npx vitest run MemberContributionFilters MemberRoleTimeline` → 15/15 grün.
- `go test ./internal/repository/ ./internal/handlers/ -run "PublicMemberContributions|Memorial|Claim|MemberProfile|Slug"` → beide Pakete ok.
- `go build ./...` + `npm run typecheck` grün (in 74-07/08/09/10).

## Offene/bewusst nicht live geprüfte Punkte (ehrlich)
- GAP-9 Voll-Login-Spotcheck (Slug landet sichtbar auf `/members/ballelboy`) — Code/Contract verifiziert, low-risk.
- Badges „alle anzeigen"-Toggle — keine öffentlichen Testdaten mit >4 Badges.
- Memorial Live (Hero/Claim-409/Suppression) — keine Memorial-Daten in DB (Nutzer: code-only).
- (#8) Korrektur-Modal-Submit, (#10) Status-Pill-Tooltip-Text — Komponenten vorhanden/gerendert; kein erneuter Write-Test in diesem Durchgang (waren nicht als Defekt belegt).

## Backend-Laufzeit-Hinweis
Backend läuft als `backend/server-uat.exe` (Neustart für Live-UAT). Normaler Workflow:
`tmp-start-backend.ps1` (`go run ./cmd/server`). Migration 0100 ist auf der lokalen DB angewendet.
