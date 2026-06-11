'use client'

import { useEffect, useState } from 'react'
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react'

import {
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  Select,
} from '@/components/ui'
import {
  deleteAnimeContribution,
  listEffectiveContributionsForVersion,
  listUnifiedGroupMembers,
  upsertAnimeContribution,
} from '@/lib/api'
import type { EffectiveContributionRow, UnifiedGroupMember } from '@/types/fansub'

import { ContributorAvatar } from './ContributorAvatar'
import styles from './FansubEdit.module.css'

// STATISCHE LISTE — kein /role-definitions-Endpoint vorhanden. Folgearbeit: Katalog-Endpoint + dynamischer Abruf.
const ANIME_CONTRIBUTION_ROLES: { code: string; label: string }[] = [
  { code: 'translator', label: 'Übersetzer' },
  { code: 'timer', label: 'Timer' },
  { code: 'typesetter', label: 'Typesetter' },
  { code: 'editor', label: 'Editor' },
  { code: 'encoder', label: 'Encoder' },
  { code: 'raw_provider', label: 'Raw-Provider' },
  { code: 'quality_checker', label: 'Qualitätsprüfer' },
  { code: 'designer', label: 'Designer' },
]

function getRoleLabel(code: string): string {
  return ANIME_CONTRIBUTION_ROLES.find((r) => r.code === code)?.label ?? code
}

interface ReleaseContributionDrawerProps {
  open: boolean
  fansubId: number
  animeId: number
  releaseVersionId: number
  releaseTitle: string
  onClose: () => void
  onSaved: () => void
}

export function ReleaseContributionDrawer({
  open,
  fansubId,
  animeId,
  releaseVersionId,
  releaseTitle,
  onClose,
  onSaved,
}: ReleaseContributionDrawerProps) {
  const [stagedRows, setStagedRows] = useState<EffectiveContributionRow[]>([])
  const [removedIds, setRemovedIds] = useState<number[]>([])
  const [members, setMembers] = useState<UnifiedGroupMember[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingRow, setAddingRow] = useState(false)
  const [newMemberId, setNewMemberId] = useState<number | null>(null)
  const [newRoleCode, setNewRoleCode] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setStagedRows([])
    setRemovedIds([])
    setAddingRow(false)
    setNewMemberId(null)
    setNewRoleCode(null)

    Promise.all([
      listUnifiedGroupMembers(fansubId),
      listEffectiveContributionsForVersion(releaseVersionId, fansubId),
    ])
      .then(([membersResult, contributionsResult]) => {
        if (cancelled) return
        setMembers(membersResult ?? [])
        setStagedRows(contributionsResult.data ?? [])
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, fansubId, releaseVersionId])

  function handleRemove(row: EffectiveContributionRow) {
    setStagedRows((prev) => prev.filter((r) => r.contribution_id !== row.contribution_id))
    setRemovedIds((prev) => [...prev, row.contribution_id])
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await Promise.all(
        removedIds.map((id) => deleteAnimeContribution(fansubId, animeId, id)),
      )
      onSaved()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Speichern fehlgeschlagen. Bitte Eingaben prüfen und erneut versuchen.',
      )
    } finally {
      setSaving(false)
    }
  }

  function handleAddConfirm() {
    if (newMemberId == null || newRoleCode == null) return
    const member = members.find((m) => m.member_id === newMemberId)
    if (!member) return

    // Synthetic row — contribution_id wird vom Backend vergeben, temporär negative ID
    const tempId = -(Date.now())
    const newRow: EffectiveContributionRow = {
      contribution_id: tempId,
      member_id: member.member_id,
      member_display_name: member.display_name,
      member_avatar_url: null,
      role_codes: [newRoleCode],
    }

    setStagedRows((prev) => [...prev, newRow])

    // Direkt upsert — neuer Eintrag wird sofort persistiert beim Speichern
    upsertAnimeContribution(fansubId, animeId, {
      member_id: member.member_id,
      role_codes: [newRoleCode],
      release_version_id: releaseVersionId,
      started_year: null,
      ended_year: null,
      note: null,
      is_public_on_anime_page: false,
      is_public_on_member_profile: false,
      status: 'confirmed',
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Hinzufügen fehlgeschlagen.')
      setStagedRows((prev) => prev.filter((r) => r.contribution_id !== tempId))
    })

    setAddingRow(false)
    setNewMemberId(null)
    setNewRoleCode(null)
  }

  const assignedMemberIds = new Set(stagedRows.map((r) => r.member_id))
  const availableMembers = members.filter((m) => !assignedMemberIds.has(m.member_id))

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={saving}>
        Abbrechen
      </Button>
      <Button variant="primary" onClick={handleSave} loading={saving}>
        Speichern
      </Button>
    </>
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Mitwirkende"
      description={`Rollen für ${releaseTitle}`}
      footer={footer}
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="Fehler" description={error} />
      ) : (
        <>
          {stagedRows.length === 0 && !addingRow ? (
            <EmptyState
              title="Noch keine Mitwirkenden"
              description="Füge Rollen und Personen für diese Release-Version hinzu."
            />
          ) : (
            <div>
              {stagedRows.map((row) => (
                <div key={row.contribution_id} className={styles.contributionRow}>
                  <span className={styles.contributionRoleLabel}>
                    {row.role_codes.map(getRoleLabel).join(', ')}
                  </span>
                  <ContributorAvatar
                    name={row.member_display_name}
                    avatarUrl={row.member_avatar_url}
                  />
                  <span className={styles.contributionMemberName}>
                    {row.member_display_name}
                  </span>
                  <div className={styles.contributionRowActions}>
                    <Button
                      variant="ghost"
                      iconOnly
                      size="sm"
                      aria-label="Rolle ändern"
                    >
                      <MoreHorizontal size={18} />
                    </Button>
                    <Button
                      variant="danger"
                      iconOnly
                      size="sm"
                      aria-label="Mitwirkende entfernen"
                      onClick={() => handleRemove(row)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {addingRow ? (
            <div className={styles.contributionRow}>
              <FormField label="Rolle" htmlFor="new-role-select">
                <Select
                  id="new-role-select"
                  value={newRoleCode ?? ''}
                  onChange={(e) => setNewRoleCode(e.currentTarget.value || null)}
                >
                  <option value="">Rolle wählen</option>
                  {ANIME_CONTRIBUTION_ROLES.map((role) => (
                    <option key={role.code} value={role.code}>
                      {role.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Person" htmlFor="new-member-select">
                <Select
                  id="new-member-select"
                  value={newMemberId != null ? String(newMemberId) : ''}
                  onChange={(e) =>
                    setNewMemberId(e.currentTarget.value ? Number(e.currentTarget.value) : null)
                  }
                >
                  <option value="">Person wählen</option>
                  {availableMembers.map((m) => (
                    <option key={m.member_id} value={m.member_id}>
                      {m.display_name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddConfirm}
                disabled={newMemberId == null || newRoleCode == null}
              >
                Hinzufügen
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAddingRow(false)}>
                Abbrechen
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              leftIcon={<Plus size={16} />}
              onClick={() => setAddingRow(true)}
            >
              Rolle / Person hinzufügen
            </Button>
          )}
        </>
      )}
    </Drawer>
  )
}
