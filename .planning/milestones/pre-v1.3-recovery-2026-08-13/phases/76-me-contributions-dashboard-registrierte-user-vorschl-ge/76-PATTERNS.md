# Phase 76: `/me/contributions` Dashboard + registrierte-User-Vorschläge — Pattern Map

**Erstellt:** 2026-06-05
**Dateien analysiert:** 18 neue/modifizierte Dateien
**Analoga gefunden:** 18 / 18

---

## Datei-Klassifikation

| Neue/Modifizierte Datei | Rolle | Datenfluss | Nächstes Analog | Match-Qualität |
|-------------------------|-------|-----------|-----------------|---------------|
| `frontend/src/app/me/contributions/page.tsx` | route/page | request-response | gleiche Datei (erweitern) | exact |
| `frontend/src/components/contributions/ContributionInbox.tsx` | component | event-driven | `MyContributionsSection.tsx` | role-match |
| `frontend/src/components/contributions/ContributionSummary.tsx` | component | transform | `FansubProfileTabs.tsx` (useMemo-Aggregat) | role-match |
| `frontend/src/components/contributions/ContributionFilters.tsx` | component | event-driven | `FansubVersionBrowser.tsx` (FilterState) | role-match |
| `frontend/src/components/contributions/ReportModal.tsx` | component | request-response | `Modal.tsx` (Primitive) + `ProposalForm.tsx` (Multi-Step) | role-match |
| `frontend/src/components/contributions/ReportFormFehler.tsx` | component | request-response | `ProposalForm.tsx` (Formular-Pattern) | role-match |
| `frontend/src/components/contributions/ReportFormStory.tsx` | component | request-response | `ProposalForm.tsx` (Formular-Pattern) | role-match |
| `frontend/src/components/contributions/ReportFormMedia.tsx` | component | file-I/O | `MediaUpload.tsx` + `ProposalForm.tsx` | role-match |
| `frontend/src/components/contributions/RejectReasonModal.tsx` | component | request-response | `Modal.tsx` + `ContributionCard.tsx` mode=pending | role-match |
| `frontend/src/components/contributions/ContributionCard.tsx` | component | event-driven | gleiche Datei (erweitern) | exact |
| `frontend/src/components/contributions/MyContributionsSection.tsx` | component | CRUD | gleiche Datei (erweitern) | exact |
| `frontend/src/components/contributions/MyProposalsSection.tsx` | component | CRUD | gleiche Datei (refaktorieren) | exact |
| `frontend/src/components/contributions/ProposalForm.tsx` | component | request-response | gleiche Datei (UI-Migration) | exact |
| `frontend/src/components/contributions/VisibilityDropdown.tsx` | component | request-response | gleiche Datei (UI-Migration) | exact |
| `frontend/src/lib/api.ts` | utility | request-response | gleiche Datei (erweitern) | exact |
| `frontend/src/types/contributions.ts` | model | transform | gleiche Datei (erweitern) | exact |
| `backend/internal/handlers/suggestions_me_handler.go` | handler | request-response | `contribution_proposals_me_handler.go` | exact |
| `backend/internal/repository/member_suggestions_repository.go` | repository | CRUD | `anime_contributions_proposal_repository.go` | exact |
| `database/migrations/0097_member_suggestions.up.sql` | migration | — | `database/migrations/0086_anime_contributions.up.sql` | role-match |

---

## Pattern-Zuweisungen

### `frontend/src/app/me/contributions/page.tsx` (route, request-response)

**Analog:** gleiche Datei — erweitern, nicht ersetzen (D-01)

**Import-Pattern** (Zeilen 1–10, bestehend):
```typescript
'use client'

import { useEffect, useState } from 'react'

import { MyContributionsSection } from '@/components/contributions/MyContributionsSection'
import { MyProposalsSection } from '@/components/contributions/MyProposalsSection'
import { Button, ErrorState, LoadingState } from '@/components/ui'
import { ApiError, getMyAnimeContributions } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MeAnimeContribution } from '@/types/contributions'
```

**Auth + Lade-Pattern** (Zeilen 18–53, bestehend):
```typescript
const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
const [contributions, setContributions] = useState<MeAnimeContribution[] | null>(null)
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

const hasAuthSession = hasAccessToken || hasRefreshToken

useEffect(() => {
  let cancelled = false
  async function load() {
    if (!isClientInitialized) return
    if (!hasAuthSession) { setError('Bitte einloggen.'); setIsLoading(false); return }
    try {
      setIsLoading(true); setError(null)
      const response = await getMyAnimeContributions()
      if (!cancelled) setContributions(response.data)
    } catch (loadError) {
      if (!cancelled) setError(readErrorMessage(loadError, 'Beiträge konnten nicht geladen werden.'))
    } finally {
      if (!cancelled) setIsLoading(false)
    }
  }
  void load()
  return () => { cancelled = true }
}, [hasAuthSession, isClientInitialized])
```

**Layout-Erweiterung** — Phase 76 fügt die drei Sektionen in verbindlicher Reihenfolge hinzu (D-02):
```typescript
// NACH Umbau: Inbox oben → Summary/Filter → Listen
return (
  <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Meine Beiträge</h1>
      <Button variant="primary" size="md" onClick={() => setReportOpen(true)}
        aria-label="Vorschlagen oder melden öffnen">
        Vorschlagen / Melden
      </Button>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <ContributionInbox contributions={contributions} onAction={...} />
      <ContributionSummary contributions={contributions} activeFilters={activeFilters} onFilterChange={setActiveFilters} />
      <MyContributionsSection contributions={filtered} onVisibilityChange={...} />
      <MyProposalsSection proposals={filtered} />
    </div>
    <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} onSuccess={reload} />
  </main>
)
```

