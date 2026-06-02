'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Badge, Button, Modal } from '@/components/ui'
import {
  ApiError,
  createMemberRole,
  deleteMemberRole,
  listGroupMembers,
  listMemberRoles,
  updateMemberRole,
} from '@/lib/api'
import type {
  CreateMemberRoleRequest,
  HistFansubGroupMember,
  HistGroupMemberRole,
} from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

type MemberRolesTabProps = {
  fansubId: number
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS: number[] = []
for (let y = CURRENT_YEAR; y >= 1980; y--) {
  YEAR_OPTIONS.push(y)
}

const GROUP_HISTORY_ROLE_OPTIONS = [
  { code: 'founder', label: 'Gründer/in' },
  { code: 'leader', label: 'Gruppenleitung' },
  { code: 'co_leader', label: 'Co-Leitung' },
  { code: 'project_lead', label: 'Projektleitung' },
  { code: 'project_manager', label: 'Projektmanagement' },
]

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

function formatZeitraum(role: HistGroupMemberRole): string {
  const von = role.started_year ?? '?'
  const bis = role.ended_year ?? 'heute'
  return `${von} – ${bis}`
}

function statusBadgeVariant(status: HistGroupMemberRole['status']): 'info' | 'muted' {
  return status === 'confirmed' ? 'info' : 'muted'
}

function statusLabel(status: HistGroupMemberRole['status']): string {
  return status === 'confirmed' ? 'bestätigt' : 'historisch'
}

type FormFields = {
  memberId: string
  roleCode: string
  startedYear: string
  endedYear: string
  note: string
  status: 'historical' | 'confirmed'
}

const EMPTY_FORM: FormFields = {
  memberId: '',
  roleCode: '',
  startedYear: '',
  endedYear: '',
  note: '',
  status: 'historical',
}

function roleToForm(role: HistGroupMemberRole): FormFields {
  return {
    memberId: String(role.fansub_group_member_id),
    roleCode: role.role_code,
    startedYear: role.started_year != null ? String(role.started_year) : '',
    endedYear: role.ended_year != null ? String(role.ended_year) : '',
    note: role.note ?? '',
    status: role.status,
  }
}

export function MemberRolesTab({ fansubId }: MemberRolesTabProps) {
  const [roles, setRoles] = useState<HistGroupMemberRole[]>([])
  const [members, setMembers] = useState<HistFansubGroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HistGroupMemberRole | null>(null)
  const [form, setForm] = useState<FormFields>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const membersRes = await listGroupMembers(fansubId)
      const allMembers = membersRes.data ?? []
      const roleResponses = await Promise.all(
        allMembers.map((m) => listMemberRoles(fansubId, m.id))
      )
      const allRoles = roleResponses.flatMap((r, index) =>
        (r.data ?? []).map((role) => ({
          ...role,
          member_display_name: role.member_display_name || allMembers[index]?.display_name || '',
        }))
      )
      const sorted = [...allRoles].sort((a, b) => {
        const ay = a.started_year ?? 0
        const by = b.started_year ?? 0
        return by - ay
      })
      setRoles(sorted)
      setMembers(allMembers)
    } catch (err) {
      setError(formatApiError(err, 'Rollen konnten nicht geladen werden.'))
    } finally {
      setLoading(false)
    }
  }, [fansubId])

  useEffect(() => {
    void load()
  }, [load])

  function openNew() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setModalError(null)
    setModalOpen(true)
  }

  function openEdit(role: HistGroupMemberRole) {
    setEditTarget(role)
    setForm(roleToForm(role))
    setModalError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
    setModalError(null)
  }

  async function handleSave() {
    if (!form.memberId) {
      setModalError('Bitte ein Mitglied auswählen.')
      return
    }
    if (!form.roleCode.trim()) {
      setModalError('Rollenbezeichnung darf nicht leer sein.')
      return
    }

    const startedYear = form.startedYear ? Number(form.startedYear) : null
    const endedYear = form.endedYear ? Number(form.endedYear) : null

    if (startedYear !== null && endedYear !== null && endedYear < startedYear) {
      setModalError('Bis-Jahr darf nicht vor dem Von-Jahr liegen.')
      return
    }

    try {
      setSaving(true)
      setModalError(null)

      if (editTarget) {
        await updateMemberRole(fansubId, editTarget.id, {
          role_code: form.roleCode.trim(),
          started_year: startedYear,
          ended_year: endedYear,
          source_note: form.note.trim() || null,
          status: form.status,
          visibility: 'internal',
        })
      } else {
        const body: CreateMemberRoleRequest = {
          hist_fansub_group_member_id: Number(form.memberId),
          role_code: form.roleCode.trim(),
          started_year: startedYear,
          ended_year: endedYear,
          source_note: form.note.trim() || null,
          status: form.status,
          visibility: 'internal',
        }
        await createMemberRole(fansubId, body)
      }

      await load()
      closeModal()
    } catch (err) {
      setModalError(formatApiError(err, 'Rolle konnte nicht gespeichert werden.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(role: HistGroupMemberRole) {
    if (!window.confirm(`Rolleneintrag für "${role.member_display_name}" wirklich löschen?`)) return

    try {
      await deleteMemberRole(fansubId, role.id)
      await load()
    } catch (err) {
      setError(formatApiError(err, 'Rolle konnte nicht gelöscht werden.'))
    }
  }

  return (
    <div className={styles.fansubEditMembershipSurface}>
      <div className={styles.fansubEditMembershipIntro}>
        <div>
          <p className={styles.fansubEditBasicEyebrow}>Rollen & Zeiträume</p>
          <h3 className={styles.fansubEditMembershipTitle}>Rollen/Timeline</h3>
          <p className={styles.fansubEditHint}>
            Historische Rollen und Zeiträume der Gruppenmitglieder.
            Leader-Zeiträume können hier mit Jahresangaben erfasst werden.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={15} aria-hidden="true" />}
          onClick={openNew}
        >
          Rolle hinzufügen
        </Button>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {loading ? <div className={styles.fansubEditReleaseState}>Rollen werden geladen...</div> : null}

      {!loading && !error && roles.length === 0 ? (
        <div className={styles.fansubEditMembershipEmpty}>
          <strong>Noch keine Rolleneinträge vorhanden</strong>
          <p className={styles.fansubEditHint}>
            Füge den ersten Rolleneintrag hinzu, um die Timeline aufzubauen.
          </p>
        </div>
      ) : null}

      {!loading && roles.length > 0 ? (
        <div className={styles.fansubEditMembershipList}>
          {roles.map((role) => (
            <div key={role.id} className={styles.fansubEditMembershipCard}>
              <div className={styles.fansubEditMembershipCardTop}>
                <div className={styles.fansubEditMembershipIdentity}>
                  <strong>
                    {formatZeitraum(role)}&nbsp;&nbsp;{role.member_display_name}&nbsp;&nbsp;
                    {role.role_label ?? role.role_code}
                  </strong>
                  {role.note ? (
                    <span className={styles.fansubEditHint}>{role.note}</span>
                  ) : null}
                </div>
                <div className={styles.fansubEditMembershipControls}>
                  <Badge variant={statusBadgeVariant(role.status)}>
                    {statusLabel(role.status)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Pencil size={14} aria-hidden="true" />}
                    onClick={() => openEdit(role)}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 size={14} aria-hidden="true" />}
                    onClick={() => void handleDelete(role)}
                  >
                    Löschen
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Rolle bearbeiten' : 'Rolle hinzufügen'}
        description="Historischen Rolleneintrag für ein Gruppenmitglied anlegen oder bearbeiten."
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {modalError ? <div className={styles.errorBox}>{modalError}</div> : null}

          <label>
            <span className={styles.fansubEditHint}>Mitglied (Pflichtfeld)</span>
            <select
              value={form.memberId}
              onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
              aria-label="Mitglied auswählen"
              disabled={!!editTarget}
            >
              <option value="">– Mitglied wählen –</option>
              {members.map((m) => (
                <option key={m.id} value={String(m.id)}>{m.display_name}</option>
              ))}
            </select>
          </label>

          <label>
            <span className={styles.fansubEditHint}>Rolle (Pflichtfeld)</span>
            <select
              value={form.roleCode}
              onChange={(e) => setForm((f) => ({ ...f, roleCode: e.target.value }))}
              aria-label="Rolle auswählen"
            >
              <option value="">Rolle auswählen…</option>
              {GROUP_HISTORY_ROLE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span className={styles.fansubEditHint}>Von-Jahr (optional)</span>
            <select
              value={form.startedYear}
              onChange={(e) => setForm((f) => ({ ...f, startedYear: e.target.value }))}
              aria-label="Von-Jahr"
            >
              <option value="">– kein Jahr –</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </label>

          <label>
            <span className={styles.fansubEditHint}>Bis-Jahr (optional)</span>
            <select
              value={form.endedYear}
              onChange={(e) => setForm((f) => ({ ...f, endedYear: e.target.value }))}
              aria-label="Bis-Jahr"
            >
              <option value="">– kein Jahr –</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </label>

          <label>
            <span className={styles.fansubEditHint}>Notiz (optional)</span>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ergänzende Anmerkung"
              aria-label="Notiz"
            />
          </label>

          <label>
            <span className={styles.fansubEditHint}>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'historical' | 'confirmed' }))}
              aria-label="Status"
            >
              <option value="historical">historisch</option>
              <option value="confirmed">bestätigt</option>
            </select>
          </label>

          <Button
            variant="primary"
            onClick={() => void handleSave()}
            disabled={saving || !form.memberId || !form.roleCode.trim()}
          >
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
