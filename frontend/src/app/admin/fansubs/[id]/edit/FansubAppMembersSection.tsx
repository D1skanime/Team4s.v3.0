'use client'

import type { ReactNode } from 'react'
import { UserPlus } from 'lucide-react'

import {
  Button,
  Card,
  ErrorState,
  LoadingState,
} from '@/components/ui'
import { mergeCssModules } from '@/lib/mergeCssModules'
import { orderForContext } from '@/lib/roleCatalog'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'
import ownStyles from './FansubAppMembersSection.module.css'
import { FansubAppMemberAddModal, FansubAppMemberChoiceModal } from './FansubAppMemberAddModal'
import { FansubAppMemberEditorPanel } from './FansubAppMemberEditorPanel'
import { FansubAppMembersOverview } from './FansubAppMembersOverview'
import { GroupMembersTab } from './GroupMembersTab'
import { useFansubAppMembersSection } from './useFansubAppMembersSection'

const styles = mergeCssModules(fansubEditStyles, sharedStyles)

type FansubAppMembersSectionProps = {
  hasAccessToken?: boolean
  fansubId: number
  claimsLinkOut?: ReactNode
  [legacyProp: string]: unknown
}

export function FansubAppMembersSection({ hasAccessToken = false, fansubId, claimsLinkOut }: FansubAppMembersSectionProps) {
  const {
    members,
    roleDefinitions, roleOptionsError, roleOptions,
    candidateQuery, candidateResults, selectedCandidateId, selectedHistoricalMemberId, selectedRoles,
    isMemberModalOpen, setIsMemberModalOpen, isAddChoiceOpen, setIsAddChoiceOpen,
    historicalActions, setHistoricalActions,
    memberEditorTab, setMemberEditorTab, memberRoleDraft, setMemberRoleDraft,
    mediaPermissionDraft, setMediaPermissionDraft,
    historicalRoleDrafts, historyRoleOptions, historyRoleLoadError,
    invitations, inviteEmail, setInviteEmail, inviteRoles, createdInviteLink,
    isLoading, isSearching, isAdding, isCreatingInvite, busyKey,
    loadError, actionError, successMessage,
    canViewMembers, canManageMembers, canManageHistoricalRoles,
    canLinkHistoricalMembers, canEditHistoricalMemberRecords, canViewInvitations,
    canCreateInvitation, canCancelInvitation,
    loadSection,
    activeMemberCount, editorMember, editorHistoricalRoles, selectedCandidate,
    toggleSelectedRole, toggleInviteRole, handleCandidateQueryChange, handleCandidateSelect,
    handleHistoricalMemberChange, handleAddMember, handleCreateInvitation, handleCancelInvitation,
    openMemberEditor, closeMemberEditor,
    addHistoricalRoleDraft, updateHistoricalRoleDraft, removeHistoricalRoleDraft,
    handleSaveMemberEditor, openAppMemberFlow, openHistoricalMemberFlow,
    YEAR_MIN, CURRENT_YEAR,
  } = useFansubAppMembersSection({ hasAccessToken, fansubId })

  return (
    <Card variant="section" className={styles.fansubEditMembershipSurface}>
      <div className={ownStyles.fansubEditMembershipIntro}>
        <div>
          <p className={styles.fansubEditHint}>Wer zur Fansubgruppe gehört und welche Aufgaben die Person übernimmt.</p>
        </div>
        <div className={ownStyles.fansubEditMembershipHeaderActions}>
          <div className={ownStyles.fansubEditBasicStatusCard}>
            <span>Mitglieder</span>
            <strong>{members.length} Mitglied{members.length === 1 ? '' : 'er'}</strong>
            <p>{activeMemberCount} aktiv, {members.length - activeMemberCount} deaktiviert</p>
          </div>
          {canManageMembers || canCreateInvitation || canEditHistoricalMemberRecords || canLinkHistoricalMembers ? (
            <Button
              variant="primary"
              leftIcon={<UserPlus size={15} aria-hidden="true" />}
              onClick={() => setIsAddChoiceOpen(true)}
            >
              Mitglied hinzufügen
            </Button>
          ) : null}
        </div>
      </div>

      {!hasAccessToken ? (
        <div className={ownStyles.fansubEditMembershipEmpty}>
          <strong>Keine aktive Admin-Session</strong>
          <p className={styles.fansubEditHint}>Für die Mitgliederverwaltung bitte zuerst anmelden.</p>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingState title="Mitglieder werden geladen" description="Team4s lädt die Mitglieder und Einladungen dieser Fansubgruppe." />
      ) : null}
      {loadError ? (
        <ErrorState
          title="Mitglieder konnten nicht geladen werden"
          description={loadError}
          action={<Button variant="secondary" size="sm" onClick={() => void loadSection()}>Erneut laden</Button>}
        />
      ) : null}
      {actionError ? <ErrorState title="Aktion fehlgeschlagen" description={actionError} /> : null}
      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

      {!isLoading && !loadError && hasAccessToken && !canViewMembers && !canViewInvitations ? (
        <ErrorState
          title="Fehlende Berechtigungen"
          description="Dir fehlen die Berechtigungen für Mitglieder und Einladungen dieser Fansubgruppe."
        />
      ) : null}

      {!isLoading && !loadError && hasAccessToken && (canViewMembers || canViewInvitations) ? (
        <>
          <FansubAppMembersOverview
            members={members}
            historicalMembers={historicalActions?.historicalMembers ?? []}
            historicalRolesByMember={historicalActions?.historicalRolesByMember ?? new Map()}
            invitations={invitations}
            claimsLinkOut={claimsLinkOut}
            afterMembers={(
              <GroupMembersTab
                embedded
                canCancelClaimInvitation={canLinkHistoricalMembers}
                canCreateClaimInvitation={canLinkHistoricalMembers}
                canManageClaims={canLinkHistoricalMembers}
                canManageHistoricalMembers={canEditHistoricalMemberRecords}
                canManageHistoricalRoles={canManageHistoricalRoles}
                fansubId={fansubId}
                onActionsChange={setHistoricalActions}
                onActiveAppMembersChanged={() => void loadSection()}
                showClaimRequests={canLinkHistoricalMembers}
                showHeaderActions={false}
              />
            )}
            canViewMembers={canViewMembers}
            canViewInvitations={canViewInvitations}
            canManageMembers={canManageMembers}
            canCancelInvitation={canCancelInvitation}
            createdInviteLink={createdInviteLink}
            busyKey={busyKey}
            onEditMember={openMemberEditor}
            onCancelInvitation={(invId) => void handleCancelInvitation(invId)}
          />
        </>
      ) : null}

      <FansubAppMemberChoiceModal
        open={isAddChoiceOpen}
        canManageMembers={canManageMembers || canLinkHistoricalMembers}
        canCreateInvitation={canCreateInvitation}
        hasHistoricalActions={!!historicalActions && canEditHistoricalMemberRecords}
        onClose={() => setIsAddChoiceOpen(false)}
        onAppMemberFlow={openAppMemberFlow}
        onHistoricalMemberFlow={openHistoricalMemberFlow}
      />

      <FansubAppMemberAddModal
        open={isMemberModalOpen}
        canManageMembers={canManageMembers || canLinkHistoricalMembers}
        canCreateInvitation={canCreateInvitation}
        candidateQuery={candidateQuery}
        candidateResults={candidateResults}
        selectedCandidateId={selectedCandidateId}
        selectedCandidate={selectedCandidate}
        selectedRoles={selectedRoles}
        historicalIdentityOptions={historicalActions?.historicalIdentityOptions ?? []}
        selectedHistoricalMemberId={selectedHistoricalMemberId}
        isSearching={isSearching}
        isAdding={isAdding}
        inviteEmail={inviteEmail}
        inviteRoles={inviteRoles}
        isCreatingInvite={isCreatingInvite}
        roleOptions={roleOptions}
        onClose={() => setIsMemberModalOpen(false)}
        onCandidateQueryChange={handleCandidateQueryChange}
        onCandidateSelect={handleCandidateSelect}
        onToggleRole={toggleSelectedRole}
        onHistoricalMemberChange={handleHistoricalMemberChange}
        onAddMember={() => void handleAddMember()}
        onInviteEmailChange={setInviteEmail}
        onToggleInviteRole={toggleInviteRole}
        onCreateInvitation={() => void handleCreateInvitation()}
      />

      <FansubAppMemberEditorPanel
        editorMember={editorMember}
        memberEditorTab={memberEditorTab}
        setMemberEditorTab={setMemberEditorTab}
        memberRoleDraft={memberRoleDraft}
        roleOptions={orderForContext(roleDefinitions, 'fansub_group').filter((item) => item.assignable)}
        roleOptionsError={roleOptionsError}
        mediaPermissionDraft={mediaPermissionDraft}
        historicalRoleDrafts={historicalRoleDrafts}
        historyRoleOptions={historyRoleOptions}
        historyRoleLoadError={historyRoleLoadError}
        canManageHistoricalRoles={canManageHistoricalRoles}
        historicalRoleCount={editorHistoricalRoles.length}
        yearMin={YEAR_MIN}
        yearMax={CURRENT_YEAR}
        isBusy={busyKey === `member-editor:${editorMember?.app_user_id}`}
        onClose={closeMemberEditor}
        onSave={() => void handleSaveMemberEditor()}
        onToggleRole={(role) => setMemberRoleDraft((current) => current.includes(role) ? current.filter((r) => r !== role) : [...current, role])}
        onToggleMediaPermission={(permission) => setMediaPermissionDraft((current) => ({ ...current, [permission]: !current[permission] }))}
        onAddHistoricalRole={addHistoricalRoleDraft}
        onUpdateHistoricalRole={updateHistoricalRoleDraft}
        onRemoveHistoricalRole={removeHistoricalRoleDraft}
      />
    </Card>
  )
}