**Fehlerbehandlungs-Pattern** (Zeilen 55–67, bestehend):
```typescript
if (!isClientInitialized || isLoading) {
  return <LoadingState title="Beiträge werden geladen" description="Team4s lädt deine Beiträge." />
}
if (error || !contributions) {
  return (
    <ErrorState
      title={hasAuthSession ? 'Beiträge konnten nicht geladen werden' : 'Anmeldung erforderlich'}
      description={error ?? 'Unbekannter Fehler'}
      action={<Button href="/login" variant="secondary">Zur Anmeldung</Button>}
    />
  )
}
```

---

### `frontend/src/components/contributions/ContributionInbox.tsx` (component, event-driven)

**Analog:** `frontend/src/components/contributions/MyContributionsSection.tsx` (Zeilen 1–54)

**Import-Pattern** (analog MyContributionsSection, Zeilen 1–9):
```typescript
'use client'

import { Card, EmptyState, SectionHeader } from '@/components/ui'
import type { MeAnimeContribution } from '@/types/contributions'
import { ContributionCard } from './ContributionCard'
import styles from './contributions.module.css'
```

**Inbox-Filter-Pattern** (D-03 — vier Quellen via useMemo):
```typescript
// Quelle: RESEARCH.md Pattern 1 — client-seitig via useMemo (D-03a Disambiguierung)
const inbox = useMemo(() => {
  // D-03a: Leader-zugeordnet = status=proposed UND is_own_proposal=false
  const pending = contributions.filter(
    (c) => c.status === 'proposed' && !c.is_own_proposal
  )
  // D-03b: Bestrittene/im Konflikt
  const disputed = contributions.filter((c) => c.status === 'disputed' && !c.is_own_proposal)
  // D-03c: Eigene abgelehnte Vorschläge
  const rejectedOwn = contributions.filter((c) => c.status === 'disputed' && c.is_own_proposal)
  // D-03d: Frisch bestätigt mit offener Sichtbarkeits-Entscheidung
  const visibilityPending = contributions.filter(
    (c) => c.status === 'confirmed' && !c.is_public_on_member_profile
  )
  return { pending, disputed, rejectedOwn, visibilityPending }
}, [contributions])
```

**Sections-Render-Pattern** (analog MyContributionsSection Zeilen 26–53):
```typescript
return (
  <Card variant="section">
    <SectionHeader
      title="Offene Aktionen"
      description="Diese Punkte brauchen deine Aufmerksamkeit – bestätige Zuordnungen, kläre Widersprüche oder entscheide über die Sichtbarkeit."
    />
    <div className={styles.contributionList}>
      {totalInbox === 0 ? (
        <EmptyState variant="compact" title="Keine offenen Aktionen"
          description="Es gibt gerade nichts zu klären. Neue Zuordnungen oder Rückmeldungen erscheinen hier." />
      ) : (
        <>
          {inbox.pending.map((c) => (
            <ContributionCard key={c.id} contribution={c} mode="pending"
              onConfirm={onConfirm} onReject={onRejectWithReason} />
          ))}
          {/* weitere Quellen ... */}
        </>
      )}
    </div>
  </Card>
)
```

---

### `frontend/src/components/contributions/ContributionSummary.tsx` (component, transform)

**Analog:** `frontend/src/components/fansubs/FansubProfileTabs.tsx` (useMemo-Aggregat, Zeilen 69–88)

**useMemo-Aggregat-Pattern** (D-12):
```typescript
'use client'

import { useMemo, useState } from 'react'
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import type { MeAnimeContribution } from '@/types/contributions'

// Typ für Filter-State (D-12: Achsen Anime/Gruppe/Rolle/Zeitraum/Status)
interface FilterState {
  status: string | null
  group: string | null
  anime: number | null
  role: string | null
  year: number | null
}

// useMemo produziert Zähler pro Achse — analog FansubProfileTabs membersByRole (Z.69-88)
const summary = useMemo(() => {
  const byStatus = new Map<string, number>()
  const byGroup = new Map<string, number>()
  const byRole = new Map<string, number>()
  for (const c of contributions) {
    byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1)
    if (c.fansub_group_name) {
      byGroup.set(c.fansub_group_name, (byGroup.get(c.fansub_group_name) ?? 0) + 1)
    }
    for (const code of c.role_codes) {
      byRole.set(code, (byRole.get(code) ?? 0) + 1)
    }
  }
  return { byStatus, byGroup, byRole }
}, [contributions])
```

**Stat-Chip-Toggle-Pattern** (D-12 — aktiver Chip mit Accent, aria-pressed):
```typescript
// Chip = Button variant="subtle" size="sm" mit aria-pressed
// Aktiver Chip: Accent-Optik (CSS-Klasse oder inline-style via activeFilters-State)
{Array.from(summary.byStatus.entries()).map(([status, count]) => (
  <Button
    key={status}
    variant="subtle"
    size="sm"
    aria-pressed={activeFilters.status === status}
    aria-label={activeFilters.status === status
      ? `Filter aktiv: Status ${status}`
      : `Nach Status ${status} filtern`}
    onClick={() => onFilterChange({ ...activeFilters, status: activeFilters.status === status ? null : status })}
  >
    {statusLabel(status)} ({count})
  </Button>
))}
```

