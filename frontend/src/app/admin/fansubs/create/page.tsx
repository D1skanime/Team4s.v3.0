'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

import { ApiError, createFansubAlias, createFansubGroup, getRuntimeAuthToken } from '@/lib/api'
import { FansubGroup, FansubGroupType, FansubStatus } from '@/types/fansub'
import { EditableMediaValue, MediaUpload } from '@/components/admin/MediaUpload'

import styles from '../../admin.module.css'

const STATUS_OPTIONS: FansubStatus[] = ['active', 'inactive', 'dissolved']
const GROUP_TYPE_OPTIONS: FansubGroupType[] = ['group', 'collaboration']

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseOptionalYear(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return Number.NaN
  return parsed
}

function formatError(error: unknown): string {
  if (error instanceof ApiError) return `(${error.status}) ${error.message}`
  return 'Anfrage fehlgeschlagen.'
}

function mapGroupMedia(group: FansubGroup): { logo: EditableMediaValue | null; banner: EditableMediaValue | null } {
  const logo = group.logo_url
    ? {
        id: group.logo_id ?? null,
        publicURL: group.logo_url,
      }
    : null
  const banner = group.banner_url
    ? {
        id: group.banner_id ?? null,
        publicURL: group.banner_url,
      }
    : null

  return { logo, banner }
}

