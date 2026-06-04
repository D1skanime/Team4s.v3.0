# Phase 73: Public Fansub Page `/fansubs/[slug]` erweitern – Research

**Recherchiert:** 2026-06-04
**Domäne:** Next.js App Router – Server Component Refactor, UI-Komponent-Aufteilung, Konsum neuer Backend-Projektionen (Phase 72), CSS-Module Sticky-Nav
**Konfidenz:** HIGH (alle Kernbefunde direkt im Quellcode verifiziert; Phase-72-Contract aus Plan-Dateien extrahiert)

---

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Locked Decisions
- **D-01:** Kuratierte vertikale Scroll-Seite statt reiner Tab-Struktur. `FansubProfileTabs`-Inhalte werden zu Seiten-Abschnitten umgebaut/wiederverwendet (kein Wegwerfen der Logik).
- **D-02:** Verbindliche Abschnitts-Reihenfolge: Hero → **Story (VOR Highlights)** → Highlights → Projekte → Team & Mitglieder → Externe Mitwirkende → Medien → Timeline → Deep-Dive.
- **D-03:** Einspaltige Erzählung (zentrierte Lesespalte, max. Lesebreite). Kein Desktop-Zwei-Spalten-Split. Innerhalb einzelner Abschnitte (Projekte, Medien, aktive Mitglieder) sind Raster/mehrere Spalten erlaubt.
- **D-04:** Sektions-Navigation: Desktop = klebende Sektions-Nav mit Ankern; Mobil = klebende, horizontal scrollbare Chip-Leiste mit denselben Sprungmarken.
- **D-05:** Highlights automatisch abgeleitet aus vorhandenen Daten (Anzahl Projekte/Releases, aktive Jahre, längste aktive Mitglieder). KEIN neues Pflege-/Kurationsfeld, kein Schreib-Flow.
- **D-06:** Responsiv / mobile-first: auf Mobil stapeln alle Abschnitte einspaltig; mehrspaltige Abschnitte fallen auf eine Spalte zusammen.
- **D-07:** Zwei klar getrennte Abschnitte: „Team & Mitglieder" (Quellen: `fansub_group_members`/`hist_fansub_group_members`) und eigener Block „Externe Mitwirkende" (Quelle: `anime_contributions`). Contribution erscheint NIE im Team-Block.
- **D-08:** Untergruppen im Team-Block: Aktiv (prominent, farbige Avatar-Karten) / Ehemalig / Historische Nennungen (gedämpft) / Gedenken (würdevoller Sonderblock).
- **D-09:** Historische/unbestätigte Nennungen abschwächen: eigener, optisch gedämpfter Unterbereich (grau, kleiner, flacher, ohne Avatar) mit Badge **„unbestätigt"**.
- **D-10:** Verlinkung historischer Mitglieder: geclaimt → Link auf `/members/[slug]`; ungeclaimt → nur Name/Nennung.
- **D-11:** Drei getrennte, fest beschriftete Medien-Bereiche ohne Vermischung: **„Gruppenmedien"** (`fansub_group_media`/`media_assets`/`media_files`/`fansub_groups.logo_id`/`banner_id`), **„Release-Einblicke"** (Release-Version-Medien-Kontext), **„Team & Erinnerungen"** (`media_assets.owner_member_id`). Auf Mobil untereinander.
- **D-12:** Medien-/Personen-Anzeige respektiert Phase-72-Projektionsfelder (Owner-Typ/-ID, Kategorie, Sichtbarkeit, Reviewstatus) — nur sichtbare/freigegebene/öffentliche Inhalte werden öffentlich gezeigt.
- **D-13:** Projektkarten verlinken auf `/anime/[id]/group/[groupId]` (Phase-75-Deep-Dive-Surface).
- **D-14:** Public-Preview / Readiness-Pflege NICHT in Phase 73 → erst Phase 77.
- **D-15:** Empty States = Platzhalter anzeigen: Abschnitt bleibt sichtbar mit dezenter Hinweismeldung. Sektions-Nav-Anker bleiben stabil.

### Claude's Discretion
- Konkrete Komponenten-Aufteilung (Refactor von `FansubProfileTabs` in Section-Komponenten vs. neue Section-Komponenten), CSS-Module-Struktur, Sticky-Nav-/Chip-Implementierung, konkrete Highlights-Kennzahlen-Auswahl, exakte Schwellwerte/Sortierung — solange D-01..D-15 und v1.2-Locks eingehalten werden.
- Ob neue Phase-72-Felder/Projektionen über erweiterte bestehende Helper oder neue api.ts-Funktionen konsumiert werden — Planner-Entscheid unter Lock K (Contract-zuerst).

### Deferred Ideas (AUSSERHALB SCOPE)
- Schreib-Flows (Beiträge erfassen, Medien bereitstellen, Story bearbeiten) → Phasen 77/78/79.
- Public-Preview / Readiness-Pflege für Leader → Phase 77.
- Memorial-Setter + Claim-Sperre → Phase 74.
- Korrektur-melden / Vorschlags-Flows → Phasen 74/76.
- Contributions-Dropdown auf globale UI-Primitives umstellen (Admin) → Phase-67-Folgearbeit.
- Public Member Profile UI-Bug → Phase 74.
</user_constraints>

<phase_requirements>
## Phase-Anforderungen

| ID | Beschreibung | Research-Unterstützung |
|----|--------------|------------------------|
| **B** | Public Fansub Page `/fansubs/[slug]` erweitern — Reuse `FansubProfileTabs`, `GroupLeaderTimeline`, public contribution helpers; Schwerpunkt: Hero, Story, Highlights, Mitglieder vs. Mitwirkende, Medien nach Ownership, Projektkarten | Bestehende Seite (117 Zeilen) + FansubProfileTabs (241 Zeilen) + GroupLeaderTimeline (47 Zeilen) vollständig verifiziert; exakter Reuse-Plan in §Reuse-Inventar. |
| **C (Teil)** | Mitglieder vs. Mitwirkende sauber trennen; unbestätigte historische Nennungen schwächer darstellen | Trennung entsteht durch Konsum der Phase-72-Domain-Projektion (`members`/`historical`/`contributors`-Arrays). Badge „unbestätigt" für `status != 'confirmed'` in historischen Mengen. |
| **G** | Medien folgen strikt der Ownership-Matrix; drei Bereiche nach Ownership | Phase-72-Projektion `GET /api/v1/media-ownership/:ownerType/:ownerId` liefert `owner_type`, `owner_id`, `media_category`, `visibility`, `review_status`. Filterung nach `visibility='public'` und `review_status='approved'` erforderlich. |
| **K** | Contract/API-Disziplin: keine ad-hoc-Fetches, keine undokumentierten Felder, Lock K | Neue Projektions-Endpunkte aus Phase 72 konsumieren via neu erzeugter `api.ts`-Funktionen (bereits durch Phase-72-Plan-04 vorbereitet: `getFansubGroupDomainProjection`, `getMediaOwnershipProjection`). |
</phase_requirements>

