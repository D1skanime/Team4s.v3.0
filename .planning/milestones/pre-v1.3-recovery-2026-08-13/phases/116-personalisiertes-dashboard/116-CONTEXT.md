# Phase 116: Personalisiertes Dashboard (eingeloggter Landing-Hub) - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning (nach 109–115)

<domain>
## Phase Boundary

Belebt den deaktivierten Nav-Eintrag **„Dashboard"** (`AppShell.tsx:123`, eingeloggtes Shell) mit
einer **read-only, personalisierten Startseite** für eingeloggte User — ein **Cockpit**, das
bereits vorhandene Daten **bündelt und verlinkt**.

**Bewusst NICHT:** **keine eigene Persistenz**, **kein Editieren** (das bleibt die
Verwaltungs-Konsole `/me/profile`), kein eigenes Such-UI (verlinkt nur auf Phase 115). Reiner
Aggregations-/Absprung-Hub.

**Präzisierung nach Research (2026-07-28):** Die ursprüngliche Formulierung „kein Backend-Zusatz"
gilt nur für D-02. Für D-03/D-04 ist ein **kleiner, rein-lesender Backend-Zusatz** nötig (siehe
D-08) — read-only, keine Persistenz, kein Schreibpfad. Die read-only-/no-persistence-Prämisse
bleibt vollständig gewahrt; nur „ohne jede neue Go-Zeile" war so nicht haltbar.

**Reihenfolge:** Als Integrations-Hub verlinkt/aggregiert 116 fast alles andere → kommt **nach
109–115**, sonst zeigen Absprünge/Fortschritt ins Leere.

</domain>

<decisions>
## Implementation Decisions

### D-01 Abgrenzung Dashboard vs. `/me/profile`
- **`/me/profile` = Edit-Konsole** (Avatar/Hintergrund, Story, Sichtbarkeit, Badge-Freigabe,
  Member-Claim, Account/Security — Formulare/Uploads). **Dashboard = read-only Cockpit** (Zahlen,
  Status, Absprünge). Keine Doppelung: das Dashboard **verlinkt** nur, ändert nichts.

### D-02 „Braucht deine Aufmerksamkeit" (oben, prominent)
- Zeigt **kürzlich neu zugewiesene Projekte/Releases** (Member in einer Rolle) mit **Direktlink
  zur Arbeitsfläche** (Release-Besetzung / Projekt), neueste zuerst, dezente „neu"-Markierung.
- **Variante A (zeitbasiert, gewählt):** „neu" = Zuweisung innerhalb der letzten X Tage. Nutzt die
  vorhandenen Zeitstempel der Besetzungs-/Contribution-Daten → **kein Backend-Zusatz**. Nachteil:
  „neu" = „kürzlich", verschwindet nicht durchs Ansehen.
- **Variante B (echtes „ungelesen", `last_seen`/„gesehen"-Marker) ist deferred** — späterer Ausbau.
- **Research-Ergebnis (VERIFIED):** Variante A ist ohne Backend-Zusatz machbar. `anime_contributions.created_at`/
  `confirmed_at` existieren (Migration 0086) und werden vom Go-Handler bereits im JSON mitgeliefert
  (`AnimeContributionRow.CreatedAt`). Einziger additiver Frontend-Schritt: das TS-DTO
  `MeAnimeContribution` (`frontend/src/types/contributions.ts:75`) um `created_at`/`confirmed_at`
  erweitern. „neu"-Prädikat rein clientseitig (Fenster `windowDays`, Startwert 14 = Claude's Discretion).

### D-03 Kennzahlen (5 Kacheln)
- **Punkte** (aus 109), **Badges** (Anzahl), **Projekte** (Anzahl), **hochgeladene Bilder**,
  **geschriebene Beiträge**. Letzte zwei sind zugleich die Zähler hinter den Bildarchivar-/
  Chronist-Badges (Phase 113).
