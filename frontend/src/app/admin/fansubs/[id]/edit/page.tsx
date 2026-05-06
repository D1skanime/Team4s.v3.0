'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Bold, ChevronDown, ChevronRight, ExternalLink, Heading1, Heading2, Italic, Link2, List, Plus, Save, Trash2, Users, X } from 'lucide-react'

import {
  addCollaborationMember,
  ApiError,
  createFansubAlias,
  createFansubLink,
  deleteFansubAlias,
  deleteFansubGroup,
  deleteFansubLink,
  deleteAdminReleaseThemeAsset,
  getAdminFansubAnime,
  getAdminFansubAnimeReleases,
  getAdminAnimeThemes,
  getAdminAnimeThemeSegments,
  getAdminRelease,
  getAdminReleaseThemeAssets,
  getCollaborationMembers,
  getFansubAliases,
  getFansubByID,
  getFansubList,
  getRuntimeAuthToken,
  resolveApiUrl,
  removeCollaborationMember,
  updateFansubGroup,
  updateFansubLink,
  uploadAdminReleaseThemeAssetForRelease,
} from '@/lib/api'
import {
  CollaborationMember,
  FansubAlias,
  FansubGroup,
  FansubGroupLink,
  FansubGroupLinkType,
  FansubGroupPatchRequest,
  FansubGroupType,
  FansubStatus,
} from '@/types/fansub'
import { AdminAnimeTheme, AdminAnimeThemeSegment, AdminFansubAnimeEntry, AdminReleaseThemeAsset } from '@/types/admin'
import { AdminFansubRelease } from '@/types/fansub'
import { buildFansubLogoFallback, buildMediaPreviewURL, EditableMediaValue, MediaUpload } from '@/components/admin/MediaUpload'
import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

const STATUS_OPTIONS: FansubStatus[] = ['active', 'inactive', 'dissolved']
const GROUP_TYPE_OPTIONS: FansubGroupType[] = ['group', 'collaboration']
const LINK_TYPE_OPTIONS: FansubGroupLinkType[] = ['website', 'discord', 'twitter', 'github', 'irc']
const YEAR_MIN = 1900
const YEAR_MAX = 2100
const MARKDOWN_SOFT_LIMIT = 8000
const URL_PROTOCOLS = new Set(['http:', 'https:', 'irc:', 'ircs:'])

type Tab = 'description' | 'history'
type SectionKey = 'basic' | 'tags' | 'content' | 'media' | 'links' | 'collaboration' | 'releases'
type MainTab = SectionKey
type FormState = {
  name: string
  slug: string
  status: FansubStatus
  groupType: FansubGroupType
  country: string
  foundedYear: string
  dissolvedYear: string
  description: string
  history: string
}

type CommunityLinkDraft = {
  key: string
  id: number | null
  link_type: FansubGroupLinkType
  name: string
  url: string
}

type FansubReleaseGroup = {
  key: string
  anime: AdminFansubAnimeEntry
}

type ReleaseSegmentStatus = 'global' | 'release' | 'missing'

type ReleaseSegmentCard = {
  theme_id: number
  theme_type_name: string
  theme_title: string | null
  status: ReleaseSegmentStatus
  segments: AdminAnimeThemeSegment[]
  media_id?: number
  public_url?: string
  source_label?: string
}

type SelectedReleaseSegment = {
  release: AdminFansubRelease
  card: ReleaseSegmentCard
}

type ReleaseDrawerTab = 'details' | 'media' | 'roles' | 'versions' | 'history'

type ReleaseDrawerContext = {
  release: AdminFansubRelease
  animeID: number
  fansubGroupID: number
  contextKey: string
}

const MAIN_TABS: Array<{ key: MainTab; label: string }> = [
  { key: 'basic', label: 'Basic Information' },
  { key: 'tags', label: 'Tags / Aliases' },
  { key: 'content', label: 'Description / History' },
  { key: 'media', label: 'Media' },
  { key: 'links', label: 'Community Links' },
  { key: 'collaboration', label: 'Collaboration Members' },
  { key: 'releases', label: 'Anime & Releases' },
]

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').replace(/-+$/, '')
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
  if (!value.trim()) return false
  try {
    const parsed = new URL(value.trim())
    return URL_PROTOCOLS.has(parsed.protocol.toLowerCase())
  } catch {
    return false
  }
}

function resolveCoverUrl(rawCoverImage?: string | null): string {
  const value = (rawCoverImage || '').trim()
  if (!value) return '/covers/placeholder.jpg'
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  if (value.startsWith('/api/')) return resolveApiUrl(value)
  if (value.startsWith('/')) return value
  return `/covers/${value}`
}

function parseClockSeconds(raw?: string | null): number | null {
  const value = (raw || '').trim()
  if (!value) return null
  const parts = value.split(':').map((part) => Number.parseInt(part, 10))
  if (parts.length === 0 || parts.length > 3 || parts.some((part) => !Number.isFinite(part) || part < 0)) return null
  return parts.reduce((total, part) => total * 60 + part, 0)
}

function knownPositiveSeconds(value?: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function releaseTimelineMaxSeconds(release: AdminFansubRelease, cards: ReleaseSegmentCard[]): number {
  const knownDurations = [
    knownPositiveSeconds(release.duration_seconds),
    ...cards.flatMap((card) =>
      card.segments.flatMap((segment) => [
        knownPositiveSeconds(segment.playback_duration_seconds),
        parseClockSeconds(segment.end_time),
      ]),
    ),
  ].filter((value): value is number => value != null && value > 0)

  return Math.max(1, ...knownDurations)
}

function compactThemeKind(name: string): 'op' | 'ed' | 'insert' | 'other' {
  const normalized = name.toLowerCase()
  if (normalized.includes('op') || normalized.includes('opening')) return 'op'
  if (normalized.includes('ed') || normalized.includes('ending')) return 'ed'
  if (normalized.includes('insert') || normalized === 'in' || normalized.includes('pv')) return 'insert'
  return 'other'
}

function timelineLaneFor(name: string): 'opEd' | 'insert' {
  const kind = compactThemeKind(name)
  return kind === 'insert' || kind === 'other' ? 'insert' : 'opEd'
}

function timelineLabelFor(name: string): string {
  const kind = compactThemeKind(name)
  if (kind === 'op') return 'OP'
  if (kind === 'ed') return 'ED'
  if (kind === 'insert') return 'IN'
  return name.slice(0, 3).toUpperCase()
}

function timelineStatusLabelFor(status: ReleaseSegmentStatus): string {
  if (status === 'global') return 'Global/Admin'
  if (status === 'release') return 'Release-Asset'
  return 'Fehlt'
}

function episodeReleaseTitle(release: AdminFansubRelease): string {
  const episode = `Episode ${release.episode_number || '?'}`
  const title = (release.episode_title || '').trim()
  return title ? `${episode}: ${title}` : episode
}

function animeFansubReleaseContextKey(fansubID: number, animeID: number): string {
  return `${fansubID}:${animeID}`
}

function releaseDrawerTitle(release: AdminFansubRelease): string {
  const episode = release.episode_number || '?'
  const title = (release.episode_title || '').trim()
  return `${release.anime_title} E${episode}${title ? ` - ${title}` : ''}`
}

function themeSegmentEpisodeRange(segment?: AdminAnimeThemeSegment | null): string {
  if (!segment) return 'Keine Episode gesetzt'
  const start = segment.start_episode_number || (segment.start_episode != null ? String(segment.start_episode) : null)
  const end = segment.end_episode_number || (segment.end_episode != null ? String(segment.end_episode) : null)
  if (start && end && start !== end) return `${start} - ${end}`
  if (start || end) return start || end || 'Keine Episode gesetzt'
  return 'Keine Episode gesetzt'
}

function themeSegmentTimeRange(segment?: AdminAnimeThemeSegment | null): string {
  if (!segment) return 'Keine Zeit gesetzt'
  const start = segment.start_time?.trim()
  const end = segment.end_time?.trim()
  if (start && end) return `${start} - ${end}`
  if (start || end) return `${start || '?'} - ${end || '?'}`
  return 'Keine Zeit gesetzt'
}

function isJellyfinLocked(card: ReleaseSegmentCard): boolean {
  return card.segments.some((item) => item.source_type === 'jellyfin_theme' || item.playback_source_kind === 'jellyfin')
}

function releaseAssetRequiredBySegment(segment: AdminAnimeThemeSegment): boolean {
  return segment.source_type === 'release_asset'
}

function releaseAssetRequirementLabel(segments: AdminAnimeThemeSegment[]): string {
  const hasSegmentFallback = segments.some((segment) => {
    const sourceRef = segment.source_ref?.trim()
    return Boolean(sourceRef) || segment.playback_source_kind === 'uploaded_asset'
  })

  return hasSegmentFallback
    ? 'Segment-Fallback vorhanden - Release-Asset fuer diese Fansubgruppe fehlt'
    : 'Release-Asset fehlt - Upload durch Fansubgruppe erforderlich'
}

function releaseThemeSelectionKey(releaseID: number, themeID: number): string {
  return `${releaseID}:${themeID}`
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
    description: group.description || '',
    history: group.history || '',
  }
}

