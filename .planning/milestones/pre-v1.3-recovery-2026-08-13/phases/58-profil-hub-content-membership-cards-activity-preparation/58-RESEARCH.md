# Phase 58: Profil-Hub Content, Membership Cards & Activity Preparation – Research

**Researched:** 2026-05-29
**Domain:** Frontend-UI (Next.js App Router), Backend-Go (Profile-Aggregat-Erweiterung), AppShell-Drawer
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Locked Decisions

- **D-01:** `MembershipsSection` wird aus `/me/profile` vollständig entfernt.
- **D-02:** Gruppen-Navigation wandert in den globalen App-Drawer unter „Mein Bereich" — Abschnitt „Meine Gruppen" mit Logo + Gruppenname, Klick → geschützter Gruppenbereich.
- **D-03:** Keine separate `/me/groups`-Route in Phase 58.
- **D-04:** Neue Section „Meine letzten Medien" ersetzt den MembershipsSection-Slot.
- **D-05:** Datenbasis: 3 neueste `release_version_media`-Einträge gefiltert auf `uploaded_by_user_id = aktueller Member`, sortiert nach `created_at DESC`.
- **D-06:** Kachel zeigt Thumbnail, Kategorie-Label, Releasename/Kontext.
- **D-07:** Empty State: „Noch keine Medien hochgeladen."
- **D-08:** Neue Section „Meine letzten Beiträge" ersetzt den ContributionsSection-Slot.
- **D-09:** Datenbasis: 3 neueste `release_member_roles`-Einträge verknüpft mit Anime-Titel, Gruppenname, Rollenbezeichnung.
- **D-10:** Kachel zeigt Anime-Titel (mit Cover-Thumbnail), Gruppenname, Rolle.
- **D-11:** Empty State: „Noch keine Beiträge."
- **D-12/D-13:** Alle internen Admin-Erklärungstexte entfernen, ersetzen durch ehrliche leere Zustände.
- **D-14:** Capability-Gates bleiben im Code, Fehlertext für fehlende Capabilities wird ehrlicher Empty State.
- **D-15:** Neue Sections implementieren `is_public`-Check von Beginn an für Phase-59-Kompatibilität.
- **D-16:** Sichtbarkeits-Prüfung als klare Prop oder Kontext-Flag — kein versteckter Seiteneffekt.
- **D-17:** Alle user-facing Strings mit korrekten Umlauten.

### Claude's Discretion

Keine explizit deklarierten Discretion-Bereiche im CONTEXT.md.

### Deferred Ideas (NICHT IN SCOPE)

- Separate `/me/groups`-Route
- Paginierter Contributions-Detail-Endpunkt
- Vollständige Public-Member-Page `/members/[slug]`
- Entfernung alter `active_from_year`/`active_until_year`-Spalten
- Avatar-Remove-Contract
</user_constraints>

---

## Summary

Phase 58 ist eine rein frontend-lastige Phase mit einer gezielten Backend-Erweiterung am Profil-Aggregat. Der Kern der Arbeit ist:

1. Zwei bestehende Sections (`MembershipsSection`, `ContributionsSection`) aus `page.tsx` entfernen und durch zwei neue ersetzen.
2. Den AppShell-Drawer um einen echten „Meine Gruppen"-Abschnitt erweitern, der die bereits im Profil-Aggregat vorhandenen `memberships`-Daten nutzt.
3. Das Backend-Profil-Aggregat (`GET /api/v1/me/profile`) um zwei neue Arrays erweitern: `recent_media` und `recent_contributions`.

Die neuen Sections sind einfache read-only Listen mit klarer Datenbasis. Es gibt keine neuen Routen, keine neuen Upload-Flows, keine Authentifizierungsänderungen. Die Komplexität liegt in der sauberen `isPublicView`-Prop-Modellierung (Phase-59-Vorbereitung) und der korrekten Backend-Query-Erweiterung.

