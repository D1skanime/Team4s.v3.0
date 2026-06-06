'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { MemberProfileHero } from '@/components/profile/MemberProfileHero'
import { RecentContributionsSection } from '@/components/profile/RecentContributionsSection'
import { RecentMediaSection } from '@/components/profile/RecentMediaSection'
import { Button, Card, ErrorState, LoadingState, SectionHeader } from '@/components/ui'
import { ApiError, getMyBadges, getMyMemberClaim, getOwnProfile, patchMyBadgeVisibility, patchNoindex, refreshActiveAuthSession, resolveApiUrl, updateOwnProfile, uploadOwnProfileAvatar, uploadOwnProfileBackground, uploadOwnProfileStoryImage } from '@/lib/api'
import { uploadPendingStoryImages } from '@/lib/storyImageUpload'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MemberBadge } from '@/types/contributions'
import type { MemberClaimRow, MemberProfileData } from '@/types/profile'

import { AccountSecurityCard } from './components/AccountSecurityCard'
import { AchievementBadgesCard } from './components/AchievementBadgesCard'
import { ClaimStatusCard } from './components/ClaimStatusCard'
import { MemberClaimSection } from './components/MemberClaimSection'
import { MemberAvatarCard } from './components/MemberAvatarCard'
import { ProfileBackgroundCard } from './components/ProfileBackgroundCard'
import { ProfileBasicsForm } from './components/ProfileBasicsForm'
import { ProfileStoryCard } from './components/ProfileStoryCard'
import { VisibilityCard } from './components/VisibilityCard'
import {
  AUTH_REQUIRED_MESSAGE,
  accountSnapshot,
  emptyFormState,
  isUnauthorizedError,
  normalizedDateFromYear,
  readErrorMessage,
  toFormState,
  validateOptionalYear,
  withProfileLoadTimeout,
} from './components/profilePageHelpers'
import type { MemberProfileFormState } from './components/profileFormTypes'
import styles from './page.module.css'

