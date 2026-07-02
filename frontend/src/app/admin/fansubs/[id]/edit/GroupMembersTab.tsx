'use client'

import { useEffect, useState } from 'react'

import { Plus } from 'lucide-react'

import {
  Button,
  ErrorState,
  LoadingState,
  SectionHeader,
  Toolbar,
} from '@/components/ui'
import { listGroupHistoryRoleDefinitions } from '@/lib/api'
import { type RoleDefinitionOption } from '@/types/admin-capability'
import { FANSUB_GROUP_ROLE_OPTIONS } from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'
import { GroupHistRoleDialog } from './GroupHistRoleDialog'
import { GroupMemberFormModals } from './GroupMemberFormModals'
import { GroupMemberRequestsTable } from './GroupMemberRequestsTable'
import { GroupMembersHistTable } from './GroupMembersHistTable'
import { normalizeInviteLink, roleLabelForCode, useGroupMembersTab } from './useGroupMembersTab'

const styles = { ...sharedStyles, ...fansubEditStyles }

export const STATIC_HISTORICAL_ROLE_OPTIONS: RoleDefinitionOption[] = [
  { code: 'founder', label_de: 'Gründer/in', sort_order: 1 },
  { code: 'co_leader', label_de: 'Co-Leitung', sort_order: 3 },
  ...FANSUB_GROUP_ROLE_OPTIONS.map((option, index) => ({
    code: option.code,
    label_de: option.label,
    sort_order: 100 + index,
  })),
]

export function mergeHistoricalRoleOptions(options: RoleDefinitionOption[]): RoleDefinitionOption[] {
  const byCode = new Map<string, RoleDefinitionOption>()
  for (const option of [...options, ...STATIC_HISTORICAL_ROLE_OPTIONS]) {
    if (!byCode.has(option.code)) {
      byCode.set(option.code, option)
    }
  }
  return Array.from(byCode.values()).sort((a, b) => a.sort_order - b.sort_order || a.label_de.localeCompare(b.label_de, 'de'))
}

type GroupMembersTabProps = {
  embedded?: boolean
  canCancelClaimInvitation?: boolean
  canCreateClaimInvitation?: boolean
  canManageClaims?: boolean
  canManageHistoricalMembers?: boolean
  canManageHistoricalRoles?: boolean
  fansubId: number
  onActionsChange?: (actions: GroupMembersTabActions | null) => void
  showClaimRequests?: boolean
  showHeaderActions?: boolean
}

export type GroupMembersTabActions = {
  canCreateRole: boolean
  historicalIdentityOptions: HistoricalIdentityOption[]
  historicalMembers: ReturnType<typeof useGroupMembersTab>['members']
  historicalRolesByMember: ReturnType<typeof useGroupMembersTab>['rolesByMember']
  reloadHistoricalMembers: () => Promise<void>
  openHistoricalMemberForm: () => void
  openHistoricalRoleForm: () => void
}

export type HistoricalIdentityOption = {
  id: number
  displayName: string
  roleSummary: string
}

