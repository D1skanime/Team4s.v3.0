'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'

import { ApiError, getOwnProfile, resolveApiUrl, updateOwnProfile, uploadOwnProfileAvatar } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MemberProfileData, ProfileVisibility } from '@/types/profile'
import { RichTextEditor } from '@/components/editor'

import sharedStyles from '../admin.module.css'
import profileStyles from './page.module.css'

const styles = { ...sharedStyles, ...profileStyles }

type FormState = {
  displayName: string
  fansubName: string
  bio: string
  memberStory: unknown
  activeFromYear: string
  activeUntilYear: string
  isCurrentlyActive: boolean
  profileVisibility: ProfileVisibility
}

function toFormState(profile: MemberProfileData): FormState {
  return {
    displayName: profile.display_name || '',
    fansubName: profile.fansub_name || '',
    bio: profile.bio || '',
    memberStory: richTextFromPlainText(profile.member_story || ''),
    activeFromYear: profile.active_from_year ? String(profile.active_from_year) : '',
    activeUntilYear: profile.active_until_year ? String(profile.active_until_year) : '',
    isCurrentlyActive: Boolean(profile.is_currently_active),
    profileVisibility: profile.profile_visibility,
  }
}

function richTextFromPlainText(text: string): unknown {
  const trimmed = text.trim()
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: trimmed ? [{ type: 'text', text: trimmed }] : [],
      },
    ],
  }
}

function richTextToPlainText(value: unknown): string {
  const parts: string[] = []

  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    const current = node as { text?: unknown; content?: unknown }
    if (typeof current.text === 'string') {
      parts.push(current.text)
    }
    if (Array.isArray(current.content)) {
      for (const child of current.content) {
        walk(child)
      }
      if (parts.length > 0) {
        parts.push('\n')
      }
    }
  }

  walk(value)
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim()
}

