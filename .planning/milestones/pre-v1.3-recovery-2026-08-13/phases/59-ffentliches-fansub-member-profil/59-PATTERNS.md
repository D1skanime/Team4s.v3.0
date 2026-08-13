# Phase 59: Öffentliches Fansub-Member-Profil - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 11 neue/geänderte Dateien
**Analogs found:** 10 / 11

---

## File Classification

| Neue/Geänderte Datei | Role | Data Flow | Closest Analog | Match Quality |
|----------------------|------|-----------|----------------|---------------|
| `frontend/src/app/members/[slug]/page.tsx` | component (Server Route) | request-response | `frontend/src/app/fansubs/[slug]/page.tsx` | exact |
| `frontend/src/components/profile/MemberProfileHero.tsx` | component | request-response | `frontend/src/app/me/profile/components/MemberProfileHero.tsx` | exact (Verschiebung) |
| `frontend/src/components/profile/RecentMediaSection.tsx` | component | request-response | `frontend/src/app/me/profile/components/RecentMediaSection.tsx` | exact (Verschiebung) |
| `frontend/src/components/profile/RecentContributionsSection.tsx` | component | request-response | `frontend/src/app/me/profile/components/RecentContributionsSection.tsx` | exact (Verschiebung) |
| `frontend/src/components/profile/MembershipsSection.tsx` | component | request-response | `frontend/src/app/fansubs/[slug]/page.tsx` (Gruppen-Section) | role-match |
| `frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx` | component | file-I/O | `frontend/src/app/me/profile/components/MemberAvatarCard.tsx` | role-match |
| `frontend/src/app/me/profile/page.tsx` | component | request-response | sich selbst (Import-Pfade aktualisieren) | exact |
| `frontend/src/types/profile.ts` | model | — | sich selbst (Interface erweitern) | exact |
| `frontend/src/lib/api.ts` | utility | request-response | `getOwnProfile` / `getFansubBySlug` in sich selbst | exact |
| `backend/internal/handlers/app_public_profile.go` | controller | request-response | `backend/internal/handlers/app_profile.go` | exact |
| `backend/internal/repository/member_profile_repository.go` | service | CRUD | sich selbst (`GetOwnProfile`-Methode) | exact |
| `backend/internal/models/member_profile.go` | model | — | sich selbst (neues PublicMemberProfileResponse) | exact |
| `database/migrations/0080_member_profile_background.up.sql` | migration | — | `database/migrations/0077_member_profiles_mvp.up.sql` | role-match |
| `shared/contracts/openapi.yaml` | config | — | bestehende Endpoints im selben File | role-match |

---

## Pattern Assignments

### `frontend/src/app/members/[slug]/page.tsx` (Server Component, request-response)

**Analog:** `frontend/src/app/fansubs/[slug]/page.tsx`

**Imports pattern** (Zeilen 1–8):
```typescript
import Link from 'next/link'
import { cookies } from 'next/headers'

import { ApiError, getMemberProfile } from '@/lib/api'
import type { PublicMemberProfileData } from '@/types/profile'
import { MemberProfileHero } from '@/components/profile/MemberProfileHero'
import { MembershipsSection } from '@/components/profile/MembershipsSection'
import { RecentMediaSection } from '@/components/profile/RecentMediaSection'
import { RecentContributionsSection } from '@/components/profile/RecentContributionsSection'

import styles from './page.module.css'
```

**Props-Interface pattern** (Zeilen 10–18, analog `fansubs/[slug]/page.tsx` Zeilen 10–18):
```typescript
interface MemberProfilePageProps {
  params:
    | { slug: string }
    | Promise<{ slug: string }>
}
```