**Primary recommendation:** Backend-Aggregat um `recent_media` und `recent_contributions` erweitern; Frontend implementiert zwei neue Section-Komponenten nach dem etablierten Muster; Drawer erhält eigenen „Meine Gruppen"-Abschnitt mit Daten aus `profile.memberships`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| „Meine letzten Medien"-Section | Frontend (Client Component) | Backend-Aggregat | Rein darstellend; Daten kommen aus GET /me/profile |
| „Meine letzten Beiträge"-Section | Frontend (Client Component) | Backend-Aggregat | Rein darstellend; Daten kommen aus GET /me/profile |
| Drawer „Meine Gruppen" | Frontend (AppShell / Client) | — | Nutzt profile.memberships, die bereits im AppShellClientWrapper geladen werden |
| Backend `recent_media` Query | Backend Repository | — | Neue DB-Query auf release_version_media nach uploaded_by_user_id |
| Backend `recent_contributions` Query | Backend Repository | — | Neue DB-Query auf release_member_roles nach member_id mit Joins |
| is_public-Sichtbarkeitslogik | Frontend (Komponenten-Props) | — | Prop-basiert, kein Seiteneffekt |
| Admin-Copy bereinigen | Frontend | — | Reine String-Änderungen in bestehenden Komponenten |

---

## Standard Stack

### Core (bereits vorhanden, keine neuen Installationen)

| Library | Version | Purpose | Warum Standard |
|---------|---------|---------|----------------|
| Next.js App Router | 16 (laut package.json) | Routing, Client Components | Projektstandard [ASSUMED – Versionsnummer nicht live verifiziert] |
| React | 18.3.1 | UI | Projektstandard |
| TypeScript | Projektstandard | Typen | Projektstandard |
| lucide-react | Projektstandard | Icons | Projektstandard |

### Vorhandene UI-Komponenten (direkt verwendbar)

| Komponente | Pfad | Verwendung in Phase 58 |
|------------|------|----------------------|
| `Card` | `@/components/ui/Card` | Wrapper für neue Sections und Kacheln |
| `Badge` | `@/components/ui/Badge` | Kategorie-Labels, Rollenbezeichnungen |
| `EmptyState` | `@/components/ui/EmptyState` | Leere Zustände für beide neuen Sections |
| `LoadingState` | `@/components/ui/LoadingState` | Bereits in page.tsx verwendet |
| `SectionHeader` | `@/components/ui/SectionHeader` | Section-Überschriften |

**Keine neuen npm-Pakete notwendig.** [VERIFIED: Codebase-Grep]

---

## Package Legitimacy Audit

> Keine neuen externen Pakete in Phase 58. Abschnitt entfällt.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (Client Component)
  └─ /me/profile/page.tsx
       ├─ getOwnProfile() → GET /api/v1/me/profile
       │    └─ MemberProfileRepository.GetOwnProfile()
       │         ├─ loadMemberships()          [bereits vorhanden]
       │         ├─ loadHistoricalCredits()    [bereits vorhanden – bleibt als Basis]
       │         ├─ loadRecentMedia()          [NEU: release_version_media WHERE uploaded_by_user_id]
       │         └─ loadRecentContributions()  [NEU: release_member_roles + Joins]
       │
       ├─ MemberProfileHero     [bleibt]
       ├─ ProfileBasicsForm     [bleibt]
       ├─ ProfileStoryCard      [bleibt]
       ├─ RecentMediaSection    [NEU – ersetzt MembershipsSection-Slot]
       └─ RecentContributionsSection [NEU – ersetzt ContributionsSection-Slot]

AppShell (Client Component – AppShellClientWrapper)
  └─ AppShell → AppShellNavGroups → „Mein Bereich"
       └─ „Meine Gruppen" Abschnitt [NEU]
            └─ Daten: profile.memberships (bereits in getOwnProfile() vorhanden)
                      → AppShellClientWrapper muss memberships weiterreichen