export function GroupMembersTab({
  embedded = false,
  canCancelClaimInvitation = true,
  canCreateClaimInvitation = true,
  canManageClaims = true,
  canManageHistoricalMembers = true,
  canManageHistoricalRoles = true,
  fansubId,
  onActionsChange,
  showClaimRequests = true,
  showHeaderActions = true,
}: GroupMembersTabProps) {
  const tab = useGroupMembersTab({ fansubId, onActionsChange })

  const [historyRoleOptions, setHistoryRoleOptions] = useState<RoleDefinitionOption[]>([])
  const [historyRoleLoadError, setHistoryRoleLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listGroupHistoryRoleDefinitions(fansubId)
      .then((options) => {
        if (!cancelled) {
          setHistoryRoleOptions(mergeHistoricalRoleOptions(options))
          setHistoryRoleLoadError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryRoleOptions(mergeHistoricalRoleOptions([]))
          setHistoryRoleLoadError('Frühere Funktionen konnten nicht geladen werden.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [fansubId])

  return (
    <section className={embedded ? styles.fansubEditEmbeddedMembershipSurface : styles.fansubEditMembershipSurface}>
      <SectionHeader
        eyebrow={embedded ? undefined : 'Historische Mitglieder'}
        title="Historische Mitglieder"
        description="Mitglieder ohne verknüpften Account oder mit historisch dokumentierten Rollen."
        actions={showHeaderActions ? (
          <Toolbar
            leading={
              <>
                {canManageHistoricalMembers ? (
                  <Button variant="primary" leftIcon={<Plus size={15} aria-hidden="true" />} onClick={tab.openNew}>
                    Mitglied hinzufügen
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  leftIcon={<Plus size={15} aria-hidden="true" />}
                  onClick={() => tab.openNewRole()}
                  disabled={!canManageHistoricalRoles || tab.members.length === 0}
                >
                  Rolle hinzufügen
                </Button>
              </>
            }
          />
        ) : null}
      />

      {tab.error ? (
        <ErrorState
          title="Mitglieder konnten nicht geladen werden"
          description={tab.error}
          action={<Button variant="secondary" size="sm" onClick={() => void tab.load()}>Erneut laden</Button>}
        />
      ) : null}
      {tab.loading ? (
        <LoadingState
          title="Mitglieder werden geladen"
          description="Team4s lädt die historischen Gruppenmitglieder und Rollen."
        />
      ) : null}
      {tab.claimActionError ? (
        <ErrorState title="Claim-Aktion" description={tab.claimActionError} />
      ) : null}

      {!tab.loading && !tab.error ? (
        <div className={styles.fansubEditHistoricalMembersSurface}>
          <GroupMembersHistTable
            members={tab.members}
            rolesByMember={tab.rolesByMember}
            pendingClaimsByMember={tab.pendingClaimsByMember}
            generatedInvites={tab.generatedInvites}
            memberInvitations={tab.memberInvitations}
            copyStates={tab.copyStates}
            canManageClaims={canManageClaims}
            canCancelClaimInvitation={canCancelClaimInvitation}
            canCreateClaimInvitation={canCreateClaimInvitation}
            canManageHistoricalMembers={canManageHistoricalMembers}
            canManageHistoricalRoles={canManageHistoricalRoles}
            roleLabelForCode={roleLabelForCode}
            normalizeInviteLink={normalizeInviteLink}
            onEditMember={tab.openEdit}
            onDeleteMember={(member) => tab.setDeleteTarget(member)}
            onEditRole={tab.openEditRole}
            onDeleteRole={(role) => tab.setRoleDeleteTarget(role)}
            onAddRole={(member) => tab.openNewRole(member)}
            onVerifyClaim={(claimId) => void tab.handleVerifyClaim(claimId)}
            onRejectClaim={(claimId, nick) => void tab.handleRejectClaim(claimId, nick)}
            onGenerateInvitation={(rowId, memberId) => void tab.handleGenerateInvitation(rowId, memberId)}
            onCancelInvitation={(rowId, memberId, invId) => void tab.handleCancelInvitation(rowId, memberId, invId)}
            onCopyLink={(rowId, link) => void tab.handleCopyLink(rowId, link)}
          />
          {showClaimRequests ? (
            <GroupMemberRequestsTable
              memberRequests={tab.memberRequests}
              approveNicknames={tab.approveNicknames}
              canManageClaims={canManageClaims}
              onNicknameChange={(requestId, value) => tab.setApproveNicknames((current) => ({ ...current, [requestId]: value }))}
              onApprove={(requestId) => void tab.handleApproveRequest(requestId)}
              onReject={(requestId) => void tab.handleRejectRequest(requestId)}
            />
          ) : null}
        </div>
      ) : null}

      <GroupHistRoleDialog
        open={tab.roleModalOpen}
        onClose={tab.closeRoleModal}
        isEditing={!!tab.roleEditTarget}
        roleForm={tab.roleForm}
        setRoleForm={tab.setRoleForm}
        onSubmit={() => void tab.handleRoleSave()}
        isSaving={tab.roleSaving}
        error={tab.roleModalError}
        members={tab.members}
        yearMin={tab.YEAR_MIN}
        yearMax={tab.CURRENT_YEAR}
        historyRoleOptions={historyRoleOptions}
        historyRoleLoadError={historyRoleLoadError}
      />

      <GroupMemberFormModals
        modalOpen={tab.modalOpen}
        editTarget={tab.editTarget}
        form={tab.form}
        setForm={tab.setForm}
        inlineRoleDrafts={tab.inlineRoleDrafts}
        setInlineRoleDrafts={tab.setInlineRoleDrafts}
        historyRoleOptions={historyRoleOptions}
        historyRoleLoadError={historyRoleLoadError}
        saving={tab.saving}
        modalError={tab.modalError}
        onClose={tab.closeModal}
        onSave={() => void tab.handleSave()}
        yearMin={tab.YEAR_MIN}
        yearMax={tab.CURRENT_YEAR}
        deleteTarget={tab.deleteTarget}
        deleting={tab.deleting}
        deleteError={tab.deleteError}
        onCloseDelete={tab.closeDeleteModal}
        onConfirmDelete={() => void tab.handleDeleteConfirm()}
        roleDeleteTarget={tab.roleDeleteTarget}
        roleDeleting={tab.roleDeleting}
        roleDeleteError={tab.roleDeleteError}
        onCloseRoleDelete={tab.closeRoleDeleteModal}
        onConfirmRoleDelete={() => void tab.handleRoleDeleteConfirm()}
        roleLabelForCode={roleLabelForCode}
      />
    </section>
  )
}