function mapGroupMedia(group: FansubGroup): { logo: EditableMediaValue | null; banner: EditableMediaValue | null } {
  const logo = group.logo_url ? { id: group.logo_id ?? null, publicURL: group.logo_url } : null
  const banner = group.banner_url ? { id: group.banner_id ?? null, publicURL: group.banner_url } : null
  return { logo, banner }
}

function mapGroupLinks(group: FansubGroup): CommunityLinkDraft[] {
  const links = group.links && group.links.length > 0 ? group.links : legacyLinksFromGroup(group)
  return links.map((link, index) => ({
    key: `${link.id}-${index}`,
    id: link.id,
    link_type: link.link_type,
    name: link.name || '',
    url: link.url || '',
  }))
}

function legacyLinksFromGroup(group: FansubGroup): FansubGroupLink[] {
  const links: FansubGroupLink[] = []
  if (group.website_url) {
    links.push({ id: -1, group_id: group.id, link_type: 'website', name: null, url: group.website_url, created_at: group.updated_at })
  }
  if (group.discord_url) {
    links.push({ id: -2, group_id: group.id, link_type: 'discord', name: null, url: group.discord_url, created_at: group.updated_at })
  }
  if (group.irc_url) {
    links.push({ id: -3, group_id: group.id, link_type: 'irc', name: null, url: group.irc_url, created_at: group.updated_at })
  }
  return links
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
    description: '',
    history: '',
  }
}

function createEmptyLink(): CommunityLinkDraft {
  return { key: `${Date.now()}-${Math.random().toString(16).slice(2)}`, id: null, link_type: 'website', name: '', url: '' }
}

function errMessage(error: unknown): string {
  return error instanceof ApiError ? `(${error.status}) ${error.message}` : 'Anfrage fehlgeschlagen.'
}

function mapReleaseSegmentCards(
  themes: AdminAnimeTheme[],
  themeAssets: AdminReleaseThemeAsset[],
  segmentsByThemeID: Map<number, AdminAnimeThemeSegment[]>,
): ReleaseSegmentCard[] {
  const assetByThemeID = new Map(themeAssets.map((asset) => [asset.theme_id, asset]))

  return themes.map((theme) => {
    const asset = assetByThemeID.get(theme.id)
    const segments = segmentsByThemeID.get(theme.id) ?? []
    if (asset) {
      return {
        theme_id: theme.id,
        theme_type_name: theme.theme_type_name,
        theme_title: theme.title,
        status: 'release',
        segments,
        media_id: asset.media_id,
        public_url: asset.public_url,
        source_label: 'Release-Asset vorhanden',
      }
    }

    if (segments.some(releaseAssetRequiredBySegment)) {
      return {
        theme_id: theme.id,
        theme_type_name: theme.theme_type_name,
        theme_title: theme.title,
        status: 'missing',
        segments,
        source_label: releaseAssetRequirementLabel(segments),
      }
    }

    if (segments.length > 0) {
      return {
        theme_id: theme.id,
        theme_type_name: theme.theme_type_name,
        theme_title: theme.title,
        status: 'global',
        segments,
        source_label: `${segments.length} Segment${segments.length === 1 ? '' : 'e'} global/admin gesetzt`,
      }
    }

    return {
      theme_id: theme.id,
      theme_type_name: theme.theme_type_name,
      theme_title: theme.title,
      status: 'missing',
      segments,
      source_label: 'Noch kein Segment fuer diese Theme-Definition',
    }
  })
}

