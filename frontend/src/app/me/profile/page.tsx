'use client'

import Image from 'next/image'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, Eye, Pencil, Save } from 'lucide-react'

import { RecentContributionsSection } from '@/components/profile/RecentContributionsSection'
import { RecentMediaSection } from '@/components/profile/RecentMediaSection'
import { VerifiedBadge } from '@/components/profile/VerifiedBadge'
import { Button, Card, ErrorState, FormField, LoadingState, SectionHeader, Textarea } from '@/components/ui'
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

type ProfileTab = 'profile' | 'visibility' | 'activity' | 'account'

const PROFILE_TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: 'profile', label: 'Profil' },
  { id: 'visibility', label: 'Sichtbarkeit' },
  { id: 'activity', label: 'Aktivität' },
  { id: 'account', label: 'Account' },
]

function getPublicProfileHref(profile: MemberProfileData): string {
  return `/members/${profile.slug || profile.member_id}`
}

function getProfileDisplayName(profile: MemberProfileData): string {
  return profile.fansub_name || profile.account_display_name || 'Mein Profil'
}

function ProfileAccordion({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className={styles.accordion}>
      <button
        type="button"
        className={styles.accordionButton}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{title}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {isOpen ? <div className={styles.accordionPanel}>{children}</div> : null}
    </section>
  )
}

