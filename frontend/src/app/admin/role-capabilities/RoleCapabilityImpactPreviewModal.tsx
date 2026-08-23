'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  ActivationStatusIndicator,
  Badge,
  Button,
  LoadingState,
  Modal,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import {
  ApiError,
  getRoleCapabilityImpactPreview,
  grantRoleCapability,
  listRoleHolders,
  revokeRoleCapability,
} from '@/lib/api'
import type {
  CapabilityOverrideImpactItem,
  CapabilityOverrideImpactPreview,
  EffectiveRightState,
  RoleCapabilityMutationResult,
  RoleHolderEntry,
} from '@/types/admin-capability'

/**
 * CAP-09's frontend closer (Plan 138-13, D-18/D-19/D-20/D-21): every role<->capability matrix
 * toggle now opens THIS modal instead of mutating immediately. It fetches the Plan 138-07
 * batch impact preview (before/after for every real current holder of the role) plus Plan
 * 138-01's role-holder list (for Benutzer/Gruppe display-name joins, no redundant backend join)
 * in parallel, computes the five locked D-19 header counts and a sorted detail table as pure
 * display arithmetic over already-resolved fields (D-14 still holds -- no new precedence
 * logic), blocks the mutation entirely on a compute failure (D-18/D-20), and after a confirmed
 * mutation stays open rendering the honest CAP-10 role-matrix activation status in place (D-21)
 * instead of a fabricated "wird aktiviert" spinner.
 */

export interface RoleCapabilityImpactPreviewModalProps {
  open: boolean
  onClose: () => void
  roleCode: string
  roleLabel: string
  actionCode: string
  actionLabel: string
  /** true = Capability wird der Rolle vergeben (Grant), false = entzogen (Revoke). */
  add: boolean
  /** Wird nach erfolgreicher Mutation aufgerufen, damit der Parent die Matrix neu lädt (loadData(false)). */
  onMutated: () => void
}

type ImpactCategory = 'lose' | 'gain' | 'keep_role' | 'keep_override' | 'unaffected'

interface ImpactRow {
  targetUserId: number
  displayName: string
  groupName: string
  beforeAllowed: boolean
  afterAllowed: boolean
  category: ImpactCategory
  reason: string
}

interface ImpactSummary {
  totalHolders: number
  lose: number
  gain: number
  keepRole: number
  keepOverride: number
  rows: ImpactRow[]
}

const PAGE_SIZE = 25

/** Rein clientseitige Kategorisierung über bereits aufgelöste Felder (D-14 -- keine neue Präzedenzlogik). */
function categorizeImpact(before: EffectiveRightState, after: EffectiveRightState): ImpactCategory {
  if (before.allowed && !after.allowed) return 'lose'
  if (!before.allowed && after.allowed) return 'gain'
  if (before.allowed && after.allowed && after.decisive_source === 'group_role') return 'keep_role'
  if (before.allowed && after.allowed && after.decisive_source === 'user_allow') return 'keep_override'
  return 'unaffected'
}

/** Locked D-19-Beispieltabelle als Vorlage ("Webmaster gewährt ebenfalls", "keine weitere Quelle", ...). */
function impactReasonText(category: ImpactCategory, after: EffectiveRightState, roleCode: string): string {
  switch (category) {
    case 'lose':
      return 'keine weitere Quelle'
    case 'gain':
      return 'wird durch diese Änderung gewährt'
    case 'keep_role': {
      const otherRoles = after.granting_roles.filter((role) => role !== roleCode)
      return otherRoles.length > 0 ? `${otherRoles.join(', ')} gewährt ebenfalls` : 'weitere Rolle gewährt ebenfalls'
    }
    case 'keep_override':
      return 'persönliche zusätzliche Erlaubnis'
    default:
      return 'unverändert'
  }
}

