# Phase 77: Leader Workspace – Public Preview & Readiness — Pattern Map

**Erstellt:** 2026-06-05
**Analysierte Dateien:** 5 neue/geänderte Dateien
**Analoge gefunden:** 5 / 5

---

## Datei-Klassifizierung

| Neue/Geänderte Datei | Rolle | Datenfluss | Nächstes Analog | Match-Qualität |
|----------------------|-------|------------|-----------------|----------------|
| `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx` | component | request-response (read aggregation) | `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` | role-match (gleiche Infrastruktur: `'use client'`, API-Seams, `@/components/ui`, CSS-Modul-Merge, Fehler/Lade-States) |
| `frontend/src/app/admin/fansubs/[id]/edit/PublicPreviewPanel.tsx` | component | request-response (read-only render) | `frontend/src/components/fansubs/FansubProfileTabs.tsx` | role-match (read-only Render der Fansub-Besucher-Sicht) |
| `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` (Änderung) | route / orchestrator | — | Eigene Datei — minimale chirurgische Erweiterung: `SectionKey`, `MAIN_TABS`, `canUseMainTab`, Render-Zweig | exact (Selbst-Referenz) |
| `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.test.tsx` | test | — | `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` | exact (gleiche jsdom-/Vitest-/Mock-Konventionen) |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` (Ergänzung) | config/style | — | Bestehende Klassen in der Datei | exact (Ergänzung neuer `.readiness*`-Klassen nach bestehendem Muster) |

---

## Pattern Assignments

---

### `ReadinessTab.tsx` (component, request-response read aggregation)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx`

**Imports-Muster** (Zeilen 1–37 des Analogs):

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, Check, Info } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
} from '@/components/ui'
import {
  ApiError,
  getAdminFansubAnime,
  listGroupMembers,
  listPendingMemberClaims,
} from '@/lib/api'
import type { FansubGroup } from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }
```

Hinweis: Das CSS-Modul-Merge-Muster `{ ...sharedStyles, ...fansubEditStyles }` ist in allen
Tab-Komponenten einheitlich (GroupMembersTab.tsx Zeile 38, AnimeProjectNotesSection.tsx Zeile 21).

**API-Seam-Muster für Readiness-Zähler** (Analog: GroupMembersTab.tsx Zeilen 162–173):

```typescript
// Pattern: useCallback + useEffect + try/catch + setLoading/setError
const loadCounts = useCallback(async () => {
  try {
    setLoading(true)
    setError(null)
    const [membersResp, claimsResp, animeResp] = await Promise.all([
      listGroupMembers(fansubId),
      listPendingMemberClaims(fansubId),
      getAdminFansubAnime(fansubId),
    ])
    setMemberCount(membersResp.data.length)
    setOpenClaimCount(claimsResp.length)
    setAnimeCount(animeResp.data.length)
  } catch (err) {
    setError(err instanceof ApiError ? err.message : 'Pflegezustand konnte nicht vollständig geladen werden.')
  } finally {
    setLoading(false)
  }
}, [fansubId])

useEffect(() => { void loadCounts() }, [loadCounts])
```

Hinweis: `listClaimInvitations` (api.ts Zeile 3378) erfordert zusätzlich `memberId` —
für die Readiness-Zusammenfassung genügt `listPendingMemberClaims` (Zeile 3442),
das gruppen-weit alle offenen Claims zurückgibt.

**Lade-/Fehlerzustand-Muster** (Analog: GroupMembersTab.tsx Zeilen 293–312):

```typescript
{error ? (
  <ErrorState
    title="Pflegezustand konnte nicht vollständig geladen werden"
    description={error}
    action={<Button variant="secondary" size="sm" onClick={() => void loadCounts()}>Erneut laden</Button>}
  />
) : null}
{loading ? (
  <LoadingState
    title="Pflegezustand wird geladen"
    description="Team4s lädt die Bereitschafts-Kriterien."
  />
) : null}
```

**Checklisten-Item-Anatomie** (UI-SPEC Zeile 148–167, Analog: Badge-Komposition in GroupMembersTab.tsx Zeilen 332–358):

```typescript
// ReadinessItem: Badge (Status) + Label-Text + optionaler Button (Sprungmarke)
// Bewertbare Kriterien: variant="success" / "warning"
// Informative Zähler (D-06): variant="info" / "neutral" — zählen NICHT gegen „bereit"

