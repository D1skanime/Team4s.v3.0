'use client'

import {
  Button,
  Card,
  FormField,
  Input,
  LoadingState,
  Modal,
  Select,
} from '@/components/ui'
import {
  type FansubGroupMemberCandidate,
  type FansubGroupRoleCode,
} from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'
import type { HistoricalIdentityOption } from './GroupMembersTab'

const styles = { ...sharedStyles, ...fansubEditStyles }

// Add-Choice-Modal
type FansubAppMemberChoiceModalProps = {
  open: boolean
  canManageMembers: boolean
  canCreateInvitation: boolean
  hasHistoricalActions: boolean
  onClose: () => void
  onAppMemberFlow: () => void
  onHistoricalMemberFlow: () => void
}

export function FansubAppMemberChoiceModal({
  open,
  canManageMembers,
  canCreateInvitation,
  hasHistoricalActions,
  onClose,
  onAppMemberFlow,
  onHistoricalMemberFlow,
}: FansubAppMemberChoiceModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mitglied hinzufügen"
      description="Wähle, ob du App-Zugriff vergibst oder einen historischen Eintrag anlegst."
    >
      <div className={`${styles.fansubEditMembershipModalStack} ${styles.fansubEditMemberChoiceList}`}>
        <Button
          variant="primary"
          fullWidth
          className={styles.fansubEditMemberChoiceButton}
          onClick={onAppMemberFlow}
          disabled={!canManageMembers && !canCreateInvitation}
        >
          App-Mitglied / Einladung
        </Button>
        <Button
          variant="secondary"
          fullWidth
          className={styles.fansubEditMemberChoiceButton}
          onClick={onHistoricalMemberFlow}
          disabled={!canManageMembers || !hasHistoricalActions}
        >
          Historischen Eintrag anlegen
        </Button>
      </div>
    </Modal>
  )
}

function getRoleClassName(role: string): string {
  const roleClassMap: Record<string, string> = {
    fansub_lead: styles.fansubEditRoleLead,
    project_lead: styles.fansubEditRoleProjectLead,
    editor: styles.fansubEditRoleEditor,
    translator: styles.fansubEditRoleTranslator,
    timer: styles.fansubEditRoleTimer,
    typesetter: styles.fansubEditRoleTypesetter,
    quality_checker: styles.fansubEditRoleQuality,
    encoder: styles.fansubEditRoleEncoder,
  }
  return roleClassMap[role] ?? styles.fansubEditRoleDefault
}

function styleNames(...names: Array<string | undefined | false>): string {
  return names.filter(Boolean).join(' ')
}

// App-Mitglied + Einladung Haupt-Modal
export type FansubAppMemberAddModalProps = {
  open: boolean
  canManageMembers: boolean
  canCreateInvitation: boolean
  candidateQuery: string
  candidateResults: FansubGroupMemberCandidate[]
  selectedCandidateId: string
  selectedCandidate: FansubGroupMemberCandidate | null
  selectedRoles: string[]
  historicalIdentityOptions: HistoricalIdentityOption[]
  selectedHistoricalMemberId: string
  isSearching: boolean
  isAdding: boolean
  inviteEmail: string
  inviteRoles: FansubGroupRoleCode[]
  isCreatingInvite: boolean
  /** API-getriebene Rollenoptionen (von FansubAppMembersSection via listFansubGroupRoles) */
  roleOptions: { code: FansubGroupRoleCode; label: string; description?: string }[]
  onClose: () => void
  onCandidateQueryChange: (value: string) => void
  onCandidateSelect: (candidate: FansubGroupMemberCandidate) => void
  onToggleRole: (role: string) => void
  onHistoricalMemberChange: (value: string) => void
  onAddMember: () => void
  onInviteEmailChange: (value: string) => void
  onToggleInviteRole: (role: FansubGroupRoleCode) => void
  onCreateInvitation: () => void
}

