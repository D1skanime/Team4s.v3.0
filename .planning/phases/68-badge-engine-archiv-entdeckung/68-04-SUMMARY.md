# Plan 68-04 — Abschluss-Checkpoint: Verifikation + UAT

**Status:** abgeschlossen (automatisierte Verifikation + Live-Smoke-Test)
**Datum:** 2026-06-02

## Task 1 — Automatische Gesamtverifikation

| Check | Ergebnis |
|-------|----------|
| `go build ./...` | ✅ exit 0 |
| Badge-Engine-Tests (`go test ./internal/services/...`) | ✅ PASS |
| Handler-Tests (GroupHistory, Cross-Group-Guard) | ✅ PASS (echte Source-Inspection mit Negativ-Kontrolle) |
| Archiv-Repository-Tests (`go test ./internal/repository/...`) | ✅ PASS |
| `npm run build` (Frontend) | ✅ exit 0 (`/archiv`, `/admin/my-groups/[id]` in Route-Liste) |

**Scoping-Hinweis:** Die volle `go test ./...`-Suite enthält vorbestehende RED-TDD-Stubs aus **Phase 70** (`app_profile_story_image_test.go`, 501-Stubs) — diese sind **nicht** Teil von Phase 68 und wurden bewusst ausgeklammert. Alle Phase-68-spezifischen Tests sind grün.

**Test-Qualität nachgebessert:** Die ursprünglich vom Executor erzeugten tautologischen `assert.True(t, true)`-Tests im Group-History-Handler wurden durch echte Source-Inspection-Tests ersetzt (Commit `3170469d`). Negativ-Kontrolle bestätigt: Entfernen des Cross-Group-Guards macht die Tests rot.

## Task 2 — Live-UAT (Docker-Compose-Umgebung)

Umgebung: `team4sv30-backend` + `team4sv30-frontend` neu gebaut, Migration **0095** beim Start angewendet (`migrations applied: 1`).

### P68-SC1 Badge-Engine — ✅ LIVE bestätigt
- `./migrate backfill-badges` → `members_processed=13 errors=0` (D-06 Backfill-Vertrag).
- `member_badges` nach Backfill: `first_contribution` (1, aus 1 confirmed Contribution), `verified` (2, aus verifizierten `member_claims`), bestehende `historical_leader`/`long_term_member` erhalten.
- `productive_*`/`all_rounder` korrekt **nicht** vergeben (Dev-Daten erreichen Schwellen 10/≥3 nicht).
- Recompute-Trigger bei Contribution-Mutationen: code- + verdrahtungs-verifiziert (Handler `WithBadgeService`, `member_id` VOR Delete gelesen).

### P68-SC3 Archiv-Suche — ✅ LIVE bestätigt (Backend + Frontend)
- `GET /api/v1/archiv` → 200, kein Auth-Gate (öffentlich).
- **Sichtbarkeits-Sicherheit (beide Richtungen):** member 2 hat eine öffentliche confirmed Contribution, aber `profile_visibility='members_only'` → erscheint **nicht** (kein Leak, T-68-03-01). Temporär auf `public` gesetzt → erscheint; zurückgesetzt → wieder leer.
- **AND-Filter-Matrix:** `rolle=timer`→1, `rolle=editing`→0, `von=1990&bis=2100`→1, `von=2999`→0, `rolle=timer&von=1990&bis=2100`→1. Alle Filter pgx-parametrisiert.
- **Bounds-Check:** `page=0`→1, `page=99999`→1000.
- **Frontend-SSR (`/archiv`):** Überschrift „Archiv — Fansub-Mitwirkende entdecken", Rolle-Filter mit korrekten Umlauten (Übersetzung, Qualitätskontrolle, Projektleitung), Gruppe-Filter mit echten DB-Gruppen befüllt (`getFansubs()`), CTA „Archiv durchsuchen", Leer-State „Noch keine öffentlichen Beiträge im Archiv.".
- **Positiv-Render:** `MemberSearchCard` zeigt „Phase Admin P47 · Verifiziert · Timing · AnimeOwnage · Profil ansehen".

### P68-SC2 Gruppen-Meilensteine — ✅ Code-/Test-verifiziert, ◻ visuelle UI-UAT offen
- DeleteGroupHistory + Cross-Group-Guard (GetByID vor Mutation → 404 bei fremder Gruppe), `status='confirmed'`-Default (D-11), Titel-Pflicht (D-10) — durch echte Tests abgesichert (inkl. Negativ-Kontrolle).
- DELETE-Route registriert + auth-geschützt.
- Frontend `GroupHistorySection` baut fehlerfrei; visuelle Inline-Timeline-Interaktion (Anlegen/Bearbeiten/Löschen, Toast, Progressive Disclosure >5) erfordert Admin-/Leader-Login (Keycloak) — **noch nicht** per Browser durchgeklickt (Chrome-Extension war während dieser Session nicht verbunden).

## Offene manuelle UAT (1 Punkt)
- **P68-SC2 visuelle Timeline-UAT** in `/admin/my-groups/[id]` als Leader: „+ Meilenstein hinzufügen" → „Meilenstein speichern" → Bearbeiten/Löschen → bei >5 Einträgen Expander. Backend-Logik + Sicherheit sind verifiziert; ausständig ist nur die visuelle Durchklick-Bestätigung.

## Anforderungs-Abdeckung
- P68-SC1 ✅ · P68-SC2 ✅ (Code/Test; UI-Klick offen) · P68-SC3 ✅