/**
 * Verbindet jedes Preview-Item mit dem korrespondierenden Rolleninhaber. Der Backend-Handler
 * iteriert `holders` in genau der Reihenfolge, in der `listRoleHolders` sie liefert, und hängt
 * pro Holder EIN Ergebnis an (auch wenn `target_user_id` bei einem Mehrfach-Gruppen-Inhaber
 * wiederholt vorkommt) -- Index-Zip ist deshalb korrekt und eindeutig, eine reine
 * target_user_id-Map wäre bei Mehrfachgruppen-Mitgliedern nicht eindeutig. Fällt defensiv auf
 * eine ID-Suche zurück, falls beide Listen (z.B. durch einen Netzwerk-Race) je aus der Reihe
 * geraten sein sollten.
 */
function resolveHolder(
  item: CapabilityOverrideImpactItem,
  index: number,
  holders: RoleHolderEntry[],
): RoleHolderEntry | undefined {
  const byIndex = holders[index]
  if (byIndex && byIndex.app_user_id === item.target_user_id) return byIndex
  return holders.find((holder) => holder.app_user_id === item.target_user_id)
}

function buildImpactSummary(
  preview: CapabilityOverrideImpactPreview,
  holders: RoleHolderEntry[],
  roleCode: string,
): ImpactSummary {
  let lose = 0
  let gain = 0
  let keepRole = 0
  let keepOverride = 0

  const rows: ImpactRow[] = preview.items.map((item, index) => {
    const holder = resolveHolder(item, index, holders)
    const category = categorizeImpact(item.before, item.after)
    if (category === 'lose') lose += 1
    else if (category === 'gain') gain += 1
    else if (category === 'keep_role') keepRole += 1
    else if (category === 'keep_override') keepOverride += 1

    return {
      targetUserId: item.target_user_id,
      displayName: holder?.display_name ?? `Benutzer #${item.target_user_id}`,
      groupName: holder?.fansub_group_name ?? '–',
      beforeAllowed: item.before.allowed,
      afterAllowed: item.after.allowed,
      category,
      reason: impactReasonText(category, item.after, roleCode),
    }
  })

  // 138-RESEARCH.md/UI-SPEC empfohlene Sortierung: "verliert das Recht" (höchstes Risiko)
  // zuerst -- Array.prototype.sort ist stabil, daher bleibt die Reihenfolge innerhalb jeder
  // Gruppe sonst unverändert (Backend-Iterationsreihenfolge).
  const sortedRows = [...rows].sort((a, b) => {
    const aWeight = a.category === 'lose' ? 0 : 1
    const bWeight = b.category === 'lose' ? 0 : 1
    return aWeight - bWeight
  })

  return {
    totalHolders: preview.affected_user_count,
    lose,
    gain,
    keepRole,
    keepOverride,
    rows: sortedRows,
  }
}

function allowedLabel(allowed: boolean): string {
  return allowed ? 'erlaubt' : 'nicht erlaubt'
}

