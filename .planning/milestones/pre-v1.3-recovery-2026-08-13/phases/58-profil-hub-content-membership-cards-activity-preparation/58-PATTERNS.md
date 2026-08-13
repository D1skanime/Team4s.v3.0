# Phase 58: Profil-Hub Content, Membership Cards & Activity Preparation – Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 9 neue/geänderte Dateien
**Analogs found:** 9 / 9

---

## File Classification

| Neue/geänderte Datei | Rolle | Data Flow | Nächster Analog | Match-Qualität |
|----------------------|-------|-----------|-----------------|----------------|
| `frontend/src/app/me/profile/components/RecentMediaSection.tsx` | component | request-response (read-only) | `frontend/src/app/me/profile/components/MembershipsSection.tsx` | exact |
| `frontend/src/app/me/profile/components/RecentContributionsSection.tsx` | component | request-response (read-only) | `frontend/src/app/me/profile/components/ContributionsSection.tsx` | exact |
| `frontend/src/app/me/profile/page.tsx` | route/view | request-response | sich selbst (Anpassung) | exact |
| `frontend/src/app/me/profile/components/MembershipsSection.tsx` | component | — | — | wird gelöscht |
| `frontend/src/app/me/profile/components/ContributionsSection.tsx` | component | — | — | wird ersetzt |
| `frontend/src/components/layout/AppShell.tsx` | layout/shell | event-driven (Drawer) | sich selbst (Erweiterung) | exact |
| `frontend/src/components/layout/AppShellClientWrapper.tsx` | provider | request-response | sich selbst (Erweiterung) | exact |
| `backend/internal/repository/member_profile_repository.go` | repository | CRUD (read) | sich selbst (Erweiterung) | exact |
| `backend/internal/models/member_profile.go` | model | — | sich selbst (Erweiterung) | exact |
| `frontend/src/types/profile.ts` | type/DTO | — | sich selbst (Erweiterung) | exact |

---

## Pattern Assignments

### `frontend/src/app/me/profile/components/RecentMediaSection.tsx` (component, read-only)

**Analog:** `frontend/src/app/me/profile/components/MembershipsSection.tsx`

**Imports-Muster** (Zeilen 1–11):
```typescript
import { Badge, Button, Card, EmptyState } from '@/components/ui'
import type { MemberProfileData } from '@/types/profile'
import { formatGroupRoleLabel } from '@/lib/profileLabels'

import styles from '../page.module.css'
```

**Props-Muster** (Zeilen 13–15 aus MembershipsSection):
```typescript
// Muster: Capability-Gate + isPublicView-Prop
type RecentMediaSectionProps = {
  items: MemberProfileRecentMedia[]   // aus MemberProfileData.recent_media
  canView: boolean                     // aus profile.capabilities.can_view_memberships als Vorbild
  isPublicView?: boolean               // D-15/D-16: Phase-59-Kompatibilität
}
```

**Capability-Gate-Muster** (Zeilen 18–25 aus MembershipsSection):
```typescript
export function MembershipsSection({ profile }: MembershipsSectionProps) {
  if (!profile.capabilities.can_view_memberships) {
    return (
      <EmptyState
        title="Mitgliedschaften sind nicht sichtbar"
        description="Der aktuelle Profil-Contract gibt diese Daten für dich nicht frei."
      />
    )
  }
  // ...
```
Für Phase 58 (D-14): Fehlertext für fehlende Capability → ehrlicher leerer Zustand ohne technischen Kontext.

**Empty-State-Muster** (Zeilen 27–34 aus MembershipsSection):
```typescript
  if (profile.memberships.length === 0) {
    return (
      <EmptyState
        title="Noch keine Mitgliedschaften"
        description="..."
      />
    )
  }
```
Für Phase 58 (D-07): `title="Noch keine Medien hochgeladen."` — keine description nötig.

**Kachel-Render-Muster** (Zeilen 36–66 aus MembershipsSection):
```typescript
  return (
    <ul className={styles.membershipList}>
      {profile.memberships.map((membership) => (
        <li key={`${membership.fansub_group_id}:${membership.fansub_group_slug}`}>
          <Card variant="nested" className={styles.membershipCard}>
            <div className={styles.membershipLogo} aria-hidden="true">
              <Users size={20} />
            </div>
            <div className={styles.membershipBody}>
              <strong>{membership.fansub_group_name}</strong>
              <div className={styles.chipRow}>
                <Badge variant="info">{/* Kategorie-Label */}</Badge>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
```

---

### `frontend/src/app/me/profile/components/RecentContributionsSection.tsx` (component, read-only)

