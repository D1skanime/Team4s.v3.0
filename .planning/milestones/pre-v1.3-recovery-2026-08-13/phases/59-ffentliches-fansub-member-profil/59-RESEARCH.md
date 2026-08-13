# Phase 59: Öffentliches Fansub-Member-Profil — Research

**Researched:** 2026-05-29
**Domain:** Next.js App Router Server Component, Go Gin Backend, Member-Profil, öffentliche Sichtbarkeit
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Route & URL-Struktur**
- D-01: Route `/members/[slug]`. Slug aus `fansub_name` normalisiert (lowercase, Sonderzeichen entfernt). Bei Konflikten/Mehrdeutigkeit: Fallback auf `member_id`.
- D-02: Nur die Profilseite selbst. Links aus Medien/Beiträgen/Fansub-Listen in Folge-Phase.
- D-03: URL-Parameter `[slug]` — Backend löst zuerst via normalisiertem `fansub_name` auf, dann via numerischem ID-Fallback.

**Sichtbarkeit & Zugangskontrolle**
- D-04: Sichtbarkeitsprüfung im Backend. `GET /api/v1/members/[slug]` gibt je nach Auth-Status unterschiedliche Daten zurück.
- D-05: `profile_visibility = 'public'` → alle Daten sichtbar (anonym + eingeloggt).
- D-06: `profile_visibility = 'members_only'` + anonym → HTTP 200 mit `{"visible": false, "reason": "members_only"}`. Frontend: „Dieses Profil ist nicht öffentlich zugänglich."
- D-07: `profile_visibility = 'members_only'` + eingeloggter Member → vollständige Profildaten.
- D-08: Keycloak-Daten (display_name, E-Mail, keycloak_subject) nicht auf öffentlicher Seite — nur `fansub_name`.

**Dargestellte Inhalte**
- D-09: `fansub_name`, Avatar, `bio`, `member_story_html`, Aktivzeitraum als Jahresangabe, Fansub-Gruppen mit Gruppenrollen, RecentMediaSection, RecentContributionsSection.
- D-10: Fansub-Gruppen-Section: Gruppenlogo, Gruppenname (Link zu `/fansubs/[slug]`), feste Gruppenrollen als Badge-Liste.
- D-11: Gruppenrollen in Gruppen-Section = `release_member_roles` / Gruppenrolle — nicht release-versionsspezifisch.
- D-12: RecentMediaSection und RecentContributionsSection mit `isPublicView={true}`.

**Komponenten-Globalisierung**
- D-13: `MemberProfileHero`, `RecentMediaSection`, `RecentContributionsSection` von `frontend/src/app/me/profile/components/` nach `frontend/src/components/profile/` verschieben.
- D-14: `/me/profile` importiert danach aus `@/components/profile/`. Kein Verhaltensänderung.
- D-15: `/members/[slug]` verwendet dieselben globalisierten Komponenten mit `isPublicView={true}`.
- D-16: `AccountSecurityCard`, `ProfileBasicsForm`, `VisibilityCard`, `MemberAvatarCard`, `ProfileStoryCard` bleiben in `/me/profile/components/`.

**Deutsche UI-Texte**
- D-17: Korrekte Umlaute in allen user-facing Strings. Kein ASCII-Ersatz.

### Claude's Discretion
- Hintergrundbild: Upload via globalem Media-Upload-Tool auf `/me/profile` (neue Card), Anzeige als Hero-Banner auf `/members/[slug]`; Cropper ohne Rundungen (16:9), kein neues npm-Paket.
- Technische Umsetzung der Slug-Normalisierung im Backend.
- CSS-Layout für Hero-Banner auf der öffentlichen Seite.
- Genaue SQL-Query-Struktur für `GetPublicMemberProfile`.

### Deferred Ideas (OUT OF SCOPE)
- Links aus Medien-Uploads, Beiträgen und Fansub-Mitgliederlisten zu `/members/[slug]`.
- SEO-Metadaten (`<title>`, `og:image`).
- Paginierter Contributions-Endpunkt mit Filterung.
- Anzeige aller Beiträge statt nur 3.
</user_constraints>