export function RoleCapabilityImpactPreviewModal({
  open,
  onClose,
  roleCode,
  roleLabel,
  actionCode,
  actionLabel,
  add,
  onMutated,
}: RoleCapabilityImpactPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [preview, setPreview] = useState<CapabilityOverrideImpactPreview | null>(null)
  const [holders, setHolders] = useState<RoleHolderEntry[]>([])
  const [page, setPage] = useState(1)

  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [mutationResult, setMutationResult] = useState<RoleCapabilityMutationResult | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    setIsLoading(true)
    setPreviewError(null)
    setPreview(null)
    setHolders([])
    setPage(1)
    setMutationError(null)
    setMutationResult(null)

    Promise.all([getRoleCapabilityImpactPreview(roleCode, actionCode, add), listRoleHolders(roleCode)])
      .then(([previewResult, holdersResult]) => {
        if (cancelled) return
        setPreview(previewResult)
        setHolders(holdersResult)
      })
      .catch((err) => {
        if (cancelled) return
        setPreviewError(err instanceof ApiError ? err.message : 'Serverfehler beim Berechnen der Vorschau.')
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, roleCode, actionCode, add])

  const summary = useMemo(() => {
    if (!preview) return null
    return buildImpactSummary(preview, holders, roleCode)
  }, [preview, holders, roleCode])

  const pageCount = summary ? Math.max(1, Math.ceil(summary.rows.length / PAGE_SIZE)) : 1
  const pageRows = summary ? summary.rows.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE) : []

  async function handleConfirm() {
    setIsMutating(true)
    setMutationError(null)
    try {
      const result = add
        ? await grantRoleCapability(roleCode, actionCode)
        : await revokeRoleCapability(roleCode, actionCode)
      setMutationResult(result)
      onMutated()
    } catch (err) {
      setMutationError(err instanceof ApiError ? err.message : 'Änderung konnte nicht gespeichert werden.')
    } finally {
      setIsMutating(false)
    }
  }

  const title = `Auswirkungs-Vorschau: ${actionLabel} für ${roleLabel}`

  // D-18/D-20: keine Mutation ohne erfolgreich berechnete Vorschau -- ein Vorschau-Fehler
  // sperrt "Änderung übernehmen" dauerhaft für diesen Öffnungszyklus.
  const confirmDisabled = isLoading || Boolean(previewError) || isMutating || mutationResult !== null

  const footer =
    mutationResult !== null ? (
      <Button variant="secondary" onClick={onClose}>
        Schließen
      </Button>
    ) : (
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose} disabled={isMutating}>
          Abbrechen
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={confirmDisabled}>
          {isMutating ? 'Wird verarbeitet …' : 'Änderung übernehmen'}
        </Button>
      </div>
    )

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg" footer={footer}>
      {isLoading && <LoadingState title="Auswirkungs-Vorschau wird geladen …" description="" />}

      {!isLoading && previewError && (
        <p role="alert" style={{ color: 'var(--color-error)' }}>
          Auswirkungs-Vorschau nicht verfügbar. Die Auswirkungen konnten nicht berechnet werden. Ohne
          Vorschau wird keine Änderung übernommen.
        </p>
      )}

      {!isLoading && !previewError && mutationResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <ActivationStatusIndicator path="role_matrix" cacheReloadSucceeded={mutationResult.cache_reload_succeeded} />
        </div>
      )}

      {!isLoading && !previewError && !mutationResult && summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>{summary.totalHolders} Rolleninhaber</span>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>{summary.lose} verlieren das Recht</span>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>{summary.gain} gewinnen das Recht</span>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>
              {summary.keepRole} behalten es über eine andere Rolle
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>
              {summary.keepOverride} behalten es über eine persönliche Abweichung
            </span>
          </div>

          {summary.rows.length === 0 ? (
            <p>Keine Rolleninhaber betroffen.</p>
          ) : (
            <>
              <Table variant="compact">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Benutzer</TableHeaderCell>
                    <TableHeaderCell>Gruppe</TableHeaderCell>
                    <TableHeaderCell>vorher</TableHeaderCell>
                    <TableHeaderCell>nachher</TableHeaderCell>
                    <TableHeaderCell>Grund</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.map((row, index) => (
                    <TableRow key={`${row.targetUserId}-${row.groupName}-${index}`}>
                      <TableCell>{row.displayName}</TableCell>
                      <TableCell>{row.groupName}</TableCell>
                      <TableCell>
                        <Badge variant={row.beforeAllowed ? 'success' : 'muted'}>
                          {allowedLabel(row.beforeAllowed)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.afterAllowed ? 'success' : 'muted'}>
                          {allowedLabel(row.afterAllowed)}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination currentPage={page} totalPages={pageCount} onPageChange={setPage} />
            </>
          )}

          {mutationError && (
            <p role="alert" style={{ color: 'var(--color-error)' }}>
              {mutationError}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