<div className={styles.readinessItem}>
  <Badge
    variant={item.satisfied ? 'success' : 'warning'}
    aria-label={item.satisfied ? 'Status: erfüllt' : 'Status: fehlt'}
  >
    {item.satisfied
      ? <><Check size={12} aria-hidden="true" /> erfüllt</>
      : <><AlertCircle size={12} aria-hidden="true" /> fehlt</>
    }
  </Badge>
  <span className={styles.readinessItemLabel}>{item.label}</span>
  {!item.satisfied ? (
    <Button
      variant="subtle"
      size="sm"
      rightIcon={<ArrowRight size={13} aria-hidden="true" />}
      onClick={() => navigateToTab(item.targetTab)}
    >
      {item.hint}
    </Button>
  ) : null}
</div>

// Informativ-Zähler (D-06 — kein satisfied/unsatisfied-Urteil):
<div className={styles.readinessItem}>
  <Badge variant="info" aria-label="Information">
    <Info size={12} aria-hidden="true" /> {item.label}
  </Badge>
  <Button variant="subtle" size="sm" rightIcon={<ArrowRight size={13} aria-hidden="true" />}
    onClick={() => navigateToTab(item.targetTab)}>
    {item.hint}
  </Button>
</div>
```

**Sprungmarken-Navigation** (Analog: page.tsx Zeilen 1189–1207 `handleMainTabChange`):

```typescript
// Props: navigateToTab kommt als Callback-Prop von page.tsx (analog zu onBusy-Callbacks)
// Alternativ: router aus useRouter() direkt in ReadinessTab nutzen

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

function useTabNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return function navigateToTab(tab: string) {
    const next = new URLSearchParams(searchParams.toString())
    next.set('tab', tab)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }
}
```

**Komponent-Struktur-Grenze:**
`ReadinessTab.tsx` ≤ 450 Zeilen (CLAUDE.md Modularity). Falls Checkliste + Preview zusammen
zu groß werden: optionale Aufteilung in `ReadinessChecklist.tsx` + `PublicPreviewPanel.tsx`
als eigenständige Dateien (RESEARCH.md Zeile 137–144). Beide folgen demselben Import-Muster.

---

### `PublicPreviewPanel.tsx` (component, read-only render)

**Analog:** `frontend/src/components/fansubs/FansubProfileTabs.tsx`

**Props-Schnittstelle des Analogs** (FansubProfileTabs.tsx Zeilen 14–19):

```typescript
interface FansubProfileTabsProps {
  group: FansubGroup
  members: FansubMember[]
  projects: AnimeListItem[]
}
```

**Preview-Wrapper-Muster** (Fallback-Strategie aus RESEARCH.md Zeile 488–510):

```typescript
'use client'

import { FansubProfileTabs } from '@/components/fansubs/FansubProfileTabs'
import { GroupLeaderTimeline } from '@/components/fansubs/GroupLeaderTimeline'
import { Badge, Card } from '@/components/ui'
import type { AnimeListItem } from '@/types/anime'
import type { FansubGroup, FansubMember } from '@/types/fansub'
import type { PublicFansubLeaderEntry } from '@/types/fansub'

interface PublicPreviewPanelProps {
  group: FansubGroup
  members: FansubMember[]
  projects: AnimeListItem[]
  leaderTimeline: PublicFansubLeaderEntry[]
}

