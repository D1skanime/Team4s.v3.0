# Phase 116: Personalisiertes Dashboard (eingeloggter Landing-Hub) - Research

**Researched:** 2026-07-28
**Domain:** Next.js 16 App Router (Client-Component-Aggregation) + Go/Gin read-projection-Erweiterung
**Confidence:** HIGH (alle Kernaussagen sind direkt im Code verifiziert, mit Datei:Zeile belegt)

## Summary

Phase 116 ist überwiegend ein **Frontend-Aggregations-/Verlinkungsprojekt**: fünf der sechs
Bausteine (D-01, D-02, D-05, D-06, D-07 sowie die Punkte-Meilenstein-Schwellen aus D-04 Typ 2)
lassen sich **ohne jede Backend-Änderung** aus bereits vorhandenen Endpunkten und bereits im
JSON mitgelieferten (aber im TS-Typ nicht deklarierten) Feldern bauen. Das betrifft insbesondere
D-02 ("Braucht deine Aufmerksamkeit"): `anime_contributions.created_at`/`confirmed_at` existieren
in der DB (Migration 0086) und werden vom Go-Handler bereits als JSON-Feld ausgeliefert
(`AnimeContributionRow.CreatedAt` in `backend/internal/repository/anime_contributions_inputs.go:27`)
— das Frontend-DTO `MeAnimeContribution` (`frontend/src/types/contributions.ts:75-108`) deklariert
dieses Feld nur nicht. Variante A ist damit **verifiziert machbar ohne Backend-Zusatz** — es
genügt, `created_at`/`confirmed_at` additiv im TS-Typ zu ergänzen.

D-03 (5 Kennzahlen) und D-04 (Fortschritt je Kategorie) haben dagegen einen echten, konkret
belegten Backend-Lücken-Befund: Die eigene Profil-Route (`GetOwnProfile`,
`backend/internal/repository/member_profile_repository.go:55-94`) lädt **weder `total_points`
noch irgendwelche live-abgeleiteten Badges** (Rolleneinstieg, Punkt-Meilenstein, Rollen-Volumen,
Beitrags-Familien aus Phase 112/113) — diese Projektionen existieren nur innerhalb von
`GetPublicMemberProfile` (derselben Datei, aufgerufen nur von der öffentlichen `/members/:slug`-
Route). Zusätzlich werfen die drei Phase-113-Zählfunktionen (`highestContrib*Tier` in
`member_profile_contribution_badges_repository.go`) die **Rohzahlen** (Projekte/Chronist/
Bildarchivar-Count) nach der Tier-Ableitung sofort weg — nur der Tier-Badge-Code
(`contribution_chronicle_gold` etc.) verlässt die Funktion, nie die Zahl selbst. Für "noch X bis
nächste Stufe" (D-04) braucht die Dashboard-Seite aber genau diese Rohzahl. Das Gleiche gilt für
`loadRoleVolumeBadges` (Rollen-Volumen, Phase 112 Typ 3). **Ergebnis:** D-03/D-04 benötigen einen
kleinen, additiven Backend-Schritt (keine Migration, keine neue Tabelle) — die bereits
existierenden SQL-Abfragen müssen nur die Rohzahl statt nur den Tier-String zurückgeben, gebündelt
in einer neuen (oder erweiterten) Read-Projektion für die eigene Sicht. Dies ist explizit **kein**
Bruch von "keine eigene Datenhaltung" (keine neue Tabelle/Spalte), aber sehr wohl ein Go-Code-Zusatz
— das muss dem Planner ehrlich mitgeteilt werden, weil CONTEXT.md dies für D-03 (Bilder) offen
gelassen hat, aber für D-04 stillschweigend als reine Konsum-Aufgabe angenommen hat.

**Primary recommendation:** Neue Route `/me/dashboard` als Client Component nach dem etablierten
`/me/profile`-Muster (Parallel-Fetch via `Promise.all`, `useAuthSession`-Gate, `@/components/ui`
ausschließlich). Fürs Backend: **eine neue, schlanke Aggregations-Funktion** (z. B.
`GetOwnDashboard` in `member_profile_repository.go` oder eigene Datei wegen 450-Zeilen-Limit), die
die bereits vorhandenen Bausteine wiederverwendet (`loadTotalPoints`, `loadRoleVolumeBadges`,
`loadContributionBadges`, `badgeRepo.GetMemberBadges`) und dabei **die Rohzahlen statt nur die
Tier-Strings** zurückgibt. Kein Migrationsbedarf, keine neue Persistenz — nur ein neuer Read-Pfad
plus additive TS-Typen/OpenAPI-Felder.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 Abgrenzung Dashboard vs. `/me/profile`**
`/me/profile` = Edit-Konsole (Avatar/Hintergrund, Story, Sichtbarkeit, Badge-Freigabe,
Member-Claim, Account/Security — Formulare/Uploads). Dashboard = read-only Cockpit (Zahlen,
Status, Absprünge). Keine Doppelung: das Dashboard verlinkt nur, ändert nichts.

**D-02 „Braucht deine Aufmerksamkeit" (oben, prominent)**
Zeigt kürzlich neu zugewiesene Projekte/Releases (Member in einer Rolle) mit Direktlink zur
Arbeitsfläche (Release-Besetzung / Projekt), neueste zuerst, dezente „neu"-Markierung.
Variante A (zeitbasiert, gewählt): „neu" = Zuweisung innerhalb der letzten X Tage. Nutzt die
vorhandenen Zeitstempel der Besetzungs-/Contribution-Daten → kein Backend-Zusatz. Nachteil: „neu"
= „kürzlich", verschwindet nicht durchs Ansehen. Variante B (echtes „ungelesen",
`last_seen`/„gesehen"-Marker) ist deferred — späterer Ausbau. Research verifiziert, dass die
Zuweisungs-Zeitstempel für Variante A wirklich ausreichen.

**D-03 Kennzahlen (5 Kacheln)**
Punkte (aus 109), Badges (Anzahl), Projekte (Anzahl), hochgeladene Bilder, geschriebene Beiträge.
Letzte zwei sind zugleich die Zähler hinter den Bildarchivar-/Chronist-Badges (Phase 113).
Beitragszahl via `previous_contributions_count` bereits nachweisbar; Bilder-Zahl im Research
verifizieren.

**D-04 Fortschritt je Badge-Kategorie (Tabelle)**
Pro Badge-Familie „aktuelle Stufe · noch X bis nächste Stufe": Punkte-Meilenstein (Typ 2),
Rollen-Volumen je Rolle (Typ 3), Bildarchivar/Chronist/dok. Projekte (Phase 113) … Konsument der
Schwellen aus Phase 112 (Typ 2/3) und 113 — 116 definiert keine Schwellen selbst.