**Analog:** `frontend/src/app/me/profile/components/ContributionsSection.tsx`

**Imports-Muster** (Zeilen 1–4 aus ContributionsSection):
```typescript
import { Badge, Card, EmptyState } from '@/components/ui'
import type { MemberProfileData } from '@/types/profile'
import styles from '../page.module.css'
```

**Props-Muster** (Zeile 7–9 aus ContributionsSection):
```typescript
type RecentContributionsSectionProps = {
  items: MemberProfileRecentContribution[]   // aus MemberProfileData.recent_contributions
  canView: boolean
  isPublicView?: boolean                      // D-15/D-16
}
```

**Capability-Gate-Muster** (Zeilen 24–31 aus ContributionsSection):
```typescript
export function ContributionsSection({ profile }: ContributionsSectionProps) {
  if (!profile.capabilities.can_view_historical_credits) {
    return (
      <EmptyState
        title="Beiträge sind nicht sichtbar"
        description="Der aktuelle Capability-Zustand erlaubt keine Anzeige historischer Credits."
      />
    )
  }
```
Für Phase 58 (D-14): Fehlertext → `title="Noch keine Beiträge."` ohne technischen Kontext.

**Empty-State-Muster** (Zeilen 33–41 aus ContributionsSection):
```typescript
  if (profile.historical_credits.length === 0) {
    return (
      <EmptyState
        title="Noch keine Beiträge"
        description="Detailzeilen sind erst mit einem eigenen Beitrags-Contract geplant."  // D-12: ENTFERNEN
        action={<DisabledContributionDetailAction />}                                       // D-12: ENTFERNEN
      />
    )
  }
```
Für Phase 58 (D-11/D-13): `title="Noch keine Beiträge."` — kein description, kein action.

**Kachel-Render-Muster** (Zeilen 44–59 aus ContributionsSection):
```typescript
  return (
    <div className={styles.contributionStack}>
      {profile.historical_credits.map((credit) => (
        <Card key={`${credit.fansub_group_id}:${credit.role_name}`} variant="nestedFlat" className={styles.contributionItem}>
          <div>
            <strong>{credit.fansub_group_name}</strong>
            <p>Historischer Credit, keine Berechtigung.</p>  {/* D-12: ENTFERNEN */}
          </div>
          <div className={styles.chipRow}>
            <Badge variant="info">{/* Rollenbezeichnung */}</Badge>
            <Badge variant="neutral">{/* Gruppenname */}</Badge>
          </div>
        </Card>
      ))}
    </div>
  )
```

---

### `frontend/src/app/me/profile/page.tsx` (route/view — Anpassung)

**Analog:** sich selbst

**Sections-Import-Muster entfernen** (Zeilen 11–14 aus page.tsx):
```typescript
// ENTFERNEN:
import { ContributionsSection } from './components/ContributionsSection'
import { MembershipsSection } from './components/MembershipsSection'

// HINZUFÜGEN:
import { RecentContributionsSection } from './components/RecentContributionsSection'
import { RecentMediaSection } from './components/RecentMediaSection'
```

**Section-Render-Muster ersetzen** (Zeilen 312–319 aus page.tsx):
```typescript
// VORHER (entfernen):
<Card variant="section">
  <SectionHeader title="Mitgliedschaften" description="Gruppenkontext und aktive App-Rollen, ohne Gruppenverwaltung in dieses Profil zu ziehen." />
  <MembershipsSection profile={profile} />
</Card>
<Card variant="section">
  <SectionHeader title="Meine Beiträge" description="Echte historische Credit-Aggregate. Detailansichten bleiben bis zu einem eigenen Contract deaktiviert." />
  <ContributionsSection profile={profile} />
</Card>

// NACHHER (einfügen):
<Card variant="section">
  <SectionHeader title="Meine letzten Medien" />
  <RecentMediaSection items={profile.recent_media ?? []} canView={true} isPublicView={false} />
</Card>
<Card variant="section">
  <SectionHeader title="Meine letzten Beiträge" />
  <RecentContributionsSection items={profile.recent_contributions ?? []} canView={true} isPublicView={false} />
</Card>
```

---

### `frontend/src/components/layout/AppShell.tsx` (layout/shell — Drawer-Erweiterung)

**Analog:** sich selbst

**AppShellProps-Erweiterung** (Zeilen 40–46 aus AppShell.tsx):
```typescript
export interface AppShellProps {
  mode?: AppShellMode
  currentPath?: string
  user?: AppShellUser | null
  canAccessAdmin?: boolean
  memberships?: AppShellMembership[]   // NEU — optionales Prop für Drawer
  children: ReactNode
}
```