---

## Summary

Phase 59 baut auf dem in Phase 58 vorbereiteten `isPublicView`-System auf und aktiviert es auf einer neuen öffentlichen Route. Die Hauptarbeit besteht aus drei Strängen: (1) Backend — neuer Endpoint `GET /api/v1/members/:slug` mit Slug-Auflösung und Sichtbarkeitsprüfung, (2) Frontend — neue Server Component `/members/[slug]/page.tsx` nach dem bestehenden `fansubs/[slug]`-Muster, (3) Hintergrundbild-Feature — neue DB-Migration + Upload-Seam analog zum Avatar, neue Card auf `/me/profile`, Banner-Anzeige auf der öffentlichen Seite.

Die Globalisierung der drei Komponenten (`MemberProfileHero`, `RecentMediaSection`, `RecentContributionsSection`) ist ein reiner Refactor ohne Verhaltensänderung — Import-Pfade in `/me/profile/page.tsx` werden aktualisiert, der restliche Code bleibt identisch.

**Kritische Lücke:** Das DB-Schema kennt kein `background_image`-Feld auf der `members`-Tabelle. Phase 59 muss eine Migration hinzufügen. [VERIFIED: Codebase-Audit — `database/migrations/` enthält kein solches Feld]

**Primary recommendation:** Backend-Handler-Pattern aus `app_profile.go` 1:1 übernehmen für den neuen public-Member-Endpoint. Frontend-Pattern aus `fansubs/[slug]/page.tsx` als Server-Component-Basis verwenden.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Slug-Auflösung (fansub_name → member_id) | API / Backend | — | DB-Query-Logik gehört ins Backend; Frontend kennt nur den URL-Parameter |
| Sichtbarkeitsprüfung (public vs. members_only) | API / Backend | — | D-04 locked: Backend entscheidet anhand Auth-Header |
| Auth-Token-Weiterleitung bei eingeloggten Requests | Frontend Server (SSR) | — | Server Component muss Cookie/Token an Backend weiterleiten |
| Öffentliche Profil-Seite rendern | Frontend Server (SSR) | — | Next.js App Router Server Component (wie fansubs/[slug]) |
| Hintergrundbild-Persistenz | API / Backend + Database | — | Media-Asset analog zu Avatar, DB-Spalte auf members |
| Hintergrundbild-Upload | API / Backend | — | Neuer Upload-Endpoint analog zu `POST /me/profile/avatar` |
| Cropper (16:9 kein Rundungen) | Browser / Client | — | Gleiche Cropper-Komponente wie Phase 56, andere Seitenverh.-Config |
| FansubMemberships-Section rendern | Frontend Server (SSR) | — | Daten kommen aus Backend-Response; reines Rendering |
| RecentMedia / RecentContributions | Frontend Server (SSR) | — | isPublicView=true, keine Edit-Aktionen |

---

## Standard Stack

### Core (bereits vorhanden, keine neuen Pakete)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16 (project) | Server Component Route `/members/[slug]` | Projektstandard [VERIFIED: frontend/package.json] |
| Go / Gin | 1.25 / project | Backend Handler `GET /api/v1/members/:slug` | Projektstandard [VERIFIED: backend/go.mod] |
| pgx/v5 | project | SQL-Queries in Repository | Projektstandard [VERIFIED: backend/go.mod] |
| lucide-react | project | `Users`-Icon als Fallback für Gruppenlogo | Projektstandard, bereits für Gruppen-Drawer in Phase 58 [VERIFIED: Codebase] |
| disintegration/imaging | project | Hintergrundbild-Resize/Crop analog zu Avatar | Bereits für Avatar-Upload verwendet [VERIFIED: app_profile.go imports] |