- **Research-Korrektur (VERIFIED):** Keine dieser 5 Zahlen ist heute über einen für den
  eingeloggten User erreichbaren Endpunkt verfügbar (`GetOwnProfile` liefert sie nicht) → alle
  fünf kommen über den neuen Endpunkt aus **D-08**.
  - **Punkte** = `total_points` (nur in `GetPublicMemberProfile` vorhanden, für Eigen-Sicht neu zu exponieren).
  - **Badges (Anzahl)** = live-abgeleitete Familien-Badges (role_entry/point_milestone/role_volume/
    contribution_*), NICHT nur `getMyBadges()` (das zählt nur persistierte `member_badges`).
  - **geschriebene Beiträge** = `chronicleCount` (`member_profile_contribution_badges_repository.go:142-157`),
    **NICHT** `previous_contributions_count` (das zählt abgeschlossene Projekte — inhaltlich falsch).
  - **hochgeladene Bilder** = Bildarchivar-Rohzahl (heute in Go berechnet, aber nach Tier-Ableitung verworfen).
  - **Projekte (Anzahl)** = neue Aggregatsabfrage `COUNT(DISTINCT anime_id, fansub_group_id)` über
    `anime_contributions` (ungefiltert, Eigen-Sicht) — keine bestehende Single-Source.

### D-04 Fortschritt je Badge-Kategorie (Tabelle)
- Pro Badge-Familie **„aktuelle Stufe · noch X bis nächste Stufe"**: Punkte-Meilenstein (Typ 2),
  Rollen-Volumen je Rolle (Typ 3), Bildarchivar/Chronist/dok. Projekte (Phase 113) …
- **Konsument** der Schwellen aus **Phase 112 (Typ 2/3)** und **113** — 116 definiert keine
  Schwellen selbst.
- **Research-Ergebnis (VERIFIED):** „noch X bis nächste Stufe" braucht die **Rohzahlen**, die im
  Go-Code (`member_profile_contribution_badges_repository.go`, `member_profile_role_volume_repository.go`)
  bereits berechnet, aber nach der Tier-Ableitung **verworfen** werden. Diese Rohzahlen + jeweilige
  nächste Schwelle liefert der neue Endpunkt aus **D-08** additiv mit (bevorzugt gegenüber erneuter
  Schwellen-Duplizierung in TS). Punkte-Meilenstein-Schwellen sind clientseitig bereits gespiegelt
  (`memberBadgeLabels.ts:226-240`, `POINT_MILESTONES` — für D-04-Typ-2 exportierbar wiederverwenden).

### D-05 Meine Gruppen
- Liste der Gruppen, in denen der User Mitglied ist (+ Rollenkontext), mit **Links** zu den
  Gruppen. Nutzt die vorhandene „Meine Gruppen"-Datenquelle (AppShell rendert sie bereits).
- **Entscheidung (2026-07-28):** Linkziel ist das **öffentliche Gruppenprofil `/fansubs/[slug]`**
  (`frontend/src/app/fansubs/[slug]/page.tsx`), NICHT die Admin-Edit-Route `/admin/fansubs/[id]/edit`,
  die AppShell heute unbedingt verlinkt (403-Risiko für Mitglieder ohne Edit-Capability). Read-only-
  Cockpit-Charakter → immer erreichbares Ziel.

### D-06 Schnellzugriffe
- **Anime entdecken (`/anime`, erster)**, **Rangliste**, **Fansub-Gruppen (114)**,
  **Suche (→ 115-Suchseite `/suche`, fokussiertes leeres Suchfeld)**, **Mein Profil**.
- Nur Absprünge, kein eigenes UI.
- **Research-Hinweis:** `/suche` (Phase 115) existierte zum Research-Zeitpunkt im Repo noch nicht.
  Da 115 vor 116 in der Ausführungsreihenfolge liegt, sollte es bei Ausführung existieren — Plan
  muss dennoch **defensiv** `ls frontend/src/app/suche` prüfen und den Schnellzugriff sonst
  `disabled`/`badge: 'bald'` lassen (AppShell-Muster für unfertige Features), statt auf eine
  404-Route zu verlinken.

### D-07 UI
- Globales UI-System Pflicht (`@/components/ui`), responsiv, barrierefrei, keine neue Designsprache.

### D-08 Read-only Aggregations-Endpunkt (neu, nach Research)
- **Entscheidung (2026-07-28):** Ein **dedizierter, rein-lesender** `GET /api/v1/me/dashboard`
  aggregiert die für D-03/D-04 nötigen Werte (Punkte, live-Badges + Rohzahlen je Familie mit
  nächster Schwelle, Bilder-/Beiträge-/Projekte-Counts). **Read-only, keine Persistenz, kein
  Schreibpfad.**
- Bewusst **nicht** `GetOwnProfile` erweitert — sonst würden `/me/profile` und die AppShell-Nav die
  zusätzlichen COUNT-Queries bei jedem Render mitzahlen, ohne sie zu brauchen.