export function PublicPreviewPanel({ group, members, projects, leaderTimeline }: PublicPreviewPanelProps) {
  // read-only: KEINE onSave/onChange/onEdit-Props — D-01
  // Besucher-Sicht (D-02): keine Admin-spezifischen Aktions-Buttons
  return (
    <Card variant="flat" aria-label="Öffentliche Vorschau (schreibgeschützt)">
      {/* Fallback-Hinweis bis Phase 73 ausgeführt ist */}
      <Badge variant="info">
        Vorschau im Übergangsmodus: Bis die neue öffentliche Seite ausgerollt ist,
        zeigt diese Vorschau die bestehende Darstellung der Fansub-Seite.
      </Badge>
      <GroupLeaderTimeline entries={leaderTimeline} />
      <FansubProfileTabs group={group} members={members} projects={projects} />
    </Card>
  )
}
```

**Kritisch:** `FansubProfileTabs` hat KEINE onSave/onChange-Props — es ist bereits
read-only (Zeilen 62–241 zeigen nur Display-Logik ohne Mutations). Dieses Muster ist
direkt übernehmbar für D-01 (keine Schreib-Interaktionen in der Preview).

**Tab-interne Navigation in FansubProfileTabs:**
`handleTabChange` (Zeile 108–113) nutzt `window.history.replaceState` mit Hash-Fragment —
das ist UNABHÄNGIG vom Workspace-`?tab=`-Routing in page.tsx und erzeugt keinen Konflikt.

---

### `page.tsx` — Chirurgische Erweiterung

**Analog:** Selbst-Referenz — bestehende Andockpunkte

**SectionKey-Typ** (Zeilen 121–132) — Erweiterung um `"readiness"`:

```typescript
// VORHER:
type SectionKey =
  | "basic"
  | "media"
  | "links"
  | "collaboration"
  | "releases"
  | "anime-projekte"
  | "notes"
  | "mitglieder"
  | "rollen"
  | "claims"
  | "vorschlaege";

// NACHHER — minimale Ergänzung:
type SectionKey =
  | "basic"
  | "media"
  | "links"
  | "collaboration"
  | "releases"
  | "anime-projekte"
  | "notes"
  | "mitglieder"
  | "rollen"
  | "claims"
  | "vorschlaege"
  | "readiness";       // NEU — Phase 77
```

**MAIN_TABS** (Zeilen 199–210) — Eintrag am Ende anfügen:

```typescript
// Ergänzung nach "anime-projekte":
{ key: "readiness", label: "Veröffentlichung" },  // NEU — Phase 77
```

**canUseMainTab** (Zeilen 216–250) — neuer Case vor `default`:

```typescript
// Einfügen vor dem default-Zweig (D-08):
case "readiness":
  return capabilities.can_edit_group || capabilities.can_edit_notes;
```

Begründung: `can_edit_group` = Grunddaten/Medien-Pflege-Recht, `can_edit_notes` =
Story/Anime-Einblicke-Pflege-Recht. Reine Mitgliedschaft (`can_view_members` allein)
genügt NICHT (Success Criterion 4, D-08). Kein neues Contract-Feld (Lock K).

**Tab-Render-Zweig** (nach Zeile 3492, analog zu anderen Einzel-Tab-Delegationen):

```typescript
// Analog zu:
{activeMainTab === "mitglieder" ? <GroupMembersTab fansubId={fansubID} /> : null}
{activeMainTab === "rollen" ? <MemberRolesTab fansubId={fansubID} /> : null}

// NEU — Phase 77:
{activeMainTab === "readiness" ? (
  <ReadinessTab
    fansubId={fansubID}
    group={group}       // bereits im page-State vorhanden
  />
) : null}
```

**Import-Ergänzung** (Zeile 1-Bereich, analog zu bestehenden Importen):

```typescript
import { ReadinessTab } from './ReadinessTab'  // NEU — Phase 77
```

**Wichtig:** `page.tsx` ist ~3.800 Zeilen lang. KEINE weitere Logik direkt einpflegen —
alle Readiness-/Preview-Logik gehört in `ReadinessTab.tsx` (RESEARCH.md Fallstrick 1).

---

### `ReadinessTab.test.tsx` (test, Vitest jsdom)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx`

**Test-Datei-Kopf** (page.test.tsx Zeilen 1–56):

```typescript
// @vitest-environment jsdom

import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/fansubs/88/edit',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// API-Mocks — analog zu page.test.tsx apiMocks-Objekt:
const apiMocks = vi.hoisted(() => ({
  listGroupMembers: vi.fn(),
  listPendingMemberClaims: vi.fn(),
  getAdminFansubAnime: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) { super(message); this.status = status }
  },
  ...apiMocks,
}))

afterEach(() => { cleanup(); vi.clearAllMocks() })
```

**beforeEach-Default-Setup** (analog zu page.test.tsx Zeilen 113–176):