function parseOptionalYear(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export default function AdminProfilePage() {
  const { hasAccessToken, isClientInitialized } = useAuthSession()
  const [profile, setProfile] = useState<MemberProfileData | null>(null)
  const [form, setForm] = useState<FormState>({
    displayName: '',
    fansubName: '',
    bio: '',
    memberStory: richTextFromPlainText(''),
    activeFromYear: '',
    activeUntilYear: '',
    isCurrentlyActive: false,
    profileVisibility: 'members_only',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!isClientInitialized) {
        return
      }

      if (!hasAccessToken) {
        setError('Anmeldung erforderlich. Bitte zuerst einen gültigen Login aufbauen.')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const response = await getOwnProfile()
        if (cancelled) return
        setProfile(response.data)
        setForm(toFormState(response.data))
      } catch (loadError) {
        if (!cancelled) {
          setError(readErrorMessage(loadError, 'Profil konnte nicht geladen werden.'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [hasAccessToken, isClientInitialized])

  const avatarURL = useMemo(() => resolveApiUrl(profile?.avatar?.public_url || ''), [profile?.avatar?.public_url])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasAccessToken) return

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
        active_until_year: parseOptionalYear(form.activeUntilYear),
        is_currently_active: form.isCurrentlyActive,
        profile_visibility: form.profileVisibility,
      })
      setProfile(response.data)
      setForm(toFormState(response.data))
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
      setProfile(response.data)
      setForm(toFormState(response.data))
      setSuccess('Avatar wurde aktualisiert.')
    } catch (uploadError) {
      setError(readErrorMessage(uploadError, 'Avatar konnte nicht hochgeladen werden.'))
      setSuccess(null)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link> / <Link href="/admin/fansubs">Fansubs</Link> / Profil
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Mein Profil</h1>
        <p className={styles.subtitle}>Historische Fansub-Identität pflegen, ohne Account-Sicherheit und Gruppenverwaltung zu vermischen.</p>
      </header>

      {error ? <section className={styles.panel}><p>{error}</p></section> : null}
      {success ? <section className={styles.panel}><p>{success}</p></section> : null}

      <section className={styles.panel}>
        {isLoading ? <p>Profil wird geladen...</p> : null}
        {!isLoading && profile ? (
          <div className={styles.heroGrid}>
            <div className={styles.avatarCard}>
              <div className={styles.avatarPreview}>
                {avatarURL ? (
                  <Image src={avatarURL} alt={`${profile.display_name || profile.fansub_name} Avatar`} width={420} height={420} unoptimized />
                ) : (
                  <span className={styles.avatarFallback}>{(profile.fansub_name || profile.display_name || '?').slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className={styles.actions}>
                <label className={styles.buttonSecondary}>
                  {isUploadingAvatar ? 'Avatar lädt...' : 'Avatar hochladen'}
                  <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={isUploadingAvatar || !profile.capabilities.can_upload_own_avatar} hidden />
                </label>
                {profile.capabilities.can_open_keycloak_account && profile.keycloak_account_url ? (
                  <a className={styles.button} href={profile.keycloak_account_url} target="_blank" rel="noreferrer">
                    Accountdaten ändern
                  </a>
                ) : null}
              </div>
              <p className={styles.hint}>E-Mail, Passwort und MFA bleiben bei Keycloak. Dieses Profil steuert nur die historische Team4s-Darstellung.</p>
            </div>

            <div className={styles.grid}>
              <div className={styles.metaGrid}>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Account-Name</span>
                  <strong className={styles.metaValue}>{profile.account_display_name || '-'}</strong>
                </div>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>E-Mail</span>
                  <strong className={styles.metaValue}>{profile.email || '-'}</strong>
                </div>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Status</span>
                  <strong className={styles.metaValue}>{profile.account_status}</strong>
                </div>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Globale Rollen</span>
                  <strong className={styles.metaValue}>{profile.account_global_roles.length > 0 ? profile.account_global_roles.join(', ') : 'Keine'}</strong>
                </div>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.gridTwo}>
                  <div className={styles.field}>
                    <label htmlFor="displayName">Anzeigename</label>
                    <input id="displayName" value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="fansubName">Fansub-Name</label>
                    <input id="fansubName" value={form.fansubName} onChange={(event) => setForm((current) => ({ ...current, fansubName: event.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="activeFromYear">Aktiv seit</label>
                    <input id="activeFromYear" inputMode="numeric" value={form.activeFromYear} onChange={(event) => setForm((current) => ({ ...current, activeFromYear: event.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="activeUntilYear">Aktiv bis</label>
                    <input id="activeUntilYear" inputMode="numeric" value={form.activeUntilYear} onChange={(event) => setForm((current) => ({ ...current, activeUntilYear: event.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="profileVisibility">Sichtbarkeit</label>
                    <select id="profileVisibility" value={form.profileVisibility} onChange={(event) => setForm((current) => ({ ...current, profileVisibility: event.target.value as ProfileVisibility }))}>
                      <option value="members_only">Nur intern</option>
                      <option value="public">Öffentlich</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="isCurrentlyActive">Aktuell aktiv</label>
                    <select id="isCurrentlyActive" value={form.isCurrentlyActive ? 'yes' : 'no'} onChange={(event) => setForm((current) => ({ ...current, isCurrentlyActive: event.target.value === 'yes' }))}>
                      <option value="yes">Ja</option>
                      <option value="no">Nein</option>
                    </select>
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="bio">Kurzprofil</label>
                  <textarea id="bio" value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Ein kurzer Eindruck deiner Fansub-Rolle." />
                </div>
                <div className={styles.field}>
                  <label htmlFor="memberStory">Mitgliedsgeschichte</label>
                  <RichTextEditor
                    value={form.memberStory}
                    onChange={(value) => setForm((current) => ({ ...current, memberStory: value }))}
                    placeholder="Wie bist du zur Gruppe gekommen, woran hast du gearbeitet und was bleibt?"
                    minHeight={160}
                  />
                </div>
                <div className={styles.actions}>
                  <button type="submit" className={styles.button} disabled={isSaving || !profile.capabilities.can_edit_own_profile}>
                    {isSaving ? 'Speichert...' : 'Profil speichern'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </section>

      {!isLoading && profile ? (
        <>
          <section className={`${styles.panel} ${styles.listCard}`}>
            <h2>Mitgliedschaften</h2>
            <p className={styles.hint}>Gruppenzugehörigkeiten werden hier nur gezeigt. Rollen und Einladungen pflegst du weiter im jeweiligen Gruppenbereich.</p>
            <div className={styles.listStack}>
              {profile.memberships.length === 0 ? <p>Noch keine Mitgliedschaften verknüpft.</p> : profile.memberships.map((membership) => (
                <article key={`${membership.fansub_group_id}:${membership.fansub_group_slug}`} className={styles.listItem}>
                  <strong>{membership.fansub_group_name}</strong>
                  <div className={styles.inlineMeta}>
                    <span className={styles.pill}>Status: {membership.group_status}</span>
                    {membership.joined_year ? <span className={styles.pill}>seit {membership.joined_year}</span> : null}
                    {membership.left_year ? <span className={styles.pill}>bis {membership.left_year}</span> : null}
                    {membership.app_member_status ? <span className={styles.pill}>App: {membership.app_member_status}</span> : null}
                  </div>
                  {membership.app_member_roles && membership.app_member_roles.length > 0 ? <p>Aktive App-Rollen: {membership.app_member_roles.join(', ')}</p> : null}
                </article>
              ))}
            </div>
          </section>

          <section className={`${styles.panel} ${styles.listCard}`}>
            <h2>Historische Credits</h2>
            <p className={styles.hint}>Credits liefern Kontext für die Archivdarstellung, aber niemals Berechtigungen in Team4s.</p>
            <div className={styles.listStack}>
              {profile.historical_credits.length === 0 ? <p>Noch keine historischen Credits hinterlegt.</p> : profile.historical_credits.map((credit) => (
                <article key={`${credit.fansub_group_id}:${credit.role_name}`} className={styles.listItem}>
                  <strong>{credit.fansub_group_name}</strong>
                  <div className={styles.inlineMeta}>
                    <span className={styles.pill}>{credit.role_label}</span>
                    <span className={styles.pill}>{credit.release_count} Releases</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  )
}