- **Sicherheit (Pflicht):** Handler MUSS `resolveVerifiedMemberID(ctx, identity.AppUserID)` nutzen
  (Ownership-Gate über `member_claims`, Muster aus `contributions_me_handler.go:65-80`) — niemals eine
  `member_id` aus Query/Body vertrauen. Verhindert Cross-Member-Datenleck.

### D-09 Zugang / Eligibility
- **Entscheidung (2026-07-28):** Das Dashboard ist für **jeden eingeloggten User** erreichbar
  (kein Redirect-Gate wie `/me/contributions`). Sektionen ohne Daten zeigen einen **freundlichen
  EmptyState** (z. B. „noch keine Projekte"), Schnellzugriffe funktionieren immer. Passt zu
  „Landing-Hub für eingeloggte User".

### D-10 Route & Nav-Aktivierung
- **Route:** `/me/dashboard` (folgt dem `/me/*`-Muster aller personalisierten Seiten).
- **Nav:** Der tote „Dashboard"-Eintrag steht heute in der falschen Gruppe (`publicItems`,
  `AppShell.tsx:124`). Bei Aktivierung (analog Phase-114-02-Muster) in die Gruppe **„Mein Bereich"**
  (`myItems`, Z. 132-140, bei „Mein Profil") verschieben, `disabled`/`badge` entfernen,
  `href: '/me/dashboard'` setzen. Kein Eintrag in `AppShellAnonNavGroups` (korrekt so).

### Claude's Discretion
- Genaue Kachel-/Sektions-Anordnung, Fenster „letzte X Tage" (`windowDays`, Startwert 14) für
  Variante A, Tabellen-Layout, EmptyState-Formulierungen.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Phase-116-Grenze + Depends-on 109–115.
- `.planning/phases/109-…/109-CONTEXT.md` (Punkte), `110-…`, `112-…`, `113-…` (Badges + Schwellen),
  `114-…` (Gruppen-Übersicht), `115-…` (Suche) — 116 konsumiert deren Ergebnisse.
- `./CLAUDE.md` — globales UI-System Pflicht, Umlaute, 450-Zeilen-Limit.

</canonical_refs>

<code_context>
## Existing Code Insights (Startpunkte — zu verifizieren)

- `frontend/src/components/layout/AppShell.tsx` — toter „Dashboard"-Eintrag (Z. 123);
  „Meine Gruppen"-Nav-Datenquelle (Z. 156) für D-05.
- `frontend/src/app/me/profile/…` — Edit-Konsole (Abgrenzung D-01); zeigt bereits Badges +
  letzte Beiträge/Medien (nicht doppeln, nur verlinken).
- `frontend/src/lib/api.ts` — `getOwnProfile`, `getMyBadges`, `getMyMemberClaim`,
  `getWatchlist` (Watchlist deferred), `getMemberPointRanking`.
- `frontend/src/app/members/[slug]/page.tsx` — `previous_contributions_count` (Beitragszahl),
  RecentMedia (Bilderquelle) als Vorlage für die Kennzahlen.
- Release-Besetzung/Contributions (`release_crew`, `anime_contributions`) mit Zeitstempeln →
  Basis für D-02 Variante A.

</code_context>

<specifics>
## Specific Ideas

- Mockup abgestimmt (v2): 5 Kennzahlen, „Fortschritt je Kategorie"-Tabelle, „Meine Gruppen",
  Schnellzugriffe inkl. „Anime entdecken" zuerst; Watchlist entfernt.
- Kernnutzen über `/me/profile` hinaus: „Braucht deine Aufmerksamkeit", Kategorie-Fortschritt,
  Discovery-Absprünge als Login-Landing.

</specifics>

<deferred>
## Deferred Ideas

- **Variante B** (echtes „ungelesen" via `last_seen`/„gesehen"-Marker) für neue Zuweisungen.
- **Watchlist**-Sektion (Feature existiert, `getWatchlist`) — vorerst raus.
- **„Neueste Releases" / „zuletzt aktualisierte Animes"**-Sektion (eigene Datenabfrage).
- **Globale Benachrichtigung** (Glocke/Zähler am Nav) — eigene spätere Phase.

</deferred>

---

*Phase: 116-personalisiertes-dashboard*
*Context gathered: 2026-07-28*
