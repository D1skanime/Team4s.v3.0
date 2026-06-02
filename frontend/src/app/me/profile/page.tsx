'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { MemberProfileHero } from '@/components/profile/MemberProfileHero'
import { RecentContributionsSection } from '@/components/profile/RecentContributionsSection'
import { RecentMediaSection } from '@/components/profile/RecentMediaSection'
import { Button, Card, ErrorState, LoadingState, SectionHeader } from '@/components/ui'
import { ApiError, getMyMemberClaim, getOwnProfile, patchNoindex, refreshActiveAuthSession, resolveApiUrl, updateOwnProfile, uploadOwnProfileAvatar, uploadOwnProfileBackground } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MemberClaimRow, MemberProfileData, TipTapDocument } from '@/types/profile'

import { AccountSecurityCard } from './components/AccountSecurityCard'
import { ClaimStatusCard } from './components/ClaimStatusCard'
import { MemberClaimSection } from './components/MemberClaimSection'
import { MemberAvatarCard } from './components/MemberAvatarCard'
import { ProfileBackgroundCard } from './components/ProfileBackgroundCard'
import { ProfileBasicsForm } from './components/ProfileBasicsForm'
import { ProfileStoryCard } from './components/ProfileStoryCard'
import { VisibilityCard } from './components/VisibilityCard'
import { getMaxActivityYear, MIN_ACTIVITY_YEAR } from './components/activityYears'
import type { MemberProfileFormState } from './components/profileFormTypes'
import styles from './page.module.css'

const PROFILE_LOAD_TIMEOUT_MS = 10000
const AUTH_REQUIRED_MESSAGE = 'Anmeldung erforderlich. Bitte melde dich erneut an.'

function richTextFromPlainText(text: string): TipTapDocument {
  const trimmed = text.trim()
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: trimmed ? [{ type: 'text', text: trimmed }] : [] }],
  }
}

function isTipTapDocument(value: unknown): value is TipTapDocument {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function toFormState(profile: MemberProfileData): MemberProfileFormState {
  return {
    fansubName: profile.fansub_name || '',
    bio: profile.bio || '',
    memberStory: isTipTapDocument(profile.member_story_json)
      ? profile.member_story_json
      : richTextFromPlainText(profile.member_story || ''),
    activeFromYear: yearFromProfileDate(profile.active_from_date, profile.active_from_year),
    activeUntilYear: yearFromProfileDate(profile.active_until_date, profile.active_until_year),
    isCurrentlyActive: Boolean(profile.is_currently_active),
    profileVisibility: profile.profile_visibility || 'members_only',
  }
}

function emptyFormState(): MemberProfileFormState {
  return {
    fansubName: '',
    bio: '',
    memberStory: richTextFromPlainText(''),
    activeFromYear: '',
    activeUntilYear: '',
    isCurrentlyActive: false,
    profileVisibility: 'members_only',
  }
}

function yearFromProfileDate(dateValue?: string | null, fallbackYear?: number | null): string {
  const trimmed = typeof dateValue === 'string' ? dateValue.trim() : ''
  const match = /^(\d{4})-01-01$/.exec(trimmed)
  if (match) return match[1]
  return fallbackYear ? String(fallbackYear) : ''
}

function normalizedDateFromYear(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed < MIN_ACTIVITY_YEAR || parsed > getMaxActivityYear()) return null
  return `${parsed}-01-01`
}

function validateOptionalYear(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (!/^\d{4}$/.test(trimmed)) return 'Bitte ein vierstelliges Jahr eingeben.'
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed < MIN_ACTIVITY_YEAR || parsed > getMaxActivityYear()) {
    return `Bitte ein Jahr zwischen ${MIN_ACTIVITY_YEAR} und ${getMaxActivityYear()} auswählen.`
  }
  return undefined
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

function withProfileLoadTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Profil konnte nicht rechtzeitig geladen werden. Bitte melde dich erneut an.'))
    }, PROFILE_LOAD_TIMEOUT_MS)
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
}

function accountSnapshot(profile: MemberProfileData): string {
  return JSON.stringify({
    accountDisplayName: profile.account_display_name || '',
    email: profile.email || '',
    status: profile.account_status || '',
    roles: [...profile.account_global_roles].sort(),
  })
}

