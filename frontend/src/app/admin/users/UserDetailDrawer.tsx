'use client'

import { useState } from 'react'

import { Button, Drawer } from '@/components/ui'

import { UserAuditTab } from './tabs/UserAuditTab'
import { UserClaimsTab } from './tabs/UserClaimsTab'
import { UserContributionsTab } from './tabs/UserContributionsTab'
import { UserGlobalRolesTab } from './tabs/UserGlobalRolesTab'
import { UserGroupMembershipsTab } from './tabs/UserGroupMembershipsTab'
import { UserGroupRightsTab } from './tabs/UserGroupRightsTab'
import { UserMediaTab } from './tabs/UserMediaTab'
import { UserOverviewTab } from './tabs/UserOverviewTab'
import { UserStreamingGrantsTab } from './tabs/UserStreamingGrantsTab'

interface Props {
  userId: number | null
  onClose: () => void
}

type TabId =
  | 'overview'
  | 'roles'
  | 'claims'
  | 'memberships'
  | 'group-rights'
  | 'contributions'
  | 'media'
  | 'audit'
  | 'streaming'

interface TabDef {
  id: TabId
  label: string
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'roles', label: 'Globale Rollen' },
  { id: 'claims', label: 'Member-Profil & Claims' },
  { id: 'memberships', label: 'Gruppenmitgliedschaften' },
  { id: 'group-rights', label: 'Gruppenrechte' },
  { id: 'contributions', label: 'Beiträge' },
  { id: 'media', label: 'Medien' },
  { id: 'audit', label: 'Audit' },
  { id: 'streaming', label: 'Streaming' },
]

export function UserDetailDrawer({ userId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  // activatedTabs: enthält alle jemals aktivierten Tabs → Lazy-Load (D-09)
  const [activatedTabs, setActivatedTabs] = useState<Set<TabId>>(new Set(['overview']))

  function handleTabChange(tabId: TabId) {
    setActiveTab(tabId)
    setActivatedTabs((prev) => new Set([...prev, tabId]))
  }

  return (
    <Drawer
      open={userId !== null}
      onClose={onClose}
      title="Benutzerdetails"
    >
      {/* Tab-Navigation */}
      <div
        role="tablist"
        aria-label="Benutzerdetails Reiter"
        style={{
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--color-border, #e5e7eb)',
          marginBottom: '16px',
          paddingBottom: '0',
        }}
      >
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant={activeTab === tab.id ? 'secondary' : 'ghost'}
            size="sm"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab-Inhalte (alle gerendert, nur aktiver sichtbar — Lazy-Load via activatedTabs) */}
      {userId !== null && (
        <>
          <div role="tabpanel" style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
            {activatedTabs.has('overview') && <UserOverviewTab userId={userId} />}
          </div>
          <div role="tabpanel" style={{ display: activeTab === 'roles' ? 'block' : 'none' }}>
            {activatedTabs.has('roles') && <UserGlobalRolesTab userId={userId} />}
          </div>
          <div role="tabpanel" style={{ display: activeTab === 'claims' ? 'block' : 'none' }}>
            {activatedTabs.has('claims') && <UserClaimsTab userId={userId} />}
          </div>
          <div role="tabpanel" style={{ display: activeTab === 'memberships' ? 'block' : 'none' }}>
            {activatedTabs.has('memberships') && <UserGroupMembershipsTab userId={userId} />}
          </div>
          <div role="tabpanel" style={{ display: activeTab === 'group-rights' ? 'block' : 'none' }}>
            {activatedTabs.has('group-rights') && <UserGroupRightsTab userId={userId} />}
          </div>
          <div role="tabpanel" style={{ display: activeTab === 'contributions' ? 'block' : 'none' }}>
            {activatedTabs.has('contributions') && <UserContributionsTab userId={userId} />}
          </div>
          <div role="tabpanel" style={{ display: activeTab === 'media' ? 'block' : 'none' }}>
            {activatedTabs.has('media') && <UserMediaTab userId={userId} />}
          </div>
          <div role="tabpanel" style={{ display: activeTab === 'audit' ? 'block' : 'none' }}>
            {activatedTabs.has('audit') && <UserAuditTab userId={userId} />}
          </div>
          <div role="tabpanel" style={{ display: activeTab === 'streaming' ? 'block' : 'none' }}>
            {activatedTabs.has('streaming') && <UserStreamingGrantsTab userId={userId} />}
          </div>
        </>
      )}
    </Drawer>
  )
}