---

### `frontend/src/components/contributions/ContributionFilters.tsx` (component, event-driven)

**Analog:** `frontend/src/components/fansubs/FansubVersionBrowser.tsx` (PersistedFilterState, Zeilen 19–54)

**Filter-State-Pattern** (D-11 — client-seitig, kein Server-Endpoint):
```typescript
// Analog FansubVersionBrowser PersistedFilterState (Z.19-21)
interface ContributionFilterState {
  status: string | null
  group: string | null
  anime: number | null
  role: string | null
  year: number | null
}

// useMemo für gefilterte Liste (D-11) — analog zu MyProposalsSection.filtered
const filtered = useMemo(() =>
  contributions.filter((c) => {
    if (filters.status && c.status !== filters.status) return false
    if (filters.group && c.fansub_group_name !== filters.group) return false
    if (filters.anime && c.anime_id !== filters.anime) return false
    if (filters.role && !c.role_codes.includes(filters.role)) return false
    if (filters.year && c.started_year !== filters.year && c.ended_year !== filters.year) return false
    return true
  }),
  [contributions, filters]
)
```

---

### `frontend/src/components/contributions/ReportModal.tsx` (component, request-response)

**Analog:** `frontend/src/components/ui/Modal.tsx` (Zeilen 1–44) + `ProposalForm.tsx` Multi-Step-Logik

**Modal-Primitive-Pattern** (C2 — ProposalForm-Handgebaut durch Modal-Primitive ersetzen):
```typescript
'use client'

import { useState } from 'react'
import { Button, FormField, Modal, Select } from '@/components/ui'
// NEU: Modal aus @/components/ui (Zeilen 18-44 von Modal.tsx)
// STATT: position:fixed div wie in ProposalForm.tsx Zeilen 134-138

interface ReportModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  prefillType?: SuggestionType       // für „Details korrigieren" (D-10)
  prefillContributionId?: number     // für „Details korrigieren" (D-10)
}

type SuggestionType = 'fehler' | 'story' | 'medien' | 'contribution' | 'claim'

export function ReportModal({ open, onClose, onSuccess, prefillType, prefillContributionId }: ReportModalProps) {
  const [type, setType] = useState<SuggestionType | null>(prefillType ?? null)
  // Schritt-Navigation: type-Auswahl → Zielkontext → typ-spezifisches Formular

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vorschlagen oder melden"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
          {/* Senden-Button je nach aktivem Typ-Formular */}
        </>
      }
    >
      {/* Schritt 1: Typ-Auswahl */}
      {/* Schritt 2: Zielkontext */}
      {/* Schritt 3: typ-spezifisches Formular */}
    </Modal>
  )
}
```

**Schritt-1-Pattern** (Typ-Auswahl — D-05 „Typ → Ziel → Feld"):
```typescript
// Analog ProposalForm-Scope-Auswahl (Zeilen 147-193) — aber mit Button-Primitive statt <button>
<FormField label="Was möchtest du melden oder vorschlagen?" required>
  <div role="group" aria-label="Melde-Typ wählen" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-2)' }}>
    {SUGGESTION_TYPES.map((t) => (
      <Button
        key={t.value}
        type="button"
        variant={type === t.value ? 'primary' : 'secondary'}
        aria-pressed={type === t.value}
        onClick={() => setType(t.value)}
      >
        {t.label}
      </Button>
    ))}
  </div>
</FormField>
```

---

### `frontend/src/components/contributions/ReportFormFehler.tsx` (component, request-response)

**Analog:** `frontend/src/components/contributions/ProposalForm.tsx` (Formular-Pattern, Zeilen 98–131)

**Submit-Pattern** (analog ProposalForm handleSubmit Zeilen 98–131):
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError(null)
  if (!targetId) { setError('Bitte wähle ein Ziel aus.'); return }
  if (!contentText.trim()) { setError('Bitte beschreibe den Fehler oder die Korrektur.'); return }
  try {
    setIsSubmitting(true)
    await submitSuggestion({ suggestion_type: 'error_report', target_type: targetType, target_id: targetId, content_text: contentText.trim() })
    onSuccess()
  } catch (err) {
    setError(err instanceof ApiError ? err.message : 'Der Vorschlag konnte nicht eingereicht werden. Bitte versuche es erneut.')
  } finally {
    setIsSubmitting(false)
  }
}
```

**Formular-Felder** (analog ProposalForm FormField/Select/Textarea, Zeilen 197–258):
```typescript
// Zielkontext-Auswahl
<FormField label="Worauf bezieht sich dein Vorschlag?" htmlFor="fehler-target" required>
  <Select id="fehler-target" value={targetId ?? ''} onChange={...} required>
    <option value="">Ziel auswählen</option>
    {/* Anime / Contribution / Gruppe je nach verfügbaren Daten */}
  </Select>
</FormField>

// Freitext (Pflicht)
<FormField label="Was ist falsch oder unvollständig?" htmlFor="fehler-text" required>
  <Textarea id="fehler-text" value={contentText} onChange={(e) => setContentText(e.target.value)}
    rows={4} placeholder="Beschreibe den Fehler oder die gewünschte Korrektur." required />
