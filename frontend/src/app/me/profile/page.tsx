'use client'

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { Button, Card, ErrorState, LoadingState, SectionHeader } from '@/components/ui'
import { ApiError, getOwnProfile, refreshActiveAuthSession, resolveApiUrl, updateOwnProfile, uploadOwnProfileAvatar } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MemberProfileData } from '@/types/profile'

import { AccountSecurityCard } from './components/AccountSecurityCard'
import { ContributionsSection } from './components/ContributionsSection'
import { MemberAvatarCard } from './components/MemberAvatarCard'
import { MemberProfileHero } from './components/MemberProfileHero'
import { MembershipsSection } from './components/MembershipsSection'
import { ProfileBasicsForm } from './components/ProfileBasicsForm'
import { ProfileStoryCard } from './components/ProfileStoryCard'
import { VisibilityCard } from './components/VisibilityCard'
import type { MemberProfileFormState } from './components/profileFormTypes'
import styles from './page.module.css'

function richTextFromPlainText(text: string): unknown {
  const trimmed = text.trim()
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: trimmed ? [{ type: 'text', text: trimmed }] : [] }],
  }
}

function richTextToPlainText(value: unknown): string {
  const parts: string[] = []

  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    const current = node as { text?: unknown; content?: unknown }
    if (typeof current.text === 'string') parts.push(current.text)
    if (Array.isArray(current.content)) {
      for (const child of current.content) walk(child)
      if (parts.length > 0) parts.push('\n')
    }
  }

  walk(value)
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim()
}

function toFormState(profile: MemberProfileData): MemberProfileFormState {
  return {
    displayName: profile.display_name || '',
    fansubName: profile.fansub_name || '',
    bio: profile.bio || '',
    memberStory: richTextFromPlainText(profile.member_story || ''),
    activeFromYear: profile.active_from_year ? String(profile.active_from_year) : '',
    activeUntilYear: profile.active_until_year ? String(profile.active_until_year) : '',
    isCurrentlyActive: Boolean(profile.is_currently_active),
    profileVisibility: profile.profile_visibility || 'members_only',
  }
}

function emptyFormState(): MemberProfileFormState {
  return {
    displayName: '',
    fansubName: '',
    bio: '',
    memberStory: richTextFromPlainText(''),
    activeFromYear: '',
    activeUntilYear: '',
    isCurrentlyActive: false,
    profileVisibility: 'members_only',
  }
}

function parseOptionalYear(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed < 1970 || parsed > 2100) return null
  return parsed
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function accountSnapshot(profile: MemberProfileData): string {
  return JSON.stringify({
    accountDisplayName: profile.account_display_name || '',
    email: profile.email || '',
    status: profile.account_status || '',
    roles: [...profile.account_global_roles].sort(),
  })
}

function canAccessAdmin(profile: MemberProfileData | null): boolean {
  return Boolean(profile?.account_global_roles.includes('platform_admin') || profile?.account_global_roles.includes('admin'))
}