**D-05 Meine Gruppen**
Liste der Gruppen, in denen der User Mitglied ist (+ Rollenkontext), mit Links zu den Gruppen.
Nutzt die vorhandene „Meine Gruppen"-Datenquelle (AppShell rendert sie bereits).

**D-06 Schnellzugriffe**
Anime entdecken (`/anime`, erster), Rangliste, Fansub-Gruppen (114), Suche (→ 115-Suchseite
`/suche`, fokussiertes leeres Suchfeld), Mein Profil. Nur Absprünge, kein eigenes UI.

**D-07 UI**
Globales UI-System Pflicht (`@/components/ui`), responsiv, barrierefrei, keine neue
Designsprache.

### Claude's Discretion
Genaue Kachel-/Sektions-Anordnung, Fenster „letzte X Tage" für Variante A, Tabellen-Layout.

### Deferred Ideas (OUT OF SCOPE)
- Variante B (echtes „ungelesen" via `last_seen`/„gesehen"-Marker) für neue Zuweisungen.
- Watchlist-Sektion (Feature existiert, `getWatchlist`) — vorerst raus.
- „Neueste Releases" / „zuletzt aktualisierte Animes"-Sektion (eigene Datenabfrage).
- Globale Benachrichtigung (Glocke/Zähler am Nav) — eigene spätere Phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 116 hat keine REQ-IDs in `.planning/REQUIREMENTS.md` (kein Eintrag dort — wie bereits bei
Phase 111, 114). Coverage-Einheit sind die Kontext-Entscheidungen D-01…D-07 aus `116-CONTEXT.md`.

| ID | Beschreibung | Research-Unterstützung |
|----|--------------|------------------------|
| D-01 | Dashboard read-only, `/me/profile` bleibt Edit-Konsole | Bestätigt: keine Backend-Schreibpfade nötig; nur GET-Aggregation |
| D-02 | „Braucht deine Aufmerksamkeit", Variante A zeitbasiert | Verifiziert: `created_at`/`confirmed_at` bereits in JSON vorhanden, nur TS-Typ fehlt Feld — s. Abschnitt „Architecture Patterns" |
| D-03 | 5 Kennzahlen | Teilweise Lücke verifiziert: Punkte/Badges/Bilder/Beiträge/Projekte brauchen neue additive Backend-Aggregation (Rohzahlen aktuell verworfen) — s. „Common Pitfalls" |
| D-04 | Fortschritt je Kategorie-Tabelle | Lücke verifiziert: nur Tier-Strings, keine Rohzahlen im Backend exponiert; Schwellen bereits an 2 von 3 Stellen ins Frontend gespiegelt (Punkte, Rollen-Volumen), Contribution-Familien (113) noch nicht |
| D-05 | Meine Gruppen | Verifiziert: Datenquelle ist `getOwnProfile().data.memberships` (AppShellClientWrapper.tsx:120), reicht für Dashboard |
| D-06 | Schnellzugriffe + Nav | Verifiziert: `/anime`, `/members/ranking`, `/fansubs` existieren live; `/suche` (Phase 115) existiert **noch nicht im Code** (nur Planungsdokumente) — Abhängigkeits-Risiko |
| D-07 | Globales UI-System | `HeroMetrics`, `Table`, `Card`, `EmptyState`, `Badge` als passende Primitives identifiziert |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth-/Session-Auflösung (wer ist eingeloggt) | Browser/Client | — | Team4s-Muster: `useAuthSession` (Token in Client-State), kein SSR-Cookie-Auth für `/me/*`-Routen (siehe alle bestehenden `/me/*`-Seiten, alle `'use client'`) |
| Aggregation der 5 Kennzahlen + Kategorie-Fortschritt | API/Backend | — | Rohzahlen existieren nur serverseitig in SQL-Aggregaten (`loadContributionBadges`, `loadRoleVolumeBadges`, `loadTotalPoints`); müssen in einer Response gebündelt werden, sonst Client-Fan-out über 4+ Endpunkte |
| „Braucht deine Aufmerksamkeit"-Filterung (zeitbasiert) | Browser/Client | API/Backend | Rohdaten (Liste + `created_at`) kommen vom bestehenden `/me/anime-contributions`-Endpunkt; das "ist neu (< X Tage)"-Prädikat kann rein clientseitig berechnet werden (kein Serverfilter nötig) |
| Meine Gruppen (Liste + Links) | Browser/Client | API/Backend | Daten bereits im `/me/profile`-Response (`memberships`); reine Wiederverwendung, keine neue Aggregation |
| Schnellzugriffe (Links) | Browser/Client | — | Statische Linkliste, keine Datenabhängigkeit außer Routen-Existenz |
| Persistenz/Schreibpfade | — (keine) | — | Phase ist explizit read-only; keine DB-Schema-Änderung nötig |

## Standard Stack

### Core
Keine neuen externen Bibliotheken. Ausschließlich Wiederverwendung bestehender Team4s-Bausteine:

| Baustein | Ort | Zweck |
|----------|-----|-------|
| `@/components/ui` (Card, HeroMetrics, Table, Badge, EmptyState, SectionHeader, PageHeader) | `frontend/src/components/ui/index.ts` | Alle Dashboard-Kacheln/Sektionen — Pflicht per CLAUDE.md |
| `useAuthSession` | `frontend/src/lib/useAuthSession.ts` | Session-Gate, identisch zu `/me/profile`, `/me/contributions` |
| `getOwnProfile`, `getMyBadges`, `getMyAnimeContributions` | `frontend/src/lib/api.ts:3042`, `:9128`, `:8560` | Bestehende, sofort nutzbare Datenquellen |
| lucide-react Icons | bereits Projektabhängigkeit | Für Kachel-/Nav-Icons (Konsistenz mit AppShell) |