</FormField>
```

---

### `frontend/src/components/contributions/ReportFormStory.tsx` (component, request-response)

**Analog:** `frontend/src/components/contributions/ReportFormFehler.tsx` (gleiches Formular-Pattern, anderer `suggestion_type`)

Gleiche Struktur wie `ReportFormFehler.tsx`; `suggestion_type: 'story'`, Textarea-Label angepasst auf „Story vorschlagen".

---

### `frontend/src/components/contributions/ReportFormMedia.tsx` (component, file-I/O)

**Analog:** `frontend/src/components/admin/MediaUpload.tsx` (Upload-Seam, Zeilen 1–7) + `ProposalForm.tsx` (Formular-Shell)

**Upload-Seam-Import-Pattern** (kein neuer Upload-Transport — bestehender `authorizedUploadXhr`):
```typescript
import { authorizedUploadXhr } from '@/lib/api'
import { Button, FormField, Select } from '@/components/ui'
```

**Upload-Flow-Pattern** (Decision-8-Matrix: Owner=Member, review_status='in_review', visibility='internal'):
```typescript
// Analog zu authorizedUploadXhr-Nutzung in MediaUpload.tsx
async function handleUpload(file: File) {
  setIsUploading(true)
  try {
    const result = await authorizedUploadXhr('/api/v1/me/suggestions/media', {
      file,
      fields: {
        target_type: targetType,
        target_id: String(targetId),
        category: category,
        // review_status und visibility setzt Backend auf 'in_review'/'internal' (Decision 8)
      }
    })
    onSuccess()
  } catch (err) { ... }
}
```

**Kategorie + Hinweis-Pattern** (Decision 8, MUSS Select-Primitive nutzen):
```typescript
<FormField label="Kategorie" htmlFor="media-category" required>
  <Select id="media-category" value={category} onChange={(e) => setCategory(e.target.value)} required>
    <option value="">Kategorie wählen</option>
    {MEDIA_CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
  </Select>
</FormField>
<p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
  Hochgeladene Medien sind zunächst nur intern sichtbar und werden vor der Veröffentlichung geprüft.
</p>
```

---

### `frontend/src/components/contributions/RejectReasonModal.tsx` (component, request-response)

**Analog:** `frontend/src/components/ui/Modal.tsx` (Zeilen 18–44)

**Modal mit Pflicht-Begründung** (D-09 — Senden erst nach gültiger Eingabe aktiv):
```typescript
'use client'

import { useState } from 'react'
import { Button, FormField, Modal, Textarea } from '@/components/ui'

interface RejectReasonModalProps {
  open: boolean
  contributionId: number | null
  onClose: () => void
  onConfirm: (contributionId: number, reason: string) => Promise<void>
}

export function RejectReasonModal({ open, contributionId, onClose, onConfirm }: RejectReasonModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = reason.trim().length >= 5  // analog Backend binding:"required,min=5"

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Zuordnung widersprechen"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
          <Button variant="danger" disabled={!isValid || isSubmitting}
            onClick={() => void handleSubmit()}>
            Widerspruch senden
          </Button>
        </>
      }
    >
      <FormField
        label="Warum trifft diese Zuordnung nicht zu?"
        htmlFor="reject-reason"
        hint="Die Begründung ist erforderlich und hilft dem Gruppen-Leader, den Widerspruch einzuordnen. Es wird nichts gelöscht."
        required
      >
        <Textarea id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)}
          rows={3} placeholder="Kurze Begründung…" required />
      </FormField>
      {error && <p role="alert" style={{ color: 'var(--button-danger-start)', fontSize: '0.875rem' }}>{error}</p>}
    </Modal>
  )
}
```

---

### `frontend/src/components/contributions/ContributionCard.tsx` (component, event-driven)

**Analog:** gleiche Datei — erweitern (120 Zeilen, bleibt < 450)

**Erweiterungs-Pattern** für Inbox-Modus (D-03a/D-08/D-09):
```typescript
// Bestehender modes: 'confirmed' | 'pending' | 'proposal'
// Phase 76: mode="pending" wird in Inbox verdrahtet — Buttons bleiben, Text angepasst
// Neues Prop: onRejectWithReason statt onReject (ruft RejectReasonModal auf)
interface ContributionCardProps {
  contribution: MeAnimeContribution
  mode: 'confirmed' | 'pending' | 'proposal'
  onConfirm?: (id: number) => void
  onRejectWithReason?: (id: number) => void   // NEU: öffnet RejectReasonModal (D-09)
  onCorrect?: (id: number) => void             // NEU: öffnet ReportModal prefilled (D-10)
  onVisibilityChange?: (id: number, isPublic: boolean) => void
}
```

**Aktions-Buttons** (D-08 „Das war ich" / D-09 „Das war ich nicht" / D-10 „Details korrigieren"):
```typescript
// Analog bestehende actionsRow (Zeilen 104-117) — mit angepassten Labels
{mode === 'pending' ? (
  <div className={styles.actionsRow}>
    {onConfirm ? (
      <Button size="sm" variant="success" onClick={() => onConfirm(id)}>Das war ich</Button>
    ) : null}
    {onRejectWithReason ? (
      <Button size="sm" variant="danger" onClick={() => onRejectWithReason(id)}>Das war ich nicht</Button>
    ) : null}
    {onCorrect ? (
      <Button size="sm" variant="secondary" onClick={() => onCorrect(id)}>Details korrigieren</Button>
    ) : null}
  </div>
) : null}
```

---

### `frontend/src/components/contributions/VisibilityDropdown.tsx` (component, request-response)

**Analog:** gleiche Datei — UI-Migration (47 Zeilen, aktuell natives `<select>`)

**Migrations-Pattern** (C2 — natives `<select>` → `Select`-Primitive):
```typescript
// VORHER (Zeilen 33-43): natives <select> mit Inline-Styles
// NACHHER: Select aus @/components/ui
import { Select } from '@/components/ui'