### Kein neues npm-Paket
D-Entscheidung (Claude's Discretion): Kein neues npm-Paket für den Cropper. Die bestehende `CropperModal`-Komponente aus Phase 56 wird mit anderen Dimensions-Props (`aspect={16/9}`, ohne Rundungen) wiederverwendet. [VERIFIED: Codebase — frontend/src/components/ enthält Phase-56-Cropper]

### Package Legitimacy Audit

> Keine neuen externen Pakete in dieser Phase. Audit entfällt.

**Packages removed due to slopcheck [SLOP] verdict:** keine
**Packages flagged as suspicious [SUS]:** keine

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (anonym/eingeloggt)
         │
         │  GET /members/[slug]
         ▼
Next.js Server Component
  /members/[slug]/page.tsx
         │
         │  Cookie/Token aus Request-Header lesen
         │  GET /api/v1/members/:slug   (mit oder ohne Bearer)
         ▼
Go Backend Handler
  GetPublicMemberProfile(c *gin.Context)
         │
         ├── Slug normalisieren (fansub_name lowercase, Sonderzeichen entfernt)
         ├── DB: members WHERE normalized_name = $slug OR (slug numerisch AND id = $slug)
         ├── Sichtbarkeitsprüfung:
         │     profile_visibility='public'         → Profildaten laden
         │     profile_visibility='members_only'
         │       + kein Auth-Header               → {"visible":false,"reason":"members_only"}
         │       + Auth-Header (eingeloggter User) → Profildaten laden
         └── PublicMemberProfile-Modell zurückgeben
                   │
                   ▼
         Frontend rendert:
           public  → MemberProfileHero + MembershipsSection + RecentMedia + Contributions
           hidden  → EmptyState „Dieses Profil ist nicht öffentlich zugänglich."
```

### Recommended Project Structure

```
frontend/src/
├── app/
│   ├── me/profile/
│   │   ├── page.tsx                        (Import-Pfade auf @/components/profile/ aktualisieren)
│   │   └── components/
│   │       ├── AccountSecurityCard.tsx     (bleibt)
│   │       ├── MemberAvatarCard.tsx        (bleibt)
│   │       ├── ProfileBasicsForm.tsx       (bleibt)
│   │       ├── ProfileStoryCard.tsx        (bleibt)
│   │       ├── VisibilityCard.tsx          (bleibt)
│   │       └── ProfileBackgroundCard.tsx   (NEU — Upload-Card für Hintergrundbild)
│   └── members/
│       └── [slug]/
│           └── page.tsx                    (NEU — Server Component, analog fansubs/[slug])
├── components/
│   └── profile/
│       ├── MemberProfileHero.tsx           (VERSCHOBEN von me/profile/components/)
│       ├── RecentMediaSection.tsx          (VERSCHOBEN)
│       ├── RecentContributionsSection.tsx  (VERSCHOBEN)
│       └── MembershipsSection.tsx          (NEU — öffentliche Gruppen-Section)
└── types/
    └── profile.ts                          (PublicMemberProfile Interface hinzufügen)

backend/internal/
├── handlers/
│   └── app_public_profile.go              (NEU — GetPublicMemberProfile Handler)
├── repository/
│   └── member_profile_repository.go       (GetPublicMemberProfile + background upload Methoden)
└── models/
    └── member_profile.go                  (PublicMemberProfileResponse Modell)

database/migrations/
└── 0080_member_profile_background.up.sql  (NEU — background_media_id auf members)

shared/contracts/
└── openapi.yaml                           (GET /api/v1/members/{slug} dokumentieren)
```

### Pattern 1: Server Component für öffentliche Profilroute

Exakt wie `frontend/src/app/fansubs/[slug]/page.tsx` [VERIFIED: Codebase].

```typescript
// Source: frontend/src/app/fansubs/[slug]/page.tsx (Referenz-Pattern)
export default async function MemberProfilePage({ params }: Props) {
  const resolvedParams = await params
  const slug = (resolvedParams.slug || '').trim()

  if (!slug) {
    return <main>...</main>
  }

  let profile: PublicMemberProfileData | null = null
  let isHidden = false

  try {
    const response = await getMemberProfile(slug) // fetch ohne Token für public
    if ('visible' in response && !response.visible) {
      isHidden = true
    } else {
      profile = response.data
    }
  } catch (error) {
    // 404-Behandlung analog fansubs/[slug]
  }

  if (isHidden) {
    return <main>...</main> // „Profil nicht öffentlich"
  }
  // ...
}
```

**Wichtige Abweichung von fansubs/[slug]:** Für `members_only`-Profile muss der Server-Component-Request auch den Auth-Cookie/Bearer des eingeloggten Users mitschicken. Das erfordert `cookies()` aus `next/headers` in der Server Component.

```typescript
// Source: Next.js App Router Dokumentation [ASSUMED — Muster analog zu existierenden auth-seams]
import { cookies } from 'next/headers'

const cookieStore = await cookies()
const token = cookieStore.get('access_token')?.value
const response = await getMemberProfile(slug, token)
```

Die Funktion `getMemberProfile` in `api.ts` muss optional einen Bearer-Token akzeptieren und ihn als `Authorization`-Header weiterleiten.

### Pattern 2: Backend Handler für öffentlichen Member-Endpoint

```go
// Source: backend/internal/handlers/app_profile.go (Referenz-Pattern, VERIFIED: Codebase)
func (h *AppPublicHandler) GetPublicMemberProfile(c *gin.Context) {
    slug := strings.TrimSpace(c.Param("slug"))
    if slug == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "slug fehlt"}})
        return
    }

    // Optional: Auth-Identity aus Context (kein Fehler wenn nicht vorhanden)
    identity, isAuthenticated := middleware.CommentAuthIdentityFromContext(c)

    profile, err := h.profileRepo.GetPublicMemberProfile(c.Request.Context(), slug)
    if err != nil {
        if errors.Is(err, repository.ErrNotFound) {
            c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitglied nicht gefunden"}})
            return
        }
        writeInternalErrorResponse(c, "interner serverfehler", err, "...")
        return
    }

    if profile.ProfileVisibility == models.ProfileVisibilityMembersOnly && !isAuthenticated {
        c.JSON(http.StatusOK, gin.H{"visible": false, "reason": "members_only"})
        return
    }

    // Sensible Felder entfernen (D-08)
    public := toPublicResponse(profile)
    c.JSON(http.StatusOK, gin.H{"data": public})
}
```

### Pattern 3: Slug-Normalisierung (Go)

```go
// [ASSUMED — Standard-Pattern für slug-Normalisierung in Go]
import (
    "regexp"
    "strings"
    "unicode"
    "golang.org/x/text/unicode/norm"
)