export default function MyProfilePage() {
  const { hasAccessToken, isClientInitialized } = useAuthSession()
  const [profile, setProfile] = useState<MemberProfileData | null>(null)
  const [form, setForm] = useState<MemberProfileFormState>(() => emptyFormState())
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [hasOpenedKeycloakAccount, setHasOpenedKeycloakAccount] = useState(false)
  const [isRefreshingAccount, setIsRefreshingAccount] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const accountSnapshotRef = useRef<string | null>(null)
  const hasOpenedKeycloakAccountRef = useRef(false)
  const isFormDirtyRef = useRef(false)
  const isRefreshingAccountRef = useRef(false)

  const applyProfile = useCallback((nextProfile: MemberProfileData, options: { syncForm: boolean; resetDirty?: boolean }) => {
    setProfile(nextProfile)
    accountSnapshotRef.current = accountSnapshot(nextProfile)
    if (options.syncForm) setForm(toFormState(nextProfile))
    if (options.resetDirty) {
      isFormDirtyRef.current = false
      setIsDirty(false)
    }
  }, [])

  const updateForm = useCallback((updater: (current: MemberProfileFormState) => MemberProfileFormState) => {
    isFormDirtyRef.current = true
    setIsDirty(true)
    setForm(updater)
  }, [])

  const loadProfile = useCallback(async (options: { syncForm: boolean; resetDirty?: boolean }) => {
    const response = await getOwnProfile()
    applyProfile(response.data, options)
    return response.data
  }, [applyProfile])

  const refreshAccountAfterReturn = useCallback(async () => {
    if (!isClientInitialized || !hasAccessToken || !hasOpenedKeycloakAccountRef.current || isRefreshingAccountRef.current) return
    isRefreshingAccountRef.current = true
    setIsRefreshingAccount(true)

    try {
      setError(null)
      setSuccess(null)
      await refreshActiveAuthSession()
      const previousSnapshot = accountSnapshotRef.current
      const shouldSyncForm = !isFormDirtyRef.current
      const nextProfile = await loadProfile({ syncForm: shouldSyncForm, resetDirty: shouldSyncForm })
      const nextSnapshot = accountSnapshot(nextProfile)
      if (previousSnapshot && previousSnapshot !== nextSnapshot) setSuccess('Accountdaten aktualisiert.')
    } catch (refreshError) {
      setError(readErrorMessage(refreshError, 'Accountdaten konnten nach der Rückkehr von Keycloak nicht aktualisiert werden.'))
    } finally {
      isRefreshingAccountRef.current = false
      setIsRefreshingAccount(false)
    }
  }, [hasAccessToken, isClientInitialized, loadProfile])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!isClientInitialized) return
      if (!hasAccessToken) {
        setError('Anmeldung erforderlich. Bitte zuerst einen gültigen Login aufbauen.')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const response = await getOwnProfile()
        if (!cancelled) applyProfile(response.data, { syncForm: true, resetDirty: true })
      } catch (loadError) {
        if (!cancelled) setError(readErrorMessage(loadError, 'Profil konnte nicht geladen werden.'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [applyProfile, hasAccessToken, isClientInitialized])

  useEffect(() => {
    function handleFocus() {
      void refreshAccountAfterReturn()
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') void refreshAccountAfterReturn()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshAccountAfterReturn])

  const avatarURL = useMemo(() => resolveApiUrl(profile?.avatar?.public_url || ''), [profile?.avatar?.public_url])
  const shellUser = useMemo(() => ({
    displayName: profile?.account_display_name || profile?.display_name || '',
    email: profile?.email || '',
  }), [profile])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasAccessToken || !profile) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)
      const response = await updateOwnProfile({
        display_name: form.displayName.trim() || null,
        fansub_name: form.fansubName.trim() || null,
        bio: form.bio.trim() || null,
        member_story: richTextToPlainText(form.memberStory) || null,
        active_from_year: parseOptionalYear(form.activeFromYear),
        active_until_year: form.isCurrentlyActive ? null : parseOptionalYear(form.activeUntilYear),
        is_currently_active: form.isCurrentlyActive,
        profile_visibility: form.profileVisibility,
      })
      applyProfile(response.data, { syncForm: true, resetDirty: true })
      setSuccess('Profil wurde gespeichert.')
    } catch (saveError) {
      setError(readErrorMessage(saveError, 'Profil konnte nicht gespeichert werden.'))
      setSuccess(null)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !hasAccessToken) return

    try {
      setIsUploadingAvatar(true)
      setError(null)
      setSuccess(null)
      const response = await uploadOwnProfileAvatar(file)
      const shouldSyncForm = !isFormDirtyRef.current
      applyProfile(response.data, { syncForm: shouldSyncForm, resetDirty: shouldSyncForm })
      setSuccess('Avatar wurde aktualisiert.')
    } catch (uploadError) {
      setError(readErrorMessage(uploadError, 'Avatar konnte nicht hochgeladen werden.'))
      setSuccess(null)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  function handleKeycloakAccountClick() {
    hasOpenedKeycloakAccountRef.current = true
    setHasOpenedKeycloakAccount(true)
    setSuccess(null)
  }

  return (
    <AppShell currentPath="/me/profile" user={shellUser} canAccessAdmin={canAccessAdmin(profile)}>
      <main className={styles.page}>
        {isLoading ? (
          <LoadingState title="Profil wird geladen" description="Team4s lädt deine Profil-, Mitgliedschafts- und Beitragsdaten." />
        ) : null}

        {!isLoading && error && !profile ? (
          <ErrorState
            title={hasAccessToken ? 'Profil konnte nicht geladen werden' : 'Anmeldung erforderlich'}
            description={error}
            action={<Button href="/auth" variant="secondary">Zur Anmeldung</Button>}
          />
        ) : null}

        {!isLoading && profile ? (
          <>
            <MemberProfileHero profile={profile} isDirty={isDirty} isSaving={isSaving} canSave={isDirty && profile.capabilities.can_edit_own_profile} />
            {error ? <div className={styles.errorBox}>{error}</div> : null}
            {success ? <div className={styles.successBox}>{success}</div> : null}

            <form id="member-profile-form" className={styles.layoutGrid} onSubmit={handleSubmit}>
              <div className={styles.mainColumn}>
                <Card variant="section">
                  <SectionHeader title="Basisdaten" description="Team4s-eigene Profilfelder. Accountdaten bleiben bei Keycloak." />
                  <ProfileBasicsForm form={form} disabled={!profile.capabilities.can_edit_own_profile || isSaving} onChange={updateForm} />
                </Card>
                <Card variant="section">
                  <ProfileStoryCard value={form.memberStory} disabled={!profile.capabilities.can_edit_own_profile || isSaving} onChange={updateForm} />
                </Card>
                <Card variant="section">
                  <SectionHeader title="Mitgliedschaften" description="Gruppenkontext und aktive App-Rollen, ohne Gruppenverwaltung in dieses Profil zu ziehen." />
                  <MembershipsSection profile={profile} />
                </Card>
                <Card variant="section">
                  <SectionHeader title="Meine Beiträge" description="Echte historische Credit-Aggregate. Detailansichten bleiben bis zu einem eigenen Contract deaktiviert." />
                  <ContributionsSection profile={profile} />
                </Card>
              </div>

              <aside className={styles.sideColumn}>
                <Card variant="section" title="Profilbild">
                  <MemberAvatarCard profile={profile} avatarURL={avatarURL} isUploading={isUploadingAvatar} onAvatarChange={handleAvatarChange} />
                </Card>
                <Card variant="section">
                  <VisibilityCard value={form.profileVisibility} disabled={!profile.capabilities.can_edit_own_profile || isSaving} onChange={updateForm} />
                </Card>
                <Card variant="section" title="Account & Sicherheit" description="Read-only Keycloak-Daten. E-Mail, Passwort und MFA werden nicht in Team4s bearbeitet.">
                  <AccountSecurityCard
                    profile={profile}
                    hasOpenedKeycloakAccount={hasOpenedKeycloakAccount}
                    isRefreshingAccount={isRefreshingAccount}
                    onKeycloakAccountClick={handleKeycloakAccountClick}
                  />
                </Card>
              </aside>
            </form>
          </>
        ) : null}
      </main>
    </AppShell>
  )
}