// Statt: <select value={...} onChange={handleChange} disabled={loading} style={...}>
<Select
  value={isPublic ? 'public' : 'internal'}
  onChange={async (e) => {
    const nextPublic = e.target.value === 'public'
    setLoading(true)
    setError(null)
    try {
      await patchAnimeContributionVisibility(contributionId, nextPublic)
      onChanged(nextPublic)
    } catch {
      setError('Sichtbarkeit konnte nicht gespeichert werden.')
    } finally {
      setLoading(false)
    }
  }}
  disabled={loading}
  aria-label="Sichtbarkeit dieser Contribution"
>
  <option value="public">Öffentlich im Member-Profil</option>
  <option value="internal">Nur intern sichtbar</option>
</Select>
```

---

### `frontend/src/components/contributions/ProposalForm.tsx` (component, request-response)

**Analog:** gleiche Datei — UI-Migration (294 Zeilen, ≤ 450 mit Split)

**Migrationspunkte** (C2, RESEARCH Befund 5 und Fallstrick 7):

1. **Handgebautes div-Modal → `Modal`-Primitive** (Zeilen 134–138 ersetzen):
```typescript
// VORHER: position:fixed div mit Backdrop
<div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, ... }}>
  <div aria-hidden="true" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
  <div style={{ position: 'relative', background: '#fff', ... }}>

// NACHHER: Modal-Primitive (analog Modal.tsx Zeile 18-44)
<Modal open={true} onClose={onClose} title="Mitwirkung vorschlagen" footer={...}>
  {/* Formular-Inhalt */}
</Modal>
```

2. **Scope-Karten-`<button>` → `Button`-Primitive** (Zeilen 148–188):
```typescript
// VORHER: native <button> mit Inline-Styles und S.btn()
<button type="button" aria-pressed={scope === 'project'} onClick={...} style={{ minHeight: 88, ... }}>

// NACHHER: Button variant="secondary"/"primary" je nach Auswahl
<Button type="button" variant={scope === 'project' ? 'primary' : 'secondary'}
  aria-pressed={scope === 'project'} onClick={() => selectScope('project')}>
  Ganzer Anime / Projekt
</Button>
```

3. **Rollen-Chip-`<button>` → `Button`-Primitive** (Zeilen 239–242):
```typescript
// VORHER: native <button> mit Inline-Styles
<button key={role.code} type="button" onClick={() => toggleRole(role.code)} aria-pressed={sel}
  style={{ padding: '5px 12px', borderRadius: 20, ... }}>

// NACHHER: Button variant="subtle" als Toggle-Chip (oder eigener ToggleChip-Wrapper)
<Button key={role.code} type="button" variant="subtle" size="sm"
  aria-pressed={sel} onClick={() => toggleRole(role.code)}>
  {role.label_de}
</Button>
```

4. **Footer-`<button>` → `Button`-Primitive** (Zeilen 284–289):
```typescript
// VORHER: native <button> mit S.btn()
<button type="button" onClick={onClose} style={S.btn()}>Abbrechen</button>
<button type="submit" disabled={...} style={{ ...S.btn(true) }}>...</button>

// NACHHER
<Button type="button" variant="secondary" onClick={onClose}>Abbrechen</Button>
<Button type="submit" variant="primary" disabled={isSubmitting || scope === 'release_version'}>
  {isSubmitting ? 'Wird gesendet…' : 'Zur Bestätigung senden'}
</Button>
```

---

### `frontend/src/lib/api.ts` (utility, request-response)

**Analog:** gleiche Datei — neue Helfer (Zeilen 7392–7589, bestehende Me-Contributions-Sektion)

**Neuer `rejectAnimeContributionWithReason`-Helfer** (D-09, Lock K — analog `rejectAnimeContribution` Zeilen 7473–7497):
```typescript
export async function rejectAnimeContributionWithReason(
  contributionId: number,
  memberReason: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions/${contributionId}/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_reason: memberReason }),
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}
```

**Neuer `submitSuggestion`-Helfer** (D-06, analog `createContributionProposal` Zeilen 7536–7564):
```typescript
export interface SubmitSuggestionBody {
  suggestion_type: 'error_report' | 'story' | 'media'
  target_type: 'anime' | 'contribution' | 'fansub_group' | 'member'
  target_id: number
  content_text?: string | null
}

export async function submitSuggestion(body: SubmitSuggestionBody): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/suggestions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}
```

**Neuer `getMySuggestions`-Helfer** (analog `getMyAnimeContributions` Zeilen 7394–7416):
```typescript
export async function getMySuggestions(): Promise<MeSuggestionsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/suggestions`,
    { cache: 'no-store' },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<MeSuggestionsResponse>
}
```