```

### Recommended Project Structure

```
frontend/src/app/me/profile/
├── page.tsx                          # MembershipsSection + ContributionsSection entfernen
├── page.module.css                   # neue CSS-Klassen ergänzen
└── components/
    ├── MembershipsSection.tsx         # ENTFERNEN (komplett löschen)
    ├── ContributionsSection.tsx       # ERSETZEN durch RecentContributionsSection
    ├── RecentMediaSection.tsx         # NEU
    ├── RecentContributionsSection.tsx # NEU
    └── [bestehende Komponenten]       # unverändert

frontend/src/components/layout/
├── AppShell.tsx                       # AppShellNavGroups erweitern: „Meine Gruppen" Abschnitt
└── AppShellClientWrapper.tsx          # memberships aus Profil an AppShell weiterreichen

backend/internal/repository/
└── member_profile_repository.go      # loadRecentMedia() + loadRecentContributions() hinzufügen

backend/internal/models/
└── member_profile.go                  # RecentMedia + RecentContribution Structs + MemberProfile-Felder

shared/contracts/openapi.yaml          # neue Felder dokumentieren
```

### Pattern 1: Neue Section-Komponenten

Bestehende Sections (`MembershipsSection.tsx`, `ContributionsSection.tsx`) dienen als exaktes Muster für neue Komponenten:

```typescript
// Source: frontend/src/app/me/profile/components/MembershipsSection.tsx (Musterreferenz)
type RecentMediaSectionProps = {
  items: MemberProfileRecentMedia[]
  isPublicView?: boolean
  canView: boolean
}

