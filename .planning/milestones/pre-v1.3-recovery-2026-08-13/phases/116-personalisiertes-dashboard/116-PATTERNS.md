# Phase 116: Personalisiertes Dashboard - Pattern Map

**Mapped:** 2026-07-28
**Files analyzed:** 15 (10 neu, 5 modifiziert)
**Analogs found:** 15 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `frontend/src/app/me/dashboard/page.tsx` | route (client component) | request-response (Promise.all parallel fetch) | `frontend/src/app/me/profile/page.tsx` | exact (nächste Verwandtschaft: `me/contributions/page.tsx`) |
| `frontend/src/app/me/dashboard/components/AttentionSection.tsx` | component | transform (client-seitiges Filtern/Sortieren) | `frontend/src/components/profile/MembershipsSection.tsx` | role-match (Card-Liste-Muster) |
| `frontend/src/app/me/dashboard/components/DashboardMetrics.tsx` | component | request-response (reine Anzeige) | `frontend/src/components/profile/MemberProfileHero.tsx` (Zeilen 176-178, `HeroMetrics`-Nutzung) | exact |
| `frontend/src/app/me/dashboard/components/CategoryProgressTable.tsx` | component | transform (Rohzahl → Tabellenzeile) | `frontend/src/components/ui/Table.tsx` + `memberBadgeLabels.ts` (Presentation-Resolver) | role-match |
| `frontend/src/app/me/dashboard/components/MyGroupsSection.tsx` | component | CRUD-read (Wrapper) | `frontend/src/components/profile/MembershipsSection.tsx` | exact (direktes Reuse + Empty-State-Override) |
| `frontend/src/app/me/dashboard/components/QuickLinksSection.tsx` | component | request-response (statische Links) | `frontend/src/components/layout/AppShell.tsx` (Zeilen 120-125, `publicItems`-Kachel-/Link-Muster) | role-match |
| `frontend/src/app/me/dashboard/page.test.tsx` | test | — | `frontend/src/app/me/contributions/page.test.tsx` (falls vorhanden) bzw. `AppShell.test.tsx` | role-match |
| `frontend/src/types/dashboard.ts` (neu) | model/DTO | request-response | `frontend/src/types/contributions.ts` (`MeAnimeContribution`) | role-match |
| `frontend/src/types/contributions.ts` (modifiziert, additiv) | model/DTO | request-response | sich selbst — additive Felder `created_at`/`confirmed_at` | exact |
| `frontend/src/lib/api.ts` (neue Funktion `getOwnDashboard`) | utility (API-Client) | request-response | `getOwnProfile` (Zeile 3042-3066), `getMyAnimeContributions` (Zeile 8560-8582) | exact |
| `frontend/src/components/layout/AppShell.tsx` (modifiziert) | component (nav) | transform (Item-Verschiebung) | Phase-114-02-Nav-Aktivierungs-Diff (gleiche Datei, andere Zeile) | exact |
| `backend/internal/handlers/dashboard_me_handler.go` (neu) | controller (Handler) | request-response | `backend/internal/handlers/contributions_me_handler.go` (`ListMyAnimeContributions`, Zeilen 108-132) | exact |
| `backend/internal/repository/member_profile_dashboard_repository.go` (neu) | repository | CRUD (read-only Aggregation) | `backend/internal/repository/member_profile_contribution_badges_repository.go` + `member_profile_role_volume_repository.go` | exact |
| `backend/cmd/server/main.go` (modifiziert, Routen-Registrierung) | config/route | request-response | Zeilen 534, 539, 548 (`contributionsMeHandler`-Konstruktion + `v1.GET("/me/...")`) | exact |
| `shared/contracts/openapi.yaml` (modifiziert, additiv) | config | — | bestehende `/me/*`-Pfad-Definitionen (Konvention Phase 72-04) | role-match |

## Pattern Assignments

### `frontend/src/app/me/dashboard/page.tsx` (route, request-response)

**Analog:** `frontend/src/app/me/profile/page.tsx`

**Imports pattern** (Zeilen 1-17, gekürzt auf relevante Teile):
```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Card, ErrorState, LoadingState, PageHeader, SectionHeader } from '@/components/ui'
import { ApiError, getMyAnimeContributions, getOwnDashboard, getOwnProfile } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
```

**Session-Gate-Muster** (`me/profile/page.tsx:161`):
```typescript
const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
// ...
const hasAuthSession = hasAccessToken || hasRefreshToken
```

