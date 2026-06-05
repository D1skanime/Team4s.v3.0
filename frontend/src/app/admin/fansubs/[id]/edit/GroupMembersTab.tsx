'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  SectionHeader,
  Select,
  Toolbar,
  YearPicker,
} from '@/components/ui'
import {
  ApiError,
  createGroupMember,
  deleteGroupMember,
  listGroupMembers,
  updateGroupMember,
} from '@/lib/api'
import type {
  CreateGroupMemberRequest,
  HistFansubGroupMember,
  HistoricalContributionStatus,
  HistoricalContributionVisibility,
} from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

type GroupMembersTabProps = {
  fansubId: number
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_MIN = 1980

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

function formatZeitraum(member: HistFansubGroupMember): string {
  const von = member.joined_year ?? '?'
  const bis = member.left_year ?? 'aktiv'
  return `${von} – ${bis}`
}

function formatConfirmationDate(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function statusBadgeVariant(status: HistFansubGroupMember['status']): 'success' | 'warning' | 'info' | 'muted' {
  if (status === 'confirmed') return 'success'
  if (status === 'disputed') return 'warning'
  if (status === 'draft') return 'muted'
  return 'info'
}

function statusLabel(status: HistFansubGroupMember['status']): string {
  if (status === 'confirmed') return 'Bestätigt'
  if (status === 'disputed') return 'Klärfall'
  if (status === 'draft') return 'Entwurf'
  return 'Historischer Eintrag'
}

function visibilityBadgeVariant(visibility: HistoricalContributionVisibility): 'success' | 'muted' {
  return visibility === 'public' ? 'success' : 'muted'
}

function visibilityLabel(visibility: HistoricalContributionVisibility): string {
  return visibility === 'public' ? 'öffentlich' : 'intern'
}

function memberAssignmentLabel(member: HistFansubGroupMember): string {
  if (member.app_username) return `Zugeordnet: ${member.app_username}`
  return 'Noch keinem aktuellen Gruppenmitglied zugeordnet'
}

function confirmationLabel(member: HistFansubGroupMember): string | null {
  if (member.status !== 'confirmed') return null

  const confirmedBy = member.confirmed_by_display_name?.trim()
  const confirmedAt = formatConfirmationDate(member.confirmed_at)

  if (confirmedBy && confirmedAt) return `Bestätigt von ${confirmedBy} am ${confirmedAt}`
  if (confirmedBy) return `Bestätigt von ${confirmedBy}`
  if (confirmedAt) return `Bestätigt am ${confirmedAt}`
  return 'Bestätigt, Details noch nicht gespeichert'
}

function statusHelpText(status: HistoricalContributionStatus): string {
  if (status === 'draft') {
    return 'Entwurf: Arbeitsstand. Nutze das, wenn Name, Jahre oder Zugehörigkeit noch nicht sauber eingeordnet sind.'
  }
  if (status === 'confirmed') {
    return 'Bestätigt: Beim Speichern wird der aktuelle App-User mit Zeitpunkt als Bestätigung hinterlegt. Das verknüpft noch kein aktuelles Gruppenmitglied.'
  }
  if (status === 'disputed') {
    return 'Klärfall: Nutze das, wenn Angaben widersprüchlich sind, jemand widerspricht oder Rollen/Jahre erst geprüft werden müssen.'
  }
  return 'Historischer Eintrag: Standard für frühere Mitglieder, die grundsätzlich zur Gruppenhistorie gehören, aber noch nicht final bestätigt sind.'
}

type FormFields = {
  displayName: string
  joinedYear: string
  leftYear: string
  appUserId: string
  status: HistoricalContributionStatus
  visibility: HistoricalContributionVisibility
}

const EMPTY_FORM: FormFields = {
  displayName: '',
  joinedYear: '',
  leftYear: '',
  appUserId: '',
  status: 'historical',
  visibility: 'internal',
}

function memberToForm(m: HistFansubGroupMember): FormFields {
  return {
    displayName: m.display_name,
    joinedYear: m.joined_year != null ? String(m.joined_year) : '',
    leftYear: m.left_year != null ? String(m.left_year) : '',
    appUserId: m.app_user_id != null ? String(m.app_user_id) : '',
    status: m.status,
    visibility: m.visibility ?? 'internal',
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
  const [deleteTarget, setDeleteTarget] = useState<HistFansubGroupMember | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
          visibility: form.visibility,
        })
      } else {
        const body: CreateGroupMemberRequest = {
          display_name: form.displayName.trim(),
          joined_year: joinedYear,
          left_year: leftYear,
          app_user_id: appUserId,
          status: form.status,
          visibility: form.visibility,
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

  function closeDeleteModal() {
    setDeleteTarget(null)
    setDeleteError(null)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      setDeleteError(null)
      await deleteGroupMember(fansubId, deleteTarget.id)
      await load()
      closeDeleteModal()
    } catch (err) {
      setDeleteError(formatApiError(err, 'Mitglied konnte nicht gelöscht werden.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card variant="section" className={styles.fansubEditMembershipSurface}>
      <SectionHeader
        eyebrow="Historische Mitglieder"
        title="Gruppenmitglieder"
        description="Pflege historische Mitglieder der Fansubgruppe. Eine Verknüpfung mit einem App-Nutzerkonto ist optional."
        actions={
          <Toolbar
            leading={
              <Button
                variant="primary"
                leftIcon={<Plus size={15} aria-hidden="true" />}
                onClick={openNew}
              >
                Mitglied hinzufügen
              </Button>
            }
          />
        }
      />

      {error ? (
        <ErrorState
          title="Mitglieder konnten nicht geladen werden"
          description={error}
          action={<Button variant="secondary" size="sm" onClick={() => void load()}>Erneut laden</Button>}
        />
      ) : null}
      {loading ? (
        <LoadingState
          title="Mitglieder werden geladen"
          description="Team4s lädt die historischen Gruppenmitglieder."
        />
      ) : null}

      {!loading && !error && members.length === 0 ? (
        <EmptyState
          title="Noch keine Mitglieder eingetragen"
          description="Füge das erste historische Mitglied hinzu."
          action={<Button variant="primary" leftIcon={<Plus size={15} aria-hidden="true" />} onClick={openNew}>Mitglied hinzufügen</Button>}
        />
      ) : null}

      {!loading && members.length > 0 ? (
        <div className={styles.fansubEditMembershipList}>
          {members.map((member) => {
            const confirmation = confirmationLabel(member)

            return (
              <Card key={member.id} variant="nestedFlat" className={styles.fansubEditMembershipCard}>
                <div className={styles.fansubEditMembershipCardTop}>
                  <div className={styles.fansubEditMembershipIdentity}>
                    <strong>{member.display_name}</strong>
                    <div className={styles.fansubEditMembershipMetaLine}>
                      <span>{formatZeitraum(member)}</span>
                      <span>{memberAssignmentLabel(member)}</span>
                      {confirmation ? <span>{confirmation}</span> : null}
                    </div>
                  </div>
                  <div className={styles.fansubEditMembershipControls}>
                    <Badge variant={statusBadgeVariant(member.status)}>
                      {statusLabel(member.status)}
                    </Badge>
                    <Badge
                      variant={visibilityBadgeVariant(member.visibility ?? 'internal')}
                      className={styles.fansubEditMembershipVisibilityBadge}
                    >
                      {visibilityLabel(member.visibility ?? 'internal')}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label="Mitglied bearbeiten"
                      leftIcon={<Pencil size={14} aria-hidden="true" />}
                      onClick={() => openEdit(member)}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      iconOnly
                      aria-label="Mitglied löschen"
                      leftIcon={<Trash2 size={14} aria-hidden="true" />}
                      onClick={() => setDeleteTarget(member)}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Mitglied bearbeiten' : 'Mitglied hinzufügen'}
        description="Historisches Mitglied der Fansubgruppe anlegen oder bearbeiten."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Schließen
            </Button>
            <Button
              variant="primary"
              loading={saving}
              onClick={() => void handleSave()}
              disabled={!form.displayName.trim()}
            >
              Speichern
            </Button>
          </div>
        }
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {modalError ? (
            <ErrorState
              title="Mitglied konnte nicht gespeichert werden"
              description={modalError}
            />
          ) : null}

          <FormField label="Anzeigename" htmlFor="hist-member-display-name" required>
            <Input
              id="hist-member-display-name"
              type="text"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="z. B. Sora"
              required
            />
          </FormField>

          <div className={styles.fansubEditMembershipModalGrid}>
            <FormField label="Beitrittsjahr" htmlFor="hist-member-joined-year" hint="Optionaler Startpunkt der Mitgliedschaft.">
              <YearPicker
                id="hist-member-joined-year"
                label="Beitrittsjahr"
                value={form.joinedYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(value) => setForm((f) => ({ ...f, joinedYear: value }))}
              />
            </FormField>

            <FormField label="Austrittsjahr" htmlFor="hist-member-left-year" hint="Leer lassen, wenn die Person weiterhin aktiv ist.">
              <YearPicker
                id="hist-member-left-year"
                label="Austrittsjahr"
                value={form.leftYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(value) => setForm((f) => ({ ...f, leftYear: value }))}
              />
            </FormField>
          </div>

          <FormField
            label="App-Nutzer-ID"
            htmlFor="hist-member-app-user-id"
            hint="Optional. Nur setzen, wenn der passende Team4s-App-User bekannt ist."
          >
            <Input
              id="hist-member-app-user-id"
              type="number"
              value={form.appUserId}
              onChange={(e) => setForm((f) => ({ ...f, appUserId: e.target.value }))}
              placeholder="Numerische Nutzer-ID"
              min={1}
            />
          </FormField>

          <div className={styles.fansubEditMembershipModalGrid}>
            <FormField
              label="Status"
              htmlFor="hist-member-status"
              hint={statusHelpText(form.status)}
            >
              <Select
                id="hist-member-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  status: e.target.value as HistoricalContributionStatus,
                }))}
              >
                <option value="historical">Historischer Eintrag</option>
                <option value="confirmed">Bestätigt</option>
                <option value="draft">Entwurf</option>
                <option value="disputed">Klärfall</option>
              </Select>
            </FormField>

            <FormField label="Sichtbarkeit" htmlFor="hist-member-visibility">
              <Select
                id="hist-member-visibility"
                value={form.visibility}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  visibility: e.target.value as HistoricalContributionVisibility,
                }))}
              >
                <option value="internal">intern</option>
                <option value="public">öffentlich</option>
              </Select>
            </FormField>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={closeDeleteModal}
        title="Mitglied löschen"
        description="Dieses historische Mitglied wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={closeDeleteModal} disabled={deleting}>
              Nicht löschen
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={() => void handleDeleteConfirm()}
            >
              Endgültig löschen
            </Button>
          </div>
        }
      >
        {deleteError ? (
          <ErrorState title="Mitglied konnte nicht gelöscht werden" description={deleteError} />
        ) : null}
        {deleteTarget ? (
          <p className={styles.fansubEditMembershipDeleteText}>
            <strong>{deleteTarget.display_name}</strong> aus der historischen Mitgliederliste entfernen.
          </p>
        ) : null}
      </Modal>
    </Card>
  )
}