**Core Server Component pattern** (Zeilen 40–103, `fansubs/[slug]/page.tsx` komplett):
```typescript
export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const resolvedParams = await params
  const slug = (resolvedParams.slug || '').trim()

  if (!slug) {
    return (
      <main className={styles.page}>
        <div className={styles.errorBox}>Ungültiger Member-Slug.</div>
      </main>
    )
  }

  // Token für members_only-Profile: cookies() aus next/headers
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  let profile: PublicMemberProfileData | null = null
  let isHidden = false
  let message: string | null = null

  try {
    const response = await getMemberProfile(slug, token)
    if ('visible' in response && !response.visible) {
      isHidden = true
    } else if ('data' in response) {
      profile = response.data
    }
  } catch (error) {
    message =
      error instanceof ApiError && error.status === 404
        ? 'Mitglied nicht gefunden.'
        : 'Profil konnte nicht geladen werden.'
  }

  if (isHidden) {
    return (
      <main className={styles.page}>
        <div className={styles.errorBox}>Dieses Profil ist nicht öffentlich zugänglich.</div>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className={styles.page}>
        <div className={styles.errorBox}>{message || 'Profil konnte nicht geladen werden.'}</div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <MemberProfileHero profile={profile} isPublicView={true} />
      <MembershipsSection memberships={profile.memberships} />
      <RecentMediaSection items={profile.recent_media ?? []} canView={true} isPublicView={true} />
      <RecentContributionsSection items={profile.recent_contributions ?? []} canView={true} isPublicView={true} />
    </main>
  )
}
```

**Wichtige Abweichung zu `fansubs/[slug]/page.tsx`:** Token-Forwarding über `cookies()` aus `next/headers` — `fansubs/[slug]/page.tsx` benötigt das nicht, weil Fansubs immer öffentlich sind. Bei `members/[slug]` ist es für `members_only`-Sichtbarkeit nötig.

---

### `frontend/src/components/profile/MemberProfileHero.tsx` (Verschiebung + Erweiterung)

**Analog:** `frontend/src/app/me/profile/components/MemberProfileHero.tsx`

**Kritische Änderung beim Verschieben** (aktuell Zeile 7):
```typescript
// VORHER (kaputt nach Verschiebung):
import styles from '../page.module.css'

// NACHHER (eigenes CSS-Modul in components/profile/):
import styles from './profile.module.css'
```

**Imports pattern** (Zeilen 1–6 des Originals):
```typescript
import Image from 'next/image'
import { Eye, Save } from 'lucide-react'

import { Button, PageHeader } from '@/components/ui'
import type { MemberProfileData } from '@/types/profile'
```

**isPublicView-Erweiterung** — neuer `isPublicView`-Prop. Im Public-Modus: kein Save-Button, kein „Öffentliches Profil ansehen"-Button, optional Hintergrundbanner:
```typescript
type MemberProfileHeroProps = {
  profile: MemberProfileData | PublicMemberProfileData
  avatarURL: string
  isPublicView?: boolean
  // Nur für /me/profile relevant:
  isSaving?: boolean
  canSave?: boolean
}
```

---

### `frontend/src/components/profile/RecentMediaSection.tsx` (Verschiebung)

**Analog:** `frontend/src/app/me/profile/components/RecentMediaSection.tsx`

**Einzige Änderung beim Verschieben** (aktuell Zeile 5):
```typescript
// VORHER:
import styles from '../page.module.css'

// NACHHER:
import styles from './profile.module.css'
```

Alle anderen Imports und Logik bleiben identisch. `isPublicView`-Prop ist bereits eingebaut (Zeile 9 des Originals).

---

### `frontend/src/components/profile/RecentContributionsSection.tsx` (Verschiebung)

Exakt gleiches Muster wie `RecentMediaSection.tsx` — nur CSS-Modul-Import anpassen.

---

### `frontend/src/components/profile/MembershipsSection.tsx` (neu)

**Analog:** Gruppen-Darstellung in `frontend/src/app/fansubs/[slug]/page.tsx` (Hero-Section), Badge-Muster aus `frontend/src/components/ui/`

**Imports pattern:**
```typescript
import Link from 'next/link'
import { Users } from 'lucide-react'

import { Badge, Card, EmptyState, SectionHeader } from '@/components/ui'
import type { MemberProfileMembership } from '@/types/profile'

import styles from './profile.module.css'
```

