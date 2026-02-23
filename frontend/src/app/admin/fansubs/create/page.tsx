'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

import { ApiError, createFansubGroup, getRuntimeAuthToken } from '@/lib/api'
import { FansubGroup, FansubStatus } from '@/types/fansub'

import styles from '../../admin.module.css'

const STATUS_OPTIONS: FansubStatus[] = ['active', 'inactive', 'dissolved']

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

export default function AdminFansubCreatePage() {
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successGroup, setSuccessGroup] = useState<FansubGroup | null>(null)

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
              <Link href="/admin/fansubs" className={styles.buttonSecondary}>
                Abbrechen
              </Link>
              <button type="submit" className={styles.button} disabled={isSubmitting}>
                {isSubmitting ? 'Speichern...' : 'Anlegen'}
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