async function syncFansubLinks(
  fansubID: number,
  initialLinks: CommunityLinkDraft[],
  currentLinks: CommunityLinkDraft[],
  authToken: string,
): Promise<void> {
  const initialById = new Map(initialLinks.filter((item) => item.id != null && item.id > 0).map((item) => [item.id as number, item]))
  const currentById = new Map(currentLinks.filter((item) => item.id != null && item.id > 0).map((item) => [item.id as number, item]))

  for (const [id] of initialById) {
    if (!currentById.has(id)) {
      await deleteFansubLink(fansubID, id, authToken)
    }
  }

  for (const link of currentLinks) {
    const url = link.url.trim()
    const name = link.name.trim()
    if (!url && !name) continue
    if (link.id != null && link.id > 0) {
      const previous = initialById.get(link.id)
      if (!previous || previous.link_type !== link.link_type || previous.name.trim() !== name || previous.url.trim() !== url) {
        await updateFansubLink(
          fansubID,
          link.id,
          {
            link_type: link.link_type,
            name: name || null,
            url,
          },
          authToken,
        )
      }
      continue
    }

    await createFansubLink(
      fansubID,
      {
        link_type: link.link_type,
        name: name || null,
        url,
      },
      authToken,
    )
  }
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
  const [links, setLinks] = useState<CommunityLinkDraft[]>([])
  const [initialLinks, setInitialLinks] = useState<CommunityLinkDraft[]>([])
  const [collaborationMembers, setCollaborationMembers] = useState<CollaborationMember[]>([])
  const [releaseGroups, setReleaseGroups] = useState<FansubReleaseGroup[]>([])
  const [releaseGroupsLoading, setReleaseGroupsLoading] = useState(false)
  const [releaseGroupsError, setReleaseGroupsError] = useState<string | null>(null)
  const [releasesByAnimeFansubGroupId, setReleasesByAnimeFansubGroupId] = useState<Record<string, AdminFansubRelease[]>>({})
  const [releasesLoadingByAnimeFansubGroupId, setReleasesLoadingByAnimeFansubGroupId] = useState<Record<string, boolean>>({})
  const [releasesErrorsByAnimeFansubGroupId, setReleasesErrorsByAnimeFansubGroupId] = useState<Record<string, string | null>>({})
  const [candidateGroups, setCandidateGroups] = useState<FansubGroup[]>([])
  const [selectedMemberGroupID, setSelectedMemberGroupID] = useState('')
  const [collaborationBusy, setCollaborationBusy] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('description')
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('basic')
  const [expandedAnimeKeys, setExpandedAnimeKeys] = useState<Set<string>>(() => new Set())
  const [expandedReleaseIds, setExpandedReleaseIds] = useState<Set<number>>(() => new Set())
  const [releaseSegmentCards, setReleaseSegmentCards] = useState<Record<number, ReleaseSegmentCard[]>>({})
  const [releaseSegmentLoading, setReleaseSegmentLoading] = useState<Record<number, boolean>>({})
  const [releaseSegmentErrors, setReleaseSegmentErrors] = useState<Record<number, string | null>>({})
  const [selectedReleaseSegment, setSelectedReleaseSegment] = useState<SelectedReleaseSegment | null>(null)
  const [selectedReleaseId, setSelectedReleaseId] = useState<number | null>(null)
  const [selectedAnimeFansubContextKey, setSelectedAnimeFansubContextKey] = useState<string | null>(null)
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | null>(null)
  const [selectedFansubGroupId, setSelectedFansubGroupId] = useState<number | null>(null)
  const [releaseDrawerOpen, setReleaseDrawerOpen] = useState(false)
  const [drawerRelease, setDrawerRelease] = useState<AdminFansubRelease | null>(null)
  const [drawerTab, setDrawerTab] = useState<ReleaseDrawerTab>('details')
  const [drawerReleaseLoading, setDrawerReleaseLoading] = useState(false)
  const [drawerReleaseError, setDrawerReleaseError] = useState<string | null>(null)
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false)
  const [drawerBusy, setDrawerBusy] = useState(false)
  const [drawerUploadProgress, setDrawerUploadProgress] = useState<number | null>(null)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [manualSlug, setManualSlug] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    basic: true,
    tags: true,
    content: true,
    media: true,
    links: true,
    collaboration: true,
    releases: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [aliasBusy, setAliasBusy] = useState(false)
  const [logoMedia, setLogoMedia] = useState<EditableMediaValue | null>(null)
  const [bannerMedia, setBannerMedia] = useState<EditableMediaValue | null>(null)
  const [initialLogoMedia, setInitialLogoMedia] = useState<EditableMediaValue | null>(null)
  const [initialBannerMedia, setInitialBannerMedia] = useState<EditableMediaValue | null>(null)
  const [mediaBusy, setMediaBusy] = useState<Record<'logo' | 'banner', boolean>>({ logo: false, banner: false })
  const [slugConflict, setSlugConflict] = useState(false)
  const [slugChecking, setSlugChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const markdownRef = useRef<HTMLTextAreaElement | null>(null)
  const themeUploadInputRef = useRef<HTMLInputElement | null>(null)
  const releaseRequestSeqRef = useRef(0)
  const releaseRequestByContextRef = useRef<Record<string, number>>({})
  const releaseDrawerRequestSeqRef = useRef(0)
  const releaseSegmentRequestSeqRef = useRef(0)
  const releaseSegmentRequestByReleaseRef = useRef<Record<number, number>>({})
  const themeDrawerOpenRef = useRef(false)
  const themeDrawerSelectionKeyRef = useRef<string | null>(null)

  const resetReleaseWorkspaceState = () => {
    setReleasesByAnimeFansubGroupId({})
    setReleasesLoadingByAnimeFansubGroupId({})
    setReleasesErrorsByAnimeFansubGroupId({})
    setExpandedAnimeKeys(new Set())
    setExpandedReleaseIds(new Set())
    setReleaseSegmentCards({})
    setReleaseSegmentLoading({})
    setReleaseSegmentErrors({})
    setReleaseDrawerOpen(false)
    setThemeDrawerOpen(false)
    setSelectedReleaseSegment(null)
    setSelectedReleaseId(null)
    setSelectedAnimeFansubContextKey(null)
    setSelectedAnimeId(null)
    setSelectedFansubGroupId(null)
    setDrawerRelease(null)
    setDrawerReleaseLoading(false)
    setDrawerReleaseError(null)
    setDrawerError(null)
    setDrawerUploadProgress(null)
    releaseRequestByContextRef.current = {}
    releaseSegmentRequestByReleaseRef.current = {}
    if (themeUploadInputRef.current) {
      themeUploadInputRef.current.value = ''
    }
  }

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)')
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    themeDrawerOpenRef.current = themeDrawerOpen
  }, [themeDrawerOpen])

  useEffect(() => {
    themeDrawerSelectionKeyRef.current = themeDrawerOpen && selectedReleaseSegment
      ? releaseThemeSelectionKey(selectedReleaseSegment.release.release_id, selectedReleaseSegment.card.theme_id)
      : null
  }, [themeDrawerOpen, selectedReleaseSegment])

  useEffect(() => {
    if (!Number.isFinite(fansubID) || fansubID <= 0) {
      setError('Ungueltige Fansub-ID.')
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    Promise.all([getFansubByID(fansubID), getFansubAliases(fansubID), getFansubList({ per_page: 500 })])
      .then(async ([groupResponse, aliasResponse, listResponse]) => {
        if (!active) return
        const nextGroup = groupResponse.data
        const nextForm = mapGroupToForm(nextGroup)
        const nextMedia = mapGroupMedia(nextGroup)
        const nextLinks = mapGroupLinks(nextGroup)
        setGroup(nextGroup)
        setForm(nextForm)
        setInitialForm(nextForm)
        setLinks(nextLinks)
        setInitialLinks(nextLinks)
        setLogoMedia(nextMedia.logo)
        setBannerMedia(nextMedia.banner)
        setInitialLogoMedia(nextMedia.logo)
        setInitialBannerMedia(nextMedia.banner)
        setManualSlug(nextForm.slug !== slugify(nextForm.name))
        setAliases(aliasResponse.data)
        setCandidateGroups(listResponse.data.filter((item) => item.id !== fansubID && item.group_type === 'group'))
        if (nextGroup.group_type === 'collaboration') {
          const members = await getCollaborationMembers(fansubID, authToken)
          if (!active) return
          setCollaborationMembers(members.data)
        } else {
          setCollaborationMembers([])
        }
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
  }, [authToken, fansubID])

  useEffect(() => {
    if (!Number.isFinite(fansubID) || fansubID <= 0 || !authToken) {
      setReleaseGroups([])
      setReleaseGroupsError(null)
      setReleaseGroupsLoading(false)
      resetReleaseWorkspaceState()
      return
    }

    let active = true
    setReleaseGroupsLoading(true)
    setReleaseGroupsError(null)
    resetReleaseWorkspaceState()

    getAdminFansubAnime(fansubID, authToken)
      .then((animeResponse) => {
        if (!active) return
        setReleaseGroups(
          animeResponse.data.map((anime) => ({
            key: animeFansubReleaseContextKey(fansubID, anime.id),
            anime,
          })),
        )
      })
      .catch((nextError) => {
        if (!active) return
        setReleaseGroups([])
        setReleaseGroupsError(errMessage(nextError))
      })
      .finally(() => {
        if (active) setReleaseGroupsLoading(false)
      })

    return () => {
      active = false
      releaseRequestByContextRef.current = {}
      releaseSegmentRequestByReleaseRef.current = {}
    }
  }, [authToken, fansubID])

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
      JSON.stringify(links) !== JSON.stringify(initialLinks) ||
      JSON.stringify(logoMedia) !== JSON.stringify(initialLogoMedia) ||
      JSON.stringify(bannerMedia) !== JSON.stringify(initialBannerMedia),
    [bannerMedia, form, initialBannerMedia, initialForm, initialLinks, initialLogoMedia, links, logoMedia],
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

  const years = useMemo(() => ({ founded: parseYear(form.foundedYear), dissolved: parseYear(form.dissolvedYear) }), [form.dissolvedYear, form.foundedYear])
  const nameError = form.name.trim().length === 0 ? 'Name ist erforderlich.' : form.name.trim().length < 2 ? 'Mindestens 2 Zeichen.' : null
  const slugValue = form.slug.trim()
  const slugFormatError = slugValue.length === 0 ? 'Slug ist erforderlich.' : !isValidSlug(slugValue) ? 'Slug muss lowercase kebab-case sein.' : null
  const foundedError = Number.isNaN(years.founded) ? 'Founded Year muss eine Zahl sein.' : years.founded !== null && (years.founded < YEAR_MIN || years.founded > YEAR_MAX) ? `Founded Year muss zwischen ${YEAR_MIN} und ${YEAR_MAX} liegen.` : null
  const dissolvedError = Number.isNaN(years.dissolved) ? 'Dissolved Year muss eine Zahl sein.' : years.dissolved !== null && (years.dissolved < YEAR_MIN || years.dissolved > YEAR_MAX) ? `Dissolved Year muss zwischen ${YEAR_MIN} und ${YEAR_MAX} liegen.` : null
  const dissolvedAfterFoundedError = years.founded !== null && years.dissolved !== null && years.dissolved < years.founded ? 'Dissolved Year muss groesser oder gleich Founded Year sein.' : null
  const linkErrors = links.map((link) => link.url.trim().length > 0 && !isAbsoluteURL(link.url) ? 'Bitte absolute URL mit Protokoll verwenden.' : null)
  const anyMediaBusy = mediaBusy.logo || mediaBusy.banner
  const invalid = !authToken || Boolean(nameError) || Boolean(slugFormatError) || slugConflict || Boolean(foundedError) || Boolean(dissolvedError) || Boolean(dissolvedAfterFoundedError) || linkErrors.some(Boolean) || slugChecking || anyMediaBusy
  const isSectionOpen = (section: SectionKey): boolean => (isMobile ? openSections[section] : true)
  const onSectionToggle = (section: SectionKey, open: boolean) => {
    if (!isMobile) return
    setOpenSections((current) => ({ ...current, [section]: open }))
  }

  const canManageCollaborationMembers = group?.group_type === 'collaboration'
  const collaborationCandidates = candidateGroups.filter((candidate) => !collaborationMembers.some((member) => member.member_group_id === candidate.id))

  const clearThemeUploadInput = () => {
    if (themeUploadInputRef.current) {
      themeUploadInputRef.current.value = ''
    }
  }

  const resetThemeDrawerTransientState = () => {
    setDrawerError(null)
    setDrawerUploadProgress(null)
    clearThemeUploadInput()
  }

  const closeThemeDrawer = () => {
    setThemeDrawerOpen(false)
    resetThemeDrawerTransientState()
  }

  const openThemeDrawer = (release: AdminFansubRelease, card: ReleaseSegmentCard) => {
    setSelectedReleaseSegment({ release, card })
    setThemeDrawerOpen(true)
    resetThemeDrawerTransientState()
  }

  const loadReleaseSegmentCards = async (release: AdminFansubRelease, force = false): Promise<ReleaseSegmentCard[] | null> => {
    if (!authToken) return null
    const releaseID = release.release_id
    if (!force && (releaseSegmentCards[releaseID] || releaseSegmentLoading[releaseID])) return null

    const requestID = releaseSegmentRequestSeqRef.current + 1
    releaseSegmentRequestSeqRef.current = requestID
    releaseSegmentRequestByReleaseRef.current[releaseID] = requestID
    const isCurrentRequest = () => releaseSegmentRequestByReleaseRef.current[releaseID] === requestID

    setReleaseSegmentLoading((current) => ({ ...current, [releaseID]: true }))
    setReleaseSegmentErrors((current) => ({ ...current, [releaseID]: null }))
    try {
      const [themesResponse, assetsResponse] = await Promise.all([
        getAdminAnimeThemes(release.anime_id, authToken),
        getAdminReleaseThemeAssets(releaseID, authToken),
      ])
      const segmentEntries = await Promise.all(
        themesResponse.data.map(async (theme) => {
          const response = await getAdminAnimeThemeSegments(release.anime_id, theme.id, authToken)
          return [theme.id, response.data] as const
        }),
      )
      const nextCards = mapReleaseSegmentCards(themesResponse.data, assetsResponse.data, new Map(segmentEntries))
      if (!isCurrentRequest()) return null
      setReleaseSegmentCards((current) => ({
        ...current,
        [releaseID]: nextCards,
      }))
      return nextCards
    } catch (nextError) {
      if (isCurrentRequest()) {
        setReleaseSegmentErrors((current) => ({ ...current, [releaseID]: errMessage(nextError) }))
      }
      return null
    } finally {
      if (isCurrentRequest()) {
        setReleaseSegmentLoading((current) => ({ ...current, [releaseID]: false }))
      }
    }
  }

  const closeReleaseDrawer = () => {
    releaseDrawerRequestSeqRef.current += 1
    setReleaseDrawerOpen(false)
    setThemeDrawerOpen(false)
    setSelectedReleaseSegment(null)
    setSelectedReleaseId(null)
    setSelectedAnimeFansubContextKey(null)
    setSelectedAnimeId(null)
    setSelectedFansubGroupId(null)
    setDrawerRelease(null)
    setDrawerTab('details')
    setDrawerBusy(false)
    resetThemeDrawerTransientState()
    setDrawerReleaseLoading(false)
    setDrawerReleaseError(null)
  }

  const openReleaseDrawer = (context: ReleaseDrawerContext) => {
    const { release, animeID, fansubGroupID, contextKey } = context
    const requestID = releaseDrawerRequestSeqRef.current + 1
    releaseDrawerRequestSeqRef.current = requestID

    setSelectedReleaseId(release.release_id)
    setSelectedAnimeFansubContextKey(contextKey)
    setSelectedAnimeId(animeID)
    setSelectedFansubGroupId(fansubGroupID)
    setReleaseDrawerOpen(true)
    setThemeDrawerOpen(false)
    setSelectedReleaseSegment(null)
    setDrawerRelease(release)
    setDrawerTab('details')
    setDrawerBusy(false)
    resetThemeDrawerTransientState()
    setDrawerReleaseError(null)
    setDrawerReleaseLoading(Boolean(authToken))
    setExpandedReleaseIds((current) => new Set(current).add(release.release_id))
    void loadReleaseSegmentCards(release)

    if (!authToken) {
      setDrawerReleaseLoading(false)
      return
    }

    getAdminRelease(release.release_id, authToken)
      .then((response) => {
        if (releaseDrawerRequestSeqRef.current !== requestID) return
        setDrawerRelease(response.data)
      })
      .catch((nextError) => {
        if (releaseDrawerRequestSeqRef.current !== requestID) return
        setDrawerReleaseError(errMessage(nextError))
      })
      .finally(() => {
        if (releaseDrawerRequestSeqRef.current !== requestID) return
        setDrawerReleaseLoading(false)
      })
  }

  const loadAnimeReleases = async (releaseGroup: FansubReleaseGroup, force = false) => {
    if (!Number.isFinite(fansubID) || fansubID <= 0 || !authToken) return
    const contextKey = releaseGroup.key
    if (!force && (releasesByAnimeFansubGroupId[contextKey] || releasesLoadingByAnimeFansubGroupId[contextKey])) return

    const requestID = releaseRequestSeqRef.current + 1
    releaseRequestSeqRef.current = requestID
    releaseRequestByContextRef.current[contextKey] = requestID

    setReleasesLoadingByAnimeFansubGroupId((current) => ({ ...current, [contextKey]: true }))
    setReleasesErrorsByAnimeFansubGroupId((current) => ({ ...current, [contextKey]: null }))

    try {
      const response = await getAdminFansubAnimeReleases(fansubID, releaseGroup.anime.id, authToken)
      if (releaseRequestByContextRef.current[contextKey] !== requestID) return
      setReleasesByAnimeFansubGroupId((current) => ({ ...current, [contextKey]: response.data }))
    } catch (nextError) {
      if (releaseRequestByContextRef.current[contextKey] !== requestID) return
      setReleasesErrorsByAnimeFansubGroupId((current) => ({ ...current, [contextKey]: errMessage(nextError) }))
    } finally {
      if (releaseRequestByContextRef.current[contextKey] === requestID) {
        setReleasesLoadingByAnimeFansubGroupId((current) => ({ ...current, [contextKey]: false }))
      }
    }
  }

  const toggleRelease = (release: AdminFansubRelease) => {
    setExpandedReleaseIds((current) => {
      const next = new Set(current)
      if (next.has(release.release_id)) {
        next.delete(release.release_id)
      } else {
        next.add(release.release_id)
        void loadReleaseSegmentCards(release)
      }
      return next
    })
  }

  const toggleAnime = (releaseGroup: FansubReleaseGroup) => {
    setExpandedAnimeKeys((current) => {
      const next = new Set(current)
      if (next.has(releaseGroup.key)) {
        next.delete(releaseGroup.key)
      } else {
        next.add(releaseGroup.key)
        void loadAnimeReleases(releaseGroup)
      }
      return next
    })
  }

  useEffect(() => {
    if (!drawerRelease) return
    const cards = releaseSegmentCards[drawerRelease.release_id] ?? []
    if (cards.length === 0) return
    if (selectedReleaseSegment?.release.release_id === drawerRelease.release_id) return
    setSelectedReleaseSegment({ release: drawerRelease, card: cards[0] })
  }, [drawerRelease, releaseSegmentCards, selectedReleaseSegment?.release.release_id])

  useEffect(() => {
    if (!selectedReleaseSegment) return
    const latestCards = releaseSegmentCards[selectedReleaseSegment.release.release_id] ?? []
    const latestCard = latestCards.find((card) => card.theme_id === selectedReleaseSegment.card.theme_id)
    if (!latestCard) {
      setSelectedReleaseSegment(null)
      setThemeDrawerOpen(false)
      setDrawerError(null)
      setDrawerUploadProgress(null)
      if (themeUploadInputRef.current) {
        themeUploadInputRef.current.value = ''
      }
      return
    }
    if (latestCard === selectedReleaseSegment.card) return
    setSelectedReleaseSegment({ release: selectedReleaseSegment.release, card: latestCard })
  }, [releaseSegmentCards, selectedReleaseSegment])

  const handleDrawerUpload = async (file: File | null) => {
    if (!file || !selectedReleaseSegment || !authToken) return
    const release = selectedReleaseSegment.release
    const themeID = selectedReleaseSegment.card.theme_id
    const selectionKey = releaseThemeSelectionKey(release.release_id, themeID)
    const isCurrentSelection = () => themeDrawerOpenRef.current && themeDrawerSelectionKeyRef.current === selectionKey
    setDrawerBusy(true)
    setDrawerError(null)
    setDrawerUploadProgress(0)
    try {
      await uploadAdminReleaseThemeAssetForRelease({
        releaseID: release.release_id,
        themeID,
        file,
        authToken,
        onProgress: (progress) => {
          if (isCurrentSelection()) setDrawerUploadProgress(progress)
        },
      })
      await loadReleaseSegmentCards(release, true)
      setToast('Theme-Asset gespeichert.')
      if (isCurrentSelection()) {
        setDrawerUploadProgress(null)
        clearThemeUploadInput()
      }
    } catch (nextError) {
      if (isCurrentSelection()) setDrawerError(errMessage(nextError))
    } finally {
      setDrawerBusy(false)
    }
  }

  const handleDrawerUploadClick = async () => {
    const file = themeUploadInputRef.current?.files?.[0] ?? null
    if (!file) {
      setDrawerError('Bitte zuerst eine Videodatei auswaehlen.')
      return
    }
    await handleDrawerUpload(file)
  }

  const handleDrawerDelete = async () => {
    if (!selectedReleaseSegment || !authToken || !selectedReleaseSegment.card.media_id) return
    const release = selectedReleaseSegment.release
    const themeID = selectedReleaseSegment.card.theme_id
    const mediaID = selectedReleaseSegment.card.media_id
    const selectionKey = releaseThemeSelectionKey(release.release_id, themeID)
    const isCurrentSelection = () => themeDrawerOpenRef.current && themeDrawerSelectionKeyRef.current === selectionKey
    setDrawerBusy(true)
    setDrawerError(null)
    try {
      await deleteAdminReleaseThemeAsset(release.release_id, themeID, mediaID, authToken)
      await loadReleaseSegmentCards(release, true)
      if (isCurrentSelection()) {
        setSelectedReleaseSegment(null)
        closeThemeDrawer()
      }
      setToast('Theme-Asset entfernt.')
    } catch (nextError) {
      if (isCurrentSelection()) setDrawerError(errMessage(nextError))
    } finally {
      setDrawerBusy(false)
    }
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
      await updateFansubGroup(fansubID, formToPayload(form, logoMedia, bannerMedia), authToken)
      await syncFansubLinks(fansubID, initialLinks, links, authToken)
      const response = await getFansubByID(fansubID)
      const next = mapGroupToForm(response.data)
      const nextMedia = mapGroupMedia(response.data)
      const nextLinks = mapGroupLinks(response.data)
      setGroup(response.data)
      setForm(next)
      setInitialForm(next)
      setLinks(nextLinks)
      setInitialLinks(nextLinks)
      setLogoMedia(nextMedia.logo)
      setBannerMedia(nextMedia.banner)
      setInitialLogoMedia(nextMedia.logo)
      setInitialBannerMedia(nextMedia.banner)
      setManualSlug(next.slug !== slugify(next.name))
      if (response.data.group_type === 'collaboration') {
        const members = await getCollaborationMembers(fansubID, authToken)
        setCollaborationMembers(members.data)
      } else {
        setCollaborationMembers([])
      }
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

  const addMemberGroup = async () => {
    if (!authToken || !selectedMemberGroupID || !canManageCollaborationMembers) return
    setCollaborationBusy(true)
    try {
      const response = await addCollaborationMember(fansubID, { member_group_id: Number(selectedMemberGroupID) }, authToken)
      setCollaborationMembers((current) => [...current, response.data].sort((a, b) => (a.member_group?.name || '').localeCompare(b.member_group?.name || '', 'de')))
      setSelectedMemberGroupID('')
      setToast('Mitgliedsgruppe hinzugefuegt.')
    } catch (nextError) {
      setError(errMessage(nextError))
    } finally {
      setCollaborationBusy(false)
    }
  }

  const removeMemberGroup = async (memberGroupID: number) => {
    if (!authToken || !canManageCollaborationMembers) return
    setCollaborationBusy(true)
    try {
      await removeCollaborationMember(fansubID, memberGroupID, authToken)
      setCollaborationMembers((current) => current.filter((item) => item.member_group_id !== memberGroupID))
      setToast('Mitgliedsgruppe entfernt.')
    } catch (nextError) {
      setError(errMessage(nextError))
    } finally {
      setCollaborationBusy(false)
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
  const themeSelectedCard = selectedReleaseSegment?.card ?? null
  const themeSelectedLocked = themeSelectedCard ? themeSelectedCard.status === 'global' || isJellyfinLocked(themeSelectedCard) : false
  const drawerReleaseCards = drawerRelease ? releaseSegmentCards[drawerRelease.release_id] ?? [] : []
  const drawerReleaseReleaseAssetCount = drawerReleaseCards.filter((card) => card.status === 'release').length
  const drawerReleaseGlobalAssetCount = drawerReleaseCards.filter((card) => card.status === 'global').length
  const drawerReleaseMissingAssetCount = drawerReleaseCards.filter((card) => card.status === 'missing').length
  const drawerReleaseThemeSummary = drawerReleaseCards.length > 0
    ? `${drawerReleaseReleaseAssetCount} Release / ${drawerReleaseGlobalAssetCount} Global / ${drawerReleaseMissingAssetCount} offen`
    : drawerRelease?.has_theme_assets
      ? 'Theme-Assets vorhanden'
      : 'Keine Theme-Assets'
  const themePrimarySegment = themeSelectedCard?.segments[0] ?? null
  const releaseDrawerTabs = drawerRelease ? [
    { key: 'details' as const, label: 'Details', disabled: false },
    { key: 'media' as const, label: 'Media', disabled: true },
    { key: 'roles' as const, label: 'Mitglieder & Rollen', disabled: true },
    { key: 'versions' as const, label: `Versionen (${drawerRelease.version_count})`, disabled: true },
    { key: 'history' as const, label: 'Historie', disabled: true },
  ] : []

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}><Link href="/admin">Admin</Link> / <Link href="/admin/fansubs">Fansubs</Link></p>
      {toast ? <div className={styles.fansubEditToast}>{toast}</div> : null}

      <section className={styles.panel}>
        <header className={styles.fansubEditHeaderCard}>
          <div className={styles.fansubEditBannerShell}>
            {bannerPreviewURL ? <div className={styles.fansubEditBannerImage} style={{ backgroundImage: `url(${bannerPreviewURL})` }} /> : <div className={styles.fansubEditBannerPlaceholder}>Kein Banner vorhanden</div>}
          </div>
          <div className={styles.fansubEditProfileRow}>
            <div className={styles.fansubEditLogoBadge}>
              {logoPreviewURL ? (
                <Image src={logoPreviewURL} alt={`${form.name.trim() || 'Fansub'} Logo`} className={styles.fansubEditLogoImage} width={78} height={78} unoptimized />
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
          <nav className={styles.fansubEditMainTabRow} aria-label="Fansub Bearbeitungsbereiche">
            {MAIN_TABS.filter((tab) => tab.key !== 'collaboration' || form.groupType === 'collaboration').map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`${styles.fansubEditMainTabButton} ${activeMainTab === tab.key ? styles.fansubEditMainTabButtonActive : ''}`}
                onClick={() => setActiveMainTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {activeMainTab !== 'releases' ? <form className={styles.fansubEditForm} onSubmit={save}>
          <div className={styles.fansubEditStickyActions}>
            <button type="submit" className={styles.button} disabled={invalid || saving || deleting}><Save size={14} />{saving ? 'Speichern...' : 'Speichern'}</button>
            <button type="button" className={styles.buttonSecondary} onClick={() => (dirty && !window.confirm('Ungespeicherte Aenderungen verwerfen?') ? undefined : (window.location.href = '/admin/fansubs'))}><X size={14} />Abbrechen</button>
            <button type="button" className={`${styles.buttonSecondary} ${styles.buttonDanger}`} onClick={() => void removeGroup()} disabled={saving || deleting}><Trash2 size={14} />{deleting ? 'Loesche...' : 'Loeschen'}</button>
          </div>
          {error ? <div className={styles.errorBox}>{error}</div> : null}
          {!authToken ? <div className={styles.errorBox}>Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.</div> : null}

          <div className={styles.fansubEditColumns}>
            <div className={styles.fansubEditLeftColumn}>
              {activeMainTab === 'basic' ? <details className={styles.fansubEditSection} open={isSectionOpen('basic')} onToggle={(event) => onSectionToggle('basic', event.currentTarget.open)}>
                <summary className={styles.fansubEditSectionSummary}>Basic Information</summary>
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
              </details> : null}

              {activeMainTab === 'tags' ? <details className={styles.fansubEditSection} open={isSectionOpen('tags')} onToggle={(event) => onSectionToggle('tags', event.currentTarget.open)}>
                <summary className={styles.fansubEditSectionSummary}>Tags</summary>
                <div className={styles.fansubEditSectionBody}>
                  <p className={styles.fansubEditHint}>Alternative Gruppennamen.</p>
                  <div className={styles.inputRow}><input value={aliasInput} onChange={(e) => { setAliasInput(e.target.value); setAliasError(null) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addAlias() } }} /><button type="button" className={styles.buttonSecondary} onClick={() => void addAlias()} disabled={aliasBusy}>Hinzufuegen</button></div>
                  {aliasError ? <p className={styles.fansubEditInlineError}>{aliasError}</p> : null}
                  <div className={styles.chipBox}><div className={styles.chipRow}>{aliases.map((alias) => <button key={alias.id} type="button" className={`${styles.chip} ${styles.aliasChipDanger}`} onClick={() => void removeAlias(alias)} disabled={aliasBusy}>{alias.alias} x</button>)}</div></div>
                </div>
              </details> : null}

              {activeMainTab === 'content' ? <details className={styles.fansubEditSection} open={isSectionOpen('content')} onToggle={(event) => onSectionToggle('content', event.currentTarget.open)}>
                <summary className={styles.fansubEditSectionSummary}>Description / History</summary>
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
              </details> : null}
            </div>

            <div className={styles.fansubEditRightColumn}>
              {activeMainTab === 'media' ? <details className={styles.fansubEditSection} open={isSectionOpen('media')} onToggle={(event) => onSectionToggle('media', event.currentTarget.open)}>
                <summary className={styles.fansubEditSectionSummary}>Media</summary>
                <div className={styles.fansubEditSectionBody}>
                  <div className={styles.fansubEditMediaGrid}>
                    <MediaUpload type="logo" fansubID={fansubID} authToken={authToken} groupName={form.name.trim() || group?.name || ''} value={logoMedia} disabled={!authToken || saving || deleting} onBusyChange={(isBusy) => setMediaBusy((current) => ({ ...current, logo: isBusy }))} onChange={(nextValue) => { setLogoMedia(nextValue); setInitialLogoMedia(nextValue); setToast(nextValue?.publicURL ? 'Logo aktualisiert.' : 'Logo entfernt.') }} />
                    <MediaUpload type="banner" fansubID={fansubID} authToken={authToken} groupName={form.name.trim() || group?.name || ''} value={bannerMedia} disabled={!authToken || saving || deleting} onBusyChange={(isBusy) => setMediaBusy((current) => ({ ...current, banner: isBusy }))} onChange={(nextValue) => { setBannerMedia(nextValue); setInitialBannerMedia(nextValue); setToast(nextValue?.publicURL ? 'Banner aktualisiert.' : 'Banner entfernt.') }} />
                  </div>
                </div>
              </details> : null}

              {activeMainTab === 'links' ? <details className={styles.fansubEditSection} open={isSectionOpen('links')} onToggle={(event) => onSectionToggle('links', event.currentTarget.open)}>
                <summary className={styles.fansubEditSectionSummary}>Community Links</summary>
                <div className={styles.fansubEditSectionBody}>
                  <div className={styles.fansubEditLinksHeader}>
                    <p className={styles.fansubEditHint}>Generische Link-Zeilen fuer Website, Discord, Twitter, GitHub und IRC.</p>
                    <button type="button" className={styles.buttonSecondary} onClick={() => setLinks((current) => [...current, createEmptyLink()])}><Plus size={14} />Link</button>
                  </div>
                  <div className={styles.fansubEditLinksList}>
                    {links.map((link, index) => {
                      const url = link.url.trim()
                      const urlError = linkErrors[index]
                      return (
                        <div key={link.key} className={styles.fansubEditLinkRow}>
                          <select value={link.link_type} onChange={(event) => setLinks((current) => current.map((item) => item.key === link.key ? { ...item, link_type: event.target.value as FansubGroupLinkType } : item))}>
                            {LINK_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                          <input value={link.name} onChange={(event) => setLinks((current) => current.map((item) => item.key === link.key ? { ...item, name: event.target.value } : item))} placeholder="Name (optional)" />
                          <div className={`${styles.fansubEditLinkInput} ${urlError ? styles.fansubEditLinkInputInvalid : ''}`}>
                            <input value={link.url} onChange={(event) => setLinks((current) => current.map((item) => item.key === link.key ? { ...item, url: event.target.value } : item))} placeholder="https://..." />
                            {url && !urlError ? <button type="button" className={styles.fansubEditPreviewLinkButton} onClick={() => window.open(url, '_blank', 'noreferrer')}><ExternalLink size={14} /></button> : null}
                          </div>
                          <button type="button" className={`${styles.buttonSecondary} ${styles.buttonDanger}`} onClick={() => setLinks((current) => current.length === 1 ? [createEmptyLink()] : current.filter((item) => item.key !== link.key))}><Trash2 size={14} /></button>
                          {urlError ? <p className={styles.fansubEditInlineError}>{urlError}</p> : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </details> : null}

              {activeMainTab === 'collaboration' && form.groupType === 'collaboration' ? (
                <details className={styles.fansubEditSection} open={isSectionOpen('collaboration')} onToggle={(event) => onSectionToggle('collaboration', event.currentTarget.open)}>
                  <summary className={styles.fansubEditSectionSummary}>Collaboration Members</summary>
                  <div className={styles.fansubEditSectionBody}>
                    {!canManageCollaborationMembers ? (
                      <p className={styles.fansubEditHint}>Diese Gruppe ist lokal schon als Kollaboration markiert, aber noch nicht gespeichert. Bitte zuerst speichern, dann Mitglieder verwalten.</p>
                    ) : (
                      <>
                        <div className={styles.fansubEditCollaborationRow}>
                          <select value={selectedMemberGroupID} onChange={(event) => setSelectedMemberGroupID(event.target.value)} disabled={collaborationBusy}>
                            <option value="">Mitgliedsgruppe waehlen</option>
                            {collaborationCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                          </select>
                          <button type="button" className={styles.buttonSecondary} onClick={() => void addMemberGroup()} disabled={collaborationBusy || !selectedMemberGroupID}><Plus size={14} />Hinzufuegen</button>
                        </div>
                        <div className={styles.fansubEditCollaborationList}>
                          {collaborationMembers.length === 0 ? <p className={styles.fansubEditHint}>Noch keine Mitgliedsgruppen verknuepft.</p> : null}
                          {collaborationMembers.map((member) => (
                            <div key={member.member_group_id} className={styles.fansubEditCollaborationItem}>
                              <div>
                                <strong>{member.member_group?.name || `Gruppe ${member.member_group_id}`}</strong>
                                <p className={styles.fansubEditHint}>/{member.member_group?.slug || member.member_group_id}</p>
                              </div>
                              <button type="button" className={`${styles.buttonSecondary} ${styles.buttonDanger}`} onClick={() => void removeMemberGroup(member.member_group_id)} disabled={collaborationBusy}><Trash2 size={14} />Entfernen</button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </details>
              ) : null}
            </div>
          </div>

          <div className={styles.fansubEditMobileActionBar}><button type="submit" className={styles.button} disabled={invalid || saving || deleting}>{saving ? 'Speichern...' : 'Speichern'}</button></div>
        </form> : null}
        {activeMainTab === 'releases' ? <details className={styles.fansubEditSection} open={isSectionOpen('releases')} onToggle={(event) => onSectionToggle('releases', event.currentTarget.open)}>
          <summary className={styles.fansubEditSectionSummary}>Anime & Releases</summary>
          <div className={styles.fansubEditSectionBody}>
            <p className={styles.fansubEditHint}>Anime dieser Fansubgruppe und ihre Release-Versionen.</p>
            {releaseGroupsLoading ? <div className={styles.fansubEditReleaseState}>Anime werden geladen...</div> : null}
            {releaseGroupsError ? <div className={styles.errorBox}>{releaseGroupsError}</div> : null}
            {!releaseGroupsLoading && !releaseGroupsError && releaseGroups.length === 0 ? (
              <div className={styles.fansubEditReleaseState}>Noch keine Anime/Releases mit dieser Fansubgruppe verknuepft.</div>
            ) : null}
            <div className={styles.fansubEditReleaseList}>
              {releaseGroups.map((releaseGroup) => {
                const animeExpanded = expandedAnimeKeys.has(releaseGroup.key)
                const releasesLoaded = Object.prototype.hasOwnProperty.call(releasesByAnimeFansubGroupId, releaseGroup.key)
                const releases = releasesByAnimeFansubGroupId[releaseGroup.key] ?? []
                const releasesLoading = Boolean(releasesLoadingByAnimeFansubGroupId[releaseGroup.key])
                const releasesError = releasesErrorsByAnimeFansubGroupId[releaseGroup.key]
                const releaseCountLabel = releasesLoaded ? String(releases.length) : '-'
                return (
                <article key={releaseGroup.key} className={styles.fansubEditAnimeReleaseCard}>
                  <div className={styles.fansubEditAnimeReleaseHeader}>
                    <Image src={resolveCoverUrl(releaseGroup.anime.cover_image)} alt="" className={styles.fansubEditAnimePoster} width={54} height={76} unoptimized />
                    <div>
                      <h3>{releaseGroup.anime.title}</h3>
                    </div>
                    <div className={styles.fansubEditAnimeReleaseMeta}>
                      <span>Releases: {releaseCountLabel}</span>
                      <button
                        type="button"
                        className={styles.fansubEditAnimeToggle}
                        onClick={() => toggleAnime(releaseGroup)}
                        aria-expanded={animeExpanded}
                        aria-label={animeExpanded ? `${releaseGroup.anime.title} einklappen` : `${releaseGroup.anime.title} ausklappen`}
                      >
                        {animeExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </div>
                  </div>
                  {animeExpanded && releasesLoading ? (
                    <div className={styles.fansubEditReleaseState}>Releases werden geladen...</div>
                  ) : null}
                  {animeExpanded && releasesError ? <div className={styles.errorBox}>{releasesError}</div> : null}
                  {animeExpanded && releasesLoaded && !releasesLoading && !releasesError && releases.length === 0 ? (
                    <p className={styles.fansubEditHint}>Anime ist verknuepft, aber es gibt noch keine Release-Version fuer diese Gruppe.</p>
                  ) : null}
                  {animeExpanded && !releasesError && releases.length > 0 ? (
                    <div className={styles.fansubEditReleaseRows}>
                      <div className={styles.fansubEditReleaseTableHeader}>
                        <span>Episode</span>
                        <span>Titel</span>
                        <span>Version</span>
                        <span>Datum</span>
                        <span>Status</span>
                        <span>Assets</span>
                        <span>Aktionen</span>
                        <span />
                      </div>
                      {releases.map((release) => {
                        const expanded = expandedReleaseIds.has(release.release_id)
                        const cards = releaseSegmentCards[release.release_id] ?? []
                        const cardsLoading = releaseSegmentLoading[release.release_id]
                        const cardsError = releaseSegmentErrors[release.release_id]
                        const timelineMaxSeconds = releaseTimelineMaxSeconds(release, cards)
                        const timelineLanes = [
                          { key: 'insert' as const, label: 'EINFUEGER / PV', cards: cards.filter((card) => timelineLaneFor(card.theme_type_name) === 'insert') },
                          { key: 'opEd' as const, label: 'OP / ED', cards: cards.filter((card) => timelineLaneFor(card.theme_type_name) === 'opEd') },
                        ].filter((lane) => lane.cards.length > 0)

                        return (
                          <div key={release.release_id} className={styles.fansubEditReleaseItem}>
                            <div className={styles.fansubEditReleaseRow}>
                              <strong>{release.episode_number || '?'}</strong>
                              <div className={styles.fansubEditReleaseTitleCell}>
                                <span>{(release.episode_title || '').trim() || 'Ohne Episodentitel'}</span>
                              </div>
                              <span>{release.version_count} Version{release.version_count === 1 ? '' : 'en'}</span>
                              <span>{new Date(release.created_at).toLocaleDateString('de-CH')}</span>
                              <span className={styles.fansubEditReleaseStatusBadge}>Verknuepft</span>
                              <span>{release.has_theme_assets ? 'Theme' : '-'}</span>
                              <div className={styles.fansubEditReleaseActions}>
                                <button
                                  type="button"
                                  className={styles.fansubEditReleaseEditButton}
                                  onClick={() => openReleaseDrawer({
                                    release,
                                    animeID: releaseGroup.anime.id,
                                    fansubGroupID: release.fansub_group_id,
                                    contextKey: releaseGroup.key,
                                  })}
                                >
                                  Details
                                </button>
                              </div>
                              <button
                                type="button"
                                className={styles.fansubEditReleaseExpandButton}
                                onClick={() => toggleRelease(release)}
                                aria-expanded={expanded}
                                aria-label={expanded ? `Release ${release.release_id} einklappen` : `Release ${release.release_id} ausklappen`}
                              >
                                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </div>
                            {expanded ? (
                              <div className={styles.fansubEditReleaseExpanded}>
                                <div className={styles.fansubEditReleaseExpandedHeader}>
                                  <div>
                                    <h4>Timeline Vorschau</h4>
                                    <p className={styles.fansubEditHint}>{episodeReleaseTitle(release)} - Segmente ansehen und fehlende Assets vorbereiten.</p>
                                  </div>
                                </div>
                                {cardsLoading ? <div className={styles.fansubEditReleaseState}>Theme-Segmente werden geladen...</div> : null}
                                {cardsError ? <div className={styles.errorBox}>{cardsError}</div> : null}
                                {!cardsLoading && !cardsError && cards.length === 0 ? (
                                  <div className={styles.fansubEditReleaseState}>Noch keine Theme-Definitionen fuer diesen Anime vorhanden.</div>
                                ) : null}
                                {cards.length > 0 ? (
                                  <div className={styles.fansubEditTimeline}>
                                    <div className={styles.fansubEditTimelineLegend} aria-label="Timeline Legende">
                                      <span className={styles.fansubEditTimelineLegendItem}>
                                        <span className={`${styles.fansubEditTimelineLegendSwatch} ${styles.fansubEditTimelineLegendGlobal}`} aria-hidden="true" />
                                        Global/Admin
                                      </span>
                                      <span className={styles.fansubEditTimelineLegendItem}>
                                        <span className={`${styles.fansubEditTimelineLegendSwatch} ${styles.fansubEditTimelineLegendRelease}`} aria-hidden="true" />
                                        Release-Asset
                                      </span>
                                      <span className={styles.fansubEditTimelineLegendItem}>
                                        <span className={`${styles.fansubEditTimelineLegendSwatch} ${styles.fansubEditTimelineLegendMissing}`} aria-hidden="true" />
                                        Fehlt
                                      </span>
                                      <span className={styles.fansubEditTimelineLegendItem}>
                                        <span className={`${styles.fansubEditTimelineLegendSwatch} ${styles.fansubEditTimelineLegendSelected}`} aria-hidden="true" />
                                        Ausgewaehlt
                                      </span>
                                    </div>
                                    <div className={styles.fansubEditTimelineScale}>
                                      <span>00:00:00</span>
                                      <span>{new Date(timelineMaxSeconds * 1000).toISOString().slice(11, 19)}</span>
                                    </div>
                                    {timelineLanes.map((lane) => (
                                      <div key={lane.key} className={styles.fansubEditTimelineLane}>
                                        <span className={styles.fansubEditTimelineLaneLabel}>{lane.label}</span>
                                        <div className={styles.fansubEditTimelineTrack}>
                                          {lane.cards.map((card, index) => {
                                            const segment = card.segments[0]
                                            const startSeconds = parseClockSeconds(segment?.start_time) ?? Math.max(0, Math.round((index / Math.max(lane.cards.length, 1)) * timelineMaxSeconds))
                                            const endSeconds = parseClockSeconds(segment?.end_time) ?? Math.min(timelineMaxSeconds, startSeconds + Math.round(timelineMaxSeconds / Math.max(lane.cards.length + 2, 4)))
                                            const left = Math.max(0, Math.min(94, (startSeconds / timelineMaxSeconds) * 100))
                                            const width = Math.max(6, Math.min(100 - left, ((endSeconds - startSeconds) / timelineMaxSeconds) * 100 || 10))
                                            const lockedByJellyfin = card.segments.some((item) => item.source_type === 'jellyfin_theme' || item.playback_source_kind === 'jellyfin')
                                            const selected = selectedReleaseSegment?.release.release_id === release.release_id && selectedReleaseSegment.card.theme_id === card.theme_id
                                            return (
                                              <button
                                                key={card.theme_id}
                                                type="button"
                                                className={`${styles.fansubEditTimelineSegment} ${styles[`fansubEditTimelineSegment${card.status}`]} ${selected ? styles.fansubEditTimelineSegmentActive : ''}`}
                                                style={{ left: `${left}%`, width: `${width}%` }}
                                                aria-pressed={selected}
                                                aria-label={`${timelineLabelFor(card.theme_type_name)} ${timelineStatusLabelFor(card.status)}${lockedByJellyfin ? ' Jellyfin-Quelle' : ''}`}
                                                onClick={() => {
                                                  openThemeDrawer(release, card)
                                                }}
                                                title={lockedByJellyfin ? 'Jellyfin-Quelle gesetzt' : card.source_label || 'Segment'}
                                              >
                                                {timelineLabelFor(card.theme_type_name)}
                                              </button>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </article>
                )
              })}
            </div>
          </div>
        </details> : null}
      </section>
      {releaseDrawerOpen && drawerRelease ? (
        <div className={styles.fansubEditReleaseDrawerOverlay} onClick={closeReleaseDrawer}>
          <aside className={styles.fansubEditReleaseDrawer} aria-label="Release bearbeiten" onClick={(event) => event.stopPropagation()}>
            <header className={styles.fansubEditReleaseDrawerHeader}>
              <div>
                <div className={styles.fansubEditReleaseDrawerTitleRow}>
                  <h2>{releaseDrawerTitle(drawerRelease)}</h2>
                  <span className={styles.fansubEditReleaseStatusBadge}>Verknuepft</span>
                </div>
                <p>{drawerRelease.fansub_name} - {drawerRelease.version_count} Version{drawerRelease.version_count === 1 ? '' : 'en'}</p>
              </div>
              <button type="button" className={styles.fansubEditReleaseExpandButton} onClick={closeReleaseDrawer} aria-label="Drawer schliessen">
                <X size={16} />
              </button>
            </header>

            <div className={styles.fansubEditReleaseDrawerTabs} role="tablist" aria-label="Release Drawer Bereiche">
              {releaseDrawerTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={drawerTab === tab.key ? styles.fansubEditReleaseDrawerTabActive : undefined}
                  disabled={tab.disabled}
                  aria-disabled={tab.disabled}
                  onClick={() => {
                    if (!tab.disabled) setDrawerTab(tab.key)
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={styles.fansubEditReleaseDrawerBody}>
              {drawerReleaseLoading ? <div className={styles.fansubEditReleaseState}>Release-Details werden geladen...</div> : null}
              {drawerReleaseError ? <div className={styles.errorBox}>{drawerReleaseError}</div> : null}
              {drawerTab === 'details' ? (
                <div className={styles.fansubEditReleaseDrawerPanel}>
                  <div className={styles.fansubEditReleaseDrawerFieldGrid}>
                    <label><span>Release-ID</span><input value={String(selectedReleaseId ?? drawerRelease.release_id)} readOnly /></label>
                    <label><span>Anime-ID</span><input value={String(selectedAnimeId ?? drawerRelease.anime_id)} readOnly /></label>
                    <label><span>Fansub-Gruppe</span><input value={String(selectedFansubGroupId ?? drawerRelease.fansub_group_id)} readOnly /></label>
                    <label><span>Kontext-Key</span><input value={selectedAnimeFansubContextKey ?? animeFansubReleaseContextKey(drawerRelease.fansub_group_id, drawerRelease.anime_id)} readOnly /></label>
                    <label><span>Anime</span><input value={drawerRelease.anime_title} readOnly /></label>
                    <label><span>Episode</span><input value={drawerRelease.episode_number || '?'} readOnly /></label>
                    <label><span>Titel</span><input value={(drawerRelease.episode_title || '').trim() || 'Ohne Episodentitel'} readOnly /></label>
                    <label><span>Versionen</span><input value={String(drawerRelease.version_count)} readOnly /></label>
                    <label><span>Datum</span><input value={new Date(drawerRelease.created_at).toLocaleDateString('de-CH')} readOnly /></label>
                    <label><span>Status</span><input value="Verknuepft" readOnly /></label>
                  </div>
                  <div className={styles.fansubEditReleaseDrawerContextGrid}>
                    <div className={styles.fansubEditReleaseDrawerContextCard}>
                      <span>Release-Kontext</span>
                      <strong>{episodeReleaseTitle(drawerRelease)}</strong>
                      <p>{drawerRelease.fansub_name} - {drawerRelease.anime_title}</p>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerContextCard}>
                      <span>Theme-Uebersicht</span>
                      <strong>{drawerReleaseThemeSummary}</strong>
                      <p>{drawerReleaseCards.length > 0 ? `${drawerReleaseCards.length} Theme-Definition${drawerReleaseCards.length === 1 ? '' : 'en'} geladen` : 'Theme-Daten noch nicht geladen'}</p>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerContextCard}>
                      <span>Release-Datum</span>
                      <strong>{new Date(drawerRelease.created_at).toLocaleDateString('de-CH')}</strong>
                      <p>{drawerRelease.version_count} Version{drawerRelease.version_count === 1 ? '' : 'en'}</p>
                    </div>
                  </div>
                </div>
              ) : null}

            </div>

            <footer className={styles.fansubEditReleaseDrawerFooter}>
              <button type="button" className={styles.buttonSecondary} onClick={closeReleaseDrawer}>Schliessen</button>
            </footer>
          </aside>
        </div>
      ) : null}
      {themeDrawerOpen && selectedReleaseSegment && themeSelectedCard ? (
        <div className={styles.fansubEditReleaseDrawerOverlay} onClick={closeThemeDrawer}>
          <aside className={`${styles.fansubEditReleaseDrawer} ${styles.fansubEditThemeDrawer}`} aria-label="Theme bearbeiten" onClick={(event) => event.stopPropagation()}>
            <header className={styles.fansubEditReleaseDrawerHeader}>
              <div>
                <p className={styles.fansubEditHint}>{episodeReleaseTitle(selectedReleaseSegment.release)}</p>
                <h2>{timelineLabelFor(themeSelectedCard.theme_type_name)} bearbeiten</h2>
                <p>{themeSelectedCard.theme_title || 'Ohne Titel'}</p>
              </div>
              <button type="button" className={styles.fansubEditReleaseExpandButton} onClick={closeThemeDrawer} aria-label="Theme Drawer schliessen">
                <X size={16} />
              </button>
            </header>
            <div className={styles.fansubEditReleaseDrawerBody}>
              <div className={`${styles.fansubEditReleaseDrawerPanel} ${styles.fansubEditThemeDrawerPanel}`}>
                {drawerError ? <div className={styles.errorBox}>{drawerError}</div> : null}
                <div className={styles.fansubEditReleaseDrawerAssetBox}>
                  <p className={styles.fansubEditHint}>Dieser Drawer ist nur fuer OP/ED/IN Theme-Assets. Timeline-Zeiten bleiben unveraendert.</p>
                  <div className={styles.fansubEditSegmentEditorGrid}>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>Status</span>
                      <strong>{themeSelectedCard.status === 'global' ? 'Global gesetzt' : themeSelectedCard.status === 'release' ? 'Release-spezifisch' : 'Fehlt noch'}</strong>
                    </div>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>Theme</span>
                      <strong>{themeSelectedCard.theme_title || 'Ohne Titel'}</strong>
                    </div>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>Quelle</span>
                      <strong>{themeSelectedCard.source_label || 'Keine Quelle'}</strong>
                    </div>
                  </div>
                  {themeSelectedCard.public_url ? (
                    <a href={resolveApiUrl(themeSelectedCard.public_url)} target="_blank" rel="noreferrer" className={styles.fansubEditReleaseDrawerMediaLink}>Aktuelles Asset oeffnen</a>
                  ) : null}
                  {themeSelectedLocked ? (
                    <p className={styles.fansubEditHint}>Global/Jellyfin gesetzt - keine Fansub-Ueberschreibung in diesem Schritt.</p>
                  ) : (
                    <div className={styles.fansubEditReleaseDrawerDropzone}>
                      <label>
                        <span>Theme-Video hochladen</span>
                        <input ref={themeUploadInputRef} type="file" accept="video/*" disabled={drawerBusy || !authToken} />
                      </label>
                      {drawerUploadProgress !== null ? <p className={styles.fansubEditHint}>Upload: {drawerUploadProgress}%</p> : null}
                      <button type="button" className={styles.buttonPrimary} onClick={() => void handleDrawerUploadClick()} disabled={drawerBusy || !authToken}>
                        Upload starten
                      </button>
                      {themeSelectedCard.status === 'release' && themeSelectedCard.media_id ? (
                        <button type="button" className={`${styles.buttonSecondary} ${styles.buttonDanger}`} onClick={() => void handleDrawerDelete()} disabled={drawerBusy}>
                          Asset entfernen
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
                <aside className={styles.fansubEditReleaseDrawerContextCard} aria-label="Segment-Kontext">
                  <span>Segment-Kontext</span>
                  <strong>{episodeReleaseTitle(selectedReleaseSegment.release)}</strong>
                  <dl className={styles.fansubEditThemeContextList}>
                    <div>
                      <dt>Release</dt>
                      <dd>#{selectedReleaseSegment.release.release_id}</dd>
                    </div>
                    <div>
                      <dt>Episode</dt>
                      <dd>{themeSegmentEpisodeRange(themePrimarySegment)}</dd>
                    </div>
                    <div>
                      <dt>Zeitbereich</dt>
                      <dd>{themeSegmentTimeRange(themePrimarySegment)}</dd>
                    </div>
                    <div>
                      <dt>Quelle</dt>
                      <dd>{themeSelectedCard.source_label || 'Keine Quelle'}</dd>
                    </div>
                  </dl>
                </aside>
              </div>
            </div>
            <footer className={styles.fansubEditReleaseDrawerFooter}>
              <button type="button" className={styles.buttonSecondary} onClick={closeThemeDrawer}>Schliessen</button>
            </footer>
          </aside>
        </div>
      ) : null}
    </main>
  )
}