export function FansubAppMemberAddModal({
  open,
  canManageMembers,
  canCreateInvitation,
  candidateQuery,
  candidateResults,
  selectedCandidateId,
  selectedCandidate,
  selectedRoles,
  historicalIdentityOptions,
  selectedHistoricalMemberId,
  isSearching,
  isAdding,
  inviteEmail,
  inviteRoles,
  isCreatingInvite,
  roleOptions,
  onClose,
  onCandidateQueryChange,
  onCandidateSelect,
  onToggleRole,
  onHistoricalMemberChange,
  onAddMember,
  onInviteEmailChange,
  onToggleInviteRole,
  onCreateInvitation,
}: FansubAppMemberAddModalProps) {
  const hasHistoricalSelection = selectedHistoricalMemberId.trim().length > 0
  const canSubmitMember = Boolean(selectedCandidateId) && (selectedRoles.length > 0 || hasHistoricalSelection)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mitglied hinzufügen"
      description="Suche bestehende Fansub-Mitglieder per Nick oder erstelle eine Einladung per E-Mail."
    >
      <div className={styles.fansubEditMembershipModalStack}>
        {canManageMembers ? (
          <Card
            variant="nestedFlat"
            className={styles.fansubEditMemberAddCard}
            title="Bestehendes Profil"
            description="Fansub-Nick suchen und mit dieser Gruppe verbinden."
          >
            <FormField label="Fansub-Nick" htmlFor="fansub-member-candidate-query">
              <Input
                id="fansub-member-candidate-query"
                type="search"
                value={candidateQuery}
                onChange={(event) => onCandidateQueryChange(event.target.value)}
                placeholder="Fansub-Nick suchen"
              />
            </FormField>

            {candidateQuery.trim().length < 2 ? (
              <p className={styles.fansubEditHint}>Gib mindestens zwei Zeichen ein, um passende Fansub-Nicks zu suchen.</p>
            ) : null}
            {candidateQuery.trim().length >= 2 && isSearching ? (
              <LoadingState title="Mitglieder werden gesucht" description="Passende Fansub-Nicks werden gesucht." />
            ) : null}
            {candidateQuery.trim().length >= 2 && !isSearching && candidateResults.length === 0 ? (
              <p className={styles.fansubEditHint}>Keine passenden Mitglieder gefunden.</p>
            ) : null}

            {candidateResults.length > 0 ? (
              <div className={styles.fansubEditCandidateResults} aria-label="Gefundene Fansub-Mitglieder">
                {candidateResults.map((candidate) => {
                  if (!candidate?.app_user_id) return null
                  const selected = String(candidate.app_user_id) === selectedCandidateId
                  return (
                    <button
                      key={candidate.app_user_id}
                      type="button"
                      className={styleNames(styles.fansubEditCandidateResult, selected && styles.fansubEditCandidateResultSelected)}
                      aria-pressed={selected}
                      onClick={() => onCandidateSelect(candidate)}
                    >
                      <span>
                        <strong>{candidate.fansub_name}</strong>
                        <small>{selected ? 'Ausgewählt' : 'Zum Hinzufügen auswählen'}</small>
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}

            {selectedCandidate ? (
              <div className={styles.fansubEditCandidateSelection} role="status">
                <span>Ausgewähltes Profil</span>
                <strong>{selectedCandidate.fansub_name}</strong>
              </div>
            ) : null}

            {selectedCandidate ? (
              <FormField
                label="Historische Identität"
                htmlFor="fansub-member-historical-identity"
                hint="Optional verknüpfen, wenn dieses App-Mitglied bereits als historisches Mitglied mit offener Rolle existiert."
              >
                <Select
                  id="fansub-member-historical-identity"
                  value={selectedHistoricalMemberId}
                  onChange={(event) => onHistoricalMemberChange(event.target.value)}
                >
                  <option value="">Keine historische Identität verknüpfen</option>
                  {historicalIdentityOptions.map((option) => (
                    <option key={option.id} value={String(option.id)}>
                      {option.displayName} - {option.roleSummary}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : null}

            {hasHistoricalSelection ? (
              <p className={styles.fansubEditHint}>Offene historische Rollen werden automatisch übernommen.</p>
            ) : (
              <div>
                <p className={styles.fansubEditHint}>Aufgaben in dieser Gruppe</p>
                <div className={styles.chipRow}>
                  {roleOptions.map((option) => {
                    const selected = selectedRoles.includes(option.code)
                    return (
                      <Button
                        key={option.code}
                        variant={selected ? 'secondary' : 'ghost'}
                        size="sm"
                        className={styleNames(styles.fansubEditRoleOption, getRoleClassName(option.code), selected && styles.fansubEditRoleOptionSelected)}
                        aria-pressed={selected}
                        onClick={() => onToggleRole(option.code)}
                        title={option.description}
                      >
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}

            <Button
              variant="primary"
              fullWidth
              onClick={onAddMember}
              disabled={isAdding || !canSubmitMember}
            >
              {isAdding
                ? 'Wird hinzugefügt...'
                : !selectedCandidateId
                  ? 'Profil auswählen'
                  : !canSubmitMember
                    ? 'Aufgabe auswählen'
                    : hasHistoricalSelection
                      ? 'Mitglied verknüpfen'
                    : 'Mitglied hinzufügen'}
            </Button>
          </Card>
        ) : null}

        {canCreateInvitation ? (
          <Card
            variant="nestedFlat"
            className={styles.fansubEditMemberAddCard}
            title="Einladung"
            description="Per E-Mail einladen und Aufgaben für die Annahme festlegen."
          >
            <FormField label="E-Mail-Adresse" htmlFor="fansub-member-invite-email">
              <Input
                id="fansub-member-invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => onInviteEmailChange(event.target.value)}
                placeholder="E-Mail-Adresse für die Einladung"
              />
            </FormField>

            <div>
              <p className={styles.fansubEditHint}>Aufgaben nach Annahme</p>
              <div className={styles.chipRow}>
                {roleOptions.map((option) => {
                  const selected = inviteRoles.includes(option.code)
                  return (
                    <Button
                      key={`invite-${option.code}`}
                      variant={selected ? 'secondary' : 'ghost'}
                      size="sm"
                      className={styleNames(styles.fansubEditRoleOption, getRoleClassName(option.code), selected && styles.fansubEditRoleOptionSelected)}
                      aria-pressed={selected}
                      onClick={() => onToggleInviteRole(option.code)}
                      title={option.description}
                    >
                      {option.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={onCreateInvitation}
              disabled={isCreatingInvite || !inviteEmail.trim() || inviteRoles.length === 0}
            >
              {isCreatingInvite ? 'Einladung wird erstellt...' : 'Einladung erstellen'}
            </Button>
          </Card>
        ) : null}
      </div>
    </Modal>
  )
}