---

### `frontend/src/types/contributions.ts` (model, transform)

**Analog:** gleiche Datei — erweitern (Zeilen 75–92, `MeAnimeContribution`)

**Typ-Erweiterung** (RESEARCH Code Examples — drei neue Felder):
```typescript
export interface MeAnimeContribution {
  // ... bestehende Felder (Zeilen 76-92) ...
  fansub_group_name?: string      // NEU Phase 76 — für Gruppen-Filter D-12
  is_own_proposal: boolean        // NEU Phase 76 — server-seitig berechnet (analog can_self_publish)
  member_reason?: string | null   // NEU Phase 76 — eigene Dispute-Begründung D-09
  // created_by ist in AnimeContributionRow bereits vorhanden (embedded struct)
}
```

**Neue `MeSuggestion`-Typen** (D-06/D-07):
```typescript
export interface MeSuggestion {
  id: number
  suggestion_type: 'error_report' | 'story' | 'media'
  target_type: 'anime' | 'contribution' | 'fansub_group' | 'member'
  target_id: number
  content_text: string | null
  status: 'pending' | 'in_review' | 'approved' | 'rejected'
  review_note: string | null
  created_at: string
}

export interface MeSuggestionsResponse {
  data: MeSuggestion[]
}
```

---

### `backend/internal/handlers/suggestions_me_handler.go` (handler, request-response)

**Analog:** `backend/internal/handlers/contribution_proposals_me_handler.go` (Zeilen 1–459)

**Konstruktor-Pattern** (analog `NewContributionProposalsMeHandler` Zeilen 81–101):
```go
package handlers

import (
    "errors"
    "net/http"

    "team4s.v3/backend/internal/middleware"
    "team4s.v3/backend/internal/repository"

    "github.com/gin-gonic/gin"
)

type SuggestionsMeHandler struct {
    suggestionsRepo *repository.MemberSuggestionsRepository
    auditLogRepo    *repository.AuditLogRepository
}

func NewSuggestionsMeHandler(
    suggestionsRepo *repository.MemberSuggestionsRepository,
    auditLogRepo *repository.AuditLogRepository,
) *SuggestionsMeHandler {
    return &SuggestionsMeHandler{
        suggestionsRepo: suggestionsRepo,
        auditLogRepo:    auditLogRepo,
    }
}
```

**Request-DTO-Pattern** (analog `createProposalRequest` Zeilen 208–217):
```go
type createSuggestionRequest struct {
    SuggestionType string  `json:"suggestion_type" binding:"required"`
    TargetType     string  `json:"target_type" binding:"required"`
    TargetID       int64   `json:"target_id" binding:"required,min=1"`
    ContentText    *string `json:"content_text"`
}
```

**Auth + Validierungs-Chain** (analog `CreateProposal` Zeilen 229–361):
```go
func (h *SuggestionsMeHandler) CreateSuggestion(c *gin.Context) {
    identity, ok := requireMeIdentity(c)
    if !ok { return }

    var req createSuggestionRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        badRequest(c, "ungültiger Request-Body")
        return
    }

    // Typ-Validierung (Lock H: kein Schreiben in Contributions-Domäne)
    validTypes := map[string]bool{"error_report": true, "story": true, "media": true}
    if !validTypes[req.SuggestionType] {
        c.JSON(http.StatusUnprocessableEntity, gin.H{
            "error": gin.H{"message": "ungültiger Vorschlagstyp"},
        })
        return
    }

    row, err := h.suggestionsRepo.Create(c.Request.Context(), repository.SuggestionInput{
        SubmitterAppUserID: identity.AppUserID,
        SuggestionType:     req.SuggestionType,
        TargetType:         req.TargetType,
        TargetID:           req.TargetID,
        ContentText:        req.ContentText,
    })
    if errors.Is(err, repository.ErrNotFound) {
        notFound(c, "Ziel nicht gefunden")
        return
    }
    if err != nil {
        internalError(c, "interner Serverfehler")
        return
    }

    // Audit (analog contribution_proposals_me_handler.go Zeilen 351-358)
    _ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
        ActorAppUserID: &identity.AppUserID,
        EventType:      "member_suggestion.submitted",
        TargetType:     req.TargetType,
        TargetID:       &req.TargetID,
        Action:         "submit",
        Outcome:        "allowed",
    })

    c.JSON(http.StatusCreated, gin.H{"data": row})
}
```

**Reject-Erweiterungs-Pattern** für `contributions_me_handler.go` (D-09, analog `updateMyAnimeContributionStatus` Zeilen 222–279):
```go
// Neuer Request-DTO für Reject mit Begründung
type meContributionRejectRequest struct {
    MemberReason string `json:"member_reason" binding:"required,min=5"`
}

// RejectMyAnimeContributionWithReason ersetzt RejectMyAnimeContribution (D-09)
func (h *ContributionsMeHandler) RejectMyAnimeContributionWithReason(c *gin.Context) {
    var req meContributionRejectRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        badRequest(c, "Begründung ist erforderlich.")
        return
    }
    // Ownership-Check + Status-Update analog updateMyAnimeContributionStatus (Zeilen 222-279)
    h.updateMyAnimeContributionStatusWithReason(c, "disputed", false, req.MemberReason)
}
```

---

