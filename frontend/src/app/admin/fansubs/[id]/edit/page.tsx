'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Bold,
  ExternalLink,
  Globe,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  MessageCircle,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react'

import {
  ApiError,
  createFansubAlias,
  deleteFansubAlias,
  deleteFansubGroup,
  getFansubAliases,
  getFansubByID,
  getFansubList,
  getRuntimeAuthToken,
  updateFansubGroup,
} from '@/lib/api'
import { FansubAlias, FansubGroup, FansubGroupPatchRequest, FansubGroupType, FansubStatus } from '@/types/fansub'
import { buildFansubLogoFallback, buildMediaPreviewURL, EditableMediaValue, MediaUpload } from '@/components/admin/MediaUpload'
import styles from '../../../admin.module.css'

const STATUS_OPTIONS: FansubStatus[] = ['active', 'inactive', 'dissolved']
const GROUP_TYPE_OPTIONS: FansubGroupType[] = ['group', 'collaboration']
const YEAR_MIN = 1900
const YEAR_MAX = 2100
const MARKDOWN_SOFT_LIMIT = 8000
const URL_PROTOCOLS = new Set(['http:', 'https:', 'irc:', 'ircs:'])

type Tab = 'description' | 'history'
type SectionKey = 'basic' | 'tags' | 'content' | 'media' | 'links'
type FormState = {
  name: string
  slug: string
  status: FansubStatus
  groupType: FansubGroupType
  country: string
  foundedYear: string
  dissolvedYear: string
  websiteURL: string
  discordURL: string
  ircURL: string
  description: string
  history: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

function parseYear(value: string): number | null | typeof Number.NaN {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isInteger(parsed) ? parsed : Number.NaN
}

function toOptional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function isAbsoluteURL(value: string): boolean {
  if (!value.trim()) return true
  try {
    const parsed = new URL(value)
    return URL_PROTOCOLS.has(parsed.protocol.toLowerCase())
  } catch {
    return false
  }
}

function mapGroupToForm(group: FansubGroup): FormState {
  return {
    name: group.name || '',
    slug: group.slug || '',
    status: group.status,
    groupType: group.group_type,
    country: group.country || '',
    foundedYear: group.founded_year ? String(group.founded_year) : '',
    dissolvedYear: group.dissolved_year ? String(group.dissolved_year) : '',
    websiteURL: group.website_url || '',
    discordURL: group.discord_url || '',
    ircURL: group.irc_url || '',
    description: group.description || '',
    history: group.history || '',
  }
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

function formToPayload(form: FormState, logo: EditableMediaValue | null, banner: EditableMediaValue | null): FansubGroupPatchRequest {
  const founded = parseYear(form.foundedYear)
  const dissolved = parseYear(form.dissolvedYear)
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    status: form.status,
    group_type: form.groupType,
    country: toOptional(form.country),
    founded_year: founded === null ? null : founded,
    dissolved_year: dissolved === null ? null : dissolved,
    logo_id: logo?.id ?? null,
    banner_id: banner?.id ?? null,
    logo_url: logo?.publicURL?.trim() ? logo.publicURL.trim() : null,
    banner_url: banner?.publicURL?.trim() ? banner.publicURL.trim() : null,
    website_url: toOptional(form.websiteURL),
    discord_url: toOptional(form.discordURL),
    irc_url: toOptional(form.ircURL),
    description: toOptional(form.description),
    history: toOptional(form.history),
  }
}

function emptyForm(): FormState {
  return {
    name: '',
    slug: '',
    status: 'active',
    groupType: 'group',
    country: '',
    foundedYear: '',
    dissolvedYear: '',
    websiteURL: '',
    discordURL: '',
    ircURL: '',
    description: '',
    history: '',
  }
}

function errMessage(error: unknown): string {
  return error instanceof ApiError ? `(${error.status}) ${error.message}` : 'Anfrage fehlgeschlagen.'
}

export default function AdminFansubEditPage() {
  const params = useParams<{ id: string }>()
  const fansubID = Number.parseInt((params.id || '').trim(), 10)
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [group, setGroup] = useState<FansubGroup | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [initialForm, setInitialForm] = useState<FormState>(emptyForm)
  const [aliases, setAliases] = useState<FansubAlias[]>([])
  const [aliasInput, setAliasInput] = useState('')
  const [aliasError, setAliasError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('description')
  const [manualSlug, setManualSlug] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    basic: true,
    tags: true,
    content: true,
    media: true,
    links: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [aliasBusy, setAliasBusy] = useState(false)
  const [logoMedia, setLogoMedia] = useState<EditableMediaValue | null>(null)
  const [bannerMedia, setBannerMedia] = useState<EditableMediaValue | null>(null)
  const [initialLogoMedia, setInitialLogoMedia] = useState<EditableMediaValue | null>(null)
  const [initialBannerMedia, setInitialBannerMedia] = useState<EditableMediaValue | null>(null)
  const [mediaBusy, setMediaBusy] = useState<Record<'logo' | 'banner', boolean>>({
    logo: false,
    banner: false,
  })
  const [slugConflict, setSlugConflict] = useState(false)
  const [slugChecking, setSlugChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const markdownRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)')
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!Number.isFinite(fansubID) || fansubID <= 0) {
      setError('Ungueltige Fansub-ID.')
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    Promise.all([getFansubByID(fansubID), getFansubAliases(fansubID)])
      .then(([groupResponse, aliasResponse]) => {
        if (!active) return
        const nextGroup = groupResponse.data
        const nextForm = mapGroupToForm(nextGroup)
        const nextMedia = mapGroupMedia(nextGroup)
        setGroup(nextGroup)
        setForm(nextForm)
        setInitialForm(nextForm)
        setLogoMedia(nextMedia.logo)
        setBannerMedia(nextMedia.banner)
        setInitialLogoMedia(nextMedia.logo)
        setInitialBannerMedia(nextMedia.banner)
        setManualSlug(nextForm.slug !== slugify(nextForm.name))
        setAliases(aliasResponse.data)
      })
      .catch((nextError) => {
        if (active) setError(errMessage(nextError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fansubID])

  useEffect(() => {
    if (manualSlug) return
    setForm((current) => ({ ...current, slug: slugify(current.name) }))
  }, [form.name, manualSlug])

  useEffect(() => {
    const slug = form.slug.trim()
    if (!slug || !isValidSlug(slug)) {
      setSlugChecking(false)
      setSlugConflict(false)
      return
    }
    let active = true
    const timeout = window.setTimeout(async () => {
      try {
        setSlugChecking(true)
        const response = await getFansubList({ q: slug, per_page: 200 })
        if (!active) return
        setSlugConflict(response.data.some((item) => item.id !== fansubID && item.slug === slug))
      } catch {
        if (active) setSlugConflict(false)
      } finally {
        if (active) setSlugChecking(false)
      }
    }, 350)
    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [fansubID, form.slug])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const dirty = useMemo(
    () =>
      JSON.stringify(form) !== JSON.stringify(initialForm) ||
      JSON.stringify(logoMedia) !== JSON.stringify(initialLogoMedia) ||
      JSON.stringify(bannerMedia) !== JSON.stringify(initialBannerMedia),
    [bannerMedia, form, initialBannerMedia, initialForm, initialLogoMedia, logoMedia],
  )
  useEffect(() => {
    if (!dirty) return
    const onUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])

  const years = useMemo(() => {
    const founded = parseYear(form.foundedYear)
    const dissolved = parseYear(form.dissolvedYear)
    return { founded, dissolved }
  }, [form.dissolvedYear, form.foundedYear])

  const nameError =
    form.name.trim().length === 0 ? 'Name ist erforderlich.' : form.name.trim().length < 2 ? 'Mindestens 2 Zeichen.' : null
  const slugValue = form.slug.trim()
  const slugFormatError =
    slugValue.length === 0 ? 'Slug ist erforderlich.' : !isValidSlug(slugValue) ? 'Slug muss lowercase kebab-case sein.' : null
  const foundedError =
    Number.isNaN(years.founded)
      ? 'Founded Year muss eine Zahl sein.'
      : years.founded !== null && (years.founded < YEAR_MIN || years.founded > YEAR_MAX)
        ? `Founded Year muss zwischen ${YEAR_MIN} und ${YEAR_MAX} liegen.`
        : null
  const dissolvedError =
    Number.isNaN(years.dissolved)
      ? 'Dissolved Year muss eine Zahl sein.'
      : years.dissolved !== null && (years.dissolved < YEAR_MIN || years.dissolved > YEAR_MAX)
        ? `Dissolved Year muss zwischen ${YEAR_MIN} und ${YEAR_MAX} liegen.`
        : null
  const dissolvedAfterFoundedError =
    years.founded !== null && years.dissolved !== null && years.dissolved < years.founded
      ? 'Dissolved Year muss groesser oder gleich Founded Year sein.'
      : null
  const websiteError = !isAbsoluteURL(form.websiteURL) ? 'Bitte absolute URL mit Protokoll verwenden.' : null
  const discordError = !isAbsoluteURL(form.discordURL) ? 'Bitte absolute URL mit Protokoll verwenden.' : null
  const ircError = !isAbsoluteURL(form.ircURL) ? 'Bitte absolute URL mit Protokoll verwenden.' : null
  const anyMediaBusy = mediaBusy.logo || mediaBusy.banner

  const invalid =
    !authToken ||
    Boolean(nameError) ||
    Boolean(slugFormatError) ||
    slugConflict ||
    Boolean(foundedError) ||
    Boolean(dissolvedError) ||
    Boolean(dissolvedAfterFoundedError) ||
    Boolean(websiteError) ||
    Boolean(discordError) ||
    Boolean(ircError) ||
    slugChecking ||
    anyMediaBusy

  const isSectionOpen = (section: SectionKey): boolean => (isMobile ? openSections[section] : true)
  const onSectionToggle = (section: SectionKey, open: boolean) => {
    if (!isMobile) return
    setOpenSections((current) => ({ ...current, [section]: open }))
  }

  const addAlias = async () => {
    const value = aliasInput.trim()
    if (!value || !authToken) return
    if (aliases.some((item) => item.alias.toLowerCase() === value.toLowerCase())) {
      setAliasError('Tag existiert bereits.')
      return
    }
    setAliasBusy(true)
    setAliasError(null)
    try {
      const response = await createFansubAlias(fansubID, { alias: value }, authToken)
      setAliases((current) => [...current, response.data].sort((a, b) => a.alias.localeCompare(b.alias, 'de')))
      setAliasInput('')
    } catch (nextError) {
      setError(errMessage(nextError))
    } finally {
      setAliasBusy(false)
    }
  }

  const removeAlias = async (alias: FansubAlias) => {
    if (!authToken) return
    setAliasBusy(true)
    setAliasError(null)
    try {
      await deleteFansubAlias(fansubID, alias.id, authToken)
      setAliases((current) => current.filter((item) => item.id !== alias.id))
    } catch (nextError) {
      setError(errMessage(nextError))
    } finally {
      setAliasBusy(false)
    }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!authToken || invalid) return
    setSaving(true)
    setError(null)
    try {
      const response = await updateFansubGroup(fansubID, formToPayload(form, logoMedia, bannerMedia), authToken)
      const next = mapGroupToForm(response.data)
      const nextMedia = mapGroupMedia(response.data)
      setGroup(response.data)
      setForm(next)
      setInitialForm(next)
      setLogoMedia(nextMedia.logo)
      setBannerMedia(nextMedia.banner)
      setInitialLogoMedia(nextMedia.logo)
      setInitialBannerMedia(nextMedia.banner)
      setManualSlug(next.slug !== slugify(next.name))
      setToast('Aenderungen gespeichert.')
    } catch (nextError) {
      setError(errMessage(nextError))
    } finally {
      setSaving(false)
    }
  }

  const removeGroup = async () => {
    if (!group || !authToken) return
    if (!window.confirm('Fansub loeschen? Episoden bleiben erhalten, Zuordnung wird entfernt.')) return
    setDeleting(true)
    try {
      await deleteFansubGroup(group.id, authToken)
      window.location.href = '/admin/fansubs'
    } catch (nextError) {
      setError(errMessage(nextError))
      setDeleting(false)
    }
  }

  const markdownValue = activeTab === 'description' ? form.description : form.history
  const insertMarkdown = (prefix: string, suffix = '') => {
    const textarea = markdownRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selection = markdownValue.slice(start, end) || 'Text'
    const replacement = `${prefix}${selection}${suffix}`
    const next = markdownValue.slice(0, start) + replacement + markdownValue.slice(end)
    setForm((current) => ({ ...current, ...(activeTab === 'description' ? { description: next } : { history: next }) }))
  }

  if (loading) return <main className={styles.page}><section className={styles.panel}><p>Lade...</p></section></main>

  const logoFallback = buildFansubLogoFallback(form.name)
  const bannerPreviewURL = buildMediaPreviewURL(bannerMedia)
  const logoPreviewURL = buildMediaPreviewURL(logoMedia)

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}><Link href="/admin/fansubs">Fansubs</Link></p>
      {toast ? <div className={styles.fansubEditToast}>{toast}</div> : null}

      <section className={styles.panel}>
        <header className={styles.fansubEditHeaderCard}>
          <div className={styles.fansubEditBannerShell}>{bannerPreviewURL ? <div className={styles.fansubEditBannerImage} style={{ backgroundImage: `url(${bannerPreviewURL})` }} /> : <div className={styles.fansubEditBannerPlaceholder}>Kein Banner vorhanden</div>}</div>
          <div className={styles.fansubEditProfileRow}>
            <div className={styles.fansubEditLogoBadge}>
              {logoPreviewURL ? (
                <div className={styles.fansubEditLogoImage} style={{ backgroundImage: `url(${logoPreviewURL})` }} />
              ) : (
                <span style={{ backgroundColor: logoFallback.background, color: logoFallback.color }}>{logoFallback.initials}</span>
              )}
            </div>
            <div className={styles.fansubEditIdentity}>
              <div className={styles.fansubEditIdentityTop}>
                <h1 className={styles.title}>{form.name.trim() || 'Fansub bearbeiten'}</h1>
                <span className={`${styles.fansubEditStatusBadge} ${form.status === 'active' ? styles.fansubEditStatusActive : form.status === 'inactive' ? styles.fansubEditStatusInactive : styles.fansubEditStatusDissolved}`}>{form.status}</span>
              </div>
              <p className={styles.fansubEditUrlPreview}>/fansubs/{form.slug.trim() || 'slug'}</p>
            </div>
            <Link href={`/admin/fansubs/${fansubID}/members`} className={styles.buttonSecondary}><Users size={14} />Members verwalten</Link>
          </div>
        </header>

        <form className={styles.fansubEditForm} onSubmit={save}>
          <div className={styles.fansubEditStickyActions}>
            <button type="submit" className={styles.button} disabled={invalid || saving || deleting}><Save size={14} />{saving ? 'Speichern...' : 'Speichern'}</button>
            <button type="button" className={styles.buttonSecondary} onClick={() => (dirty && !window.confirm('Ungespeicherte Aenderungen verwerfen?') ? undefined : (window.location.href = '/admin/fansubs'))}><X size={14} />Abbrechen</button>
            <button type="button" className={`${styles.buttonSecondary} ${styles.buttonDanger}`} onClick={() => void removeGroup()} disabled={saving || deleting}><Trash2 size={14} />{deleting ? 'Loesche...' : 'Loeschen'}</button>
          </div>
          {error ? <div className={styles.errorBox}>{error}</div> : null}
          {!authToken ? <div className={styles.errorBox}>Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.</div> : null}

          <div className={styles.fansubEditColumns}>
            <div className={styles.fansubEditLeftColumn}>
              <details className={styles.fansubEditSection} open={isSectionOpen('basic')} onToggle={(event) => onSectionToggle('basic', event.currentTarget.open)}><summary className={styles.fansubEditSectionSummary}>Basic Information</summary>
                <div className={styles.fansubEditSectionBody}>
                <div className={styles.responsiveFieldGrid}>
                  <div className={styles.field}><label>Name <span className={styles.fansubEditRequired}>*</span></label><input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required minLength={2} aria-invalid={Boolean(nameError)} className={nameError ? styles.fansubEditInputInvalid : undefined} />{nameError ? <p className={styles.fansubEditInlineError}>{nameError}</p> : null}</div>
                  <div className={styles.field}><label>Slug <span className={styles.fansubEditRequired}>*</span></label><div className={styles.fansubEditSlugRow}><input value={form.slug} onChange={(e) => { setManualSlug(true); setForm((c) => ({ ...c, slug: e.target.value })) }} aria-invalid={Boolean(slugFormatError) || slugConflict} className={slugFormatError || slugConflict ? styles.fansubEditInputInvalid : undefined} /><button type="button" className={styles.buttonSecondary} onClick={() => { setManualSlug(false); setForm((c) => ({ ...c, slug: slugify(c.name) })) }}>Auto</button></div>{slugChecking ? <p className={styles.fansubEditHint}>Pruefe Slug...</p> : null}{slugFormatError ? <p className={styles.fansubEditInlineError}>{slugFormatError}</p> : null}{!slugFormatError && slugConflict ? <p className={styles.fansubEditInlineError}>Slug ist bereits vergeben.</p> : null}</div>
                  <div className={styles.field}><label>Status <span className={styles.fansubEditRequired}>*</span></label><select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as FansubStatus }))}>{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div className={styles.field}><label>Typ <span className={styles.fansubEditRequired}>*</span></label><select value={form.groupType} onChange={(e) => setForm((c) => ({ ...c, groupType: e.target.value as FansubGroupType }))}>{GROUP_TYPE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div className={styles.field}><label>Country</label><input value={form.country} onChange={(e) => setForm((c) => ({ ...c, country: e.target.value }))} /></div>
                  <div className={styles.field}><label>Founded Year</label><input type="number" min={YEAR_MIN} max={YEAR_MAX} inputMode="numeric" value={form.foundedYear} onChange={(e) => setForm((c) => ({ ...c, foundedYear: e.target.value }))} placeholder="YYYY" aria-invalid={Boolean(foundedError)} className={foundedError ? styles.fansubEditInputInvalid : undefined} />{foundedError ? <p className={styles.fansubEditInlineError}>{foundedError}</p> : null}</div>
                  <div className={styles.field}><label>Dissolved Year</label><input type="number" min={YEAR_MIN} max={YEAR_MAX} inputMode="numeric" value={form.dissolvedYear} onChange={(e) => setForm((c) => ({ ...c, dissolvedYear: e.target.value }))} placeholder="YYYY" aria-invalid={Boolean(dissolvedError) || Boolean(dissolvedAfterFoundedError)} className={dissolvedError || dissolvedAfterFoundedError ? styles.fansubEditInputInvalid : undefined} />{dissolvedError ? <p className={styles.fansubEditInlineError}>{dissolvedError}</p> : null}</div>
                </div>
                {dissolvedAfterFoundedError ? <p className={styles.fansubEditInlineError}>{dissolvedAfterFoundedError}</p> : null}
                </div>
              </details>

              <details className={styles.fansubEditSection} open={isSectionOpen('tags')} onToggle={(event) => onSectionToggle('tags', event.currentTarget.open)}><summary className={styles.fansubEditSectionSummary}>Tags</summary>
                <div className={styles.fansubEditSectionBody}>
                <p className={styles.fansubEditHint}>Alternative Gruppennamen.</p>
                <div className={styles.inputRow}><input value={aliasInput} onChange={(e) => { setAliasInput(e.target.value); setAliasError(null) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addAlias() } }} /><button type="button" className={styles.buttonSecondary} onClick={() => void addAlias()} disabled={aliasBusy}>Hinzufuegen</button></div>
                {aliasError ? <p className={styles.fansubEditInlineError}>{aliasError}</p> : null}
                <div className={styles.chipBox}><div className={styles.chipRow}>{aliases.map((alias) => <button key={alias.id} type="button" className={`${styles.chip} ${styles.aliasChipDanger}`} onClick={() => void removeAlias(alias)} disabled={aliasBusy}>{alias.alias} x</button>)}</div></div>
                </div>
              </details>

              <details className={styles.fansubEditSection} open={isSectionOpen('content')} onToggle={(event) => onSectionToggle('content', event.currentTarget.open)}><summary className={styles.fansubEditSectionSummary}>Description / History</summary>
                <div className={styles.fansubEditSectionBody}>
                <div className={styles.fansubEditTabRow}>
                  <button type="button" className={`${styles.fansubEditTabButton} ${activeTab === 'description' ? styles.fansubEditTabButtonActive : ''}`} onClick={() => setActiveTab('description')}>Description</button>
                  <button type="button" className={`${styles.fansubEditTabButton} ${activeTab === 'history' ? styles.fansubEditTabButtonActive : ''}`} onClick={() => setActiveTab('history')}>History</button>
                </div>
                <div className={styles.fansubEditMarkdownToolbar}>
                  <button type="button" className={styles.buttonSecondary} onClick={() => insertMarkdown('# ')}><Heading1 size={14} /></button>
                  <button type="button" className={styles.buttonSecondary} onClick={() => insertMarkdown('## ')}><Heading2 size={14} /></button>
                  <button type="button" className={styles.buttonSecondary} onClick={() => insertMarkdown('**', '**')}><Bold size={14} /></button>
                  <button type="button" className={styles.buttonSecondary} onClick={() => insertMarkdown('*', '*')}><Italic size={14} /></button>
                  <button type="button" className={styles.buttonSecondary} onClick={() => insertMarkdown('- ')}><List size={14} /></button>
                  <button type="button" className={styles.buttonSecondary} onClick={() => insertMarkdown('[', '](https://example.com)')}><Link2 size={14} /></button>
                </div>
                <div className={styles.fansubEditMarkdownSplit}>
                  <textarea ref={markdownRef} className={styles.fansubEditMarkdownTextarea} value={markdownValue} onChange={(e) => setForm((c) => ({ ...c, ...(activeTab === 'description' ? { description: e.target.value } : { history: e.target.value }) }))} />
                  <div className={styles.fansubEditMarkdownPreview}><pre className={styles.fansubEditMarkdownPre}>{markdownValue || 'Keine Vorschau.'}</pre></div>
                </div>
                <p className={styles.fansubEditHint}>Zeichen: {markdownValue.length}{markdownValue.length > MARKDOWN_SOFT_LIMIT ? ' (Hinweis: sehr lang)' : ''}</p>
                </div>
              </details>
            </div>

            <div className={styles.fansubEditRightColumn}>
              <details className={styles.fansubEditSection} open={isSectionOpen('media')} onToggle={(event) => onSectionToggle('media', event.currentTarget.open)}><summary className={styles.fansubEditSectionSummary}>Media</summary>
                <div className={styles.fansubEditSectionBody}>
                <div className={styles.fansubEditMediaGrid}>
                  <MediaUpload
                    type="logo"
                    fansubID={fansubID}
                    authToken={authToken}
                    groupName={form.name.trim() || group?.name || ''}
                    value={logoMedia}
                    disabled={!authToken || saving || deleting}
                    onBusyChange={(isBusy) => setMediaBusy((current) => ({ ...current, logo: isBusy }))}
                    onChange={(nextValue) => {
                      setLogoMedia(nextValue)
                      setInitialLogoMedia(nextValue)
                      setToast(nextValue?.publicURL ? 'Logo aktualisiert.' : 'Logo entfernt.')
                    }}
                  />
                  <MediaUpload
                    type="banner"
                    fansubID={fansubID}
                    authToken={authToken}
                    groupName={form.name.trim() || group?.name || ''}
                    value={bannerMedia}
                    disabled={!authToken || saving || deleting}
                    onBusyChange={(isBusy) => setMediaBusy((current) => ({ ...current, banner: isBusy }))}
                    onChange={(nextValue) => {
                      setBannerMedia(nextValue)
                      setInitialBannerMedia(nextValue)
                      setToast(nextValue?.publicURL ? 'Banner aktualisiert.' : 'Banner entfernt.')
                    }}
                  />
                </div>
                </div>
              </details>

              <details className={styles.fansubEditSection} open={isSectionOpen('links')} onToggle={(event) => onSectionToggle('links', event.currentTarget.open)}><summary className={styles.fansubEditSectionSummary}>Community Links</summary>
                <div className={styles.fansubEditSectionBody}>
                <div className={styles.field}><label>Website</label><div className={`${styles.fansubEditLinkInput} ${websiteError ? styles.fansubEditLinkInputInvalid : ''}`}><Globe size={16} /><input value={form.websiteURL} onChange={(e) => setForm((c) => ({ ...c, websiteURL: e.target.value }))} aria-invalid={Boolean(websiteError)} />{form.websiteURL.trim() && !websiteError ? <button type="button" className={styles.fansubEditPreviewLinkButton} onClick={() => window.open(form.websiteURL.trim(), '_blank', 'noreferrer')}><ExternalLink size={14} /></button> : null}</div>{websiteError ? <p className={styles.fansubEditInlineError}>{websiteError}</p> : null}</div>
                <div className={styles.field}><label>Discord</label><div className={`${styles.fansubEditLinkInput} ${discordError ? styles.fansubEditLinkInputInvalid : ''}`}><MessageCircle size={16} /><input value={form.discordURL} onChange={(e) => setForm((c) => ({ ...c, discordURL: e.target.value }))} aria-invalid={Boolean(discordError)} />{form.discordURL.trim() && !discordError ? <button type="button" className={styles.fansubEditPreviewLinkButton} onClick={() => window.open(form.discordURL.trim(), '_blank', 'noreferrer')}><ExternalLink size={14} /></button> : null}</div>{discordError ? <p className={styles.fansubEditInlineError}>{discordError}</p> : null}</div>
                <div className={styles.field}><label>IRC</label><div className={`${styles.fansubEditLinkInput} ${ircError ? styles.fansubEditLinkInputInvalid : ''}`}><Link2 size={16} /><input value={form.ircURL} onChange={(e) => setForm((c) => ({ ...c, ircURL: e.target.value }))} aria-invalid={Boolean(ircError)} />{form.ircURL.trim() && !ircError ? <button type="button" className={styles.fansubEditPreviewLinkButton} onClick={() => window.open(form.ircURL.trim(), '_blank', 'noreferrer')}><ExternalLink size={14} /></button> : null}</div>{ircError ? <p className={styles.fansubEditInlineError}>{ircError}</p> : null}</div>
                </div>
              </details>
            </div>
          </div>

          <div className={styles.fansubEditMobileActionBar}><button type="submit" className={styles.button} disabled={invalid || saving || deleting}>{saving ? 'Speichern...' : 'Speichern'}</button></div>
        </form>
      </section>
    </main>
  )
}