```typescript
beforeEach(() => {
  apiMocks.listGroupMembers.mockResolvedValue({ data: [] })
  apiMocks.listPendingMemberClaims.mockResolvedValue([])
  apiMocks.getAdminFansubAnime.mockResolvedValue({ data: [] })
})
```

**Test-Cases nach Req-Map** (aus RESEARCH.md Validation Architecture, Zeilen 614–621):

```typescript
describe('ReadinessTab — Capability-Gating (Req F)', () => {
  it('wird gerendert wenn can_edit_group=true', async () => { ... })
  it('zeigt keinen readiness-Tab wenn nur can_view_members=true', async () => { ... })
})

describe('ReadinessTab — Preview read-only (Req I)', () => {
  it('rendert PublicPreviewPanel ohne Schreib-Buttons', async () => { ... })
})

describe('ReadinessTab — Sprungmarken D-04', () => {
  it('Klick auf Sprungmarke ruft router.replace mit ?tab=media auf', async () => { ... })
})

describe('ReadinessTab — D-06 informative Zähler', () => {
  it('zeigt Claims-Zähler als informativ (kein "fehlt"-Badge)', async () => { ... })
})

describe('ReadinessTab — Lock K: keine neuen Endpunkte', () => {
  it('ruft nur listGroupMembers, listPendingMemberClaims, getAdminFansubAnime auf', async () => { ... })
})
```

---

### `FansubEdit.module.css` — Neue Klassen

**Analog:** Bestehende Klassen in der Datei (z. B. `.fansubEditMembershipSurface` Zeile 58)

**CSS-Token-Pflicht** (UI-SPEC Spacing Scale): Alle Abstände über `var(--space-*)` —
**keine** Hardcode-Pixelwerte.

**Neue Klassen nach bestehendem Muster:**

```css
/* Readiness-Tab — neue Klassen, appended an FansubEdit.module.css */
.readinessTabRoot {
  display: grid;
  gap: var(--space-6);  /* 32px — Trennung Checkliste ↔ Preview (UI-SPEC --space-6) */
}

.readinessList {
  display: grid;
  gap: var(--space-3);  /* 12px — Abstand zwischen Items (bestehende Ausnahme im Token-Set) */
}

.readinessItem {
  display: flex;
  align-items: center;
  gap: var(--space-2);  /* 8px — Innen-Abstand Icon/Badge/Text/Button */
}

.readinessItemLabel {
  flex: 1;
  font-size: var(--text-body);   /* 16px */
  color: var(--text-primary);
}

.readinessSectionDivider {
  margin-block: var(--space-4);  /* 16px */
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--text-secondary) 14%, transparent);
}
```

---

## Shared Patterns

### 1. `'use client'` + CSS-Modul-Merge

**Quelle:** `GroupMembersTab.tsx` Zeilen 1, 36–38;  `AnimeProjectNotesSection.tsx` Zeilen 1, 17–21
**Gilt für:** `ReadinessTab.tsx`, `PublicPreviewPanel.tsx`

```typescript
'use client'
// ...
import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'
const styles = { ...sharedStyles, ...fansubEditStyles }
```

### 2. `@/components/ui` Pflicht-Primitive

**Quelle:** CLAUDE.md `Frontend-UI`; `GroupMembersTab.tsx` Zeilen 6–20
**Gilt für:** Alle neuen Komponenten in Phase 77

Mindest-Primitive für `ReadinessTab.tsx`:
`Badge`, `Button`, `Card`, `SectionHeader`, `EmptyState`, `ErrorState`, `LoadingState`

Verboten: native `<button>`, `<input>`, `<select>`, `<textarea>` für Interaktion
(ESLint `no-restricted-syntax` in `frontend/eslint.config.mjs`).

### 3. Fehler-Handling mit `ApiError`

**Quelle:** `GroupMembersTab.tsx` Zeilen 47–50, 165–170
**Gilt für:** `ReadinessTab.tsx`

```typescript
function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}
```

### 4. Capability-Gating in `canUseMainTab`

**Quelle:** `page.tsx` Zeilen 216–250
**Gilt für:** `page.tsx` — neuer Case `"readiness"`

```typescript
case "readiness":
  return capabilities.can_edit_group || capabilities.can_edit_notes;
```