### Supporting (neu zu bauende, aber additive Backend-Bausteine)
| Baustein | Ort (Vorschlag) | Zweck | Warum nötig |
|----------|-----------------|-------|-------------|
| `GetOwnDashboard`-Aggregation (Go) | neue Datei `backend/internal/repository/member_profile_dashboard_repository.go` (450-Zeilen-Limit) | Bündelt total_points, Badge-Anzahl, Projekte-Anzahl, Bilder-Anzahl, Beiträge-Anzahl + Kategorie-Rohzahlen in einer Response | Keine bestehende Route liefert das für die eigene (nicht-öffentliche) Sicht — siehe Summary |
| Handler + Route `GET /api/v1/me/dashboard` | `backend/internal/handlers/` (neue oder bestehende Me-Handler-Datei) | Ein Aufruf statt 4-6 Client-Fan-out-Requests | Vermeidet das aus vorherigen Phasen bekannte SSR-/Client-Fan-out-Problem (siehe Pitfalls) |
| OpenAPI-Schema-Erweiterung | `shared/contracts/openapi.yaml` | Vertragsparität Backend/Frontend | Projekt-Konvention (Phase 72-04 Decision) |
| TS-Typ `MeAnimeContribution` additiv um `created_at`/`confirmed_at` | `frontend/src/types/contributions.ts` | D-02 Variante A | Feld kommt bereits vom Server, muss nur deklariert werden |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Neue `/me/dashboard`-Aggregation | Dashboard macht 5-6 einzelne Client-Fetches (`getOwnProfile`, `getMyBadges`, `getMemberProfile(ownSlug)`, `getMyAnimeContributions`, …) | Kein Backend-Zusatz, aber: (a) verletzt „kein API-Fan-out pro Zeile"-Präzedenzfall aus Phase 109/110-Erfolgskriterien, (b) `getMemberProfile(ownSlug)` liefert nur `visibility='public'`-gefilterte Badges — für die EIGENE Sicht fachlich falsch (User sieht seine eigenen „hidden"-Badges nicht in der eigenen Kennzahl) |
| Neue Route `/me/dashboard` (Client Component) | Server Component mit Cookie-Auth | Team4s hat für `/me/*` durchgängig Client-Component + Token-Auth-Muster (kein SSR-Auth-Seam für diese Routen); Server-Component-Ansatz wäre Architekturbruch gegen den Rest der Codebase |

**Installation:** Keine neuen Pakete. `npm install` nicht erforderlich.

**Package Legitimacy Audit:** Entfällt — Phase 116 installiert keine externen Pakete.

## Architecture Patterns

### System Architecture Diagram

```
[Browser: /me/dashboard, 'use client']
   |
   |-- useAuthSession() --> Token-Gate (identisch zu /me/profile)
   |
   |-- Promise.all([
   |       getOwnProfile()            -> memberships (D-05), has_member_profile-Gate
   |       getMyAnimeContributions()  -> Liste inkl. created_at (D-02, "neu"-Filter clientseitig)
   |       getOwnDashboard()  [NEU]   -> total_points, badges_count, projects_count,
   |                                     images_count, contributions_count,
   |                                     category_progress[] (D-03, D-04)
   |   ])
   |
   v
[Render-Pipeline, reiner Client-State, kein SSR]
   |
   |-- "Braucht deine Aufmerksamkeit"-Sektion
   |     Filter: contributions.filter(c => isRecentlyAssigned(c.created_at, windowDays))
   |     Link je Zeile: release_version_id != null
   |         ? `/me/releases/${release_version_id}/workspace`
   |         : `/me/projects/${anime_id}/group/${fansub_group_id}`
   |
   |-- HeroMetrics (5 Kacheln) <- getOwnDashboard()-Response
   |
   |-- Kategorie-Fortschritt-Tabelle <- getOwnDashboard().category_progress[]
   |     Zeile: { familie, current_tier, current_count, next_threshold, next_tier_label }
   |
   |-- Meine Gruppen <- getOwnProfile().data.memberships
   |     Link je Zeile: `/fansubs/${fansub_group_slug}` (öffentliches Profil, für ALLE Mitglieder
   |     erreichbar) ODER `/admin/fansubs/${fansub_group_id}/edit` (nur falls Edit-Capability) —
   |     Entscheidung Claude's Discretion, siehe Pitfall "Meine-Gruppen-Linkziel"
   |
   |-- Schnellzugriffe <- statische Liste: /anime, /members/ranking, /fansubs, /suche, /me/profile
   |
[Backend, additiv]
   |
   GET /api/v1/me/dashboard (NEU)
     -> resolveVerifiedMemberID (bestehendes Muster, contributions_me_handler.go:65)
     -> loadTotalPoints(memberID)                         [bereits vorhanden, Zeile 636]
     -> badgeRepo.GetMemberBadges(memberID)                [bereits vorhanden, /me/badges-Pfad]
     -> loadRoleVolumeBadges  -> MUSS Rohzahl statt nur Tier zurückgeben (Erweiterung)
     -> loadContributionBadges -> MUSS Rohzahl statt nur Tier zurückgeben (Erweiterung)
     -> NEU: COUNT(DISTINCT anime_id, fansub_group_id) für "Projekte (Anzahl)"
     -> Antwort: ein JSON-Envelope statt N Requests
```

### Recommended Project Structure
```
frontend/src/app/me/dashboard/
├── page.tsx                       # Client Component, Promise.all-Aggregation (Analog zu me/profile/page.tsx)
├── page.test.tsx                  # Wave-0-RED-Test zuerst
├── page.module.css                # Falls Kachel-Layout eigenes CSS braucht
└── components/
    ├── AttentionSection.tsx       # D-02 "Braucht deine Aufmerksamkeit"
    ├── DashboardMetrics.tsx       # D-03, nutzt HeroMetrics
    ├── CategoryProgressTable.tsx  # D-04, nutzt Table
    ├── MyGroupsSection.tsx        # D-05, kann MembershipsSection (bereits vorhanden,
    │                               #   frontend/src/components/profile/MembershipsSection.tsx) wiederverwenden/erweitern
    └── QuickLinksSection.tsx      # D-06

backend/internal/repository/
└── member_profile_dashboard_repository.go   # NEU, additive Aggregation (450-Zeilen-Limit beachten)

backend/internal/handlers/
└── contributions_me_handler.go (oder neue dashboard_me_handler.go)  # neuer Handler für GET /me/dashboard
```

### Pattern 1: Client-seitiger Parallel-Fetch (bereits Team4s-Standard)
**What:** Alle `/me/*`-Seiten laden über `Promise.all` parallel, nie seriell.
**When to use:** Für Phase 116 zwingend — die Seite aggregiert mehr Quellen als jede bisherige
`/me/*`-Seite; serielles Fetching würde den aus früherer Erfahrung bekannten
SSR-Request-Fächer-Bottleneck (siehe Projekt-Memory zur Public-Projektseite) im Client wiederholen.
**Example:**
```typescript
// Source: frontend/src/app/me/profile/page.tsx:209-219 (bestehendes Muster)
const loadProfile = useCallback(async (options) => {
  const [response, claim, badgesResponse] = await Promise.all([
    getOwnProfile(),
    getMyMemberClaim().catch(() => null),
    getMyBadges().catch(() => ({ badges: [] })),
  ])
  // ...
}, [applyProfile])
```
Phase 116 sollte exakt dieses Muster mit den drei genannten Dashboard-Quellen wiederholen, NICHT
mit 5-6 unabhängigen Requests, die serverseitig ohnehin dieselben Tabellen treffen.