**Parallel-Fetch-Kernmuster** (`me/profile/page.tsx:209-219`, wörtlich zu übernehmendes Skelett):
```typescript
const loadProfile = useCallback(async (options) => {
  const [response, claim, badgesResponse] = await Promise.all([
    getOwnProfile(),
    getMyMemberClaim().catch(() => null),
    getMyBadges().catch(() => ({ badges: [] })),
  ])
  setMyClaim(claim)
  setBadges(badgesResponse.badges ?? [])
  applyProfile(response.data, options)
  return response.data
}, [applyProfile])
```
Für 116 analog mit drei Dashboard-Quellen: `getOwnProfile()` (memberships/D-05), `getMyAnimeContributions()` (D-02), `getOwnDashboard()` (D-03/D-04, NEU). Kein serielles Fetching (siehe RESEARCH Pattern 1, SSR-Request-Fächer-Pitfall aus Projekt-Memory).

**WICHTIGER KONTRAST — kein Eligibility-Redirect (D-09):** Anders als `me/contributions/page.tsx` (Zeilen 42-44, 77-86: `isEligibleForContributions` + `router.replace('/me/profile')`) darf `/me/dashboard` **keinen** Redirect-Gate haben. Jeder eingeloggte User sieht die Seite; Sektionen ohne Daten zeigen `EmptyState` statt Redirect. Dieses Redirect-Muster ist explizit NICHT zu kopieren für 116.

**Error/Loading-Muster** (Analog `me/profile/page.tsx`, `ErrorState`/`LoadingState` aus `@/components/ui`):
```typescript
if (!isClientInitialized || isLoading) {
  return <LoadingState title="Dein Dashboard wird geladen" description="Kennzahlen, Fortschritt und Gruppen werden zusammengestellt." />
}
if (error) {
  return <ErrorState title="Dashboard konnte nicht geladen werden" description="..." />
}
```

**450-Zeilen-Limit-Flag:** `page.tsx` darf laut UI-SPEC NUR die `Promise.all`-Orchestrierung + Komposition der 5 Sektionskomponenten enthalten (analog `me/profile/page.tsx`, das selbst bereits 8 ausgelagerte Unterkomponenten unter `./components/` hat). Jede der 5 Sektionen (`AttentionSection`, `DashboardMetrics`, `CategoryProgressTable`, `MyGroupsSection`, `QuickLinksSection`) MUSS eine eigene Datei unter `components/` sein — **kein** Inline-JSX für alle 5 Sektionen in `page.tsx` selbst, sonst droht ein Überschreiten des 450-Zeilen-Limits (Vorbild: `me/profile/page.tsx` selektiert bereits konsequent nach diesem Muster).

---

### `frontend/src/app/me/dashboard/components/AttentionSection.tsx` (component, transform)

**Analog:** `frontend/src/components/profile/MembershipsSection.tsx` (vollständig gelesen, 92 Zeilen)

**Imports pattern** (Zeilen 1-10):
```typescript
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Card, SectionHeader, Badge, EmptyState } from '@/components/ui'
import type { MeAnimeContribution } from '@/types/contributions'
```

**Card-Liste-Kernmuster** (`MembershipsSection.tsx:52-89`, wörtlich übertragbares Grundgerüst):
```typescript
<ul className={styles.list}>
  {items.map((item) => (
    <li key={item.id}>
      <Card variant="interactive" className={styles.itemCard}>
        <Link className={styles.itemLink} href={resolveWorkspaceHref(item)}>
          <span className={styles.itemName}>
            <strong>{item.anime_title}</strong>
            {contextLabel ? <span>{contextLabel}</span> : null}
          </span>
          {isRecentlyAssigned(item.created_at, windowDays) ? (
            <Badge variant="info">Neu</Badge>
          ) : null}
          <span className={styles.itemAction}>
            <ArrowRight size={15} aria-hidden="true" />
          </span>
        </Link>
      </Card>
    </li>
  ))}
</ul>
```

