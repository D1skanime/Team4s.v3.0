# Phase 82 — Design-Seed

**Erstellt:** 2026-06-10 (aus interaktiver Design-Diskussion mit dem Nutzer; vor Discuss-Phase)
**Status:** Seed — gelockte Entscheidungen + offene Fragen für die Discuss-Phase.

## Problem / Motivation

Anime-Mitwirkende („Mitwirkende"-Button im Tab „Anime & Veröffentlichungen", `/admin/fansubs/[id]/edit?tab=releases`) hängen heute **ausschließlich** an historischen Mitgliedern: `anime_contributions.fansub_group_member_id` ist NOT-NULL-FK auf `hist_fansub_group_members(id)` (Migrationen 0086/0091). Eingeloggte **App-Member** (`fansub_group_members` → `app_users`) haben keine hist-Zeile und können daher **nicht** als Mitwirkende gebucht werden. App- und historische Member sind disjunkte Mengen, nur über `member_claims` verbunden.

Zweitens fehlt dem Leader die **Übersicht**: pro Projekt ein leeres Modal, keine projektübergreifende Sicht „wo habe ich wen eingetragen, wo sind Lücken". Bei vielen Projekten reines Durchklicken.

## Gelockte Entscheidungen (vom Nutzer bestätigt)

1. **Anker-Modell:** `anime_contributions` ankert künftig auf **`members.id` (Person) + Gruppe** statt auf `hist_fansub_group_members.id`. App- und historische Member verschmelzen zu EINER buchbaren Identität — „App oder historisch" darf an der Buchungsstelle nicht mehr auftauchen.
2. **App-Member bekommen eine `members`-Zeile** (Backfill bestehender `fansub_group_members` ohne verknüpften `member`; künftig Auto-Anlage + Self-Claim beim Gruppenbeitritt), damit `members.id` die universelle Ankeridentität ist.
3. **Einstieg = Abdeckungs-Matrix (Leader-Cockpit):** Projekte (Zeilen) × Kern-Rollen (Spalten); Status besetzt/leer; leere Projekte hervorgehoben; Filter „Ohne Mitwirkende"; Inline-Zuweisung per Zellklick (Rolle vorausgefüllt aus der allgemeinen Gruppen-Rolle der Person, pro Projekt überschreibbar); „Standard-Team übernehmen" für leere Projekte. Zweitsicht person-zentrisch (eine Person → alle Projekte).
4. **Rollen bleiben katalog-getrieben** (`role_definitions`, Migration 0085, mit `contexts TEXT[]` + `sort_order`). Neue Rolle = Katalog-Insert; Matrix-Spalten werden aus dem Katalog generiert (`contexts @> 'anime_contribution'`). Die Matrix ist nur eine Aggregat-/Pivot-Sicht auf `anime_contributions` (gruppiert nach `member_id` + Anime), kein neuer Speicher.

## Scope / Arbeitspakete (grob)

**DB / Migration**
- `anime_contributions`: Spalte `member_id BIGINT REFERENCES members(id)` ergänzen, aus `hist_fansub_group_members.member_id` über den bestehenden hist-Anker **backfillen**, dann `NOT NULL`, alten `fansub_group_member_id`-FK ablösen.
- Unique-Key neu: `(fansub_group_id, anime_id, member_id, release_version_id) NULLS NOT DISTINCT`.
- `members`-Backfill für App-Member ohne `members`-Zeile (Self-Claim-Verknüpfung).
- `fansub_group_member_roles.role` (heute hartkodierter `CHECK`, Migrationen 0073/0074) → **FK auf `role_definitions(code)`** umstellen. Katalog als einzige Rollen-Wahrheit (gleiche Inkonsistenz wie bei Membern).

**Backend**
- Validierung in Contribution-Create: „Person ist Mitglied der Gruppe (App **oder** historisch)" statt hist-only `MemberBelongsToFansub`.
- Vereinheitlichter Endpoint „Gruppen-Mitglieder (Personen)": eine Zeile pro `member_id` mit Anzeigename, Quell-Flags (`has_app_account` / historisch) und allgemeinen Gruppen-Rollen (für Rollen-Seeding).
- Aggregat-/Coverage-Endpoint für die Matrix (Projekt × Rollen-Abdeckung pro Gruppe).

**Frontend**
- Abdeckungs-Matrix als Leader-Cockpit (Filter, Inline-Popover, Standard-Team), person-zentrische Zweitsicht. Globale UI-Primitives Pflicht (`@/components/ui`).
- `AnimeContribution`-Typen auf `member_id` umstellen; „Mitwirkende"-Modal sourct die vereinheitlichte Personenliste (member_id-keyed).

**Öffentliche Projektion**
- Anime-Seite + Member-Profil von hist-Anker auf `member_id` umstellen (Stellen, die Mitwirkende public ausspielen).

## Offene Fragen (für Discuss-Phase)

1. **Dedup ohne Claim:** dieselbe reale Person als App-Member UND unbeanspruchter historischer Eintrag → zwei `members`-Zeilen → Doppelanzeige. Merge-/Zusammenführungs-Flow nötig oder Policy „Claim zuerst"?
2. **Standard-Team-Konzept:** wie definiert/gepflegt — feste Stamm-Crew pro Gruppe, und/oder „Crew von Projekt X kopieren"?
3. **Rollen-Spalten der Matrix:** fest vs. konfigurierbar pro Gruppe (Katalog wächst → Matrix darf nicht zu breit werden; Rest im Zuweisungs-Popover).
4. **Rollen-Seeding-Umfang:** nur operative Rollen (translator/timer/…) als Default; Leadership (`fansub_lead`/`founder`) NICHT automatisch als Anime-Credit — bestätigen.
5. **Migrationsreihenfolge / Backfill-Sicherheit** der bestehenden `anime_contributions` (hist→member_id-Auflösung, Reihenfolge ggü. members-Backfill).

## Referenzen (verifiziert)

- `anime_contributions`: `database/migrations/0086_anime_contributions.up.sql`, `…0091_anime_contributions_release_version.up.sql`
- Rollen-Katalog: `database/migrations/0085_*` (`role_definitions`, FK-Retrofit für `hist_group_member_roles`)
- App-Member + Rollen-CHECK: `database/migrations/0073_fansub_group_app_memberships.up.sql`, `…0074_expand_fansub_group_member_roles.up.sql`
- Historische Member: `database/migrations/0082_*`, `0083_*`; `members`: `0044_*`; Claims: `0081_*`
- Frontend: `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` (Mitwirkende-Button, `openAnimeContributions`), `AnimeContributionModal.tsx`
- Backend: `backend/internal/handlers/fansub_anime_contributions_handler.go`, `fansub_contributions_validation.go`
