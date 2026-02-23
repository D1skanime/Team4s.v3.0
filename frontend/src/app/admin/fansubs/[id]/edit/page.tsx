'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

import { ApiError, getFansubByID, getRuntimeAuthToken, updateFansubGroup } from '@/lib/api'
import { FansubGroup, FansubStatus } from '@/types/fansub'

import styles from '../../../admin.module.css'

const STATUS_OPTIONS: FansubStatus[] = ['active', 'inactive', 'dissolved']

function parseOptionalYear(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return Number.NaN
  return parsed
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function formatError(error: unknown): string {
  if (error instanceof ApiError) return `(${error.status}) ${error.message}`
  return 'Anfrage fehlgeschlagen.'
}

export default function AdminFansubEditPage() {
  const params = useParams<{ id: string }>()
  const fansubID = useMemo(() => Number.parseInt((params.id || '').trim(), 10), [params.id])

  const [authToken] = useState(() => getRuntimeAuthToken())
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [group, setGroup] = useState<FansubGroup | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState<FansubStatus>('active')
  const [description, setDescription] = useState('')
  const [history, setHistory] = useState('')
  const [logoURL, setLogoURL] = useState('')
  const [bannerURL, setBannerURL] = useState('')
  const [foundedYear, setFoundedYear] = useState('')
  const [dissolvedYear, setDissolvedYear] = useState('')
  const [websiteURL, setWebsiteURL] = useState('')
  const [discordURL, setDiscordURL] = useState('')
  const [ircURL, setIrcURL] = useState('')
  const [country, setCountry] = useState('')

  useEffect(() => {
    if (!Number.isFinite(fansubID) || fansubID <= 0) {
      setErrorMessage('Ungueltige Fansub-ID.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    getFansubByID(fansubID)
      .then((response) => {
        const item = response.data
        setGroup(item)
        setName(item.name)
        setSlug(item.slug)
        setStatus(item.status)
        setDescription(item.description || '')
        setHistory(item.history || '')
        setLogoURL(item.logo_url || '')
        setBannerURL(item.banner_url || '')
        setFoundedYear(item.founded_year ? String(item.founded_year) : '')
        setDissolvedYear(item.dissolved_year ? String(item.dissolved_year) : '')
        setWebsiteURL(item.website_url || '')
        setDiscordURL(item.discord_url || '')
        setIrcURL(item.irc_url || '')
        setCountry(item.country || '')
      })
      .catch((error) => setErrorMessage(formatError(error)))
      .finally(() => setIsLoading(false))
  }, [fansubID])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

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
      const response = await updateFansubGroup(
        fansubID,
        {
          name: name.trim(),
          slug: normalizedSlug,
          status,
          description: normalizeOptional(description),
          history: normalizeOptional(history),
          logo_url: normalizeOptional(logoURL),
          banner_url: normalizeOptional(bannerURL),
          founded_year: founded,
          dissolved_year: dissolved,
          website_url: normalizeOptional(websiteURL),
          discord_url: normalizeOptional(discordURL),
          irc_url: normalizeOptional(ircURL),
          country: normalizeOptional(country),
        },
        authToken,
      )
      setGroup(response.data)
      setSuccessMessage('Fansubgruppe gespeichert.')
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
        {group ? (
          <>
            <span> | </span>
            <Link href={`/fansubs/${group.slug}`} target="_blank">
              Public Profil
            </Link>
          </>
        ) : null}
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Fansub bearbeiten</h1>
      </header>

      <section className={styles.panel}>
        {isLoading ? <p className={styles.hint}>Lade...</p> : null}
        {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
        {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

        {!isLoading && group ? (
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
                    <input id="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required />
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
                <div className={styles.responsiveFieldGrid}>
                  <div className={styles.field}>
                    <label htmlFor="logo">Logo URL</label>
                    <input id="logo" value={logoURL} onChange={(event) => setLogoURL(event.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="banner">Banner URL</label>
                    <input id="banner" value={bannerURL} onChange={(event) => setBannerURL(event.target.value)} />
                  </div>
                </div>
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
                <Link href={`/admin/fansubs/${fansubID}/members`} className={styles.buttonSecondary}>
                  Members verwalten
                </Link>
                <button type="submit" className={styles.button} disabled={isSubmitting}>
                  {isSubmitting ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </section>
    </main>
  )
}