---

## Zusammenfassung

Phase 73 ist eine reine **Frontend-Read-/Anzeigerefaktor-Phase** ohne Backend-Änderungen. Die bestehende öffentliche Fansub-Seite (`/fansubs/[slug]/page.tsx`, 117 Zeilen) wird zu einer kuratiert-scrollenden Erzählseite mit neun Abschnitten umgebaut. Die Tab-Struktur (`FansubProfileTabs`) wird nicht weggeworfen, sondern die Inhaltslogik wird in eigenständige Section-Komponenten überführt.

**Kritische Abhängigkeit:** Phase 73 konsumiert zwei neue Backend-Endpunkte, die Phase 72 erstellt: `GET /api/v1/fansubs/:id/domain-projection` (Mitglieder/historisch/Mitwirkende getrennt) und `GET /api/v1/media-ownership/:ownerType/:ownerId` (Medien nach Ownership). Da Phase 72 noch nicht ausgeführt ist, muss der Planner eine klare Wave-Sequenz definieren: Phase 72 muss vollständig fertig sein, bevor Phase 73 die neuen Projektionen konsumieren kann. Der Frontend-Teil von Phase 72 (Plan 04) legt bereits `getFansubGroupDomainProjection` und `getMediaOwnershipProjection` in `api.ts` an — diese Funktionen existieren im Code also erst nach Phase 72.

Die vorhandene Datenmenge aus `getFansubBySlug` + `getFansubMembers` + `getFansubContributions` + `getAnimeList` liefert bereits Hero, Story (fehlt im bestehenden DTO aber im `FansubGroup`-Typ liegt `website_url`, `founded_year`, `dissolved_year`), Projekte und die Leader-Timeline. Die Mitglieder/Mitwirkende/historisch-Trennung und die Medien-Ownership-Daten kommen ausschließlich aus Phase-72-Projektionen.

**Hauptempfehlung:** Die Seite in mindestens fünf fokussierte Server-/Client-Komponenten aufteilen (≤ 450 Zeilen je Datei per CLAUDE.md), die Sticky-Nav als eigenständige Client-Komponente mit IntersectionObserver implementieren, alle Phase-72-Fetches parallel in der Server-Component-Root starten.

---

## Architektonische Verantwortungskarte

| Capability | Primäre Ebene | Sekundäre Ebene | Begründung |
|------------|--------------|-----------------|------------|
| Seiten-Datenfetch (group, members, projects, domain-projection, media-ownership) | Frontend Server (SSR/RSC) | — | Server Component; alle Fetches vor Render; Lock K: kein ad-hoc-Fetch |
| Sticky-Nav mit IntersectionObserver + Chip-Leiste | Browser / Client | — | Scroll-Events und DOM-Intersection sind Browser-only; Client Component nötig |
| Hero-Abschnitt (Logo, Name, Fact-Summary) | Frontend Server | — | Keine Interaktivität; rein deklarativ |
| Story-Abschnitt (`CollapsibleStory`) | Browser / Client | Frontend Server (Rahmen) | `CollapsibleStory` ist bereits `'use client'` (useState für Expand) |
| Highlights-Berechnung aus vorhandenen Daten | Frontend Server | — | Reine Datentransformation, keine Interaktivität (D-05: kein Write) |
| Team & Mitglieder (drei Untergruppen + Gedenkblock) | Frontend Server (Rahmen) | Browser / Client (Badge-Interaktion) | Grundstruktur SSR; etwaige Accordion-Interaktion Client |
| Externe Mitwirkende | Frontend Server | — | Read-only, keine Interaktivität |
| Medien (drei Ownership-Bereiche) | Frontend Server | — | Read-only; Visibility/Review-Filterung Server-seitig |
| Timeline (`GroupLeaderTimeline`) | Frontend Server | — | Existierende Komponente, keine Interaktivität |
| Deep-Dive-Link | Frontend Server | — | Nur Link auf `/anime/[id]/group/[groupId]` |

---

## Standard-Stack

Keine neuen externen Pakete. Ausschließlich der bestehende Stack aus CLAUDE.md wird genutzt. [VERIFIED: frontend/package.json]

### Core
| Library | Version | Zweck | Warum Standard |
|---------|---------|-------|----------------|
| Next.js App Router | 16 (package.json) | Server Components, SSR | Etabliert; Seite ist bereits Server Component [VERIFIED: page.tsx] |
| React | 18.3.1 | Client Components (Sticky-Nav, CollapsibleStory) | Bestehend [VERIFIED: package.json] |
| TypeScript | bestehend | Typsicherheit | Ganzes Projekt [VERIFIED: tsconfig.json] |
| CSS Modules (`.module.css`) | Next.js eingebaut | Scoped Styles | Konvention für alle Fansub-Komponenten [VERIFIED: FansubProfileTabs.module.css, GroupLeaderTimeline.module.css] |

