'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Badge, Button, Modal } from '@/components/ui'
import {
  ApiError,
  createGroupMember,
  deleteGroupMember,
  listGroupMembers,
  updateGroupMember,
} from '@/lib/api'
import type { CreateGroupMemberRequest, HistFansubGroupMember } from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

type GroupMembersTabProps = {
  fansubId: number
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS: number[] = []
for (let y = CURRENT_YEAR; y >= 1980; y--) {
  YEAR_OPTIONS.push(y)
}

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

function formatZeitraum(member: HistFansubGroupMember): string {
  const von = member.joined_year ?? '?'
  const bis = member.left_year ?? 'aktiv'
  return `${von} – ${bis}`
}

function statusBadgeVariant(status: HistFansubGroupMember['status']): 'success' | 'muted' {
  return status === 'active' ? 'success' : 'muted'
}

function statusLabel(status: HistFansubGroupMember['status']): string {
  return status === 'active' ? 'aktiv' : 'Alumnus'
}

type FormFields = {
  displayName: string
  joinedYear: string
  leftYear: string
  appUserId: string
  status: 'active' | 'alumni'
}

const EMPTY_FORM: FormFields = {
  displayName: '',
  joinedYear: '',
  leftYear: '',
  appUserId: '',
  status: 'active',
}

function memberToForm(m: HistFansubGroupMember): FormFields {
  return {
    displayName: m.display_name,
    joinedYear: m.joined_year != null ? String(m.joined_year) : '',
    leftYear: m.left_year != null ? String(m.left_year) : '',
    appUserId: m.app_user_id != null ? String(m.app_user_id) : '',
    status: m.status,
  }
}

export function GroupMembersTab({ fansubId }: GroupMembersTabProps) {
  const [members, setMembers] = useState<HistFansubGroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HistFansubGroupMember | null>(null)
  const [form, setForm] = useState<FormFields>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await listGroupMembers(fansubId)
      setMembers(response.data)
    } catch (err) {
      setError(formatApiError(err, 'Mitglieder konnten nicht geladen werden.'))
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

  function openEdit(member: HistFansubGroupMember) {
    setEditTarget(member)
    setForm(memberToForm(member))
    setModalError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
    setModalError(null)
  }

  async function handleSave() {
    if (!form.displayName.trim()) {
      setModalError('Anzeigename darf nicht leer sein.')
      return
    }

    const joinedYear = form.joinedYear ? Number(form.joinedYear) : null
    const leftYear = form.leftYear ? Number(form.leftYear) : null
    const appUserId = form.appUserId ? Number(form.appUserId) : null

    if (appUserId !== null && (!Number.isInteger(appUserId) || appUserId <= 0)) {
      setModalError('App-Nutzer-ID muss eine positive ganze Zahl sein.')
      return
    }
    if (joinedYear !== null && leftYear !== null && leftYear < joinedYear) {
      setModalError('Austrittsjahr darf nicht vor dem Beitrittsjahr liegen.')
      return
    }

    try {
      setSaving(true)
      setModalError(null)

      if (editTarget) {
        await updateGroupMember(fansubId, editTarget.id, {
          display_name: form.displayName.trim(),
          joined_year: joinedYear,
          left_year: leftYear,
          app_user_id: appUserId,
          status: form.status,
        })
      } else {
        const body: CreateGroupMemberRequest = {
          display_name: form.displayName.trim(),
          joined_year: joinedYear,
          left_year: leftYear,
          app_user_id: appUserId,
          status: form.status,
        }
        await createGroupMember(fansubId, body)
      }

      await load()
      closeModal()
    } catch (err) {
      setModalError(formatApiError(err, 'Mitglied konnte nicht gespeichert werden.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(member: HistFansubGroupMember) {
    if (!window.confirm(`Mitglied "${member.display_name}" wirklich löschen?`)) return

    try {
      await deleteGroupMember(fansubId, member.id)
      await load()
    } catch (err) {
      setError(formatApiError(err, 'Mitglied konnte nicht gelöscht werden.'))
    }
  }

  return (
    <div className={styles.fansubEditMembershipSurface}>
      <div className={styles.fansubEditMembershipIntro}>
        <div>
          <p className={styles.fansubEditBasicEyebrow}>Historische Mitglieder</p>
          <h3 className={styles.fansubEditMembershipTitle}>Gruppenmitglieder</h3>
          <p className={styles.fansubEditHint}>
            Hier kannst du historische Mitglieder der Fansubgruppe pflegen.
            Eine Verknüpfung mit einem App-Nutzerkonto ist optional.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={15} aria-hidden="true" />}
          onClick={openNew}
        >
          Mitglied hinzufügen
        </Button>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {loading ? <div className={styles.fansubEditReleaseState}>Mitglieder werden geladen...</div> : null}

      {!loading && !error && members.length === 0 ? (
        <div className={styles.fansubEditMembershipEmpty}>
          <strong>Noch keine Mitglieder eingetragen</strong>
          <p className={styles.fansubEditHint}>Füge das erste Mitglied hinzu.</p>
        </div>
      ) : null}

      {!loading && members.length > 0 ? (
        <div className={styles.fansubEditMembershipList}>
          {members.map((member) => (
            <div key={member.id} className={styles.fansubEditMembershipCard}>
              <div className={styles.fansubEditMembershipCardTop}>
                <div className={styles.fansubEditMembershipIdentity}>
                  <strong>{member.display_name}</strong>
                  <span className={styles.fansubEditHint}>{formatZeitraum(member)}</span>
                  {member.app_username ? (
                    <span className={styles.fansubEditHint}>App-Konto: {member.app_username}</span>
                  ) : null}
                </div>
                <div className={styles.fansubEditMembershipControls}>
                  <Badge variant={statusBadgeVariant(member.status)}>
                    {statusLabel(member.status)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Pencil size={14} aria-hidden="true" />}
                    onClick={() => openEdit(member)}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 size={14} aria-hidden="true" />}
                    onClick={() => void handleDelete(member)}
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
        title={editTarget ? 'Mitglied bearbeiten' : 'Mitglied hinzufügen'}
        description="Historisches Mitglied der Fansubgruppe anlegen oder bearbeiten."
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {modalError ? <div className={styles.errorBox}>{modalError}</div> : null}

          <label>
            <span className={styles.fansubEditHint}>Anzeigename (Pflichtfeld)</span>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="z. B. Sora"
              aria-label="Anzeigename"
            />
          </label>

          <label>
            <span className={styles.fansubEditHint}>Beitrittsjahr (optional)</span>
            <select
              value={form.joinedYear}
              onChange={(e) => setForm((f) => ({ ...f, joinedYear: e.target.value }))}
              aria-label="Beitrittsjahr"
            >
              <option value="">– kein Jahr –</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </label>

          <label>
            <span className={styles.fansubEditHint}>Austrittsjahr (optional)</span>
            <select
              value={form.leftYear}
              onChange={(e) => setForm((f) => ({ ...f, leftYear: e.target.value }))}
              aria-label="Austrittsjahr"
            >
              <option value="">– kein Jahr –</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </label>

          <label>
            <span className={styles.fansubEditHint}>App-Nutzer-ID (optional)</span>
            <input
              type="number"
              value={form.appUserId}
              onChange={(e) => setForm((f) => ({ ...f, appUserId: e.target.value }))}
              placeholder="Numerische Nutzer-ID"
              aria-label="App-Nutzer-ID"
              min={1}
            />
          </label>

          <label>
            <span className={styles.fansubEditHint}>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'alumni' }))}
              aria-label="Status"
            >
              <option value="active">aktiv</option>
              <option value="alumni">Alumnus</option>
            </select>
          </label>

          <Button
            variant="primary"
            onClick={() => void handleSave()}
            disabled={saving || !form.displayName.trim()}
          >
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