### `backend/internal/repository/member_suggestions_repository.go` (repository, CRUD)

**Analog:** `backend/internal/repository/anime_contributions_proposal_repository.go` (Zeilen 1–173)

**Repository-Struktur-Pattern** (analog `AnimeContributionsRepository` / `CreateProposal` Zeilen 42–123):
```go
package repository

import (
    "context"
    "fmt"
    "time"
)

type SuggestionInput struct {
    SubmitterAppUserID int64
    SuggestionType     string
    TargetType         string
    TargetID           int64
    ContentText        *string
}

type MemberSuggestionRow struct {
    ID                  int64     `json:"id"`
    SubmitterAppUserID  int64     `json:"submitter_app_user_id"`
    SuggestionType      string    `json:"suggestion_type"`
    TargetType          string    `json:"target_type"`
    TargetID            int64     `json:"target_id"`
    ContentText         *string   `json:"content_text"`
    Status              string    `json:"status"`
    ReviewNote          *string   `json:"review_note"`
    CreatedAt           time.Time `json:"created_at"`
    UpdatedAt           time.Time `json:"updated_at"`
}

type MemberSuggestionsRepository struct {
    db *pgxpool.Pool
}

func NewMemberSuggestionsRepository(db *pgxpool.Pool) *MemberSuggestionsRepository {
    return &MemberSuggestionsRepository{db: db}
}
```