**Statischer „Meine Gruppen"-Eintrag** (Zeilen 88–92 aus AppShell.tsx — zu ersetzen):
```typescript
const myItems: AppShellNavItem[] = [
  { label: 'Mein Profil', href: '/me/profile', icon: <UserCircle size={17} />, current: isCurrent(currentPath, '/me/profile') },
  { label: 'Meine Gruppen', icon: <Users size={17} />, disabled: true, badge: 'bald' },  // ERSETZEN durch dynamischen Abschnitt
  { label: 'Meine Beiträge', icon: <Compass size={17} />, disabled: true, badge: 'bald' },
]
```

**Dynamisches Gruppen-Render-Muster** — nach bestehenden `AppShellNavItemView`-Muster (Zeilen 52–78):
```typescript
// Neuer Typ
type AppShellMembership = {
  fansub_group_id: number
  fansub_group_name: string
  fansub_group_slug: string
}

// In AppShellNavGroups: statt disabled „Meine Gruppen"-Eintrag
{memberships && memberships.length > 0 ? (
  <div className={styles.navGroup}>
    <p className={styles.navGroupLabel}>Meine Gruppen</p>
    {memberships.map((m) => (
      <Link
        key={m.fansub_group_id}
        href={`/fansubs/${m.fansub_group_slug}/edit`}
        className={styles.navItem}
      >
        <span className={styles.navIcon} aria-hidden="true"><Users size={17} /></span>
        <span>{m.fansub_group_name}</span>
      </Link>
    ))}
  </div>
) : null}
```

---

### `frontend/src/components/layout/AppShellClientWrapper.tsx` (provider — Erweiterung)

**Analog:** sich selbst

**WrapperProfile-Erweiterung** (Zeilen 12–17 aus AppShellClientWrapper.tsx):
```typescript
interface WrapperProfile {
  displayName?: string
  email?: string
  avatarUrl?: string
  canAdmin?: boolean
  memberships?: Array<{               // NEU
    fansub_group_id: number
    fansub_group_name: string
    fansub_group_slug: string
  }>
}
```

**Profil-Extraktion erweitern** (Zeilen 45–51 aus AppShellClientWrapper.tsx):
```typescript
setProfile({
  displayName: d.account_display_name || d.fansub_name || undefined,
  email: d.email || undefined,
  avatarUrl: resolveApiUrl(d.avatar?.public_url || '') || undefined,
  canAdmin: d.account_global_roles.includes('platform_admin') || d.account_global_roles.includes('admin'),
  memberships: d.memberships ?? [],   // NEU — D-02, Pitfall 3 vermeiden
})
```

**AppShell-Prop weitergeben** (Zeilen 73–79 aus AppShellClientWrapper.tsx):
```typescript
return (
  <AppShell
    mode={hasAuthSession ? 'authenticated' : 'anonymous'}
    currentPath={currentPath ?? undefined}
    user={shellUser}
    canAccessAdmin={activeProfile?.canAdmin ?? false}
    memberships={activeProfile?.memberships ?? []}   // NEU
  >
    {children}
  </AppShell>
)
```

---

### `backend/internal/repository/member_profile_repository.go` (repository — Erweiterung)

**Analog:** sich selbst

**GetOwnProfile-Erweiterung** (Zeilen 30–50 aus member_profile_repository.go):
```go
func (r *MemberProfileRepository) GetOwnProfile(ctx context.Context, appUserID int64) (*models.MemberProfile, error) {
    // ...bestehend...
    base.Memberships, err = r.loadMemberships(ctx, base.MemberID, appUserID)
    if err != nil { return nil, err }
    base.HistoricalCredits, err = r.loadHistoricalCredits(ctx, base.MemberID)
    if err != nil { return nil, err }

    // NEU:
    base.RecentMedia, err = r.loadRecentMedia(ctx, appUserID)        // D-05: uploaded_by_user_id = appUserID
    if err != nil { return nil, err }
    base.RecentContributions, err = r.loadRecentContributions(ctx, base.MemberID)  // D-09: member_id
    if err != nil { return nil, err }

    return base, nil
}
```