export function RecentMediaSection({ items, isPublicView = false, canView }: RecentMediaSectionProps) {
  if (!canView) {
    return <EmptyState title="Noch keine Medien hochgeladen." />
  }
  if (items.length === 0) {
    return <EmptyState title="Noch keine Medien hochgeladen." />
  }
  // Kacheln rendern
}
```

**Wichtig:** `isPublicView`-Prop von Beginn an implementieren (D-15/D-16). In Phase 58 ist `isPublicView` immer `false` (eigenes Profil). Phase 59 übergibt `true` für das öffentliche Member-Profil.

### Pattern 2: Backend-Aggregat-Erweiterung

Das bestehende Muster in `GetOwnProfile()` zeigt den Ansatz:

```go
// Source: backend/internal/repository/member_profile_repository.go (Zeile 30–49)
func (r *MemberProfileRepository) GetOwnProfile(ctx context.Context, appUserID int64) (*models.MemberProfile, error) {
    base, err := r.ensureProfileBase(ctx, appUserID)
    // ...
    base.Memberships, err = r.loadMemberships(ctx, base.MemberID, appUserID)
    base.HistoricalCredits, err = r.loadHistoricalCredits(ctx, base.MemberID)
    // NEU:
    base.RecentMedia, err = r.loadRecentMedia(ctx, appUserID)         // uploaded_by_user_id = app_user.id
    base.RecentContributions, err = r.loadRecentContributions(ctx, base.MemberID) // member_id = member.id
    return base, nil
}
```

**Kritisch:** `release_version_media.uploaded_by_user_id` verweist auf `users.id` (die interne User-Tabelle, nicht `members.id`). Die Query muss `uploaded_by_user_id = appUserID` verwenden. [VERIFIED: Codebase – CreateReleaseVersionMediaAsset INSERT mit `(SELECT id FROM users WHERE id = $7)`]

### Pattern 3: Drawer-Erweiterung „Meine Gruppen"

Der AppShell-Drawer hat bereits einen „Mein Bereich"-Abschnitt mit statischen `NavItem`-Einträgen. Der Eintrag „Meine Gruppen" ist aktuell `disabled: true, badge: 'bald'`.

Für Phase 58: Dieser Eintrag wird durch einen dynamischen Abschnitt ersetzt, der `profile.memberships` auflistet. Das erfordert:

1. `AppShellClientWrapper` muss `memberships` aus dem Profil-Response an `AppShell` weitergeben.
2. `AppShell` erhält ein neues optionales Prop `memberships?: MembershipItem[]`.
3. In `AppShellNavGroups` wird der statische „Meine Gruppen"-Eintrag durch eine Liste dynamischer Links ersetzt.

**Gruppen-Link-Ziel:** Klick navigiert direkt in den geschützten Gruppenbereich. Basierend auf Phase 50/54-Architektur ist das vermutlich `/fansubs/[slug]/edit` oder ein ähnlicher Contributor-Bereich. Dieser Pfad muss im Code verifiziert werden.

### Anti-Patterns to Avoid

- **Separater API-Call für Medien/Beiträge:** Kein eigenständiger `fetch`-Aufruf in der Section-Komponente. Daten kommen aus dem Profil-Aggregat.
- **Seiteneffektbasierte Sichtbarkeitslogik:** Kein `useEffect` zum Ausblenden — explizite `isPublicView`-Prop.
- **Admin-Copy weiterlassen:** Texte wie „Phase 53 zeigt nur echte Aggregate" oder „kein eigener Beitrags-Contract" sind in Phase 58 zu entfernen.
- **`MembershipsSection` weiterverwenden:** Komplett löschen, nicht refactoren.

---

## Don't Hand-Roll

| Problem | Nicht bauen | Stattdessen nutzen | Warum |
|---------|------------|-------------------|-------|
| Thumbnail-URL-Auflösung | Eigene URL-Logik | `publicURLForPath()` in MemberProfileRepository | Bereits implementiert, gleiche Logik wie Avatar |
| Kategorie-Labels | Eigene Map | Bestehende Kategorie-Labels aus Release-Version-Media-Handler | Konsistenz mit dem restlichen Admin-UI |
| leere Zustände | Custom-Div | `EmptyState`-Komponente aus `@/components/ui` | GDS-Standard |
| Gruppen-Link-Format | Eigene Slug-Logik | `membership.fansub_group_slug` aus bestehendem Aggregat | Bereits im Modell vorhanden |

---

## Common Pitfalls

### Pitfall 1: uploaded_by_user_id vs. member_id

**Was schiefläuft:** `release_version_media.uploaded_by_user_id` referenziert `users.id`, nicht `members.id`. Ein Query mit `member_id` liefert keine Ergebnisse.
**Warum:** Das Upload-System trackt den App-User (Keycloak-User), der Member-Profile-Layer arbeitet mit `members.id`.
**Vermeidung:** Query auf `uploaded_by_user_id = $appUserID` (nicht `memberID`). [VERIFIED: INSERT-Query in `CreateReleaseVersionMediaAsset`]
**Warnsignal:** Leere Ergebnisliste trotz vorhandener Uploads des Nutzers.

### Pitfall 2: release_member_roles hat keine direkte created_at-Zeitstempel-Spalte

**Was schiefläuft:** Sortierung nach „neuesten" Beiträgen erfordert einen Timestamp, der in `release_member_roles` möglicherweise fehlt.
**Warum:** Die Tabelle wurde für Credits, nicht für eine zeitliche Sortierung angelegt.
**Vermeidung:** Tatsächliche Spalten der Tabelle vor Query-Formulierung prüfen. Migration 0044 enthält die Tabellendefinition. Wenn `created_at` fehlt, alternativ nach `release_id DESC` oder `rmr.id DESC` sortieren.
**Warnsignal:** `column "created_at" does not exist`-Fehler beim Backend-Test.

### Pitfall 3: AppShellClientWrapper reicht memberships nicht weiter

**Was schiefläuft:** `AppShellClientWrapper` ruft `getOwnProfile()` auf, extrahiert aber aktuell nur `displayName`, `email`, `avatarUrl`, `canAdmin`. `memberships` wird nicht weitergegeben.
**Warum:** Das War der ursprüngliche Scope von Phase 54.
**Vermeidung:** `AppShellClientWrapper` muss `memberships` aus dem Profil-Response extrahieren und als neues Prop an `AppShell` übergeben. `AppShell` bekommt ein neues optionales Prop.

### Pitfall 4: Gruppen-Logo nicht vorhanden im bestehenden Aggregat

**Was schiefläuft:** `MemberProfileMembership` hat `fansub_group_name` und `fansub_group_slug`, aber kein Logo-Feld.
**Warum:** Phase 53 hat das Aggregat ohne Logo-URL angelegt.
**Vermeidung:** Entweder Logo-URL ins Membership-Aggregat ergänzen (Backend-Änderung), oder Fallback-Icon (z. B. `Users` aus lucide-react) für alle Gruppen verwenden. D-02 spricht von „Logo + Gruppenname" — wenn kein Logo verfügbar ist, reicht ein Fallback-Icon mit Gruppenname.

### Pitfall 5: Drawer erhält profile.memberships nur über einen zweiten API-Call

**Was schiefläuft:** `AppShellClientWrapper` ruft `getOwnProfile()` bereits auf. Es darf kein zweiter separater Call für Memberships entstehen.
**Vermeidung:** `memberships` aus dem bereits vorhandenen `getOwnProfile()`-Call extrahieren und weiterreichen.

---

## Code Examples

### Bestehende `loadHistoricalCredits`-Query als Muster für `loadRecentContributions`

```go
// Source: backend/internal/repository/member_profile_repository.go, Zeile 560–599
func (r *MemberProfileRepository) loadHistoricalCredits(ctx context.Context, memberID int64) ([]models.MemberProfileCredit, error) {
    rows, err := r.db.Query(ctx, `
        SELECT
            fg.id,
            fg.name,
            cr.name,
            cr.label,
            COUNT(DISTINCT rmr.release_id)::int
        FROM release_member_roles rmr
        JOIN release_versions rv ON rv.release_id = rmr.release_id
        JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
        JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
        JOIN contributor_roles cr ON cr.id = rmr.role_id
        WHERE rmr.member_id = $1
        GROUP BY fg.id, fg.name, cr.name, cr.label
        ORDER BY fg.name ASC, cr.label ASC, cr.name ASC
    `, memberID)
    // ...
}
```

`loadRecentContributions` braucht keine Aggregation (COUNT), sondern die 3 neuesten Einzeleinträge mit Anime-Titel und Cover. Join-Pfad: `release_member_roles → releases → fansub_releases → anime → anime_assets (cover)`.

### Bestehender `CreateReleaseVersionMediaAsset`-Insert als Referenz für Query-Schlüssel

```go
// Source: backend/internal/repository/release_version_media_repository.go, Zeile 86–112
// uploaded_by_user_id verweist auf users.id (nicht members.id!)
// Query für recent_media: WHERE rvm.uploaded_by_user_id = $appUserID AND rvm.deleted_at IS NULL
// ORDER BY rvm.created_at DESC LIMIT 3
```

### AppShell „Meine Gruppen" – aktueller statischer Eintrag (zu ersetzen)

```typescript
// Source: frontend/src/components/layout/AppShell.tsx, Zeile 90–91
const myItems: AppShellNavItem[] = [
  { label: 'Mein Profil', href: '/me/profile', icon: <UserCircle size={17} />, current: isCurrent(currentPath, '/me/profile') },
  { label: 'Meine Gruppen', icon: <Users size={17} />, disabled: true, badge: 'bald' },  // ERSETZEN
  { label: 'Meine Beiträge', icon: <Compass size={17} />, disabled: true, badge: 'bald' },
]
```

In Phase 58: Der statische „Meine Gruppen"-Eintrag wird durch eine dynamische Liste aus `memberships` ersetzt. „Meine Beiträge" bleibt vorerst disabled.

---

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Impact auf Phase 58 |
|--------------|-----------------|---------------------|
| MembershipsSection auf der Profilseite | Gruppen im Drawer | MembershipsSection.tsx vollständig löschen |
| ContributionsSection mit historischen Aggregaten | RecentContributionsSection mit 3 neuesten Einzeleinträgen | Neue Datenbasis, andere Query |
| Admin-Copy mit technischen Erklärungen | Ehrliche leere Zustände | String-Bereinigung in page.tsx und ContributionsSection |
| Statischer „Meine Gruppen"-Eintrag im Drawer | Dynamischer Abschnitt mit echten Gruppen | AppShell + AppShellClientWrapper erweitern |

---

## Assumptions Log

| # | Claim | Abschnitt | Risiko wenn falsch |
|---|-------|-----------|-------------------|
| A1 | `release_member_roles` hat keine `created_at`-Spalte (oder hat sie) — muss durch Migrations-Lesen verifiziert werden | Pitfall 2, Backend-Query | Falsche Sortierung oder Query-Fehler |
| A2 | Gruppen-Link-Ziel ist `/fansubs/[slug]/edit` oder ähnlicher Contributor-Bereich | Drawer-Erweiterung | Falscher Navigationspfad |
| A3 | `MemberProfileMembership` hat kein Logo-URL-Feld — Fallback-Icon wird benötigt | Drawer-Erweiterung | UI zeigt leeres Logo-Slot |
| A4 | Next.js Version 16 (aus CLAUDE.md, nicht live gegen package.json verifiziert) | Standard Stack | Kein funktionaler Impact |

---

## Open Questions

1. **Hat `release_member_roles` eine `created_at`-Spalte für die Sortierung?**
   - Was wir wissen: Die Tabelle wurde in Migration 0044 angelegt. `loadHistoricalCredits` sortiert nach `fg.name`, nicht nach Zeit.
   - Was unklar ist: Ob ein Timestamp für „neueste 3" verfügbar ist.
   - Empfehlung: Migration 0044 lesen, bevor die Query für `loadRecentContributions` formuliert wird. Fallback: nach `rmr.id DESC LIMIT 3`.

2. **Wohin navigiert der Gruppen-Link im Drawer?**
   - Was wir wissen: D-02 sagt „geschützter Gruppenbereich (Edit-/Contributor-Bereich)".
   - Was unklar ist: Exakter Pfad — `/fansubs/[slug]/edit`, `/me/groups/[slug]`, oder anderes.
   - Empfehlung: Bestehende Fansub-Edit-Route-Struktur prüfen. Wahrscheinlich `/fansubs/${membership.fansub_group_slug}/edit`.

3. **Welche Felder aus `release_version_media` und dem zugehörigen Anime sind für die Kachel-Darstellung verfügbar?**
   - Was wir wissen: `category`, `thumbnail_url` (aus media_files JOIN), `release_version_id`.
   - Was unklar ist: Wie der Releasename/Kontext (Anime-Titel, Episodennummer) über den Join-Pfad erreichbar ist.
   - Empfehlung: JOIN-Pfad `release_version_media → release_versions → fansub_releases → anime` prüfen.

---

## Environment Availability

> Keine neuen externen Abhängigkeiten in Phase 58. Abschnitt entfällt — alle benötigten Dienste (Postgres, Backend, Frontend) laufen im bestehenden Docker-Compose-Stack.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3 (Frontend), testify (Backend) |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `npm run test --prefix frontend` |
| Full suite command | `npm run test --prefix frontend` |

### Phase Requirements → Test Map

| Anforderung | Verhalten | Test-Typ | Automatisiert | Datei vorhanden? |
|------------|-----------|----------|---------------|-----------------|
| D-01: MembershipsSection entfernt | Komponente nicht mehr in page.tsx importiert | Unit | Nicht sinnvoll zu testen | N/A |
| D-04/D-07: RecentMediaSection Empty State | „Noch keine Medien hochgeladen." wird gerendert wenn items leer | Unit | `vitest src/app/me/profile/components/RecentMediaSection.test.tsx` | ❌ Wave 0 |
| D-08/D-11: RecentContributionsSection Empty State | „Noch keine Beiträge." wird gerendert wenn items leer | Unit | `vitest src/app/me/profile/components/RecentContributionsSection.test.tsx` | ❌ Wave 0 |
| D-15/D-16: isPublicView-Prop | Komponente akzeptiert und verwendet isPublicView Prop | Unit | im jeweiligen Test | ❌ Wave 0 |
| Backend: loadRecentMedia Query | Query liefert max. 3 Einträge nach uploaded_by_user_id | Backend-Unit | Go-Test in member_profile_repository_test.go | ❌ Wave 0 |
| Backend: loadRecentContributions Query | Query liefert max. 3 neueste Einträge nach member_id | Backend-Unit | Go-Test in member_profile_repository_test.go | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `frontend/src/app/me/profile/components/RecentMediaSection.test.tsx` — Empty State + isPublicView
- [ ] `frontend/src/app/me/profile/components/RecentContributionsSection.test.tsx` — Empty State + isPublicView
- [ ] Backend: Testfälle in `member_profile_repository_test.go` für `loadRecentMedia` und `loadRecentContributions`

---

## Security Domain

### Applicable ASVS Categories

| ASVS-Kategorie | Betrifft Phase 58 | Kontrolle |
|---------------|------------------|-----------|
| V2 Authentication | Nein — Auth-Seam bleibt unverändert | — |
| V3 Session Management | Nein | — |
| V4 Access Control | Ja — `isPublicView`-Prop + Capability-Gates | Capability-Gates bleiben im Code (D-14) |
| V5 Input Validation | Minimal — keine neuen Formular-Eingaben | — |
| V6 Cryptography | Nein | — |

### Bekannte Threat-Muster

| Pattern | STRIDE | Mitigierung |
|---------|--------|-------------|
| Fremde Medien durch fehlerhaften User-ID-Filter sichtbar | Information Disclosure | Query explizit auf `uploaded_by_user_id = $appUserID` einschränken; Backend-Test verifiziert Isolation |
| is_public-Check umgehbar durch direkten URL-Aufruf | Elevation of Privilege | `isPublicView`-Prop ist Frontend-only; Backend muss bei Phase-59-Endpunkt eigenständig prüfen. In Phase 58 noch nicht kritisch (kein öffentlicher Endpunkt). |

---

## Sources

### Primary (HIGH confidence)

- `frontend/src/app/me/profile/page.tsx` — Bestehende Profilseite, direkt gelesen
- `frontend/src/app/me/profile/components/MembershipsSection.tsx` — Vollständig gelesen
- `frontend/src/app/me/profile/components/ContributionsSection.tsx` — Vollständig gelesen
- `frontend/src/components/layout/AppShell.tsx` — Vollständig gelesen
- `frontend/src/components/layout/AppShellClientWrapper.tsx` — Vollständig gelesen
- `frontend/src/types/profile.ts` — Vollständig gelesen
- `backend/internal/models/member_profile.go` — Vollständig gelesen
- `backend/internal/repository/member_profile_repository.go` — Relevante Abschnitte gelesen
- `backend/internal/repository/release_version_media_repository.go` — Relevante Abschnitte gelesen
- `.planning/phases/58-profil-hub-content-membership-cards-activity-preparation/58-CONTEXT.md` — Vollständig gelesen

### Secondary (MEDIUM confidence)

- Grep-Ergebnisse: `release_member_roles` in Repository-Dateien — Join-Pfad verifiziert

### Tertiary (LOW confidence)

- A1–A4 in Assumptions Log (benötigen Code-Verifikation)

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — Projektstandard, direkt aus Codebase gelesen
- Architecture: HIGH — bestehende Muster direkt aus Code extrahiert
- Pitfalls: HIGH (Pitfalls 1, 3, 4, 5) / MEDIUM (Pitfall 2 — abhängig von Tabellen-Schema-Verifikation)
- Backend-Query-Details: MEDIUM — Struktur bekannt, Exakt-Schema der release_member_roles-Tabelle nicht gelesen

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (stabiler Stack)