### Pattern 2: Direktlink-Auflösung nach Contribution-Granularität
**What:** `MeAnimeContribution.release_version_id` entscheidet, ob der Link auf die
release-version-scoped Arbeitsfläche oder die anime-weite Projekt-Arbeitsfläche zeigt.
**When to use:** D-02 „Direktlink zur Arbeitsfläche".
**Example:**
```typescript
// Quellrouten verifiziert:
// - frontend/src/app/me/releases/[versionId]/workspace/page.tsx  (Release-Version-Ebene)
// - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx (Anime-Ebene)
function resolveWorkspaceHref(c: MeAnimeContribution): string {
  return c.release_version_id
    ? `/me/releases/${c.release_version_id}/workspace`
    : `/me/projects/${c.anime_id}/group/${c.fansub_group_id}`
}
```

### Pattern 3: "Neu"-Prädikat rein clientseitig, kein Serverfilter nötig
**What:** Variante A benötigt nur `created_at` (oder `confirmed_at`) + einen clientseitigen
Tages-Schwellenwert.
**Example:**
```typescript
// created_at kommt bereits im JSON mit (Go: AnimeContributionRow.CreatedAt, json:"created_at"),
// nur MeAnimeContribution (frontend/src/types/contributions.ts:75) deklariert es noch nicht.
function isRecentlyAssigned(createdAt: string, windowDays: number): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  return ageMs <= windowDays * 24 * 60 * 60 * 1000
}
```
**Empfehlung für `windowDays`:** 14 Tage als Startwert (Claude's Discretion laut CONTEXT.md) — an
keiner Stelle im Projekt vordefiniert, es gibt keinen bestehenden Präzedenzfall für ein
"neu"-Zeitfenster in Team4s. Sollte als benannte Konstante mit Kommentar geführt werden, nicht als
Magic Number.

### Anti-Patterns to Avoid
- **Public-Profil-Endpunkt für die eigene Kennzahlenanzeige zweckentfremden:**
  `getMemberProfile(ownSlug)` liefert `total_points` und Badges, ABER `loadPublicBadges` filtert
  hart auf `visibility='public' AND status='active'` (`member_profile_repository.go:582`) — ein
  User, der ein Badge auf "hidden" gesetzt hat, sähe es auf seinem EIGENEN Dashboard fälschlich
  nicht mehr. Für die eigene Sicht ist das fachlich falsch; nur `GetOwnProfile`/eine neue
  Dashboard-Aggregation darf ungefilterte eigene Zahlen liefern.
- **Neue Badge-Schwellen erfinden:** Alle Schwellen (Punkte 1/50/200/500/1000/2500, Rollen-Volumen
  12/108/320/510, Contribution-Familien 1/5/15 bzw. 10/50/150) sind bereits in Phase 110/112/113
  festgelegt (Go: `highestRoleVolumeTier`, `highestContrib*Tier`; TS:
  `POINT_MILESTONES`, `ROLE_VOLUME_TIER_THRESHOLDS`). Phase 116 darf sie nur konsumieren/spiegeln,
  laut D-04 explizit gefordert.
- **Sequenzielle statt gebündelte Zählabfragen im Backend:** Falls die neue Dashboard-Aggregation
  gebaut wird, sollte sie so viele Zählungen wie möglich in derselben Transaktion/demselben
  Round-Trip bündeln (Analog zu `loadContributionBadges`, das 3 `QueryRow`-Aufrufe in einer
  Funktion kombiniert), statt 5 einzelne Repository-Methoden vom Handler aus seriell aufzurufen.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Metrik-Kacheln (5 Kennzahlen) | Eigenes Grid/Card-Markup | `HeroMetrics` (`@/components/ui`, `frontend/src/components/ui/HeroMetrics.tsx`) | Bereits das etablierte Primitive für genau diesen Zweck (siehe `MemberProfileHero.tsx:177`, `ProjectStats.tsx`, `FansubHeroSection.tsx`) |
| Fortschritts-Tabelle (D-04) | Eigenes `<div>`-Grid | `Table`/`TableHead`/`TableBody`/`TableRow` (`@/components/ui`) | Pflicht-Primitive laut CLAUDE.md; native `<table>` wird durch ESLint-Regel gewarnt/verboten |
| Leerzustände ("noch keine Beiträge") | Eigener Platzhaltertext | `EmptyState` (`@/components/ui`), analog `RecentMediaSection.tsx:14` | Konsistentes Leerstatus-Pattern bereits etabliert |
| Badge-Label-/Icon-Auflösung | Eigene switch/case-Mapping-Tabelle | `getMemberBadgePresentation`, `resolveRoleVolumePresentation`, `MEMBER_BADGE_GROUP_LABELS` (`frontend/src/components/profile/memberBadgeLabels.ts`) | Bereits vollständige, getestete Zuordnung für alle bestehenden Badge-Familien inkl. Rollen-Volumen-Parsing |
| Meine-Gruppen-Datenbeschaffung | Neuer API-Call/Repository | `getOwnProfile().data.memberships` (bereits von AppShell konsumiert, `AppShellClientWrapper.tsx:120`) | Identische Daten, kein zweiter Endpunkt nötig |
| Punkt-Meilenstein-Ableitung | Eigene Schwellenliste | `deriveMilestoneBadge` + `POINT_MILESTONES` (`memberBadgeLabels.ts:226-240`) | Schon vorhanden, liefert höchsten erreichten Meilenstein aus `total_points` — für "noch X bis nächste Stufe" muss nur die NÄCHSTHÖHERE Schwelle zusätzlich aus derselben Konstante gelesen werden (aktuell nicht exportiert, siehe Pitfall) |

**Key insight:** Die überwiegende Menge der UI-Bausteine UND der fachlichen Schwellen-Logik
existiert bereits in Team4s (Phase 110/112/113). Das Risiko in Phase 116 liegt nicht im Erfinden
neuer UI, sondern darin, die vorhandene Logik (Schwellenwerte, Tier-Ableitung) zu duplizieren statt
zu re-exportieren/wiederzuverwenden.

## Common Pitfalls

### Pitfall 1: "kein Backend-Zusatz" wird fälschlich auf D-03/D-04 übertragen
**What goes wrong:** Der Planner nimmt an, dass wie bei D-02 auch die Kennzahlen/Kategorie-
Fortschritt komplett ohne Backend-Änderung gehen.
**Why it happens:** CONTEXT.md formuliert "kein Backend-Zusatz" explizit nur für D-02 (Variante
A). Für D-03 steht wörtlich "im Research verifizieren" (Bilder-Zahl) — und genau das hat dieses
Research widerlegt: weder Bilder- noch Beiträge- noch Projekte-Zahl noch die Rohzahlen für D-04
sind aktuell über irgendeinen für den eingeloggten User erreichbaren Endpunkt verfügbar.
**How to avoid:** Plan muss einen expliziten (kleinen) Backend-Task für eine neue
Aggregations-Projektion einplanen, die die in `member_profile_contribution_badges_repository.go`
und `member_profile_role_volume_repository.go` bereits berechneten, aber verworfenen Rohzahlen
zusätzlich zurückgibt.
**Warning signs:** Wenn ein Plan versucht, "Badges (Anzahl)" allein aus `getMyBadges()` abzuleiten
— das zählt NUR persistierte `member_badges`-Zeilen (`founding_member`, `historical_leader`,
`long_term_member`, `first_contribution`, `productive_*`, `all_rounder`, `verified`), NICHT die
live-abgeleiteten `role_entry_*`, `point_milestone_*`, `role_volume_*`, `contribution_*`-Badges
(diese existieren nur innerhalb von `GetPublicMemberProfile`, verifiziert in
`member_profile_repository.go:531-544` vs. `GetOwnProfile:55-94`, wo diese Aufrufe fehlen).

### Pitfall 2: "previous_contributions_count" ist NICHT "geschriebene Beiträge"
**What goes wrong:** CONTEXT.md nimmt an, `previous_contributions_count` (auf
`PublicMemberProfileData`) sei die Quelle für die Kennzahl "geschriebene Beiträge". Das ist
sachlich falsch.
**Why it happens:** Der Feldname klingt passend, ist aber inhaltlich etwas anderes:
`PreviousContributionsCount = len(profile.PreviousContributions)`
(`member_profile_repository.go:571`) zählt **abgeschlossene Anime-Projekte** (distinct
`anime_id`+`fansub_group_id` mit `ended_year IS NOT NULL`, `status='confirmed'`,
`is_public_on_member_profile=true` — Query in `loadPreviousContributions:1465-1487`), NICHT
geschriebene Notizen/Texte.
**How to avoid:** Die korrekte Quelle für "geschriebene Beiträge" ist der bereits vorhandene
`chronicleCount` in `loadContributionBadges` (Familie 2 "Chronist",
`member_profile_contribution_badges_repository.go:142-157`): Summe aus
`release_version_notes` (member_id direkt) + `anime_fansub_project_notes` +
`fansub_group_notes` (beide über den Autor-Seam `created_by_user_id` -> verified
`member_claims`). Dieser Wert muss (wie in Pitfall 1 beschrieben) zusätzlich als Rohzahl
zurückgegeben werden — aktuell wird nur der Tier-String daraus abgeleitet.
**Warning signs:** Ein Plan, der `previous_contributions_count` für die "Beiträge"-Kachel verwendet
— das wäre tatsächlich näher an "Projekte (Anzahl)" (abgeschlossene Projekte), nicht an
"geschriebene Beiträge".

### Pitfall 3: `/suche`-Route existiert zum Research-Zeitpunkt noch nicht
**What goes wrong:** D-06 verlinkt auf `/suche` (Phase 115), aber Phase 115 hat im Repo **nur
Planungsdokumente** (`.planning/phases/115-globale-suche-postgres-fts/*.md`), keine Migration 0140,
keine `frontend/src/app/suche/`-Dateien, keinen `SearchProvider`. Auch der Nav-Platzhalter für
"Suche" ist noch `disabled: true, badge: 'bald'` (`AppShell.tsx:191`, anonyme Nav).
**Why it happens:** Phase 115 ist laut ROADMAP.md ein Vorgänger von 116, aber zum Zeitpunkt dieses
Research (aktuelle Ausführungsposition laut STATE.md: Phase 111) noch nicht ausgeführt.
**How to avoid:** Wenn Phase 116 tatsächlich ausgeführt wird, sollte zuerst per
`ls frontend/src/app/suche` geprüft werden, ob die Route inzwischen existiert (sie sollte, da 115
vor 116 in der Ausführungsreihenfolge liegt). Falls nicht: Schnellzugriff auf "Suche" defensiv
`disabled`/`badge: 'bald'` lassen statt auf eine 404-Route zu verlinken — exakt das Muster, das
AppShell selbst schon für unfertige Features nutzt.
**Warning signs:** Ein Wave-0-Test, der `/suche` als harten Link ohne Existenzprüfung annimmt und
bei Ausführung vor Phase-115-Fertigstellung bricht.

### Pitfall 4: Dashboard-Nav-Item hängt aktuell in der falschen Nav-Gruppe
**What goes wrong:** Der tote "Dashboard"-Eintrag (`AppShell.tsx:124`) steht in `publicItems`
(Gruppe "Public-Bereich", zusammen mit Anime entdecken/Rangliste/Fansub-Gruppen — alles auch für
Anonyme sinnvoll), NICHT in `myItems`/Gruppe "Mein Bereich" (Zeile 132-140, wo "Mein Profil"/"Meine
Projekte" stehen). Das ist aber ein reines Personalisierungs-Feature für eingeloggte User.
**Why it happens:** Der Platzhalter wurde offenbar früh angelegt, ohne die spätere fachliche
Function (eingeloggter Landing-Hub) zu antizipieren.
**How to avoid:** Bei der Nav-Aktivierung (analog Phase 114-02-Muster) den Eintrag aus
`publicItems` in `myItems` verschieben, `disabled`/`badge` entfernen, `href: '/me/dashboard'`
setzen. Kein äquivalenter Eintrag existiert in `AppShellAnonNavGroups` (anonyme Nutzer sehen "Meine
Gruppen"/Dashboard ohnehin nie) — das ist korrekt und muss so bleiben.
**Warning signs:** Ein Plan, der nur `disabled: true` entfernt, ohne die Gruppenzugehörigkeit zu
prüfen — Dashboard bliebe dann fälschlich neben "Anime entdecken" statt bei "Mein Profil".

### Pitfall 5: "Meine Gruppen"-Linkziel ist im Bestand möglicherweise schon falsch/optimistisch
**What goes wrong:** Der bestehende AppShell-Code verlinkt "Meine Gruppen"-Einträge unbedingt auf
`/admin/fansubs/${fansub_group_id}/edit` (`AppShell.tsx:159`) — eine **Admin-Edit-Route**, die
vermutlich eine Schreib-/Verwaltungs-Capability voraussetzt, nicht nur reine App-Mitgliedschaft.
**Why it happens:** Historisch gewachsen aus einer Zeit, in der "Meine Gruppen" primär für
Leader/Admins gedacht war.
**How to avoid:** Für ein **read-only Cockpit** ist `/fansubs/${fansub_group_slug}` (öffentliches
Gruppenprofil, für jeden erreichbar, `frontend/src/app/fansubs/[slug]/page.tsx`) das
fachlich passendere Ziel für D-05 — unabhängig von Rechten immer erreichbar. Ob zusätzlich (nur
bei vorhandener Capability) ein Zweitlink auf die Admin-Edit-Seite sinnvoll ist, ist Claude's
Discretion, sollte aber bewusst entschieden, nicht unreflektiert von AppShell kopiert werden.
**Warning signs:** 403-Fehler beim Klick auf "Meine Gruppen" für Mitglieder ohne Edit-Capability,
falls der AppShell-Linkstil unreflektiert übernommen wird.

### Pitfall 6: "Projekte (Anzahl)" hat keine bestehende Single-Source
**What goes wrong:** Es gibt keine existierende Zahl, die direkt "Anzahl der Anime-Projekte, an
denen der Member mitgewirkt hat" beziffert. `historical_credits` (`MemberProfileCredit[]`) zählt
pro (Gruppe, Rolle) `release_count`, nicht Projekte. `current_projects.length +
previous_contributions_count` (beide nur auf der öffentlichen Projektion) käme nahe, wäre aber
zwei zusätzliche, öffentlich gefilterte Listen.
**How to avoid:** Für die eigene Sicht empfiehlt sich eine einfache neue Aggregatsabfrage:
`SELECT COUNT(DISTINCT anime_id, fansub_group_id) FROM anime_contributions WHERE
COALESCE(member_id, <hfgm-join>) = $1 AND status = 'confirmed'` — ungefiltert nach
Sichtbarkeit (Eigenansicht), analog zum bestehenden `hasProjectAssignments`-Query-Stil
(`member_profile_repository.go:101-119`).
**Warning signs:** Ein Plan, der `memberships.length` (Gruppenmitgliedschaften) fälschlich als
"Projekte (Anzahl)" ausgibt — das sind Gruppen, keine Anime-Projekte.

## Code Examples

### Bestehende Zeitstempel-Ausgabe für D-02 (bereits im JSON, nur TS-Typ fehlt)
```go
// Source: backend/internal/repository/anime_contributions_inputs.go:11-32
type AnimeContributionRow struct {
    ID                      int64      `json:"id"`
    // ...
    ConfirmedAt             *time.Time `json:"confirmed_at"`
    CreatedAt               time.Time  `json:"created_at"`
    UpdatedAt               time.Time  `json:"updated_at"`
    // ...
}
// MemberContributionWithProposalRow (anime_contributions_proposal_repository.go:258-269)
// embeds AnimeContributionRow -- JSON-Serialisierung enthält created_at bereits HEUTE,
// unabhängig davon, ob das TS-DTO das Feld deklariert.
```

### Notwendige additive TS-Typ-Erweiterung
```typescript
// frontend/src/types/contributions.ts:75 -- additiv ergänzen:
export interface MeAnimeContribution {
  // ... bestehende Felder unverändert ...
  created_at: string
  confirmed_at?: string | null
}
```

### Bestehende, aber verworfene Rohzahlen (Backend-Erweiterungspunkt für D-03/D-04)
```go
// Source: backend/internal/repository/member_profile_contribution_badges_repository.go:142-164
var chronicleCount int64
if err := r.db.QueryRow(ctx, `... `).Scan(&chronicleCount); err != nil { /* ... */ }
if tier := highestContribChronicleTier(int(chronicleCount)); tier != "" {
    items = append(items, models.PublicMemberBadge{
        ID: 0, BadgeCode: "contribution_chronicle_" + tier, BadgeCategory: "contribution",
    })
}
// chronicleCount selbst wird NIE zurückgegeben -- genau das braucht D-03 ("geschriebene
// Beiträge") und D-04 ("noch X bis nächste Stufe").
```

### Punkt-Meilenstein-Schwellen bereits clientseitig gespiegelt (für D-04 Typ 2 wiederverwendbar)
```typescript
// Source: frontend/src/components/profile/memberBadgeLabels.ts:226-240
const POINT_MILESTONES: Array<{ threshold: number; badge_code: string }> = [
  { threshold: 2500, badge_code: 'point_milestone_legend' },
  { threshold: 1000, badge_code: 'point_milestone_veteran' },
  { threshold: 500, badge_code: 'point_milestone_engaged' },
  { threshold: 200, badge_code: 'point_milestone_experienced' },
  { threshold: 50, badge_code: 'point_milestone_active' },
  { threshold: 1, badge_code: 'point_milestone_first' },
]
// "noch X bis nächste Stufe" = kleinste threshold > totalPoints, minus totalPoints.
// POINT_MILESTONES ist aktuell nicht exportiert -- für D-04 muss es (oder eine abgeleitete
// "next threshold"-Hilfsfunktion) exportiert werden.
```

## State of the Art

| Bereich | Aktueller Zustand | Für Phase 116 relevant |
|---------|--------------------|-----------------------|
| Punkte-Anzeige | Nur auf `/members/[slug]` (öffentlich), NIE auf `/me/profile` (`MemberProfileHero.tsx:176`: `isPublicView && totalPoints !== null`) | Dashboard wäre die ERSTE Stelle, an der der eingeloggte User seine eigene Punktzahl in der eigenen (nicht-öffentlichen) Sicht sieht |
| Live-abgeleitete Badges (role_entry/point_milestone/role_volume/contribution_*) | Nur in `GetPublicMemberProfile`, nie in `GetOwnProfile` | Dashboard braucht neuen Aggregations-Pfad für die eigene Sicht |
| Badge-Rohzahlen (für "noch X bis") | Werden in Go berechnet, aber nach Tier-Ableitung verworfen (3 von 3 Familien betroffen: Rollen-Volumen, Contribution-Projekte/Chronist/Bildarchivar) | Muss additiv exponiert werden |
| Schwellen-Duplizierung Go↔TS | 2 von 3 Fällen bereits gespiegelt (Punkte: nur TS; Rollen-Volumen: beide Seiten, `ROLE_VOLUME_TIER_THRESHOLDS`); Contribution-Familien (113): nur Go, keine TS-Spiegelung | Für D-04 müssen ggf. auch die 113er-Schwellen (1/5/15, 10/50/150, 10/50/150) clientseitig gespiegelt werden, ODER die Rohzahl+Schwelle direkt vom Backend mitgeliefert werden (empfohlen — weniger Duplizierung) |

**Deprecated/outdated:** Nichts — alle referenzierten Muster sind aktueller Code (Phasen 109-114,
zwischen April und Juli 2026 gebaut).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Empfohlener Routenname `/me/dashboard` (CONTEXT.md legt keinen Pfad fest, nur den Nav-Label "Dashboard") | Architecture Patterns, Recommended Project Structure | Gering — reine Namenskonvention, leicht im Plan/Discuss zu bestätigen; folgt aber konsistent dem `/me/*`-Muster aller anderen personalisierten Seiten |
| A2 | Empfehlung, eine NEUE `GET /api/v1/me/dashboard`-Aggregation zu bauen statt `GetOwnProfile` direkt zu erweitern | Standard Stack, Summary | Mittel — alternative wäre additive Erweiterung von `GetOwnProfile` selbst (dann hätte auch `/me/profile` künftig Zugriff auf Punkte/Badges); beides ist technisch machbar, Entscheidung sollte in Planung/Discuss getroffen werden, da sie Auswirkung auf zukünftige `/me/profile`-Anzeige hat |
| A3 | `windowDays = 14` als Startwert für "neu" (Variante A) | Architecture Patterns, Pattern 3 | Gering — CONTEXT.md deklariert dies explizit als Claude's Discretion; jeder Wert ist änderbar, keine Persistenzabhängigkeit |
| A4 | "Meine Gruppen" sollte auf `/fansubs/[slug]` statt `/admin/fansubs/[id]/edit` verlinken | Common Pitfalls, Pitfall 5 | Mittel — falls der Planner stattdessen den AppShell-Präzedenzfall kopiert, drohen 403-Fehler für Mitglieder ohne Edit-Rechte; sollte in Discuss/Plan explizit entschieden werden |

**Hinweis:** Alle vier Einträge sind Empfehlungen/Architekturentscheidungen, keine unverifizierten
Fakten — die zugrunde liegenden Code-Befunde selbst (Feldnamen, Funktionsverhalten, Routen) sind
alle `[VERIFIED: Codebase]` durch direktes Lesen der genannten Dateien.

## Open Questions (RESOLVED)

> **RESOLVED 2026-07-28** (in CONTEXT.md verankert, in Plänen umgesetzt):
> - Frage 1 → **D-08**: dedizierter read-only Endpunkt `GET /api/v1/me/dashboard` (nicht `GetOwnProfile` erweitern). Umgesetzt in Plan 116-02.
> - Frage 2 → **D-09**: kein Eligibility-Redirect; Dashboard für jeden eingeloggten User, graceful EmptyStates. Umgesetzt in 116-02 (Backend graceful empty) + 116-06 (Frontend, kein Redirect).

1. **Wird `/me/dashboard` oder `GetOwnProfile` erweitert (statt neuer Endpunkt)?** — RESOLVED → D-08 (neuer Endpunkt)
   - Was wir wissen: Beide Ansätze sind technisch gleich einfach; `GetOwnProfile` wird aber auch
     von `/me/profile` und `AppShellClientWrapper` konsumiert — eine Erweiterung dort würde JEDE
     bestehende Konsumentenstelle mit zusätzlichen Feldern/Queries belasten, auch wenn nicht
     gebraucht (AppShell braucht keine Punkte/Badges für die Nav).
   - Was unklar ist: Ob das Projekt einen dedizierten `/me/dashboard`-Endpunkt bevorzugt (sauberer
     Schnitt) oder Feldanreicherung an einer zentralen Stelle (weniger neue Routen).
   - Empfehlung: Dedizierter Endpunkt, da die Kennzahlen-Aggregation (Punkte, Badges, Bilder,
     Beiträge, Projekte) mehrere zusätzliche COUNT-Queries braucht, die AppShell und `/me/profile`
     bei jedem Render unnötig mitzahlen würden, würden sie in `GetOwnProfile` selbst leben.

2. **Soll die Dashboard-Route serverseitig eine Redirect-Regel wie `/me/contributions` bekommen
   (Eligibility-Gate für Nutzer ohne Member-Profil)?** — RESOLVED → D-09 (kein Redirect, EmptyStates)
   - Was wir wissen: `/me/contributions` leitet Nutzer ohne `has_member_profile &&
     has_project_assignments` sofort zu `/me/profile` um (`page.tsx:80-86`).
   - Was unklar ist: Ob das Dashboard für JEDEN eingeloggten User sichtbar sein soll (auch ohne
     Member-Profil — z. B. nur mit Schnellzugriffen + leerem Zustand für die anderen Sektionen)
     oder ob es denselben Eligibility-Gate-Redirect braucht.
   - Empfehlung: CONTEXT.md beschreibt das Dashboard als "Landing-Hub für eingeloggte User"
     generell (nicht nur Member) — daher eher ein GRACEFUL EmptyState pro Sektion statt
     Total-Redirect, aber das sollte im Plan explizit entschieden werden.

## Environment Availability

Entfällt — Phase 116 hat keine neuen externen Abhängigkeiten (keine neuen Pakete, keine neue
Infrastruktur, kein neuer Dienst). Bestehende Laufzeitumgebung (Docker Compose: Postgres 16,
Redis 7, Go-Backend `:8092`/`:18092`, Next.js-Frontend `:3002`/`:3000`) reicht unverändert aus.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Frontend-Framework | Vitest 3 (`frontend/vitest.config.ts`), Testing Library (jsdom, `globals: true`) |
| Backend-Framework | Go `testing` + `testify` (`github.com/stretchr/testify`) |
| Config-Datei | `frontend/vitest.config.ts` (Frontend), keine zentrale Go-Test-Config (Standard `go test`) |
| Quick-Run Frontend | `npm --prefix frontend run test -- src/app/me/dashboard` |
| Quick-Run Backend | `go test ./internal/repository/... ./internal/handlers/... -run Dashboard` |
| Full-Suite Frontend | `npm --prefix frontend run test` |
| Full-Suite Backend | `go test ./...` (im `backend/`-Verzeichnis) |
| Typecheck | `npm --prefix frontend run typecheck` (`tsc --noEmit`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01 | Dashboard rendert nichts Editierbares, nur Links/Zahlen | unit (component) | `vitest run src/app/me/dashboard/page.test.tsx` | ❌ Wave 0 |
| D-02 | "Braucht deine Aufmerksamkeit" zeigt nur Einträge < windowDays, Link korrekt nach `release_version_id` | unit (pure function `isRecentlyAssigned`/`resolveWorkspaceHref`) | `vitest run src/app/me/dashboard/components/AttentionSection.test.tsx` | ❌ Wave 0 |
| D-03 | 5 Kennzahlen korrekt aus neuer Aggregation gerendert | unit (component) + Go-Repository-Test für neue COUNT-Queries | `vitest run .../DashboardMetrics.test.tsx` + `go test ./internal/repository/... -run Dashboard` | ❌ Wave 0 |
| D-04 | Kategorie-Tabelle zeigt korrekte "noch X bis"-Werte für alle 3 Familien + Rollen-Volumen + Punkte | unit (pure function next-threshold) + Go-Test für Rohzahl-Exposition | `vitest run .../CategoryProgressTable.test.tsx` + Go-Repository-Test | ❌ Wave 0 |
| D-05 | Meine Gruppen zeigt `memberships` korrekt mit Links | unit (component, reused `MembershipsSection`-Pattern) | `vitest run .../MyGroupsSection.test.tsx` | ❌ Wave 0 (Komponente ggf. wiederverwendbar aus `frontend/src/components/profile/MembershipsSection.tsx`) |
| D-06 | Schnellzugriffe verlinken korrekte, existierende Routen (inkl. defensiver `/suche`-Check) | unit (component) | `vitest run .../QuickLinksSection.test.tsx` | ❌ Wave 0 |
| Nav-Aktivierung | Dashboard-Nav-Item aktiv, in "Mein Bereich"-Gruppe, kein `disabled` mehr | unit (AppShell) | `vitest run src/components/layout/AppShell.test.tsx` | ✅ Datei existiert, Testfälle für Dashboard fehlen (Wave 0) |

### Sampling Rate
- **Per Task-Commit:** jeweiliger Quick-Run-Befehl (Frontend-Komponente oder Go-Paket)
- **Per Wave-Merge:** `npm --prefix frontend run test` + `npm --prefix frontend run typecheck` +
  `go test ./...`
- **Phase-Gate:** Volle Suite grün, plus manueller Live-Check auf `:3000` (Team4s-Konvention:
  Frontend läuft in Docker, Turbopack-HMR unzuverlässig — nach jeder Frontend-Änderung
  `docker restart team4sv30-frontend` + Hard-Refresh, siehe Projekt-Memory) vor `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/app/me/dashboard/page.test.tsx` — RED-Grundgerüst für die neue Seite
- [ ] `frontend/src/app/me/dashboard/components/AttentionSection.test.tsx` — reine Funktionen
      `isRecentlyAssigned`/`resolveWorkspaceHref` zuerst isoliert testen
- [ ] Go-Repository-Test für die neue Dashboard-Aggregation (Rohzahlen-Exposition,
      `member_profile_dashboard_repository_test.go` o. ä.)
- [ ] `AppShell.test.tsx`-Erweiterung: Dashboard-Item in "Mein Bereich", nicht mehr `disabled`

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | ja | Bestehendes zentrales Auth-/API-Client-Muster (`useAuthSession`, `authorizedFetch`) — keine neue Auth-Logik |
| V3 Session Management | ja | Bestehender Token-Refresh-/401-Retry-Seam in `frontend/src/lib/api.ts` — unverändert wiederverwendet |
| V4 Access Control | ja | `resolveVerifiedMemberID` (Ownership-Gate über `member_claims`, bestehendes Muster in `contributions_me_handler.go:65-80`) muss auch der neue Dashboard-Handler verwenden — niemals `memberID` aus Query-Parametern vertrauen |
| V5 Input Validation | nein (keine neuen Schreibpfade, reine GET-Aggregation) | — |
| V6 Cryptography | nein | — |

### Known Threat Patterns for diese Phase
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Cross-Member-Datenleck (Dashboard zeigt fremde Kennzahlen) | Information Disclosure | Neuer Handler MUSS `resolveVerifiedMemberID(ctx, identity.AppUserID)` verwenden (nie eine `member_id` aus Query/Body), exakt wie alle bestehenden `/me/*`-Handler |
| IDOR auf "Direktlink zur Arbeitsfläche" | Elevation of Privilege | Die verlinkten Zielrouten (`/me/projects/[animeId]/group/[fansubGroupId]`, `/me/releases/[versionId]/workspace`) haben bereits eigene Ownership-Prüfungen (bestehender Code, nicht Teil dieser Phase) — Dashboard baut nur URLs, prüft keine Rechte selbst; kein neues Risiko, solange Zielseiten unverändert bleiben |
| Badge-/Punkte-Manipulation über neuen Endpunkt | Tampering | Neuer Endpunkt ist rein lesend (GET); keine Schreibpfade, kein Tampering-Vektor |

## Sources

### Primary (HIGH confidence — direkt gelesener Code)
- `frontend/src/components/layout/AppShell.tsx` (Zeilen 8-200) — Nav-Struktur, toter Dashboard-Eintrag, Meine-Gruppen-Rendering
- `frontend/src/components/layout/AppShellClientWrapper.tsx` — Datenquelle für `memberships`
- `frontend/src/lib/api.ts` (`getOwnProfile`, `getMyBadges`, `getMyAnimeContributions`, `getMyProjectDetail`)
- `frontend/src/types/profile.ts`, `frontend/src/types/contributions.ts` — DTO-Vergleich Frontend vs. Backend
- `backend/internal/repository/member_profile_repository.go` (`GetOwnProfile`, `GetPublicMemberProfile`, `loadTotalPoints`, `loadPublicBadges`, `loadRecentMedia`, `loadRecentContributions`, `loadPreviousContributions`)
- `backend/internal/repository/member_profile_role_volume_repository.go`
- `backend/internal/repository/member_profile_contribution_badges_repository.go`
- `backend/internal/repository/anime_contributions_inputs.go`, `anime_contributions_repository.go`, `anime_contributions_member_repository.go`, `anime_contributions_proposal_repository.go`
- `backend/internal/handlers/contributions_me_handler.go`, `member_badges_handler.go`
- `database/migrations/0086_anime_contributions.up.sql`
- `frontend/src/components/profile/memberBadgeLabels.ts`
- `frontend/src/components/ui/index.ts`, `HeroMetrics.tsx`, `Table.tsx`
- `frontend/src/app/me/profile/page.tsx`, `frontend/src/app/me/contributions/page.tsx`, `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx`, `frontend/src/app/me/releases/[versionId]/workspace/page.tsx`
- `frontend/src/app/fansubs/page.tsx`, `frontend/src/app/members/ranking/page.tsx` (Routen-Existenz-Verifikation)
- `.planning/phases/115-globale-suche-postgres-fts/115-06-PLAN.md` — bestätigt geplanten `/suche`-Zielpfad, bestätigt Nicht-Existenz im aktuellen Code
- `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/config.json`, `CLAUDE.md`

### Secondary (MEDIUM confidence)
- Keine — dieses Research stützt sich ausschließlich auf direkt gelesenen Code und Projektdokumente, keine WebSearch/Context7-Abfragen waren nötig (rein interne Codebase-Frage).

### Tertiary (LOW confidence)
- Keine.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — keine neuen externen Abhängigkeiten, alle referenzierten Primitives/Muster direkt im Code verifiziert
- Architecture: HIGH — Datenflüsse, Routen und Lücken alle durch Lesen des tatsächlichen Go-/TS-Codes bestätigt, nicht aus Trainingswissen geraten
- Pitfalls: HIGH — jeder Pitfall ist mit exakter Datei:Zeile belegt, nicht spekulativ

**Research date:** 2026-07-28
**Valid until:** ~30 Tage (stabile interne Codebase-Analyse; nur zu erneuern, falls Phase 112/113/115
sich vor Ausführung von 116 nochmal ändern — insbesondere Phase 115 `/suche`-Fertigstellung sollte
unmittelbar vor Phase-116-Ausführung erneut geprüft werden, siehe Pitfall 3)