**loadRecentMedia-Query-Muster** — abgeleitet aus `loadHistoricalCredits`-Struktur (Zeilen 560–600):
```go
func (r *MemberProfileRepository) loadRecentMedia(ctx context.Context, appUserID int64) ([]models.MemberProfileRecentMedia, error) {
    rows, err := r.db.Query(ctx, `
        SELECT
            rvm.id,
            rvm.category,
            mf.path,
            -- Anime-Titel via Join-Pfad: rvm → rv → fr → a
            a.title
        FROM release_version_media rvm
        JOIN release_versions rv ON rv.id = rvm.release_version_id
        JOIN fansub_releases fr ON fr.id = rv.release_id
        JOIN anime a ON a.id = fr.anime_id
        LEFT JOIN media_files mf ON mf.id = rvm.media_file_id
        WHERE rvm.uploaded_by_user_id = $1   -- KRITISCH: users.id, nicht members.id (Pitfall 1)
          AND rvm.deleted_at IS NULL
        ORDER BY rvm.created_at DESC
        LIMIT 3
    `, appUserID)
    // ...rows.Next() Scan-Muster analog zu loadHistoricalCredits Zeilen 582–599...
}
```

**loadRecentContributions-Query-Muster** — abgeleitet aus `loadHistoricalCredits` (Zeilen 560–600):
```go
func (r *MemberProfileRepository) loadRecentContributions(ctx context.Context, memberID int64) ([]models.MemberProfileRecentContribution, error) {
    rows, err := r.db.Query(ctx, `
        SELECT
            rmr.id,
            a.title,
            a.id,
            fg.name,
            cr.name,
            cr.label
        FROM release_member_roles rmr
        JOIN contributor_roles cr ON cr.id = rmr.role_id
        JOIN release_versions rv ON rv.release_id = rmr.release_id
        JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
        JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
        JOIN fansub_releases fr ON fr.id = rmr.release_id
        JOIN anime a ON a.id = fr.anime_id
        WHERE rmr.member_id = $1
        ORDER BY rmr.id DESC   -- Pitfall 2: kein created_at in release_member_roles, daher id DESC
        LIMIT 3
    `, memberID)
    // ...Scan-Muster analog zu loadHistoricalCredits Zeilen 582–599...
}
```

**rows.Next()-Scan-Muster** (Zeilen 582–599 aus member_profile_repository.go):
```go
    defer rows.Close()
    items := make([]models.MemberProfileCredit, 0)
    for rows.Next() {
        var item models.MemberProfileCredit
        if err := rows.Scan(
            &item.FansubGroupID,
            &item.FansubGroupName,
            &item.RoleName,
            &item.RoleLabel,
            &item.ReleaseCount,
        ); err != nil {
            return nil, fmt.Errorf("scan historical credit row: %w", err)
        }
        items = append(items, item)
    }
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("iterate historical credits for member %d: %w", memberID, err)
    }
    return items, nil
```

---

### `backend/internal/models/member_profile.go` (model — Erweiterung)

**Analog:** sich selbst — neue Structs nach bestehendem Muster

**Bestehendes Struct-Muster** (Zeilen 34–40 aus member_profile.go):
```go
type MemberProfileCredit struct {
    FansubGroupID   int64  `json:"fansub_group_id"`
    FansubGroupName string `json:"fansub_group_name"`
    RoleName        string `json:"role_name"`
    RoleLabel       string `json:"role_label"`
    ReleaseCount    int32  `json:"release_count"`
}
```

**Neue Structs** — nach demselben Muster:
```go
type MemberProfileRecentMedia struct {
    ID           int64  `json:"id"`
    Category     string `json:"category"`
    ThumbnailURL string `json:"thumbnail_url,omitempty"`
    AnimeTitle   string `json:"anime_title"`
}

type MemberProfileRecentContribution struct {
    ID             int64  `json:"id"`
    AnimeTitle     string `json:"anime_title"`
    AnimeID        int64  `json:"anime_id"`
    FansubGroupName string `json:"fansub_group_name"`
    RoleName       string `json:"role_name"`
    RoleLabel      string `json:"role_label"`
}
```

**MemberProfile-Struct-Erweiterung** (Zeilen 66–67 aus member_profile.go — nach bestehenden Slices):
```go
    Memberships         []MemberProfileMembership          `json:"memberships"`
    HistoricalCredits   []MemberProfileCredit              `json:"historical_credits"`
    RecentMedia         []MemberProfileRecentMedia         `json:"recent_media"`           // NEU
    RecentContributions []MemberProfileRecentContribution  `json:"recent_contributions"`   // NEU
```

---

### `frontend/src/types/profile.ts` (type/DTO — Erweiterung)

**Analog:** sich selbst

**Bestehendes Interface-Muster** (Zeilen 25–31 aus profile.ts):
```typescript
export interface MemberProfileCredit {
  fansub_group_id: number
  fansub_group_name: string
  role_name: string
  role_label: string
  release_count: number
}
```