**Core pattern** — Gruppenlogo (Fallback `Users`-Icon), Gruppenname als Link zu `/fansubs/[slug]`, Rollen als Badge-Liste:
```typescript
type MembershipsSectionProps = {
  memberships: MemberProfileMembership[]
}

export function MembershipsSection({ memberships }: MembershipsSectionProps) {
  if (!memberships || memberships.length === 0) {
    return <EmptyState title="Keine Fansub-Gruppen eingetragen." />
  }

  return (
    <section>
      <SectionHeader title="Fansub-Gruppen" />
      <ul className={styles.membershipsList}>
        {memberships.map((m) => (
          <li key={m.fansub_group_id}>
            <Card variant="nested">
              <Link href={`/fansubs/${m.fansub_group_slug}`}>
                {/* Gruppenlogo oder Users-Icon Fallback */}
                <Users size={24} aria-hidden="true" />
                <span>{m.fansub_group_name}</span>
              </Link>
              {m.app_member_roles && m.app_member_roles.length > 0 && (
                <div>
                  {m.app_member_roles.map((role) => (
                    <Badge key={role}>{role}</Badge>
                  ))}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

---

### `frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx` (neu)

**Analog:** `frontend/src/app/me/profile/components/MemberAvatarCard.tsx` (Upload-Card-Muster)

**Imports pattern** — analog Avatar-Card:
```typescript
import { useState } from 'react'
import { ImageIcon } from 'lucide-react'

import { Button, ErrorState } from '@/components/ui'
import { ApiError, uploadOwnProfileBackground } from '@/lib/api'
import { CropperModal } from '@/components/CropperModal'  // Phase-56-Cropper
import type { MemberProfileData } from '@/types/profile'

import styles from '../page.module.css'
```

**Core pattern** — 16:9 Cropper ohne Rundungen (Abweichung vom Avatar-Muster: `aspect={16/9}`, `circularCrop={false}`):
```typescript
// Analog zu MemberAvatarCard: isUploading-State, onBackgroundSelected-Callback
// Cropper-Props: aspect={16/9}, circularCrop={false}, borderRadius={0}
```

---

### `frontend/src/app/me/profile/page.tsx` (Import-Pfade aktualisieren)

**Analog:** sich selbst — nur drei Import-Zeilen ändern sich (Zeilen 12–17):

```typescript
// VORHER:
import { MemberProfileHero } from './components/MemberProfileHero'
import { RecentContributionsSection } from './components/RecentContributionsSection'
import { RecentMediaSection } from './components/RecentMediaSection'

// NACHHER:
import { MemberProfileHero } from '@/components/profile/MemberProfileHero'
import { RecentContributionsSection } from '@/components/profile/RecentContributionsSection'
import { RecentMediaSection } from '@/components/profile/RecentMediaSection'
```

Kein Verhaltens-Änderung. Alle anderen Zeilen bleiben identisch.

---

### `frontend/src/types/profile.ts` (Interface erweitern)

**Analog:** `MemberProfileData` in sich selbst (Zeilen 49–90), `MemberProfileMembership` (Zeilen 13–23)

**Neues Interface** — ohne Keycloak-Felder (D-08):
```typescript
export interface PublicMemberProfileData {
  member_id: number
  fansub_name: string
  bio?: string | null
  member_story_html?: string | null
  active_from_date?: string | null
  active_until_date?: string | null
  is_currently_active: boolean
  profile_visibility: ProfileVisibility
  avatar?: {
    public_url: string
    source_original_url?: string | null
  } | null
  background_image?: { public_url: string } | null  // Phase 59 neu
  memberships: MemberProfileMembership[]
  recent_media: MemberProfileRecentMedia[]
  recent_contributions: MemberProfileRecentContribution[]
}

export type PublicMemberProfileResponse =
  | { data: PublicMemberProfileData }
  | { visible: false; reason: string }
```

---

### `frontend/src/lib/api.ts` (neuer Helper)

**Analog:** `getOwnProfile` (Zeilen 2611–2635) und `getFansubBySlug` (Zeilen 1475–1501)

**Pattern `getOwnProfile`** (Zeilen 2611–2635) — optional authToken, cache: "no-store":
```typescript
export async function getOwnProfile(
  authToken?: string,
): Promise<MemberProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/me/profile`, {
    cache: "no-store",
    authToken,
  });
  // error handling via parseApiErrorPayload + throw new ApiError(...)
  return response.json() as Promise<MemberProfileResponse>;
}
```