**Pure-Funktionen (aus RESEARCH.md wörtlich übernehmen, zuerst isoliert Wave-0-testen):**
```typescript
// Pattern 2 (RESEARCH.md Zeile 258-263)
function resolveWorkspaceHref(c: MeAnimeContribution): string {
  return c.release_version_id
    ? `/me/releases/${c.release_version_id}/workspace`
    : `/me/projects/${c.anime_id}/group/${c.fansub_group_id}`
}

// Pattern 3 (RESEARCH.md Zeile 272-275)
function isRecentlyAssigned(createdAt: string, windowDays: number): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  return ageMs <= windowDays * 24 * 60 * 60 * 1000
}
```
`windowDays = 14` als benannte Konstante mit Kommentar führen (Claude's Discretion, A3 in RESEARCH.md).

**Empty-State-Muster** (UI-SPEC Sektion 1, `variant="compact"`, KEIN eigenes `<p>`):
```typescript
<EmptyState
  title="Nichts Neues im Moment"
  description="Du hast in den letzten 14 Tagen keine neuen Projekt- oder Release-Zuweisungen erhalten."
  variant="compact"
/>
```
`aria-hidden="true"` auf dekorativem `ArrowRight`-Icon (identisch zu `MembershipsSection.tsx:81`).

---

### `frontend/src/app/me/dashboard/components/DashboardMetrics.tsx` (component, request-response)

**Analog:** `frontend/src/components/profile/MemberProfileHero.tsx` (Zeilen 176-178) + `frontend/src/components/ui/HeroMetrics.tsx` (vollständig, 31 Zeilen)

**HeroMetrics-Primitive-Signatur** (`HeroMetrics.tsx:6-17`, exakte Nutzungsvorgabe):
```typescript
export interface HeroMetricItem {
  label: string
  value: ReactNode
}
export interface HeroMetricsProps {
  items: HeroMetricItem[]
  ariaLabel: string
  className?: string
}
```

**Bestehende Nutzung als Vorbild** (`MemberProfileHero.tsx:176-178`):
```typescript
{isPublicView && totalPoints !== null ? (
  <HeroMetrics items={[{ label: 'Punkte', value: totalPoints }]} ariaLabel="Mitglied-Punktzahl" />
) : null}
```
Für D-03 mit 5 festen Items (Reihenfolge laut UI-SPEC Sektion 2): Punkte, Badges, Projekte, Hochgeladene Bilder, Geschriebene Beiträge. Zahlenformat `toLocaleString('de-DE')` bei Punkte > 999 (UI-SPEC Zeile 172). Kein Empty State nötig — jeder Wert hat Default 0.

**Datenquelle (NICHT wiederverwenden):** `getMyBadges()` zählt nur persistierte Badges (RESEARCH Pitfall 1) — Werte kommen ausschließlich aus `getOwnDashboard()`.

---

### `frontend/src/app/me/dashboard/components/CategoryProgressTable.tsx` (component, transform)

**Analog:** `frontend/src/components/ui/Table.tsx` (vollständig, 78 Zeilen) + `frontend/src/components/profile/memberBadgeLabels.ts` (Presentation-Resolver, Zeilen 140-240)

**Table-Primitive-Signaturen** (`Table.tsx:6-77`, exakt zu nutzen — `variant="compact"` laut UI-SPEC):
```typescript
<Table variant="compact">
  <TableHead>
    <TableRow>
      <TableHeaderCell>Kategorie</TableHeaderCell>
      <TableHeaderCell>Aktuelle Stufe</TableHeaderCell>
      <TableHeaderCell>Fortschritt</TableHeaderCell>
    </TableRow>
  </TableHead>
  <TableBody>
    {rows.length === 0 ? (
      <TableEmptyState colSpan={3} title="Noch kein Fortschritt" description="Sobald du an einem Projekt mitwirkst, siehst du hier deinen Fortschritt je Kategorie." />
    ) : rows.map((row) => (
      <TableRow key={row.family}>
        <TableCell>{row.label}</TableCell>
        <TableCell><Badge variant={presentation.variant}>{presentation.label}</Badge></TableCell>
        <TableCell>{formatProgressCell(row)}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Badge-Presentation-Resolver (wiederverwenden, NICHT neu bauen):** `getMemberBadgePresentation`/`resolveRoleVolumePresentation` (`memberBadgeLabels.ts:183-221`) für die "Aktuelle Stufe"-Zelle.

**Schwellen-Konstanten (bereits vorhanden, aber `POINT_MILESTONES` aktuell NICHT exportiert):**
```typescript
// memberBadgeLabels.ts:226-233 — Zeile "const POINT_MILESTONES" hat KEIN export-Keyword,
// muss additiv um `export` ergänzt werden (oder eine "next threshold"-Hilfsfunktion
// zusätzlich exportiert werden), damit Phase 116 die Schwellen nicht dupliziert.
const POINT_MILESTONES: Array<{ threshold: number; badge_code: string }> = [
  { threshold: 2500, badge_code: 'point_milestone_legend' },
  { threshold: 1000, badge_code: 'point_milestone_veteran' },
  { threshold: 500, badge_code: 'point_milestone_engaged' },
  { threshold: 200, badge_code: 'point_milestone_experienced' },
  { threshold: 50, badge_code: 'point_milestone_active' },
  { threshold: 1, badge_code: 'point_milestone_first' },
]
// memberBadgeLabels.ts:157-162 — bereits exportierbar als privates const, ROLE_VOLUME_TIER_THRESHOLDS:
const ROLE_VOLUME_TIER_THRESHOLDS: Record<RoleVolumeTier, number> = {
  bronze: 12, silver: 108, gold: 320, platinum: 510,
}
```
Contribution-Familien-Schwellen (Phase 113) sind NUR in Go dokumentiert (`highestContribProjectsTier`/`highestContribChronicleTier`/`highestContribArchivistTier`, siehe Backend-Abschnitt unten) — laut RESEARCH/UI-SPEC bevorzugt: Rohzahl + `next_threshold` direkt vom neuen Backend-Endpunkt mitliefern lassen, NICHT die Go-Schwellen ein zweites Mal in TS duplizieren.

**Fortschritts-Zellentext** (UI-SPEC Zeile 182): `"noch {next_threshold - current_count} bis {next_tier_label}"`, sonst `"Höchste Stufe erreicht"`. Kein Progress-Bar-Primitive einführen.

---

### `frontend/src/app/me/dashboard/components/MyGroupsSection.tsx` (component, CRUD-read)

**Analog:** `frontend/src/components/profile/MembershipsSection.tsx` — **direktes Reuse**, kein Nachbau.

**Wrapper-Kontrakt** (UI-SPEC Sektion 4, verbindlich):
```typescript
import { MembershipsSection } from '@/components/profile/MembershipsSection'
import { EmptyState, Button } from '@/components/ui'
import type { MemberProfileMembership } from '@/types/profile'

export function MyGroupsSection({ memberships }: { memberships: MemberProfileMembership[] }) {
  if (memberships.length === 0) {
    return (
      <EmptyState
        title="Noch in keiner Gruppe"
        description="Tritt einer Fansub-Gruppe bei oder entdecke, wer an deinen Lieblingsanimes arbeitet."
        action={<Button asChild variant="secondary"><Link href="/fansubs">Fansub-Gruppen entdecken</Link></Button>}
      />
    )
  }
  return <MembershipsSection memberships={memberships} title="Meine Gruppen" />
}
```
**D-09-Pflicht:** `MembershipsSection` selbst zeigt bei leeren `memberships` nur `<p className={styles.emptyText}>Keine Gruppen eingetragen.</p>` (Zeile 50, kein Primitive, kein Absprung) — das erfüllt D-09 NICHT. Deshalb der Override im Wrapper (siehe oben), niemals `MembershipsSection` mit leerer Liste direkt rendern lassen.

**Linkziel bereits korrekt:** `MembershipsSection.tsx:60` verlinkt bereits `/fansubs/${membership.fansub_group_slug}` (öffentliches Gruppenprofil) — NICHT `/admin/fansubs/${id}/edit`. Kein zusätzlicher Fix nötig, nur Wiederverwendung.

**Datenquelle:** `getOwnProfile().data.memberships` (bereits vorhandener Response-Pfad, kein neuer Endpunkt).

---

### `frontend/src/app/me/dashboard/components/QuickLinksSection.tsx` (component, request-response)

**Analog:** `frontend/src/components/layout/AppShell.tsx` (Zeilen 120-125, 187-191 — Item-/Icon-/`disabled+badge`-Muster)

**Icon-Konsistenz-Muster** (`AppShell.tsx:8-18`, gleiche Icons wie im Nav wiederverwenden):
```typescript
import { Compass, Trophy, Users, Search, UserCircle } from 'lucide-react'
```

**Statisches Link-Item + defensive Route-Existenzprüfung (Pitfall 3, verbindlich):**
```typescript
// AppShell.tsx:191 nutzt exakt dieses Muster für unfertige Features:
{ label: 'Suche', icon: <Compass size={17} />, disabled: true, badge: 'bald' }
```
Für 116: vor dem Rendern prüfen, ob `/suche` (Phase 115) existiert — Plan MUSS dies defensiv behandeln (kein Hardcode `disabled: true`, sondern echte Prüfung zur Ausführungszeit, z. B. Build-Zeit-Konstante/Feature-Flag, da eine Runtime-Fetch-Prüfung einer Route unüblich wäre). Nicht-existente Route: `Card` in deaktiviertem visuellem Zustand, `aria-disabled="true"`, kein `<Link>`, `Badge variant="muted"` „bald" (UI-SPEC Zeile 198).

**Card-Kachel-Grid-Muster:** wie `MembershipsSection`/`AttentionSection` (`Card variant="interactive"` + `Link`-Wrapper), erster Eintrag zusätzlich mit Akzentfarbe (`Button variant="primary"`-Stil oder `Card`-Akzent-Border, UI-SPEC Color-Kontrakt).

---

### `frontend/src/types/dashboard.ts` (neu, model/DTO)

**Analog:** `frontend/src/types/contributions.ts` (Struktur/Namenskonvention)

```typescript
// Analog zu MeAnimeContribution (contributions.ts:75-108) — additive, flache DTO-Interfaces,
// Kommentare mit Phasen-Referenz, optionale Felder mit "?" statt null-Unions wo sinnvoll.
export interface DashboardCategoryProgress {
  family: string
  current_tier: string
  current_count: number
  next_threshold: number | null
  next_tier_label: string | null
  role_code?: string
}

export interface OwnDashboardData {
  total_points: number
  badges_count: number
  projects_count: number
  images_count: number
  contributions_count: number
  category_progress: DashboardCategoryProgress[]
}

export interface OwnDashboardResponse {
  data: OwnDashboardData
}
```

### `frontend/src/types/contributions.ts` (modifiziert, additiv)

**Additive Erweiterung** (RESEARCH.md Zeile 432-439, wörtlich):
```typescript
// frontend/src/types/contributions.ts:75 -- additiv ergänzen:
export interface MeAnimeContribution {
  // ... bestehende Felder unverändert (Zeilen 76-107) ...
  created_at: string
  confirmed_at?: string | null
}
```
Feld existiert bereits im JSON (`AnimeContributionRow.CreatedAt`, `anime_contributions_inputs.go:27`) — reine additive TS-Deklaration, kein Backend-Zusatz für diesen Teil.

---

### `frontend/src/lib/api.ts` (neue Funktion `getOwnDashboard`)

**Analog:** `getOwnProfile` (Zeilen 3042-3066) und `getMyAnimeContributions` (Zeilen 8560-8582) — identisches Fehlerbehandlungs-/Fetch-Gerüst.

```typescript
// Analog zu getOwnProfile (api.ts:3042-3066) und getMyAnimeContributions (api.ts:8560-8582)
export async function getOwnDashboard(
  authToken?: string,
): Promise<OwnDashboardResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/me/dashboard`, {
    cache: "no-store",
    authToken,
  });

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  return response.json() as Promise<OwnDashboardResponse>;
}
```
Import `OwnDashboardResponse` aus dem neuen `@/types/dashboard`-Modul (analog zum bestehenden Import-Stil für `MeAnimeContributionsResponse` aus `@/types/contributions`).

---

### `frontend/src/components/layout/AppShell.tsx` (modifiziert, Nav-Aktivierung, D-10/Pitfall 4)

**Analog:** dieselbe Datei — Item-Verschiebung nach dem Phase-114-02-Nav-Aktivierungsmuster (Recherche verweist auf dieses Muster, konkrete Diff-Zeilen unten).

**Vorher** (`AppShell.tsx:120-125`, `publicItems`):
```typescript
const publicItems: AppShellNavItem[] = [
  { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: isCurrent(currentPath, '/anime') },
  { label: 'Rangliste', href: '/members/ranking', icon: <Trophy size={17} />, current: isCurrent(currentPath, '/members/ranking') },
  { label: 'Fansub-Gruppen', href: '/fansubs', icon: <Users size={17} />, current: isCurrent(currentPath, '/fansubs') },
  { label: 'Dashboard', icon: <LayoutDashboard size={17} />, disabled: true, badge: 'bald' },
]
```

**Nachher (Zielzustand laut D-10/UI-SPEC Nav-Kontrakt):**
```typescript
const publicItems: AppShellNavItem[] = [
  { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: isCurrent(currentPath, '/anime') },
  { label: 'Rangliste', href: '/members/ranking', icon: <Trophy size={17} />, current: isCurrent(currentPath, '/members/ranking') },
  { label: 'Fansub-Gruppen', href: '/fansubs', icon: <Users size={17} />, current: isCurrent(currentPath, '/fansubs') },
]
// ... innerhalb fixedMyItems (Zeile 132-134, VOR dem Push von "Meine Projekte"):
const fixedMyItems: AppShellNavItem[] = [
  { label: hasMemberProfile ? 'Mein Profil' : 'Mein Account', href: '/me/profile', icon: <UserCircle size={17} />, current: isCurrent(currentPath, '/me/profile') },
  { label: 'Dashboard', href: '/me/dashboard', icon: <LayoutDashboard size={17} />, current: isCurrent(currentPath, '/me/dashboard') },
]
```
`LayoutDashboard`-Import (Zeile 10) bleibt unverändert bestehen — nur die Gruppenzugehörigkeit + `href`/`disabled`/`badge` ändern sich. **Kein** Eintrag in `AppShellAnonNavGroups` (Zeilen 180-200) — bleibt unverändert.

---

### `backend/internal/handlers/dashboard_me_handler.go` (neu, controller)

**Analog:** `backend/internal/handlers/contributions_me_handler.go` (vollständig für Imports/Ownership-Gate gelesen, Zeilen 1-132)

**Imports pattern** (Zeilen 1-17):
```go
package handlers

import (
	"errors"
	"net/http"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)
```

**MUSS wiederverwendetes Ownership-Gate-Muster** (`contributions_me_handler.go:63-80`, wörtlich zu kopierender Kern):
```go
// resolveVerifiedMemberID ermittelt die member_id des eingeloggten App-Users über member_claims.
func (h *ContributionsMeHandler) resolveVerifiedMemberID(ctx context.Context, appUserID int64) (int64, error) {
	var memberID int64
	err := h.db.QueryRow(ctx, `
		SELECT member_id FROM member_claims
		WHERE app_user_id = $1 AND claim_status = 'verified'
		ORDER BY verified_at DESC
		LIMIT 1
	`, appUserID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, repository.ErrNotFound
		}
		return 0, err
	}
	return memberID, nil
}
```
**Sicherheitskontrakt (D-08, bindend):** entweder dieselbe Funktion auf einem gemeinsamen Handler-Empfänger wiederverwenden (falls `DashboardMeHandler` denselben `db`-Pool + Konstruktions-Stil erhält) oder die Funktion in eine gemeinsame Helper-Datei extrahieren — niemals eine `member_id` aus Query/Body vertrauen.

**Handler-Kernmuster** (`contributions_me_handler.go:108-132`, `ListMyAnimeContributions`, als Vorlage für `GetOwnDashboard`-Handler):
```go
// ListMyAnimeContributions handles GET /api/v1/me/anime-contributions
func (h *ContributionsMeHandler) ListMyAnimeContributions(c *gin.Context) {
	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}

	memberID, err := h.resolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		respondMemberProfileRequired(c)
		return
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	items, err := h.contributionsRepo.ListByMemberIDWithProposalFields(c.Request.Context(), memberID, identity.AppUserID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}
```
`requireMeIdentity` (Zeile 98-106) und `respondMemberProfileRequired` (Zeile 41-48) sind bereits paket-weite Helper in `handlers`-Package — direkt wiederverwenden, nicht neu schreiben. **D-09-Kontrast:** Anders als hier zeigt der Dashboard-Handler `respondMemberProfileRequired` NUR falls überhaupt kein `member_claims`-Eintrag existiert — laut D-09 soll das Dashboard aber für JEDEN eingeloggten User (auch ohne Member-Profil) erreichbar sein; die Aggregation muss daher entweder mit `memberID = 0`/Default-Werten graceful umgehen ODER `has_member_profile: false` + Nullwerte für alle Kennzahlen zurückgeben, statt 403 zu werfen. Dieser Unterschied MUSS im Handler explizit gehandhabt werden (kein 1:1-Kopieren des 403-Verhaltens für den No-Claim-Fall).

---

### `backend/internal/repository/member_profile_dashboard_repository.go` (neu, repository)

**Analog:** `backend/internal/repository/member_profile_contribution_badges_repository.go` (vollständig, 188 Zeilen) + `member_profile_role_volume_repository.go` (vollständig, 69 Zeilen) + `loadTotalPoints` (`member_profile_repository.go:636-650`)

**Wiederzuverwendende, bereits vorhandene Rohzahl-Bausteine (nur additiv die Zahl statt nur den Tier zurückgeben):**
```go
// member_profile_contribution_badges_repository.go:142-157 — chronicleCount wird
// AKTUELL nach Tier-Ableitung verworfen. Für D-03/D-04 muss die Funktion (oder eine
// Variante davon) die Rohzahl zusätzlich zurückgeben:
var chronicleCount int64
if err := r.db.QueryRow(ctx, `
	SELECT
		(SELECT COUNT(*) FROM release_version_notes
		 WHERE member_id = $1 AND status = 'published' AND deleted_at IS NULL)
		+
		(SELECT COUNT(*) FROM anime_fansub_project_notes
		 WHERE status = 'published' AND deleted_at IS NULL
		   AND created_by_user_id IN (`+authorMemberSeam+`))
		+
		(SELECT COUNT(*) FROM fansub_group_notes
		 WHERE status = 'published' AND deleted_at IS NULL
		   AND created_by_user_id IN (`+authorMemberSeam+`))
`, memberID).Scan(&chronicleCount); err != nil { /* ... */ }
```
Analoge Rohzahl-Bausteine: `projectsCount` (Zeile 95-129, Familie 1), `archivistCount` (Zeile 169-177, Familie 3) — alle drei Schwellen-Funktionen (`highestContribProjectsTier` 1/5/15, `highestContribChronicleTier` 10/50/150, `highestContribArchivistTier` 10/50/150, Zeilen 22-68) bleiben unverändert nutzbar, nur der Rückgabewert der aufrufenden Funktion muss die Rohzahl mitgeben.

**Rollen-Volumen-Baustein** (`member_profile_role_volume_repository.go:36-69`, `credit_count` wird pro Rolle bereits gescannt, aber ebenfalls verworfen):
```go
rows, err := r.db.Query(ctx, `
	SELECT role_code, COUNT(*) AS credit_count
	FROM release_role_credit_lifecycles
	WHERE member_id = $1 AND lifecycle_status = 'awarded'
	GROUP BY role_code
	ORDER BY role_code
`, memberID)
// highestRoleVolumeTier(count) (Zeile 15-28, Schwellen 12/108/320/510) bleibt Single Source of Truth
```

**Punkte-Baustein (read-only, unverändert wiederverwendbar):**
```go
// member_profile_repository.go:636-650
func (r *MemberProfileRepository) loadTotalPoints(ctx context.Context, memberID int64) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(total_points, 0)
		FROM member_point_totals
		WHERE member_id = $1
	`, memberID).Scan(&total)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("load total points for member %d: %w", memberID, err)
	}
	return total, nil
}
```

**Neue Aggregatsabfrage für "Projekte (Anzahl)" (kein Präzedenzfall, RESEARCH Pitfall 6 — analog Stil `hasProjectAssignments`):**
```go
// Analog-Stil zu member_profile_repository.go:101-119 (EXISTS-Query-Struktur, Autor-Seam)
SELECT COUNT(DISTINCT (anime_id, fansub_group_id)) FROM anime_contributions ac
LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
WHERE COALESCE(ac.member_id, hfgm.member_id) = $1 AND ac.status = 'confirmed'
```

**450-Zeilen-Limit-Flag:** `member_profile_contribution_badges_repository.go` (188 Zeilen) + `member_profile_role_volume_repository.go` (69 Zeilen) sind bereits eigene Dateien genau wegen dieses Limits. Die neue `member_profile_dashboard_repository.go` sollte NICHT alle Rohzahl-Queries neu duplizieren, sondern die bestehenden Repository-Methoden aufrufen und nur die zusätzliche COUNT-Query (Projekte) + das Response-Envelope-Mapping (Struct-Aggregation) enthalten — bleibt dadurch schlank.

---

### `backend/cmd/server/main.go` (modifiziert, Routen-Registrierung)

**Analog:** Zeilen 524-556, insbesondere die Handler-Konstruktion Zeile 534 und die Registrierungszeile 548.

```go
// Analog Handler-Konstruktion (main.go:534):
contributionsMeHandler := handlers.NewContributionsMeHandler(animeContributionsRepo, histGroupMemberRolesRepo, dbPool).WithReleaseCrewService(releaseCrewService)
// Analog Route-Registrierung (main.go:548):
v1.GET("/me/anime-contributions", authMiddleware, contributionsMeHandler.ListMyAnimeContributions)
```
Für 116 additiv, direkt neben den bestehenden `/me/*`-Registrierungen (Zeilen 539-556):
```go
dashboardRepo := repository.NewMemberProfileDashboardRepository(dbPool) // oder Erweiterung von memberProfileRepo
dashboardMeHandler := handlers.NewDashboardMeHandler(dashboardRepo, dbPool)
v1.GET("/me/dashboard", authMiddleware, dashboardMeHandler.GetOwnDashboard)
```
`authMiddleware` (identisches Gate wie alle bestehenden `/me/*`-Routen) nicht vergessen.

---

## Shared Patterns

### Ownership-Gate (`resolveVerifiedMemberID`)
**Source:** `backend/internal/handlers/contributions_me_handler.go:65-80`
**Apply to:** `dashboard_me_handler.go` (D-08-Pflicht, siehe Sicherheitskontrakt in RESEARCH/CONTEXT) — niemals `member_id` aus Query/Body vertrauen.

### Parallel-Client-Fetch (`Promise.all`)
**Source:** `frontend/src/app/me/profile/page.tsx:209-219`
**Apply to:** `frontend/src/app/me/dashboard/page.tsx` — alle drei Datenquellen (`getOwnProfile`, `getMyAnimeContributions`, `getOwnDashboard`) parallel, nie seriell (SSR-Request-Fächer-Bottleneck aus Projekt-Memory vermeiden).

### `@/components/ui`-Primitives-Pflicht (CLAUDE.md)
**Source:** `frontend/src/components/ui/index.ts` (vollständige Exportliste)
**Apply to:** ALLE 5 neuen Sektionskomponenten — `Card`, `SectionHeader`, `PageHeader`, `HeroMetrics`, `Table`/`TableHead`/`TableBody`/`TableRow`/`TableHeaderCell`/`TableCell`/`TableEmptyState`, `Badge`, `EmptyState`, `ErrorState`, `LoadingState`, `Button`. Kein handgebautes `<table>`/`<select>`/eigenes Card-Markup (ESLint-Regel `no-restricted-syntax`).

### Badge-Tier-Presentation (Farbe/Label)
**Source:** `frontend/src/components/profile/memberBadgeLabels.ts:183-221` (`getMemberBadgePresentation`, `resolveRoleVolumePresentation`)
**Apply to:** `CategoryProgressTable.tsx` — "Aktuelle Stufe"-Zelle MUSS über diese Resolver laufen, kein eigenes switch/case.

### Fehlerbehandlung API-Client
**Source:** `frontend/src/lib/api.ts` (Muster aus `getOwnProfile`/`getMyAnimeContributions`, `ApiError` + `parseApiErrorPayload`)
**Apply to:** neue `getOwnDashboard`-Funktion — identisches try/`response.ok`-Gerüst, keine Abweichung.

### Nav-Item-Struktur
**Source:** `frontend/src/components/layout/AppShell.tsx` (Typ `AppShellNavItem`, Zeilen 34-41)
**Apply to:** Dashboard-Nav-Eintrag — `label`, `href`, `icon`, `current` (via `isCurrent`-Helper, Zeile 65-67), kein `disabled`/`badge` mehr nach Aktivierung.

## No Analog Found

Keine — alle 15 klassifizierten Dateien haben mindestens einen role-match- oder exact-Analog in der bestehenden Codebase gefunden. Die einzige echte Neuheit ist die "Projekte (Anzahl)"-Aggregatsabfrage (RESEARCH Pitfall 6), für die es keine direkte Single-Source gibt — dafür wird aber ein stilistischer Analog (`hasProjectAssignments`-Query-Struktur) referenziert, kein Blindflug.

## Metadata

**Analog search scope:** `frontend/src/app/me/*`, `frontend/src/components/profile/*`, `frontend/src/components/ui/*`, `frontend/src/components/layout/AppShell.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types/*`, `backend/internal/handlers/contributions_me_handler.go`, `backend/internal/repository/member_profile*_repository.go`, `backend/cmd/server/main.go`
**Files scanned:** 16 (vollständig oder in gezielten, nicht überlappenden Ausschnitten gelesen)
**Pattern extraction date:** 2026-07-28