`hasFansubWorkspaceAccess` (page.tsx Zeile ~793, true wenn irgendeine Capability true)
ist NICHT ausreichend für den Readiness-Tab — zu permissiv (RESEARCH.md Fallstrick 4).

### 5. Tab-Routing via `router.replace` + `?tab=`

**Quelle:** `page.tsx` Zeilen 1189–1207 (`handleMainTabChange`)
**Gilt für:** Sprungmarken in `ReadinessTab.tsx` (D-04)

```typescript
const next = new URLSearchParams(searchParams.toString())
next.set('tab', targetTab)
router.replace(`${pathname}?${next.toString()}`, { scroll: false })
```

Neue Routing-Infrastruktur ist NICHT nötig — dasselbe Muster direkt übernehmen.

### 6. Vitest-Mock-Konventionen

**Quelle:** `page.test.tsx` Zeilen 34–56
**Gilt für:** `ReadinessTab.test.tsx`

```typescript
// vi.hoisted() für API-Mock-Objekte
const apiMocks = vi.hoisted(() => ({
  listGroupMembers: vi.fn(),
  // ...
}))
vi.mock('@/lib/api', () => ({ ApiError: class..., ...apiMocks }))
```

### 7. Deutsche UI-Strings mit korrekten Umlauten

**Quelle:** CLAUDE.md `Sprachqualität`; UI-SPEC Copywriting-Contract Zeile 189–214
**Gilt für:** Alle user-facing Strings in `ReadinessTab.tsx`, `PublicPreviewPanel.tsx`

Verbindliche Strings: Tab-Label `Veröffentlichung`, Badge `erfüllt`/`fehlt`,
Buttons `Im Medien-Tab ergänzen →`, aria-labels `Status: erfüllt` / `Status: fehlt`.
ASCII-Ersatz (ae/oe/ue/ss) ist in Produktcode-Strings VERBOTEN.

---

## Keine Analoge gefunden

Alle Phase-77-Dateien haben solide Analoge. Kein Eintrag nötig.

Hinweis zu Phase-73-Abhängigkeit (RESEARCH.md Zeilen 154–178): Die Phase-73-Section-
Komponenten (FansubHeroSection, FansubStorySection usw.) existieren noch nicht.
`PublicPreviewPanel.tsx` startet daher mit Fallback auf `FansubProfileTabs` +
`GroupLeaderTimeline` (beide verifiziert, bestehend). Nach Phase-73-Ausführung wird
der Preview-Wrapper auf die echten Section-Komponenten migriert — der Planner muss
diese Wave-Sequenz explizit kodieren.

---

## Wichtige API-Seam-Referenzen

| Seam | Funktion | Datei | Zeile | Endpunkt |
|------|----------|-------|-------|----------|
| Mitglieder-Liste | `listGroupMembers(fansubId)` | `api.ts` | 6989 | `GET /api/v1/admin/fansubs/:id/group-members` |
| Offene Claims | `listPendingMemberClaims(fansubId)` | `api.ts` | 3442 | `GET /api/v1/admin/fansubs/:id/member-claims` |
| Anime-Liste | `getAdminFansubAnime(fansubId)` | `api.ts` | 4148 | `GET /api/v1/admin/fansubs/:id/anime` |
| Einladungen | `listClaimInvitations(fansubId, memberId)` | `api.ts` | 3378 | `GET /api/v1/admin/fansubs/:id/group-members/:memberId/claim-invitations` |

Hinweis: `listClaimInvitations` erfordert `memberId` — für den Readiness-Gesamt-Zähler
genügt `listPendingMemberClaims` (gruppen-weite Liste). Lock K: kein neuer Endpunkt.

Logo/Banner-Präsenz: `group.logo_url` / `group.banner_url` aus dem bestehenden `group`-State
in `AdminFansubEditContent` — kein weiterer API-Aufruf nötig.

---

## Metadaten

**Analog-Suchbereich:** `frontend/src/app/admin/fansubs/[id]/edit/`, `frontend/src/components/fansubs/`, `frontend/src/lib/api.ts`, `frontend/src/types/fansub.ts`
**Gescannte Dateien:** 8 Quelldateien vollständig gelesen
**Pattern-Extraktion:** 2026-06-05