**Neuer `getMemberProfile`-Helper** — gibt Union zurück (sichtbar vs. versteckt):
```typescript
export async function getMemberProfile(
  slug: string,
  authToken?: string,
): Promise<PublicMemberProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedSlug = encodeURIComponent(slug);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/members/${encodedSlug}`,
    {
      cache: "no-store",
      authToken,
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }

  return response.json() as Promise<PublicMemberProfileResponse>;
}
```

**Typ-Import** am Anfang der Datei bei profile-Imports ergänzen:
```typescript
import {
  MemberProfileResponse,
  PublicMemberProfileResponse,
  UpdateMemberProfileRequest,
} from "@/types/profile";
```

---

### `backend/internal/handlers/app_public_profile.go` (neu)

**Analog:** `backend/internal/handlers/app_profile.go` (Zeilen 1–79) — `GetOwnProfile`-Handler-Muster

**Imports pattern** (analog `app_profile.go` Zeilen 3–25):
```go
package handlers

import (
    "errors"
    "net/http"
    "strings"

    "team4s.v3/backend/internal/middleware"
    "team4s.v3/backend/internal/models"
    "team4s.v3/backend/internal/repository"

    "github.com/gin-gonic/gin"
)
```

**Handler-Struct pattern** — eigener schlanker Handler-Typ (kein Misch-Handler):
```go
type publicMemberProfileStore interface {
    GetPublicMemberProfile(ctx context.Context, slug string) (*models.PublicMemberProfile, error)
}

type AppPublicProfileHandler struct {
    profileRepo publicMemberProfileStore
}

func NewAppPublicProfileHandler(profileRepo publicMemberProfileStore) *AppPublicProfileHandler {
    return &AppPublicProfileHandler{profileRepo: profileRepo}
}
```

**Core Handler pattern** (analog `GetOwnProfile`, `app_profile.go` Zeilen 56–79):
```go
func (h *AppPublicProfileHandler) GetPublicMemberProfile(c *gin.Context) {
    slug := strings.TrimSpace(c.Param("slug"))
    if slug == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "slug fehlt"}})
        return
    }

    // Optional-Auth: kein Fehler wenn nicht angemeldet
    _, isAuthenticated := middleware.CommentAuthIdentityFromContext(c)

    profile, err := h.profileRepo.GetPublicMemberProfile(c.Request.Context(), slug)
    if err != nil {
        if errors.Is(err, repository.ErrNotFound) {
            c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitglied nicht gefunden"}})
            return
        }
        writeInternalErrorResponse(c, "interner serverfehler", err, "Profil konnte nicht geladen werden.")
        return
    }

    if profile.ProfileVisibility == models.ProfileVisibilityMembersOnly && !isAuthenticated {
        c.JSON(http.StatusOK, gin.H{"visible": false, "reason": "members_only"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"data": toPublicMemberProfileResponse(profile)})
}
```

**Route-Registrierung** in `backend/cmd/server/main.go` (analog zu Zeile 254):
```go
// In main.go nach bestehenden /me/profile-Routen (Zeile 254):
publicProfileHandler := handlers.NewAppPublicProfileHandler(memberProfileRepo)
v1.GET("/members/:slug", authOptionalMiddleware, publicProfileHandler.GetPublicMemberProfile)
```

---

### `backend/internal/repository/member_profile_repository.go` (erweitern)

**Analog:** `GetOwnProfile`-Methode in sich selbst (Zeilen 30–58)

**Neue Methode pattern** — analog `GetOwnProfile`, aber slug-basierter Lookup:
```go
func (r *MemberProfileRepository) GetPublicMemberProfile(ctx context.Context, slug string) (*models.PublicMemberProfile, error) {
    if strings.TrimSpace(slug) == "" {
        return nil, ErrNotFound
    }
    // 1. Slug normalisieren (lowercase, Sonderzeichen entfernen)
    // 2. DB: SELECT WHERE LOWER(REGEXP_REPLACE(m.nickname, '[^a-z0-9]', '', 'gi')) = $1
    //         OR (slug_is_numeric AND m.id = $1::int)
    // 3. Memberships, RecentMedia, RecentContributions laden
    // analog zu GetOwnProfile Zeilen 40–57
}
```

---

### `backend/internal/models/member_profile.go` (erweitern)

**Analog:** Bestehende `MemberProfile`-Struct in sich selbst

**Neues Modell** — ohne Keycloak-Felder, ohne `app_user_id`:
```go
type PublicMemberProfile struct {
    MemberID          int64                  `json:"member_id"`
    FansubName        string                 `json:"fansub_name"`
    Bio               *string                `json:"bio,omitempty"`
    MemberStoryHTML   *string                `json:"member_story_html,omitempty"`
    ActiveFromDate    *string                `json:"active_from_date,omitempty"`
    ActiveUntilDate   *string                `json:"active_until_date,omitempty"`
    IsCurrentlyActive bool                   `json:"is_currently_active"`
    ProfileVisibility string                 `json:"profile_visibility"`
    Avatar            *MemberProfileAvatar   `json:"avatar,omitempty"`
    BackgroundImage   *MemberProfileBgImage  `json:"background_image,omitempty"`
    Memberships       []MemberProfileMembership `json:"memberships"`
    RecentMedia       []MemberProfileRecentMedia `json:"recent_media"`
    RecentContributions []MemberProfileRecentContribution `json:"recent_contributions"`
}