var slugNonAlphanumeric = regexp.MustCompile(`[^a-z0-9]+`)

func normalizeMemberSlug(fansubName string) string {
    // 1. Unicode-Normalisierung (NFD) für Umlaute
    s := norm.NFD.String(strings.ToLower(fansubName))
    // 2. Nicht-ASCII entfernen
    b := make([]rune, 0, len(s))
    for _, r := range s {
        if r <= unicode.MaxASCII {
            b = append(b, r)
        }
    }
    // 3. Nicht-alphanumerische Zeichen auf '-' reduzieren
    return strings.Trim(slugNonAlphanumeric.ReplaceAllString(string(b), "-"), "-")
}
```

**Achtung:** `golang.org/x/text` muss im `go.mod` vorhanden sein oder ein einfacheres Normalisierungsverfahren wird gewählt. [ASSUMED — Verfügbarkeit in go.mod nicht verifiziert]

### Pattern 4: Hintergrundbild-Upload

Analog zu Avatar-Upload in `app_profile.go`:
- Neues Feld `background_media_id` auf `members`-Tabelle (Migration 0080)
- Backend-Handler `POST /api/v1/me/profile/background` — multipart, crop, resize auf 16:9 (empfohlen: 1920×1080 oder 1280×720), speichern über `imaging`-Bibliothek
- Neues Feld `background_image` im `MemberProfile`-Model analog zu `Avatar`
- Frontend-Card `ProfileBackgroundCard` mit Phase-56-Cropper (`aspect={16/9}`, `circularCrop={false}`, `borderRadius={0}`)

### Anti-Patterns to Avoid

- **Keycloak-Daten auf öffentlicher Seite:** `display_name`, `email`, `keycloak_subject` dürfen nicht im `PublicMemberProfileResponse` enthalten sein (D-08). Das `toPublicResponse()`-Mapping muss diese Felder explizit weglassen.
- **Client Component für öffentliche Seite:** `/members/[slug]/page.tsx` soll Server Component sein (kein `'use client'`), wie `fansubs/[slug]/page.tsx` — dann kein Hydration-Overhead und Token-Handling über `cookies()` serverseitig.
- **Sichtbarkeitsprüfung im Frontend:** Die Prüfung gehört ausschließlich ins Backend (D-04). Frontend zeigt nur was das Backend zurückgibt.
- **Einzelnes großes Model:** `PublicMemberProfileResponse` darf nicht einfach `MemberProfile` wiederverwenden — es ist ein separates, abgeleitetes Modell ohne sensible Felder.
- **CSS-Module aus me/profile/** Die verschobenen Komponenten dürfen kein `../page.module.css` mehr importieren — sie bekommen eigene CSS-Module oder Props.

---

## Don't Hand-Roll

| Problem | Nicht bauen | Stattdessen | Warum |
|---------|-------------|-------------|-------|
| 16:9-Cropper ohne Rundungen | Eigenes Cropping | Phase-56-`CropperModal` mit `aspect={16/9}`, `circularCrop={false}` | Bereits vorhanden, getestet, gleiche Upload-Seam |
| Avatar-ähnlicher Upload | Neuer Upload-Service | Pattern aus `UploadOwnProfileAvatar` in `app_profile.go` | Gleiche Schritte: MIME-Check, Resize, DB-Transaktion |
| Slug-Lookup | Eigene Hash-Map | SQL `WHERE LOWER(REGEXP_REPLACE(m.nickname, '[^a-z0-9]', '', 'gi')) = $slug OR (slug_is_numeric AND m.id = $slug_as_int)` | Einfach, kein separates Slug-Feld nötig |

---

## Common Pitfalls

### Pitfall 1: CSS-Modul-Import nach Komponenten-Verschiebung
**Was geht schief:** `MemberProfileHero.tsx` importiert derzeit `../page.module.css`. Nach der Verschiebung nach `frontend/src/components/profile/` zeigt der relative Pfad ins Leere.
**Warum:** Relative CSS-Modul-Imports sind pfadgebunden.
**Vorbeugung:** Bei der Verschiebung CSS-Modul-Import anpassen — entweder eigenes `profile.module.css` in `components/profile/` anlegen oder Styles als Props übergeben.
**Warnsignal:** TypeScript-Compiler-Fehler `Cannot find module '../page.module.css'`.

### Pitfall 2: Token-Weiterleitung in Server Component fehlt
**Was geht schief:** Eingeloggte User sehen `members_only`-Profile als „nicht öffentlich", weil der Server-Component-Fetch kein Auth-Token mitschickt.
**Warum:** Server Components in Next.js haben keinen automatischen Cookie-Forwarding-Mechanismus für ausgehende `fetch`-Calls.
**Vorbeugung:** `cookies()` aus `next/headers` in der Server Component lesen, Token extrahieren und als `Authorization: Bearer ...` an das Backend weitergeben. [CITED: docs/frontend/auth-api-client.md — „token-free UI boundary, authorizedFetch vs. unauthenticated fetch"]
**Warnsignal:** Eingeloggter User sieht `members_only`-Hinweis, obwohl er angemeldet ist.

### Pitfall 3: `members_only`-Response nicht als separaten Zweig behandeln
**Was geht schief:** Der Frontend-Fetch-Helper wirft einen Fehler auf HTTP 404 — aber Backend gibt bei `members_only` HTTP 200 zurück. Wenn der Helper generisch alle Non-200 als Fehler wirft, entsteht kein Problem; aber das `{"visible": false}`-Objekt muss explizit als eigener Typ erkannt werden.
**Vorbeugung:** `getMemberProfile` gibt eine Union zurück: `{ data: PublicMemberProfileData } | { visible: false; reason: string }`. Type Guard im Frontend.

### Pitfall 4: Slug-Kollisionen bei gleichem normalisierten fansub_name
**Was geht schief:** Zwei Member mit `fansub_name = "Hans"` und `fansub_name = "häns"` normalisieren zu demselben Slug.
**Warum:** Normalisierung entfernt Umlaute/Sonderzeichen.
**Vorbeugung:** Backend-Query gibt beim Slug-Lookup mehrere Treffer zurück → Fallback auf numerische ID-Auflösung. D-03 locked: Wenn Slug vollständig numerisch → `id`-Lookup.

### Pitfall 5: Hintergrundbild-Upload ohne DB-Migration
**Was geht schief:** Upload-Handler referenziert `background_media_id`-Spalte, die noch nicht in der DB existiert.
**Vorbeugung:** Migration 0080 muss als allererster Schritt in Wave 0 erstellt und applied werden, bevor Backend-Handler oder Frontend implementiert werden.

---

## Code Examples

### Bestehender Avatar-Upload-Seam (Referenz für Hintergrundbild)
```go
// Source: backend/internal/handlers/app_profile.go (VERIFIED: Codebase)
// Pattern: MIME-Check → Resize via imaging → DB-Transaktion → PublicURL bauen
// Exakt dasselbe Pattern für background_image, nur andere Dimensionen (16:9)
```

### Öffentliche Server Component (Referenz)
```typescript
// Source: frontend/src/app/fansubs/[slug]/page.tsx (VERIFIED: Codebase)
export default async function FansubProfilePage({ params }: FansubProfilePageProps) {
  const resolvedParams = await params
  const slug = (resolvedParams.slug || '').trim()
  // try/catch + ApiError instanceof check + 404 handling
  // → gleiche Struktur für /members/[slug]/page.tsx
}
```

### PublicMemberProfile-Typ (neu in profile.ts)
```typescript
// Abgeleitet von MemberProfileData, ohne sensible Felder (D-08)
export interface PublicMemberProfileData {
  member_id: number
  fansub_name: string
  bio?: string | null
  member_story_html?: string | null
  active_from_date?: string | null
  active_until_date?: string | null
  is_currently_active: boolean
  profile_visibility: ProfileVisibility
  avatar?: { /* gleiche Avatar-Struktur */ } | null
  background_image?: { public_url: string } | null  // Phase 59 neu
  memberships: MemberProfileMembership[]  // für öffentliche Gruppen-Section
  recent_media: MemberProfileRecentMedia[]
  recent_contributions: MemberProfileRecentContribution[]
}