**Create-Pattern** (analog `CreateProposal` Zeilen 42–123 — ohne Transaktion, da kein Rollen-Join):
```go
func (r *MemberSuggestionsRepository) Create(ctx context.Context, input SuggestionInput) (*MemberSuggestionRow, error) {
    var row MemberSuggestionRow
    err := r.db.QueryRow(ctx, `
        INSERT INTO member_suggestions (
            submitter_app_user_id, suggestion_type, target_type, target_id,
            content_text, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
        RETURNING id, submitter_app_user_id, suggestion_type, target_type, target_id,
                  content_text, status, review_note, created_at, updated_at
    `,
        input.SubmitterAppUserID,
        input.SuggestionType,
        input.TargetType,
        input.TargetID,
        input.ContentText,
    ).Scan(
        &row.ID, &row.SubmitterAppUserID, &row.SuggestionType, &row.TargetType, &row.TargetID,
        &row.ContentText, &row.Status, &row.ReviewNote, &row.CreatedAt, &row.UpdatedAt,
    )
    if err != nil {
        if isForeignKeyViolation(err) {
            return nil, fmt.Errorf("vorschlag erstellen: Ziel nicht gefunden: %w", ErrNotFound)
        }
        return nil, fmt.Errorf("vorschlag erstellen: %w", err)
    }
    return &row, nil
}
```

**ListBySubmitter-Pattern** (analog `ListByMemberIDWithProposalFields` Zeilen 233–299):
```go
func (r *MemberSuggestionsRepository) ListBySubmitter(ctx context.Context, appUserID int64) ([]MemberSuggestionRow, error) {
    rows, err := r.db.Query(ctx, `
        SELECT id, submitter_app_user_id, suggestion_type, target_type, target_id,
               content_text, status, review_note, created_at, updated_at
        FROM member_suggestions
        WHERE submitter_app_user_id = $1
        ORDER BY created_at DESC
        LIMIT 100
    `, appUserID)
    // ... rows.Close() + Scan-Loop analog Zeilen 263-299 ...
}
```

---

### `backend/internal/repository/anime_contributions_proposal_repository.go` (Erweiterung für D-09)

**Analog:** gleiche Datei — `Reject`-Methode erweitern (Zeilen 202–218)

**Reject-Erweiterungs-Pattern** (D-09 — `member_reason`-Parameter):
```go
// VORHER (Zeilen 202-218):
func (r *AnimeContributionsRepository) Reject(ctx context.Context, contributionID int64, actorAppUserID int64, reviewNote *string) error {

// NACHHER — MemberReason als neuer Parameter:
func (r *AnimeContributionsRepository) RejectWithMemberReason(
    ctx context.Context, contributionID int64, actorAppUserID int64,
    reviewNote *string, memberReason *string,
) error {
    tag, err := r.db.Exec(ctx, `
        UPDATE anime_contributions
        SET status = 'disputed',
            review_note = $2,
            member_reason = $3,    -- NEU: additive Spalte (Migration 0097 oder 0098)
            updated_at = NOW()
        WHERE id = $1 AND (status = 'proposed' OR status = 'confirmed')
    `, contributionID, reviewNote, memberReason)
    // ... analog bestehende Zeilen 208-218 ...
}
```

---

### `database/migrations/0097_member_suggestions.up.sql` (migration)

**Analog:** `database/migrations/0086_anime_contributions.up.sql` (Tabellen-Struktur-Pattern)

**Migration-Pattern** (RESEARCH Pattern 5 — generische `member_suggestions`-Tabelle, Lock H):
```sql
-- Migration: 0097_member_suggestions.up.sql
-- Neue Tabelle für registrierte-User-Vorschläge (Phase 76, Decision 6)
-- Lock H: KEINE Verbindung zu anime_contributions/member_claims

CREATE TABLE member_suggestions (
    id                    BIGSERIAL PRIMARY KEY,
    submitter_app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    suggestion_type       VARCHAR(40) NOT NULL,
    target_type           VARCHAR(40) NOT NULL,
    target_id             BIGINT NOT NULL,
    content_text          TEXT NULL,
    media_asset_id        BIGINT NULL REFERENCES media_assets(id) ON DELETE SET NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'pending',
    review_note           TEXT NULL,
    reviewer_app_user_id  BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_member_suggestions_type CHECK (
        suggestion_type IN ('error_report', 'story', 'media')
    ),
    CONSTRAINT chk_member_suggestions_target_type CHECK (
        target_type IN ('anime', 'contribution', 'fansub_group', 'member')
    ),
    CONSTRAINT chk_member_suggestions_status CHECK (
        status IN ('pending', 'in_review', 'approved', 'rejected')
    )
);

CREATE INDEX idx_member_suggestions_submitter ON member_suggestions (submitter_app_user_id);
CREATE INDEX idx_member_suggestions_status ON member_suggestions (status);
```

**Additive Spalte für D-09** (separate Migration oder zusammen mit 0097):
```sql
-- Additive Spalte für member_reason auf anime_contributions (D-09)
ALTER TABLE anime_contributions
    ADD COLUMN IF NOT EXISTS member_reason TEXT NULL;

COMMENT ON COLUMN anime_contributions.member_reason IS
    'Pflicht-Begründung des Members bei Widerspruch (Das war ich nicht, Phase 76 D-09)';
```

---

## Gemeinsame Pattern (Cross-Cutting)

### Authentifizierung (alle Me-Endpoints)
**Quelle:** `backend/internal/handlers/contributions_me_handler.go` Zeilen 67–74
```go
// IMMER als erstes in jedem Me-Handler aufrufen:
identity, ok := requireMeIdentity(c)
if !ok { return }
```
**Anwenden auf:** `contributions_me_handler.go` (Erweiterungen), `suggestions_me_handler.go`

### Member-ID-Auflösung
**Quelle:** `backend/internal/handlers/contributions_me_handler.go` Zeilen 82–90
```go
memberID, err := h.resolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
if errors.Is(err, repository.ErrNotFound) {
    c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "kein verifizierter Member-Account verknüpft"}})
    return
}
if err != nil { internalError(c, "interner serverfehler"); return }
```
**Anwenden auf:** alle Handler-Methoden in `contributions_me_handler.go` und `suggestions_me_handler.go`

### Fehlerbehandlung (Backend — `badRequest`/`notFound`/`internalError`)
**Quelle:** `backend/internal/handlers/contributions_me_handler.go` (Nutzung, Zeilen 89, 159, 198, etc.)
Diese Hilfsfunktionen sind in `handlers`-Package vorhanden und werden direkt aufgerufen.

### Fehlerbehandlung (Frontend — `readErrorMessage`/`ApiError`)
**Quelle:** `frontend/src/app/me/contributions/page.tsx` Zeilen 12–16
```typescript
function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
```
**Anwenden auf:** alle neuen Komponenten mit API-Calls (`ContributionInbox`, `ReportModal`, `RejectReasonModal`)

### Audit-Log-Pattern (D-07)
**Quelle:** `backend/internal/handlers/contribution_proposals_me_handler.go` Zeilen 351–358
```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "member_suggestion.submitted",  // event-typ je Aktion
    TargetType:     req.TargetType,
    TargetID:       &req.TargetID,
    Action:         "submit",
    Outcome:        "allowed",
})
```
**Anwenden auf:** `suggestions_me_handler.go` (Submit), `contributions_me_handler.go` (RejectWithReason)

### CSS-Module-Pattern (contributions.module.css)
**Quelle:** `frontend/src/components/contributions/contributions.module.css` (vollständig gelesen)
Neue Klassen für Inbox, Summary, Stat-Chips **ausschließlich mit `--space-*`-Tokens** (C4/UI-SPEC):
```css
/* Neue Klassen analog bestehende contributionList, actionsRow etc. */
.inboxContainer { display: grid; gap: var(--space-4); }
.summaryChips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.statChip { /* Button variant="subtle" wrapping — Styles über Button-Primitive */ }
```
Bestehende Hardcode-Pixel (6/8/10/12/14px) bei Berührung auf Tokens vereinheitlichen.

### UI-Primitives-Pflicht (C1/C2)
**Quelle:** `frontend/src/components/ui/index.ts` (Inventar) + CLAUDE.md
Für jede neue Komponente gilt:
- Modals → `Modal` aus `@/components/ui`
- Dropdowns/Selects → `Select` aus `@/components/ui`
- Formularfelder → `FormField` aus `@/components/ui`
- Textareas → `Textarea` aus `@/components/ui`
- Buttons → `Button` aus `@/components/ui` (niemals native `<button>` außer in `@/components/ui` selbst)
- Statuszähler → `Badge` aus `@/components/ui`

---

## Kein Analog gefunden

Alle Phase-76-Dateien haben ein ausreichendes Analog im bestehenden Codebase. Keine Datei ohne Referenz.

---

## Metadaten

**Analog-Suchbereich:** `frontend/src/app/`, `frontend/src/components/contributions/`, `frontend/src/components/ui/`, `frontend/src/lib/api.ts`, `frontend/src/types/`, `backend/internal/handlers/`, `backend/internal/repository/`, `database/migrations/`
**Gescannte Dateien:** ~25 Quelldateien
**Pattern-Erstellungsdatum:** 2026-06-05