### Supporting (bereits im Projekt)
| Library | Version | Zweck | Verwendung |
|---------|---------|-------|------------|
| `lucide-react` | bestehend | Icons (z. B. Badge „unbestätigt") | Etabliert im Projekt [ASSUMED: nicht direkt in fansub-Komponenten verifiziert] |
| `@/components/ui` (Button, Card, SectionHeader, Badge, …) | intern | Globale UI-Primitive | PFLICHT per CLAUDE.md [VERIFIED: components/ui/index.ts] |

**Installation:** Keine. Keine neuen Pakete nötig.

---

## Package Legitimacy Audit

**Nicht anwendbar** — Phase 73 installiert keine externen Pakete.

---

## Phase-72-Contract: Was Phase 73 konsumieren kann

> Dies ist die zentrale Frage dieser Phase. Die folgenden Felder/Endpunkte entstehen in Phase 72 und sind für Phase 73 bindend. [VERIFIED: 72-01-PLAN.md, 72-02-PLAN.md, 72-03-PLAN.md, 72-04-PLAN.md]

### Endpunkt 1: Domänen-Projektion

**Route:** `GET /api/v1/fansubs/:id/domain-projection`
**Frontend-Funktion:** `getFansubGroupDomainProjection(groupID: number)` (wird in Phase 72, Plan 04 in `api.ts` angelegt)
**Envelope:** Direktes DTO, **kein** `{"data":...}`-Wrapper
**Response-Shape:**
```typescript
// Aus frontend/src/types/domain-projection.ts (nach Phase-72-Ausführung)
interface DomainProjectionResponse {
  members: DomainMemberRow[]       // App-Mitglieder (fansub_group_members, status='active')
  historical: DomainHistoricalRow[] // hist_fansub_group_members (status='historical'/'confirmed')
  contributors: DomainContributorRow[] // anime_contributions (externe Mitwirkende)
}

interface DomainMemberRow {
  member_display_name: string
  member_slug: string | null
  roles: string[]
  role_labels: string[]
  profile_status: 'active' | 'historical' | 'memorial'  // members.profile_status (Phase-72-Migration 0096)
  claimed: boolean  // derived aus member_claims.claim_status='verified'
  // weitere Felder wie started_year, ended_year (aus RESEARCH 72)
}

interface DomainHistoricalRow {
  member_display_name: string
  member_slug: string | null  // nur gesetzt wenn geclaimt
  roles: string[]
  role_labels: string[]
  profile_status: 'active' | 'historical' | 'memorial'
  claimed: boolean
  // status aus hist_fansub_group_members.status (historical/confirmed/draft/disputed)
}

interface DomainContributorRow {
  member_display_name: string
  member_slug: string | null
  roles: string[]
  role_labels: string[]
  dispute_state: 'none' | 'open' | 'resolved'   // neue Konflikt-Dimension (Phase-72-Migration 0096)
  visibility: string      // aus visibilities-Lookup (public/registered/…)
  review_status: string   // aus review_statuses-Lookup (in_review/approved/rejected/archived/removed)
}
```

### Endpunkt 2: Medien-Ownership-Projektion

**Route:** `GET /api/v1/media-ownership/:ownerType/:ownerId`
**Frontend-Funktion:** `getMediaOwnershipProjection(ownerType: string, ownerID: number)` (wird in Phase 72, Plan 04 angelegt)
**Envelope:** Direktes DTO (Liste), kein Wrapper
**Response-Shape:**
```typescript
// Aus frontend/src/types/media-ownership.ts (nach Phase-72-Ausführung)
interface MediaOwnershipRow {
  owner_type: string        // z. B. 'group', 'member', 'release_version'
  owner_id: number
  media_category: string    // Kategorie des Assets
  visibility: string        // aus visibilities-Lookup
  review_status: string     // aus review_statuses-Lookup
  // Basis-Asset-Felder (id, url/path, etc.)
}
```

### Bereits existierende Fetches (KEIN Phase-72-Wait nötig)

| Funktion | Endpunkt | Liefert | Verwendung in Phase 73 |
|----------|----------|---------|------------------------|
| `getFansubBySlug(slug)` | `GET /api/v1/fansub-slugs/:slug` | `{ data: FansubGroup }` | Hero, Story, Highlights-Basis, alle Abschnitte |
| `getFansubMembers(groupID)` | `GET /api/v1/fansubs/:id/members` | `{ data: FansubMember[] }` | **Veraltet für Phase 73** — liefert `FansubMember` (flaches Modell ohne Trennung aktiv/historisch/memorial). Wird durch Phase-72-`domain-projection` ersetzt. |
| `getFansubContributions(groupID)` | `GET /api/v1/fansubs/:id/contributions` | `PublicGroupContributionsResponse` mit `leader_timeline`, `anime_count`, `member_count` | `leader_timeline` → Timeline-Abschnitt (weiter nutzbar). `anime_count`/`member_count` → Highlights. |
| `getAnimeList({ fansub_id, page, per_page })` | `GET /api/v1/anime?fansub_id=…` | `{ data: AnimeListItem[], meta: PaginationMeta }` | Projekte-Abschnitt |

### Lücken: Was Phase 72 NICHT liefert (muss Phase 73 selbst lösen oder flaggen)

| Bedarf | Problem | Lösungsweg |
|--------|---------|------------|
| Historische Untergruppen-Trennung (Aktiv / Ehemalig / Historisch) innerhalb der `historical`-Menge | Phase 72 liefert `historical[]` als einzige Menge; ob ein historischer Eintrag „ehemalig" (noch lebend, nicht mehr aktiv) vs. „historische Nennung" (unconfirmed) ist, muss über `claimed`-Feld + `profile_status` abgeleitet werden | Ableitung clientseitig: `claimed=true` + `profile_status='active'` → ehemalig; `claimed=false` oder `profile_status='historical'` → historische Nennung [ASSUMED] |
| Gruppen-Medien für den Medien-Abschnitt (D-11) | `media-ownership`-Projektion nimmt `ownerType + ownerID` — für Gruppenmedien wäre das `ownerType='group'`, `ownerID=group.id`. Dieser ownerType-Wert ist NICHT in Phase-72-Plan-03 explizit genannt (dort ist Member-Scope via `owner_member_id` explizit, Gruppen-Scope über Junction `fansub_group_media` aber nicht explizit benannt). | Planner muss prüfen ob `ownerType='group'` + `ownerID=group.id` vom Media-Ownership-Endpoint korrekt aufgelöst wird; falls nicht, fallback auf vorhandene `group.logo_url` + `group.banner_url` aus `FansubGroup`-DTO [ASSUMED] |
| Releases-Count für Highlights | `getFansubContributions` liefert `anime_count` + `member_count`, aber keine Release-Zahl | `FansubGroup.release_versions_count` ist bereits im `FansubGroup`-DTO vorhanden [VERIFIED: fansub.ts Zeile 39] |
| Story-Text der Gruppe | Kein `story`/`description`-Feld in `FansubGroup`-Interface heute [VERIFIED: fansub.ts] | Derzeit zeigt `CollapsibleStory` nur `buildFansubFactSummary`-Output (facts, keine echte Story). Echter Story-Text ist Pflegearbeit (Phase 77/78); Phase 73 zeigt bestehende Daten: Fakten + ggf. Leer-Platzhalter. [ASSUMED: kein story-Feld im Backend] |

---

## Reuse-Inventar: Bestehende Komponenten → Neue Abschnitte

### Vollständiges Mapping

| Bestehende Komponente/Logik | Verwendung aktuell | Ziel-Abschnitt Phase 73 | Aktion |
|-----------------------------|--------------------|-------------------------|--------|
| `page.tsx` Hero-Markup (§hero, §slug, §title, §subtitle) | In page.tsx inline | Hero-Abschnitt | Extrahieren in `FansubHeroSection.tsx` |
| `buildFansubFactSummary(group)` | Hero subtitle + FansubProfileTabs Übersicht | Hero + Story | Wiederverwendbar als-ist |
| `CollapsibleStory` (components/groups) | Nicht in page.tsx verwendet; in GroupStory/GroupDetail-Kontexten | Story-Abschnitt | Direkt nutzen; Fallback: Empty State wenn kein story-Text |
| `FansubProfileTabs` Tab „Übersicht" | Status/Land/Gründung/Auflösung-Metadaten | Story-Abschnitt (ergänzend zur Story) | Logik in StorySection aufnehmen; Tab entfällt |
| `FansubProfileTabs` Tab „Mitglieder" | `membersByRole` (grouped by role, sorted) | Team & Mitglieder-Abschnitt | `membersByRole`-Logik wiederverwenden; ERSETZEN durch Phase-72-domain-projection (`members[]` + `historical[]`); Untergruppen-Rendering neu |
| `FansubProfileTabs` Tab „Projekte" | `projectsByBucket` (ongoing/completed/archived) | Projekte-Abschnitt | Logik + Bucket-Logik wiederverwenden; Links auf `/anime/[id]/group/[groupId]` anpassen (D-13) |
| `FansubProfileTabs` Tab „Archiv" | `website_url` + `banner_url` | Deep-Dive-Abschnitt (externer Link) | Als externer Link-Block im Deep-Dive-Abschnitt |
| `FansubProfileTabs` Tab „Erinnerungen" | `factSummary` + Datum-Range | Aufgehen in Story + Highlights | Logik in Highlights einbetten |
| `GroupLeaderTimeline` | Direkt gerendert in page.tsx | Timeline-Abschnitt | Direkt wiederverwendbar, kein Umbau nötig |
| `getFansubContributions` (leader_timeline) | leader_timeline → GroupLeaderTimeline | Timeline-Abschnitt | Weiter nutzen; zusätzlich anime_count/member_count für Highlights |
| `formatYearRange` (in FansubProfileTabs) | Mitglieder-Zeitraumformatierung | Team-Abschnitt | In gemeinsames util-Modul extrahieren |

### Abschnitte ohne direkten Reuse (Neubau)

| Abschnitt | Was ist neu | Datenbasis |
|-----------|-------------|------------|
| Sticky-Nav + Chip-Leiste | Neue Client-Komponente mit IntersectionObserver (Desktop) + horizontalem Scroll (Mobil) | Keine API; reine Scroll-Interaktion |
| Highlights | Neue Section; Kennzahlen werden aus vorhandenen Daten berechnet (D-05) | `FansubGroup`-Felder + contributions-Counts |
| Externe Mitwirkende (separater Block) | Neuer Abschnitt; bisher kein eigener Block für Contributions | Phase-72 `contributors[]` aus domain-projection |
| Medien (drei Ownership-Bereiche) | Neuer Abschnitt; bisher nur in FansubProfileTabs Tab „Archiv" (`banner_url`) ansatzweise | Phase-72 `getMediaOwnershipProjection`; Fallback auf `FansubGroup.logo_url`/`banner_url` |
| Team-Untergruppen (aktiv/ehemalig/historisch/memorial) | Neue Untergruppen-Struktur; bisher `membersByRole` ohne diese Trennung | Phase-72 `domain-projection.members[]`/`historical[]` |
| Badge „unbestätigt" | Neues UI-Element | Phase-72 `historical[]` mit `claimed=false` / `profile_status != 'confirmed'` |

---

## Architektur-Muster

### System-Architekturdiagramm

```
Browser (Navigation)
       |
       v
/fansubs/[slug]/page.tsx  [Server Component — Root Orchestrator]
  |
  |-- Promise.all([
  |     getFansubBySlug(slug)                      → FansubGroup
  |     getFansubMembers(groupID)                  → [veraltet; optional Fallback]
  |     getFansubGroupDomainProjection(groupID)    → { members, historical, contributors }
  |     loadFansubProjects(groupID)                → AnimeListItem[]
  |     getFansubContributions(groupID)            → { leader_timeline, anime_count, member_count }
  |     getMediaOwnershipProjection('group', id)   → MediaOwnershipRow[]
  |   ])
  |
  v
Render-Baum (einspaltige Erzählseite):
  <FansubSectionNav />               [Client Component — Sticky-Nav + IntersectionObserver]
  <FansubHeroSection />              [Server Component — Logo, Name, Fact-Summary]
  <FansubStorySection />             [mixed: Rahmen Server, CollapsibleStory Client]
  <FansubHighlightsSection />        [Server Component — berechnete Kennzahlen]
  <FansubProjectsSection />          [Server Component — AnimeListItem[]->Bucket]
  <FansubTeamSection />              [Server Component — members+historical+memorial]
  <FansubContributorsSection />      [Server Component — contributors[]]
  <FansubMediaSection />             [Server Component — drei Ownership-Bereiche]
  <GroupLeaderTimeline />            [Server Component — leader_timeline, vorhanden]
  <FansubDeepDiveSection />          [Server Component — externe Links, Deep-Dive-Verlinkung]
```

### Empfohlene Projektstruktur

```
frontend/src/app/fansubs/[slug]/
  page.tsx                    # Root Server Component (Datenfetch + Section-Orchestrierung, ≤ 150 Zeilen)
  page.module.css             # Seiten-Layout, max-width, Lesebreite

frontend/src/components/fansubs/
  FansubSectionNav.tsx        # Neu: Client Component, Sticky-Nav + Chip-Leiste
  FansubSectionNav.module.css
  FansubHeroSection.tsx       # Extrahiert aus page.tsx
  FansubHeroSection.module.css
  FansubStorySection.tsx      # Neu: CollapsibleStory + Metadaten
  FansubHighlightsSection.tsx # Neu: berechnete Kennzahlen
  FansubProjectsSection.tsx   # Aus FansubProfileTabs Tab „Projekte" extrahiert
  FansubTeamSection.tsx       # Aus FansubProfileTabs Tab „Mitglieder" + Phase-72-Daten
  FansubTeamSection.module.css
  FansubContributorsSection.tsx # Neu: Phase-72 contributors[]
  FansubMediaSection.tsx      # Neu: drei Ownership-Bereiche
  FansubDeepDiveSection.tsx   # Aus FansubProfileTabs Tab „Archiv" extrahiert
  GroupLeaderTimeline.tsx     # Unverändert wiederverwendet
  GroupLeaderTimeline.module.css
  # FansubProfileTabs.tsx: nach Extraktion aller Inhalte entfernen oder leer lassen
```

### Muster 1: Server Component Root mit parallelem Datenfetch

**Was:** Alle Fetches parallel in der Root-Server-Component; dann Props-Drilling in Section-Komponenten.
**Wann:** Immer für neue Abschnitte in Phase 73.

```typescript
// Quelle: Bestehendes Muster in frontend/src/app/fansubs/[slug]/page.tsx (Zeilen 63-83)
// Erweiterung um Phase-72-Projektionen:
const [groupResponse, membersData, projectsData, contributionsData, domainProjection, mediaData] =
  await Promise.allSettled([
    getFansubBySlug(slug),
    getFansubGroupDomainProjection(groupID),  // Phase-72-Funktion (nach Phase-72)
    loadFansubProjects(groupID),
    getFansubContributions(groupID),
    getMediaOwnershipProjection('group', groupID),  // Phase-72-Funktion (nach Phase-72)
  ])
// Graceful Degradation: allSettled statt all; fehlende Daten → Empty State (D-15)
```

### Muster 2: Sticky-Nav mit IntersectionObserver (Client Component)

**Was:** Scrollt mit der Seite; hebt den aktiven Abschnitt hervor.
**Implementierung:**

```typescript
// 'use client'
// IntersectionObserver beobachtet section[id]-Elemente; activeSection-State
// Desktop: position: sticky; top: <header-height>; flex-row mit Anker-Links
// Mobil: overflow-x: auto; white-space: nowrap; Chip-Leiste
// Kein externes Scroll-Spy-Paket nötig — nativer IntersectionObserver
const sectionIds = ['story', 'highlights', 'projekte', 'team', 'mitwirkende', 'medien', 'timeline', 'deep-dive']
```

### Muster 3: Team-Untergruppen-Rendering (D-08/D-09)

```typescript
// Quelle: Phase-72-Projektion domain-projection.ts
// Aktiv: members[] → farbige Avatar-Karten (prominente Darstellung)
// Ehemalig: aus historical[] wo claimed=true oder profile_status='historical'
// Historische Nennungen: aus historical[] wo claimed=false → gedämpft, Badge "unbestätigt"
// Gedenken: aus members[] oder historical[] wo profile_status='memorial'
//
// Verlinkung (D-10): member_slug !== null → <Link href={`/members/${member_slug}`}>
//                    member_slug === null → nur Textdarstellung
```

### Muster 4: Highlights-Kennzahlen (D-05, keine Writes)

```typescript
// Berechnung aus vorhandenen Daten — kein API-Call, kein Write-Flow
function computeHighlights(group: FansubGroup, contributions: PublicGroupContributionsResponse, domainProjection: DomainProjectionResponse): Highlight[] {
  return [
    { label: 'Anime-Projekte', value: group.anime_relations_count },
    { label: 'Release-Versionen', value: group.release_versions_count },
    { label: 'Mitglieder', value: group.members_count },
    { label: 'Aktive Jahre', value: computeActiveYears(group.founded_year, group.dissolved_year) },
    // Längste aktive Mitglieder: aus domainProjection.members[]; sortiert nach since_year
  ]
}
```

### Anti-Patterns zu vermeiden

- **`FansubMember[]` für Team-Abschnitt nutzen:** `getFansubMembers` liefert das veraltete flache `FansubMember`-Modell ohne Mitglied/historisch/memorial-Trennung. Phase 73 MUSS auf Phase-72-domain-projection (`members[]`/`historical[]`) umstellen.
- **`'use client'` auf die Root-Seite setzen:** page.tsx ist Server Component; Interaktivität nur in isolierten Client-Komponenten.
- **Native `<button>`/`<select>` statt `@/components/ui`-Primitiven:** Per CLAUDE.md verboten. Sticky-Nav-Chip-Buttons via `Button`-Primitive aus `@/components/ui`.
- **Datei-Länge über 450 Zeilen:** page.tsx (aktuell 117 Zeilen) darf durch den Umbau nicht auf >450 Zeilen wachsen. Jede Section als eigene Datei ≤ 450 Zeilen.
- **Contributions in Team-Block mischen:** Absolut verboten (D-07, Entscheidung 3). `contributors[]`-Array aus domain-projection kommt NUR in den „Externe Mitwirkende"-Abschnitt.
- **Medien ohne Visibility/Review-Filterung zeigen:** Nur `visibility='public'` und `review_status='approved'` öffentlich rendern (D-12).
- **ASCII-Ersatzzeichen in UI-Strings:** Statt „Ueberblick" → „Übersicht"; statt „Geschichte" in ASCII → mit Umlauten (CLAUDE.md Sprachqualität).

---

## Nicht selbst bauen

| Problem | Nicht selbst bauen | Stattdessen verwenden | Warum |
|---------|--------------------|-----------------------|-------|
| Sticky-Nav-Interaktion | Scroll-Spy-Library | Nativer `IntersectionObserver` + CSS `position: sticky` | Kein neues Paket nötig; Browser-API ausreichend |
| Expand/Collapse Story | Eigene Expand-Logik | `CollapsibleStory` (components/groups, bereits vorhanden) | Bereits in Produktion, stabil |
| Hero-Kurzfakten | Neue Fact-Logik | `buildFansubFactSummary` (lib/fansub-summary.ts, bereits vorhanden) | Wiederverwendbar, getestet |
| Rollen-Labels | Hartkodierte Labels | `role_labels[]` aus domain-projection (bereits von Phase 72 via `role_definitions` geliefert) | Konsistent mit dem Rest des Systems |
| Button/Card/Badge UI | Native Elemente | `@/components/ui` (Button, Card, SectionHeader, Badge) | CLAUDE.md Pflicht |
| Projekt-Bucket-Logik | Neue Bucket-Logik | `resolveProjectBucket` + `projectBucketLabel` aus `FansubProfileTabs` extrahieren | Bereits implementiert und korrekt |
| Jahresbereich-Formatierung | Neue Formatter | `formatYearRange` aus `FansubProfileTabs` in gemeinsames util extrahieren | Bereits implementiert |

---

## Häufige Fallstricke

### Fallstrick 1: Phase-72-Daten fehlen (Phase-Abhängigkeit nicht beachtet)
**Was passiert:** Phase 73 ruft `getFansubGroupDomainProjection` oder `getMediaOwnershipProjection` auf, die Phase-72-Endpunkte, die noch nicht existieren → Runtime 404.
**Warum:** Phase 72 ist noch nicht ausgeführt. Die Funktionen werden erst in Phase 72 Plan 04 in `api.ts` eingetragen.
**Wie vermeiden:** Planner muss Wave 1 als „Phase-72-vollständig-Prüfung" definieren. Page.tsx muss Phase-72-Fetches mit Graceful Degradation (`allSettled`) aufrufen und bei Fehler leere Arrays liefern → Empty State (D-15).
**Frühwarnsignal:** `TypeError: getFansubGroupDomainProjection is not a function` oder HTTP 404.

### Fallstrick 2: `FansubMember[]` statt domain-projection für Team-Block verwenden
**Was passiert:** Team-Abschnitt zeigt alle historischen Nennungen als gleichwertige Mitglieder; keine Trennung aktiv/historisch/memorial.
**Warum:** `getFansubMembers` liefert `FansubMember[]` (flaches altes Modell). Einfach wiederverwendbar, aber fachlich falsch.
**Wie vermeiden:** `getFansubMembers` nur als Fallback verwenden, falls Phase 72 noch nicht aktiv. Phase-72-`domain-projection` ist die kanonische Quelle.

### Fallstrick 3: Abschnitte-Dateien zu groß
**Was passiert:** FansubTeamSection.tsx oder FansubMediaSection.tsx werden zu Monolithen (>450 Zeilen).
**Warum:** Team-Abschnitt hat vier Untergruppen (aktiv/ehemalig/historisch/memorial) mit unterschiedlichem Rendering; Medien-Abschnitt hat drei Ownership-Bereiche.
**Wie vermeiden:** Team-Untergruppen als separate Sub-Komponenten (`FansubTeamActiveGroup`, `FansubTeamHistoricalGroup`, `FansubTeamMemorialBlock`). Medien-Bereiche als `FansubGroupMediaBlock`, `FansubReleaseMediaBlock`, `FansubMemberMediaBlock`.

### Fallstrick 4: Native HTML-Elemente statt @/components/ui-Primitive
**Was passiert:** ESLint warnt (und nach Migration: bricht) bei nativem `<button>`, `<input>`, `<select>`.
**Warum:** CLAUDE.md verbietet native Elemente wenn `@/components/ui` ein Äquivalent hat.
**Wie vermeiden:** Sticky-Nav-Buttons → `Button`-Primitive oder `<button>`-Wrapper der vorhandenen UI. Karten → `Card`-Primitive. Abschnittsköpfe → `SectionHeader`.

### Fallstrick 5: Contributions im Team-Block / Vermischung
**Was passiert:** Contributor aus `contributors[]` erscheint im „Team & Mitglieder"-Abschnitt.
**Warum:** Logik-Fehler beim Mapping; `contributors[]` sieht aus wie Mitglieder.
**Wie vermeiden:** Source-Fragment-Test in der Komponente; streng getrennte Props: `TeamSection` nimmt nur `members[]`/`historical[]`, nie `contributors[]`.

### Fallstrick 6: Fehlende deutsche Umlaute in User-facing Strings
**Was passiert:** ESLint/Code-Review markiert; CLAUDE.md-Verletzung.
**Beispiele:** „Uebersicht" → „Übersicht"; „Gruendung" → „Gründung" (bereits in FansubProfileTabs Zeile 148 als Altlast vorhanden — muss korrigiert werden!); „Aufgelöst" korrekt.
**Wie vermeiden:** Bei jedem neuen String prüfen. Altlasten in FansubProfileTabs.tsx (Zeile 148 „Gruendung", Zeile 150 „Aufloesung") beim Umbau korrigieren.

### Fallstrick 7: Medien ohne Visibility/Review zeigen
**Was passiert:** Interne oder „in Prüfung" befindliche Medien erscheinen öffentlich.
**Wie vermeiden:** `getMediaOwnershipProjection`-Response vor Render filtern: nur Rows mit `visibility='public'` AND `review_status='approved'` anzeigen (D-12).

---

## Code-Beispiele (verifizierte Muster)

### Bestehender Seitenrahmen (Erweiterungsbasis)
```typescript
// Quelle: frontend/src/app/fansubs/[slug]/page.tsx (Zeilen 42-116)
// Aktuell: group, members, projects, leaderTimeline werden geladen
// Phase 73: domainProjection + mediaOwnership hinzufügen
export default async function FansubProfilePage({ params }) {
  // ... bestehender try/catch-Block ...
  // NEU: domainProjection und mediaOwnership aus Phase-72-Endpunkten
  // Mit allSettled für Graceful Degradation (Phase 72 evtl. noch nicht aktiv)
}
```

### Bestehende Bucket-Logik (Wiederverwendung)
```typescript
// Quelle: frontend/src/components/fansubs/FansubProfileTabs.tsx (Zeilen 46-60)
type ProjectBucketKey = 'ongoing' | 'completed' | 'archived'
function resolveProjectBucket(status: AnimeListItem['status']): ProjectBucketKey {
  if (status === 'ongoing') return 'ongoing'
  if (status === 'done') return 'completed'
  return 'archived'
}
// → In FansubProjectsSection.tsx extrahieren; Links auf /anime/${id}/group/${groupId} anpassen (D-13)
```

### Historische Mitglieder-Rendering (Badge „unbestätigt")
```typescript
// Neues Muster für Phase 73:
// historical[] aus domain-projection, Badge per @/components/ui Badge-Primitive
{domainProjection.historical.map((member) => (
  <div key={member.member_display_name} className={styles.historicalEntry}>
    {member.member_slug
      ? <Link href={`/members/${member.member_slug}`}>{member.member_display_name}</Link>
      : <span>{member.member_display_name}</span>
    }
    {!member.claimed && (
      <Badge variant="secondary">unbestätigt</Badge>  // @/components/ui Badge
    )}
    <span>{member.role_labels.join(', ')}</span>
  </div>
))}
```

### Highlights-Berechnung (D-05, keine API-Writes)
```typescript
// Reine Datentransformation aus vorhandenen FansubGroup-Feldern
// Quelle: frontend/src/types/fansub.ts (verifiziert)
function computeActiveYears(foundedYear?: number | null, dissolvedYear?: number | null): number | null {
  if (!foundedYear) return null
  const end = dissolvedYear ?? new Date().getFullYear()
  return end - foundedYear
}
// Kennzahlen: anime_relations_count, release_versions_count, members_count aus FansubGroup
// Alle drei Felder sind im FansubGroup-Interface vorhanden (Zeilen 37-39, fansub.ts)
```

---

## Aktueller Stand / State of the Art

| Alt | Neu (Phase 73) | Eingeführt | Impact |
|-----|----------------|------------|--------|
| Tab-basierte Darstellung (`FansubProfileTabs`) | Kuratierte Scroll-Seite mit Sektions-Nav | Phase 73 | Bessere Erzählung; Tab-Komponente wird refaktoriert |
| `FansubMember[]` für Mitglieder (flaches Modell) | `domain-projection.members[]`/`historical[]` (typisierte Trennung) | Phase 72+73 | Saubere Mitglied/historisch/memorial-Darstellung |
| Kein Mitwirkenden-Block | Eigenständiger „Externe Mitwirkende"-Abschnitt | Phase 73 | Korrekte Trennung Entscheidung 3 |
| Medien nur als `logo_url`/`banner_url` in Hero | Drei Ownership-Bereiche via Phase-72-Projektion | Phase 72+73 | Korrekte Ownership-Matrix |
| Projektkarten verlinken auf `/anime/[id]` | Projektkarten verlinken auf `/anime/[id]/group/[groupId]` | Phase 73 | Deep-Dive-Surface (Phase 75) |

**Veraltete Altlasten, die beim Umbau zu korrigieren sind:**
- `FansubProfileTabs.tsx` Zeile 148: „Gruendung" → „Gründung" (CLAUDE.md Umlaute)
- `FansubProfileTabs.tsx` Zeile 150: „Aufloesung" → „Auflösung"
- `FansubProfileTabs.tsx` native `<button>`-Elemente in Tab-Leiste (Zeilen 118-131) → `Button`-Primitive aus `@/components/ui` [VERIFIED: native buttons in FansubProfileTabs]

---

## Annahmen-Protokoll

| # | Behauptung | Abschnitt | Risiko bei Fehleinschätzung |
|---|------------|-----------|------------------------------|
| A1 | `ownerType='group'` + `ownerID=group.id` wird von `getMediaOwnershipProjection` korrekt aufgelöst (Gruppenmedien über `fansub_group_media`-Junction) | Phase-72-Contract, Medien-Abschnitt | Mittel — falls nicht, Fallback auf `group.logo_url`/`group.banner_url` aus FansubGroup-DTO; Gruppenmedien-Abschnitt zeigt Empty State |
| A2 | `historical[]`-Untergruppen-Trennung (ehemalig vs. historische Nennung) ist über `claimed`-Feld + `profile_status` ableitbar | Reuse-Inventar, Team-Untergruppen | Mittel — falls Phase 72 keine ausreichenden Felder liefert, muss Planner Feld-Erweiterung in Phase 72 prüfen oder Untergruppen auf zwei statt vier reduzieren |
| A3 | `FansubGroup` enthält KEIN `story`/`description`-Textfeld; die Story-Section zeigt vorerst nur Fakten + Empty-State-Platzhalter | Story-Abschnitt, Phase-72-Contract-Lücken | Gering — Worst Case: Platzhalter zeigen; kein Datenverlust; Story-Pflege kommt in Phase 77/78 |
| A4 | `Badge`-Komponente aus `@/components/ui` ist für den „unbestätigt"-Badge verwendbar | Code-Beispiele | Gering — `Badge.tsx` existiert in der UI-Komponentenliste [VERIFIED: ls components/ui]; falls kein geeignetes variant existiert, kleines CSS-Klassen-Enhancement |
| A5 | `lucide-react`-Icons sind in den Fansub-Section-Komponenten direkt importierbar | Standard-Stack | Gering — lucide-react ist eine CLAUDE.md-Dependency; kein Paket-Eingriff nötig |

---

## Offene Fragen

1. **Welche ownerType-Strings akzeptiert `getMediaOwnershipProjection` für Gruppenmedien?**
   - Was bekannt ist: Phase-72-Plan-03 beschreibt Gruppen-Medien via `fansub_group_media`-Junction und Release-Version-Medien via `release_version_media`.
   - Was unklar ist: Exakter `ownerType`-String (`'group'`? `'fansub_group'`?); ob ein einzelner Endpoint-Aufruf mit `ownerType='group'` + `groupID` alle Gruppen-Medien liefert.
   - Empfehlung: Planner lässt Phase-72-Executor den ownerType-Wert fixieren/dokumentieren; Phase-73-Plan baut Fallback auf `group.logo_url`/`banner_url` ein.

2. **Soll `getFansubMembers` parallel zu `getFansubGroupDomainProjection` aufgerufen werden oder komplett ersetzt werden?**
   - Was bekannt ist: `getFansubMembers` liefert `FansubMember[]` ohne Trennung; domain-projection liefert `members[]`/`historical[]` korrekt getrennt.
   - Was unklar ist: Ob `FansubMember[]` noch für irgendeinen Teil gebraucht wird, den domain-projection nicht liefert (z. B. App-User-verknüpfte Mitglieder mit Keycloak-Namen).
   - Empfehlung: Domain-projection ist die kanonische Quelle; `getFansubMembers` kann entfernt werden sobald domain-projection verifiziert ist.

3. **Wie viele Highlights-Kacheln sind sinnvoll (D-05)?**
   - Was bekannt ist: Vorhandene Felder: `anime_relations_count`, `release_versions_count`, `members_count`, `anime_count`+`member_count` aus contributions, `founded_year`/`dissolved_year`.
   - Empfehlung: Drei bis vier Kacheln (Projekte, Releases, aktive Jahre, Mitglieder); konkrete Auswahl ist Claude's Discretion.

---

## Umgebungs-Verfügbarkeit

| Abhängigkeit | Benötigt von | Verfügbar | Version | Fallback |
|-------------|-------------|-----------|---------|----------|
| Next.js Dev-Server :3000 | Live-Testing [MEMORY] | ✓ | Next.js 16 | — |
| Phase-72-Endpunkte (`domain-projection`, `media-ownership`) | Team & Mitglieder, Medien-Abschnitt | **Ausstehend** (Phase 72 nicht ausgeführt) | — | Fallback: `getFansubMembers` + `group.logo_url`/`banner_url` |
| PostgreSQL 16 (docker-compose) | Backend-Daten | ✓ | 16 | — |
| `@/components/ui` Primitive (Card, Badge, Button, SectionHeader) | Alle Abschnitte | ✓ | intern | — |

**Blockierende Abhängigkeit:**
- Phase-72-Endpunkte existieren erst nach Phase-72-Ausführung. Phase 73 muss entweder nach Phase 72 starten ODER die neuen Fetches mit `try/catch`/Graceful-Degradation bauen.

---

## Validierungsarchitektur

### Test-Framework
| Eigenschaft | Wert |
|-------------|------|
| Framework | Vitest 3 (`frontend/vitest.config.ts`) |
| Config-Datei | `frontend/vitest.config.ts` (existiert) |
| Schnell-Run | `cd frontend && npx vitest run --reporter=verbose <pattern>` |
| Vollständiger Run | `cd frontend && npm test` (= `vitest run`) |

### Phase-Anforderungen → Test-Mapping

| Req-ID | Verhalten | Test-Typ | Automatisierter Befehl | Datei vorhanden? |
|--------|-----------|----------|------------------------|-----------------|
| B/D-07 | Team-Block enthält KEINE `contributors[]`-Einträge | unit (Vitest, Komponente) | `npx vitest run FansubTeamSection` | ❌ Wave 0 |
| B/D-09 | Historische Einträge mit `claimed=false` tragen Badge „unbestätigt" | unit (Vitest) | `npx vitest run FansubTeamSection` | ❌ Wave 0 |
| B/D-10 | Geclaimte historische Mitglieder haben Link auf `/members/[slug]`; ungeclaimte haben keinen Link | unit (Vitest) | `npx vitest run FansubTeamSection` | ❌ Wave 0 |
| B/D-13 | Projektkarten verlinken auf `/anime/:id/group/:groupId`, nicht auf `/anime/:id` | unit (Vitest) | `npx vitest run FansubProjectsSection` | ❌ Wave 0 |
| B/D-15 | Empty State sichtbar wenn domain-projection-Fetch fehlschlägt | unit (Vitest) | `npx vitest run FansubProfilePage` | ❌ Wave 0 |
| G/D-12 | Medien-Abschnitt rendert nur Rows mit `visibility='public'` und `review_status='approved'` | unit (Vitest) | `npx vitest run FansubMediaSection` | ❌ Wave 0 |
| K | `api.ts`-Typen `getFansubGroupDomainProjection` + `getMediaOwnershipProjection` sind vorhanden | type | `npm run typecheck` | ❌ nach Phase 72 |

### Sampling Rate
- **Pro Task-Commit:** `npx vitest run <betroffene Section>`
- **Pro Wave-Merge:** `npm test` (vollständig)
- **Phase-Gate:** Vollständige Test-Suite grün + `npm run typecheck` fehlerfrei vor `/gsd:verify-work`

### Wave-0-Lücken
- [ ] `frontend/src/components/fansubs/__tests__/FansubTeamSection.test.tsx` — deckt Trennung Team/Contributors, Badge „unbestätigt", Verlinkung
- [ ] `frontend/src/components/fansubs/__tests__/FansubProjectsSection.test.tsx` — deckt Deep-Dive-Link `/anime/:id/group/:groupId`
- [ ] `frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx` — deckt Visibility/Review-Filterung
- [ ] `frontend/src/app/fansubs/__tests__/page.test.tsx` — deckt Graceful Degradation (allSettled + Empty States)

---

## Sicherheitsdomäne

### Anwendbare ASVS-Kategorien

| ASVS-Kategorie | Anwendbar | Standard-Kontrolle |
|----------------|-----------|-------------------|
| V2 Authentifizierung | nein (öffentliche Read-Seite) | — |
| V3 Session Management | nein | — |
| V4 Access Control | **ja** | Visibility/Review-Filterung Server-seitig vor Render; `review_status='approved'` AND `visibility='public'` als Client-seitige Filterbedingung für Phase-72-Projektionsdaten |
| V5 Input Validation | **ja** (begrenzt) | Slug-Parameter-Validierung existiert bereits in page.tsx (Zeile 44: `slug.trim()`); keine neuen User-Inputs in Phase 73 (read-only) |
| V6 Kryptographie | nein | — |

### Bekannte Bedrohungsmuster für Next.js Public SSR

| Muster | STRIDE | Standard-Gegenmassnahme |
|--------|--------|------------------------|
| Öffentliche Exposition interner/nicht freigegebener Medien | Information Disclosure | Visibility/Review-Filterung im Frontend zwingend vor Render; nie alle MediaOwnershipRows ungeprüft rendern |
| XSS über ungefilterte Daten | Tampering | React escaped JSX-Strings automatisch; keine `dangerouslySetInnerHTML`; `CollapsibleStory` zeigt Plaintext (kein HTML) |
| Server-Component-seitiges Datenleck über Fehler | Information Disclosure | `try/catch` mit generischen Fehlermeldungen (bestehendes Muster page.tsx Zeile 70-73 verifiziert) |

---

## Quellen

### Primär (HIGH Konfidenz)
- `frontend/src/app/fansubs/[slug]/page.tsx` — bestehende Seite vollständig gelesen
- `frontend/src/components/fansubs/FansubProfileTabs.tsx` (241 Zeilen) — vollständig gelesen; Altlasten (Umlaute) identifiziert
- `frontend/src/components/fansubs/GroupLeaderTimeline.tsx` (47 Zeilen) — vollständig gelesen
- `frontend/src/components/groups/CollapsibleStory.tsx` — vollständig gelesen
- `frontend/src/lib/fansub-summary.ts` — vollständig gelesen
- `frontend/src/types/fansub.ts` (622 Zeilen) — vollständig gelesen; FansubGroup, FansubMember, HistFansubGroupMember verifiziert
- `frontend/src/types/contributions.ts` — PublicGroupContributionsResponse, PublicFansubLeaderEntry verifiziert
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-01-PLAN.md` — Migration-Schema (kanonische Feldnamen)
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-02-PLAN.md` — domain-projection Contract (Route, Envelope, DTO-Shape)
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-03-PLAN.md` — media-ownership Contract (Route, Envelope, DTO-Shape)
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-04-PLAN.md` — Frontend-Typen + api.ts-Funktionsnamen
- `.planning/phases/73-public-fansub-page-fansubs-slug-erweitern/73-CONTEXT.md` — D-01..D-15 Locked Decisions
- `.planning/milestones/v1.2-DISCUSSION.md` — Entscheidungen A–K LOCKED
- `frontend/src/components/ui/Card.tsx`, `SectionHeader.tsx` — UI-Primitive verifiziert
- `frontend/src/components/ui/` (ls) — vollständige Primitive-Liste verifiziert

### Sekundär (MEDIUM Konfidenz)
- `frontend/src/lib/api.ts` (Grep-Extrakte) — getFansubBySlug, getFansubMembers, getFansubContributions, getAnimeList Signaturen verifiziert
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-RESEARCH.md` — Membership vs. Contribution Separation, Contract-Entscheidungen
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-CONTEXT.md` — D-01..D-06, Phase-72-Scope

### Tertiär (LOW Konfidenz)
- Keine. Alle Kernbefunde quell-verifiziert; keine WebSearch nötig (internes Brownfield-Frontend).

---

## Metadaten

**Konfidenz-Aufschlüsselung:**
- Standard-Stack: HIGH — keine neuen Pakete; alles aus package.json/Quellcode verifiziert
- Reuse-Inventar: HIGH — alle Quell-Komponenten direkt gelesen
- Phase-72-Contract: HIGH für Route/Envelope/Feldnamen (aus Plan-Dateien); MEDIUM für abgeleitete Untergruppen-Logik (A1, A2)
- Architektur-Muster: HIGH — Muster direkt aus bestehendem Code abgeleitet
- Fallstricke: HIGH — aus echtem Code (Altlasten FansubProfileTabs, native buttons) identifiziert

**Research-Datum:** 2026-06-04
**Gültig bis:** 2026-07-04 (stabiles internes Frontend; bei neuen Migrationen Phase-72-Feldnamen erneut prüfen)