type MemberProfileBgImage struct {
    PublicURL string `json:"public_url"`
}
```

---

### `database/migrations/0080_member_profile_background.up.sql` (neu)

**Analog:** `database/migrations/0077_member_profiles_mvp.up.sql` — `ALTER TABLE`-Muster

```sql
-- Hintergrundbild für Member-Profil (Phase 59)
ALTER TABLE members ADD COLUMN IF NOT EXISTS background_media_id UUID REFERENCES media(id) ON DELETE SET NULL;
```

---

## Shared Patterns

### Optional-Auth in Go-Handlers
**Source:** `backend/cmd/server/main.go` Zeile 145 (`authOptionalMiddleware`)
**Apply to:** `app_public_profile.go`
```go
// Route: authOptionalMiddleware statt authMiddleware
v1.GET("/members/:slug", authOptionalMiddleware, publicProfileHandler.GetPublicMemberProfile)

// Im Handler: optional auslesen (kein Fehler wenn absent)
_, isAuthenticated := middleware.CommentAuthIdentityFromContext(c)
```

### Error Handling in Go-Handlers
**Source:** `backend/internal/handlers/app_profile.go` Zeilen 68–75
**Apply to:** `app_public_profile.go`
```go
if errors.Is(err, repository.ErrNotFound) {
    c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitglied nicht gefunden"}})
    return
}
writeInternalErrorResponse(c, "interner serverfehler", err, "...")
```

### ApiError-Handling im Frontend
**Source:** `frontend/src/lib/api.ts` Zeilen 1487–1499 (`getFansubBySlug`)
**Apply to:** `getMemberProfile` in `api.ts`
```typescript
if (!response.ok) {
  const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
  throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
}
```

### CSS-Modul-Import nach Komponenten-Verschiebung
**Source:** Pitfall aus RESEARCH.md
**Apply to:** `MemberProfileHero.tsx`, `RecentMediaSection.tsx`, `RecentContributionsSection.tsx`

Jede verschobene Komponente hat aktuell `import styles from '../page.module.css'`. Nach Verschiebung nach `frontend/src/components/profile/` muss das zu `import styles from './profile.module.css'` geändert werden. Eine neue `profile.module.css` in `frontend/src/components/profile/` anlegen.

---

## No Analog Found

| Datei | Role | Data Flow | Grund |
|-------|------|-----------|-------|
| `frontend/src/components/profile/profile.module.css` | config | — | Kein globales CSS-Modul für Profile-Komponenten existiert bisher — neu anlegen mit benötigten Klassen aus `me/profile/page.module.css` |

---

## Metadata

**Analog search scope:** `frontend/src/app/`, `frontend/src/components/`, `frontend/src/lib/`, `frontend/src/types/`, `backend/internal/handlers/`, `backend/internal/repository/`, `backend/cmd/server/`
**Files scanned:** 12
**Pattern extraction date:** 2026-05-29