export default function MyProfilePage() {
  const { authToken, hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const [profile, setProfile] = useState<MemberProfileData | null>(null)
  const [myClaim, setMyClaim] = useState<MemberClaimRow | null>(null)
  const [form, setForm] = useState<MemberProfileFormState>(() => emptyFormState())
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingBackground, setIsUploadingBackground] = useState(false)
  const [hasOpenedKeycloakAccount, setHasOpenedKeycloakAccount] = useState(false)
  const [isStoryEditing, setIsStoryEditing] = useState(false)
  const [isRefreshingAccount, setIsRefreshingAccount] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const accountSnapshotRef = useRef<string | null>(null)
  const hasOpenedKeycloakAccountRef = useRef(false)
  const isFormDirtyRef = useRef(false)
  const isRefreshingAccountRef = useRef(false)
  const hasAuthSession = hasAccessToken || hasRefreshToken

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
    const [response, claim] = await Promise.all([
      getOwnProfile(),
      getMyMemberClaim().catch(() => null),
    ])
    setMyClaim(claim)
    applyProfile(response.data, options)
    return response.data
  }, [applyProfile])

  const refreshAccountAfterReturn = useCallback(async () => {
    if (!isClientInitialized || !hasAuthSession || !hasOpenedKeycloakAccountRef.current || isRefreshingAccountRef.current) return
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
      setError(readErrorMessage(refreshError, 'Accountdaten konnten nach der Rückkehr nicht aktualisiert werden.'))
    } finally {
      isRefreshingAccountRef.current = false
      setIsRefreshingAccount(false)
    }
  }, [hasAuthSession, isClientInitialized, loadProfile])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!isClientInitialized) return
      if (!hasAuthSession) {
        setError(AUTH_REQUIRED_MESSAGE)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const response = await withProfileLoadTimeout(getOwnProfile())
        if (!cancelled) applyProfile(response.data, { syncForm: true, resetDirty: true })
      } catch (loadError) {
        if (!cancelled) {
          setError(isUnauthorizedError(loadError) ? AUTH_REQUIRED_MESSAGE : readErrorMessage(loadError, 'Profil konnte nicht geladen werden.'))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [applyProfile, hasAuthSession, isClientInitialized])

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
  const backgroundImageURL = useMemo(() => resolveApiUrl(profile?.background_image?.public_url || ''), [profile?.background_image?.public_url])
  const sourceBackgroundURL = useMemo(
    () => resolveApiUrl(profile?.background_image?.source_original_url || profile?.background_image?.public_url || ''),
    [profile?.background_image?.public_url, profile?.background_image?.source_original_url],
  )
  const sourceAvatarURL = useMemo(
    () => resolveApiUrl(profile?.avatar?.source_original_url || profile?.avatar?.public_url || ''),
    [profile?.avatar?.public_url, profile?.avatar?.source_original_url],
  )
  const yearErrors = useMemo(() => ({
    activeFromYear: validateOptionalYear(form.activeFromYear),
    activeUntilYear: form.isCurrentlyActive ? undefined : validateOptionalYear(form.activeUntilYear),
  }), [form.activeFromYear, form.activeUntilYear, form.isCurrentlyActive])
  const hasYearErrors = Boolean(yearErrors.activeFromYear || yearErrors.activeUntilYear)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasAuthSession || !profile) return
    if (hasYearErrors) {
      setError('Bitte korrigiere die markierten Jahresfelder, bevor du speicherst.')
      setSuccess(null)
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)
      const response = await updateOwnProfile({
        fansub_name: form.fansubName.trim() || null,
        bio: form.bio.trim() || null,
        member_story_json: form.memberStory,
        active_from_date: normalizedDateFromYear(form.activeFromYear),
        active_until_date: form.isCurrentlyActive ? null : normalizedDateFromYear(form.activeUntilYear),
        is_currently_active: form.isCurrentlyActive,
        profile_visibility: form.profileVisibility,
      })
      applyProfile(response.data, { syncForm: true, resetDirty: true })
      setIsStoryEditing(false)
      setSuccess('Profil wurde gespeichert.')
    } catch (saveError) {
      setError(readErrorMessage(saveError, 'Profil konnte nicht gespeichert werden.'))
      setSuccess(null)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleNoindexChange(nextNoindex: boolean) {
    if (!hasAuthSession || !profile) return

    const previousNoindex = profile.noindex
    setProfile((current) => current ? { ...current, noindex: nextNoindex } : current)

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)
      await patchNoindex(nextNoindex, authToken || undefined)
      setSuccess('Sichtbarkeitseinstellung wurde gespeichert.')
    } catch (visibilityError) {
      setProfile((current) => current ? { ...current, noindex: previousNoindex } : current)
      setError(readErrorMessage(visibilityError, 'Sichtbarkeitseinstellung konnte nicht gespeichert werden.'))
      setSuccess(null)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAvatarSelected(payload: { sourceFile: File; croppedFile: File }) {
    if (!hasAuthSession) return

    try {
      setIsUploadingAvatar(true)
      setError(null)
      setSuccess(null)
      const response = await uploadOwnProfileAvatar(payload)
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

  async function handleBackgroundSelected(payload: { sourceFile: File; croppedFile: File }) {
    if (!hasAuthSession) return

    try {
      setIsUploadingBackground(true)
      setError(null)
      setSuccess(null)
      const response = await uploadOwnProfileBackground(payload)
      const shouldSyncForm = !isFormDirtyRef.current
      applyProfile(response.data, { syncForm: shouldSyncForm, resetDirty: shouldSyncForm })
      setSuccess('Hintergrundbild wurde aktualisiert.')
    } catch (uploadError) {
      setError(readErrorMessage(uploadError, 'Hintergrundbild konnte nicht hochgeladen werden.'))
      setSuccess(null)
      throw uploadError
    } finally {
      setIsUploadingBackground(false)
    }
  }

  function handleKeycloakAccountClick() {
    hasOpenedKeycloakAccountRef.current = true
    setHasOpenedKeycloakAccount(true)
    setSuccess(null)
  }

  return (
      <main className={styles.page}>
        {!isClientInitialized ? (
          <ErrorState
            title="Anmeldung wird geprüft"
            description="Die Profilseite wartet auf deine Browser-Session. Falls die Seite hier stehen bleibt, melde dich bitte erneut an."
            action={<Button href="/login" variant="secondary">Zur Anmeldung</Button>}
          />
        ) : isLoading ? (
          <LoadingState title="Profil wird geladen" description="Team4s lädt dein Profil." />
        ) : null}

        {isClientInitialized && !isLoading && error && !profile ? (
          <ErrorState
            title={!hasAuthSession || error === AUTH_REQUIRED_MESSAGE ? 'Anmeldung erforderlich' : 'Profil konnte nicht geladen werden'}
            description={error}
            action={<Button href="/login" variant="secondary">Zur Anmeldung</Button>}
          />
        ) : null}

        {isClientInitialized && !isLoading && profile ? (
          <>
            <MemberProfileHero profile={profile} avatarURL={avatarURL} backgroundImageURL={backgroundImageURL} isSaving={isSaving} canSave={isDirty && !hasYearErrors && profile.capabilities.can_edit_own_profile} isVerified={profile.is_verified} />
            {error ? <div className={styles.errorBox}>{error}</div> : null}
            {success ? <div className={styles.successBox}>{success}</div> : null}

            <form id="member-profile-form" className={styles.layoutGrid} onSubmit={handleSubmit}>
              <div className={styles.mainColumn}>
                <Card variant="section">
                  <SectionHeader title="Basisdaten" />
                  <ProfileBasicsForm form={form} disabled={!profile.capabilities.can_edit_own_profile || isSaving} errors={yearErrors} onChange={updateForm} />
                </Card>
                <Card variant="section">
                  <ProfileStoryCard
                    value={form.memberStory}
                    bodyHtml={profile.member_story_html}
                    plainText={profile.member_story || profile.member_story_text}
                    disabled={!profile.capabilities.can_edit_own_profile || isSaving}
                    isEditing={isStoryEditing}
                    onEdit={() => setIsStoryEditing(true)}
                    onChange={updateForm}
                  />
                </Card>
                <Card variant="section">
                  <SectionHeader title="Meine letzten Medien" />
                  <RecentMediaSection items={profile.recent_media ?? []} canView={true} isPublicView={false} />
                </Card>
                <Card variant="section">
                  <SectionHeader title="Meine letzten Beiträge" />
                  <RecentContributionsSection items={profile.recent_contributions ?? []} canView={true} isPublicView={false} />
                </Card>
              </div>

              <aside className={styles.sideColumn}>
                <Card variant="section" title="Avatar-Bild">
                  <MemberAvatarCard
                    profile={profile}
                    avatarURL={avatarURL}
                    sourceAvatarURL={sourceAvatarURL}
                    isUploading={isUploadingAvatar}
                    onAvatarSelected={handleAvatarSelected}
                  />
                </Card>
                <Card variant="section" title="Hintergrundbild">
                  <ProfileBackgroundCard
                    profile={profile}
                    backgroundURL={backgroundImageURL}
                    sourceBackgroundURL={sourceBackgroundURL}
                    isUploading={isUploadingBackground}
                    onBackgroundSelected={handleBackgroundSelected}
                  />
                </Card>
                <Card variant="section">
                  <VisibilityCard value={form.profileVisibility} disabled={!profile.capabilities.can_edit_own_profile || isSaving} onChange={updateForm} />
                </Card>
                <Card variant="section" title="Claim & Indexierung">
                  <ClaimStatusCard
                    noindex={profile.noindex}
                    claimStatus={profile.claim_status}
                    claimMemberNick={profile.claim_member_nick}
                    disabled={isSaving}
                    onNoindexChange={handleNoindexChange}
                  />
                </Card>
                <Card variant="section" title="Member-Claim">
                  <MemberClaimSection currentClaim={myClaim} authToken={authToken || undefined} disabled={isSaving} />
                </Card>
                <Card variant="section" title="Account & Sicherheit">
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
  )
}