export default function MyProfilePage() {
  const { authToken, hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const [profile, setProfile] = useState<MemberProfileData | null>(null)
  const [myClaim, setMyClaim] = useState<MemberClaimRow | null>(null)
  const [badges, setBadges] = useState<MemberBadge[]>([])
  const [form, setForm] = useState<MemberProfileFormState>(() => emptyFormState())
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingBackground, setIsUploadingBackground] = useState(false)
  const [hasOpenedKeycloakAccount, setHasOpenedKeycloakAccount] = useState(false)
  const [isStoryEditing, setIsStoryEditing] = useState(false)
  const [isRefreshingAccount, setIsRefreshingAccount] = useState(false)
  const [pendingBadgeId, setPendingBadgeId] = useState<number | null>(null)
  const [badgeError, setBadgeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingImages] = useState(() => new Map<string, File>())
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map())
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
    const [response, claim, badgesResponse] = await Promise.all([
      getOwnProfile(),
      getMyMemberClaim().catch(() => null),
      getMyBadges().catch(() => ({ badges: [] })),
    ])
    setMyClaim(claim)
    setBadges(badgesResponse.badges ?? [])
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
        const [response, claim, badgesResponse] = await withProfileLoadTimeout(Promise.all([
          getOwnProfile(),
          getMyMemberClaim().catch(() => null),
          getMyBadges().catch(() => ({ badges: [] })),
        ]))
        if (!cancelled) {
          setMyClaim(claim)
          setBadges(badgesResponse.badges ?? [])
          applyProfile(response.data, { syncForm: true, resetDirty: true })
        }
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
  const effectiveClaimStatus = profile
    ? profile.claim_status ?? (profile.is_verified ? 'verified' : null)
    : null
  const yearErrors = useMemo(() => ({
    activeFromYear: validateOptionalYear(form.activeFromYear),
    activeUntilYear: form.isCurrentlyActive ? undefined : validateOptionalYear(form.activeUntilYear),
  }), [form.activeFromYear, form.activeUntilYear, form.isCurrentlyActive])
  const hasYearErrors = Boolean(yearErrors.activeFromYear || yearErrors.activeUntilYear)

  function handlePendingImageAdded(pendingKey: string, file: File) {
    pendingImages.set(pendingKey, file)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasAuthSession || !profile) return
    if (hasYearErrors) {
      setError('Bitte korrigiere die markierten Jahresfelder, bevor du speicherst.')
      setSuccess(null)
      return
    }

    // D-06-Guard: Upload nur wenn gültiger Member-Kontext
    if (!profile.member_id || profile.member_id <= 0) { setError('Upload nicht möglich: Kein gültiger Member-Kontext.'); setSuccess(null); return }
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)
      let resolvedStory = form.memberStory
      if (pendingImages.size > 0) {
        // D-03/Lock K: Story-Bilder = Prozessmedien → private/in_review
        const storyUploadFn = (file: File, onProgress?: (pct: number) => void) =>
          uploadOwnProfileStoryImage({ file, onProgress, visibilityCode: 'private', reviewStatusCode: 'in_review' })
        resolvedStory = await uploadPendingStoryImages(
          form.memberStory, pendingImages, storyUploadFn,
          (key, pct) => setUploadProgress(prev => new Map(prev).set(key, pct)),
        ) as typeof form.memberStory
      }
      const response = await updateOwnProfile({
        fansub_name: form.fansubName.trim() || null,
        bio: form.bio.trim() || null,
        member_story_json: resolvedStory,
        active_from_date: normalizedDateFromYear(form.activeFromYear),
        active_until_date: form.isCurrentlyActive ? null : normalizedDateFromYear(form.activeUntilYear),
        is_currently_active: form.isCurrentlyActive,
        profile_visibility: form.profileVisibility,
      })
      applyProfile(response.data, { syncForm: true, resetDirty: true })
      setIsStoryEditing(false)
      setSuccess('Profil wurde gespeichert.')
      pendingImages.clear()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(readErrorMessage(saveError, 'Profil konnte nicht gespeichert werden.'))
      } else {
        setError('Mindestens ein Bild konnte nicht hochgeladen werden. Die Geschichte wurde nicht gespeichert. Bitte erneut versuchen.')
      }
      setSuccess(null)
    } finally {
      setIsSaving(false)
      setUploadProgress(new Map())
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

  async function handleBadgeVisibilityChange(badgeId: number, visibility: MemberBadge['visibility']) {
    if (!hasAuthSession || pendingBadgeId !== null) return

    const previousBadges = badges
    setBadges((current) => current.map((badge) => (badge.id === badgeId ? { ...badge, visibility } : badge)))
    setPendingBadgeId(badgeId)
    setBadgeError(null)
    setSuccess(null)

    try {
      await patchMyBadgeVisibility(authToken || undefined, badgeId, visibility)
      setSuccess('Badge-Sichtbarkeit wurde gespeichert.')
    } catch (visibilityError) {
      setBadges(previousBadges)
      setBadgeError(readErrorMessage(visibilityError, 'Badge-Sichtbarkeit konnte nicht gespeichert werden.'))
      setSuccess(null)
    } finally {
      setPendingBadgeId(null)
    }
  }

  async function handleAvatarSelected(payload: { sourceFile: File; croppedFile: File }) {
    if (!hasAuthSession) return
    // D-06-Guard + D-09/Lock K: Branding-Slot public/approved (member_id aus Session)
    if (!profile?.member_id || profile.member_id <= 0) { setError('Upload nicht möglich: Kein gültiger Member-Kontext.'); setSuccess(null); return }
    try {
      setIsUploadingAvatar(true)
      setError(null)
      setSuccess(null)
      const response = await uploadOwnProfileAvatar({ ...payload, visibilityCode: 'public', reviewStatusCode: 'approved' })
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
    // D-06-Guard + D-09/Lock K: Branding-Slot public/approved (member_id aus Session)
    if (!profile?.member_id || profile.member_id <= 0) { setError('Upload nicht möglich: Kein gültiger Member-Kontext.'); setSuccess(null); return }
    try {
      setIsUploadingBackground(true)
      setError(null)
      setSuccess(null)
      const response = await uploadOwnProfileBackground({ ...payload, visibilityCode: 'public', reviewStatusCode: 'approved' })
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
                    onPendingImageAdded={handlePendingImageAdded}
                    uploadProgress={uploadProgress}
                  />
                </Card>
                <Card variant="section">
                  <SectionHeader title="Meine letzten Medien" />
                  <RecentMediaSection items={profile.recent_media ?? []} canView={true} isPublicView={false} />
                </Card>
                <Card variant="section">
                  <SectionHeader
                    title="Meine letzten Beiträge"
                    actions={<Button href="/me/contributions" variant="secondary" size="sm">Alle Beiträge</Button>}
                  />
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
                <Card variant="section">
                  <AchievementBadgesCard
                    badges={badges}
                    disabled={!profile.capabilities.can_edit_own_profile || isSaving}
                    pendingBadgeId={pendingBadgeId}
                    error={badgeError}
                    onVisibilityChange={handleBadgeVisibilityChange}
                  />
                </Card>
                <Card variant="section" title="Claim & Indexierung">
                  <ClaimStatusCard
                    noindex={profile.noindex}
                    claimStatus={effectiveClaimStatus}
                    claimMemberNick={profile.claim_member_nick ?? profile.fansub_name}
                    disabled={isSaving || !profile.is_verified}
                    onNoindexChange={handleNoindexChange}
                  />
                </Card>
                {effectiveClaimStatus !== 'verified' ? (
                  <Card variant="section" title="Member-Claim">
                    <MemberClaimSection currentClaim={myClaim} authToken={authToken || undefined} disabled={isSaving} />
                  </Card>
                ) : null}
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