function EditableProfileHeader({
  profile,
  avatarURL,
  backgroundImageURL,
  onAvatarEdit,
  onBackgroundEdit,
}: {
  profile: MemberProfileData
  avatarURL: string
  backgroundImageURL: string
  onAvatarEdit: () => void
  onBackgroundEdit: () => void
}) {
  const displayName = getProfileDisplayName(profile)

  return (
    <section
      className={styles.profileHeaderCard}
      style={
        backgroundImageURL
          ? {
              backgroundImage: `linear-gradient(135deg, rgba(31, 41, 55, 0.9), rgba(47, 95, 227, 0.64)), url("${backgroundImageURL}")`,
            }
          : undefined
      }
      aria-label="Profilvorschau"
    >
      <div className={styles.profileHeaderAvatarWrap}>
        <div className={styles.profileHeaderAvatar}>
          {avatarURL ? (
            <Image src={avatarURL} alt={`${displayName} Avatar`} width={136} height={136} unoptimized />
          ) : (
            <span aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          iconOnly
          className={styles.profileHeaderAvatarButton}
          aria-label="Avatar-Bild ändern"
          disabled={!profile.capabilities.can_upload_own_avatar}
          leftIcon={<Pencil size={16} aria-hidden="true" />}
          onClick={onAvatarEdit}
        />
      </div>
      <div className={styles.profileHeaderCopy}>
        <h1 className={styles.profileHeaderTitle}>
          <span>{displayName}</span>
          {profile.is_verified ? <VerifiedBadge /> : null}
        </h1>
        <p>{profile.bio || 'Noch keine Kurzbeschreibung hinterlegt.'}</p>
      </div>
      <div className={styles.profileHeaderActions}>
        <Button href={getPublicProfileHref(profile)} variant="ghost" size="sm" leftIcon={<Eye size={16} aria-hidden="true" />}>
          Profil ansehen
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Pencil size={16} aria-hidden="true" />}
          disabled={!profile.capabilities.can_edit_own_profile}
          onClick={onBackgroundEdit}
        >
          Banner ändern
        </Button>
      </div>
    </section>
  )
}

export default function MyProfilePage() {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
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
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')
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
  const hasMemberProfile = profile ? profile.has_member_profile || profile.member_id > 0 : false

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

    if (!hasMemberProfile || !profile.member_id || profile.member_id <= 0) {
      setError('Speichern nicht möglich: Kein verifizierter Member-Kontext.')
      setSuccess(null)
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)
      let resolvedStory = form.memberStory
      if (pendingImages.size > 0) {
        const storyUploadFn = (file: File, onProgress?: (pct: number) => void) =>
          uploadOwnProfileStoryImage({ file, onProgress, visibilityCode: 'private', reviewStatusCode: 'in_review' })
        resolvedStory = await uploadPendingStoryImages(
          form.memberStory,
          pendingImages,
          storyUploadFn,
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
      await patchNoindex(nextNoindex)
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
      await patchMyBadgeVisibility(badgeId, visibility)
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
    if (!hasMemberProfile || !profile?.member_id || profile.member_id <= 0) {
      setError('Upload nicht möglich: Kein verifizierter Member-Kontext.')
      setSuccess(null)
      return
    }
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
    if (!hasMemberProfile || !profile?.member_id || profile.member_id <= 0) {
      setError('Upload nicht möglich: Kein verifizierter Member-Kontext.')
      setSuccess(null)
      return
    }
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

      {isClientInitialized && !isLoading && profile && !hasMemberProfile ? (
        <>
          {error ? <div className={styles.errorBox}>{error}</div> : null}
          {success ? <div className={styles.successBox}>{success}</div> : null}

          <div className={styles.layoutGrid}>
            <div className={styles.mainColumn}>
              <Card variant="section">
                <SectionHeader
                  title="Mein Account"
                  description="Dieser Login ist noch keinem verifizierten Member-Eintrag zugeordnet."
                />
                <AccountSecurityCard
                  profile={profile}
                  hasOpenedKeycloakAccount={hasOpenedKeycloakAccount}
                  isRefreshingAccount={isRefreshingAccount}
                  onKeycloakAccountClick={handleKeycloakAccountClick}
                />
              </Card>
            </div>

            <aside className={styles.sideColumn}>
              <Card variant="section" title="Member-Eintrag">
                <p className={styles.mutedText}>
                  Ein normales Konto ist noch kein öffentliches Member-Profil. Suche deinen historischen Nick oder beantrage einen neuen Member-Eintrag.
                </p>
                <MemberClaimSection currentClaim={myClaim} disabled={isSaving} />
              </Card>
            </aside>
          </div>
        </>
      ) : null}

      {isClientInitialized && !isLoading && profile && hasMemberProfile ? (
        <>
          <div className={styles.profileWorkspace}>
            <EditableProfileHeader
              profile={profile}
              avatarURL={avatarURL}
              backgroundImageURL={backgroundImageURL}
              onAvatarEdit={() => avatarInputRef.current?.click()}
              onBackgroundEdit={() => backgroundInputRef.current?.click()}
            />
            {error ? <div className={styles.errorBox}>{error}</div> : null}
            {success ? <div className={styles.successBox}>{success}</div> : null}

            <div className={styles.profileTabs} role="tablist" aria-label="Profilbereiche">
              {PROFILE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  className={`${styles.profileTabButton} ${activeTab === tab.id ? styles.profileTabButtonActive : ''}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`profile-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <form id="member-profile-form" className={styles.profileWorkspace} onSubmit={handleSubmit}>
            <section
              id="profile-tab-profile"
              className={`${styles.profileTabPanel} ${activeTab !== 'profile' ? styles.profileTabPanelInactive : ''}`}
              role="tabpanel"
              aria-hidden={activeTab !== 'profile'}
            >
              <div className={styles.accordionGroup}>
                <ProfileAccordion title="Basisdaten">
                  <ProfileBasicsForm form={form} disabled={!profile.capabilities.can_edit_own_profile || isSaving} errors={yearErrors} onChange={updateForm} />
                </ProfileAccordion>

                <ProfileAccordion title="Über mich">
                  <div className={styles.aboutGroup}>
                    <FormField label="Kurzbeschreibung" htmlFor="bio" hint={`${form.bio.length}/280 Zeichen`}>
                      <Textarea
                        id="bio"
                        className={styles.bioTextarea}
                        rows={2}
                        maxLength={280}
                        value={form.bio}
                        disabled={!profile.capabilities.can_edit_own_profile || isSaving}
                        onChange={(event) => updateForm((current) => ({ ...current, bio: event.target.value }))}
                        placeholder="Ein kurzer Eindruck deiner Fansub-Rolle."
                      />
                    </FormField>
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
                  </div>
                </ProfileAccordion>
              </div>
            </section>

            <section
              id="profile-tab-visibility"
              className={`${styles.profileTabPanel} ${activeTab !== 'visibility' ? styles.profileTabPanelInactive : ''}`}
              role="tabpanel"
              aria-hidden={activeTab !== 'visibility'}
            >
              <ProfileAccordion title="Profilbilder">
                <MemberAvatarCard
                  profile={profile}
                  avatarURL={avatarURL}
                  sourceAvatarURL={sourceAvatarURL}
                  isUploading={isUploadingAvatar}
                  inputRef={avatarInputRef}
                  variant="compact"
                  onAvatarSelected={handleAvatarSelected}
                />
                <ProfileBackgroundCard
                  profile={profile}
                  backgroundURL={backgroundImageURL}
                  sourceBackgroundURL={sourceBackgroundURL}
                  isUploading={isUploadingBackground}
                  inputRef={backgroundInputRef}
                  variant="compact"
                  onBackgroundSelected={handleBackgroundSelected}
                />
              </ProfileAccordion>

              <ProfileAccordion title="Profil-Sichtbarkeit">
                <VisibilityCard value={form.profileVisibility} disabled={!profile.capabilities.can_edit_own_profile || isSaving} onChange={updateForm} />
                <ClaimStatusCard
                  noindex={profile.noindex}
                  claimStatus={effectiveClaimStatus}
                  claimMemberNick={profile.claim_member_nick ?? profile.fansub_name}
                  disabled={isSaving || !profile.is_verified}
                  onNoindexChange={handleNoindexChange}
                />
                {effectiveClaimStatus !== 'verified' ? (
                  <Card variant="flat" title="Identität verknüpfen">
                    <MemberClaimSection currentClaim={myClaim} disabled={isSaving} />
                  </Card>
                ) : null}
              </ProfileAccordion>

              <ProfileAccordion title="Erfolgs-Badges">
                <AchievementBadgesCard
                  badges={badges}
                  disabled={!profile.capabilities.can_edit_own_profile || isSaving}
                  pendingBadgeId={pendingBadgeId}
                  error={badgeError}
                  onVisibilityChange={handleBadgeVisibilityChange}
                />
              </ProfileAccordion>
            </section>

            <section
              id="profile-tab-activity"
              className={`${styles.profileTabPanel} ${activeTab !== 'activity' ? styles.profileTabPanelInactive : ''}`}
              role="tabpanel"
              aria-hidden={activeTab !== 'activity'}
            >
              <div className={styles.statusRow}>
                <strong>
                  {effectiveClaimStatus === 'verified'
                    ? `Verifiziert als ${profile.claim_member_nick ?? profile.fansub_name}`
                    : 'Noch nicht verifiziert'}
                </strong>
                {effectiveClaimStatus === 'verified' ? <VerifiedBadge /> : <span className={styles.mutedText}>Identität noch nicht bestätigt</span>}
              </div>
              <Card variant="section">
                <SectionHeader
                  title="Letzte Projekte"
                  actions={<Button href="/me/contributions" variant="secondary" size="sm">Meine Projekte</Button>}
                />
                <RecentContributionsSection items={profile.recent_contributions ?? []} canView={true} isPublicView={false} />
              </Card>
              <Card variant="section">
                <SectionHeader title="Meine letzten Medien" />
                <RecentMediaSection items={profile.recent_media ?? []} canView={true} isPublicView={false} />
              </Card>
            </section>

            <section
              id="profile-tab-account"
              className={`${styles.profileTabPanel} ${activeTab !== 'account' ? styles.profileTabPanelInactive : ''}`}
              role="tabpanel"
              aria-hidden={activeTab !== 'account'}
            >
              <Card variant="section" title="Account">
                <AccountSecurityCard
                  profile={profile}
                  hasOpenedKeycloakAccount={hasOpenedKeycloakAccount}
                  isRefreshingAccount={isRefreshingAccount}
                  onKeycloakAccountClick={handleKeycloakAccountClick}
                />
              </Card>
            </section>

            <div className={styles.stickySaveBar} role="status" aria-live="polite">
              <div className={styles.stickySaveInner}>
                <span className={styles.dirtyStatus}>
                  <span className={`${styles.dirtyDot} ${isDirty ? styles.dirtyDotActive : ''}`} aria-hidden="true" />
                  {isDirty ? 'Ungespeicherte Änderungen' : 'Keine Änderungen'}
                </span>
                <Button
                  type="submit"
                  variant="success"
                  loading={isSaving}
                  disabled={!isDirty || hasYearErrors || !profile.capabilities.can_edit_own_profile}
                  leftIcon={<Save size={16} aria-hidden="true" />}
                >
                  Profil speichern
                </Button>
              </div>
            </div>
          </form>
        </>
      ) : null}
    </main>
  )
}