export default function AdminFansubCreatePage() {
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successGroup, setSuccessGroup] = useState<FansubGroup | null>(null)
  const [logoMedia, setLogoMedia] = useState<EditableMediaValue | null>(null)
  const [bannerMedia, setBannerMedia] = useState<EditableMediaValue | null>(null)
  const [mediaBusy, setMediaBusy] = useState<Record<'logo' | 'banner', boolean>>({
    logo: false,
    banner: false,
  })

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [alias, setAlias] = useState('')
  const [status, setStatus] = useState<FansubStatus>('active')
  const [groupType, setGroupType] = useState<FansubGroupType>('group')
  const [description, setDescription] = useState('')
  const [history, setHistory] = useState('')
  const [foundedYear, setFoundedYear] = useState('')
  const [dissolvedYear, setDissolvedYear] = useState('')
  const [websiteURL, setWebsiteURL] = useState('')
  const [discordURL, setDiscordURL] = useState('')
  const [ircURL, setIrcURL] = useState('')
  const [country, setCountry] = useState('')
  const anyMediaBusy = mediaBusy.logo || mediaBusy.banner

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessGroup(null)

    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const normalizedSlug = slug.trim()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      setErrorMessage('Slug muss lowercase kebab-case sein.')
      return
    }

    const founded = parseOptionalYear(foundedYear)
    const dissolved = parseOptionalYear(dissolvedYear)
    if (Number.isNaN(founded) || Number.isNaN(dissolved)) {
      setErrorMessage('Jahresfelder muessen positive Zahlen sein.')
      return
    }
    if (founded && dissolved && dissolved < founded) {
      setErrorMessage('dissolved_year muss groesser oder gleich founded_year sein.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await createFansubGroup(
        {
          name: name.trim(),
          slug: normalizedSlug,
          status,
          group_type: groupType,
          description: normalizeOptional(description),
          history: normalizeOptional(history),
          founded_year: founded,
          dissolved_year: dissolved,
          website_url: normalizeOptional(websiteURL),
          discord_url: normalizeOptional(discordURL),
          irc_url: normalizeOptional(ircURL),
          country: normalizeOptional(country),
        },
        authToken,
      )
      const nextMedia = mapGroupMedia(response.data)
      setLogoMedia(nextMedia.logo)
      setBannerMedia(nextMedia.banner)
      const normalizedAlias = alias.trim()
      if (normalizedAlias) {
        try {
          await createFansubAlias(response.data.id, { alias: normalizedAlias }, authToken)
        } catch (error) {
          setSuccessGroup(response.data)
          setErrorMessage(`Fansub erstellt, Tag konnte nicht gespeichert werden: ${formatError(error)}`)
          return
        }
      }
      setSuccessGroup(response.data)
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin/fansubs">Fansubs</Link>
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Fansubgruppe erstellen</h1>
      </header>

      <section className={styles.panel}>
        <div className={styles.formLayoutShell}>
          <form className={styles.formSections} onSubmit={onSubmit}>
            <section className={styles.formSectionCard}>
              <h2 className={styles.formSectionTitle}>Basic Information</h2>
              <div className={styles.responsiveFieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="name">Name *</label>
                  <input id="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="slug">Slug *</label>
                  <input
                    id="slug"
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    required
                    placeholder="z. B. gax-subs"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="alias">Tag (Alias)</label>
                  <input id="alias" value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="z. B. GAX" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="status">Status *</label>
                  <select id="status" value={status} onChange={(event) => setStatus(event.target.value as FansubStatus)}>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="group-type">Typ *</label>
                  <select
                    id="group-type"
                    value={groupType}
                    onChange={(event) => setGroupType(event.target.value as FansubGroupType)}
                  >
                    {GROUP_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="country">Country</label>
                  <input id="country" value={country} onChange={(event) => setCountry(event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="founded">Founded Year</label>
                  <input id="founded" value={foundedYear} onChange={(event) => setFoundedYear(event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="dissolved">Dissolved Year</label>
                  <input id="dissolved" value={dissolvedYear} onChange={(event) => setDissolvedYear(event.target.value)} />
                </div>
              </div>
            </section>

            <section className={styles.formSectionCard}>
              <h2 className={styles.formSectionTitle}>Media</h2>
              {successGroup ? (
                <div className={styles.fansubEditMediaGrid}>
                  <MediaUpload
                    type="logo"
                    fansubID={successGroup.id}
                    authToken={authToken}
                    groupName={name.trim() || successGroup.name}
                    value={logoMedia}
                    disabled={!authToken || isSubmitting}
                    onBusyChange={(isBusy) => setMediaBusy((current) => ({ ...current, logo: isBusy }))}
                    onChange={(nextValue) => {
                      setLogoMedia(nextValue)
                      setSuccessGroup((current) =>
                        current
                          ? {
                              ...current,
                              logo_id: nextValue?.id ?? null,
                              logo_url: nextValue?.publicURL?.trim() || null,
                            }
                          : current,
                      )
                    }}
                  />
                  <MediaUpload
                    type="banner"
                    fansubID={successGroup.id}
                    authToken={authToken}
                    groupName={name.trim() || successGroup.name}
                    value={bannerMedia}
                    disabled={!authToken || isSubmitting}
                    onBusyChange={(isBusy) => setMediaBusy((current) => ({ ...current, banner: isBusy }))}
                    onChange={(nextValue) => {
                      setBannerMedia(nextValue)
                      setSuccessGroup((current) =>
                        current
                          ? {
                              ...current,
                              banner_id: nextValue?.id ?? null,
                              banner_url: nextValue?.publicURL?.trim() || null,
                            }
                          : current,
                      )
                    }}
                  />
                </div>
              ) : (
                <p className={styles.fansubEditHint}>
                  Medien-Upload ist nach dem ersten Speichern verfuegbar.
                </p>
              )}
            </section>

            <section className={styles.formSectionCard}>
              <h2 className={styles.formSectionTitle}>Community Links</h2>
              <div className={styles.responsiveFieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="website">Website URL</label>
                  <input id="website" value={websiteURL} onChange={(event) => setWebsiteURL(event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="discord">Discord URL</label>
                  <input id="discord" value={discordURL} onChange={(event) => setDiscordURL(event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="irc">IRC URL</label>
                  <input id="irc" value={ircURL} onChange={(event) => setIrcURL(event.target.value)} />
                </div>
              </div>
            </section>

            <section className={styles.formSectionCard}>
              <h2 className={styles.formSectionTitle}>Description</h2>
              <div className={styles.field}>
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  className={styles.descriptionTextarea}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </section>

            <section className={styles.formSectionCard}>
              <h2 className={styles.formSectionTitle}>History</h2>
              <div className={styles.field}>
                <label htmlFor="history">History</label>
                <textarea
                  id="history"
                  className={styles.historyTextarea}
                  value={history}
                  onChange={(event) => setHistory(event.target.value)}
                />
              </div>
            </section>

            <div className={styles.formActionRow}>
              <Link href="/admin/fansubs" className={styles.buttonSecondary}>
                Abbrechen
              </Link>
              <button type="submit" className={styles.button} disabled={isSubmitting || anyMediaBusy || Boolean(successGroup)}>
                {isSubmitting ? 'Speichern...' : successGroup ? 'Angelegt' : 'Anlegen'}
              </button>
            </div>
          </form>
        </div>

        <div className={styles.formLayoutShell}>
          {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
          {successGroup ? (
            <div className={styles.successBox}>
              Fansub {successGroup.name} erstellt. <Link href={`/admin/fansubs/${successGroup.id}/edit`}>Jetzt bearbeiten</Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