**Neue Interfaces** — nach demselben Muster:
```typescript
export interface MemberProfileRecentMedia {
  id: number
  category: string
  thumbnail_url?: string | null
  anime_title: string
}

export interface MemberProfileRecentContribution {
  id: number
  anime_title: string
  anime_id: number
  fansub_group_name: string
  role_name: string
  role_label: string
}
```

**MemberProfileData-Erweiterung** (Zeilen 67–68 aus profile.ts — nach bestehenden Arrays):
```typescript
  memberships: MemberProfileMembership[]
  historical_credits: MemberProfileCredit[]
  recent_media: MemberProfileRecentMedia[]               // NEU
  recent_contributions: MemberProfileRecentContribution[] // NEU
```

---

## Shared Patterns

### EmptyState ohne technischen Kontext (D-12/D-13)
**Quelle:** `frontend/src/app/me/profile/components/MembershipsSection.tsx` (Zeilen 27–34) — als Negativbeispiel
**Anwenden auf:** `RecentMediaSection.tsx`, `RecentContributionsSection.tsx`
```typescript
// RICHTIG (Phase 58):
<EmptyState title="Noch keine Medien hochgeladen." />
<EmptyState title="Noch keine Beiträge." />

// FALSCH (entfernen per D-12):
// description="Detailzeilen sind erst mit einem eigenen Beitrags-Contract geplant."
// description="Phase 53 zeigt nur echte Aggregate."
// description="Der aktuelle Profil-Contract gibt diese Daten nicht frei."
```

### isPublicView-Prop-Muster (D-15/D-16)
**Quelle:** Pattern aus RESEARCH.md — kein bestehender Analog, neues Muster
**Anwenden auf:** `RecentMediaSection.tsx`, `RecentContributionsSection.tsx`
```typescript
// Prop von Beginn an implementieren:
type RecentMediaSectionProps = {
  items: MemberProfileRecentMedia[]
  canView: boolean
  isPublicView?: boolean   // false in Phase 58, true in Phase 59
}
// In Phase 58: <RecentMediaSection ... isPublicView={false} />
// Kein useEffect zum Ausblenden — explizites Prop-Argument
```

### publicURLForPath-Helfer für Thumbnails
**Quelle:** `backend/internal/repository/member_profile_repository.go` Zeile 602
**Anwenden auf:** `loadRecentMedia`-Query-Ergebnis
```go
func (r *MemberProfileRepository) publicURLForPath(filePath string) string {
    trimmed := strings.TrimSpace(filePath)
    if trimmed == "" { return "" }
    // ...
}
// Im Scan: item.ThumbnailURL = r.publicURLForPath(rawPath)
```

### Rows-Fehlerbehandlung (Go Repository-Standard)
**Quelle:** `backend/internal/repository/member_profile_repository.go` Zeilen 531–557
**Anwenden auf:** `loadRecentMedia`, `loadRecentContributions`
```go
if err != nil {
    return nil, fmt.Errorf("load recent media for user %d: %w", appUserID, err)
}
defer rows.Close()
// ...
if err := rows.Err(); err != nil {
    return nil, fmt.Errorf("iterate recent media for user %d: %w", appUserID, err)
}
```

---

## No Analog Found

Alle Dateien haben klare Analogs. Keine Lücken.

---

## Metadata

**Analog-Suchbereich:** `frontend/src/app/me/profile/`, `frontend/src/components/layout/`, `backend/internal/repository/`, `backend/internal/models/`, `frontend/src/types/`
**Gescannte Dateien:** 10
**Pattern-Extraktion:** 2026-05-29

### Kritische Hinweise für den Planner

1. **Pitfall 1 — uploaded_by_user_id vs. member_id:** `loadRecentMedia` muss `appUserID` (users.id) verwenden, nicht `memberID`. Verifiziert durch bestehenden INSERT in release_version_media_repository.go.

2. **Pitfall 2 — kein created_at in release_member_roles:** Sortierung nach `rmr.id DESC` als Fallback. Migration 0044 vor Query-Formulierung lesen.

3. **Pitfall 3 — AppShellClientWrapper übergibt memberships nicht:** `WrapperProfile` und `setProfile()`-Aufruf müssen explizit um `memberships` erweitert werden.

4. **D-02 Gruppen-Link-Ziel:** Vermutlich `/fansubs/${slug}/edit` — existierende Fansub-Edit-Route vor Implementierung verifizieren.

5. **MembershipsSection.tsx vollständig löschen** (nicht refactoren) — D-01.