export type PublicMemberProfileResponse =
  | { data: PublicMemberProfileData }
  | { visible: false; reason: string }
```

---

## State of the Art

| Bereich | Bisheriger Stand | Phase-59-Stand |
|---------|-----------------|----------------|
| Profil-Komponenten | In `me/profile/components/` — lokal | Nach `components/profile/` globalisiert — wiederverwendbar |
| Öffentliche Profil-URL | Nicht existent | `/members/[slug]` als Server Component |
| Hintergrundbild | Nicht vorhanden | DB-Spalte + Upload-Endpoint + Hero-Banner |
| `isPublicView`-Props | Eingebaut (Phase 58), aber nur auf `/me/profile` genutzt | Auf `/members/[slug]` aktiviert |

---

## Project Constraints (from CLAUDE.md)

| Direktive | Konsequenz für Phase 59 |
|-----------|------------------------|
| Brownfield — bestehenden Code verbessern, nicht ersetzen | Keine neue Handler-Infrastruktur; neuer Handler in eigenem File `app_public_profile.go`, eingehängt in `main.go` |
| Modularity: ≤ 450 Zeilen pro Produktionsdatei | `members/[slug]/page.tsx` und `app_public_profile.go` müssen schmal bleiben; Sektion-Komponenten auslagern |
| Umlaute: Korrekte Umlaute in user-facing Strings | „Dieses Profil ist nicht öffentlich zugänglich." — kein ae/oe/ue |
| Data ownership: Manual edits bleiben autoritativ | Hintergrundbild-Upload überschreibt kein anderes Feld |
| Observability: Fehler sofort im UI sichtbar | Upload-Fehler + Lade-Fehler als sichtbare UI-States |
| Contracts: OpenAPI-Contract aktualisieren | `shared/contracts/openapi.yaml` um `GET /api/v1/members/{slug}` + Response-Schemas erweitern |

---

## Assumptions Log

| # | Claim | Section | Risiko bei Irrtum |
|---|-------|---------|-------------------|
| A1 | `golang.org/x/text`-Paket für Unicode-Slug-Normalisierung ist im go.mod verfügbar | Architecture Patterns — Slug-Normalisierung | Go-Kompilierung schlägt fehl; Fallback: einfacheres regexp-basiertes Normalisierungsverfahren ohne Unicode-Bibliothek |
| A2 | Phase-56-Cropper-Komponente akzeptiert `aspect` und `circularCrop` Props für 16:9 ohne Rundungen | Standard Stack / Don't Hand-Roll | Muss Cropper-Komponentendefinition verifizieren; ggf. Props hinzufügen |
| A3 | Token-Forwarding via `cookies()` aus `next/headers` in Server Component ist der richtige Weg für Auth an Backend | Architecture Patterns | Eingeloggte `members_only`-Profile werden fälschlicherweise als gesperrt angezeigt |

---

## Open Questions

1. **Slug-Normalisierung: Ist `golang.org/x/text` verfügbar?**
   - Was wir wissen: `go.mod` enthält `pgx/v5`, `gin`, `imaging`, `uuid` — alles Direktdependencies.
   - Was unklar: Ob `golang.org/x/text` als transitive Dependency bereits vorhanden ist.
   - Empfehlung: Beim Plan prüfen (`grep "golang.org/x/text" backend/go.sum`). Falls nicht: einfaches regexp-Normalisierungsverfahren ohne Unicode-Deps.

2. **Hintergrundbild-Dimensionen und Speicherstrategie**
   - Was wir wissen: Avatar nutzt `imaging`-Bibliothek, speichert unter `publicBaseURL + /media/...`.
   - Was unklar: Maximale Bildgröße, ob ein Thumbnail erzeugt wird.
   - Empfehlung: 1920×1080 als max. Output-Größe (16:9), kein separates Thumbnail nötig für Banner.

3. **Phase-56-Cropper-Props für Nicht-rund-Modus**
   - Was wir wissen: Cropper wurde in Phase 56 eingeführt, wird für Avatar (rund) verwendet.
   - Was unklar: Genaue API der Cropper-Komponente.
   - Empfehlung: `frontend/src/components/` nach Cropper-Komponente suchen und Props prüfen.

---

## Environment Availability

> Keine neuen externen Tools erforderlich. Alle Services laufen im Docker Compose Stack (Postgres 16, Go, Next.js). Kein neues npm-Paket.

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
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-04/D-06 | `members_only` + anonym → `{visible: false}` | unit (Backend) | `go test ./internal/handlers/... -run TestPublicMemberProfile` | ❌ Wave 0 |
| D-05/D-07 | `public` → vollständige Daten; `members_only` + auth → vollständige Daten | unit (Backend) | `go test ./internal/handlers/... -run TestPublicMemberProfile` | ❌ Wave 0 |
| D-08 | Keine Keycloak-Daten in Response | unit (Backend) | `go test ./internal/models/... -run TestPublicResponse` | ❌ Wave 0 |
| D-13/D-14 | Import-Pfade in me/profile nach Globalisierung korrekt | Build-Check | `npm run build --prefix frontend` | automatisch |
| D-15 | `/members/[slug]` rendert mit `isPublicView={true}` | Smoke | Manuelle Browser-Verifikation | — |

### Wave 0 Gaps
- [ ] `backend/internal/handlers/app_public_profile_test.go` — Sichtbarkeits-Tests
- [ ] `backend/internal/repository/member_profile_repository_public_test.go` — Slug-Auflösungs-Tests

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | ja (members_only) | Middleware `CommentAuthIdentityFromContext` — gleiche wie /me/profile |
| V4 Access Control | ja | Backend-seitige Sichtbarkeitsprüfung, kein Frontend-Gate |
| V5 Input Validation | ja | Slug-Parameter: Längen-/Zeichen-Validierung, kein SQL-Injection möglich via parametrisierte Query |
| V6 Cryptography | nein | Keine kryptographischen Operationen |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Sensible Daten leak (display_name, email) | Information Disclosure | `toPublicResponse()`-Mapping schließt Keycloak-Felder explizit aus (D-08) |
| Slug-Enumeration (numerische IDs raten) | Information Disclosure | HTTP 404 bei nicht gefundenem Profil; kein Unterschied zwischen „nicht vorhanden" und „gesperrt" |
| Path Traversal im Hintergrundbild-Upload | Tampering | Gleiche MIME-Check + UUID-Dateipfad-Generierung wie Avatar-Upload |
| Unauthenticated Zugriff auf members_only | Elevation of Privilege | Sichtbarkeitsprüfung im Backend vor Daten-Serialisierung |

---

## Sources

### Primary (HIGH confidence)
- `backend/internal/handlers/app_profile.go` — Pattern für Handler, Auth-Middleware-Integration (VERIFIED: Codebase)
- `backend/internal/repository/member_profile_repository.go` — Repository-Pattern, SQL-Struktur (VERIFIED: Codebase)
- `backend/internal/models/member_profile.go` — Datenmodell, ProfileVisibility-Konstanten (VERIFIED: Codebase)
- `frontend/src/app/fansubs/[slug]/page.tsx` — Server Component Pattern für öffentliche Seite (VERIFIED: Codebase)
- `frontend/src/app/me/profile/page.tsx` — Profil-Layout, Komponenten-Integration (VERIFIED: Codebase)
- `frontend/src/app/me/profile/components/MemberProfileHero.tsx` — Zu globalisierender Hero (VERIFIED: Codebase)
- `frontend/src/app/me/profile/components/RecentMediaSection.tsx` — isPublicView-Prop vorhanden (VERIFIED: Codebase)
- `frontend/src/app/me/profile/components/RecentContributionsSection.tsx` — isPublicView-Prop vorhanden (VERIFIED: Codebase)
- `frontend/src/types/profile.ts` — Typ-Definitionen, ProfileVisibility (VERIFIED: Codebase)
- `database/migrations/0077_member_profiles_mvp.up.sql` — Kein background_image-Feld → Migration nötig (VERIFIED: Codebase)
- `backend/cmd/server/main.go` — Route-Registrierung Pattern (VERIFIED: Codebase)

### Secondary (MEDIUM confidence)
- Next.js App Router `cookies()` aus `next/headers` für Server-side Token-Forwarding [ASSUMED — Standard-Pattern]

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — alles bestehende Projektdependencies, keine neuen Pakete
- Architecture: HIGH — Patterns direkt aus verifiziertem Codebase abgeleitet
- Pitfalls: HIGH — aus konkretem Codebase-Audit (CSS-Modul-Pfade, Token-Forwarding-Muster)
- Hintergrundbild-Impl-Details: MEDIUM — Analog-Pattern bestätigt, Dimensionen/Thumbnail-Strategie offen

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (stabile Abhängigkeiten — 30 Tage)
