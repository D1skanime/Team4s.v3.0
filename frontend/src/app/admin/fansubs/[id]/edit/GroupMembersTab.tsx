'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import {
  Badge,
  Button,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  SectionHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
  Toolbar,
  YearPicker,
} from '@/components/ui'
import {
  ApiError,
  createGroupMember,
  createMemberRole,
  deleteGroupMember,
  deleteMemberRole,
  listGroupMembers,
  listMemberRoles,
  updateGroupMember,
  updateMemberRole,
} from '@/lib/api'
import {
  FANSUB_GROUP_ROLE_OPTIONS,
  type CreateGroupMemberRequest,
  type CreateMemberRoleRequest,
  type HistFansubGroupMember,
  type HistGroupMemberRole,
  type HistoricalContributionVisibility,
} from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

type GroupMembersTabProps = {
  embedded?: boolean
  fansubId: number
  onActionsChange?: (actions: GroupMembersTabActions | null) => void
  showHeaderActions?: boolean
}

export type GroupMembersTabActions = {
  canCreateRole: boolean
  openHistoricalMemberForm: () => void
  openHistoricalRoleForm: () => void
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

function visibilityLabel(visibility: HistoricalContributionVisibility): string {
  return visibility === 'public' ? 'öffentlich' : 'intern'
}

function formatRoleZeitraum(role: HistGroupMemberRole): string {
  const von = role.started_year ?? '?'
  const bis = role.ended_year ?? 'heute'
  return `${von} – ${bis}`
}

function roleLabelForCode(code: string): string {
  return FANSUB_GROUP_ROLE_OPTIONS.find((option) => option.code === code)?.label ?? code
}

function claimVariant(member: HistFansubGroupMember): 'success' | 'muted' {
  return member.app_username ? 'success' : 'muted'
}

function claimLabel(member: HistFansubGroupMember): string {
  return member.app_username ? 'Bestätigt/verknüpft' : 'Nicht beansprucht'
}

type FormFields = {
  displayName: string
  joinedYear: string
  leftYear: string
  visibility: HistoricalContributionVisibility
}

type RoleFormFields = {
  memberId: string
  roleCode: string
  startedYear: string
  endedYear: string
  note: string
}

const EMPTY_FORM: FormFields = {
  displayName: '',
  joinedYear: '',
  leftYear: '',
  visibility: 'internal',
}

const EMPTY_ROLE_FORM: RoleFormFields = {
  memberId: '',
  roleCode: '',
  startedYear: '',
  endedYear: '',
  note: '',
}

function memberToForm(m: HistFansubGroupMember): FormFields {
  return {
    displayName: m.display_name,
    joinedYear: m.joined_year != null ? String(m.joined_year) : '',
    leftYear: m.left_year != null ? String(m.left_year) : '',
    visibility: m.visibility ?? 'internal',
  }
}

function roleToForm(role: HistGroupMemberRole): RoleFormFields {
  return {
    memberId: String(role.fansub_group_member_id),
    roleCode: role.role_code,
    startedYear: role.started_year != null ? String(role.started_year) : '',
    endedYear: role.ended_year != null ? String(role.ended_year) : '',
    note: role.note ?? '',
  }
}

export function GroupMembersTab({
  embedded = false,
  fansubId,
  onActionsChange,
  showHeaderActions = true,
}: GroupMembersTabProps) {
  const [members, setMembers] = useState<HistFansubGroupMember[]>([])
  const [roles, setRoles] = useState<HistGroupMemberRole[]>([])
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
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [roleEditTarget, setRoleEditTarget] = useState<HistGroupMemberRole | null>(null)
  const [roleForm, setRoleForm] = useState<RoleFormFields>(EMPTY_ROLE_FORM)
  const [roleSaving, setRoleSaving] = useState(false)
  const [roleModalError, setRoleModalError] = useState<string | null>(null)
  const [roleDeleteTarget, setRoleDeleteTarget] = useState<HistGroupMemberRole | null>(null)
  const [roleDeleting, setRoleDeleting] = useState(false)
  const [roleDeleteError, setRoleDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await listGroupMembers(fansubId)
      const loadedMembers = response.data ?? []
      const roleResponses = await Promise.all(
        loadedMembers.map((member) => listMemberRoles(fansubId, member.id)),
      )
      const loadedRoles = roleResponses.flatMap((roleResponse, index) =>
        (roleResponse.data ?? []).map((role) => ({
          ...role,
          member_display_name:
            role.member_display_name || loadedMembers[index]?.display_name || '',
        })),
      )
      setMembers(loadedMembers)
      setRoles(
        loadedRoles.sort((a, b) => {
          const startedDiff = (b.started_year ?? 0) - (a.started_year ?? 0)
          return startedDiff !== 0 ? startedDiff : a.id - b.id
        }),
      )
    } catch (err) {
      setError(formatApiError(err, 'Mitglieder und Rollen konnten nicht geladen werden.'))
    } finally {
      setLoading(false)
    }
  }, [fansubId])

  useEffect(() => {
    void load()
  }, [load])

  const rolesByMember = useMemo(() => {
    const grouped = new Map<number, HistGroupMemberRole[]>()
    for (const role of roles) {
      const list = grouped.get(role.fansub_group_member_id) ?? []
      list.push(role)
      grouped.set(role.fansub_group_member_id, list)
    }
    return grouped
  }, [roles])

  const openNew = useCallback(() => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setModalError(null)
    setModalOpen(true)
  }, [])

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
          status: editTarget.status,
          visibility: form.visibility,
        })
      } else {
        const body: CreateGroupMemberRequest = {
          display_name: form.displayName.trim(),
          joined_year: joinedYear,
          left_year: leftYear,
          status: 'historical',
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

  const openNewRole = useCallback((member?: HistFansubGroupMember) => {
    setRoleEditTarget(null)
    setRoleForm({
      ...EMPTY_ROLE_FORM,
      memberId: member ? String(member.id) : '',
    })
    setRoleModalError(null)
    setRoleModalOpen(true)
  }, [])

  function openEditRole(role: HistGroupMemberRole) {
    setRoleEditTarget(role)
    setRoleForm(roleToForm(role))
    setRoleModalError(null)
    setRoleModalOpen(true)
  }

  function closeRoleModal() {
    setRoleModalOpen(false)
    setRoleEditTarget(null)
    setRoleModalError(null)
  }

  function closeRoleDeleteModal() {
    setRoleDeleteTarget(null)
    setRoleDeleteError(null)
  }

  async function handleRoleSave() {
    if (!roleForm.memberId) {
      setRoleModalError('Bitte ein Mitglied auswählen.')
      return
    }
    if (!roleForm.roleCode.trim()) {
      setRoleModalError('Rollenbezeichnung darf nicht leer sein.')
      return
    }

    const startedYear = roleForm.startedYear ? Number(roleForm.startedYear) : null
    const endedYear = roleForm.endedYear ? Number(roleForm.endedYear) : null

    if (startedYear !== null && endedYear !== null && endedYear < startedYear) {
      setRoleModalError('Rolle bis darf nicht vor Rolle von liegen.')
      return
    }

    try {
      setRoleSaving(true)
      setRoleModalError(null)

      if (roleEditTarget) {
        await updateMemberRole(fansubId, roleEditTarget.id, {
          role_code: roleForm.roleCode.trim(),
          started_year: startedYear,
          ended_year: endedYear,
          source_note: roleForm.note.trim() || null,
          status: roleEditTarget.status,
          visibility: 'internal',
        })
      } else {
        const body: CreateMemberRoleRequest = {
          hist_fansub_group_member_id: Number(roleForm.memberId),
          role_code: roleForm.roleCode.trim(),
          started_year: startedYear,
          ended_year: endedYear,
          source_note: roleForm.note.trim() || null,
          status: 'historical',
          visibility: 'internal',
        }
        await createMemberRole(fansubId, body)
      }

      await load()
      closeRoleModal()
    } catch (err) {
      setRoleModalError(formatApiError(err, 'Rolle konnte nicht gespeichert werden.'))
    } finally {
      setRoleSaving(false)
    }
  }

  useEffect(() => {
    if (!onActionsChange) return
    onActionsChange({
      canCreateRole: members.length > 0,
      openHistoricalMemberForm: openNew,
      openHistoricalRoleForm: () => openNewRole(),
    })
    return () => onActionsChange(null)
  }, [members.length, onActionsChange, openNew, openNewRole])

  async function handleRoleDeleteConfirm() {
    if (!roleDeleteTarget) return
    try {
      setRoleDeleting(true)
      setRoleDeleteError(null)
      await deleteMemberRole(fansubId, roleDeleteTarget.id)
      await load()
      closeRoleDeleteModal()
    } catch (err) {
      setRoleDeleteError(formatApiError(err, 'Rolle konnte nicht gelöscht werden.'))
    } finally {
      setRoleDeleting(false)
    }
  }

  return (
    <section className={embedded ? styles.fansubEditEmbeddedMembershipSurface : styles.fansubEditMembershipSurface}>
      <SectionHeader
        eyebrow="Historische Mitglieder"
        title="Historische Mitglieder"
        description="Öffentliche oder interne historische Fansub-Einträge. Die App-Profil-Verknüpfung entsteht nur durch bestätigte Claims."
        actions={
          showHeaderActions ? (
          <Toolbar
            leading={
              <>
                <Button
                  variant="primary"
                  leftIcon={<Plus size={15} aria-hidden="true" />}
                  onClick={openNew}
                >
                  Mitglied hinzufügen
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<Plus size={15} aria-hidden="true" />}
                  onClick={() => openNewRole()}
                  disabled={members.length === 0}
                >
                  Rolle hinzufügen
                </Button>
              </>
            }
          />
          ) : null
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
          description="Team4s lädt die historischen Gruppenmitglieder und Rollen."
        />
      ) : null}

      {!loading && !error ? (
        <div className={styles.fansubEditTableSurface}>
          <Table
            variant="withActions"
            caption="Historische Mitglieder dieser Fansubgruppe"
            containerClassName={styles.fansubEditTableWrapWine}
          >
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Aufgaben/Rollen</TableHeaderCell>
                <TableHeaderCell>Claim</TableHeaderCell>
                <TableHeaderCell>Aktionen</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.length === 0 ? (
                <TableEmptyState
                  colSpan={4}
                  title="Noch keine historischen Mitglieder"
                  description="Lege historische Einträge über Mitglied hinzufügen an."
                />
              ) : members.map((member) => {
                const memberRoles = rolesByMember.get(member.id) ?? []

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <strong>{member.display_name}</strong>
                      <br />
                      <span className={styles.fansubEditHint}>{formatZeitraum(member)}</span>
                      <br />
                      <span className={styles.fansubEditHint}>{visibilityLabel(member.visibility ?? 'internal')}</span>
                    </TableCell>
                    <TableCell>
                      {memberRoles.length > 0 ? (
                        <div className={styles.fansubEditMembershipRoleList}>
                          {memberRoles.map((role) => (
                            <div key={role.id} className={styles.fansubEditMembershipRoleItem}>
                              <div className={styles.fansubEditMembershipRoleItemMain}>
                                <strong>{role.role_label ?? roleLabelForCode(role.role_code)}</strong>
                                <span>{formatRoleZeitraum(role)}</span>
                                {role.note ? <span>{role.note}</span> : null}
                              </div>
                              <div className={styles.fansubEditMembershipRoleControls}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  iconOnly
                                  aria-label="Rolle bearbeiten"
                                  leftIcon={<Pencil size={14} aria-hidden="true" />}
                                  onClick={() => openEditRole(role)}
                                />
                                <Button
                                  variant="danger"
                                  size="sm"
                                  iconOnly
                                  aria-label="Rolle löschen"
                                  leftIcon={<Trash2 size={14} aria-hidden="true" />}
                                  onClick={() => setRoleDeleteTarget(role)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className={styles.fansubEditHint}>Keine historischen Rollen</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={claimVariant(member)}>{claimLabel(member)}</Badge>
                      {member.app_username ? (
                        <>
                          <br />
                          <span className={styles.fansubEditHint}>{member.app_username}</span>
                        </>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className={styles.fansubEditTableRowActions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Pencil size={14} aria-hidden="true" />}
                          onClick={() => openEdit(member)}
                        >
                          Bearbeiten
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Plus size={14} aria-hidden="true" />}
                          onClick={() => openNewRole(member)}
                        >
                          Rolle
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          iconOnly
                          aria-label={`${member.display_name} löschen`}
                          leftIcon={<Trash2 size={14} aria-hidden="true" />}
                          onClick={() => setDeleteTarget(member)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
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
              variant="success"
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
      </Modal>

      <Modal
        open={roleModalOpen}
        onClose={closeRoleModal}
        title={roleEditTarget ? 'Rolle bearbeiten' : 'Rolle hinzufügen'}
        description="Historische Gruppenrolle für ein Mitglied anlegen oder bearbeiten."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={closeRoleModal} disabled={roleSaving}>
              Schließen
            </Button>
            <Button
              variant="success"
              loading={roleSaving}
              onClick={() => void handleRoleSave()}
              disabled={!roleForm.memberId || !roleForm.roleCode.trim()}
            >
              Speichern
            </Button>
          </div>
        }
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {roleModalError ? (
            <ErrorState
              title="Rolle konnte nicht gespeichert werden"
              description={roleModalError}
            />
          ) : null}

          <FormField label="Mitglied" htmlFor="member-role-member" required disabled={!!roleEditTarget}>
            <Select
              id="member-role-member"
              value={roleForm.memberId}
              onChange={(e) => setRoleForm((f) => ({ ...f, memberId: e.target.value }))}
              aria-label="Mitglied auswählen"
              disabled={!!roleEditTarget}
            >
              <option value="">Mitglied wählen</option>
              {members.map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.display_name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Rolle" htmlFor="member-role-role" required>
            <Select
              id="member-role-role"
              value={roleForm.roleCode}
              onChange={(e) => setRoleForm((f) => ({ ...f, roleCode: e.target.value }))}
              aria-label="Rolle auswählen"
            >
              <option value="">Rolle auswählen</option>
              {FANSUB_GROUP_ROLE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className={styles.fansubEditMembershipModalGrid}>
            <FormField label="Rolle von" htmlFor="member-role-started-year">
              <YearPicker
                id="member-role-started-year"
                label="Rolle von"
                value={roleForm.startedYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(year) => setRoleForm((f) => ({ ...f, startedYear: year }))}
              />
            </FormField>
            <FormField label="Rolle bis" htmlFor="member-role-ended-year">
              <YearPicker
                id="member-role-ended-year"
                label="Rolle bis"
                value={roleForm.endedYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(year) => setRoleForm((f) => ({ ...f, endedYear: year }))}
              />
            </FormField>
          </div>

          <FormField
            label="Notiz"
            htmlFor="member-role-note"
            hint="Optionaler Kontext für spätere Prüfung oder Einordnung."
          >
            <Textarea
              id="member-role-note"
              value={roleForm.note}
              onChange={(e) => setRoleForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ergänzende Anmerkung"
              aria-label="Notiz"
              rows={3}
            />
          </FormField>

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

      <Modal
        open={roleDeleteTarget !== null}
        onClose={closeRoleDeleteModal}
        title="Rolleneintrag löschen"
        description="Diese Änderung entfernt den historischen Rolleneintrag aus der Gruppenhistorie."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={closeRoleDeleteModal} disabled={roleDeleting}>
              Nicht löschen
            </Button>
            <Button
              variant="danger"
              loading={roleDeleting}
              onClick={() => void handleRoleDeleteConfirm()}
            >
              Endgültig löschen
            </Button>
          </div>
        }
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {roleDeleteError ? (
            <ErrorState title="Rolle konnte nicht gelöscht werden" description={roleDeleteError} />
          ) : null}
          {roleDeleteTarget ? (
            <p className={styles.fansubEditMembershipDeleteText}>
              Rolle <strong>{roleDeleteTarget.role_label ?? roleLabelForCode(roleDeleteTarget.role_code)}</strong> von {roleDeleteTarget.member_display_name} entfernen.
            </p>
          ) : null}
        </div>
      </Modal>
    </section>
  )
}
