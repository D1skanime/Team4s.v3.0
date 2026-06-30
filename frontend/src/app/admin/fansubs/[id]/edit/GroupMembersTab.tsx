'use client'

import { Plus } from 'lucide-react'

import {
  Button,
  ErrorState,
  LoadingState,
  SectionHeader,
  Toolbar,
} from '@/components/ui'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'
import { GroupHistRoleDialog } from './GroupHistRoleDialog'
import { GroupMemberFormModals } from './GroupMemberFormModals'
import { GroupMemberRequestsTable } from './GroupMemberRequestsTable'
import { GroupMembersHistTable } from './GroupMembersHistTable'
import { normalizeInviteLink, roleLabelForCode, useGroupMembersTab } from './useGroupMembersTab'

const styles = { ...sharedStyles, ...fansubEditStyles }

type GroupMembersTabProps = {
  embedded?: boolean
  canCancelClaimInvitation?: boolean
  canCreateClaimInvitation?: boolean
  canManageClaims?: boolean
  fansubId: number
  onActionsChange?: (actions: GroupMembersTabActions | null) => void
  showClaimRequests?: boolean
  showHeaderActions?: boolean
}

export type GroupMembersTabActions = {
  canCreateRole: boolean
  openHistoricalMemberForm: () => void
  openHistoricalRoleForm: () => void
}

export function GroupMembersTab({
  embedded = false,
  canCancelClaimInvitation = true,
  canCreateClaimInvitation = true,
  canManageClaims = true,
  fansubId,
  onActionsChange,
  showClaimRequests = true,
  showHeaderActions = true,
}: GroupMembersTabProps) {
  const tab = useGroupMembersTab({ fansubId, onActionsChange })

  return (
    <section className={embedded ? styles.fansubEditEmbeddedMembershipSurface : styles.fansubEditMembershipSurface}>
      <SectionHeader
        eyebrow="Historische Mitglieder"
        title="Historische Mitglieder"
        description="Öffentliche oder interne historische Fansub-Einträge. Die App-Profil-Verknüpfung entsteht nur durch bestätigte Claims."
        actions={showHeaderActions ? (
          <Toolbar
            leading={
              <>
                <Button variant="primary" leftIcon={<Plus size={15} aria-hidden="true" />} onClick={tab.openNew}>
                  Mitglied hinzufügen
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<Plus size={15} aria-hidden="true" />}
                  onClick={() => tab.openNewRole()}
                  disabled={tab.members.length === 0}
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
        <div className={styles.fansubEditTableSurface}>
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
      />

      <GroupMemberFormModals
        modalOpen={tab.modalOpen}
        editTarget={tab.editTarget}
        form={tab.form}
        setForm={tab.setForm}
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
